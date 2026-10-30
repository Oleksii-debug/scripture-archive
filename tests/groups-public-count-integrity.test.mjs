import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import ts from "typescript";

// Execute the canonical GET handler, not a reimplemented count validator.
// Authentication and read-only D1 responses are controlled fixture boundaries.
const source = readFileSync(new URL("../app/api/groups/route.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true},
  reportDiagnostics:true,
});
assert.equal(compiled.diagnostics?.length ?? 0, 0);

const good = {
  id:"g",name:"Group",visibility:"public",roster_visibility:"count",
  member_activity_visibility:0,created_at:"2026-10-30",
  weekly_goal:3,catchup_mode:"steady",marathon_enabled:0,
  study_route:"abraham",bible_edition:"en-web",cohort_status:null,
  cohort_size:2,member_count:3,session_count:1,
  chapters_completed:1,answers_correct:1,answers_total:2,
};

function fixture(row) {
  let queries=0;
  const db={
    prepare(sql) {
      queries++;
      assert.match(sql,/FROM home_groups g/);
      return {
        bind() {return this;},
        async all() {return {success:true,results:[row]};},
      };
    },
  };
  const exports={};
  vm.runInNewContext(compiled.outputText,{
    exports,Request,Response,URL,crypto,
    require(name) {
      if(name==="cloudflare:workers")return {env:{DB:db}};
      if(name==="../../../public/data/catalog.json")
        return {__esModule:true,default:{books:{en:[{code:"GEN",chapters:50}]}}};
      if(name==="../../../lib/auth")return {
        authenticateRequest:async()=>({userId:"reader-a",provider:"password"}),
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

for(const [label,row] of [
  ["normal counts",good],
  ["legitimate zeros",{...good,member_count:0,session_count:0,cohort_size:0,
    chapters_completed:0,answers_correct:0,answers_total:0}],
  ["private roster masking",{...good,roster_visibility:"private"}],
]){
  test("valid group count projection: "+label,async()=>{
    for(const mine of [false,true]){
      const f=fixture(row);
      const {response,data}=await f.get(mine);
      assert.equal(response.status,200,label);
      assert.equal(data.groups.length,1);
      const group=data.groups[0];
      assert.equal(group.memberCount,row.roster_visibility==="private"?null:row.member_count);
      assert.equal(group.sessionCount,row.session_count);
      assert.equal(group.cohortSize,row.cohort_size);
      assert.equal(group.chaptersCompleted,row.chapters_completed);
      assert.equal(group.answersCorrect,row.answers_correct);
      assert.equal(f.queries,1);
    }
  });
}

const malformed = [
  ["missing",undefined],["null",null],["negative",-1],["fraction",1.5],
  ["numeric text","2"],["boolean",true],["array",[2]],["object",{value:2}],
  ["unsafe integer",Number.MAX_SAFE_INTEGER+1],["NaN",NaN],["Infinity",Infinity],
];
for(const field of ["member_count","session_count","cohort_size"]){
  for(const [label,value] of malformed){
    test("malformed group "+field+" / "+label+" cannot invent public or member totals",async()=>{
      for(const mine of [false,true]){
        for(const privateRoster of [false,true]){
          const f=fixture({...good,[field]:value,
            roster_visibility:privateRoster?"private":"count"});
          const {response,data}=await f.get(mine);
          assert.equal(response.status,503,field+" / "+label);
          assert.deepEqual(data,{error:"groups_unavailable"});
          assert.equal("groups" in data,false);
          assert.match(response.headers.get("cache-control"),/no-store, private/);
          assert.equal(f.queries,1,"a malformed read must not retry or write");
        }
      }
    });
  }
}
test("existing score integrity remains fail-closed",async()=>{
  for(const mine of [false,true]){
    const f=fixture({...good,answers_correct:99});
    const {response,data}=await f.get(mine);
    assert.equal(response.status,503);
    assert.deepEqual(data,{error:"groups_unavailable"});
  }
});
