import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {academyMarkup,academyAllLessonIds} from '../public/scripture-academy.js';
import {scriptureDossiers,validateDossierGraph} from '../public/scripture-dossiers.js';

const catalog=JSON.parse(readFileSync(new URL('../public/data/catalog.json',import.meta.url),'utf8'));
const esc=v=>String(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const names={
  uk:{narrative:'Зв’язок у біблійній оповіді',interpretive:'Тематичне зіставлення, не незалежний історичний доказ'},
  ru:{narrative:'Связь в библейском повествовании',interpretive:'Тематическое сопоставление, не независимое историческое доказательство'},
  en:{narrative:'Connection in the biblical narrative',interpretive:'Thematic comparison, not independent historical proof'}
};
const byId=new Map(scriptureDossiers.map(d=>[d.id,d]));

test('every currently published Academy lesson distinguishes narrative and interpretive canonical citations in all languages',()=>{
  assert.equal(validateDossierGraph(catalog),true);
  let interpretive=0,narrative=0;
  for(const lang of ['uk','ru','en']){
    const html=academyMarkup(catalog,lang,esc,{available:true,completed:[]});
    assert.equal((html.match(/data-academy-lesson=/g)||[]).length,academyAllLessonIds.length);
    for(const id of academyAllLessonIds){
      const dossier=byId.get(id);
      assert.ok(dossier,lang+' '+id);
      const marker='id="academy-lesson-'+id+'"';
      const index=html.indexOf(marker);
      assert.ok(index>=0);
      const article=html.slice(index,html.indexOf('</article>',index));
      assert.equal((article.match(/href="\/reader\//g)||[]).length,dossier.sources.length,
        lang+' '+id+' all source links preserved without invented witnesses');
      for(const ref of dossier.sources){
        const link='href="/reader/'+ref.book+'/'+ref.chapter+'?verse='+ref.first+'"';
        const at=article.indexOf(link);
        assert.ok(at>=0,lang+' '+id+' '+link);
        const li=article.slice(at,article.indexOf('</li>',at)+5);
        assert.ok(li.includes('</a> — '+esc(names[lang][ref.kind])+'</li>'),
          lang+' '+id+' '+ref.book+' '+ref.kind+' is publicly classified');
        // An aria-label replaces the native link name. NVDA's links list must
        // retain this provenance classification without adjacent static text.
        const anchor=li.slice(0,li.indexOf('</a>')+4);
        assert.ok(anchor.includes('aria-label="'),lang+' '+id+' missing link name');
        assert.ok(anchor.includes(' — '+esc(names[lang][ref.kind])+'">'),
          lang+' '+id+' '+ref.book+' '+ref.kind+' is absent from the link accessible name');
        if(ref.kind==='interpretive')interpretive++;else narrative++;
      }
      assert.ok(!article.includes('onclick='),'native links and controls remain keyboard accessible');
    }
  }
  assert.ok(interpretive>0,'interpretive witnesses exist and are classified');
  assert.ok(narrative>0,'narrative witnesses exist and are classified');
});

test('read-only and unsupported-language Academy retain safe source labels, without forging private progress',()=>{
  const denied=academyMarkup(catalog,'en',esc,{available:false,completed:[]});
  assert.match(denied,/Connection in the biblical narrative/);
  assert.match(denied,/Thematic comparison, not independent historical proof/);
  assert.doesNotMatch(denied,/data-academy-lesson=/);
  const fallback=academyMarkup(catalog,'__proto__',esc,{available:true,completed:[]});
  assert.match(fallback,/Зв’язок у біблійній оповіді/);
  assert.doesNotMatch(fallback,/undefined/);
  const invalid=structuredClone(catalog);
  invalid.books.uk[0].chapters=0;
  const blocked=academyMarkup(invalid,'uk',esc,{available:true,completed:[]});
  assert.match(blocked,/role="alert"/);
  assert.doesNotMatch(blocked,/href="\/reader\//);
  assert.doesNotMatch(blocked,/Thematic comparison/);
});
