import test from 'node:test';
import assert from 'node:assert/strict';
import {createEventRegistrations} from '../public/event-registration.js';

function formFixture(){
  const feedback={textContent:''},button={setAttribute(){},removeAttribute(){}},form={isConnected:true,dataset:{event:'event'},querySelector(selector){return selector==='button'?button:feedback;}};
  let current=true;
  const root={querySelector(){return null;},querySelectorAll(selector){return selector==='.event-registration'?[form]:[];}};
  const controller=createEventRegistrations(root,'en',String,true,()=>current);
  controller.attachForms();
  return {form,feedback,controller,expire(){current=false;}};
}

test('registration form requires confirmed receipt, retries safely and suppresses duplicate pending submits',async()=>{
  const previousFetch=globalThis.fetch,previousFormData=globalThis.FormData;
  globalThis.FormData=class{get(){return 'Reader Alias';}has(){return true;}};
  let posts=0,release;
  globalThis.fetch=async(_url,options)=>{posts++;const body=JSON.parse(options.body);assert.deepEqual(body,{action:'register',eventId:'event',attendeeName:'Reader Alias',sharingConsent:true});await new Promise(resolve=>{release=resolve;});return Response.json({ok:posts>1});};
  const f=formFixture();
  try{
    const first=f.form.onsubmit({preventDefault(){}});
    await f.form.onsubmit({preventDefault(){}});assert.equal(posts,1);
    release();await first;assert.match(f.feedback.textContent,/could not be completed/);
    const second=f.form.onsubmit({preventDefault(){}});release();await second;
    assert.equal(posts,2);assert.match(f.feedback.textContent,/Registration saved/);
  }finally{globalThis.fetch=previousFetch;globalThis.FormData=previousFormData;}
});

test('stale registration forms neither write nor display delayed personal state',async()=>{
  const previousFetch=globalThis.fetch,previousFormData=globalThis.FormData;
  globalThis.FormData=class{get(){return 'Reader Alias';}has(){return true;}};
  let calls=0,release;
  globalThis.fetch=async()=>{calls++;await new Promise(resolve=>{release=resolve;});return Response.json({ok:true});};
  const f=formFixture();
  try{
    const pending=f.form.onsubmit({preventDefault(){}});f.expire();release();await pending;
    assert.equal(f.feedback.textContent,'');await f.form.onsubmit({preventDefault(){}});assert.equal(calls,1);
  }finally{globalThis.fetch=previousFetch;globalThis.FormData=previousFormData;}
});

test('private roster continues after 100 rows and moves focus to a readable table without exposing identity fields',async()=>{
  const originalFetch=globalThis.fetch,doc={activeElement:null},heading={focus(){doc.activeElement=this;}};
  const target={innerHTML:'',querySelector(){return heading;}};
  const button={isConnected:true,dataset:{event:'event'},setAttribute(){},removeAttribute(){},closest(){return {querySelector(){return target;}};}};
  const root={ownerDocument:doc,querySelector(){return null;},querySelectorAll(selector){return selector==='.event-roster'?[button]:[];}};
  const calls=[];
  globalThis.fetch=async url=>{const after=new URL(url,'https://local.invalid').searchParams.get('after');calls.push(after);return Response.json({items:[{id:after?'last':'first',attendeeName:after?'Second Alias':'First Alias',consentAt:'2099-05-10 09:00:00',email:'never-shared@example.invalid'}],nextCursor:after?null:'first'});};
  try{
    const c=createEventRegistrations(root,'en',String,true,()=>true);c.attachRosters();
    doc.activeElement=button;await button.onclick();assert.equal(doc.activeElement,heading);
    assert.match(target.innerHTML,/First Alias/);assert.equal(button.hidden,false);
    doc.activeElement=button;await button.onclick();assert.deepEqual(calls,[null,'first']);
    assert.match(target.innerHTML,/First Alias/);assert.match(target.innerHTML,/Second Alias/);assert.doesNotMatch(target.innerHTML,/never-shared/);
    assert.equal(button.hidden,true);assert.equal(doc.activeElement,heading);
  }finally{globalThis.fetch=originalFetch;}
});

const registration={id:'registration-1',eventId:'event',attendeeName:'Reader Alias',consentAt:'2099-05-10 09:00:00',title:'Reading conference',startsOn:'2099-05-10',endsOn:'2099-05-11',available:true};
function mineFixture(){
  const doc={body:{},activeElement:null},feedback={textContent:''};let cancel=null,download=null,current=true;
  const node=()=>({isConnected:true,attributes:{},setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];},focus(){doc.activeElement=this;}});
  const status={...node(),textContent:''},submit=node(),input=node();
  const form={isConnected:true,dataset:{event:'event'},querySelector:s=>s==='button'?submit:feedback};
  const mine={html:'',get innerHTML(){return this.html;},set innerHTML(value){
    if(cancel){cancel.isConnected=false;if(doc.activeElement===cancel)doc.activeElement=doc.body;}if(download)download.isConnected=false;
    this.html=value;cancel=value.includes('event-registration-cancel')?{...node(),dataset:{event:'event'}}:null;
    download=value.includes('event-registration-export')?node():null;
  },querySelectorAll:s=>s==='.event-registration-cancel'&&cancel?[cancel]:[],querySelector:s=>s==='.event-registration-export'?download:s==='.event-attendance-status'&&mine.html.includes('event-attendance-status')?status:null};
  const root={ownerDocument:doc,querySelector:s=>s==='.event-attendance'?mine:null,querySelectorAll:s=>s==='.event-registration'?[form]:[]};
  const controller=createEventRegistrations(root,'en',String,true,()=>current);controller.attachForms();
  return {doc,mine,form,submit,feedback,input,status,controller,get cancel(){return cancel;},get download(){return download;},expire(){current=false;}};
}
async function withMine(callback){
  const oldFetch=globalThis.fetch,oldFormData=globalThis.FormData,f=mineFixture(),writes=[];let records=[registration];
  globalThis.FormData=class{get(){return 'Reader Alias';}has(){return true;}};
  const network=async(url,options)=>{
    if(options){const body=JSON.parse(options.body);writes.push(body);records=body.action==='cancel'?[]:[registration];return Response.json({ok:true});}
    return Response.json({items:records});
  };
  globalThis.fetch=network;
  try{await f.controller.loadMine();await callback(f,writes,network);}finally{globalThis.fetch=oldFetch;globalThis.FormData=oldFormData;}
}

