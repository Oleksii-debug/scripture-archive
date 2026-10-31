import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {searchScriptureDossiers, dossierMarkup, validateDossierGraph} from '../public/scripture-dossiers.js';

const catalog = JSON.parse(readFileSync(new URL('../public/data/catalog.json', import.meta.url), 'utf8'));
const ids = (lang, q) => searchScriptureDossiers(lang, q, catalog).map(item => item.id);
const esc = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[ch]));

test('source-backed dossier graph remains valid', () => {
  assert.equal(validateDossierGraph(catalog), true);
});

for (const lang of ['uk', 'ru', 'en']) {
  for (const [query, expected] of [
    ['GEN 17:15—19', ['abraham', 'sarah']],
    ['GEN 17:15 – 19', ['abraham', 'sarah']],
    ['GEN 17:15 — 19', ['abraham', 'sarah']],
    ['MAT 2:1 — 12', ['bethlehem', 'nativity']],
    ['EXO 3:1 – 12', ['moses']],
  ]) {
    test(`SA-EXT-05 ${lang}: pasted citation ${query} resolves existing evidence`, () => {
      const found = ids(lang, query);
      for (const id of expected) assert.ok(found.includes(id), `${id} in ${query}`);
    });
  }
  for (const query of [
    'GEN 17:19 — 15',
    'GEN 17:20 — 22',
    'ZZZ 17:15 – 19',
  ]) {
    test(`SA-EXT-05 ${lang}: unsupported or reversed ${query} remains empty`, () => {
      assert.deepEqual(ids(lang, query), []);
    });
  }
}

test('native dossier search GET retains pasted typography and keyboard-readable source link', () => {
  const query = 'GEN 17:15 — 19';
  const html = dossierMarkup(catalog, 'uk', 'sarah', esc, query);
  const href = '/dossiers?' + new URLSearchParams({id:'sarah', q:query}).toString().replaceAll('&', '&amp;');
  assert.ok(html.includes('href="' + href + '"'));
  assert.match(html, /href="\/reader\/GEN\/17\?verse=15"/);
  assert.match(html, /role="search"/);
  assert.match(html, /aria-current="page"/);
});

test('pasted range does not disclose unrelated dossier content under active search', () => {
  const html = dossierMarkup(catalog, 'en', 'moses', esc, 'GEN 17:15 — 19');
  assert.match(html, /role="alert"/);
  assert.doesNotMatch(html, /id="dossier-heading"/);
  assert.doesNotMatch(html, /href="\/reader\//);
});

test('malicious pasted HTML suffix is escaped and never treated as a citation', () => {
  const html = dossierMarkup(catalog, 'en', null, esc, 'GEN 17:15 — 19"><script>alert(1)</script>');
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&quot;&gt;&lt;script&gt;/);
  assert.doesNotMatch(html, /href="\/reader\//);
});

test('legacy exact single verse and ASCII/en-dash ranges remain supported', () => {
  for (const q of ['GEN 17:15', 'GEN 17:15-19', 'GEN 17:15–19']) {
    assert.ok(ids('en', q).includes('abraham'));
    assert.ok(ids('en', q).includes('sarah'));
  }
});
