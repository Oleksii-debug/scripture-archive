import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// Source-executed regression against the real canonical reader entry, not a
// duplicate implementation. The first chapter-attempt phase is also executed.
const source = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const start = source.indexOf("async function renderReader(parts) {");
const contextEnd = source.indexOf("  const readerContext = state.currentReader;", start);
const attemptEnd = source.indexOf("  let book;\n  try {", start);
assert.ok(start >= 0 && contextEnd > start && attemptEnd > contextEnd);
const stages = {
  catalog: source.slice(start, contextEnd) + "\n  return {book: meta.code, chapter};\n}",
  attempt: source.slice(start, attemptEnd) + "\n  return {book: meta.code, chapter};\n}",
};
assert.match(source.slice(start, attemptEnd), /readerStillCurrent\(\)/);

function makeHarness(lang, stage = "catalog") {
  const state = { lang, user: { id: "A" }, reader: { book: "GEN", chapter: 1 }, currentReader: null };
  const location = { pathname: "/reader/JHN/3", search: "", hash: "" };
  const pendingCatalog = [], pendingAttempt = [], notices = [];
  const catalog = { books: { [lang]: [
    { code: "GEN", chapters: 50 }, { code: "JHN", chapters: 21 },
  ] } };
  const reader = new Function(
    "state", "location", "setActiveNav", "getCatalog", "selectedEdition",
    "readerChapterNumber", "shell", "t", "attemptRequest",
    stages[stage] + "\nreturn renderReader;"
  )(
    state, location, () => {}, () => new Promise(resolve => pendingCatalog.push(resolve)),
    () => ({ id: "local" }), (raw, max) => Math.min(Math.max(Number(raw) || 1, 1), max),
    html => notices.push(html), key => key,
    () => new Promise(resolve => pendingAttempt.push(resolve))
  );
  return {
    state, location, pendingCatalog, pendingAttempt, notices,
    resolveCatalog(index) { pendingCatalog[index](catalog); },
    open(book, chapter) {
      location.pathname = "/reader/" + book + "/" + chapter;
      return reader(["reader", book, String(chapter)]);
    },
  };
}

for (const lang of ["uk", "ru", "en"]) {
  test(lang + ": stale old catalog result cannot overwrite new reader page", async () => {
    const h = makeHarness(lang);
    const first = h.open("JHN", 3);
    const second = h.open("GEN", 5);
    assert.equal(h.pendingCatalog.length, 2);
    h.resolveCatalog(1);
    assert.deepEqual(await second, { book: "GEN", chapter: 5 });
    const fresh = h.state.currentReader;
    h.resolveCatalog(0);
    assert.equal(await first, undefined);
    assert.equal(h.state.currentReader, fresh);
    assert.equal(h.location.pathname, "/reader/GEN/5");
    assert.equal(Object.keys(h.state).includes("__readerRenderToken"), false);
  });

  test(lang + ": same-URL later request has priority over the first", async () => {
    const h = makeHarness(lang);
    const first = h.open("JHN", 3);
    const second = h.open("JHN", 3);
    h.resolveCatalog(1);
    assert.deepEqual(await second, { book: "JHN", chapter: 3 });
    const fresh = h.state.currentReader;
    h.resolveCatalog(0);
    assert.equal(await first, undefined);
    assert.equal(h.state.currentReader, fresh);
  });

  test(lang + ": query/hash mutation invalidates old pending render", async () => {
    for (const field of ["search", "hash"]) {
      const h = makeHarness(lang);
      const first = h.open("JHN", 3);
      h.location[field] = field === "search" ? "?edition=other" : "#verse=7";
      h.resolveCatalog(0);
      assert.equal(await first, undefined);
      assert.equal(h.state.currentReader, null);
    }
  });

  test(lang + ": account change still invalidates reader continuation", async () => {
    const h = makeHarness(lang);
    const first = h.open("JHN", 3);
    h.state.user = { id: "B" };
    h.resolveCatalog(0);
    assert.equal(await first, undefined);
    assert.equal(h.state.currentReader, null);
  });

  test(lang + ": stale first chapter-attempt continuation rejects changed URL", async () => {
    const h = makeHarness(lang, "attempt");
    const first = h.open("JHN", 3);
    h.resolveCatalog(0);
    await Promise.resolve();
    assert.equal(h.pendingAttempt.length, 1);
    h.location.pathname = "/reader/GEN/5";
    h.pendingAttempt[0]({ invalidated: false });
    assert.equal(await first, undefined);
    assert.equal(h.notices.length, 0);
  });

  test(lang + ": current reader request and first chapter attempt still succeed", async () => {
    const h = makeHarness(lang, "attempt");
    const first = h.open("JHN", 3);
    h.resolveCatalog(0);
    await Promise.resolve();
    assert.equal(h.pendingAttempt.length, 1);
    h.pendingAttempt[0]({ invalidated: false });
    assert.deepEqual(await first, { book: "JHN", chapter: 3 });
    assert.deepEqual(h.state.currentReader, { book: "JHN", chapter: 3 });
  });
}
