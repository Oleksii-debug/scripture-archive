import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  validateDossierGraph, dossierMarkup, dossierAtlasMarkup, searchScriptureDossiers,
} from '../public/scripture-dossiers.js';

const canonical = JSON.parse(readFileSync(new URL('../public/data/catalog.json', import.meta.url), 'utf8'));
const esc = value => String(value).replace(/[&<>"']/g, character =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));

test('SA-EXT-05/06: accessor-backed Bible catalogue provenance fails closed without invoking getters', () => {
  assert.equal(validateDossierGraph(canonical), true);
  const cases = [
    ['root books', (catalog, getter) => Object.defineProperty(catalog, 'books', {
      configurable:true, enumerable:true, get: () => getter(canonical.books),
    })],
    ['language inventory', (catalog, getter) => Object.defineProperty(catalog.books, 'en', {
      configurable:true, enumerable:true, get: () => getter(canonical.books.en),
    })],
    ['array book index', (catalog, getter) => Object.defineProperty(catalog.books.en, '0', {
      configurable:true, enumerable:true, get: () => getter(canonical.books.en[0]),
    })],
    ...['code','title','chapters'].map(field => [
      'book '+field, (catalog, getter) => Object.defineProperty(catalog.books.en[0], field, {
        configurable:true, enumerable:true, get: () => getter(canonical.books.en[0][field]),
      }),
    ]),
  ];
  for (const [label, inject] of cases) {
    const hostile = structuredClone(canonical);
    let calls = 0;
    inject(hostile, value => { calls++; return value; });
    assert.doesNotThrow(() => validateDossierGraph(hostile), label);
    assert.equal(validateDossierGraph(hostile), false, label);
    for (const lang of ['uk','ru','en']) {
      for (const html of [
        dossierMarkup(hostile,lang,'abraham',esc),
        dossierAtlasMarkup(hostile,lang,esc),
      ]) {
        assert.match(html, /role="alert"/, label+' '+lang);
        assert.doesNotMatch(html, /href="\/reader\//, label+' '+lang);
        assert.doesNotMatch(html, /href="\/dossiers\?/, label+' '+lang);
      }
    }
    assert.deepEqual(searchScriptureDossiers('en','FORGED GETTER TITLE',hostile), [], label);
    assert.equal(calls, 0, label+' must not execute a publisher-controlled getter');
  }
});

test('SA-EXT-05/06: own data and null-prototype catalogue still expose legitimate reader links and search', () => {
  const own = Object.assign(Object.create(null), {
    books: Object.assign(Object.create(null), canonical.books),
  });
  assert.equal(validateDossierGraph(own), true);
  const title = canonical.books.en.find(book => book.code === 'GEN').title;
  assert.ok(searchScriptureDossiers('en',title,own).some(item => item.id === 'abraham'));
  assert.match(dossierMarkup(own,'en','abraham',esc), /href="\/reader\/GEN\/12\?verse=1"/);
  assert.match(dossierAtlasMarkup(own,'en',esc), /href="\/reader\/GEN\//);
});
