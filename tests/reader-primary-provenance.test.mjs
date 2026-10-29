import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const first=src.indexOf('function localEditionMetadata(');
const last=src.indexOf('async function getMission(',first);
assert.ok(first>=0 && last>first);
const functionSource=src.slice(first,last);

function provenance(selected,lang='uk') {
  const entries={
    uk:[{id:'uk-ohiienko',local:true},{id:'uk-kulish',contentId:'UKRPAN',local:true}],
    ru:[{id:'ru-synodal',contentId:'RUSSYN',local:true}],
    en:[{id:'en-web',contentId:'ENGWEBU',local:true}],
  };
  const state={lang};
  const ctx=vm.createContext({state,EDITIONS:entries,URL,selectedEdition:()=>entries[lang].find(e=>e.id===selected)});
  vm.runInContext(functionSource,ctx);
  return c=>ctx.localEditionMetadata(c);
}
const catalog={
  translations:{'uk-ohiienko':{id:'uk-ohiienko',title:'Ohiienko',license:'CC BY-SA 4.0',source:'https://source.example/o'}},
  editions:{
    uk:{id:'UKRPAN',title:'Kulish',license:'Public Domain',source:'https://source.example/k'},
    ru:{id:'RUSSYN',title:'Synodal',license:'Public Domain',source:'https://source.example/r'},
    en:{id:'ENGWEBU',title:'WEB',license:'Public Domain',source:'https://source.example/e'},
  }
};
test('the selected Ukrainian translation never receives an unrelated edition license',()=>{
  const original=provenance('uk-ohiienko')(catalog);
  assert.equal(original.title,'Ohiienko');
  assert.equal(original.license,'CC BY-SA 4.0');
  assert.equal(provenance('uk-kulish')(catalog).title,'Kulish');
});
test('English and Russian canonical local editions retain exact catalog identity',()=>{
  assert.equal(provenance('ru-synodal','ru')(catalog).title,'Synodal');
  assert.equal(provenance('en-web','en')(catalog).title,'WEB');
});
test('missing or mismatched translation provenance fails closed, never borrows Kulish',()=>{
  const invalid={...catalog,translations:{}};
  assert.throws(()=>provenance('uk-ohiienko')(invalid),/local_edition_provenance_unavailable/);
  const wrong={...catalog,translations:{'uk-ohiienko':{...catalog.translations['uk-ohiienko'],id:'UKRPAN'}}};
  assert.throws(()=>provenance('uk-ohiienko')(wrong),/local_edition_provenance_unavailable/);
});
test('primary-reader citation rejects unsafe source or license URLs',()=>{
  const malicious={...catalog,translations:{'uk-ohiienko':{...catalog.translations['uk-ohiienko'],source:'javascript:alert(1)'}}};
  assert.throws(()=>provenance('uk-ohiienko')(malicious),/unsafe_edition_source/);
  const badLicense={...catalog,translations:{'uk-ohiienko':{...catalog.translations['uk-ohiienko'],licenseUrl:'data:text/html,bad'}}};
  assert.throws(()=>provenance('uk-ohiienko')(badLicense),/unsafe_edition_source/);
});
test('catalog metadata without an HTTPS source does not silently enable the reader',()=>{
  const missing={...catalog,editions:{...catalog.editions,uk:{id:'UKRPAN',title:'Kulish',license:'PD'}}};
  assert.throws(()=>provenance('uk-kulish')(missing),/local_edition_provenance_unavailable/);
});
test('reader source URL is escaped before insertion in HTML attribute',()=>{
  assert.match(src,/href="\$\{esc\(editionInfo\.source\)\}"/);
});
