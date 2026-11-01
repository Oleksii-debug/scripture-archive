import assert from "node:assert/strict";
import test from "node:test";
import { communityDeploymentReady } from "../lib/community-smoke.mjs";

// P0 R0.4: JSON.parse discards earlier duplicate keys. The anonymous
// release gate must not certify a response that contained private bytes,
// even if the final parsed value is exactly {user:null}.
const ORIGIN = "https://scripture-archive.com";
const HTML = '<html><body><main id="main"></main><a href="/community" data-route="community">Community</a></body></html>';

function deployed(url, options, accountBody) {
  assert.equal(options.method ?? "GET", "GET");
  assert.equal(options.redirect, "manual");
  const path = new URL(url).pathname;
  if (path === "/api/community") return Response.json(
    { summary: { registered: 1, online: 0 } }, { headers: { "Cache-Control": "no-store" } });
  if (path === "/community") return new Response(HTML, { headers: { "Content-Type": "text/html" } });
  if (path === "/api/account") return new Response(accountBody, {
    headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" },
  });
  if (path === "/robots.txt") return new Response("User-agent: *\nSitemap: https://scripture-archive.com/sitemap.xml");
  if (path === "/sitemap.xml") return new Response("<urlset></urlset>");
  if (path === "/api/community/dispatch") return new Response(null, { status: 204, headers: {
    "Cache-Control": "no-store", "X-Scripture-Runner-Protocol": "github-oidc-v1",
  } });
  throw new Error("Unexpected route: " + path);
}

async function check(accountBody) {
  const methods = [];
  const ready = await communityDeploymentReady(ORIGIN, async (url, options) => {
    methods.push(options.method ?? "GET");
    return deployed(url, options, accountBody);
  });
  assert.deepEqual(methods, Array(6).fill("GET"), "readiness must never mutate");
  return ready;
}

test("P0 R0.4: reject duplicate anonymous account keys concealing private content", async () => {
  for (const body of [
    '{"user":{"email":"private@example.invalid"},"user":null}',
    '{"user":{"session":"fixture-secret"},"user":null}',
    '{"us\\u0065r":{"email":"private@example.invalid"},"user":null}',
    '{"user":false,"user":null}',
    '{"user":null,"user":null}',
  ]) assert.equal(await check(body), false, "duplicate JSON key must not qualify: " + body);
});

test("P0 R0.4: canonical anonymous response remains accepted, including JSON whitespace", async () => {
  for (const body of ['{"user":null}', ' { "user" : null }\n'])
    assert.equal(await check(body), true);
});

test("P0 R0.4: a rejected ambiguous account body recovers on a fresh clean GET", async () => {
  assert.equal(await check('{"user":{"email":"private@example.invalid"},"user":null}'), false);
  assert.equal(await check('{"user":null}'), true);
});
