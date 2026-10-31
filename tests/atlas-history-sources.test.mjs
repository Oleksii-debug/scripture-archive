import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dossierAtlasMarkup,dossierMarkup,scriptureDossiers,searchScriptureDossiers,validateDossierGraph} from '../public/scripture-dossiers.js';
const catalog=JSON.parse(readFileSync(new URL('../public/data/catalog.json',import.meta.url),'utf8'));
const esc=v=>String(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const order=['abraham','sarah','joseph','moses','exodus','david','nativity'];
const resultLink=(id,q)=>'href="/dossiers?'+new URLSearchParams({id,q}).toString().replaceAll('&','&amp;')+'"';
const kind={
  uk:{narrative:'Зв’язок у біблійній оповіді',interpretive:'Тематичне зіставлення, не незалежний історичний доказ'},
  ru:{narrative:'Связь в библейском повествовании',interpretive:'Тематическое сопоставление, не независимое историческое доказательство'},
  en:{narrative:'Connection in the biblical narrative',interpretive:'Thematic comparison, not independent historical proof'},
};

test('every named narrative atlas row exposes every approved cited Scripture passage',()=>{
  assert.equal(validateDossierGraph(catalog),true);
  for(const lang of ['uk','ru','en']){
    const html=dossierAtlasMarkup(catalog,lang,esc);
    for(let index=0;index<order.length;index++){
      const node=scriptureDossiers.find(item=>item.id===order[index]);
      assert.ok(node&&node.sources.length>=3);
      const rowStart=html.indexOf('<th scope="row">'+(index+1)+'</th>');
      const rowEnd=html.indexOf('</tr>',rowStart);
      assert.ok(rowStart>=0&&rowEnd>rowStart);
      const row=html.slice(rowStart,rowEnd);
      assert.match(row,/<ol>/);
      assert.equal((row.match(/<li>/g)||[]).length,node.sources.length);
      for(const source of node.sources){
        const href='href="/reader/'+source.book+'/'+source.chapter+'?verse='+source.first+'"';
        assert.ok(row.includes(href),lang+' '+node.id+' '+href);
        assert.ok(row.includes(' — '+esc(kind[lang][source.kind])+'</li>'),lang+' '+node.id+' source classification');
      }
    }
  }
});

test('the atlas retains explicit evidence/uncertainty boundaries and accessible native controls',()=>{
  for(const [lang,disclaimer] of [
    ['uk','не датування історичних подій'],
    ['ru','не датировка исторических событий'],
    ['en','not a historical date assignment']
  ]){
    const html=dossierAtlasMarkup(catalog,lang,esc);
    assert.ok(html.includes(disclaimer));
    assert.equal((html.match(/<table>/g)||[]).length,2);
    assert.equal((html.match(/<caption>/g)||[]).length,2);
    assert.ok(!html.includes('<iframe'));
    assert.ok(!html.includes('onclick='));
    assert.ok(!html.includes('href="http://'));
  }
});

test('invalid published Scripture catalogue still fails closed without atlas references',()=>{
  const broken=structuredClone(catalog);
  broken.books.en[0].chapters=0;
  const html=dossierAtlasMarkup(broken,'en',esc);
  assert.match(html,/role="alert"/);
  assert.ok(!html.includes('href="/reader/'));
  assert.ok(!html.includes('href="/dossiers?'));
});

test('the same canonical source-backed module is mounted in the real atlas workspace',()=>{
  const source=readFileSync(new URL('../public/workspace.js',import.meta.url),'utf8');
  assert.match(source,/dossierAtlasMarkup\(catalog,state\.lang,esc,searchQuery\)/);
  assert.match(source,/import \{ dossierMarkup, dossierAtlasMarkup \} from '\.\/scripture-dossiers\.js'/);
});

test('other canonical subjects without asserted historical chronology retain every witness',()=>{
  const remaining=scriptureDossiers.filter(item=>item.type!=='place'&&!order.includes(item.id));
  assert.deepEqual(remaining.map(item=>item.id),['ruth','paul','mary-mother','peter']);
  for(const [lang,heading] of [
    ['uk','Інші теми дослідження (не хронологічний порядок)'],
    ['ru','Другие темы исследования (без хронологического порядка)'],
    ['en','Other research subjects (not chronologically ordered)'],
  ]){
    const html=dossierAtlasMarkup(catalog,lang,esc);
    const start=html.indexOf('<section aria-labelledby="dossier-atlas-additional-heading">');
    assert.ok(start>=0,lang+' explicit separately labelled non-chronological section');
    const end=html.indexOf('</section>',start);
    const additional=html.slice(start,end);
    assert.ok(additional.includes(esc(heading)),lang+' clear chronology disclaimer');
    assert.equal((html.match(/<table>/g)||[]).length,2,'preserve existing two accessible tables');
    assert.equal((additional.match(/href="\/dossiers\?id=/g)||[]).length,remaining.length);
    for(const item of remaining){
      const link='href="/dossiers?id='+item.id+'"';
      const linkAt=additional.indexOf(link);
      assert.ok(linkAt>=0,lang+' '+item.id+' linked to canonical dossier');
      const row=additional.slice(linkAt,additional.indexOf('</ol></li>',linkAt));
      assert.equal((row.match(/<li>/g)||[]).length,item.sources.length,
        lang+' '+item.id+' all distinct witnesses');
      for(const source of item.sources){
        const href='href="/reader/'+source.book+'/'+source.chapter+'?verse='+source.first+'"';
        assert.ok(row.includes(href),lang+' '+item.id+' '+href);
        assert.ok(row.includes(' — '+esc(kind[lang][source.kind])+'</li>'),
          lang+' '+item.id+' does not erase source-kind distinctions');
      }
    }
  }
});


test('filtered atlas uses the same proven source search as its adjacent dossier index',()=>{
  for(const [lang,query] of [['uk','Мойсей'],['ru','Моисей'],['en','Moses']]){
    const html=dossierAtlasMarkup(catalog,lang,esc,query);
    assert.match(html,/role="status"/,lang+' search feedback');
    assert.ok(html.includes(resultLink('moses',query)),lang+' matching dossier keeps its GET filter');
    assert.match(html,/href="\/reader\/EXO\/3\?verse=1"/,lang+' real cited chapter');
    assert.ok(!html.includes(resultLink('abraham',query)),lang+' unrelated dossier not displayed');
    assert.doesNotMatch(html,/href="\/reader\/GEN\/12\?verse=1"/,lang+' unrelated chapter not displayed');
    assert.equal((html.match(/<table>/g)||[]).length,2,lang+' still has native accessible atlas tables');
    assert.ok(!html.includes('onclick=')&&!html.includes('<iframe'),lang+' native keyboard navigation');
  }
});

test('filtered atlas preserves canonical narrative positions instead of renumbering results',()=>{
  // The first filtered result is not necessarily the first approved reading step.
  for(const lang of ['uk','ru','en']){
    for(const [id,position] of [['joseph',3],['moses',4],['david',6],['nativity',7]]){
      const item=scriptureDossiers.find(node=>node.id===id);
      const query=item.names[lang];
      const html=dossierAtlasMarkup(catalog,lang,esc,query);
      const history=html.match(/<tbody>(.*?)<\/tbody>/s)?.[1] || '';
      assert.ok(history.includes(resultLink(id,query)),lang+' '+id+' remains linked');
      assert.ok(history.includes('<th scope="row">'+position+'</th>'),
        lang+' '+id+' keeps its authored narrative order '+position);
      assert.ok(!history.includes('<th scope="row">1</th>'),
        lang+' '+id+' must not be mislabeled as the first canonical step');
    }
  }
});

test('atlas filter has safe no-result and overlong-query boundaries',()=>{
  for(const lang of ['uk','ru','en']){
    const missing=dossierAtlasMarkup(catalog,lang,esc,'zqxneverexists');
    assert.match(missing,/role="status"/);
    assert.ok(!missing.includes('href="/reader/'));
    assert.ok(!missing.includes('href="/dossiers?'));
    const invalid=dossierAtlasMarkup(catalog,lang,esc,'x'.repeat(121));
    assert.match(invalid,/role="alert"/);
    assert.ok(!invalid.includes('href="/reader/'));
    for(const payload of [null,{},['Moses']]){
      const rejected=dossierAtlasMarkup(catalog,lang,esc,payload);
      assert.match(rejected,/role="alert"/);
      assert.ok(!rejected.includes('href="/reader/'));
    }
  }
});

test('unfiltered atlas remains byte-identical for empty or whitespace GET query',()=>{
  for(const lang of ['uk','ru','en']){
    const original=dossierAtlasMarkup(catalog,lang,esc);
    for(const query of ['', ' ', '\t']){
      assert.equal(dossierAtlasMarkup(catalog,lang,esc,query),original,lang+' query='+JSON.stringify(query));
    }
  }
});

test('atlas filtered witness links stay inside the matching canonical graph',()=>{
  for(const [lang,query] of [['en','Moses'],['uk','Авраам'],['ru','Иерусалим']]){
    const html=dossierAtlasMarkup(catalog,lang,esc,query);
    const matches=new Set(searchScriptureDossiers(lang,query,catalog).map(item=>item.id));
    assert.ok(matches.size>0);
    for(const item of scriptureDossiers){
      const anchor=resultLink(item.id,query);
      assert.equal(html.includes(anchor),matches.has(item.id),lang+' '+item.id+' exact subject filter');
    }
    assert.ok(!html.includes('javascript:'));
    assert.ok(!html.includes('<script'));
  }
});


test('SA-EXT-06: filtered atlas subject and relation links retain query across native GET roundtrip',()=>{
  assert.equal(validateDossierGraph(catalog),true);
  for(const [lang,query,id] of [
    ['en','Moses','moses'],
    ['uk','Мойсей','moses'],
    ['ru','Моисей','moses'],
    ['en','GEN 17:15','abraham'],
    ['en','GEN 17:15','sarah'],
    ['en','GEN 12','egypt'],
    ['en',' Abraham ','abraham'],
  ]){
    const trimmed=query.trim();
    const html=dossierAtlasMarkup(catalog,lang,esc,query);
    const href=resultLink(id,trimmed);
    assert.ok(html.includes(href),lang+' '+id+' preserves the selected atlas search');
    assert.ok(!html.includes('href="/dossiers?id='+id+'"'),'filtered subject cannot silently drop q');
    const route=new URL(href.slice('href="'.length,-1).replaceAll('&amp;','&'),'https://scripture-archive.example');
    assert.equal(route.pathname,'/dossiers');
    assert.equal(route.searchParams.get('id'),id);
    assert.equal(route.searchParams.get('q'),trimmed);
    const dossier=dossierMarkup(catalog,lang,route.searchParams.get('id'),esc,route.searchParams.get('q'));
    assert.match(dossier,/id="dossier-heading"/,'selected real dossier remains visible after navigation');
    assert.ok(dossier.includes(href),'canonical dossier index keeps the same filter');
    assert.ok(!html.includes('onclick=')&&!html.includes('<iframe'),'native keyboard links only');
  }
  for(const lang of ['uk','ru','en']){
    const legacy=dossierAtlasMarkup(catalog,lang,esc);
    assert.ok(legacy.includes('href="/dossiers?id=abraham"'),'unfiltered deep links unchanged');
    assert.ok(!legacy.includes('href="/dossiers?id=abraham&amp;q='),'no phantom empty query');
    for(const invalid of ['x'.repeat(121),'zqxneverexists','<img src=x onerror=1>']){
      const html=dossierAtlasMarkup(catalog,lang,esc,invalid);
      assert.ok(!html.includes('href="/dossiers?id='),'invalid/no-match query cannot leak atlas dossier links');
      assert.ok(!html.includes('<img'),'untrusted query cannot inject markup');
    }
  }
});
