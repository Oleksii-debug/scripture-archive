import test from 'node:test';
import assert from 'node:assert/strict';
import { mountParallelReader } from '../public/parallel-reader.js';

const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;')
  .replaceAll('>','&gt;').replaceAll('"','&quot;');
const rights={id:'EDITION_CONTENT',title:'Verified publisher',license:'Public Domain',
  source:'https://publisher.example/edition'};
const makeEdition=()=>({id:'edition-1',title:'Second edition',local:true,
  folder:'en',contentId:'EDITION_CONTENT'});
function deferred(){
  let release;
  const promise=new Promise(resolve=>{release=resolve;});
  return {promise,release};
}
async function withForm(fn){
  const previous=globalThis.FormData;
  globalThis.FormData=class {get(){return 'edition-1';}};
  try {await fn();} finally {globalThis.FormData=previous;}
}
function fixture(editions, overrides={}){
  let checks=0, reads=0;
  const copied=[], button={disabled:false},status={textContent:''};
  const result={innerHTML:'',replaceChildren(){this.innerHTML='';}};
  const form={querySelector:()=>button};
  const panel={isConnected:true,querySelector(selector){
    return selector==='.parallel-form'?form:selector==='.parallel-status'?status:result;
  }};
  mountParallelReader(panel,{
    editions,catalog:{translations:{},editions:{en:rights}},lang:'en',
    book:'GEN',bookTitle:'Genesis',chapter:1,esc,
    check:async()=>{checks++;return {invalidated:false};},
    getBook:async()=>{reads++;return {chapters:[['LICENSED VERSE']]};},
    current:()=>true,lock:()=>{},failClosed:()=>{},
    copyText:async value=>{copied.push(value);},
    ...overrides,
  });
  return {result,status,button,copied,
    run:()=>form.onsubmit({preventDefault(){}}),
    cite:()=>result.onclick({target:{closest:()=>({dataset:{parallelCite:'1'}})}}),
    checks:()=>checks,reads:()=>reads,
  };
}

test('SA-EXT-01: changing edition file folder during getBook cannot publish old verses',()=>withForm(async()=>{
  const edition=makeEdition(), pending=deferred(),entered=deferred();
  let reads=0,checks=0;
  const f=fixture([edition],{
    check:async()=>{checks++;return {invalidated:false};},
    getBook:async()=>{reads++;entered.release();return pending.promise;},
  });
  const request=f.run();
  await entered.promise;
  edition.folder='another-publisher';
  pending.release({chapters:[['PRIVATE OLD EDITION VERSE']]});
  await request;
  assert.equal(reads,1);
  assert.equal(checks,2,'both chapter guards still run');
  assert.equal(f.result.innerHTML,'');
  assert.ok(f.status.textContent,'accessible failure is announced');
  assert.equal(f.button.disabled,false,'retry remains possible');
}));

test('SA-EXT-01: changing content identity during first guard prevents file fetch',()=>withForm(async()=>{
  const edition=makeEdition(),pending=deferred(),entered=deferred();
  let checks=0,reads=0;
  const f=fixture([edition],{
    check:async()=>{checks++;entered.release();return pending.promise;},
    getBook:async()=>{reads++;return {chapters:[['UNVERIFIED']]};},
  });
  const request=f.run();
  await entered.promise;
  edition.contentId='DIFFERENT_CONTENT';
  pending.release({invalidated:false});
  await request;
  assert.equal(checks,1);
  assert.equal(reads,0,'mutated source cannot reach getBook');
  assert.equal(f.result.innerHTML,'');
  assert.ok(f.status.textContent);
}));

test('SA-EXT-01: replacing the edition record during second guard retires the response',()=>withForm(async()=>{
  const edition=makeEdition(),editions=[edition],pending=deferred(),entered=deferred();
  let checks=0,reads=0;
  const f=fixture(editions,{
    check:async()=>{if(++checks===2){entered.release();return pending.promise;}return {invalidated:false};},
    getBook:async()=>{reads++;return {chapters:[['OBSOLETE VERSE']]};},
  });
  const request=f.run();
  await entered.promise;
  editions[0]={...edition};
  pending.release({invalidated:false});
  await request;
  assert.equal(checks,2);
  assert.equal(reads,1);
  assert.equal(f.result.innerHTML,'','same ID on a replacement record is not the same lease');
  assert.ok(f.status.textContent);
}));

test('SA-EXT-01: a changed manifest cannot authorize a previously displayed citation',()=>withForm(async()=>{
  const edition=makeEdition(),f=fixture([edition]);
  await f.run();
  assert.match(f.result.innerHTML,/LICENSED VERSE/);
  edition.contentId='OTHER_PUBLISHER';
  await f.cite();
  assert.equal(f.copied.length,0,'stale rights are never copied');
  assert.equal(f.result.innerHTML,'','old comparison is retired');
  assert.match(f.status.textContent,/selected edition changed/i);
}));

test('SA-EXT-01: changing the edition while citation guard awaits prevents clipboard disclosure',()=>withForm(async()=>{
  const edition=makeEdition(),pending=deferred(),entered=deferred();
  let checks=0;
  const f=fixture([edition],{
    check:async()=>{if(++checks===3){entered.release();return pending.promise;}return {invalidated:false};},
  });
  await f.run();
  const citation=f.cite();
  await entered.promise;
  edition.title='Another edition';
  pending.release({invalidated:false});
  await citation;
  assert.equal(checks,3);
  assert.equal(f.copied.length,0);
  assert.equal(f.result.innerHTML,'');
  assert.match(f.status.textContent,/selected edition changed/i);
}));

test('SA-EXT-01: stable null-prototype edition remains readable and citable',()=>withForm(async()=>{
  const edition=Object.assign(Object.create(null),makeEdition());
  const f=fixture([edition]);
  await f.run();
  assert.equal(f.checks(),2);
  assert.equal(f.reads(),1);
  assert.match(f.result.innerHTML,/LICENSED VERSE/);
  await f.cite();
  assert.equal(f.copied.length,1);
  assert.match(f.copied[0],/LICENSED VERSE/);
  assert.match(f.copied[0],/Verified publisher/);
}));
