import assert from "node:assert/strict";
import test from "node:test";
import { communityDeploymentReady } from "../lib/community-smoke.mjs";

function deployed(url){
  const path=new URL(url).pathname;
  if(path==="/api/community")return Response.json({summary:{registered:0,online:0}});
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
  assert.deepEqual(methods,["GET","GET","GET","GET","GET"]);
});
