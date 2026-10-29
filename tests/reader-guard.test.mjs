import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
const reader = source.slice(source.indexOf("async function renderReader("), source.indexOf("async function renderMissions("));

function harness(reply, loadBook) {
  const events = [];
  const context = vm.createContext({
    state: { lang: "uk", reader: {}, mission: { cached: true } },
    setActiveNav() {},
    getCatalog: async () => ({ books: { uk: [{ code: "GEN", chapters: 50 }] } }),
    selectedEdition: () => ({ id: "test" }),
    localStorage: { setItem() {} },
    sessionStorage: { removeItem: key => events.push(["remove", key]) },
    attemptRequest: async (...args) => { events.push(["request", ...args]); return reply(); },
    getBook: async () => { events.push(["load-text"]); if (loadBook) return loadBook(); throw Error("text boundary"); },
    renderLockedChapter: (...args) => events.push(["locked", ...args]),
    shell: html => events.push(["render", html]),
    t: key => key,
  });
  vm.runInContext(reader, context);
  return { context, events, run: () => context.renderReader(["reader", "GEN", "12"]) };
}

test("reader never loads chapter text when the server check fails", async () => {
  const h = harness(() => { throw Error("network unavailable"); });
  await h.run();
  assert.equal(h.events.some(event => event[0] === "load-text"), false);
  assert.match(h.events.find(event => event[0] === "render")[1], /role="alert"/);
  assert.equal(h.context.state.currentReader, null);
});

test("reader uses the invalidating POST and clears stale mission metadata", async () => {
  const h = harness(() => ({ invalidated: true }));
  await h.run();
  assert.deepEqual(JSON.parse(JSON.stringify(h.events[0])), ["request", "chapter", "POST", { book: "GEN", chapter: 12 }]);
  assert.equal(h.events.some(event => event[0] === "load-text"), false);
  assert.equal(h.context.state.mission, null);
  assert.equal(h.context.state.currentReader, null);
  assert.deepEqual(h.events.find(event => event[0] === "locked"), ["locked", "GEN", 12]);
});

test("reader refuses malformed guard responses instead of opening the chapter", async () => {
  for (const reply of [null, {}, { invalidated: "false" }, { invalidated: 0 }]) {
    const h = harness(() => reply);
    await h.run();
    assert.equal(h.events.some(event => event[0] === "load-text"), false);
    assert.match(h.events.find(event => event[0] === "render")[1], /role="alert"/);
  }
});

test("reader loads text only after the server permits reading", async () => {
  const h = harness(() => ({ invalidated: false }));
  await assert.rejects(h.run(), /text boundary/);
  assert.equal(h.events.at(-1)[0], "load-text");
  assert.equal(h.events[0][0], "request");
});

test("locked mission navigation renders in every language without passage metadata", async () => {
  const copy = source.slice(source.indexOf("const ATTEMPT_COPY ="), source.indexOf("const attemptChannel ="));
  const missions = source.slice(source.indexOf("async function renderMissions("), source.indexOf("async function groupRequest("));
  for (const lang of ["uk", "ru", "en"]) {
    let html;
    const context = vm.createContext({ state: { lang }, setActiveNav() {}, getMission: async () => ({ locked: true, taskCount: 5 }), sessionStorage: { getItem: () => "opaque-attempt-id" }, shell: value => { html = value; } });
    vm.runInContext(copy + missions, context);
    await context.renderMissions();
    assert.match(html, /href="\/mission\/attempt\/opaque-attempt-id"/);
    assert.doesNotMatch(html, /OT-AB-01|GEN|Abraham|Авраам|Буття|Бытие|Genesis/);
  }
});

test("reader rechecks after its async book fetch and invalidates an attempt started during loading",async()=>{
  let checks=0;
  const h=harness(()=>({invalidated:++checks===2}),()=>({get chapters(){throw Error("must not expose text");}}));
  await h.run();
  assert.equal(checks,2);
  assert.deepEqual(h.events.filter(e=>e[0]==="request").map(e=>e[1]),["chapter","chapter"]);
  assert.equal(h.events.filter(e=>e[0]==="load-text").length,1);
  assert.deepEqual(h.events.find(e=>e[0]==="locked"),["locked","GEN",12]);
  assert.equal(h.context.state.currentReader,null);
});

test("reader refuses a malformed second guard without reading JSON verses",async()=>{
  let checks=0;
  const h=harness(()=>++checks===1?{invalidated:false}:{},()=>({get chapters(){throw Error("must not expose text");}}));
  await h.run();
  assert.equal(checks,2);
  assert.match(h.events.find(e=>e[0]==="render")[1],/role="alert"/);
  assert.equal(h.context.state.currentReader,null);
});

test("reader never overwrites a newer screen after slow book load",async()=>{
  let release;
  const pending=new Promise(resolve=>{release=resolve;});
  const h=harness(()=>({invalidated:false}),()=>pending);
  const run=h.run();
  for(let i=0;i<12;i++) await Promise.resolve();
  h.context.state.currentReader=null;
  release({get chapters(){throw Error("stale result must not be used");}});
  await run;
  assert.equal(h.events.filter(e=>e[0]==="request").length,1);
  assert.equal(h.events.some(e=>e[0]==="render"||e[0]==="locked"),false);
});
