import assert from "node:assert/strict";
import test from "node:test";
import { communityDeploymentReady } from "../lib/community-smoke.mjs";

// A closed <details> renders only its <summary>, not the content panel.
// This is a source-level release preflight, NOT browser or NVDA acceptance.
const ORIGIN = "https://scripture-archive.com";
const MARKERS = '<main id="main"></main><a href="/community" data-route="community">Community</a>';
const page = body => `<!doctype html><html><body>${body}</body></html>`;

async function ready(html) {
  const methods = [];
  const result = await communityDeploymentReady(ORIGIN, async (url, options) => {
    methods.push(options.method || "GET");
    const path = new URL(url).pathname;
    if (path === "/community")
      return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    if (path === "/api/community")
      return Response.json({ summary: { registered: 1, online: 0 } },
        { headers: { "Cache-Control": "no-store" } });
    if (path === "/api/account")
      return Response.json({ user: null }, { headers: { "Cache-Control": "no-store" } });
    if (path === "/api/community/dispatch")
      return new Response(null, { status: 204, headers: {
        "Cache-Control": "no-store", "X-Scripture-Runner-Protocol": "github-oidc-v1",
      } });
    if (path === "/robots.txt")
      return new Response("Sitemap: https://scripture-archive.com/sitemap.xml");
    if (path === "/sitemap.xml")
      return new Response("<urlset></urlset>");
    throw Error("Unexpected read-only preflight path: " + path);
  });
  assert.deepEqual(methods, Array(6).fill("GET"), "preflight must not write or dispatch");
  return result;
}

for (const [name, html] of [
  ["closed details with both markers", page(`<details><summary>Maintenance</summary>${MARKERS}</details>`)],
  ["closed details with data-open lookalike", page(`<details data-open="true"><summary>Maintenance</summary>${MARKERS}</details>`)],
  ["closed details with aria-expanded lookalike", page(`<details aria-expanded="true"><summary>Maintenance</summary>${MARKERS}</details>`)],
  ["uppercase closed details", page(`<DETAILS><SUMMARY>Maintenance</SUMMARY>${MARKERS}</DETAILS>`)],
  ["visible main, closed-details community anchor", page(`<main id="main"></main><details><summary>Maintenance</summary><a href="/community" data-route="community">Community</a></details>`)],
  ["visible community anchor, closed-details main", page(`<a href="/community" data-route="community">Community</a><details><summary>Maintenance</summary><main id="main"></main></details>`)],
  ["closed details nested in visible section", page(`<section><details><summary>Maintenance</summary><div>${MARKERS}</div></details></section>`)],
  ["closed details inside open details", page(`<details open><summary>Outer</summary><details><summary>Inner</summary>${MARKERS}</details></details>`)],
])
  test("R0.4 refuses hidden closed-details panel: " + name, async () => {
    assert.equal(await ready(html), false);
  });

for (const [name, html] of [
  ["ordinary visible SSR shell", page(MARKERS)],
  ["open details", page(`<details open><summary>Ready</summary>${MARKERS}</details>`)],
  ["empty boolean open attribute", page(`<details open=""><summary>Ready</summary>${MARKERS}</details>`)],
  ["HTML boolean open=false is present", page(`<details open="false"><summary>Ready</summary>${MARKERS}</details>`)],
  ["visible shell after closed details", page(`<details><summary>Maintenance</summary>${MARKERS}</details>${MARKERS}`)],
])
  test("R0.4 preserves visible details/control: " + name, async () => {
    assert.equal(await ready(html), true);
  });

test("R0.4 recovers on a fresh visible shell after closed-details placeholder", async () => {
  assert.equal(await ready(page(`<details><summary>Maintenance</summary>${MARKERS}</details>`)), false);
  assert.equal(await ready(page(MARKERS)), true);
});
