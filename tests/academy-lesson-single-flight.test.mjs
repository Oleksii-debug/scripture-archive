import test from 'node:test';
import assert from 'node:assert/strict';
import { attachAcademy, academyProgressKey, readAcademyProgress } from '../public/scripture-academy.js';

const flush = () => new Promise(resolve => setImmediate(resolve));

function mount(locks) {
  const key = academyProgressKey({ id: 'alice' });
  const values = new Map();
  const storage = {
    getItem: id => values.get(id) ?? null,
    setItem: (id, value) => values.set(id, value),
  };
  const body = {}, elsewhere = {};
  const document = { body, activeElement: null };
  let active = true, focusCount = 0, handler;
  const button = {
    isConnected: true,
    attrs: { 'data-academy-lesson': 'abraham', 'aria-pressed': 'false' },
    getAttribute(name) { return this.attrs[name] ?? null; },
    setAttribute(name, value) { this.attrs[name] = value; },
    addEventListener(name, callback) { assert.equal(name, 'click'); handler = callback; },
    focus(options) {
      assert.deepEqual(options, { preventScroll: true });
      focusCount++;
      document.activeElement = button;
    },
    get disabled() { return this._disabled ?? false; },
    set disabled(value) {
      this._disabled = value;
      if (value && document.activeElement === button) document.activeElement = body;
    },
  };
  const error = { textContent: '' };
  const elements = new Map([
    ['#academy-reading-error', error],
    ['#academy-reading-status', { textContent: '' }],
    ['#academy-reading-progress', { value: 0 }],
    ['#academy-reading-badge', { textContent: '' }],
  ]);
  const root = {
    querySelectorAll: () => [button],
    querySelector: name => elements.get(name) ?? null,
  };
  document.querySelector = name => name === '[data-academy-root]' ? root : null;
  attachAcademy(document, storage, 'en', { id: 'alice' },
    { available: true, completed: [] }, () => active, locks, null);
  document.activeElement = button;
  return {
    key, storage, document, body, elsewhere, button, error,
    click: () => handler(),
    setActive: value => { active = value; },
    get focusCount() { return focusCount; },
  };
}

test('SA-EXT-07: repeated lesson action while Web Lock is pending is single-flight', async () => {
  let requests = 0, release;
  const locks = { request(name, options, callback) {
    assert.equal(name, 'sa-academy-progress:sa.academy.reading.v1:alice');
    assert.deepEqual(options, { mode: 'exclusive' });
    requests++;
    return new Promise(resolve => { release = () => resolve(callback()); });
  } };
  const panel = mount(locks);
  panel.click();
  assert.equal(panel.button.disabled, true, 'focused action is disabled during the pending lock');
  panel.click();
  assert.equal(requests, 1, 'second action must not enqueue a second toggle');
  release();
  await flush();
  assert.deepEqual(readAcademyProgress(panel.storage, panel.key).completed, ['abraham']);
  assert.equal(panel.button.getAttribute('aria-pressed'), 'true');
  assert.equal(panel.button.disabled, false);
  assert.equal(panel.focusCount, 1, 'NVDA keyboard focus returns after the action');
  assert.equal(panel.document.activeElement, panel.button);
});

test('SA-EXT-07: rejected Web Lock releases single-flight guard and allows retry', async () => {
  let requests = 0;
  const locks = { request(_name, _options, callback) {
    requests++;
    return requests === 1 ? Promise.reject(Error('lock denied')) : Promise.resolve(callback());
  } };
  const panel = mount(locks);
  panel.click();
  await flush();
  assert.equal(panel.button.disabled, false);
  assert.match(panel.error.textContent, /cross-tab saving is unavailable/);
  assert.equal(panel.storage.getItem(panel.key), null);
  panel.click();
  await flush();
  assert.equal(requests, 2);
  assert.equal(panel.button.disabled, false);
  assert.deepEqual(readAcademyProgress(panel.storage, panel.key).completed, ['abraham']);
});

test('SA-EXT-07: stale view cannot save or reclaim focus after lock resolution', async () => {
  let release;
  const locks = { request(_name, _options, callback) {
    return new Promise(resolve => { release = () => resolve(callback()); });
  } };
  const panel = mount(locks);
  panel.click();
  panel.setActive(false);
  release();
  await flush();
  assert.equal(panel.storage.getItem(panel.key), null);
  assert.equal(panel.button.disabled, false);
  assert.equal(panel.focusCount, 0);
});

test('SA-EXT-07: async lesson completion does not steal focus moved elsewhere', async () => {
  let release;
  const locks = { request(_name, _options, callback) {
    return new Promise(resolve => { release = () => resolve(callback()); });
  } };
  const panel = mount(locks);
  panel.click();
  panel.document.activeElement = panel.elsewhere;
  release();
  await flush();
  assert.deepEqual(readAcademyProgress(panel.storage, panel.key).completed, ['abraham']);
  assert.equal(panel.focusCount, 0);
  assert.equal(panel.document.activeElement, panel.elsewhere);
});
