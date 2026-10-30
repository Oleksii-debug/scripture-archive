import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import ts from 'typescript';
import vm from 'node:vm';
import { groupManagementMarkup } from '../public/workspace.js';

function fixture() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys=ON');
  const dir = new URL('../drizzle/', import.meta.url);
  for (const file of readdirSync(dir).filter(x=>x.endsWith('.sql')).sort()) db.exec(readFileSync(new URL(file,dir),'utf8'));
  for (const user of ['alice','bob','carol','outsider']) db.prepare("INSERT INTO profiles(user_id,email,first_name,last_name,age_range) VALUES(?,?,?,'Reader','adult')").run(user,user+'@example.invalid',user);
  db.exec(`INSERT INTO home_groups(id,owner_user_id,name,invite_code,visibility,bible_edition) VALUES('g','alice','Group','AABBCCDD','private','en-web'),('other','alice','Other','other','private','en-web');
    INSERT INTO home_group_members(group_id,user_id,display_name,role) VALUES('g','alice','Alice','owner'),('g','bob','Bob','member'),('g','carol','Carol','facilitator'),('other','alice','Alice','owner');
    INSERT INTO group_sessions(id,group_id,created_by,book_id,chapter,meeting_date,reflection) VALUES('s','g','alice','GEN',12,'2026-10-28','private discussion');`);
  let failure=-1, beforeBatch=null, beforeRun=null, corruptCreateReceipt=null, corruptSingleReceipt=null, afterBatch=null, afterRun=null;
  function statement(sql,args=[]) {return {sql,args,
    first:async()=>db.prepare(sql).get(...args)??null,
    all:async()=>({success:true,results:db.prepare(sql).all(...args)}),
    run:async()=>{if(beforeRun){const hook=beforeRun;beforeRun=null;hook();}const receipt={success:true,meta:{changes:Number(db.prepare(sql).run(...args).changes)}};const mode=corruptSingleReceipt;corruptSingleReceipt=null;if(afterRun){const hook=afterRun;afterRun=null;return hook(receipt);}if(mode==='missing')return {success:true,meta:{}};if(mode==='failed')return {success:false,meta:{changes:receipt.meta.changes}};return receipt;},
  };}
  const D1={prepare(sql){return {...statement(sql),bind:(...args)=>statement(sql,args)};},async batch(statements){
    if(beforeBatch){const hook=beforeBatch;beforeBatch=null;hook();}
    db.exec('BEGIN');try{const out=[];for(const [i,s] of statements.entries()) {
      if(i===failure)throw Error('injected storage outage');
      const r=db.prepare(s.sql).run(...s.args);out.push({success:true,meta:{changes:Number(r.changes)}});
    }db.exec('COMMIT');
    const mode=corruptCreateReceipt;corruptCreateReceipt=null;
    if(mode==='missing-first')out[0]={...out[0],meta:{}};
    if(mode==='failed-second')out[1]={...out[1],success:false};
    if(mode==='truncated')out.pop();
    if(afterBatch){const hook=afterBatch;afterBatch=null;return hook(out);}return out;}catch(e){db.exec('ROLLBACK');throw e;}
  }};
  function loadRoute(name) {
    const source=readFileSync(new URL(`../app/api/${name}/route.ts`,import.meta.url),'utf8');
    const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
    const exports={};vm.runInNewContext(js,{exports,Request,Response,URL,crypto,require(id){
      if(id==='cloudflare:workers')return {env:{DB:D1}};
      if(id.endsWith('catalog.json'))return {default:JSON.parse(readFileSync(new URL('../public/data/catalog.json',import.meta.url),'utf8'))};
      if(id.endsWith('mission-abraham.json'))return {default:JSON.parse(readFileSync(new URL('../content/mission-abraham.json',import.meta.url),'utf8'))};
      if(id.endsWith('/auth'))return {sameOrigin:r=>r.headers.get('origin')==='https://local.invalid',authenticateRequest:async r=>{const user=r.headers.get('x-user');return user?{userId:user,emailVerified:true,provider:'password'}:null;}};
      throw Error('unexpected import '+id);
    }});return exports;
  }
  const exports=loadRoute('groups'),attempts=loadRoute('attempts');
  async function attempt(action,body={},user='carol') {const r=await attempts.POST(new Request('https://local.invalid/api/attempts?action='+action,{method:'POST',headers:{origin:'https://local.invalid','content-type':'application/json','x-user':user},body:JSON.stringify({missionId:'OT-AB-01',book:'GEN',chapter:12,groupId:'g',locale:'en',...body})}));return {status:r.status,data:await r.json()};}
  async function get(user='alice',groupId='g'){const r=await exports.GET(new Request('https://local.invalid/api/groups?groupId='+groupId,{headers:user?{'x-user':user}:{}}));return {status:r.status,data:await r.json()};}
  async function post(action,body={},user='alice',origin='https://local.invalid') {const r=await exports.POST(new Request('https://local.invalid/api/groups?action='+action,{method:'POST',headers:{origin,'content-type':'application/json',...(user?{'x-user':user}:{})},body:JSON.stringify({groupId:'g',...body})}));return {status:r.status,data:await r.json()};}
  function seedAttempt(id,user,group,status='active') {
    db.prepare("INSERT INTO mission_attempts(id,actor_id,mission_id,book_id,chapter,group_id,locale,task_limit,status,expires_at) VALUES(?,?,'OT-AB-01','GEN',12,?,'en',5,?,datetime('now','+2 hours'))").run(id,user,group,status);
    db.prepare("INSERT INTO chapter_read_receipts(id,actor_id,book_id,chapter,group_id) VALUES(?,?,'GEN',12,?)").run(id,user,group);
  }
  return {db,get,post,attempt,seedAttempt,beforeRun:fn=>{beforeRun=fn;},setFailure:n=>{failure=n;},beforeBatch:fn=>{beforeBatch=fn;},setCreateReceiptMode:mode=>{corruptCreateReceipt=mode;},setSingleReceiptMode:mode=>{corruptSingleReceipt=mode;},afterBatch:fn=>{afterBatch=fn;},afterRun:fn=>{afterRun=fn;}};
}
const owner=f=>f.db.prepare("SELECT owner_user_id FROM home_groups WHERE id='g'").get().owner_user_id;
const roles=f=>f.db.prepare("SELECT user_id,role FROM home_group_members WHERE group_id='g' ORDER BY user_id").all().map(x=>[x.user_id,x.role]);

