import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Execute the production TypeScript route with deterministic D1/auth stubs.
// A corrupt stored deadline may never make a live assessment available.
const source=readFileSync(new URL('../app/api/attempts/route.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true},
  reportDiagnostics:true,
});
assert.equal(compiled.diagnostics?.length??0,0);

const task={
  id:'first',book:'GEN',chapter:12,type:'single-choice',verses:[1],
  question:{uk:'SECRET TASK',ru:'SECRET TASK',en:'SECRET TASK'},
  options:{uk:['A','B'],ru:['A','B'],en:['A','B']},
  correct:[0],success:{uk:'Explanation',ru:'Explanation',en:'Explanation'},
};

function fixture(deadline){
  let reads=0,mutations=0;
  const attempt={
    id:'attempt-1',actor_id:'alice',mission_id:'OT-AB-01',book_id:'GEN',
    chapter:12,group_id:null,locale:'uk',task_limit:1,current_index:0,
    status:'active',expires_at:deadline,result_json:null,
  };
  const DB={
    prepare(sql){
      if (!sql.startsWith('SELECT * FROM mission_attempts WHERE')) {
        mutations++;
        throw Error('Unexpected mutation on malformed deadline');
      }
      return {
        bind(attemptId,actor){
          assert.equal(attemptId,'attempt-1');
          assert.equal(actor,'alice');
          return this;
        },
        async first(){reads++;return attempt;},
      };
    },
    async batch(){mutations++;throw Error('Unexpected database batch');},
  };
  const exports={};
  vm.runInNewContext(compiled.outputText,{
    exports,Request,Response,URL,Date,crypto,
    require(name){
      if(name==='cloudflare:workers')return {env:{DB}};
      if(name==='../../../content/mission-abraham.json')return {
        __esModule:true,default:{id:'OT-AB-01',title:{uk:'Mission'},intro:{},tasks:[task]},
      };
      if(name==='../../../lib/auth')return {
        authenticateRequest:async()=>({userId:'alice',provider:'password',emailVerified:true}),
        GUEST_COOKIE:'guest',guestCookie:()=>'',parseCookies:()=>new Map(),
        randomToken:()=>'',sameOrigin:()=>true,sha256:async()=> '',
      };
      throw Error('Unexpected route dependency '+name);
    },
  });
  async function responseResult(response){
    return {status:response.status,body:await response.json(),
      cache:response.headers.get('Cache-Control')};
  }
  return {
    reads:()=>reads,mutations:()=>mutations,
    async get(){
      return responseResult(await exports.GET(
        new Request('https://example.invalid/api/attempts?action=current&attemptId=attempt-1')));
    },
    async answer(){
      return responseResult(await exports.POST(
        new Request('https://example.invalid/api/attempts?action=answer',{
          method:'POST',headers:{'content-type':'application/json'},
          body:JSON.stringify({attemptId:'attempt-1',taskIndex:1,selected:[0]}),
        })));
    },
  };
}

for(const bad of ['bad-date','',null,0,{},'Infinity',' 2099-01-01','2099-01-01 ']){
  test('corrupt stored deadline cannot disclose a task or accept an answer: '+JSON.stringify(bad),async()=>{
    const route=fixture(bad);
    const get=await route.get();
    assert.equal(get.status,409);
    assert.equal(get.body.error,'attempt_state_invalid');
    assert.ok(!('task' in get.body));
    assert.doesNotMatch(JSON.stringify(get.body),/SECRET TASK/);
    assert.match(get.cache,/no-store/);
    const answer=await route.answer();
    assert.equal(answer.status,409);
    assert.equal(answer.body.error,'attempt_state_invalid');
    assert.ok(!('accepted' in answer.body));
    assert.equal(route.mutations(),0,'no D1 grading or write may follow invalid expiry');
    assert.equal(route.reads(),2);
  });
}

test('valid future deadline retains accessible active task, without revealing correct answer',async()=>{
  const route=fixture('2099-01-01');
  const get=await route.get();
  assert.equal(get.status,200);
  assert.equal(get.body.task.question,'SECRET TASK');
  assert.ok(!('correct' in get.body.task));
  assert.equal(route.mutations(),0);
});

test('expired but valid deadline remains the established HTTP 410, not invalid state',async()=>{
  const route=fixture('2020-01-01');
  const get=await route.get();
  assert.equal(get.status,410);
  assert.equal(get.body.error,'attempt_expired');
  assert.ok(!('task' in get.body));
  assert.equal(route.mutations(),0);
});

test('SQLite UTC datetime format remains a valid future attempt deadline',async()=>{
  const route=fixture('2099-01-01 12:15:30');
  const get=await route.get();
  assert.equal(get.status,200);
  assert.equal(get.body.task.question,'SECRET TASK');
});
