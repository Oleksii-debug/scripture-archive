import test from 'node:test';
import assert from 'node:assert/strict';
import { parallelControls, mountParallelReader } from '../public/parallel-reader.js';

const esc = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const edition={id:'uk-kulish',contentId:'UKRPAN',title:'Куліш',local:true};
const catalog={translations:{},editions:{uk:{id:'UKRPAN',title:'Куліш',source:'https://source.example/',license:'Public Domain'}}};
function fixture(overrides={}) {
  let isCurrent=true, locked=0, failed=0, reads=0, checked=0;
  const button={disabled:false}, status={textContent:''}, result={innerHTML:'',replaceChildren(){this.innerHTML='';}};
  const form={onsubmit:null,querySelector:()=>button};
  const panel={isConnected:true,querySelector(selector){return selector==='.parallel-form'?form:selector==='.parallel-status'?status:result;}};
  const options={editions:[edition],catalog,lang:'uk',book:'GEN',bookTitle:'Буття',chapter:1,esc,
    getBook:async()=>{reads++;return {chapters:[['На початку','<script>']]};},
    check:async()=>{checked++;return {invalidated:false};},current:()=>isCurrent,
    lock:()=>{locked++;},failClosed:()=>{failed++;},...overrides};
  mountParallelReader(panel,options);
  return {panel,form,status,result,button,run:()=>form.onsubmit({preventDefault(){}}),move:()=>{isCurrent=false;},reads:()=>reads,checked:()=>checked,locked:()=>locked,failed:()=>failed};
}
async function withForm(callback, selected=edition.id){const original=globalThis.FormData;globalThis.FormData=class{get(){return selected;}};try{return await callback();}finally{globalThis.FormData=original;}}

test('comparison is a labelled native form with escaped edition names',()=>{
  const html=parallelControls([{id:'x"',title:'<img>'}],'uk',esc);
  assert.match(html,/<details/);assert.match(html,/<label/);assert.match(html,/<select name="edition">/);assert.match(html,/role="status"/);
  assert.ok(!html.includes('<img>'));assert.ok(html.includes('&lt;img&gt;'));
});

test('comparison rechecks chapter guard, shows named source, and escapes text',()=>withForm(async()=>{
  const f=fixture();await f.run();assert.equal(f.checked(),2);assert.equal(f.reads(),1);assert.equal(f.locked(),0);
  assert.match(f.result.innerHTML,/Куліш — Буття 1/);assert.match(f.result.innerHTML,/https:\/\/source\.example/);
  assert.ok(f.result.innerHTML.includes('&lt;script&gt;'));assert.ok(!f.result.innerHTML.includes('<script>'));
  assert.equal(f.button.disabled,false);
}));

test('invalidated or unavailable guard never reads the other edition',()=>withForm(async()=>{
  const locked=fixture({check:async()=>({invalidated:true})});await locked.run();assert.equal(locked.locked(),1);assert.equal(locked.reads(),0);
  const bad=fixture({check:async()=>({})});await bad.run();assert.equal(bad.failed(),1);assert.equal(bad.reads(),0);
  const offline=fixture({check:async()=>{throw Error('offline');}});await offline.run();assert.equal(offline.failed(),1);assert.equal(offline.reads(),0);
}));

test('late comparison responses never repopulate a detached or changed reader',()=>withForm(async()=>{
  let release;const pending=new Promise(resolve=>{release=resolve;});
  const f=fixture({getBook:async()=>pending});const run=f.run();await Promise.resolve();await Promise.resolve();f.move();f.panel.isConnected=false;release({chapters:[['SHOULD NOT RENDER']]});await run;
  assert.equal(f.result.innerHTML,'');assert.equal(f.button.disabled,false);
}));

test('failed second-edition load leaves the original reader intact and allows retry',()=>withForm(async()=>{
  const f=fixture({getBook:async()=>{throw Error('offline');}});await f.run();assert.match(f.status.textContent,/Не вдалося/);assert.equal(f.result.innerHTML,'');assert.equal(f.button.disabled,false);
}));