test('a pre-cancellation read cannot replace the active button or resurrect the cancelled registration',()=>withMine(async(f,writes,network)=>{
  let releaseRead,releaseWrite,reads=0;
  globalThis.fetch=async(url,options)=>{
    if(options){await new Promise(resolve=>releaseWrite=resolve);return network(url,options);}
    if(++reads===1){await new Promise(resolve=>releaseRead=resolve);return Response.json({items:[registration]});}
    return network(url,options);
  };
  const stale=f.controller.loadMine(),button=f.cancel;f.doc.activeElement=button;
  const mutation=button.onclick();releaseRead();await stale;
  assert.equal(f.cancel,button,'the pending mutation must retain its live control');
  releaseWrite();await mutation;
  assert.equal(writes.length,1);assert.equal(f.cancel,null);assert.match(f.mine.innerHTML,/Registration cancelled/);assert.equal(f.doc.activeElement,f.status);
}));

test('register, cancel, list refresh and export share the pending registration boundary',()=>withMine(async(f,writes,network)=>{
  let release,reads=0,posts=0;
  globalThis.fetch=async(url,options)=>{if(options){posts++;await new Promise(resolve=>release=resolve);}else reads++;return network(url,options);};
  const button=f.cancel,download=f.download,pending=button.onclick();
  await f.form.onsubmit({preventDefault(){}});await button.onclick();await f.controller.loadMine();
  assert.doesNotThrow(()=>download.onclick(),'pending cancellation must not create a stale export');
  assert.equal(posts,1);assert.equal(reads,0);release();await pending;assert.equal(writes.length,1);assert.equal(reads,1);
  const saved=f.form.onsubmit({preventDefault(){}});assert.equal(posts,2);release();await saved;
  assert.equal(writes.length,2);assert.match(f.feedback.textContent,/Registration saved/);assert.ok(f.cancel);
}));

test('acknowledged cancellation keeps its confirmation and focus when refreshing records fails',()=>withMine(async(f,writes,network)=>{
  globalThis.fetch=async(url,options)=>options?network(url,options):Response.json({error:'offline'},{status:503});
  f.doc.activeElement=f.cancel;await f.cancel.onclick();
  assert.equal(writes.length,1);assert.match(f.mine.innerHTML,/Registration cancelled/);assert.match(f.mine.innerHTML,/role="alert"/);
  assert.match(f.mine.innerHTML,/list could not be refreshed/);assert.doesNotMatch(f.mine.innerHTML,/action could not be completed/);
  assert.equal(f.doc.activeElement,f.status);assert.equal(f.cancel,null);
}));

test('unconfirmed cancellation retains the current record, permits retry, and preserves deliberately moved focus',()=>withMine(async(f,writes,network)=>{
  const button=f.cancel;globalThis.fetch=async(url,options)=>options?Response.json({ok:false}):network(url,options);
  await button.onclick();assert.equal(f.cancel,button);assert.match(f.status.textContent,/could not be completed/);assert.equal(button.attributes['aria-disabled'],undefined);
  let release;globalThis.fetch=async(url,options)=>{if(options)await new Promise(resolve=>release=resolve);return network(url,options);};
  f.doc.activeElement=button;const pending=button.onclick();f.doc.activeElement=f.input;release();await pending;
  assert.equal(writes.length,1);assert.equal(f.cancel,null);assert.equal(f.doc.activeElement,f.input);
}));

test('cancellation completion after leaving the page cannot restore private state',()=>withMine(async(f,writes,network)=>{
  let release,reads=0;globalThis.fetch=async(url,options)=>{if(options)await new Promise(resolve=>release=resolve);else reads++;return network(url,options);};
  const pending=f.cancel.onclick();f.expire();f.mine.innerHTML='Other workspace';release();await pending;
  assert.equal(f.mine.innerHTML,'Other workspace');assert.equal(reads,0);
}));


test('a successful registration refreshes private records when search has replaced its public form',()=>withMine(async(f,writes,network)=>{
  let release,reads=0;globalThis.fetch=async(url,options)=>{if(options)await new Promise(resolve=>release=resolve);else reads++;return network(url,options);};
  const pending=f.form.onsubmit({preventDefault(){}});f.form.isConnected=false;f.doc.activeElement=f.input;
  release();await pending;assert.equal(writes.length,1);assert.equal(reads,1);assert.ok(f.cancel);
  assert.equal(f.feedback.textContent,'');assert.equal(f.doc.activeElement,f.input);
}));