test('private transfer roster is visible only to owner; ownership cannot be abandoned',async()=>{
  const f=fixture();try {
    assert.deepEqual((await f.get()).data.managementMembers.map(m=>m.user_id),['alice','bob','carol']);
    for(const user of ['bob','carol'])assert.deepEqual((await f.get(user)).data.managementMembers,[]);
    assert.equal((await f.get('outsider')).status,404);assert.equal((await f.get('')).status,404);
    assert.equal((await f.post('leave')).data.error,'owner_transfer_required');
    assert.equal(owner(f),'alice');
    for(const action of ['leave','transfer','delete']) {
      assert.equal((await f.post(action,{targetUserId:'bob',confirm:true},'')).status,401);
      assert.equal((await f.post(action,{targetUserId:'bob',confirm:true},'alice','https://evil.invalid')).status,403);
    }
    f.db.exec("UPDATE home_groups SET visibility='public' WHERE id='g'");
    const publicView=await f.get('outsider');assert.equal(publicView.status,200);
    assert.deepEqual(publicView.data.managementMembers,[]);assert.equal(publicView.data.sessions[0].reflection,null);assert.equal(publicView.data.group.inviteCode,undefined);
  } finally {f.db.close();}
});

test('transfer changes both roles atomically, and rejected or concurrent requests cannot steal ownership',async()=>{
  const f=fixture();try {
    for(const user of ['bob','carol','outsider'])assert.equal((await f.post('transfer',{targetUserId:'bob'},user)).status,user==='bob'?400:409);
    assert.equal((await f.post('transfer',{targetUserId:'outsider'})).status,409);
    assert.equal((await f.post('transfer',{targetUserId:'alice'})).status,400);
    f.setFailure(1);assert.equal((await f.post('transfer',{targetUserId:'bob'})).status,503);
    assert.equal(owner(f),'alice');assert.deepEqual(roles(f),[['alice','owner'],['bob','member'],['carol','facilitator']]);
    f.setFailure(-1);
    const both=await Promise.all([f.post('transfer',{targetUserId:'bob'}),f.post('transfer',{targetUserId:'carol'})]);
    assert.deepEqual(both.map(x=>x.status).sort(),[200,409]);assert.equal(owner(f),'bob');
    assert.deepEqual(roles(f),[['alice','member'],['bob','owner'],['carol','facilitator']]);
    assert.equal((await f.post('delete',{confirm:true})).status,403);
    assert.equal((await f.post('transfer',{targetUserId:'bob'})).status,409);
    assert.equal((await f.post('leave')).status,200);assert.equal((await f.get('alice')).status,404);
    assert.equal((await f.get('bob')).data.membership,'owner');
  } finally {f.db.close();}
});

