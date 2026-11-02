import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {academyMarkup, academyAllLessonIds} from '../public/scripture-academy.js';
import {validateDossierGraph} from '../public/scripture-dossiers.js';

const canonical=JSON.parse(readFileSync(new URL('../public/data/catalog.json',import.meta.url),'utf8'));
const esc=value=>String(value).replace(/[&<>"']/g,ch=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[ch]));

test('SA-EXT-07: Academy uses reader-admitted book arrays without invoking publisher-controlled map accessors',()=>{
  for(const lang of ['uk','ru','en']){
    for(const origin of ['own','inherited']){
      const catalog=structuredClone(canonical);
      const books=catalog.books[lang];
      let getterCalls=0;
      const methodTrap={
        configurable:true,
        get(){getterCalls++;throw Error('untrusted catalogue map accessor executed');}
      };
      if(origin==='own')Object.defineProperty(books,'map',methodTrap);
      else Object.setPrototypeOf(books,Object.create(Array.prototype,{
        map:{...methodTrap,enumerable:false}
      }));
      assert.equal(validateDossierGraph(catalog),true,lang+' '+origin+' is valid catalogue data');
      for(const progress of [
        {available:true,completed:[]},
        {available:false,completed:[]},
      ]){
        let html;
        assert.doesNotThrow(()=>{html=academyMarkup(catalog,lang,esc,progress);},
          lang+' '+origin+' must not execute the accessor');
        assert.match(html,/href="\/reader\//,lang+' '+origin+' source reading remains available');
        assert.equal((html.match(/id="academy-lesson-/g)||[]).length,academyAllLessonIds.length,
          lang+' '+origin+' must preserve all lessons');
        if(progress.available)assert.equal((html.match(/data-academy-lesson=/g)||[]).length,academyAllLessonIds.length);
        else assert.doesNotMatch(html,/data-academy-lesson=/,'private markers remain read-only');
      }
      assert.equal(getterCalls,0,lang+' '+origin+' untrusted method must never be read');
    }
  }
});

test('SA-EXT-07: genuine malformed source title still fails closed without executing a title getter',()=>{
  const catalog=structuredClone(canonical);
  let calls=0;
  Object.defineProperty(catalog.books.en[0],'title',{
    configurable:true,enumerable:true,get(){calls++;throw Error('publisher getter');}
  });
  assert.equal(validateDossierGraph(catalog),false);
  for(const lang of ['uk','ru','en']){
    const html=academyMarkup(catalog,lang,esc,{available:true,completed:[]});
    assert.match(html,/role="alert"/);
    assert.doesNotMatch(html,/href="\/reader\//);
  }
  assert.equal(calls,0);
});
