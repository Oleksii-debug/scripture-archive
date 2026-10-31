import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { dossierAtlasMarkup, scriptureDossiers, validateDossierGraph } from '../public/scripture-dossiers.js';

const catalog=JSON.parse(readFileSync(new URL('../public/data/catalog.json',import.meta.url),'utf8'));
const workspace=readFileSync(new URL('../public/workspace.js',import.meta.url),'utf8');
const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');

test('an accessible narrative/place atlas is integrated into the existing canonical dossier route',()=>{
  assert.match(workspace,/import \{ dossierMarkup, dossierAtlasMarkup \} from '\.\/scripture-dossiers\.js'/);
  assert.ok(workspace.includes('dossierAtlasMarkup(catalog,state.lang,esc,searchQuery)'));
  assert.equal(validateDossierGraph(catalog),true);
});

test('narrative index is linked, keyboard-native and never presented as a dated historical chronology',()=>{
  const order=['abraham','sarah','joseph','moses','exodus','david','nativity'];
  const placeIds=scriptureDossiers.filter(x=>x.type==='place').map(x=>x.id);
  for(const lang of ['uk','ru','en']){
    const html=dossierAtlasMarkup(catalog,lang,esc);
    assert.ok(html.includes('aria-labelledby="dossier-atlas-heading"'));
    assert.equal((html.match(/<caption>/g)||[]).length,2);
    assert.equal((html.match(/<table>/g)||[]).length,2);
    assert.equal((html.match(/<th scope="row">/g)||[]).length,order.length+placeIds.length);
    assert.ok(html.includes('<th scope="col">'));
    assert.ok(!html.includes('onclick=') && !html.includes('<iframe'), 'native links and tables only');
    let before=0;
    for(const id of order){
      const node=scriptureDossiers.find(d=>d.id===id);
      assert.ok(node);
      const link='href="/dossiers?id='+id+'"';
      const position=html.indexOf(link);
      assert.ok(position>before,lang+' '+id+' must be in declared reading order');
      before=position;
      assert.ok(html.includes(esc(node.names[lang])),lang+' contains accessible name');
      const source=node.sources[0];
      assert.ok(html.includes('href="/reader/'+source.book+'/'+source.chapter+'?verse='+source.first+'"'),
        lang+' '+id+' must open a real, exact first verse');
    }
    for(const id of placeIds){
      const place=scriptureDossiers.find(d=>d.id===id);
      assert.ok(html.includes('href="/dossiers?id='+id+'"'));
      assert.ok(html.includes(esc(place.names[lang])));
    }
    assert.match(html,/<p>.*<\/p>/);
  }
  assert.match(dossierAtlasMarkup(catalog,'en',esc),/not a historical date assignment/);
  assert.match(dossierAtlasMarkup(catalog,'uk',esc),/не датування історичних подій/);
  assert.match(dossierAtlasMarkup(catalog,'ru',esc),/не датировка исторических событий/);
});

test('invalid local edition metadata cannot display unverified geography or timeline links',()=>{
  const damaged=structuredClone(catalog);
  damaged.books.en[0].chapters=0;
  for(const lang of ['uk','ru','en']){
    const html=dossierAtlasMarkup(damaged,lang,esc);
    assert.match(html,/role="alert"/);
    assert.ok(!html.includes('href="/reader/'));
    assert.ok(!html.includes('href="/dossiers?'));
  }
});

test('unknown language is safely mapped to the actual supported Ukrainian edition',()=>{
  const html=dossierAtlasMarkup(catalog,'not-a-language',esc);
  assert.ok(html.includes('Біблійний атлас: текстова лабораторія'));
  assert.ok(html.includes('href="/reader/GEN/12?verse=1"'));
});

test('the atlas exposes all verified place-source passages as native keyboard links in each language',()=>{
  const places=scriptureDossiers.filter(item=>item.type==='place');
  assert.ok(places.length>=1);
  for(const lang of ['uk','ru','en']){
    const html=dossierAtlasMarkup(catalog,lang,esc);
    for(const place of places){
      const anchor='<th scope="row"><a href="/dossiers?id='+place.id+'">';
      const start=html.indexOf(anchor);
      assert.ok(start>=0,lang+' '+place.id+' place row must exist');
      const end=html.indexOf('</tr>',start);
      assert.ok(end>start,lang+' '+place.id+' row must be bounded');
      const row=html.slice(start,end);
      assert.ok(row.includes('<ol>') && row.includes('</ol>'),lang+' '+place.id+' accessible source list');
      assert.equal((row.match(/<li>/g)||[]).length,place.sources.length,lang+' '+place.id+' lists every source');
      for(const source of place.sources){
        const link='href="/reader/'+source.book+'/'+source.chapter+'?verse='+source.first+'"';
        assert.ok(row.includes(link),lang+' '+place.id+' missing '+link);
      }
    }
    assert.ok(!html.includes('onclick=') && !html.includes('<iframe'),lang+' remains native keyboard HTML');
  }
});

test('atlas evidence labels distinguish interpretive Scripture references from narrative evidence',()=>{
  const vocabulary={
    uk:{interpretive:'Тематичне зіставлення, не незалежний історичний доказ',narrative:'Зв’язок у біблійній оповіді'},
    ru:{interpretive:'Тематическое сопоставление, не независимое историческое доказательство',narrative:'Связь в библейском повествовании'},
    en:{interpretive:'Thematic comparison, not independent historical proof',narrative:'Connection in the biblical narrative'},
  };
  for(const lang of ['uk','ru','en']){
    const html=dossierAtlasMarkup(catalog,lang,esc);
    for(const place of scriptureDossiers.filter(dossier=>dossier.type==='place')){
      const start=html.indexOf('<th scope="row"><a href="/dossiers?id='+place.id+'">');
      const end=html.indexOf('</tr>',start);
      assert.ok(start>=0&&end>start,lang+' '+place.id+' exists in atlas');
      const row=html.slice(start,end);
      for(const source of place.sources){
        const link='href="/reader/'+source.book+'/'+source.chapter+'?verse='+source.first+'"';
        const citation=row.indexOf(link),label=esc(vocabulary[lang][source.kind]);
        assert.ok(citation>=0,lang+' '+place.id+' must contain '+link);
        assert.ok(row.slice(citation).includes(' — '+label+'</li>'),lang+' '+place.id+' labels '+source.kind);
      }
    }
    assert.match(html,/not a historical|не датування|не датировка/,'no invented history');
  }
});
