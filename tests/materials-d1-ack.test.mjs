import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

// Real production handler + actual SQLite constraints, disposable and offline.
const source = readFileSync(new URL("../app/api/materials/route.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const valid = { title: "Real draft", prompt: "Which verse?", reference: "GEN 12",
  explanation: "Source based explanation", answer: "first", options: ["first", "second"], locale: "uk" };

function fixture() {
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE study_materials (
    id TEXT PRIMARY KEY, owner_user_id TEXT NOT NULL, title TEXT NOT NULL, locale TEXT NOT NULL,
    data TEXT NOT NULL, visibility TEXT NOT NULL DEFAULT 'private',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  let ack = "normal", afterOwnerRead = null;
  const D1 = { prepare(sql) {
    const statement = (...args) => ({
      async first() {
        const row = db.prepare(sql).get(...args) || null;
        if (sql.startsWith("SELECT owner_user_id") && afterOwnerRead) {
          const callback = afterOwnerRead; afterOwnerRead = null; callback();
        }
        return row;
      },
      async all() { return { success: true, results: db.prepare(sql).all(...args) }; },
      async run() {
        const result = db.prepare(sql).run(...args);
        if (sql.startsWith("INSERT INTO study_materials") && ack !== "normal") {
          const mode = ack; ack = "normal";
          return mode === "missing" ? { success: true, meta: {} } : { success: false, meta: { changes: Number(result.changes) } };
        }
        return { success: true, meta: { changes: Number(result.changes) } };
      },
    });
    return { bind: (...args) => statement(...args), ...statement() };
  } };
  const exported = {};
  vm.runInNewContext(compiled.outputText, {
    exports: exported, Request, Response, URL, crypto,
    require(id) {
      if (id === "cloudflare:workers") return { env: { DB: D1 } };
      if (id.endsWith("lib/auth")) return {
        authenticateRequest: async request => {
          const userId = request.headers.get("x-user");
          return userId ? { userId, email: userId + "@example.invalid", emailVerified: true, provider: "password" } : null;
        },
        sameOrigin: request => request.headers.get("origin") === new URL(request.url).origin,
      };
      throw Error("unexpected module " + id);
    },
  });
  const base = "https://test.invalid";
  async function post(data = valid, user = "alice", origin = base) {
    const request = new Request(base + "/api/materials", {
      method: "POST", headers: { origin, "x-user": user, "content-type": "application/json" },
      body: JSON.stringify(data),
    });
    const response = await exported.POST(request);
    return { status: response.status, body: await response.json() };
  }
  async function get(mine = false, user = "") {
    const request = new Request(base + "/api/materials" + (mine ? "?mine=1" : ""), {
      headers: user ? { "x-user": user } : {},
    });
    const response = await exported.GET(request);
    return { status: response.status, body: await response.json() };
  }
  return { db, post, get, setAck(mode) { ack = mode; }, afterOwnerRead(fn) { afterOwnerRead = fn; } };
}

test("saved material ACK represents a committed owner-conditional write", async () => {
  const f = fixture();
  try {
    assert.equal((await f.post(valid, "alice", "https://attacker.invalid")).status, 403);
    const first = await f.post({ ...valid, id: "synthetic-draft", visibility: "public" });
    assert.equal(first.status, 201);
    assert.equal(first.body.id, "synthetic-draft");
    const row = f.db.prepare("SELECT owner_user_id,visibility FROM study_materials WHERE id=?").get(first.body.id);
    assert.equal(row.owner_user_id, "alice");
    assert.equal(row.visibility, "private", "only a review can publish a new draft");
    assert.equal((await f.post({ ...valid, id: first.body.id, title: "Updated draft" })).status, 200);
    assert.equal((await f.post({ ...valid, id: first.body.id }, "bob")).status, 403);
    assert.equal((await f.get(true, "alice")).body.materials.length, 1);
  } finally { f.db.close(); }
});

test("false and missing D1 ACKs return 503 even when SQLite completed the write", async () => {
  for (const mode of ["failed", "missing"]) {
    const f = fixture();
    try {
      f.setAck(mode);
      const first = await f.post({ ...valid, id: "unknown-ack" });
      assert.equal(first.status, 503);
      assert.equal(first.body.error, "material_save_failed");
      const row = f.db.prepare("SELECT owner_user_id FROM study_materials WHERE id=?").get("unknown-ack");
      assert.equal(row.owner_user_id, "alice", "lost ACK must not fabricate a rollback");
      const retry = await f.post({ ...valid, id: "unknown-ack" });
      assert.equal(retry.status, 200, "idempotent upsert of owned draft may recover after a lost ACK");
      assert.equal(f.db.prepare("SELECT COUNT(*) AS count FROM study_materials").get().count, 1);
    } finally { f.db.close(); }
  }
});

test("a competing owner cannot steal an ID inserted after the preflight read", async () => {
  const f = fixture();
  try {
    f.afterOwnerRead(() => f.db.prepare("INSERT INTO study_materials(id,owner_user_id,title,locale,data,visibility) VALUES (?,?,?,?,?,?)")
      .run("race-id", "bob", "Bob draft", "en", JSON.stringify({}), "private"));
    const response = await f.post({ ...valid, id: "race-id" });
    assert.equal(response.status, 403);
    const row = f.db.prepare("SELECT owner_user_id,title FROM study_materials WHERE id=?").get("race-id");
    assert.equal(row.owner_user_id, "bob");
    assert.equal(row.title, "Bob draft");
  } finally { f.db.close(); }
});

test("legacy public material list redacts answer and explanation", async () => {
  const f = fixture();
  try {
    f.db.prepare("INSERT INTO study_materials(id,owner_user_id,title,locale,data,visibility) VALUES (?,?,?,?,?,?)")
      .run("legacy", "owner", "Historical", "uk", JSON.stringify(valid), "public");
    const response = await f.get();
    assert.equal(response.status, 200);
    const data = response.body.materials[0].data;
    assert.equal("answer" in data, false);
    assert.equal("explanation" in data, false);
    assert.deepEqual(data.options, ["first", "second"]);
  } finally { f.db.close(); }
});
