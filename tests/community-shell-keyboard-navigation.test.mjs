import assert from "node:assert/strict";
import test from "node:test";
import { communityDeploymentReady } from "../lib/community-smoke.mjs";

// Source-level, read-only R0.4 preflight. Not a browser, NVDA or production gate.
const ORIGIN = "https://scripture-archive.com";
const MAIN = '<main id="main">Reader</main>';
const anchor = attributes => `<a href="/community" data-route="community" ${attributes}>Community</a>`;
const page = attributes => `<!doctype html><html><body>${MAIN}${anchor(attributes)}</body></html>`;

async function ready(html) {
  const methods = [];
  const result = await communityDeploymentReady(ORIGIN, async (url, options) => {
    methods.push(options.method ?? "GET");
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
  assert.deepEqual(methods, Array(6).fill("GET"), "readiness must not dispatch or mutate");
  return result;
}

for (const [name, attributes] of [
  ["negative tabindex removes the only community link from sequential Tab navigation", 'tabindex="-1"'],
  ["unquoted negative tabindex", "tabindex=-2"],
  ["download attribute converts same-origin community navigation to a download", "download"],
  ["named download attribute", 'download="community.html"'],
  ["uppercase download boolean attribute", "DOWNLOAD"],
]) {
  test("R0.4 rejects non-navigable SSR community link: " + name, async () => {
    assert.equal(await ready(page(attributes)), false);
  });
}

for (const [name, attributes] of [
  ["ordinary keyboard-focusable link", ""],
  ["explicit tab stop zero", 'tabindex="0"'],
  ["positive tab stop", 'tabindex="2"'],
]) {
  test("R0.4 preserves genuine SSR community navigation: " + name, async () => {
    assert.equal(await ready(page(attributes)), true);
  });
}

test("R0.4 recovers only after a non-navigable link is replaced", async () => {
  assert.equal(await ready(page('download tabindex="-1"')), false);
  assert.equal(await ready(page('tabindex="0"')), true);
});