test('transfer cannot promote a member who left before the transaction',async()=>{
  const f=fixture();try {
    f.beforeBatch(()=>f.db.exec("DELETE FROM home_group_members WHERE group_id='g' AND user_id='bob'"));
    assert.equal((await f.post('transfer',{targetUserId:'bob'})).status,409);
    assert.equal(owner(f),'alice');assert.deepEqual(roles(f),[['alice','owner'],['carol','facilitator']]);
  } finally {f.db.close();}
});

test('leaving revokes group access and active work, keeps personal history and rolls back on failure',async()=>{
  const f=fixture();try {
    f.seedAttempt('active','bob','g');f.seedAttempt('personal','bob',null);f.seedAttempt('complete','bob','g','completed');f.seedAttempt('pending','bob','g','grading');f.seedAttempt('other','carol','g');
    for(const failure of [1,2]){
      f.setFailure(failure);assert.equal((await f.post('leave',{},'bob')).status,503);
      assert.equal((await f.get('bob')).status,200);assert.equal(f.db.prepare("SELECT status FROM mission_attempts WHERE id='active'").get().status,'active');
      assert.equal(f.db.prepare("SELECT consumed_at FROM chapter_read_receipts WHERE id='active'").get().consumed_at,null);
    }
    f.setFailure(-1);f.db.exec("DELETE FROM profiles WHERE user_id='bob'");
    assert.equal((await f.post('leave',{},'bob')).status,200);
    assert.equal((await f.get('bob')).status,404);assert.equal((await f.post('leave',{},'bob')).status,404);
    assert.equal(f.db.prepare("SELECT status FROM mission_attempts WHERE id='active'").get().status,'invalidated');
    for(const [id,status] of [['personal','active'],['complete','completed'],['pending','grading'],['other','active']])assert.equal(f.db.prepare('SELECT status FROM mission_attempts WHERE id=?').get(id).status,status);
    assert.ok(f.db.prepare("SELECT consumed_at FROM chapter_read_receipts WHERE id='active'").get().consumed_at);
    assert.equal(f.db.prepare("SELECT consumed_at FROM chapter_read_receipts WHERE id='personal'").get().consumed_at,null);
    assert.equal(f.db.prepare("SELECT count(*) n FROM group_sessions WHERE group_id='g'").get().n,1);
  } finally {f.db.close();}
});

test('stale facilitator session permission is checked again inside the transaction',async()=>{
  const f=fixture();try {
    const payload={bookId:'GEN',chapter:12,answersCorrect:0,answersTotal:0,meetingDate:'2026-10-28'};
    f.setFailure(1);assert.equal((await f.post('session',payload,'carol')).status,503);
    assert.equal(f.db.prepare('SELECT count(*) n FROM group_sessions').get().n,1);f.setFailure(-1);
    f.beforeBatch(()=>f.db.exec("DELETE FROM home_group_members WHERE group_id='g' AND user_id='carol'"));
    assert.equal((await f.post('session',payload,'carol')).status,403);
    assert.equal(f.db.prepare('SELECT count(*) n FROM group_sessions').get().n,1);
  } finally {f.db.close();}
});

