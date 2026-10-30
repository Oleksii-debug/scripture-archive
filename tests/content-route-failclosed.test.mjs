import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

// Execute the actual Next route code; only Cloudflare DB and session are mocked.
const source = readFileSync(new URL("../app/api/content/route.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal(compiled.diagnostics?.length ?? 0, 0);

function harness({ dbPresent = true, auth = "ok", dbMode = "ok", isOwner = false } = {}) {
  const calls = { auth: 0, prepare: 0, first: 0, all: 0 };
  const database = {
    prepare() {
      calls.prepare++;
      if (dbMode === "throw") throw Error("database interrupted");
      return {
        bind() { return this; },
        async first() {
          calls.first++;
          if (dbMode === "corrupt") return { data: "{broken json", updated_at: "now" };
          return null;
        },
        async all() {
          calls.all++;
          return { success: true, results: [] };
        },
      };
    },
  };
  const exports = {};
  vm.runInNewContext(compiled.outputText, {
    exports, Request, Response, URL, crypto,
    require(specifier) {
      if (specifier === "cloudflare:workers")
        return { env: { DB: dbPresent ? database : undefined } };
      if (specifier === "../../../lib/auth") return {
        authenticateRequest: async () => {
          calls.auth++;
          if (auth === "throw") throw Error("identity D1 unavailable");
          return auth === "anonymous" ? null : { userId: "editor-one", provider: "password" };
        },
        isVerifiedOwner: () => isOwner,
        sameOrigin: request => request.headers.get("origin") === new URL(request.url).origin,
      };
      throw Error("Unexpected import: " + specifier);
    },
  });
  async function invoke(method, { admin = false, origin = "https://scripture.test" } = {}) {
    const url = "https://scripture.test/api/content" + (method === "GET" && admin ? "?admin=1" : method === "DELETE" ? "?id=one" : "");
    const request = new Request(url, {
      method,
      headers: { Origin: origin, "Content-Type": "application/json" },
      ...(method === "PUT" ? { body: "{}" } : {}),
    });
    const response = await exports[method](request);
    return { status: response.status, body: await response.json(), cache: response.headers.get("cache-control") };
  }
  return { invoke, calls };
}

for (const method of ["GET", "PUT", "DELETE"]) {
  test(method + " rejects absent D1 as private 503", async () => {
    const h = harness({ dbPresent: false });
    const r = await h.invoke(method);
    assert.equal(r.status, 503);
    assert.equal(r.body.error, "content_unavailable");
    assert.match(r.cache, /no-store, private/);
    assert.equal(h.calls.auth, 0);
    assert.equal(h.calls.prepare, 0);
  });
  test(method + " reports D1 interruption rather than leaking a 500", async () => {
    const h = harness({ dbMode: "throw", isOwner: true });
    const r = await h.invoke(method);
    assert.equal(r.status, method === "PUT" ? 400 : 503);
    if (method !== "PUT") {
      assert.equal(r.body.error, "content_unavailable");
      assert.match(r.cache, /no-store/);
    }
  });
}

for (const method of ["PUT", "DELETE"]) {
  test(method + " preserves cross-origin 403 before identity access", async () => {
    const h = harness({ dbPresent: false, auth: "throw" });
    const r = await h.invoke(method, { origin: "https://attacker.invalid" });
    assert.equal(r.status, 403);
    assert.equal(r.body.error, "cross_origin_request");
    assert.equal(h.calls.auth, 0);
  });
  test(method + " refuses identity-store outage with private 503 and zero DB queries", async () => {
    const h = harness({ auth: "throw" });
    const r = await h.invoke(method);
    assert.equal(r.status, 503);
    assert.equal(r.body.error, "content_unavailable");
    assert.match(r.cache, /no-store, private/);
    assert.equal(h.calls.prepare, 0);
  });
  test(method + " keeps true non-owner / anonymous authorization failure", async () => {
    const h = harness({ auth: "anonymous" });
    const r = await h.invoke(method);
    assert.equal(r.status, 403);
    assert.equal(r.body.error, "forbidden");
    assert.equal(h.calls.prepare, 0);
  });
}

test("admin content GET contains identity-store outages without DB reads", async () => {
  const h = harness({ auth: "throw" });
  const r = await h.invoke("GET", { admin: true });
  assert.equal(r.status, 503);
  assert.equal(r.body.error, "content_unavailable");
  assert.equal(h.calls.prepare, 0);
});

test("non-owner admin GET remains forbidden rather than disclosing editor content", async () => {
  const h = harness({ auth: "anonymous" });
  const r = await h.invoke("GET", { admin: true });
  assert.equal(r.status, 403);
  assert.equal(r.body.error, "forbidden");
  assert.equal(h.calls.prepare, 0);
});

test("public content GET retains its empty fallback and does not require account", async () => {
  const h = harness({ auth: "throw" });
  const r = await h.invoke("GET");
  assert.equal(r.status, 200);
  assert.deepEqual(JSON.parse(JSON.stringify(r.body)), { updates: [], text: {}, liveNote: { uk: "", ru: "", en: "" } });
  assert.equal(h.calls.auth, 0);
  assert.equal(h.calls.first, 1);
});

test("corrupt public content JSON fails closed instead of exposing a framework error", async () => {
  const h = harness({ dbMode: "corrupt" });
  const r = await h.invoke("GET");
  assert.equal(r.status, 503);
  assert.equal(r.body.error, "content_unavailable");
  assert.match(r.cache, /no-store, private/);
});
