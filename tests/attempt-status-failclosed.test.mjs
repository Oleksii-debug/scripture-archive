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

function fixture(status='active',{expires_at='2099-01-01',owned=true,dbAvailable=true,locale='uk'}={}){
  let lookups=0;
  const attempt={
    id:'attempt-1',actor_id:'alice',mission_id:'OT-AB-01',
    book_id:'GEN',chapter:12,group_id:null,locale,
    task_limit:1,current_index:0,status,expires_at,
    // Completed mock must model the canonical persisted score/total columns.
    score:1,total:1,
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
    async get(id='attempt-1'){
      const query=id===null?'':('&attemptId='+encodeURIComponent(String(id)));
      const response=await exports.GET(new Request('https://archive.invalid/api/attempts?action=current'+query));
      return {status:response.status,body:await response.json(),
        cache:response.headers.get('Cache-Control')};
    },
    async post(action,overrides={}){
      const response=await exports.POST(new Request('https://archive.invalid/api/attempts?action='+action,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({attemptId:'attempt-1',taskIndex:1,selected:[0],...overrides}),
      }));
      return {status:response.status,body:await response.json(),cache:response.headers.get('Cache-Control')};
    },
  };
}


// D1 is SQLite-affinity storage, not a runtime TypeScript Locale enum.
// A corrupt stored locale previously returned 200 with a question-less task
// (GET) or threw inside task.options[locale] during grading (POST).
for (const badLocale of [
  null, '', 'de', 'en-US', 'UK', [], ['en'], { locale: 'ru' },
  0, 1, true, false, ' uk', 'ru ', 'en\\u0000',
]) {
  test('GET rejects corrupt stored locale before disclosing task '+JSON.stringify(badLocale),async()=>{
    const h=fixture('active',{locale:badLocale}), result=await h.get();
    assert.equal(result.status,409);
    assert.equal(result.body.error,'attempt_state_invalid');
    assert.ok(!('task' in result.body));
    assert.match(result.cache,/no-store/);
    assert.equal(h.lookups(),1);
  });
  test('POST answer refuses corrupt stored locale before grading mutation '+JSON.stringify(badLocale),async()=>{
    const h=fixture('active',{locale:badLocale}), result=await h.post('answer');
    assert.equal(result.status,409);
    assert.equal(result.body.error,'attempt_state_invalid');
    assert.ok(!('accepted' in result.body));
    assert.match(result.cache,/no-store/);
    assert.equal(h.lookups(),1);
  });
  test('POST finalize refuses corrupt grading locale before grading mutation '+JSON.stringify(badLocale),async()=>{
    const h=fixture('grading',{locale:badLocale}), result=await h.post('finalize');
    assert.equal(result.status,409);
    assert.equal(result.body.error,'attempt_state_invalid');
    assert.ok(!('completed' in result.body));
    assert.match(result.cache,/no-store/);
    assert.equal(h.lookups(),1);
  });
}
for (const locale of ['uk','ru','en']) {
  test('all approved persisted locales still disclose a readable public task '+locale,async()=>{
    const result=await fixture('active',{locale}).get();
    assert.equal(result.status,200);
    assert.equal(result.body.task.question,'PRIVATE TEST TASK');
    assert.deepEqual(Array.from(result.body.task.options),['A','B']);
    assert.ok(!('correct' in result.body.task));
  });
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


// Execute the real canonical API with a known authorized attempt.
// Previously `clean(..., 80)` silently trimmed an ID such as " attempt-1 "
// into the actual saved ID. This disclosed and allowed changes to a different
// attempt than the caller supplied (even though it was the same principal).
// Reject malformed identity before any D1 lookup or mutation.
const badAttemptIds=[
  ['leading whitespace',' attempt-1'],
  ['trailing whitespace','attempt-1 '],
  ['line ending','attempt-1\\n'],
  ['tab','attempt-1\\t'],
  ['embedded NUL','attempt-1\\u0000'],
  ['overlength exact prefix','attempt-1'.padEnd(80,'x')+'extra'],
  ['slash','attempt-1/other'],
  ['dot','attempt-1.'],
  ['control character','attempt-1\\u007f'],
  ['zero-width joiner','attempt-1\\u200d'],
  ['Unicode lookalike','аttempt-1'],
  ['empty',''],
];
for (const [label,id] of badAttemptIds) {
  test('GET current refuses noncanonical attempt ID '+label,async()=>{
    const h=fixture('active');
    const response=await h.get(id);
    assert.equal(response.status,404,JSON.stringify(response.body));
    assert.equal(response.body.error,'attempt_not_found');
    assert.equal(h.lookups(),0,'malformed GET ID must not query D1');
    assert.ok(!('task' in response.body));
    assert.match(response.cache,/no-store/);
  });
  for (const action of ['invalidate','finalize','answer']) {
    test('POST '+action+' refuses noncanonical attempt ID '+label,async()=>{
      const h=fixture('active');
      const response=await h.post(action,{attemptId:id});
      assert.equal(response.status,404,JSON.stringify(response.body));
      assert.equal(response.body.error,'attempt_not_found');
      assert.equal(h.lookups(),0,'malformed POST ID must not touch D1');
      assert.ok(!('accepted' in response.body));
      assert.match(response.cache,/no-store/);
    });
  }
}
for (const [label,id] of [
  ['absent',undefined],['null',null],['number',42],
  ['array',['attempt-1']],['object',{id:'attempt-1'}],['boolean',true],
]) {
  for (const action of ['invalidate','finalize','answer']) {
    test('POST '+action+' rejects nonstring attempt ID '+label,async()=>{
      const h=fixture('active');
      const response=await h.post(action,{attemptId:id});
      assert.equal(response.status,404,JSON.stringify(response.body));
      assert.equal(response.body.error,'attempt_not_found');
      assert.equal(h.lookups(),0);
      assert.match(response.cache,/no-store/);
    });
  }
}
test('GET without attemptId refuses before any DB read',async()=>{
  const h=fixture('active'),r=await h.get(null);
  assert.equal(r.status,404);
  assert.equal(r.body.error,'attempt_not_found');
  assert.equal(h.lookups(),0);
});
