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

function boot(lang = 'uk', blockedStorage = false, query = '') {
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
  let reloads = 0;
  const storage = {blocked: blockedStorage};
  const window = {localStorage: {getItem() { if (storage.blocked) throw Error('denied'); return lang; }}, location: {search: query, reload() {reloads += 1;}}};
  let cleanup;
  const code = ts.transpileModule(fs.readFileSync(new URL('../app/script-loader.tsx', import.meta.url), 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2022},
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {exports, document, window, URLSearchParams, require(name) {
    if(name !== 'react') throw Error(`Unexpected import: ${name}`);
    return {useEffect(fn) {cleanup = fn();}};
  }}, {filename:'app/script-loader.tsx'});
  exports.default();
  return {main, announcer, scripts, cleanup: () => cleanup(), reloadCalls: () => reloads, unblockStorage: () => {storage.blocked = false;}};
}

for (const [lang, title, retryText, reloadText] of [
  ['uk', 'Не вдалося відкрити сторінку', 'Повторити завантаження', 'Перезавантажити сторінку'],
  ['ru', 'Не удалось открыть страницу', 'Повторить загрузку', 'Перезагрузить страницу'],
  ['en', 'The page could not open', 'Retry loading', 'Reload the page'],
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
    assert.equal(page.scripts.at(-1).src, '/app.js?sa-retry=1', 'retry needs a new module URL after a failed module fetch');
    assert.equal(page.scripts.length, 3);
    assert.ok(page.announcer.textContent.length > 0);
    page.scripts.at(-1).onerror();
    assert.equal(page.main.childElementCount, 1);
    const recovery = page.main.childNodes[0].childNodes[2];
    assert.equal(recovery.textContent, reloadText, 'a failed dependency can be cached by the ESM module map');
    assert.equal(recovery.focused, true);
    recovery.click();
    assert.equal(page.reloadCalls(), 1, 'second failure must offer full-document recovery');
    assert.equal(page.scripts.length, 3, 'no futile third same-document retry');
    page.cleanup();
    assert.equal(page.scripts.at(-1).removed, true);
    assert.equal(page.scripts[0].removed, true);
  });
}

for (const [lang, reason, retryLabel] of [
  ['uk', 'Браузер заблокував доступ', 'Повторити завантаження'],
  ['ru', 'Браузер заблокировал доступ', 'Повторить загрузку'],
  ['en', 'Your browser blocked access', 'Retry loading'],
]) {
  test(`blocked browser storage shows a useful ${lang} error before the app crashes, then recovers`, () => {
    const page = boot(lang, true);
    assert.deepEqual(page.scripts.map(x => x.src), ['/analytics.js'], 'never execute the crashing /app.js');
    const notice = page.main.childNodes[0];
    assert.equal(notice.attributes.role, 'alert');
    assert.match(notice.childNodes[1].textContent, new RegExp(reason));
    const retry = notice.childNodes[2];
    assert.equal(retry.textContent, retryLabel);
    assert.equal(retry.focused, true);
    page.unblockStorage();
    retry.click();
    assert.equal(page.main.childElementCount, 0);
    assert.equal(page.scripts[1].src, '/app.js', 'first actual module load should use canonical module URL');
    page.cleanup();
  });
}

for (const [lang, retryText] of [
  ['uk', 'Повторити завантаження'],
  ['ru', 'Повторить загрузку'],
  ['en', 'Retry loading'],
]) {
  test(`blocked storage retry stays actionable without forced reload in ${lang}`, () => {
    const page = boot(lang, true);
    for (let i = 0; i < 2; i += 1) {
      const retry = page.main.childNodes[0].childNodes[2];
      assert.equal(retry.textContent, retryText);
      assert.equal(retry.focused, true);
      retry.click();
      assert.equal(page.reloadCalls(), 0);
      assert.equal(page.scripts.length, 1, 'no script should execute while storage is blocked');
    }
    const retry = page.main.childNodes[0].childNodes[2];
    assert.equal(retry.textContent, retryText);
    page.unblockStorage();
    retry.click();
    assert.equal(page.scripts.at(-1).src, '/app.js', 'blocked storage must not count as a module fetch');
    assert.equal(page.reloadCalls(), 0);
    page.cleanup();
  });
}

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


test('late error from a replaced module attempt never clobbers a new loading state', () => {
  const page = boot('en');
  const first = page.scripts.at(-1);
  first.onerror();
  page.main.childNodes[0].childNodes[2].click();
  assert.equal(page.main.childElementCount, 0);
  const second = page.scripts.at(-1);
  first.onerror(); // A removed script may still finish a queued request.
  assert.equal(page.main.childElementCount, 0, 'stale failure must not replace active retry');
  second.onerror();
  assert.equal(page.main.childElementCount, 1, 'current failure must still show the recovery control');
  page.cleanup();
});

for (const [query, stored, expectedTitle, storageBlocked] of [
  ['?lang=ru', 'uk', 'Не удалось открыть страницу', false],
  ['?lang=en', 'uk', 'The page could not open', true],
  ['?lang=uk', 'en', 'Не вдалося відкрити сторінку', false],
]) {
  test(`explicit ${query} takes priority over saved ${stored} for localized recovery`, () => {
    const page = boot(stored, storageBlocked, query);
    if (!storageBlocked) page.scripts[1].onerror();
    const notice = page.main.childNodes[0];
    assert.equal(notice.attributes.role, 'alert');
    assert.equal(notice.childNodes[0].textContent, expectedTitle);
    assert.equal(notice.childNodes[2].focused, true);
    page.cleanup();
  });
}

test('invalid query language retains the saved language instead of selecting an unsupported locale', () => {
  const page = boot('ru', true, '?lang=de');
  const notice = page.main.childNodes[0];
  assert.equal(notice.childNodes[0].textContent, 'Не удалось открыть страницу');
  page.cleanup();
});

for (const lang of ['uk', 'ru', 'en']) {
  test(`storage denial does not consume the first network recovery retry in ${lang}`, () => {
    const page = boot(lang, true);
    for (let retryCount = 0; retryCount < 3; retryCount += 1) {
      const button = page.main.childNodes[0].childNodes[2];
      button.click();
      assert.equal(page.scripts.length, 1, 'denied storage must not issue a module fetch');
      assert.equal(page.reloadCalls(), 0, 'denied storage must not force a page reload');
    }
    page.unblockStorage();
    page.main.childNodes[0].childNodes[2].click();
    const firstActualLoad = page.scripts.at(-1);
    assert.equal(firstActualLoad.src, '/app.js', 'first successful preflight is the first module fetch');
    firstActualLoad.onerror();
    const networkRecovery = page.main.childNodes[0].childNodes[2];
    assert.equal(networkRecovery.textContent, ({uk:'Повторити завантаження',ru:'Повторить загрузку',en:'Retry loading'})[lang], 'first network fault must offer a proper retry, not immediate reload');
    networkRecovery.click();
    assert.equal(page.scripts.at(-1).src, '/app.js?sa-retry=1', 'failed first actual fetch must obtain fresh ESM URL');
    page.scripts.at(-1).onerror();
    const terminalRecovery = page.main.childNodes[0].childNodes[2];
    assert.equal(terminalRecovery.textContent, ({uk:'Перезавантажити сторінку',ru:'Перезагрузить страницу',en:'Reload the page'})[lang]);
    terminalRecovery.click();
    assert.equal(page.reloadCalls(), 1, 'second actual module error may require a fresh document');
    page.cleanup();
  });
}
