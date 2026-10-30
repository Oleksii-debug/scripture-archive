import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { attachReviewControls, attachEditorRoles } from '../public/material-review.js';

const source=readFileSync(new URL('../public/workspace.js',import.meta.url),'utf8');
const start=source.indexOf('let builderViewEpoch=0;');
assert.ok(start>0,'existing canonical builder view must own the live-principal boundary');
const production=source.slice(start).replace('export async function renderWorkspace','async function renderWorkspace')+'\n;({renderWorkspace})';

function deferred(){
  let resolve;
  const promise=new Promise(done=>{resolve=done;});
  return {promise,resolve};
}
function fixture({onRole,onMaterials,path='/builder',hash=''}={}){
  const state={lang:'en',user:{id:'alice'},sessionUnavailable:false};
  const location={pathname:path,hash};
  const html=[],calls=[],attached=[],announcements=[],nodes={};
  const deleteButton={dataset:{delete:'private-alice'},disabled:false,onclick:null};
  const document={
    querySelector:selector=>nodes[selector] ||= {onclick:null,onsubmit:null,isConnected:true},
    querySelectorAll:selector=>selector==='[data-delete]'?[deleteButton]:[],
  };
  const review=new Proxy({}, {get:(_target,key)=>String(key)});
  const copy=new Proxy({}, {get:(_target,key)=>String(key)});
  const vmContext={
    state,location,document,window:{confirm(){throw Error('stale confirm opened');}},
    workspaceCopy:()=>copy,reviewText:()=>review,
    setActiveNav(){},shell:markup=>html.push(markup),esc:value=>String(value),
    request:async path=>{
      calls.push(path);
      if(path==='/api/editor-roles?view=me')return onRole?onRole():{owner:true,editor:true};
      if(path==='/api/materials?mine=1')return onMaterials?onMaterials():{materials:[]};
      if(path==='/api/editor-roles')return {editors:[]};
      if(path==='/api/editor-roles?view=audit')return {events:[]};
      throw Error('Unexpected request '+path);
    },
    loadReviewData:async()=>({mine:[],queue:[],history:[]}),
    editorRolesMarkup:()=>'',historyMarkup:()=>'',queueMarkup:()=>'',auditMarkup:()=>'',submissionForm:()=>'',renderPublicMaterials:async()=>{},
    attachReviewControls:(...args)=>attached.push(['review',...args]),
    attachEditorRoles:(...args)=>attached.push(['roles',...args]),
    getMission:async()=>({}),getCatalog:async()=>({}),dossierMarkup:()=>'',dossierAtlasMarkup:()=>'',
    play(){},announce:message=>announcements.push(message),
    FormData,URLSearchParams,URL,console,
  };
  const {renderWorkspace}=vm.runInNewContext(production,vmContext);
  const c={state,t:key=>key,esc:value=>String(value),shell:markup=>html.push(markup),
    getMission:async()=>({}),getCatalog:async()=>({}),setActiveNav(){},
    announce:message=>announcements.push(message),play(){},loadJSON:()=>[]};
  return {state,location,html,calls,attached,announcements,document,nodes,deleteButton,
    render:()=>renderWorkspace('builder',c),
    switchAccount:()=>{state.user={id:'bob'};},
  };
}

test('late editor-role authorization cannot trigger a former account private material read',async()=>{
  const role=deferred(),h=fixture({onRole:()=>role.promise});
  const pending=h.render();
  h.switchAccount();
  role.resolve({editor:true,owner:true});
  await pending;
  assert.deepEqual(h.calls,['/api/editor-roles?view=me']);
  assert.deepEqual(h.html,[]);
  assert.deepEqual(h.attached,[]);
});

test('late private material response cannot repaint an account route',async()=>{
  const materials=deferred(),started=deferred();
  const h=fixture({onMaterials:()=>{started.resolve();return materials.promise;}});
  const pending=h.render();
  await started.promise;
  h.location.pathname='/account';
  materials.resolve({materials:[{id:'secret',title:'PRIVATE ALICE MATERIAL',data:{}}]});
  await pending;
  assert.equal(h.html.length,0,'stale builder must not publish old private content');
  assert.deepEqual(h.attached,[]);
});

