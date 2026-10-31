import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { dossierAtlasMarkup, dossierMarkup, scriptureDossiers, validateDossierGraph } from '../public/scripture-dossiers.js';

const catalog=JSON.parse(readFileSync(new URL('../public/data/catalog.json',import.meta.url),'utf8'));
const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');

test('the source-linked dossier graph validates against the canonical 3-language edition catalog',()=>{
  assert.equal(validateDossierGraph(catalog),true);
  assert.ok(scriptureDossiers.length>=9);
  const ids=scriptureDossiers.map(d=>d.id);
  assert.equal(new Set(ids).size,ids.length,'stable unique dossier IDs');
  assert.ok(scriptureDossiers.some(x=>x.type==='person'));
  assert.ok(scriptureDossiers.some(x=>x.type==='place'));
  assert.ok(scriptureDossiers.some(x=>x.type==='event'));
  assert.ok(scriptureDossiers.every(d=>d.sources.length>=3));
  assert.ok(scriptureDossiers.every(d=>d.related.length>=1));
  assert.ok(scriptureDossiers.every(d=>d.prompts.uk.length>=2&&d.prompts.ru.length>=2&&d.prompts.en.length>=2));
  const allSources=scriptureDossiers.flatMap(d=>[...d.sources,...d.related.map(r=>r.via)]);
  assert.ok(allSources.some(r=>r.kind==='interpretive'),'thematic parallels are explicitly differentiated');
  assert.ok(allSources.some(r=>r.kind==='narrative'),'biblical narrative sources are explicitly differentiated');
  assert.ok(allSources.some(r=>catalog.books.en.find(b=>b.code===r.book)?.testament==='NT'));
  assert.ok(allSources.some(r=>catalog.books.en.find(b=>b.code===r.book)?.testament==='OT'));
});

test('every cited verse range exists in all four bundled editions',()=>{
  for(const dossier of scriptureDossiers){
    for(const ref of [...dossier.sources,...dossier.related.map(link=>link.via)]){
      for(const edition of ['uk','ru','en','uk-ohiienko']){
        const book=JSON.parse(readFileSync(new URL(`../public/data/bible/${edition}/${ref.book}.json`,import.meta.url),'utf8'));
        const verses=book.chapters[ref.chapter-1];
        assert.ok(Array.isArray(verses) && ref.first>=1 && ref.last<=verses.length,
          `${dossier.id}: ${edition} ${ref.book} ${ref.chapter}:${ref.first}-${ref.last}`);
      }
    }
  }
});

test('each dossier is reachable via real internal navigation, has labeled evidence and source links',()=>{
  for(const language of ['uk','ru','en']){
    for(const item of scriptureDossiers){
      const markup=dossierMarkup(catalog,language,item.id,esc);
      assert.ok(markup.includes(esc(item.names[language])),item.id);
      assert.ok(markup.includes('aria-current="page"'),item.id);
      assert.ok(markup.includes('aria-labelledby="dossier-heading"'),item.id);
      assert.ok(markup.includes('tabindex="-1"'),item.id);
      assert.ok(markup.includes('href="/dossiers?id='+item.id+'" aria-current="page"'),item.id);
      assert.ok(markup.includes('<ol>'),item.id);
      assert.ok(markup.includes('href="/reader/'),item.id);
      assert.ok(markup.includes(esc(item.prompts[language][0])),item.id);
      for(const reference of item.sources){
        assert.ok(markup.includes('href="/reader/'+reference.book+'/'+reference.chapter+'?verse='+reference.first+'"'),item.id);
      }
      for(const relation of item.related){
        assert.ok(markup.includes('href="/dossiers?id='+relation.to+'"'),item.id);
        assert.ok(markup.includes('href="/reader/'+relation.via.book+'/'+relation.via.chapter+'?verse='+relation.via.first+'"'),item.id);
      }
      assert.ok(!markup.includes('href="http://'),'references never leave canonical reader');
      assert.doesNotMatch(markup,/href="\/reader\/[^"?]+"/,'every cited dossier source must deep-link to its first verse');
      assert.ok(!markup.includes('<iframe'));
      assert.ok(!markup.includes('onclick='));
    }
  }
});

test('every navigable dossier reference opens the canonical reader at the cited first verse',()=>{
  const abraham=dossierMarkup(catalog,'uk','abraham',esc);
  assert.match(abraham,/href="\/reader\/GEN\/12\?verse=1"/);
  assert.match(abraham,/href="\/reader\/GEN\/15\?verse=1"/);
  assert.match(abraham,/href="\/reader\/ROM\/4\?verse=1"/);
  assert.match(abraham,/href="\/reader\/GEN\/17\?verse=15"/);
  const result=dossierMarkup(catalog,'en','jerusalem',esc);
  assert.match(result,/href="\/reader\/LUK\/19\?verse=41"/);
  assert.doesNotMatch(abraham,/href="\/reader\/GEN\/12"/);
});

