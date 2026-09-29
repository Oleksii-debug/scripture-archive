import unittest
from pathlib import Path


class ScriptureReaderRequestStateTests(unittest.TestCase):
    def setUp(self):
        overlay = Path(__file__).resolve().parents[1]
        self.frontend = (overlay / 'frontend' / 'scripture-reader-ui.js').read_text(encoding='utf-8')

    def test_chapter_request_clears_stale_result_before_transport(self):
        handler = self.frontend.split("readForm.addEventListener('submit'", 1)[1]
        handler = handler.split("searchForm.addEventListener('submit'", 1)[0]
        clear_at = handler.index('verses.replaceChildren();')
        request_at = handler.index("api('library.read_chapter'")
        self.assertLess(clear_at, request_at)

    def test_search_request_clears_stale_result_only_after_nonempty_validation(self):
        handler = self.frontend.split("searchForm.addEventListener('submit'", 1)[1]
        empty_guard_at = handler.index('if (!value)')
        clear_at = handler.index('results.replaceChildren();')
        request_at = handler.index("api('library.text_search'")
        self.assertLess(empty_guard_at, clear_at)
        self.assertLess(clear_at, request_at)


if __name__ == '__main__':
    unittest.main()
