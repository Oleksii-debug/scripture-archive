import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

// Run the actual canonical content route with disposable D1/auth dependencies.
// No external services, users, or production data are accessed.
const source = readFileSync(new URL("../app/api/content/route.ts", import.meta.url), "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal(transpiled.diagnostics?.length ?? 0, 0);

function harness(mode) {
  const calls = { batch: 0 };
  const ok = { success: true, meta: { changes: 1 } };
  const DB = {
    prepare(sql) {
      return {
        bind(...values) {
          return {
            sql, values,
            first: async () => ({ kind: "book", title: "Existing", locale: "uk", data: "{}" }),
          };
        },
      };
    },
    async batch(statements) {
      calls.batch++;
      assert.equal(statements.length, 2, "content and revision share one D1 batch");
      if (mode === "throw") throw Error("simulated D1 failure");
      if (mode === "missing") return undefined;
      if (mode === "short") return [ok];
      if (mode === "false") return [ok, { success: false, meta: { changes: 1 } }];
      if (mode === "no-changes") return [ok, { success: true, meta: { changes: 0 } }];
      if (mode === "bad-meta") return [ok, { success: true }];
      return [ok, ok];
    },
  };
  const fixtureModule = { exports: {} };
  const dependency = id => {
    if (id === "cloudflare:workers") return { env: { DB } };
    if (id.endsWith("/lib/auth")) return {
      authenticateRequest: async () => ({ userId: "owner" }),
      isVerifiedOwner: identity => identity?.userId === "owner",
      sameOrigin: req => req.headers.get("origin") === new URL(req.url).origin,
    };
    throw Error("Unexpected import " + id);
  };
  new Function("require", "module", "exports", "crypto", transpiled.outputText)(
    dependency, fixtureModule, fixtureModule.exports, { randomUUID: () => "test-generated-id" }
  );
  async function invoke(operation, origin = "https://scripture.invalid") {
    const method = operation === "delete" ? "DELETE" : "PUT";
    const url = "https://scripture.invalid/api/content" + (operation === "delete" ? "?id=record" : "");
    const payload = operation === "upsert" ?
      { action: "upsert-item", id: "record", kind: "book", locale: "uk",
        title: "Example", status: "draft", data: { text: "Local test" } } :
      { liveNote: { uk: "Перевірка" } };
    const request = new Request(url, {
      method, headers: { Origin: origin, "Content-Type": "application/json" },
      ...(method === "PUT" ? { body: JSON.stringify(payload) } : {}),
    });
    return fixtureModule.exports[method](request);
  }
  return { invoke, calls };
}

for (const operation of ["upsert", "public-note", "delete"]) {
  test(operation + " acknowledges both content and revision writes", async () => {
    const h = harness("ok");
    const response = await h.invoke(operation);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).ok, true);
    assert.equal(h.calls.batch, 1);
  });

  for (const mode of ["missing", "short", "false", "no-changes", "bad-meta", "throw"]) {
    test(operation + " refuses incomplete D1 receipt " + mode, async () => {
      const h = harness(mode);
      const response = await h.invoke(operation);
      assert.equal(response.status, 503);
      const data = await response.json();
      assert.equal(data.error, operation === "delete" ? "content_hide_unconfirmed" : "content_save_unconfirmed");
      assert.equal(data.ok, undefined);
      assert.equal(h.calls.batch, 1);
    });
  }

  test(operation + " rejects cross-origin writes without D1 mutation", async () => {
    const h = harness("ok");
    const response = await h.invoke(operation, "https://outsider.invalid");
    assert.equal(response.status, 403);
    assert.equal(h.calls.batch, 0);
  });
}
