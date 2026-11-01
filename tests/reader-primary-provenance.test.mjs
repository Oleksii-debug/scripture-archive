import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { safeProvenanceHttpsUrl, validEditionRightsMetadata } from '../public/parallel-reader.js';

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
  const ctx=vm.createContext({state,EDITIONS:entries,URL,safeProvenanceHttpsUrl,validEditionRightsMetadata,selectedEdition:()=>entries[lang].find(e=>e.id===selected)});
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
  const deceptive={...catalog,translations:{'uk-ohiienko':{...catalog.translations['uk-ohiienko'],source:'https://publisher.example@other.example/read'}}};
  assert.throws(()=>provenance('uk-ohiienko')(deceptive),/unsafe_edition_source/);
  const passwordSource={...catalog,translations:{'uk-ohiienko':{...catalog.translations['uk-ohiienko'],source:'https://user:password@source.example/o'}}};
  assert.throws(()=>provenance('uk-ohiienko')(passwordSource),/unsafe_edition_source/);
  const passwordLicense={...catalog,translations:{'uk-ohiienko':{...catalog.translations['uk-ohiienko'],licenseUrl:'https://user:password@license.example/terms'}}};
  assert.throws(()=>provenance('uk-ohiienko')(passwordLicense),/unsafe_edition_source/);
});
test('catalog metadata without an HTTPS source does not silently enable the reader',()=>{
  const missing={...catalog,editions:{...catalog.editions,uk:{id:'UKRPAN',title:'Kulish',license:'PD'}}};
  assert.throws(()=>provenance('uk-kulish')(missing),/local_edition_provenance_unavailable/);
});
test('reader source URL is escaped before insertion in HTML attribute',()=>{
  assert.match(src,/href="\$\{esc\(editionInfo\.source\)\}"/);
});


test('primary reader refuses normalized-away source and licence provenance in all canonical locales',()=>{
  // The original helper accepted these altered authorities and byte-stripped
  // paths via new URL(), unlike the strict canonical comparison URL authority.
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
  for(const [lang,edition] of [['uk','uk-ohiienko'],['ru','ru-synodal'],['en','en-web']]){
    for(const bad of deceptive){
      for(const field of ['source','licenseUrl']){
        const modified=structuredClone(catalog);
        const metadata=lang==='uk'?modified.translations['uk-ohiienko']:modified.editions[lang];
        metadata[field]=bad;
        assert.throws(()=>provenance(edition,lang)(modified),/unsafe_edition_source/,
          lang+' '+field+' must reject raw normalized-away URL '+JSON.stringify(bad));
      }
    }
  }
  const valid=structuredClone(catalog);
  valid.translations['uk-ohiienko'].source='HTTPS://publisher.example/path%20with%20spaces?name=a@b';
  valid.translations['uk-ohiienko'].licenseUrl='https://rights.example/terms%20of%20use';
  const result=provenance('uk-ohiienko')(valid);
  assert.equal(result.source,valid.translations['uk-ohiienko'].source);
  assert.equal(result.licenseUrl,valid.translations['uk-ohiienko'].licenseUrl);
});


test('declared primary translation with a wrong identity must not borrow regional license',()=>{
  const wrong=structuredClone(catalog);
  wrong.translations['uk-kulish']={
    id:'unrelated-edition',title:'Unrelated publication',license:'Restricted',
    source:'https://different.example.invalid/translation',
  };
  assert.throws(()=>provenance('uk-kulish')(wrong),/local_edition_provenance_unavailable/,
    'explicit but mismatched identity is unsafe even if a default regional edition exists');
  const empty=structuredClone(catalog);
  empty.translations['uk-kulish']=null;
  assert.throws(()=>provenance('uk-kulish')(empty),/local_edition_provenance_unavailable/,
    'declared null must not erase a missing provenance warning');
  const missingId=structuredClone(catalog);
  missingId.translations['uk-kulish']={title:'No ID',license:'PD',source:'https://source.example/unknown'};
  assert.throws(()=>provenance('uk-kulish')(missingId),/local_edition_provenance_unavailable/);
});

test('a true missing translation key retains regional identity and a correctly named translation wins',()=>{
  assert.equal(provenance('uk-kulish')(catalog).title,'Kulish');
  const named=structuredClone(catalog);
  named.translations['uk-kulish']={
    id:'uk-kulish',title:'Authorized second edition',license:'CC BY-SA 4.0',
    source:'https://source.example/authorized',
  };
  assert.equal(provenance('uk-kulish')(named).title,'Authorized second edition');
  assert.equal(provenance('uk-kulish')(named).license,'CC BY-SA 4.0');
});

