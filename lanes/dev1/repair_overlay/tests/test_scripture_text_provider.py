import hashlib
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
