import test from 'node:test';
import assert from 'node:assert/strict';
import { renderPublicMaterials, reviewText } from '../public/material-review.js';

const words = reviewText('uk');
const escapeHTML = value => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const record = title => ({
  id: 'reviewed-1', title, reference: 'GEN 1:1',
  provenance: 'Verified source', prompt: 'Question',
  options: ['First answer', 'Second answer'], locale:'en', reviewedAt:'2026-10-31 10:00:00',
  rights:{holder:'Reviewed author',basis:'original',licenseUrl:null}
});
const success = title => new Response(JSON.stringify({items:[record(title)]}), {
  status:200, headers:{'Content-Type':'application/json'}
});
function fixture() {
  const retries = [];
  const root = {
    isConnected:true, innerHTML:'',
    querySelectorAll:()=>[],
    querySelector(selector) {
      if (selector !== '#retry-public-materials') return null;
      const retry={isConnected:true,disabled:false,onclick:null};
      retries.push(retry);
      return retry;
    },
  };
  return {root,retries};
}
function deferred() {
  let resolve, reject;
  const promise=new Promise((good,bad)=>{resolve=good;reject=bad;});
  return {promise,resolve,reject};
}
async function withPendingRequests(fn) {
  const oldFetch=globalThis.fetch;
  const calls=[];
  globalThis.fetch=(url,options)=>{
    calls.push({url,options,...deferred()});
    return calls.at(-1).promise;
  };
  try { await fn(calls); }
  finally { globalThis.fetch=oldFetch; }
}
const render=root=>renderPublicMaterials(root,words,escapeHTML);

test('SA-EXT-03 later successful GET is never replaced by an earlier successful GET',()=>withPendingRequests(async calls=>{
  const {root}=fixture();
  const old=render(root), latest=render(root);
  assert.equal(calls.length,2);
  calls[1].resolve(success('NEW AUTHORITATIVE'));
  await latest;
  assert.match(root.innerHTML,/NEW AUTHORITATIVE/);
  calls[0].resolve(success('OLD STALE'));
  await old;
  assert.match(root.innerHTML,/NEW AUTHORITATIVE/);
  assert.doesNotMatch(root.innerHTML,/OLD STALE/);
}));

test('SA-EXT-03 old failed GET cannot replace successful newer list with false retry',()=>withPendingRequests(async calls=>{
  const {root,retries}=fixture();
  const old=render(root), latest=render(root);
  calls[1].resolve(success('CURRENT REVIEW'));
  await latest;
  calls[0].reject(Error('old request offline'));
  await old;
  assert.match(root.innerHTML,/CURRENT REVIEW/);
  assert.doesNotMatch(root.innerHTML,/retry-public-materials|role="alert"/);
  assert.equal(retries.length,0);
}));

test('SA-EXT-03 old success cannot clear newer error/retry state',()=>withPendingRequests(async calls=>{
  const {root,retries}=fixture();
  const old=render(root), latest=render(root);
  calls[1].reject(Error('new request failed'));
  await latest;
  assert.match(root.innerHTML,/retry-public-materials/);
  assert.equal(retries.length,1);
  calls[0].resolve(success('INAPPROPRIATE OLD RESULT'));
  await old;
  assert.match(root.innerHTML,/retry-public-materials/);
  assert.doesNotMatch(root.innerHTML,/INAPPROPRIATE OLD RESULT/);
}));

test('SA-EXT-03 superseded public answer control does not POST while newer refresh pending',()=>withPendingRequests(async calls=>{
  const form={
    isConnected:true,dataset:{id:'reviewed-1'},onsubmit:null,
    querySelector(selector) {
      return selector==='button' ? this.button : this.status;
    },
    button:{disabled:false},status:{textContent:''},
  };
  const root={
    isConnected:true,innerHTML:'',
    querySelectorAll:selector=>selector==='.public-material'?[form]:[],
    querySelector:()=>null,
  };
  const originalFormData=globalThis.FormData;
  globalThis.FormData=class { get(name){return name==='choice'?'0':null;} };
  try {
    const old=render(root);
    calls[0].resolve(success('OLD FORM'));
    await old;
    assert.equal(typeof form.onsubmit,'function');
    const latest=render(root);
    await form.onsubmit({preventDefault(){}});
    assert.equal(calls.length,2,'superseded form must not send a POST');
    assert.equal(form.button.disabled,false);
    assert.equal(form.status.textContent,'');
    calls[1].resolve(success('NEW FORM'));
    await latest;
    assert.match(root.innerHTML,/NEW FORM/);
  } finally { globalThis.FormData=originalFormData; }
}));

test('SA-EXT-03 newest retry after fetch error remains actionable',()=>withPendingRequests(async calls=>{
  const {root,retries}=fixture();
  const first=render(root);
  calls[0].reject(Error('offline'));
  await first;
  assert.equal(retries.length,1);
  const retry=retries[0].onclick();
  assert.equal(calls.length,2);
  calls[1].resolve(success('RETRIED AND CURRENT'));
  await retry;
  assert.match(root.innerHTML,/RETRIED AND CURRENT/);
  assert.doesNotMatch(root.innerHTML,/retry-public-materials/);
}));
