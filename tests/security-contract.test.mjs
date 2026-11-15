import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("public mission data contains metadata only", async () => {
  const [mission, server] = await Promise.all([
    read("public/data/mission-abraham.json"), read("content/mission-abraham.json"),
  ]).then(files => files.map(file => JSON.parse(file)));
  assert.equal(mission.taskCount, server.tasks.length);
  assert.equal(server.taskCountPublished, server.tasks.length);
  const chapters = new Map(server.tasks.map(({book, chapter}) => [`${book}:${chapter}`, {book, chapter}]));
  assert.deepEqual(mission.chapters, [...chapters.values()]);
  assert.equal("tasks" in mission, false);
  assert.doesNotMatch(JSON.stringify(mission), /correct|options|question|hint|success/i);
});

test("Genesis 14 activities cite available verses in every bundled edition and have complete translations", async () => {
  const mission = JSON.parse(await read("content/mission-abraham.json"));
  const tasks = mission.tasks.filter(task => task.book === "GEN" && task.chapter === 14);
  assert.equal(tasks.length, 3);
  assert.equal(new Set(mission.tasks.map(task => task.id)).size, mission.tasks.length);
  assert.deepEqual(tasks.map(task => task.verses), [[14,15,16],[18,19,20],[21,22,23,24]]);
  const books = await Promise.all(["uk", "uk-ohiienko", "ru", "en"].map(async edition =>
    JSON.parse(await read(`public/data/bible/${edition}/GEN.json`))));
  for (const task of tasks) {
    for (const book of books)
      for (const verse of task.verses) assert.ok(book.chapters[13][verse - 1]?.trim(), `${book.editionId} GEN 14:${verse}`);
    for (const locale of ["uk", "ru", "en"]) {
      assert.ok(task.question[locale].trim());
      assert.ok(task.success[locale].trim());
      assert.equal(new Set(task.options[locale]).size, 4);
      for (const index of task.correct) assert.ok(task.options[locale][index].trim());
    }
  }
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
  const analyticsMigration = await read("drizzle/0005_usage_analytics.sql");
  for (const table of ["usage_sessions", "usage_events"])
    assert.ok(analyticsMigration.includes(`CREATE TABLE \`${table}\``), table);
});

test("state-changing API routes enforce same-origin writes", async () => {
  for (const path of ["app/api/auth/route.ts", "app/api/attempts/route.ts", "app/api/account/route.ts", "app/api/groups/route.ts", "app/api/materials/route.ts", "app/api/content/route.ts", "app/api/analytics/route.ts", "app/api/community/route.ts"])
    assert.match(await read(path), /sameOrigin\(request\)/, path);
});

test("public navigation exposes crawlable paths instead of fragment-only routes", async () => {
  for (const path of ["app/page.tsx", "public/app.js", "public/home.js", "public/workspace.js"])
    assert.doesNotMatch(await read(path), /href=["'`]#\//, path);
  const route = await read("app/[...slug]/page.tsx");
  for (const page of ["reader", "campaigns", "missions", "groups", "community", "support", "help", "about", "privacy"])
    assert.match(route, new RegExp(`\\b${page}\\b`), page);
});

test("community keeps automated identity internal and real progress opt-in", async () => {
  const [route, account, migration] = await Promise.all([
    read("app/api/community/route.ts"), read("app/api/account/route.ts"), read("drizzle/0007_community.sql"),
  ]);
  for (const table of ["community_runs", "community_waves", "community_members", "community_run_log"])
    assert.ok(migration.includes(`CREATE TABLE \`${table}\``), table);
  assert.match(migration, /public_progress/);
  assert.match(migration, /source_kind/);
  const publicShape = route.slice(route.indexOf("return {", route.indexOf("function publicSynthetic")), route.indexOf("function progressCount"));
  assert.doesNotMatch(publicShape, /source_kind/i);
  assert.match(account, /public_progress/);
});

test("SEO endpoints use the configured public origin and protect private routes", async () => {
  const [site, robots, sitemap, route] = await Promise.all([
    read("lib/site.ts"),
    read("app/robots.txt/route.ts"),
    read("app/sitemap.xml/route.ts"),
    read("app/[...slug]/page.tsx"),
  ]);
  assert.match(site, /NEXT_PUBLIC_SITE_URL/);
  assert.match(robots, /Disallow: \/api\//);
  assert.match(robots, /Sitemap:/);
  assert.match(sitemap, /\/reader/);
  assert.match(sitemap, /\/privacy/);
  assert.match(route, /index: false, follow: false/);
});

test("analytics requires consent and removes sensitive URL components", async () => {
  const [analytics, route] = await Promise.all([read("public/analytics.js"), read("app/api/analytics/route.ts")]);
  assert.match(analytics, /analytics_storage: consent === "granted" \? "granted" : "denied"/);
  assert.match(analytics, /privateRoutes\.has\(route\)/);
  assert.match(analytics, /location\.pathname/);
  assert.doesNotMatch(analytics, /page_location:\s*location\.(href|search)/);
  assert.match(analytics, /track\("page_view"\)/);
  assert.match(analytics, /allow_google_signals: false/);
  assert.match(analytics, /activeSeconds/);
  assert.match(analytics, /\/api\/analytics/);
  assert.match(route, /!isVerifiedOwner\(identity\)/);
  assert.doesNotMatch(route, /cf-connecting-ip|x-forwarded-for/i);
});
