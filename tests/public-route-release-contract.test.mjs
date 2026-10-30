import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

const load = (relative) => readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
const catchAll = load("../app/[...slug]/page.tsx");
const sitemap = load("../app/sitemap.xml/route.ts");
const home = load("../app/page.tsx");

function routeSet(name) {
  const match = catchAll.match(new RegExp(`const ${name} = new Set\\(\\[([^\\]]+)\\]\\)`));
  assert.ok(match, `Cannot locate ${name}; review routing contract`);
  return new Set([...match[1].matchAll(/"([^"]+)"/g)].map((entry) => entry[1]));
}

function advertisedPaths() {
  const match = sitemap.match(/const routes = \[([\s\S]*?)\] as const;/);
  assert.ok(match, "Cannot locate sitemap routes; review SEO contract");
  return [...match[1].matchAll(/\[\s*"\/([^"]*)"\s*,/g)].map((entry) => entry[1]);
}

const publicRoutes = routeSet("PUBLIC_ROUTES");
const privateRoutes = routeSet("PRIVATE_ROUTES");

test("every advertised sitemap route is directly handled by the server", () => {
  for (const route of advertisedPaths()) {
    if (route) assert.ok(publicRoutes.has(route), `sitemap / ${route} is not accepted by catch-all route`);
  }
});

test("public navigation links can survive direct navigation and refresh", () => {
  const nav = home.match(/<nav id="primary-nav"[\s\S]*?<\/nav>/);
  assert.ok(nav, "Primary navigation not found");
  const slugs = [...nav[0].matchAll(/href="\/([^"#?]*)"/g)].map((entry) => entry[1]);
  for (const slug of slugs) {
    if (slug) assert.ok(publicRoutes.has(slug) || privateRoutes.has(slug), `navigation / ${slug} is not accepted by catch-all route`);
  }
});

test("advertised /help has a direct route and semantic page metadata", () => {
  const advertised = home.includes('href="/help"') || sitemap.includes('["/help"');
  if (!advertised) return; // Older PR base predates help; test activates when main introduces it.
  assert.ok(publicRoutes.has("help"), "Support page is unreachable on direct /help request");
  assert.match(catchAll, /help:\s*\{\s*title:\s*"Служба підтримки/);
});

test("private and authenticated paths are not advertised in sitemap", () => {
  for (const slug of advertisedPaths()) {
    assert.ok(!privateRoutes.has(slug), `private / ${slug} leaked to sitemap`);
  }
});

test("permanent site language selector offers exactly UK, RU and EN", () => {
  const select = home.match(/<select id="language"[\s\S]*?<\/select>/);
  assert.ok(select, "Language selector missing");
  const locales = [...select[0].matchAll(/<option value="([^"]+)"/g)].map((entry) => entry[1]);
  assert.deepEqual(locales, ["uk", "ru", "en"]);
});

// Robots exclusion patterns are prefix matches. In particular /mission (private)
// also matches /missions (public) unless a more specific Allow rule wins.
const robotsSource = load("../app/robots.txt/route.ts");
function robotsAllows(path) {
  const rules = [...robotsSource.matchAll(/"(Allow|Disallow): ([^"\n]+)"/g)]
    .map(([, kind, prefix]) => ({ kind, prefix }))
    .filter(({ prefix }) => path.startsWith(prefix))
    .sort((a, b) => b.prefix.length - a.prefix.length ||
      (a.kind === "Allow" ? -1 : 1));
  return !rules.length || rules[0].kind === "Allow";
}

test("robots.txt permits every sitemap-advertised public route", () => {
  for (const slug of advertisedPaths()) {
    const path = slug ? `/${slug}` : "/";
    assert.ok(robotsAllows(path), `robots.txt blocks public sitemap URL ${path}`);
  }
});

test("robots.txt retains API and account, mission, progress, editor exclusions", () => {
  for (const path of ["/api/auth", "/account", "/mission", "/mission/abraham", "/progress", "/editor"]) {
    assert.ok(!robotsAllows(path), `robots.txt accidentally allows private URL ${path}`);
  }
});
