import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import vm from 'node:vm';
import ts from 'typescript';

// Execute the actual TypeScript community POST and all three production SQL
// statements, with the complete migration schema in a disposable SQLite DB.
const source=readFileSync(new URL('../app/api/community/route.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
  reportDiagnostics:true,
});
assert.equal(compiled.diagnostics?.length??0,0);
const RUN_ID='fixture-run';

function fixture({throwAuth=false,ackDamage=false,failedBatch=-1}={}) {
  const db=new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys=ON');
  const root=new URL('../drizzle/',import.meta.url);
  for(const file of readdirSync(root).filter(n=>/^\\d{4}_.+\\.sql$/.test(n)).sort())
    db.exec(readFileSync(new URL(file,root),'utf8'));
  db.prepare("INSERT INTO community_runs(id,status,control_version) VALUES(?,'running',4)").run(RUN_ID);
  db.prepare("INSERT INTO community_waves(id,run_id,label,starts_at,next_at,target_count,interval_pattern) VALUES(?,?,?,'2026-10-28','2026-10-28',1,'[120]')")
    .run('wave',RUN_ID,'Fixture');
  db.prepare("INSERT INTO community_members(id,run_id,wave_id,sequence_number,first_name,last_name,locale,country_code,persona,seed,joined_at) VALUES(?,?,?,1,'Study','Agent','uk','UA','active',17,'2026-10-28')")
    .run('member-a',RUN_ID,'wave');
  for(const hash of ['hash-active','hash-sibling'])
    db.prepare("INSERT INTO community_agent_sessions(token_hash,member_id,control_version,expires_at) VALUES(?,'member-a',4,datetime('now','+2 hours'))").run(hash);

  const state={batchCalls:0,authCalls:0,failAt:failedBatch,badAck:ackDamage};
  const statement=(sql,args=[])=>({
    sql,args,
    bind(...next){return statement(sql,next);},
    async first(){return db.prepare(sql).get(...args)??null;},
    async all(){return {success:true,results:db.prepare(sql).all(...args)};},
    async run(){const v=db.prepare(sql).run(...args);return {success:true,meta:{changes:Number(v.changes)}};},
  });
  const DB={
    prepare(sql){return statement(sql);},
    async batch(statements){
      state.batchCalls++;
      db.exec('BEGIN');
      try{
        const receipts=[];
        for(const [index,q] of statements.entries()){
          if(index===state.failAt)throw Error('induced storage outage');
          const result=db.prepare(q.sql).run(...q.args);
          receipts.push({success:true,meta:{changes:Number(result.changes)}});
        }
        db.exec('COMMIT');
        if(state.badAck)receipts[0]={success:true,meta:{}};
        return receipts;
      } catch(error){db.exec('ROLLBACK');throw error;}
    },
  };
  const exports={};
  vm.runInNewContext(compiled.outputText,{
    exports,Request,Response,URL,Date,crypto,
    require(path){
      if(path==='cloudflare:workers')return {env:{DB}};
      if(path==='../../../lib/auth')return {
        authenticateRequest:async()=>{state.authCalls++;if(throwAuth)throw Error('auth D1 temporarily offline');return {userId:'member-a',provider:'agent',emailVerified:true};},
        isVerifiedOwner:()=>false,
        parseCookies:request=>new Map([['sa_agent',request.headers.get('x-test-token')||'active-token']]),
        sha256:async value=>value==='active-token'?'hash-active':value==='sibling-token'?'hash-sibling':'digest:'+value,
        sameOrigin:request=>request.headers.get('origin')===new URL(request.url).origin,
        rateLimit:async()=>true,requestAddress:()=> 'fixture',
      };
      if(path==='../../../lib/community')return {COMMUNITY_RUN_ID:RUN_ID};
      if(path==='../../../lib/community-engine')return {
        advanceCommunity:async()=>{},communityOwnerState:async()=>({}),controlCommunity:async()=>({ok:false}),
        leaseCommunityAgents:async()=>({jobs:[]}),
      };
      throw Error('Unexpected community route dependency '+path);
    },
  });
  return {
    db,state,
    async finish(token='active-token',origin='https://local.invalid'){
      const response=await exports.POST(new Request('https://local.invalid/api/community',{
        method:'POST',headers:{Origin:origin,'Content-Type':'application/json','x-test-token':token},
        body:JSON.stringify({action:'finish'}),
      }));
      return {status:response.status,data:await response.json(),cache:response.headers.get('cache-control')};
    },
    session(hash='hash-active'){return db.prepare('SELECT revoked_at FROM community_agent_sessions WHERE token_hash=?').get(hash);},
    schedule(){return db.prepare("SELECT next_action_at FROM community_members WHERE id='member-a'").get().next_action_at;},
    logs(){return db.prepare("SELECT id,event_type FROM community_run_log WHERE run_id=? ORDER BY id").all(RUN_ID);},
    close(){db.close();},
  };
}

