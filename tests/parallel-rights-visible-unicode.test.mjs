import test from 'node:test';
import assert from 'node:assert/strict';
import {validEditionRightsMetadata, mountParallelReader} from '../public/parallel-reader.js';

const good={
  id:'alt',title:'Український переклад — Verified edition',
  license:'Public Domain\nTranslation attribution',
  attribution:'Edition committee',source:'https://publisher.example/source',
  licenseUrl:'https://publisher.example/rights',
};
const hidden=[
  ['bidi override','\u202e'],
  ['zero-width mark','\u200b'],
  ['bidi isolate','\u2066'],
  ['NUL','\u0000'],
  ['unpaired surrogate','\ud800'],
];

test('SA-EXT-01 keeps approved Unicode, real rights and multiline attribution',()=>{
  assert.equal(Boolean(validEditionRightsMetadata(good)),true);
  assert.equal(Boolean(validEditionRightsMetadata({...good,attribution:null})),true);
  assert.equal(Boolean(validEditionRightsMetadata({...good,license:'Public Domain\t\nVersion 1'})),true);
});
for(const [label,character] of hidden)
  for(const field of ['title','license','attribution']){
    test('SA-EXT-01 rejects '+label+' in '+field+' before real rights display',()=>{
      assert.equal(Boolean(validEditionRightsMetadata({
        ...good,[field]:good[field]+character+'spoof',
      })),false);
    });
  }

const esc=value=>String(value).replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));
async function submitSecondEdition(metadata){
  const button={disabled:false};
  const status={textContent:''};
  const result={innerHTML:'',replaceChildren(){this.innerHTML='';}};
  const form={querySelector(){return button;}};
  const panel={isConnected:true,querySelector(selector){
    return selector==='.parallel-form'?form:selector==='.parallel-status'?status:result;
  }};
  mountParallelReader(panel,{
    editions:[{id:'alt',local:true}],
    catalog:{translations:{alt:metadata},editions:{}},
    lang:'uk',book:'GEN',bookTitle:'Буття',chapter:1,esc,
    getBook:async()=>({chapters:[['CANONICAL LICENSED VERSE']]}),
    check:async()=>({invalidated:false}),
    current:()=>true,lock(){throw Error('unexpected lock');},
    failClosed(){throw Error('unexpected invalidation');},
  });
  const original=globalThis.FormData;
  globalThis.FormData=class {get(){return 'alt';}};
  try {
    await form.onsubmit({preventDefault(){}});
    return {result,status,button};
  } finally {globalThis.FormData=original;}
}
test('SA-EXT-01 valid metadata retains the real parallel-reader flow',async()=>{
  const state=await submitSecondEdition({...good});
  assert.match(state.result.innerHTML,/CANONICAL LICENSED VERSE/);
  assert.match(state.result.innerHTML,/Український переклад/);
  assert.match(state.status.textContent,/завантажено/);
});
for(const [label,character] of hidden){
  test('SA-EXT-01 real reader refuses spoofed '+label+' rights while permitting retry',async()=>{
    const state=await submitSecondEdition({...good,license:good.license+character+'spoof'});
    assert.equal(state.result.innerHTML,'','licensed verses must never be shown under spoofed rights');
    assert.match(state.status.textContent,/Не вдалося/);
    assert.equal(state.button.disabled,false);
  });
}
