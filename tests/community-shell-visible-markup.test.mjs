import assert from "node:assert/strict";
import test from "node:test";
import { communityDeploymentReady } from "../lib/community-smoke.mjs";
const ORIGIN="https://scripture-archive.com";
const SHELL='<html><head><script>window.data={}</script></head><body><a href="/community" data-route="community">Community</a><main id="main"></main></body></html>';
const NEGATIVE=[
  '<html><body><script>const demo = "<a href=/community data-route=community><main id=main>";</script><form>Login</form></body></html>',
  '<html><body><script>const demo = \'<a href="/community" data-route="community"></a><main id="main"></main>\';</script>Maintenance</body></html>',
  '<html><body><template><a href="/community" data-route="community"></a><main id="main"></main></template>Offline</body></html>',
  '<html><body><noscript><a href="/community" data-route="community"></a><main id="main"></main></noscript>Offline</body></html>',
  '<html><body><textarea><a href="/community" data-route="community"></a><main id="main"></main></textarea>Offline</body></html>',
  '<html><body><div data-fake=\'<a href="/community" data-route="community"></a><main id="main"></main>\'>Login</div></body></html>',
  '<html><body><main data-id="main"></main><a href="/community" data-route="community">Community</a></body></html>',
  '<html><body><main id="main"></main><a href="/community" data-data-route="community">Community</a></body></html>',
  '<html><head><main id="main"></main><a href="/community" data-route="community"></a></head><body>Offline</body></html>',
  '<html><body><main id="main"></main><a href="/different" data-route="community"></a></body></html>',
  '<html><body><!-- <a href="/community" data-route="community"></a><main id="main"></main> -->Offline</body></html>',
];
async function check(html) {
  const methods=[];
  const ready=await communityDeploymentReady(ORIGIN,async(url,options)=>{
    methods.push(options.method||"GET");
    const path=new URL(url).pathname;
    if(path==="/community")return new Response(html,{headers:{"Content-Type":"text/html; charset=utf-8"}});
    if(path==="/api/community")return Response.json({summary:{registered:1,online:0}},{headers:{"Cache-Control":"no-store"}});
    if(path==="/api/account")return Response.json({user:null},{headers:{"Cache-Control":"no-store"}});
    if(path==="/api/community/dispatch")return new Response(null,{status:204,headers:{"Cache-Control":"no-store","X-Scripture-Runner-Protocol":"github-oidc-v1"}});
    if(path==="/robots.txt")return new Response("Sitemap: https://scripture-archive.com/sitemap.xml");
    if(path==="/sitemap.xml")return new Response("<urlset></urlset>");
    throw new Error(path);
  });
  assert.deepEqual(methods,Array(6).fill("GET"));
  return ready;
}
for(const [i,html] of NEGATIVE.entries()) test("R0.4 ignores inert/fake HTML shell "+i,async()=>{
  assert.equal(await check(html),false);
});
test("R0.4 preserves true SSR page readiness",async()=>assert.equal(await check(SHELL),true));
test("R0.4 handles real mixed-quote/order HTML attributes",async()=>{
  assert.equal(await check('<!DOCTYPE html><html><body><main class="content" id = \'main\'></main><a data-route = \'community\' href = \'/community\'>Home</a></body></html>'),true);
});
test("R0.4 recovers only after actual SSR markup appears",async()=>{
  assert.equal(await check(NEGATIVE[1]),false);
  assert.equal(await check(SHELL),true);
});
