import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dossierAtlasMarkup, scriptureDossiers, validateDossierGraph} from '../public/scripture-dossiers.js';

const catalog=JSON.parse(readFileSync(new URL('../public/data/catalog.json',import.meta.url),'utf8'));
const esc=v=>String(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const labels={
  uk:{heading:'Зв’язки з іншими досьє',narrative:'Зв’язок у біблійній оповіді',interpretive:'Тематичне зіставлення, не незалежний історичний доказ'},
  ru:{heading:'Связи с другими досье',narrative:'Связь в библейском повествовании',interpretive:'Тематическое сопоставление, не независимое историческое доказательство'},
  en:{heading:'Connections to other dossiers',narrative:'Connection in the biblical narrative',interpretive:'Thematic comparison, not independent historical proof'}
};
const edges=scriptureDossiers.flatMap(item=>item.related.map(link=>({item,link})));
const byId=new Map(scriptureDossiers.map(item=>[item.id,item]));

test('all canonical relationship-only witnesses are visible from real atlas navigation in uk/ru/en',()=>{
  assert.equal(validateDossierGraph(catalog),true);
  assert.ok(edges.length>0);
  assert.ok(edges.some(({item,link})=>!item.sources.some(s=>
    s.book===link.via.book&&s.chapter===link.via.chapter&&s.first===link.via.first&&s.last===link.via.last)));
  for(const lang of ['uk','ru','en']){
    const html=dossierAtlasMarkup(catalog,lang,esc);
    const begin=html.indexOf('<section aria-labelledby="dossier-atlas-relations-heading">');
    const end=html.indexOf('</section>',begin);
    assert.ok(begin>0&&end>begin,lang+' relationship section mounted');
    const section=html.slice(begin,end);
    assert.ok(section.includes('<h3 id="dossier-atlas-relations-heading">'+esc(labels[lang].heading)+'</h3>'));
    assert.equal((section.match(/<dt>/g)||[]).length,edges.length,lang+' every relation has a labelled source');
    assert.equal((section.match(/<dd>/g)||[]).length,edges.length);
    assert.equal((section.match(/<\/dd>/g)||[]).length,edges.length);
    for(const {item,link} of edges){
      const destination=byId.get(link.to);
      assert.ok(destination,link.to+' canonical relationship target');
      const from='<a href="/dossiers?id='+item.id+'">'+esc(item.names[lang])+'</a>';
      const to='<a href="/dossiers?id='+destination.id+'">'+esc(destination.names[lang])+'</a>';
      const source=link.via;
      const reader='<a href="/reader/'+source.book+'/'+source.chapter+'?verse='+source.first+'"';
      const entry='<dt>'+from+' → '+to+'</dt><dd>';
      const at=section.indexOf(entry);
      assert.ok(at>=0,lang+' relationship identity '+item.id+' → '+link.to);
      const visible=section.slice(at,section.indexOf('</dd>',at));
      assert.ok(visible.includes(reader),lang+' cited reader target '+item.id);
      assert.ok(visible.includes(' — '+esc(labels[lang][source.kind])),lang+' source-kind provenance '+item.id);
    }
    assert.equal((html.match(/<table>/g)||[]).length,2,'do not change approved narrative and place tables');
    assert.ok(!section.includes('onclick='));
    assert.ok(!section.includes('href="http://'));
  }
});

test('damaged publication catalogue fails closed before any relationship link appears',()=>{
  const broken=structuredClone(catalog);
  broken.books.en[0].chapters=0;
  const html=dossierAtlasMarkup(broken,'en',esc);
  assert.match(html,/role="alert"/);
  assert.doesNotMatch(html,/dossier-atlas-relations-heading/);
  assert.doesNotMatch(html,/href="\/reader\//);
  assert.doesNotMatch(html,/href="\/dossiers\?id=/);
});
