import test from 'node:test';
import assert from 'node:assert/strict';
import { mountParallelReader } from '../public/parallel-reader.js';

const esc = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const edition={id:'uk-kulish',contentId:'UKRPAN',title:'Kulish',local:true};
const rights={id:'UKRPAN',title:'Verified edition',source:'https://source.example/',license:'Public Domain'};
const catalog={translations:{},editions:{uk:rights,ru:rights,en:rights}};

function fixture(getBook,lang='uk') {
  let checks=0, reads=0;
  const button={disabled:false}, status={textContent:''};
  const result={innerHTML:'',replaceChildren(){this.innerHTML='';}};
  const form={onsubmit:null,querySelector:()=>button};
  const panel={isConnected:true,querySelector(selector){
    return selector==='.parallel-form'?form:selector==='.parallel-status'?status:result;
  }};
  mountParallelReader(panel,{editions:[edition],catalog,lang,book:'GEN',bookTitle:'Genesis',chapter:1,
    getBook:async()=>{reads++;return getBook();},
    check:async()=>{checks++;return {invalidated:false};},
    current:()=>true,lock:()=>{},failClosed:()=>{},esc,copyText:async()=>{}});
  return {run:()=>form.onsubmit({preventDefault(){}}),result,status,button,checks:()=>checks,reads:()=>reads};
}
async function withEdition(run) {
  const original=globalThis.FormData;
  globalThis.FormData=class {get(){return edition.id;}};
  try {await run();} finally {globalThis.FormData=original;}
}
const ownChapter=verses=>({chapters:[verses]});

test('parallel reader never invokes an own chapters getter or renders its forged text',()=>withEdition(async()=>{
  for(const lang of ['uk','ru','en']){
    let invoked=0;
    const data={};
    Object.defineProperty(data,'chapters',{get(){invoked++;return [['FORGED SCRIPTURE']];}});
    const f=fixture(()=>data,lang);
    await f.run();
    assert.equal(invoked,0);
    assert.equal(f.result.innerHTML,'');
    assert.equal(f.button.disabled,false);
    assert.ok(f.status.textContent);
    assert.equal(f.checks(),2);
  }
}));

test('parallel reader refuses inherited chapters without reading their contents',()=>withEdition(async()=>{
  for(const lang of ['uk','ru','en']){
    let invoked=0;
    const inherited={};
    Object.defineProperty(inherited,'chapters',{get(){invoked++;return [['FORGED SCRIPTURE']];}});
    const f=fixture(()=>Object.create(inherited),lang);
    await f.run();
    assert.equal(invoked,0);
    assert.equal(f.result.innerHTML,'');
    assert.ok(f.status.textContent);
    assert.equal(f.button.disabled,false);
  }
}));

test('parallel reader refuses accessor-backed chapter slots before verse disclosure',()=>withEdition(async()=>{
  for(const lang of ['uk','ru','en']){
    let invoked=0;
    const chapters=Array(1);
    Object.defineProperty(chapters,'0',{get(){invoked++;return ['FORGED SCRIPTURE'];}});
    const f=fixture(()=>({chapters}),lang);
    await f.run();
    assert.equal(invoked,0);
    assert.equal(f.result.innerHTML,'');
    assert.ok(f.status.textContent);
    assert.equal(f.button.disabled,false);
    assert.equal(f.checks(),2);
  }
}));

test('parallel reader does not inherit a chapter array slot from its prototype',()=>withEdition(async()=>{
  const chapters=Array(1);
  const inherited=Object.create(Array.prototype);
  Object.defineProperty(inherited,'0',{value:['FORGED SCRIPTURE'],enumerable:true});
  Object.setPrototypeOf(chapters,inherited);
  const f=fixture(()=>({chapters}));
  await f.run();
  assert.equal(f.result.innerHTML,'');
  assert.ok(f.status.textContent);
  assert.equal(f.button.disabled,false);
}));

test('own plain and null-prototype chapters still display verified Scripture',()=>withEdition(async()=>{
  const plain=fixture(()=>ownChapter(['VERIFIED VERSE']));
  await plain.run();
  assert.match(plain.result.innerHTML,/VERIFIED VERSE/);
  assert.equal(plain.checks(),2);
  const nullRoot=Object.assign(Object.create(null),ownChapter(['NULL PROTOTYPE VERSE']));
  const safe=fixture(()=>nullRoot,'en');
  await safe.run();
  assert.match(safe.result.innerHTML,/NULL PROTOTYPE VERSE/);
  assert.equal(safe.button.disabled,false);
}));

test('failed chapter admission leaves retry enabled and a subsequent valid read succeeds',()=>withEdition(async()=>{
  let calls=0;
  const f=fixture(()=>{
    if(++calls===1){
      const chapters=Array(1);
      Object.defineProperty(chapters,'0',{get(){throw Error('getter must not execute');}});
      return {chapters};
    }
    return ownChapter(['RECOVERED VERSE']);
  });
  await f.run();
  assert.equal(f.result.innerHTML,'');
  assert.ok(f.status.textContent);
  assert.equal(f.button.disabled,false);
  await f.run();
  assert.match(f.result.innerHTML,/RECOVERED VERSE/);
  assert.equal(f.checks(),4);
  assert.equal(f.reads(),2);
}));
