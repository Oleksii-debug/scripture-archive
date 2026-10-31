import test from 'node:test';
import assert from 'node:assert/strict';
import {auditMarkup,historyMarkup,reviewText,attachReviewControls} from '../public/material-review.js';
const esc=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const item={id:'entry-1',status:'approved',snapshot:{title:'<title>'},submittedAt:'2026-01-01',authorId:'alice',reviewerId:'editor'};
test('editor history offers a labelled reason only for published items and escapes audit data',()=>{
  for(const lang of ['uk','ru','en']){
    const w=reviewText(lang),html=auditMarkup([item,{...item,id:'entry-2',status:'withdrawn',takedownReason:'<private>'}],w,esc);
    assert.equal((html.match(/class="material-takedown"/g)||[]).length,1);
    assert.match(html,/name="reason" minlength="3" maxlength="2000" required/);
    assert.match(html,/role="status"/);assert.ok(!html.includes('<title>'));assert.ok(!html.includes('<private>'));
    const own=historyMarkup([{...item,status:'withdrawn',takedownReason:'<private>'}],w,esc);
    assert.ok(own.includes('&lt;private&gt;'));assert.ok(!own.includes('<private>'));
  }
});
test('editor submits a reason through canonical review endpoint and announces confirmed result',async()=>{
  const oldFetch=globalThis.fetch,oldForm=globalThis.FormData;let posted,refreshed=0,announced='';
  try {
    globalThis.fetch=async(url,options)=>{assert.equal(url,'/api/material-review');posted=JSON.parse(options.body);return Response.json({ok:true})};
    globalThis.FormData=class {get(){return 'Rights documentation withdrawn'}};
    const status={textContent:''},button={disabled:false},form={dataset:{id:'entry-1'},querySelector:s=>s==='button'?button:status};
    const root={querySelectorAll:s=>s==='.material-takedown'?[form]:[]};
    attachReviewControls(root,reviewText('en'),async()=>{refreshed++},message=>{announced=message});
    await form.onsubmit({preventDefault(){}});
    assert.deepEqual(posted,{action:'takedown',id:'entry-1',reason:'Rights documentation withdrawn'});assert.equal(refreshed,1);assert.match(announced,/removed from publication/i);
  }finally{globalThis.fetch=oldFetch;globalThis.FormData=oldForm;}
});

test('takedown errors are announced and a stale editor view cannot submit',async()=>{
  const oldFetch=globalThis.fetch,oldForm=globalThis.FormData;let calls=0,active=true;
  try {
    globalThis.fetch=async()=>{calls++;return Response.json({error:'forbidden'},{status:403})};
    globalThis.FormData=class {get(){return 'Rights concern'}};
    const status={textContent:''},button={disabled:false},form={dataset:{id:'entry-1'},querySelector:s=>s==='button'?button:status};
    const root={querySelectorAll:s=>s==='.material-takedown'?[form]:[]};
    attachReviewControls(root,reviewText('en'),async()=>{throw Error('must not refresh')},()=>{},()=>active);
    active=false;await form.onsubmit({preventDefault(){}});assert.equal(calls,0);
    active=true;await form.onsubmit({preventDefault(){}});assert.equal(calls,1);assert.equal(button.disabled,false);assert.match(status.textContent,/Could not/);
  }finally{globalThis.fetch=oldFetch;globalThis.FormData=oldForm;}
});
