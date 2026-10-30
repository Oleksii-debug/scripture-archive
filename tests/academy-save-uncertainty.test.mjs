import test from 'node:test';
import assert from 'node:assert/strict';
import {attachAcademy} from '../public/scripture-academy.js';

// A browser or privacy adapter can successfully mutate local storage, then
// refuse/mangle the required readback. The UI must not claim "unchanged".
function mount(lang, storage) {
  const listeners = new Map();
  const attrs = new Map([
    ['data-academy-lesson', 'abraham'],
    ['aria-pressed', 'false'],
  ]);
  const button = {
    textContent: '',
    getAttribute: key => attrs.get(key) ?? null,
    setAttribute: (key, value) => attrs.set(key, value),
    addEventListener: (name, cb) => listeners.set(name, cb),
  };
  const status = {textContent:'before'};
  const meter = {value:0};
  const badge = {textContent:''};
  const error = {textContent:''};
  const elements = new Map([
    ['#academy-reading-status', status],
    ['#academy-reading-progress', meter],
    ['#academy-reading-badge', badge],
    ['#academy-reading-error', error],
  ]);
  const root = {
    querySelectorAll: selector => selector === 'button[data-academy-lesson]' ? [button] : [],
    querySelector: selector => elements.get(selector) ?? null,
  };
  const document = {querySelector: selector => selector === '[data-academy-root]' ? root : null};
  attachAcademy(document, storage, lang, {id:'alice'}, {available:true,completed:[]});
  assert.equal(typeof listeners.get('click'), 'function');
  return {click: listeners.get('click'), button, attrs, status, meter, badge, error};
}

test('academy does not claim unchanged progress when a write happened but readback was corrupted', () => {
  const mismatch = {
    uk: /Не вдалося підтвердити збереження/,
    ru: /Не удалось подтвердить сохранение/,
    en: /Could not verify that the marker was saved/,
  };
  const forbidden = /Прогрес не змінено|Прогресс не изменён|Progress has not been changed/i;
  for (const lang of ['uk','ru','en']) {
    let written = null;
    const storage = {
      getItem: key => {
        assert.equal(key, 'sa.academy.reading.v1:alice');
        return written === null ? null : JSON.stringify({version:1,completed:[]});
      },
      setItem: (key,value) => {
        assert.equal(key, 'sa.academy.reading.v1:alice');
        written=value;
      },
    };
    const ui = mount(lang, storage);
    ui.click();
    assert.deepEqual(JSON.parse(written), {version:1,completed:['abraham']});
    assert.match(ui.error.textContent, mismatch[lang]);
    assert.doesNotMatch(ui.error.textContent, forbidden);
    assert.equal(ui.attrs.get('aria-pressed'), 'false');
    assert.equal(ui.status.textContent, 'before');
    assert.equal(ui.meter.value, 0);
    assert.equal(ui.badge.textContent, '');
  }
});

test('academy still acknowledges an exact verified write without a false uncertainty alert', () => {
  let persisted = null;
  const storage = {
    getItem: () => persisted,
    setItem: (key,value) => {persisted=value;},
  };
  const ui = mount('en', storage);
  ui.click();
  assert.equal(ui.error.textContent, '');
  assert.equal(ui.attrs.get('aria-pressed'), 'true');
  assert.equal(ui.meter.value, 1);
  assert.match(ui.status.textContent, /1\/7/);
  assert.deepEqual(JSON.parse(persisted), {version:1,completed:['abraham']});
});

test('academy reports an uncertain save without claiming mutation on a thrown write', () => {
  const storage = {
    getItem: () => null,
    setItem: () => {throw Error('quota or privacy guard');},
  };
  const ui = mount('en', storage);
  ui.click();
  assert.match(ui.error.textContent, /Could not verify/);
  assert.doesNotMatch(ui.error.textContent, /Progress has not been changed/);
  assert.equal(ui.attrs.get('aria-pressed'), 'false');
  assert.equal(ui.status.textContent, 'before');
});
