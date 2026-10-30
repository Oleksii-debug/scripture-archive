import test from 'node:test';
import assert from 'node:assert/strict';
import { mountParallelReader } from '../public/parallel-reader.js';

const editions = [{id:'a',local:true},{id:'b',local:true}];
const catalog = {translations:{
  a:{id:'a',title:'Edition A',license:'Public Domain',source:'https://example.org/a'},
  b:{id:'b',title:'Edition B',license:'Public Domain',source:'https://example.org/b'},
}};
const esc = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes,no)=>{ resolve=yes; reject=no; });
  return {promise, resolve, reject};
}
function fixture({getBook,check,lang='en',rights=catalog}={}) {
  let selected='a', active=true, locks=0, failures=0, focusCalls=0;
  const reads=[];
  const button={disabled:false,focus(){focusCalls++;}};
  const status={textContent:''};
  const result={innerHTML:'',replaceChildren(){this.innerHTML='';}};
  const form={onsubmit:null,onchange:null,querySelector:()=>button,selected:()=>selected};
  const panel={isConnected:true,querySelector(q){
    return q==='.parallel-form'?form:q==='.parallel-status'?status:result;
  }};
  mountParallelReader(panel,{
    editions,catalog:rights,lang,book:'GEN',bookTitle:'Genesis',chapter:1,esc,
    check:check || (async()=>({invalidated:false})),
    getBook:async(book,edition)=>{
      reads.push(edition.id);
      return getBook ? getBook(book,edition) : {chapters:[[edition.id==='a'?'FRESH A':'FRESH B']]};
    },
    current:()=>active,lock(){locks++;},failClosed(){failures++;},
  });
  return {
    form,panel,status,result,button,reads,
    submit:()=>form.onsubmit({preventDefault(){}}),
    choose(id){selected=id;form.onchange({target:{name:'edition'}});},
    otherChange(){form.onchange({target:{name:'unrelated'}});},
    retire(){active=false;},
    locks:()=>locks, failures:()=>failures, focusCalls:()=>focusCalls,
  };
}
async function withFormData(fn) {
  const before=globalThis.FormData;
  globalThis.FormData=class {constructor(form){this.form=form;}get(name){
    return name==='edition'?this.form.selected():null;
  }};
  try {await fn();} finally {globalThis.FormData=before;}
}
function expectFreshB(f) {
  assert.match(f.result.innerHTML,/FRESH B/);
  assert.doesNotMatch(f.result.innerHTML,/STALE A/);
  assert.equal(f.button.disabled,false);
  assert.equal(f.locks(),0);
  assert.equal(f.failures(),0);
}
test('a never-resolving earlier edition does not block the newly selected edition',()=>withFormData(async()=>{
  const started=deferred(),old=deferred();
  const f=fixture({getBook:async(_,edition)=>{
    if(edition.id==='a'){started.resolve();return old.promise;}
    return {chapters:[['FRESH B']]};
  }});
  const pending=f.submit();await started.promise;
  f.choose('b');
  assert.equal(f.button.disabled,false,'the old pending request must relinquish its UI lease');
  await f.submit();
  expectFreshB(f);
  assert.deepEqual(f.reads,['a','b']);
  // The old network request remains unresolved, but the comparison already works.
  old.resolve({chapters:[['STALE A']]}); await pending;
  expectFreshB(f);
}));
test('late old failure never overwrites a newer successful comparison',()=>withFormData(async()=>{
  const started=deferred(),old=deferred();
  const f=fixture({getBook:async(_,edition)=>{
    if(edition.id==='a'){started.resolve();return old.promise;}
    return {chapters:[['FRESH B']]};
  }});
  const pending=f.submit();await started.promise;
  f.choose('b');await f.submit();expectFreshB(f);
  old.reject(Error('network failed after selection changed'));await pending;
  expectFreshB(f);
  assert.match(f.status.textContent,/available below/);
}));
test('old request finally cannot unlock a newer still-running comparison',()=>withFormData(async()=>{
  const aStarted=deferred(),bStarted=deferred(),old=deferred(),fresh=deferred();
  const f=fixture({getBook:async(_,edition)=>{
    if(edition.id==='a'){aStarted.resolve();return old.promise;}
    bStarted.resolve();return fresh.promise;
  }});
  const a=f.submit();await aStarted.promise;
  f.choose('b');const b=f.submit();await bStarted.promise;
  assert.equal(f.button.disabled,true);
  old.resolve({chapters:[['STALE A']]});await a;
  assert.equal(f.button.disabled,true,'stale finally must not unlock B');
  assert.equal(f.result.innerHTML,'');
  fresh.resolve({chapters:[['FRESH B']]});await b;
  expectFreshB(f);
}));
test('late invalidated first guard cannot lock the newly selected edition',()=>withFormData(async()=>{
  const started=deferred(),oldGuard=deferred();
  let checks=0;
  const f=fixture({check:async()=>{checks++;if(checks===1){started.resolve();return oldGuard.promise;}return {invalidated:false};}});
  const a=f.submit();await started.promise;
  f.choose('b');await f.submit();expectFreshB(f);
  oldGuard.resolve({invalidated:true});await a;expectFreshB(f);
}));
test('old rejected first guard cannot call fail-closed after selection changed',()=>withFormData(async()=>{
  const started=deferred(),oldGuard=deferred();
  let checks=0;
  const f=fixture({check:async()=>{checks++;if(checks===1){started.resolve();return oldGuard.promise;}return {invalidated:false};}});
  const a=f.submit();await started.promise;
  f.choose('b');await f.submit();expectFreshB(f);
  oldGuard.reject(Error('old guard failed'));await a;expectFreshB(f);
}));
test('A to B to A cannot resurrect the first A pending response',()=>withFormData(async()=>{
  const started=deferred(),old=deferred();let aReads=0;
  const f=fixture({getBook:async(_,edition)=>{
    if(edition.id==='a' && ++aReads===1){started.resolve();return old.promise;}
    return {chapters:[['FRESH A']]};
  }});
  const a=f.submit();await started.promise;
  f.choose('b');f.choose('a');await f.submit();
  assert.match(f.result.innerHTML,/FRESH A/);
  old.resolve({chapters:[['STALE A']]});await a;
  assert.match(f.result.innerHTML,/FRESH A/);
  assert.doesNotMatch(f.result.innerHTML,/STALE A/);
  assert.equal(f.button.disabled,false);
}));
test('unrelated form control change does not cancel the pending edition',()=>withFormData(async()=>{
  const started=deferred(),old=deferred();
  const f=fixture({getBook:async()=>{started.resolve();return old.promise;}});
  const a=f.submit();await started.promise;
  f.otherChange();assert.equal(f.button.disabled,true);
  old.resolve({chapters:[['FRESH A']]});await a;
  assert.match(f.result.innerHTML,/FRESH A/);
  assert.equal(f.button.disabled,false);
}));
for(const [lang,changed] of [
  ['uk','Вибране видання змінилося'],['ru','Выбранное издание изменилось'],['en','The selected edition changed'],
]) test('stalled-selection recovery announces change in '+lang,()=>withFormData(async()=>{
  const started=deferred(),old=deferred();
  const f=fixture({lang,getBook:async(_,edition)=>{
    if(edition.id==='a'){started.resolve();return old.promise;}
    return {chapters:[['FRESH B']]};
  }});
  const a=f.submit();await started.promise;
  f.choose('b');
  assert.ok(f.status.textContent.includes(changed));
  assert.equal(f.button.disabled,false);
  await f.submit();
  assert.match(f.result.innerHTML,/FRESH B/);
  old.resolve({chapters:[['STALE A']]});await a;
  assert.match(f.result.innerHTML,/FRESH B/);
}));
test('current invalidated guard still locks and withholds comparison',()=>withFormData(async()=>{
  const f=fixture({check:async()=>({invalidated:true})});
  await f.submit();
  assert.equal(f.locks(),1);
  assert.equal(f.result.innerHTML,'');
  assert.equal(f.button.disabled,false);
}));
test('new selection with missing edition rights fails closed without fallback to A',()=>withFormData(async()=>{
  const f=fixture({rights:{translations:{a:catalog.translations.a}}});
  f.choose('b');await f.submit();
  assert.equal(f.result.innerHTML,'');
  assert.match(f.status.textContent,/Could not load/);
  assert.equal(f.button.disabled,false);
}));
test('retired old request does not steal focus from current keyboard workflow',()=>withFormData(async()=>{
  const previousDocument=globalThis.document;
  const started=deferred(),old=deferred();
  const body={},doc={body,activeElement:null};
  globalThis.document=doc;
  try {
    const f=fixture({getBook:async(_,edition)=>{
      if(edition.id==='a'){started.resolve();return old.promise;}
      return {chapters:[['FRESH B']]};
    }});
    doc.activeElement=f.button;
    const a=f.submit();await started.promise;
    doc.activeElement=body;f.choose('b');await f.submit();
    old.resolve({chapters:[['STALE A']]});await a;
    assert.equal(f.focusCalls(),0);
    expectFreshB(f);
  } finally {globalThis.document=previousDocument;}
}));
