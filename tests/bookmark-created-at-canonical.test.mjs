import { validBookmarkTimestamp } from "../lib/bookmark-timestamp.js";
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { EDITIONS } from "../public/editions.js";

// Execute current canonical route with the same D1 row shape as the real API.
const source = readFileSync(new URL("../app/api/bookmarks/route.ts", import.meta.url), "utf8");
const catalog = JSON.parse(readFileSync(new URL("../public/data/catalog.json", import.meta.url), "utf8"));
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal(compiled.diagnostics?.length ?? 0, 0);
const canonical = { edition: "en-web", book: "GEN", chapter: 1 };

async function read(rows) {
  const calls = [];
  const exports = {};
  vm.runInNewContext(compiled.outputText, {
    exports, Response,
    require(id) {
      if (id.endsWith("lib/bookmark-timestamp.js")) return { validBookmarkTimestamp };
      if (id === "cloudflare:workers") return { env: { DB: {
        prepare(sql) {
          calls.push(sql);
          return { bind() { return this; }, async all() { return { success: true, results: rows }; } };
        },
      } } };
      if (id.endsWith("lib/auth")) return {
        authenticateRequest: async () => ({ userId: "alice", provider: "password" }),
      };
      if (id.endsWith("public/data/catalog.json")) return { default: catalog };
      if (id.endsWith("public/editions.js")) return { EDITIONS };
      throw Error("Unexpected import: " + id);
    },
  });
  const response = await exports.GET(new Request("https://scripture.test/api/bookmarks"));
  return { status: response.status, body: await response.json(), calls };
}

const good = [
  "2026-10-30", "2024-02-29", "2000-02-29", "2026-10-30 13:45:59",
  "2026-10-30T13:45:59Z", "2026-10-30T13:45:59.123Z",
  "2026-10-30 00:00:00", "2026-10-30 23:59:59", "2026-10-30T12:00:00",
];
test("valid historical and D1 UTC bookmark dates remain navigable", async () => {
  for (const created_at of good) {
    const result = await read([{ ...canonical, created_at }]);
    assert.equal(result.status, 200, created_at);
    assert.deepEqual(result.body.bookmarks, [{ ...canonical, created_at }], created_at);
    assert.equal(result.body.warning, undefined, created_at);
    assert.equal(result.calls.length, 1, "GET remains read only");
  }
});

const bad = [
  "2026-02-29", "2025-02-29", "2026-04-31", "2026-06-31",
  "2026-00-01", "2026-13-01", "2026-01-00", "2026-01-32",
  "2026-10-30 24:00:00", "2026-10-30 23:60:00", "2026-10-30 23:59:60",
  "2026-10-30T23:59:61Z", "2026-10-30T99:59:59Z",
  "2026-10-30T23:59Z", "2026-10-30T23:59:59+03:00",
  "2026-10-30 1:02:03", "2026-10-30 01:2:03",
  "2026-10-30T01:02:03.1234Z", "2026-10-30T01:02:03z",
  "2026-10-30foo", "2026/10/30", " 2026-10-30", "2026-10-30 ",
  "yesterday", "Invalid Date", "0", "", null, false, 20261030,
  {}, [], "0001-01-01", "0099-12-31", "1000-02-29",
];
test("corrupt saved timestamps are quarantined rather than displayed as valid links", async () => {
  for (const created_at of bad) {
    const result = await read([{ ...canonical, created_at }]);
    assert.equal(result.status, 200, String(created_at));
    assert.deepEqual(result.body.bookmarks, [], String(created_at));
    assert.equal(result.body.warning, "partial_bookmarks", String(created_at));
    assert.equal(result.body.invalid_bookmarks, undefined, "no recoverable rowid was supplied");
    assert.equal(result.calls.length, 1, "GET must not repair/delete rows");
  }
});
test("mixed damaged and sound rows preserve the genuine bookmark and expose warning", async () => {
  const actual = { ...canonical, created_at: "2026-10-30 09:05:04" };
  const result = await read([actual, { ...canonical, created_at: "2026-02-30" }]);
  assert.equal(result.status, 200);
  assert.deepEqual(result.body.bookmarks, [actual]);
  assert.equal(result.body.warning, "partial_bookmarks");
  assert.equal(result.calls.length, 1);
});
