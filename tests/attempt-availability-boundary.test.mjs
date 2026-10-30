import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

// Real canonical route source is executed; auth/D1 are the only substitutes.
const source=readFileSync(new URL("../app/api/attempts/route.ts",import.meta.url),"utf8");
const compiled=ts.transpileModule(source,{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true},
  reportDiagnostics:true,
});
assert.equal(compiled.diagnostics?.length??0,0);

function fixture({database=true,auth="throw",query="ok"}={}) {
  const calls={auth:0,db:0};
  const DB={
    prepare(){
      calls.db++;
      if(query==="throw")throw Error("D1 query unavailable");
      return {
        bind(){return this;},
        async first(){
          if(query==="first-throw")throw Error("D1 query result unavailable");
          return null;
        },
        async all(){return {success:true,results:[]};},
        async run(){return {success:true,meta:{changes:1}};},
      };
    },
    async batch(){
      calls.db++;
      if(query==="throw")throw Error("D1 batch unavailable");
      return [{success:true,results:[]}];
    },
  };
  const exports={};
  vm.runInNewContext(compiled.outputText,{
    exports,Request,Response,URL,crypto,Date,
    require(specifier){
      if(specifier==="cloudflare:workers")return {env:{DB:database?DB:undefined}};
      if(specifier==="../../../content/mission-abraham.json")return {
        __esModule:true,default:{id:"OT-AB-01",title:{uk:"Початок",ru:"Начало",en:"Beginning"},intro:{},tasks:[]},
      };
      if(specifier==="../../../lib/auth")return {
        authenticateRequest:async()=>{calls.auth++;if(auth==="throw")throw Error("identity D1 unavailable");
          return auth==="anonymous"?null:{userId:"account-1",emailVerified:true,provider:"password"};
        },
        GUEST_COOKIE:"sa_guest",guestCookie:()=>"",parseCookies:()=>new Map(),
        randomToken:()=> "guest-fixture",sameOrigin:request=>request.headers.get("origin")===new URL(request.url).origin,
        sha256:async()=> "guest-fixture-hash",
      };
      throw Error("unknown import "+specifier);
    },
  });
  async function invoke(method,action,origin="https://archive.invalid"){
    const r=new Request("https://archive.invalid/api/attempts?action="+action,{
      method,headers:{Origin:origin,"Content-Type":"application/json"},
      ...(method==="POST"?{body:JSON.stringify({
        book:"GEN",chapter:12,missionId:"OT-AB-01",attemptId:"attempt-1",reason:"chapter_opened",
      })}:{}),
    });
    const response=await exports[method](r);
    return {status:response.status,payload:await response.json(),cache:response.headers.get("cache-control")};
  }
  return {invoke,calls};
}

for(const action of ["manifest","history","current"]){
  test("GET "+action+" makes an identity outage a private no-store 503, not an unhandled error",async()=>{
    const f=fixture();
    const r=await f.invoke("GET",action);
    assert.equal(r.status,503);
    assert.equal(r.payload.error,"database_unavailable");
    assert.match(r.cache,/no-store/);
    assert.equal(f.calls.auth,1);
    assert.equal(f.calls.db,0);
  });
}

for(const action of ["chapter","read","start","invalidate","finalize","answer"]){
  test("POST "+action+" does not treat failed identity as anonymous or incomplete assessment",async()=>{
    const f=fixture();
    const r=await f.invoke("POST",action);
    assert.equal(r.status,503);
    assert.equal(r.payload.error,"database_unavailable");
    assert.match(r.cache,/no-store/);
    assert.equal(f.calls.auth,1);
    assert.equal(f.calls.db,0);
  });
}

for(const method of ["GET","POST"]){
  test(method+" rejects missing D1 before authentication and never exposes task state",async()=>{
    const f=fixture({database:false});
    const r=await f.invoke(method,method==="GET"?"manifest":"chapter");
    assert.equal(r.status,503);
    assert.equal(r.payload.error,"database_unavailable");
    assert.equal(f.calls.auth,0);
  });
}

test("truly unsigned reader may read the public manifest without a false outage",async()=>{
  const f=fixture({auth:"anonymous"});
  const r=await f.invoke("GET","manifest");
  assert.equal(r.status,200);
  assert.equal(r.payload.id,"OT-AB-01");
  assert.equal(r.payload.taskCount,0);
});

test("truly unsigned reader has no active chapter attempt to invalidate",async()=>{
  const f=fixture({auth:"anonymous"});
  const r=await f.invoke("POST","chapter");
  assert.equal(r.status,200);
  assert.equal(r.payload.invalidated,false);
});

test("cross-origin POST remains 403 even if identity database is broken",async()=>{
  const f=fixture();
  const r=await f.invoke("POST","read","https://attacker.invalid");
  assert.equal(r.status,403);
  assert.equal(r.payload.error,"cross_origin_request");
  assert.equal(f.calls.auth,0);
});

test("unknown POST action retains a 400 and does not demand identity",async()=>{
  const f=fixture();
  const r=await f.invoke("POST","no-such-action");
  assert.equal(r.status,400);
  assert.equal(r.payload.error,"unknown_action");
  assert.equal(f.calls.auth,0);
});

test("failed D1 active-lock lookup cannot unlock a signed-in assessment manifest",async()=>{
  const f=fixture({auth:"ok",query:"first-throw"});
  const r=await f.invoke("GET","manifest");
  assert.equal(r.status,503);
  assert.equal(r.payload.error,"database_unavailable");
  assert.ok(!("locked" in r.payload));
});

test("failed D1 assessment history must not return a false empty history",async()=>{
  const f=fixture({auth:"ok",query:"throw"});
  const r=await f.invoke("GET","history");
  assert.equal(r.status,503);
  assert.equal(r.payload.error,"database_unavailable");
  assert.ok(!("attempts" in r.payload));
});
