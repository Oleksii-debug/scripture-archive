import assert from "node:assert/strict";
import test from "node:test";
import { communityDeploymentReady } from "../lib/community-smoke.mjs";

// Source-only R0.4 six-GET preflight, not live Sites, D1, browser or NVDA proof.
// A successfully loaded HTML object replaces its fallback descendants. Such
// descendants cannot establish visible keyboard navigation. This conservative
// source preflight must not depend on whether the external object loads.
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
  assert.deepEqual(methods, Array(6).fill("GET"));
  return result;
}

for (const [name, html] of [
  ["object fallback-only markers", page(`<object data="/asset.svg" type="image/svg+xml">${MARKERS}</object>`)],
  ["uppercase object fallback", page(`<OBJECT data="/asset.svg">${MARKERS}</OBJECT>`)],
  ["main inside object only", page(`<object data="/asset.svg"><main id="main"></main></object><a href="/community" data-route="community">Community</a>`)],
  ["community link inside object only", page(`<main id="main"></main><object data="/asset.svg"><a href="/community" data-route="community">Community</a></object>`)],
  ["nested object close cannot expose outer fallback", page(`<object data="/outer.svg"><object data="/inner.svg">${MARKERS}</object>${MARKERS}</object>`)],
]) {
  test("P0 R0.4: object fallback cannot certify SSR navigation: " + name, async () => {
    assert.equal(await ready(html), false);
  });
}

for (const [name, html] of [
  ["ordinary visible shell", page(MARKERS)],
  ["visible shell after object", page(`<object data="/asset.svg">${MARKERS}</object>${MARKERS}`)],
  ["visible shell before object", page(`${MARKERS}<object data="/asset.svg">${MARKERS}</object>`)],
]) {
  test("P0 R0.4: visible navigation outside object still qualifies: " + name, async () => {
    assert.equal(await ready(html), true);
  });
}

test("P0 R0.4: preflight recovers after object-only placeholder is replaced", async () => {
  assert.equal(await ready(page(`<object data="/asset.svg">${MARKERS}</object>`)), false);
  assert.equal(await ready(page(MARKERS)), true);
});
