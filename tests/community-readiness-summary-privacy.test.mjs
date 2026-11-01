import assert from "node:assert/strict";
import test from "node:test";
import { communityDeploymentReady } from "../lib/community-smoke.mjs";

// R0.4 source-only preflight: the public summary GET must never certify a
// response carrying private account fields or directory entries.
const ORIGIN = "https://scripture-archive.com";
const HTML = '<html><body><main id="main"></main><a href="/community" data-route="community">Community</a></body></html>';
const validSummary = JSON.stringify({summary:{registered:3,online:1,visible:1},page:1,pageSize:24,totalPages:1,members:[]});
function deployed(url, options, summaryBody) {
  assert.equal(options.method ?? "GET", "GET");
  assert.equal(options.redirect, "manual");
  const path = new URL(url).pathname;
  if (path === "/api/community") return new Response(summaryBody, {
    headers:{"Cache-Control":"no-store","Content-Type":"application/json"},
  });
  if (path === "/community") return new Response(HTML, {headers:{"Content-Type":"text/html"}});
  if (path === "/api/account") return Response.json({user:null}, {headers:{"Cache-Control":"no-store"}});
  if (path === "/robots.txt") return new Response("User-agent: *\nSitemap: https://scripture-archive.com/sitemap.xml");
  if (path === "/sitemap.xml") return new Response("<urlset></urlset>");
  if (path === "/api/community/dispatch") return new Response(null, {status:204,headers:{
    "Cache-Control":"no-store","X-Scripture-Runner-Protocol":"github-oidc-v1",
  }});
  throw Error("unexpected path " + path);
}
async function check(body) {
  const methods = [];
  const ready = await communityDeploymentReady(ORIGIN, (url, options) => {
    methods.push(options.method ?? "GET");
    return deployed(url, options, body);
  });
  assert.deepEqual(methods, Array(6).fill("GET"), "no writes during readiness");
  return ready;
}
test("P0 R0.4: public summary rejects private top-level and nested fields", async () => {
  for (const payload of [
    {summary:{registered:3,online:1},email:"private@example.invalid"},
    {summary:{registered:3,online:1,session:"fixture-secret"}},
    {summary:{registered:3,online:1},owner:{email:"private@example.invalid"}},
    {summary:{registered:3,online:1},members:[{email:"private@example.invalid"}]},
    {summary:{registered:3,online:1},members:[{displayName:"not-summary"}]},
  ]) assert.equal(await check(JSON.stringify(payload)), false, JSON.stringify(payload));
});
test("P0 R0.4: public summary rejects duplicate-key hidden private content", async () => {
  for (const raw of [
    '{"summary":{"registered":3,"online":1},"owner":{"email":"private@example.invalid"},"owner":null}',
    '{"summary":{"registered":3,"online":1,"email":"private@example.invalid"},"summary":{"registered":3,"online":1}}',
    '{"summary":{"registered":3,"online":1},"members":[{"email":"private@example.invalid"}],"members":[]}',
  ]) assert.equal(await check(raw), false, raw);
});
test("P0 R0.4: canonical full and legacy minimal public summary remain accepted", async () => {
  assert.equal(await check(validSummary), true);
  assert.equal(await check(JSON.stringify({summary:{registered:3,online:1}})), true);
});
test("P0 R0.4: rejected private response recovers on a fresh safe GET", async () => {
  assert.equal(await check('{"summary":{"registered":3,"online":1},"email":"private@example.invalid"}'), false);
  assert.equal(await check(validSummary), true);
});
