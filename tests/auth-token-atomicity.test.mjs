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
  let failAt = -1, unconfirmedAt = -1, missingAt = -1, zeroAt = -1, emails = 0, failReadFragment = "", batchCalls = 0, failBatchNumber = -1;
  const D1 = { prepare(sql) { return { bind(...args) { return {
    first: async () => { if (failReadFragment && sql.includes(failReadFragment)) throw Error("simulated D1 read failure"); return db.prepare(sql).get(...args) || null; },
    run: async () => { const result = db.prepare(sql).run(...args); return { success: true, meta: { changes: Number(result.changes) } }; },
  }; } }; }, async batch(statements) {
    db.exec("BEGIN");
    batchCalls++;
    try {
      if (batchCalls === failBatchNumber) throw Error("simulated token batch failure");
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
      createSession: async () => ({ cookie: "sa_session=confirmed; Secure; HttpOnly" }),
      isAuthTestRequest: () => false,
      authenticateRequest: async () => ({ userId: "alice", provider: "password" }),
      verifyPassword: async password => password === "correct" };
    if (id.endsWith("lib/email")) return { sendSecurityEmail: async () => { emails++; return { delivered: true }; } };
    throw Error("Unexpected dependency");
  } });
  return { db, handler: exports, failAt: n => { failAt = n; },
    unconfirmedAt: n => { unconfirmedAt = n; }, missingAt: n => { missingAt = n; },
    zeroAt: n => { zeroAt = n; }, failReadFor: text => { failReadFragment = text; },
    failBatchNumber: n => { failBatchNumber = n; }, emails: () => emails };
}

test("verification and token consumption roll back together and remain single-use", async () => {
  const f = fixture();
  f.db.prepare("INSERT INTO auth_tokens(token_hash,user_id,purpose,expires_at) VALUES ('hash-code','alice','verify','2099-01-01')").run();
  const request = () => new Request("https://example.invalid/api/auth?action=verify&token=code");
  f.failAt(1);
  const interrupted = await f.handler.GET(request());
  assert.equal(interrupted.status, 503);
  assert.equal((await interrupted.json()).error, "verification_unavailable");
  assert.equal(interrupted.headers.get("location"), null);
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
  const interrupted = await f.handler.POST(request());
  assert.equal(interrupted.status, 503);
  assert.equal((await interrupted.json()).error, "password_reset_unavailable");
  assert.equal(interrupted.headers.get("set-cookie"), null);
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
  const unavailable = await f.handler.POST(request);
  assert.equal(unavailable.status, 503);
  assert.equal((await unavailable.json()).error, "verification_unavailable");
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

test("R0.2: verification clock or D1 availability errors never expose an unhandled 500 or consume a token", async () => {
  const f = fixture();
  f.db.prepare("INSERT INTO auth_tokens(token_hash,user_id,purpose,expires_at) VALUES ('hash-code','alice','verify','2099-01-01')").run();
  f.failReadFor("SELECT CURRENT_TIMESTAMP");
  const request = new Request("https://example.invalid/api/auth?action=verify&token=code");
  const unavailable = await f.handler.GET(request);
  assert.equal(unavailable.status, 503);
  assert.equal((await unavailable.json()).error, "verification_unavailable");
  assert.equal(unavailable.headers.get("location"), null);
  assert.equal(f.db.prepare("SELECT email_verified_at FROM accounts WHERE id='alice'").get().email_verified_at, null);
  assert.equal(f.db.prepare("SELECT used_at FROM auth_tokens WHERE token_hash='hash-code'").get().used_at, null);
  f.failReadFor("");
  assert.equal((await f.handler.GET(request)).status, 303);
  f.db.close();
});

test("R0.2: password reset token lookup outage never mutates password, session or token", async () => {
  const f = fixture();
  f.db.prepare("INSERT INTO auth_tokens(token_hash,user_id,purpose,expires_at) VALUES ('hash-code','alice','reset','2099-01-01')").run();
  f.failReadFor("SELECT token_hash,user_id FROM auth_tokens");
  const request = () => new Request("https://example.invalid/api/auth?action=reset-password", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: "code", password: "new-password-123" }),
  });
  const unavailable = await f.handler.POST(request());
  assert.equal(unavailable.status, 503);
  assert.equal((await unavailable.json()).error, "password_reset_unavailable");
  assert.equal(unavailable.headers.get("set-cookie"), null);
  assert.equal(f.db.prepare("SELECT password_hash FROM accounts WHERE id='alice'").get().password_hash, "oldhash");
  assert.equal(f.db.prepare("SELECT revoked_at FROM auth_sessions WHERE token_hash='session'").get().revoked_at, null);
  assert.equal(f.db.prepare("SELECT used_at FROM auth_tokens WHERE token_hash='hash-code'").get().used_at, null);
  f.failReadFor("");
  assert.equal((await f.handler.POST(request())).status, 200);
  f.db.close();
});