test('confirmed owner deletion cascades group records, preserves personal results, and rolls back on outage',async()=>{
  const f=fixture();try {
    f.db.exec("INSERT INTO group_answers(group_id,task_id,solved,first_correct) VALUES('g','task',1,1); INSERT INTO group_marathon_registrations(id,group_id,weekly_goal,catchup_mode,cohort_key) VALUES('m','g',3,'flexible','cohort')");
    f.seedAttempt('a','bob','g');f.seedAttempt('c','bob','g','completed');f.seedAttempt('p','bob',null);
    assert.equal((await f.post('delete')).status,400);
    for(const user of ['bob','carol','outsider'])assert.equal((await f.post('delete',{confirm:true},user)).status,403);
    for(const failure of [1,2]) {
      f.setFailure(failure);assert.equal((await f.post('delete',{confirm:true})).status,503);
      assert.equal(owner(f),'alice');assert.equal(f.db.prepare("SELECT status FROM mission_attempts WHERE id='a'").get().status,'active');
    }
    f.setFailure(-1);assert.equal((await f.post('delete',{confirm:true})).status,200);
    assert.equal((await f.get()).status,404);
    for(const table of ['home_group_members','group_sessions','group_answers','group_marathon_registrations'])assert.equal(f.db.prepare(`SELECT count(*) n FROM ${table} WHERE group_id='g'`).get().n,0);
    assert.equal(f.db.prepare("SELECT status FROM mission_attempts WHERE id='a'").get().status,'invalidated');
    assert.equal(f.db.prepare("SELECT status FROM mission_attempts WHERE id='c'").get().status,'completed');
    assert.equal(f.db.prepare("SELECT status FROM mission_attempts WHERE id='p'").get().status,'active');
    assert.equal((await f.get('alice','other')).status,200);
  } finally {f.db.close();}
});

test('membership controls use labelled native inputs and escape member names and identifiers',()=>{
  const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  for(const lang of ['uk','ru','en']) {
    assert.equal(groupManagementMarkup({},lang,esc),'');
    const member=groupManagementMarkup({membership:'member'},lang,esc);assert.ok(member.includes('leave-group'));assert.ok(!member.includes('delete-group'));
    const owner=groupManagementMarkup({membership:'owner',managementMembers:[{user_id:'a"',display_name:'<script>',role:'member'},{user_id:'owner',display_name:'Owner',role:'owner'}]},lang,esc);
    assert.ok(owner.includes('value="a&quot;"'));assert.ok(owner.includes('&lt;script&gt;'));assert.ok(!owner.includes('<script>'));assert.ok(!owner.includes('value="owner"'));
    assert.ok(owner.includes('<label'));assert.ok(owner.includes('role="status"'));assert.ok(owner.includes('delete-group'));assert.ok(!owner.includes('leave-group'));
  }
});

test('only an owner can change facilitator roles and stale edits cannot overwrite current roles',async()=>{
  const f=fixture();try {
    const promote={targetUserId:'bob',expectedRole:'member',role:'facilitator'};
    for(const user of ['bob','carol','outsider'])assert.equal((await f.post('role',promote,user)).status,user==='bob'?400:409);
    assert.equal((await f.post('role',{...promote,role:'owner'})).status,400);
    assert.equal((await f.post('role',{targetUserId:'alice',expectedRole:'owner',role:'member'})).status,400);
    const both=await Promise.all([f.post('role',promote),f.post('role',promote)]);
    assert.deepEqual(both.map(x=>x.status).sort(),[200,409]);
    assert.equal((await f.get('bob')).data.membership,'facilitator');
    assert.equal((await f.attempt('read',{},'bob')).status,201);
    const attempt=await f.attempt('start',{},'bob');assert.equal(attempt.status,201);
    assert.equal((await f.post('role',{targetUserId:'bob',expectedRole:'facilitator',role:'member'})).status,200);
    assert.equal((await f.get('bob')).status,200);
    assert.equal(f.db.prepare('SELECT status FROM mission_attempts WHERE id=?').get(attempt.data.attemptId).status,'invalidated');
    assert.equal((await f.attempt('read',{},'bob')).status,403);
  } finally {f.db.close();}
});

