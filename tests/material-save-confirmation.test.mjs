import test from 'node:test';
import assert from 'node:assert/strict';
import {renderWorkspace} from '../public/workspace.js';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const response=(data,status=200)=>Response.json(data,{status});
const resource={materialType:'audio',title:'My audio draft',prompt:'A description of the reading.',reference:'GEN 12',url:'https://publisher.example/audio',accessibility:'A complete text alternative for the recording.'};
function fixture(){
 const prior=Object.fromEntries(['document','location','fetch','FormData'].map(key=>[key,globalThis[key]]));
 const state={lang:'en',user:{id:'author'},sessionUnavailable:false};let nodes={},html='',roleReads=0,writes=0,failRefresh=false,pending=null,receipt={ok:true,id:'owned'};
 const announcements=[],requests=[];
 const doc={body:{},activeElement:null,querySelector:selector=>selector==='main'?main:nodes[selector]||null,querySelectorAll:selector=>selector==='[data-edit]'?[nodes.edit]:[]};doc.activeElement=doc.body;
 const focusable=()=>({isConnected:true,hasAttribute:()=>false,setAttribute(){},focus(){doc.activeElement=this;}});
 const main={ownerDocument:doc,isConnected:true,querySelector:selector=>nodes[selector]||null,querySelectorAll:()=>[]};
 function shell(value){
   if(nodes['#material-form']){nodes['#material-form'].isConnected=false;if(doc.activeElement!==doc.body)doc.activeElement=doc.body;}
   html=value;
   const button={...focusable(),disabled:false};let retry={...focusable(),disabled:false},statusHtml='';
   const form={isConnected:true,payload:{...resource},querySelector:()=>button,contains:target=>target===button};
   const status={...focusable(),textContent:'',get innerHTML(){return statusHtml;},set innerHTML(value){statusHtml=value;if(doc.activeElement===retry)doc.activeElement=doc.body;retry.isConnected=false;retry={...focusable(),disabled:false};},querySelector:()=>retry};
   nodes={'#material-form':form,'#material-status':status,'#material-type':{value:'audio'},'#material-quiz-fields':{},'#material-resource-fields':{},'#new-material':{},'#public-materials':{isConnected:false},'.section-head h1':focusable(),edit:{dataset:{edit:'owned'}},button,retry};
 }
 globalThis.document=doc;globalThis.location={pathname:'/builder',search:'',hash:''};
 globalThis.FormData=class{constructor(form){this.payload=form.payload;}*[Symbol.iterator](){yield*Object.entries(this.payload);}};
 globalThis.fetch=async(url,options={})=>{
  if(url==='/api/editor-roles?view=me'){roleReads++;if(failRefresh&&roleReads>1)return response({error:'unavailable'},503);return response({editor:false,owner:false});}
  if(url==='/api/materials?mine=1')return response({materials:[{id:'owned',title:'Existing audio',locale:'uk',visibility:'private',data:{...resource,kind:'resource',resourceType:'audio'}}]});
  if(url.startsWith('/api/material-review?'))return response({items:[]});
  if(url==='/api/materials'&&options.method==='POST'){writes++;requests.push(JSON.parse(options.body));return pending?pending:response(receipt);}
  throw Error('Unexpected API '+url);
 };
 const ctx={state,t:key=>key,esc:String,shell,setActiveNav(){},announce:text=>announcements.push(text)};
 return {ctx,state,doc,announcements,requests,get form(){return nodes['#material-form'];},get status(){return nodes['#material-status'];},get button(){return nodes.button;},get retry(){return nodes['#material-status'].querySelector('button');},get html(){return html;},get reads(){return roleReads;},get writes(){return writes;},setReceipt:value=>{receipt=value;},failRefresh:value=>{failRefresh=value;},defer(){let resolve;pending=new Promise(done=>resolve=done);return value=>resolve(response(value));},edit:()=>nodes.edit.onclick(),newDraft:()=>nodes['#new-material'].onclick({currentTarget:nodes['#new-material']}),async submit(){return nodes['#material-form'].onsubmit({preventDefault(){},currentTarget:nodes['#material-form']});},restore(){for(const [key,value] of Object.entries(prior))if(value===undefined)delete globalThis[key];else globalThis[key]=value;}};
}

