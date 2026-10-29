import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source=readFileSync(new URL("../app/api/editor-roles/route.ts",import.meta.url),"utf8");
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;

async function attempt(dbResult, identity={userId:"owner",email:"dordiaioleksii1@gmail.com",provider:"password",emailVerified:true}) {
  const exports={};
  let statements=0;
  vm.runInNewContext(compiled,{exports,Request,Response,URL,require(specifier) {
    if(specifier==="cloudflare:workers") return {env:{DB:{prepare(sql) {
      assert.match(sql,/INSERT OR IGNORE INTO editorial_roles/);
      return {bind(...params) {
        assert.equal(params[0],"owner");
        statements++;
        return {run:async()=>dbResult};
      }};
    }}}};
    if(specifier.endsWith("/lib/auth"))return {sameOrigin:()=>true,authenticateRequest:async()=>identity,OWNER_EMAIL:"dordiaioleksii1@gmail.com",isVerifiedOwner:id=>Boolean(id?.emailVerified && id?.provider!=="agent" && id?.email?.toLowerCase()==="dordiaioleksii1@gmail.com")};
    throw Error("unexpected import "+specifier);
  }});
  const request=new Request("https://scripture-archive.com/api/editor-roles",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"grant",email:"editor@example.invalid"})});
  const response=await exports.POST(request);
  return {response,body:await response.json(),statements};
}
test("trigger-inclusive D1 mutation count acknowledges an actual grant",async()=>{
  for(const changes of [1,2,3]) {
    const output=await attempt({success:true,meta:{changes}});
    assert.equal(output.response.status,200);
    assert.deepEqual(output.body,{ok:true});
    assert.equal(output.statements,1);
  }
});
test("no-op duplicate grant returns conflict and does not reassign",async()=>{
  const output=await attempt({success:true,meta:{changes:0}});
  assert.equal(output.response.status,409);
  assert.equal(output.body.error,"not_eligible_or_granted");
});
test("D1 refusal and missing/negative acknowledgement return honest 503",async()=>{
  for(const result of [{success:false,meta:{changes:1}},{success:true},{success:true,meta:{changes:-1}},{success:true,meta:{changes:"invalid"}}]) {
    const output=await attempt(result);
    assert.equal(output.response.status,503);
    assert.equal(output.body.error,"database_unavailable");
  }
});
test("unverified and agent identities cannot grant roles",async()=>{
  for(const identity of [
    {userId:"owner",email:"dordiaioleksii1@gmail.com",provider:"agent",emailVerified:true},
    {userId:"owner",email:"dordiaioleksii1@gmail.com",provider:"password",emailVerified:false},
  ]) {
    const output=await attempt({success:true,meta:{changes:2}},identity);
    assert.equal(output.response.status,403);
    assert.equal(output.statements,0);
  }
});
