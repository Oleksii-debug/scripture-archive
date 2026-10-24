import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { EDITIONS } from '../public/editions.js';
import { readerVerseHref, focusRequestedVerse } from '../public/reader-verse-links.js';

test('search reference links identify an exact book, chapter, and verse', () => {
  assert.equal(readerVerseHref('GEN', 1, 3), '/reader/GEN/1?verse=3');
  assert.equal(readerVerseHref('JHN', 3, 16), '/reader/JHN/3?verse=16');
  assert.equal(readerVerseHref('PSA', 150, 6), '/reader/PSA/150?verse=6');
  for (const args of [['GEN', 0, 1], ['GEN', 1, 0], ['gen', 1, 3], ['../../X', 1, 1], ['GEN', 1.5, 1], ['GEN', 1, Number.MAX_SAFE_INTEGER + 1]])
    assert.equal(readerVerseHref(...args), null, JSON.stringify(args));
});

test('exact verse search deep link focuses and scrolls only existing rendered verse', () => {
  const actions = [];
  const verse = { tabIndex: 0, focus(options) { actions.push(['focus', options]); }, scrollIntoView(options) { actions.push(['scroll', options]); } };
  const root = { querySelector(selector) { actions.push(['query', selector]); return selector === '.reading-pane .verses p.verse#v3' ? verse : null; } };
  assert.equal(focusRequestedVerse('?verse=3', root), true);
  assert.equal(verse.tabIndex, -1);
  assert.deepEqual(actions, [['query', '.reading-pane .verses p.verse#v3'], ['focus', { preventScroll: true }], ['scroll', { block: 'center' }]]);
  assert.equal(focusRequestedVerse('?verse=2', root), false);
});

test('invalid, duplicate, absent or overflow verse query cannot focus a target', () => {
  const visited = [];
  const root = { querySelector(selector) { visited.push(selector); return { focus() { throw Error('not expected'); }, scrollIntoView() {} }; } };
  for (const query of ['', '?chapter=3', '?verse=0', '?verse=-1', '?verse=01', '?verse=1.5', '?verse=1e3', '?verse=3%26x', '?verse=3&verse=4', '?verse=999999999999999999999999'])
    assert.equal(focusRequestedVerse(query, root), false, query);
  assert.deepEqual(visited, []);
});

test('reader search and router use verse-reference helpers', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.match(app, /readerVerseHref\(meta\.code, r\.chapter, r\.verse\)/);
  assert.match(app, /if \(name === "reader"\) focusRequestedVerse\(location\.search, main\)/);
});

test('licensed local editions match catalog metadata and copyrighted alternatives stay external', async () => {
  const catalog = JSON.parse(await readFile(new URL('../public/data/catalog.json', import.meta.url), 'utf8'));
  assert.deepEqual(Object.keys(EDITIONS).sort(), ['en', 'ru', 'uk']);
  for (const lang of ['uk', 'ru', 'en']) {
    const local = EDITIONS[lang].filter(x => x.local);
    const external = EDITIONS[lang].filter(x => !x.local);
    assert.ok(local.length >= 1);
    assert.ok(external.length >= 1);
    for (const edition of external) {
      assert.ok(edition.source, `${edition.id}: external source link missing`);
      assert.equal(edition.folder, undefined);
    }
    assert.equal(catalog.books[lang].length, 66);
    assert.equal(new Set(catalog.books[lang].map(x => x.code)).size, 66);
    assert.equal(catalog.editions[lang].license, 'Public Domain');
  }
  assert.equal(catalog.translations['uk-ohiienko'].license, 'CC BY-SA 4.0');
  assert.ok(catalog.translations['uk-ohiienko'].licenseUrl);
  assert.ok(catalog.translations['uk-ohiienko'].attribution);
  assert.equal(catalog.editionBooks['uk-ohiienko'].length, 66);
});

test('actual UK/RU/EN Genesis text keeps edition, chapter, and verse identity', async () => {
  const catalog = JSON.parse(await readFile(new URL('../public/data/catalog.json', import.meta.url), 'utf8'));
  for (const [folder, locale, editionId] of [['uk', 'uk', 'UKRPAN'], ['ru', 'ru', 'RUSSYN'], ['en', 'en', 'ENGWEBU'], ['uk-ohiienko', 'uk', 'uk-ohiienko']]) {
    const data = JSON.parse(await readFile(new URL(`../public/data/bible/${folder}/GEN.json`, import.meta.url), 'utf8'));
    assert.equal(data.bookCode, 'GEN');
    assert.equal(data.locale, locale);
    assert.equal(data.editionId, editionId);
    assert.equal(data.chapters.length, 50);
    assert.ok(data.chapters.every(ch => Array.isArray(ch) && ch.length > 0 && ch.every(v => typeof v === 'string' && v.trim().length > 0)));
    assert.ok(catalog.books[locale].find(b => b.code === 'GEN'));
    assert.ok(data.chapters[0][2].length > 0, `${folder}: Genesis 1:3 absent`);
    assert.equal(readerVerseHref(data.bookCode, 1, 3), '/reader/GEN/1?verse=3');
  }
  const modern = JSON.parse(await readFile(new URL('../public/data/bible/uk-ohiienko/JOL.json', import.meta.url), 'utf8'));
  const historical = JSON.parse(await readFile(new URL('../public/data/bible/uk/JOL.json', import.meta.url), 'utf8'));
  assert.equal(modern.chapters.length, 4);
  assert.equal(historical.chapters.length, 3);
  assert.equal(modern.chapters.reduce((n, ch) => n + ch.length, 0), historical.chapters.reduce((n, ch) => n + ch.length, 0));
});
