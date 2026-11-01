import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Execute the real auth route, rather than a second mock HTTP implementation.
const source = readFileSync(new URL("../app/api/auth/route.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal(compiled.diagnostics?.length ?? 0, 0);
function fixture(fault = "") {
  const calls = { prepared: [], batches: 0 };
  const db = {
    prepare(sql) {
      calls.prepared.push(sql);
      if (fault === "prepare") throw Error("D1 prepare unavailable");
      return {
        sql,
        bind() { return this; },
        async first() {
          if (fault === "read") throw Error("D1 read unavailable");
          return fault === "missing" ? null : {
            id: "alice", password_hash: "old-hash", password_salt: "salt",
            password_iterations: 310000, session_version: 1,
          };
        },
      };
    },
    async batch(statements) {
      calls.batches++;
      if (fault === "batch") throw Error("D1 batch unavailable");
      if (fault === "unconfirmed") return statements.map((_, i) => ({
        success: i !== 0, meta: { changes: i === 0 ? 0 : 1 },
      }));
      return statements.map(() => ({ success: true, meta: { changes: 1 } }));
    },
  };
  const exports = {};
  vm.runInNewContext(compiled.outputText, {
    exports, Request, Response, URL, crypto,
    require(spec) {
      if (spec === "cloudflare:workers") return { env: { DB: db } };
      if (spec.endsWith("/lib/auth")) return {
        sameOrigin: () => true,
        requestAddress: () => "local-test",
        authenticateRequest: async () => {
          if (fault === "auth") throw Error("D1 auth unavailable");
          if (fault === "guest") return null;
          return { userId: "alice", email: "alice@example.invalid", provider: "password" };
        },
        verifyPassword: async password => {
          if (fault === "verify") throw Error("password verifier unavailable");
          return password === "current-password";
        },
      };
      if (spec.endsWith("/lib/email")) return { sendSecurityEmail: async () => ({ delivered: true }) };
      throw Error("unexpected dependency: " + spec);
    },
  });
  return { handler: exports.POST, calls };
}
function request(password = "current-password") {
  return new Request("https://example.invalid/api/auth?action=delete-account", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
}
test("successful deletion still executes canonical 20-statement D1 transaction", async () => {
  const f = fixture();
  const res = await f.handler(request());
  assert.equal(res.status, 200);
  assert.equal((await res.json()).ok, true);
  assert.equal(res.headers.get("set-cookie"), null);
  assert.equal(f.calls.batches, 1);
  assert.ok(f.calls.prepared.some(sql => /group_sessions SET created_by='deleted-account',reflection=NULL/.test(sql)));
  assert.ok(f.calls.prepared.some(sql => /UPDATE accounts SET email=/.test(sql)));
});
for (const fault of ["auth", "prepare", "read", "verify"]) {
  test("deletion preflight outage yields an explicit private 503: " + fault, async () => {
    const f = fixture(fault);
    const res = await f.handler(request());
    assert.equal(res.status, 503);
    assert.deepEqual(await res.json(), { error: "deletion_failed" });
    assert.equal(res.headers.get("set-cookie"), null);
    assert.equal(f.calls.batches, 0, "no deletion attempted");
    assert.equal(res.headers.get("cache-control"), "no-store");
  });
}
for (const fault of ["batch", "unconfirmed"]) {
  test("failed or unacknowledged atomic deletion is refused: " + fault, async () => {
    const f = fixture(fault);
    const res = await f.handler(request());
    assert.equal(res.status, 503);
    assert.deepEqual(await res.json(), { error: "deletion_failed" });
    assert.equal(res.headers.get("set-cookie"), null);
  });
}
test("incorrect password remains a 401 before any mutation", async () => {
  const f = fixture();
  const res = await f.handler(request("wrong-password"));
  assert.equal(res.status, 401);
  assert.equal(f.calls.batches, 0);
});
test("absent account remains a 401 before any mutation", async () => {
  const f = fixture("missing");
  const res = await f.handler(request());
  assert.equal(res.status, 401);
  assert.equal(f.calls.batches, 0);
});
test("no authenticated principal remains 401 before any mutation", async () => {
  const f = fixture("guest");
  const res = await f.handler(request());
  assert.equal(res.status, 401);
  assert.equal(f.calls.batches, 0);
});
