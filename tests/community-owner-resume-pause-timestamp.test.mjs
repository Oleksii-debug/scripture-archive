import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { DatabaseSync } from "node:sqlite";

// Execute the actual canonical owner control, not a copied date helper.
// These are disposable source/SQLite tests, not deployed D1 or owner acceptance.
const source = readFileSync(new URL("../lib/community-engine.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal(compiled.diagnostics?.length ?? 0, 0);

const NOW = new Date("2026-11-01T10:00:00.000Z");
function fixture({ pausedAt = "2026-11-01 09:00:00", activatedAt = "2026-10-31 10:00:00",
  status = "paused" } = {}) {
  const writes = [];
  let currentPausedAt = pausedAt;
  const db = {
    prepare(sql) {
      return {
        sql, values: [],
        bind(...values) { this.values = values; return this; },
        async first() {
          if (sql.startsWith("SELECT id FROM community_runs")) return { id: "run" };
          if (sql.startsWith("SELECT status,control_version,paused_at,activated_at"))
            return { status, control_version: 3, paused_at: currentPausedAt, activated_at: activatedAt };
          throw Error("Unexpected read: " + sql);
        },
      };
    },
    async batch(statements) {
      writes.push(statements.map(statement => ({ sql: statement.sql, values: statement.values })));
      return statements.map(() => ({ success: true, meta: { changes: 1 } }));
    },
  };
  const exports = {};
  vm.runInNewContext(compiled.outputText, {
    exports, crypto, Date,
    require(name) {
      if (name === "cloudflare:workers") return { env: { DB: db } };
      if (name === "./auth") return { randomToken: () => "token", sha256: async () => "hash" };
      if (name === "./community") return {
        COMMUNITY_RUN_ID: "run", COMMUNITY_TARGET: 0, communityWavePlan: () => [],
        identityFor: () => ({}), intervalSeconds: () => 120,
        sqlDate: () => "2026-11-01 10:00:00",
      };
      throw Error("Unexpected import: " + name);
    },
  });
  return {
    writes,
    setPausedAt(value) { currentPausedAt = value; },
    control: action => exports.controlCommunity(action, NOW),
  };
}

for (const pausedAt of [
  null,
  "",
  "not-a-date",
  "2026-02-30 09:00:00",
  "2026-11-01T09:00:00Z",
  "2026-11-01 09:00:00+01:00",
  "2026-11-01 11:00:00",
]) {
  test("R0.4 owner resume fails closed before D1 writes on untrusted paused_at: " + String(pausedAt), async () => {
    const f = fixture({ pausedAt });
    await assert.rejects(f.control("resume"), /community_pause_timestamp_unavailable/);
    assert.equal(f.writes.length, 0, "an invalid pause timestamp must not mutate run or wave");
  });
}

test("R0.4 resume shifts existing wave deadlines by canonical UTC elapsed seconds", async () => {
  const f = fixture();
  assert.deepEqual(JSON.parse(JSON.stringify(await f.control("resume"))), { ok: true, status: "running" });
  assert.equal(f.writes.length, 1);
  const shift = f.writes[0].find(statement => statement.sql.includes("SET next_at=datetime(next_at,?)"));
  assert.ok(shift, "the canonical wave shift remains in the owner batch");
  assert.equal(shift.values[0], "+3600 seconds");
});

test("R0.4 recovery: corrected paused timestamp resumes without an earlier partial write", async () => {
  const f = fixture({ pausedAt: "2026-02-30 09:00:00" });
  await assert.rejects(f.control("resume"), /community_pause_timestamp_unavailable/);
  assert.equal(f.writes.length, 0);
  f.setPausedAt("2026-11-01 09:30:00");
  assert.equal((await f.control("resume")).status, "running");
  assert.equal(f.writes.length, 1);
  const shift = f.writes[0].find(statement => statement.sql.includes("SET next_at=datetime(next_at,?)"));
  assert.equal(shift.values[0], "+1800 seconds");
});

test("R0.4 pause/stop and first activation are not blocked by a missing historical paused_at", async () => {
  for (const action of ["pause", "stop"]) {
    const f = fixture({ status: "running", pausedAt: null });
    assert.equal((await f.control(action)).ok, true);
    assert.equal(f.writes.length, 1);
  }
  const first = fixture({ activatedAt: null, pausedAt: null });
  assert.equal((await first.control("resume")).ok, true);
  assert.equal(first.writes.length, 1);
});

test("R0.4 SQLite: an invalid resume modifier silently destroys next_at despite an ACK", () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec("CREATE TABLE wave(next_at TEXT); INSERT INTO wave VALUES ('2026-11-02 12:00:00')");
    const receipt = db.prepare("UPDATE wave SET next_at=datetime(next_at,?)").run("+NaN seconds");
    assert.equal(receipt.changes, 1);
    assert.equal(db.prepare("SELECT next_at FROM wave").get().next_at, null);
  } finally { db.close(); }
});
