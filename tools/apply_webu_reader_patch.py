from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OVERLAY = ROOT / "lanes" / "dev1" / "repair_overlay"


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text(encoding="utf-8")
    if new in text:
        return
    if text.count(old) != 1:
        raise SystemExit(f"sentinel mismatch for {path}: {text.count(old)} occurrences")
    path.write_text(text.replace(old, new), encoding="utf-8")


def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


PROVIDER = r'''from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any


AUTHORITY_FILE = "engwebu_authority.json"
VPL_FILE = "engwebu_vpl.txt"
EXPECTED_VPL_SHA256 = "71c2ea1ecba86b62871b0e818c4302ea0a559a5cb9643ff05197a6243836fc2f"
CATALOG_SCHEMA = "scripture.library.text-catalog.v1"
CHAPTER_SCHEMA = "scripture.library.chapter.v1"
SEARCH_SCHEMA = "scripture.library.text-search.v1"


class BundledScriptureText:
    """Fail-closed, read-only view of the exact bundled WEBU VPL source bytes."""

    def __init__(self, data_dir: Path | None = None):
        self.data_dir = Path(data_dir) if data_dir is not None else Path(__file__).resolve().parent / "data"
        self.vpl_path = self.data_dir / VPL_FILE
        self.authority_path = self.data_dir / AUTHORITY_FILE
        self._authority = self._load_authority()
        self._available = self._verify_vpl()
        self._records: list[dict[str, Any]] | None = None
        self._chapters: dict[tuple[str, int], list[dict[str, Any]]] | None = None

    @property
    def available(self) -> bool:
        return self._available

    def _load_authority(self) -> dict[str, Any]:
        try:
            data = json.loads(self.authority_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise ValueError("bundled WEBU authority manifest unavailable") from exc
        if data.get("schema") != "scripture.webu.bundled-authority.v1":
            raise ValueError("unexpected WEBU authority schema")
        if data.get("translation_id") != "engwebu" or data.get("source_tier") != "TX1":
            raise ValueError("unexpected WEBU authority identity")
        if data.get("vpl_sha256") != EXPECTED_VPL_SHA256 or data.get("runtime_network_required") is not False:
            raise ValueError("WEBU authority is not the pinned offline corpus")
        return data

    def _verify_vpl(self) -> bool:
        try:
            raw = self.vpl_path.read_bytes()
        except OSError as exc:
            raise ValueError("bundled WEBU VPL unavailable") from exc
        actual = hashlib.sha256(raw).hexdigest()
        if actual != EXPECTED_VPL_SHA256:
            raise ValueError("bundled WEBU VPL SHA-256 mismatch")
        return True

    @staticmethod
    def _bounded_text(value: Any, name: str, max_length: int) -> str:
        if not isinstance(value, str):
            raise ValueError(f"{name} must be string")
        value = value.strip()
        if not value or len(value) > max_length or any(ord(ch) < 32 for ch in value):
            raise ValueError(f"invalid {name}")
        return value

    def _ensure(self) -> None:
        if self._records is not None:
            return
        records: list[dict[str, Any]] = []
        chapters: dict[tuple[str, int], list[dict[str, Any]]] = {}
        book_order: list[str] = []
        text = self.vpl_path.read_text(encoding="utf-8-sig")
        for line_number, line in enumerate(text.splitlines(), 1):
            parts = line.split(" ", 2)
            if len(parts) != 3 or ":" not in parts[1]:
                raise ValueError(f"invalid WEBU VPL row {line_number}")
            book = parts[0]
            chapter_s, verse_s = parts[1].split(":", 1)
            if not chapter_s.isdigit() or not verse_s.isdigit():
                raise ValueError(f"invalid WEBU VPL reference at row {line_number}")
            chapter = int(chapter_s); verse = int(verse_s); verse_text = parts[2]
            if not book or len(book) > 4 or chapter < 1 or verse < 1:
                raise ValueError(f"invalid WEBU VPL coordinates at row {line_number}")
            if book not in book_order:
                book_order.append(book)
            row = {
                "book": book,
                "chapter": chapter,
                "verse": verse,
                "reference": f"{book} {chapter}:{verse}",
                "text": verse_text,
                "text_state": "present" if verse_text else "source_empty",
                "translation_id": "engwebu",
                "source_tier": "TX1",
            }
            records.append(row)
            chapters.setdefault((book, chapter), []).append(row)
        if len(records) != int(self._authority.get("vpl_rows") or -1):
            raise ValueError("WEBU VPL row count does not match authority")
        if book_order != list(self._authority.get("book_codes") or []):
            raise ValueError("WEBU book order does not match authority")
        empty = sum(1 for row in records if row["text_state"] == "source_empty")
        if empty != int(self._authority.get("empty_text_rows") or -1):
            raise ValueError("WEBU source-empty row count does not match authority")
        self._records = records
        self._chapters = chapters

    def catalog_projection(self) -> dict[str, Any]:
        return {
            "bundled_full_bible_text": self.available,
            "text_provider_available": self.available,
            "scripture_text": {
                "translation_id": "engwebu",
                "translation_name": self._authority["translation_name"],
                "source_tier": "TX1",
                "license": self._authority["license"],
                "source_site": self._authority["source_site"],
                "vpl_sha256": EXPECTED_VPL_SHA256,
                "runtime_network_required": False,
            },
        }

    def catalog(self) -> dict[str, Any]:
        self._ensure()
        assert self._chapters is not None and self._records is not None
        books = []
        for code in self._authority["book_codes"]:
            chapter_numbers = sorted(ch for (book, ch) in self._chapters if book == code)
            books.append({"code": code, "chapter_count": len(chapter_numbers), "chapters": chapter_numbers})
        return {
            "schema": CATALOG_SCHEMA,
            **self.catalog_projection()["scripture_text"],
            "verse_rows": len(self._records),
            "source_empty_rows": int(self._authority["empty_text_rows"]),
            "books": books,
        }

    def chapter(self, book: Any, chapter: Any) -> dict[str, Any]:
        self._ensure()
        assert self._chapters is not None
        book_code = self._bounded_text(book, "book", 4).upper()
        if isinstance(chapter, bool) or not isinstance(chapter, int) or not 1 <= chapter <= 200:
            raise ValueError("chapter must be integer 1..200")
        rows = self._chapters.get((book_code, chapter))
        if rows is None:
            raise ValueError("chapter not present in bundled WEBU source")
        return {
            "schema": CHAPTER_SCHEMA,
            "translation_id": "engwebu",
            "source_tier": "TX1",
            "book": book_code,
            "chapter": chapter,
            "verses": [dict(row) for row in rows],
            "source_empty_rows": sum(1 for row in rows if row["text_state"] == "source_empty"),
        }

    def search(self, query: Any, *, limit: Any = 50) -> dict[str, Any]:
        self._ensure()
        assert self._records is not None
        q = self._bounded_text(query, "query", 128)
        if isinstance(limit, bool) or not isinstance(limit, int) or not 1 <= limit <= 100:
            raise ValueError("limit must be integer 1..100")
        needle = q.casefold()
        matches = [dict(row) for row in self._records if row["text"] and needle in row["text"].casefold()]
        return {
            "schema": SEARCH_SCHEMA,
            "translation_id": "engwebu",
            "source_tier": "TX1",
            "query": q,
            "total": len(matches),
            "results": matches[:limit],
        }
'''

