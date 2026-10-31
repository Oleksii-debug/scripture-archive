import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Exercise real POST /api/auth?action=login with a controlled D1/hash adapter.
// The normal and dummy PBKDF2 paths must never receive an oversized password.
const source = readFileSync(new URL("../app/api/auth/route.ts", import.meta.url), "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal(transpiled.diagnostics?.length ?? 0, 0);

function fixture(exists) {
  const calls = { limit: 0, reads: 0, hash: 0, verify: 0, sessions: 0 };
  const db = {
    prepare() {
      return {
        bind() { return this; },
        async first() {
          calls.reads++;
          return exists ? {
            id: "account-1", email: "reader@example.invalid", email_verified_at: "2026-10-01",
            password_hash: "stored", password_salt: "salt", password_iterations: 310000,
            session_version: 1,
          } : null;
        },
      };
    },
  };
  const exports = {};
  vm.runInNewContext(transpiled.outputText, {
    exports, URL, Request, Response, crypto,
    require(specifier) {
      if (specifier === "cloudflare:workers") return { env: { DB: db } };
      if (specifier.endsWith("/lib/auth")) return {
        sameOrigin: () => true,
        requestAddress: () => "203.0.113.55",
        rateLimit: async () => { calls.limit++; return true; },
        verifyPassword: async () => { calls.verify++; return true; },
        hashPassword: async () => {
          calls.hash++;
          return { hash: "dummy", salt: "salt", iterations: 310000 };
        },
        createSession: async () => {
          calls.sessions++;
          return { cookie: "sa_session=token; Path=/; HttpOnly; SameSite=Lax; Secure" };
        },
        PASSWORD_ITERATIONS: 310000,
      };
      if (specifier.endsWith("/lib/email")) return { sendSecurityEmail: async () => ({ delivered: true }) };
      throw Error("Unexpected dependency: " + specifier);
    },
  });
  async function login(password) {
    const request = new Request("https://scripture-archive.com/api/auth?action=login", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://scripture-archive.com" },
      body: JSON.stringify({ email: "reader@example.invalid", password }),
    });
    return exports.POST(request);
  }
  return { calls, login };
}

for (const length of [129, 130, 256, 1024, 4096, 100000]) {
  for (const exists of [false, true]) {
    test("password length " + length + " cannot trigger PBKDF2 or D1 account read (exists=" + exists + ")", async () => {
      const f = fixture(exists);
      const response = await f.login("x".repeat(length));
      assert.equal(response.status, 401);
      assert.deepEqual(await response.json(), { error: "invalid_credentials" });
      assert.equal(response.headers.get("set-cookie"), null);
      assert.deepEqual(f.calls, { limit: 1, reads: 0, hash: 0, verify: 0, sessions: 0 });
    });
  }
}

for (const bad of [null, 100, true, false, [], {}, { length: 12 }]) {
  for (const exists of [false, true]) {
    test("non-string password is denied before hash (kind=" + JSON.stringify(bad) + ", exists=" + exists + ")", async () => {
      const f = fixture(exists);
      const response = await f.login(bad);
      assert.equal(response.status, 401);
      assert.equal(response.headers.get("set-cookie"), null);
      assert.deepEqual(f.calls, { limit: 1, reads: 0, hash: 0, verify: 0, sessions: 0 });
    });
  }
}

for (const length of [1, 12, 64, 127, 128]) {
  test("historical permitted account password length " + length + " reaches normal verification", async () => {
    const f = fixture(true);
    const response = await f.login("x".repeat(length));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("set-cookie")?.startsWith("sa_session=token;"), true);
    assert.deepEqual(f.calls, { limit: 1, reads: 1, hash: 0, verify: 1, sessions: 1 });
  });
}

for (const length of [1, 12, 128]) {
  test("unknown account length " + length + " preserves fixed dummy hash", async () => {
    const f = fixture(false);
    const response = await f.login("x".repeat(length));
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "invalid_credentials" });
    assert.deepEqual(f.calls, { limit: 1, reads: 1, hash: 1, verify: 0, sessions: 0 });
  });
}

test("missing password is rejected before account lookup", async () => {
  const f = fixture(true);
  const response = await f.login(undefined);
  assert.equal(response.status, 401);
  assert.deepEqual(f.calls, { limit: 1, reads: 0, hash: 0, verify: 0, sessions: 0 });
});
