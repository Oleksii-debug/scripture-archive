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
  assert.match(source,/dossierMarkup\(catalog,state\.lang,selectedId,esc,searchQuery,compareId\)/);
  assert.match(source,/dossierAtlasMarkup\(catalog,state\.lang,esc,searchQuery\)/);
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

test('SA-EXT-05: canonical source book and chapter names are searchable without new Bible text',()=>{
  for(const lang of ['uk','ru','en']){
    const genesis=catalog.books[lang].find(book=>book.code==='GEN');
    assert.ok(genesis && genesis.title,lang+' authoritative book label');
    for(const query of [genesis.title+' 12','GEN 12']){
      const ids=searchScriptureDossiers(lang,query,catalog).map(item=>item.id);
      assert.ok(ids.includes('abraham'),lang+' Abraham directly cites GEN 12');
      assert.ok(ids.includes('egypt'),lang+' Egypt directly cites GEN 12');
      const html=dossierMarkup(catalog,lang,'egypt',esc,query);
      assert.match(html,/id="dossier-heading"/);
      assert.match(html,/aria-current="page"/);
      assert.ok(html.includes(resultLink('egypt',query)),'source search retains GET filter');
      assert.ok(html.includes('href="/reader/GEN/12?verse=10"'),'existing real passage link stays intact');
    }
  }
});

test('SA-EXT-05: chapter matches are exact, not ambiguous numeric prefixes',()=>{
  const chapterOne=searchScriptureDossiers('en','GEN 1',catalog).map(item=>item.id);
  assert.ok(!chapterOne.includes('egypt'),'GEN 1 must not claim a GEN 12 dossier');
  assert.ok(!chapterOne.includes('abraham'),'GEN 1 must not claim a GEN 12/15 dossier');
  const html=dossierMarkup(catalog,'en','egypt',esc,'GEN 1');
  assert.ok(!html.includes('href="/reader/'),'unrelated Scripture passages stay hidden');
  assert.doesNotMatch(html,/id="dossier-heading"/);
  const legacy=searchScriptureDossiers('en','Moses');
  assert.equal(legacy[0]?.id,'moses','two-argument title search remains compatible');
  const bad=structuredClone(catalog); bad.books.en=null;
  assert.match(dossierMarkup(bad,'en',null,esc,'GEN 12'),/role="alert"/);
});


