import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Execute the production registration route with the real TypeScript source.
// No alternate implementation of registration or input validation is used.
const source = readFileSync(new URL("../app/api/auth/route.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal(compiled.diagnostics?.length ?? 0, 0);

function fixture() {
  const prepared = [], batches = [], mail = [];
  const db = {
    prepare(sql) {
      prepared.push(sql);
      return {
        bind(...args) {
          return { sql, args, async first() { return null; } };
        },
      };
    },
    async batch(statements) {
      batches.push(statements.map(({ sql, args }) => ({ sql, args })));
      return statements.map(() => ({ success: true, meta: { changes: 1 } }));
    },
  };
  const handlers = {};
  vm.runInNewContext(compiled.outputText, {
    exports: handlers, Request, Response, URL, crypto,
    require(specifier) {
      if (specifier === "cloudflare:workers") return { env: { DB: db } };
      if (specifier.endsWith("/lib/auth")) return {
        sameOrigin: () => true,
        requestAddress: () => "127.0.0.1",
        rateLimit: async () => true,
        hashPassword: async () => ({ hash: "hash", salt: "salt", iterations: 310000 }),
        randomToken: () => "verification-token",
        sha256: async () => "hashed-token",
        isAuthTestRequest: () => false,
      };
      if (specifier.endsWith("/lib/email")) return {
        sendSecurityEmail: async (...args) => { mail.push(args); return { delivered: true }; },
      };
      throw Error("Unexpected import: " + specifier);
    },
  });
  const baseline = {
    email: "reader@example.invalid",
    password: "valid-password-123",
    firstName: "Ада",
    lastName: "Читач",
    age: 25,
    gender: "woman",
    tradition: "protestant",
    maritalStatus: "single",
    denomination: "Громада",
    church: "Місцева громада",
    acceptSensitive: true,
    acceptPrivacy: true,
    locale: "uk",
  };
  async function register(override = {}) {
    const response = await handlers.POST(new Request("https://archive.invalid/api/auth?action=register", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://archive.invalid" },
      body: JSON.stringify({ ...baseline, ...override }),
    }));
    return { status: response.status, body: await response.json(),
      cache: response.headers.get("cache-control") };
  }
  return { prepared, batches, mail, register };
}

for (const [field, text, maximum] of [
  ["firstName", "І", 80],
  ["lastName", "Ї", 80],
  ["denomination", "Г", 160],
  ["church", "Ц", 160],
]) {
  test("registration refuses overlength " + field + " before any account or token write", async () => {
    const h = fixture();
    const response = await h.register({ [field]: text.repeat(maximum) + "І" });
    assert.equal(response.status, 400);
    assert.equal(response.body.error, "invalid_registration");
    assert.equal(h.prepared.length, 0);
    assert.equal(h.batches.length, 0);
    assert.equal(h.mail.length, 0);
    assert.match(response.cache, /no-store/);
  });
  test("registration accepts exactly bounded " + field + " without silent shortening", async () => {
    const h = fixture();
    const value = text.repeat(maximum);
    const response = await h.register({ [field]: "  " + value + "  " });
    assert.equal(response.status, 201);
    assert.equal(response.body.ok, true);
    assert.equal(h.batches.length, 2);
    assert.ok(h.batches[0].some(statement => statement.args.includes(value)),
      "the exact trimmed Unicode field reaches the canonical SQL statement");
    assert.equal(h.mail.length, 1);
  });
}

test("valid default registration still persists account, profile, and verification token", async () => {
  const h = fixture();
  const response = await h.register();
  assert.equal(response.status, 201);
  assert.equal(response.body.verificationRequired, true);
  assert.equal(h.batches.length, 2);
  assert.equal(h.batches[0].length, 2);
  assert.equal(h.batches[1].length, 2);
  assert.equal(h.mail.length, 1);
});

for (const field of ["denomination", "church"]) {
  for (const malformed of [0, false, [], {}, ["Громада"]]) {
    test("registration refuses typed non-text " + field + " " + JSON.stringify(malformed) + " before D1/email", async () => {
      const h = fixture();
      const response = await h.register({ [field]: malformed });
      assert.equal(response.status, 400);
      assert.equal(response.body.error, "invalid_registration");
      assert.equal(h.prepared.length, 0, "wrong-typed input must not read an account");
      assert.equal(h.batches.length, 0, "wrong-typed input must not write to D1");
      assert.equal(h.mail.length, 0, "wrong-typed input must not trigger verification email");
    });
  }
}

test("omitted and null optional community details remain valid with no sensitive consent", async () => {
  const h = fixture();
  const response = await h.register({
    denomination: null,
    church: null,
    tradition: "prefer_not",
    acceptSensitive: false,
  });
  assert.equal(response.status, 201);
  assert.equal(h.batches.length, 2);
  assert.equal(h.mail.length, 1);
  const statement = h.batches[0][1];
  assert.ok(statement.sql.includes("INSERT INTO profiles"));
  assert.equal(statement.args.filter(value => value === "Громада" || value === "Місцева громада").length, 0);
});
