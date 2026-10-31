import assert from 'node:assert/strict';
import test from 'node:test';

import { mountParallelReader, parallelControls } from '../public/parallel-reader.js';

// This exercises the actual production module. An inherited Object.prototype
// member is truthy, but cannot supply translated text to accessible controls.
const esc = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

function changedAnnouncement(lang) {
  const button = { disabled: false };
  const status = { textContent: '' };
  const result = { replaceChildren() {} };
  const form = { onchange: null, onsubmit: null, querySelector: () => button };
  const panel = {
    isConnected: true,
    querySelector(selector) {
      if (selector === '.parallel-form') return form;
      if (selector === '.parallel-status') return status;
      if (selector === '.parallel-result') return result;
      throw Error('unexpected selector');
    },
  };
  mountParallelReader(panel, {
    editions: [], catalog: {}, lang, book: 'GEN', bookTitle: 'Буття',
    chapter: 1, getBook: async () => { throw Error('no fetch expected'); },
    check: async () => { throw Error('no guard expected'); },
    current: () => true, lock: () => {}, failClosed: () => {},
    esc, copyText: async () => {},
  });
  assert.equal(typeof form.onchange, 'function');
  form.onchange({ target: { name: 'edition' } });
  return status.textContent;
}

for (const lang of ['__proto__', 'constructor', 'prototype', 'toString', 'hasOwnProperty', 'valueOf', 'isPrototypeOf', null, undefined, 42, {}, [], 'fr']) {
  test('unrecognized or inherited locale uses full Ukrainian controls and live status: ' + String(lang), () => {
    const html = parallelControls([{ id: 'uk-kulish', title: 'Куліш' }], lang, esc);
    assert.match(html, /Порівняти видання/);
    assert.match(html, /Друге видання/);
    assert.match(html, /Показати другу версію глави/);
    assert.doesNotMatch(html, /undefined/);
    assert.match(changedAnnouncement(lang), /Вибране видання змінилося/);
  });
}

for (const [lang, heading, changed] of [
  ['uk', 'Порівняти видання', 'Вибране видання змінилося'],
  ['ru', 'Сравнить издания', 'Выбранное издание изменилось'],
  ['en', 'Compare editions', 'The selected edition changed'],
]) {
  test('existing supported locale retains its translated controls: ' + lang, () => {
    const html = parallelControls([{ id: 'uk-kulish', title: '<source>' }], lang, esc);
    assert.ok(html.includes(heading));
    assert.ok(!html.includes('<source>'));
    assert.ok(html.includes('&lt;source&gt;'));
    assert.ok(changedAnnouncement(lang).includes(changed));
  });
}
