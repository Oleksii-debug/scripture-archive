import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

// Exercise the reader's actual getBook implementation, not a cache rewrite.
const source = (await readFile(new URL('../public/app.js', import.meta.url), 'utf8')).replaceAll('\r\n', '\n');
const match = source.match(/(async function getBook\(code\) \{[\s\S]*?\n\})\nfunction localEditionMetadata\(/);
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

const book = { chapters: [['In the beginning']] };

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
    return { ok: true, json: async () => book };
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

// SA-05 Drive handoff adopted into the existing SA-02 reader-cache workline:
// exercise the canonical route error handler, not a second router.
const routeStart = source.indexOf('async function route()');
const routeEnd = source.indexOf('\nlangSelect.addEventListener("change"', routeStart);
assert.ok(routeStart >= 0 && routeEnd > routeStart, 'canonical route must exist');
const routeFailure = source.slice(routeStart, routeEnd).match(/  } catch \(error\) \{\s*console\.error\(error\);\s*([\s\S]*?)\n  }\n}/);
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
