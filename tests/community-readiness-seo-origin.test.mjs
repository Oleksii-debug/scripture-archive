import assert from "node:assert/strict";
import test from "node:test";
import { communityDeploymentReady } from "../lib/community-smoke.mjs";

// Source-only R0.4 regression: no deployment, email, owner mutation or D1 write.
// These checks are not proof of installed Cloudflare Sites/D1 or browser/NVDA.
const ORIGIN = "https://scripture-archive.com";
const ROBOTS = "User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: " + ORIGIN + "/sitemap.xml\n";
const SITEMAP = '<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>' + ORIGIN + '/community</loc></url></urlset>';
const SHELL = '<html><body><main id="main">Reader</main><a href="/community" data-route="community">Community</a></body></html>';

async function probe(robots = ROBOTS, sitemap = SITEMAP) {
  const methods = [];
  const ready = await communityDeploymentReady(ORIGIN, async (url, options) => {
    methods.push(options.method || "GET");
    const path = new URL(url).pathname;
    if (path === "/api/community") return Response.json(
      { summary: { registered: 0, online: 0 } }, { headers: { "Cache-Control": "no-store" } });
    if (path === "/api/account") return Response.json(
      { user: null }, { headers: { "Cache-Control": "no-store" } });
    if (path === "/community") return new Response(SHELL, { headers: { "Content-Type": "text/html" } });
    if (path === "/robots.txt") return new Response(robots, { headers: { "Content-Type": "text/plain" } });
    if (path === "/sitemap.xml") return new Response(sitemap, { headers: { "Content-Type": "application/xml" } });
    if (path === "/api/community/dispatch") return new Response(null, { status: 204, headers: {
      "Cache-Control": "no-store", "X-Scripture-Runner-Protocol": "github-oidc-v1",
    } });
    throw Error("Unexpected probe path: " + path);
  });
  assert.deepEqual(methods, Array(6).fill("GET"), "preflight must remain read-only");
  return ready;
}

test("R0.4 refuses robots sitemap pointing to an unrelated host", async () => {
  assert.equal(await probe(ROBOTS.replace(ORIGIN, "https://unrelated.invalid")), false);
});

test("R0.4 refuses conflicting additional sitemap directive", async () => {
  assert.equal(await probe(ROBOTS + "Sitemap: https://unrelated.invalid/sitemap.xml\n"), false);
});

test("R0.4 refuses a robots-wide crawl ban even with the correct sitemap", async () => {
  assert.equal(await probe("User-agent: *\nDisallow: /\nSitemap: " + ORIGIN + "/sitemap.xml\n"), false);
});

test("R0.4 refuses sitemap XML pointing community URLs to another origin", async () => {
  assert.equal(await probe(ROBOTS, SITEMAP.replace(ORIGIN + "/community", "https://unrelated.invalid/community")), false);
});

test("R0.4 accepts the canonical same-origin public SEO declarations", async () => {
  assert.equal(await probe(), true);
});

test("R0.4 recovers only after unsafe SEO declarations are repaired", async () => {
  assert.equal(await probe(ROBOTS.replace(ORIGIN, "https://unrelated.invalid")), false);
  assert.equal(await probe(), true);
});
