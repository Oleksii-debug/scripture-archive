import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

// Qualify the REAL canonical TypeScript route, not a duplicated mock of its guards.
const source=readFileSync(new URL("../app/api/attempts/route.ts",import.meta.url),"utf8");
const compiled=ts.transpileModule(source,{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,
},reportDiagnostics:true});
assert.equal(compiled.diagnostics?.length??0,0);

const makeTask=id=>({id,book:"GEN",chapter:12,type:"single",verses:[1],
  question:{uk:"Питання",ru:"Вопрос",en:"Question"},
  options:{uk:["Так","Ні"],ru:["Да","Нет"],en:["Yes","No"]},
  correct:[0],success:{uk:"Пояснення",ru:"Объяснение",en:"Explanation"}});
const mission={title:{uk:"Авраам",ru:"Авраам",en:"Abraham"},intro:{},tasks:[makeTask("t1"),makeTask("t2")]};

function scenario({action,mode="good",batchValues=null,expired=false}){
  const calls={run:0,batch:0,first:0};
  const attempt={id:"attempt-1",actor_id:"user-1",mission_id:"OT-AB-01",
    book_id:"GEN",chapter:12,group_id:null,locale:"uk",task_limit:2,
    current_index:0,status:"active",
    expires_at:expired?"2000-01-01T00:00:00Z":"2999-01-01T00:00:00Z",result_json:null};
  const receipt=n=>{
    if(n==="missing")return {success:true};
    if(n==="false")return {success:false,meta:{changes:1}};
    if(n==="string")return {success:true,meta:{changes:"1"}};
    if(n==="negative")return {success:true,meta:{changes:-1}};
    return {success:true,meta:{changes:n==="zero"?0:n==="multi"?2:1}};
  };
  const DB={
    prepare(sql){
      return {
        bind(){return this;},
        async first(){
          calls.first++;
          if(sql.includes("SELECT * FROM mission_attempts"))return attempt;
          if(sql.includes("chapter_read_receipts"))return {id:"receipt-1"};
          return null;
        },
        async all(){return {success:true,results:[]};},
        async run(){calls.run++;return receipt(mode);},
      };
    },
    async batch(statements){
      calls.batch++;
      const list=batchValues || (action==="start" ? ["good","zero","good"] : ["good","good"]);
      return list.map(receipt);
    },
  };
  const exports={};
  vm.runInNewContext(compiled.outputText,{
    exports,Request,Response,URL,crypto,Date,
    require(specifier){
      if(specifier==="cloudflare:workers")return {env:{DB}};
      if(specifier==="../../../content/mission-abraham.json")return {__esModule:true,default:mission};
      if(specifier==="../../../lib/auth")return {
        authenticateRequest:async()=>({userId:"user-1",emailVerified:true,provider:"password"}),
        GUEST_COOKIE:"sa_guest",guestCookie:()=>"",parseCookies:()=>new Map(),
        randomToken:()=>"testtoken",sha256:async()=>"hash",
        sameOrigin:request=>request.headers.get("origin")===new URL(request.url).origin,
      };
      throw Error("Unexpected import: "+specifier);
    },
  });
  async function invoke(){
    const request=new Request("https://archive.invalid/api/attempts?action="+action,{
      method:"POST",headers:{Origin:"https://archive.invalid","Content-Type":"application/json"},
      body:JSON.stringify({missionId:"OT-AB-01",book:"GEN",chapter:12,
        attemptId:"attempt-1",taskIndex:1,selected:[0],locale:"uk",reason:"chapter_opened"}),
    });
    const response=await exports.POST(request);
    return {status:response.status,body:await response.json(),cache:response.headers.get("cache-control")};
  }
  return {invoke,calls};
}

for(const mode of ["missing","false","string","negative"]){
  test("read does not call a missing/invalid D1 write a lack of facilitator permission: "+mode,async()=>{
    const h=scenario({action:"read",mode});
    const r=await h.invoke();
    assert.equal(r.status,503);
    assert.equal(r.body.error,"database_unavailable");
    assert.equal(h.calls.run,1);
    assert.match(r.cache,/no-store/);
  });
}
test("read preserves a confirmed zero-row rejection for a non-facilitator",async()=>{
  const r=await scenario({action:"read",mode:"zero"}).invoke();
  assert.equal(r.status,403);
  assert.equal(r.body.error,"group_facilitator_required");
});
test("read returns 201 only for an actual acknowledged receipt insertion",async()=>{
  const r=await scenario({action:"read"}).invoke();
  assert.equal(r.status,201);
  assert.equal(r.body.ok,true);
});

