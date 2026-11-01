import assert from "node:assert/strict";
import test from "node:test";
import { communityDeploymentReady } from "../lib/community-smoke.mjs";

// An HTML <template> is inert, including nested templates. The preflight must
// not confuse markup after an INNER </template> with visible outer-page markup.
const ORIGIN = "https://scripture-archive.com";
const MARKERS = '<main id="main"></main><a href="/community" data-route="community">Community</a>';
const shell = inner => `<html><body>${inner}</body></html>`;

function mockResponse(url, html) {
  const path = new URL(url).pathname;
  if (path === "/api/community")
    return Response.json({ summary: { registered: 1, online: 0 } },
      { headers: { "Cache-Control": "no-store" } });
  if (path === "/api/account")
    return Response.json({ user: null }, { headers: { "Cache-Control": "no-store, private" } });
  if (path === "/api/community/dispatch")
    return new Response(null, { status: 204, headers: {
      "Cache-Control": "no-store",
      "X-Scripture-Runner-Protocol": "github-oidc-v1",
    } });
  if (path === "/robots.txt")
    return new Response("User-agent: *\nSitemap: https://scripture-archive.com/sitemap.xml");
  if (path === "/sitemap.xml")
    return new Response('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
  if (path === "/community")
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  throw Error("Unexpected read-only preflight URL: " + url);
}

async function ready(html, methods = []) {
  return communityDeploymentReady(ORIGIN, async (url, options) => {
    methods.push(options.method || "GET");
    return mockResponse(url, html);
  });
}

test("R0.4: nested inert templates cannot certify a community shell", async () => {
  const invalid = [
    shell(`<template><template>inner</template>${MARKERS}</template>Maintenance`),
    shell(`<TEMPLATE><TEMPLATE></TEMPLATE>${MARKERS}</TEMPLATE>Maintenance`),
    shell(`<template><template><template></template></template>${MARKERS}</template>Maintenance`),
    shell(`<template><template></template><main id="main"></main></template><a href="/community" data-route="community">Community</a>`),
    shell(`<template><template></template><a href="/community" data-route="community">Community</a></template><main id="main"></main>`),
  ];
  for (const html of invalid) {
    const methods = [];
    assert.equal(await ready(html, methods), false, "inert outer template is not navigable");
    assert.deepEqual(methods, Array(6).fill("GET"), "preflight must never POST or mutate");
  }
});

test("R0.4: actual visible markup after the OUTER template remains accepted", async () => {
  const valid = [
    shell(`<template><template></template>${MARKERS}</template>${MARKERS}`),
    shell(`${MARKERS}<template><template></template>${MARKERS}</template>`),
    shell(MARKERS),
  ];
  for (const html of valid) {
    const methods = [];
    assert.equal(await ready(html, methods), true);
    assert.deepEqual(methods, Array(6).fill("GET"));
  }
});

test("R0.4: fresh visible shell recovers after nested-template placeholder", async () => {
  let html = shell(`<template><template></template>${MARKERS}</template>Maintenance`);
  const methods = [];
  const fetcher = async (url, options) => {
    methods.push(options.method || "GET");
    return mockResponse(url, html);
  };
  assert.equal(await communityDeploymentReady(ORIGIN, fetcher), false);
  html = shell(MARKERS);
  assert.equal(await communityDeploymentReady(ORIGIN, fetcher), true);
  assert.deepEqual(methods, Array(12).fill("GET"));
});
