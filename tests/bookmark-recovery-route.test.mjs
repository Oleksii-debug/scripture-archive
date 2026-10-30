import { validBookmarkTimestamp } from "../lib/bookmark-timestamp.js";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { webcrypto } from "node:crypto";
import { TextEncoder } from "node:util";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { EDITIONS } from "../public/editions.js";

const source = readFileSync(new URL("../app/api/bookmarks/route.ts", import.meta.url), "utf8");
const catalog = JSON.parse(readFileSync(new URL("../public/data/catalog.json", import.meta.url), "utf8"));
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal(compiled.diagnostics?.length ?? 0, 0);

const valid = { recovery_rowid: 5, edition: "en-web", book: "GEN", chapter: 1, created_at: "2026-10-30" };
const damaged = { recovery_rowid: 9, edition: "<img onerror=alert(1)>", book: "GEN", chapter: 999, created_at: "2026-10-30" };

function fixture({ rows = [valid, damaged], owner = "alice", available = true, changes = 1 } = {}) {
  const calls = [];
  let currentRows = rows, principal = owner, nextChanges = changes, fail = false;
  const exports = {};
  const database = {
    prepare(sql) {
      const call = { sql, args: [] }; calls.push(call);
      return {
        bind(...args) { call.args = args; return this; },
        async all() {
          if (fail) throw Error("D1 unavailable");
          return { success: true, results: currentRows };
        },
        async first() {
          if (fail) throw Error("D1 unavailable");
          const [ownerId, rowid] = call.args;
          return ownerId === "alice" ? currentRows.find(x => x?.recovery_rowid === rowid) ?? null : null;
        },
        async run() {
          if (fail) throw Error("D1 unavailable");
          return { success: true, meta: { changes: nextChanges } };
        },
      };
    },
  };
  vm.runInNewContext(compiled.outputText, {
    exports, Request, Response, TextEncoder, crypto: webcrypto,
    require(name) {
      if (name.endsWith("lib/bookmark-timestamp.js")) return { validBookmarkTimestamp };
      if (name === "cloudflare:workers") return { env: { DB: available ? database : undefined } };
      if (name.endsWith("lib/auth")) return {
        authenticateRequest: async () => principal ? { userId: principal, provider: "password" } : null,
        sameOrigin: req => req.headers.get("origin") === new URL(req.url).origin,
      };
      if (name.endsWith("public/data/catalog.json")) return { default: catalog };
      if (name.endsWith("public/editions.js")) return { EDITIONS };
      throw Error("Unexpected import: " + name);
    },
  });
  async function send(method, data, { origin = "https://scripture.test" } = {}) {
    const response = await exports[method](new Request("https://scripture.test/api/bookmarks", {
      method,
      headers: { Origin: origin, "Content-Type": "application/json" },
      ...(method !== "GET" ? { body: JSON.stringify(data) } : {}),
    }));
    return { status: response.status, body: await response.json(), cache: response.headers.get("cache-control") };
  }
  return {
    send, calls,
    setRows: value => { currentRows = value; },
    setOwner: value => { principal = value; },
    setChanges: value => { nextChanges = value; },
    setFailure: value => { fail = value; },
  };
}

test("private GET preserves valid links and only exposes damaged rows as bounded recovery descriptions", async () => {
  const f = fixture();
  const r = await f.send("GET");
  assert.equal(r.status, 200);
  assert.match(r.cache, /no-store/);
  assert.deepEqual(r.body.bookmarks, [{ edition: "en-web", book: "GEN", chapter: 1, created_at: "2026-10-30" }]);
  assert.equal(r.body.warning, "partial_bookmarks");
  assert.equal(r.body.invalid_bookmarks.length, 1);
  assert.match(r.body.invalid_bookmarks[0].reference, /^9\.[a-f0-9]{64}$/);
  assert.match(r.body.invalid_bookmarks[0].description, /<img onerror/);
  assert.equal(f.calls.length, 1, "GET never deletes or mutates records");
  assert.match(f.calls[0].sql, /WHERE user_id=\?/);
});

test("a clean list has no recovery controls or false partial warning", async () => {
  const result = await fixture({rows:[valid]}).send("GET");
  assert.equal(result.status, 200);
  assert.equal(result.body.warning, undefined);
  assert.equal(result.body.invalid_bookmarks, undefined);
});

test("corrupt D1 rows without a trustworthy rowid remain preserved and never receive delete tokens", async () => {
  const result = await fixture({ rows: [{edition:"broken",book:"GEN",chapter:0,created_at:"x"}, null, damaged] }).send("GET");
  assert.equal(result.status, 200);
  assert.equal(result.body.invalid_bookmarks.length, 1);
  assert.equal(result.body.warning, "partial_bookmarks");
});

