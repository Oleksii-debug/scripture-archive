import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Execute the real community GET route with failed/partial D1 result receipts,
// rather than testing a reimplemented response validator.
const source = readFileSync(new URL("../app/api/community/route.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal(compiled.diagnostics?.length ?? 0, 0);
const validReceipts = () => [
  { success: true, results: [{ total: 3 }] },
  { success: true, results: [{ total: 1 }] },
  { success: true, results: [{
    id: "volunteer-a", display_name: "Public Volunteer", locale: "uk",
    joined_at: "2026-10-01 00:00:00", last_active_at: null,
    reading_data: null, mission_count: 0,
  }] },
];

function fixture({ receipts = validReceipts(), throwBatch = false, throwAdvance = false,
                   missingDb = false, owner = false } = {}) {
  const calls = { advance: 0, batch: 0, auth: 0 };
  const db = {
    prepare(sql) { return { sql }; },
    async batch(statements) {
      calls.batch++;
      assert.equal(statements.length, 3);
      if (throwBatch) throw Error("D1 read temporarily unavailable");
      return receipts;
    },
  };
  const exports = {};
  vm.runInNewContext(compiled.outputText, {
    exports, Request, Response, URL, Date,
    require(name) {
      if (name === "cloudflare:workers") return { env: { DB: missingDb ? undefined : db } };
      if (name === "../../../lib/auth") return {
        authenticateRequest: async () => { calls.auth++; return owner ? { userId: "owner" } : null; },
        isVerifiedOwner: identity => Boolean(identity?.userId === "owner"),
        rateLimit: async () => true,
        requestAddress: () => "disposable-test",
        sameOrigin: () => true,
      };
      if (name === "../../../lib/community") return { COMMUNITY_RUN_ID: "fixture" };
      if (name === "../../../lib/community-engine") return {
        advanceCommunity: async () => {
          calls.advance++;
          if (throwAdvance) throw Error("D1 lease failure");
        },
        communityOwnerState: async () => ({ status: "paused" }),
        controlCommunity: async () => ({ ok: false }),
        leaseCommunityAgents: async () => ({ jobs: [] }),
      };
      throw Error("Unexpected community route import " + name);
    },
  });
  async function get(action, summary = false) {
    const params = new URLSearchParams();
    if (action) params.set("action", action);
    if (summary) params.set("public", "summary");
    const suffix = params.size ? "?" + params.toString() : "";
    const response = await exports.GET(new Request("https://archive.invalid/api/community" + suffix));
    return { status: response.status, body: await response.json(), cache: response.headers.get("cache-control") };
  }
  return { get, calls };
}

test("confirmed community D1 snapshots preserve the actual public directory", async () => {
  const f = fixture();
  const response = await f.get();
  assert.equal(response.status, 200);
  assert.equal(response.body.summary.registered, 3);
  assert.equal(response.body.summary.online, 1);
  assert.equal(response.body.summary.visible, 1);
  assert.equal(response.body.members[0].displayName, "Public Volunteer");
  assert.deepEqual(f.calls, { advance: 0, batch: 1, auth: 0 });
});

test("failed first count receipt is unavailable, never a fabricated zero-success summary", async () => {
  const receipts = validReceipts();
  receipts[0] = { success: false, results: [{ total: 0 }] };
  const f = fixture({ receipts });
  const result = await f.get();
  assert.equal(result.status, 503);
  assert.equal(result.body.error, "community_unavailable");
  assert.equal(Object.hasOwn(result.body, "summary"), false);
});

for (const index of [0, 1, 2]) {
  test("missing D1 results array at batch index " + index + " fails closed", async () => {
    const receipts = validReceipts();
    receipts[index] = { success: true };
    const f = fixture({ receipts });
    const response = await f.get();
    assert.equal(response.status, 503);
    assert.equal(response.body.error, "community_unavailable");
  });
}

for (const index of [0, 1]) {
  test("empty SQLite COUNT result at index " + index + " cannot falsely become zero", async () => {
    const receipts = validReceipts();
    receipts[index] = { success: true, results: [] };
    const result = await fixture({ receipts }).get();
    assert.equal(result.status, 503);
    assert.equal(result.body.error, "community_unavailable");
  });
}

for (const total of [null, -1, 1.5]) {
  test("corrupt community COUNT value " + String(total) + " is unavailable", async () => {
    const receipts = validReceipts();
    receipts[0] = { success: true, results: [{ total }] };
    const result = await fixture({ receipts }).get();
    assert.equal(result.status, 503);
    assert.equal(result.body.error, "community_unavailable");
  });
}

test("thrown public D1 batch exception is 503 JSON, not unhandled 500", async () => {
  const f = fixture({ throwBatch: true });
  const response = await f.get();
  assert.equal(response.status, 503);
  assert.equal(response.body.error, "community_unavailable");
  assert.equal(f.calls.batch, 1);
});

test("public GET cannot invoke a failing or state-changing wave advancement", async () => {
  const f = fixture({ throwAdvance: true });
  const response = await f.get();
  assert.equal(response.status, 200);
  assert.equal(response.body.summary.registered, 3);
  assert.equal(f.calls.advance, 0);
  assert.equal(f.calls.batch, 1);
});

test("repeated public GET and summary preflight never create community advancement", async () => {
  const f = fixture();
  const first = await f.get();
  const second = await f.get(undefined, true);
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.deepEqual(second.body.members, []);
  assert.equal(first.body.summary.registered, second.body.summary.registered);
  assert.deepEqual(f.calls, { advance: 0, batch: 2, auth: 0 });
});

test("missing D1 retains 503 without calling the community scheduler", async () => {
  const f = fixture({ missingDb: true });
  const response = await f.get();
  assert.equal(response.status, 503);
  assert.equal(response.body.error, "database_unavailable");
  assert.equal(f.calls.advance, 0);
});

test("authenticated owner state remains routed to the existing owner authority", async () => {
  const f = fixture({ owner: true });
  const response = await f.get("owner");
  assert.equal(response.status, 200);
  assert.equal(response.body.status, "paused");
  assert.deepEqual(f.calls, { advance: 0, batch: 0, auth: 1 });
});
