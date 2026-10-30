import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import ts from 'typescript';
import vm from 'node:vm';
import { missionHistoryMarkup } from '../public/workspace.js';

const mission=JSON.parse(readFileSync(new URL('../content/mission-abraham.json',import.meta.url),'utf8'));
const chapter=mission.tasks.filter(task=>task.book==='GEN'&&task.chapter===12);
function fixture() {
  const db=new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys=ON');
  db.exec(readFileSync(new URL('../drizzle/0001_home_groups.sql',import.meta.url),'utf8'));
  const attemptsSql=readFileSync(new URL('../drizzle/0004_accounts_attempts.sql',import.meta.url),'utf8');
  for(const table of ['mission_attempts','mission_attempt_answers']) {
    const sql=attemptsSql.match(new RegExp('CREATE TABLE `'+table+'` \\([\\s\\S]*?\\);'))?.[0];
    assert.ok(sql,table);db.exec(sql);
  }
  db.exec('CREATE TABLE progress (user_id TEXT NOT NULL,mission_id TEXT NOT NULL,data TEXT NOT NULL,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(user_id,mission_id))');
  db.exec("INSERT INTO home_groups(id,owner_user_id,name,invite_code) VALUES('g','alice','Group','invite'); INSERT INTO home_group_members(group_id,user_id,display_name,role) VALUES('g','alice','Alice','owner')");
  let failBatchAt=-1, failAnswerRead=false, afterAttemptRead=null;
  function statement(sql,args=[]) {
    return {sql,args,
      first:async()=>{const row=db.prepare(sql).get(...args)??null;if(sql.startsWith('SELECT * FROM mission_attempts')&&afterAttemptRead){const hook=afterAttemptRead;afterAttemptRead=null;hook();}return row;},
      all:async()=>failAnswerRead&&sql.startsWith('SELECT task_id,selected_json')?{success:false,results:[]}:{success:true,results:db.prepare(sql).all(...args)},
      run:async()=>{const r=db.prepare(sql).run(...args);return {success:true,meta:{changes:Number(r.changes)}};},
    };
  }
  const D1={prepare(sql){const s=statement(sql);return {...s,bind:(...args)=>statement(sql,args)};},
    async batch(statements){db.exec('BEGIN');try{const out=[];const finishing=statements.some(s=>s.sql.startsWith('UPDATE mission_attempts SET status=\'completed\''));for(const [i,s] of statements.entries()){
      if(finishing&&i===failBatchAt)throw Error('forced write failure');
      if(/^SELECT\b/i.test(s.sql))out.push({success:true,results:db.prepare(s.sql).all(...s.args)});
      else {const r=db.prepare(s.sql).run(...s.args);out.push({success:true,meta:{changes:Number(r.changes)}});}
    }db.exec('COMMIT');return out;}catch(e){db.exec('ROLLBACK');throw e;}}
  };
  const source=readFileSync(new URL('../app/api/attempts/route.ts',import.meta.url),'utf8');
  const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const exports={};vm.runInNewContext(js,{exports,Request,Response,URL,crypto,require(id){
    if(id==='cloudflare:workers')return {env:{DB:D1}};
    if(id.endsWith('mission-abraham.json'))return {default:mission};
    if(id.endsWith('/auth'))return {sameOrigin:r=>r.headers.get('origin')==='https://local.invalid',authenticateRequest:async r=>{const user=r.headers.get('x-user');return user?{userId:user,email:user+'@example.invalid',emailVerified:true,provider:user==='agent'?'agent':'password'}:null;},GUEST_COOKIE:'guest',parseCookies:()=>new Map(),guestCookie:()=>'',randomToken:()=>'',sha256:async()=>''};
    throw Error('unexpected import '+id);
  }});
  function seed(id,{user='alice',group=null,correct=true,status='grading'}={}) {
    db.prepare("INSERT INTO mission_attempts(id,actor_id,mission_id,book_id,chapter,group_id,locale,task_limit,current_index,status,expires_at) VALUES(?,?,'OT-AB-01','GEN',12,?,'en',?,?,?,datetime('now','+2 hours'))").run(id,user,group,chapter.length,status==='grading'?chapter.length:0,status);
    if(status==='grading')for(const task of chapter){const chosen=correct?task.correct:[(task.correct[0]+1)%task.options.en.length];const isCorrect=JSON.stringify([...chosen].sort())===JSON.stringify([...task.correct].sort());db.prepare('INSERT INTO mission_attempt_answers(attempt_id,task_id,selected_json,is_correct) VALUES(?,?,?,?)').run(id,task.id,JSON.stringify(chosen),Number(isCorrect));}
  }
  async function get(action,id='',user='alice'){const req=new Request(`https://local.invalid/api/attempts?action=${action}&attemptId=${id}`,{headers:user?{'x-user':user}:{}});const r=await exports.GET(req);return {status:r.status,data:await r.json()};}
  async function post(action,body,user='alice',origin='https://local.invalid'){const r=await exports.POST(new Request('https://local.invalid/api/attempts?action='+action,{method:'POST',headers:{origin,'content-type':'application/json',...(user?{'x-user':user}:{})},body:JSON.stringify(body)}));return {status:r.status,data:await r.json()};}
  return {db,seed,get,post,setFailBatch:n=>{failBatchAt=n;},setFailRead:v=>{failAnswerRead=v;},afterAttemptRead:fn=>{afterAttemptRead=fn;}};
}

