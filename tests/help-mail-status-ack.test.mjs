import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

// Actual Help POST endpoint. All dependencies are disposable; no email sent.
const source = await readFile(new URL("../app/api/help/route.ts", import.meta.url), "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal(transpiled.diagnostics?.length ?? 0, 0);

function harness({ sent = true, receipt = { success: true, meta: { changes: 1 } },
  batchReceipts = [{ success: true, meta: { changes: 1 } }] } = {}) {
  const state = { emails: 0, updates: 0, batches: 0, ids: [] };
  const DB = {
    prepare(sql) {
      const statement = {
        sql, args: [],
        bind(...args) { this.args = args; return this; },
        async run() {
          state.updates++;
          if (receipt instanceof Error) throw receipt;
          return receipt;
        },
      };
      return statement;
    },
    async batch(statements) {
      state.batches++;
      state.ids.push(statements[0].args[0]);
      if (batchReceipts instanceof Error) throw batchReceipts;
      return batchReceipts;
    },
  };
  const deps = name => {
    if (name === "cloudflare:workers") return { env: { DB } };
    if (name.endsWith("/lib/auth")) return {
      authenticateRequest: async () => null,
      sameOrigin: req => req.headers.get("origin") === new URL(req.url).origin,
      rateLimit: async () => true,
      requestAddress: () => "disposable-test",
    };
    if (name.endsWith("/lib/email")) return {
      sendSupportRequestEmail: async () => {
        state.emails++;
        return { delivered: sent };
      },
    };
    throw Error("Unexpected import " + name);
  };
  const fixtureModule = { exports: {} };
  new Function("require", "module", "exports", transpiled.outputText)(deps, fixtureModule, fixtureModule.exports);
  const submit = async () => {
    const form = new FormData();
    form.set("email", "sample@example.invalid");
    form.set("subject", "Disposable test");
    form.set("message", "No real email leaves this test.");
    form.set("acceptPrivacy", "yes");
    return fixtureModule.exports.POST(new Request("https://sa.invalid/api/help", {
      method: "POST", headers: { Origin: "https://sa.invalid" }, body: form,
    }));
  };
  return { submit, state };
}

test("stored submission and confirmed mail status are acknowledged once", async () => {
  const h = harness();
  const response = await h.submit();
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(typeof body.requestId, "string");
  assert.equal(body.mailStatus, undefined);
  assert.deepEqual({ b: h.state.batches, m: h.state.emails, u: h.state.updates }, { b: 1, m: 1, u: 1 });
  assert.equal(h.state.ids[0], body.requestId);
});

test("a post-email D1 status failure must not invite a duplicate submission", async () => {
  for (const receipt of [
    { success: false, meta: { changes: 0 } },
    { success: true, meta: { changes: 0 } },
    { success: true },
    new Error("status-write-outage"),
  ]) {
    const h = harness({ receipt });
    const response = await h.submit();
    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.ok, true);
    assert.equal(body.mailStatus, "delivery_record_pending");
    assert.equal(h.state.ids[0], body.requestId);
    assert.deepEqual({ b: h.state.batches, m: h.state.emails, u: h.state.updates }, { b: 1, m: 1, u: 1 });
    assert.match(response.headers.get("cache-control"), /no-store/);
  }
});

test("mail failure preserves accepted request without a false delivery receipt", async () => {
  const h = harness({ sent: false });
  const response = await h.submit();
  assert.equal(response.status, 201);
  assert.equal((await response.json()).mailStatus, undefined);
  assert.deepEqual({ b: h.state.batches, m: h.state.emails, u: h.state.updates }, { b: 1, m: 1, u: 0 });
});

test("unsaved support requests are never sent as emails", async () => {
  for (const batchReceipts of [[{ success: false }], [{ success: true }], [{ success: true, meta: { changes: 0 } }], [{ success: true, meta: { changes: 2 } }], [], new Error("db-write-outage")]) {
    const h = harness({ batchReceipts });
    const response = await h.submit();
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error, "support_save_failed");
    assert.deepEqual({ b: h.state.batches, m: h.state.emails, u: h.state.updates }, { b: 1, m: 0, u: 0 });
  }
});
