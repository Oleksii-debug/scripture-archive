import assert from "node:assert/strict";
import test from "node:test";
import { communityDeploymentReady } from "../lib/community-smoke.mjs";

// Source-only R0.4 six-GET preflight, not live Sites, D1, browser or NVDA proof.
// Modern browsers render supported audio/video controls instead of fallback
// descendants. Such descendants cannot establish a visible, keyboard-navigable
// SSR community shell. Fail closed even when nested fallback tags are malformed.
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
  ["video fallback-only markers", page(`<video controls>${MARKERS}</video>`)],
  ["audio fallback-only markers", page(`<audio controls>${MARKERS}</audio>`)],
  ["uppercase video fallback", page(`<VIDEO>${MARKERS}</VIDEO>`)],
  ["main inside video only", page(`<video><main id="main"></main></video><a href="/community" data-route="community">Community</a>`)],
  ["community link inside audio only", page(`<main id="main"></main><audio><a href="/community" data-route="community">Community</a></audio>`)],
  ["nested video closing cannot expose outer fallback", page(`<video><video>${MARKERS}</video>${MARKERS}</video>`)],
  ["nested audio closing cannot expose outer fallback", page(`<audio><audio>${MARKERS}</audio>${MARKERS}</audio>`)],
]) {
  test("P0 R0.4: media fallback cannot certify visible SSR navigation: " + name, async () => {
    assert.equal(await ready(html), false);
  });
}

for (const [name, html] of [
  ["ordinary visible shell", page(MARKERS)],
  ["visible shell after media", page(`<video controls><source src="/fixture.webm">${MARKERS}</video>${MARKERS}`)],
  ["visible shell before media", page(`${MARKERS}<audio controls><source src="/fixture.ogg">${MARKERS}</audio>`)],
]) {
  test("P0 R0.4: real visible navigation still qualifies: " + name, async () => {
    assert.equal(await ready(html), true);
  });
}

test("P0 R0.4: preflight recovers when media-only placeholder is replaced", async () => {
  assert.equal(await ready(page(`<video>${MARKERS}</video>`)), false);
  assert.equal(await ready(page(MARKERS)), true);
});
