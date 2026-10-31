import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dossierMarkup, searchScriptureDossiers, validateDossierGraph} from '../public/scripture-dossiers.js';

const catalog=JSON.parse(readFileSync(new URL('../public/data/catalog.json', import.meta.url),'utf8'));
const esc=value=>String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const ids=(lang,query)=>searchScriptureDossiers(lang,query,catalog).map(item=>item.id);

test('SA-EXT-05 range search uses the existing validated catalogue, not a second corpus',()=>{
  assert.equal(validateDossierGraph(catalog),true);
});

const cases=[
  ['GEN 17:15-19',['abraham','sarah']],
  ['EXO 3:1-12',['moses']],
  ['MAT 2:1-12',['bethlehem','nativity']],
  ['LUK 2:1-20',['nativity']]
];
for(const lang of ['uk','ru','en']){
  for(const [query,expected] of cases){
    test(`SA-EXT-05 ${lang}: a cited range ${query} finds published witnesses`,()=>{
      const result=ids(lang,query);
      for(const id of expected)assert.ok(result.includes(id),`${lang} ${query} must find ${id}`);
    });
  }
}

const spellings=[
  ['GEN 17:15–19',['abraham','sarah']],
  ['gen 17:15-19',['abraham','sarah']],
  ['MAT 2:1–12',['bethlehem','nativity']],
  ['LUK 2:1–20',['nativity']]
];
for(const lang of ['uk','ru','en']){
  for(const [query,expected] of spellings){
    test(`SA-EXT-05 ${lang}: localized query ${query} supports case and citation typography`,()=>{
      const result=ids(lang,query);
      for(const id of expected)assert.ok(result.includes(id),`${query} must find ${id}`);
    });
  }
}

const negative=[
  'GEN 17:19-15',
  'GEN 17:20-22',
  'GEN 17:998-999',
  'ZZZ 17:15-19'
];
for(const lang of ['uk','ru','en']){
  for(const query of negative){
    test(`SA-EXT-05 ${lang}: invalid or unrelated range ${query} returns no dossier`,()=>{
      assert.deepEqual(ids(lang,query),[]);
    });
  }
}

test('SA-EXT-05: a range match opens the canonical real reader and keeps GET query in result links',()=>{
  const query='GEN 17:15–19';
  const html=dossierMarkup(catalog,'uk','sarah',esc,query);
  assert.match(html,/role="search"/);
  assert.match(html,/id="dossier-heading"/);
  assert.match(html,/href="\/reader\/GEN\/17\?verse=15"/);
  const href='/dossiers?'+new URLSearchParams({id:'sarah',q:query}).toString().replaceAll('&','&amp;');
  assert.ok(html.includes('href="'+href+'"'), 'the existing GET route must preserve range and selection');
  assert.match(html,/aria-current="page"/);
});

test('SA-EXT-05: an explicitly unrelated dossier never leaks source citations under a range filter',()=>{
  const html=dossierMarkup(catalog,'en','moses',esc,'GEN 17:15-19');
  assert.match(html,/role="alert"/);
  assert.doesNotMatch(html,/id="dossier-heading"/);
  assert.doesNotMatch(html,/href="\/reader\//);
});

test('SA-EXT-05: malicious range suffix is escaped and does not become script or an alternate source',()=>{
  const html=dossierMarkup(catalog,'en',null,esc,'GEN 17:15-19"><script>alert(1)</script>');
  assert.doesNotMatch(html,/<script>/);
  assert.match(html,/&quot;&gt;&lt;script&gt;/);
  assert.doesNotMatch(html,/href="\/reader\//);
});

test('SA-EXT-05: invalid catalogue and oversize input still fail closed',()=>{
  assert.deepEqual(ids('en','A'.repeat(121)),[]);
  const broken=structuredClone(catalog);
  broken.books.en[0].chapters=0;
  const html=dossierMarkup(broken,'en',null,esc,'GEN 17:15-19');
  assert.match(html,/role="alert"/);
  assert.doesNotMatch(html,/href="\/reader\//);
});

test('SA-EXT-05: legacy single-verse lookup is unchanged',()=>{
  assert.ok(ids('en','GEN 17:15').includes('sarah'));
  assert.ok(ids('en','GEN 17:15').includes('abraham'));
});
