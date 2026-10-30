import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

// Exercise the canonical app's actual event handlers, not reimplemented logic.
const source = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const slice = (begin, end) => {
  const a = source.indexOf(begin);
  const b = source.indexOf(end, a);
  assert.ok(a >= 0 && b > a, "canonical handler anchors must exist");
  return source.slice(a, b);
};
const helpers = slice("function storeReaderPreference(", "const transientEditionStorageDenied");
const changeLanguage = slice('langSelect.addEventListener("change", () => {',
  '\ndocument.querySelector("#menu-toggle")');
const changeSpelling = slice('document.querySelector("#uk-spelling")?.addEventListener("click", () => {',
  '\n  document\n    .querySelector("#book-select")');
const flush = () => new Promise(resolve => setImmediate(resolve));

function fixture(kind, storage, language = "uk") {
  const listeners = {}, calls = [], announcements = [], main = {};
  const state = {lang: language, mission: {active:true}, ukOriginal:false};
  const control = {
    value:"ru", addEventListener(event, callback) { listeners[event] = callback; },
    focus(options) {
      assert.equal(options.preventScroll, true);
      calls.push("focus");
    }
  };
  const document = {
    activeElement:control, contains: element => element === control,
    querySelector: () => control,
  };
  const ctx = {
    state, langSelect:control, document, main, localStorage:storage,
    setStaticI18n: () => calls.push("i18n"),
    play: () => calls.push("sound"),
    route: async () => { calls.push("route"); document.activeElement = main; },
    announce: message => announcements.push(message),
  };
  vm.runInNewContext(helpers + "\n" + (kind === "language" ? changeLanguage : changeSpelling), ctx);
  return {ctx, state, control, listeners, calls, announcements};
}

const denied = () => ({
  getItem() { throw Error("SecurityError"); },
  setItem() { throw Error("SecurityError"); },
});

test("language selector still updates and restores focus under denied browser storage", async () => {
  const f = fixture("language", denied());
  f.listeners.change();
  await flush();
  assert.equal(f.state.lang, "ru");
  assert.equal(f.state.mission, null);
  assert.deepEqual(f.calls, ["i18n","sound","route","focus"]);
  assert.match(f.announcements.join(" "), /Браузер запретил сохранить настройку/);
});

test("all three locales report non-persistent language choice when storage is blocked", async () => {
  for (const [lang, phrase] of [["uk","Браузер не дозволив"],["ru","Браузер запретил"],["en","Browser storage"]]) {
    const f = fixture("language", denied());
    f.control.value = lang;
    f.listeners.change();
    await flush();
    assert.equal(f.state.lang, lang);
    assert.ok(f.announcements.some(msg => msg.includes(phrase)));
  }
});

test("Ukrainian spelling toggle still redraws and can be reversed under denied storage", async () => {
  const f = fixture("spelling", denied());
  f.listeners.click();
  await flush();
  assert.equal(f.state.ukOriginal, true);
  assert.deepEqual(f.calls, ["route"]);
  assert.match(f.announcements.join(" "), /лише до перезавантаження/);
  f.listeners.click();
  await flush();
  assert.equal(f.state.ukOriginal, false);
  assert.deepEqual(f.calls, ["route","route"]);
});

test("language and spelling preferences still persist when browser storage is allowed", async () => {
  const writes = [];
  const storage = {setItem:(...args)=>writes.push(args)};
  const lang = fixture("language", storage);
  lang.control.value = "en";
  lang.listeners.change();
  await flush();
  assert.deepEqual(writes[0], ["sa.lang","en"]);
  assert.equal(lang.announcements.length, 0);
  const spelling = fixture("spelling", storage);
  spelling.listeners.click();
  await flush();
  assert.deepEqual(writes[1], ["sa.ukSpelling","original"]);
  assert.equal(spelling.announcements.length, 0);
});

test("stale language and spelling requests cannot announce obsolete preference warnings", async () => {
  for (const mode of ["language","spelling"]) {
    const f = fixture(mode, denied());
    let finish;
    f.ctx.route = () => new Promise(resolve => { finish = resolve; });
    f.listeners[mode === "language" ? "change" : "click"]();
    f.state.lang = "en";
    finish();
    await flush();
    assert.equal(f.announcements.length, 0);
  }
});

test("canonical callbacks do not introduce another independent preference store", () => {
  assert.match(helpers, /try \{ localStorage\.setItem\(key, value\); return true; \}/);
  assert.doesNotMatch(changeLanguage, /localStorage\.setItem/);
  assert.doesNotMatch(changeSpelling, /localStorage\.setItem/);
});