for(const values of [["missing","good"],["false","good"],["good","missing"],["good"]]){
  test("chapter invalidation fails closed on damaged D1 batch "+JSON.stringify(values),async()=>{
    const h=scenario({action:"chapter",batchValues:values});
    const r=await h.invoke();
    assert.equal(r.status,503);
    assert.equal(r.body.error,"database_unavailable");
  });
}
test("chapter returns truthful false on a fully acknowledged no-op",async()=>{
  const r=await scenario({action:"chapter",batchValues:["zero","zero"]}).invoke();
  assert.equal(r.status,200);
  assert.equal(r.body.invalidated,false);
});
test("chapter returns truthful true on a confirmed invalidation",async()=>{
  const r=await scenario({action:"chapter"}).invoke();
  assert.equal(r.status,200);
  assert.equal(r.body.invalidated,true);
});

for(const values of [["false","good","good"],["good","missing","good"],["good","good"],["missing","good","good"]]){
  test("start never reveals first assessment task after unconfirmed transaction "+JSON.stringify(values),async()=>{
    const r=await scenario({action:"start",batchValues:values}).invoke();
    assert.equal(r.status,503);
    assert.equal(r.body.error,"database_unavailable");
    assert.ok(!("task" in r.body));
  });
}
// D1's batch response may have valid receipt shapes but still contradict the
// transaction's one-insert/one-consumed-read invariant. Do not return a task.
for(const values of [
  ["good","zero","zero"], // attempt inserted; read receipt not consumed
  ["good","good","zero"], // even a previous-attempt invalidation cannot substitute
  ["good","zero","multi"], // impossible multiple read receipts consumed
  ["multi","zero","good"], // a one-row INSERT cannot acknowledge two rows
]){
  test("start refuses inconsistent confirmed D1 changes before first task "+JSON.stringify(values),async()=>{
    const r=await scenario({action:"start",batchValues:values}).invoke();
    assert.equal(r.status,503);
    assert.equal(r.body.error,"database_unavailable");
    assert.ok(!("task" in r.body));
    assert.ok(!("attemptId" in r.body));
    assert.match(r.cache,/no-store/);
  });
}

test("start recovery still accepts a new exactly acknowledged read receipt",async()=>{
  const rejected=await scenario({action:"start",batchValues:["good","zero","zero"]}).invoke();
  assert.equal(rejected.status,503);
  const recovered=await scenario({action:"start",batchValues:["good","zero","good"]}).invoke();
  assert.equal(recovered.status,201);
  assert.equal(recovered.body.task.index,1);
});

test("start preserves multiple valid previous-attempt invalidations",async()=>{
  const r=await scenario({action:"start",batchValues:["good","multi","good"]}).invoke();
  assert.equal(r.status,201);
  assert.equal(r.body.task.index,1);
});

test("start preserves chapter-not-read 409 for confirmed zero-row insertion",async()=>{
  const r=await scenario({action:"start",batchValues:["zero","zero","zero"]}).invoke();
  assert.equal(r.status,409);
  assert.equal(r.body.error,"chapter_must_be_read");
});
test("start acknowledges a fully confirmed three-statement transition",async()=>{
  const r=await scenario({action:"start"}).invoke();
  assert.equal(r.status,201);
  assert.match(r.body.attemptId,/^[0-9a-f-]{36}$/i);
  assert.equal(r.body.task.index,1);
});

for(const mode of ["missing","false","string","negative"]){
  test("invalidate does not acknowledge an uncertain write "+mode,async()=>{
    const r=await scenario({action:"invalidate",mode}).invoke();
    assert.equal(r.status,503);
    assert.equal(r.body.error,"database_unavailable");
  });
}
test("invalidate retains idempotent confirmed zero-change acknowledgement",async()=>{
  const r=await scenario({action:"invalidate",mode:"zero"}).invoke();
  assert.equal(r.status,200);
  assert.equal(r.body.ok,true);
});
test("expired attempt cannot return 410 as if invalidated when D1 write was not acknowledged",async()=>{
  const r=await scenario({action:"answer",mode:"missing",expired:true}).invoke();
  assert.equal(r.status,503);
  assert.equal(r.body.error,"database_unavailable");
});
test("expired attempt confirms a completed invalidation before 410",async()=>{
  const r=await scenario({action:"answer",expired:true}).invoke();
  assert.equal(r.status,410);
  assert.equal(r.body.error,"attempt_expired");
});

for(const values of [["good","missing"],["false","good"],["zero","good"],["good","good","good"]]){
  test("answer rejects unconfirmed or inconsistent atomic D1 results "+JSON.stringify(values),async()=>{
    const r=await scenario({action:"answer",batchValues:values}).invoke();
    assert.equal(r.status,503);
    assert.equal(r.body.error,"database_unavailable");
    assert.ok(!("accepted" in r.body));
  });
}
test("answer preserves stale current-index conflict for a confirmed zero-row cursor update",async()=>{
  const r=await scenario({action:"answer",batchValues:["zero","zero"]}).invoke();
  assert.equal(r.status,409);
  assert.equal(r.body.error,"attempt_changed");
});
test("answer returns the next task only when answer and cursor both acknowledged one row",async()=>{
  const r=await scenario({action:"answer",batchValues:["good","good"]}).invoke();
  assert.equal(r.status,200);
  assert.equal(r.body.accepted,true);
  assert.equal(r.body.task.index,2);
});
