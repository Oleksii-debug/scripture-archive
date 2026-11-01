import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const helperStart = source.indexOf("function readerChapterUrl(");
const helperEnd = source.indexOf("function readerVerseFromUrl(", helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, "canonical reader URL helpers exist");
const helpers = source.slice(helperStart, helperEnd);
const { readerChapterUrl, readerVerseUrl } = new Function(
  helpers + "\nreturn { readerChapterUrl, readerVerseUrl };",
)();

test("personal chapter and verse links retain the existing public URL contract", () => {
  assert.equal(readerChapterUrl("GEN", 3), "/reader/GEN/3");
  assert.equal(readerChapterUrl("JHN", 1, ""), "/reader/JHN/1");
  assert.equal(readerVerseUrl("JHN", 3, 16), "/reader/JHN/3?verse=16");
  assert.equal(readerVerseUrl("JHN", 3, 16, ""), "/reader/JHN/3?verse=16");
});

test("group chapter and verse links retain exact group identity", () => {
  const groupId = "g_123";
  for (const chapter of [1, 3, 50]) {
    const chapterUrl = readerChapterUrl("GEN", chapter, groupId);
    assert.equal(chapterUrl, `/reader/GEN/${chapter}/group/g_123`);
    assert.deepEqual(chapterUrl.split("/").filter(Boolean), [
      "reader", "GEN", String(chapter), "group", groupId,
    ]);
    assert.equal(
      readerVerseUrl("GEN", chapter, 7, groupId),
      `${chapterUrl}?verse=7`,
    );
  }
});

test("group ID is a path segment, not untrusted URL syntax", () => {
  const groupId = "g/a?b#c &<";
  assert.equal(
    readerChapterUrl("JHN", 3, groupId),
    "/reader/JHN/3/group/g%2Fa%3Fb%23c%20%26%3C",
  );
  assert.equal(
    readerVerseUrl("JHN", 3, 16, groupId),
    "/reader/JHN/3/group/g%2Fa%3Fb%23c%20%26%3C?verse=16",
  );
  assert.equal(readerChapterUrl("JHN", 3, ""), "/reader/JHN/3");
});

test("all canonical in-reader navigation retains group context", () => {
  const start = source.indexOf("async function renderReader(parts) {");
  const end = source.indexOf("async function renderMissions()", start);
  assert.ok(start >= 0 && end > start);
  const reader = source.slice(start, end);
  // Chapter links and book/chapter selectors must not turn group reading into
  // personal reading; the server still validates group membership on POST.
  for (const expected of [
    'readerChapterUrl(meta.code, chapter - 1, groupId)',
    'readerChapterUrl(meta.code, chapter + 1, groupId)',
    'navigateTo(readerChapterUrl(e.target.value, 1, groupId))',
    'navigateTo(readerChapterUrl(meta.code, e.target.value, groupId))',
    'readerVerseUrl(meta.code, chapter, e.target.value, groupId)',
    'readerChapterUrl(meta.code, chapter, groupId)',
    'readerVerseUrl(meta.code, chapter, i + 1, groupId)',
    'readerVerseUrl(meta.code, chapter, number, groupId)',
    'readerVerseUrl(meta.code, r.chapter, r.verse, groupId)',
  ]) {
    assert.ok(reader.includes(expected), `missing group-aware navigation: ${expected}`);
  }
  assert.ok(reader.includes("const groupId = validGroupRoute ? parts[4] : \"\";"));
  assert.ok(reader.includes("groupId: groupId || undefined"));
});

test("actual reader HTML keeps group chapter and verse anchors", () => {
  const start = source.indexOf("async function renderReader(parts) {");
  const end = source.indexOf("async function renderMissions()", start);
  const reader = source.slice(start, end);
  const markupStart = reader.indexOf('  shell(\\n    `<div class=');
  const markupEnd = reader.indexOf("\\n  );", markupStart);
  assert.ok(markupStart >= 0 && markupEnd > markupStart);
  const markupCall = reader.slice(markupStart, markupEnd + 5);
  const renderMarkup = new Function(
    "shell", "t", "meta", "chapter", "options", "chapters",
    "selectedVerse", "verses", "esc", "bookTitle", "editionInfo",
    "bibleText", "citationCopy", "readerVerseUrl", "readerChapterUrl",
    "editionToggle", "timerCard", "groupId", markupCall,
  );
  function htmlFor(groupId) {
    let html = "";
    renderMarkup(
      value => { html = value; }, key => key,
      { code: "GEN", testament: "OT", chapters: 50 }, 3,
      "<option>GEN</option>", "<option>3</option>", 2,
      ["first", "second"], value => value, () => "Genesis",
      { title: "Edition", license: "License", source: "https://example.test" },
      value => value, { label: "Copy verse", button: "Cite" },
      readerVerseUrl, readerChapterUrl, () => "", () => "", groupId,
    );
    return html;
  }
  const group = htmlFor("g_123");
  for (const link of [
    '/reader/GEN/2/group/g_123',
    '/reader/GEN/4/group/g_123',
    '/reader/GEN/3/group/g_123?verse=1',
    '/reader/GEN/3/group/g_123?verse=2',
  ]) {
    assert.ok(group.includes(`href="${link}"`), `missing group link ${link}`);
  }
  const personal = htmlFor("");
  for (const link of [
    '/reader/GEN/2', '/reader/GEN/4',
    '/reader/GEN/3?verse=1', '/reader/GEN/3?verse=2',
  ]) {
    assert.ok(personal.includes(`href="${link}"`), `missing personal link ${link}`);
  }
  assert.ok(!personal.includes("/group/"));
});