test('a successful HTTP response without an exact typed save receipt preserves the authored form and never announces saved',async()=>{
 for(const receipt of [{},{ok:false,id:'owned'},{ok:'true',id:'owned'},{ok:true},{ok:true,id:''},{ok:true,id:7},{ok:true,id:'x'.repeat(81)},{ok:true,id:' other '}]){
  const f=fixture();try{await renderWorkspace('builder',f.ctx);const form=f.form;f.setReceipt(receipt);await f.submit();assert.equal(f.form,form);assert.equal(f.reads,1);assert.deepEqual(f.announcements,[]);assert.match(f.status.textContent,/Could not save/);assert.equal(f.button.disabled,false);}finally{f.restore();}
 }
});
test('editing requires the receipt for the same draft and preserves the original material language',async()=>{
 const f=fixture();try{await renderWorkspace('builder',f.ctx);f.edit();f.setReceipt({ok:true,id:'someone-else'});const form=f.form;await f.submit();assert.equal(f.form,form);assert.equal(f.requests[0].id,'owned');assert.equal(f.requests[0].locale,'uk');assert.deepEqual(f.announcements,[]);assert.match(f.status.textContent,/Could not save/);}finally{f.restore();}
});
test('confirmed save plus failed refresh reports both facts and retries reads without resubmitting the draft',async()=>{
 const f=fixture();try{
  await renderWorkspace('builder',f.ctx);f.failRefresh(true);f.doc.activeElement=f.button;await f.submit();
  assert.equal(f.writes,1);assert.equal(f.reads,2);assert.match(f.status.innerHTML,/Material saved/);assert.match(f.status.innerHTML,/Could not refresh the list/);assert.equal(f.doc.activeElement,f.status);
  assert.match(f.announcements[0],/do not need to submit the material again/);
  // The retired form cannot submit another copy, even before retry succeeds.
  await f.submit();assert.equal(f.writes,1);
  const retry=f.retry;f.doc.activeElement=retry;retry.onclick();await tick();assert.equal(f.writes,1);assert.equal(f.reads,3);assert.equal(f.doc.activeElement,f.status);
  f.failRefresh(false);f.doc.activeElement=f.retry;f.retry.onclick();await tick();
  assert.equal(f.writes,1);assert.equal(f.reads,4);assert.equal(f.announcements.at(-1),'Material saved.');assert.equal(f.doc.activeElement,f.doc.querySelector('main').querySelector('.section-head h1'));
 }finally{f.restore();}
});
test('a new draft opened during a pending save retains its input and is not replaced by the previous save completion',async()=>{
 const f=fixture();try{
  await renderWorkspace('builder',f.ctx);const finish=f.defer(),oldForm=f.form,save=f.submit();f.newDraft();const nextForm=f.form;nextForm.payload.title='New unsaved text';finish({ok:true,id:'owned'});await save;
  assert.equal(oldForm.isConnected,false);assert.equal(f.form,nextForm);assert.equal(nextForm.payload.title,'New unsaved text');assert.equal(f.reads,1);assert.deepEqual(f.announcements,['Material saved.']);
 }finally{f.restore();}
});
test('refresh recovery controls from a prior account cannot read or announce after identity changes',async()=>{
 const f=fixture();try{await renderWorkspace('builder',f.ctx);f.failRefresh(true);await f.submit();const retry=f.retry,count=f.announcements.length;f.state.user={id:'other'};retry.onclick();await tick();assert.equal(f.reads,2);assert.equal(f.announcements.length,count);}finally{f.restore();}
});
