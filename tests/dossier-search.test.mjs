import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dossierMarkup,searchScriptureDossiers,scriptureDossiers,validateDossierGraph} from '../public/scripture-dossiers.js';

const catalog=JSON.parse(readFileSync(new URL('../public/data/catalog.json',import.meta.url),'utf8'));
const esc=v=>String(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const resultLink=(id,q)=>'href="/dossiers?'+new URLSearchParams({id,q}).toString().replaceAll('&','&amp;')+'"';

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
    assert.ok(html.includes(resultLink(id,q)),'filtered result keeps its GET search');
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


test('SA-EXT-05: explicit dossier outside current search is not presented as a matching cited result',()=>{
  for(const [lang,query,excluded,expected] of [
    ['uk','Мойсей','abraham','Це досьє не відповідає'],
    ['ru','Моисей','abraham','Это досье не соответствует'],
    ['en','Moses','abraham','This dossier does not match'],
  ]){
    const mismatch=dossierMarkup(catalog,lang,excluded,esc,query);
    assert.match(mismatch,/role="alert"/);
    assert.ok(mismatch.includes(expected));
    assert.doesNotMatch(mismatch,/id="dossier-heading"/);
    assert.doesNotMatch(mismatch,/href="\/reader\//);
    assert.ok(mismatch.includes(resultLink('moses',query)),'filtered result remains navigable');
    assert.ok(mismatch.includes('href="/dossiers"'));
    // The same result can be opened, but only if it actually matched.
    const inResult=dossierMarkup(catalog,lang,'moses',esc,query);
    assert.match(inResult,/id="dossier-heading"/);
    assert.match(inResult,/href="\/reader\/EXO\/3\?verse=1"/);
    assert.match(inResult,/aria-current="page"/);
    assert.doesNotMatch(inResult,/role="alert"/);
  }
});

test('SA-EXT-05: unknown explicit ID and no matches stay separately explained',()=>{
  const unknown=dossierMarkup(catalog,'en','never-existed',esc,'Moses');
  assert.match(unknown,/That dossier was not found/);
  assert.doesNotMatch(unknown,/This dossier does not match/);
  const noMatches=dossierMarkup(catalog,'en','abraham',esc,'zqxnonexistent');
  assert.match(noMatches,/role="alert"/);
  assert.doesNotMatch(noMatches,/href="\/reader\//);
  const backwards=dossierMarkup(catalog,'en','abraham',esc);
  assert.match(backwards,/href="\/reader\/GEN\/12\?verse=1"/);
});

test('SA-EXT-05 filtered native GET result links preserve query across route roundtrip',()=>{
  for (const [lang,query,id] of [
    ['en','Moses','moses'],
    ['uk',' Мойсей ','moses'],
    ['ru','МОИСЕЙ','moses'],
    ['en','ABRAHAM','abraham'],
  ]) {
    const trimmed=query.trim();
    const html=dossierMarkup(catalog,lang,null,esc,query);
    assert.ok(html.includes(resultLink(id,trimmed)),lang+' encoded result href');
    assert.ok(!html.includes('href="/dossiers?id='+id+'&q='),'query delimiter must be HTML-escaped');
    const escapedHref=resultLink(id,trimmed).slice('href="'.length,-1);
    const link=new URL(escapedHref.replaceAll('&amp;','&'),'https://scripture-archive.example');
    assert.equal(link.pathname,'/dossiers');
    assert.equal(link.searchParams.get('id'),id);
    assert.equal(link.searchParams.get('q'),trimmed);
    const next=dossierMarkup(catalog,lang,link.searchParams.get('id'),esc,link.searchParams.get('q'));
    assert.match(next,/id="dossier-heading"/);
    assert.match(next,/aria-current="page"/);
    assert.ok(next.includes(resultLink(id,trimmed)),'search stays active after following result');
  }
  const unfiltered=dossierMarkup(catalog,'en',null,esc);
  assert.ok(unfiltered.includes('href="/dossiers?id=abraham"'),'legacy direct link stays stable');
  assert.ok(!unfiltered.includes('href="/dossiers?id=abraham&amp;q='),'no empty phantom filter');
});

test('SA-EXT-05: authored research questions are searchable in all three interface languages',()=>{
  for(const [lang,query] of [
    ['uk','Які зміни імен'],
    ['ru','Какие изменения имён'],
    ['en','Which name changes'],
  ]){
    const results=searchScriptureDossiers(lang,query);
    assert.deepEqual(results.map(item=>item.id),['sarah'],lang+' question must find source-backed Sarah dossier');
    const html=dossierMarkup(catalog,lang,'sarah',esc,query);
    assert.ok(html.includes(resultLink('sarah',query)),'question match preserves the original GET filter');
    assert.match(html,/id="dossier-heading"/);
    assert.match(html,/aria-current="page"/);
    assert.ok(html.includes('href="/reader/GEN/17?verse=15"'),'real source passage remains navigable');
    assert.ok(!html.includes('href="/reader/EXO/3?verse=1"'),'unrelated evidence is not substituted');
  }
});

test('SA-EXT-05: a question-only filter cannot open unrelated source dossiers',()=>{
  const query='Which name changes';
  const mismatched=dossierMarkup(catalog,'en','moses',esc,query);
  assert.match(mismatched,/role="alert"/);
  assert.doesNotMatch(mismatched,/id="dossier-heading"/);
  assert.doesNotMatch(mismatched,/href="\/reader\//);
  assert.ok(mismatched.includes(resultLink('sarah',query)));
  assert.deepEqual(searchScriptureDossiers('en','which NAME changes').map(item=>item.id),['sarah']);
});
