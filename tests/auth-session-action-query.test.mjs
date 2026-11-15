import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// P0 R0.2: exercise the real POST handler with disposable dependencies.
// No production D1, session store, or email provider is contacted.
const source = readFileSync(new URL("../app/api/auth/route.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal(compiled.diagnostics?.length ?? 0, 0);

function fixture() {
  const calls = { reads: 0, limits: 0, verifies: 0, sessions: 0, revokes: 0, mail: 0 };
  const account = {
    id: "reader-1", email: "reader@example.invalid",
    email_verified_at: "2026-10-01", password_hash: "hash",
    password_salt: "salt", password_iterations: 310000, session_version: 1,
  };
  const db = {
    prepare() {
      calls.reads++;
      return { bind() { return { first: async () => account }; } };
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
        rateLimit: async () => { calls.limits++; return true; },
        verifyPassword: async () => { calls.verifies++; return true; },
        createSession: async () => {
          calls.sessions++;
          return { cookie: "sa_session=fresh; Path=/; HttpOnly; SameSite=Lax; Secure" };
        },
        revokeCurrentSession: async () => { calls.revokes++; },
      };
      if (specifier.endsWith("/lib/email")) return {
        sendSecurityEmail: async () => { calls.mail++; return { delivered: true }; },
      };
      throw Error("Unexpected dependency: " + specifier);
    },
  });
  const request = query => new Request("https://archive.invalid/api/auth?" + query, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://archive.invalid" },
    body: JSON.stringify({ email: "reader@example.invalid", password: "valid-password-123" }),
  });
  return { calls, request, handler: exports.POST };
}

for (const action of ["login", "logout"]) {
  for (const suffix of [
    "&action=login",
    "&action=logout",
    "&action=",
    "&next=%2Faccount",
    "&token=unrelated",
    "&%61ction=logout",
  ]) {
    const query = "action=" + action + suffix;
    test("P0 R0.2: reject ambiguous session URL before any side effect: " + query, async () => {
      const f = fixture();
      const rejected = await f.handler(f.request(query));
      assert.equal(rejected.status, 400);
      assert.equal((await rejected.json()).error, "invalid_action_query");
      assert.equal(rejected.headers.get("cache-control"), "no-store");
      assert.equal(rejected.headers.get("set-cookie"), null);
      assert.deepEqual(f.calls, { reads: 0, limits: 0, verifies: 0, sessions: 0, revokes: 0, mail: 0 });

      // Recovery: a canonical URL still permits the intended session transition.
      const recovered = await f.handler(f.request("action=" + action));
      assert.equal(recovered.status, 200);
      assert.equal((await recovered.json()).ok, true);
      if (action === "login") {
        assert.match(recovered.headers.get("set-cookie"), /^sa_session=fresh;/);
        assert.equal(f.calls.reads, 1);
        assert.equal(f.calls.limits, 1);
        assert.equal(f.calls.verifies, 1);
        assert.equal(f.calls.sessions, 1);
        assert.equal(f.calls.revokes, 0);
      } else {
        assert.equal(recovered.headers.get("set-cookie"), null);
        assert.equal(f.calls.revokes, 1);
        assert.equal(f.calls.sessions, 0);
        assert.equal(f.calls.reads, 0);
      }
      assert.equal(f.calls.mail, 0);
    });
  }
}
