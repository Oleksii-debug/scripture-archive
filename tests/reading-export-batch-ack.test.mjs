import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Execute the production export route, not a model or a parallel implementation.
const source = readFileSync(new URL("../app/api/reading-export/route.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  fileName: "app/api/reading-export/route.ts", reportDiagnostics: true,
});
assert.equal(compiled.diagnostics?.length ?? 0, 0, "canonical export handler must transpile");

const success = results => ({ success: true, results });
const standardRows = () => [
  success([{ first_name: "Alice", locale: "uk" }]),
  success([{ mission_id: "READING", data: '[{"book":"GEN","chapter":1,"title":"Genesis"}]', updated_at: "2026-10-29" }]),
  success([{ edition: "en-web", book: "GEN", chapter: 1, created_at: "2026-10-29" }]),
  success([{ id: "a1", mission_id: "OT-AB-01", book_id: "GEN", chapter: 1,
    group_id: null, locale: "uk", started_at: "2026-10-29", completed_at: "2026-10-29",
    result_json: '{"score":1,"details":[]}' }]),
];

function fixture({ results = standardRows(), dbPresent = true, identity = {
  userId: "reader-a", email: "reader-a@example.invalid", provider: "password",
}, batchError = null } = {}) {
  const statements = [];
  let batches = 0, authentications = 0;
  const db = {
    prepare(sql) {
      return { bind(...params) { statements.push({ sql, params }); return { sql, params }; } };
    },
    async batch(input) {
      batches++;
      assert.equal(input.length, 4);
      if (batchError) throw batchError;
      return results;
    },
  };
  const exports = {};
  vm.runInNewContext(compiled.outputText, {
    exports, Response, Request, Date,
    require(moduleName) {
      if (moduleName === "cloudflare:workers") return { env: { DB: dbPresent ? db : null } };
      if (moduleName === "../../../lib/auth") return { authenticateRequest: async () => {
        authentications++;
        return identity;
      } };
      throw Error("Unexpected dependency " + moduleName);
    },
  });
  return {
    call: () => exports.GET(new Request("https://test.invalid/api/reading-export")),
    statements, get batches() { return batches; }, get authentications() { return authentications; },
  };
}
async function outcome(fixtureValue) {
  const response = await fixtureValue.call();
  return { response, body: await response.json() };
}

test("complete acknowledged D1 batch exports the user's actual stored data", async () => {
  const f = fixture(), { response, body } = await outcome(f);
  assert.equal(response.status, 200);
  assert.equal(body.format, "scripture-archive-reading-export");
  assert.equal(body.version, 1);
  assert.equal(body.account.email, "reader-a@example.invalid");
  assert.equal(body.profile.first_name, "Alice");
  assert.equal(body.progress[0].mission, "READING");
  assert.equal(body.progress[0].data[0].book, "GEN");
  assert.equal(body.bookmarks[0].chapter, 1);
  assert.equal(body.attemptHistory[0].result.score, 1);
  assert.equal(f.batches, 1);
  assert.equal(f.statements.length, 4);
  assert.equal(f.statements.every(item => item.params.length === 1 && item.params[0] === "reader-a"), true);
  assert.match(response.headers.get("cache-control"), /no-store/);
  assert.match(response.headers.get("cache-control"), /private/);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.match(response.headers.get("content-disposition"), /attachment/);
});

test("a true empty account export remains valid only with all four D1 confirmations", async () => {
  const f = fixture({ results: [success([]), success([]), success([]), success([])] });
  const { response, body } = await outcome(f);
  assert.equal(response.status, 200);
  assert.equal(body.profile, null);
  assert.deepEqual(Array.from(body.progress), []);
  assert.deepEqual(Array.from(body.bookmarks), []);
  assert.deepEqual(Array.from(body.attemptHistory), []);
});

for (const index of [0, 1, 2, 3]) {
  test("D1 batch member " + index + " missing results fails closed instead of exporting incomplete data", async () => {
    const rows = standardRows();
    rows[index] = { success: true, results: undefined };
    const { response, body } = await outcome(fixture({ results: rows }));
    assert.equal(response.status, 503);
    assert.equal(body.error, "export_unavailable");
    assert.equal("bookmarks" in body, false);
    assert.match(response.headers.get("cache-control"), /no-store/);
  });
  test("D1 batch member " + index + " failed receipt never yields a download", async () => {
    const rows = standardRows();
    rows[index] = { success: false, results: [] };
    const { response, body } = await outcome(fixture({ results: rows }));
    assert.equal(response.status, 503);
    assert.equal(body.error, "export_unavailable");
    assert.equal(response.headers.get("content-disposition"), null);
  });
}
test("bookmarks null and object results cannot become a false 200 data export", async () => {
  for (const malformed of [null, {}, { 0: "fake" }, "not rows"]) {
    const rows = standardRows(); rows[2] = { success: true, results: malformed };
    const { response, body } = await outcome(fixture({ results: rows }));
    assert.equal(response.status, 503);
    assert.equal(body.error, "export_unavailable");
  }
});
test("missing or truthy-but-invalid D1 success acknowledgements never authorize export", async () => {
  for (const acknowledged of [undefined, null, "true", 1]) {
    const rows = standardRows(); rows[0] = { success: acknowledged, results: [] };
    const { response, body } = await outcome(fixture({ results: rows }));
    assert.equal(response.status, 503);
    assert.equal(body.error, "export_unavailable");
  }
});
test("a D1 batch exception produces a private error, never a partial file", async () => {
  const f = fixture({ batchError: Error("internal private SQL error") });
  const { response, body } = await outcome(f);
  assert.equal(response.status, 503);
  assert.deepEqual(body, { error: "export_unavailable" });
  assert.match(response.headers.get("cache-control"), /private/);
  assert.equal(f.batches, 1);
});
test("corrupt progress or attempt result JSON refuses export without false success", async () => {
  for (const index of [1, 3]) {
    const rows = standardRows();
    if (index === 1) rows[1].results[0].data = "not-json";
    else rows[3].results[0].result_json = "[1,2]";
    const { response, body } = await outcome(fixture({ results: rows }));
    assert.equal(response.status, 503);
    assert.equal(body.error, "export_unavailable");
  }
});
test("missing D1 binding refuses before authentication or database reads", async () => {
  const f = fixture({ dbPresent: false });
  const { response, body } = await outcome(f);
  assert.equal(response.status, 503);
  assert.equal(body.error, "database_unavailable");
  assert.equal(f.authentications, 0);
  assert.equal(f.statements.length, 0);
});
test("unauthenticated and agent identities cannot access private export", async () => {
  for (const identity of [null, { userId: "agent", provider: "agent" }]) {
    const f = fixture({ identity });
    const { response, body } = await outcome(f);
    assert.equal(response.status, 401);
    assert.equal(body.error, "authentication_required");
    assert.equal(f.statements.length, 0);
    assert.equal(f.batches, 0);
  }
});