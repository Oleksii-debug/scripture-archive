import test from 'node:test';
import assert from 'node:assert/strict';
import { mountParallelReader, parallelControls } from '../public/parallel-reader.js';

const esc = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;')
  .replaceAll('>','&gt;').replaceAll('"','&quot;');
const base = {id:'uk-kulish',local:true,contentId:'UKRPAN',title:'Kulish'};
const rights = {id:'UKRPAN',title:'Verified source',license:'Public Domain',
  source:'https://publisher.example/verified'};
const catalog = {translations:{},editions:{uk:rights,ru:rights,en:rights}};

async function render(edition, lang) {
  let checks=0, reads=0;
  const button={disabled:false}, status={textContent:''};
  const result={innerHTML:'',replaceChildren(){this.innerHTML='';}};
  const form={querySelector:()=>button};
  const panel={isConnected:true,querySelector(selector){
    return selector==='.parallel-form'?form:selector==='.parallel-status'?status:result;
  }};
  mountParallelReader(panel,{
    editions:[edition],catalog,lang,book:'GEN',bookTitle:'Genesis',chapter:1,
    getBook:async()=>{reads++;return {chapters:[['VERIFIED VERSE']]};},
    check:async()=>{checks++;return {invalidated:false};},
    current:()=>true,lock:()=>{},failClosed:()=>{},esc,copyText:async()=>{},
  });
  const original=globalThis.FormData;
  globalThis.FormData=class {get(){return base.id;}};
  try {await form.onsubmit({preventDefault(){}});}
  finally {globalThis.FormData=original;}
  return {checks,reads,result,status,button};
}

test('SA-EXT-01: edition identity and local eligibility never execute accessor records', async()=>{
  for(const lang of ['uk','ru','en']){
    for(const field of ['id','local']){
      let invoked=0;
      const edition={...base};
      Object.defineProperty(edition,field,{enumerable:true,get(){
        invoked++;return base[field];
      }});
      const f=await render(edition,lang);
      assert.equal(invoked,0,lang+' '+field+' getter must not execute');
      assert.equal(f.checks,0,'unverified selection must not start chapter guards');
      assert.equal(f.reads,0,'unverified selection must not fetch licensed text');
      assert.equal(f.result.innerHTML,'','no forged edition verses');
      assert.equal(f.button.disabled,false);
    }
  }
});

test('SA-EXT-01: fallback content identity getter cannot borrow verified publisher rights', async()=>{
  for(const lang of ['uk','ru','en']){
    let invoked=0;
    const edition={...base};
    Object.defineProperty(edition,'contentId',{enumerable:true,get(){
      invoked++;return 'UKRPAN';
    }});
    const f=await render(edition,lang);
    assert.equal(invoked,0);
    assert.equal(f.checks,2,'both chapter attempt guards remain in place');
    assert.equal(f.reads,1);
    assert.equal(f.result.innerHTML,'','no text without own edition content identity');
    assert.ok(f.status.textContent,'retryable failure announced');
    assert.equal(f.button.disabled,false,'retry enabled');
  }
});

test('SA-EXT-01: own-data edition identity and null-prototype edition still render',async()=>{
  for(const lang of ['uk','ru','en']){
    const edition=Object.assign(Object.create(null),base);
    const f=await render(edition,lang);
    assert.equal(f.checks,2);
    assert.equal(f.reads,1);
    assert.match(f.result.innerHTML,/VERIFIED VERSE/);
    assert.match(f.result.innerHTML,/Verified source/);
  }
});

test('SA-EXT-01: comparison selector does not execute edition title or ID getters',()=>{
  for(const field of ['id','title']){
    let invoked=0;
    const edition={...base};
    Object.defineProperty(edition,field,{get(){invoked++;return base[field];}});
    const html=parallelControls([edition],'en',esc);
    assert.equal(invoked,0);
    assert.doesNotMatch(html,/Kulish/);
    assert.doesNotMatch(html,/uk-kulish/);
    assert.match(html,/<select name="edition">/);
  }
  assert.match(parallelControls([base],'en',esc),/Kulish/);
});