test("R0.2: account/profile persisted but verification-token transaction fails: no success and no email", async () => {
  const f = fixture();
  f.failBatchNumber(2);
  const result = await f.handler.POST(registrationRequest("token-outage@example.invalid"));
  assert.equal(result.status, 503);
  assert.equal((await result.json()).error, "verification_unavailable");
  assert.equal(f.db.prepare("SELECT COUNT(*) AS n FROM accounts WHERE email='token-outage@example.invalid'").get().n, 1);
  assert.equal(f.db.prepare("SELECT COUNT(*) AS n FROM profiles WHERE email='token-outage@example.invalid'").get().n, 1);
  assert.equal(f.db.prepare("SELECT COUNT(*) AS n FROM auth_tokens WHERE purpose='verify'").get().n, 0);
  assert.equal(f.emails(), 0);
  f.db.close();
});

test("R0.2: resend verification token-store outage is private 503, not an uncaught error or email", async () => {
  const f = fixture();
  f.failAt(1);
  const req = new Request("https://example.invalid/api/auth?action=resend-verification", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "alice@example.invalid" }),
  });
  const result = await f.handler.POST(req);
  assert.equal(result.status, 503);
  assert.equal((await result.json()).error, "verification_unavailable");
  assert.equal(f.db.prepare("SELECT COUNT(*) AS n FROM auth_tokens WHERE user_id='alice'").get().n, 0);
  assert.equal(f.emails(), 0);
  f.db.close();
});

test("R0.2: password recovery token-store outage returns 503 without sending an invalid link", async () => {
  const f = fixture();
  f.db.prepare("UPDATE accounts SET email_verified_at=CURRENT_TIMESTAMP WHERE id='alice'").run();
  f.failAt(1);
  const req = new Request("https://example.invalid/api/auth?action=forgot-password", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "alice@example.invalid" }),
  });
  const result = await f.handler.POST(req);
  assert.equal(result.status, 503);
  assert.equal((await result.json()).error, "password_reset_unavailable");
  assert.equal(f.db.prepare("SELECT COUNT(*) AS n FROM auth_tokens WHERE user_id='alice'").get().n, 0);
  assert.equal(f.emails(), 0);
  f.db.close();
});

test("R0.2: unknown email still returns the same accepted generic resend/recovery response", async () => {
  const f = fixture();
  for (const action of ["resend-verification", "forgot-password"]) {
    const req = new Request("https://example.invalid/api/auth?action=" + action, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "nobody@example.invalid" }),
    });
    const response = await f.handler.POST(req);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
  }
  assert.equal(f.emails(), 0);
  f.db.close();
});


test("R0.2: registration duplicate-email preflight D1 outage is private 503, not 500 or a false 409", async () => {
  const f = fixture();
  f.failReadFor("SELECT id FROM accounts WHERE email=");
  const unavailable = await f.handler.POST(registrationRequest("new-reader@example.invalid"));
  assert.equal(unavailable.status, 503);
  assert.equal((await unavailable.json()).error, "registration_unavailable");
  assert.equal(f.db.prepare("SELECT COUNT(*) AS n FROM accounts WHERE email='new-reader@example.invalid'").get().n, 0);
  assert.equal(f.emails(), 0);
  f.failReadFor("");
  const restored = await f.handler.POST(registrationRequest("new-reader@example.invalid"));
  assert.equal(restored.status, 201);
  assert.equal(f.emails(), 1);
  f.db.close();
});

