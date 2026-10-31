import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Execute the canonical production route; a missing/unavailable D1 rate-limit
// acknowledgement must never become an unhandled 500 or claim throttling.
const source = readFileSync(new URL("../app/api/auth/route.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal(compiled.diagnostics?.length ?? 0, 0);

const actions = [
  ["register", "registration_unavailable"],
  ["resend-verification", "verification_unavailable"],
  ["forgot-password", "password_reset_unavailable"],
  ["reset-password", "password_reset_unavailable"],
];

function makeFixture(rateLimitOutcome) {
  let writes = 0;
  let reads = 0;
  let mails = 0;
  let throttles = 0;
  const db = {
    prepare() {
      reads++;
      return { bind() { return { async first() { return null; } }; } };
    },
    async batch() {
      writes++;
      return [{ success: true, meta: { changes: 1 } }];
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
        rateLimit: async () => {
          throttles++;
          if (rateLimitOutcome === "fail") throw Error("D1 rate-limit counter unavailable");
          return rateLimitOutcome === "allow";
        },
        isAuthTestRequest: () => false,
        sha256: async () => "hashed-token",
        hashPassword: async () => ({ hash: "h", salt: "s", iterations: 310000 }),
        randomToken: () => "verification-token",
      };
      if (specifier.endsWith("/lib/email")) return {
        sendSecurityEmail: async () => { mails++; return { delivered: true }; },
      };
      throw Error("Unexpected dependency " + specifier);
    },
  });
  return { handler: exports.POST, evidence: () => ({ reads, writes, mails, throttles }) };
}

function makeRequest(action) {
  const body = action === "register" ? {
    email: "new@example.invalid", password: "valid-password-123",
    firstName: "Дана", lastName: "Тест", age: 24, gender: "woman",
    maritalStatus: "single", acceptPrivacy: true, locale: "uk",
  } : action === "reset-password" ? {
    token: "valid-token", password: "valid-password-123",
  } : { email: "reader@example.invalid" };
  return new Request("https://archive.example.invalid/api/auth?action=" + action, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://archive.example.invalid" },
    body: JSON.stringify(body),
  });
}

for (const [action, expectedError] of actions) {
  test(action + ": rate-limit infrastructure failure is bounded 503 without a D1 read, write or email", async () => {
    const f = makeFixture("fail");
    const response = await f.handler(makeRequest(action));
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: expectedError });
    assert.equal(response.headers.get("set-cookie"), null);
    assert.deepEqual(f.evidence(), { reads: 0, writes: 0, mails: 0, throttles: 1 });
  });

  test(action + ": confirmed quota exhaustion remains a 429 without any mutation", async () => {
    const f = makeFixture("deny");
    const response = await f.handler(makeRequest(action));
    assert.equal(response.status, 429);
    assert.deepEqual(await response.json(), { error: "too_many_requests" });
    assert.deepEqual(f.evidence(), { reads: 0, writes: 0, mails: 0, throttles: 1 });
  });
}

for (const action of ["resend-verification", "forgot-password"]) {
  test(action + ": allowed unknown-email request preserves nonenumerating response", async () => {
    const f = makeFixture("allow");
    const response = await f.handler(makeRequest(action));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).ok, true);
    assert.deepEqual(f.evidence(), { reads: 1, writes: 0, mails: 0, throttles: 1 });
  });
}

test("reset-password allowed invalid token still gives 400, never a rate-limit 503", async () => {
  const f = makeFixture("allow");
  const response = await f.handler(makeRequest("reset-password"));
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, "invalid_or_expired_token");
  assert.deepEqual(f.evidence(), { reads: 1, writes: 0, mails: 0, throttles: 1 });
});
