import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dossierAtlasMarkup, dossierMarkup, validateDossierGraph } from '../public/scripture-dossiers.js';

const catalog = JSON.parse(readFileSync(new URL('../public/data/catalog.json', import.meta.url), 'utf8'));
const esc = value => String(value).replace(/[&<>"']/g, ch => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[ch]));

test('SA-EXT-06: empty filtered atlas retains its own accessible heading and a clear-search recovery link', () => {
  assert.equal(validateDossierGraph(catalog), true);
  for (const [lang, title, clear] of [
    ['uk', 'Біблійний атлас: текстова лабораторія', 'Очистити пошук'],
    ['ru', 'Библейский атлас: текстовая лаборатория', 'Очистить поиск'],
    ['en', 'Scripture atlas: text-first research', 'Clear search'],
  ]) {
    const html = dossierAtlasMarkup(catalog, lang, esc, 'zqxnonexistent');
    assert.match(html, /<section class="card dossier-atlas" aria-labelledby="dossier-atlas-heading">/);
    assert.ok(html.includes('<h2 id="dossier-atlas-heading">' + title + '</h2>'),
      lang + ': empty result must not mislabel the atlas as the dossier catalogue');
    assert.ok(html.includes('<a href="/dossiers">' + clear + '</a>'),
      lang + ': keyboard and screen-reader users can clear the GET filter');
    assert.match(html, /role="status"/);
    assert.doesNotMatch(html, /href="\/reader\//, 'no unrelated Scripture links for an empty filter');
    assert.doesNotMatch(html, /href="\/dossiers\?id=/, 'no unrelated dossier result links');
    const main = dossierMarkup(catalog, lang, null, esc, 'zqxnonexistent');
    assert.match(main, /role="alert"/, 'canonical dossier no-match behavior is unchanged');
  }
});

test('SA-EXT-06: valid, blank and malformed atlas filters preserve source admission', () => {
  for (const lang of ['uk', 'ru', 'en']) {
    const matched = dossierAtlasMarkup(catalog, lang, esc, 'GEN 12');
    assert.match(matched, /href="\/reader\/GEN\/12\?verse=/);
    assert.doesNotMatch(matched, /href="\/dossiers">/, 'clear control is only for empty results');
    const unfiltered = dossierAtlasMarkup(catalog, lang, esc);
    assert.match(unfiltered, /href="\/reader\//);
    const badQuery = dossierAtlasMarkup(catalog, lang, esc, '\u202e');
    assert.match(badQuery, /role="alert"/);
    assert.doesNotMatch(badQuery, /href="\/reader\//);
    const invalid = structuredClone(catalog);
    invalid.books[lang][0].chapters = 0;
    const badSource = dossierAtlasMarkup(invalid, lang, esc, 'zqxnonexistent');
    assert.match(badSource, /role="alert"/);
    assert.doesNotMatch(badSource, /href="\/dossiers"/,
      'a damaged source catalogue cannot masquerade as a valid empty search');
  }
});
