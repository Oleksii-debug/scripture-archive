import assert from "node:assert/strict";
import test from "node:test";
import { communityDeploymentReady } from "../lib/community-smoke.mjs";

// R0.4 source-only release gate. No deployed site, production D1 or mail calls.
const ORIGIN = "https://scripture-archive.com";
const ROBOTS = `User-agent: *\nAllow: /\nSitemap: ${ORIGIN}/sitemap.xml\n`;
const SHELL = '<html><body><main id="main"></main><a href="/community" data-route="community">Community</a></body></html>';
const CANONICAL = `<?xml version="1.0"?><urlset><url><loc>${ORIGIN}/community</loc></url></urlset>`;

async function probe(sitemap) {
  const methods = [];
  const result = await communityDeploymentReady(ORIGIN, async (url, options) => {
    methods.push(options.method ?? "GET");
    assert.equal(options.redirect, "manual");
    switch (new URL(url).pathname) {
      case "/api/community":
        return Response.json({ summary: { registered: 0, online: 0 } },
          { headers: { "Cache-Control": "no-store" } });
      case "/api/account":
        return Response.json({ user: null }, { headers: { "Cache-Control": "no-store" } });
      case "/community":
        return new Response(SHELL, { headers: { "Content-Type": "text/html" } });
      case "/robots.txt":
        return new Response(ROBOTS, { headers: { "Content-Type": "text/plain" } });
      case "/sitemap.xml":
        return new Response(sitemap, { headers: { "Content-Type": "application/xml" } });
      case "/api/community/dispatch":
        return new Response(null, { status: 204, headers: {
          "Cache-Control": "no-store", "X-Scripture-Runner-Protocol": "github-oidc-v1",
        } });
      default:
        throw new Error("unexpected release probe");
    }
  });
  assert.deepEqual(methods, Array(6).fill("GET"));
  return result;
}

test("R0.4 rejects foreign sitemap URLs hidden by legal XML loc tag whitespace", async () => {
  for (const sitemap of [
    '<urlset><url><loc >https://other.invalid/community</loc></url></urlset>',
    '<urlset><url><loc>https://other.invalid/community</loc ></url></urlset>',
    '<urlset><url><loc xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">https://other.invalid/community</loc></url></urlset>',
  ]) assert.equal(await probe(sitemap), false, sitemap);
});

test("R0.4 rejects a cross-origin sitemap loc hidden in XML CDATA", async () => {
  assert.equal(await probe('<urlset><url><loc><![CDATA[https://other.invalid/community]]></loc></url></urlset>'), false);
});

test("R0.4 retains canonical same-origin sitemap and legacy empty fixture", async () => {
  for (const sitemap of [CANONICAL, "<urlset></urlset>", "<urlset/>"]) {
    assert.equal(await probe(sitemap), true, sitemap);
  }
});

test("R0.4 recovers only after malformed loc declarations are replaced", async () => {
  assert.equal(await probe('<urlset><url><loc >https://other.invalid/community</loc></url></urlset>'), false);
  assert.equal(await probe(CANONICAL), true);
});
