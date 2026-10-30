import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import ts from "typescript";

// Execute the real canonical group GET route. Only the authenticated session,
// catalog import, and D1 query results are deterministic test substitutes.
const source = readFileSync(new URL("../app/api/groups/route.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true},
  reportDiagnostics:true,
});
assert.equal(compiled.diagnostics?.length??0,0);

const good = {
  id:"g",name:"Existing group",visibility:"public",roster_visibility:"count",
  member_activity_visibility:0,created_at:"2026-10-30",
  weekly_goal:3,catchup_mode:"steady",marathon_enabled:0,
  study_route:"abraham",bible_edition:"en-web",cohort_status:null,
  cohort_size:0,member_count:2,session_count:1,
  chapters_completed:1,answers_correct:1,answers_total:2,
};

function fixture(row = good) {
  let queries=0;
  const db={
    prepare(sql) {
      queries++;
      assert.match(sql,/FROM home_groups g/);
      const query = {
        bind(){return this;},
        async all(){return {success:true,results:[row]};},
      };
      return query;
    },
  };
  const exports={};
  vm.runInNewContext(compiled.outputText,{
    exports,Request,Response,URL,crypto,
    require(name){
      if(name==="cloudflare:workers")return {env:{DB:db}};
      if(name==="../../../public/data/catalog.json")
        return {__esModule:true,default:{books:{en:[{code:"GEN",chapters:50}]}}};
      if(name==="../../../lib/auth")return {
        authenticateRequest:async()=>({userId:"member-a",provider:"password"}),
        sameOrigin:()=>true,
      };
      throw Error("unexpected dependency "+name);
    },
  });
  return {
    async get(mine=false) {
      const response=await exports.GET(new Request(
        "https://fixture.invalid/api/groups"+(mine?"?mine=1":"")));
      return {response,data:await response.json()};
    },
    get queries(){return queries;},
  };
}

test("canonical group summary preserves genuine counts and study percentages",async()=>{
  for(const mine of [false,true]){
    const f=fixture();
    const {response,data}=await f.get(mine);
    assert.equal(response.status,200);
    assert.equal(data.groups.length,1);
    const group=data.groups[0];
    assert.equal(group.answersCorrect,1);
    assert.equal(group.answersTotal,2);
    assert.equal(group.chaptersCompleted,1);
    assert.equal(group.qualityPercent,50);
    assert.equal(group.correctPerChapter,1);
    assert.equal(group.memberCount,2);
    assert.equal(f.queries,1);
  }
});

for(const [field,value] of [
  ["answers_correct",null],["answers_correct",undefined],
  ["answers_correct","1"],["answers_correct",true],
  ["answers_correct",-1],["answers_correct",0.5],
  ["answers_correct",3],["answers_correct",Number.MAX_SAFE_INTEGER+1],
  ["answers_total",null],["answers_total",undefined],
  ["answers_total","2"],["answers_total",-1],
  ["answers_total",1.5],["answers_total",0],
  ["chapters_completed",null],["chapters_completed",undefined],
  ["chapters_completed","1"],["chapters_completed",-1],
  ["chapters_completed",1.5],
]){
  test("corrupt public and member group study metric fails closed: "+field+"="+String(value),async()=>{
    for(const mine of [false,true]){
      const f=fixture({...good,[field]:value});
      const {response,data}=await f.get(mine);
      assert.equal(response.status,503);
      assert.deepEqual(data,{error:"groups_unavailable"});
      assert.equal("groups" in data,false,"untrusted progress cannot be shown as a real report");
      assert.match(response.headers.get("cache-control"),/no-store, private/);
      assert.equal(f.queries,1);
    }
  });
}
