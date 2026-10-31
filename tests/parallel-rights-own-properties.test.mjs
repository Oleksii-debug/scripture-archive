import test from 'node:test';
import assert from 'node:assert/strict';
import { validEditionRightsMetadata, mountParallelReader } from '../public/parallel-reader.js';

// This is the real shared provenance gate used by both Scripture readers.
const good = {
  id:'alt', title:'Verified second edition', license:'Public Domain',
  source:'https://publisher.example/edition',
};
const positive = [
  ['minimum certified rights', {...good}],
  ['explicit null attribution', {...good, attribution:null}],
  ['explicit null license URL', {...good, licenseUrl:null}],
  ['own optional attribution', {...good, attribution:'Translator board'}],
  ['own optional licence URL', {...good, licenseUrl:'https://rights.example/license'}],
  ['both own optional fields', {...good, attribution:'Source editor',licenseUrl:'https://rights.example/terms'}],
  ['maximum permitted title length', {...good, title:'T'.repeat(512)}],
  ['null-prototype object with all own required fields', Object.assign(Object.create(null),good)],
];
for(const [label,metadata] of positive) {
  test('SA-EXT-01 own rights: accepts '+label,()=>{
    assert.equal(Boolean(validEditionRightsMetadata(metadata)),true);
  });
}

// Twelve real prototype-borne mandatory provenance cases: 3 fields × 4
// independent inheritance topologies. Current-main-before-fix admitted all.
const prototypes = [
  (field,value)=>({[field]:value}),
  (field,value)=>Object.create({[field]:value}),
  (field,value)=>Object.defineProperty({},field,{value,enumerable:false}),
  (field,value)=>Object.assign(Object.create(null),{[field]:value}),
];
for(const field of ['title','license','source']) for(const [index,prototype] of prototypes.entries()) {
  test('SA-EXT-01 own rights: rejects inherited '+field+' prototype '+(index+1),()=>{
    const ownFields={...good};
    delete ownFields[field];
    const contaminated=Object.assign(Object.create(prototype(field,good[field])),ownFields);
    assert.equal(validEditionRightsMetadata(contaminated),false);
  });
}

// Optional fields cannot be supplied by a prototype either: even null and
// an empty optional note are inherited catalog authority, not an own claim.
const optionalValues={
  attribution:['Licensed notes',null,'','Translation committee'],
  licenseUrl:['https://rights.example/terms',null,'https://rights.example/updates','https://publisher.example/license'],
};
for(const [field,values] of Object.entries(optionalValues))
  for(const [index,value] of values.entries()){
    test('SA-EXT-01 own rights: rejects inherited optional '+field+' variant '+(index+1),()=>{
      const contaminated=Object.assign(Object.create({[field]:value}),good);
      assert.equal(validEditionRightsMetadata(contaminated),false);
    });
  }

const invalid=[
  ['null',null],
  ['undefined',undefined],
  ['bare array',[]],
  ['array decorated with apparently valid edition fields',Object.assign([],{...good})],
  ['number',42],
  ['string','https://publisher.example/edition'],
];
for(const [label,value] of invalid){
  test('SA-EXT-01 own rights: rejects non-record '+label,()=>{
    assert.equal(validEditionRightsMetadata(value),false);
  });
}

// Actual canonical comparison flow: prevent real licensed verse disclosure
// under inherited rights, retain a visible error and an enabled retry.
test('SA-EXT-01 real parallel-reader UI never renders verses under inherited licence',async()=>{
  const button={disabled:false};
  const status={textContent:''};
  const result={innerHTML:'',replaceChildren(){this.innerHTML='';}};
  const form={querySelector(){return button;}};
  const panel={isConnected:true,querySelector(selector){
    return selector==='.parallel-form'?form
      :selector==='.parallel-status'?status:result;
  }};
  const metadata=Object.assign(Object.create({license:'Public Domain'}),{
    id:'alt',title:'Verified second edition',
    source:'https://publisher.example/edition',
  });
  mountParallelReader(panel,{
    editions:[{id:'alt',local:true}],
    catalog:{translations:{alt:metadata},editions:{}},
    lang:'en',book:'GEN',bookTitle:'Genesis',chapter:1,
    esc:value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'),
    getBook:async()=>({chapters:[['THIS LICENSED VERSE MUST STAY PRIVATE']]}),
    check:async()=>({invalidated:false}),
    current:()=>true,lock(){throw Error('unexpected lock');},
    failClosed(){throw Error('unexpected guard failure');},
  });
  const original=globalThis.FormData;
  globalThis.FormData=class {get(){return 'alt';}};
  try{
    await form.onsubmit({preventDefault(){}});
    assert.equal(result.innerHTML,'');
    assert.match(status.textContent,/Could not load/);
    assert.equal(button.disabled,false);
  }finally{globalThis.FormData=original;}
});
