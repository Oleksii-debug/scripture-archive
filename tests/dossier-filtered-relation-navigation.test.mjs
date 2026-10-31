import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dossierMarkup, searchScriptureDossiers, validateDossierGraph} from '../public/scripture-dossiers.js';

const catalog = JSON.parse(readFileSync(new URL('../public/data/catalog.json', import.meta.url), 'utf8'));
const esc = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[ch]));
const relationLinks = html => {
  const list = html.match(/<h3>[^<]*<\/h3><ul>([\s\S]*?)<\/ul>/u)?.[1];
  assert.ok(list, 'source-backed relation list is present in canonical rendered dossier');
  return Array.from(list.matchAll(/href="(\/dossiers\?id=[^"]+)"/gu), m => m[1]);
};

test('SA-EXT-05: real published dossier sources still validate', () => {
  assert.equal(validateDossierGraph(catalog), true);
});

for (const lang of ['uk','ru','en']) {
  for (const query of ['GEN 17:15', 'GEN 17:15 — 19']) {
    test(`SA-EXT-05 ${lang}: matching relation preserves filtered GET query ${query}`, () => {
      const matched = searchScriptureDossiers(lang, query, catalog).map(item=>item.id);
      assert.ok(matched.includes('abraham'));
      assert.ok(matched.includes('sarah'));
      const html = dossierMarkup(catalog, lang, 'abraham', esc, query);
      const links = relationLinks(html);
      const expected = '/dossiers?' + new URLSearchParams({id:'sarah',q:query}).toString().replaceAll('&','&amp;');
      assert.ok(links.includes(expected), `relation must retain filter: ${expected}`);
      const other = dossierMarkup(catalog, lang, 'sarah', esc, query);
      assert.match(other, /id="dossier-heading"/);
      assert.match(other, /href="\/reader\/GEN\/17\?verse=15"/);
    });
  }
  test(`SA-EXT-05 ${lang}: relation outside current filter remains reachable`, () => {
    const query = 'GEN 12:1';
    const found = searchScriptureDossiers(lang, query, catalog).map(item=>item.id);
    assert.ok(found.includes('abraham'));
    assert.ok(!found.includes('sarah'));
    const html = dossierMarkup(catalog, lang, 'abraham', esc, query);
    const links = relationLinks(html);
    assert.ok(links.includes('/dossiers?id=sarah'));
    assert.ok(!links.some(href => href.includes('q=')));
    assert.match(dossierMarkup(catalog,lang,'sarah',esc,''), /id="dossier-heading"/);
  });
  test(`SA-EXT-05 ${lang}: unfiltered legacy relation remains the original deep link`, () => {
    const html = dossierMarkup(catalog, lang, 'abraham', esc);
    assert.ok(relationLinks(html).includes('/dossiers?id=sarah'));
  });
}

test('SA-EXT-05: unrelated selected dossier under active filter still fails closed', () => {
  const html = dossierMarkup(catalog, 'uk', 'sarah', esc, 'GEN 12:1');
  assert.match(html, /role="alert"/);
  assert.doesNotMatch(html, /id="dossier-heading"/);
  assert.doesNotMatch(html, /href="\/reader\//);
});

test('SA-EXT-05: only canonical published dossier links are used', () => {
  const html = dossierMarkup(catalog, 'en', 'abraham', esc, 'GEN 17:15');
  const links = relationLinks(html);
  assert.deepEqual(links, ['/dossiers?id=sarah&amp;q=GEN+17%3A15']);
  assert.doesNotMatch(html, /javascript:/i);
});
