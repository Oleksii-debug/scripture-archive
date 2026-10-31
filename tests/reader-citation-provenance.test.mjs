import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const textStart = source.indexOf("function readerCitationText(");
const textEnd = source.indexOf("\nfunction readerVerseUrl(", textStart);
assert.ok(textStart >= 0 && textEnd > textStart, "canonical edition citation helper exists");
const readerCitationText = vm.runInNewContext(source.slice(textStart, textEnd) + "\n;readerCitationText");
const clickStart = source.indexOf('document.querySelector(".verses")?.addEventListener("click"');
const clickEnd = source.indexOf('document.querySelector(".reader-aside")?.insertAdjacentHTML', clickStart);
assert.ok(clickStart >= 0 && clickEnd > clickStart, "citation is mounted in the real reader after chapter text");
const listenerCode = source.slice(clickStart, clickEnd);

function deferred() {
  let resolve, reject;
  const promise = new Promise((a, b) => { resolve = a; reject = b; });
  return { promise, resolve, reject };
}

function harness({ clipboard, active = true, rawVerse = "2", guard = { invalidated: false } } = {}) {
  const copied = [];
  const guardCalls = [];
  let locked = 0, failClosed = 0, invalidated = 0;
  const state = { currentReader: { active: true }, mission: { active: true } };
  let listener;
  const button = { isConnected: true, dataset: { verseCite: rawVerse } };
  const panel = { addEventListener(name, handler) { assert.equal(name, "click"); listener = handler; } };
  const status = { textContent: "previous status" };
  const document = { querySelector(selector) {
    if (selector === ".verses") return panel;
    if (selector === "#reader-cite-status") return status;
    return null;
  }};
  const editionInfo = {
    title: "Verified Scripture edition", license: "CC BY-SA 4.0",
    source: "https://example.org/edition", attribution: "Original translation attribution",
  };
  const verses = ["one", "two", "three"];
  const context = {
    document, readerStillCurrent: () => active, verses, editionInfo,
    citationCopy: { done: "Verse copied", error: "Copy failed" },
    navigator: { clipboard: clipboard === null ? null : { writeText: async text => {
      if (clipboard) return clipboard(text);
      copied.push(text);
    } } },
    readerCitationText,
    attemptRequest: async (...args) => {
      guardCalls.push(args);
      return typeof guard === "function" ? guard(...args) : guard;
    },
    state,
    forgetActiveAttempt: () => { invalidated += 1; },
    renderLockedChapter: () => { locked += 1; },
    shell: () => { failClosed += 1; },
    t: () => "Reader unavailable",
    readerVerseUrl: (book, chapter, verse) => `/reader/${book}/${chapter}?verse=${verse}`,
    bibleText: v => v,
    bookTitle: book => book.title,
    meta: { code: "GEN", title: "Genesis" },
    chapter: 12, location: { origin: "https://scripture-archive.com" }, URL,
  };
  vm.runInNewContext(listenerCode, context);
  return {
    copied, status, button, guardCalls, state,
    get locked() { return locked; },
    get failClosed() { return failClosed; },
    get invalidated() { return invalidated; },
    setActive(value) { active = value; },
    detach() { button.isConnected = false; },
    press: () => listener({ target: { closest: () => button } }),
    pressOutside: () => listener({ target: { closest: () => null } }),
  };
}

test("a citation contains exact passage, licensed edition, primary attribution/source and a verse permalink", () => {
  const output = readerCitationText(
    "Genesis 12:2.", "A local source verse",
    { title: "Ohiienko", license: "CC BY-SA 4.0", source: "https://example.org/ohienko", attribution: "Attribution" },
    "https://scripture-archive.com/reader/GEN/12?verse=2",
  );
  assert.equal(output,
    "Genesis 12:2. A local source verse\nOhiienko · CC BY-SA 4.0\nAttribution\nhttps://example.org/ohienko\nhttps://scripture-archive.com/reader/GEN/12?verse=2");
});

test("public-domain citation retains edition and source without inventing attribution", () => {
  const output = readerCitationText("Genesis 1:1.", "Text", { title: "Public edition", license: "Public Domain", source: "https://example.org" }, "https://scripture-archive.com/reader/GEN/1?verse=1");
  assert.equal(output.split("\n").length, 4);
  assert.match(output, /Public Domain/);
});

