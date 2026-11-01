import assert from "node:assert/strict";
import test from "node:test";
import { communityDeploymentReady } from "../lib/community-smoke.mjs";

// R0.4 source-only readiness: an HTTP 200 with JSON-looking bytes served as
// HTML/plain text is not the canonical public API. No live traffic or writes.
const ORIGIN = "https://scripture-archive.com";
const SHELL = '<html><body><main id="main"></main><a href="/community" data-route="community">Community</a></body></html>';
const BODIES = {
  "/api/community": '{"summary":{"registered":0,"online":0}}',
  "/api/account": '{"user":null}',
};

function apiResponse(path, contentType) {
  const headers = { "Cache-Control": "no-store" };
  if (contentType !== null) headers["Content-Type"] = contentType;
  return new Response(BODIES[path], { headers });
}

async function probe(target, contentType, seen = []) {
  const result = await communityDeploymentReady(ORIGIN, async (url, options) => {
    seen.push(options.method ?? "GET");
    assert.equal(options.redirect, "manual");
    const path = new URL(url).pathname;
    if (path === "/api/community" || path === "/api/account")
      return path === target ? apiResponse(path, contentType) :
        Response.json(JSON.parse(BODIES[path]), { headers: { "Cache-Control": "no-store" } });
    if (path === "/community")
      return new Response(SHELL, { headers: { "Content-Type": "text/html" } });
    if (path === "/robots.txt")
      return new Response("User-agent: *\\nSitemap: " + ORIGIN + "/sitemap.xml");
    if (path === "/sitemap.xml")
      return new Response("<urlset></urlset>");
    if (path === "/api/community/dispatch")
      return new Response(null, { status: 204, headers: {
        "Cache-Control": "no-store", "X-Scripture-Runner-Protocol": "github-oidc-v1",
      } });
    throw Error("Unexpected release probe: " + path);
  });
  assert.deepEqual(seen.slice(-6), Array(6).fill("GET"), "release preflight must remain read-only");
  return result;
}

for (const target of ["/api/community", "/api/account"]) {
  test("P0 R0.4 refuses JSON-looking " + target + " served as a non-JSON media type", async () => {
    for (const contentType of [null, "text/html", "text/plain", "application/problem+json",
      "application/jsonx", "application/octet-stream"]) {
      assert.equal(await probe(target, contentType), false,
        target + " with " + String(contentType) + " must not qualify release");
    }
  });

  test("P0 R0.4 accepts canonical JSON media type with optional charset for " + target, async () => {
    for (const contentType of ["application/json", "application/json; charset=utf-8",
      "APPLICATION/JSON; Charset=UTF-8"]) {
      assert.equal(await probe(target, contentType), true, contentType);
    }
  });

  test("P0 R0.4 recovers only after a fresh canonical JSON response for " + target, async () => {
    const seen = [];
    assert.equal(await probe(target, "text/html", seen), false);
    assert.equal(await probe(target, "application/json", seen), true);
    assert.deepEqual(seen, Array(12).fill("GET"));
  });
}
