import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Execute the canonical reader's actual entry-to-catalogue boundary.
// The rest of the reader is intentionally not mocked into a second renderer.
const source = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const begin = source.indexOf('async function renderReader(parts) {');
const end = source.indexOf('  const chosenEdition = selectedEdition(state.lang);', begin);
assert.ok(begin >= 0 && end > begin, 'canonical reader catalogue boundary is present');
const prefix = source.slice(begin, end);
const makeReader = new Function(
  'state', 'location', 'getCatalog', 'setActiveNav', 'shell', 't',
  prefix + '\n}\nreturn renderReader;'
);

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function fixture(lang, catalogRequest) {
  const lastReadable = { book: 'JHN', chapter: 3 };
  const previousLease = { book: 'JHN', chapter: 3 };
  const location = { pathname: '/reader/GEN/12', search: '', hash: '' };
  const state = { lang, user: { id: 'owner-1' }, reader: lastReadable, currentReader: previousLease };
  const html = [];
  let catalogCalls = 0;
  const render = makeReader(state, location,
    () => { catalogCalls += 1; return catalogRequest(); },
    () => {}, value => html.push(value), key => key);
  return { state, location, lastReadable, previousLease, html, render, calls: () => catalogCalls };
}

for (const lang of ['uk', 'ru', 'en']) {
  test(lang + ': pending catalogue request retires previous transient chapter without losing bookmark', async () => {
    const gate = deferred();
    const h = fixture(lang, () => gate.promise);
    const pending = h.render(['reader', 'GEN', '12']);
    assert.equal(h.calls(), 1, 'valid reader uses the existing catalogue');
    assert.equal(h.state.currentReader, null, 'old reader lease must not survive while catalogue is pending');
    assert.equal(h.state.reader, h.lastReadable, 'last verified chapter remains available');
    assert.deepEqual(h.html, [], 'outer route owns asynchronous error UI');
    gate.resolve({});
    await pending;
    assert.equal(h.state.reader, h.lastReadable);
  });

  test(lang + ': failed catalogue request cannot leave a stale active reader', async () => {
    const h = fixture(lang, async () => { throw Error('catalogue_unavailable'); });
    await assert.rejects(h.render(['reader', 'GEN', '12']), /catalogue_unavailable/);
    assert.equal(h.state.currentReader, null, 'error page has no live reader lease');
    assert.equal(h.state.reader, h.lastReadable, 'failed catalogue does not rewrite saved progress');
    assert.equal(h.calls(), 1);
  });

  test(lang + ': stale catalogue rejection never clears a newer route reader', async () => {
    const gate = deferred();
    const h = fixture(lang, () => gate.promise);
    const pending = h.render(['reader', 'GEN', '12']);
    const newerLease = { book: 'EXO', chapter: 2 };
    h.location.pathname = '/reader/EXO/2';
    h.state.currentReader = newerLease;
    gate.reject(Error('old_catalogue_unavailable'));
    await assert.rejects(pending, /old_catalogue_unavailable/);
    assert.equal(h.state.currentReader, newerLease, 'obsolete continuation must not touch newer reader');
    assert.equal(h.state.reader, h.lastReadable);
  });

  test(lang + ': a different principal cannot inherit a pending old reader lease', async () => {
    const gate = deferred();
    const h = fixture(lang, () => gate.promise);
    const pending = h.render(['reader', 'GEN', '12']);
    h.state.user = { id: 'owner-2' };
    const newerLease = { book: 'PSA', chapter: 1 };
    h.state.currentReader = newerLease;
    gate.resolve({});
    await pending;
    assert.equal(h.state.currentReader, newerLease);
    assert.equal(h.state.reader, h.lastReadable);
  });
}

test('malformed reader coordinates fail before any catalogue request, preserving the bookmark', async () => {
  const h = fixture('uk', async () => { throw Error('must_not_fetch'); });
  h.location.pathname = '/reader/GEN//12';
  await h.render(['reader', 'GEN', '', '12']);
  assert.equal(h.calls(), 0);
  assert.equal(h.state.currentReader, null);
  assert.equal(h.state.reader, h.lastReadable);
  assert.match(h.html[0], /role="alert"/);
});