test('demotion revokes only that group activity and rolls back every write on an outage',async()=>{
  const f=fixture();try {
    f.seedAttempt('a','carol','g');f.seedAttempt('p','carol',null);f.seedAttempt('c','carol','g','completed');f.seedAttempt('pending','carol','g','grading');
    const demote={targetUserId:'carol',expectedRole:'facilitator',role:'member'};
    for(const failure of [1,2]){
      f.setFailure(failure);assert.equal((await f.post('role',demote)).status,503);
      assert.equal((await f.get('carol')).data.membership,'facilitator');
      assert.equal(f.db.prepare("SELECT status FROM mission_attempts WHERE id='a'").get().status,'active');
      assert.equal(f.db.prepare("SELECT consumed_at FROM chapter_read_receipts WHERE id='a'").get().consumed_at,null);
    }
    f.setFailure(-1);assert.equal((await f.post('role',demote)).status,200);
    for(const [id,status] of [['a','invalidated'],['p','active'],['c','completed'],['pending','grading']])assert.equal(f.db.prepare('SELECT status FROM mission_attempts WHERE id=?').get(id).status,status);
    assert.ok(f.db.prepare("SELECT consumed_at FROM chapter_read_receipts WHERE id='a'").get().consumed_at);
    assert.equal(f.db.prepare("SELECT consumed_at FROM chapter_read_receipts WHERE id='p'").get().consumed_at,null);
  } finally {f.db.close();}
});

test('facilitator reads and mission starts recheck the role at mutation time',async()=>{
  const f=fixture();try {
    f.beforeRun(()=>f.db.exec("UPDATE home_group_members SET role='member' WHERE group_id='g' AND user_id='carol'"));
    assert.equal((await f.attempt('read')).status,403);
    assert.equal(f.db.prepare('SELECT count(*) n FROM chapter_read_receipts').get().n,0);
    f.db.exec("UPDATE home_group_members SET role='facilitator' WHERE group_id='g' AND user_id='carol'");
    assert.equal((await f.attempt('read')).status,201);
    f.beforeBatch(()=>f.db.exec("UPDATE home_group_members SET role='member' WHERE group_id='g' AND user_id='carol'"));
    assert.equal((await f.attempt('start')).status,409);
    assert.equal(f.db.prepare('SELECT count(*) n FROM mission_attempts').get().n,0);
  } finally {f.db.close();}
});

test('rotation requires current ownership and confirmation, preserves members and invalidates the old code',async()=>{
  const f=fixture();try {
    const payload={expectedInviteCode:'AABBCCDD',confirm:true};
    assert.equal((await f.post('rotate-invite',{expectedInviteCode:'AABBCCDD'})).status,400);
    for(const user of ['bob','carol','outsider'])assert.equal((await f.post('rotate-invite',payload,user)).status,409);
    const rotated=await f.post('rotate-invite',payload);assert.equal(rotated.status,200);assert.match(rotated.data.inviteCode,/^[A-F0-9]{32}$/);
    assert.equal((await f.post('rotate-invite',payload)).status,409);
    assert.equal((await f.get('bob')).status,200);
    assert.equal((await f.post('join',{inviteCode:'AABBCCDD'},'outsider')).status,404);
    assert.equal((await f.post('join',{inviteCode:rotated.data.inviteCode+'A'},'outsider')).status,404);
    assert.equal((await f.post('join',{inviteCode:rotated.data.inviteCode.toLowerCase()},'outsider')).status,200);
    assert.equal((await f.get('outsider')).data.membership,'member');
    assert.equal((await f.post('join',{inviteCode:rotated.data.inviteCode},'outsider')).status,200);
    assert.equal(roles(f).filter(([id])=>id==='outsider').length,1);
    f.db.exec("DELETE FROM home_group_members WHERE group_id='g' AND user_id='outsider'; UPDATE home_groups SET invite_code='AABBCCDD' WHERE id='g'");
    assert.equal((await f.post('join',{inviteCode:'AABBCCDD'},'outsider')).status,200,'legacy eight-character codes remain usable until rotated');
  } finally {f.db.close();}
});

