import assert from "node:assert/strict";
import test from "node:test";
import { communityDeploymentReady } from "../lib/community-smoke.mjs";

const ORIGIN = "https://scripture-archive.com";
const MARKERS = '<main id="main"></main><a href="/community" data-route="community">Community</a>';
const html = (head = "", body = MARKERS) => `<!doctype html><html><head>${head}</head><body>${body}</body></html>`;

async function probe(page) {
  const methods = [];
  const ready = await communityDeploymentReady(ORIGIN, async (url, options) => {
    methods.push(options.method || "GET");
    const path = new URL(url).pathname;
    if (path === "/community")
      return new Response(page, { headers: { "Content-Type": "text/html; charset=utf-8" } });
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
    throw Error("Unexpected release probe: " + path);
  });
  assert.deepEqual(methods, Array(6).fill("GET"), "preflight must remain read-only");
  return ready;
}

const redirecting = [
  ["head meta refresh", html('<meta http-equiv="refresh" content="0;url=/account">')],
  ["case-insensitive meta refresh", html('<META HTTP-EQUIV="REFRESH" CONTENT="0;url=/account">')],
  ["unquoted meta refresh", html("", '<meta http-equiv=refresh content="0;url=/account">' + MARKERS)],
  ["whitespace meta refresh", html('<meta http-equiv=" refresh " content="0;url=/account">')],
  ["entity-obscured refresh", html('<meta http-equiv="ref&#114;esh" content="0;url=/account">')],
  ["hex-entity-obscured refresh", html('<meta http-equiv="ref&#x72;esh" content="0;url=/account">')],
];
for (const [name, page] of redirecting)
  test("R0.4 rejects navigational shell: " + name, async () => {
    assert.equal(await probe(page), false);
  });

for (const [name, page] of [
  ["ordinary SSR shell", html()],
  ["viewport metadata", html('<meta name="viewport" content="width=device-width">')],
  ["non-redirect http-equiv metadata", html('<meta http-equiv="content-type" content="text/html; charset=utf-8">')],
  ["commented-out redirect", html('<!-- <meta http-equiv="refresh" content="0;url=/account"> -->')],
  ["inert template redirect", html("", '<template><meta http-equiv="refresh" content="0;url=/account"></template>' + MARKERS)],
])
  test("R0.4 retains usable shell: " + name, async () => {
    assert.equal(await probe(page), true);
  });

test("R0.4 recovers only on a fresh non-redirecting shell", async () => {
  assert.equal(await probe(redirecting[0][1]), false);
  assert.equal(await probe(html()), true);
});
