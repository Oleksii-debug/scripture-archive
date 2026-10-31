import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dossierAtlasMarkup,scriptureDossiers,validateDossierGraph} from '../public/scripture-dossiers.js';
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
