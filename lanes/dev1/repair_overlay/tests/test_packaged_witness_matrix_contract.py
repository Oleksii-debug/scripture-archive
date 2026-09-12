import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

from scripture_archive_platform.application.witness_matrix_application import WitnessMatrixPlatformApplication
from scripture_archive_platform.transport.contracts import validate_request_shape


class _WitnessMatrixGateway:
    def __init__(self):
        self.calls = 0

    def get_witness_matrix(self):
        self.calls += 1
        return {
            "schema": "scripture.research.witness-matrix.v1",
            "read_only": True,
            "available_witnesses": ["Luke", "Mark"],
            "matrix": {
                "schema": "witness-matrix.v1",
                "evidence_scope": "unlocked_only",
                "selection_scope": "requested_witnesses",
                "witnesses": ["Luke", "Mark"],
                "absence_semantics": "not stated is not denial",
                "contradiction_semantics": "not_inferred",
                "rows": [],
            },
            "linear": ["Witness Matrix"],
            "truth_owner": "D5/runtime",
        }


class PackagedWitnessMatrixContractTests(unittest.TestCase):
    @staticmethod
    def _request(payload):
        return {
            "api_version": "scripture.transport.v1",
            "request_id": "witness-matrix-contract",
            "command": "research.get_witness_matrix",
            "payload": payload,
        }

    def test_transport_allows_only_empty_read_only_projection_request(self):
        rid, command, payload = validate_request_shape(self._request({}))
        self.assertEqual(rid, "witness-matrix-contract")
        self.assertEqual(command, "research.get_witness_matrix")
        self.assertEqual(payload, {})
        for forbidden in (
            {"witnesses": ["Mark", "Luke"]},
            {"evidence_ids": ["EV-1"]},
            {"include_locked_evidence": True},
        ):
            with self.subTest(payload=forbidden):
                with self.assertRaises(ValueError):
                    validate_request_shape(self._request(forbidden))

    def test_packaged_application_routes_to_read_only_gateway(self):
        gateway = _WitnessMatrixGateway()
        app = object.__new__(WitnessMatrixPlatformApplication)
        app.player_gateway = gateway

        response = app.handle(self._request({}))
        self.assertTrue(response["ok"])
        self.assertEqual(response["data"]["schema"], "scripture.research.witness-matrix.v1")
        self.assertTrue(response["data"]["read_only"])
        self.assertEqual(response["data"]["truth_owner"], "D5/runtime")
        self.assertEqual(gateway.calls, 1)

        rejected = app.handle(self._request({"include_locked_evidence": True}))
        self.assertFalse(rejected["ok"])
        self.assertEqual(rejected["error"]["code"], "VALIDATION_ERROR")
        self.assertEqual(gateway.calls, 1)

    def test_frontend_is_semantic_text_first_and_has_complete_linear_surface(self):
        frontend = Path(__file__).resolve().parents[1] / "frontend"
        ui = (frontend / "witness-matrix-ui.js").read_text(encoding="utf-8")
        transport = (frontend / "transport.js").read_text(encoding="utf-8")

        self.assertIn("research.get_witness_matrix", ui)
        self.assertIn("make('table')", ui)
        self.assertIn("Повний лінійний еквівалент", ui)
        self.assertIn("not_inferred", ui)
        self.assertNotIn("innerHTML", ui)
        self.assertIn("witness-matrix-ui.js", transport)
        self.assertIn("let requestGeneration = 0", ui)
        self.assertIn("const generation = ++requestGeneration", ui)
        self.assertIn("generation !== requestGeneration || !dialog?.open", ui)
        self.assertIn("dialog.addEventListener('cancel', invalidateRequests)", ui)

    def test_close_and_newer_refresh_invalidate_stale_async_completion(self):
        node = shutil.which("node")
        if not node:
            self.skipTest("node unavailable")

        frontend = Path(__file__).resolve().parents[1] / "frontend"
        ui = (frontend / "witness-matrix-ui.js").read_text(encoding="utf-8")
        rewritten = ui.replace(
            "import {chooseTransport, unwrap} from './transport.js';",
            "const chooseTransport = () => ({});\n"
            "const unwrap = async (_transport, command, payload) => await globalThis.__invoke(command, payload);",
            1,
        )
        self.assertNotEqual(ui, rewritten, "Witness Matrix transport import rewrite did not apply")

        with tempfile.TemporaryDirectory() as td:
            module = Path(td) / "witness-matrix-ui.mjs"
            module.write_text(rewritten, encoding="utf-8")
            script = r'''
const all=[];
class Element {
  constructor(tag='div'){
    this.tagName=tag;this.children=[];this.listeners={};this.attrs={};
    this.textContent='';this.className='';this.id='';this.open=false;this.type='';
    this.tabIndex=-1;this.scope='';all.push(this);
  }
  setAttribute(name,value){this.attrs[name]=String(value)}
  getAttribute(name){return this.attrs[name] ?? null}
  addEventListener(type,fn){(this.listeners[type] ||= []).push(fn)}
  async dispatch(type){for(const fn of this.listeners[type]||[])await fn({type,target:this,preventDefault(){}})}
  async click(){await this.dispatch('click')}
  append(...items){this.children.push(...items)}
  insertBefore(item,before){const i=this.children.indexOf(before);if(i<0)this.children.push(item);else this.children.splice(i,0,item)}
  replaceChildren(...items){this.children=[...items]}
  showModal(){this.open=true}
  close(){
    if(!this.open)return;
    this.open=false;
    for(const fn of this.listeners.close||[])fn({type:'close',target:this});
  }
  focus(){document.activeElement=this}
  get nextSibling(){return null}
}
const body=new Element('body');
const nav=new Element('nav');nav.className='top-nav';body.append(nav);
const research=new Element('button');research.id='nav-research';nav.append(research);
globalThis.document={
  body,activeElement:null,
  createElement:tag=>new Element(tag),
  querySelector:selector=>selector==='.top-nav'?nav:null,
  getElementById:id=>all.find(item=>item.id===id)||null,
};

const pending=[];
globalThis.__invoke=async (command,payload)=>{
  if(command==='system.bootstrap')return {capabilities:{witness_matrix:true}};
  if(command!=='research.get_witness_matrix')throw new Error(`unexpected command ${command}`);
  if(Object.keys(payload).length)throw new Error('Witness Matrix payload was not empty');
  return await new Promise(resolve=>pending.push(resolve));
};
const valid=label=>({
  schema:'scripture.research.witness-matrix.v1',read_only:true,truth_owner:'D5/runtime',
  available_witnesses:['Luke','Mark'],
  matrix:{
    schema:'witness-matrix.v1',evidence_scope:'unlocked_only',selection_scope:'requested_witnesses',
    witnesses:['Luke','Mark'],absence_semantics:'not stated is not denial',
    contradiction_semantics:'not_inferred',rows:[],
  },
  linear:[`Witness Matrix ${label}`],
});
const textTree=node=>[node.textContent,...node.children.flatMap(child=>textTree(child))].join(' ');
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));

const mod=await import(MODULE_URI);
await mod.installWitnessMatrixSurface();
const trigger=document.getElementById('nav-witness-matrix');
const dialog=document.getElementById('witness-matrix-dialog');
const close=all.find(item=>item.tagName==='button' && item.textContent==='Закрити');
const reload=all.find(item=>item.tagName==='button' && item.textContent==='Оновити');
const linear=all.find(item=>item.tagName==='section' && item.getAttribute('aria-label')==='Witness Matrix linear equivalent');
if(!trigger||!dialog||!close||!reload||!linear)throw new Error('Witness Matrix test surface was not built');

// A request that resolves after explicit close must not render stale data.
const firstOpen=trigger.click();
await tick();
if(pending.length!==1)throw new Error(`expected one pending first request, got ${pending.length}`);
const staleAfterClose=pending.shift();
await close.click();
if(dialog.open)throw new Error('Witness Matrix dialog did not close');
staleAfterClose(valid('STALE_AFTER_CLOSE'));
await firstOpen;
if(textTree(linear).includes('STALE_AFTER_CLOSE'))throw new Error('closed dialog accepted stale async completion');

// While reopened, a later reload must win even when the older request resolves last.
const reopen=trigger.click();
await tick();
if(pending.length!==1)throw new Error(`expected one pending reopen request, got ${pending.length}`);
const older=pending.shift();
const reloadPending=reload.click();
await tick();
if(pending.length!==1)throw new Error(`expected one pending reload request, got ${pending.length}`);
const newer=pending.shift();
newer(valid('NEWER'));
await reloadPending;
if(!textTree(linear).includes('NEWER'))throw new Error('newer Witness Matrix refresh did not render');
older(valid('OLDER'));
await reopen;
if(!textTree(linear).includes('NEWER'))throw new Error('older completion displaced newer Witness Matrix data');
if(textTree(linear).includes('OLDER'))throw new Error('older Witness Matrix completion rendered after newer request');
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
