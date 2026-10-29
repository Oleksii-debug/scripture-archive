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
    appendChild(item) { this.append(item); return item; },
    replaceChildren(...items) { this.childNodes = [...items]; this.childElementCount = this.childNodes.length; },
    addEventListener(name, fn) { this.listeners[name] = fn; },
    click() { this.listeners.click?.({type:'click'}); },
    focus() { this.focused = true; },
    remove() { this.removed = true; },
  };
  return el;
}

function boot(lang = 'uk', blockedStorage = false, query = '', observeRender = false) {
  const main = element('main');
  const announcer = element('div');
  const body = element('body');
  const scripts = [];
  body.appendChild = function(script) { scripts.push(script); };
  const document = {
    baseURI: 'https://sa06.test/',
    body,
    createElement: element,
    getElementById(id) { return ({main, announcer, language: {value: lang}})[id] || null; },
  };
  let reloads = 0, nextTimer = 0;
  const timers = new Map();
  const storage = {blocked: blockedStorage};
  const eventListeners = new Map();
  const window = {
    localStorage: {getItem() { if (storage.blocked) throw Error('denied'); return lang; }},
    location: {search: query, href: `https://sa06.test/${query}`, origin: 'https://sa06.test', reload() {reloads += 1;}},
    addEventListener(type, handler) {eventListeners.set(type, handler);},
    removeEventListener(type, handler) {if (eventListeners.get(type) === handler) eventListeners.delete(type);},
    setTimeout(callback, delay) {const key=++nextTimer;timers.set(key,{callback,delay});return key;},
    clearTimeout(key) {timers.delete(key);},
  };
  let cleanup;
  const observers = [];
  class FakeMutationObserver {
    constructor(callback) { this.callback = callback; observers.push(this); this.active = false; }
    observe(target, options) { this.target = target; this.options = options; this.active = true; }
    disconnect() { this.active = false; }
    notify() { if (this.active) this.callback([{ type:'childList', target:this.target }]); }
  }
  const code = ts.transpileModule(fs.readFileSync(new URL('../app/script-loader.tsx', import.meta.url), 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2022},
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {exports, document, window, URL, URLSearchParams,
    ...(observeRender ? {MutationObserver:FakeMutationObserver} : {}), require(name) {
    if(name !== 'react') throw Error(`Unexpected import: ${name}`);
    return {useEffect(fn) {cleanup = fn();}};
  }}, {filename:'app/script-loader.tsx'});
  exports.default();
  return {main, announcer, scripts, cleanup: () => cleanup(), reloadCalls: () => reloads,
    dispatchError: (filename) => eventListeners.get('error')?.({filename}),
    hasErrorListener: () => eventListeners.has('error'),
    unblockStorage: () => {storage.blocked = false;},
    notifyRender: () => observers.forEach(o => o.notify()),
    activeObservers: () => observers.filter(o => o.active).length,
    activeTimers: () => timers.size,
    scheduledDelays: () => [...timers.values()].map(v => v.delay),
    fireTimers: () => {for(const [key,{callback}] of [...timers.entries()]) {timers.delete(key);callback();}}};
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


for (const [lang, firstMessage, retryMessage] of [
  ['uk', 'Завантаження інтерфейсу…', 'Повторне завантаження інтерфейсу…'],
  ['ru', 'Загрузка интерфейса…', 'Повторная загрузка интерфейса…'],
  ['en', 'Loading the interface…', 'Reloading the interface…'],
]) {
  test(`initial ${lang} load, retry and success expose accurate accessible busy state`, () => {
    const page = boot(lang);
    assert.equal(page.main.attributes['aria-busy'], 'true', 'initial empty content must not look idle');
    assert.equal(page.announcer.textContent, firstMessage);
    assert.equal(page.main.focused, false, 'initial loader must not steal focus');
    page.scripts.at(-1).onerror();
    assert.equal(page.main.attributes['aria-busy'], 'false', 'error is actionable, not busy');
    assert.equal(page.announcer.textContent, '', 'error alert is the active announcement');
    page.main.childNodes[0].childNodes[2].click();
    assert.equal(page.main.attributes['aria-busy'], 'true');
    assert.equal(page.announcer.textContent, retryMessage);
    page.scripts.at(-1).onload();
    assert.equal(page.main.attributes['aria-busy'], 'false');
    assert.equal(page.announcer.textContent, '', 'do not leave stale loading text after module success');
    page.cleanup();
  });
  test(`successful ${lang} module must not clear canonical route announcements`, () => {
    const page = boot(lang);
    page.announcer.textContent = 'Canonical reader route ready';
    page.scripts.at(-1).onload();
    assert.equal(page.announcer.textContent, 'Canonical reader route ready');
    assert.equal(page.main.attributes['aria-busy'], 'false');
    page.cleanup();
  });
}

// Chromium fires a global ErrorEvent before the module script's load event
// when /app.js downloads with HTTP 200 but throws during ESM evaluation.
// A blank #main must expose a real recovery action instead of silently idling.
for (const [lang, title] of [
  ['uk', 'Не вдалося відкрити сторінку'],
  ['ru', 'Не удалось открыть страницу'],
  ['en', 'The page could not open'],
]) {
  test(`${lang} evaluation error on current canonical app.js offers recovery despite onload`, () => {
    const page = boot(lang);
    assert.equal(page.hasErrorListener(), true);
    page.dispatchError('https://sa06.test/analytics.js');
    page.dispatchError('https://foreign.example/app.js');
    assert.equal(page.main.childElementCount, 0, 'unrelated errors must not be presented as app failures');
    const first = page.scripts.at(-1);
    page.dispatchError('https://sa06.test/app.js');
    first.onload(); // Browser sends onload even after ESM evaluation throws.
    assert.equal(page.main.attributes['aria-busy'], 'false');
    const notice = page.main.childNodes[0];
    assert.equal(notice.attributes.role, 'alert');
    assert.equal(notice.childNodes[0].textContent, title);
    const retry = notice.childNodes[2];
    assert.equal(retry.focused, true);
    retry.click();
    assert.equal(page.reloadCalls(), 1, 'evaluation failure must start a fresh document');
    assert.equal(page.scripts.at(-1), first, 'do not inject a duplicate module in the same document');
    page.cleanup();
    assert.equal(page.hasErrorListener(), false, 'cleanup must remove global listener');
    page.dispatchError('https://sa06.test/app.js?sa-retry=1');
    assert.equal(page.reloadCalls(), 1, 'unmounted loader stays inactive');
  });
}

// A first-party dependency of canonical /app.js may fetch with 200 and then
// throw during evaluation; Chromium reports the dependency filename and fires
// top-level script.onload. The same recovery UI must remain available.
for (const [lang, title] of [
  ['uk', 'Не вдалося відкрити сторінку'],
  ['ru', 'Не удалось открыть страницу'],
  ['en', 'The page could not open'],
]) {
  test(`${lang} startup dependency evaluation errors expose existing recovery`, () => {
    for (const path of ['/workspace.js', '/parallel-reader.js', '/support.js', '/home.js', '/editions.js']) {
      const page = boot(lang);
      page.dispatchError(`https://sa06.test${path}`);
      page.scripts.at(-1).onload();
      const notice = page.main.childNodes[0];
      assert.equal(notice?.attributes.role, 'alert', path);
      assert.equal(notice.childNodes[0].textContent, title, path);
      assert.equal(notice.childNodes[2].focused, true, path);
      assert.equal(page.main.attributes['aria-busy'], 'false', path);
      assert.equal(page.announcer.textContent, '', path);
      page.cleanup();
    }
  });
}

test('unrelated script and foreign-origin exceptions do not hijack startup UI', () => {
  const page = boot('en');
  for (const other of [
    'https://sa06.test/analytics.js',
    'https://sa06.test/random.js',
    'https://evil.example/workspace.js',
    'https://sa06.test/workspace.js?other=1',
    'chrome-extension://abc/workspace.js',
  ]) {
    page.dispatchError(other);
    assert.equal(page.main.childElementCount, 0, other);
    assert.equal(page.main.attributes['aria-busy'], 'true', other);
  }
  page.scripts.at(-1).onload();
  assert.equal(page.main.attributes['aria-busy'], 'false');
  page.cleanup();
});

for (const [lang, announcement] of [
  ['uk', 'Завантаження інтерфейсу…'],
  ['ru', 'Загрузка интерфейса…'],
  ['en', 'Loading the interface…'],
]) {
  test(lang + ' ESM onload keeps aria-busy until the actual asynchronous route renders', () => {
    const page = boot(lang, false, '', true);
    assert.equal(page.main.attributes['aria-busy'], 'true');
    page.scripts.at(-1).onload();
    assert.equal(page.main.childElementCount, 0);
    assert.equal(page.main.attributes['aria-busy'], 'true', 'loaded ESM is not a ready route');
    assert.equal(page.announcer.textContent, announcement);
    assert.equal(page.activeObservers(), 1);
    page.main.replaceChildren(element('section'));
    page.notifyRender();
    assert.equal(page.main.attributes['aria-busy'], 'false');
    assert.equal(page.announcer.textContent, '');
    assert.equal(page.activeObservers(), 0);
    page.cleanup();
  });
}
test('async readiness observer is disconnected on cleanup', () => {
  const page = boot('en', false, '', true);
  page.scripts.at(-1).onload();
  assert.equal(page.activeObservers(), 1);
  page.cleanup();
  assert.equal(page.activeObservers(), 0);
  page.main.replaceChildren(element('h1'));
  page.notifyRender();
  assert.equal(page.main.childElementCount, 1);
});

// SA-06: stuck canonical module/network or async startup must recover safely.
for (const [lang, reloadText] of [
  ['uk','Перезавантажити сторінку'],
  ['ru','Перезагрузить страницу'],
  ['en','Reload the page'],
]) {
  test(lang+': a never-settling module request offers a focused full-document reload', () => {
    const page=boot(lang,false,'',true);
    assert.deepEqual(page.scheduledDelays(),[30000]);
    assert.equal(page.main.attributes['aria-busy'],'true');
    page.fireTimers();
    const notice=page.main.childNodes[0];
    assert.equal(notice.attributes.role,'alert');
    assert.equal(page.main.attributes['aria-busy'],'false');
    const button=notice.childNodes[2];
    assert.equal(button.textContent,reloadText);
    assert.equal(button.focused,true);
    button.click();
    assert.equal(page.reloadCalls(),1);
    assert.equal(page.scripts.length,2,'never inject a second active app instance after timeout');
    page.cleanup();
  });
  test(lang+': a successfully loaded module with a stalled async route offers recovery', () => {
    const page=boot(lang,false,'',true);
    page.scripts.at(-1).onload();
    assert.equal(page.main.attributes['aria-busy'],'true');
    assert.deepEqual(page.scheduledDelays(),[30000]);
    page.fireTimers();
    assert.equal(page.main.childNodes[0].childNodes[2].textContent,reloadText);
    page.cleanup();
  });
  test(lang+': route content cancels watchdog and retains the canonical view', () => {
    const page=boot(lang,false,'',true);
    page.scripts.at(-1).onload();
    const routeHeading=element('h1');
    page.main.replaceChildren(routeHeading);
    page.notifyRender();
    assert.equal(page.main.attributes['aria-busy'],'false');
    assert.equal(page.activeTimers(),0);
    page.fireTimers();
    assert.equal(page.main.childNodes[0],routeHeading);
    page.cleanup();
  });
}
test('unmount cancels the pending recovery deadline', () => {
  const page=boot('uk',false,'',true);
  assert.equal(page.activeTimers(),1);
  page.cleanup();
  assert.equal(page.activeTimers(),0);
  page.fireTimers();
  assert.equal(page.main.childElementCount,0);
});

// SA-06: evaluated ESM may already have mutated state or registered events.
// Unlike a fetch failure, a second same-document import is not a safe retry.
for (const [lang, reloadText] of [
  ['uk','Перезавантажити сторінку'],
  ['ru','Перезагрузить страницу'],
  ['en','Reload the page'],
]) {
  for (const modulePath of ['/app.js','/workspace.js','/parallel-reader.js']) {
    test(`${lang}: ${modulePath} evaluation failure uses document reload, not duplicate bootstrap`, () => {
      const page = boot(lang);
      page.dispatchError(`https://sa06.test${modulePath}`);
      const notice = page.main.childNodes[0];
      assert.equal(notice.attributes.role, 'alert');
      const button = notice.childNodes[2];
      assert.equal(button.textContent, reloadText);
      assert.equal(button.focused, true);
      assert.equal(page.main.attributes['aria-busy'], 'false');
      button.click();
      assert.equal(page.reloadCalls(), 1, 'runtime side effects require a clean document');
      assert.equal(page.scripts.length, 2, 'no second app module in current document');
      page.cleanup();
    });
  }
}
test('unrelated analytics runtime errors do not claim canonical bootstrap UI', () => {
  const page = boot('en');
  page.dispatchError('https://sa06.test/analytics.js');
  assert.equal(page.main.childElementCount, 0);
  assert.equal(page.main.attributes['aria-busy'], 'true');
  page.cleanup();
});