test('one agent finish revokes only its token and atomically schedules plus logs completion',async()=>{
  const f=fixture();
  try {
    const response=await f.finish();
    assert.equal(response.status,200,JSON.stringify(response.data));
    assert.deepEqual(response.data,{ok:true});
    assert.match(response.cache,/no-store/);
    assert.ok(f.session().revoked_at);
    assert.equal(f.session('hash-sibling').revoked_at,null,'other valid lease remains independent');
    const date=f.schedule();
    assert.match(date,/^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}$/);
    const hours=(Date.parse(date.replace(' ','T')+'Z')-Date.now())/3_600_000;
    assert.ok(hours>6 && hours<6.1,'schedule must honor active persona 6h and 17-second seed');
    assert.equal(f.logs().length,1);
    assert.deepEqual(f.logs()[0],{id:'digest:community-agent-finish:hash-active',event_type:'agent_session_completed'});
    assert.equal(f.state.batchCalls,1);
  } finally {f.close();}
});

test('stale concurrent duplicate finish cannot reschedule or duplicate the log',async()=>{
  const f=fixture();
  try {
    assert.equal((await f.finish()).status,200);
    const before=f.schedule(),log=f.logs();
    const again=await f.finish();
    assert.equal(again.status,409,JSON.stringify(again.data));
    assert.equal(again.data.error,'agent_session_not_active');
    assert.equal(f.schedule(),before);
    assert.deepEqual(f.logs(),log);
    const sibling=await f.finish('sibling-token');
    assert.equal(sibling.status,200,JSON.stringify(sibling.data));
    assert.ok(f.session('hash-sibling').revoked_at);
    assert.equal(f.logs().length,2,'each distinct valid session completes at most once');
  } finally {f.close();}
});

for(const failedAt of [0,1,2]) {
  test('storage failure in atomic batch step '+failedAt+' rolls back all three effects',async()=>{
    const f=fixture({failedBatch:failedAt});
    try {
      const result=await f.finish();
      assert.equal(result.status,503);
      assert.equal(result.data.error,'community_unavailable');
      assert.equal(f.session().revoked_at,null);
      assert.equal(f.schedule(),null);
      assert.deepEqual(f.logs(),[]);
      assert.equal(f.state.batchCalls,1);
    } finally {f.close();}
  });
}

test('missing D1 mutation acknowledgement never claims an accepted finish',async()=>{
  const f=fixture({ackDamage:true});
  try {
    const result=await f.finish();
    assert.equal(result.status,503);
    assert.equal(result.data.error,'community_unavailable');
    assert.equal(f.logs().length,1,'simulated ACK loss may follow a committed batch');
    assert.equal((await f.finish()).status,409,'retry after uncertain commit must not duplicate state');
    assert.equal(f.logs().length,1);
  } finally {f.close();}
});

for(const mode of ['paused','stale-version']) {
  test('stale '+mode+' control forbids agent completion and writes',async()=>{
    const f=fixture();
    try {
      if(mode==='paused')f.db.prepare("UPDATE community_runs SET status='paused' WHERE id=?").run(RUN_ID);
      else f.db.prepare("UPDATE community_runs SET control_version=control_version+1 WHERE id=?").run(RUN_ID);
      const outcome=await f.finish();
      assert.equal(outcome.status,409,JSON.stringify(outcome.data));
      assert.equal(f.session().revoked_at,null);
      assert.equal(f.schedule(),null);
      assert.deepEqual(f.logs(),[]);
    } finally {f.close();}
  });
}

test('corrupt saved seed refuses to consume a lease or invent an invalid future date',async()=>{
  const f=fixture();
  try {
    f.db.prepare("UPDATE community_members SET seed='not-number' WHERE id='member-a'").run();
    const result=await f.finish();
    assert.equal(result.status,409);
    assert.equal(result.data.error,'community_state_invalid');
    assert.equal(f.state.batchCalls,0);
    assert.equal(f.session().revoked_at,null);
  } finally {f.close();}
});

test('authentication storage exception becomes JSON 503 and no community mutation',async()=>{
  const f=fixture({throwAuth:true});
  try{
    const result=await f.finish();
    assert.equal(result.status,503);
    assert.equal(result.data.error,'community_unavailable');
    assert.match(result.cache,/no-store/);
    assert.equal(f.state.batchCalls,0);
    assert.equal(f.session().revoked_at,null);
  }finally{f.close();}
});

test('cross-origin finish is denied before authenticating and touching D1',async()=>{
  const f=fixture();
  try {
    const result=await f.finish('active-token','https://attacker.invalid');
    assert.equal(result.status,403);
    assert.equal(result.data.error,'cross_origin_request');
    assert.equal(f.state.authCalls,0);
    assert.equal(f.state.batchCalls,0);
  } finally {f.close();}
});