FRONTEND = r'''import {chooseTransport, unwrap} from './transport.js';

let transportPromise = null;
const byId = id => document.getElementById(id);

function element(tag, text = '', attrs = {}) {
  const node = document.createElement(tag);
  if (text !== '') node.textContent = String(text);
  for (const [name, value] of Object.entries(attrs)) {
    if (name === 'className') node.className = String(value);
    else node.setAttribute(name, String(value));
  }
  return node;
}

async function api(command, payload = {}) {
  if (!['library.text_catalog', 'library.read_chapter', 'library.text_search'].includes(command)) {
    throw new Error('Scripture reader attempted a non-reader command');
  }
  if (!transportPromise) transportPromise = chooseTransport();
  return await unwrap(await transportPromise, command, payload);
}

function status(message) {
  const node = byId('scripture-reader-status');
  if (node) node.textContent = String(message || '');
}

function renderVerses(data) {
  const host = byId('scripture-reader-verses');
  host.replaceChildren();
  const heading = element('h4', `${data.book} ${data.chapter}`);
  const list = element('ol', '', {'aria-label': `${data.book} ${data.chapter}, World English Bible Updated`});
  for (const row of data.verses || []) {
    const text = row.text_state === 'source_empty'
      ? `Verse ${row.verse}. Not stated in the cited WEBU source row.`
      : `Verse ${row.verse}. ${row.text}`;
    list.append(element('li', text, {'data-reference': row.reference}));
  }
  host.append(heading, list);
  heading.tabIndex = -1;
  heading.focus();
}

function renderSearch(data) {
  const host = byId('scripture-reader-search-results');
  host.replaceChildren();
  if (!data.results?.length) {
    host.append(element('p', 'No matching text found in the bundled WEBU source.'));
    return;
  }
  const list = element('ol');
  for (const row of data.results) {
    list.append(element('li', `${row.reference} — ${row.text}`));
  }
  host.append(list);
}

export async function installScriptureReaderSurface() {
  const library = byId('library-view');
  if (!library || byId('scripture-reader')) return;

  const section = element('section', '', {id: 'scripture-reader', 'aria-labelledby': 'scripture-reader-heading'});
  const heading = element('h3', 'Full Scripture text — WEBU', {id: 'scripture-reader-heading'});
  const source = element('p', 'Bundled offline World English Bible Updated (engwebu), source tier TX1, public-domain source. Empty source rows are reported as empty and are never filled from another witness.', {role: 'note'});

  const readForm = element('form', '', {id: 'scripture-reader-form', 'aria-labelledby': 'scripture-reader-read-heading'});
  readForm.append(element('h4', 'Read a chapter', {id: 'scripture-reader-read-heading'}));
  const bookLabel = element('label', 'Book code'); bookLabel.htmlFor = 'scripture-reader-book';
  const book = element('select', '', {id: 'scripture-reader-book'});
  const chapterLabel = element('label', 'Chapter'); chapterLabel.htmlFor = 'scripture-reader-chapter';
  const chapter = element('input', '', {id: 'scripture-reader-chapter', type: 'number', min: '1', max: '200', value: '1', inputmode: 'numeric'});
  const readButton = element('button', 'Read chapter', {type: 'submit'});
  readForm.append(bookLabel, book, chapterLabel, chapter, readButton);

  const searchForm = element('form', '', {id: 'scripture-reader-text-search', role: 'search', 'aria-labelledby': 'scripture-reader-search-heading'});
  searchForm.append(element('h4', 'Search full text', {id: 'scripture-reader-search-heading'}));
  const queryLabel = element('label', 'Words in Scripture text'); queryLabel.htmlFor = 'scripture-reader-query';
  const query = element('input', '', {id: 'scripture-reader-query', type: 'search', maxlength: '128', autocomplete: 'off'});
  const searchButton = element('button', 'Search WEBU', {type: 'submit'});
  searchForm.append(queryLabel, query, searchButton);

  const live = element('p', '', {id: 'scripture-reader-status', role: 'status', 'aria-live': 'polite'});
  const verses = element('div', '', {id: 'scripture-reader-verses', 'aria-live': 'polite'});
  const results = element('div', '', {id: 'scripture-reader-search-results', 'aria-live': 'polite'});
  section.append(heading, source, readForm, searchForm, live, verses, results);
  library.append(section);

  try {
    const catalog = await api('library.text_catalog');
    for (const item of catalog.books || []) {
      const option = element('option', item.code);
      option.value = item.code;
      book.append(option);
    }
    status(`Offline WEBU ready: ${catalog.verse_rows} source rows across ${catalog.books?.length || 0} book codes.`);
  } catch (error) {
    status(`Full-text provider unavailable: ${error.message}`);
    readButton.disabled = true; searchButton.disabled = true;
    return;
  }

  readForm.addEventListener('submit', async event => {
    event.preventDefault(); readButton.disabled = true; status('Loading chapter…');
    try {
      const data = await api('library.read_chapter', {book: book.value, chapter: Number(chapter.value)});
      renderVerses(data); status(`${data.book} ${data.chapter}: ${data.verses.length} source rows.`);
    } catch (error) { status(`Cannot read chapter: ${error.message}`); }
    finally { readButton.disabled = false; }
  });

  searchForm.addEventListener('submit', async event => {
    event.preventDefault(); const value = query.value.trim();
    if (!value) { status('Enter words to search in the bundled WEBU text.'); query.focus(); return; }
    searchButton.disabled = true; status('Searching bundled WEBU text…');
    try {
      const data = await api('library.text_search', {query: value, limit: 50});
      renderSearch(data); status(`${data.total} matching source rows; showing up to 50.`);
    } catch (error) { status(`Cannot search Scripture text: ${error.message}`); }
    finally { searchButton.disabled = false; }
  });
}
'''

