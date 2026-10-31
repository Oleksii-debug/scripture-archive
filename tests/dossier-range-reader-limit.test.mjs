import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dossierMarkup,searchScriptureDossiers,validateDossierGraph} from '../public/scripture-dossiers.js';

const catalog = JSON.parse(readFileSync(new URL('../public/data/catalog.json', import.meta.url), 'utf8'));
const esc = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const ids = (lang, q) => searchScriptureDossiers(lang, q, catalog).map(record => record.id);

test('canonical shipped book catalogue and dossier source graph remain valid', () => {
  assert.equal(validateDossierGraph(catalog), true);
});

// These ranges overlap published Scripture citations but exceed the
// primary reader's 256-verse safety cap. Previously they returned dossiers
// even though the requested Bible range could not be opened as a whole.
const invalidRanges = [
  'GEN 12:1-257',
  'GEN 12:1–257',
  'GEN 12:1—257',
  'GEN 12:1 - 999',
  'GEN 12:1 – 999',
  'GEN 12:1 — 999',
  'gen 17:15-257',
  'GEN 17:15–999',
  'GEN 17:15-999',
  'MAT 2:1-257',
  'EXO 3:1-257',
  'LUK 2:1-257',
];

for (const lang of ['uk', 'ru', 'en']) {
  for (const q of invalidRanges) {
    test(`SA-EXT-05 ${lang}: reject unsupported reader range ${q}`, () => {
      assert.deepEqual(ids(lang, q), [], 'no invalid source range may be presented as found');
    });
  }
  for (const [q, expected] of [
    ['GEN 17:15-19', ['abraham', 'sarah']],
    ['GEN 17:15 — 256', ['abraham', 'sarah']],
    ['EXO 3:1-12', ['moses']],
    ['GEN 12:1-256', ['abraham', 'egypt']],
  ]) {
    test(`SA-EXT-05 ${lang}: supported published range ${q} stays searchable`, () => {
      const actual = ids(lang, q);
      for (const id of expected) assert.ok(actual.includes(id), id + ' must remain discoverable');
    });
  }
}

test('invalid pasted range cannot open an unrelated dossier reader passage in GET UI', () => {
  for (const lang of ['uk','ru','en']) {
    const html = dossierMarkup(catalog, lang, 'abraham', esc, 'GEN 12:1-257');
    assert.match(html, /role="alert"/);
    assert.doesNotMatch(html, /href="\\/reader\\//);
    assert.doesNotMatch(html, /id="dossier-heading"/);
  }
});

test('legal citation still opens existing canonical reader link', () => {
  const html = dossierMarkup(catalog, 'uk', 'abraham', esc, 'GEN 12:1-256');
  assert.match(html, /href="\\/reader\\/GEN\\/12\\?verse=1"/);
  assert.match(html, /id="dossier-heading"/);
});
