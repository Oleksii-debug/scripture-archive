import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { EDITIONS } from "../public/editions.js";

// Run the actual canonical TypeScript route, not a copied validator.
const source = readFileSync(new URL("../app/api/bookmarks/route.ts", import.meta.url), "utf8");
const catalog = JSON.parse(readFileSync(new URL("../public/data/catalog.json", import.meta.url), "utf8"));
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal(compiled.diagnostics?.length || 0, 0);

function fixture({ identity = { userId: "reader", provider: "password" },
  receipt = { success: true, meta: { changes: 1 } } } = {}) {
  const statements = [];
  const exports = {};
  const database = {
    prepare(sql) {
      statements.push(sql);
      return {
        bind() { return this; },
        async run() { return receipt; },
        async first() { return null; },
      };
    },
  };
  vm.runInNewContext(compiled.outputText, {
    exports, Request, Response,
    require(name) {
      if (name === "cloudflare:workers") return { env: { DB: database } };
      if (name.endsWith("/public/data/catalog.json")) return { default: catalog };
      if (name.endsWith("/public/editions.js")) return { EDITIONS };
      if (name.endsWith("/lib/auth")) return {
        authenticateRequest: async () => identity,
        sameOrigin: request => request.headers.get("origin") === new URL(request.url).origin,
      };
      throw Error("Unexpected production dependency " + name);
    },
  });
  async function send(method, value, origin = "https://scripture.test") {
    const response = await exports[method](new Request("https://scripture.test/api/bookmarks", {
      method,
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify(value),
    }));
    return { status: response.status, body: await response.json(),
      cache: response.headers.get("cache-control") };
  }
  return { send, statements };
}
const bookmark = { edition: "en-web", book: "GEN", chapter: 1 };

test("old out-of-range bookmarks are removable, but never insertable", async () => {
  for (const chapter of [152, 999, Number.MAX_SAFE_INTEGER]) {
    const f = fixture();
    const value = { ...bookmark, chapter };
    const put = await f.send("PUT", value);
    assert.equal(put.status, 400, "out-of-range PUT denied: " + chapter);
    assert.deepEqual(put.body, { error: "invalid_bookmark" });
    assert.equal(f.statements.length, 0, "no forbidden insert probe");
    const deletion = await f.send("DELETE", value);
    assert.equal(deletion.status, 200, "legacy cleanup: " + chapter);
    assert.deepEqual(deletion.body, { ok: true });
    assert.match(deletion.cache, /no-store/);
    assert.equal(f.statements.length, 1, "one own-user DELETE only");
    assert.match(f.statements[0], /DELETE FROM reader_bookmarks WHERE user_id=\?/);
  }
});

test("DELETE also rejects malformed, fractional, unsafe and string chapter values", async () => {
  for (const chapter of [0, -1, 1.5, null, "152", Number.NaN, Number.POSITIVE_INFINITY,
    Number.MAX_SAFE_INTEGER + 1]) {
    const f = fixture();
    const response = await f.send("DELETE", { ...bookmark, chapter });
    assert.equal(response.status, 400, String(chapter));
    assert.deepEqual(response.body, { error: "invalid_bookmark" });
    assert.equal(f.statements.length, 0);
  }
});

test("ordinary saved bookmark semantics and legacy deletion idempotency are unchanged", async () => {
  const f = fixture();
  assert.equal((await f.send("PUT", { ...bookmark, chapter: 50 })).status, 200);
  assert.equal((await f.send("DELETE", { ...bookmark, chapter: 50 })).status, 200);
  assert.equal((await f.send("DELETE", { ...bookmark, chapter: 151 })).status, 200);
  assert.equal(f.statements.length, 3);
  const idempotent = fixture({ receipt: { success: true, meta: { changes: 0 } } });
  assert.equal((await idempotent.send("DELETE", { ...bookmark, chapter: 999 })).status, 200);
  assert.equal(idempotent.statements.length, 1);
});

test("cleanup cannot bypass the same-origin and principal boundaries", async () => {
  const value = { ...bookmark, chapter: 999 };
  const unauth = fixture({ identity: null });
  assert.equal((await unauth.send("DELETE", value)).status, 401);
  assert.equal(unauth.statements.length, 0);
  const agent = fixture({ identity: { userId: "robot", provider: "agent" } });
  assert.equal((await agent.send("DELETE", value)).status, 401);
  assert.equal(agent.statements.length, 0);
  const foreign = fixture();
  assert.equal((await foreign.send("DELETE", value, "https://untrusted.example")).status, 403);
  assert.equal(foreign.statements.length, 0);
});
