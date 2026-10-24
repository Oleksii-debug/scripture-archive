import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function element(tag) {
  const el = {
    tagName: tag.toUpperCase(), childNodes: [], attributes: {}, listeners: {}, textContent: '',
    removed: false, focused: false, childElementCount: 0,
    setAttribute(name, value) { this.attributes[name] = value; },
    append(...items) { this.childNodes.push(...items); this.childElementCount = this.childNodes.length; },
    replaceChildren(...items) { this.childNodes = [...items]; this.childElementCount = this.childNodes.length; },
    addEventListener(name, fn) { this.listeners[name] = fn; },
    click() { this.listeners.click?.({type:'click'}); },
    focus() { this.focused = true; },
    remove() { this.removed = true; },
  };
  return el;
}

function boot(lang = 'uk', blockedStorage = false) {
  const main = element('main');
  const announcer = element('div');
  const body = element('body');
  const scripts = [];
  body.appendChild = function(script) { scripts.push(script); };
  const document = {
    body,
    createElement: element,
    getElementById(id) { return ({main, announcer, language: {value: lang}})[id] || null; },
  };
  const window = {localStorage: {getItem() { if (blockedStorage) throw Error('denied'); return lang; }}};
  let cleanup;
  const code = ts.transpileModule(fs.readFileSync(new URL('../app/script-loader.tsx', import.meta.url), 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2022},
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {exports, document, window, require(name) {
    if(name !== 'react') throw Error(`Unexpected import: ${name}`);
    return {useEffect(fn) {cleanup = fn();}};
  }}, {filename:'app/script-loader.tsx'});
  exports.default();
  return {main, announcer, scripts, cleanup: () => cleanup()};
}

for (const [lang, title, retryText] of [
  ['uk', 'Не вдалося відкрити сторінку', 'Повторити завантаження'],
  ['ru', 'Не удалось открыть страницу', 'Повторить загрузку'],
  ['en', 'The page could not open', 'Retry loading'],
]) {
  test(`loading failure offers keyboard-focusable ${lang} retry and recreates the real module script`, () => {
    const page = boot(lang);
    assert.deepEqual(page.scripts.map(x => x.src), ['/analytics.js', '/app.js']);
    page.scripts[1].onerror();
    const notice = page.main.childNodes[0];
    assert.equal(notice.attributes.role, 'alert');
    assert.equal(notice.childNodes[0].textContent, title);
    const retry = notice.childNodes[2];
    assert.equal(retry.textContent, retryText);
    assert.equal(retry.type, 'button');
    assert.equal(retry.focused, true);
    retry.click();
    assert.equal(page.main.childElementCount, 0);
    assert.equal(page.main.focused, true);
    assert.equal(page.scripts[1].removed, true);
    assert.equal(page.scripts.at(-1).src, '/app.js');
    assert.equal(page.scripts.length, 3);
    assert.ok(page.announcer.textContent.length > 0);
    page.scripts.at(-1).onerror();
    assert.equal(page.main.childElementCount, 1);
    page.cleanup();
    assert.equal(page.scripts.at(-1).removed, true);
    assert.equal(page.scripts[0].removed, true);
  });
}

test('blocked localStorage still exposes retry and no user data', () => {
  const page = boot('ru', true);
  page.scripts[1].onerror();
  assert.equal(page.main.childNodes[0].childNodes[2].textContent, 'Повторить загрузку');
});

test('late load errors cannot replace already-rendered content or modify unmounted views', () => {
  const populated = boot();
  const existing = element('h1');
  populated.main.replaceChildren(existing);
  populated.scripts[1].onerror();
  assert.equal(populated.main.childNodes[0], existing);
  const unmounted = boot();
  unmounted.cleanup();
  unmounted.scripts[1].onerror();
  assert.equal(unmounted.main.childElementCount, 0);
});
