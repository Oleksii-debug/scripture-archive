import test from 'node:test';
import assert from 'node:assert/strict';
import { mountParallelReader } from '../public/parallel-reader.js';

const editions = [{id:'a',local:true}, {id:'b',local:true}];
const catalog = {translations:{
  a:{id:'a',title:'Edition A',license:'Public Domain',source:'https://example.org/a'},
  b:{id:'b',title:'Edition B',license:'Public Domain',source:'https://example.org/b'},
}};
const esc = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes,no) => { resolve=yes; reject=no; });
  return {promise,resolve,reject};
}
function fixture({check=async()=>({invalidated:false})}={}) {
  let selection='a', active=true, locks=0, failures=0;
  const copied=[];
  const submit={disabled:false};
  const form={querySelector:()=>submit,selected:()=>selection,onchange:null,onsubmit:null};
  const result={innerHTML:'',replaceChildren(){this.innerHTML='';}};
  const status={textContent:''};
  const panel={isConnected:true,querySelector(selector){
    return selector==='.parallel-form'?form:selector==='.parallel-status'?status:result;
  }};
  mountParallelReader(panel,{
    editions,catalog,lang:'en',book:'GEN',bookTitle:'Genesis',chapter:1,esc,
    check,getBook:async(_book,edition)=>({chapters:[['TEXT '+edition.id.toUpperCase()]]}),
    current:()=>active,lock(){locks++;},failClosed(){failures++;},
    copyText:async text=>{copied.push(text);},
  });
  return {
    result,status,submit,copied,failures:()=>failures,locks:()=>locks,
    choose(id){selection=id;form.onchange({target:{name:'edition'}});},
    run:()=>form.onsubmit({preventDefault(){}}),
    cite:()=>result.onclick({target:{closest:()=>({disabled:false,dataset:{parallelCite:'1'}})}}),
    retire:()=>{active=false;},
  };
}
async function withFormData(run) {
  const before=globalThis.FormData;
  globalThis.FormData=class {constructor(form){this.form=form;}get(name){
    return name==='edition'?this.form.selected():null;
  }};
  try {await run();} finally {globalThis.FormData=before;}
}
function assertNewEdition(f) {
  assert.match(f.result.innerHTML,/TEXT B/);
  assert.doesNotMatch(f.result.innerHTML,/TEXT A/);
  assert.equal(f.failures(),0,'a retired citation cannot fail-close a new edition');
  assert.equal(f.locks(),0);
  assert.equal(f.copied.length,0,'retired citation cannot write clipboard');
}
test('stale citation check error cannot fail-close newer verified B comparison',()=>withFormData(async()=>{
  const reached=deferred(),oldGuard=deferred();
  let checks=0;
  const f=fixture({check:async()=>{
    if(++checks===3){reached.resolve();return oldGuard.promise;}
    return {invalidated:false};
  }});
  await f.run();assert.match(f.result.innerHTML,/TEXT A/);
  const oldCitation=f.cite();await reached.promise;
  f.choose('b');await f.run();assertNewEdition(f);
  oldGuard.reject(Error('abandoned A network check failed'));
  await oldCitation;assertNewEdition(f);
  assert.match(f.status.textContent,/available below/);
}));
test('stale citation check invalidation cannot lock a new edition',()=>withFormData(async()=>{
  const reached=deferred(),oldGuard=deferred();
  let checks=0;
  const f=fixture({check:async()=>{
    if(++checks===3){reached.resolve();return oldGuard.promise;}
    return {invalidated:false};
  }});
  await f.run();
  const oldCitation=f.cite();await reached.promise;
  f.choose('b');await f.run();
  oldGuard.resolve({invalidated:true});await oldCitation;
  assertNewEdition(f);
}));
test('old A citation error stays retired across A to B to A selection',()=>withFormData(async()=>{
  const reached=deferred(),oldGuard=deferred();let checks=0;
  const f=fixture({check:async()=>{
    if(++checks===3){reached.resolve();return oldGuard.promise;}
    return {invalidated:false};
  }});
  await f.run();
  const oldCitation=f.cite();await reached.promise;
  f.choose('b');f.choose('a');await f.run();
  oldGuard.reject(Error('stale check failure'));await oldCitation;
  assert.match(f.result.innerHTML,/TEXT A/);
  assert.equal(f.failures(),0);assert.equal(f.locks(),0);assert.equal(f.copied.length,0);
}));
test('active citation check failure still fails closed rather than copying',()=>withFormData(async()=>{
  let checks=0;
  const f=fixture({check:async()=>{
    if(++checks===3) throw Error('current permission check unavailable');
    return {invalidated:false};
  }});
  await f.run();await f.cite();
  assert.equal(f.failures(),1);
  assert.equal(f.copied.length,0);
}));
test('active citation still copies after successful chapter recheck',()=>withFormData(async()=>{
  const f=fixture();
  await f.run();await f.cite();
  assert.equal(f.failures(),0);
  assert.equal(f.copied.length,1);
  assert.match(f.copied[0],/Genesis 1:1\. TEXT A/);
}));
