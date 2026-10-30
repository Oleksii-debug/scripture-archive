import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

// Exercise the actual production TypeScript route, with only D1/auth mocked.
const source = readFileSync(new URL("../app/api/materials/route.ts", import.meta.url), "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal(transpiled.diagnostics?.length ?? 0, 0);

function harness({ auth = "throw", dbPresent = true } = {}) {
  const calls = { auth: 0, prepare: 0 };
  const db = {
    prepare() {
      calls.prepare++;
      return {
        bind() { return this; },
        async all() { return { success: true, results: [] }; },
      };
    },
  };
  const exports = {};
  vm.runInNewContext(transpiled.outputText, {
    exports, Request, Response, URL, crypto,
    require(specifier) {
      if (specifier === "cloudflare:workers")
        return { env: { DB: dbPresent ? db : undefined } };
      if (specifier === "../../../lib/auth") return {
        authenticateRequest: async () => {
          calls.auth++;
          if (auth === "throw") throw Error("identity-store D1 outage");
          if (auth === "anonymous") return null;
          return { userId: "author-one", provider: "password" };
        },
        isVerifiedOwner: () => false,
        sameOrigin: request => request.headers.get("origin") === new URL(request.url).origin,
      };
      throw Error("Unexpected production dependency: " + specifier);
    },
  });
  async function invoke(method, origin = "https://scripture.test") {
    const url = "https://scripture.test/api/materials" + (method === "DELETE" ? "?id=material-one" : "");
    const request = new Request(url, {
      method,
      headers: { Origin: origin, "Content-Type": "application/json" },
      ...(method === "POST" ? { body: JSON.stringify({ title: "placeholder" }) } : {}),
    });
    const response = await exports[method](request);
    return {
      status: response.status,
      body: await response.json(),
      cache: response.headers.get("cache-control"),
    };
  }
  return { calls, invoke };
}

for (const method of ["GET", "POST", "DELETE"]) {
  test(method + ": identity outage is a private 503 with no content SQL", async () => {
    const h = harness();
    const result = await h.invoke(method);
    assert.equal(result.status, 503);
    assert.equal(result.body.error, "materials_unavailable");
    assert.match(result.cache, /no-store, private/);
    assert.equal(h.calls.auth, 1);
    assert.equal(h.calls.prepare, 0);
  });
  test(method + ": missing D1 is rejected before identity lookup", async () => {
    const h = harness({ dbPresent: false });
    const result = await h.invoke(method);
    assert.equal(result.status, 503);
    assert.equal(result.body.error, "database_unavailable");
    assert.equal(h.calls.auth, 0);
    assert.equal(h.calls.prepare, 0);
  });
}

for (const method of ["POST", "DELETE"]) {
  test(method + ": signed-out user retains ordinary 401", async () => {
    const h = harness({ auth: "anonymous" });
    const result = await h.invoke(method);
    assert.equal(result.status, 401);
    assert.equal(result.body.error, "authentication_required");
    assert.equal(h.calls.prepare, 0);
  });
  test(method + ": cross-origin request is rejected before broken identity lookup", async () => {
    const h = harness({ dbPresent: false });
    const result = await h.invoke(method, "https://attacker.invalid");
    assert.equal(result.status, 403);
    assert.equal(result.body.error, "cross_origin_request");
    assert.equal(h.calls.auth, 0);
    assert.equal(h.calls.prepare, 0);
  });
}

test("public materials list remains available to signed-out readers", async () => {
  const h = harness({ auth: "anonymous" });
  const result = await h.invoke("GET");
  assert.equal(result.status, 200);
  assert.deepEqual(JSON.parse(JSON.stringify(result.body.materials)), []);
  assert.equal(h.calls.prepare, 1);
});
