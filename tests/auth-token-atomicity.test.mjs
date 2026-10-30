import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import ts from "typescript";
import vm from "node:vm";

function fixture() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys=ON");
  for (const name of readdirSync(new URL("../drizzle/", import.meta.url)).filter(n => /^00(?:0[0-9]|10)_.*\.sql$/.test(n)).sort())
    db.exec(readFileSync(new URL("../drizzle/" + name, import.meta.url), "utf8"));
  db.prepare("INSERT INTO accounts (id,email,password_hash,password_salt,password_iterations,first_name,last_name) VALUES ('alice','alice@example.invalid','oldhash','oldsalt',1,'Alice','Test')").run();
  db.prepare("INSERT INTO auth_sessions(token_hash,user_id,session_version,user_agent_hash,expires_at) VALUES ('session','alice',1,'agent','2099-01-01')").run();
  let failAt = -1, unconfirmedAt = -1, missingAt = -1, zeroAt = -1, emails = 0;
  const D1 = { prepare(sql) { return { bind(...args) { return {
    first: async () => db.prepare(sql).get(...args) || null,
    run: async () => { const result = db.prepare(sql).run(...args); return { success: true, meta: { changes: Number(result.changes) } }; },
  }; } }; }, async batch(statements) {
    db.exec("BEGIN");
    try {
      const results = [];
      for (let i = 0; i < statements.length; i++) {
        if (i === failAt) throw Error("simulated storage failure");
        const receipt = await statements[i].run();
        results.push(i === unconfirmedAt ? { ...receipt, success: false } :
          i === missingAt ? { success: true } :
          i === zeroAt ? { success: true, meta: { changes: 0 } } : receipt);
      }
      db.exec("COMMIT");
      return results;
    } catch (error) { db.exec("ROLLBACK"); throw error; }
  } };
  const source = readFileSync(new URL("../app/api/auth/route.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, Request, Response, URL, crypto, require(id) {
    if (id === "cloudflare:workers") return { env: { DB: D1 } };
    if (id.endsWith("lib/auth")) return { sameOrigin: () => true, requestAddress: () => "test", rateLimit: async () => true,
      sha256: async value => `hash-${value}`, hashPassword: async () => ({ hash: "newhash", salt: "newsalt", iterations: 99 }),
      clearSessionCookie: () => "sa_session=; Max-Age=0", randomToken: () => "fresh-local-token",
      isAuthTestRequest: () => false,
      authenticateRequest: async () => ({ userId: "alice", provider: "password" }),
      verifyPassword: async password => password === "correct" };
    if (id.endsWith("lib/email")) return { sendSecurityEmail: async () => { emails++; return { delivered: true }; } };
    throw Error("Unexpected dependency");
  } });
  return { db, handler: exports, failAt: n => { failAt = n; },
    unconfirmedAt: n => { unconfirmedAt = n; }, missingAt: n => { missingAt = n; },
    zeroAt: n => { zeroAt = n; }, emails: () => emails };
}

test("verification and token consumption roll back together and remain single-use", async () => {
  const f = fixture();
  f.db.prepare("INSERT INTO auth_tokens(token_hash,user_id,purpose,expires_at) VALUES ('hash-code','alice','verify','2099-01-01')").run();
  const request = () => new Request("https://example.invalid/api/auth?action=verify&token=code");
  f.failAt(1);
  await assert.rejects(f.handler.GET(request()), /simulated storage failure/);
  assert.equal(f.db.prepare("SELECT email_verified_at FROM accounts WHERE id='alice'").get().email_verified_at, null);
  assert.equal(f.db.prepare("SELECT used_at FROM auth_tokens WHERE token_hash='hash-code'").get().used_at, null);
  f.failAt(-1);
  assert.equal((await f.handler.GET(request())).status, 303);
  assert.ok(f.db.prepare("SELECT email_verified_at FROM accounts WHERE id='alice'").get().email_verified_at);
  assert.ok(f.db.prepare("SELECT used_at FROM auth_tokens WHERE token_hash='hash-code'").get().used_at);
  assert.equal((await f.handler.GET(request())).status, 400);
  f.db.close();
});

