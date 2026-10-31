import assert from "node:assert/strict";
import test from "node:test";
import { communityDeploymentReady } from "../lib/community-smoke.mjs";
const ORIGIN="https://scripture-archive.com";
const MARKER='<main id="main"></main><a href="/community" data-route="community">Community</a>';
async function ready(html){
  const methods=[];
  const result=await communityDeploymentReady(ORIGIN,async(url,options)=>{
    methods.push(options.method||"GET");
    const p=new URL(url).pathname;
    if(p==="/community")return new Response(html,{headers:{"Content-Type":"text/html; charset=utf-8"}});
    if(p==="/api/community")return Response.json({summary:{registered:1,online:0}},{headers:{"Cache-Control":"no-store"}});
    if(p==="/api/account")return Response.json({user:null},{headers:{"Cache-Control":"no-store"}});
    if(p==="/api/community/dispatch")return new Response(null,{status:204,headers:{"Cache-Control":"no-store","X-Scripture-Runner-Protocol":"github-oidc-v1"}});
    if(p==="/robots.txt")return new Response("Sitemap: https://scripture-archive.com/sitemap.xml");
    if(p==="/sitemap.xml")return new Response("<urlset></urlset>");
    throw Error("Unexpected route "+p);
  });
  assert.deepEqual(methods,Array(6).fill("GET"));
  return result;
}
const denied=[
['hidden div slash',`<html><body><div hidden/>${MARKER}</body></html>`],
['inert section slash',`<html><body><section inert/>${MARKER}</body></html>`],
['aria-hidden article slash',`<html><body><article aria-hidden="true"/>${MARKER}</body></html>`],
['script slash',`<html><body><script/>${MARKER}</body></html>`],
['style slash',`<html><body><style/>${MARKER}</body></html>`],
['template slash',`<html><body><template/>${MARKER}</body></html>`],
['textarea slash',`<html><body><textarea/>${MARKER}</body></html>`],
['noscript slash',`<html><body><noscript/>${MARKER}</body></html>`],
['4097 nested tags',`<html><body>${'<div>'.repeat(4097)}${MARKER}${'</div>'.repeat(4097)}</body></html>`],
];
for(const [name,html] of denied)test("R0.4 refuses nonvoid slash escape: "+name,async()=>assert.equal(await ready(html),false));
const allowed=[
['normal',`<html><body>${MARKER}</body></html>`],
['br void',`<html><body><br/>${MARKER}</body></html>`],
['input void',`<html><body><input/>${MARKER}</body></html>`],
['inert predecessor closed',`<html><body><div hidden>${MARKER}</div>${MARKER}</body></html>`],
['aria-hidden false',`<html><body><section aria-hidden="false">${MARKER}</section></body></html>`],
['4095 nested normal',`<html><body>${'<div>'.repeat(4093)}${MARKER}${'</div>'.repeat(4093)}</body></html>`],
];
for(const [name,html] of allowed)test("R0.4 allows accessible HTML: "+name,async()=>assert.equal(await ready(html),true));
test("R0.4 retry recovers only on clean HTML after bounded refusal",async()=>{
  assert.equal(await ready(denied[8][1]),false);
  assert.equal(await ready(allowed[0][1]),true);
});
