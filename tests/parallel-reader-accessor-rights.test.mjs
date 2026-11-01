import test from 'node:test';
import assert from 'node:assert/strict';
import { mountParallelReader, validEditionRightsMetadata } from '../public/parallel-reader.js';

const safeRights = {
  title: 'Approved edition',
  license: 'Public Domain',
  source: 'https://source.example/',
  attribution: 'Verified translator',
  licenseUrl: 'https://license.example/terms',
};
const edition = { id: 'uk-kulish', contentId: 'UKRPAN', title: 'Kulish', local: true };
const esc = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;')
  .replaceAll('>','&gt;').replaceAll('"','&quot;');

test('SA-EXT-01: publisher and licence fields must be own data, not dynamic accessors', () => {
  for (const key of Object.keys(safeRights)) {
    let reads = 0;
    const rights = { ...safeRights };
    delete rights[key];
    Object.defineProperty(rights, key, {
      enumerable: true,
      get() { reads++; return safeRights[key]; },
    });
    assert.equal(validEditionRightsMetadata(rights), false, key + ' getter is not provenance');
    assert.equal(reads, 0, key + ' getter must never be invoked during admission');
  }
  assert.equal(validEditionRightsMetadata({ ...safeRights }), true);
  assert.equal(validEditionRightsMetadata(Object.assign(Object.create(null), safeRights)), true);
});

test('SA-EXT-01: inherited optional rights still fail closed; absent optional fields remain valid', () => {
  const inherited = Object.create({ attribution: 'Unverified translator' });
  Object.assign(inherited, {
    title: safeRights.title, license: safeRights.license, source: safeRights.source,
  });
  assert.equal(validEditionRightsMetadata(inherited), false);
  assert.equal(validEditionRightsMetadata({
    title: safeRights.title, license: safeRights.license, source: safeRights.source,
  }), true);
});

test('SA-EXT-01: dynamic edition title cannot relabel displayed verses in any supported locale', async () => {
  const originalFormData = globalThis.FormData;
  globalThis.FormData = class { get() { return edition.id; } };
  try {
    for (const lang of ['uk','ru','en']) {
      let getterReads = 0, checks = 0;
      const metadata = {
        id: 'UKRPAN', license: safeRights.license, source: safeRights.source,
      };
      Object.defineProperty(metadata, 'title', {
        enumerable: true,
        get() {
          getterReads++;
          return getterReads <= 2 ? 'Approved edition' : 'UNREVIEWED REPLACEMENT';
        },
      });
      const button = { disabled: false };
      const status = { textContent: '' };
      const result = { innerHTML: '', replaceChildren() { this.innerHTML = ''; } };
      const form = { querySelector() { return button; } };
      const panel = {
        isConnected: true,
        querySelector(selector) {
          return selector === '.parallel-form' ? form
            : selector === '.parallel-status' ? status : result;
        },
      };
      mountParallelReader(panel, {
        editions: [edition],
        catalog: { translations: {}, editions: { [lang]: metadata } },
        lang, book: 'GEN', bookTitle: 'Genesis', chapter: 1, esc,
        getBook: async () => ({ chapters: [['PRIVATE UNVERIFIED VERSE']] }),
        check: async () => { checks++; return { invalidated: false }; },
        current: () => true, lock: () => {}, failClosed: () => {},
        copyText: async () => {},
      });
      await form.onsubmit({ preventDefault() {} });
      assert.equal(checks, 2, lang + ' retains both chapter authorization checks');
      assert.equal(getterReads, 0, lang + ' must not consult dynamic rights');
      assert.equal(result.innerHTML, '', lang + ' cannot disclose text with dynamic rights');
      assert.ok(status.textContent, lang + ' reports a retryable failure');
      assert.equal(button.disabled, false, lang + ' retains keyboard retry');
    }
  } finally {
    globalThis.FormData = originalFormData;
  }
});