test("password reset, session revocation and token consumption roll back together", async () => {
  const f = fixture();
  f.db.prepare("INSERT INTO auth_tokens(token_hash,user_id,purpose,expires_at) VALUES ('hash-code','alice','reset','2099-01-01')").run();
  const request = () => new Request("https://example.invalid/api/auth?action=reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: "code", password: "new-password-123" }) });
  f.failAt(2);
  await assert.rejects(f.handler.POST(request()), /simulated storage failure/);
  assert.equal(f.db.prepare("SELECT password_hash FROM accounts WHERE id='alice'").get().password_hash, "oldhash");
  assert.equal(f.db.prepare("SELECT revoked_at FROM auth_sessions WHERE token_hash='session'").get().revoked_at, null);
  assert.equal(f.db.prepare("SELECT used_at FROM auth_tokens WHERE token_hash='hash-code'").get().used_at, null);
  f.failAt(-1);
  assert.equal((await f.handler.POST(request())).status, 200);
  assert.equal(f.db.prepare("SELECT password_hash FROM accounts WHERE id='alice'").get().password_hash, "newhash");
  assert.ok(f.db.prepare("SELECT revoked_at FROM auth_sessions WHERE token_hash='session'").get().revoked_at);
  assert.ok(f.db.prepare("SELECT used_at FROM auth_tokens WHERE token_hash='hash-code'").get().used_at);
  assert.equal((await f.handler.POST(request())).status, 400);
  f.db.close();
});

test("expired tokens cannot change an account or revoke a session", async () => {
  const f = fixture();
  f.db.prepare("INSERT INTO auth_tokens(token_hash,user_id,purpose,expires_at) VALUES ('hash-verify','alice','verify','2000-01-01')").run();
  f.db.prepare("INSERT INTO auth_tokens(token_hash,user_id,purpose,expires_at) VALUES ('hash-reset','alice','reset','2000-01-01')").run();
  assert.equal((await f.handler.GET(new Request("https://example.invalid/api/auth?action=verify&token=verify"))).status, 400);
  const reset = new Request("https://example.invalid/api/auth?action=reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: "reset", password: "new-password-123" }) });
  assert.equal((await f.handler.POST(reset)).status, 400);
  assert.equal(f.db.prepare("SELECT email_verified_at FROM accounts WHERE id='alice'").get().email_verified_at, null);
  assert.equal(f.db.prepare("SELECT password_hash FROM accounts WHERE id='alice'").get().password_hash, "oldhash");
  assert.equal(f.db.prepare("SELECT revoked_at FROM auth_sessions WHERE token_hash='session'").get().revoked_at, null);
  f.db.close();
});

test("unconfirmed verification consumption never claims an email verified", async () => {
  const f = fixture();
  f.db.prepare("INSERT INTO auth_tokens(token_hash,user_id,purpose,expires_at) VALUES ('hash-code','alice','verify','2099-01-01')").run();
  f.unconfirmedAt(1);
  const response = await f.handler.GET(new Request("https://example.invalid/api/auth?action=verify&token=code"));
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, "verification_unavailable");
  assert.equal(response.headers.get("location"), null);
  f.db.close();
});

test("unconfirmed reset token consumption never claims password reset success", async () => {
  const f = fixture();
  f.db.prepare("INSERT INTO auth_tokens(token_hash,user_id,purpose,expires_at) VALUES ('hash-code','alice','reset','2099-01-01')").run();
  f.unconfirmedAt(2);
  const request = new Request("https://example.invalid/api/auth?action=reset-password", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: "code", password: "new-password-123" }),
  });
  const response = await f.handler.POST(request);
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, "password_reset_unavailable");
  f.db.close();
});

test("unconfirmed new verification token may not trigger any email dispatch", async () => {
  const f = fixture();
  f.unconfirmedAt(1);
  const request = new Request("https://example.invalid/api/auth?action=resend-verification", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "alice@example.invalid" }),
  });
  await assert.rejects(f.handler.POST(request), /token_save_unconfirmed/);
  assert.equal(f.emails(), 0);
  f.db.close();
});

