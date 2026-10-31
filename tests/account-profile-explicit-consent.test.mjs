import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

// Execute the real production account route with a minimal fake D1 surface;
// no parallel API, state store, browser fixture, or production credentials.
const catalog=JSON.parse(readFileSync(new URL("../public/data/catalog.json",import.meta.url),"utf8"));
const source=readFileSync(new URL("../app/api/account/route.ts",import.meta.url),"utf8");
const transpiled=ts.transpileModule(source,{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022
},reportDiagnostics:true});
assert.equal(transpiled.diagnostics?.length??0,0);

function fixture(){
  const calls=[],exports={};
  const DB={prepare(sql){return {bind(...args){return {
    async run(){calls.push({sql,args});return {success:true,meta:{changes:1}};},
    async first(){return {first_name:"Ada",last_name:"Reader",locale:"uk",
      sensitive_consent:1,sensitive_consent_version:1};}
  };}};}};
  vm.runInNewContext(transpiled.outputText,{
    exports,Request,Response,URL,
    require(specifier){
      if(specifier==="cloudflare:workers")return {env:{DB}};
      if(specifier==="../../../public/data/catalog.json")return {default:catalog};
      if(specifier==="../../../content/mission-abraham.json")return {default:{tasks:[]}};
      if(specifier==="../../../lib/auth")return {
        sameOrigin:request=>request.headers.get("origin")===new URL(request.url).origin,
        authenticateRequest:async()=>({userId:"reader",email:"reader@example.invalid",
          provider:"password",emailVerified:true}),
        isVerifiedOwner:()=>false,
      };
      throw Error("unexpected import "+specifier);
    },
  });
  async function post(payload,method="POST"){
    const response=await exports.POST(new Request("https://archive.invalid/api/account?action=profile",{
      method,headers:{origin:"https://archive.invalid","Content-Type":"application/json"},
      body:JSON.stringify(payload)
    }));
    return {status:response.status,body:await response.json(),
      cache:response.headers.get("cache-control")};
  }
  return {post,calls};
}
const profile={firstName:"Ada",lastName:"Reader",
  ageRange:"18-24",acceptPrivacy:true,locale:"uk"};
const invalid=[
  ["missing property",undefined],["null",null],["empty string",""],
  ["string false","false"],["string true","true"],
  ["string zero","0"],["string one","1"],
  ["string yes","yes"],["string no","no"],
  ["uppercase true","TRUE"],["uppercase false","FALSE"],
  ["whitespace"," "],["padded false"," false "],["padded true"," true "],
  ["string null","null"],["string undefined","undefined"],
  ["numeric zero",0],["numeric one",1],["numeric negative",-1],
  ["numeric two",2],["numeric fractional",0.5],
  ["empty array",[]],["false array",[false]],["true array",[true]],
  ["string array",["false"]],["two member array",[true,false]],
  ["empty object",{}],["false object",{value:false}],
  ["true object",{value:true}],["nested object",{consent:{value:false}}],
  ["localized yes","так"],["localized no","ні"]
];
for(const [name,value] of invalid){
  test("profile rejects "+name+" before any D1 mutation",async()=>{
    const f=fixture();
    const result=await f.post({...profile,acceptSensitive:value});
    assert.equal(result.status,400);
    assert.equal(result.body.error,"invalid_profile_consent");
    assert.equal(f.calls.length,0,"invalid consent may not overwrite existing profile");
    assert.match(result.cache,/no-store, private/);
  });
}
for(const [label,consent,stored] of [
  ["affirmative consent",true,1],["explicit refusal",false,0]
]){
  test("profile persists "+label+" without coercion",async()=>{
    const f=fixture();
    const result=await f.post({...profile,acceptSensitive:consent});
    assert.equal(result.status,200);
    assert.equal(f.calls.length,1);
    assert.equal(f.calls[0].args[10],stored);
    assert.equal(f.calls[0].args[11],stored);
    assert.match(result.cache,/no-store, private/);
  });
}
test("profile malformed consent remains denied on PUT as well as POST",async()=>{
  const f=fixture();
  const result=await f.post({...profile,acceptSensitive:["true"]},"PUT");
  assert.equal(result.status,400);
  assert.equal(f.calls.length,0);
});
