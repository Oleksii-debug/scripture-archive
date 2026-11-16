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
