import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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

function database() {
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE mission_attempts (id TEXT, mission_id TEXT, actor_id TEXT, book_id TEXT, chapter INTEGER, group_id TEXT, started_at TEXT, status TEXT, expires_at TEXT)");
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
