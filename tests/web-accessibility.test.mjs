import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("language selector takes its accessible name from the localized associated label", async () => {
  const [page, app] = await Promise.all([read("app/page.tsx"), read("public/app.js")]);
  const label = page.match(/<label\b[^>]*\bhtmlFor="language"[^>]*>/)?.[0];
  const select = page.match(/<select\b[^>]*\bid="language"[^>]*>/)?.[0];

  assert.ok(label, "language selector needs a native associated label");
  assert.match(label, /\bdata-i18n="language"/);
  assert.ok(select, "native language selector must remain present");
  // aria-label takes precedence over <label> in the accessible-name computation.
  assert.doesNotMatch(select, /\baria-label\s*=/, "do not mask translated label with a fixed name");

  for (const translation of ['Мова', 'Язык', 'Language'])
    assert.ok(app.includes(`language: "${translation}"`), `missing locale label: ${translation}`);
  assert.match(app, /document\.documentElement\.lang\s*=\s*state\.lang/);
  assert.match(app, /querySelectorAll\("\[data-i18n\]"\)/);
});

test("skip link localizes with the existing static I18N while targeting the one main landmark", async () => {
  const [page, app] = await Promise.all([read("app/page.tsx"), read("public/app.js")]);
  assert.match(page, /<a\b[^>]*className="skip-link"[^>]*href="#main"[^>]*data-i18n="skipContent"/);
  assert.match(page, /<main\b[^>]*id="main"[^>]*tabIndex=\{-1\}/);
  for (const text of ["Перейти до основного вмісту", "Перейти к основному содержимому", "Skip to main content"])
    assert.ok(app.includes(`skipContent: "${text}"`), `missing localized skip link: ${text}`);
});

test("changing language restores native picker focus only when user has not moved elsewhere", async () => {
  const { runInNewContext } = await import("node:vm");
  const app = await read("public/app.js");
  const start = app.indexOf('langSelect.addEventListener("change", () => {');
  const end = app.indexOf('\ndocument.querySelector("#menu-toggle")', start);
  assert.ok(start !== -1 && end > start, "exercise canonical production language listener");
  const source = app.slice(start, end);
  for (const locale of ["uk", "ru", "en"]) {
    let onChange;
    let restored = 0;
    const main = {};
    const langSelect = {
      value: locale,
      addEventListener(kind, cb) { assert.equal(kind, "change"); onChange = cb; },
      focus(options) { assert.equal(options?.preventScroll, true); restored++; doc.activeElement = langSelect; },
    };
    const doc = { activeElement: langSelect, contains(node) { return node === langSelect; } };
    const state = { lang: "uk", mission: {} };
    const saved = [];
    let translated = 0;
    runInNewContext(source, {
      langSelect, main, document: doc, state,
      storeReaderPreference(key, value) { saved.push([key, value]); return true; },
      setStaticI18n() { translated++; }, play() {},
      route() { doc.activeElement = main; return Promise.resolve(); },
    });
    onChange();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(doc.activeElement, langSelect, `${locale}: restore picker after route puts focus on main`);
    assert.equal(restored, 1);
    assert.equal(translated, 1);
    assert.deepEqual(saved, [["sa.lang", locale]]);
  }
  let onChange;
  const main = {}, other = {};
  const langSelect = {
    value: "en", addEventListener(_, cb) { onChange = cb; },
    focus() { assert.fail("do not steal focus after another keyboard movement"); },
  };
  const doc = { activeElement: langSelect, contains() { return true; } };
  runInNewContext(source, {
    langSelect, main, document: doc, state: {},
    storeReaderPreference() { return true; }, setStaticI18n() {}, play() {},
    route() { doc.activeElement = main; return Promise.resolve().then(() => { doc.activeElement = other; }); },
  });
  onChange();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(doc.activeElement, other);
});