test('failed finalization rolls back and concurrent retries save exactly one group report',async()=>{
  const f=fixture();try{
    f.seed('a',{group:'g'});
    assert.equal((await f.get('current','a')).data.grading,true);
    assert.equal((await f.post('finalize',{attemptId:'a'},'bob')).status,404);
    assert.equal((await f.post('finalize',{attemptId:'a'},'alice','https://other.invalid')).status,403);
    f.setFailRead(true);assert.equal((await f.post('finalize',{attemptId:'a'})).status,503);f.setFailRead(false);
    for(const failure of [1,2]) {
      f.setFailBatch(failure);assert.equal((await f.post('finalize',{attemptId:'a'})).status,503);
      assert.equal(f.db.prepare('SELECT count(*) n FROM progress').get().n,0);
      assert.equal(f.db.prepare('SELECT count(*) n FROM group_sessions').get().n,0);
      assert.equal(f.db.prepare("SELECT status FROM mission_attempts WHERE id='a'").get().status,'grading');
    }
    f.setFailBatch(-1);
    const results=await Promise.all([f.post('finalize',{attemptId:'a'}),f.post('finalize',{attemptId:'a'})]);
    assert.deepEqual(results.map(r=>r.status),[200,200]);assert.ok(results.every(r=>r.data.groupRecorded===true&&r.data.result.score===chapter.length));
    assert.equal(f.db.prepare('SELECT count(*) n FROM group_sessions').get().n,1);
    assert.equal(f.db.prepare('SELECT count(*) n FROM progress').get().n,1);
    assert.equal((await f.post('answer',{attemptId:'a',taskIndex:chapter.length,selected:[0]})).data.completed,true);
    assert.equal(f.db.prepare('SELECT count(*) n FROM group_sessions').get().n,1);
  }finally{f.db.close();}
});

test('missing, malformed, or inconsistent stored answers cannot become a fabricated result',async()=>{
  const f=fixture();try{
    f.seed('a');f.db.prepare('DELETE FROM mission_attempt_answers WHERE attempt_id=? AND task_id=?').run('a',chapter[0].id);
    assert.equal((await f.post('finalize',{attemptId:'a'})).status,503);
    f.db.prepare('INSERT INTO mission_attempt_answers(attempt_id,task_id,selected_json,is_correct) VALUES(?,?,?,?)').run('a',chapter[0].id,'[999]',1);
    assert.equal((await f.post('finalize',{attemptId:'a'})).status,503);
    f.db.prepare('UPDATE mission_attempt_answers SET selected_json=?,is_correct=? WHERE attempt_id=? AND task_id=?').run(JSON.stringify(chapter[0].correct),0,'a',chapter[0].id);
    assert.equal((await f.post('finalize',{attemptId:'a'})).status,503);
    assert.equal(f.db.prepare('SELECT count(*) n FROM progress').get().n,0);
  }finally{f.db.close();}
});

