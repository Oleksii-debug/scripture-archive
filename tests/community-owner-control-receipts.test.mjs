import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Executes the actual owner POST and controlCommunity source, not copied SQL.
function compile(path, dependencies) {
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
      if (!Object.hasOwn(dependencies, name)) throw Error("unexpected module " + name);
      return dependencies[name];
    },
  });
  return exports;
}

function fixture({ action = "start", status = "waiting", mode = "ok", brokenIndex = 0 } = {}) {
  const control = { batchCalls: 0, inspected: [] };
  const runId = "fixture-community";
  const db = {
    prepare(sql) {
      return {
        sql,
        bind() { return this; },
        async first() {
          if (sql.startsWith("SELECT id FROM community_runs")) return { id: runId };
          if (sql.startsWith("SELECT status,control_version,paused_at,activated_at"))
            return { status, control_version: 4, paused_at: null, activated_at: null };
          throw Error("unexpected SELECT " + sql);
        },
      };
    },
    async batch(statements) {
      control.batchCalls++;
      control.inspected = statements.map(q => q.sql);
      if (mode === "throw") throw Error("D1 unavailable");
      if (mode === "null") return null;
      const receipts = statements.map(() => ({ success: true, meta: { changes: 1 } }));
      if (mode === "short") return receipts.slice(0, -1);
      if (mode === "failed") receipts[brokenIndex] = { success: false, meta: { changes: 1 } };
      if (mode === "missing") receipts[brokenIndex] = { success: true, meta: {} };
      if (mode === "negative") receipts[brokenIndex] = { success: true, meta: { changes: -1 } };
      if (mode === "zero") receipts[brokenIndex] = { success: true, meta: { changes: 0 } };
      if (mode === "multi") receipts[brokenIndex] = { success: true, meta: { changes: 2 } };
      return receipts;
    },
  };
  const constants = {
    COMMUNITY_RUN_ID: runId, COMMUNITY_TARGET: 0,
    communityWavePlan: () => [], identityFor: () => ({}), intervalSeconds: () => 120,
    sqlDate: () => "2026-10-31 12:00:00",
  };
  const engine = compile("lib/community-engine.ts", {
    "cloudflare:workers": { env: { DB: db } },
    "./auth": { randomToken: () => "token", sha256: async () => "hash" },
    "./community": constants,
  });
  const routes = compile("app/api/community/route.ts", {
    "cloudflare:workers": { env: { DB: db } },
    "../../../lib/auth": {
      authenticateRequest: async () => ({ userId: "owner", emailVerified: true, provider: "password" }),
      isVerifiedOwner: () => true, sameOrigin: () => true,
    },
    "../../../lib/community": constants,
    "../../../public/data/catalog.json": { default: { books: { en: [] }, editionBooks: {} } },
    "../../../lib/community-engine": { controlCommunity: engine.controlCommunity, advanceCommunity: async () => {} },
  });
  return {
    control,
    async post() {
      const response = await routes.POST(new Request("https://archive.invalid/api/community", {
        method: "POST", headers: { "Origin": "https://archive.invalid", "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      }));
      return { status: response.status, payload: await response.json(), cache: response.headers.get("cache-control") };
    },
  };
}

test("start receives a truthful 200 only with acknowledged audit and CAS lease cleanup", async () => {
  const f = fixture();
  const result = await f.post();
  assert.equal(result.status, 200);
  assert.equal(result.payload.ok, true);
  assert.equal(f.control.batchCalls, 1);
  assert.equal(f.control.inspected.length, 3);
  assert.ok(f.control.inspected.some(sql => sql.includes("INSERT INTO community_run_log")));
  assert.ok(f.control.inspected.some(sql => sql.includes("SET lease_token=NULL")));
});

test("stale owner control CAS retains a 409 conflict, not an invented success", async () => {
  const result = await fixture({ mode: "zero", brokenIndex: 0 }).post();
  assert.equal(result.status, 409);
  assert.equal(result.payload.error, "run_changed");
});

for (const mode of ["throw", "null", "short", "failed", "missing", "negative"]) {
  test("owner control refuses " + mode + " D1 evidence without a false successful transition", async () => {
    const result = await fixture({ mode }).post();
    assert.equal(result.status, 503, JSON.stringify(result.payload));
    assert.equal(result.payload.error, "community_unavailable");
    assert.notEqual(result.payload.ok, true);
    assert.match(result.cache, /no-store/);
  });
}

for (const action of ["start", "pause", "resume", "stop"]) {
  const status = { start: "waiting", pause: "running", resume: "paused", stop: "running" }[action];
  test(action + " rejects unacknowledged audit or control lease release", async () => {
    const baseline = fixture({ action, status });
    assert.equal((await baseline.post()).status, 200);
    const count = baseline.control.inspected.length;
    for (const index of [count - 2, count - 1]) {
      const result = await fixture({ action, status, mode: "zero", brokenIndex: index }).post();
      assert.equal(result.status, 503);
      assert.equal(result.payload.error, "community_unavailable");
    }
  });
}

test("unexpected multiple changes on owner control CAS cannot be called success", async () => {
  const result = await fixture({ mode: "multi", brokenIndex: 0 }).post();
  assert.equal(result.status, 503);
  assert.equal(result.payload.error, "community_unavailable");
});
