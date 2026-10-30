import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

// The actual group POST handler is executed; only D1, auth and catalog are mocked.
const actual = readFileSync(new URL("../app/api/groups/route.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(actual, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  reportDiagnostics: true,
});
assert.equal(compiled.diagnostics?.length ?? 0, 0);

function harness({db=true,auth="ok",read="ok"}={}) {
  const calls={auth:0,prepare:0,first:0};
  const database={
    prepare() {
      calls.prepare++;
      if(read==="prepare-throw")throw Error("D1 unavailable");
      return {
        bind(){return this;},
        async first(){
          calls.first++;
          if(read==="first-throw")throw Error("D1 preflight failed");
          return null;
        },
      };
    },
  };
  const exports={};
  vm.runInNewContext(compiled.outputText,{
    exports,Request,Response,URL,crypto,
    require(specifier){
      if(specifier==="cloudflare:workers")return {env:{DB:db?database:undefined}};
      if(specifier==="../../../public/data/catalog.json")return {__esModule:true,default:{books:{en:[{code:"GEN",chapters:50}]}}};
      if(specifier==="../../../lib/auth")return {
        authenticateRequest:async()=>{
          calls.auth++;
          if(auth==="throw")throw Error("session store failed");
          return auth==="anonymous"?null:{userId:"member-one",provider:"password"};
        },
        sameOrigin:req=>req.headers.get("origin")===new URL(req.url).origin,
      };
      throw Error("unexpected dependency "+specifier);
    },
  });
  async function request(action="leave",origin="https://archive.invalid"){
    const req=new Request("https://archive.invalid/api/groups?action="+action,{
      method:"POST",headers:{Origin:origin,"Content-Type":"application/json"},
      body:JSON.stringify({groupId:"group-one"}),
    });
    const r=await exports.POST(req);
    return {status:r.status,data:await r.json(),cache:r.headers.get("cache-control")};
  }
  return {request,calls};
}

test("POST declines unavailable D1 before reading identity or mutating groups",async()=>{
  const h=harness({db:false,auth:"throw"});
  const r=await h.request();
  assert.equal(r.status,503);
  assert.equal(r.data.error,"database_unavailable");
  assert.match(r.cache,/no-store/);
  assert.equal(h.calls.auth,0);
  assert.equal(h.calls.prepare,0);
});

test("POST does not convert thrown account identity lookup into 500 or 401",async()=>{
  const h=harness({auth:"throw"});
  const r=await h.request();
  assert.equal(r.status,503);
  assert.equal(r.data.error,"database_unavailable");
  assert.match(r.cache,/no-store, private/);
  assert.equal(h.calls.auth,1);
  assert.equal(h.calls.prepare,0);
});

for(const mode of ["prepare-throw","first-throw"]){
  test("POST maps "+mode+" during membership preflight to private 503",async()=>{
    const h=harness({read:mode});
    const r=await h.request("leave");
    assert.equal(r.status,503);
    assert.equal(r.data.error,"database_unavailable");
    assert.match(r.cache,/no-store/);
    assert.equal(h.calls.auth,1);
  });
}

test("POST keeps true anonymous sessions as 401, never touching private groups",async()=>{
  const h=harness({auth:"anonymous"});
  const r=await h.request();
  assert.equal(r.status,401);
  assert.equal(r.data.error,"authentication_required");
  assert.equal(h.calls.prepare,0);
});

test("POST keeps missing group as 404 rather than assuming a database outage",async()=>{
  const h=harness();
  const r=await h.request("leave");
  assert.equal(r.status,404);
  assert.equal(r.data.error,"not_found");
  assert.equal(h.calls.first,1);
});

test("POST rejects non-origin caller before touching broken infrastructure",async()=>{
  const h=harness({db:false,auth:"throw"});
  const r=await h.request("leave","https://attacker.invalid");
  assert.equal(r.status,403);
  assert.equal(r.data.error,"cross_origin_request");
  assert.equal(h.calls.auth,0);
});

test("POST still validates confirmation before any invite rotation",async()=>{
  const h=harness();
  const r=await h.request("rotate-invite");
  assert.equal(r.status,400);
  assert.equal(r.data.error,"confirmation_required");
  assert.equal(h.calls.prepare,0);
});
