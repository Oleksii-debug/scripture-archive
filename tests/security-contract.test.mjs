import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("public mission data contains metadata only", async () => {
  const mission = JSON.parse(await read("public/data/mission-abraham.json"));
  assert.equal(mission.taskCount, 5);
  assert.equal("tasks" in mission, false);
  assert.doesNotMatch(JSON.stringify(mission), /correct|options|question|hint|success/i);
});

test("server mission has no hint fields", async () => {
  const mission = JSON.parse(await read("content/mission-abraham.json"));
  for (const task of mission.tasks) assert.equal("hint" in task, false);
});

test("active attempt payload excludes passage identity and answer keys", async () => {
  const source = await read("app/api/attempts/route.ts");
  const publicTask = source.slice(source.indexOf("function publicTask"), source.indexOf("async function actor"));
  assert.doesNotMatch(publicTask, /correct|success|reference|verses|chapter|book/);
  assert.match(source, /attempt\.status === "completed"/);
  assert.match(source, /resultFor\(/);
});

test("account security primitives and database tables are present", async () => {
  const [auth, migration] = await Promise.all([read("lib/auth.ts"), read("drizzle/0004_accounts_attempts.sql")]);
  assert.match(auth, /PBKDF2/);
  assert.match(auth, /310_000/);
  assert.match(auth, /HttpOnly; SameSite=Lax/);
  for (const table of ["accounts", "auth_sessions", "auth_tokens", "auth_rate_limits", "mission_attempts", "chapter_read_receipts"])
    assert.ok(migration.includes(`CREATE TABLE \`${table}\``), table);
});

test("state-changing API routes enforce same-origin writes", async () => {
  for (const path of ["app/api/auth/route.ts", "app/api/attempts/route.ts", "app/api/account/route.ts", "app/api/groups/route.ts", "app/api/materials/route.ts", "app/api/content/route.ts"])
    assert.match(await read(path), /sameOrigin\(request\)/, path);
});
