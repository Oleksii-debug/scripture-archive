import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Execute the real POST /api/auth handler against a disposable D1 stub.
// No production database, account, or mail provider is contacted.
const source = readFileSync(new URL("../app/api/auth/route.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal(compiled.diagnostics?.length ?? 0, 0);

function fixture() {
  const calls = { reads: 0, batches: 0, mail: 0, throttle: 0 };
  const db = {
    prepare(sql) {
      calls.reads++;
      return {
        sql,
        bind(...args) {
          return { sql, args, async first() { return null; } };
        },
      };
    },
    async batch(statements) {
      calls.batches++;
      return statements.map(() => ({ success: true, meta: { changes: 1 } }));
    },
  };
  const exports = {};
  vm.runInNewContext(compiled.outputText, {
    exports, Request, Response, URL, crypto,
    require(specifier) {
      if (specifier === "cloudflare:workers") return { env: { DB: db } };
      if (specifier.endsWith("/lib/auth")) return {
        sameOrigin: () => true,
        requestAddress: () => "127.0.0.1",
        rateLimit: async () => { calls.throttle++; return true; },
        hashPassword: async () => ({ hash: "hash", salt: "salt", iterations: 310000 }),
        randomToken: () => "verification-token",
        sha256: async () => "hashed-token",
        isAuthTestRequest: () => false,
      };
      if (specifier.endsWith("/lib/email")) return {
        sendSecurityEmail: async () => { calls.mail++; return { delivered: true }; },
      };
      throw Error("Unexpected import: " + specifier);
    },
  });
  const data = {
    email: "reader@example.invalid", password: "valid-password-123",
    firstName: "Ада", lastName: "Читач", age: 25,
    gender: "woman", maritalStatus: "single",
    acceptPrivacy: true, locale: "uk",
  };
  const request = query => new Request("https://archive.invalid/api/auth?" + query, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://archive.invalid" },
    body: JSON.stringify(data),
  });
  return { handler: exports.POST, request, calls };
}

for (const query of [
  "action=register&action=logout",
  "action=register&action=register",
  "%61ction=register&action=forgot-password",
  "action=register&action=",
  "action=register&next=%2Faccount",
  "action=register&token=unrelated",
]) {
  test("P0 R0.2: ambiguous registration URL cannot create an account or email token: " + query, async () => {
    const f = fixture();
    const rejected = await f.handler(f.request(query));
    assert.equal(rejected.status, 400, "reject ambiguous registration before D1");
    assert.equal((await rejected.json()).error, "invalid_action_query");
    assert.equal(rejected.headers.get("cache-control"), "no-store");
    assert.equal(rejected.headers.get("set-cookie"), null);
    assert.deepEqual(f.calls, { reads: 0, batches: 0, mail: 0, throttle: 0 });

    // Recovery: a canonical registration remains available after refusal.
    const valid = await f.handler(f.request("action=register"));
    assert.equal(valid.status, 201);
    assert.equal((await valid.json()).verificationRequired, true);
    assert.equal(f.calls.batches, 2, "account/profile and token batches");
    assert.equal(f.calls.mail, 1, "only the valid request sends mocked mail");
  });
}
