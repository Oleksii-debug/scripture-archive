import assert from "node:assert/strict";
import test from "node:test";
import { communityDeploymentReady } from "../lib/community-smoke.mjs";

// Source-only P0 R0.4: the public directory is a subset of nondeleted accounts.
// A coherent HTTP 200 with more visible profiles than registered accounts must
// not qualify the scheduled release gate. No production D1 or user writes.
const ORIGIN = "https://scripture-archive.com";
const SHELL = '<html><body><main id="main"></main><a href="/community" data-route="community">Community</a></body></html>';

function deployed(url, options, summary) {
  assert.equal(options.method ?? "GET", "GET");
  assert.equal(options.redirect, "manual");
  switch (new URL(url).pathname) {
    case "/api/community":
      return Response.json({summary}, {headers:{"Cache-Control":"no-store"}});
    case "/community":
      return new Response(SHELL, {headers:{"Content-Type":"text/html"}});
    case "/api/account":
      return Response.json({user:null}, {headers:{"Cache-Control":"no-store"}});
    case "/robots.txt":
      return new Response("User-agent: *\nSitemap: https://scripture-archive.com/sitemap.xml");
    case "/sitemap.xml":
      return new Response("<urlset></urlset>");
    case "/api/community/dispatch":
      return new Response(null, {status:204, headers:{
        "Cache-Control":"no-store", "X-Scripture-Runner-Protocol":"github-oidc-v1",
      }});
    default: throw Error("Unexpected release probe");
  }
}

async function probe(summary) {
  const methods = [];
  const ready = await communityDeploymentReady(ORIGIN, (url, options) => {
    methods.push(options.method ?? "GET");
    return deployed(url, options, summary);
  });
  assert.deepEqual(methods, Array(6).fill("GET"), "readiness is strictly read-only");
  return ready;
}

test("P0 R0.4: visible public accounts cannot exceed registered accounts", async () => {
  for (const summary of [
    {registered:0, online:0, visible:1},
    {registered:3, online:1, visible:4},
    {registered:1, online:1, visible:Number.MAX_SAFE_INTEGER},
  ]) {
    assert.equal(await probe(summary), false, JSON.stringify(summary));
  }
});

test("P0 R0.4: valid visible subset and legacy summary remain accepted", async () => {
  for (const summary of [
    {registered:0, online:0, visible:0},
    {registered:3, online:1, visible:3},
    {registered:3, online:1, visible:0},
    {registered:3, online:1},
  ]) {
    assert.equal(await probe(summary), true, JSON.stringify(summary));
  }
});

test("P0 R0.4: inconsistent summary recovers only after a fresh coherent GET", async () => {
  assert.equal(await probe({registered:1, online:0, visible:2}), false);
  assert.equal(await probe({registered:2, online:0, visible:2}), true);
});
