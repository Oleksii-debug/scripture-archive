import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source=readFileSync(new URL("../app/api/account/route.ts",import.meta.url),"utf8");
const catalog=JSON.parse(readFileSync(new URL("../public/data/catalog.json",import.meta.url),"utf8"));
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
assert.equal(compiled.diagnostics?.length??0,0);
function fixture(payload,opts={}){
  const calls={reads:0,owner:null};
  const db={prepare(){return {bind(owner){calls.owner=owner;return {async first(){
    calls.reads++;
    if(opts.failRead)throw Error("D1 unavailable");
    if(payload===undefined)return null;
    return {data:typeof payload==="string"?payload:JSON.stringify(payload)};
  }}}}}};
  const exports={};
  vm.runInNewContext(compiled.outputText,{exports,Request,Response,URL,
    require(spec){
      if(spec==="cloudflare:workers")return {env:{DB:opts.noDb?null:db}};
      if(spec==="../../../public/data/catalog.json")return {default:catalog};
      if(spec==="../../../content/mission-abraham.json")return {default:{tasks:[]}};
      if(spec==="../../../lib/auth")return {
        sameOrigin:()=>true,
        authenticateRequest:async()=>{
          if(opts.authDown)throw Error("auth unavailable");
          return opts.anonymous?null:{userId:"alice",email:"a@example.invalid",provider:"password",emailVerified:true,fullName:"Alice"};
        },
        isVerifiedOwner:()=>false,
      };
      throw Error("unexpected dependency "+spec);
    }});
  return {calls,async get(){
    const response=await exports.GET(new Request("https://example.invalid/api/account?action=reading"));
    return {status:response.status,body:await response.json(),cache:response.headers.get("cache-control")};
  }};
}
const one={book:"GEN",chapter:1,title:"Буття"};
const row=(book,chapter,title="Буття")=>({book,chapter,title});
function privateResponse(r){assert.match(r.cache,/no-store, private/);}

test("canonical reading history preserves order and all three fields",async()=>{
  const f=fixture([one,row("EXO",2,"Вихід")]);const r=await f.get();
  assert.equal(r.status,200);privateResponse(r);
  assert.deepEqual(r.body.reading,[one,row("EXO",2,"Вихід")]);
  assert.equal(f.calls.owner,"alice");assert.equal(f.calls.reads,1);
});
test("historic private metadata is never echoed to the browser",async()=>{
  const r=await fixture([{...one,otherPrincipal:"bob",secret:{token:"SECRET"},extra:"HIDDEN"}]).get();
  assert.equal(r.status,200);assert.deepEqual(r.body.reading,[one]);
  assert.doesNotMatch(JSON.stringify(r.body),/bob|SECRET|HIDDEN/);
});
test("legitimate 2000-entry boundary is accepted without truncation",async()=>{
  const r=await fixture(Array(2000).fill(one)).get();
  assert.equal(r.status,200);assert.equal(r.body.reading.length,2000);
});
for(const length of [2001,2002,4096]){
  test("oversized historical length "+length+" fails closed",async()=>{
    const r=await fixture(Array(length).fill(one)).get();
    assert.equal(r.status,503);privateResponse(r);assert.equal(r.body.error,"reading_state_unavailable");
    assert.equal("reading" in r.body,false);
  });
}
for(const chapter of [0,-1,51,1.5,null,"1",true,[],{}]){
  test("malformed chapter "+JSON.stringify(chapter),async()=>{
    const r=await fixture([row("GEN",chapter)]).get();
    assert.equal(r.status,503);privateResponse(r);
  });
}
for(const book of ["gen","ZZZ","GENX","GEN ","",null,1,[],{}]){
  test("malformed book "+JSON.stringify(book),async()=>{
    const r=await fixture([row(book,1)]).get();
    assert.equal(r.status,503);privateResponse(r);
  });
}
for(const title of [""," ",null,12,[],{}, "x".repeat(101)]){
  test("malformed title "+JSON.stringify(title).slice(0,25),async()=>{
    const r=await fixture([row("GEN",1,title)]).get();
    assert.equal(r.status,503);privateResponse(r);
  });
}
for(const bad of ["{bad",JSON.stringify({book:"GEN"}),JSON.stringify(null),JSON.stringify({reading:[one]})]){
  test("malformed stored JSON "+bad.slice(0,20),async()=>{
    const r=await fixture(bad).get();
    assert.equal(r.status,503);privateResponse(r);
  });
}
test("empty D1 array is a legitimate history",async()=>{
  const r=await fixture([]).get();assert.equal(r.status,200);assert.deepEqual(r.body,{reading:[]});
});
test("missing D1 record returns an empty reading history",async()=>{
  const r=await fixture(undefined).get();assert.equal(r.status,200);assert.deepEqual(r.body,{reading:[]});
});
test("D1 failure is never represented as empty history",async()=>{
  const r=await fixture([],{failRead:true}).get();assert.equal(r.status,503);assert.equal(r.body.error,"reading_state_unavailable");
});
test("missing D1 binding fails closed",async()=>{
  const r=await fixture([],{noDb:true}).get();assert.equal(r.status,503);assert.equal(r.body.error,"database_unavailable");
});
test("failed session authentication cannot read private history",async()=>{
  const f=fixture([one],{authDown:true});const r=await f.get();assert.equal(r.status,503);assert.equal(f.calls.reads,0);
});
test("anonymous browser never receives prior user's history",async()=>{
  const f=fixture([one],{anonymous:true});const r=await f.get();assert.equal(r.status,401);assert.equal(f.calls.reads,0);
});
