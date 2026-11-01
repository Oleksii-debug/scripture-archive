import assert from "node:assert/strict";
import test from "node:test";
import { communityDeploymentReady } from "../lib/community-smoke.mjs";

// Read-only source-level release probe; not browser, production D1 or NVDA acceptance.
const ORIGIN = "https://scripture-archive.com";
const MAIN = '<main id="main">Reader</main>';
const LINK = '<a href="/community" data-route="community">Community</a>';
const page = body => `<!doctype html><html><body>${body}</body></html>`;

async function ready(html) {
  const methods = [];
  const response = await communityDeploymentReady(ORIGIN, async (url, options) => {
    methods.push(options.method ?? "GET");
    const path = new URL(url).pathname;
    if (path === "/community")
      return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    if (path === "/api/community")
      return Response.json({ summary: { registered: 1, online: 0 } }, { headers: { "Cache-Control": "no-store" } });
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
    throw new Error("Unexpected preflight path " + path);
  });
  assert.deepEqual(methods, Array(6).fill("GET"));
  return response;
}

for (const [name, markup] of [
  ["main content-visibility hidden", '<main id="main" style="content-visibility:hidden">Reader</main>' + LINK],
  ["link content-visibility hidden", MAIN + '<a href="/community" data-route="community" style="content-visibility: hidden">Community</a>'],
  ["ancestor content-visibility hidden", '<section style="content-visibility: hidden">' + MAIN + LINK + '</section>'],
  ["ancestor visibility collapse", '<div style="visibility:collapse">' + MAIN + LINK + '</div>'],
  ["main visibility collapse", '<main id="main" style="visibility: collapse">Reader</main>' + LINK],
  ["link opacity zero", MAIN + '<a href="/community" data-route="community" style="opacity:0">Community</a>'],
  ["ancestor opacity zero", '<div style="opacity: 0.00">' + MAIN + LINK + '</div>'],
  ["main opacity zero important", '<main id="main" style="opacity:0!important">Reader</main>' + LINK],
]) {
  test("R0.4 refuses visually hidden inline-CSS shell: " + name, async () => {
    assert.equal(await ready(page(markup)), false);
  });
}

for (const [name, markup] of [
  ["ordinary shell", MAIN + LINK],
  ["visible content-visibility", '<div style="content-visibility:visible">' + MAIN + LINK + '</div>'],
  ["auto content-visibility", '<div style="content-visibility:auto">' + MAIN + LINK + '</div>'],
  ["visible visibility", '<div style="visibility:visible">' + MAIN + LINK + '</div>'],
  ["fully opaque", '<div style="opacity:1">' + MAIN + LINK + '</div>'],
]) {
  test("R0.4 retains visible inline-CSS shell: " + name, async () => {
    assert.equal(await ready(page(markup)), true);
  });
}

test("R0.4 recovery after hidden inline-CSS placeholder is replaced", async () => {
  assert.equal(await ready(page('<div style="content-visibility:hidden">' + MAIN + LINK + '</div>')), false);
  assert.equal(await ready(page(MAIN + LINK)), true);
});
