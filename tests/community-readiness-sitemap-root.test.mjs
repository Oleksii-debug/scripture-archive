import assert from "node:assert/strict";
import test from "node:test";
import { communityDeploymentReady } from "../lib/community-smoke.mjs";

// Source-only R0.4 release preflight: an HTTP 200 containing the substring
// "<urlset" is not necessarily a complete XML sitemap. No production calls.
const ORIGIN = "https://scripture-archive.com";
const ROBOTS = "User-agent: *\nSitemap: " + ORIGIN + "/sitemap.xml\n";
const SHELL = '<html><body><main id="main"></main><a href="/community" data-route="community">Community</a></body></html>';
const VALID = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>' + ORIGIN + '/community</loc></url></urlset>';

async function probe(sitemap, seen = []) {
  return communityDeploymentReady(ORIGIN, async (url, options) => {
    seen.push(options.method ?? "GET");
    assert.equal(options.redirect, "manual");
    switch (new URL(url).pathname) {
      case "/api/community":
        return Response.json({summary:{registered:0,online:0}}, {headers:{"Cache-Control":"no-store"}});
      case "/community":
        return new Response(SHELL, {headers:{"Content-Type":"text/html"}});
      case "/api/account":
        return Response.json({user:null}, {headers:{"Cache-Control":"no-store"}});
      case "/robots.txt":
        return new Response(ROBOTS);
      case "/sitemap.xml":
        return new Response(sitemap, {headers:{"Content-Type":"application/xml"}});
      case "/api/community/dispatch":
        return new Response(null, {status:204, headers:{"Cache-Control":"no-store","X-Scripture-Runner-Protocol":"github-oidc-v1"}});
      default: throw new Error("Unexpected preflight route");
    }
  });
}

test("P0 R0.4 rejects non-XML and comment-only sitemap marker placeholders", async () => {
  for (const invalid of [
    "maintenance: <urlset></urlset>",
    "<!-- <urlset></urlset> -->",
    "<html><body><urlset></urlset></body></html>",
    "<urlsetFake></urlsetFake>",
  ]) {
    const seen = [];
    assert.equal(await probe(invalid, seen), false, invalid);
    assert.deepEqual(seen, Array(6).fill("GET"));
  }
});

test("P0 R0.4 rejects incomplete and trailing-payload sitemap documents", async () => {
  for (const invalid of [
    "<urlset>",
    '<urlset><url><loc>' + ORIGIN + '/community</loc></url>',
    "<urlset></urlset> maintenance",
    "<urlset></urlset><html>unexpected</html>",
  ]) {
    const seen = [];
    assert.equal(await probe(invalid, seen), false, invalid);
    assert.deepEqual(seen, Array(6).fill("GET"));
  }
});

test("P0 R0.4 accepts a complete canonical XML sitemap and legacy empty fixture", async () => {
  for (const valid of [VALID, "<urlset></urlset>", "<urlset/>"]) {
    const seen = [];
    assert.equal(await probe(valid, seen), true, valid);
    assert.deepEqual(seen, Array(6).fill("GET"));
  }
});

test("P0 R0.4 only recovers after a fresh complete sitemap response", async () => {
  const seen = [];
  assert.equal(await probe("<!-- <urlset></urlset> -->", seen), false);
  assert.equal(await probe(VALID, seen), true);
  assert.deepEqual(seen, Array(12).fill("GET"));
});
