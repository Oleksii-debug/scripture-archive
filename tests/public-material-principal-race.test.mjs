import test from 'node:test';
import assert from 'node:assert/strict';
import {renderPublicMaterials, reviewText} from '../public/material-review.js';

const w = reviewText('uk');
const esc = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const item = {
  id:'public-01', title:'Зразок', reference:'GEN 1:1', provenance:'Підтверджене джерело',
  prompt:'Запитання', options:['Відповідь','Інша відповідь'], locale:'uk', reviewedAt:'2026-10-31 10:00:00',
  rights:{holder:'Автор матеріалу',basis:'original',licenseUrl:null},
};
const response = (body, status=200) => new Response(JSON.stringify(body), {
  status, headers:{'content-type':'application/json'}
});
function deferred() {
  let resolve, reject;
  const promise = new Promise((a,b) => { resolve=a; reject=b; });
  return {promise, resolve, reject};
}
function fixture() {
  let current=true, rendered=0;
  const button={disabled:false};
  const status={textContent:''};
  const form={
    isConnected:true, dataset:{id:item.id}, onsubmit:null,
    querySelector(selector) { return selector==='button'?button:status; }
  };
  const root={
    isConnected:true, html:'',
    get innerHTML() { return this.html; },
    set innerHTML(value) { rendered++; this.html=value; },
    querySelectorAll(selector) { assert.equal(selector,'.public-material'); return [form]; },
  };
  return {root,form,button,status,current:()=>current,revoke:()=>{current=false;},rendered:()=>rendered};
}
async function withNetwork(fetcher, action) {
  const originalFetch=globalThis.fetch, originalFormData=globalThis.FormData;
  try {
    globalThis.fetch=fetcher;
    globalThis.FormData=class { constructor(form) { assert.ok(form); } get(key) { return key==='choice'?'0':null; } };
    return await action();
  } finally {
    globalThis.fetch=originalFetch;
    globalThis.FormData=originalFormData;
  }
}
const show = async (f) => renderPublicMaterials(f.root,w,esc,f.current);
const waiting=deferred();
const wait=deferred();
const pendingList=deferred();
const calls=[];
const delayedPost=deferred();
const delayedDetached=deferred();
let posted=0;
const delayedFailure=deferred();

test('normal public material and canonical answer still render with live principal',()=>withNetwork(
  async (_url,options) => options
    ? response({correct:true,explanation:'Перевірено'})
    : response({items:[item]}),
  async () => {
    const f=fixture();
    await show(f);
    assert.match(f.root.innerHTML,/public-material/);
    await f.form.onsubmit({preventDefault(){}});
    assert.match(f.status.textContent,/Перевірено/);
    assert.equal(f.button.disabled,false);
  }
));

test('late public list response cannot repaint builder for a changed principal',()=>withNetwork(
  () => waiting.promise,
  async () => {
    const f=fixture(), run=show(f);
    f.revoke();
    waiting.resolve(response({items:[item]}));
    await run;
    assert.equal(f.rendered(),0);
    assert.equal(f.form.onsubmit,null);
  }
));

test('late failed list response cannot replace current builder with stale error',()=>withNetwork(
  () => wait.promise,
  async () => {
    const f=fixture(), run=show(f);
    f.revoke();
    wait.reject(Error('offline'));
    await run;
    assert.equal(f.rendered(),0);
  }
));

test('detached public list cannot repaint or install controls',()=>withNetwork(
  () => pendingList.promise,
  async () => {
    const f=fixture(), run=show(f);
    f.root.isConnected=false;
    pendingList.resolve(response({items:[item]}));
    await run;
    assert.equal(f.rendered(),0);
  }
));

test('retired controls do not send answer request after principal switch',()=>withNetwork(
  async (_url,options) => { calls.push(options?.method || 'GET'); return options?response({correct:true}):response({items:[item]}); },
  async () => {
    const f=fixture();
    await show(f);
    f.revoke();
    await f.form.onsubmit({preventDefault(){}});
    assert.deepEqual(calls,['GET']);
    assert.equal(f.button.disabled,false);
  }
));

test('in-flight former-principal answer cannot publish success after logout',()=>withNetwork(
  (_url,options) => options ? delayedPost.promise : response({items:[item]}),
  async () => {
    const f=fixture();
    await show(f);
    const task=f.form.onsubmit({preventDefault(){}});
    f.revoke();
    delayedPost.resolve(response({correct:true,explanation:'STALE PRIVATE RESULT'}));
    await task;
    assert.equal(f.status.textContent,'');
  }
));

test('detached form answer cannot publish stale result or re-enable its former control',()=>withNetwork(
  (_url,options) => options ? delayedDetached.promise : response({items:[item]}),
  async () => {
    const f=fixture();
    await show(f);
    const task=f.form.onsubmit({preventDefault(){}});
    f.form.isConnected=false;
    delayedDetached.resolve(response({correct:true,explanation:'STALE'}));
    await task;
    assert.equal(f.status.textContent,'');
    assert.equal(f.button.disabled,true);
  }
));

test('one in-flight answer is not submitted twice; a live failure remains retryable',()=>withNetwork(
  (_url,options) => {
    if(!options) return response({items:[item]});
    posted++;
    return delayedFailure.promise;
  },
  async () => {
    const f=fixture();
    await show(f);
    const first=f.form.onsubmit({preventDefault(){}});
    await f.form.onsubmit({preventDefault(){}});
    assert.equal(posted,1);
    delayedFailure.reject(Error('offline'));
    await first;
    assert.equal(f.status.textContent,w.answerError);
    assert.equal(f.button.disabled,false);
  }
));

test('invalidated or throwing principal predicate refuses to issue a request',()=>withNetwork(
  () => {throw Error('network must not be reached');},
  async () => {
    const f=fixture();
    await renderPublicMaterials(f.root,w,esc,()=>{throw Error('identity lost');});
    assert.equal(f.rendered(),0);
  }
));


for (const receipt of [
  {correct:'false',explanation:'FALSE SUCCESS PRIVATE CONTENT'},
  {correct:'true',explanation:'FORGED TRUE'},
  {correct:1,explanation:'FORGED NUMERIC TRUE'},
  {correct:0},
  {correct:null},
  {},
  {correct:true,explanation:{private:'unvalidated object'}},
]) {
  test('public answer receipt must have an exact boolean and safe explanation: '+JSON.stringify(receipt),()=>withNetwork(
    async (_url,options) => options ? response(receipt) : response({items:[item]}),
    async () => {
      const f=fixture();
      await show(f);
      await f.form.onsubmit({preventDefault(){}});
      assert.equal(f.status.textContent,w.answerError,'reject malformed receipt, never announce correct');
      assert.equal(f.button.disabled,false,'malformed answer is retryable');
      assert.ok(!f.status.textContent.includes('FORGED'));
    }
  ));
}

test('malformed public answer can be retried successfully with authoritative boolean result',()=>withNetwork(
  (()=>{let replies=0;return async (_url,options)=>options
    ? response(++replies===1 ? {correct:'false',explanation:'FORGED'} : {correct:false})
    : response({items:[item]});})(),
  async () => {
    const f=fixture();
    await show(f);
    await f.form.onsubmit({preventDefault(){}});
    assert.equal(f.status.textContent,w.answerError);
    assert.equal(f.button.disabled,false);
    await f.form.onsubmit({preventDefault(){}});
    assert.equal(f.status.textContent,w.wrong,'valid wrong answer does not become correct');
    assert.equal(f.button.disabled,false);
  }
));