test('newer builder request supersedes an earlier pending response from the same principal',async()=>{
  const first=deferred();let calls=0;
  const h=fixture({onRole:()=>++calls===1?first.promise:{editor:true,owner:true}});
  const previous=h.render();
  await h.render();
  assert.equal(h.html.length,1);
  first.resolve({editor:true,owner:true});
  await previous;
  assert.equal(h.html.length,1);
  assert.equal(calls,2);
});

test('current builder binds real review and editor guards with native forms',async()=>{
  const h=fixture();
  await h.render();
  assert.equal(h.html.length,1);
  assert.match(h.html[0],/id="material-form"/);
  assert.equal(typeof h.nodes['#material-form'].onsubmit,'function');
  assert.equal(typeof h.nodes['#new-material'].onclick,'function');
  assert.equal(h.attached.length,2);
  assert.equal(h.attached[0][0],'review');
  assert.equal(h.attached[1][0],'roles');
  assert.equal(h.attached[0][5](),true,'mutation guard must accept current principal');
  assert.equal(h.attached[0][6](),true,'presentation guard must accept current principal');
  h.switchAccount();
  assert.equal(h.attached[0][5](),false,'mutation guard must revoke stale principal');
  assert.equal(h.attached[0][6](),false,'presentation guard must revoke stale principal');
});

test('stale builder new, edit, delete and submit controls never begin an API write',async()=>{
  const h=fixture();
  await h.render();
  const before=h.calls.length,painted=h.html.length;
  h.switchAccount();
  await h.nodes['#material-form'].onsubmit({preventDefault(){}});
  await h.deleteButton.onclick();
  h.nodes['#new-material'].onclick();
  assert.equal(h.calls.length,before);
  assert.equal(h.html.length,painted);
  assert.deepEqual(h.announcements,[]);
});

test('hash-based builder is supported and a moved hash invalidates retained controls',async()=>{
  const h=fixture({path:'/',hash:'#/builder'});
  await h.render();
  assert.equal(h.html.length,1);
  h.location.hash='#/account';
  assert.equal(h.attached[0][5](),false);
  await h.nodes['#material-form'].onsubmit({preventDefault(){}});
  assert.deepEqual(h.calls,['/api/editor-roles?view=me','/api/materials?mine=1','/api/editor-roles','/api/editor-roles?view=audit']);
});

test('obsolete editorial review and editor-role UI callbacks do not POST or read FormData',async()=>{
  const submission={onsubmit:null,querySelector:()=>({disabled:false})};
  const withdrawal={onclick:null,dataset:{id:'private-submission'}};
  const reviewButton={onclick:null,dataset:{decision:'approve'}};
  const reviewForm={querySelectorAll:selector=>selector==='[data-decision]'?[reviewButton]:[]};
  const root={
    querySelectorAll:selector=>selector==='.material-submit'?[submission]:
      selector==='.material-withdraw'?[withdrawal]:
      selector==='.material-review'?[reviewForm]:[],
  };
  let refreshes=0,announced=0;
  attachReviewControls(root,{},async()=>{refreshes++;},()=>{announced++;},()=>false,()=>false);
  await submission.onsubmit({preventDefault(){}});
  await withdrawal.onclick();
  await reviewButton.onclick();
  const roleForm={onsubmit:null,querySelector:()=>({disabled:false})};
  const revoke={onclick:null,dataset:{id:'previous-editor'}};
  const editorRoot={querySelector:selector=>selector==='#editor-role-form'?roleForm:{textContent:''},
    querySelectorAll:selector=>selector==='.editor-revoke'?[revoke]:[]};
  attachEditorRoles(editorRoot,'en',async()=>{refreshes++;},()=>{announced++;},()=>false,()=>false);
  roleForm.onsubmit({preventDefault(){}});
  await revoke.onclick();
  assert.equal(refreshes,0);
  assert.equal(announced,0);
});
