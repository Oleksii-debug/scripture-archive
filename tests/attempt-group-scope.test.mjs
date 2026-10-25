import assert from "node:assert/strict";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const source = await readFile(new URL("../app/api/attempts/route.ts", import.meta.url), "utf8");
const start = source.indexOf('if (action === "chapter") {');
const end = source.indexOf("  const attemptId = ", start);
assert.ok(start >= 0 && end > start, "chapter lookup route must exist");
const route = source.slice(start, end);
const sql = route.match(/\.prepare\("([^"]+)"\)/)?.[1];
assert.ok(sql, "lookup SQL must be obtained from the production route");
assert.equal(route.match(/\.bind\(([^)]+)\)\.first\(\)/)?.[1],
  "currentActor.id, book, chapter, groupId", "lookup must bind four scope arguments");
assert.equal((sql.match(/\?/g) || []).length, 4, "SQL must require exact group binding");

function database(filename = ":memory:") {
  const db = new DatabaseSync(filename);
  db.exec("CREATE TABLE IF NOT EXISTS mission_attempts (id TEXT, mission_id TEXT, actor_id TEXT, book_id TEXT, chapter INTEGER, group_id TEXT, started_at TEXT, status TEXT, expires_at TEXT)");
  const insert = db.prepare("INSERT INTO mission_attempts VALUES (?,?,?,?,?,?,?,?,?)");
  const add = (id, actor, book, chapter, group, started) =>
    insert.run(id, "OT-AB-01", actor, book, chapter, group, started, "active", "2099-01-01");
  const find = (actor, book, chapter, group) => db.prepare(sql).get(actor, book, chapter, group);
  return { db, add, find };
}

test("personal chapter lookup never resumes a group attempt", () => {
  const { db, add, find } = database();
  try {
    add("group-attempt", "reader", "GEN", 12, "group-a", "2026-10-25 00:00:00");
    assert.equal(find("reader", "GEN", 12, ""), undefined);
    assert.equal(find("reader", "GEN", 12, "group-a")?.id, "group-attempt");
    assert.equal(find("reader", "GEN", 12, "group-b"), undefined);
    assert.equal(find("other", "GEN", 12, "group-a"), undefined);
  } finally { db.close(); }
});

test("personal and group chapters read back independently after another attempt is stored", () => {
  const { db, add, find } = database();
  try {
    add("group-a", "reader", "GEN", 12, "group-a", "2026-10-25 00:00:00");
    add("personal", "reader", "GEN", 12, null, "2026-10-25 00:01:00");
    add("group-b", "reader", "GEN", 12, "group-b", "2026-10-25 00:02:00");
    assert.equal(find("reader", "GEN", 12, "")?.id, "personal");
    assert.equal(find("reader", "GEN", 12, "group-a")?.id, "group-a");
    assert.equal(find("reader", "GEN", 12, "group-b")?.id, "group-b");
    assert.equal(find("reader", "GEN", 13, "group-a"), undefined);
  } finally { db.close(); }
});


// Execute the exact extracted production GET branch under a real Request/Response
// with a D1-shaped database adapter. This is focused route-contract evidence,
// not a deployed Worker or a browser/UI acceptance test.
async function chapterGet(db, actorId, query) {
  const env = { DB: { prepare(statement) {
    const prepared = db.prepare(statement);
    return { bind(...params) { return { first: () => prepared.get(...params) }; } };
  } } };
  const clean = (value, max = 100) => typeof value === "string" ? value.trim().slice(0, max) : "";
  const json = data => Response.json(data, { headers: { "Cache-Control": "no-store" } });
  const run = new Function("request", "env", "actor", "clean", "json", `
    return (async () => {
      const url = new URL(request.url), action = url.searchParams.get("action") || "current";
      ${route}
    })();
  `);
  const response = await run(new Request(`http://localhost/api/attempts?action=chapter&book=GEN&chapter=12${query}`),
    env, async () => actorId ? { id: actorId } : null, clean, json);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  return response.json();
}

