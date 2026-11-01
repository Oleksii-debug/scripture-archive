import assert from "node:assert/strict";
import test from "node:test";
import { communityDeploymentReady } from "../lib/community-smoke.mjs";

// HTML5 parses <main>/<a> inside SVG and MathML as foreign-namespace
// elements, not the HTML main landmark and navigation of the public shell.
// This is a source-level fail-closed readiness contract, not browser/NVDA
// or installed Cloudflare release acceptance.
const ORIGIN = "https://scripture-archive.com";
const MAIN = '<main id="main"></main>';
const LINK = '<a href="/community" data-route="community">Community</a>';
const MARKERS = MAIN + LINK;
const page = body => `<!doctype html><html><body>${body}</body></html>`;

async function ready(html) {
  const methods = [];
  const result = await communityDeploymentReady(ORIGIN, async (url, options) => {
    methods.push(options.method || "GET");
    assert.equal(options.redirect, "manual");
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
    throw Error("Unexpected GET-only preflight route: " + path);
  });
  assert.deepEqual(methods, Array(6).fill("GET"));
  return result;
}

for (const [name, html] of [
  ["both markers in svg", page(`<svg>${MARKERS}</svg>`)],
  ["only main in svg", page(`<svg>${MAIN}</svg>${LINK}`)],
  ["only link in svg", page(`${MAIN}<svg>${LINK}</svg>`)],
  ["nested svg group", page(`<svg><g>${MARKERS}</g></svg>`)],
  ["uppercase SVG", page(`<SVG>${MARKERS}</SVG>`)],
  ["both markers in math", page(`<math>${MARKERS}</math>`)],
  ["only main in math", page(`<math>${MAIN}</math>${LINK}`)],
  ["only link in math", page(`${MAIN}<math>${LINK}</math>`)],
  ["nested MathML", page(`<math><mrow>${MARKERS}</mrow></math>`)],
  ["markers split between foreign namespaces", page(`<svg>${MAIN}</svg><math>${LINK}</math>`)],
  ["malformed SVG slash plus space is not self-closing", page(`<svg/ >${MARKERS}</svg>`)],
  ["malformed MathML slash plus space is not self-closing", page(`<math/ >${MARKERS}</math>`)],
  ["malformed SVG spaced slash is not self-closing", page(`<svg / >${MARKERS}</svg>`)],
]) {
  test("P0 R0.4: foreign-namespace markers do not qualify HTML shell: " + name, async () => {
    assert.equal(await ready(html), false);
  });
}

for (const [name, html] of [
  ["ordinary HTML shell", page(MARKERS)],
  ["real shell after decorative SVG", page(`<svg><g>${MARKERS}</g></svg>${MARKERS}`)],
  ["real shell after MathML", page(`<math>${MARKERS}</math>${MARKERS}`)],
  ["decorative SVG after real shell", page(`${MARKERS}<svg><circle r="1"/></svg>`)],
  ["self-closing SVG before HTML shell", page(`<svg/>${MARKERS}`)],
  ["self-closing MathML before HTML shell", page(`<math/>${MARKERS}`)],
]) {
  test("P0 R0.4: real HTML shell remains ready: " + name, async () => {
    assert.equal(await ready(html), true);
  });
}

test("P0 R0.4: readiness recovers from foreign-only placeholder to real HTML shell", async () => {
  assert.equal(await ready(page(`<svg>${MARKERS}</svg>`)), false);
  assert.equal(await ready(page(MARKERS)), true);
});
