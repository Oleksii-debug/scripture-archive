import test from 'node:test';
import assert from 'node:assert/strict';
import { mountParallelReader } from '../public/parallel-reader.js';

const esc = value => String(value).replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');
const good = {
  id: 'alt', title: 'Verified second edition',
  license: 'Public Domain', attribution: 'Original translator',
  source: 'https://source.example/edition',
  licenseUrl: 'https://license.example/terms',
};

async function renderWith(metadata) {
  const button = { disabled: false };
  const status = { textContent: '' };
  const result = {
    innerHTML: '',
    replaceChildren() { this.innerHTML = ''; },
  };
  const form = { querySelector() { return button; } };
  const panel = {
    isConnected: true,
    querySelector(selector) {
      return selector === '.parallel-form' ? form
        : selector === '.parallel-status' ? status : result;
    },
  };
  const copied = [];
  mountParallelReader(panel, {
    editions: [{ id: 'alt', local: true }],
    catalog: { translations: { alt: metadata }, editions: {} },
    lang: 'en', book: 'GEN', bookTitle: 'Genesis', chapter: 1, esc,
    getBook: async () => ({ chapters: [['Real verse one']] }),
    check: async () => ({ invalidated: false }),
    current: () => true, lock() { throw Error('unexpected lock'); },
    failClosed() { throw Error('unexpected guard failure'); },
    copyText: async text => { copied.push(text); },
  });
  const before = globalThis.FormData;
  globalThis.FormData = class { get() { return 'alt'; } };
  try {
    await form.onsubmit({ preventDefault() {} });
    return { result, status, button, copied, panel };
  } finally {
    globalThis.FormData = before;
  }
}

test('verified modest provenance renders and keeps its exact citation', async () => {
  const run = await renderWith({ ...good });
  assert.match(run.result.innerHTML, /Real verse one/);
  assert.match(run.result.innerHTML, /Original translator/);
  assert.match(run.result.innerHTML, /source\.example/);
  assert.match(run.result.innerHTML, /license\.example/);
  assert.match(run.status.textContent, /available below/);
  assert.equal(run.button.disabled, false);
});

test('overlong or invalid edition provenance fails closed before creating verse DOM', async () => {
  const bad = [
    { ...good, title: 'T'.repeat(513) },
    { ...good, license: 'L'.repeat(4097) },
    { ...good, attribution: 'A'.repeat(4097) },
    { ...good, source: 'https://source.example/' + 's'.repeat(4097) },
    { ...good, licenseUrl: 'https://license.example/' + 'u'.repeat(4097) },
    { ...good, attribution: ['typed-incorrectly'] },
    { ...good, attribution: { text: 'not a string' } },
  ];
  for (const metadata of bad) {
    const run = await renderWith(metadata);
    assert.equal(run.result.innerHTML, '', 'no verse or misleading license disclosure');
    assert.match(run.status.textContent, /Could not load/);
    assert.equal(run.button.disabled, false, 'retry stays available after a valid catalogue update');
    assert.deepEqual(run.copied, []);
  }
});

test('largest permitted valid metadata stays intact, never silently truncated', async () => {
  const metadata = {
    ...good, title: 'T'.repeat(512),
    license: 'L'.repeat(4096),
    attribution: 'A'.repeat(4096),
  };
  const run = await renderWith(metadata);
  assert.match(run.result.innerHTML, /Real verse one/);
  assert.ok(run.result.innerHTML.includes(metadata.title));
  assert.ok(run.result.innerHTML.includes(metadata.license));
  assert.ok(run.result.innerHTML.includes(metadata.attribution));
  assert.match(run.status.textContent, /available below/);
});
