import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

// Execute the real canonical TypeScript handler, with only D1 receipts
// and authentication substituted. The separate audit test uses actual SQLite.
const source = readFileSync(new URL("../app/api/editor-roles/route.ts", import.meta.url), "utf8");
const built = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal(built.diagnostics?.length ?? 0, 0);

function harness({ auth = "owner", database = true, grantReceipt = {success:true,meta:{changes:1}},
  revokeReceipt = "valid" } = {}) {
  const calls = { auth:0, prepares:0, batches:0 };
  const grant = () => grantReceipt;
  const valid = () => [{success:true,meta:{changes:1}},{success:true,meta:{changes:1}}];
  const db = {
    prepare() {
      calls.prepares++;
      return {
        bind() {return this;},
        async first() {return {user_id:"editor"};},
        async all() {return {success:true,results:[]};},
        async run() {return grant();}
      };
    },
    async batch() {
      calls.batches++;
      if (revokeReceipt === "truncated") return valid().slice(0,1);
      if (revokeReceipt === "not-array") return null;
      const rows = valid();
      if (revokeReceipt === "missing") rows[1] = {success:true,meta:{}};
      if (revokeReceipt === "failed") rows[0] = {success:false,meta:{changes:1}};
      if (revokeReceipt === "negative") rows[1] = {success:true,meta:{changes:-1}};
      if (revokeReceipt === "text") rows[1] = {success:true,meta:{changes:"1"}};
      if (revokeReceipt === "zero") rows[1] = {success:true,meta:{changes:0}};
      return rows;
    }
  };
  const exports = {};
  vm.runInNewContext(built.outputText, {
    exports, Request, Response, URL,
    require(specifier) {
      if (specifier === "cloudflare:workers") return {env:{DB:database?db:null}};
      if (specifier.endsWith("/auth")) return {
        authenticateRequest:async()=>{
          calls.auth++;
          if (auth === "throw") throw Error("D1 session record unavailable");
          if (auth === "guest") return null;
          if (auth === "unverified") return {userId:"owner",email:"owner@example.invalid",emailVerified:false,provider:"password"};
          return {userId:"owner",email:"owner@example.invalid",emailVerified:true,provider:"password"};
        },
        isVerifiedOwner:identity=>Boolean(identity?.emailVerified&&identity?.userId==="owner"),
        OWNER_EMAIL:"owner@example.invalid",
        sameOrigin:request=>request.headers.get("origin")===new URL(request.url).origin,
      };
      throw Error("Unexpected module "+specifier);
    }
  });
  async function invoke(method, action = "revoke", origin = "https://archive.invalid") {
    const request = new Request("https://archive.invalid/api/editor-roles" +
      (method==="GET" ? "?view="+action : ""), {
      method, headers:{Origin:origin,"Content-Type":"application/json"},
      ...(method==="GET" ? {} : {body:JSON.stringify(
        action==="revoke" ? {action,userId:"editor"} : {action,email:"editor@example.invalid"}
      )}),
    });
    const response = await exports[method](request);
    return {status:response.status, data:await response.json(), cache:response.headers.get("cache-control")};
  }
  return {invoke,calls};
}

test("GET and POST return private 503 on an authentication-store exception, not a false guest/forbidden state",async()=>{
  for(const [method,action] of [["GET","me"],["GET","audit"],["POST","grant"],["POST","revoke"]]){
    const f=harness({auth:"throw"});
    const result=await f.invoke(method,action);
    assert.equal(result.status,503,method+" "+action);
    assert.equal(result.data.error,"database_unavailable");
    assert.match(result.cache,/no-store/);
    assert.equal(f.calls.prepares,0);
    assert.equal(f.calls.batches,0);
  }
});

test("actual unsigned and unverified sessions remain truthful, with original role protections",async()=>{
  const visitor=harness({auth:"guest"});
  assert.equal((await visitor.invoke("GET","me")).data.editor,false);
  assert.equal((await visitor.invoke("GET","audit")).status,403);
  assert.equal((await visitor.invoke("POST","revoke")).status,403);
  const unverified=harness({auth:"unverified"});
  assert.equal((await unverified.invoke("POST","grant")).status,403);
  assert.equal(unverified.calls.prepares,0);
  const owner=harness();
  assert.equal((await owner.invoke("GET","me")).data.owner,true);
  assert.deepEqual(JSON.parse(JSON.stringify((await owner.invoke("GET","audit")).data.events)),[]);
});

test("editor mutation refuses cross-origin caller even if the D1 and identity are broken",async()=>{
  const f=harness({auth:"throw",database:false});
  const response=await f.invoke("POST","revoke","https://attacker.invalid");
  assert.equal(response.status,403);
  assert.equal(response.data.error,"cross_origin_request");
  assert.equal(f.calls.auth,0);
});

test("a committed role revocation with lost, failed or invalid D1 receipt never returns success",async()=>{
  for(const mode of ["truncated","not-array","missing","failed","negative","text"]){
    const f=harness({revokeReceipt:mode});
    const response=await f.invoke("POST","revoke");
    assert.equal(response.status,503,mode);
    assert.equal(response.data.error,"database_unavailable");
    assert.equal(response.data.ok,undefined);
    assert.match(response.cache,/private/);
    assert.equal(f.calls.batches,1);
  }
});

test("confirmed D1 revocation succeeds; true zero-row result is not-found",async()=>{
  const correct=harness();
  assert.equal((await correct.invoke("POST","revoke")).status,200);
  const missing=harness({revokeReceipt:"zero"});
  const response=await missing.invoke("POST","revoke");
  assert.equal(response.status,404);
  assert.equal(response.data.error,"not_found");
});

test("a string-shaped D1 grant receipt is not an authenticated mutation acknowledgment",async()=>{
  const unknown=harness({grantReceipt:{success:true,meta:{changes:"1"}}});
  assert.equal((await unknown.invoke("POST","grant")).status,503);
  const valid=harness({grantReceipt:{success:true,meta:{changes:2}}});
  assert.equal((await valid.invoke("POST","grant")).status,200);
  const zero=harness({grantReceipt:{success:true,meta:{changes:0}}});
  assert.equal((await zero.invoke("POST","grant")).status,409);
});
