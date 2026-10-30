import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { EDITIONS } from "../public/editions.js";

// Execute the production route, not a duplicate of its validation logic.
const source = await readFile(new URL("../app/api/bookmarks/route.ts", import.meta.url), "utf8");
const catalog = JSON.parse(await readFile(new URL("../public/data/catalog.json", import.meta.url), "utf8"));
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  fileName: "app/api/bookmarks/route.ts",
  reportDiagnostics: true,
});
assert.equal(compiled.diagnostics?.length || 0, 0, "real route transpiles");
const mark = { edition: "en-web", book: "GEN", chapter: 12 };

function fixture({ outcome = { success: true, meta: { changes: 1 } },
  found = { present: 1 }, identity = { userId: "reader", provider: "password" },
  dbPresent = true } = {}) {
  const calls = [];
  const DB = {
    prepare(sql) {
      calls.push(sql);
      return {
        bind() { return this; },
        async run() { if (outcome instanceof Error) throw outcome; return outcome; },
        async first() { if (found instanceof Error) throw found; return found; },
      };
    },
  };
  const exports = {};
  vm.runInNewContext(compiled.outputText, {
    exports, Response, Request,
    require(name) {
      if (name === "cloudflare:workers") return { env: { DB: dbPresent ? DB : null } };
      if (name.endsWith("public/data/catalog.json")) return { default: catalog };
      if (name.endsWith("public/editions.js")) return { EDITIONS };
      if (name.endsWith("lib/auth")) return {
        authenticateRequest: async () => identity,
        sameOrigin: request => request.headers.get("origin") === new URL(request.url).origin,
      };
      throw Error("Unexpected production dependency: " + name);
    },
  });
  const call = (method = "PUT", body = mark, origin = "https://example.invalid") =>
    exports[method](new Request("https://example.invalid/api/bookmarks", {
      method,
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }));
  return { call, calls };
}

async function expectResponse(f, status, error, method = "PUT") {
  const response = await f.call(method);
  assert.equal(response.status, status);
  assert.deepEqual(await response.json(), error ? { error } : { ok: true });
  assert.match(response.headers.get("cache-control"), /no-store/);
}

test("bookmark PUT fails closed on D1 failure, thrown outage and malformed ACK", async () => {
  for (const outcome of [
    { success: false, meta: { changes: 0 } },
    { success: true },
    { success: true, meta: {} },
    { success: true, meta: { changes: -1 } },
    { success: true, meta: { changes: 0.5 } },
    { success: true, meta: { changes: Number.NaN } },
    new Error("disposable storage outage"),
  ]) {
    const f = fixture({ outcome });
    await expectResponse(f, 503, "bookmark_save_failed");
    assert.equal(f.calls.length, 1, "no follow-up reads after a failed write ACK");
  }
});

test("bookmark DELETE never claims success from an unavailable D1 write", async () => {
  for (const outcome of [{ success: false }, { success: true }, new Error("disposable storage outage")])
    await expectResponse(fixture({ outcome }), 503, "bookmark_save_failed", "DELETE");
});

test("bookmark writes retain normal success, deletion idempotency and duplicate readback", async () => {
  await expectResponse(fixture(), 200);
  await expectResponse(fixture({ outcome: { success: true, meta: { changes: 0 } } }), 200, null, "DELETE");
  const duplicate = fixture({ outcome: { success: true, meta: { changes: 0 } }, found: { present: 1 } });
  await expectResponse(duplicate, 200);
  assert.equal(duplicate.calls.length, 2);
  const full = fixture({ outcome: { success: true, meta: { changes: 0 } }, found: null });
  await expectResponse(full, 409, "bookmark_limit");
  const unavailable = fixture({ outcome: { success: true, meta: { changes: 0 } }, found: new Error("read unavailable") });
  await expectResponse(unavailable, 503, "bookmark_save_failed");
});

