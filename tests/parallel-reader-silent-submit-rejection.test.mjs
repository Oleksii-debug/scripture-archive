import test from 'node:test';
import assert from 'node:assert/strict';
import { mountParallelReader } from '../public/parallel-reader.js';

const changed={
  uk:'Вибране видання змінилося. Натисніть кнопку ще раз, щоб порівняти його.',
  ru:'Выбранное издание изменилось. Нажмите кнопку ещё раз, чтобы сравнить его.',
  en:'The selected edition changed. Submit again to compare the current selection.',
};
const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;')
  .replaceAll('>','&gt;').replaceAll('"','&quot;');

function fixture(lang,stage) {
  const edition={id:'local-edition',title:'Local edition',local:true,contentId:'EDITION_A'};
  const rights={id:'EDITION_A',title:'Verified publisher',license:'Public Domain',
    source:'https://publisher.example/edition'};
  let selected=edition.id, checks=0, bookCalls=0, failures=0, gateReject;
  const gate=new Promise((resolve,reject)=>{gateReject=reject;});
  const button={disabled:false};
  const status={textContent:''};
  const result={innerHTML:'',replaceChildren(){this.innerHTML='';}};
  const form={querySelector:()=>button};
  const panel={isConnected:true,querySelector(selector){
    return selector==='.parallel-form'?form:selector==='.parallel-status'?status:result;
  }};
  mountParallelReader(panel,{
    editions:[edition],catalog:{translations:{},editions:{[lang]:rights}},
    lang,book:'GEN',bookTitle:'Genesis',chapter:1,esc,
    getBook:async()=>{
      bookCalls++;
      if(stage==='book' && bookCalls===1)return gate;
      return {chapters:[['VERIFIED VERSE']]};
    },
    check:async()=>{
      checks++;
      if(stage==='first' && checks===1)return gate;
      if(stage==='second' && checks===2)return gate;
      return {invalidated:false};
    },
    current:()=>true,lock:()=>{},failClosed:()=>{failures++;},
    copyText:async()=>{throw Error('clipboard should not be used');},
  });
  const originalFormData=globalThis.FormData;
  globalThis.FormData=class {get(){return selected;}};
  return {
    status,result,button,
    submit:()=>form.onsubmit({preventDefault(){}}),
    select:value=>{selected=value;}, // No native change event.
    reject:()=>gateReject(new Error('upstream unavailable')),
    checks:()=>checks,bookCalls:()=>bookCalls,failures:()=>failures,
    restore:()=>{globalThis.FormData=originalFormData;},
  };
}

async function waitFor(predicate) {
  for(let i=0;i<20;i++){
    if(predicate())return;
    await Promise.resolve();
  }
  assert.fail('expected asynchronous stage was never reached');
}

for(const stage of ['first','book','second']){
  test('SA-EXT-01: silent publisher change during rejected '+stage+' request is announced in all locales',async()=>{
    for(const lang of ['uk','ru','en']){
      const f=fixture(lang,stage);
      try{
        const pending=f.submit();
        await waitFor(()=>stage==='first'?f.checks()===1:
          stage==='book'?f.bookCalls()===1:f.checks()===2);
        f.select('another-edition');
        f.reject();
        await pending;
        assert.equal(f.status.textContent,changed[lang],
          'a rejected request must not leave an indefinite loading announcement');
        assert.equal(f.result.innerHTML,'','no licensed text under another selection');
        assert.equal(f.failures(),0,'old selection must not fail-close the new principal');
        assert.equal(f.button.disabled,false,'retry must remain keyboard available');
        f.select('local-edition');
        await f.submit();
        assert.match(f.result.innerHTML,/VERIFIED VERSE/,
          'a valid re-selection can retry the existing reader');
      }finally{f.restore();}
    }
  });
}

for(const stage of ['first','second']){
  test('SA-EXT-01: unchanged publisher still fails closed when '+stage+' guard rejects',async()=>{
    const f=fixture('en',stage);
    try{
      const pending=f.submit();
      await waitFor(()=>stage==='first'?f.checks()===1:f.checks()===2);
      f.reject();
      await pending;
      assert.equal(f.failures(),1);
      assert.equal(f.result.innerHTML,'');
      assert.equal(f.button.disabled,false);
    }finally{f.restore();}
  });
}
