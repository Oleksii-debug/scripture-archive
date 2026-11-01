import assert from "node:assert/strict";
import test from "node:test";
import { communityDeploymentReady } from "../lib/community-smoke.mjs";

// Source-level read-only readiness probe, not a browser/NVDA or production release gate.
// HTML raw-text and fallback content is not a visible, keyboard-operable app shell.
const ORIGIN = "https://scripture-archive.com";
const MARKERS = '<main id="main"></main><a href="/community" data-route="community">Community</a>';
const page = body => `<!doctype html><html><body>${body}</body></html>`;

async function ready(html) {
  const methods = [];
  const result = await communityDeploymentReady(ORIGIN, async (url, options) => {
    methods.push(options.method || "GET");
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
    throw Error("Unexpected preflight path: " + path);
  });
  assert.deepEqual(methods, Array(6).fill("GET"), "preflight must not mutate or dispatch");
  return result;
}

for (const [name, html] of [
  ["iframe fallback", page(`<iframe src="/old-site">${MARKERS}</iframe>`)],
  ["uppercase iframe fallback", page(`<IFRAME src="/old-site">${MARKERS}</IFRAME>`)],
  ["xmp literal markup", page(`<xmp>${MARKERS}</xmp>`)],
  ["noembed fallback", page(`<noembed>${MARKERS}</noembed>`)],
  ["noframes fallback", page(`<noframes>${MARKERS}</noframes>`)],
  ["iframe fallback with visible main outside", page(`<main id="main"></main><iframe src="/old-site"><a href="/community" data-route="community">Community</a></iframe>`)],
  ["iframe fallback with visible link outside", page(`<a href="/community" data-route="community">Community</a><iframe src="/old-site"><main id="main"></main></iframe>`)],
  ["plaintext consumes rest of document", page(`<plaintext>${MARKERS}</plaintext>${MARKERS}`)],
  ["plaintext cannot be closed by a fake end tag", page(`<plaintext>Legacy</plaintext>${MARKERS}`)],
]) {
  test("R0.4 refuses inert raw-text/fallback markers: " + name, async () => {
    assert.equal(await ready(html), false);
  });
}

for (const [name, html] of [
  ["ordinary shell", page(MARKERS)],
  ["real shell after iframe fallback", page(`<iframe src="/old-site">${MARKERS}</iframe>${MARKERS}`)],
  ["real shell after xmp", page(`<xmp>${MARKERS}</xmp>${MARKERS}`)],
  ["real shell after noembed", page(`<noembed>${MARKERS}</noembed>${MARKERS}`)],
  ["real shell after noframes", page(`<noframes>${MARKERS}</noframes>${MARKERS}`)],
]) {
  test("R0.4 retains visible shell outside raw-text/fallback: " + name, async () => {
    assert.equal(await ready(html), true);
  });
}

test("R0.4 recovers after inert fallback placeholder is replaced by visible shell", async () => {
  assert.equal(await ready(page(`<iframe src="/old-site">${MARKERS}</iframe>`)), false);
  assert.equal(await ready(page(MARKERS)), true);
});
