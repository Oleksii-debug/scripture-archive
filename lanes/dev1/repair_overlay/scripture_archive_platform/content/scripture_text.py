from __future__ import annotations

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