test("R0.2: login identity D1 outage returns a retryable 503 without set-cookie or false credentials error", async () => {
  const f = fixture();
  f.db.prepare("UPDATE accounts SET email_verified_at=CURRENT_TIMESTAMP WHERE id='alice'").run();
  f.failReadFor("SELECT * FROM accounts WHERE email=");
  const request = () => new Request("https://example.invalid/api/auth?action=login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "alice@example.invalid", password: "correct" }),
  });
  const unavailable = await f.handler.POST(request());
  assert.equal(unavailable.status, 503);
  assert.equal((await unavailable.json()).error, "authentication_unavailable");
  assert.equal(unavailable.headers.get("set-cookie"), null);
  f.failReadFor("");
  const restored = await f.handler.POST(request());
  assert.equal(restored.status, 200);
  assert.match(restored.headers.get("set-cookie") || "", /^sa_session=confirmed/);
  f.db.close();
});

test("R0.2: wrong password still returns 401 and does not mint a session", async () => {
  const f = fixture();
  f.db.prepare("UPDATE accounts SET email_verified_at=CURRENT_TIMESTAMP WHERE id='alice'").run();
  const bad = await f.handler.POST(new Request("https://example.invalid/api/auth?action=login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "alice@example.invalid", password: "incorrect" }),
  }));
  assert.equal(bad.status, 401);
  assert.equal((await bad.json()).error, "invalid_credentials");
  assert.equal(bad.headers.get("set-cookie"), null);
  f.db.close();
});


test("SA-EXT-16 registration ages: reject coercible/non-decimal inputs without account or token writes", async () => {
  const f = fixture();
  try {
    // Every value below used to be either coerced to a permitted 13–120 age
    // (arrays, hexadecimal, exponent, whitespace) or is an invalid boundary.
    const malformed = [
      null, true, false, [], [18], ["18"], [100], {},
      { age: 18 }, "", " ", " 18", "18 ", "\\t18", "\\n18",
      "0x12", "0X12", "0b10010", "0o22", "1.8e1", "18e0",
      "1E2", "100e0", "18.0", "100.00", "+18", "-18",
      "018", "0018", "18years", "18_0", "Infinity", "NaN",
      "1e2", "0x64", "100.0", "1.3e1",
      12, 121, -1, 0, 12.5, 18.1, Number.MAX_SAFE_INTEGER + 1
    ];
    for (const age of malformed) {
      const request = new Request("https://example.invalid/api/auth?action=register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "fresh@example.invalid", password: "a-long-password-123",
          firstName: "Reader", lastName: "Test", age,
          gender: "prefer_not", maritalStatus: "prefer_not",
          acceptPrivacy: true
        })
      });
      const response = await f.handler.POST(request);
      assert.equal(response.status, 400, "age input " + JSON.stringify(age));
      assert.equal((await response.json()).error, "invalid_registration");
      assert.equal(f.db.prepare("SELECT COUNT(*) AS n FROM accounts").get().n, 1);
      assert.equal(f.db.prepare("SELECT COUNT(*) AS n FROM auth_tokens").get().n, 0);
      assert.equal(f.emails(), 0, "invalid age must not trigger verification email");
    }
  } finally { f.db.close(); }
});

