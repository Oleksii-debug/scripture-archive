import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend"
HTML = (FRONTEND / "index.html").read_text(encoding="utf-8")
JS = (FRONTEND / "mastery.js").read_text(encoding="utf-8")
CONTRACTS = (ROOT / "scripture_archive_platform" / "transport" / "contracts.py").read_text(encoding="utf-8")
SERVICE = (ROOT / "scripture_archive_platform" / "application" / "service.py").read_text(encoding="utf-8")


class PackagedMasteryCurrentCompositionTests(unittest.TestCase):
    def test_uses_existing_runtime_truth_only(self):
        self.assertIn("api('player.get_mastery', {})", JS)
        self.assertNotIn("review_queue", JS)
        self.assertNotIn("player.get_review", JS)
        self.assertNotIn("innerHTML", JS)
        self.assertIn('"player.get_mastery"', CONTRACTS)
        self.assertIn("if cmd=='player.get_mastery':return self._mastery()", SERVICE)

    def test_semantic_keyboard_first_surface(self):
        self.assertIn('id="nav-mastery"', HTML)
        self.assertIn('id="mastery-heading" tabindex="-1"', HTML)
        self.assertIn('role="region" aria-label="Таблиця майстерності" tabindex="0"', HTML)
        self.assertIn('<caption>Стан майстерності з canonical runtime</caption>', HTML)
        self.assertIn('<th scope="col">', HTML)
        self.assertIn('src="mastery.js"', HTML)

    def test_current_packaged_shell_is_preserved(self):
        for marker in (
            'href="research-workbench.css"',
            'id="nav-research"',
            'id="research-view"',
            'id="research-current"',
            'id="nav-application-update"',
            'id="application-update-view"',
            'src="application-update.js"',
            'id="authoring-view"',
        ):
            self.assertIn(marker, HTML)

    def test_runtime_fields_are_rendered_inertly(self):
        for field in (
            "concept_id",
            "state",
            "stability_days",
            "difficulty",
            "consecutive_independent_successes",
            "guided_successes",
            "failures",
            "due_at",
        ):
            self.assertIn(f"item.{field}", JS)
        self.assertIn("td.textContent = value ?? '—'", JS)
        self.assertIn("parseRows(data)", JS)

    def test_stale_async_navigation_is_executable(self):
        node = shutil.which("node")
        if not node:
            self.skipTest("node unavailable")

        rewritten = JS.replace(
            "import {chooseTransport, unwrap} from './transport.js';",
            "const chooseTransport = async () => ({});\n"
            "const unwrap = async (_transport, command, payload) => await globalThis.__invoke(command, payload);",
            1,
        )
        self.assertNotEqual(JS, rewritten, "mastery transport import rewrite did not apply")

        with tempfile.TemporaryDirectory() as td:
            module = Path(td) / "mastery.mjs"
            module.write_text(rewritten, encoding="utf-8")
            script = r'''
class ClassList {
  constructor(values=[]){this.values=new Set(values)}
  add(...values){for(const value of values)this.values.add(value)}
  remove(...values){for(const value of values)this.values.delete(value)}
  contains(value){return this.values.has(value)}
  toggle(value, force){
    if(force===true){this.values.add(value);return true}
    if(force===false){this.values.delete(value);return false}
    if(this.values.has(value)){this.values.delete(value);return false}
    this.values.add(value);return true
  }
}
class Element {
  constructor(id,{hidden=false}={}){
    this.id=id;this.classList=new ClassList(hidden?['hidden']:[]);this.listeners={};
    this.textContent='';this.children=[];
  }
  addEventListener(type,fn){(this.listeners[type] ||= []).push(fn)}
  async click(){for(const fn of this.listeners.click||[])await fn({target:this})}
  focus(){document.activeElement=this}
  replaceChildren(...items){this.children=[...items]}
  append(...items){this.children.push(...items)}
}
const elements=new Map();
function add(id, hidden=false){const el=new Element(id,{hidden});elements.set(id,el);return el}
add('global-status');
add('nav-mastery');add('nav-home');add('nav-research');add('nav-authoring');add('nav-application-update');
add('mission-back');add('research-return');
add('home-view');add('mission-view',true);add('player-view',true);add('research-view',true);
add('application-update-view',true);add('authoring-view',true);add('mastery-view',true);
add('mastery-heading');add('mastery-rows');add('mastery-empty',true);add('mastery-count');
globalThis.document={
  readyState:'complete',activeElement:null,
  getElementById:id=>elements.get(id)||null,
  createElement:tag=>new Element(tag),
};
globalThis.MutationObserver=class{constructor(fn){this.fn=fn}observe(){}};
globalThis.requestAnimationFrame=fn=>fn();

let release;
const gate=new Promise(resolve=>{release=resolve});
globalThis.__invoke=async (command,payload)=>{
  if(command!=='player.get_mastery')throw new Error(`unexpected command ${command}`);
  if(Object.keys(payload).length)throw new Error('mastery payload was not empty');
  return await gate;
};
await import(MODULE_URI);

const pending=elements.get('nav-mastery').click();
await Promise.resolve();
await elements.get('nav-research').click();
elements.get('home-view').classList.add('hidden');
elements.get('research-view').classList.remove('hidden');
release({mastery:[{concept_id:'C-1',state:'learning',stability_days:2,difficulty:3,
  consecutive_independent_successes:1,guided_successes:0,failures:0,due_at:null}]});
await pending;
if(!elements.get('mastery-view').classList.contains('hidden'))throw new Error('stale mastery response reopened mastery view');
if(elements.get('research-view').classList.contains('hidden'))throw new Error('stale mastery response hid the intervening research view');
if(document.activeElement===elements.get('mastery-heading'))throw new Error('stale mastery response stole focus');

// A later, current request must still be allowed to render normally.
globalThis.__invoke=async ()=>({mastery:[{concept_id:'C-2',state:'review',stability_days:5,difficulty:2,
  consecutive_independent_successes:2,guided_successes:0,failures:1,due_at:'2030-01-01T00:00:00Z'}]});
await elements.get('nav-mastery').click();
await new Promise(resolve=>setTimeout(resolve,0));
if(elements.get('mastery-view').classList.contains('hidden'))throw new Error('fresh mastery request did not open mastery view');
if(!elements.get('research-view').classList.contains('hidden'))throw new Error('mastery view did not exclude research view');
if(elements.get('mastery-rows').children.length!==1)throw new Error('fresh mastery row was not rendered');
if(document.activeElement!==elements.get('mastery-heading'))throw new Error('fresh mastery view did not move focus to heading');
'''
            script = script.replace("MODULE_URI", json.dumps(module.as_uri()))
            result = subprocess.run(
                [node, "--input-type=module", "-e", script],
                capture_output=True,
                text=True,
            )
            self.assertEqual(0, result.returncode, result.stderr)


if __name__ == "__main__":
    unittest.main()
