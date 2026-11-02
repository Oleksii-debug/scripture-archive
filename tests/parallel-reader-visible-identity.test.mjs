import test from 'node:test';
import assert from 'node:assert/strict';
import { parallelControls, mountParallelReader } from '../public/parallel-reader.js';

const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;')
  .replaceAll('>','&gt;').replaceAll('"','&quot;');
const rights=id=>({id,title:'Verified publisher',license:'Public Domain',
  source:'https://publisher.example/edition'});

function fixture(editions, selectedId, lang='en') {
  let selected=selectedId, checks=0, reads=0;
  const button={disabled:false}, status={textContent:''};
  const result={innerHTML:'',replaceChildren(){this.innerHTML='';}};
  const form={querySelector:()=>button};
  const panel={isConnected:true,querySelector(selector){
    return selector==='.parallel-form'?form:selector==='.parallel-status'?status:result;
  }};
  const catalog={translations:{[selectedId]:rights(selectedId)}};
  mountParallelReader(panel,{editions,catalog,lang,book:'GEN',bookTitle:'Genesis',
    chapter:1,esc,getBook:async()=>{reads++;return {chapters:[['VISIBLE VERSE']]};},
    check:async()=>{checks++;return {invalidated:false};},
    current:()=>true,lock:()=>{},failClosed:()=>{},copyText:async()=>{}});
  const previous=globalThis.FormData;
  globalThis.FormData=class {get(){return selected;}};
  return {status,result,button,run:()=>form.onsubmit({preventDefault(){}}),
    checks:()=>checks,reads:()=>reads,restore:()=>{globalThis.FormData=previous;}};
}

test('SA-EXT-01: invisible, whitespace and unbounded edition IDs never enter selector',()=>{
  const invalid=['', ' ', 'edition\\nother', 'edition\\tother', 'edition\\u202Eevil',
    'edition\\u200Bhidden', 'edition\\u2066hidden', 'x'.repeat(129)];
  for(const lang of ['uk','ru','en']) {
    for(const id of invalid) {
      const html=parallelControls([{id,title:'Spoofed edition',local:true}],lang,esc);
      assert.doesNotMatch(html,/<option /,'invalid publisher identity must not be selectable');
    }
  }
});

test('SA-EXT-01: invalid programmatic identity fails before assessment or file read',async()=>{
  for(const id of [' ', 'edition\\u202Eevil', 'edition\\u200Bhidden', 'x'.repeat(129)]) {
    const f=fixture([{id,title:'Spoofed edition',local:true}],id);
    try {
      await f.run();
      assert.equal(f.checks(),0);
      assert.equal(f.reads(),0);
      assert.equal(f.result.innerHTML,'');
      assert.ok(f.status.textContent,'accessible retry message');
      assert.equal(f.button.disabled,false);
    } finally {f.restore();}
  }
});

test('SA-EXT-01: a previously readable edition mutated to invisible identity retires old text',async()=>{
  const edition={id:'valid-edition',title:'Valid edition',local:true};
  const f=fixture([edition],'valid-edition');
  try {
    await f.run();
    assert.match(f.result.innerHTML,/VISIBLE VERSE/);
    assert.equal(f.reads(),1);
    edition.id='valid\\u202Eedition';
    await f.run();
    assert.equal(f.result.innerHTML,'','stale licensed text must not remain');
    assert.equal(f.reads(),1);
    assert.equal(f.checks(),2);
    assert.ok(f.status.textContent);
  } finally {f.restore();}
});

test('SA-EXT-01: visually misleading edition titles are not offered as choices',()=>{
  for(const title of [' ', 'Visible\\u202Ereversed', 'Hidden\\u200Blabel', 'x'.repeat(513)]) {
    const html=parallelControls([{id:'valid-edition',title,local:true}],'en',esc);
    assert.doesNotMatch(html,/<option /);
  }
});

test('SA-EXT-01: ordinary Unicode identities and null-prototype records remain valid',async()=>{
  const id='видання-2';
  const edition=Object.assign(Object.create(null),{id,title:'Перевірене видання',local:true});
  const html=parallelControls([edition],'uk',esc);
  assert.match(html,/value="видання-2"/);
  const f=fixture([edition],id,'uk');
  try {
    await f.run();
    assert.equal(f.checks(),2);
    assert.equal(f.reads(),1);
    assert.match(f.result.innerHTML,/VISIBLE VERSE/);
  } finally {f.restore();}
});