test("SA-EXT-16 registration ages: accepted decimal form and JSON integer preserve exact profile age", async () => {
  for (const input of ["13", 18, "100", 120]) {
    const f = fixture();
    try {
      const response = await f.handler.POST(new Request("https://example.invalid/api/auth?action=register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "fresh@example.invalid", password: "a-long-password-123",
          firstName: "Reader", lastName: "Test", age: input,
          gender: "prefer_not", maritalStatus: "prefer_not",
          acceptPrivacy: true
        })
      }));
      assert.equal(response.status, 201, "accepted age " + JSON.stringify(input));
      const profile = f.db.prepare("SELECT age,age_range FROM profiles WHERE email=?").get("fresh@example.invalid");
      assert.equal(profile.age, Number(input));
      assert.equal(profile.age_range, Number(input) < 18 ? "13-17" : Number(input) <= 24 ? "18-24" : Number(input) <= 34 ? "25-34" : Number(input) <= 44 ? "35-44" : Number(input) <= 54 ? "45-54" : Number(input) <= 64 ? "55-64" : "65+");
      assert.equal(f.db.prepare("SELECT COUNT(*) AS n FROM auth_tokens").get().n, 1);
      assert.equal(f.emails(), 1);
    } finally { f.db.close(); }
  }
});


// R0.2 / SA-EXT-16: A caller must never be able to name a different account
// using a 254-character valid email followed by an invisible truncated suffix.
// This executes the actual canonical auth route and real SQLite data paths.
function maximumLengthEmail() {
  const email = "a".repeat(63) + "@" + "b".repeat(62) + "." +
    "c".repeat(62) + "." + "d".repeat(60) + ".org";
  assert.equal(email.length, 254);
  return email;
}

test("R0.2: an overlength registration email never aliases an existing 254-character account", async () => {
  const f = fixture();
  try {
    const exact = maximumLengthEmail(), overlength = exact + "suffix";
    f.db.prepare("UPDATE accounts SET email=? WHERE id='alice'").run(exact);
    const result = await f.handler.POST(registrationRequest(overlength));
    assert.equal(result.status, 400, "reject the actual submitted identity instead of reporting an aliased duplicate");
    assert.equal((await result.json()).error, "invalid_registration");
    assert.equal(f.db.prepare("SELECT COUNT(*) AS n FROM accounts").get().n, 1);
    assert.equal(f.db.prepare("SELECT COUNT(*) AS n FROM auth_tokens").get().n, 0);
    assert.equal(f.emails(), 0);
  } finally { f.db.close(); }
});

test("R0.2: an overlength login email never becomes a valid authenticated account", async () => {
  const f = fixture();
  try {
    const exact = maximumLengthEmail();
    f.db.prepare("UPDATE accounts SET email=?,email_verified_at=CURRENT_TIMESTAMP WHERE id='alice'").run(exact);
    const result = await f.handler.POST(new Request("https://example.invalid/api/auth?action=login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: exact + "suffix", password: "correct" }),
    }));
    assert.equal(result.status, 401);
    assert.equal((await result.json()).error, "invalid_credentials");
    assert.equal(result.headers.get("set-cookie"), null);
  } finally { f.db.close(); }
});

for (const action of ["resend-verification", "forgot-password"]) {
  test("R0.2: overlength email cannot trigger " + action + " for a truncated identity", async () => {
    const f = fixture();
    try {
      const exact = maximumLengthEmail();
      f.db.prepare("UPDATE accounts SET email=?,email_verified_at=? WHERE id='alice'")
        .run(exact, action === "forgot-password" ? "2026-10-30 00:00:00" : null);
      const result = await f.handler.POST(new Request("https://example.invalid/api/auth?action=" + action, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: exact + "suffix" }),
      }));
      assert.equal(result.status, 200);
      assert.deepEqual(await result.json(), { ok: true }, "preserve anti-enumeration response");
      assert.equal(f.db.prepare("SELECT COUNT(*) AS n FROM auth_tokens").get().n, 0);
      assert.equal(f.emails(), 0);
    } finally { f.db.close(); }
  });
}

test("R0.2: the exact legal maximum email remains a valid registration input", async () => {
  const f = fixture();
  try {
    const exact = maximumLengthEmail();
    const result = await f.handler.POST(registrationRequest(exact));
    assert.equal(result.status, 201);
    assert.equal(f.db.prepare("SELECT COUNT(*) AS n FROM accounts WHERE email=?").get(exact).n, 1);
    assert.equal(f.emails(), 1);
  } finally { f.db.close(); }
});
