import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { webcrypto } from "node:crypto";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

// Execute the real TypeScript community-engine module with controlled D1
// receipts. No scheduler, email provider, production DB or agent is started.
const source = readFileSync(new URL("../lib/community-engine.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal(compiled.diagnostics?.length ?? 0, 0);

function fixture({ activeCount = 0, status = "running", insertReceipt, scheduleReceipt } = {}) {
  const state = {
    activeCount, status,
    insertReceipt: insertReceipt ?? { success: true, meta: { changes: 1 } },
    scheduleReceipt: scheduleReceipt ?? { success: true, meta: { changes: 1 } },
    claims: 0, inserts: 0, schedules: 0, releases: 0, issued: 0,
  };
  const db = {
    prepare(sql) {
      return {
        bind() {
          return {
            async first() {
              if (sql.includes("RETURNING control_version")) {
                state.claims++;
                // The initial advanceCommunity pass has no wave lease.
                return state.claims % 2 === 1 || state.status !== "running"
                  ? null : { control_version: 7 };
              }
              if (sql.startsWith("SELECT COUNT(*) count")) {
                return state.activeCount === null ? null : { count: state.activeCount };
              }
              if (sql.startsWith("SELECT status FROM community_runs"))
                return { status: state.status };
              throw Error("unexpected SELECT: " + sql);
            },
            async all() {
              if (!sql.startsWith("SELECT id,seed,locale FROM community_members"))
                throw Error("unexpected ALL: " + sql);
              return { success: true, results: [{ id: "member-1", seed: 3, locale: "uk" }] };
            },
            async run() {
              if (sql.startsWith("INSERT INTO community_agent_sessions")) {
                state.inserts++;
                return state.insertReceipt;
              }
              if (sql.startsWith("UPDATE community_members SET next_action_at")) {
                state.schedules++;
                return state.scheduleReceipt;
              }
              if (sql.startsWith("UPDATE community_runs SET lease_token=NULL")) {
                state.releases++;
                return { success: true, meta: { changes: 1 } };
              }
              throw Error("unexpected RUN: " + sql);
            },
          };
        },
      };
    },
  };
  const exports = {};
  vm.runInNewContext(compiled.outputText, {
    exports, crypto: webcrypto, Date, console,
    require(id) {
      if (id === "cloudflare:workers") return { env: { DB: db } };
      if (id === "./auth") return {
        randomToken: () => { state.issued++; return "opaque-test-token"; },
        sha256: async () => "opaque-hash",
      };
      if (id === "./community") return {
        COMMUNITY_RUN_ID: "fixture-run", COMMUNITY_TARGET: 0,
        communityWavePlan: () => [], identityFor: () => ({}),
        intervalSeconds: () => 60, sqlDate: () => "2026-10-31 12:00:00",
      };
      throw Error("unexpected import: " + id);
    },
  });
  return { state, lease: () => exports.leaseCommunityAgents() };
}

test("confirmed count, insert and next-action receipts return one usable job", async () => {
  const f = fixture();
  const result = await f.lease();
  assert.equal(result.status, "running");
  assert.equal(result.jobs.length, 1);
  assert.equal(result.jobs[0].memberId, "member-1");
  assert.equal(f.state.inserts, 1);
  assert.equal(f.state.schedules, 1);
  assert.equal(f.state.releases, 1);
});

for (const activeCount of [null, -1, "0", 1.5, 3, NaN, Infinity]) {
  test("missing or corrupt active-session count cannot authorize a new lease: " + String(activeCount), async () => {
    const f = fixture({ activeCount });
    await assert.rejects(f.lease(), /community_session_count_unavailable/);
    assert.equal(f.state.inserts, 0);
    assert.equal(f.state.issued, 0);
    assert.equal(f.state.releases, 1);
  });
}

for (const insertReceipt of [
  { success: false, meta: { changes: 1 } },
  { success: true, meta: {} },
  { success: true, meta: { changes: -1 } },
  { success: true, meta: { changes: 2 } },
]) {
  test("failed or contradictory D1 INSERT receipt cannot release an agent token", async () => {
    const f = fixture({ insertReceipt });
    await assert.rejects(f.lease(), /community_session_insert_unconfirmed/);
    assert.equal(f.state.schedules, 0);
    assert.equal(f.state.releases, 1);
  });
}

test("legitimate zero-row insert is a safe no-job CAS outcome", async () => {
  const f = fixture({ insertReceipt: { success: true, meta: { changes: 0 } } });
  const result = await f.lease();
  assert.equal(result.jobs.length, 0);
  assert.equal(f.state.schedules, 0);
  assert.equal(f.state.releases, 1);
});

test("at full capacity no additional agent token is minted", async () => {
  const f = fixture({ activeCount: 2 });
  const result = await f.lease();
  assert.equal(result.jobs.length, 0);
  assert.equal(f.state.inserts, 0);
  assert.equal(f.state.issued, 0);
});

test("Stop state never issues agent work even when a lease is requested", async () => {
  const f = fixture({ status: "stopped" });
  const result = await f.lease();
  assert.equal(result.status, "stopped");
  assert.equal(result.jobs.length, 0);
  assert.equal(f.state.inserts, 0);
});

test("unacknowledged member scheduling never claims successful dispatch", async () => {
  const f = fixture({ scheduleReceipt: { success: false, meta: { changes: 1 } } });
  await assert.rejects(f.lease(), /community_member_schedule_unconfirmed/);
  assert.equal(f.state.inserts, 1);
  assert.equal(f.state.schedules, 1);
  assert.equal(f.state.releases, 1);
});

test("fresh confirmed read and receipts recover after a transient D1 failure", async () => {
  const f = fixture({ activeCount: null });
  await assert.rejects(f.lease(), /community_session_count_unavailable/);
  f.state.activeCount = 0;
  const recovered = await f.lease();
  assert.equal(recovered.jobs.length, 1);
  assert.equal(f.state.inserts, 1);
  assert.equal(f.state.schedules, 1);
  assert.equal(f.state.releases, 2);
});