test('primary reader shares bounded edition rights with the parallel reader in every supported locale',()=>{
  const cases=[
    ['title',513],['license',4097],['attribution',4097],
    ['source',4097],['licenseUrl',4097],
  ];
  for(const [lang,selected] of [['uk','uk-ohiienko'],['ru','ru-synodal'],['en','en-web']]){
    for(const [field,size] of cases){
      const changed=structuredClone(catalog);
      const metadata=lang==='uk'?changed.translations['uk-ohiienko']:changed.editions[lang];
      metadata[field]=field==='source'||field==='licenseUrl'
        ? 'https://source.example/'+ 'a'.repeat(size)
        : 'A'.repeat(size);
      assert.throws(()=>provenance(selected,lang)(changed),
        /local_edition_provenance_unavailable/,
        lang+' oversized '+field+' must never reach DOM or clipboard');
      assert.equal(validEditionRightsMetadata(metadata),false);
    }
  }
});
test('primary reader refuses typed/foreign authored attribution without miscrediting it',()=>{
  for(const lang of ['uk','ru','en']){
    const selected={uk:'uk-ohiienko',ru:'ru-synodal',en:'en-web'}[lang];
    for(const value of [42,true,[],{name:'forged'},['wrong'],false]){
      const changed=structuredClone(catalog);
      const metadata=lang==='uk'?changed.translations['uk-ohiienko']:changed.editions[lang];
      metadata.attribution=value;
      assert.throws(()=>provenance(selected,lang)(changed),/local_edition_provenance_unavailable/);
      assert.equal(validEditionRightsMetadata(metadata),false);
    }
  }
});
test('exact publisher metadata length boundaries preserve legitimate citations',()=>{
  for(const lang of ['uk','ru','en']){
    const selected={uk:'uk-ohiienko',ru:'ru-synodal',en:'en-web'}[lang];
    const changed=structuredClone(catalog);
    const metadata=lang==='uk'?changed.translations['uk-ohiienko']:changed.editions[lang];
    metadata.title='T'.repeat(512);
    metadata.license='L'.repeat(4096);
    metadata.attribution='A'.repeat(4096);
    metadata.licenseUrl='https://source.example/licence';
    assert.equal(validEditionRightsMetadata(metadata),true);
    assert.equal(provenance(selected,lang)(changed),metadata);
  }
});
test('primary and parallel reader preserve real source bytes without truncation or license substitution',()=>{
  for(const lang of ['uk','ru','en']){
    const selected={uk:'uk-ohiienko',ru:'ru-synodal',en:'en-web'}[lang];
    const changed=structuredClone(catalog);
    const metadata=lang==='uk'?changed.translations['uk-ohiienko']:changed.editions[lang];
    metadata.source='HTTPS://publisher.example/path%20with%20spaces?name=a@b';
    metadata.licenseUrl='https://publisher.example/licence%20source';
    assert.equal(provenance(selected,lang)(changed).source,metadata.source);
    assert.equal(validEditionRightsMetadata(metadata),true);
  }
});


test('SA-EXT-01: primary edition rights cannot come from inherited locale keys',()=>{
  for(const [lang,selected] of [['uk','uk-kulish'],['ru','ru-synodal'],['en','en-web']]){
    const inherited=Object.create({[lang]:{...catalog.editions[lang],title:'FORGED INHERITED RIGHTS'}});
    const damaged={translations:{},editions:inherited};
    assert.throws(()=>provenance(selected,lang)(damaged),/local_edition_provenance_unavailable/,
      lang+' inherited edition locale must not authorize a Bible source');
    const healthy={translations:{},editions:Object.assign(Object.create(null),{
      [lang]:{...catalog.editions[lang]},
    })};
    assert.equal(provenance(selected,lang)(healthy).title,catalog.editions[lang].title,
      lang+' own null-prototype locale remains readable');
  }
});

test('SA-EXT-01: inherited top-level rights maps cannot impersonate selected translations',()=>{
  const forged={...catalog.translations['uk-ohiienko'],title:'FORGED INHERITED TRANSLATION'};
  const inheritedCatalog=Object.create({translations:{'uk-ohiienko':forged}});
  inheritedCatalog.editions={};
  assert.throws(()=>provenance('uk-ohiienko')(inheritedCatalog),
    /local_edition_provenance_unavailable/);
  const inheritedRegional=Object.create({editions:{uk:{...catalog.editions.uk,title:'FORGED REGIONAL'}}});
  inheritedRegional.translations={};
  assert.throws(()=>provenance('uk-kulish')(inheritedRegional),
    /local_edition_provenance_unavailable/);
  const accessorCatalog=Object.create({
    get editions(){throw Error('inherited edition getter executed');},
    get translations(){throw Error('inherited translation getter executed');},
  });
  assert.throws(()=>provenance('uk-kulish')(accessorCatalog),
    /local_edition_provenance_unavailable/);
});

test('SA-EXT-01: owned declared translations retain precedence over legitimate regional fallback',()=>{
  const owned=Object.assign(Object.create(null),{
    'uk-kulish':{id:'uk-kulish',title:'Authorized local rights',
      license:'CC BY-SA 4.0',source:'https://licensed.example/translation'},
  });
  const healthy={translations:owned,editions:Object.assign(Object.create(null),{
    uk:{...catalog.editions.uk},
  })};
  assert.equal(provenance('uk-kulish')(healthy).title,'Authorized local rights');
  const invalid={translations:{'uk-kulish':{...owned['uk-kulish'],id:'another-edition'}},
    editions:healthy.editions};
  assert.throws(()=>provenance('uk-kulish')(invalid),/local_edition_provenance_unavailable/);
});
