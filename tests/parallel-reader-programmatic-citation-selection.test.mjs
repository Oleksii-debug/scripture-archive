import test from 'node:test';
import assert from 'node:assert/strict';
import { mountParallelReader } from '../public/parallel-reader.js';

const esc = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;')
  .replaceAll('>','&gt;').replaceAll('"','&quot;');

function fixture(lang, delayedCitationGuard=false) {
  const edition={id:'local-edition',title:'Local edition',local:true,contentId:'EDITION_A'};
  const rights={id:'EDITION_A',title:'Verified publisher',license:'Public Domain',
    source:'https://publisher.example/edition'};
  let selected=edition.id, checks=0, copies=0, failures=0, releaseGuard, rejectGuard;
  const guardPromise=delayedCitationGuard
    ? new Promise((resolve,reject)=>{releaseGuard=resolve;rejectGuard=reject;}) : null;
  const submit={disabled:false};
  const status={textContent:''};
  const result={innerHTML:'',replaceChildren(){this.innerHTML='';}};
  const form={querySelector:()=>submit};
  const panel={isConnected:true,querySelector(selector){
    return selector==='.parallel-form'?form:selector==='.parallel-status'?status:result;
  }};
  mountParallelReader(panel,{
    editions:[edition],catalog:{translations:{},editions:{[lang]:rights}},
    lang,book:'GEN',bookTitle:'Genesis',chapter:1,esc,
    getBook:async()=>({chapters:[['VERIFIED VERSE']]}),
    check:async()=>{checks++;return delayedCitationGuard && checks===3
      ? guardPromise : {invalidated:false};},
    current:()=>true,lock:()=>{},failClosed:()=>{failures++;},
    copyText:async()=>{copies++;},
  });
  const originalFormData=globalThis.FormData;
  globalThis.FormData=class {get(){return selected;}};
  return {
    status,result,
    submit:()=>form.onsubmit({preventDefault(){}}),
    cite:()=>result.onclick({target:{closest:()=>({
      dataset:{parallelCite:'1'},disabled:false,
    })}}),
    select:id=>{selected=id;}, // No native change event is dispatched.
    resolve:()=>releaseGuard?.({invalidated:false}),
    reject:()=>rejectGuard?.(new Error('guard offline')),
    checks:()=>checks,copies:()=>copies,failures:()=>failures,
    restore:()=>{globalThis.FormData=originalFormData;},
  };
}

test('SA-EXT-01: silent publisher selection change retires rendered citation before guard/clipboard',async()=>{
  for(const lang of ['uk','ru','en']){
    const f=fixture(lang);
    try {
      await f.submit();
      assert.match(f.result.innerHTML,/VERIFIED VERSE/);
      assert.equal(f.checks(),2);
      f.select('another-edition');
      await f.cite();
      assert.equal(f.result.innerHTML,'','stale source and verses must be retired');
      assert.ok(f.status.textContent,'announce the change accessibly');
      assert.equal(f.checks(),2,'do not start an assessment check for a stale citation');
      assert.equal(f.copies(),0,'do not copy under another selected publisher');
    } finally {f.restore();}
  }
});

test('SA-EXT-01: silent selection change during asynchronous citation guard retires old text',async()=>{
  for(const lang of ['uk','ru','en']){
    const f=fixture(lang,true);
    try {
      await f.submit();
      const pending=f.cite();
      assert.equal(f.checks(),3,'citation starts its own chapter guard');
      f.select('another-edition');
      f.resolve();
      await pending;
      assert.equal(f.result.innerHTML,'','stale licensed chapter must not remain displayed');
      assert.ok(f.status.textContent,'selection change must be announced');
      assert.equal(f.copies(),0,'guard completion cannot copy a stale citation');
    } finally {f.restore();}
  }
});

test('SA-EXT-01: unchanged selected publisher still permits a verified citation',async()=>{
  for(const lang of ['uk','ru','en']){
    const f=fixture(lang);
    try {
      await f.submit();
      await f.cite();
      assert.equal(f.checks(),3,'citation rechecks chapter authorization');
      assert.equal(f.copies(),1);
      assert.match(f.result.innerHTML,/VERIFIED VERSE/);
    } finally {f.restore();}
  }
});

test('SA-EXT-01: rejected citation guard also retires silently changed publisher',async()=>{
  for(const lang of ['uk','ru','en']){
    const f=fixture(lang,true);
    try {
      await f.submit();
      const pending=f.cite();
      assert.equal(f.checks(),3);
      f.select('another-edition');
      f.reject();
      await pending;
      assert.equal(f.result.innerHTML,'','rejected guard must not leave stale licensed verses');
      assert.ok(f.status.textContent,'announce the silent selection change');
      assert.equal(f.copies(),0);
      assert.equal(f.failures(),0,'stale publisher must not invoke current-principal failure');
    } finally {f.restore();}
  }
});

test('SA-EXT-01: unchanged publisher retains fail-closed behavior on rejected guard',async()=>{
  const f=fixture('en',true);
  try {
    await f.submit();
    const pending=f.cite();
    f.reject();
    await pending;
    assert.equal(f.failures(),1,'genuine current-selection guard outage must fail closed');
    assert.equal(f.copies(),0);
  } finally {f.restore();}
});
