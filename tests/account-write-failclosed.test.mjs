import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

// Execute the actual shipping account route, not a copy of its guard.
const catalog = JSON.parse(readFileSync(new URL("../public/data/catalog.json", import.meta.url), "utf8"));
const source = readFileSync(new URL("../app/api/account/route.ts", import.meta.url), "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal(transpiled.diagnostics?.length ?? 0, 0);

function handler({ dbAvailable = true, authFailure = false, anonymous = false } = {}) {
  const calls = { auth: 0, writes: 0 };
  const database = {
    prepare() {
      calls.writes++;
      throw Error("no persistence is expected for this guard test");
    },
  };
  const exports = {};
  vm.runInNewContext(transpiled.outputText, {
    exports, Request, Response, URL,
    require(specifier) {
      if (specifier === "cloudflare:workers")
        return { env: { DB: dbAvailable ? database : undefined } };
      if (specifier === "../../../public/data/catalog.json") return { default: catalog };
      if (specifier === "../../../content/mission-abraham.json")
        return { default: { tasks: [] } };
      if (specifier === "../../../lib/auth") return {
        authenticateRequest: async () => {
          calls.auth++;
          if (authFailure) throw Error("private identity database unavailable");
          if (anonymous) return null;
          return { userId: "reader-a", provider: "password", email: "reader@example.invalid" };
        },
        isVerifiedOwner: () => false,
        sameOrigin: request => request.headers.get("origin") === new URL(request.url).origin,
      };
      throw Error("unexpected dependency " + specifier);
    },
  });
  async function invoke(method, origin = "https://archive.invalid") {
    const request = new Request("https://archive.invalid/api/account?action=progress", {
      method,
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: "{}",
    });
    const response = await exports[method](request);
    return {
      status: response.status,
      body: await response.json(),
      cache: response.headers.get("cache-control"),
    };
  }
  return { invoke, calls };
}

for (const method of ["POST", "PUT"]) {
  test(method + ": missing D1 refuses mutation with private 503 before authentication", async () => {
    const h = handler({ dbAvailable: false });
    const outcome = await h.invoke(method);
    assert.equal(outcome.status, 503);
    assert.equal(outcome.body.error, "database_unavailable");
    assert.match(outcome.cache, /no-store, private/);
    assert.deepEqual(h.calls, { auth: 0, writes: 0 });
  });

  test(method + ": identity DB exception is unavailable, never a false sign-out or 500", async () => {
    const h = handler({ authFailure: true });
    const outcome = await h.invoke(method);
    assert.equal(outcome.status, 503);
    assert.equal(outcome.body.error, "account_state_unavailable");
    assert.equal("ok" in outcome.body, false);
    assert.match(outcome.cache, /no-store/);
    assert.deepEqual(h.calls, { auth: 1, writes: 0 });
  });

  test(method + ": genuinely anonymous request retains 401", async () => {
    const h = handler({ anonymous: true });
    const outcome = await h.invoke(method);
    assert.equal(outcome.status, 401);
    assert.equal(outcome.body.error, "authentication_required");
    assert.deepEqual(h.calls, { auth: 1, writes: 0 });
  });

  test(method + ": authenticated progress cannot be client-written", async () => {
    const h = handler();
    const outcome = await h.invoke(method);
    assert.equal(outcome.status, 403);
    assert.equal(outcome.body.error, "progress_is_server_managed");
    assert.deepEqual(h.calls, { auth: 1, writes: 0 });
  });

  test(method + ": cross-origin mutation is denied before missing D1 is examined", async () => {
    const h = handler({ dbAvailable: false });
    const outcome = await h.invoke(method, "https://attacker.invalid");
    assert.equal(outcome.status, 403);
    assert.equal(outcome.body.error, "cross_origin_request");
    assert.deepEqual(h.calls, { auth: 0, writes: 0 });
  });
}
