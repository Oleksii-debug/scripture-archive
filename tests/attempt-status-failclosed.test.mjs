import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Execute the actual canonical TypeScript API route against a local D1/auth
// substitute. A corrupt lifecycle state must not reveal an active task.
const source = readFileSync(new URL('../app/api/attempts/route.ts',import.meta.url),'utf8');
const compiled = ts.transpileModule(source,{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true},
  reportDiagnostics:true,
});
assert.equal(compiled.diagnostics?.length??0,0);

const task = {
  id:'first',book:'GEN',chapter:12,type:'single-choice',verses:[1],
  question:{uk:'PRIVATE TEST TASK',ru:'PRIVATE TEST TASK',en:'PRIVATE TEST TASK'},
  options:{uk:['A','B'],ru:['A','B'],en:['A','B']},
  correct:[0],success:{uk:'Explanation',ru:'Explanation',en:'Explanation'},
};

function fixture(status='active',{expires_at='2099-01-01',owned=true,dbAvailable=true}={}){
  let lookups=0;
  const attempt={
    id:'attempt-1',actor_id:'alice',mission_id:'OT-AB-01',
    book_id:'GEN',chapter:12,group_id:null,locale:'uk',
    task_limit:1,current_index:0,status,expires_at,
    result_json:JSON.stringify({score:1,total:1}),
  };
  const DB={
    prepare(sql){
      lookups++;
      assert.match(sql,/mission_attempts/);
      return {
        bind(...args){assert.equal(args[0],'attempt-1');assert.equal(args[1],'alice');return this;},
        async first(){return owned?attempt:null;}
      };
    }
  };
  const exports={};
  vm.runInNewContext(compiled.outputText,{
    exports,Request,Response,URL,Date,crypto,
    require(name){
      if(name==='cloudflare:workers') return {env:{DB:dbAvailable?DB:undefined}};
      if(name==='../../../content/mission-abraham.json') return {__esModule:true,default:{
        id:'OT-AB-01',title:{uk:'Mission'},intro:{},tasks:[task]}};
      if(name==='../../../lib/auth')return {
        authenticateRequest:async()=>({userId:'alice',provider:'password',emailVerified:true}),
        GUEST_COOKIE:'guest',guestCookie:()=>'',parseCookies:()=>new Map(),
        randomToken:()=>'',sameOrigin:()=>true,sha256:async()=> '',
      };
      throw Error('Unexpected dependency '+name);
    },
  });
  return {
    lookups:()=>lookups,
    async get(){
      const response=await exports.GET(new Request('https://archive.invalid/api/attempts?action=current&attemptId=attempt-1'));
      return {status:response.status,body:await response.json(),
        cache:response.headers.get('Cache-Control')};
    },
  };
}

for(const status of ['revoked','paused','suspended','expired','ARCHIVED','', 'active ']){
  test('GET refuses unknown stored lifecycle status '+JSON.stringify(status),async()=>{
    const result=await fixture(status).get();
    assert.equal(result.status,409);
    assert.equal(result.body.error,'attempt_state_invalid');
    assert.ok(!('task' in result.body));
    assert.doesNotMatch(JSON.stringify(result.body),/PRIVATE TEST TASK/);
    assert.match(result.cache,/no-store/);
  });
}

test('only explicitly active current attempt reveals current public task',async()=>{
  const result=await fixture('active').get();
  assert.equal(result.status,200);
  assert.equal(result.body.attemptId,'attempt-1');
  assert.equal(result.body.task.question,'PRIVATE TEST TASK');
  assert.ok(!('correct' in result.body.task));
});

test('invalidated is denied with its established dedicated code',async()=>{
  const result=await fixture('invalidated').get();
  assert.equal(result.status,409);
  assert.equal(result.body.error,'attempt_invalidated');
  assert.ok(!('task' in result.body));
});

test('grading remains private and recoverable',async()=>{
  const result=await fixture('grading').get();
  assert.equal(result.status,200);
  assert.equal(result.body.grading,true);
  assert.ok(!('task' in result.body));
});

test('completed stays a final result, not next task',async()=>{
  const result=await fixture('completed').get();
  assert.equal(result.status,200);
  assert.equal(result.body.completed,true);
  assert.deepEqual({...result.body.result},{score:1,total:1});
  assert.ok(!('task' in result.body));
});

test('expired active attempt remains expired and does not disclose task',async()=>{
  const result=await fixture('active',{expires_at:'2020-01-01'}).get();
  assert.equal(result.status,410);
  assert.equal(result.body.error,'attempt_expired');
  assert.ok(!('task' in result.body));
});

test('foreign or absent attempt returns not found without task',async()=>{
  const result=await fixture('active',{owned:false}).get();
  assert.equal(result.status,404);
  assert.equal(result.body.error,'attempt_not_found');
  assert.ok(!('task' in result.body));
});

test('database unavailability still has priority and does not expose task',async()=>{
  const result=await fixture('active',{dbAvailable:false}).get();
  assert.equal(result.status,503);
  assert.equal(result.body.error,'database_unavailable');
  assert.ok(!('task' in result.body));
});
