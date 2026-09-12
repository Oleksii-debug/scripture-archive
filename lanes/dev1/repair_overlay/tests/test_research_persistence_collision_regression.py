import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path


class ResearchPersistenceCollisionRegressionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.root = Path(__file__).parents[1]
        cls.source = cls.root / "frontend" / "research-persistence.js"

    def test_target_collision_and_lifecycle_are_executable(self):
        node = shutil.which("node")
        if not node:
            self.skipTest("node unavailable")
        with tempfile.TemporaryDirectory() as td:
            module = Path(td) / "research-persistence.mjs"
            module.write_text(self.source.read_text(encoding="utf-8"), encoding="utf-8")
            script = r'''
const all=[];
class Element {
  constructor(tag){this.tagName=tag;this.children=[];this.attributes={};this.value='';this.textContent='';this.disabled=false;this.id='';all.push(this)}
  append(...items){this.children.push(...items)}
  replaceChildren(...items){this.children=[...items]}
  setAttribute(name,value){this.attributes[name]=String(value)}
  querySelectorAll(selector){
    const wanted=new Set(selector.split(',').map(x=>x.trim().toLowerCase()));
    const out=[];
    const walk=node=>{for(const child of node.children||[]){if(wanted.has(String(child.tagName||'').toLowerCase()))out.push(child);walk(child)}};
    walk(this);return out;
  }
}
globalThis.document={createElement:tag=>new Element(tag),getElementById:id=>all.find(x=>x.id===id)||null};
const mod=await import(MODULE_URI);
const {ResearchPersistenceUI,targetMatchesContext,findCurrentRecord,hasTargetCollision}=mod;
const task={node_id:'NODE-1',mission_id:'MIS-1',source_references:['Mark 1:1']};
const mission={mission_id:'MIS-1',campaign_id:'CAMP-1'};
const exactTarget={kind:'canonical_node',truth_owner:'CanonicalContentLoader',id:'NODE-1',node_id:'NODE-1',mission_id:'MIS-1',campaign_id:'CAMP-1',source_references:['Mark 1:1']};
const globalNote={schema:'scripture.research.note.v1',note_id:'NODE-1',title:'Global',body:'Keep me global',target:null,tags:[]};
const otherTarget={...exactTarget,mission_id:'MIS-2',campaign_id:'CAMP-2'};
const otherNote={...globalNote,title:'Other',target:otherTarget};
const exactNote={...globalNote,title:'Exact',body:'Exact body',target:exactTarget};
if(targetMatchesContext(null,task,mission))throw new Error('null target matched');
if(targetMatchesContext({...exactTarget,source_references:['Luke 1:1']},task,mission))throw new Error('source-ref mismatch matched');
if(!targetMatchesContext(exactTarget,task,mission))throw new Error('exact target did not match');
if(findCurrentRecord('note',[globalNote,otherNote],task,mission)!==null)throw new Error('colliding non-current note hydrated');
if(findCurrentRecord('note',[globalNote,exactNote],task,mission)!==exactNote)throw new Error('exact current note not selected');
if(!hasTargetCollision('note',[globalNote],task,mission))throw new Error('global-note collision not detected');
if(!hasTargetCollision('note',[otherNote],task,mission))throw new Error('unrelated-target collision not detected');
if(hasTargetCollision('note',[exactNote],task,mission))throw new Error('exact-target record treated as collision');

const calls=[];
let phase='collision';
async function invoke(command,payload={}){
  calls.push(command);
  if(command==='research.list_bookmarks')return {bookmarks:[]};
  if(command==='research.list_notes')return {notes:phase==='collision'?[globalNote]:[exactNote]};
  if(command==='research.upsert_note')return {note:{schema:'scripture.research.note.v1',...payload.note,target:exactTarget}};
  if(command==='research.delete_note'||command==='research.delete_bookmark')return {deleted:true};
  if(command==='research.upsert_bookmark')throw new Error('unexpected bookmark save');
  throw new Error(`unexpected command ${command}`);
}
const host=new Element('div');
const ui=new ResearchPersistenceUI({host,invoke,capabilities:{research_bookmarks_notes:true,research_workspace_persistence:true}});
ui.setContext({task,mission});
await ui.refresh();
if(ui.noteForm.title.value!==''||ui.noteForm.body.value!=='')throw new Error('global colliding note hydrated editor');
ui.noteForm.title.value='Canonical note';
ui.noteForm.body.value='Canonical body';
await ui._save('note');
if(calls.includes('research.upsert_note'))throw new Error('collision allowed destructive upsert');
if(!ui.status.textContent.includes('record id collision'))throw new Error('collision did not fail closed visibly');

phase='exact';
calls.length=0;
await ui.refresh();
if(ui.noteForm.title.value!=='Exact'||ui.noteForm.body.value!=='Exact body')throw new Error('exact-target note did not hydrate');
ui.noteForm.title.value='Updated';
ui.noteForm.body.value='Updated body';
await ui._save('note');
if(calls.filter(x=>x==='research.upsert_note').length!==1)throw new Error('exact-target update not persisted exactly once');

let release;
const gate=new Promise(resolve=>{release=resolve});
async function delayed(command){
  if(command==='research.list_bookmarks'){await gate;return {bookmarks:[]}}
  if(command==='research.list_notes'){await gate;return {notes:[exactNote]}}
  throw new Error(`unexpected delayed command ${command}`);
}
const staleHost=new Element('div');
const stale=new ResearchPersistenceUI({host:staleHost,invoke:delayed,capabilities:{research_bookmarks_notes:true,research_workspace_persistence:true}});
stale.setContext({task,mission});
const pending=stale.refresh();
const nextTask={node_id:'NODE-2',mission_id:'MIS-2',source_references:['Luke 2:1']};
const nextMission={mission_id:'MIS-2',campaign_id:'CAMP-2'};
stale.setContext({task:nextTask,mission:nextMission});
const expectedStatus=stale.status.textContent;
release();
await pending;
if(stale.status.textContent!==expectedStatus)throw new Error('stale refresh overwrote new context status');
if(stale.noteForm.title.value!==''||stale.noteForm.body.value!=='')throw new Error('stale refresh hydrated old context');

let releaseSave;
const saveGate=new Promise(resolve=>{releaseSave=resolve});
const saveCalls=[];
async function delayedSave(command,payload={}){
  saveCalls.push(command);
  if(command==='research.list_notes'){await saveGate;return {notes:[]}}
  if(command==='research.list_bookmarks')return {bookmarks:[]};
  if(command==='research.upsert_note')return {note:{schema:'scripture.research.note.v1',...payload.note,target:exactTarget}};
  throw new Error(`unexpected delayed-save command ${command}`);
}
const staleSaveHost=new Element('div');
const staleSave=new ResearchPersistenceUI({host:staleSaveHost,invoke:delayedSave,capabilities:{research_bookmarks_notes:true,research_workspace_persistence:true}});
staleSave.setContext({task,mission});
staleSave.noteForm.title.value='Old context note';
staleSave.noteForm.body.value='Must not cross context';
const savePending=staleSave._save('note');
staleSave.setContext({task:nextTask,mission:nextMission});
const nextStatus=staleSave.status.textContent;
releaseSave();
await savePending;
if(saveCalls.includes('research.upsert_note'))throw new Error('stale save crossed context into upsert');
if(staleSave.status.textContent!==nextStatus)throw new Error('stale save overwrote new context status');
if(staleSave.noteForm.title.value!==''||staleSave.noteForm.body.value!=='')throw new Error('stale save repopulated new context form');
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