test("normal account can explicitly remove one invalid row, bound to every original column", async () => {
  const f = fixture();
  const reference = (await f.send("GET")).body.invalid_bookmarks[0].reference;
  const response = await f.send("DELETE", { recovery_ref: reference });
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {ok:true});
  assert.match(response.cache, /no-store/);
  assert.equal(f.calls.length, 3);
  assert.match(f.calls[1].sql, /SELECT rowid AS recovery_rowid/);
  assert.match(f.calls[2].sql, /DELETE FROM reader_bookmarks WHERE user_id=\? AND rowid=\?/);
  assert.deepEqual(f.calls[2].args, ["alice", 9, damaged.edition, damaged.book, damaged.chapter, damaged.created_at]);
});

test("tampered or guessed references fail closed without a query", async () => {
  const f = fixture();
  for (const token of ["1", "0."+"a".repeat(64), "1."+"g".repeat(64),
    "1 OR 1=1."+"a".repeat(64), "01."+"a".repeat(64), "x".repeat(200), 19, null]) {
    const n = f.calls.length;
    const result = await f.send("DELETE", {recovery_ref:token});
    assert.equal(result.status, 400, String(token));
    assert.equal(result.body.error, "invalid_recovery_reference");
    assert.equal(f.calls.length, n, "invalid token must not query D1");
  }
});

test("one user cannot recover another user's invalid record even with its exact token", async () => {
  const f = fixture();
  const reference = (await f.send("GET")).body.invalid_bookmarks[0].reference;
  f.setOwner("bob");
  const r = await f.send("DELETE", {recovery_ref:reference});
  assert.equal(r.status, 409);
  assert.equal(r.body.error, "recovery_stale");
  assert.equal(f.calls.length, 2);
});

test("concurrent edit invalidates the prior row-bound token without deleting", async () => {
  const f = fixture();
  const reference = (await f.send("GET")).body.invalid_bookmarks[0].reference;
  f.setRows([valid, {...damaged, chapter:998}]);
  const result = await f.send("DELETE", {recovery_ref:reference});
  assert.equal(result.status, 409);
  assert.equal(f.calls.length, 2);
});

test("a repaired, now-valid bookmark cannot be removed using the damaged-row API", async () => {
  const f = fixture();
  const ref = (await f.send("GET")).body.invalid_bookmarks[0].reference;
  f.setRows([valid, {...valid, recovery_rowid:9}]);
  assert.equal((await f.send("DELETE", {recovery_ref:ref})).status, 409);
  assert.equal(f.calls.length, 2);
});

test("concurrent removal returning zero changes is conflict, not success", async () => {
  const f = fixture({changes:0});
  const token = (await f.send("GET")).body.invalid_bookmarks[0].reference;
  const response = await f.send("DELETE", {recovery_ref:token});
  assert.equal(response.status, 409);
  assert.equal(response.body.error, "recovery_stale");
});

test("implausible multi-delete or unsafe ACK fails without claiming record deletion", async () => {
  for (const changes of [2,-1,1.5,NaN,undefined]) {
    const f=fixture({changes:1});
    f.setChanges(changes);
    const token=(await f.send("GET")).body.invalid_bookmarks[0].reference;
    const result=await f.send("DELETE",{recovery_ref:token});
    assert.equal(result.status,503,String(changes));
    assert.equal(result.body.error,"bookmarks_unavailable");
  }
});

test("wrong-origin, signed-out, and unavailable identity never reach the recovery write", async () => {
  const f=fixture();
  const token=(await f.send("GET")).body.invalid_bookmarks[0].reference;
  const before=f.calls.length;
  assert.equal((await f.send("DELETE",{recovery_ref:token},{origin:"https://attacker.test"})).status,403);
  f.setOwner(null);
  assert.equal((await f.send("DELETE",{recovery_ref:token})).status,401);
  assert.equal(f.calls.length,before);
});

test("recovery references never bypass PUT validation or ordinary bookmark DELETE", async () => {
  const f=fixture();
  const token=(await f.send("GET")).body.invalid_bookmarks[0].reference;
  assert.equal((await f.send("PUT",{recovery_ref:token})).status,400);
  assert.equal((await f.send("DELETE",{edition:"en-web",book:"GEN",chapter:999})).status,200);
  assert.match(f.calls.at(-1).sql,/DELETE FROM reader_bookmarks WHERE user_id=\? AND edition=\?/);
});

test("D1 outage is unavailable, not an erased bookmark acknowledgement", async () => {
  const f=fixture();
  const token=(await f.send("GET")).body.invalid_bookmarks[0].reference;
  f.setFailure(true);
  assert.equal((await f.send("DELETE",{recovery_ref:token})).status,503);
  assert.equal((await f.send("GET")).status,503);
});

test("missing D1 cannot advertise either recovery or deletion", async () => {
  const f=fixture({available:false});
  assert.equal((await f.send("GET")).status,503);
  assert.equal((await f.send("DELETE",{recovery_ref:"9."+"a".repeat(64)})).status,503);
  assert.equal(f.calls.length,0);
});
