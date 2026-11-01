import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

// Exercise the reader's actual getBook implementation, not a cache rewrite.
const source = (await readFile(new URL('../public/app.js', import.meta.url), 'utf8')).replaceAll('\r\n', '\n');
const match = source.match(/(async function getBook\(code, explicitEdition = null\) \{[\s\S]*?\n\})\nfunction localEditionMetadata\(/);
assert.ok(match, 'canonical getBook must exist');
const functionSource = match[1];

function setup(fetch) {
  const state = { lang: 'uk', bookCache: new Map() };
  const EDITIONS = {
    uk: [{ id: 'uk', local: true, folder: 'uk' }],
    ru: [{ id: 'ru', local: true, folder: 'ru' }],
    en: [{ id: 'en', local: true, folder: 'en' }],
  };
  const selectedEdition = locale => EDITIONS[locale][0];
  const getBook = vm.runInNewContext('(' + functionSource + ')', { state, EDITIONS, selectedEdition, fetch, Error });
  return { state, getBook };
}

const book = { bookCode: 'GEN', locale: 'uk', editionId: 'uk', chapters: [['In the beginning']] };

test('every shipped local edition can load its actual catalog books', async () => {
  const { EDITIONS } = await import('../public/editions.js');
  const catalog = JSON.parse(await readFile(new URL('../public/data/catalog.json', import.meta.url), 'utf8'));
  for (const locale of ['uk', 'ru', 'en']) {
    for (const edition of EDITIONS[locale].filter(value => value.local)) {
      const state = { lang: locale, bookCache: new Map(), catalog };
      const getBook = vm.runInNewContext('(' + functionSource + ')', {
        state, EDITIONS, selectedEdition: () => edition, Error,
        fetch: async path => ({ ok: true, json: async () => JSON.parse(await readFile(new URL('../public' + path, import.meta.url), 'utf8')) }),
      });
      const books = catalog.editionBooks?.[edition.id] || catalog.books[locale];
      for (const entry of books) {
        const loaded = await getBook(entry.code);
        assert.equal(loaded.editionId, edition.contentId || edition.id, edition.id);
        assert.equal(loaded.chapters.length, entry.chapters, `${edition.id} ${entry.code}`);
      }
    }
  }
});

test('parallel reader loads a second authorized edition without changing the selected edition', async () => {
  const { EDITIONS } = await import('../public/editions.js');
  const catalog = JSON.parse(await readFile(new URL('../public/data/catalog.json', import.meta.url), 'utf8'));
  const selected = EDITIONS.uk[0], other = EDITIONS.uk[1], state = { lang:'uk', bookCache:new Map(), catalog };
  const getBook = vm.runInNewContext('(' + functionSource + ')', {
    state, EDITIONS, selectedEdition:()=>selected, Error,
    fetch:async path=>({ok:true,json:async()=>JSON.parse(await readFile(new URL('../public'+path,import.meta.url),'utf8'))}),
  });
  const first=await getBook('GEN'), second=await getBook('GEN',other);
  assert.equal(first.editionId,'uk-ohiienko');assert.equal(second.editionId,'UKRPAN');
  assert.equal(state.bookCache.size,2);assert.equal((await getBook('GEN')).editionId,'uk-ohiienko');
  await assert.rejects(getBook('GEN',{...other}),/Invalid local edition/);
  await assert.rejects(getBook('GEN',EDITIONS.uk[2]),/Invalid local edition/);
});

test('reader retries transient HTTP failure without page reload', async () => {
  let calls = 0;
  const { state, getBook } = setup(async () =>
    ++calls === 1 ? { ok: false, status: 503 } : { ok: true, json: async () => book });
  await assert.rejects(getBook('GEN'), /503/);
  assert.equal(state.bookCache.has('uk:GEN'), false, 'rejected response must not poison the cache');
  assert.deepEqual(await getBook('GEN'), book);
  assert.equal(calls, 2);
});

test('network and malformed JSON errors also permit recovery', async () => {
  for (const failure of ['network', 'json']) {
    let calls = 0;
    const { getBook } = setup(async () => {
      calls++;
      if (calls === 1 && failure === 'network') throw Error('offline');
      if (calls === 1) return { ok: true, json: async () => { throw Error('bad JSON'); } };
      return { ok: true, json: async () => book };
    });
    await assert.rejects(getBook('GEN'));
    assert.deepEqual(await getBook('GEN'), book);
    assert.equal(calls, 2);
  }
});

test('parallel reads coalesce and successfully fetched books stay cached', async () => {
  let calls = 0, release;
  const pending = new Promise(resolve => { release = resolve; });
  const { getBook } = setup(async () => {
    calls++;
    await pending;
    return { ok: true, json: async () => book };
  });
  const a = getBook('GEN'), b = getBook('GEN');
  assert.equal(calls, 1);
  release();
  assert.deepEqual(await Promise.all([a, b]), [book, book]);
  await getBook('GEN');
  assert.equal(calls, 1);
});

test('uk, ru and en cache keys remain independent', async () => {
  const paths = [];
  const { getBook, state } = setup(async path => {
    paths.push(path);
    const locale = path.split('/')[3];
    return { ok: true, json: async () => ({ ...book, locale, editionId: locale }) };
  });
  for (const locale of ['uk', 'ru', 'en']) {
    state.lang = locale;
    await getBook('GEN');
  }
  assert.equal(paths.length, 3);
  assert.equal(state.bookCache.size, 3);
  for (const locale of ['uk', 'ru', 'en'])
    assert.ok(paths.some(path => path.includes('/' + locale + '/GEN.json')), locale);
});

// SA-05 semantic-data handoff integrated into the existing cache/retry workline:
// HTTP 200 with malformed content must not become authoritative cached Scripture.
test('invalid HTTP 200 metadata or verse arrays are rejected, evicted and retried', async () => {
  const wrongBodies = [
    { ...book, bookCode: 'EXO' },
    { ...book, locale: 'ru' },
    { ...book, editionId: 'wrong-edition' },
    { ...book, chapters: null },
    { ...book, chapters: [[null]] },
    { ...book, chapters: [['  ']] },
  ];
  for (const invalidBody of wrongBodies) {
    let calls = 0;
    const { state, getBook } = setup(async () => ({
      ok: true,
      json: async () => ++calls === 1 ? invalidBody : book,
    }));
    await assert.rejects(getBook('GEN'), /Invalid Bible book data/);
    assert.equal(state.bookCache.has('uk:GEN'), false, 'invalid success response cannot poison cache');
    assert.deepEqual(await getBook('GEN'), book, 'second request must recover');
    assert.equal(calls, 2);
  }
});

test('book shorter than the already loaded catalog must be rejected until corrected', async () => {
  let calls = 0;
  const complete = { ...book, chapters: [['chapter one'], ['chapter two']] };
  const { state, getBook } = setup(async () => ({
    ok: true,
    json: async () => ++calls === 1 ? book : complete,
  }));
  state.catalog = { editionBooks: { uk: [{ code: 'GEN', chapters: 2 }] } };
  await assert.rejects(getBook('GEN'), /Invalid Bible book data/);
  assert.equal(state.bookCache.has('uk:GEN'), false);
  assert.deepEqual(await getBook('GEN'), complete);
  assert.equal(calls, 2);
});

// SA-05 Drive handoff adopted into the existing SA-02 reader-cache workline:
// exercise the canonical route error handler, not a second router.
const routeStart = source.indexOf('async function route()');
const routeEnd = source.indexOf('\nlangSelect.addEventListener("change"', routeStart);
assert.ok(routeStart >= 0 && routeEnd > routeStart, 'canonical route must exist');
// The outer route now ignores errors from superseded navigations; retain the
// current-route retry contract test after its ownership guard.
const routeFailure = source.slice(routeStart, routeEnd).match(/  } catch \(error\) \{\s*(?:if \(!routeStillCurrent\(\)\) return;\s*)?console\.error\(error\);\s*([\s\S]*?)\n  }\n}/);
assert.ok(routeFailure, 'canonical route error handler must remain testable');
const retryCopy = { uk: 'Повторити спробу', ru: 'Повторить попытку', en: 'Try again' };
for (const [locale, label] of Object.entries(retryCopy)) {
  test(locale + ': failure offers native retry without leaking internal errors', () => {
    assert.ok(source.includes('retryLoad: "' + label + '"'), 'trilingual retry translation missing');
    let view = '', retry, routeCalls = 0;
    const button = { addEventListener(type, fn) { assert.equal(type, 'click'); retry = fn; } };
    const context = {
      shell: html => { view = html; },
      t: key => key === 'retryLoad' ? label : 'Failed to load',
      document: { querySelector: selector => selector === '#retry-load' ? button : null },
      route: () => { routeCalls++; },
      console: { error() {} },
    };
    vm.runInNewContext('(error) => {' + routeFailure[1] + '}', context)(new Error('PRIVATE_FILE_PATH'));
    assert.match(view, /role="alert"/);
    assert.match(view, /<button[^>]*type="button"[^>]*id="retry-load"/);
    assert.ok(view.includes(label));
    assert.ok(!view.includes('PRIVATE_FILE_PATH'), 'never show internal errors');
    assert.equal(typeof retry, 'function');
    retry();
    assert.equal(routeCalls, 1, 'retry must invoke existing route()');
  });
}
// SA-05 -> SA-02 integration handoff: a parseable but incomplete HTTP 200
// catalog must not become authoritative cached Bible metadata.
const catalogMatch = source.match(/(async function getCatalog\(\) \{[\s\S]*?\n\})\nasync function getCMS\(/);
assert.ok(catalogMatch, 'canonical getCatalog must exist');
const catalogValidator = source.match(/(function validBibleCatalog\(catalog\) \{[\s\S]*?\n\})\nasync function getCatalog\(/);
const catalogSource = (catalogValidator?.[1] || '') + '\n(' + catalogMatch[1] + ')';
const genuineCatalog = JSON.parse(await readFile(new URL('../public/data/catalog.json', import.meta.url), 'utf8'));

function setupCatalog(responses) {
  const state = { catalog: null };
  let calls = 0;
  const fetch = async path => {
    assert.equal(path, '/data/catalog.json');
    const response = responses[Math.min(calls++, responses.length - 1)];
    if (response instanceof Error) throw response;
    return {
      ok: response?.status !== 503,
      status: response?.status || 200,
      json: async () => {
        if (response?.badJson) throw Error('invalid JSON');
        return structuredClone(response?.data || response);
      },
    };
  };
  const getCatalog = vm.runInNewContext(catalogSource, { state, fetch, Error });
  return { getCatalog, state, get calls() { return calls; } };
}

test('real trilingual Bible catalog and Ohiienko edition remain available and cached', async () => {
  const fixture = setupCatalog([genuineCatalog]);
  const result = await fixture.getCatalog();
  for (const locale of ['uk', 'ru', 'en']) assert.equal(result.books[locale].length, 66);
  assert.equal(result.editionBooks['uk-ohiienko'].length, 66);
  assert.equal(await fixture.getCatalog(), result);
  assert.equal(fixture.calls, 1);
});

test('corrupted HTTP 200 catalog is rejected, evicted, then healthy retry succeeds', async () => {
  const corruptions = [
    catalog => { delete catalog.books.ru; },
    catalog => { catalog.books.en = []; },
    catalog => { catalog.editions.uk = null; },
    catalog => { catalog.books.uk[1].code = catalog.books.uk[0].code; },
    catalog => { catalog.books.uk[0].chapters = 0; },
    // Same 66 book codes with swapped positions must not corrupt Bible navigation.
    catalog => { [catalog.books.ru[0], catalog.books.ru[1]] = [catalog.books.ru[1], catalog.books.ru[0]]; },
    catalog => { [catalog.editionBooks['uk-ohiienko'][0], catalog.editionBooks['uk-ohiienko'][1]] =
      [catalog.editionBooks['uk-ohiienko'][1], catalog.editionBooks['uk-ohiienko'][0]]; },
    catalog => { catalog.books.ru[0].code = 'NOT-A-BOOK'; },
    catalog => { catalog.editionBooks['uk-ohiienko'] = []; },
    catalog => { delete catalog.books; },
  ];
  for (const corrupt of corruptions) {
    const invalid = structuredClone(genuineCatalog);
    corrupt(invalid);
    const fixture = setupCatalog([invalid, genuineCatalog]);
    await assert.rejects(fixture.getCatalog(), /Invalid Bible catalog data/);
    assert.equal(fixture.state.catalog, null, 'reject must never cache a malformed catalog');
    const restored = await fixture.getCatalog();
    assert.equal(restored.books.uk.length, 66);
    assert.equal(restored.books.ru.length, 66);
    assert.equal(restored.books.en.length, 66);
    assert.equal(fixture.calls, 2);
  }
});

test('503 or malformed JSON catalog can be requested again without reload', async () => {
  for (const bad of [{ status: 503 }, { badJson: true }]) {
    const fixture = setupCatalog([bad, genuineCatalog]);
    await assert.rejects(fixture.getCatalog());
    assert.equal(fixture.state.catalog, null);
    await fixture.getCatalog();
    assert.equal(fixture.calls, 2);
  }
});


test('reader chapter hash and saved checkpoint normalize to server-safe integers in UK/RU/EN', () => {
  // Exercise the exact expression used by canonical renderReader, not a shadow parser.
  const readerAt = source.indexOf('async function renderReader(parts) {');
  const groupAt = source.indexOf('  const groupId', readerAt);
  assert.ok(readerAt >= 0 && groupAt > readerAt, 'canonical reader boundaries');
  const helperAt = source.indexOf('function readerChapterNumber(');
  const helperEnd = source.indexOf('\nasync function renderReader(', helperAt);
  assert.ok(helperAt >= 0 && helperEnd > helperAt, 'canonical production chapter validator');
  const chapterAssignment = source.slice(readerAt, groupAt).match(/  const chapter = readerChapterNumber\(parts\[2\] \|\| state\.reader\?\.chapter \|\| 1, meta\.chapters\);/);
  assert.ok(chapterAssignment, 'canonical renderReader chapter selection');
  const calculate = vm.runInNewContext(source.slice(helperAt, helperEnd) + '\n(parts, state, meta) => { ' + chapterAssignment[0] + '; return chapter; }');
  const scenarios = [
    { hash: '2.9', saved: 12, expected: 1 },
    { hash: '', saved: 3.4, expected: 1 },
    { hash: '0.9', saved: 12, expected: 1 },
    { hash: '999.4', saved: 12, expected: 1 },
    { hash: 'not-a-number', saved: 12, expected: 1 },
    { hash: '4', saved: 12, expected: 4 },
    { hash: '999', saved: 12, expected: 50 },
  ];
  for (const lang of ['uk','ru','en'])
    for (const { hash, saved, expected } of scenarios) {
      const value = calculate(['reader', 'GEN', hash], {lang, reader:{book:'GEN', chapter:saved}}, {chapters:50});
      assert.equal(value, expected, lang + '/' + hash + ': wrong chapter');
      assert.ok(Number.isInteger(value), lang + '/' + hash + ': server rejects fractional chapters');
    }
});


// SA-EXT-01: primary reading uses the same 256-verse / 131072 UTF-16
// character limit as the already shipped parallel reader. This directly runs
// canonical getBook rather than testing a duplicate parser.
test('primary Bible reader rejects oversized or sparse chapters and recovers on retry', async () => {
  const invalidBooks = [
    { ...book, chapters: [Array(257).fill('verse')] },
    { ...book, chapters: [['V'.repeat(131073)]] },
    { ...book, chapters: [Array(128).fill('V'.repeat(1025))] },
    { ...book, chapters: Array(1) },
    { ...book, chapters: [['One', , 'Two']] },
    { ...book, chapters: Array(201).fill(['One']) },
  ];
  for (const invalid of invalidBooks) {
    let calls = 0;
    const { state, getBook } = setup(async () => ({
      ok: true,
      json: async () => ++calls === 1 ? invalid : book,
    }));
    await assert.rejects(getBook('GEN'), /Invalid Bible book data/);
    assert.equal(state.bookCache.has('uk:GEN'), false, 'invalid HTTP 200 must not become trusted Scripture');
    assert.deepEqual(await getBook('GEN'), book, 'corrected response recovers without reloading page');
    assert.equal(calls, 2);
  }
});

test('primary Bible reader accepts Psalm-like chapters and exact limits', async () => {
  for (const verses of [
    Array(176).fill('Verified verse'),
    Array(256).fill('V'),
    ['V'.repeat(131072)],
    Array(128).fill('V'.repeat(1024)),
  ]) {
    const payload = { ...book, chapters: [verses] };
    const { state, getBook } = setup(async () => ({ ok: true, json: async () => payload }));
    assert.deepEqual(await getBook('GEN'), payload);
    assert.equal(state.bookCache.has('uk:GEN'), true);
  }
});