test('a final answer survives a grading read outage and succeeds when sent again',async()=>{
  const f=fixture();try{
    f.seed('a');f.db.prepare("UPDATE mission_attempts SET status='active',current_index=? WHERE id='a'").run(chapter.length-1);
    f.db.prepare('DELETE FROM mission_attempt_answers WHERE attempt_id=? AND task_id=?').run('a',chapter.at(-1).id);
    const answer={attemptId:'a',taskIndex:chapter.length,selected:chapter.at(-1).correct};
    f.setFailRead(true);assert.equal((await f.post('answer',answer)).status,503);
    assert.equal((await f.get('current','a')).data.grading,true);
    assert.equal(f.db.prepare("SELECT count(*) n FROM mission_attempt_answers WHERE attempt_id='a'").get().n,chapter.length);
    f.setFailRead(false);const recovered=await f.post('answer',answer);
    assert.equal(recovered.data.completed,true);assert.equal(recovered.data.result.score,chapter.length);
  }finally{f.db.close();}
});

test('an attempt that expires between read and write does not accept an answer',async()=>{
  const f=fixture();try{
    f.seed('a',{status:'active'});
    f.afterAttemptRead(()=>f.db.prepare("UPDATE mission_attempts SET expires_at=datetime('now','-1 minute') WHERE id='a'").run());
    const r=await f.post('answer',{attemptId:'a',taskIndex:1,selected:chapter[0].correct});
    assert.equal(r.status,409);assert.equal(f.db.prepare("SELECT count(*) n FROM mission_attempt_answers WHERE attempt_id='a'").get().n,0);
  }finally{f.db.close();}
});

test('recovering an old attempt never overwrites a newer completed result',async()=>{
  const f=fixture();try{
    f.seed('old',{correct:false});f.seed('new',{correct:true});
    assert.equal((await f.post('finalize',{attemptId:'new'})).data.result.score,chapter.length);
    assert.ok((await f.post('finalize',{attemptId:'old'})).data.result.score<chapter.length);
    const progress=JSON.parse(f.db.prepare('SELECT data FROM progress').get().data);
    assert.equal(progress.score,chapter.length);
  }finally{f.db.close();}
});

test('revoked membership does not write a group result and reports that fact',async()=>{
  const f=fixture();try{
    f.seed('a',{group:'g'});f.db.prepare('DELETE FROM home_group_members WHERE group_id=? AND user_id=?').run('g','alice');
    const result=await f.post('finalize',{attemptId:'a'});
    assert.equal(result.status,200);assert.equal(result.data.groupRecorded,false);
    assert.equal(f.db.prepare('SELECT count(*) n FROM group_sessions').get().n,0);
    assert.equal((await f.get('current','a')).data.groupRecorded,false);
  }finally{f.db.close();}
});

test('a stale invalidation cannot overwrite a completed attempt',async()=>{
  const f=fixture();try{
    f.seed('a',{status:'active'});
    f.afterAttemptRead(()=>f.db.prepare("UPDATE mission_attempts SET status='completed' WHERE id='a'").run());
    assert.equal((await f.post('invalidate',{attemptId:'a'})).status,200);
    assert.equal(f.db.prepare("SELECT status FROM mission_attempts WHERE id='a'").get().status,'completed');
  }finally{f.db.close();}
});