test('a join already in flight cannot use a code revoked before insertion',async()=>{
  const f=fixture();try {
    f.beforeRun(()=>f.db.exec("UPDATE home_groups SET invite_code='11223344' WHERE id='g'"));
    assert.equal((await f.post('join',{inviteCode:'AABBCCDD'},'outsider')).status,404);
    assert.equal((await f.get('outsider')).status,404);
  } finally {f.db.close();}
});

test('a former owner cannot start a marathon after ownership changed during the request',async()=>{
  const f=fixture();try {
    f.db.exec("INSERT INTO group_marathon_registrations(id,group_id,weekly_goal,catchup_mode,cohort_key,status) VALUES('m','g',3,'flexible','cohort','ready')");
    f.beforeRun(()=>f.db.exec("UPDATE home_groups SET owner_user_id='bob' WHERE id='g'; UPDATE home_group_members SET role=CASE WHEN user_id='bob' THEN 'owner' ELSE 'member' END WHERE group_id='g' AND user_id IN ('alice','bob')"));
    assert.equal((await f.post('start')).status,409);
    assert.equal(f.db.prepare("SELECT status FROM group_marathon_registrations WHERE id='m'").get().status,'ready');
    assert.equal((await f.post('start',{},'bob')).status,200);
  } finally {f.db.close();}
});

test('group create only acknowledges complete D1 group/owner/cohort mutation receipts',async()=>{
  const payload={name:'A new real group',weeklyGoal:3,catchupMode:'flexible',visibility:'private',rosterVisibility:'private',bibleEdition:'en-web'};
  for(const mode of ['missing-first','failed-second','truncated']){
    const f=fixture();
    try{
      const before=f.db.prepare('SELECT count(*) n FROM home_groups').get().n;
      f.setCreateReceiptMode(mode);
      const result=await f.post('create',payload);
      assert.equal(result.status,503,mode);
      assert.equal(result.data.error,'group_creation_unconfirmed');
      assert.equal(result.data.ok,undefined,'no fabricated 201');
      // Simulated D1 committed but discarded the receipt; a 503 MUST NOT
      // be represented as a durable rollback or encourage blind recreation.
      assert.equal(f.db.prepare('SELECT count(*) n FROM home_groups').get().n,before+1);
      const recovered=await f.get('alice',f.db.prepare("SELECT id FROM home_groups WHERE name=?").get(payload.name).id);
      assert.equal(recovered.status,200,'canonical group readback can recover uncertain creations');
    }finally{f.db.close();}
  }
});

test('group create clean failure is controlled and a successful owner group really exists',async()=>{
  const payload={name:'Canonical group creation',weeklyGoal:3,catchupMode:'steady',visibility:'private',rosterVisibility:'count'};
  const failed=fixture();try{
    failed.setFailure(1);
    const bad=await failed.post('create',payload);
    assert.equal(bad.status,503);
    assert.equal(bad.data.error,'group_creation_unconfirmed');
    assert.equal(failed.db.prepare("SELECT count(*) n FROM home_groups WHERE name=?").get(payload.name).n,0,'atomic batch rollback');
  }finally{failed.db.close();}
  const good=fixture();try{
    const ok=await good.post('create',payload);
    assert.equal(ok.status,201);
    assert.equal(ok.data.ok,true);
    const row=good.db.prepare("SELECT owner_user_id FROM home_groups WHERE id=?").get(ok.data.groupId);
    assert.equal(row.owner_user_id,'alice');
    assert.equal(good.db.prepare("SELECT role FROM home_group_members WHERE group_id=? AND user_id='alice'").get(ok.data.groupId).role,'owner');
  }finally{good.db.close();}
});

