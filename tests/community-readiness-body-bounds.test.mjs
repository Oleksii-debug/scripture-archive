import assert from "node:assert/strict";
import test from "node:test";
import { communityDeploymentReady } from "../lib/community-smoke.mjs";

const ORIGIN = "https://scripture-archive.com";
const HTML = '<html><body><main id="main"></main><a href="/community" data-route="community">Community</a></body></html>';
const PAD = " ".repeat(2 * 1024 * 1024 + 1);

function healthy(url, options) {
  assert.equal(options.method || "GET", "GET");
  assert.equal(options.redirect, "manual");
  const path = new URL(url).pathname;
  if (path === "/community") return new Response(HTML, { headers: { "Content-Type": "text/html" } });
  if (path === "/api/community") return Response.json({ summary: { registered: 1, online: 0 } }, { headers: { "Cache-Control": "no-store" } });
  if (path === "/api/account") return Response.json({ user: null }, { headers: { "Cache-Control": "no-store" } });
  if (path === "/api/community/dispatch") return new Response(null, { status: 204, headers: {
    "Cache-Control": "no-store", "X-Scripture-Runner-Protocol": "github-oidc-v1",
  } });
  if (path === "/robots.txt") return new Response("Sitemap: https://scripture-archive.com/sitemap.xml");
  if (path === "/sitemap.xml") return new Response("<urlset></urlset>");
  throw Error(path);
}
const override = (path, factory) => async (url, options) =>
  new URL(url).pathname === path ? factory() : healthy(url, options);

for (const [path, make] of [
  ["/api/community", () => new Response('{"summary":{"registered":1,"online":0}}' + PAD,
    { headers: { "Cache-Control": "no-store" } })],
  ["/api/account", () => new Response('{"user":null}' + PAD,
    { headers: { "Cache-Control": "no-store" } })],
  ["/robots.txt", () => new Response("Sitemap: https://scripture-archive.com/sitemap.xml" + PAD)],
  ["/sitemap.xml", () => new Response("<urlset></urlset>" + PAD)],
]) {
  test("P0 R0.4: oversized successful " + path + " cannot qualify activation", async () => {
    assert.equal(await communityDeploymentReady(ORIGIN, override(path, make)), false);
  });
}

for (const path of ["/robots.txt", "/sitemap.xml"]) {
  test("P0 R0.4: invalid UTF-8 in " + path + " cannot qualify activation", async () => {
    const prefix = path === "/robots.txt" ? "Sitemap: https://scripture-archive.com/sitemap.xml" : "<urlset></urlset>";
    const bytes = new Uint8Array([...new TextEncoder().encode(prefix), 0xc3, 0x28]);
    assert.equal(await communityDeploymentReady(ORIGIN,
      override(path, () => new Response(bytes))), false);
  });
}

test("P0 R0.4: oversized streaming response is cancelled without activation", async () => {
  let cancelled = 0;
  const stream = () => new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('{"user":null}'));
      controller.enqueue(new TextEncoder().encode(PAD));
    },
    cancel() { cancelled++; },
  });
  assert.equal(await communityDeploymentReady(ORIGIN, override("/api/account", () =>
    new Response(stream(), { headers: { "Cache-Control": "no-store" } }))), false);
  assert.equal(cancelled, 1);
});

test("P0 R0.4: clean six-route GET-only preflight recovers after denied oversized response", async () => {
  let oversized = true;
  const methods = [];
  const fetcher = async (url, options) => {
    methods.push(options.method || "GET");
    if (oversized && new URL(url).pathname === "/api/account")
      return new Response('{"user":null}' + PAD, { headers: { "Cache-Control": "no-store" } });
    return healthy(url, options);
  };
  assert.equal(await communityDeploymentReady(ORIGIN, fetcher), false);
  oversized = false;
  assert.equal(await communityDeploymentReady(ORIGIN, fetcher), true);
  assert.deepEqual(methods, Array(12).fill("GET"));
});
