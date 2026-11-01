import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// Execute the real reader entry up to its first chapter-attempt boundary.
// The catalogue is deliberately unavailable for malformed group URLs: a
// route-shape error must not depend on network/D1 availability.
const source = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const start = source.indexOf("async function renderReader(parts) {");
const end = source.indexOf("  const readerContext = state.currentReader;", start);
assert.ok(start >= 0 && end > start, "canonical reader entry exists");
const entry = source.slice(start, end) +
  "\n  return { book: meta.code, chapter, groupId };\n}";
const makeReader = new Function(
  "state", "location", "setActiveNav", "getCatalog", "selectedEdition",
  "readerChapterNumber", "shell", "t",
  entry + "\nreturn renderReader;",
);

function harness(lang, parts, legacy, catalogueUnavailable) {
  const path = parts.join("/");
  const location = {
    pathname: legacy ? "/" : "/" + path,
    hash: legacy ? "#/" + path : "",
    search: "",
  };
  const state = {
    lang, user: null,
    reader: { book: "JHN", chapter: 3 },
    currentReader: { book: "JHN", chapter: 3 },
  };
  const notices = [];
  let catalogueCalls = 0;
  const reader = makeReader(
    state, location, () => {},
    async () => {
      catalogueCalls++;
      if (catalogueUnavailable) throw Error("catalogue unavailable");
      return { books: { [lang]: [
        { code: "GEN", chapters: 50 }, { code: "JHN", chapters: 21 },
      ] } };
    },
    () => ({ id: "local" }),
    (raw, max) => Math.min(Math.max(Number(raw) || 1, 1), max),
    markup => notices.push(markup),
    key => ({ errorLoad: "Cannot load", reader: "Reader" })[key],
  );
  return { state, notices, get catalogueCalls() { return catalogueCalls; },
    open: () => reader(parts) };
}

for (const lang of ["uk", "ru", "en"]) {
  for (const legacy of [false, true]) {
    const mode = legacy ? "legacy hash" : "pathname";
    test(`${lang}: ${mode} malformed group links fail before catalogue IO`, async () => {
      for (const parts of [
        ["reader", "GEN", "3", "group"],
        ["reader", "GEN", "3", "groups", "g_123"],
        ["reader", "GEN", "3", "group", "g_123", "extra"],
        ["reader", "GEN", "3", "group", ""],
        ["reader", "GEN", "3", "other", "g_123"],
      ]) {
        const h = harness(lang, parts, legacy, true);
        assert.equal(await h.open(), undefined, parts.join("/"));
        assert.equal(h.catalogueCalls, 0, "invalid group URL must not fetch catalogue");
        assert.equal(h.state.currentReader, null, "retire stale reader context");
        assert.deepEqual(h.state.reader, { book: "JHN", chapter: 3 },
          "persisted personal reading must remain unchanged");
        assert.equal(h.notices.length, 1);
        assert.match(h.notices[0], /role="alert"/);
        assert.match(h.notices[0], /href="\\/reader"/);
      }
    });
    test(`${lang}: ${mode} valid personal and group links still use catalogue`, async () => {
      for (const [parts, groupId] of [
        [["reader", "GEN", "3"], ""],
        [["reader", "GEN", "3", "group", "g_123"], "g_123"],
      ]) {
        const h = harness(lang, parts, legacy, false);
        assert.deepEqual(await h.open(), { book: "GEN", chapter: 3, groupId });
        assert.equal(h.catalogueCalls, 1);
        assert.deepEqual(h.notices, []);
      }
    });
  }
}

test("group route shape is rejected before the first catalogue read", () => {
  const gate = source.indexOf("  const validGroupRoute =", start);
  const catalogue = source.indexOf("  const catalog = await getCatalog();", start);
  const attempt = source.indexOf('    const attemptState = await attemptRequest("chapter"', start);
  assert.ok(gate > start && gate < catalogue && catalogue < attempt);
  assert.match(source.slice(gate, catalogue), /state\\.currentReader = null/);
  assert.match(source.slice(gate, catalogue), /role="alert"/);
});
