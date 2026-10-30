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
async function withForm(callback){const original=globalThis.FormData;globalThis.FormData=class{get(){return edition.id;}};try{return await callback();}finally{globalThis.FormData=original;}}

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
  const f=fixture({catalog:{translations:{},editions:{uk:{id:'UKRPAN',title:'<img>',source:'https://source.example/',license:'<script>',attribution:'<svg>'}}}});
  await f.run();assert.ok(!f.result.innerHTML.includes('<img>'));assert.ok(!f.result.innerHTML.includes('<svg>'));
  assert.ok(!f.result.innerHTML.includes('javascript:'));assert.ok(f.result.innerHTML.includes('&lt;img&gt;'));
}));

test('an attempt started while comparison loads invalidates the pending second text',()=>withForm(async()=>{
  let checks=0;
  const f=fixture({check:async()=>({invalidated:++checks===2})});
  await f.run();
  assert.equal(f.checked(),0,'override counted directly');
  assert.equal(checks,2);
  assert.equal(f.reads(),1);
  assert.equal(f.locked(),1);
  assert.equal(f.result.innerHTML,'');
  assert.equal(f.button.disabled,false);
}));

test('failed or malformed post-load guard cannot disclose the second text',()=>withForm(async()=>{
  for (const second of [undefined, {}, {invalidated:'false'}]) {
    let checks=0;
    const f=fixture({check:async()=> ++checks===1 ? {invalidated:false} : second});
    await f.run();
    assert.equal(checks,2);
    assert.equal(f.failed(),1);
    assert.equal(f.result.innerHTML,'');
  }
  let calls=0;
  const unavailable=fixture({check:async()=>{if (++calls===2) throw Error('offline');return {invalidated:false};}});
  await unavailable.run();
  assert.equal(unavailable.failed(),1);
  assert.equal(unavailable.result.innerHTML,'');
}));

test('unknown local edition metadata never borrows primary-edition attribution',()=>withForm(async()=>{
  const f=fixture({editions:[edition],catalog:{translations:{},editions:{uk:{id:'OTHER',title:'Other rights',license:'Other terms'}}}});
  await f.run();
  assert.equal(f.result.innerHTML,'');
  assert.match(f.status.textContent,/Не вдалося/);
  assert.equal(f.button.disabled,false);
}));

test('reader changed while post-load guard runs does not render late results',()=>withForm(async()=>{
  let release;
  const pending=new Promise(resolve=>{release=resolve;});
  let checks=0;
  const f=fixture({check:async()=> ++checks===1 ? {invalidated:false} : pending});
  const run=f.run();
  for(let n=0;n<8;n++) await Promise.resolve();
  f.move();
  release({invalidated:false});
  await run;
  assert.equal(f.result.innerHTML,'');
  assert.equal(f.button.disabled,false);
}));


test('unverified second-edition provenance cannot disclose comparison verse text',()=>withForm(async()=>{
  const bad=[
    {title:'Куліш',source:'https://source.example/'},
    {title:'Куліш',license:'Public Domain'},
    {title:'Куліш',license:'Public Domain',source:'javascript:alert(1)'},
    {title:'Куліш',license:'Public Domain',source:'http://source.example/'},
    {title:'Куліш',license:'Public Domain',source:'https://user:password@source.example/'},
    {title:'Куліш',license:'Public Domain',source:'https://trusted.example@other.example/'},
    {title:'Куліш',license:'Public Domain',source:'https://source.example/',licenseUrl:'https://user:password@licenses.example/'},
    {title:'Куліш',license:'Public Domain',source:'https://source.example/',licenseUrl:'javascript:alert(1)'},
    {title:' ',license:'Public Domain',source:'https://source.example/'},
    {title:'Куліш',license:' ',source:'https://source.example/'},
  ];
  for(const metadata of bad){
    const f=fixture({catalog:{translations:{},editions:{uk:{id:'UKRPAN',...metadata}}}});
    await f.run();
    assert.equal(f.result.innerHTML,'','no text when provenance is missing/unsafe');
    assert.match(f.status.textContent,/Не вдалося/);
    assert.equal(f.button.disabled,false);
  }
  const good=fixture({catalog:{translations:{},editions:{uk:{
    id:'UKRPAN',title:'Куліш',license:'CC BY-SA 4.0',source:'https://source.example/',
    licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/'
  }}}});
  await good.run();
  assert.match(good.result.innerHTML,/На початку/);
  assert.match(good.result.innerHTML,/creativecommons.org/);
}));