test("bookmark writes preserve authentication, origin, payload and DB preconditions", async () => {
  const unauth = fixture({ identity: null });
  const response = await unauth.call();
  assert.equal(response.status, 401);
  assert.equal(unauth.calls.length, 0);
  const agent = fixture({ identity: { userId: "simulated", provider: "agent" } });
  assert.equal((await agent.call()).status, 401);
  assert.equal(agent.calls.length, 0);
  const crossOrigin = fixture();
  assert.equal((await crossOrigin.call("PUT", mark, "https://attacker.invalid")).status, 403);
  assert.equal(crossOrigin.calls.length, 0);
  const invalid = fixture();
  assert.equal((await invalid.call("PUT", { ...mark, chapter: -1 })).status, 400);
  assert.equal(invalid.calls.length, 0);
  const unavailable = fixture({ dbPresent: false });
  assert.equal((await unavailable.call()).status, 503);
});

// Previously, a syntactically valid but nonexistent chapter was silently saved.
test("bookmark PUT checks canonical chapter range while legacy DELETE remains usable", async () => {
  for (const invalid of [
    { ...mark, book: "ZZZ" },
    { ...mark, book: "GEN", chapter: 51 },
    { ...mark, book: "PSA", chapter: 151 },
    { ...mark, book: "REV", chapter: 23 },
  ]) {
    const f = fixture();
    const response = await f.call("PUT", invalid);
    assert.equal(response.status, 400, JSON.stringify(invalid));
    assert.deepEqual(await response.json(), { error: "invalid_bookmark" });
    assert.equal(f.calls.length, 0, "invalid chapter cannot access D1");
    assert.equal((await f.call("DELETE", invalid)).status, 200, "legacy invalid entry remains removable");
    assert.equal(f.calls.length, 1);
  }
  for (const allowed of [
    { ...mark, book: "GEN", chapter: 50 },
    { ...mark, book: "PSA", chapter: 150 },
    { ...mark, book: "REV", chapter: 22 },
  ]) {
    const f = fixture();
    assert.equal((await f.call("PUT", allowed)).status, 200, JSON.stringify(allowed));
    assert.equal(f.calls.length, 1);
  }
});

test("bookmark PUT accepts only locally readable editions, while legacy deletion remains possible", async () => {
  for (const edition of ["unpublished", "en-niv", "uk-khomenko", "ru-rsp"]) {
    const f = fixture();
    const entry = { ...mark, edition };
    const denied = await f.call("PUT", entry);
    assert.equal(denied.status, 400, edition);
    assert.deepEqual(await denied.json(), { error: "invalid_bookmark" });
    assert.equal(f.calls.length, 0, "unsupported edition must not write to D1");
    assert.equal((await f.call("DELETE", entry)).status, 200, "old unsupported bookmark remains removable");
  }
  for (const edition of ["en-web", "uk-kulish", "uk-ohiienko", "ru-synodal"]) {
    const f = fixture();
    assert.equal((await f.call("PUT", { ...mark, edition })).status, 200, edition);
    assert.equal(f.calls.length, 1);
  }
});

// Catalog editions can have different chapter divisions (Joel / JOL is 4 in
// Ohiienko but 3 in the default English catalog). Never use English-only bounds.
test("bookmark PUT preserves translation-specific chapter boundaries", async () => {
  const local = fixture();
  assert.equal((await local.call("PUT", { edition: "uk-ohiienko", book: "JOL", chapter: 4 })).status, 200);
  assert.equal(local.calls.length, 1);
  const english = fixture();
  assert.equal((await english.call("PUT", { edition: "en-web", book: "JOL", chapter: 4 })).status, 400);
  assert.equal(english.calls.length, 0);
  const outOfRange = fixture();
  assert.equal((await outOfRange.call("PUT", { edition: "uk-ohiienko", book: "JOL", chapter: 5 })).status, 400);
  assert.equal(outOfRange.calls.length, 0);
});
