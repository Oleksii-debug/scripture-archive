import assert from "node:assert/strict";
import test from "node:test";
import { communityDeploymentReady } from "../lib/community-smoke.mjs";

// Source-level accessible-navigation preflight only. Not a browser/NVDA pass.
const ORIGIN = "https://scripture-archive.com";
const MAIN = '<main id="main"></main>';
const LINK = '<a href="/community" data-route="community">Community</a>';

async function probe(main = MAIN, link = LINK, seen = []) {
  const shell = '<html><body>' + main + link + '</body></html>';
  const result = await communityDeploymentReady(ORIGIN, async (url, options) => {
    seen.push(options.method ?? "GET");
    assert.equal(options.redirect, "manual");
    switch (new URL(url).pathname) {
      case "/api/community":
        return Response.json({summary:{registered:0,online:0}}, {headers:{"Cache-Control":"no-store"}});
      case "/community":
        return new Response(shell, {headers:{"Content-Type":"text/html"}});
      case "/api/account":
        return Response.json({user:null}, {headers:{"Cache-Control":"no-store"}});
      case "/robots.txt":
        return new Response("User-agent: *\nSitemap: " + ORIGIN + "/sitemap.xml\n");
      case "/sitemap.xml":
        return new Response("<urlset></urlset>");
      case "/api/community/dispatch":
        return new Response(null, {status:204,headers:{
          "Cache-Control":"no-store","X-Scripture-Runner-Protocol":"github-oidc-v1",
        }});
      default:
        throw Error("Unexpected probe route");
    }
  });
  assert.deepEqual(seen.slice(-6), Array(6).fill("GET"));
  return result;
}

test("P0 R0.4 does not certify a community link declared ARIA-disabled", async () => {
  for (const attribute of ['aria-disabled="true"', 'aria-disabled="TRUE"',
    'aria-disabled="&#116;rue"']) {
    assert.equal(await probe(MAIN,
      '<a href="/community" data-route="community" ' + attribute + '>Community</a>'),
    false, attribute);
  }
});

test("P0 R0.4 does not certify a main element with its landmark role removed", async () => {
  for (const attribute of ['role="presentation"', 'role="none"',
    'role="navigation"', 'role="&#109;ain"']) {
    assert.equal(await probe('<main id="main" ' + attribute + '></main>'),
      false, attribute);
  }
});

test("P0 R0.4 preserves valid explicit landmark and enabled-link semantics", async () => {
  assert.equal(await probe(), true);
  assert.equal(await probe('<main id="main" role="main"></main>',
    '<a href="/community" data-route="community" aria-disabled="false">Community</a>'), true);
});

test("P0 R0.4 recovers only after a fresh enabled link and true main landmark", async () => {
  const seen = [];
  assert.equal(await probe('<main id="main" role="none"></main>', LINK, seen), false);
  assert.equal(await probe(MAIN,
    '<a href="/community" data-route="community" aria-disabled="true">Community</a>', seen), false);
  assert.equal(await probe(MAIN, LINK, seen), true);
  assert.deepEqual(seen, Array(18).fill("GET"));
});
