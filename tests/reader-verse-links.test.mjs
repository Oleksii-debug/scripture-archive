import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { EDITIONS } from '../public/editions.js';
import { readerVerseHref, focusRequestedVerse, readerChapterNumber } from '../public/reader-verse-links.js';

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

test('Bible corpus build manifest pins the current catalog bytes', async () => {
  const bytes = await readFile(new URL('../public/data/catalog.json', import.meta.url));
  const manifest = JSON.parse(await readFile(new URL('../public/data/bible-build-manifest.json', import.meta.url), 'utf8'));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), manifest.catalogSha256);
  assert.equal(manifest.commonCanonBooks, 66);
  assert.deepEqual([...manifest.locales].sort(), ['en', 'ru', 'uk']);
  assert.equal(manifest.bookFiles, manifest.commonCanonBooks * manifest.locales.length);
});


test('all 264 bundled local book files preserve edition-specific catalog coordinates', async () => {
  const catalog = JSON.parse(await readFile(new URL('../public/data/catalog.json', import.meta.url), 'utf8'));
  const groups = [
    { folder: 'uk', locale: 'uk', uiId: 'uk-kulish', editionId: catalog.editions.uk.id, books: catalog.books.uk },
    { folder: 'ru', locale: 'ru', uiId: 'ru-synodal', editionId: catalog.editions.ru.id, books: catalog.books.ru },
    { folder: 'en', locale: 'en', uiId: 'en-web', editionId: catalog.editions.en.id, books: catalog.books.en },
    { folder: 'uk-ohiienko', locale: 'uk', uiId: 'uk-ohiienko', editionId: 'uk-ohiienko', books: catalog.editionBooks['uk-ohiienko'] },
  ];
  let checkedBooks = 0;
  for (const { folder, locale, uiId, editionId, books } of groups) {
    const option = EDITIONS[locale].find(candidate => candidate.id === uiId);
    assert.ok(option?.local, `${uiId}: source must be a bundled local edition`);
    assert.equal(option.folder || locale, folder, `${uiId}: UI source-folder mismatch`);
    assert.equal(books.length, 66, `${folder}: incomplete catalog`);
    assert.equal(new Set(books.map(book => book.code)).size, books.length, `${folder}: duplicate book codes`);
    for (const meta of books) {
      const path = new URL(`../public/data/bible/${folder}/${meta.code}.json`, import.meta.url);
      const book = JSON.parse(await readFile(path, 'utf8'));
      const label = `${folder}/${meta.code}`;
      assert.equal(book.bookCode, meta.code, `${label}: wrong book`);
      assert.equal(book.locale, locale, `${label}: wrong language`);
      assert.equal(book.editionId, editionId, `${label}: wrong edition`);
      assert.equal(book.testament, meta.testament, `${label}: wrong testament`);
      assert.equal(book.chapters.length, meta.chapters, `${label}: wrong chapter count`);
      book.chapters.forEach((verses, chapterIndex) => {
        assert.ok(Array.isArray(verses) && verses.length > 0, `${label} chapter ${chapterIndex + 1}: missing verses`);
        verses.forEach((verse, verseIndex) => {
          assert.ok(typeof verse === 'string' && verse.trim().length > 0,
            `${label} ${chapterIndex + 1}:${verseIndex + 1}: empty verse`);
        });
      });
      checkedBooks += 1;
    }
  }
  assert.equal(checkedBooks, 264);
});


test('reader chapter routing never indexes a fractional or malformed Bible chapter', () => {
  for (const max of [3, 4, 21, 50, 150]) {
    assert.equal(readerChapterNumber('1', max), 1);
    assert.equal(readerChapterNumber(String(max), max), max);
    assert.equal(readerChapterNumber(max, max), max);
    assert.equal(readerChapterNumber(max + 1, max), max);
  }
  for (const value of ['1.5', '0.5', 'NaN', 'Infinity', '-1', '1e2', '0x10', '01', '', Number.POSITIVE_INFINITY, Number.NaN, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(readerChapterNumber(value, 21), 1, String(value));
  }
  assert.equal(readerChapterNumber('4', 4), 4, 'Ohiienko Joel has four chapters');
  assert.equal(readerChapterNumber('4', 3), 3, 'Historical Ukrainian Joel has three chapters');
});

test('production reader reuses the canonical guarded chapter coordinate', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.ok(app.includes('readerChapterNumber(parts[2] || state.reader.chapter || 1, meta.chapters)'));
});
