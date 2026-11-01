import assert from "node:assert/strict";
import test from "node:test";
import { communityDeploymentReady } from "../lib/community-smoke.mjs";

// Closed HTML dialog descendants are not in the rendered/keyboard-accessible
// document. This source-level preflight is not a real browser/NVDA check.
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
    throw Error("Unexpected preflight route " + path);
  });
  assert.deepEqual(methods, Array(6).fill("GET"), "release preflight must stay read-only");
  return result;
}

for (const [name, html] of [
  ["closed dialog with both markers", page(`<dialog>${MARKERS}</dialog>Maintenance`)],
  ["closed dialog with data-open lookalike", page(`<dialog data-open="true">${MARKERS}</dialog>`)],
  ["closed dialog with aria-modal lookalike", page(`<dialog aria-modal="true">${MARKERS}</dialog>`)],
  ["uppercase closed dialog", page(`<DIALOG>${MARKERS}</DIALOG>`)],
  ["open on a descendant does not open dialog", page(`<dialog><section open>${MARKERS}</section></dialog>`)],
  ["main visible but community link in closed dialog", page(`<main id="main"></main><dialog><a href="/community" data-route="community">Community</a></dialog>`)],
  ["community link visible but main in closed dialog", page(`<a href="/community" data-route="community">Community</a><dialog><main id="main"></main></dialog>`)],
  ["nested closed dialog in visible container", page(`<section><dialog><div>${MARKERS}</div></dialog></section>`)],
])
  test("R0.4 refuses closed-dialog shell: " + name, async () => {
    assert.equal(await ready(html), false);
  });

for (const [name, html] of [
  ["ordinary visible SSR shell", page(MARKERS)],
  ["dialog with open attribute", page(`<dialog open>${MARKERS}</dialog>`)],
  ["dialog with empty open attribute", page(`<dialog open="">${MARKERS}</dialog>`)],
  ["HTML boolean open=false is still present", page(`<dialog open="false">${MARKERS}</dialog>`)],
  ["visible shell after closed dialog", page(`<dialog>${MARKERS}</dialog>${MARKERS}`)],
])
  test("R0.4 retains visible dialog/control: " + name, async () => {
    assert.equal(await ready(html), true);
  });

test("R0.4 recovers on a fresh visible page after a closed-dialog placeholder", async () => {
  assert.equal(await ready(page(`<dialog>${MARKERS}</dialog>`)), false);
  assert.equal(await ready(page(MARKERS)), true);
});
