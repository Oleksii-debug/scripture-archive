import assert from "node:assert/strict";
import test from "node:test";
import { communityDeploymentReady } from "../lib/community-smoke.mjs";

const ORIGIN = "https://scripture-archive.com";
const MARKERS = '<main id="main"></main><a href="/community" data-route="community">Community</a>';
const html = (head = "", body = MARKERS) =>
  `<!doctype html><html><head>${head}</head><body>${body}</body></html>`;

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

const baseAltered = [
  ["foreign absolute base", html('<base href="https://other.example/">')],
  ["protocol-relative foreign base", html('<base href="//other.example/">')],
  ["unquoted foreign base", html("<base href=https://other.example/>")],
  ["uppercase foreign base", html('<BASE HREF="https://other.example/">')],
  ["entity-encoded foreign base", html('<base href="&#104;ttps://other.example/">')],
  ["same-origin path base", html('<base href="/different/">')],
  ["new-tab default target", html('<base target="_blank">')],
  ["bare base element", html("<base>")],
  ["base in body", html("", '<base href="https://other.example/">' + MARKERS)],
];
for (const [name, page] of baseAltered)
  test("R0.4 refuses base-altered release shell: " + name, async () => {
    assert.equal(await probe(page), false);
  });

const unaffected = [
  ["canonical shell", html()],
  ["viewport metadata", html('<meta name="viewport" content="width=device-width">')],
  ["commented base", html('<!-- <base href="https://other.example/"> -->')],
  ["inert template base", html("", '<template><base href="https://other.example/"></template>' + MARKERS)],
];
for (const [name, page] of unaffected)
  test("R0.4 retains navigation without active base: " + name, async () => {
    assert.equal(await probe(page), true);
  });

test("R0.4 recovers after a base-altered shell is replaced", async () => {
  assert.equal(await probe(baseAltered[0][1]), false);
  assert.equal(await probe(unaffected[0][1]), true);
});
