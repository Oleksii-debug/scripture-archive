import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

// Execute the real production TypeScript route with stubbed infrastructure,
// rather than duplicating its authentication/error behavior in the test.
const source = readFileSync(new URL("../app/api/bookmarks/route.ts", import.meta.url), "utf8");
const catalog = JSON.parse(readFileSync(new URL("../public/data/catalog.json", import.meta.url), "utf8"));
const transpiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal(transpiled.diagnostics?.length ?? 0, 0);

function harness(authMode = "ok", dbMode = "ok", databasePresent = true) {
  const calls = { auth: 0, prepare: 0, run: 0, all: 0 };
  const db = {
    prepare() {
      calls.prepare++;
      if (dbMode === "throw") throw Error("backend unavailable");
      return {
        bind() {
          return {
            async all() {
              calls.all++;
              return dbMode === "failed-read" ? { success: false } : {
                success: true, results: [{ edition: "en", book: "GEN", chapter: 1 }],
              };
            },
            async run() {
              calls.run++;
              return dbMode === "failed-write"
                ? { success: false, meta: { changes: 0 } }
                : { success: true, meta: { changes: 1 } };
            },
            async first() { return { value: 1 }; },
          };
        },
      };
    },
  };
  const exports = {};
  vm.runInNewContext(transpiled.outputText, {
    exports, Request, Response, URL,
    require(specifier) {
      if (specifier === "cloudflare:workers") return { env: { DB: databasePresent ? db : undefined } };
      if (specifier.endsWith("public/data/catalog.json")) return { default: catalog };
      if (specifier === "../../../lib/auth") return {
        authenticateRequest: async () => {
          calls.auth++;
          if (authMode === "throw") throw Error("session D1 unavailable");
          if (authMode === "anonymous") return null;
          return { userId: "reader-one", provider: authMode === "agent" ? "agent" : "password" };
        },
        sameOrigin: request => request.headers.get("origin") === new URL(request.url).origin,
      };
      throw Error("Unexpected import: " + specifier);
    },
  });

  async function invoke(method, origin = "https://scripture.test") {
    const request = new Request("https://scripture.test/api/bookmarks", {
      method,
      headers: { Origin: origin, "Content-Type": "application/json" },
      ...(method === "GET" ? {} : {
        body: JSON.stringify({ edition: "en", book: "GEN", chapter: 1 }),
      }),
    });
    const response = await exports[method](request);
    return { status: response.status, data: await response.json(), cache: response.headers.get("cache-control") };
  }
  return { invoke, calls };
}

for (const method of ["GET", "PUT", "DELETE"]) {
  test(method + " returns private 503 when account identity lookup throws", async () => {
    const h = harness("throw");
    const response = await h.invoke(method);
    assert.equal(response.status, 503);
    assert.equal(response.data.error, "bookmarks_unavailable");
    assert.match(response.cache, /no-store/);
    assert.equal(h.calls.auth, 1);
    assert.equal(h.calls.prepare, 0, "no data is read or modified after uncertain authentication");
  });

  test(method + " preserves genuine anonymous 401 without touching D1 bookmarks", async () => {
    const h = harness("anonymous");
    const response = await h.invoke(method);
    assert.equal(response.status, 401);
    assert.equal(response.data.error, "authentication_required");
    assert.equal(h.calls.prepare, 0);
  });

  test(method + " rejects agent identity from private reader bookmarks", async () => {
    const h = harness("agent");
    const response = await h.invoke(method);
    assert.equal(response.status, 401);
    assert.equal(h.calls.prepare, 0);
  });

  test(method + " preserves successful real-route behavior", async () => {
    const h = harness();
    const response = await h.invoke(method);
    assert.equal(response.status, 200);
    assert.match(response.cache, /no-store/);
    if (method === "GET") {
      assert.deepEqual(JSON.parse(JSON.stringify(response.data.bookmarks)), [{ edition: "en", book: "GEN", chapter: 1 }]);
      assert.equal(h.calls.all, 1);
      assert.equal(h.calls.run, 0);
    } else {
      assert.equal(response.data.ok, true);
      assert.equal(h.calls.run, 1);
    }
  });

  test(method + " preserves missing database 503 without identity lookup", async () => {
    const h = harness("ok", "ok", false);
    const response = await h.invoke(method);
    assert.equal(response.status, 503);
    assert.equal(response.data.error, "database_unavailable");
    assert.equal(h.calls.auth, 0);
  });

  test(method + " preserves 503 when the bookmark database itself fails", async () => {
    const h = harness("ok", "throw");
    const response = await h.invoke(method);
    assert.equal(response.status, 503);
    assert.equal(response.data.ok, undefined);
  });
}

for (const method of ["PUT", "DELETE"]) {
  test(method + " rejects a cross-origin mutation before identity is consulted", async () => {
    const h = harness("throw");
    const response = await h.invoke(method, "https://untrusted.invalid");
    assert.equal(response.status, 403);
    assert.equal(response.data.error, "cross_origin_request");
    assert.equal(h.calls.auth, 0);
    assert.equal(h.calls.prepare, 0);
  });
}
