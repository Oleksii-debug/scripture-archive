import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// Execute the canonical reader entry through its group-context selection.
// The server remains the authority for membership and group-ID validity.
const source = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const start = source.indexOf("async function renderReader(parts) {");
const end = source.indexOf("  const readerContext = state.currentReader;", start);
assert.ok(start >= 0 && end > start, "canonical reader entry is available");
const entry = source.slice(start, end) +
  "\n  return { book: meta.code, chapter, groupId };\n}";

function harness(lang) {
  const notices = [];
  const state = {
    lang, user: { id: "reader-a" },
    reader: { book: "JHN", chapter: 3 },
    currentReader: { book: "JHN", chapter: 3 },
  };
  const location = { pathname: "/reader", search: "", hash: "" };
  const catalog = { books: { [lang]: [
    { code: "GEN", chapters: 50 },
    { code: "JHN", chapters: 21 },
  ] } };
  const render = new Function(
    "state", "location", "setActiveNav", "getCatalog",
    "selectedEdition", "readerChapterNumber", "shell", "t",
    entry + "\nreturn renderReader;",
  )(
    state, location, () => {}, async () => catalog,
    () => ({ id: "local" }),
    (raw, max) => Math.min(Math.max(Number(raw) || 1, 1), max),
    html => notices.push(html),
    key => ({ errorLoad: "Cannot load", reader: "Reader" })[key],
  );
  return {
    state, notices,
    async open(...parts) {
      location.pathname = "/" + parts.join("/");
      return render(parts);
    },
  };
}

for (const lang of ["uk", "ru", "en"]) {
  test(lang + ": malformed group suffix never aliases personal reading", async () => {
    for (const suffix of [
      ["group"], ["group", ""], ["group", "g-1", "extra"],
      ["groups", "g-1"], ["g-1"], ["grouping", "g-1"],
      ["other", "g-1"], ["group", "g-1", "group", "g-2"],
    ]) {
      const h = harness(lang);
      const result = await h.open("reader", "GEN", "3", ...suffix);
      assert.equal(result, undefined, JSON.stringify(suffix));
      assert.equal(h.state.currentReader, null, JSON.stringify(suffix));
      assert.deepEqual(h.state.reader, { book: "JHN", chapter: 3 });
      assert.equal(h.notices.length, 1);
      assert.match(h.notices[0], /role="alert"/);
      assert.match(h.notices[0], /href="\\/reader"/);
    }
  });

  test(lang + ": valid group context and personal reader remain distinct", async () => {
    const group = harness(lang);
    assert.deepEqual(
      await group.open("reader", "GEN", "3", "group", "g_123"),
      { book: "GEN", chapter: 3, groupId: "g_123" },
    );
    assert.deepEqual(group.notices, []);

    const personal = harness(lang);
    assert.deepEqual(
      await personal.open("reader", "GEN", "3"),
      { book: "GEN", chapter: 3, groupId: "" },
    );
    assert.deepEqual(personal.notices, []);

    const resume = harness(lang);
    assert.deepEqual(
      await resume.open("reader"),
      { book: "JHN", chapter: 3, groupId: "" },
    );
  });
}

test("group route admission runs before chapter attempt and book loading", () => {
  const guard = source.indexOf("  const validGroupRoute =", start);
  const attempt = source.indexOf('    const attemptState = await attemptRequest("chapter"', start);
  const load = source.indexOf("    book = await getBook(meta.code);", start);
  assert.ok(guard > start && attempt > guard && load > attempt);
  assert.match(source.slice(guard, attempt), /state\\.currentReader = null/);
  assert.match(source.slice(guard, attempt), /role="alert"/);
});
