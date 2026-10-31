import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const start = source.indexOf("let editorViewEpoch = 0;");
const end = source.indexOf("\nfunction renderPrivacy()", start);
assert.ok(start > 0 && end > start, "canonical editor must own the principal/route boundary");
const production = source.slice(start, end) + "\n;({renderEditor})";

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}
function fixture({ accountRequest = async () => ({ users: [] }), fetch = async () => ({ ok: false }) } = {}) {
  const state = { user: { id: "alice", email: "alice@example.invalid", isOwner: true }, lang: "en", cms: { liveNote: {} } };
  const location = { pathname: "/editor", hash: "" };
  const html = [], activity = [], forms = {}, controls = [{ disabled: false, dataset: { communityControl: "pause" }, onclick: null }];
  let refresh;
  const emptyNode = { insertAdjacentHTML() {}, textContent: "", onsubmit: null };
  const document = {
    hidden: false,
    querySelector(selector) {
      if (selector === "#content-form" || selector === "#managed-content-form") {
        return forms[selector] ||= { onsubmit: null };
      }
      return emptyNode;
    },
    querySelectorAll(selector) { return selector === "[data-community-control]" ? controls : []; },
  };
  const api = vm.runInNewContext(production, {
    state, location, document, main: { querySelector: () => emptyNode },
    editorialPageHidden: false, editorialAwaitingSession: false,
    accountRequest: async (...args) => { activity.push("account:" + args[0]); return accountRequest(...args); },
    fetch: async (...args) => { activity.push("fetch:" + args[0]); return fetch(...args); },
    setActiveNav() {}, clearInterval() {}, communityOwnerRefreshInterval: null,
    setInterval(fn) { refresh = fn; return 1; },
    renderAccount() { activity.push("renderAccount"); },
    shell(value) { html.push(value); },
    field() { return ""; }, t: key => key, esc: x => String(x),
    announce() { activity.push("announce"); },
    Intl, Date, FormData, console,
  });
  return {
    ...api, state, location, document, forms, controls, html, activity,
    refresh: () => refresh?.(),
    otherAccount: (isOwner = false) => { state.user = { id: "bob", email: "bob@example.invalid", isOwner }; },
  };
}

test("owner user list arriving after account replacement does not disclose private directory", async () => {
  const users = deferred();
  const h = fixture({ accountRequest: () => users.promise });
  const work = h.renderEditor();
  h.otherAccount();
  users.resolve({ users: [{ email: "private-alice@example.invalid" }] });
  await work;
  assert.deepEqual(h.html, []);
  assert.deepEqual(h.activity, ["account:users"], "no further owner-only fetches after a principal change");
});

test("owner content response arriving after account replacement does not request analytics or render", async () => {
  const content = deferred(), contentStarted = deferred();
  const h = fixture({ fetch: url => {
    if (url.startsWith("/api/content")) { contentStarted.resolve(); return content.promise; }
    throw Error("Unexpected analytics request after session departure");
  } });
  const work = h.renderEditor();
  await contentStarted.promise;
  h.otherAccount(true);
  content.resolve({ ok: true, json: async () => ({ items: [{ title: "Private editorial draft" }], revisions: [] }) });
  await work;
  assert.deepEqual(h.html, []);
  assert.deepEqual(h.activity, ["account:users", "fetch:/api/content?admin=1"]);
});

test("owner analytics loaded after navigation cannot repaint the account page", async () => {
  const analytics = deferred(), analyticsStarted = deferred();
  const h = fixture({ fetch: url => {
    if (url.startsWith("/api/analytics")) { analyticsStarted.resolve(); return analytics.promise; }
    return { ok: false };
  } });
  const work = h.renderEditor();
  await analyticsStarted.promise;
  h.location.pathname = "/account";
  analytics.resolve({ ok: true, json: async () => ({ accounts: { total: 777 } }) });
  await work;
  assert.deepEqual(h.html, []);
});

test("two owner render requests on one route discard the earlier pending response", async () => {
  const first = deferred(), second = deferred();
  let requests = 0;
  const h = fixture({ accountRequest: () => ++requests === 1 ? first.promise : second.promise });
  const old = h.renderEditor();
  const newer = h.renderEditor();
  first.resolve({ users: [{ email: "stale@example.invalid" }] });
  await old;
  assert.deepEqual(h.html, []);
  h.location.pathname = "/account";
  second.resolve({ users: [] });
  await newer;
  assert.deepEqual(h.html, []);
  assert.equal(requests, 2);
});

test("healthy owner editor still renders and binds its existing forms", async () => {
  const h = fixture();
  await h.renderEditor();
  assert.equal(h.html.length, 1);
  assert.match(h.html[0], /editor-grid/);
  assert.equal(typeof h.forms["#content-form"].onsubmit, "function");
  assert.equal(typeof h.forms["#managed-content-form"].onsubmit, "function");
  assert.equal(typeof h.controls[0].onclick, "function");
});

test("an old owner's retained editor and community controls cannot start writes", async () => {
  const h = fixture();
  await h.renderEditor();
  const oldFetches = h.activity.length;
  h.otherAccount(true);
  await h.forms["#content-form"].onsubmit({ preventDefault() {} });
  await h.forms["#managed-content-form"].onsubmit({ preventDefault() {} });
  await h.controls[0].onclick();
  assert.equal(h.activity.length, oldFetches, "stale controls must not touch owner APIs");
});

test("owner polling callback cannot publish or fetch after sign-out", async () => {
  const h = fixture();
  await h.renderEditor();
  const priorCalls = h.activity.length;
  h.otherAccount();
  await h.refresh();
  assert.equal(h.activity.length, priorCalls);
});

test("non-owner retains the existing owner sign-in flow", async () => {
  const h = fixture();
  h.otherAccount();
  await h.renderEditor();
  assert.ok(h.activity.includes("renderAccount"));
  assert.deepEqual(h.html, []);
});
