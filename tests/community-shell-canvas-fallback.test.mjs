import assert from "node:assert/strict";
import test from "node:test";
import { communityDeploymentReady } from "../lib/community-smoke.mjs";

// Source-only six-GET release preflight, not deployed Cloudflare/browser/NVDA evidence.
// In browsers supporting canvas, its children are fallback-only: they cannot
// certify a visible main landmark or keyboard-accessible community navigation.
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
  ["canvas-only markers", page(`<canvas>${MARKERS}</canvas>`)],
  ["uppercase canvas-only markers", page(`<CANVAS>${MARKERS}</CANVAS>`)],
  ["main in canvas, link visible", page(`<canvas><main id="main"></main></canvas><a href="/community" data-route="community">Community</a>`)],
  ["link in canvas, main visible", page(`<main id="main"></main><canvas><a href="/community" data-route="community">Community</a></canvas>`)],
  ["nested canvas fallback", page(`<section><canvas><div>${MARKERS}</div></canvas></section>`)],
  ["nested canvas closing does not expose outer fallback", page(`<canvas><canvas>${MARKERS}</canvas>${MARKERS}</canvas>`)],
]) {
  test("P0 R0.4: canvas fallback cannot certify a visible SSR shell: " + name, async () => {
    assert.equal(await ready(html), false);
  });
}

for (const [name, html] of [
  ["ordinary visible shell", page(MARKERS)],
  ["visible shell after canvas fallback", page(`<canvas>${MARKERS}</canvas>${MARKERS}`)],
  ["visible shell before canvas fallback", page(`${MARKERS}<canvas>${MARKERS}</canvas>`)],
]) {
  test("P0 R0.4: visible shell still qualifies: " + name, async () => {
    assert.equal(await ready(html), true);
  });
}

test("P0 R0.4: fresh visible shell recovers after canvas-only placeholder", async () => {
  assert.equal(await ready(page(`<canvas>${MARKERS}</canvas>`)), false);
  assert.equal(await ready(page(MARKERS)), true);
});
