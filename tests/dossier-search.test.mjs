import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dossierMarkup,searchScriptureDossiers,scriptureDossiers,validateDossierGraph} from '../public/scripture-dossiers.js';

const catalog=JSON.parse(readFileSync(new URL('../public/data/catalog.json',import.meta.url),'utf8'));
const esc=v=>String(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

test('a native GET form searches the real validated dossier graph',()=>{
  assert.equal(validateDossierGraph(catalog),true);
  for(const [lang,q,id] of [
    ['uk','Мойсей','moses'],['ru','Моисей','moses'],['en','Abraham','abraham'],
    ['en','Ruth','ruth'],['uk','єрихон','jericho'],['en','Galilee','galilee']
  ]){
    const results=searchScriptureDossiers(lang,q);
    assert.equal(results[0]?.id,id,lang+' '+q);
    const html=dossierMarkup(catalog,lang,null,esc,q);
    assert.match(html,/<form action="\/dossiers" method="get" role="search">/);
    assert.match(html,/<label for="dossier-search">/);
    assert.match(html,/name="q" type="search" maxlength="120"/);
    assert.ok(html.includes('href="/dossiers?id='+id+'"'));
    assert.match(html,/id="dossier-heading"/);
    assert.match(html,/aria-current="page"/);
  }
});

test('search is Unicode case-insensitive and preserves original source links',()=>{
  assert.equal(searchScriptureDossiers('uk','МОЙСЕЙ')[0]?.id,'moses');
  assert.equal(searchScriptureDossiers('ru','МОИСЕЙ')[0]?.id,'moses');
  assert.equal(searchScriptureDossiers('en','ABRAHAM')[0]?.id,'abraham');
  const html=dossierMarkup(catalog,'en',null,esc,'MOSES');
  assert.ok(html.includes('href="/reader/EXO/3?verse=1"'));
  assert.ok(!html.includes('href="http://'));
});

test('empty query is backward compatible; unknown explicit dossiers remain unknown',()=>{
  assert.equal(searchScriptureDossiers('en','').length,scriptureDossiers.length);
  assert.equal(searchScriptureDossiers('uk',' ').length,scriptureDossiers.length);
  assert.match(dossierMarkup(catalog,'en',null,esc),/href="\/dossiers\?id=abraham" aria-current="page"/);
  const missing=dossierMarkup(catalog,'en','no-such-id',esc);
  assert.match(missing,/role="alert"/);
  assert.ok(!missing.includes('href="/reader/'));
});

test('absent results do not substitute another dossier or fabricate Scripture',()=>{
  for(const lang of ['uk','ru','en']){
    const html=dossierMarkup(catalog,lang,null,esc,'zqxnonexistent');
    assert.match(html,/role="alert"/);
    assert.ok(!html.includes('href="/reader/'));
    assert.ok(!html.includes('id="dossier-heading"'));
    assert.ok(html.includes('href="/dossiers"'));
  }
});

test('oversized and untyped search input fails closed and cannot disclose unrelated source text',()=>{
  assert.deepEqual(searchScriptureDossiers('en',null),[]);
  assert.deepEqual(searchScriptureDossiers('en',{}),[]);
  assert.deepEqual(searchScriptureDossiers('en','A'.repeat(121)),[]);
  const html=dossierMarkup(catalog,'en',null,esc,'A'.repeat(121));
  assert.match(html,/role="alert"/);
  assert.ok(!html.includes('href="/reader/'));
  assert.ok(!html.includes('id="dossier-heading"'));
});

test('search input is escaped in attributes and cannot create script, links or handlers',()=>{
  const html=dossierMarkup(catalog,'en',null,esc,'"><script>alert(1)</script>');
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('onclick='));
  assert.ok(html.includes('&quot;&gt;&lt;script&gt;'));
  assert.ok(!html.includes('href="/reader/'));
});

test('invalid canonical catalogue fails closed even when the search matches',()=>{
  const bad=structuredClone(catalog);
  bad.books.en[0].chapters=0;
  const html=dossierMarkup(bad,'en',null,esc,'abraham');
  assert.match(html,/role="alert"/);
  assert.ok(!html.includes('href="/reader/'));
});

test('the actual canonical workspace accepts GET query without another router or database',()=>{
  const source=readFileSync(new URL('../public/workspace.js',import.meta.url),'utf8');
  assert.match(source,/get\('q'\)/);
  assert.match(source,/dossierMarkup\(catalog,state\.lang,selectedId,esc,searchQuery\)/);
  assert.match(source,/dossierAtlasMarkup\(catalog,state\.lang,esc\)/);
});
