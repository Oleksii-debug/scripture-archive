import base64
import json
import shutil
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend"


class CommandSystemUITests(unittest.TestCase):
    def test_javascript_syntax(self):
        node = shutil.which("node")
        self.assertIsNotNone(node, "Node.js is required for packaged frontend qualification")
        for name in ("action-registry.js", "command-palette.js", "app.js"):
            completed = subprocess.run(
                [node, "--check", str(FRONTEND / name)],
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(completed.returncode, 0, completed.stderr)

    def test_action_registry_behavior(self):
        node = shutil.which("node")
        self.assertIsNotNone(node)
        source = (FRONTEND / "action-registry.js").read_text(encoding="utf-8")
        data_url = "data:text/javascript;base64," + base64.b64encode(source.encode()).decode()
        script = f"""
import assert from 'node:assert/strict';
const {{ActionRegistry}}=await import({json.dumps(data_url)});
let calls=[];
const registry=new ActionRegistry([
  {{id:'app.home',label:'Головна',group:'Навігація',description:'Повернутися додому',keywords:['старт'],handler:()=>calls.push('home')}},
  {{id:'player.hint',label:'Підказка',group:'Гравець',handler:()=>calls.push('hint')}},
]);
assert.equal(registry.execute('missing'),false);
registry.execute('app.home');
assert.deepEqual(calls,['home']);
assert.deepEqual(registry.list('старт').map(x=>x.id),['app.home']);
assert.deepEqual(registry.list('ГРАВЕЦЬ').map(x=>x.id),['player.hint']);
assert.equal('handler' in registry.list()[0],false);
assert.throws(()=>registry.register({{id:' app.bad',label:'Bad',handler(){{}}}}));
assert.throws(()=>registry.register({{id:'app.home',label:'Duplicate',handler(){{}}}}));
"""
        completed = subprocess.run(
            [node, "--input-type=module", "-e", script],
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(completed.returncode, 0, completed.stderr)

    def test_palette_is_semantic_linear_and_transport_free(self):
        source = (FRONTEND / "command-palette.js").read_text(encoding="utf-8")
        for required in (
            "createElement('dialog')",
            "setAttribute('role','listbox')",
            "setAttribute('role','option')",
            "aria-activedescendant",
            "ArrowDown",
            "ArrowUp",
            "Home",
            "End",
            "Enter",
            "Escape",
            "textContent",
            "restoreFocus",
        ):
            self.assertIn(required, source)
        self.assertNotIn("innerHTML", source)
        self.assertNotIn("api(", source)
        self.assertNotIn("transport", source.lower())

    def test_app_uses_single_registry_for_existing_dispatcher_and_palette(self):
        source = (FRONTEND / "app.js").read_text(encoding="utf-8")
        self.assertIn("new ActionRegistry", source)
        self.assertIn("new HotkeyDispatcher(executeAction)", source)
        self.assertIn("new CommandPaletteUI", source)
        self.assertIn("actions=createActionRegistry()", source)
        self.assertIn("return actions?.execute(id)", source)
        self.assertNotIn("const map={'app.home'", source)
        for action_id in (
            "app.home",
            "player.submit",
            "player.hint",
            "player.evidence",
            "player.next",
            "authoring.save",
            "authoring.preview",
            "authoring.validate",
            "settings.keymap",
            "app.command_palette",
        ):
            self.assertIn(action_id, source)


if __name__ == "__main__":
    unittest.main()
