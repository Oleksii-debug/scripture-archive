import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

// Execute the production SQL, not a rewritten model of its ownership rules.
const route = readFileSync(new URL("../app/api/analytics/route.ts", import.meta.url), "utf8");
const match = route.match(/env\\.DB\\.prepare\\(`(INSERT INTO usage_sessions[\\s\\S]*?)`\\)\\s*\\.bind\\(/);
assert.ok(match, "canonical analytics upsert SQL must remain testable");
const sql = match[1];

function sessionDatabase() {
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE usage_sessions (
    session_id TEXT PRIMARY KEY,
    user_id TEXT,
    active_seconds INTEGER NOT NULL,
    page_views INTEGER NOT NULL,
    country TEXT,
    city TEXT,
    device TEXT,
    operating_system TEXT,
    browser TEXT,
    source TEXT,
    last_seen_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
  const statement = db.prepare(sql);
  const write = (sessionId, userId) => statement.run(
    sessionId, userId, 5, 1, "SK", null, "desktop", "Windows",
    "Chrome", "direct", 5, 1,
  ).changes;
  const read = sessionId => db.prepare("SELECT user_id,active_seconds,page_views FROM usage_sessions WHERE session_id=?")
    .get(sessionId);
  return { db, write, read };
}

test("another authenticated principal cannot take over or increment an existing analytics session", () => {
  const {db,write,read} = sessionDatabase();
  try {
    assert.equal(write("session-a","account-a"),1);
    assert.equal(write("session-a","account-b"),0);
    assert.deepEqual({...read("session-a")},{user_id:"account-a",active_seconds:5,page_views:1});
    assert.equal(write("session-a","account-a"),1);
    assert.deepEqual({...read("session-a")},{user_id:"account-a",active_seconds:10,page_views:2});
  } finally { db.close(); }
});

test("logout or anonymous traffic cannot silently accrue activity to the prior signed-in user", () => {
  const {db,write,read} = sessionDatabase();
  try {
    assert.equal(write("signed-in","account-a"),1);
    assert.equal(write("signed-in",null),0);
    assert.deepEqual({...read("signed-in")},{user_id:"account-a",active_seconds:5,page_views:1});
    assert.equal(write("fresh-anonymous",null),1);
    assert.equal(write("fresh-anonymous",null),1);
    assert.deepEqual({...read("fresh-anonymous")},{user_id:null,active_seconds:10,page_views:2});
  } finally { db.close(); }
});

test("normal anonymous-to-authenticated attribution and independent user sessions remain supported", () => {
  const {db,write,read} = sessionDatabase();
  try {
    assert.equal(write("new-visit",null),1);
    assert.equal(write("new-visit","account-a"),1);
    assert.deepEqual({...read("new-visit")},{user_id:"account-a",active_seconds:10,page_views:2});
    assert.equal(write("different-visit","account-b"),1);
    assert.deepEqual({...read("different-visit")},{user_id:"account-b",active_seconds:5,page_views:1});
    assert.equal(write("new-visit","account-b"),0);
    assert.deepEqual({...read("new-visit")},{user_id:"account-a",active_seconds:10,page_views:2});
  } finally { db.close(); }
});
