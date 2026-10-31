import test from 'node:test';
import assert from 'node:assert/strict';
import { selectedEdition, editionSelect, setEditionForTab } from '../public/editions.js';

function withStorage(storage, callback) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true, writable: true, value: storage,
  });
  try { return callback(); }
  finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else delete globalThis.localStorage;
  }
}

test('a storage SecurityError does not remove the primary Ukrainian or English Bible reader', () => {
  withStorage({ getItem() { throw new Error('SecurityError: storage denied'); } }, () => {
    assert.equal(selectedEdition('uk').id, 'uk-ohiienko');
    assert.equal(selectedEdition('en').id, 'en-web');
    assert.equal(selectedEdition('ru').id, 'ru-synodal');
  });
});

test('the edition selector renders the actual primary option under blocked storage', () => {
  withStorage({ getItem() { throw new Error('SecurityError: storage denied'); } }, () => {
    const html = editionSelect('uk', value => String(value));
    assert.match(html, /<select id="bible-edition">/);
    assert.match(html, /value="uk-ohiienko" selected/);
    assert.match(html, /Переклад Біблії/);
  });
});

test('an available, valid stored translation is preserved without any extra storage write', () => {
  let calls = 0;
  withStorage({
    getItem(key) {
      calls++;
      assert.equal(key, 'sa.edition.uk');
      return 'uk-kulish';
    },
    setItem() { throw Error('unexpected write'); },
  }, () => {
    assert.equal(selectedEdition('uk').id, 'uk-kulish');
    assert.match(editionSelect('uk', value => String(value)), /value="uk-kulish" selected/);
  });
  assert.equal(calls, 2);
});

test('unrecognized or unsafe stored preference fails closed to the canonical primary edition', () => {
  withStorage({ getItem: () => 'evil" onclick="leak()' }, () => {
    assert.equal(selectedEdition('en').id, 'en-web');
    const html = editionSelect('en', value => String(value));
    assert.match(html, /value="en-web" selected/);
    assert.ok(!html.includes('onclick'));
  });
});

test('an unsupported language selects the preexisting Ukrainian fallback without throwing', () => {
  withStorage({ getItem: () => null }, () => {
    assert.equal(selectedEdition('xx').id, 'uk-ohiienko');
    assert.match(editionSelect('xx', value => String(value)), /Переклад Біблії/);
    assert.match(editionSelect('xx', value => String(value)), /value="uk-ohiienko" selected/);
  });
});

test('missing storage is a recoverable preference error, not a missing Bible chapter', () => {
  withStorage(undefined, () => {
    assert.equal(selectedEdition('uk').id, 'uk-ohiienko');
    assert.match(editionSelect('uk', value => String(value)), /value="uk-ohiienko" selected/);
  });
});

test('prototype property names cannot crash edition choice or spoof the fallback language', () => {
  withStorage({ getItem: () => 'uk-kulish' }, () => {
    for (const lang of ['__proto__', 'constructor', 'toString', 'hasOwnProperty']) {
      assert.equal(setEditionForTab(lang, 'uk-kulish'), null,
        'unsupported prototype-like language must never be accepted: ' + lang);
      assert.equal(selectedEdition(lang).id, 'uk-ohiienko',
        'unknown locale must use the Ukrainian primary edition: ' + lang);
      const html = editionSelect(lang, value => String(value));
      assert.match(html, /value="uk-ohiienko" selected/);
      assert.match(html, /Переклад Біблії/);
      assert.ok(!html.includes('undefined'), 'fallback markup must be localized');
    }
  });
});
