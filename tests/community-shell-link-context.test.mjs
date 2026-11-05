import assert from "node:assert/strict";
import test from "node:test";
import { communityDeploymentReady } from "../lib/community-smoke.mjs";

// Source-only R0.4 navigation preflight, not a browser, D1, or NVDA attestation.
// No owner state, users, production data, or scheduler dispatch are modified.
const ORIGIN = "https://scripture-archive.com";
const LINK = '<a href="/community" data-route="community">Community</a>';

async function probe(link, seen = []) {
  const html = '<html><body><main id="main">Reader</main>' + link + '</body></html>';
  const result = await communityDeploymentReady(ORIGIN, async (url, options) => {
    seen.push(options.method || "GET");
    assert.equal(options.redirect, "manual");
    switch (new URL(url).pathname) {
      case "/api/community":
        return Response.json({ summary: { registered: 0, online: 0 } },
          { headers: { "Cache-Control": "no-store" } });
      case "/community":
        return new Response(html, { headers: { "Content-Type": "text/html" } });
      case "/api/account":
        return Response.json({ user: null }, { headers: { "Cache-Control": "no-store" } });
      case "/robots.txt":
        return new Response("User-agent: *\\nSitemap: " + ORIGIN + "/sitemap.xml\\n");
      case "/sitemap.xml":
        return new Response("<urlset></urlset>");
      case "/api/community/dispatch":
        return new Response(null, { status: 204, headers: {
          "Cache-Control": "no-store",
          "X-Scripture-Runner-Protocol": "github-oidc-v1",
        } });
      default:
        throw Error("Unexpected readiness probe route");
    }
  });
  assert.deepEqual(seen.slice(-6), Array(6).fill("GET"),
    "release preflight must remain strictly read-only");
  return result;
}

test("R0.4 refuses community links opening a new or named browsing context", async () => {
  for (const target of ['target="_blank"', 'target="new-window"', 'target="_parent"',
    'target="_top"', 'target="&#95;self"']) {
    assert.equal(await probe('<a href="/community" data-route="community" ' + target + '>Community</a>'),
      false, target);
  }
});

test("R0.4 refuses inline click handlers whose behavior is not source-verifiable", async () => {
  for (const handler of ['onclick="return false"', 'onClick="event.preventDefault()"',
    'onclick="navigateSomewhereElse()"', 'onclick="&#114;eturn false"']) {
    assert.equal(await probe('<a href="/community" data-route="community" ' + handler + '>Community</a>'),
      false, handler);
  }
});

test("R0.4 retains native and explicitly same-tab navigation", async () => {
  assert.equal(await probe(LINK), true);
  assert.equal(await probe('<a href="/community" data-route="community" target="_self">Community</a>'), true);
  assert.equal(await probe('<a href="/community" data-route="community" target=" _SELF ">Community</a>'), true);
});

test("R0.4 recovers only when the new-context or inline-handler link is replaced", async () => {
  const seen = [];
  assert.equal(await probe('<a href="/community" data-route="community" target="_blank">Community</a>', seen), false);
  assert.equal(await probe('<a href="/community" data-route="community" onclick="return false">Community</a>', seen), false);
  assert.equal(await probe(LINK, seen), true);
  assert.deepEqual(seen, Array(18).fill("GET"));
});
