import assert from "node:assert/strict";
import test from "node:test";
import { communityDeploymentReady } from "../lib/community-smoke.mjs";

function deployed(url){
  const path=new URL(url).pathname;
  if(path==="/api/community")return Response.json({summary:{registered:0,online:0}});
  if(path==="/api/community/dispatch")return new Response(null,{status:204,headers:{"Cache-Control":"no-store","X-Scripture-Runner-Protocol":"github-oidc-v1"}});
  if(path==="/api/account")return Response.json({user:null});
  if(path==="/robots.txt")return new Response("User-agent: *\nSitemap: https://scripture-archive.com/sitemap.xml");
  if(path==="/sitemap.xml")return new Response('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
  return new Response("<html>Community</html>");
}
test("automatic activation waits until all public routes exist",async()=>{
  assert.equal(await communityDeploymentReady("https://scripture-archive.com",async url=>new URL(url).pathname==="/community"?new Response("missing",{status:404}):deployed(url)),false);
});
test("a login HTML response cannot pass the deployment check",async()=>{
  assert.equal(await communityDeploymentReady("https://scripture-archive.com",async url=>new URL(url).pathname==="/api/account"?new Response("Sign in"):deployed(url)),false);
});
test("complete community, account and SEO routes pass without starting a wave",async()=>{
  const methods=[];
  assert.equal(await communityDeploymentReady("https://scripture-archive.com",async(url,options)=>{methods.push(options.method||"GET");return deployed(url)}),true);
  assert.deepEqual(methods,["GET","GET","GET","GET","GET","GET"]);
});


test("a deployed public site without the signed scheduler protocol stays not ready",async()=>{
  const seen=[];
  const ready=await communityDeploymentReady("https://scripture-archive.com",async(url,options)=>{
    seen.push({path:new URL(url).pathname,method:options.method||"GET"});
    return new URL(url).pathname==="/api/community/dispatch" ?
      new Response("Method Not Allowed",{status:405}) : deployed(url);
  });
  assert.equal(ready,false);
  assert.equal(seen.filter(x=>x.path==="/api/community/dispatch").length,1);
  assert.deepEqual([...new Set(seen.map(x=>x.method))],["GET"]);
});

test("the scheduler readiness probe rejects wrong/missing version and status",async()=>{
  const origin="https://scripture-archive.com";
  for(const response of [
    new Response(null,{status:204}),
    new Response(null,{status:204,headers:{"X-Scripture-Runner-Protocol":"legacy-v0"}}),
    new Response(null,{status:200,headers:{"X-Scripture-Runner-Protocol":"github-oidc-v1"}}),
    new Response("Forbidden",{status:403}),
  ]){
    const ready=await communityDeploymentReady(origin,async(url,options)=>{
      assert.equal(options.method??"GET","GET");
      return new URL(url).pathname==="/api/community/dispatch" ? response : deployed(url);
    });
    assert.equal(ready,false);
  }
});


test("successful but impossible public counters never qualify automatic community activation", async () => {
  const invalid = [
    {registered: -1, online: 0},
    {registered: 1, online: -1},
    {registered: 1, online: 2},
    {registered: -1, online: -2},
    {registered: 1.5, online: 0},
    {registered: "1", online: 0},
    {registered: Number.MAX_SAFE_INTEGER + 1, online: 0},
    {registered: 1, online: Number.MAX_SAFE_INTEGER + 1},
  ];
  for (const summary of invalid) {
    const seen = [];
    const ready = await communityDeploymentReady("https://scripture-archive.com", async (url, options) => {
      seen.push(options.method || "GET");
      return new URL(url).pathname === "/api/community"
        ? Response.json({summary}) : deployed(url);
    });
    assert.equal(ready, false, JSON.stringify(summary));
    assert.deepEqual(seen, Array(6).fill("GET"), "readiness must never mutate or POST");
  }
});

test("transient corrupt summary recovers only after a coherent new read", async () => {
  let corrupt = true;
  const seen = [];
  const fetcher = async (url, options) => {
    seen.push(options.method || "GET");
    return new URL(url).pathname === "/api/community"
      ? Response.json({summary: corrupt ? {registered: 0, online: 1} : {registered: 3, online: 2}})
      : deployed(url);
  };
  assert.equal(await communityDeploymentReady("https://scripture-archive.com", fetcher), false);
  corrupt = false;
  assert.equal(await communityDeploymentReady("https://scripture-archive.com", fetcher), true);
  assert.deepEqual(seen, Array(12).fill("GET"));
});
