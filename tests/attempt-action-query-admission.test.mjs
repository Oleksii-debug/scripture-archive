import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

// Exercise the actual TypeScript POST handler. Disposable mocks never contact
// Cloudflare, production D1, the email provider, or user accounts.
const source = readFileSync(new URL("../app/api/attempts/route.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
}, reportDiagnostics: true });
assert.equal(compiled.diagnostics?.length ?? 0, 0);

function harness() {
  const calls = { batch: 0, prepare: 0, authenticate: 0 };
  const DB = {
    prepare() { calls.prepare++; return { bind() { return this; }, async first() { return null; } }; },
    async batch() {
      calls.batch++;
      return [{ success: true, meta: { changes: 1 } }, { success: true, meta: { changes: 0 } }];
    },
  };
  const exports = {};
  vm.runInNewContext(compiled.outputText, {
    exports, Request, Response, URL, crypto, Date,
    require(specifier) {
      if (specifier === "cloudflare:workers") return { env: { DB } };
      if (specifier === "../../../content/mission-abraham.json") return {
        __esModule: true, default: { title: {}, intro: {}, tasks: [] },
      };
      if (specifier === "../../../lib/auth") return {
        authenticateRequest: async () => {
          calls.authenticate++;
          return { userId: "disposable-actor", emailVerified: true, provider: "password" };
        },
        GUEST_COOKIE: "sa_guest", guestCookie: () => "", parseCookies: () => new Map(),
        randomToken: () => "disposable", sha256: async () => "hash",
        sameOrigin: request => request.headers.get("origin") === new URL(request.url).origin,
      };
      throw Error("Unexpected import: " + specifier);
    },
  });
  async function invoke(query) {
    const request = new Request("https://archive.invalid/api/attempts" + query, {
      method: "POST",
      headers: { Origin: "https://archive.invalid", "Content-Type": "application/json" },
      body: JSON.stringify({ book: "GEN", chapter: 12 }),
    });
    const response = await exports.POST(request);
    return { status: response.status, body: await response.json(), cache: response.headers.get("cache-control") };
  }
  return { invoke, calls };
}

for (const query of [
  "?action=chapter&action=read",
  "?action=chapter&action=chapter",
  "?action=chapter&%61ction=read",
  "?action=chapter&unused=1",
  "?action=chapter&unused=",
]) {
  test("ambiguous assessment chapter action fails before actor and D1: " + query, async () => {
    const h = harness();
    const response = await h.invoke(query);
    assert.equal(response.status, 400);
    assert.equal(response.body.error, "invalid_action_query");
    assert.match(response.cache, /no-store/);
    assert.deepEqual(h.calls, { batch: 0, prepare: 0, authenticate: 0 });
  });
}

test("canonical chapter-open action still invalidates the matching assessment", async () => {
  const h = harness();
  const response = await h.invoke("?action=chapter");
  assert.equal(response.status, 200);
  assert.equal(response.body.invalidated, true);
  assert.equal(h.calls.batch, 1);
  assert.match(response.cache, /no-store/);
});

test("default start action without query remains admitted (and fails on missing mission)", async () => {
  const h = harness();
  const response = await h.invoke("");
  assert.equal(response.status, 404);
  assert.equal(response.body.error, "mission_chapter_unavailable");
  assert.equal(h.calls.batch, 0);
});
