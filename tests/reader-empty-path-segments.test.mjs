import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// Execute the canonical reader entry. No duplicated route parser or fake API.
const source = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const start = source.indexOf("async function renderReader(parts) {");
const end = source.indexOf("  const readerContext = state.currentReader;", start);
assert.ok(start >= 0 && end > start, "canonical reader entry exists");
const entry = source.slice(start, end) +
  "\n  return { book: meta.code, chapter, groupId };\n}";

function harness(lang, path, legacy = false) {
  const notices = [];
  let catalogCalls = 0;
  const state = {
    lang, user: null, reader: { book: "JHN", chapter: 3 },
    currentReader: { book: "JHN", chapter: 3 },
  };
  const location = {
    pathname: legacy ? "/" : "/" + path,
    hash: legacy ? "#/" + path : "",
    search: "",
  };
  // This mirrors the existing route() split/filter and deliberately exposes
  // the empty-segment aliasing that must be rejected by renderReader.
  const parts = path.split("/").filter(Boolean);
  const reader = new Function(
    "state", "location", "setActiveNav", "getCatalog", "selectedEdition",
    "readerChapterNumber", "shell", "t",
    entry + "\nreturn renderReader;",
  )(
    state, location, () => {},
    async () => {
      catalogCalls += 1;
      return { books: { [lang]: [
        { code: "GEN", chapters: 50 }, { code: "JHN", chapters: 21 },
      ] } };
    },
    () => ({ id: "local" }),
    (raw, max) => Math.min(Math.max(Number(raw) || 1, 1), max),
    html => notices.push(html),
    key => ({ errorLoad: "Cannot load", reader: "Reader" })[key],
  );
  return {
    state, notices, get catalogCalls() { return catalogCalls; },
    open: () => reader(parts),
  };
}

for (const lang of ["uk", "ru", "en"]) {
  for (const legacy of [false, true]) {
    const mode = legacy ? "legacy hash" : "pathname";
    test(`${lang}: ${mode} empty interior or leading reader segments fail closed`, async () => {
      for (const path of [
        "/reader/GEN/3",
        "reader//GEN/3",
        "reader/GEN//3",
        "reader/GEN/3//",
        "reader/GEN/3//group/g_123",
        "reader/GEN/3/group//g_123",
      ]) {
        const h = harness(lang, path, legacy);
        assert.equal(await h.open(), undefined, path);
        assert.equal(h.catalogCalls, 0, path + ": no catalog/attempt access");
        assert.equal(h.state.currentReader, null, path);
        assert.deepEqual(h.state.reader, { book: "JHN", chapter: 3 }, path);
        assert.equal(h.notices.length, 1, path);
        assert.match(h.notices[0], /role="alert"/, path);
        assert.match(h.notices[0], /href="\/reader"/, path);
      }
    });

    test(`${lang}: ${mode} valid personal/group and single trailing slash remain readable`, async () => {
      for (const [path, groupId] of [
        ["reader/GEN/3", ""],
        ["reader/GEN/3/", ""],
        ["reader/GEN/3/group/g_123", "g_123"],
      ]) {
        const h = harness(lang, path, legacy);
        assert.deepEqual(await h.open(), { book: "GEN", chapter: 3, groupId }, path);
        assert.equal(h.catalogCalls, 1, path);
        assert.deepEqual(h.notices, [], path);
      }
    });
  }
}

test("malformed route rejection precedes catalog, chapter attempt and saved reader mutation", () => {
  const guard = source.indexOf('  if (readerPath.startsWith("/") || readerPath.includes("//")) {', start);
  const catalog = source.indexOf("  const catalog = await getCatalog();", start);
  const attempt = source.indexOf('    const attemptState = await attemptRequest("chapter"', start);
  assert.ok(guard > start && guard < catalog && catalog < attempt);
  assert.match(source.slice(guard, catalog), /state\.currentReader = null/);
  assert.match(source.slice(guard, catalog), /role="alert"/);
});
