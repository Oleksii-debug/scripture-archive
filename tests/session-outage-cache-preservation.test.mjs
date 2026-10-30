import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const start = app.indexOf("async function getSession() {");
const end = app.indexOf("async function getBook(", start);
assert.ok(start >= 0 && end > start, "existing canonical session loader");
const getSessionBody = app.slice(start, end);

function fixture(server, previousOwner = "prior-account", current = null) {
  const storage = new Map([["sa.progressOwner", previousOwner]]);
  const calls = { clear: 0, fetch: 0 };
  const state = { user: current, progressSyncStatus: null, sessionUnavailable: false };
  const localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => { storage.set(key, value); },
    removeItem: key => { storage.delete(key); },
  };
  const fetch = async (url, options) => {
    calls.fetch++;
    assert.equal(url, "/api/account?action=me");
    assert.equal(options.cache, "no-store");
    if (server instanceof Error) throw server;
    return {
      ok: server.status === 200,
      json: async () => {
        if (server.body instanceof Error) throw server.body;
        return server.body;
      },
    };
  };
  const clearPersonalProgress = () => { calls.clear++; };
  const getSession = new Function(
    "fetch", "state", "localStorage", "clearPersonalProgress",
    getSessionBody + "\nreturn getSession;"
  )(fetch, state, localStorage, clearPersonalProgress);
  return { getSession, storage, calls, state };
}

for (const server of [
  { status: 503, body: { user: null } },
  { status: 200, body: {} },
  { status: 200, body: { user: {} } },
  { status: 200, body: { user: { id: "" } } },
  { status: 200, body: new Error("invalid-json") },
  new Error("network-offline"),
]) {
  const label = server instanceof Error ? server.message :
    server.status + " " + JSON.stringify(server.body instanceof Error ? "bad-json" : server.body);
  test("uncertain session " + label + " does not erase local history or trust stale private identity", async () => {
    const f = fixture(server, "prior-account", { id: "prior-account" });
    await assert.rejects(f.getSession(), /account_unavailable/);
    assert.equal(f.state.user, null, "private account UI must not trust stale identity");
    assert.equal(f.state.sessionUnavailable, true);
    assert.equal(f.state.progressSyncStatus, "unavailable");
    assert.equal(f.storage.get("sa.progressOwner"), "prior-account");
    assert.equal(f.calls.clear, 0);
    assert.equal(f.calls.fetch, 1);
  });
}

test("validated sign-out clears prior principal and cached local data", async () => {
  const f = fixture({ status: 200, body: { user: null } });
  assert.equal(await f.getSession(), null);
  assert.equal(f.storage.has("sa.progressOwner"), false);
  assert.equal(f.calls.clear, 1);
  assert.equal(f.state.sessionUnavailable, false);
});

test("verified same principal retains account history and ownership", async () => {
  const user = { id: "prior-account", profileComplete: true };
  const f = fixture({ status: 200, body: { user } });
  assert.deepEqual(await f.getSession(), user);
  assert.equal(f.storage.get("sa.progressOwner"), "prior-account");
  assert.equal(f.calls.clear, 0);
});

test("verified principal change clears old person's local cache exactly once", async () => {
  const f = fixture({ status: 200, body: { user: { id: "new-account" } } });
  assert.equal((await f.getSession()).id, "new-account");
  assert.equal(f.calls.clear, 1);
  assert.equal(f.storage.get("sa.progressOwner"), "new-account");
  assert.equal(f.state.sessionUnavailable, false);
});

test("initial shell absorbs transient session read errors and announces outage in all languages", () => {
  assert.match(app, /getSession\(\)\.catch\(\(\) => null\)/);
  assert.match(app, /const sessionAlert = state\.sessionUnavailable \? `<p role="alert">/);
  assert.match(app, /Сервер не підтвердив стан входу/);
  assert.match(app, /Сервер не подтвердил состояние входа/);
  assert.match(app, /The server could not confirm your sign-in state/);
  assert.match(app, /shell\(`\$\{sessionAlert\}<div class="section-head"/);
});
