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
  const analyticsMigration = await read("drizzle/0005_usage_analytics.sql");
  for (const table of ["usage_sessions", "usage_events"])
    assert.ok(analyticsMigration.includes(`CREATE TABLE \`${table}\``), table);
});

test("state-changing API routes enforce same-origin writes", async () => {
  for (const path of ["app/api/auth/route.ts", "app/api/attempts/route.ts", "app/api/account/route.ts", "app/api/groups/route.ts", "app/api/materials/route.ts", "app/api/content/route.ts", "app/api/analytics/route.ts"])
    assert.match(await read(path), /sameOrigin\(request\)/, path);
});

test("public navigation exposes crawlable paths instead of fragment-only routes", async () => {
  for (const path of ["app/page.tsx", "public/app.js", "public/home.js", "public/workspace.js"])
    assert.doesNotMatch(await read(path), /href=["'`]#\//, path);
  const route = await read("app/[...slug]/page.tsx");
  for (const page of ["reader", "campaigns", "missions", "groups", "support", "about", "privacy"])
    assert.match(route, new RegExp(`\\b${page}\\b`), page);
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
  assert.match(route, /identity\?\.email !== OWNER_EMAIL/);
  assert.doesNotMatch(route, /cf-connecting-ip|x-forwarded-for/i);
});
