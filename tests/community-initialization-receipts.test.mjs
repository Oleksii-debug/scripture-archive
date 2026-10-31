import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import vm from "node:vm";

// Exercise the actual canonical R0.4 engine source, not copied SQL.
const source = readFileSync(new URL("../lib/community-engine.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal(compiled.diagnostics?.length ?? 0, 0);

function fixture(mode = "ok", brokenIndex = 1) {
  const calls = { batch: 0, statements: [], controls: 0 };
  let activeMode = mode;
  const runId = "test-community-initialization";
  const db = {
    prepare(sql) {
      return {
        sql,
        bind(...params) {
          return {
            sql, params,
            async first() {
              if (sql.startsWith("SELECT id FROM community_runs")) return null;
              if (sql.startsWith("SELECT status,control_version,paused_at,activated_at"))
                return { status: "waiting", control_version: 1, activated_at: null, paused_at: null };
              throw Error("unexpected SELECT: " + sql);
            },
          };
        },
      };
    },
    async batch(statements) {
      calls.batch++;
      calls.statements.push(statements.map(s => s.sql));
      if (statements[0]?.sql.startsWith("UPDATE community_runs")) calls.controls++;
      if (activeMode === "throw") throw Error("simulated D1 outage");
      if (activeMode === "null") return null;
      const results = statements.map(() => ({ success: true, meta: { changes: 1 } }));
      if (activeMode === "short") return results.slice(0, -1);
      if (activeMode === "failed") results[brokenIndex] = { success: false, meta: { changes: 1 } };
      if (activeMode === "missing") results[brokenIndex] = { success: true, meta: {} };
      if (activeMode === "negative") results[brokenIndex] = { success: true, meta: { changes: -1 } };
      if (activeMode === "multi") results[brokenIndex] = { success: true, meta: { changes: 2 } };
      if (activeMode === "fractional") results[brokenIndex] = { success: true, meta: { changes: 0.5 } };
      if (activeMode === "zero") results[brokenIndex] = { success: true, meta: { changes: 0 } };
      return results;
    },
  };
  const waves = [
    { key: "initial", count: 2, startsAt: "2026-10-31 12:00:00", pattern: "[120]", offsetMinutes: 0 },
    { key: "morning", count: 3, startsAt: "2026-10-31 13:00:00", pattern: "[180]", offsetMinutes: 60 },
  ];
  const dependency = {
    "cloudflare:workers": { env: { DB: db } },
    "./auth": { randomToken: () => "token", sha256: async () => "hash" },
    "./community": {
      COMMUNITY_RUN_ID: runId, COMMUNITY_TARGET: 5,
      communityWavePlan: () => waves, identityFor: () => ({}), intervalSeconds: () => 120,
      sqlDate: () => "2026-10-31 12:00:00",
    },
  };
  const exports = {};
  vm.runInNewContext(compiled.outputText, {
    exports, Date, crypto, console,
    require(name) {
      assert.ok(Object.hasOwn(dependency, name), "unexpected module " + name);
      return dependency[name];
    },
  });
  return {
    calls, setMode(value) { activeMode = value; },
    ensure: () => exports.ensureCommunityRun(new Date("2026-10-31T12:00:00Z")),
    start: () => exports.controlCommunity("start", new Date("2026-10-31T12:00:00Z")),
  };
}

test("acknowledged initialization writes one canonical run and its planned waves", async () => {
  const f = fixture();
  await f.ensure();
  assert.equal(f.calls.batch, 1);
  assert.equal(f.calls.statements[0].length, 3);
  assert.match(f.calls.statements[0][0], /^INSERT OR IGNORE INTO community_runs/);
  assert.equal(f.calls.statements[0].slice(1).every(sql =>
    sql.startsWith("INSERT OR IGNORE INTO community_waves")), true);
});

for (const mode of ["null", "short", "failed", "missing", "negative", "multi", "fractional"]) {
  for (const index of [0, 1, 2]) {
    test("uncertain initialization receipt " + mode + " at " + index + " refuses owner START", async () => {
      const f = fixture(mode, index);
      await assert.rejects(f.start(), /community_initialization_unconfirmed/);
      assert.equal(f.calls.batch, 1, "control transaction must not begin after failed initialization");
      assert.equal(f.calls.controls, 0);
      assert.equal(f.calls.statements[0].length, 3);
    });
  }
}

test("D1 exception leaves owner START unacknowledged", async () => {
  const f = fixture("throw");
  await assert.rejects(f.start(), /simulated D1 outage/);
  assert.equal(f.calls.batch, 1);
  assert.equal(f.calls.controls, 0);
});

test("idempotent INSERT OR IGNORE zero-change receipts remain valid", async () => {
  const f = fixture("zero", 1);
  await f.ensure();
  assert.equal(f.calls.batch, 1);
});

test("a transient failed receipt can be followed by an acknowledged retry", async () => {
  const f = fixture("failed", 2);
  await assert.rejects(f.ensure(), /community_initialization_unconfirmed/);
  f.setMode("ok");
  await f.ensure();
  assert.equal(f.calls.batch, 2);
  assert.equal(f.calls.controls, 0);
});
