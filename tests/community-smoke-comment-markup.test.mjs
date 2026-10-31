import assert from "node:assert/strict";
import test from "node:test";
import { communityDeploymentReady } from "../lib/community-smoke.mjs";

const ORIGIN = "https://scripture-archive.com";
const ANCHORS = '<a href="/community" data-route="community">Community</a><main id="main"></main>';
const ACTUAL_SHELL = '<html><body>' + ANCHORS + '</body></html>';

function otherRoutes(url) {
  const path = new URL(url).pathname;
  if (path === "/api/community")
    return Response.json({ summary: { registered: 0, online: 0 } }, { headers: { "Cache-Control": "no-store" } });
  if (path === "/api/account")
    return Response.json({ user: null }, { headers: { "Cache-Control": "no-store, private" } });
  if (path === "/api/community/dispatch")
    return new Response(null, { status: 204, headers: {
      "Cache-Control": "no-store",
      "X-Scripture-Runner-Protocol": "github-oidc-v1",
    } });
  if (path === "/robots.txt")
    return new Response("User-agent: *\\nSitemap: https://scripture-archive.com/sitemap.xml");
  if (path === "/sitemap.xml")
    return new Response('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
  throw Error("unexpected mocked URL " + url);
}

function probeWithHtml(html, onMethod = () => {}) {
  return communityDeploymentReady(ORIGIN, async (url, options) => {
    onMethod(options.method || "GET");
    return new URL(url).pathname === "/community"
      ? new Response(html, { headers: { "Content-Type": "text/html; charset=UTF-8" } })
      : otherRoutes(url);
  });
}

test("R0.4: comment-only route/landmark markup is not a deployed community shell", async () => {
  const inert = '<html><body>Maintenance<!-- ' + ANCHORS + ' --></body></html>';
  const methods = [];
  assert.equal(await probeWithHtml(inert, method => methods.push(method)), false);
  assert.deepEqual(methods, Array(6).fill("GET"), "preflight never activates a scheduler");
});

test("R0.4: unclosed HTML comment cannot fabricate a complete page", async () => {
  const inert = '<html><body>Temporary maintenance<!-- ' + ANCHORS + '</body></html>';
  assert.equal(await probeWithHtml(inert), false);
});

test("R0.4: real anchors outside comments remain valid and recover after maintenance", async () => {
  assert.equal(await probeWithHtml('<html><body><!-- historical ' + ANCHORS + ' --></body></html>'), false);
  assert.equal(await probeWithHtml('<html><body><!-- banner -->' + ANCHORS + '</body></html>'), true);
  assert.equal(await probeWithHtml(ACTUAL_SHELL), true);
});
