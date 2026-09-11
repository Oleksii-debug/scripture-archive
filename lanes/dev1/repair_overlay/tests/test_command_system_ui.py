import base64
import json
import shutil
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend"


def data_url(path: Path) -> str:
    source = path.read_text(encoding="utf-8")
    return "data:text/javascript;base64," + base64.b64encode(source.encode()).decode()


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
        registry_url = data_url(FRONTEND / "action-registry.js")
        script = f"""
import assert from 'node:assert/strict';
const {{ActionRegistry}}=await import({json.dumps(registry_url)});
let calls=[];
let playerActive=false;
const registry=new ActionRegistry([
  {{id:'app.home',label:'Головна',group:'Навігація',description:'Повернутися додому',keywords:['старт'],handler:()=>calls.push('home')}},
  {{id:'player.hint',label:'Підказка',group:'Гравець',isAvailable:()=>playerActive,handler:()=>calls.push('hint')}},
]);
assert.equal(registry.execute('missing'),false);
registry.execute('app.home');
assert.deepEqual(calls,['home']);
assert.deepEqual(registry.list('старт').map(x=>x.id),['app.home']);
assert.deepEqual(registry.list('ГРАВЕЦЬ').map(x=>x.id),[]);
assert.equal(registry.execute('player.hint'),false);
playerActive=true;
assert.deepEqual(registry.list('ГРАВЕЦЬ').map(x=>x.id),['player.hint']);
assert.equal(registry.isAvailable('player.hint'),true);
registry.execute('player.hint');
assert.deepEqual(calls,['home','hint']);
assert.equal('handler' in registry.list()[0],false);
assert.equal('isAvailable' in registry.list()[0],false);
assert.throws(()=>registry.register({{id:' app.bad',label:'Bad',handler(){{}}}}));
assert.throws(()=>registry.register({{id:'app.home',label:'Duplicate',handler(){{}}}}));
assert.throws(()=>registry.register({{id:'app.bad_availability',label:'Bad availability',isAvailable:true,handler(){{}}}}));
"""
        completed = subprocess.run(
            [node, "--input-type=module", "-e", script],
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(completed.returncode, 0, completed.stderr)

    def test_stale_palette_player_action_fails_closed_after_return_home(self):
        node = shutil.which("node")
        self.assertIsNotNone(node)
        registry_url = data_url(FRONTEND / "action-registry.js")
        palette_url = data_url(FRONTEND / "command-palette.js")
        script = f"""
import assert from 'node:assert/strict';
const {{ActionRegistry}}=await import({json.dumps(registry_url)});
const {{CommandPaletteUI}}=await import({json.dumps(palette_url)});
const state={{activeView:'player',currentTask:{{node_id:'LN01-N01'}},nextNodeId:'LN01-N02',nextBusy:false}};
let transportCalls=0;
let hiddenFocusCalls=0;
let closeCalls=0;
let renderCalls=0;
let announcements=[];
const playerContext=()=>state.activeView==='player'&&Boolean(state.currentTask);
const registry=new ActionRegistry([
  {{id:'player.hint',label:'Показати підказку',group:'Гравець',isAvailable:playerContext,handler:()=>{{transportCalls+=1;hiddenFocusCalls+=1}}}},
  {{id:'player.next',label:'Наступне завдання',group:'Гравець',isAvailable:()=>playerContext()&&Boolean(state.nextNodeId)&&!state.nextBusy,handler:()=>{{transportCalls+=1}}}},
  {{id:'authoring.save',label:'Зберегти чернетку',group:'Конструктор',isAvailable:()=>state.activeView==='authoring',handler:()=>{{transportCalls+=1}}}},
]);
const stale=registry.list().find(action=>action.id==='player.hint');
assert.ok(stale);
state.activeView='home';
assert.deepEqual(registry.list().map(action=>action.id),[]);
const palette=new CommandPaletteUI({{registry,announce:text=>announcements.push(text),documentRef:{{}}}});
palette.results=[stale];
palette.selected=0;
palette.close=()=>{{closeCalls+=1}};
palette.render=()=>{{renderCalls+=1;palette.results=registry.list()}};
assert.equal(palette.runSelected(),false);
assert.equal(transportCalls,0);
assert.equal(hiddenFocusCalls,0);
assert.equal(closeCalls,0);
assert.equal(renderCalls,1);
assert.deepEqual(palette.results,[]);
assert.match(announcements.at(-1),/недоступна/);
assert.equal(registry.execute('authoring.save'),false);
assert.equal(transportCalls,0);
state.activeView='player';
state.nextBusy=true;
assert.equal(registry.isAvailable('player.next'),false);
state.nextBusy=false;
assert.equal(registry.isAvailable('player.next'),true);
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
            "registry.execute(action.id)",
            "Команда більше недоступна",
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
        self.assertIn("return actions?.execute(id)??false", source)
        self.assertIn("function isRuntimePlayerContext()", source)
        self.assertIn("function canAdvancePlayer()", source)
        self.assertIn("function isAuthoringContext()", source)
        self.assertIn("isAvailable:canSubmitPlayer", source)
        self.assertIn("isAvailable:canAdvancePlayer", source)
        self.assertIn("nextBusy=Boolean(busy)", source)
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