test('SA-EXT-05: verse-range lookup reuses validated source and relation citations',()=>{
  for(const lang of ['uk','ru','en']){
    const genesis=catalog.books[lang].find(book=>book.code==='GEN');
    assert.ok(genesis?.title);
    for(const query of ['GEN 17:15',genesis.title+' 17:15']){
      const ids=searchScriptureDossiers(lang,query,catalog).map(item=>item.id);
      assert.deepEqual(ids,['abraham','sarah'],lang+' source and published relation citation');
      const html=dossierMarkup(catalog,lang,'sarah',esc,query);
      assert.match(html,/id="dossier-heading"/);
      assert.ok(html.includes(resultLink('sarah',query)),'GET retains exact verse filter');
      assert.ok(html.includes('href="/reader/GEN/17?verse=15"'));
      assert.match(html,/aria-describedby="dossier-search-example"/,'keyboard/NVDA hint');
      const unrelated=dossierMarkup(catalog,lang,'moses',esc,query);
      assert.match(unrelated,/role="alert"/);
      assert.doesNotMatch(unrelated,/href="\/reader\//,'filtered mismatch hides other dossier evidence');
    }
  }
  assert.deepEqual(searchScriptureDossiers('en','1co 10:3',catalog).map(item=>item.id),['exodus','paul']);
});

test('SA-EXT-05: verse search is exact, bounded and does not shadow chapter search',()=>{
  for(const query of ['GEN 12:9','GEN 17:14','GEN 17:20','GEN 012:015','GEN 12:0','GEN 12:999']){
    assert.deepEqual(searchScriptureDossiers('en',query,catalog),[],query+' must not invent a cited witness');
  }
  const chapter=searchScriptureDossiers('en','GEN 12',catalog).map(item=>item.id);
  assert.ok(chapter.includes('abraham')&&chapter.includes('egypt'),'existing exact chapter search stays intact');
  assert.equal(searchScriptureDossiers('en','Moses')[0]?.id,'moses','existing title discovery stays intact');
  assert.deepEqual(searchScriptureDossiers('en','GEN 17:15'.repeat(20),catalog),[],'oversized input rejected');
});

test('SA-EXT-05: exact chapter discovery includes the same public relation citations as verse discovery',()=>{
  for(const lang of ['uk','ru','en']){
    const genesis=catalog.books[lang].find(book=>book.code==='GEN');
    assert.ok(genesis?.title);
    for(const query of ['GEN 17',genesis.title+' 17']){
      const ids=searchScriptureDossiers(lang,query,catalog).map(item=>item.id);
      assert.deepEqual(ids,['abraham','sarah'],lang+' must include the published Abraham-to-Sarah citation');
      const html=dossierMarkup(catalog,lang,'abraham',esc,query);
      assert.match(html,/id="dossier-heading"/);
      assert.ok(html.includes('href="/reader/GEN/17?verse=15"'),'relation witness retains canonical reader URL');
      assert.ok(html.includes(resultLink('abraham',query)),'GET link retains the exact source filter');
      const unrelated=dossierMarkup(catalog,lang,'moses',esc,query);
      assert.match(unrelated,/role="alert"/);
      assert.doesNotMatch(unrelated,/href="\/reader\//,'unrelated evidence must not leak');
    }
  }
  const exodus=searchScriptureDossiers('en','EXO 12',catalog).map(item=>item.id);
  assert.ok(exodus.includes('moses'),'Moses publicly cites Exodus 12 through its relation');
  assert.ok(exodus.includes('exodus'),'direct citation remains searchable');
  assert.ok(exodus.includes('egypt'),'other direct citation remains searchable');
});

test('SA-EXT-05: relation chapter witnesses must not match invented adjacent chapters',()=>{
  for(const query of ['GEN 1','GEN 16','GEN 170','EXO 1','EXO 120']){
    const ids=searchScriptureDossiers('en',query,catalog).map(item=>item.id);
    if(query.startsWith('GEN '))assert.ok(!ids.includes('abraham'),'no unrelated Abraham chapter '+query);
    if(query.startsWith('EXO '))assert.ok(!ids.includes('moses'),'no unrelated Moses relation chapter '+query);
  }
  assert.deepEqual(searchScriptureDossiers('en','GEN 17:14',catalog),[],'outside the published relation verse interval');
});

test('SA-EXT-05 exact Bible-book query finds direct and relational witnesses without chapter alias',()=>{
  for(const lang of ['uk','ru','en']){
    for(const code of ['GEN','LUK','ACT','RUT']){
      const title=catalog.books[lang].find(book=>book.code===code)?.title;
      assert.ok(title,lang+' '+code+' must be a real edition book');
      const expected=scriptureDossiers.filter(item=>item.sources.some(source=>source.book===code) ||
        item.related.some(edge=>edge.via.book===code)).map(item=>item.id);
      assert.ok(expected.length>0,code+' cited by actual dossiers');
      for(const query of [code.toLowerCase(),title]){
        const actual=searchScriptureDossiers(lang,query,catalog).map(item=>item.id);
        assert.deepEqual(actual,expected,lang+' '+query+' citation-backed book search');
        const html=dossierMarkup(catalog,lang,null,esc,query);
        assert.match(html,/<form action="\/dossiers" method="get" role="search">/);
        assert.ok(html.includes('name="q" type="search"'),lang+' same public search UI');
        for(const id of expected)assert.ok(html.includes('href="/dossiers?id='+id+'&amp;q='),
          lang+' '+id+' present through the real filtered route');
      }
      assert.deepEqual(searchScriptureDossiers(lang,code.toLowerCase()).map(item=>item.id),expected,
        lang+' standalone canonical code requires no second catalogue');
    }
    assert.deepEqual(searchScriptureDossiers(lang,'GEN1',catalog),[]);
    assert.deepEqual(searchScriptureDossiers(lang,'GEN 1',catalog),[]);
    assert.deepEqual(searchScriptureDossiers(lang,'GENX',catalog),[]);
  }
});
