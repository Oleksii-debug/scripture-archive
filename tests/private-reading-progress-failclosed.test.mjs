import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Exercise the shipping account GET handlers, not copied business logic.
const source = readFileSync(new URL("../app/api/account/route.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function worker({ first = async () => null, all = async () => ({ success: true, results: [] }) } = {}) {
  const exports = {}, statements = [];
  const db = { prepare(sql) {
    return { bind(...args) {
      statements.push({ sql, args });
      return { first, all };
    } };
  } };
  vm.runInNewContext(compiled, {
    exports, Request, Response, URL, require(specifier) {
      if (specifier === "cloudflare:workers") return { env: { DB: db } };
      if (specifier === "../../../content/mission-abraham.json")
        return { default: { tasks: [{ id: "T-1" }, { id: "T-2" }] } };
      if (specifier === "../../../lib/auth") return {
        authenticateRequest: async () => ({
          userId: "reader-a", email: "reader@example.invalid",
          emailVerified: true, provider: "password", fullName: "Reader",
        }),
        isVerifiedOwner: () => false, sameOrigin: () => true,
      };
      throw Error("unexpected dependency " + specifier);
    },
  });
  return { exports, statements };
}
async function read(workerApi, action) {
  const response = await workerApi.exports.GET(
    new Request("https://test.invalid/api/account?action=" + action)
  );
  return {
    status: response.status,
    data: await response.json(),
    cacheControl: response.headers.get("cache-control"),
  };
}

test("SA-EXT-01: failed D1 reading read returns private 503, not a blank library", async () => {
  const api = worker({ first: async () => { throw Error("D1 unavailable"); } });
  const outcome = await read(api, "reading");
  assert.equal(outcome.status, 503);
  assert.equal(outcome.data.error, "reading_state_unavailable");
  assert.equal("reading" in outcome.data, false);
  assert.match(outcome.cacheControl, /no-store/);
  assert.deepEqual(Array.from(api.statements[0].args), ["reader-a"]);
});

test("SA-EXT-01: malformed saved reading JSON cannot be acknowledged as empty", async () => {
  const api = worker({ first: async () => ({ data: '{"broken":true}' }) });
  const outcome = await read(api, "reading");
  assert.equal(outcome.status, 503);
  assert.equal(outcome.data.error, "reading_state_unavailable");
});

test("SA-EXT-02: rejected D1 progress read never reports zero completion", async () => {
  for (const all of [
    async () => { throw Error("database failed"); },
    async () => ({ success: false, results: [] }),
    async () => ({ success: true, results: null }),
  ]) {
    const outcome = await read(worker({ all }), "progress");
    assert.equal(outcome.status, 503);
    assert.equal(outcome.data.error, "progress_state_unavailable");
    assert.equal("progress" in outcome.data, false);
    assert.match(outcome.cacheControl, /private/);
  }
});

test("SA-EXT-02: successful progress and genuine zero-progress responses remain distinct", async () => {
  const api = worker({ all: async () => ({
    success: true,
    results: [{ data: JSON.stringify({ details: [
      { taskId: "T-1", correct: true }, { taskId: "T-2", correct: false },
    ] }) }],
  }) });
  const result = await read(api, "progress");
  assert.equal(result.status, 200);
  assert.equal(result.data.progress.index, 2);
  assert.equal(result.data.progress.complete, true);
  assert.deepEqual(Array.from(result.data.progress.correct), ["T-1"]);
  assert.deepEqual(Array.from(api.statements[0].args), ["reader-a"]);
  const empty = await read(worker(), "progress");
  assert.equal(empty.status, 200);
  assert.equal(empty.data.progress.index, 0);
  assert.equal(empty.data.progress.complete, false);
});

test("SA-EXT-01: missing reading record is legitimately empty", async () => {
  const outcome = await read(worker(), "reading");
  assert.equal(outcome.status, 200);
  assert.deepEqual(Array.from(outcome.data.reading), []);
});
