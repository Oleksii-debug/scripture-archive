from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1] / "frontend"


class PackagedLibraryUiTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.transport = (ROOT / "transport.js").read_text(encoding="utf-8")
        cls.js = (ROOT / "library-ui.js").read_text(encoding="utf-8")

    def test_packaged_transport_entrypoint_loads_library_module(self):
        self.assertEqual(self.transport.count("import('./library-ui.js')"), 1)
        self.assertIn("export async function chooseTransport", self.transport)
        self.assertIn("export async function unwrap", self.transport)

    def test_ui_calls_only_read_only_library_contracts(self):
        commands = set(re.findall(r"api\('([^']+)'", self.js))
        self.assertEqual(commands, {"library.catalog", "library.search"})
        for forbidden in ("player.load_node", "player.next", "player.navigate_branch", "authoring.", "settings.set"):
            self.assertNotIn(forbidden, self.js)
        self.assertIn("command !== 'library.catalog' && command !== 'library.search'", self.js)

    def test_source_truth_and_full_text_limit_are_explicit(self):
        self.assertIn("scripture.library.catalog.v1", self.js)
        self.assertIn("scripture.library.search.v1", self.js)
        self.assertIn("derived_index !== true", self.js)
        self.assertIn("bundled_full_bible_text === false", self.js)
        self.assertIn("CanonicalContentLoader", self.js)
        self.assertIn("Результати не додають нових source claims", self.js)

    def test_accessible_keyboard_native_semantics_and_view_exclusivity(self):
        for token in (
            "role: 'search'", "role: 'status'", "'aria-live': 'polite'", "role: 'list'",
            "queryLabel.htmlFor", "campaignLabel.htmlFor", "missionLabel.htmlFor", "heading.focus()", "results-heading", "MutationObserver",
            "home-view", "mission-view", "player-view", "authoring-view",
        ):
            self.assertIn(token, self.js)
        self.assertIn("type: 'submit'", self.js)
        self.assertIn("type: 'search'", self.js)

    def test_dynamic_content_is_text_only_and_bounded(self):
        self.assertNotIn("innerHTML", self.js)
        self.assertNotIn("insertAdjacentHTML", self.js)
        self.assertIn("textContent", self.js)
        self.assertIn("const SEARCH_LIMIT = 50", self.js)
        self.assertIn("const MAX_RESULT_REFS = 25", self.js)
        self.assertIn("const MAX_FILTER_OPTIONS = 1000", self.js)
        self.assertIn("maxlength: '200'", self.js)
        self.assertIn("slice(0, SEARCH_LIMIT)", self.js)
        self.assertIn("slice(0, MAX_RESULT_REFS)", self.js)


if __name__ == "__main__":
    unittest.main()
