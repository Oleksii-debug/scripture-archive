from pathlib import Path
import re
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1] / "frontend"
REPO_ROOT = Path(__file__).resolve().parents[4]
LIBRARY_UI_REPO_PATH = "lanes/dev1/repair_overlay/frontend/library-ui.js"
EXPECTED_LIBRARY_UI_BLOB = "83469f5c54df4a78d6a45331c17e9bfe07bc0e9c"


class PackagedLibraryCurrentShellTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.transport = (ROOT / "transport.js").read_text(encoding="utf-8")
        cls.library = (ROOT / "library-ui.js").read_text(encoding="utf-8")
        cls.compat = (ROOT / "library-shell-compat.js").read_text(encoding="utf-8")
        cls.index = (ROOT / "index.html").read_text(encoding="utf-8")

    def test_qualified_library_donor_blob_is_exact(self):
        completed = subprocess.run(
            ["git", "rev-parse", f"HEAD:{LIBRARY_UI_REPO_PATH}"],
            cwd=REPO_ROOT,
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertEqual(completed.returncode, 0, completed.stdout + completed.stderr)
        self.assertEqual(completed.stdout.strip(), EXPECTED_LIBRARY_UI_BLOB)

    def test_current_transport_preserves_package_loaders_and_composes_coordinator_surfaces(self):
        self.assertIn("export function chooseTransport", self.transport)
        self.assertIn("export async function unwrap", self.transport)
        expected_loaders = {
            "./review-queue-ui.js",
            "./library-ui.js",
            "./library-shell-compat.js",
            "./daily-case-ui.js",
            "./content-pack-manager.js",
            "./witness-matrix-ui.js",
        }
        imports = set(re.findall(r"void import\('([^']+)'\)", self.transport))
        self.assertEqual(imports, expected_loaders)
        for loader in expected_loaders:
            self.assertEqual(self.transport.count(f"void import('{loader}')"), 1)
        self.assertIn(
            "void import('./content-pack-manager.js').then(({installContentPackManagerSurface})=>installContentPackManagerSurface());",
            self.transport,
        )

    def test_library_calls_only_read_only_canonical_contracts(self):
        commands = set(re.findall(r"api\('([^']+)'", self.library))
        self.assertEqual(commands, {"library.catalog", "library.search"})
        self.assertIn("command !== 'library.catalog' && command !== 'library.search'", self.library)
        for forbidden in ("player.load_node", "player.next", "player.navigate_branch", "authoring.", "settings.set"):
            self.assertNotIn(forbidden, self.library)

    def test_library_source_truth_and_absent_full_text_are_explicit(self):
        for token in (
            "scripture.library.catalog.v1",
            "scripture.library.search.v1",
            "derived_index !== true",
            "source_of_truth !== 'CanonicalContentLoader'",
            "bundled_full_bible_text",
            "text_provider_available",
            "Результати не додають нових source claims",
            "відсутній текст не вигадується",
        ):
            self.assertIn(token, self.library)

    def test_dynamic_content_remains_inert_and_bounded(self):
        self.assertNotIn("innerHTML", self.library)
        self.assertNotIn("insertAdjacentHTML", self.library)
        self.assertIn("textContent", self.library)
        self.assertIn("const SEARCH_LIMIT = 50", self.library)
        self.assertIn("const MAX_RESULT_REFS = 25", self.library)
        self.assertIn("const MAX_FILTER_OPTIONS = 1000", self.library)
        self.assertIn("slice(0, SEARCH_LIMIT)", self.library)
        self.assertIn("slice(0, MAX_RESULT_REFS)", self.library)

    def test_current_shell_compatibility_is_dynamic_not_a_stale_view_list(self):
        self.assertIn("Array.from(main.children)", self.compat)
        self.assertIn("node?.tagName === 'SECTION'", self.compat)
        self.assertIn("node.id !== LIBRARY_VIEW_ID", self.compat)
        self.assertIn("event.target?.closest?.('#nav-library')", self.compat)
        self.assertIn("new MutationObserver", self.compat)
        self.assertIn("subtree: true", self.compat)
        self.assertNotIn("BASE_VIEW_IDS", self.compat)
        self.assertNotIn("innerHTML", self.compat)
        self.assertNotIn("eval(", self.compat)

    def test_existing_current_packaged_views_are_preserved(self):
        for view_id in (
            "home-view",
            "mission-view",
            "player-view",
            "research-view",
            "mastery-view",
            "authoring-view",
            "application-update-view",
        ):
            self.assertIn(f'id="{view_id}"', self.index)
        for script in ("app.js", "mastery.js", "application-update.js"):
            self.assertIn(f'src="{script}"', self.index)

    def test_javascript_syntax(self):
        for path in (
            ROOT / "transport.js",
            ROOT / "library-ui.js",
            ROOT / "library-shell-compat.js",
            ROOT / "daily-case-ui.js",
            ROOT / "content-pack-manager.js",
            ROOT / "witness-matrix-ui.js",
        ):
            completed = subprocess.run(
                ["node", "--check", str(path)],
                text=True,
                capture_output=True,
                check=False,
            )
            self.assertEqual(completed.returncode, 0, completed.stdout + completed.stderr)


if __name__ == "__main__":
    unittest.main()