test('untrusted metadata is escaped and non-HTTPS links are not rendered',()=>withForm(async()=>{
  const f=fixture({catalog:{translations:{},editions:{uk:{id:'UKRPAN',title:'<img>',source:'javascript:alert(1)',license:'<script>',attribution:'<svg>'}}}});
  await f.run();assert.ok(!f.result.innerHTML.includes('<img>'));assert.ok(!f.result.innerHTML.includes('<svg>'));
  assert.ok(!f.result.innerHTML.includes('javascript:'));assert.ok(f.result.innerHTML.includes('&lt;img&gt;'));
}));

test('missing translation provenance does not borrow a different edition license',()=>withForm(async()=>{
  const ohiienko={id:'uk-ohiienko',title:'Огієнко',local:true};
  const f=fixture({editions:[ohiienko],catalog});
  await f.run();
  assert.equal(f.checked(),2);
  assert.equal(f.reads(),1);
  assert.equal(f.result.innerHTML,'');
  assert.match(f.status.textContent,/Не вдалося/);
  assert.ok(!f.result.innerHTML.includes('Public Domain'));
},'uk-ohiienko'));

test('a mismatched translation metadata ID fails closed instead of showing wrong rights',()=>withForm(async()=>{
  const ohiienko={id:'uk-ohiienko',title:'Огієнко',local:true};
  const bad={translations:{'uk-ohiienko':{id:'uk-kulish',title:'WRONG EDITION',license:'Public Domain'}},editions:catalog.editions};
  const f=fixture({editions:[ohiienko],catalog:bad});
  await f.run();
  assert.equal(f.result.innerHTML,'');
  assert.match(f.status.textContent,/Не вдалося/);
},'uk-ohiienko'));

test('exact translation metadata keeps the actual edition title and license',()=>withForm(async()=>{
  const ohiienko={id:'uk-ohiienko',title:'Огієнко',local:true};
  const exact={translations:{'uk-ohiienko':{id:'uk-ohiienko',title:'Огієнко',license:'CC BY-SA 4.0',source:'https://source.example/ohienko'}},editions:catalog.editions};
  const f=fixture({editions:[ohiienko],catalog:exact});
  await f.run();
  assert.match(f.result.innerHTML,/Огієнко — Буття 1/);
  assert.match(f.result.innerHTML,/CC BY-SA 4\.0/);
  assert.ok(!f.result.innerHTML.includes('Public Domain'));
},'uk-ohiienko'));

test('an assessment started during second-edition load locks before exposing verses',()=>withForm(async()=>{
  let n=0;
  const f=fixture({check:async()=>({invalidated:++n===2})});
  await f.run();
  assert.equal(n,2); assert.equal(f.reads(),1);
  assert.equal(f.locked(),1); assert.equal(f.result.innerHTML,'');
}));
test('malformed and unreachable final second-edition guards fail closed',()=>withForm(async()=>{
  for (const response of [null,{}, {invalidated:'false'}]) {
    let n=0;
    const f=fixture({check:async()=>++n===1?{invalidated:false}:response});
    await f.run();
    assert.equal(n,2); assert.equal(f.failed(),1); assert.equal(f.result.innerHTML,'');
  }
  let n=0;
  const f=fixture({check:async()=>{if(++n===2)throw Error('offline');return {invalidated:false};}});
  await f.run();
  assert.equal(f.failed(),1); assert.equal(f.result.innerHTML,'');
}));
test('a stale final parallel guard never exposes a detached reader',()=>withForm(async()=>{
  let release;
  const pending=new Promise(resolve=>{release=resolve;});
  let n=0;
  const f=fixture({check:async()=>++n===1?{invalidated:false}:pending});
  const task=f.run();
  for(let i=0;i<16;i++)await Promise.resolve();
  f.move(); release({invalidated:false}); await task;
  assert.equal(n,2); assert.equal(f.result.innerHTML,'');
}));
