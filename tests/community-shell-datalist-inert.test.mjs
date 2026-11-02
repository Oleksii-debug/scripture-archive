import assert from "node:assert/strict";
import test from "node:test";
import { communityDeploymentReady } from "../lib/community-smoke.mjs";

// Source-only P0 R0.4 readiness preflight, not live Sites, D1, browser or NVDA.
// <datalist> contains suggestions, not a visible document landmark/navigation.
// A hidden suggestion subtree must not qualify a public SSR shell.
const ORIGIN = "https://scripture-archive.com";
const MARKERS = '<main id="main"></main><a href="/community" data-route="community">Community</a>';
const page = body => `<!doctype html><html><body>${body}</body></html>`;

async function ready(html) {
  const methods = [];
  const result = await communityDeploymentReady(ORIGIN, async (url, options) => {
    methods.push(options.method || "GET");
    assert.equal(options.redirect, "manual");
    const path = new URL(url).pathname;
    if (path === "/community")
      return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    if (path === "/api/community")
      return Response.json({ summary: { registered: 1, online: 0 } },
        { headers: { "Cache-Control": "no-store" } });
    if (path === "/api/account")
      return Response.json({ user: null }, { headers: { "Cache-Control": "no-store" } });
    if (path === "/api/community/dispatch")
      return new Response(null, { status: 204, headers: {
        "Cache-Control": "no-store", "X-Scripture-Runner-Protocol": "github-oidc-v1",
      } });
    if (path === "/robots.txt")
      return new Response("Sitemap: https://scripture-archive.com/sitemap.xml");
    if (path === "/sitemap.xml")
      return new Response("<urlset></urlset>");
    throw Error("Unexpected release probe: " + path);
  });
  assert.deepEqual(methods, Array(6).fill("GET"), "preflight must remain read-only");
  return result;
}

for (const [name, html] of [
  ["all markers inside datalist", page(`<datalist id="suggestions">${MARKERS}</datalist>`)],
  ["uppercase datalist", page(`<DATALIST>${MARKERS}</DATALIST>`)],
  ["main inside datalist", page(`<datalist><main id="main"></main></datalist><a href="/community" data-route="community">Community</a>`)],
  ["community link inside datalist", page(`<main id="main"></main><datalist><a href="/community" data-route="community">Community</a></datalist>`)],
  ["nested datalist close must not expose outer suggestions", page(`<datalist><datalist>${MARKERS}</datalist>${MARKERS}</datalist>`)],
]) {
  test("P0 R0.4: datalist cannot certify keyboard-visible SSR navigation: " + name, async () => {
    assert.equal(await ready(html), false);
  });
}

for (const [name, html] of [
  ["ordinary visible shell", page(MARKERS)],
  ["visible shell after datalist", page(`<datalist>${MARKERS}</datalist>${MARKERS}`)],
  ["visible shell before datalist", page(`${MARKERS}<datalist>${MARKERS}</datalist>`)],
]) {
  test("P0 R0.4: visible navigation outside datalist qualifies: " + name, async () => {
    assert.equal(await ready(html), true);
  });
}

test("P0 R0.4: readiness recovers after datalist-only placeholder is replaced", async () => {
  assert.equal(await ready(page(`<datalist>${MARKERS}</datalist>`)), false);
  assert.equal(await ready(page(MARKERS)), true);
});
