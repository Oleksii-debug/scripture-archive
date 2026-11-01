import test from 'node:test';
import assert from 'node:assert/strict';
import { mountParallelReader } from '../public/parallel-reader.js';

const edition = { id: 'uk-kulish', contentId: 'UKRPAN', title: 'Kulish', local: true };
const esc = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const rights = { title: 'Verified publisher', license: 'Public Domain',
  source: 'https://publisher.example/edition' };

async function render(catalog, lang) {
  const button = { disabled: false };
  const status = { textContent: '' };
  const result = { innerHTML: '', replaceChildren() { this.innerHTML = ''; } };
  const form = { querySelector() { return button; } };
  const panel = { isConnected: true, querySelector(selector) {
    return selector === '.parallel-form' ? form
      : selector === '.parallel-status' ? status : result;
  } };
  let checks = 0, reads = 0;
  const copied = [];
  mountParallelReader(panel, {
    editions: [edition], catalog, lang, book: 'GEN', bookTitle: 'Genesis',
    chapter: 1, esc,
    getBook: async () => { reads++; return { chapters: [['Verified chapter verse']] }; },
    check: async () => { checks++; return { invalidated: false }; },
    current: () => true, lock: () => {}, failClosed: () => {},
    copyText: async text => { copied.push(text); },
  });
  await form.onsubmit({ preventDefault() {} });
  return { result, status, button, checks, reads, copied,
    cite: () => result.onclick({ target: { closest: () =>
      ({ dataset: { parallelCite: '1' }, disabled: false }) } }) };
}

async function selected(catalog, lang) {
  const original = globalThis.FormData;
  globalThis.FormData = class { get() { return edition.id; } };
  try { return await render(catalog, lang); }
  finally { globalThis.FormData = original; }
}

test('SA-EXT-01: inherited or accessor-backed publisher identity never admits another edition', async () => {
  for (const lang of ['uk', 'ru', 'en']) {
    for (const declared of [false, true]) {
      const expected = declared ? edition.id : edition.contentId;
      for (const accessor of [false, true]) {
        let getterCalls = 0;
        const metadata = accessor ? { ...rights } : Object.assign(
          Object.create({ id: expected }), rights);
        if (accessor) Object.defineProperty(metadata, 'id', {
          enumerable: true, get() { getterCalls++; return expected; },
        });
        const catalog = declared
          ? { translations: { [edition.id]: metadata }, editions: {} }
          : { translations: {}, editions: { [lang]: metadata } };
        const f = await selected(catalog, lang);
        assert.equal(f.checks, 2, lang + ' keeps both chapter guards');
        assert.equal(f.reads, 1, lang + ' performs the authorized chapter fetch');
        assert.equal(f.result.innerHTML, '', lang + ' cannot attribute verses to unowned identity');
        assert.ok(f.status.textContent, lang + ' announces retryable failure');
        assert.equal(f.button.disabled, false, lang + ' leaves keyboard retry available');
        assert.equal(getterCalls, 0, lang + ' never executes a publisher identity getter');
      }
    }
  }
});

test('SA-EXT-01: own-data publisher identities preserve real fallback and explicit translations', async () => {
  for (const lang of ['uk', 'ru', 'en']) {
    for (const declared of [false, true]) {
      const metadata = Object.assign(Object.create(null), rights, {
        id: declared ? edition.id : edition.contentId,
      });
      const catalog = declared
        ? { translations: { [edition.id]: metadata }, editions: {} }
        : { translations: {}, editions: { [lang]: metadata } };
      const f = await selected(catalog, lang);
      assert.equal(f.checks, 2);
      assert.match(f.result.innerHTML, /Verified chapter verse/);
      assert.match(f.result.innerHTML, /Verified publisher/);
      assert.equal(f.button.disabled, false);
    }
  }
});
