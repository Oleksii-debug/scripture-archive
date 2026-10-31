import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Exercise the exact shipping owner-read implementation via the canonical GET,
// not a reimplemented SQL-result validator. No synthetic community is started.
function compile(path, deps) {
  const source = readFileSync(new URL("../" + path, import.meta.url), "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  });
  assert.equal(transpiled.diagnostics?.length ?? 0, 0);
  const exports = {};
  vm.runInNewContext(transpiled.outputText, {
    exports, Request, Response, URL, Date, crypto, console,
    require(name) {
      if (!Object.hasOwn(deps, name)) throw Error("unexpected dependency " + name);
      return deps[name];
    },
  });
  return exports;
}
const original = () => [
  { success: true, results: [{ status: "paused", started_at: "2026-10-01 00:00:00", activated_at: null, paused_at: "2026-10-30 00:00:00", stopped_at: null }] },
  { success: true, results: [{ label: "initial-5", created_count: 3, target_count: 5, status: "running" }] },
  { success: true, results: [{ total: 3 }] },
  { success: true, results: [{ event_type: "pause", created_at: "2026-10-30 00:00:00", details_json: "{}" }] },
];
function fixture(receipts = original(), throwD1 = false) {
  const calls = { batches: 0, ownerReads: 0, rate: 0 };
  const db = {
    prepare(sql) {
      return {
        bind() { return this; },
        async first() {
          if (sql.startsWith("SELECT id FROM community_runs")) return { id: "fixture-run" };
          throw Error("unexpected first query " + sql);
        },
      };
    },
    async batch(statements) {
      calls.batches++;
      assert.equal(statements.length, 4);
      if (throwD1) throw Error("D1 disconnected");
      return receipts;
    },
  };
  const constants = { COMMUNITY_RUN_ID: "fixture-run" };
  const engine = compile("lib/community-engine.ts", {
    "cloudflare:workers": { env: { DB: db } },
    "./auth": { randomToken: () => "token", sha256: async () => "hash" },
    "./community": constants,
  });
  const routes = compile("app/api/community/route.ts", {
    "cloudflare:workers": { env: { DB: db } },
    "../../../public/data/catalog.json": { default: { books: { en: [] }, editionBooks: {} } },
    "../../../lib/auth": {
      rateLimit: async () => { calls.rate++; return true; },
      requestAddress: () => "test", authenticateRequest: async () => {
        calls.ownerReads++;
        return { userId: "verified-owner", emailVerified: true, provider: "password" };
      },
      isVerifiedOwner: identity => Boolean(identity?.userId === "verified-owner"),
    },
    "../../../lib/community": constants,
    "../../../lib/community-engine": { communityOwnerState: engine.communityOwnerState },
  });
  return {
    calls,
    async get() {
      const response = await routes.GET(new Request("https://archive.invalid/api/community?action=owner"));
      return { status: response.status, payload: await response.json(), cache: response.headers.get("cache-control") };
    },
  };
}
test("owner snapshot reflects four genuine D1 receipts without guessing or mutation", async () => {
  const f = fixture();
  const response = await f.get();
  assert.equal(response.status, 200);
  assert.equal(response.payload.run.status, "paused");
  assert.equal(response.payload.waves.length, 1);
  assert.equal(response.payload.synthetic.total, 3);
  assert.equal(response.payload.log[0].event_type, "pause");
  assert.deepEqual(f.calls, { batches: 1, ownerReads: 1, rate: 1 });
});
for (const index of [0, 1, 2, 3]) {
  test("owner snapshot rejects failed batch receipt at position " + index, async () => {
    const rows = original();
    rows[index] = { success: false, results: [] };
    const result = await fixture(rows).get();
    assert.equal(result.status, 503);
    assert.equal(result.payload.error, "community_unavailable");
    assert.equal(Object.hasOwn(result.payload, "synthetic"), false);
  });
  test("owner snapshot rejects missing results at position " + index, async () => {
    const rows = original();
    rows[index] = { success: true };
    const result = await fixture(rows).get();
    assert.equal(result.status, 503);
    assert.equal(result.payload.error, "community_unavailable");
  });
}
for (const rows of [null, [], original().slice(0, 3)]) {
  test("owner snapshot refuses null/short D1 batch rather than a false empty state", async () => {
    const result = await fixture(rows).get();
    assert.equal(result.status, 503);
    assert.equal(result.payload.error, "community_unavailable");
  });
}
for (const count of [null, -1, 2.5, "3"]) {
  test("invalid synthetic count " + String(count) + " cannot impersonate a saved total", async () => {
    const rows = original();
    rows[2] = { success: true, results: [{ total: count }] };
    const result = await fixture(rows).get();
    assert.equal(result.status, 503);
    assert.equal(result.payload.error, "community_unavailable");
  });
}
test("missing run identity is unavailable, not an invented waiting session", async () => {
  const rows = original(); rows[0] = { success: true, results: [] };
  const response = await fixture(rows).get();
  assert.equal(response.status, 503);
});
test("D1 thrown read returns private owner JSON 503, not unhandled 500", async () => {
  const response = await fixture(original(), true).get();
  assert.equal(response.status, 503);
  assert.equal(response.payload.error, "community_unavailable");
  assert.match(response.cache, /no-store/);
});