TESTS = r'''import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from scripture_archive_platform.application.service import PlatformApplication
from scripture_archive_platform.content.scripture_text import BundledScriptureText, EXPECTED_VPL_SHA256
from scripture_archive_platform.persistence.store import JsonFileStore
from scripture_archive_platform.transport.contracts import ALLOWLISTED_COMMANDS


class BundledScriptureTextTests(unittest.TestCase):
    def test_exact_pinned_corpus_and_catalog(self):
        provider = BundledScriptureText()
        raw = provider.vpl_path.read_bytes()
        self.assertEqual(EXPECTED_VPL_SHA256, hashlib.sha256(raw).hexdigest())
        catalog = provider.catalog()
        self.assertEqual('scripture.library.text-catalog.v1', catalog['schema'])
        self.assertEqual('engwebu', catalog['translation_id'])
        self.assertEqual('TX1', catalog['source_tier'])
        self.assertEqual(38058, catalog['verse_rows'])
        self.assertEqual(29, catalog['source_empty_rows'])
        self.assertEqual(81, len(catalog['books']))
        self.assertFalse(catalog['runtime_network_required'])

    def test_chapter_preserves_exact_text_and_source_empty_rows(self):
        provider = BundledScriptureText()
        gen = provider.chapter('GEN', 1)
        self.assertEqual('In the beginning, God created the heavens and the earth.', gen['verses'][0]['text'])
        acts = provider.chapter('ACT', 8)
        v37 = next(row for row in acts['verses'] if row['verse'] == 37)
        self.assertEqual('', v37['text'])
        self.assertEqual('source_empty', v37['text_state'])

    def test_search_is_bounded_and_does_not_invent_empty_rows(self):
        provider = BundledScriptureText()
        result = provider.search('beginning', limit=3)
        self.assertGreater(result['total'], 0)
        self.assertLessEqual(len(result['results']), 3)
        self.assertTrue(all(row['text'] for row in result['results']))
        for bad in ('', ' ' * 4, 'x' * 129):
            with self.assertRaises(ValueError): provider.search(bad)
        for bad in (0, 101, True, '2'):
            with self.assertRaises(ValueError): provider.search('God', limit=bad)

    def test_transport_is_allowlisted_and_fail_closed(self):
        for command in ('library.text_catalog', 'library.read_chapter', 'library.text_search'):
            self.assertIn(command, ALLOWLISTED_COMMANDS)
        with tempfile.TemporaryDirectory() as td:
            root = Path(td); repo = root / 'repo'; repo.mkdir()
            app = PlatformApplication(repo, store=JsonFileStore(root / 'store'))
            def call(command, payload=None):
                return app.handle({'api_version':'scripture.transport.v1','request_id':'webu-test','command':command,'payload':payload or {}})
            catalog = call('library.text_catalog')
            self.assertTrue(catalog['ok'])
            self.assertEqual('engwebu', catalog['data']['translation_id'])
            bootstrap = call('system.bootstrap')
            self.assertTrue(bootstrap['data']['capabilities']['bundled_full_bible_text'])
            chapter = call('library.read_chapter', {'book':'GEN','chapter':1})
            self.assertTrue(chapter['ok'])
            self.assertEqual('GEN 1:1', chapter['data']['verses'][0]['reference'])
            self.assertFalse(call('library.read_chapter', {'book':'../../etc/passwd','chapter':1})['ok'])
            self.assertFalse(call('library.text_search', {'query':'God','limit':1000})['ok'])

    def test_packaging_and_frontend_bindings_are_explicit(self):
        overlay = Path(__file__).resolve().parents[1]
        build = (overlay / 'packaging' / 'build_windows.ps1').read_text(encoding='utf-8')
        self.assertIn('scripture_archive_platform\\content\\data', build)
        frontend = (overlay / 'frontend' / 'scripture-reader-ui.js').read_text(encoding='utf-8')
        self.assertIn("library.read_chapter", frontend)
        self.assertIn("library.text_search", frontend)
        self.assertIn('textContent', frontend)
        self.assertNotIn('innerHTML', frontend)
        self.assertIn("role: 'status'", frontend)


if __name__ == '__main__':
    unittest.main()
'''