test('the existing Abraham mission remains linked without making other dossiers fake missions',()=>{
  const abraham=dossierMarkup(catalog,'uk','abraham',esc);
  const moses=dossierMarkup(catalog,'uk','moses',esc);
  assert.match(abraham,/href="\/mission\/abraham"/);
  assert.doesNotMatch(moses,/href="\/mission\/abraham"/);
});

test('the dossier catalogue fails closed when edition provenance/metadata cannot be resolved',()=>{
  const broken=structuredClone(catalog);
  broken.books.en=broken.books.en.filter(b=>b.code!=='GEN');
  assert.equal(validateDossierGraph(broken),false);
  const markup=dossierMarkup(broken,'en','abraham',esc);
  assert.match(markup,/role="alert"/);
  assert.doesNotMatch(markup,/href="\/reader\//);
  assert.doesNotMatch(markup,/href="\/dossiers\?/);
  assert.equal(validateDossierGraph(null),false);
  for(const corrupt of [
    bad=>{bad.books.en='unexpected string';},
    bad=>{bad.books.ru={};},
    bad=>{bad.books.uk[0].chapters=0;},
    bad=>{bad.books.uk[0].title='';},
    bad=>{bad.books.en.push({...bad.books.en[0]});},
  ]){
    const damaged=structuredClone(catalog);
    corrupt(damaged);
    assert.equal(validateDossierGraph(damaged),false,'malformed/ambiguous edition catalogue must fail closed');
    const safeMarkup=dossierMarkup(damaged,'uk','abraham',esc);
    assert.match(safeMarkup,/role="alert"/);
    assert.equal(safeMarkup.includes('href="/reader/'),false);
    assert.equal(safeMarkup.includes('href="/dossiers?'),false);
  }

  const weird=dossierMarkup(catalog,'en','"><script>alert(1)</script>',esc);
  assert.doesNotMatch(weird,/<script>/);
  assert.match(weird,/role="alert"/);
  assert.ok(!weird.includes('id="dossier-heading"'),
    'unknown dossier must not impersonate any valid dossier article');
  assert.ok(!weird.includes('href="/reader/'),
    'unknown dossier must not borrow a valid person\'s cited passage');
  assert.ok(weird.includes('href="/dossiers?id=abraham"'),'allow recovery through the real catalogue');
});

test('the public dossier workspace uses the shared catalog and actual source-graph module',()=>{
  const source=readFileSync(new URL('../public/workspace.js',import.meta.url),'utf8');
  assert.match(source,/import\s*\{[^}]*\bdossierMarkup\b[^}]*\}\s*from\s*['"]\.\/scripture-dossiers\.js['"]/);
  assert.match(source,/if\(name==='dossiers'\)/);
  assert.match(source,/const catalog=await c\.getCatalog\(\)/);
  assert.match(source,/dossierMarkup\(catalog,state\.lang,selectedId,esc,searchQuery,compareId\)/);
  assert.match(source,/get\('q'\)/,'the real dossier route passes native GET search queries');
});

test('new Joseph, Bethlehem and birth dossiers are independently navigable with traced links',()=>{
  const expected={
    joseph:['GEN/37?verse=3','GEN/45?verse=1','GEN/50?verse=19','EXO/1?verse=6'],
    bethlehem:['MIC/5?verse=2','MAT/2?verse=1','LUK/2?verse=1'],
    nativity:['MAT/1?verse=18','LUK/2?verse=1','MAT/2?verse=1'],
  };
  for(const lang of ['uk','ru','en']){
    for(const [id,links] of Object.entries(expected)){
      const item=scriptureDossiers.find(x=>x.id===id);
      assert.ok(item,'dossier remains in canonical graph: '+id);
      const markup=dossierMarkup(catalog,lang,id,esc);
      assert.match(markup,/aria-current="page"/);
      assert.ok(markup.includes(esc(item.names[lang])));
      for(const link of links)assert.ok(markup.includes('href="/reader/'+link+'"'),lang+' '+id+' '+link);
      assert.ok(!markup.includes('href="/mission/abraham"'),'unwritten missions cannot be presented as real');
    }
  }
});

test('Ruth, Paul, Mary and Peter have localized source-linked dossiers in the real catalogue',()=>{
  const expected={
    ruth:['RUT/1?verse=1','RUT/1?verse=16','RUT/4?verse=13','RUT/1?verse=19'],
    paul:['ACT/9?verse=1','ACT/22?verse=6','GAL/1?verse=11','1CO/10?verse=1'],
    'mary-mother':['LUK/1?verse=26','LUK/2?verse=1','ACT/1?verse=12'],
    peter:['MAT/16?verse=13','LUK/22?verse=54','ACT/2?verse=14'],
  };
  for(const lang of ['uk','ru','en']){
    for(const [id,links] of Object.entries(expected)){
      const item=scriptureDossiers.find(node=>node.id===id);
      assert.ok(item,'distinct stable ID for '+id);
      assert.equal(item.type,'person');
      assert.ok(item.summaries[lang]?.length>30,lang+' '+id);
      assert.equal(item.prompts[lang]?.length,2,lang+' '+id);
      const markup=dossierMarkup(catalog,lang,id,esc);
      assert.ok(markup.includes(esc(item.names[lang])),lang+' '+id);
      assert.match(markup,/aria-current="page"/);
      assert.match(markup,/aria-labelledby="dossier-heading"/);
      for(const link of links)
        assert.ok(markup.includes('href="/reader/'+link+'"'),lang+' '+id+' '+link);
      assert.doesNotMatch(markup,/<iframe|onclick=/);
    }
  }
  assert.notEqual(scriptureDossiers.find(node=>node.id==='mary-mother')?.id, 'mary-magdalene',
    'Mary the mother is not silently identified as a different person');
});


test('unknown explicit dossier deep links fail visibly in all locales without fabricated source details',()=>{
  for(const lang of ['uk','ru','en']){
    const markup=dossierMarkup(catalog,lang,'no-such-dossier',esc);
    assert.match(markup,/role="alert"/);
    assert.ok(markup.includes('href="/dossiers?id=abraham"'),
      'the accessible topic catalogue remains available for recovery');
    assert.ok(!markup.includes('href="/reader/'),
      'invalid dossier cannot borrow Abraham or anyone else\'s Scripture references');
    assert.ok(!markup.includes('aria-current="page"'));
    assert.ok(!markup.includes('href="/mission/abraham"'));
  }
  assert.match(dossierMarkup(catalog,'en','no-such-dossier',esc),/not found/);
  assert.match(dossierMarkup(catalog,'uk',null,esc),/Авраам/,
    'a missing selection still opens the established default introduction');
});

test('explicit empty dossier query is invalid; only an absent query opens the default introduction',()=>{
  assert.equal(new URLSearchParams('?id=').get('id'),'');
  assert.equal(new URLSearchParams('').get('id'),null);
  for(const lang of ['uk','ru','en']){
    const unknown=dossierMarkup(catalog,lang,'',esc);
    assert.match(unknown,/role="alert"/,'empty explicit ID must show a localized error');
    assert.ok(unknown.includes('href="/dossiers?id=abraham"'),'keep genuine keyboard navigation for recovery');
    assert.doesNotMatch(unknown,/id="dossier-heading"/,'must not attribute Abraham dossier to the empty ID');
    assert.ok(!unknown.includes('href="/reader/'),'must not borrow citations from any dossier');
    assert.doesNotMatch(unknown,/aria-current="page"/,'invalid selection cannot be current');
    assert.ok(!unknown.includes('href="/mission/abraham"'),'unknown ID cannot launch Abraham mission');
    const introduction=dossierMarkup(catalog,lang,null,esc);
    assert.match(introduction,/id="dossier-heading"/,'missing query still selects default introduction');
  }
  assert.match(dossierMarkup(catalog,'en',undefined,esc),/id="dossier-heading"/);
});

test('unsafe canonical book codes fail closed before dossier or atlas link rendering',()=>{
  // These characters can break an unescaped href or change its route. All
  // three source editions must reject them even if a damaged catalogue agrees.
  const hostileCodes=[
    'GEN" onfocus="alert(1)',
    'GEN/../ROM',
    'GEN?src=1',
    'GEN&extra=1',
    'GEN X',
    'GEN\nX',
  ];
  const record=scriptureDossiers[0].sources[0];
  const previous=record.book;
  try {
    for(const code of hostileCodes){
      const damaged=structuredClone(catalog);
      for(const lang of ['uk','ru','en']){
        damaged.books[lang].push({...damaged.books[lang][0],code,title:'Untrusted book'});
      }
      assert.equal(validateDossierGraph(damaged),false,
        'invalid edition catalog code must not become a reader href');
      record.book=code;
      assert.equal(validateDossierGraph(damaged),false,
        'invalid dossier evidence code must not become a reader href');
      for(const lang of ['uk','ru','en']){
        for(const markup of [
          dossierMarkup(damaged,lang,'abraham',esc),
          dossierAtlasMarkup(damaged,lang,esc),
        ]){
          assert.match(markup,/role="alert"/,lang+' '+code);
          assert.equal(markup.includes('href="/reader/'),false,lang+' '+code);
          assert.doesNotMatch(markup,/onfocus=|onclick=|onerror=/,
            'never publish attacker-controlled HTML attributes');
        }
      }
      record.book=previous;
    }
  } finally {
    record.book=previous;
  }
  assert.equal(validateDossierGraph(catalog),true,
    'the real canonical 66-book catalog must still validate');
});
