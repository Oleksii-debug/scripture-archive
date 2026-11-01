import assert from "node:assert/strict";
import test from "node:test";
import { communityDeploymentReady } from "../lib/community-smoke.mjs";

const ORIGIN = "https://scripture-archive.com";
const MARKER = '<main id="main"></main><a href="/community" data-route="community">Community</a>';
const shell = attributes =>
  `<html><body><section ${attributes}>${MARKER}</section></body></html>`;

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
    if (path === "/sitemap.xml") return new Response("<urlset></urlset>");
    throw Error("Unexpected release probe: " + path);
  });
  assert.deepEqual(methods, Array(6).fill("GET"), "preflight must never POST");
  return result;
}

const hidden = [
  ["CSS comment inside value", 'style="display:/**/none"'],
  ["CSS comment inside property", 'style="dis/**/play:none"'],
  ["CSS comment in visibility", 'style="visibility:/*comment*/hidden"'],
  ["CSS escaped value", 'style="display:\\6e one"'],
  ["CSS escaped property", 'style="di\\73play:none"'],
  ["HTML decimal entity in CSS value", 'style="display:&#110;one"'],
  ["HTML hexadecimal entity in CSS value", 'style="display:&#x6e;one"'],
  ["HTML entity in CSS property", 'style="displ&#97;y:none"'],
  ["HTML decimal entity in ARIA value", 'aria-hidden="tr&#117;e"'],
  ["HTML hexadecimal entity in ARIA value", 'aria-hidden="tr&#x75;e"'],
];
for (const [name, attributes] of hidden) {
  test("R0.4 refuses encoded hidden SSR ancestor: " + name, async () => {
    assert.equal(await ready(shell(attributes)), false);
  });
  test("R0.4 refuses encoded hidden SSR direct main: " + name, async () => {
    assert.equal(await ready(`<html><body><main id="main" ${attributes}></main><a href="/community" data-route="community">Community</a></body></html>`), false);
  });
  test("R0.4 refuses encoded hidden SSR direct link: " + name, async () => {
    assert.equal(await ready(`<html><body><main id="main"></main><a href="/community" data-route="community" ${attributes}>Community</a></body></html>`), false);
  });
}

for (const attributes of [
  'style="display:block"', 'style="color:blue"', 'aria-hidden="false"',
  'data-aria-hidden="true"', 'data-style="display:none"',
]) {
  test("R0.4 retains clearly visible SSR: " + attributes, async () => {
    assert.equal(await ready(shell(attributes)), true);
  });
}

test("R0.4 recovers after hidden encoded shell without caching a false verdict", async () => {
  assert.equal(await ready(shell('style="display:&#110;one"')), false);
  assert.equal(await ready(shell('aria-hidden="tr&#117;e"')), false);
  assert.equal(await ready(shell('style="display:block"')), true);
});

test("R0.4 ignores hidden branch but accepts a separate genuinely visible branch", async () => {
  const html = `<html><body><section style="display:/**/none">${MARKER}</section>${MARKER}</body></html>`;
  assert.equal(await ready(html), true);
});
