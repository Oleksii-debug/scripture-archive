import assert from "node:assert/strict";
import test from "node:test";
import { communityDeploymentReady } from "../lib/community-smoke.mjs";

const ORIGIN="https://scripture-archive.com";
const shell=(tag,attrs)=>`<html${tag==="html"?attrs:""}><body${tag==="body"?attrs:""}><main id="main"${tag==="main"?attrs:""}></main><a href="/community" data-route="community"${tag==="a"?attrs:""}>Community</a></body></html>`;
async function ready(html) {
  const methods=[];
  const actual=await communityDeploymentReady(ORIGIN,async(url,options)=>{
    methods.push(options.method||"GET");
    const path=new URL(url).pathname;
    if(path==="/community")return new Response(html,{headers:{"Content-Type":"text/html; charset=utf-8"}});
    if(path==="/api/community")return Response.json({summary:{registered:1,online:0}},{headers:{"Cache-Control":"no-store"}});
    if(path==="/api/account")return Response.json({user:null},{headers:{"Cache-Control":"no-store"}});
    if(path==="/api/community/dispatch")return new Response(null,{status:204,headers:{"Cache-Control":"no-store","X-Scripture-Runner-Protocol":"github-oidc-v1"}});
    if(path==="/robots.txt")return new Response("Sitemap: https://scripture-archive.com/sitemap.xml");
    if(path==="/sitemap.xml")return new Response("<urlset></urlset>");
    throw Error("Unexpected GET "+url);
  });
  assert.deepEqual(methods,Array(6).fill("GET"),"readiness never mutates community");
  return actual;
}

const excluded=[
  " hidden"," HIDDEN",' hidden=""',' hidden="false"',
  " hidden=until-found"," inert"," INERT",' inert=""',
  ' inert="false"'," aria-hidden=true",' aria-hidden="TRUE"',
  " ARIA-HIDDEN='true'",' aria-hidden=" true "'
];
for(const tag of ["html","body","main","a"])
  for(const [i,attributes] of excluded.entries())
    test(`R0.4 reject inaccessible ${tag} attribute case ${i+1}`,async()=>{
      assert.equal(await ready(shell(tag,attributes)),false);
    });

const allowed=[
  "",' aria-hidden="false"',' data-hidden="true"',' data-inert="true"',
  ' title="hidden inert aria-hidden=true"',' aria-hidden="FALSE"'
];
for(const tag of ["html","body","main","a"])
  for(const [i,attributes] of allowed.entries())
    test(`R0.4 preserve navigable ${tag} attribute case ${i+1}`,async()=>{
      assert.equal(await ready(shell(tag,attributes)),true);
    });
test("R0.4 recover from hidden shell only when accessible markup returns",async()=>{
  assert.equal(await ready(shell("main"," hidden")),false);
  assert.equal(await ready(shell("main","")),true);
});
