import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

// Run the real canonical group page functions with deferred I/O. A late response
// must not restore a previous account's private groups or a departed route.
const source = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const start = source.indexOf("function groupPageCurrent(");
const directoryStart = source.indexOf("async function renderGroups()", start);
const detailStart = source.indexOf("async function renderGroup(groupId)", directoryStart);
const end = source.indexOf("function renderAttemptResult(", detailStart);
assert.ok(start > 0 && directoryStart > start && detailStart > directoryStart && end > detailStart,
  "canonical group reader guard and route functions must remain wired");
const production = source.slice(start, end) + "\n;({renderGroups,renderGroup})";

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}
function fixture({ path = "/groups", groupRequest, getCatalog = async () => ({ books: { en: [] } }) } = {}) {
  const state = { lang: "en", user: { id: "alice", profileComplete: true } };
  const location = { hash: "", pathname: path };
  const html = [];
  let catalogReads = 0;
  const api = vm.runInNewContext(production, {
    state, location,
    groupRequest,
    getCatalog: async () => { catalogReads++; return getCatalog(); },
    setActiveNav() {},
    document: { querySelector: () => null },
    shell(value) { html.push(value); },
    esc: value => String(value),
    bookTitle: book => book.title,
    t: key => key,
  });
  return {
    ...api, state, location, html,
    catalogReads: () => catalogReads,
    otherAccount() { state.user = { id: "bob", profileComplete: true }; },
  };
}

test("late private group-directory response cannot paint another account's memberships", async () => {
  const mine = deferred();
  const started = deferred();
  const h = fixture({
    groupRequest: async (_action, _method, _body, query) => {
      if (query === "mine=1") { started.resolve(); return mine.promise; }
      return { groups: [] };
    },
  });
  const work = h.renderGroups();
  await started.promise;
  h.otherAccount();
  mine.resolve({ groups: [{ id: "private-alice", name: "Alice-only meeting" }] });
  await work;
  assert.deepEqual(h.html, [], "the old account's group list must not be rendered");
});

test("late group detail response cannot paint the previous account's invite and reflection", async () => {
  const request = deferred();
  const h = fixture({ path: "/groups/private-alice", groupRequest: async () => request.promise });
  const work = h.renderGroup("private-alice");
  h.otherAccount();
  request.resolve({ group: { name: "Private Alice" }, sessions: [{ reflection: "SECRET-ALICE" }] });
  await work;
  assert.equal(h.catalogReads(), 0, "stale group details must not trigger another read");
  assert.deepEqual(h.html, []);
});

test("old detail response cannot replace a different route without any account change", async () => {
  const request = deferred();
  const h = fixture({ path: "/groups/private-alice", groupRequest: async () => request.promise });
  const work = h.renderGroup("private-alice");
  h.location.pathname = "/account";
  request.resolve({ group: { name: "Private Alice" } });
  await work;
  assert.deepEqual(h.html, []);
});

test("account switch during catalog load also suppresses a previously authorized group page", async () => {
  const catalog = deferred(), started = deferred();
  const h = fixture({
    path: "/groups/private-alice",
    groupRequest: async () => ({ group: { name: "Private Alice" }, sessions: [] }),
    getCatalog: async () => { started.resolve(); return catalog.promise; },
  });
  const work = h.renderGroup("private-alice");
  await started.promise;
  h.otherAccount();
  catalog.resolve({ books: { en: [{ code: "GEN", title: "Genesis" }] } });
  await work;
  assert.deepEqual(h.html, []);
});

test("hash router is accepted for the same owner, but not when the route is replaced", () => {
  const state = { user: { id: "alice" } };
  const location = { hash: "#/groups/private-alice", pathname: "/" };
  const guard = vm.runInNewContext(source.slice(start, directoryStart) + "\n;groupPageCurrent", { state, location });
  assert.equal(guard("groups/private-alice", state.user), true);
  location.hash = "#/groups/private-bob";
  assert.equal(guard("groups/private-alice", state.user), false);
});

test("the current public group directory still renders normally", async () => {
  const h = fixture({ groupRequest: async () => ({ groups: [] }) });
  h.state.user.profileComplete = false;
  await h.renderGroups();
  assert.equal(h.html.length, 1);
  assert.match(h.html[0], /groups-hero/);
});
