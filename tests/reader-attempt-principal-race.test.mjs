import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

// Execute the actual canonical reader's attempt-start event listener. A
// successful HTTP reply may arrive after a different account becomes active.
const source = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const start = source.indexOf("document.querySelector('#confirm-attempt')?.addEventListener");
const end = source.indexOf('\n  document.querySelector("#uk-spelling")', start);
assert.ok(start > 0 && end > start, "canonical reader attempt-start listener remains mounted");
const activeStart=source.indexOf("function rememberActiveAttempt(");
const activeEnd=source.indexOf("async function getSession() {",activeStart);
assert.ok(activeStart>=0 && activeEnd>activeStart,"canonical assessment storage helper must be present");
const activeHelpers=source.slice(activeStart,activeEnd);

function deferred() {
  let resolve, reject;
  const promise = new Promise((a, b) => { resolve = a; reject = b; });
  return { promise, resolve, reject };
}
function fixture({ response, groupId = "" } = {}) {
  const state = { user: { id: "alice" }, currentReader: { book: "GEN", chapter: 12 }, mission: null };
  const contextReader = state.currentReader, originalPrincipal = state.user;
  const events = [];
  const trigger = { disabled: false }, dialog = { close: () => events.push("close") }, status = { textContent: "" };
  const document = { querySelector: selector => ({
    "#confirm-attempt": trigger, "#attempt-state": status, "#attempt-dialog": dialog
  })[selector] ?? null };
  let listener;
  const context = {
    document,
    readerStillCurrent: () => state.user === originalPrincipal && state.currentReader === contextReader,
    attemptRequest: async (...args) => { events.push(["request", ...args]); return response(...args); },
    sessionStorage: { setItem: (...args) => events.push(["store", ...args]) },
    state,
    meta: { code: "GEN" }, chapter: 12, groupId,
    window: { saAnalytics: { track: (...args) => events.push(["analytics", ...args]) } },
    attemptChannel: { postMessage: (...args) => events.push(["broadcast", ...args]) },
    navigateTo: (...args) => events.push(["navigate", ...args]),
    attemptCopy: { readRequired: "Read the chapter first" },
    t: key => key,
  };
  trigger.addEventListener = (_, fn) => { listener = fn; };
  vm.runInNewContext(activeHelpers+"\n"+source.slice(start, end), context);
  assert.equal(typeof listener, "function");
  return {
    events, state, status, trigger,
    accountSwitch: () => { state.user = { id: "bob" }; },
    readerSwitch: () => { state.currentReader = { book: "EXO", chapter: 1 }; },
    unmount: () => { document.querySelector = () => null; },
    click: () => listener({ preventDefault() {}, currentTarget: trigger }),
  };
}

test("an authenticated same-account response stores attempt, broadcasts, and navigates", async () => {
  const f = fixture({ response: async () => ({ attemptId: "attempt-alice" }) });
  await f.click();
  assert.ok(f.events.some(x => Array.isArray(x) && x[0] === "store" && x[2] === "attempt-alice"));
  assert.ok(f.events.some(x => Array.isArray(x) && x[0] === "broadcast"));
  assert.ok(f.events.some(x => Array.isArray(x) && x[0] === "navigate" && x[1] === "/mission/attempt/attempt-alice"));
  assert.equal(f.state.currentReader, null);
});

test("late successful start for Alice cannot place her attempt in Bob's session", async () => {
  const io = deferred(), f = fixture({ response: () => io.promise });
  const work = f.click();
  f.accountSwitch();
  io.resolve({ attemptId: "private-alice-attempt" });
  await work;
  assert.deepEqual(f.events.map(x => x[0]), ["request"], "stale reply cannot store, announce or navigate");
  assert.equal(f.state.currentReader.book, "GEN");
});

test("stale start rejected after account switch cannot replace a new account's status", async () => {
  const io = deferred(), f = fixture({ response: () => io.promise });
  const work = f.click();
  f.accountSwitch();
  f.status.textContent = "New account";
  io.reject(Error("chapter_must_be_read"));
  await work;
  assert.equal(f.status.textContent, "New account");
  assert.deepEqual(f.events.map(x => x[0]), ["request"]);
});

test("start reply must not navigate after opening a different reader", async () => {
  const io = deferred(), f = fixture({ response: () => io.promise });
  const work = f.click();
  f.readerSwitch();
  io.resolve({ attemptId: "old-reader" });
  await work;
  assert.deepEqual(f.events.map(x => x[0]), ["request"]);
  assert.equal(f.state.currentReader.book, "EXO");
});

test("a removed confirmation dialog cannot publish a delayed attempt result", async () => {
  const io = deferred(), f = fixture({ response: () => io.promise });
  const work = f.click();
  f.unmount();
  io.resolve({ attemptId: "detached" });
  await work;
  assert.deepEqual(f.events.map(x => x[0]), ["request"]);
});

test("an old confirmation event never sends a request under a new principal", async () => {
  const f = fixture({ response: () => { throw Error("must never run"); } });
  f.accountSwitch();
  await f.click();
  assert.deepEqual(f.events, []);
});

test("early reader catalog response cannot initialize a previous user's chapter after switch", async () => {
  const readerStart = source.indexOf("async function renderReader("), readerEnd = source.indexOf("async function renderMissions(", readerStart);
  assert.ok(readerStart > 0 && readerEnd > readerStart);
  const io = deferred();
  const state = { user: { id: "alice" }, lang: "en", reader: {} };
  const events = [];
  const context = vm.createContext({
    state, location: { pathname: "/reader/GEN/12" },
    setActiveNav: value => events.push(value),
    getCatalog: () => io.promise,
    attemptRequest: () => { throw Error("attempt request from stale principal"); },
  });
  vm.runInContext(source.slice(readerStart, readerEnd), context);
  const work = context.renderReader(["reader", "GEN", "12"]);
  state.user = { id: "bob" };
  io.resolve({ books: { en: [{ code: "GEN", chapters: 50 }] } });
  await work;
  assert.deepEqual(events, ["reader"]);
});

test("first chapter preflight reply from previous account must not lock or load the chapter", async () => {
  const readerStart = source.indexOf("async function renderReader("), readerEnd = source.indexOf("async function renderMissions(", readerStart);
  const io = deferred();
  const events = [];
  const state = { user: { id: "alice" }, lang: "en", reader: {}, mission: {} };
  const context = vm.createContext({
    state, location: { pathname: "/reader/GEN/12" },
    setActiveNav() {},
    getCatalog: async () => ({ books: { en: [{ code: "GEN", chapters: 50 }] } }),
    selectedEdition: () => ({ id: "en-web" }),
    readerChapterNumber: (_value, _max) => 12,
    attemptRequest: () => io.promise,
    renderLockedChapter: () => events.push("locked"),
    getBook: () => { events.push("text"); throw Error("should not load"); },
    sessionStorage: { removeItem: () => events.push("session mutation") },
    shell: () => events.push("screen"),
  });
  vm.runInContext(source.slice(readerStart, readerEnd), context);
  const work = context.renderReader(["reader", "GEN", "12"]);
  // Allow the initial catalog await to resume and start the first preflight.
  for (let i = 0; i < 8; i++) await Promise.resolve();
  state.user = { id: "bob" };
  io.resolve({ invalidated: true });
  await work;
  assert.deepEqual(events, []);
});
