import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  dossierAtlasMarkup, dossierMarkup, scriptureDossiers, validateDossierGraph,
} from '../public/scripture-dossiers.js';

const catalog=JSON.parse(readFileSync(new URL('../public/data/catalog.json',import.meta.url),'utf8'));
const escapeHtml=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;')
  .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const ids=['egypt','nazareth','jericho','galilee'];
const editions=['uk','ru','en','uk-ohiienko'];

test('four new place studies extend the canonical verified dossier graph, not a parallel atlas',()=>{
  assert.equal(validateDossierGraph(catalog),true);
  assert.equal(new Set(scriptureDossiers.map(item=>item.id)).size,scriptureDossiers.length);
  for(const id of ids){
    const item=scriptureDossiers.find(node=>node.id===id);
    assert.ok(item,id);
    assert.equal(item.type,'place',id);
    assert.equal(item.sources.length,3,id);
    assert.equal(item.related.length,1,id);
    for(const language of ['uk','ru','en']){
      assert.ok(item.names[language]?.length>=5,id+' '+language);
      assert.ok(item.summaries[language]?.length>=50,id+' '+language);
      assert.equal(item.prompts[language]?.length,2,id+' '+language);
    }
  }
});

test('every new biblical place citation resolves to actual verses in all four bundled editions',()=>{
  for(const id of ids){
    const item=scriptureDossiers.find(node=>node.id===id);
    for(const ref of [...item.sources,...item.related.map(link=>link.via)]){
      for(const edition of editions){
        const source=JSON.parse(readFileSync(new URL(
          '../public/data/bible/'+edition+'/'+ref.book+'.json',import.meta.url),'utf8'));
        const verses=source.chapters[ref.chapter-1];
        assert.ok(Array.isArray(verses) && ref.first>=1 && ref.last<=verses.length,
          id+' '+edition+' '+ref.book+' '+ref.chapter+':'+ref.first+'-'+ref.last);
        assert.ok(String(verses[ref.first-1]).trim().length>0,id+' nonempty verse');
        assert.ok(String(verses[ref.last-1]).trim().length>0,id+' nonempty final verse');
      }
    }
  }
});

test('new place dossier views are native keyboard links, localized, and expose exact reader references',()=>{
  for(const language of ['uk','ru','en']){
    for(const id of ids){
      const item=scriptureDossiers.find(node=>node.id===id);
      const html=dossierMarkup(catalog,language,id,escapeHtml);
      assert.ok(html.includes('aria-current="page"'),id);
      assert.ok(html.includes('aria-labelledby="dossier-heading"'),id);
      assert.ok(html.includes('href="/dossiers?id='+id+'"'),id);
      assert.ok(html.includes(escapeHtml(item.names[language])),id);
      assert.ok(html.includes(escapeHtml(item.prompts[language][1])),id);
      for(const ref of [...item.sources,...item.related.map(link=>link.via)])
        assert.ok(html.includes('href="/reader/'+ref.book+'/'+ref.chapter+'?verse='+ref.first+'"'),
          id+' '+language+' '+ref.book);
      assert.doesNotMatch(html,/<iframe|onclick=|<script/i,id);
      assert.ok(!html.includes('href="/mission/abraham"'),
        'real place studies cannot masquerade as authored missions');
    }
  }
});

test('existing text-first atlas reaches every new place with accessible table and no invented geolocation',()=>{
  for(const language of ['uk','ru','en']){
    const html=dossierAtlasMarkup(catalog,language,escapeHtml);
    assert.ok(html.includes('aria-labelledby="dossier-atlas-heading"'));
    assert.equal((html.match(/<table>/g)||[]).length,2);
    for(const id of ids){
      const item=scriptureDossiers.find(node=>node.id===id);
      assert.ok(html.includes('href="/dossiers?id='+id+'"'),id+' '+language);
      assert.ok(html.includes(escapeHtml(item.names[language])),id+' '+language);
      assert.ok(html.includes('href="/reader/'+item.sources[0].book+
        '/'+item.sources[0].chapter+'?verse='+item.sources[0].first+'"'),id);
    }
    assert.doesNotMatch(html,/<iframe|onclick=|data-lat=|data-lng=|<canvas/i);
  }
});

test('damaged catalog cannot publish unverified places or potentially misleading passage links',()=>{
  for(const mutate of [
    value=>{value.books.en[0].chapters=0;},
    value=>{value.books.ru=value.books.ru.filter(book=>book.code!=='JOS');},
    value=>{value.books.uk[0].title='';},
    value=>{value.books.en.push({...value.books.en[0]});},
  ]){
    const altered=structuredClone(catalog);
    mutate(altered);
    assert.equal(validateDossierGraph(altered),false);
    for(const language of ['uk','ru','en']){
      for(const html of [
        dossierAtlasMarkup(altered,language,escapeHtml),
        dossierMarkup(altered,language,'egypt',escapeHtml),
      ]){
        assert.match(html,/role="alert"/);
        assert.ok(!html.includes('href="/reader/'));
        assert.ok(!html.includes('href="/dossiers?'));
      }
    }
  }
});
