import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dossierAtlasMarkup,scriptureDossiers,searchScriptureDossiers,validateDossierGraph} from '../public/scripture-dossiers.js';
const catalog=JSON.parse(readFileSync(new URL('../public/data/catalog.json',import.meta.url),'utf8'));
const esc=v=>String(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const order=['abraham','sarah','joseph','moses','exodus','david','nativity'];
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
    assert.match(html,/href="\/dossiers\?id=moses"/,lang+' matching dossier');
    assert.match(html,/href="\/reader\/EXO\/3\?verse=1"/,lang+' real cited chapter');
    assert.doesNotMatch(html,/href="\/dossiers\?id=abraham"/,lang+' unrelated dossier not displayed');
    assert.doesNotMatch(html,/href="\/reader\/GEN\/12\?verse=1"/,lang+' unrelated chapter not displayed');
    assert.equal((html.match(/<table>/g)||[]).length,2,lang+' still has native accessible atlas tables');
    assert.ok(!html.includes('onclick=')&&!html.includes('<iframe'),lang+' native keyboard navigation');
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
      const anchor='href="/dossiers?id='+item.id+'"';
      assert.equal(html.includes(anchor),matches.has(item.id),lang+' '+item.id+' exact subject filter');
    }
    assert.ok(!html.includes('javascript:'));
    assert.ok(!html.includes('<script'));
  }
});