write(OVERLAY / "scripture_archive_platform" / "content" / "scripture_text.py", PROVIDER)
write(OVERLAY / "frontend" / "scripture-reader-ui.js", FRONTEND)
write(OVERLAY / "tests" / "test_scripture_text_provider.py", TESTS)

contracts = OVERLAY / "scripture_archive_platform" / "transport" / "contracts.py"
replace_once(
    contracts,
    '"content.list_campaigns","content.list_missions","library.catalog","library.search","player.load_node",',
    '"content.list_campaigns","content.list_missions","library.catalog","library.search","library.text_catalog","library.read_chapter","library.text_search","player.load_node",',
)

service = OVERLAY / "scripture_archive_platform" / "application" / "service.py"
replace_once(
    service,
    'from scripture_archive_platform.content.library import CanonicalLibraryIndex\n',
    'from scripture_archive_platform.content.library import CanonicalLibraryIndex\nfrom scripture_archive_platform.content.scripture_text import BundledScriptureText\n',
)
replace_once(
    service,
    'self.loader=loader or CanonicalContentLoader(self.repo_root); self.library=CanonicalLibraryIndex(self.loader); self.mapper=TaskPresentationMapper(); self.grader=grader or ReferenceGrader(); self.player_gateway=player_gateway',
    'self.loader=loader or CanonicalContentLoader(self.repo_root); self.library=CanonicalLibraryIndex(self.loader); self.scripture_text=BundledScriptureText(); self.mapper=TaskPresentationMapper(); self.grader=grader or ReferenceGrader(); self.player_gateway=player_gateway',
)
replace_once(
    service,
    "        if cmd=='library.catalog':return self.library.catalog()\n        if cmd=='library.search':return self.library.search(p.get('query'),campaign_id=p.get('campaign_id'),mission_id=p.get('mission_id'),limit=p.get('limit',25))\n",
    "        if cmd=='library.catalog':\n            data=self.library.catalog();data.update(self.scripture_text.catalog_projection());return data\n        if cmd=='library.search':\n            data=self.library.search(p.get('query'),campaign_id=p.get('campaign_id'),mission_id=p.get('mission_id'),limit=p.get('limit',25));data['bundled_full_bible_text']=self.scripture_text.available;return data\n        if cmd=='library.text_catalog':return self.scripture_text.catalog()\n        if cmd=='library.read_chapter':return self.scripture_text.chapter(p.get('book'),p.get('chapter'))\n        if cmd=='library.text_search':return self.scripture_text.search(p.get('query'),limit=p.get('limit',50))\n",
)
replace_once(service, "'bundled_full_bible_text':False", "'bundled_full_bible_text':self.scripture_text.available")

transport = OVERLAY / "frontend" / "transport.js"
replace_once(
    transport,
    "void import('./library-ui.js');",
    "void import('./library-ui.js').then(()=>import('./scripture-reader-ui.js')).then(({installScriptureReaderSurface})=>installScriptureReaderSurface());",
)

build = OVERLAY / "packaging" / "build_windows.ps1"
replace_once(
    build,
    '      --add-data "$PlatformRoot\\frontend${Sep}r06_platform\\frontend" `\n',
    '      --add-data "$PlatformRoot\\frontend${Sep}r06_platform\\frontend" `\n      --add-data "$PlatformRoot\\scripture_archive_platform\\content\\data${Sep}scripture_archive_platform\\content\\data" `\n',
)

existing_test = OVERLAY / "tests" / "test_library_search.py"
replace_once(
    existing_test,
    '        self.assertFalse(bootstrap["data"]["capabilities"]["bundled_full_bible_text"])\n',
    '        self.assertTrue(bootstrap["data"]["capabilities"]["bundled_full_bible_text"])\n',
)

print("WEBU reader product patch applied")
