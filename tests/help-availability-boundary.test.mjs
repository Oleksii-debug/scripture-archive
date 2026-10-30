import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../app/api/help/route.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal(compiled.diagnostics?.length ?? 0, 0);

function harness({ dbPresent = true, db = "ok", auth = "anonymous", limit = "allow" } = {}) {
  const calls = { auth: 0, rate: 0, prepare: 0, batch: 0, mail: 0 };
  const database = {
    prepare() {
      calls.prepare++;
      if (db === "prepare-throw") throw Error("D1 prepare failed");
      return {
        bind() { return this; },
        async all() {
          if (db === "read-throw") throw Error("D1 read failed");
          return { success: true, results: [] };
        },
      };
    },
    async batch(statements) {
      calls.batch++;
      if (db === "batch-throw") throw Error("D1 write failed");
      return statements.map(() => ({ success: db !== "failed-ack", meta: { changes: db === "failed-ack" ? 0 : 1 } }));
    },
  };
  const exports = {};
  vm.runInNewContext(compiled.outputText, {
    exports, Request, Response, URL, FormData, File, crypto, TextDecoder, Uint8Array, DataView, btoa,
    require(specifier) {
      if (specifier === "cloudflare:workers") return { env: { DB: dbPresent ? database : undefined } };
      if (specifier === "../../../lib/auth") return {
        authenticateRequest: async () => {
          calls.auth++;
          if (auth === "throw") throw Error("session D1 unavailable");
          if (auth === "anonymous") return null;
          return { userId: "owner-one", email: "dordiaioleksii1@gmail.com", emailVerified: true, provider: "password", fullName: "Owner" };
        },
        rateLimit: async () => {
          calls.rate++;
          if (limit === "throw") throw Error("rate-limit D1 unavailable");
          return limit !== "deny";
        },
        requestAddress: () => "test-address",
        sameOrigin: request => request.headers.get("origin") === new URL(request.url).origin,
      };
      if (specifier === "../../../lib/email") return {
        sendSupportRequestEmail: async () => {
          calls.mail++;
          return { delivered: false };
        },
      };
      throw Error("Unexpected dependency: " + specifier);
    },
  });
  async function invoke(method, origin = "https://scripture.test") {
    const form = new FormData();
    form.set("email", "visitor@example.org");
    form.set("subject", "Need help");
    form.set("message", "This is a detailed support request.");
    form.set("acceptPrivacy", "yes");
    const request = new Request("https://scripture.test/api/help", {
      method, headers: { Origin: origin },
      ...(method === "POST" ? { body: form } : {}),
    });
    const response = await exports[method](request);
    return { status: response.status, body: await response.json(), cache: response.headers.get("cache-control") };
  }
  return { invoke, calls };
}

for (const method of ["POST", "GET"]) {
  test(method + " refuses missing D1 before accessing identity", async () => {
    const h = harness({ dbPresent: false });
    const r = await h.invoke(method);
    assert.equal(r.status, 503);
    assert.equal(r.body.error, "database_unavailable");
    assert.equal(h.calls.auth, 0);
  });
  test(method + " contains identity-store interruption", async () => {
    const h = harness({ auth: "throw" });
    const r = await h.invoke(method);
    assert.equal(r.status, 503);
    assert.equal(r.body.error, "support_unavailable");
    assert.match(r.cache, /no-store, private/);
    assert.equal(h.calls.prepare, 0);
  });
}

test("POST rejects cross-origin mutation without rate-limit, identity or database reads", async () => {
  const h = harness();
  const r = await h.invoke("POST", "https://attacker.invalid");
  assert.equal(r.status, 403);
  assert.equal(r.body.error, "cross_origin_request");
  assert.equal(h.calls.rate, 0);
  assert.equal(h.calls.auth, 0);
});

test("POST declines unavailable rate-limit authority as private 503", async () => {
  const h = harness({ limit: "throw" });
  const r = await h.invoke("POST");
  assert.equal(r.status, 503);
  assert.equal(r.body.error, "support_unavailable");
  assert.match(r.cache, /no-store, private/);
  assert.equal(h.calls.auth, 0);
  assert.equal(h.calls.prepare, 0);
});

test("POST preserves real rate limit denial with no identity lookup", async () => {
  const h = harness({ limit: "deny" });
  const r = await h.invoke("POST");
  assert.equal(r.status, 429);
  assert.equal(r.body.error, "too_many_requests");
  assert.equal(h.calls.auth, 0);
});

for (const db of ["prepare-throw", "batch-throw", "failed-ack"]) {
  test("POST "+db+" never acknowledges or emails an uncommitted support request", async () => {
    const h = harness({ db });
    const r = await h.invoke("POST");
    assert.equal(r.status, 503);
    assert.equal(r.body.error, "support_save_failed");
    assert.equal(h.calls.mail, 0);
  });
}

test("anonymous POST still persists a verified request and never sends synthetic email", async () => {
  const h = harness();
  const r = await h.invoke("POST");
  assert.equal(r.status, 201);
  assert.equal(r.body.ok, true);
  assert.equal(h.calls.batch, 1);
  assert.equal(h.calls.mail, 1);
});

test("GET preserves genuine non-owner denial", async () => {
  const h = harness({ auth: "anonymous" });
  const r = await h.invoke("GET");
  assert.equal(r.status, 403);
  assert.equal(r.body.error, "forbidden");
  assert.equal(h.calls.prepare, 0);
});

test("GET remains available to verified owner with private support data", async () => {
  const h = harness({ auth: "owner" });
  const r = await h.invoke("GET");
  assert.equal(r.status, 200);
  assert.deepEqual(JSON.parse(JSON.stringify(r.body.items)), []);
  assert.equal(h.calls.prepare, 1);
});

test("GET maps private D1 listing failure to controlled 503", async () => {
  const h = harness({ auth: "owner", db: "read-throw" });
  const r = await h.invoke("GET");
  assert.equal(r.status, 503);
  assert.equal(r.body.error, "support_unavailable");
});
