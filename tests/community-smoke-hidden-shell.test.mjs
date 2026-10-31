import assert from "node:assert/strict";
import test from "node:test";
import { communityDeploymentReady } from "../lib/community-smoke.mjs";

const ORIGIN = "https://scripture-archive.com";
const MARKERS = '<a href="/community" data-route="community">Community</a><main id="main"></main>';
const shell = inner => `<html><body>${inner}</body></html>`;

function deployed(url, html) {
  const path = new URL(url).pathname;
  if (path === "/api/community") {
    return Response.json({ summary: { registered: 1, online: 0 } },
      { headers: { "Cache-Control": "no-store" } });
  }
  if (path === "/api/community/dispatch") {
    return new Response(null, { status: 204, headers: {
      "Cache-Control": "no-store",
      "X-Scripture-Runner-Protocol": "github-oidc-v1",
    } });
  }
  if (path === "/api/account") {
    return Response.json({ user: null }, { headers: { "Cache-Control": "no-store" } });
  }
  if (path === "/robots.txt") {
    return new Response("User-agent: *\\nSitemap: https://scripture-archive.com/sitemap.xml");
  }
  if (path === "/sitemap.xml") {
    return new Response('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
  }
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

test("P0: hidden ancestors and inline CSS cannot certify a navigable community shell", async () => {
  // #1072 already tests direct hidden/inert/aria-hidden attributes on anchors.
  // These cases prove the separate descendant and CSS visibility boundary.
  const invalid = [
    shell(`<div hidden>${MARKERS}</div>`),
    shell(`<div hidden="until-found">${MARKERS}</div>`),
    shell(`<section inert>${MARKERS}</section>`),
    shell(`<section aria-hidden="true">${MARKERS}</section>`),
    shell(`<div style="display:none">${MARKERS}</div>`),
    shell(`<div style="visibility:hidden">${MARKERS}</div>`),
    shell('<main id="main" style="display:none"></main><a href="/community" data-route="community">Community</a>'),
    shell('<div style="visibility:hidden"><a href="/community" data-route="community">Community</a></div><main id="main"></main>'),
    shell(`<div><div inert>${MARKERS}</div></div>`),
  ];
  for (const html of invalid) {
    const methods = [];
    const ready = await communityDeploymentReady(ORIGIN, async (url, options) => {
      methods.push(options.method || "GET");
      return deployed(url, html);
    });
    assert.equal(ready, false, "hidden ancestor/CSS must fail closed");
    assert.deepEqual(methods, Array(6).fill("GET"), "preflight must remain read-only");
  }
});

test("P0: visible sibling and visible raw-script successor remain accepted", async () => {
  const valid = [
    shell(MARKERS),
    shell(`<div hidden>${MARKERS}</div>${MARKERS}`),
    shell(`<div aria-hidden="false">${MARKERS}</div>`),
    shell(`<div data-hidden="true">${MARKERS}</div>`),
    shell(`<script hidden>const text = "not a shell";</script>${MARKERS}`),
  ];
  for (const html of valid) {
    assert.equal(await communityDeploymentReady(ORIGIN, async url => deployed(url, html)), true);
  }
});

test("P0: a hidden placeholder recovers only after a fresh visible shell", async () => {
  let hidden = true;
  const methods = [];
  const fetcher = async (url, options) => {
    methods.push(options.method || "GET");
    return deployed(url, shell(hidden ? `<div hidden>${MARKERS}</div>` : MARKERS));
  };
  assert.equal(await communityDeploymentReady(ORIGIN, fetcher), false);
  hidden = false;
  assert.equal(await communityDeploymentReady(ORIGIN, fetcher), true);
  assert.deepEqual(methods, Array(12).fill("GET"));
});