test('history is private, omits answers, and is hidden while an attempt is active',async()=>{
  const f=fixture();try{
    f.seed('a');f.seed('b',{user:'bob'});
    await f.post('finalize',{attemptId:'a'});await f.post('finalize',{attemptId:'b'},'bob');
    const result=await f.get('history');assert.equal(result.status,200);assert.deepEqual(result.data.attempts.map(x=>x.id),['a']);
    assert.deepEqual(Object.keys(result.data.attempts[0]).sort(),['book','chapter','completedAt','id','mode','score','total']);
    assert.equal(result.data.attempts[0].mode,'personal');
    assert.deepEqual((await f.get('history','','bob')).data.attempts.map(x=>x.id),['b']);
    assert.equal((await f.get('history','','')).status,401);assert.equal((await f.get('history','','agent')).status,401);
    f.seed('pending');assert.deepEqual((await f.get('history')).data.pending.map(x=>x.id),['pending']);
    assert.deepEqual((await f.get('history','','bob')).data.pending,[]);
    f.seed('active',{status:'active'});assert.deepEqual((await f.get('history')).data,{locked:true,attempts:[]});
  }finally{f.db.close();}
});

test('history markup rejects invalid book codes, escapes stored text and offers rereading only for mistakes',()=>{
  const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const malformed=missionHistoryMarkup({attempts:[{id:'a"',book:'<script>',chapter:12,score:1,total:2,completedAt:'<date>'},{id:'b',book:'GEN',chapter:13,score:2,total:2}]},'en',esc);
  assert.ok(!malformed.includes('<script>'));
  assert.ok(!malformed.includes('&lt;script&gt;'),'invalid book evidence must not be rendered as a valid history row');
  assert.match(malformed,/retry-mission-history/);
  assert.doesNotMatch(malformed,/href="/);
  const html=missionHistoryMarkup({attempts:[{id:'a"',book:'GEN',chapter:12,score:1,total:2,completedAt:'<date>'},{id:'b',book:'GEN',chapter:13,score:2,total:2}]},'en',esc);
  assert.ok(!html.includes('<date>'));
  assert.ok(html.includes('&lt;date&gt;'));
  assert.equal((html.match(/Read and try again/g)||[]).length,1);
  assert.ok(missionHistoryMarkup({error:true},'uk',esc).includes('retry-mission-history'));
  assert.ok(missionHistoryMarkup({attempts:[],pending:[{id:'pending',book:'GEN',chapter:12}]},'en',esc).includes('Finish saving the result: GEN 12'));
});


test('SA-EXT-02: nonnumeric answer indexes cannot be coerced into a graded answer',async()=>{
  const f=fixture();try{
    f.seed('type-guard',{status:'active'});
    for(const selected of [['0'],[false],[null],[' '],[{}],[0,'1']]){
      const reply=await f.post('answer',{attemptId:'type-guard',taskIndex:1,selected});
      assert.equal(reply.status,400,JSON.stringify(selected));
      assert.equal(reply.data.error,'invalid_answer');
      assert.equal(f.db.prepare("SELECT count(*) n FROM mission_attempt_answers WHERE attempt_id='type-guard'").get().n,0);
      assert.equal(f.db.prepare("SELECT current_index n FROM mission_attempts WHERE id='type-guard'").get().n,0);
    }
    for(const taskIndex of ['1',true,null,1.5,{}]) {
      const reply=await f.post('answer',{attemptId:'type-guard',taskIndex,selected:[0]});
      assert.equal(reply.status,400,JSON.stringify(taskIndex));
      assert.equal(reply.data.error,'invalid_answer');
      assert.equal(f.db.prepare("SELECT count(*) n FROM mission_attempt_answers WHERE attempt_id='type-guard'").get().n,0);
      assert.equal(f.db.prepare("SELECT current_index n FROM mission_attempts WHERE id='type-guard'").get().n,0);
    }
    const accepted=await f.post('answer',{attemptId:'type-guard',taskIndex:1,selected:[0]});
    assert.equal(accepted.status,200);
    assert.equal(f.db.prepare("SELECT count(*) n FROM mission_attempt_answers WHERE attempt_id='type-guard'").get().n,1);
  }finally{f.db.close();}
});