test("native reader click copies the exact verse plus edition and announces completion", async () => {
  const h = harness();
  await h.press();
  assert.equal(h.copied.length, 1);
  assert.match(h.copied[0], /^Genesis 12:2\. two\nVerified Scripture edition · CC BY-SA 4\.0/);
  assert.match(h.copied[0], /Original translation attribution/);
  assert.match(h.copied[0], /https:\/\/scripture-archive\.com\/reader\/GEN\/12\?verse=2/);
  assert.equal(h.status.textContent, "Verse copied");
});

test("primary verse citation rechecks chapter authorization before clipboard disclosure", async () => {
  const h = harness();
  await h.press();
  assert.equal(h.guardCalls.length, 1);
  assert.equal(h.guardCalls[0][0], "chapter");
  assert.equal(h.guardCalls[0][1], "POST");
  assert.equal(h.guardCalls[0][2].book, "GEN");
  assert.equal(h.guardCalls[0][2].chapter, 12);
  assert.equal(h.copied.length, 1);
});

test("active assessment locks the primary reader without copying its verse", async () => {
  const h = harness({ guard: { invalidated: true } });
  await h.press();
  assert.equal(h.copied.length, 0);
  assert.equal(h.locked, 1);
  assert.equal(h.invalidated, 1);
  assert.equal(h.state.currentReader, null);
  assert.equal(h.state.mission, null);
  assert.equal(h.failClosed, 0);
});

test("malformed or rejected chapter checks fail closed; a fresh authorized reader recovers", async () => {
  for (const guard of [null, {}, { invalidated: "false" }, () => { throw Error("D1 unavailable"); }]) {
    const h = harness({ guard });
    await h.press();
    assert.equal(h.copied.length, 0);
    assert.equal(h.failClosed, 1);
    assert.equal(h.locked, 0);
    assert.equal(h.state.currentReader, null);
  }
  const recovered = harness();
  await recovered.press();
  assert.equal(recovered.copied.length, 1);
  assert.equal(recovered.failClosed, 0);
});

test("late chapter checks cannot copy or fail-close a newer principal or detached reader", async () => {
  for (const retire of ["principal", "detached"]) {
    const pending = deferred();
    const h = harness({ guard: () => pending.promise });
    const work = h.press();
    if (retire === "principal") h.setActive(false);
    else h.detach();
    pending.resolve({ invalidated: true });
    await work;
    assert.equal(h.copied.length, 0);
    assert.equal(h.locked, 0);
    assert.equal(h.failClosed, 0);
  }
});

test("fake or out-of-bounds chapter verse data can never reach clipboard", async () => {
  for (const input of ["", "0", "-1", "2e0", "02", "2.0", "4", "Infinity", "999999999999999999999"]) {
    const h = harness({ rawVerse: input });
    await h.press();
    assert.equal(h.copied.length, 0, input);
    assert.equal(h.status.textContent, "previous status", input);
  }
});

test("a click outside the citation control never copies", async () => {
  const h = harness();
  await h.pressOutside();
  assert.equal(h.copied.length, 0);
});

test("missing clipboard capability gives a localized accessible status instead of a fake success", async () => {
  const h = harness({ clipboard: null });
  await h.press();
  assert.equal(h.status.textContent, "Copy failed");
  assert.equal(h.copied.length, 0);
});

test("failed clipboard write is surfaced in the existing live region", async () => {
  const h = harness({ clipboard: async () => { throw Error("PermissionDenied"); } });
  await h.press();
  assert.equal(h.status.textContent, "Copy failed");
});

test("late clipboard reply after reader navigation cannot announce into the next page", async () => {
  const gate = deferred();
  const h = harness({ clipboard: () => gate.promise });
  const work = h.press();
  await Promise.resolve();
  h.setActive(false);
  h.status.textContent = "New reader status";
  gate.resolve();
  await work;
  assert.equal(h.status.textContent, "New reader status");
});

test("detached copied-verse button cannot announce after the clipboard response", async () => {
  const gate = deferred();
  const h = harness({ clipboard: () => gate.promise });
  const work = h.press();
  await Promise.resolve();
  h.detach();
  h.status.textContent = "Next page";
  gate.resolve();
  await work;
  assert.equal(h.status.textContent, "Next page");
});

test("reader HTML uses native keyboard buttons and a screen-reader status in each UI language", () => {
  assert.match(source, /class="verse-cite" data-verse-cite="\$\{i \+ 1\}"/);
  assert.match(source, /aria-label="\$\{esc\(citationCopy.label\)\}/);
  assert.match(source, /id="reader-cite-status" role="status" aria-live="polite"/);
  for (const marker of ["Цитувати", "Цитировать", "Cite", "Копіювати вірш із джерелом", "Copy verse with source"])
    assert.ok(source.includes(marker), marker);
});
