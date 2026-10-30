import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

// Native route execution with local D1/email fakes; no real submissions or mail.
const source = await readFile(new URL("../app/api/help/route.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
}}).outputText;

function harness(batchResult) {
  const state = { batches: 0, emails: 0, writes: 0 };
  const DB = {
    prepare(sql) {
      state.writes++;
      return { sql, bind(...args) { this.args = args; return this; },
        async run() { return { success: true }; } };
    },
    async batch(statements) {
      state.batches++;
      if (batchResult === "throws") throw Error("simulated D1 outage");
      if (batchResult === "missing") return null;
      if (batchResult === "short") return [];
      if (batchResult === "failed") return statements.map(() => ({ success: false, meta: { changes: 0 } }));
      if (batchResult === "missing-receipt") return statements.map(() => ({ success: true }));
      if (batchResult === "zero") return statements.map(() => ({ success: true, meta: { changes: 0 } }));
      if (batchResult === "multiple") return statements.map(() => ({ success: true, meta: { changes: 2 } }));
      if (batchResult === "string") return statements.map(() => ({ success: true, meta: { changes: "1" } }));
      return statements.map(() => ({ success: true, meta: { changes: 1 } }));
    },
  };
  const requireFake = id => {
    if (id === "cloudflare:workers") return { env: { DB } };
    if (id.endsWith("lib/auth")) return {
      authenticateRequest: async () => null, rateLimit: async () => true,
      requestAddress: () => "disposable-test",
      sameOrigin: request => request.headers.get("origin") === new URL(request.url).origin,
    };
    if (id.endsWith("lib/email")) return {
      sendSupportRequestEmail: async () => { state.emails++; return { delivered: false }; },
    };
    throw Error("Unexpected import " + id);
  };
  const fixtureModule = { exports: {} };
  new Function("require", "module", "exports", compiled)(requireFake, fixtureModule, fixtureModule.exports);
  const form = new FormData();
  form.set("email", "private@example.invalid");
  form.set("subject", "Durability test");
  form.set("message", "A local request requiring durable acknowledgement.");
  form.set("acceptPrivacy", "yes");
  const request = new Request("https://scripture.invalid/api/help", {
    method: "POST", headers: { Origin: "https://scripture.invalid" }, body: form,
  });
  return { state, response: fixtureModule.exports.POST(request) };
}

for (const mode of ["throws", "missing", "short", "failed", "missing-receipt", "zero", "multiple", "string"]) {
  test("support inbox refuses " + mode + " D1 batch without external mail", async () => {
    const { state, response } = harness(mode);
    const result = await response;
    assert.equal(result.status, 503);
    assert.deepEqual(await result.json(), { error: "support_save_failed" });
    assert.equal(state.batches, 1);
    assert.equal(state.emails, 0);
  });
}

test("successful durable support request acknowledges once and forwards once", async () => {
  const { state, response } = harness("ok");
  const result = await response;
  assert.equal(result.status, 201);
  assert.equal((await result.json()).ok, true);
  assert.equal(state.batches, 1);
  assert.equal(state.emails, 1);
});