test('missing D1 batch receipt cannot falsely acknowledge role, transfer, leave, delete or session',async()=>{
  for(const scenario of ['role','transfer','leave','delete','session']){
    const f=fixture();
    try{
      f.setCreateReceiptMode('missing-first');
      let result;
      if(scenario==='role')result=await f.post('role',{targetUserId:'bob',role:'facilitator',expectedRole:'member'});
      if(scenario==='transfer')result=await f.post('transfer',{targetUserId:'bob'});
      if(scenario==='leave')result=await f.post('leave',{},'bob');
      if(scenario==='delete')result=await f.post('delete',{confirm:true});
      if(scenario==='session')result=await f.post('session',{bookId:'GEN',chapter:12,answersCorrect:0,answersTotal:0,meetingDate:'2026-10-28'},'carol');
      assert.equal(result.status,503,scenario+' must not claim success after losing a batch receipt');
      assert.equal(result.data.error,'database_unavailable',scenario);
      // The SQLite transaction committed before receipt corruption, so the
      // next user action must re-read actual state instead of assuming rollback.
      if(scenario==='role')assert.equal(f.db.prepare("SELECT role FROM home_group_members WHERE group_id='g' AND user_id='bob'").get().role,'facilitator');
      if(scenario==='transfer')assert.equal(owner(f),'bob');
      if(scenario==='leave')assert.equal((await f.get('bob')).status,404);
      if(scenario==='delete')assert.equal(f.db.prepare("SELECT count(*) n FROM home_groups WHERE id='g'").get().n,0);
      if(scenario==='session')assert.equal(f.db.prepare("SELECT count(*) n FROM group_sessions WHERE group_id='g'").get().n,2);
    }finally{f.db.close();}
  }
});

test('single-write group invite rotation and marathon start also reject missing D1 ACK',async()=>{
  const rotate=fixture();try{
    rotate.setSingleReceiptMode('missing');
    const response=await rotate.post('rotate-invite',{expectedInviteCode:'AABBCCDD',confirm:true});
    assert.equal(response.status,503);
    assert.equal(response.data.error,'database_unavailable');
    assert.notEqual(rotate.db.prepare("SELECT invite_code FROM home_groups WHERE id='g'").get().invite_code,'AABBCCDD');
  }finally{rotate.db.close();}
  const start=fixture();try{
    start.db.prepare("INSERT INTO group_marathon_registrations(id,group_id,weekly_goal,catchup_mode,cohort_key,status) VALUES('ready','g',3,'flexible','new-cohort','ready')").run();
    start.setSingleReceiptMode('missing');
    const response=await start.post('start');
    assert.equal(response.status,503);
    assert.equal(response.data.error,'database_unavailable');
    assert.equal(start.db.prepare("SELECT status FROM group_marathon_registrations WHERE id='ready'").get().status,'active');
  }finally{start.db.close();}
});

test('group join fails closed on storage errors and remains idempotent when retried',async()=>{
  const f=fixture();try{
    f.beforeRun(()=>{throw Error('D1 outage');});
    assert.equal((await f.post('join',{inviteCode:'AABBCCDD'},'outsider')).status,503);
    f.afterRun(()=>({success:false,meta:{changes:1}}));
    assert.equal((await f.post('join',{inviteCode:'AABBCCDD'},'outsider')).status,503);
    assert.equal((await f.post('join',{inviteCode:'AABBCCDD'},'outsider')).status,200);
    assert.equal((await f.post('join',{inviteCode:'AABBCCDD'},'outsider')).status,200);
  }finally{f.db.close();}
});
test('marathon group is rolled back if cohort promotion fails within its D1 batch',async()=>{
  const f=fixture();try{
    f.db.exec("INSERT INTO group_marathon_registrations(id,group_id,weekly_goal,catchup_mode,cohort_key,status) VALUES('prior','g',3,'flexible','shared','forming')");
    const payload={name:'Marathon',weeklyGoal:3,catchupMode:'flexible',visibility:'private',rosterVisibility:'count',bibleEdition:'en-web',marathonEnabled:true};
    const count=()=>f.db.prepare('SELECT COUNT(*) n FROM home_groups').get().n,before=count();
    f.setFailure(3);assert.equal((await f.post('create',payload)).status,503);
    assert.equal(count(),before,'cohort promotion cannot leave a partially created group');
    f.setFailure(-1);
    f.afterBatch(receipts=>receipts.map((receipt,i)=>i===3?{success:true,meta:{}}:receipt));
    assert.equal((await f.post('create',payload)).status,503);
    const ok=await f.post('create',payload);assert.equal(ok.status,201);
    assert.equal(ok.data.cohortStatus,'ready');
  }finally{f.db.close();}
});
