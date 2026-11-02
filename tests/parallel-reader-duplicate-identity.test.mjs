import test from 'node:test';
import assert from 'node:assert/strict';
import { parallelControls, mountParallelReader } from '../public/parallel-reader.js';

const esc = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;')
  .replaceAll('>','&gt;').replaceAll('"','&quot;');
const first = { id:'edition-a', title:'First local edition', local:true, contentId:'EDITION_A' };
const duplicate = { id:'edition-a', title:'Conflicting edition', local:true, contentId:'EDITION_B' };
const rights = { id:'EDITION_A', title:'Verified edition', license:'Public Domain',
  source:'https://publisher.example/edition-a' };

async function fixture(editions, lang='en') {
  let selected='edition-a', reads=0, checks=0;
  const button={disabled:false}, status={textContent:''};
  const result={innerHTML:'',replaceChildren(){this.innerHTML='';}};
  const form={querySelector:()=>button};
  const panel={isConnected:true,querySelector(selector){
    return selector==='.parallel-form'?form:selector==='.parallel-status'?status:result;
  }};
  mountParallelReader(panel,{
    editions, catalog:{translations:{},editions:{[lang]:rights}}, lang,
    book:'GEN', bookTitle:'Genesis', chapter:1, esc,
    getBook:async()=>{reads++;return {chapters:[['VERIFIED VERSE']]};},
    check:async()=>{checks++;return {invalidated:false};},
    current:()=>true, lock:()=>{}, failClosed:()=>{}, copyText:async()=>{},
  });
  const original=globalThis.FormData;
  globalThis.FormData=class {get(){return selected;}};
  return {
    status,result,button,
    run:()=>form.onsubmit({preventDefault(){}}),
    choose:id=>{selected=id;},
    reads:()=>reads, checks:()=>checks,
    restore:()=>{globalThis.FormData=original;},
  };
}

test('SA-EXT-01: duplicate publisher IDs never create misleading comparison options',()=>{
  for(const lang of ['uk','ru','en']){
    for(const records of [[first,duplicate],[duplicate,first],[first,{...duplicate,local:false}]]){
      const html=parallelControls(records,lang,esc);
      assert.doesNotMatch(html,/value="edition-a"/,'ambiguous edition ID cannot be selected');
      assert.doesNotMatch(html,/First local edition|Conflicting edition/);
      assert.match(html,/<select name="edition">/);
    }
  }
});

test('SA-EXT-01: duplicate publisher IDs fail closed before guards or chapter fetch',async()=>{
  for(const lang of ['uk','ru','en']){
    for(const records of [[first,duplicate],[duplicate,first],[first,{...duplicate,local:false}]]){
      const f=await fixture(records,lang);
      try {
        await f.run();
        assert.equal(f.checks(),0,'ambiguous identity cannot start an assessment check');
        assert.equal(f.reads(),0,'ambiguous identity cannot choose a local source path');
        assert.equal(f.result.innerHTML,'');
        assert.ok(f.status.textContent,'accessible retry message is required');
        assert.equal(f.button.disabled,false);
      } finally {f.restore();}
    }
  }
});

test('SA-EXT-01: a duplicate introduced without onchange retires previously licensed verses',async()=>{
  const records=[{...first}];
  const f=await fixture(records);
  try {
    await f.run();
    assert.match(f.result.innerHTML,/VERIFIED VERSE/);
    assert.equal(f.reads(),1);
    records.push({...duplicate}); // Imported manifest mutation does not dispatch select onchange.
    await f.run();
    assert.equal(f.result.innerHTML,'','stale licensed text must be removed');
    assert.equal(f.reads(),1,'must not fetch either ambiguous edition');
    assert.equal(f.checks(),2,'must reject before both additional guards');
    assert.ok(f.status.textContent);
    assert.equal(f.button.disabled,false);
  } finally {f.restore();}
});

test('SA-EXT-01: unique own-data editions and null-prototype manifests remain readable',async()=>{
  for(const lang of ['uk','ru','en']){
    const edition=Object.assign(Object.create(null),first);
    const html=parallelControls([edition,{id:'other',title:'Other edition',local:false}],lang,esc);
    assert.match(html,/value="edition-a"/);
    const f=await fixture([edition],lang);
    try {
      await f.run();
      assert.equal(f.checks(),2);
      assert.equal(f.reads(),1);
      assert.match(f.result.innerHTML,/VERIFIED VERSE/);
    } finally {f.restore();}
  }
});

test('SA-EXT-01: empty local edition IDs are not valid programmatic selections',async()=>{
  const f=await fixture([{id:'',title:'Unidentified',local:true,contentId:'EDITION_A'}]);
  try {
    f.choose('');
    await f.run();
    assert.equal(f.reads(),0);
    assert.equal(f.checks(),0);
    assert.equal(f.result.innerHTML,'');
    assert.ok(f.status.textContent);
  } finally {f.restore();}
});

test('SA-EXT-01: ambiguous identity detection never executes an accessor ID',async()=>{
  let called=0;
  const accessor={title:'Dynamic',local:true,contentId:'EDITION_B'};
  Object.defineProperty(accessor,'id',{get(){called++;return 'edition-a';}});
  const html=parallelControls([first,accessor],'en',esc);
  assert.equal(called,0);
  assert.match(html,/value="edition-a"/,'untrusted getter is not a second admitted identity');
  const f=await fixture([first,accessor]);
  try {
    await f.run();
    assert.equal(called,0);
    assert.equal(f.reads(),1);
  } finally {f.restore();}
});