test("unacknowledged session revocation never reports password change success", async () => {
  const f = fixture();
  f.unconfirmedAt(1);
  const request = new Request("https://example.invalid/api/auth?action=change-password", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword: "correct", newPassword: "new-password-123" }),
  });
  const response = await f.handler.POST(request);
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, "password_change_unavailable");
  assert.equal(response.headers.get("set-cookie"), null);
  f.db.close();
});

function registrationRequest(email = "new-reader@example.invalid") {
  return new Request("https://example.invalid/api/auth?action=register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email, password: "long-password-123", firstName: "New", lastName: "Reader",
      age: 25, gender: "prefer_not", maritalStatus: "single", acceptPrivacy: true, locale: "uk",
    }),
  });
}

test("R0.2: registered account and profile have two confirmed D1 INSERT receipts before verification email", async () => {
  const f = fixture();
  const result = await f.handler.POST(registrationRequest());
  assert.equal(result.status, 201);
  assert.equal((await result.json()).verificationRequired, true);
  assert.equal(f.db.prepare("SELECT COUNT(*) AS n FROM accounts WHERE email='new-reader@example.invalid'").get().n, 1);
  assert.equal(f.db.prepare("SELECT COUNT(*) AS n FROM profiles WHERE email='new-reader@example.invalid'").get().n, 1);
  assert.equal(f.db.prepare("SELECT COUNT(*) AS n FROM auth_tokens WHERE purpose='verify'").get().n, 1);
  assert.equal(f.emails(), 1);
  f.db.close();
});

for (const index of [0, 1]) {
  test("R0.2: unconfirmed registration INSERT receipt " + index + " cannot claim 201 or send email", async () => {
    const f = fixture();
    f.unconfirmedAt(index);
    const result = await f.handler.POST(registrationRequest());
    assert.equal(result.status, 503);
    assert.equal((await result.json()).error, "registration_save_unconfirmed");
    // Underlying batch may have committed despite uncertain acknowledgement;
    // never retry registration or send a token on this ambiguous state.
    assert.equal(f.db.prepare("SELECT COUNT(*) AS n FROM accounts WHERE email='new-reader@example.invalid'").get().n, 1);
    assert.equal(f.db.prepare("SELECT COUNT(*) AS n FROM auth_tokens WHERE purpose='verify'").get().n, 0);
    assert.equal(f.emails(), 0);
    f.db.close();
  });

  test("R0.2: missing registration metadata at INSERT " + index + " cannot become success", async () => {
    const f = fixture();
    f.missingAt(index);
    const result = await f.handler.POST(registrationRequest());
    assert.equal(result.status, 503);
    assert.equal((await result.json()).error, "registration_save_unconfirmed");
    assert.equal(f.emails(), 0);
    f.db.close();
  });

  test("R0.2: zero-change registration INSERT receipt " + index + " is rejected", async () => {
    const f = fixture();
    f.zeroAt(index);
    const result = await f.handler.POST(registrationRequest());
    assert.equal(result.status, 503);
    assert.equal((await result.json()).error, "registration_save_unconfirmed");
    assert.equal(f.emails(), 0);
    f.db.close();
  });
}

test("R0.2: storage exception during account/profile batch is unavailable, not email collision", async () => {
  const f = fixture();
  f.failAt(1);
  const result = await f.handler.POST(registrationRequest());
  assert.equal(result.status, 503);
  assert.equal((await result.json()).error, "registration_unavailable");
  assert.equal(f.db.prepare("SELECT COUNT(*) AS n FROM accounts WHERE email='new-reader@example.invalid'").get().n, 0);
  assert.equal(f.emails(), 0);
  f.db.close();
});

test("R0.2: genuinely pre-existing email remains an explicit conflict with zero emails", async () => {
  const f = fixture();
  const result = await f.handler.POST(registrationRequest("alice@example.invalid"));
  assert.equal(result.status, 409);
  assert.equal((await result.json()).error, "email_in_use");
  assert.equal(f.emails(), 0);
  f.db.close();
});
