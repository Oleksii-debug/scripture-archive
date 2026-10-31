import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

// Execute the actual canonical Worker route, not an independent validator.
const source = readFileSync(new URL("../app/api/attempts/route.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true},
  reportDiagnostics: true,
});
assert.equal(compiled.diagnostics?.length ?? 0, 0);

const task = {
  id: "GEN12-1", book: "GEN", chapter: 12, type: "single-choice", verses: [1],
  question: {uk: "Private active task", ru: "Private active task", en: "Private active task"},
  options: {uk: ["A", "B"], ru: ["A", "B"], en: ["A", "B"]},
  correct: [0], success: {uk: "Explanation", ru: "Explanation", en: "Explanation"},
};

function fixture(changes = {}) {
  let queries = 0, batches = 0;
  const attempt = {
    id: "attempt-1", actor_id: "alice", mission_id: "OT-AB-01",
    book_id: "GEN", chapter: 12, group_id: null, locale: "uk",
    task_limit: 1, current_index: 0, status: "active",
    expires_at: "2099-01-01", result_json: null, score: null, total: null,
    ...changes,
  };
  const DB = {
    prepare(sql) {
      queries++;
      assert.match(sql, /mission_attempts/);
      return {
        bind(id, actor) {
          assert.equal(id, "attempt-1");
          assert.equal(actor, "alice");
          return this;
        },
        async first() { return attempt; },
      };
    },
    async batch() { batches++; throw Error("invalid active cursor reached mutation"); },
  };
  const exports = {};
  vm.runInNewContext(compiled.outputText, {
    exports, Request, Response, URL, Date, crypto,
    require(name) {
      if (name === "cloudflare:workers") return {env: {DB}};
      if (name === "../../../content/mission-abraham.json")
        return {__esModule: true, default: {tasks: [task], title: {}, intro: {}}};
      if (name === "../../../lib/auth") return {
        authenticateRequest: async () => ({userId: "alice", provider: "password", emailVerified: true}),
        GUEST_COOKIE: "guest", guestCookie: () => "", parseCookies: () => new Map(),
        randomToken: () => "", sameOrigin: () => true, sha256: async () => "",
      };
      throw Error("Unexpected import " + name);
    },
  });
  async function invoke(method) {
    const request = method === "GET"
      ? new Request("https://archive.invalid/api/attempts?action=current&attemptId=attempt-1")
      : new Request("https://archive.invalid/api/attempts?action=answer", {
          method: "POST", headers: {"Content-Type": "application/json"},
          body: JSON.stringify({attemptId: "attempt-1", taskIndex: 1, selected: [0]}),
        });
    const response = await exports[method](request);
    return {status: response.status, data: await response.json(),
      cache: response.headers.get("Cache-Control")};
  }
  return {invoke, counts: () => ({queries, batches})};
}

for (const [label, state] of [
  ["fractional limit", {task_limit: 1.5}],
  ["string limit", {task_limit: "1"}],
  ["inflated limit", {task_limit: 2}],
  ["fractional cursor", {current_index: 0.5}],
  ["numeric-string cursor", {current_index: "0"}],
  ["negative cursor", {current_index: -1}],
  ["cursor beyond saved limit", {current_index: 1}],
  ["foreign stored mission", {mission_id: "OTHER-MISSION"}],
]) {
  for (const method of ["GET", "POST"]) {
    test(method + " refuses corrupt D1 active assessment: " + label, async () => {
      const f = fixture(state), response = await f.invoke(method);
      assert.equal(response.status, 409, JSON.stringify(response.data));
      assert.equal(response.data.error, "attempt_state_invalid");
      assert.ok(!("task" in response.data) && !("accepted" in response.data));
      assert.match(response.cache, /no-store/);
      assert.deepEqual(f.counts(), {queries: 1, batches: 0});
    });
  }
}

test("unchanged canonical active assessment exposes only its public task", async () => {
  const f = fixture(), response = await f.invoke("GET");
  assert.equal(response.status, 200);
  assert.equal(response.data.task.question, "Private active task");
  assert.equal(response.data.task.total, 1);
  assert.ok(!("correct" in response.data.task));
  assert.deepEqual(f.counts(), {queries: 1, batches: 0});
});