test("actual GET branch keeps personal and two group readbacks apart", async () => {
  const { db, add } = database();
  try {
    add("group-a", "reader", "GEN", 12, "group-a", "2026-10-25 00:00:00");
    add("group-b", "reader", "GEN", 12, "group-b", "2026-10-25 00:01:00");
    assert.equal((await chapterGet(db, "reader", "")).active, null);
    assert.equal((await chapterGet(db, "reader", "&groupId=group-a")).active.id, "group-a");
    assert.equal((await chapterGet(db, "reader", "&groupId=group-b")).active.id, "group-b");
    add("personal", "reader", "GEN", 12, null, "2026-10-25 00:02:00");
    assert.equal((await chapterGet(db, "reader", "")).active.id, "personal");
    assert.equal((await chapterGet(db, "reader", "&groupId=group-a")).active.id, "group-a");
  } finally { db.close(); }
});

test("actual GET branch fails closed for unauthenticated or different actor", async () => {
  const { db, add } = database();
  try {
    add("group-a", "reader", "GEN", 12, "group-a", "2026-10-25 00:00:00");
    assert.equal((await chapterGet(db, null, "&groupId=group-a")).active, null);
    assert.equal((await chapterGet(db, "outsider", "&groupId=group-a")).active, null);
  } finally { db.close(); }
});

test("actual GET branch excludes expired/invalidated attempts and picks newest active", async () => {
  const { db, add } = database();
  try {
    add("old", "reader", "GEN", 12, null, "2026-10-25 00:00:00");
    add("new", "reader", "GEN", 12, null, "2026-10-25 00:05:00");
    db.prepare("UPDATE mission_attempts SET status='invalidated' WHERE id='new'").run();
    assert.equal((await chapterGet(db, "reader", "")).active.id, "old");
    db.prepare("UPDATE mission_attempts SET expires_at='2000-01-01' WHERE id='old'").run();
    assert.equal((await chapterGet(db, "reader", "")).active, null);
  } finally { db.close(); }
});


// Verify real file-based persistence across a closed/reopened database. The
// route fragment is exact source-extracted, but these tests are not a Worker E2E.
for (const journal of ["DELETE", "WAL"]) {
  test(`chapter scope survives a database restart (${journal})`, async () => {
    const directory = await mkdtemp(join(tmpdir(), "sa03-chapter-scope-"));
    try {
      const filename = join(directory, "attempts.sqlite");
      const initial = database(filename);
      try {
        initial.db.exec(`PRAGMA journal_mode=${journal}`);
        initial.add("group-a", "reader", "GEN", 12, "group-a", "2026-10-25 00:00:00");
        initial.add("group-b", "reader", "GEN", 12, "group-b", "2026-10-25 00:01:00");
        initial.add("personal", "reader", "GEN", 12, null, "2026-10-25 00:02:00");
        initial.add("other-user", "outsider", "GEN", 12, "group-a", "2026-10-25 00:03:00");
      } finally { initial.db.close(); }

      const resumed = database(filename);
      try {
        assert.equal((await chapterGet(resumed.db, "reader", "")).active?.id, "personal");
        assert.equal((await chapterGet(resumed.db, "reader", "&groupId=group-a")).active?.id, "group-a");
        assert.equal((await chapterGet(resumed.db, "reader", "&groupId=group-b")).active?.id, "group-b");
        assert.equal((await chapterGet(resumed.db, "outsider", "&groupId=group-a")).active?.id, "other-user");
        assert.equal((await chapterGet(resumed.db, "outsider", "")).active, null);
        resumed.db.prepare("UPDATE mission_attempts SET status='invalidated' WHERE id='personal'").run();
      } finally { resumed.db.close(); }

      const reopened = database(filename);
      try {
        assert.equal((await chapterGet(reopened.db, "reader", "")).active, null);
        assert.equal((await chapterGet(reopened.db, "reader", "&groupId=group-a")).active?.id, "group-a");
      } finally { reopened.db.close(); }
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
}
