import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Exercise the actual canonical auth route. No stubbed alternate HTTP handler.
const source = readFileSync(new URL("../app/api/auth/route.ts", import.meta.url), "utf8");
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal(output.diagnostics?.length ?? 0, 0);

function fixture(fault = "") {
  const calls = [];
  const account = {
    id: "user-one", email: "owner@example.invalid", deleted_at: null,
    password_hash: "original-hash", password_salt: "salt",
    password_iterations: 310000, session_version: 2,
  };
  const db = {
    prepare(sql) {
      calls.push({ operation: "prepare", sql });
      return {
        sql,
        bind() { return this; },
        async first() {
          if (fault === "read") throw Error("D1 read interrupted");
          return fault === "missing" ? null : account;
        },
      };
    },
    async batch(statements) {
      calls.push({ operation: "batch", statements });
      if (fault === "batch") throw Error("D1 batch interrupted");
      if (fault === "false-receipt") return [
        { success: true, meta: { changes: 1 } },
        { success: false, meta: { changes: 0 } },
      ];
      if (fault === "no-account-update") return [
        { success: true, meta: { changes: 0 } },
        { success: true, meta: { changes: 1 } },
      ];
      return statements.map(() => ({ success: true, meta: { changes: 1 } }));
    },
  };
  const exports = {};
  vm.runInNewContext(output.outputText, {
    exports, Request, Response, URL, crypto,
    require(spec) {
      if (spec === "cloudflare:workers") return { env: { DB: db } };
      if (spec.endsWith("/lib/auth")) return {
        authenticateRequest: async () => {
          if (fault === "authenticate") throw Error("session store unavailable");
          return fault === "unauthorized" ? null : {
            userId: "user-one", email: "owner@example.invalid", provider: "password",
          };
        },
        sameOrigin: () => true,
        requestAddress: () => "127.0.0.1",
        rateLimit: async () => {
          if (fault === "rate-limit-store") throw Error("limit backend unavailable");
          return fault !== "limited";
        },
        verifyPassword: async (provided) => {
          if (fault === "verify") throw Error("verification backend unavailable");
          return fault !== "incorrect" && provided === "original-password";
        },
        hashPassword: async () => {
          if (fault === "hash") throw Error("password hashing unavailable");
          return { hash: "new-hash", salt: "new-salt", iterations: 310000 };
        },
      };
      if (spec.endsWith("/lib/email")) return { sendSecurityEmail: async () => ({ delivered: true }) };
      throw Error("unexpected import: " + spec);
    },
  });
  return { handler: exports.POST, calls };
}
function request(newPassword = "replacement-password") {
  return new Request("https://example.invalid/api/auth?action=change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword: "original-password", newPassword }),
  });
}

test("valid password change acknowledges both D1 statements without cookie mutation", async () => {
  const f = fixture();
  const response = await f.handler(request());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("set-cookie"), null);
  assert.equal((await response.json()).signedOut, true);
  const batch = f.calls.find(call => call.operation === "batch");
  assert.equal(batch.statements.length, 2);
  assert.match(batch.statements[0].sql, /session_version=session_version\+1/);
  assert.match(batch.statements[1].sql, /UPDATE auth_sessions SET revoked_at/);
});

for (const fault of ["authenticate", "rate-limit-store", "read", "verify", "hash", "batch"]) {
  test("password change returns explicit 503 instead of an unhandled exception on " + fault, async () => {
    const f = fixture(fault);
    const response = await f.handler(request());
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: "password_change_unavailable" });
    assert.equal(response.headers.get("set-cookie"), null);
    if (fault !== "batch") assert.equal(f.calls.filter(call => call.operation === "batch").length, 0);
  });
}
for (const fault of ["false-receipt", "no-account-update"]) {
  test("password change refuses uncertain D1 acknowledgement: " + fault, async () => {
    const f = fixture(fault);
    const response = await f.handler(request());
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: "password_change_unavailable" });
    assert.equal(response.headers.get("set-cookie"), null);
  });
}
test("invalid password remains a 401 without any mutation", async () => {
  const f = fixture("incorrect");
  const response = await f.handler(request());
  assert.equal(response.status, 401);
  assert.equal(f.calls.filter(call => call.operation === "batch").length, 0);
});
test("missing account remains a 401 without any mutation", async () => {
  const f = fixture("missing");
  const response = await f.handler(request());
  assert.equal(response.status, 401);
  assert.equal(f.calls.filter(call => call.operation === "batch").length, 0);
});
test("unauthenticated request remains a 401", async () => {
  const f = fixture("unauthorized");
  const response = await f.handler(request());
  assert.equal(response.status, 401);
});
test("invalid new password remains a 400 without any mutation", async () => {
  const f = fixture();
  const response = await f.handler(request("short"));
  assert.equal(response.status, 400);
  assert.equal(f.calls.filter(call => call.operation === "batch").length, 0);
});
test("throttling remains a 429 without any mutation", async () => {
  const f = fixture("limited");
  const response = await f.handler(request());
  assert.equal(response.status, 429);
  assert.equal(f.calls.filter(call => call.operation === "batch").length, 0);
});
