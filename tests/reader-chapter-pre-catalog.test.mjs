import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// Execute the canonical reader entry, not a copied chapter validator.
// A malformed URL is a route error even when the catalogue service is down.
const source = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const start = source.indexOf("async function renderReader(parts) {");
const end = source.indexOf("  const readerContext = state.currentReader;", start);
assert.ok(start >= 0 && end > start, "canonical reader entry exists");
const entry = source.slice(start, end) +
  "\n  return {book: meta.code, chapter, groupId};\n}";
const makeReader = new Function(
  "state", "location", "setActiveNav", "getCatalog", "selectedEdition",
  "readerChapterNumber", "shell", "t", entry + "\nreturn renderReader;",
);

function harness(lang, path, legacy, unavailable) {
  const state = {
    lang, user: null, reader: { book: "JHN", chapter: 3 },
    currentReader: { book: "JHN", chapter: 3 },
  };
  const notices = [];
  let catalogCalls = 0;
  const location = {
    pathname: legacy ? "/" : "/" + path,
    search: "", hash: legacy ? "#/" + path : "",
  };
  const parts = path.split("/").filter(Boolean);
  const reader = makeReader(
    state, location, () => {},
    async () => {
      catalogCalls++;
      if (unavailable) throw new Error("catalogue unavailable");
      return { books: { [lang]: [
        { code: "GEN", chapters: 50 }, { code: "JHN", chapters: 21 },
      ] } };
    },
    () => ({ id: "local" }),
    (raw, max) => Math.min(Number(raw) || 1, max),
    markup => notices.push(markup),
    key => ({ errorLoad: "Cannot load", reader: "Reader" })[key],
  );
  return { state, notices, get catalogCalls() { return catalogCalls; },
    open: () => reader(parts) };
}

for (const lang of ["uk", "ru", "en"]) {
  for (const legacy of [false, true]) {
    const mode = legacy ? "legacy hash" : "pathname";
    test(`${lang}: ${mode} invalid explicit chapter fails before unavailable catalogue`, async () => {
      for (const chapter of ["abc", "0", "01", "-2", "1e2", "1.5",
        "0x10", "9007199254740992", "%20", "1%2F2"]) {
        const h = harness(lang, `reader/GEN/${chapter}`, legacy, true);
        assert.equal(await h.open(), undefined, chapter);
        assert.equal(h.catalogCalls, 0, chapter + ": no remote catalogue access");
        assert.equal(h.state.currentReader, null, chapter);
        assert.deepEqual(h.state.reader, { book: "JHN", chapter: 3 }, chapter);
        assert.equal(h.notices.length, 1, chapter);
        assert.match(h.notices[0], /role="alert"/, chapter);
        assert.match(h.notices[0], /href="\/reader"/, chapter);
      }
    });

    test(`${lang}: ${mode} valid chapter and saved-reader recovery still read catalogue`, async () => {
      for (const [path, expected] of [
        ["reader/GEN/3", 3],
        ["reader/GEN/999", 50],
        ["reader/JHN", 3],
      ]) {
        const h = harness(lang, path, legacy, false);
        assert.deepEqual(await h.open(), {
          book: path.includes("JHN") ? "JHN" : "GEN",
          chapter: expected, groupId: "",
        }, path);
        assert.equal(h.catalogCalls, 1, path);
        assert.deepEqual(h.notices, [], path);
      }
    });
  }
}

test("explicit chapter route guard precedes catalogue and chapter-attempt IO", () => {
  const guard = source.indexOf("  if (parts[2] && (", start);
  const catalog = source.indexOf("  const catalog = await getCatalog();", start);
  const attempt = source.indexOf('    const attemptState = await attemptRequest("chapter"', start);
  assert.ok(start < guard && guard < catalog && catalog < attempt);
  assert.match(source.slice(guard, catalog), /state\.currentReader = null/);
  assert.match(source.slice(guard, catalog), /role="alert"/);
});
