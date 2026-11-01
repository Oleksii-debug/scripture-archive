import test from 'node:test';
import assert from 'node:assert/strict';
import { parallelControls, mountParallelReader } from '../public/parallel-reader.js';

const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;')
  .replaceAll('>','&gt;').replaceAll('"','&quot;');
const edition={id:'uk-kulish',local:true,contentId:'UKRPAN',title:'Verified edition'};
const catalog={translations:{},editions:{uk:{id:'UKRPAN',title:'Verified source',
  license:'Public Domain',source:'https://publisher.example/verified'}}};

function fixture(editions) {
  let checks=0,reads=0,clipboard=0;
  const button={disabled:false},status={textContent:''};
  const result={innerHTML:'',replaceChildren(){this.innerHTML='';}};
  const form={querySelector:()=>button};
  const panel={isConnected:true,querySelector(selector){
    return selector==='.parallel-form'?form:selector==='.parallel-status'?status:result;
  }};
  mountParallelReader(panel,{editions,catalog,lang:'uk',book:'GEN',bookTitle:'Genesis',
    chapter:1,getBook:async()=>{reads++;return {chapters:[['VERIFIED VERSE']]};},
    check:async()=>{checks++;return {invalidated:false};},current:()=>true,
    lock:()=>{},failClosed:()=>{},esc,copyText:async()=>{clipboard++;}});
  return {form,button,status,result,checks:()=>checks,reads:()=>reads,
    clipboard:()=>clipboard,run:()=>form.onsubmit({preventDefault(){}})};
}
async function withSelected(callback) {
  const original=globalThis.FormData;
  globalThis.FormData=class {get(){return edition.id;}};
  try {await callback();} finally {globalThis.FormData=original;}
}
function ownGetterArray() {
  let invoked=0;
  const list=[];
  Object.defineProperty(list,'0',{configurable:true,enumerable:true,
    get(){invoked++;return edition;}});
  return {list,calls:()=>invoked};
}

test('SA-EXT-01: comparison options never execute own edition-array slot getters',()=>{
  const {list,calls}=ownGetterArray();
  const html=parallelControls(list,'uk',esc);
  assert.equal(calls(),0);
  assert.doesNotMatch(html,/Verified edition/);
  assert.match(html,/<select name="edition">/);
  assert.match(parallelControls([edition],'uk',esc),/Verified edition/);
});

test('SA-EXT-01: inherited edition-array slots never become comparison options',()=>{
  let calls=0;
  const list=new Array(1);
  const prototype=Object.create(Array.prototype);
  Object.defineProperty(prototype,'0',{get(){calls++;return edition;}});
  Object.setPrototypeOf(list,prototype);
  const html=parallelControls(list,'en',esc);
  assert.equal(calls,0);
  assert.doesNotMatch(html,/Verified edition/);
});

test('SA-EXT-01: accessor-backed edition-array slot cannot authorize chapter fetch',()=>withSelected(async()=>{
  const {list,calls}=ownGetterArray();
  const f=fixture(list);
  await f.run();
  assert.equal(calls(),0,'array getter must not execute in edition lookup');
  assert.equal(f.checks(),0,'no assessment check for untrusted edition');
  assert.equal(f.reads(),0,'no licensed chapter fetch');
  assert.equal(f.result.innerHTML,'');
  assert.ok(f.status.textContent,'accessible retry status');
  assert.equal(f.button.disabled,false);
}));

test('SA-EXT-01: replacing a verified array slot with getter retires prior citation',()=>withSelected(async()=>{
  const list=[edition];
  const f=fixture(list);
  await f.run();
  assert.match(f.result.innerHTML,/VERIFIED VERSE/);
  assert.equal(f.checks(),2);
  assert.equal(f.reads(),1);
  let calls=0;
  Object.defineProperty(list,'0',{configurable:true,get(){calls++;return edition;}});
  await f.run();
  assert.equal(calls,0);
  assert.equal(f.result.innerHTML,'','stale licensed text must be removed');
  assert.equal(f.reads(),1,'no second chapter disclosure');
  assert.ok(f.status.textContent);
  assert.equal(f.button.disabled,false);
}));

test('SA-EXT-01: sparse and null-prototype records preserve valid own slot',()=>withSelected(async()=>{
  const list=new Array(2);
  list[1]=Object.assign(Object.create(null),edition);
  const html=parallelControls(list,'en',esc);
  assert.match(html,/Verified edition/);
  const f=fixture(list);
  await f.run();
  assert.equal(f.reads(),1);
  assert.equal(f.checks(),2);
  assert.match(f.result.innerHTML,/VERIFIED VERSE/);
}));
