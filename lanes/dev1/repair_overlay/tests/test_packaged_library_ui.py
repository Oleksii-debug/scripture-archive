from pathlib import Path
import json
import re
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1] / "frontend"


class PackagedLibraryUiTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.transport = (ROOT / "transport.js").read_text(encoding="utf-8")
        cls.js = (ROOT / "library-ui.js").read_text(encoding="utf-8")

    def test_packaged_transport_entrypoint_loads_library_module_without_shell_overwrite(self):
        self.assertEqual(self.transport.count("import('./library-ui.js')"), 1)
        self.assertIn("export async function chooseTransport", self.transport)
        self.assertIn("export async function unwrap", self.transport)
        self.assertFalse((ROOT / "index.html").exists(), "repair overlay must not replace canonical index.html")
        self.assertFalse((ROOT / "library-search.js").exists(), "superseded Library surface must be removed")

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
        self.assertIn("text_provider_available === false", self.js)
        self.assertIn("CanonicalContentLoader", self.js)
        self.assertIn("Результати не додають нових source claims", self.js)
        self.assertIn("відсутній текст не вигадується", self.js)

    def test_accessible_keyboard_native_semantics_and_view_exclusivity(self):
        for token in (
            "role: 'search'", "role: 'status'", "'aria-live': 'polite'", "role: 'list'",
            "queryLabel.htmlFor", "campaignLabel.htmlFor", "missionLabel.htmlFor", "heading.focus()",
            "library-results-heading", "MutationObserver", "aria-busy",
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

    def test_executable_search_leave_reopen_late_resolution_regression(self):
        with tempfile.TemporaryDirectory() as tmp:
            scope = Path(tmp)
            shutil.copy2(ROOT / "library-ui.js", scope / "library-ui.js")
            shutil.copy2(ROOT / "transport.js", scope / "transport.js")
            (scope / "package.json").write_text('{"type":"module"}\n', encoding="utf-8")
            module_url = (scope / "library-ui.js").resolve().as_uri()
            script = f"""
import {{createSearchLifecycle}} from {json.dumps(module_url)};
const assert = (value, message) => {{ if (!value) throw new Error(message); }};
const deferred = () => {{ let resolve, reject; const promise = new Promise((r,j) => {{resolve=r; reject=j;}}); return {{promise,resolve,reject}}; }};
const oldRequest = deferred();
const newRequest = deferred();
let call = 0;
let visible = true;
const rendered = [];
let focused = 0;
const attrs = {{}};
const button = {{disabled:false,setAttribute:(name,value)=>{{attrs[name]=value;}}}};
const controller = createSearchLifecycle({{
  button,
  execute: () => (++call === 1 ? oldRequest.promise : newRequest.promise),
  isVisible: () => visible,
  onData: data => rendered.push(data.value),
  onError: error => {{ throw error; }},
  onStatus: () => {{}},
  onFocus: () => {{ focused += 1; }}
}});
const first = controller.run({{query:'old'}});
assert(button.disabled === true, 'first search must disable submit');
visible = false;
controller.invalidate();
assert(button.disabled === false, 'leaving Library must restore enabled state');
assert(attrs['aria-busy'] === 'false', 'leaving Library must clear busy state');
visible = true;
const second = controller.run({{query:'new'}});
assert(button.disabled === true, 'reopened Library must permit a newer search and mark it busy');
oldRequest.resolve({{value:'old'}});
await new Promise(resolve => setImmediate(resolve));
assert(button.disabled === true, 'late old result must not re-enable over newer search');
assert(rendered.length === 0 && focused === 0, 'late old result must not render or steal focus');
newRequest.resolve({{value:'new'}});
await second;
await first;
assert(button.disabled === false, 'newer search completion must restore enabled state');
assert(attrs['aria-busy'] === 'false', 'newer search completion must clear busy state');
assert(rendered.length === 1 && rendered[0] === 'new', 'only newer result may render');
assert(focused === 1, 'only newer result may move result focus');
"""
            completed = subprocess.run(
                ["node", "--input-type=module", "-e", script],
                cwd=scope,
                text=True,
                capture_output=True,
                check=False,
            )
            self.assertEqual(completed.returncode, 0, completed.stdout + completed.stderr)


if __name__ == "__main__":
    unittest.main()
