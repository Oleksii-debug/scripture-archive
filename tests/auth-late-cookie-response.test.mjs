import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Execute the real canonical route, not a duplicate authentication handler.
// The delayed D1 boundary models the browser receiving a prior request's
// response after a new login has already installed a different session cookie.
const routeSource = readFileSync(new URL("../app/api/auth/route.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(routeSource, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
  reportDiagnostics: true,
});
assert.equal(compiled.diagnostics?.length ?? 0, 0);

function fixture(fail = false) {
  let release;
  let reached;
  const blocked = new Promise(resolve => { release = resolve; });
  const entered = new Promise(resolve => { reached = resolve; });
  const authority = [];
  let revokeCount = 0;
  async function delay() {
    reached();
    await blocked;
  }
  const db = {
    prepare(sql) {
      return {
        sql,
        bind() { return this; },
        async first() {
          if (sql.includes("SELECT CURRENT_TIMESTAMP"))
            return { checked_at: "2026-10-30 13:00:00" };
          if (sql.includes("FROM auth_tokens"))
            return { token_hash: "reset-hash", user_id: "old-user" };
          return {
            id: "old-user", email: "old@example.invalid",
            email_verified_at: "2026-10-01", session_version: 1,
            password_hash: "hash", password_salt: "salt",
            password_iterations: 310000,
          };
        },
      };
    },
    async batch(statements) {
      authority.push(...statements.map(statement => statement.sql));
      await delay();
      return statements.map(() => fail
        ? { success: false, meta: { changes: 0 } }
        : { success: true, meta: { changes: 1 } });
    },
  };
  const handlers = {};
  vm.runInNewContext(compiled.outputText, {
    exports: handlers, Request, Response, URL, crypto,
    require(specifier) {
      if (specifier === "cloudflare:workers") return { env: { DB: db } };
      if (specifier.endsWith("/lib/auth")) return {
        authenticateRequest: async request =>
          request.headers.get("cookie")?.includes("sa_session=old-token")
            ? { userId: "old-user", email: "old@example.invalid",
                provider: "password", emailVerified: true } : null,
        createSession: async () => ({
          token: "new-token",
          cookie: "sa_session=new-token; Path=/; HttpOnly; SameSite=Lax; Secure",
        }),
        hashPassword: async () => ({ hash: "new-hash", salt: "salt", iterations: 310000 }),
        verifyPassword: async () => true,
        sha256: async value => "hash:" + value,
        rateLimit: async () => true,
        requestAddress: () => "127.0.0.1",
        sameOrigin: () => true,
        randomToken: () => "token",
        PASSWORD_ITERATIONS: 310000,
        isAuthTestRequest: () => false,
        revokeCurrentSession: async () => {
          revokeCount++;
          await delay();
          if (fail) throw Error("D1 denied revocation");
        },
      };
      if (specifier.endsWith("/lib/email"))
        return { sendSecurityEmail: async () => ({ delivered: true }) };
      throw Error("Unexpected route dependency: " + specifier);
    },
  });
  return { handlers, entered, release, authority, revoked: () => revokeCount };
}

function request(action, old = true) {
  const payload = {
    login: { email: "new@example.invalid", password: "new-password-123" },
    logout: {},
    "change-password": { currentPassword: "old-password-123", newPassword: "next-password-123" },
    "reset-password": { token: "valid-reset-token", password: "next-password-123" },
    "delete-account": { password: "old-password-123" },
  }[action];
  return new Request("https://archive.example.invalid/api/auth?action=" + action, {
    method: "POST",
    headers: { "Content-Type": "application/json",
      ...(old ? { Cookie: "sa_session=old-token" } : {}) },
    body: JSON.stringify(payload),
  });
}

function applySessionCookie(response, current) {
  const header = response.headers.get("set-cookie");
  if (!header) return current;
  const value = /^sa_session=([^;]*)/.exec(header);
  return value ? decodeURIComponent(value[1]) : current;
}

for (const action of ["logout", "change-password", "reset-password", "delete-account"]) {
  test("a late " + action + " response cannot erase a newer login cookie", { timeout: 8000 }, async () => {
    const f = fixture();
    const oldResponsePromise = f.handlers.POST(request(action));
    await f.entered;
    const login = await f.handlers.POST(request("login", false));
    assert.equal(login.status, 200);
    assert.match(login.headers.get("set-cookie"), /^sa_session=new-token;/);
    let browserSession = applySessionCookie(login, "old-token");
    assert.equal(browserSession, "new-token");
    f.release();
    const oldResponse = await oldResponsePromise;
    assert.equal(oldResponse.status, 200);
    assert.equal(oldResponse.headers.get("set-cookie"), null,
      "a completed old-session response must not issue a shared-cookie deletion");
    browserSession = applySessionCookie(oldResponse, browserSession);
    assert.equal(browserSession, "new-token");
    if (action === "logout") {
      assert.equal(f.revoked(), 1, "revocation must still happen");
    } else {
      assert.ok(f.authority.some(sql => /(?:UPDATE\s+auth_sessions|DELETE\s+FROM\s+auth_sessions)/.test(sql)),
        "the account transition must still revoke server-side sessions");
    }
  });

  test("denied " + action + " revocation cannot claim success or clear cookies", { timeout: 8000 }, async () => {
    const f = fixture(true);
    const responsePromise = f.handlers.POST(request(action));
    await f.entered;
    f.release();
    const response = await responsePromise;
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("set-cookie"), null);
    assert.notEqual((await response.json()).ok, true);
  });
}

test("new login still sets a durable-session cookie", async () => {
  const f = fixture();
  const response = await f.handlers.POST(request("login", false));
  assert.equal(response.status, 200);
  assert.equal(applySessionCookie(response, "old-token"), "new-token");
});
