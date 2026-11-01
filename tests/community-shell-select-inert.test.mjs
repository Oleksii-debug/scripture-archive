import assert from "node:assert/strict";
import test from "node:test";
import { communityDeploymentReady } from "../lib/community-smoke.mjs";

// A <select> has special HTML tree-construction rules. Arbitrary <main> and
// <a> markup in its options is not a navigable document shell. The source-only
// readiness check must not certify it as a visible public deployment.
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
    if (path === "/robots.txt") return new Response("Sitemap: https://scripture-archive.com/sitemap.xml");
    if (path === "/sitemap.xml") return new Response("<urlset></urlset>");
    throw Error(path);
  });
  assert.deepEqual(methods, Array(6).fill("GET"), "readiness must remain read-only");
  return result;
}

for (const [name, html] of [
  ["both markers in select", page(`<select>${MARKERS}</select>`)],
  ["both markers in option", page(`<select><option>${MARKERS}</option></select>`)],
  ["uppercase select", page(`<SELECT>${MARKERS}</SELECT>`)],
  ["only main in select", page(`<select><main id="main"></main></select><a href="/community" data-route="community">Community</a>`)],
  ["only anchor in select", page(`<main id="main"></main><select><a href="/community" data-route="community">Community</a></select>`)],
]) {
  test("P0 R0.4: select content cannot certify SSR readiness: " + name, async () => {
    assert.equal(await ready(html), false);
  });
}

test("P0 R0.4: real SSR shell outside a select still qualifies", async () => {
  assert.equal(await ready(page(`<select><option>Chapter 1</option></select>${MARKERS}`)), true);
});

test("P0 R0.4: hidden select markers do not mask subsequent visible markers", async () => {
  assert.equal(await ready(page(`<select>${MARKERS}</select>${MARKERS}`)), true);
});

test("P0 R0.4: readiness recovers when select-only placeholder becomes a visible shell", async () => {
  assert.equal(await ready(page(`<select>${MARKERS}</select>`)), false);
  assert.equal(await ready(page(MARKERS)), true);
});
