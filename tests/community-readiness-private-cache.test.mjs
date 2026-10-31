import assert from "node:assert/strict";
import test from "node:test";
import { communityDeploymentReady } from "../lib/community-smoke.mjs";

const ORIGIN = "https://scripture-archive.com";
const SUMMARY = "/api/community", ACCOUNT = "/api/account", DISPATCH = "/api/community/dispatch";
function deployed(url, options = {}) {
  assert.equal(options.method || "GET", "GET", "readiness must stay read-only");
  assert.equal(options.redirect, "manual", "readiness must not follow redirects");
  const path = new URL(url).pathname;
  if (path === SUMMARY) return Response.json({summary:{registered:3,online:1}}, {headers:{"Cache-Control":"no-store"}});
  if (path === ACCOUNT) return Response.json({user:null}, {headers:{"Cache-Control":"no-store, private"}});
  if (path === DISPATCH) return new Response(null, {status:204,headers:{"Cache-Control":"no-store","X-Scripture-Runner-Protocol":"github-oidc-v1"}});
  if (path === "/robots.txt") return new Response("User-agent: *\nSitemap: https://scripture-archive.com/sitemap.xml");
  if (path === "/sitemap.xml") return new Response("<urlset></urlset>");
  return new Response("<html>Community</html>");
}
const override = (path, factory) => async (url, options) => new URL(url).pathname === path ? factory() : deployed(url, options);
const badCache = [null,"public, max-age=3600","private, max-age=300","no-cache","no-store-extra","no-stored","no-store=1","max-age=0","PUBLIC, MAX-AGE=0","no-cache, must-revalidate"];
for (const cache of badCache) {
  test("P0: reject cacheable community summary "+String(cache), async () => {
    const replacement = () => Response.json({summary:{registered:3,online:1}}, {headers:cache === null?{}:{"Cache-Control":cache}});
    assert.equal(await communityDeploymentReady(ORIGIN, override(SUMMARY,replacement)),false);
  });
}
const extraFields = [
  {email:"private@example.invalid"}, {session:"fixture-secret"}, {accessToken:"fixture-secret"},
  {profile:{ageRange:"18-24"}}, {isOwner:false}, {authenticated:false},
  {identities:[]}, {privateMetadata:null}, {data:{user:null}}, {__testPrivate:"unexpected"},
];
for (const fields of extraFields) {
  test("P0: reject extra anonymous fields "+Object.keys(fields)[0], async () => {
    assert.equal(await communityDeploymentReady(ORIGIN,override(ACCOUNT,()=>Response.json({user:null,...fields},
      {headers:{"Cache-Control":"private, NO-STORE"}}))),false);
  });
}
for (const user of [true,false,{},[],"",3,"null"]) {
  test("P0: reject non-null anonymous user "+JSON.stringify(user), async () => {
    assert.equal(await communityDeploymentReady(ORIGIN,override(ACCOUNT,
      ()=>Response.json({user}, {headers:{"Cache-Control":"no-store"}}))),false);
  });
}
for (const [path,cache] of [[SUMMARY,"private, NO-STORE"],[ACCOUNT,"NO-STORE, private"],[DISPATCH,"no-store"]]) {
  test("P0: accept valid case-insensitive no-store "+path, async () => {
    const factory = () => path === DISPATCH ?
      new Response(null,{status:204,headers:{"Cache-Control":cache,"X-Scripture-Runner-Protocol":"github-oidc-v1"}}) :
      Response.json(path===SUMMARY?{summary:{registered:3,online:1}}:{user:null},{headers:{"Cache-Control":cache}});
    assert.equal(await communityDeploymentReady(ORIGIN,override(path,factory)),true);
  });
}
test("P0: all six real routes return healthy read-only readiness", async () => {
  const methods=[];
  assert.equal(await communityDeploymentReady(ORIGIN,async(url,options)=>{
    methods.push(options.method||"GET");return deployed(url,options);
  }),true);
  assert.deepEqual(methods,Array(6).fill("GET"));
});
test("P0: stale summary to healthy summary requires new read",async()=>{
  let stale=true;
  const read=async(url,options)=>new URL(url).pathname===SUMMARY&&stale?
    Response.json({summary:{registered:3,online:1}},{headers:{"Cache-Control":"public, max-age=1200"}}):deployed(url,options);
  assert.equal(await communityDeploymentReady(ORIGIN,read),false);
  stale=false;
  assert.equal(await communityDeploymentReady(ORIGIN,read),true);
});
test("P0: private account to clean account requires new read",async()=>{
  let leaked=true;
  const read=async(url,options)=>new URL(url).pathname===ACCOUNT&&leaked?
    Response.json({user:null,session:"fixture-secret"},{headers:{"Cache-Control":"no-store"}}):deployed(url,options);
  assert.equal(await communityDeploymentReady(ORIGIN,read),false);
  leaked=false;
  assert.equal(await communityDeploymentReady(ORIGIN,read),true);
});
test("P0: readiness does not cache earlier positive results",async()=>{
  let leaked=false;
  const read=async(url,options)=>new URL(url).pathname===ACCOUNT&&leaked?
    Response.json({user:null,email:"private@example.invalid"},{headers:{"Cache-Control":"no-store"}}):deployed(url,options);
  assert.equal(await communityDeploymentReady(ORIGIN,read),true);
  leaked=true;
  assert.equal(await communityDeploymentReady(ORIGIN,read),false);
});
