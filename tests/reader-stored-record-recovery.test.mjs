import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// Execute the canonical reader's real catalog stage. No shadow reader/router.
const source = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const start = source.indexOf("async function renderReader(parts) {");
const end = source.indexOf("  const readerContext = state.currentReader;", start);
assert.ok(start >= 0 && end > start, "canonical reader entry must remain testable");
const entry = source.slice(start, end) +
  "\n  return { book: meta.code, chapter };\n}\nreturn renderReader;";

function harness(savedReader, lang, path = "/reader") {
  const state = { lang, reader: savedReader, user: null, currentReader: null };
  const location = { pathname: path, search: "", hash: "" };
  const alerts = [];
  const books = [
    { code: "GEN", chapters: 50 },
    { code: "JHN", chapters: 21 },
  ];
  const render = new Function(
    "state", "location", "setActiveNav", "getCatalog", "selectedEdition",
    "readerChapterNumber", "shell", "t", entry
  )(
    state, location, () => {},
    async () => ({ books: { [lang]: books } }),
    () => ({ id: "local" }),
    (value, max) => {
      const n = Number(value);
      return Number.isSafeInteger(n) && n > 0 ? Math.min(n, max) : 1;
    },
    html => alerts.push(html), key => key
  );
  return { state, render, alerts };
}

for (const lang of ["uk", "ru", "en"]) {
  test(lang + ": invalid typed stored book recovers without clearing browser data", async () => {
    for (const malformed of [42, {}, ["GEN"], true]) {
      const h = harness({ book: malformed, chapter: 7 }, lang);
      assert.deepEqual(await h.render(["reader"]), { book: "GEN", chapter: 7 });
      assert.equal(h.state.currentReader.book, "GEN");
      assert.equal(h.alerts.length, 0);
    }
  });

  test(lang + ": null, array and empty stored reader recover", async () => {
    for (const damaged of [null, [], { book: "", chapter: {} }]) {
      const h = harness(damaged, lang);
      const result = await h.render(["reader"]);
      assert.equal(result.book, "GEN");
      assert.ok(result.chapter >= 1 && result.chapter <= 50);
    }
  });

  test(lang + ": valid saved book/chapter and explicit route are preserved", async () => {
    const saved = harness({ book: "JHN", chapter: 3 }, lang);
    assert.deepEqual(await saved.render(["reader"]), { book: "JHN", chapter: 3 });
    const explicit = harness({ book: 42, chapter: {} }, lang, "/reader/JHN/5");
    assert.deepEqual(await explicit.render(["reader", "JHN", "5"]), { book: "JHN", chapter: 5 });
  });

  test(lang + ": explicit unknown book never silently falls back to Genesis", async () => {
    const h = harness({ book: 42, chapter: 7 }, lang, "/reader/ZZZ/7");
    assert.equal(await h.render(["reader", "ZZZ", "7"]), undefined);
    assert.equal(h.state.currentReader, null);
    assert.match(h.alerts.join(" "), /role="alert"/);
  });
}
