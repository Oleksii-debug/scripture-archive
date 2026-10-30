import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
const code = source.slice(source.indexOf("const bookmarkCopy ="), source.indexOf("attemptChannel?.addEventListener"));

function harness({ signedIn = true, fail = false, delayedRead = false } = {}) {
  let handler, current = [], writes = 0, releaseRead;
  const readGate = delayedRead ? new Promise(resolve => { releaseRead = resolve; }) : null;
  const state = { lang: "en", user: signedIn ? { id: "one" } : null, currentReader: { book: "GEN", chapter: 12 } };
  const button = { disabled: false, focus() {}, addEventListener(_name, fn) { handler = fn; } };
  const status = { textContent: "" };
  const panel = { isConnected: true, innerHTML: "", querySelector(selector) { return selector === "#toggle-bookmark" ? button : status; } };
  const context = vm.createContext({
    document: { querySelector: () => panel }, state,
    bookTitle: book => book.title, esc: text => String(text).replaceAll("&", "&amp;").replaceAll("<", "&lt;"),
    fetch: async (_url, options = {}) => {
      if (!options.method && readGate) await readGate;
      if (fail) throw Error("offline");
      if (options.method) {
        writes++;
        const item = JSON.parse(options.body);
        current = options.method === "PUT" ? [item] : [];
      }
      return { ok: true, async json() { return { bookmarks: current }; } };
    },
  });
  vm.runInContext(code, context);
  return {
    panel, button, writes: () => writes,
    seedBookmarks: rows => { current = rows; },
    changeAccount: id => { state.user = id ? { id } : null; },
    changeChapter: chapter => { state.currentReader = { book: "GEN", chapter }; },
    finishRead: () => releaseRead?.(),
    mount: ({ book = "GEN", chapter = 12, edition = "en-web", books = [{ code: "GEN", title: "Genesis", chapters: 50 }] } = {}) => context.mountReaderBookmarks({ code: book }, chapter, { id: edition }, books),
    click: () => handler({ currentTarget: button }),
  };
}

test("signed-in reader can save and remove a chapter bookmark", async () => {
  const h = harness();
  await h.mount();
  assert.match(h.panel.innerHTML, /Bookmark this chapter/);
  await h.click();
  assert.match(h.panel.innerHTML, /Remove this bookmark/);
  assert.match(h.panel.innerHTML, /\/reader\/GEN\/12/);
  await h.click();
  assert.match(h.panel.innerHTML, /No bookmarks in this edition/);
  assert.equal(h.writes(), 2);
});

test("signed-out reader is asked to sign in and no bookmark is written", async () => {
  const h = harness({ signedIn: false });
  await h.mount();
  assert.match(h.panel.innerHTML, /Sign in/);
  assert.equal(h.writes(), 0);
});

test("failed bookmark loading shows an accessible error", async () => {
  const h = harness({ fail: true });
  await h.mount();
  assert.match(h.panel.innerHTML, /role="alert"/);
});

test("a late bookmark response cannot paint the previous account into a new session", async () => {
  const h = harness({ delayedRead: true });
  const pending = h.mount();
  // The reader panel can remain connected during a session refresh. Its
  // previous principal is no longer authorized to publish bookmark data.
  h.changeAccount("two");
  h.finishRead();
  await pending;
  assert.equal(h.panel.innerHTML, "", "stale response must not render old account UI");
  assert.equal(h.writes(), 0);
});

test("a late bookmark read failure cannot overwrite another account's UI", async () => {
  const h = harness({ delayedRead: true, fail: true });
  const pending = h.mount();
  h.panel.innerHTML = "<p>New account view</p>";
  h.changeAccount(null);
  h.finishRead();
  await pending;
  assert.equal(h.panel.innerHTML, "<p>New account view</p>");
  assert.equal(h.writes(), 0);
});

test("a bookmark click bound to an earlier account cannot mutate the next account", async () => {
  const h = harness();
  await h.mount();
  assert.match(h.panel.innerHTML, /Bookmark this chapter/);
  h.changeAccount("two");
  await h.click();
  assert.equal(h.writes(), 0, "old principal's click handler must not send a write");
});

test("a delayed bookmark read cannot paint another chapter for the SAME signed-in user", async () => {
  const h = harness({ delayedRead: true });
  const pending = h.mount();
  h.panel.innerHTML = "<p>New chapter 13 view</p>";
  h.changeChapter(13);
  h.finishRead();
  await pending;
  assert.equal(h.panel.innerHTML, "<p>New chapter 13 view</p>");
  assert.equal(h.writes(), 0);
});

test("a delayed bookmark load failure cannot replace another chapter's error/status", async () => {
  const h = harness({ delayedRead: true, fail: true });
  const pending = h.mount();
  h.panel.innerHTML = "<p>New chapter ready</p>";
  h.changeChapter(13);
  h.finishRead();
  await pending;
  assert.equal(h.panel.innerHTML, "<p>New chapter ready</p>");
});

test("a bookmark click from an old chapter cannot mutate the next chapter", async () => {
  const h = harness();
  await h.mount();
  h.changeChapter(13);
  await h.click();
  assert.equal(h.writes(), 0, "old chapter handler must not issue a bookmark write");
});

test("corrupted, out-of-range or null bookmark rows never hide valid reader links", async () => {
  const h = harness();
  h.seedBookmarks([
    null, {}, { edition: "en-web", book: "GEN", chapter: 51 },
    { edition: "en-web", book: "GEN", chapter: Number.MAX_SAFE_INTEGER },
    { edition: "en-web", book: "GEN", chapter: "12" },
    { edition: "en-web", book: "GEN", chapter: 12 },
    { edition: "en-web", book: "GEN", chapter: 50 },
  ]);
  await h.mount();
  assert.match(h.panel.innerHTML, /\/reader\/GEN\/12/);
  assert.match(h.panel.innerHTML, /\/reader\/GEN\/50/);
  assert.doesNotMatch(h.panel.innerHTML, /\/reader\/GEN\/51/);
  assert.doesNotMatch(h.panel.innerHTML, /9007199254740991/);
  assert.doesNotMatch(h.panel.innerHTML, /role="alert"/);
});

test("bookmark ranges use the selected edition book, not the English chapter count", async () => {
  const h = harness();
  h.seedBookmarks([
    { edition: "uk-ohiienko", book: "JOL", chapter: 4 },
    { edition: "uk-ohiienko", book: "JOL", chapter: 5 },
  ]);
  await h.mount({
    book: "JOL", chapter: 4, edition: "uk-ohiienko",
    books: [{ code: "JOL", title: "Joel", chapters: 4 }],
  });
  assert.match(h.panel.innerHTML, /\/reader\/JOL\/4/);
  assert.doesNotMatch(h.panel.innerHTML, /\/reader\/JOL\/5/);
});
