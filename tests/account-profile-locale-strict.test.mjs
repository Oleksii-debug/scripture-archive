import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

// Execute the actual account POST implementation and inspect the canonical D1 binding.
const catalog = JSON.parse(readFileSync(new URL("../public/data/catalog.json",import.meta.url),"utf8"));
const source = readFileSync(new URL("../app/api/account/route.ts",import.meta.url),"utf8");
const compiled = ts.transpileModule(source,{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
  reportDiagnostics:true,
});
assert.equal(compiled.diagnostics?.length??0,0);

function fixture(){
  const calls=[];
  const DB={prepare(sql){return {bind(...args){return {
    async run(){calls.push({sql,args});return {success:true,meta:{changes:1}};},
    async first(){return {first_name:"Ada",last_name:"Reader",locale:"uk"};},
  };}};}};
  const exports={};
  vm.runInNewContext(compiled.outputText,{
    exports,Request,Response,URL,
    require(s){
      if(s==="cloudflare:workers")return {env:{DB}};
      if(s==="../../../public/data/catalog.json")return {default:catalog};
      if(s==="../../../content/mission-abraham.json")return {default:{tasks:[]}};
      if(s==="../../../lib/auth")return {
        sameOrigin:r=>r.headers.get("origin")===new URL(r.url).origin,
        authenticateRequest:async()=>({userId:"reader",email:"reader@example.invalid",provider:"password",emailVerified:true}),
        isVerifiedOwner:()=>false,
      };
      throw Error("unexpected import "+s);
    },
  });
  async function post(payload){
    const res=await exports.POST(new Request("https://archive.invalid/api/account?action=profile",{
      method:"POST",headers:{origin:"https://archive.invalid","Content-Type":"application/json"},
      body:JSON.stringify(payload),
    }));
    return {status:res.status,body:await res.json(),cache:res.headers.get("cache-control")};
  }
  return {calls,post};
}
const validProfile={firstName:"Ada",lastName:"Reader",ageRange:"18-24",acceptPrivacy:true,acceptSensitive:false};

for(const [name,locale] of [
  ["array pretending to be supported",["en"]],
  ["object pretending to be supported",{value:"uk"}],
  ["numeric locale",23],
  ["boolean true",true],
  ["array with no items",[]],
  ["empty object",{}],
  ["boolean false",false],
  ["numeric zero",0],
  ["negative numeric",-1],
  ["array with two locales",["uk","en"]],
]){
  test("profile refuses "+name+" without D1 mutation",async()=>{
    const h=fixture();
    const result=await h.post({...validProfile,locale});
    assert.equal(result.status,400);
    assert.equal(result.body.error,"invalid_profile_locale");
    assert.equal(h.calls.length,0);
    assert.match(result.cache,/no-store, private/);
  });
}
for(const [name,locale,expected] of [
  ["Ukrainian","uk","uk"],
  ["Russian","ru","ru"],
  ["English","en","en"],
  ["trimmed explicit English","  en  ","en"],
  ["missing optional locale",undefined,"uk"],
  ["null optional locale",null,"uk"],
  ["empty HTML locale","","uk"],
  ["blank HTML locale","  ","uk"],
  ["unsupported French falls back by SA10 contract","fr","uk"],
  ["unsupported German falls back by SA10 contract","de","uk"],
  ["unsupported Slovak falls back by SA10 contract","sk","uk"],
  ["unknown padded locale falls back by SA10 contract","  fr  ","uk"],
]){
  test("profile stores "+name+" without rewriting explicit locale",async()=>{
    const h=fixture();
    const result=await h.post({...validProfile,locale});
    assert.equal(result.status,200);
    assert.equal(h.calls.length,1);
    assert.equal(h.calls[0].args[9],expected);
    assert.match(result.cache,/no-store, private/);
  });
}
