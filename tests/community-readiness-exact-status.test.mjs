import assert from "node:assert/strict";
import test from "node:test";
import { communityDeploymentReady } from "../lib/community-smoke.mjs";

// The six-route preflight must not mistake 201/202/206 bodies for the
// complete, currently deployed 200 resource. These are disposable Responses;
// there are no production requests or scheduler POSTs.
const ORIGIN = "https://scripture-archive.com";
const HTML = '<html><body><a href="/community" data-route="community">Community</a><main id="main"></main></body></html>';
const bodyPaths = [
  "/api/community",
  "/community",
  "/api/account",
  "/robots.txt",
  "/sitemap.xml",
];

function responseFor(path, status = 200) {
  if (path === "/api/community/dispatch")
    return new Response(null, { status: 204, headers: {
      "Cache-Control": "no-store",
      "X-Scripture-Runner-Protocol": "github-oidc-v1",
    } });
  if (path === "/api/community")
    return new Response(JSON.stringify({ summary: { registered: 1, online: 0 } }), {
      status, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" },
    });
  if (path === "/api/account")
    return new Response('{"user":null}', {
      status, headers: { "Cache-Control": "private, no-store", "Content-Type": "application/json" },
    });
  if (path === "/community")
    return new Response(HTML, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
  if (path === "/robots.txt")
    return new Response("User-agent: *\nSitemap: https://scripture-archive.com/sitemap.xml", { status });
  if (path === "/sitemap.xml")
    return new Response('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>', { status });
  throw Error("Unexpected probe: " + path);
}

test("P0 R0.4: partial, created or accepted responses cannot certify six-route readiness", async () => {
  for (const path of bodyPaths) {
    for (const status of [201, 202, 206]) {
      const methods = [];
      const ready = await communityDeploymentReady(ORIGIN, async (url, options) => {
        methods.push(options.method ?? "GET");
        const pathname = new URL(url).pathname;
        return responseFor(pathname, pathname === path ? status : 200);
      });
      assert.equal(ready, false, path + " status " + status + " is not a complete 200 response");
      assert.deepEqual(methods, Array(6).fill("GET"), "preflight must stay read-only");
    }
  }
});

test("P0 R0.4: clean 200 responses recover after a partial-content preflight", async () => {
  let partial = true;
  const methods = [];
  const fetcher = async (url, options) => {
    methods.push(options.method ?? "GET");
    const path = new URL(url).pathname;
    return responseFor(path, partial && path === "/community" ? 206 : 200);
  };
  assert.equal(await communityDeploymentReady(ORIGIN, fetcher), false);
  partial = false;
  assert.equal(await communityDeploymentReady(ORIGIN, fetcher), true);
  assert.deepEqual(methods, Array(12).fill("GET"));
});
