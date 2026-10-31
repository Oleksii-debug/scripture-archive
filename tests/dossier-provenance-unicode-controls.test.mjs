import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  dossierMarkup, dossierAtlasMarkup, scriptureDossiers, validateDossierGraph
} from '../public/scripture-dossiers.js';

const catalog=JSON.parse(readFileSync(new URL('../public/data/catalog.json',import.meta.url),'utf8'));
const esc=value=>String(value).replace(/[&<>"']/g,ch=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[ch]));

const invisible=[
  ['bidi override','\u202e'],
  ['zero-width character','\u200b'],
  ['bidi isolate','\u2066'],
  ['NUL','\u0000'],
  ['unpaired UTF-16 surrogate','\ud800']
];

function assertNoSourceLinks(source,label){
  assert.equal(validateDossierGraph(source),false,label);
  for(const lang of ['uk','ru','en']){
    for(const html of [
      dossierMarkup(source,lang,'abraham',esc),
      dossierAtlasMarkup(source,lang,esc),
    ]){
      assert.match(html,/role="alert"/,label+' '+lang);
      assert.doesNotMatch(html,/href="\/reader\//,label+' '+lang);
      assert.doesNotMatch(html,/href="\/dossiers\?/,label+' '+lang);
    }
  }
}

test('actual approved multilingual source and normal Unicode remain readable',()=>{
  assert.equal(validateDossierGraph(catalog),true);
  assert.match(dossierMarkup(catalog,'uk','abraham',esc),/href="\/reader\/GEN\/12\?verse=1"/);
  assert.match(dossierAtlasMarkup(catalog,'en',esc),/href="\/reader\//);
});

for(const [reason,character] of invisible){
  for(const lang of ['uk','ru','en']){
    test('SA-EXT-05 '+reason+' in '+lang+' book title fails closed',()=>{
      const corrupt=structuredClone(catalog);
      corrupt.books[lang][0].title+=character+'tampered';
      assertNoSourceLinks(corrupt,reason+' '+lang+' book');
    });
    for(const field of ['names','summaries','prompts']){
      test('SA-EXT-05 '+reason+' in '+lang+' dossier '+field+' fails closed',()=>{
        const dossier=scriptureDossiers[0];
        const previous=dossier[field][lang];
        try{
          dossier[field][lang]=field==='prompts'
            ? [previous[0]+character+'tampered',...previous.slice(1)]
            : previous+character+'tampered';
          assertNoSourceLinks(catalog,reason+' '+lang+' '+field);
        }finally{
          dossier[field][lang]=previous;
        }
        assert.equal(validateDossierGraph(catalog),true,'temporary adversarial mutation is fully undone');
      });
    }
  }
}
