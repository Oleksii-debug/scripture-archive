import test from 'node:test';
import assert from 'node:assert/strict';
import { mountParallelReader } from '../public/parallel-reader.js';

const editions = [{id:'a',local:true},{id:'b',local:true}];
const catalog = {translations:{
  a:{id:'a',title:'Edition A',license:'Public Domain',source:'https://example.org/a'},
  b:{id:'b',title:'Edition B',license:'Public Domain',source:'https://example.org/b'},
}};
const escapeHtml = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');

function fixture(options={}) {
  let selected='a', active=true, checks=0, reads=0;
  const button={disabled:false};
  const status={textContent:''};
  const result={innerHTML:'',replaceChildren(){this.innerHTML='';}};
  const form={onsubmit:null,onchange:null,querySelector:()=>button,selected:()=>selected};
  const panel={isConnected:true,querySelector(selector){
    return selector==='.parallel-form'?form:selector==='.parallel-status'?status:result;
  }};
  mountParallelReader(panel,{
    editions,catalog,lang:options.lang || 'en',book:'GEN',bookTitle:'Genesis',chapter:1,esc:escapeHtml,
    check:async()=>{checks++;return {invalidated:false};},
    getBook:async(_book,edition)=>{
      reads++;
      return options.getBook ? options.getBook(edition) : {chapters:[[edition.id==='a'?'VERSE A':'VERSE B']]};
    },
    current:()=>active,lock(){throw Error('not expected');},failClosed(){throw Error('not expected');},
  });
  return {button,status,result,form,panel,
    submit:()=>form.onsubmit({preventDefault(){}}),
    choose:(id)=>{selected=id;form.onchange?.({target:{name:'edition'}});},
    otherChange:()=>form.onchange?.({target:{name:'unrelated'}}),
    retire:()=>{active=false;},
    checks:()=>checks,reads:()=>reads};
}
async function withSelectionForm(run) {
  const original=globalThis.FormData;
  globalThis.FormData=class {constructor(form){this.form=form;} get(name){return name==='edition'?this.form.selected():null;}};
  try {await run();} finally {globalThis.FormData=original;}
}

test('a finished comparison disappears when another Bible edition is chosen; new submit shows only B',()=>withSelectionForm(async()=>{
  const f=fixture();
  await f.submit();
  assert.match(f.result.innerHTML,/VERSE A/);
  assert.match(f.status.textContent,/available below/);
  f.choose('b');
  assert.equal(f.result.innerHTML,'','old licensed verses must not remain under B selection');
  assert.match(f.status.textContent,/selected edition changed/);
  await f.submit();
  assert.match(f.result.innerHTML,/VERSE B/);
  assert.doesNotMatch(f.result.innerHTML,/VERSE A/);
  assert.equal(f.checks(),4);
  assert.equal(f.reads(),2);
  assert.equal(f.button.disabled,false);
}));

test('pending edition A request is retired across A to B to A selection even when final ID matches',()=>withSelectionForm(async()=>{
  let enter,release;
  const entered=new Promise(resolve=>{enter=resolve;});
  const pending=new Promise(resolve=>{release=resolve;});
  const f=fixture({getBook:async()=>{enter();return pending;}});
  const running=f.submit();
  await entered;
  f.choose('b');
  f.choose('a');
  release({chapters:[['STALE A REPLY']]});
  await running;
  assert.equal(f.result.innerHTML,'','stale pending response must not repopulate comparison');
  assert.match(f.status.textContent,/selected edition changed/);
  assert.equal(f.button.disabled,false);
  assert.equal(f.reads(),1);
}));

test('unrelated input event cannot discard a correctly displayed comparison',()=>withSelectionForm(async()=>{
  const f=fixture();
  await f.submit();
  const before=f.result.innerHTML;
  f.otherChange();
  assert.equal(f.result.innerHTML,before);
  assert.match(f.status.textContent,/available below/);
}));

test('selection change uses existing localized accessible status and leaves original reader attached',()=>withSelectionForm(async()=>{
  for(const [lang,copy] of [['uk','Вибране видання змінилося'],['ru','Выбранное издание изменилось'],['en','The selected edition changed']]) {
    const f=fixture({lang});
    await f.submit();
    f.choose('b');
    assert.equal(f.result.innerHTML,'');
    assert.ok(f.status.textContent.includes(copy),lang);
    assert.equal(f.panel.isConnected,true);
    assert.equal(f.button.disabled,false);
  }
}));
