import assert from "node:assert/strict";
import test from "node:test";
import { communityDeploymentReady } from "../lib/community-smoke.mjs";
const ORIGIN="https://scripture-archive.com";
const MARKER='<main id="main"></main><a href="/community" data-route="community">Community</a>';
const wrap=(tag,attributes)=>`<html><body><${tag}${attributes}>${MARKER}</${tag}></body></html>`;
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
const bad=[' hidden',' inert',' aria-hidden=true',' hidden="false"',' inert="false"',' ARIA-HIDDEN=TRUE',' aria-hidden=" true "',' HIDDEN',' INERT',' aria-hidden="true"',' hidden=until-found',' inert=""',' aria-hidden=\'true\''];
const good=['',' data-hidden="true"',' data-inert="true"',' aria-hidden="false"',' title="hidden inert aria-hidden=true"',' aria-hidden="FALSE"'];
for(const tag of ["div","section","article","form","nav","aside"]){
  for(const [i,a] of bad.entries())test(`R0.4 reject inaccessible ancestor ${tag} case ${i+1}`,async()=>assert.equal(await ready(wrap(tag,a)),false));
  for(const [i,a] of good.entries())test(`R0.4 retain accessible ancestor ${tag} case ${i+1}`,async()=>assert.equal(await ready(wrap(tag,a)),true));
}
test("R0.4 hidden ancestor cannot expose deeply nested descendants",async()=>{
  assert.equal(await ready(`<html><body><div aria-hidden="true"><section><article>${MARKER}</article></section></div></body></html>`),false);
});
test("R0.4 recovered visible descendants after hidden ancestor close are eligible",async()=>{
  assert.equal(await ready(`<html><body><div hidden>${MARKER}</div><section>${MARKER}</section></body></html>`),true);
});
test("R0.4 closed hidden branch and visible unrelated link do not certify main",async()=>{
  assert.equal(await ready('<html><body><div hidden><main id="main"></main></div><a href="/community" data-route="community">Ok</a></body></html>'),false);
});
test("R0.4 bounds malformed 4097-element nesting",async()=>{
  assert.equal(await ready('<html><body>'+'<div>'.repeat(4097)+MARKER+'</div>'.repeat(4097)+'</body></html>'),false);
});
test("R0.4 recovers on clean SSR after a malformed nesting refusal",async()=>{
  assert.equal(await ready('<html><body>'+'<div>'.repeat(4097)+MARKER+'</div>'.repeat(4097)+'</body></html>'),false);
  assert.equal(await ready(`<html><body>${MARKER}</body></html>`),true);
});

test("R0.4 HTML non-void self-closing syntax cannot escape hidden ancestor",async()=>{
  assert.equal(await ready('<html><body><div hidden/>'+MARKER+'</body></html>'),false);
});
test("R0.4 HTML script slash is not a self-closing escape into fake page markers",async()=>{
  assert.equal(await ready('<html><body><script/>const fake="'+MARKER+'";</body></html>'),false);
});
test("R0.4 genuine HTML void tag does not trap real navigation",async()=>{
  assert.equal(await ready('<html><body><br/>'+MARKER+'</body></html>'),true);
});

test("R0.4 inherited CSS display none cannot falsely certify readiness",async()=>{
  assert.equal(await ready('<html><body><section style="display:none">'+MARKER+'</section></body></html>'),false);
});
test("R0.4 inherited CSS visibility hidden cannot falsely certify readiness",async()=>{
  assert.equal(await ready('<html><body><section style="visibility:hidden">'+MARKER+'</section></body></html>'),false);
});
