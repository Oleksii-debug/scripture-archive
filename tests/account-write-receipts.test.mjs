import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

// Call the current canonical TypeScript account endpoints, not copied ACK logic.
const source = readFileSync(new URL("../app/api/account/route.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal(compiled.diagnostics?.length ?? 0, 0);

function harness(mode, { readFailure = false } = {}) {
  const calls = { run: 0, first: 0 };
  const database = { prepare() {
    return { bind() {
      return {
        async run() {
          calls.run++;
          if (mode === "throw") throw Error("simulated D1 failure after uncertain write");
          if (mode === "missing") return { success: true };
          if (mode === "false") return { success: false, meta: { changes: 1 } };
          if (mode === "zero") return { success: true, meta: { changes: 0 } };
          if (mode === "negative") return { success: true, meta: { changes: -1 } };
          if (mode === "not-an-integer") return { success: true, meta: { changes: "1" } };
          return { success: true, meta: { changes: 1 } };
        },
        async first() {
          calls.first++;
          if (readFailure) throw Error("simulated profile read failure");
          return { first_name: "Ada", last_name: "Reader", locale: "uk" };
        },
      };
    } };
  } };
  const exports = {};
  vm.runInNewContext(compiled.outputText, {
    exports, Request, Response, URL,
    require(specifier) {
      if (specifier === "cloudflare:workers") return { env: { DB: database } };
      if (specifier === "../../../content/mission-abraham.json") return { default: { tasks: [] } };
      if (specifier === "../../../lib/auth") return {
        sameOrigin: request => request.headers.get("origin") === new URL(request.url).origin,
        authenticateRequest: async () => ({
          userId: "reader-a", email: "reader@example.invalid", emailVerified: true,
          provider: "password", fullName: "Ada Reader",
        }),
        isVerifiedOwner: () => false,
      };
      throw Error("unexpected import " + specifier);
    },
  });
  async function invoke(action) {
    const payload = action === "reading"
      ? { reading: [{ book: "GEN", chapter: 1, title: "Genesis" }] }
      : action === "visibility"
        ? { firstName: true, lastName: false, church: false, progress: true }
        : { firstName: "Ada", lastName: "Reader", ageRange: "18-24",
            acceptPrivacy: true, acceptSensitive: false, locale: "uk" };
    const request = new Request("https://archive.invalid/api/account?action=" + action, {
      method: "POST",
      headers: { Origin: "https://archive.invalid", "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const response = await exports.POST(request);
    return { status: response.status, body: await response.json(), cache: response.headers.get("cache-control") };
  }
  return { invoke, calls };
}

for (const action of ["reading", "visibility", "profile"]) {
  test(action + ": valid confirmed D1 write and readback retain success", async () => {
    const h = harness("ok");
    const outcome = await h.invoke(action);
    assert.equal(outcome.status, 200);
    assert.equal(h.calls.run, 1);
    assert.match(outcome.cache, /no-store, private/);
    if (action === "reading") assert.equal(outcome.body.ok, true);
    else assert.equal(outcome.body.user.id, "reader-a");
  });

  for (const mode of ["missing", "false", "negative", "not-an-integer", "throw", "zero"]) {
    test(action + ": never acknowledges an unconfirmed D1 write (" + mode + ")", async () => {
      const h = harness(mode);
      const outcome = await h.invoke(action);
      const expectedStatus = action === "visibility" && mode === "zero" ? 409 : 503;
      assert.equal(outcome.status, expectedStatus);
      assert.equal("ok" in outcome.body, false);
      assert.equal("user" in outcome.body, false);
      assert.match(outcome.cache, /no-store, private/);
      assert.equal(h.calls.run, 1);
      if (mode !== "zero" || action !== "visibility") assert.equal(h.calls.first, 0);
    });
  }
}

for (const action of ["visibility", "profile"]) {
  test(action + ": post-write profile read failure does not claim successful persistence", async () => {
    const h = harness("ok", { readFailure: true });
    const outcome = await h.invoke(action);
    assert.equal(outcome.status, 503);
    assert.equal("user" in outcome.body, false);
    assert.match(outcome.cache, /no-store, private/);
  });
}
