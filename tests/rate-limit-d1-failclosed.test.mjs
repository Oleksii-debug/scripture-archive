import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { webcrypto } from "node:crypto";
import ts from "typescript";

// Exercise the actual shared production limiter, not an independently
// reimplemented copy. The two D1 statements are mocked at their boundary.
const source = readFileSync(new URL("../lib/auth.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal(compiled.diagnostics?.length ?? 0, 0);

function fixture({ ack = { success: true, meta: { changes: 1 } },
  row = { count: 1 }, writeError = false, readError = false, database = true } = {}) {
  const calls = { writes: 0, reads: 0, statements: [], boundKeys: [] };
  const db = {
    prepare(sql) {
      calls.statements.push(sql);
      if (sql.startsWith("INSERT INTO auth_rate_limits")) {
        return { bind(key) {
          calls.boundKeys.push(key);
          return { async run() {
            calls.writes++;
            if (writeError) throw Error("D1 write outage");
            return ack;
          } };
        } };
      }
      if (sql.startsWith("SELECT count FROM auth_rate_limits")) {
        return { bind(key) {
          calls.boundKeys.push(key);
          return { async first() {
            calls.reads++;
            if (readError) throw Error("D1 read outage");
            return row;
          } };
        } };
      }
      throw Error("Unexpected SQL " + sql);
    },
  };
  const exports = {};
  vm.runInNewContext(compiled.outputText, {
    exports, Date, TextEncoder, Uint8Array, URL, Request, Response, atob, btoa,
    crypto: webcrypto,
    require(specifier) {
      if (specifier === "cloudflare:workers")
        return { env: { DB: database ? db : undefined } };
      throw Error("Unexpected dependency " + specifier);
    },
  });
  return { calls, run: () => exports.rateLimit("login:person", 3, 60) };
}

for (const count of [1, 2, 3]) {
  test("acknowledged D1 write and valid count " + count + " allows request", async () => {
    const f = fixture({ row: { count } });
    assert.equal(await f.run(), true);
    assert.equal(f.calls.writes, 1);
    assert.equal(f.calls.reads, 1);
    assert.equal(f.calls.statements.length, 2);
    assert.equal(f.calls.boundKeys[0], f.calls.boundKeys[1]);
    assert.ok(typeof f.calls.boundKeys[0] === "string" && f.calls.boundKeys[0].length > 30);
  });
}

for (const count of [4, 50]) {
  test("acknowledged count " + count + " enforces the quota", async () => {
    const f = fixture({ row: { count } });
    assert.equal(await f.run(), false);
    assert.equal(f.calls.reads, 1);
  });
}

const badReceipts = [
  undefined, null, {}, { success: false, meta: { changes: 1 } },
  { success: true }, { success: true, meta: {} },
  { success: true, meta: { changes: 0 } },
  { success: true, meta: { changes: 2 } },
  { success: true, meta: { changes: -1 } },
  { success: true, meta: { changes: "1" } },
  { success: true, meta: { changes: 1.5 } },
  { success: true, meta: { changes: Number.NaN } },
];
for (const [index, ack] of badReceipts.entries()) {
  test("unconfirmed write receipt #" + index + " denies before reading quota", async () => {
    const f = fixture({ ack });
    await assert.rejects(f.run(), /rate_limit_write_unavailable/);
    assert.equal(f.calls.writes, 1);
    assert.equal(f.calls.reads, 0);
  });
}

const badRows = [
  undefined, null, {}, { count: null }, { count: 0 },
  { count: -1 }, { count: "1" }, { count: 1.5 },
  { count: Number.NaN }, { count: Number.POSITIVE_INFINITY },
  { count: Number.MAX_SAFE_INTEGER + 1 }, { count: false },
];
for (const [index, row] of badRows.entries()) {
  test("missing or malformed D1 counter #" + index + " must not become count zero", async () => {
    const f = fixture({ row });
    await assert.rejects(f.run(), /rate_limit_read_unavailable/);
    assert.equal(f.calls.writes, 1);
    assert.equal(f.calls.reads, 1);
  });
}

test("rate-limit write exception rejects and does not read a fictitious zero", async () => {
  const f = fixture({ writeError: true });
  await assert.rejects(f.run(), /D1 write outage/);
  assert.equal(f.calls.reads, 0);
});

test("rate-limit read outage rejects after acknowledged write", async () => {
  const f = fixture({ readError: true });
  await assert.rejects(f.run(), /D1 read outage/);
  assert.equal(f.calls.writes, 1);
});

test("missing D1 denies before any DB operation", async () => {
  const f = fixture({ database: false });
  await assert.rejects(f.run(), /database_unavailable/);
  assert.equal(f.calls.writes, 0);
  assert.equal(f.calls.reads, 0);
});
