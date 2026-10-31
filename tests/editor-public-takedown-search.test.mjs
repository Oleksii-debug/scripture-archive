import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderEditorialTakedownSearch,reviewText} from '../public/material-review.js';
const esc=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(current=()=>true){
  const input={value:''},submit={},form={querySelector:s=>s==='input'?input:submit},status={textContent:''},more={hidden:true};
  const button={disabled:false},feedback={textContent:''},resultForm={dataset:{id:'old-1'},isConnected:true,querySelector:s=>s==='button'?button:feedback};
  const results={innerHTML:'',querySelectorAll:s=>s==='.material-takedown'?[resultForm]:[],insertAdjacentHTML(_where,html){this.innerHTML+=html},querySelector:()=>null};
  const doc={body:{},activeElement:null},root={isConnected:true,ownerDocument:doc,innerHTML:'',querySelector:s=>({'.editor-public-search':form,'.editor-public-status':status,'.editor-public-results':results,'.editor-public-more':more}[s]||null)};
  const main={isConnected:true,ownerDocument:doc,querySelector:()=>null};
  let refreshes=0,announcement='';
  renderEditorialTakedownSearch(root,main,reviewText('en'),'en',esc,async()=>{refreshes++},value=>{announcement=value},current,current);
  return {root,main,form,input,status,more,results,resultForm,button,feedback,get refreshes(){return refreshes},get announcement(){return announcement}};
}
test('editor can search beyond first bounded page and remove a found public item',async()=>{
  const oldFetch=globalThis.fetch,oldForm=globalThis.FormData,calls=[];
  try {
    globalThis.FormData=class {get(){return 'Rights revoked'}};
    globalThis.fetch=async(_url,options)=>{const body=JSON.parse(options.body);calls.push(body);
      if(body.action==='takedown')return Response.json({ok:true});
      if(body.cursor===null)return Response.json({items:[],nextCursor:{id:'cursor-200',submittedAt:'2025-01-01'}});
      return Response.json({items:[{id:'old-1',title:'Old <study>',reference:'GEN 1'}],nextCursor:null});};
    const f=fixture();f.input.value='  Old  ';f.form.onsubmit({preventDefault(){}});await tick();
    assert.equal(f.more.hidden,false);assert.match(f.status.textContent,/continue searching/i);
    f.more.onclick();await tick();
    assert.deepEqual(calls.slice(0,2),[{action:'librarySearch',query:'Old',cursor:null},{action:'librarySearch',query:'Old',cursor:{id:'cursor-200',submittedAt:'2025-01-01'}}]);
    assert.match(f.results.innerHTML,/Old &lt;study&gt;/);assert.equal(f.more.hidden,true);
    await f.resultForm.onsubmit({preventDefault(){}});
    assert.deepEqual(calls.at(-1),{action:'takedown',id:'old-1',reason:'Rights revoked'});assert.equal(f.refreshes,1);assert.match(f.announcement,/removed from publication/i);
  }finally{globalThis.fetch=oldFetch;globalThis.FormData=oldForm;}
});
test('stale view and bad search data cannot create removal controls',async()=>{
  const original=globalThis.fetch;let active=true,finish;
  try{
    globalThis.fetch=()=>new Promise(resolve=>{finish=resolve});const f=fixture(()=>active);
    f.form.onsubmit({preventDefault(){}});active=false;finish(Response.json({items:[{id:'x',title:'old',reference:'GEN 1'}],nextCursor:null}));await tick();
    assert.equal(f.results.innerHTML,'');
    active=true;globalThis.fetch=async()=>Response.json({items:[{id:'',title:'bad',reference:'GEN 1'}],nextCursor:null});
    f.form.onsubmit({preventDefault(){}});await tick();assert.equal(f.results.innerHTML,'');assert.match(f.status.textContent,/Could not search/);
  }finally{globalThis.fetch=original;}
});
test('editor search is mounted only within the editor builder branch',()=>{
  const source=readFileSync(new URL('../public/workspace.js',import.meta.url),'utf8');
  assert.match(source,/role\.editor\?queueMarkup\(reviews\.queue,review,esc\)\+auditMarkup\(reviews\.history,review,esc\)\+'<section class="card" id="editor-public-search"/);
  assert.match(source,/if\(role\.editor\) renderEditorialTakedownSearch/);
});

test('failed or stale takedown does not claim editorial success',async()=>{
  const oldFetch=globalThis.fetch,oldForm=globalThis.FormData;let active=true,calls=0;
  try{
    globalThis.FormData=class {get(){return 'Rights revoked'}};
    globalThis.fetch=async(_url,options)=>{calls++;const body=JSON.parse(options.body);return body.action==='librarySearch'?Response.json({items:[{id:'old-1',title:'Study',reference:'GEN 1'}],nextCursor:null}):Response.json({error:'forbidden'},{status:403});};
    const f=fixture(()=>active);f.form.onsubmit({preventDefault(){}});await tick();
    active=false;await f.resultForm.onsubmit({preventDefault(){}});assert.equal(calls,1);
    active=true;await f.resultForm.onsubmit({preventDefault(){}});assert.equal(calls,2);assert.equal(f.button.disabled,false);assert.equal(f.refreshes,0);assert.match(f.feedback.textContent,/Could not/);
  }finally{globalThis.fetch=oldFetch;globalThis.FormData=oldForm;}
});
