import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dossierAtlasMarkup, searchScriptureDossiers, validateDossierGraph} from '../public/scripture-dossiers.js';

const catalog = JSON.parse(readFileSync(new URL('../public/data/catalog.json', import.meta.url), 'utf8'));
const esc = value => String(value).replace(/[&<>"']/g, char => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
}[char]));

const relationOnly = [
  {query:'EXO 1:6', source:'joseph', target:'exodus', passage:'/reader/EXO/1?verse=6'},
  {query:'ACT 2:14', source:'peter', target:'jerusalem', passage:'/reader/ACT/2?verse=14'},
  {query:'RUT 1:19', source:'ruth', target:'bethlehem', passage:'/reader/RUT/1?verse=19'},
];

test('canonical catalogue remains valid for filtered relation-witness acceptance', () => {
  assert.equal(validateDossierGraph(catalog), true);
});

for (const lang of ['uk','ru','en']) {
  for (const {query,source,target,passage} of relationOnly) {
    test(`filtered ${lang} ${query}: show relation-only witness and navigable target`, () => {
      const matches = searchScriptureDossiers(lang, query, catalog).map(item => item.id);
      assert.deepEqual(matches, [source], 'search matches source solely, not the related target');
      const html = dossierAtlasMarkup(catalog, lang, esc, query);
      const filteredSource = '/dossiers?' + new URLSearchParams({id:source,q:query}).toString();
      assert.ok(html.includes('href="' + esc(filteredSource) + '"'), 'source keeps active GET filter');
      assert.ok(html.includes('id="dossier-atlas-relations-heading"'), 'relation witnesses are not hidden');
      assert.ok(html.includes('href="' + passage + '"'), 'real relation citation remains readable');
      assert.ok(html.includes('href="/dossiers?id=' + target + '"'), 'nonmatching target stays navigable');
      const invalidTarget = '/dossiers?' + new URLSearchParams({id:target,q:query}).toString();
      assert.ok(!html.includes('href="' + esc(invalidTarget) + '"'), 'target must not inherit a rejecting filter');
      assert.ok(!html.includes('onclick='), 'native accessible links, no script click handlers');
    });
  }
}

test('no-match and invalid catalogue remain fail-closed without witness links', () => {
  for (const lang of ['uk','ru','en']) {
    const empty = dossierAtlasMarkup(catalog, lang, esc, 'unmatched-relation-citation-999');
    assert.match(empty, /role="status"/);
    assert.ok(!empty.includes('href="/reader/'));
    assert.ok(!empty.includes('href="/dossiers?'));
    const bad = structuredClone(catalog);
    bad.books[lang][0].chapters = 0;
    const denied = dossierAtlasMarkup(bad, lang, esc, 'EXO 1:6');
    assert.match(denied, /role="alert"/);
    assert.ok(!denied.includes('href="/reader/'));
    assert.ok(!denied.includes('href="/dossiers?'));
  }
});

test('unfiltered atlas retains approved native relation links and chapter citations', () => {
  for (const lang of ['uk','ru','en']) {
    const html = dossierAtlasMarkup(catalog, lang, esc);
    assert.ok(html.includes('id="dossier-atlas-relations-heading"'));
    assert.ok(html.includes('href="/dossiers?id=exodus"'));
    assert.ok(html.includes('href="/reader/EXO/1?verse=6"'));
    assert.equal((html.match(/<table>/g) || []).length, 2);
  }
});
