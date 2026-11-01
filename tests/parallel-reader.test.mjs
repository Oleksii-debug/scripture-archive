import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { parallelControls, mountParallelReader } from '../public/parallel-reader.js';

const esc = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const edition={id:'uk-kulish',contentId:'UKRPAN',title:'Куліш',local:true};
const catalog={translations:{},editions:{uk:{id:'UKRPAN',title:'Куліш',source:'https://source.example/',license:'Public Domain'}}};
function fixture(overrides={}) {
  let isCurrent=true, locked=0, failed=0, reads=0, checked=0;
  const button={disabled:false}, status={textContent:''}, copied=[];
  const result={innerHTML:'',replaceChildren(){this.innerHTML='';}};
  const form={onsubmit:null,querySelector:()=>button};
  const panel={isConnected:true,querySelector(selector){return selector==='.parallel-form'?form:selector==='.parallel-status'?status:result;}};
  const options={editions:[edition],catalog,lang:'uk',book:'GEN',bookTitle:'Буття',chapter:1,esc,
    getBook:async()=>{reads++;return {chapters:[['На початку','<script>']]};},
    check:async()=>{checked++;return {invalidated:false};},current:()=>isCurrent,
    lock:()=>{locked++;},failClosed:()=>{failed++;},copyText:async text=>{copied.push(text);},...overrides};
  mountParallelReader(panel,options);
  return {panel,form,status,result,button,copied,run:()=>form.onsubmit({preventDefault(){}}),cite:number=>result.onclick({target:{closest:()=>({dataset:{parallelCite:String(number)}})}}),move:()=>{isCurrent=false;},reads:()=>reads,checked:()=>checked,locked:()=>locked,failed:()=>failed};
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


test('comparison refuses a declared wrong translation identity instead of misattributing verses',()=>withForm(async()=>{
  const fallback={id:'UKRPAN',title:'Куліш',license:'Public Domain',source:'https://source.example/'};
  for(const wrong of [
    {id:'OTHER',title:'Wrong edition',license:'Wrong rights',source:'https://wrong.example/'},
    {title:'No identity',license:'Wrong rights',source:'https://wrong.example/'},
    null,
  ]) {
    const f=fixture({catalog:{translations:{'uk-kulish':wrong},editions:{uk:fallback}}});
    await f.run();
    assert.equal(f.result.innerHTML,'','mismatched or null declared identity cannot disclose comparison text');
    assert.match(f.status.textContent,/Не вдалося/);
    assert.equal(f.button.disabled,false);
  }
  const correct=fixture({catalog:{translations:{'uk-kulish':{
    id:'uk-kulish',title:'Approved Kulish',license:'Verified rights',source:'https://source.example/kulish'
  }},editions:{uk:fallback}}});
  await correct.run();
  assert.match(correct.result.innerHTML,/Approved Kulish/);
  assert.match(correct.result.innerHTML,/На початку/);
  const fallbackOnly=fixture({catalog:{translations:{},editions:{uk:fallback}}});
  await fallbackOnly.run();
  assert.match(fallbackOnly.result.innerHTML,/Куліш/);
  assert.match(fallbackOnly.result.innerHTML,/На початку/);
}));

test('corrupt, sparse or empty comparison verse records are never labelled as Scripture',()=>withForm(async()=>{
  const malformed=[
    [], [null], [0], [{}], [''], ['   '], ['Valid text',null],
    Array(1), ['Valid text',, 'Other text'],
  ];
  for(const verses of malformed){
    const f=fixture({getBook:async()=>({chapters:[verses]})});
    await f.run();
    assert.equal(f.result.innerHTML,'','no untrusted verse records or empty chapter disclosed');
    assert.match(f.status.textContent,/Не вдалося/);
    assert.equal(f.checked(),2,'both chapter safety checks remain mandatory');
    assert.equal(f.button.disabled,false,'the retry control remains usable');
  }
  const good=fixture({getBook:async()=>({chapters:[['Вірш перший', 'Вірш другий']]})});
  await good.run();
  assert.match(good.result.innerHTML,/Вірш перший/);
  assert.match(good.result.innerHTML,/Вірш другий/);
  assert.match(good.status.textContent,/завантажено/);
}));

test('a principal change during a pending comparison cannot repopulate a connected reader',()=>withForm(async()=>{
  let release;
  const pending=new Promise(resolve=>{release=resolve;});
  const f=fixture({getBook:async()=>pending});
  const run=f.run();
  for (let n=0; n<6; n++) await Promise.resolve();
  f.move(); // the captured principal-aware guard is now false
  assert.equal(f.panel.isConnected,true);
  release({chapters:[['PRIVATE PREVIOUS ACCOUNT TEXT']]});
  await run;
  assert.equal(f.result.innerHTML,'');
  assert.equal(f.button.disabled,false);
}));

test('canonical comparison wiring reuses the primary principal-aware reader guard',()=>{
  const source=readFileSync(new URL('../public/app.js', import.meta.url),'utf8');
  // The primary reader retains the old context/principal fence and now also
  // refuses superseded same-principal route/edition continuations.
  assert.match(source,/const readerStillCurrent = \(\) => readerInvocationCurrent\(\) && state\.currentReader === readerContext && state\.user === readerPrincipal;/);
  assert.match(source,/state\.__readerRenderToken === readerRenderToken/);
  const start=source.indexOf('mountParallelReader(panel, {');
  assert.ok(start>0,'canonical reader mounts the comparison module');
  const end=source.indexOf('\n    });',start);
  const contract=source.slice(start,end>start?end:undefined);
  assert.match(contract,/current: readerStillCurrent,/);
});


test('edition selection changes during a pending second-text load cannot misattribute old verses',async()=>{
  const original=globalThis.FormData;
  let selected=edition.id, unblock, reached;
  const pending=new Promise(resolve=>{unblock=resolve;});
  const entered=new Promise(resolve=>{reached=resolve;});
  globalThis.FormData=class{get(){return selected;}};
  try {
    const f=fixture({
      editions:[edition,{id:'uk-second',title:'Other edition',local:true}],
      getBook:async()=>{reached();return pending;},
    });
    const request=f.run();
    await entered;
    selected='uk-second';
    unblock({chapters:[['OLD EDITION PRIVATE VERSE']]});
    await request;
    assert.equal(f.result.innerHTML,'','old edition text must not appear beneath the new selection');
    assert.match(f.status.textContent,/Вибране видання змінилося/);
    assert.equal(f.button.disabled,false,'retry remains available');
    assert.equal(f.locked(),0,'selection changes are not chapter-attempt invalidation');
    assert.equal(f.checked(),2,'both security checks still execute');
  } finally {globalThis.FormData=original;}
});

test('edition selection changes during the second chapter guard also retire old verses',async()=>{
  const original=globalThis.FormData;
  let selected=edition.id, unblock, reached, checks=0;
  const pending=new Promise(resolve=>{unblock=resolve;});
  const entered=new Promise(resolve=>{reached=resolve;});
  globalThis.FormData=class{get(){return selected;}};
  try {
    const f=fixture({
      editions:[edition,{id:'uk-second',title:'Other edition',local:true}],
      check:async()=>{if(++checks===2){reached();return pending;}return {invalidated:false};},
      getBook:async()=>({chapters:[['DO NOT SHOW OBSOLETE VERSE']]}),
    });
    const request=f.run();
    await entered;
    selected='uk-second';
    unblock({invalidated:false});
    await request;
    assert.equal(checks,2);
    assert.equal(f.result.innerHTML,'');
    assert.match(f.status.textContent,/Вибране видання змінилося/);
    assert.equal(f.button.disabled,false);
  } finally {globalThis.FormData=original;}
});

test('edition selection changes during the first chapter guard avoid unnecessary edition read',async()=>{
  const original=globalThis.FormData;
  let selected=edition.id, unblock, reached;
  const pending=new Promise(resolve=>{unblock=resolve;});
  const entered=new Promise(resolve=>{reached=resolve;});
  globalThis.FormData=class{get(){return selected;}};
  try {
    const f=fixture({
      editions:[edition,{id:'uk-second',title:'Other edition',local:true}],
      check:async()=>{reached();return pending;},
    });
    const request=f.run();
    await entered;
    selected='uk-second';
    unblock({invalidated:false});
    await request;
    assert.equal(f.reads(),0,'stale selected edition does not start getBook');
    assert.equal(f.result.innerHTML,'');
    assert.match(f.status.textContent,/Вибране видання змінилося/);
    assert.equal(f.button.disabled,false);
  } finally {globalThis.FormData=original;}
});

test('comparison cites the exact selected edition and all verified rights metadata',()=>withForm(async()=>{
  const f=fixture({catalog:{translations:{},editions:{uk:{
    id:'UKRPAN',title:'Alternate edition',license:'CC BY-SA 4.0',
    attribution:'Original translator',source:'https://source.example/alternate',
    licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/'
  }}}});
  await f.run();
  assert.match(f.result.innerHTML,/data-parallel-cite="1"/);
  assert.match(f.result.innerHTML,/type="button"/);
  assert.match(f.result.innerHTML,/aria-label="Цитувати вірш: Буття 1:1"/);
  await f.cite(2);
  assert.equal(f.copied.length,1);
  assert.match(f.copied[0],/^Буття 1:2\. <script>/);
  assert.ok(f.copied[0].includes('\n'),'citation fields use actual line breaks');
  assert.match(f.copied[0],/Alternate edition · CC BY-SA 4.0/);
  assert.match(f.copied[0],/Original translator/);
  assert.match(f.copied[0],/https:\/\/source\.example\/alternate/);
  assert.match(f.copied[0],/creativecommons.org/);
  assert.match(f.status.textContent,/скопійовано/);
}));

test('comparison citation rechecks chapter protection and refuses invalid numbers',()=>withForm(async()=>{
  let checks=0;
  const f=fixture({check:async()=>({invalidated:++checks===3})});
  await f.run();
  assert.equal(checks,2);
  for (const bad of ['0','-1','3','1.5','NaN',Number.MAX_SAFE_INTEGER+1]) await f.cite(bad);
  assert.equal(checks,2,'invalid requested verses never reach chapter guard');
  await f.cite(1);
  assert.equal(checks,3);
  assert.equal(f.locked(),1);
  assert.equal(f.copied.length,0);
}));

test('failed comparison clipboard write reports an accessible error and supports retry',()=>withForm(async()=>{
  let fails=0, captured='';
  const f=fixture({copyText:async text=>{ if(++fails===1)throw Error('clipboard denied'); captured=text; }});
  await f.run();
  await f.cite(1);
  assert.equal(f.copied.length,0);
  assert.match(f.status.textContent,/Не вдалося/);
  await f.cite(1);
  assert.equal(fails,2);
  assert.match(captured,/На початку/);
  assert.match(f.status.textContent,/скопійовано/);
}));

test('no pending comparison citation may copy after reader/principal changed',()=>withForm(async()=>{
  let unblock, reached;
  const pending=new Promise(resolve=>{unblock=resolve;});
  const entered=new Promise(resolve=>{reached=resolve;});
  let checks=0;
  const f=fixture({check:async()=>{if(++checks===3){reached();return pending;}return {invalidated:false};}});
  await f.run();
  const request=f.cite(1);
  await entered;
  f.move();
  unblock({invalidated:false});
  await request;
  assert.equal(f.copied.length,0);
}));

test('comparison citation retains a validated snapshot if shared cached chapter data mutates later',()=>withForm(async()=>{
  const shared=['Original verse','Second original verse'];
  const f=fixture({getBook:async()=>({chapters:[shared]})});
  await f.run();
  shared[0]='LATER REPLACEMENT';shared[1]='UNVERIFIED REPLACEMENT';
  await f.cite(1);
  assert.equal(f.copied.length,1);
  assert.match(f.copied[0],/Original verse/);
  assert.ok(!f.copied[0].includes('LATER REPLACEMENT'));
}));


test('SA-EXT-01: a damaged oversized parallel chapter cannot exhaust DOM or citation controls',()=>withForm(async()=>{
  for (const verses of [Array(257).fill('verse'), ['V'.repeat(131073)],
    Array(128).fill('V'.repeat(1025))]) {
    const f=fixture({getBook:async()=>({chapters:[verses]})});
    await f.run();
    assert.equal(f.result.innerHTML,'','unbounded chapter must never reach HTML');
    assert.match(f.status.textContent,/Не вдалося/);
    assert.equal(f.checked(),2,'both existing authorization guards execute');
    assert.equal(f.button.disabled,false,'keyboard retry remains usable');
    await f.cite(1);
    assert.equal(f.copied.length,0,'no citation from rejected payload');
  }
  const psalmLike=fixture({getBook:async()=>({chapters:[Array(176).fill('Valid verse')]})});
  await psalmLike.run();
  assert.match(psalmLike.status.textContent,/завантажено/);
  assert.match(psalmLike.result.innerHTML,/data-parallel-cite="176"/);
  const boundary=fixture({getBook:async()=>({chapters:[Array(256).fill('V')]})});
  await boundary.run();
  assert.match(boundary.result.innerHTML,/data-parallel-cite="256"/);
}));


test('source and licence URLs must not be silently rewritten before attribution',()=>withForm(async()=>{
  // WHATWG URL drops raw tabs, CR/LF and empty user-info delimiters. A
  // normalized address is not proof of the original author's source URL.
  const deceptive=[
    'https://@source.example/',
    'https://:@source.example/',
    'https://source.example\r.evil.example/',
    'https://source.example/\nchapter',
    'https://source.example/\tchapter',
    ' https://source.example/',
    'https://source.example/ ',
    'https://source.example/\u007f',
  ];
  for(const bad of deceptive){
    for(const field of ['source','licenseUrl']){
      const metadata={id:'UKRPAN',title:'Куліш',license:'Public Domain',
        source:'https://source.example/',licenseUrl:'https://license.example/'};
      metadata[field]=bad;
      const f=fixture({catalog:{translations:{},editions:{uk:metadata}}});
      await f.run();
      assert.equal(f.result.innerHTML,'','unsafe '+field+' must withhold licensed verse text: '+JSON.stringify(bad));
      assert.match(f.status.textContent,/Не вдалося/,'provide an accessible retryable failure');
      assert.equal(f.button.disabled,false,'retry is not disabled on rejected provenance');
      assert.equal(f.checked(),2,'retain both active-attempt guards');
    }
  }
  const good=fixture({catalog:{translations:{},editions:{uk:{
    id:'UKRPAN',title:'Куліш',license:'Public Domain',
    source:'HTTPS://source.example/valid%20path?name=a@b',
    licenseUrl:'https://license.example/terms%20of%20use',
  }}}});
  await good.run();
  assert.match(good.result.innerHTML,/На початку/);
  assert.match(good.result.innerHTML,/source\.example/);
  assert.match(good.result.innerHTML,/license\.example/);
}));

test('provenance cannot be borrowed from an inherited edition locale or inherited catalog map',()=>withForm(async()=>{
  const forged={id:'UKRPAN',title:'Wrong publisher',license:'Public Domain',source:'https://forged.example/'};
  const inheritedLocale=Object.create({uk:forged});
  const inheritedMap=Object.create({editions:{uk:forged}});
  inheritedMap.translations={};
  for(const candidate of [
    {translations:{},editions:inheritedLocale},
    inheritedMap,
  ]) {
    const f=fixture({catalog:candidate});
    await f.run();
    assert.equal(f.result.innerHTML,'','inherited source metadata must never render licensed verses');
    assert.match(f.status.textContent,/Не вдалося/,'show retryable accessible failure');
    assert.equal(f.checked(),2,'chapter authorization remains enforced');
    assert.equal(f.button.disabled,false,'failure must not strand retry');
  }
}));

test('inherited translations map cannot override publisher provenance or leak verses',()=>withForm(async()=>{
  const forged={id:'uk-kulish',title:'Inherited translation',license:'Restricted',
    source:'https://forged.example/translation'};
  const candidate=Object.create({translations:{'uk-kulish':forged}});
  candidate.editions={};
  const f=fixture({catalog:candidate});
  await f.run();
  assert.equal(f.result.innerHTML,'');
  assert.match(f.status.textContent,/Не вдалося/);
  assert.equal(f.checked(),2);
}));

test('owned edition fallback remains available when an inherited translation map exists',()=>withForm(async()=>{
  const forged={id:'uk-kulish',title:'Inherited rights',license:'Restricted',
    source:'https://forged.example/'};
  const candidate=Object.create({translations:{'uk-kulish':forged}});
  candidate.editions={uk:{id:'UKRPAN',title:'Real source',license:'Public Domain',
    source:'https://legitimate.example/'}};
  const f=fixture({catalog:candidate});
  await f.run();
  assert.match(f.result.innerHTML,/Real source/);
  assert.match(f.result.innerHTML,/https:\/\/legitimate\.example/);
  assert.ok(!f.result.innerHTML.includes('forged.example'));
}));

test('owned explicit translation keeps precedence; invalid owned identity cannot borrow fallback',()=>withForm(async()=>{
  const authoritative={id:'uk-kulish',title:'Licensed alternate',license:'CC BY-SA',
    source:'https://alternate.example/'};
  const base={editions:{uk:{id:'UKRPAN',title:'Legacy fallback',license:'Public Domain',
    source:'https://fallback.example/'}},translations:{'uk-kulish':authoritative}};
  const valid=fixture({catalog:base});await valid.run();
  assert.match(valid.result.innerHTML,/Licensed alternate/);
  assert.ok(!valid.result.innerHTML.includes('fallback.example'));
  const wrong={editions:base.editions,translations:{
    'uk-kulish':{...authoritative,id:'other-translation'},
  }};
  const invalid=fixture({catalog:wrong});await invalid.run();
  assert.equal(invalid.result.innerHTML,'');
  assert.match(invalid.status.textContent,/Не вдалося/);
}));


test('SA-EXT-01: accessor and inherited parallel verses cannot masquerade as verified Scripture',()=>withForm(async()=>{
  let getterCalls=0;
  const accessor=['placeholder'];
  Object.defineProperty(accessor,0,{enumerable:true,configurable:true,get(){
    getterCalls++;
    return getterCalls===1?'Plausible verse':'Unverified changed verse';
  }});
  const inherited=Array(1);
  const prototype=Object.create(Array.prototype);
  Object.defineProperty(prototype,'0',{value:'Unverified inherited verse',enumerable:true});
  Object.setPrototypeOf(inherited,prototype);
  for (const verses of [accessor,inherited]) {
    const f=fixture({getBook:async()=>({chapters:[verses]})});
    await f.run();
    assert.equal(f.result.innerHTML,'','non-owned or dynamic verses must not be published');
    assert.match(f.status.textContent,/Не вдалося/,'announce a retryable failure');
    assert.equal(f.button.disabled,false,'keyboard retry remains available');
    assert.equal(f.checked(),2,'both canonical chapter guards still execute');
    await f.cite(1);
    assert.equal(f.copied.length,0,'rejected verses must not reach clipboard');
  }
  assert.equal(getterCalls,0,'do not execute untrusted verse accessors');
}));

test('SA-EXT-01: validated parallel verses remain stable in the rendered text and citation',()=>withForm(async()=>{
  const verses=['Original approved verse'];
  const f=fixture({getBook:async()=>({chapters:[verses]})});
  await f.run();
  assert.match(f.result.innerHTML,/Original approved verse/);
  verses[0]='Later changed verse';
  await f.cite(1);
  assert.equal(f.copied.length,1);
  assert.match(f.copied[0],/Original approved verse/);
  assert.doesNotMatch(f.copied[0],/Later changed verse/);
}));


test('parallel provenance rejects accessor-backed catalog maps and edition slots without executing getters',()=>withForm(async()=>{
  const verified={id:'UKRPAN',title:'Куліш',source:'https://source.example/',license:'Public Domain'};
  for (const lang of ['uk','ru','en']) {
    for (const boundary of ['catalog-editions','catalog-translations','edition-locale','translation-entry']) {
      let calls=0;
      const catalog={translations:{},editions:{[lang]:verified}};
      const getter=()=>{calls++;return boundary==='catalog-editions'?{[lang]:verified}:
        boundary==='catalog-translations'?{}:verified;};
      if (boundary==='catalog-editions') Object.defineProperty(catalog,'editions',{enumerable:true,get:getter});
      if (boundary==='catalog-translations') Object.defineProperty(catalog,'translations',{enumerable:true,get:getter});
      if (boundary==='edition-locale') Object.defineProperty(catalog.editions,lang,{enumerable:true,get:getter});
      if (boundary==='translation-entry') Object.defineProperty(catalog.translations,edition.id,{enumerable:true,get:()=>{
        calls++;return {id:edition.id,title:'Verified',source:'https://source.example/',license:'Public Domain'};
      }});
      const f=fixture({lang,catalog});
      await f.run();
      assert.equal(calls,0,`${lang} ${boundary}: rights getter must not execute`);
      assert.equal(f.result.innerHTML,'',`${lang} ${boundary}: untrusted source must not be displayed`);
      assert.match(f.status.textContent,/Не вдалося|Не удалось|Could not load/);
      assert.equal(f.button.disabled,false,'accessible retry remains enabled');
      assert.equal(f.checked(),2,'both chapter guards remain mandatory');
    }
  }
}));

test('parallel provenance accepts stable own-data maps including null-prototype dictionaries',()=>withForm(async()=>{
  const editions=Object.create(null);
  editions.uk={id:'UKRPAN',title:'Куліш',source:'https://source.example/',license:'Public Domain'};
  const translations=Object.create(null);
  const fallback=fixture({catalog:{editions,translations}});
  await fallback.run();
  assert.match(fallback.result.innerHTML,/На початку/);
  const translation={id:edition.id,title:'Verified translation',source:'https://source.example/',license:'Public Domain'};
  translations[edition.id]=translation;
  const explicit=fixture({catalog:{editions,translations}});
  await explicit.run();
  assert.match(explicit.result.innerHTML,/Verified translation/);
  assert.equal(explicit.checked(),2);
}));
