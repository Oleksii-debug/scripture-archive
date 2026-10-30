import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";

// Execute the real route handler against disposable request/DB fixtures.
const require = createRequire(import.meta.url);
const ts = require("typescript");
const source = readFileSync(new URL("../app/api/groups/route.ts", import.meta.url), "utf8");
const catalog = JSON.parse(readFileSync(new URL("../public/data/catalog.json", import.meta.url), "utf8"));
const privateNote = "SA12-SYNTHETIC-PRIVATE-REFLECTION-NOT-REAL-DATA";

function fixture() {
  const groups = new Map([
    ["open", { id: "open", name: "Disposable open group", visibility: "public",
      roster_visibility: "private", member_activity_visibility: 0,
      invite_code: "TESTCODE", member_count: 1, cohort_size: 0, cohort_key: null,
      weekly_goal: 3, catchup_mode: "steady", session_count: 1,
      answers_correct: 1, answers_total: 2, chapters_completed: 1 }],
    ["closed", { id: "closed", name: "Disposable private group", visibility: "private",
      roster_visibility: "private", member_activity_visibility: 0,
      invite_code: "HIDDEN", member_count: 1, cohort_size: 0, cohort_key: null,
      weekly_goal: 3, catchup_mode: "steady", session_count: 1,
      answers_correct: 1, answers_total: 2, chapters_completed: 1 }],
  ]);
  let writes = 0;
  const db = {
    prepare(sql) {
      let params = [];
      return {
        bind(...values) { params = values; return this; },
        async first() {
          if (sql.startsWith("SELECT role FROM home_group_members"))
            return params[1] === "member" ? { role: "member" } : null;
          if (sql.includes("FROM profiles WHERE user_id="))
            return { first_name: "Disposable", last_name: "User" };
          if (sql.includes("WHERE g.id=?")) {
            const row = groups.get(params[0]);
            return row && (row.visibility === "public" || params[1] === 1) ? row : null;
          }
          return null;
        },
        async all() {
          if (sql.includes("FROM group_sessions WHERE group_id=?")) {
            const gated = sql.includes("CASE WHEN ?=1 THEN reflection ELSE NULL END AS reflection");
            const groupId = gated ? params[1] : params[0];
            assert.ok(groups.has(groupId), "group ID must remain bound");
            return { success: true, results: [{ id: "disposable-meeting", book_id: "GEN", chapter: 12,
              answers_correct: 1, answers_total: 2, participant_count: 3,
              meeting_date: "2026-10-01",
              reflection: gated && params[0] !== 1 ? null : privateNote }] };
          }
          return { success: true, results: [] };
        },
        async run() { writes += 1; return { success: true }; },
      };
    },
  };
  const injectedRequire = (path) => {
    if (path === "cloudflare:workers") return { env: { DB: db } };
    if (path.includes("public/data/catalog.json")) return catalog;
    if (path.includes("lib/auth")) return {
      authenticateRequest: async (req) => {
        const userId = req.headers.get("x-sa12-test-user");
        return userId ? { userId, email: "test-" + userId + "@example.invalid",
          emailVerified: true, provider: "password" } : null;
      },
      sameOrigin: (req) => !req.headers.get("origin") ||
        req.headers.get("origin") === new URL(req.url).origin,
    };
    throw Error("Unexpected dependency: " + path);
  };
  const js = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  } }).outputText;
  const fixtureModule = { exports: {} };
  vm.runInNewContext(js, { module: fixtureModule, exports: fixtureModule.exports, require: injectedRequire,
    Request, Response, URL, crypto }, { filename: "app/api/groups/route.ts" });
  return { route: fixtureModule.exports, writes: () => writes };
}

function req(groupId, userId = "", method = "GET", origin = "") {
  const headers = {};
  if (userId) headers["x-sa12-test-user"] = userId;
  if (origin) headers.origin = origin;
  const url = "https://fixture.invalid/api/groups?groupId=" + groupId +
    (method === "POST" ? "&action=session" : "");
  if (method === "GET") return new Request(url, { headers });
  headers["content-type"] = "application/json";
  return new Request(url, { method, headers, body: JSON.stringify({
    groupId, bookId: "GEN", chapter: 12, answersTotal: 2, answersCorrect: 1,
    meetingDate: "2026-10-01",
  }) });
}

test("anonymous visitor retains aggregate meeting metrics but not discussion text", async () => {
  const { route } = fixture();
  const response = await route.GET(req("open"));
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.sessions[0].answers_total, 2);
  assert.equal(result.sessions[0].participant_count, null, "private roster cannot leak meeting attendance");
  assert.equal(result.sessions[0].reflection, null);
  assert.ok(!JSON.stringify(result).includes(privateNote));
  assert.ok(!Object.hasOwn(result.group, "inviteCode"));
});

test("another authenticated profile cannot read public-group discussion text", async () => {
  const { route } = fixture();
  const response = await route.GET(req("open", "outsider"));
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.membership, null);
  assert.equal(result.sessions[0].participant_count, null, "outsiders cannot infer roster size from attendance");
  assert.equal(result.sessions[0].reflection, null);
  assert.ok(!JSON.stringify(result).includes(privateNote));
});

test("existing group member retains access to the own-group discussion", async () => {
  const { route } = fixture();
  const response = await route.GET(req("open", "member"));
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.membership, "member");
  assert.equal(result.sessions[0].participant_count, 3, "members retain attendance");
  assert.equal(result.sessions[0].reflection, privateNote);
});

test("nonmembers cannot enumerate private group meetings", async () => {
  const { route } = fixture();
  for (const userId of ["", "outsider"]) {
    const response = await route.GET(req("closed", userId));
    assert.equal(response.status, 404);
    assert.ok(!JSON.stringify(await response.json()).includes(privateNote));
  }
});

test("outsider cannot POST a group meeting", async () => {
  const { route, writes } = fixture();
  const response = await route.POST(req("open", "outsider", "POST"));
  assert.equal(response.status, 403);
  assert.equal(writes(), 0);
});

test("cross-origin write is refused before DB mutation", async () => {
  const { route, writes } = fixture();
  const response = await route.POST(req("open", "member", "POST", "https://other.invalid"));
  assert.equal(response.status, 403);
  assert.equal(writes(), 0);
});
