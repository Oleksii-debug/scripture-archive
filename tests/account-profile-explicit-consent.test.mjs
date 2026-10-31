import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { DatabaseSync } from "node:sqlite";

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
    const response=await exports[method](new Request("https://archive.invalid/api/account?action=profile",{
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
  ["null",null],["empty string",""],
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

function nativeSQLiteFixture(){
  const sqlite=new DatabaseSync(":memory:"), exports={};
  sqlite.exec(`CREATE TABLE profiles(
    user_id TEXT PRIMARY KEY,email TEXT,first_name TEXT,last_name TEXT,
    age_range TEXT,tradition TEXT,church TEXT,marital_status TEXT,
    gender TEXT,locale TEXT,sensitive_consent INTEGER DEFAULT 0,
    sensitive_consent_version INTEGER DEFAULT 0,
    privacy_accepted_at TEXT,created_at TEXT,updated_at TEXT,
    denomination TEXT,public_church INTEGER DEFAULT 0
  )`);
  const calls=[];
  const DB={prepare(sql){return {bind(...args){return {
    async run(){calls.push({sql,args});const receipt=sqlite.prepare(sql).run(...args);
      return {success:true,meta:{changes:Number(receipt.changes)}};},
    async first(){return sqlite.prepare(sql).get(...args)??null;}
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
        isVerifiedOwner:()=>false
      };
      throw Error("unexpected import "+specifier);
    }
  });
  async function post(body){
    const response=await exports.POST(new Request("https://archive.invalid/api/account?action=profile",{
      method:"POST",headers:{origin:"https://archive.invalid","Content-Type":"application/json"},
      body:JSON.stringify(body)
    }));
    return {status:response.status,body:await response.json()};
  }
  return {sqlite,calls,post};
}
test("legacy missing consent preserves prior granted consent and sensitive metadata in actual SQLite",async()=>{
  const f=nativeSQLiteFixture();
  try{
    f.sqlite.prepare(`INSERT INTO profiles
      (user_id,email,first_name,last_name,age_range,tradition,church,denomination,
       locale,sensitive_consent,sensitive_consent_version,public_church)
      VALUES ('reader','reader@example.invalid','Ada','Reader','18-24','protestant',
              'Original church','Original denomination','uk',1,1,1)`).run();
    const before=f.sqlite.prepare("SELECT tradition,church,denomination,public_church,sensitive_consent,sensitive_consent_version FROM profiles").get();
    const res=await f.post(profile);
    assert.equal(res.status,200);
    const after=f.sqlite.prepare("SELECT tradition,church,denomination,public_church,sensitive_consent,sensitive_consent_version FROM profiles").get();
    assert.deepEqual(after,before);
    assert.equal(f.calls[0].args.length,18);
    assert.deepEqual(f.calls[0].args.slice(12),Array(6).fill(1));
    const withdrawn=await f.post({...profile,acceptSensitive:false});
    assert.equal(withdrawn.status,200);
    const revoked=f.sqlite.prepare("SELECT tradition,church,denomination,public_church,sensitive_consent,sensitive_consent_version FROM profiles").get();
    assert.equal(revoked.sensitive_consent,0);
    assert.equal(revoked.sensitive_consent_version,0);
    assert.equal(revoked.tradition,null);
    assert.equal(revoked.church,null);
    assert.equal(revoked.denomination,null);
    assert.equal(revoked.public_church,0);
  }finally{f.sqlite.close();}
});
test("legacy omitted consent defaults off for newly created profile",async()=>{
  const f=nativeSQLiteFixture();
  try{
    const res=await f.post(profile);
    assert.equal(res.status,200);
    const created=f.sqlite.prepare("SELECT sensitive_consent,sensitive_consent_version FROM profiles WHERE user_id='reader'").get();
    assert.equal(created.sensitive_consent,0);
    assert.equal(created.sensitive_consent_version,0);
  }finally{f.sqlite.close();}
});
