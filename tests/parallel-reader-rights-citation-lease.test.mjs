import test from 'node:test';
import assert from 'node:assert/strict';
import { mountParallelReader } from '../public/parallel-reader.js';

const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;')
  .replaceAll('>','&gt;').replaceAll('"','&quot;');
const edition=()=>Object.assign(Object.create(null),{
  id:'second',title:'Second edition',local:true,folder:'en',contentId:'CONTENT'
});
const rights=()=>Object.assign(Object.create(null),{
  id:'CONTENT',title:'Verified publisher',license:'Public Domain',
  source:'https://publisher.example/source'
});
async function withForm(fn){
  const previous=globalThis.FormData;
  globalThis.FormData=class {get(){return 'second';}};
  try {await fn();} finally {globalThis.FormData=previous;}
}
function deferred(){
  let release;
  const promise=new Promise(resolve=>{release=resolve;});
  return {promise,release};
}
function fixture(overrides={}){
  const source=rights(), catalog={translations:{},editions:{en:source}};
  const copied=[],status={textContent:''},button={disabled:false};
  const result={innerHTML:'',replaceChildren(){this.innerHTML='';}};
  const form={querySelector:()=>button};
  const panel={isConnected:true,querySelector(selector){
    return selector==='.parallel-form'?form:selector==='.parallel-status'?status:result;
  }};
  let checks=0,reads=0;
  mountParallelReader(panel,{
    editions:[edition()],catalog,lang:'en',book:'GEN',bookTitle:'Genesis',chapter:1,esc,
    check:async()=>{checks++;return {invalidated:false};},
    getBook:async()=>{reads++;return {chapters:[['LICENSED VERSE']]};},
    current:()=>true,lock:()=>{},failClosed:()=>{},
    copyText:async value=>{copied.push(value);},
    ...overrides,
  });
  return {catalog,source,copied,status,result,button,
    run:()=>form.onsubmit({preventDefault(){}}),
    cite:()=>result.onclick({target:{closest:()=>({dataset:{parallelCite:'1'}})}}),
    checks:()=>checks,reads:()=>reads,
  };
}

test('SA-EXT-01: changed publisher terms retire an already displayed citation',()=>withForm(async()=>{
  const f=fixture();
  await f.run();
  assert.match(f.result.innerHTML,/LICENSED VERSE/);
  f.source.license='New license not shown to the reader';
  await f.cite();
  assert.equal(f.copied.length,0);
  assert.equal(f.result.innerHTML,'');
  assert.match(f.status.textContent,/selected edition changed/i);
  assert.equal(f.button.disabled,false);
}));

test('SA-EXT-01: source change during citation guard cannot copy stale provenance',()=>withForm(async()=>{
  const entered=deferred(),pending=deferred();
  let checks=0;
  const f=fixture({check:async()=>{
    if (++checks===3){entered.release();return pending.promise;}
    return {invalidated:false};
  }});
  await f.run();
  const citation=f.cite();
  await entered.promise;
  f.source.source='https://different-publisher.example/';
  pending.release({invalidated:false});
  await citation;
  assert.equal(checks,3,'citation guard still executes');
  assert.equal(f.copied.length,0);
  assert.equal(f.result.innerHTML,'');
  assert.match(f.status.textContent,/selected edition changed/i);
}));

test('SA-EXT-01: replacing catalog rights record cannot retain a prior citation',()=>withForm(async()=>{
  const f=fixture();
  await f.run();
  f.catalog.editions.en={...f.source};
  await f.cite();
  assert.equal(f.copied.length,0);
  assert.equal(f.result.innerHTML,'');
  assert.ok(f.status.textContent);
}));

test('SA-EXT-01: adding a declared translation cannot silently reuse fallback rights',()=>withForm(async()=>{
  const f=fixture();
  await f.run();
  f.catalog.translations.second={id:'second',title:'New publisher',license:'New terms',
    source:'https://another-publisher.example/'};
  await f.cite();
  assert.equal(f.copied.length,0);
  assert.equal(f.result.innerHTML,'');
  assert.ok(f.status.textContent);
}));

test('SA-EXT-01: newly injected rights accessor is never executed by citation check',()=>withForm(async()=>{
  const f=fixture();
  await f.run();
  let called=0;
  Object.defineProperty(f.source,'license',{get(){called++;return 'Dynamic terms';}});
  await f.cite();
  assert.equal(called,0,'publisher getter is not a source of citation authority');
  assert.equal(f.copied.length,0);
  assert.equal(f.result.innerHTML,'');
}));

test('SA-EXT-01: stable null-prototype rights remain readable and citable',()=>withForm(async()=>{
  const f=fixture();
  await f.run();
  assert.equal(f.checks(),2);
  assert.equal(f.reads(),1);
  assert.match(f.result.innerHTML,/LICENSED VERSE/);
  await f.cite();
  assert.equal(f.checks(),3);
  assert.equal(f.copied.length,1);
  assert.match(f.copied[0],/Verified publisher/);
  assert.match(f.copied[0],/Public Domain/);
  assert.match(f.status.textContent,/Verse and source copied/);
}));
