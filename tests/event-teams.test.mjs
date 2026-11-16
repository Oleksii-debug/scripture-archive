import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';
import vm from 'node:vm';

function fixture(){
  const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');
  for(const name of readdirSync(new URL('../drizzle/',import.meta.url)).filter(name=>name.endsWith('.sql')).sort())db.exec(readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8'));
  for(const id of ['organizer','member','other'])db.prepare(`INSERT INTO accounts(id,email,password_hash,password_salt,password_iterations,first_name,last_name,email_verified_at) VALUES (?,?,'hash','salt',100000,'Test','User',CURRENT_TIMESTAMP)`).run(id,id+'@example.invalid');
  db.exec(`INSERT INTO church_directory_claims(id,claimant_user_id,name,city,country_code,locale,tradition,representation_attested,website_consent,status,reviewed_at,reviewed_by,verification_evidence)
    VALUES ('church','organizer','Test Community','Kyiv','UA','en','other',1,1,'approved',CURRENT_TIMESTAMP,'editor','Test authority');
    INSERT INTO church_events(id,church_claim_id,organizer_user_id,title,summary,city,country_code,locale,starts_on,ends_on,accessibility_details,organizer_authority_attested,publication_consent,status)
    VALUES ('event','church','organizer','Test camp','Accessible programme','Kyiv','UA','en','2099-05-10','2099-05-11','Text notes',1,1,'active')`);
  function group(id,owner='organizer'){
    db.prepare("INSERT INTO home_groups(id,owner_user_id,name,visibility,roster_visibility,invite_code) VALUES (?,?,'Private volunteer team','private','private',?)").run(id,owner,id+'-SECRET');
    db.prepare("INSERT INTO home_group_members(group_id,user_id,display_name,role) VALUES (?,?,'Private Name','owner')").run(id,owner);
  }
  group('team');group('second');group('foreign','other');
  db.exec("INSERT INTO home_group_members(group_id,user_id,display_name,role) VALUES ('team','member','Private Member','member')");
  let unavailable=false;
  const DB={prepare(sql){const statement=(args=[])=>({bind:(...values)=>statement(values),all:async()=>{if(unavailable)throw Error('offline');return {success:true,results:db.prepare(sql).all(...args)};},first:async()=>{if(unavailable)throw Error('offline');return db.prepare(sql).get(...args)??null;},run:async()=>{if(unavailable)throw Error('offline');return {success:true,meta:{changes:Number(db.prepare(sql).run(...args).changes)}};}});return statement();}};
  const exports={},source=readFileSync(new URL('../app/api/event-teams/route.ts',import.meta.url),'utf8');
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Request,Response,URL,crypto,require(name){
    if(name==='cloudflare:workers')return {env:{DB}};
    if(name.endsWith('/auth'))return {sameOrigin:r=>r.headers.get('origin')==='https://local.invalid',authenticateRequest:async r=>{const userId=r.headers.get('x-user');return userId?{userId,provider:userId==='agent'?'agent':'password',emailVerified:userId!=='unverified'}:null;}};
    throw Error(name);
  }});
  return {db,group,setUnavailable(){unavailable=true;},async get(params={eventId:'event'},user='organizer'){
    const response=await exports.GET(new Request('https://local.invalid/api/event-teams?'+new URLSearchParams(params),{headers:{'x-user':user}}));return {status:response.status,data:await response.json(),cache:response.headers.get('cache-control')};
  },async post(body,user='organizer',origin='https://local.invalid'){
    const response=await exports.POST(new Request('https://local.invalid/api/event-teams',{method:'POST',headers:{origin,'x-user':user},body:JSON.stringify(body)}));return {status:response.status,data:await response.json()};
  }};
}
const connect={action:'set',eventId:'event',groupId:'team',expectedRevision:null,confirm:true};
const manage={eventId:'event',view:'manage'};

test('only current verified organizer with a private owned group can connect a team with explicit confirmation',async()=>{
  const f=fixture();try{
    for(const [actor,status] of [['',401],['agent',403],['unverified',403],['other',409]])assert.equal((await f.post(connect,actor)).status,status);
    assert.equal((await f.post(connect,'organizer','https://attacker.invalid')).status,403);
    assert.equal((await f.post({...connect,confirm:false})).status,400);
    assert.equal((await f.post({...connect,groupId:'foreign'})).status,409);
    assert.equal((await f.post(connect)).status,200);
    const own=await f.get(manage);assert.match(own.cache,/no-store/);assert.equal(own.data.team.id,'team');assert.ok(own.data.revision);
    assert.equal((await f.get({},'')).status,401);assert.equal((await f.get(manage,'other')).status,404);
    assert.deepEqual((await f.get({eventId:'event'},'other')).data,{team:null});
    const member=(await f.get({eventId:'event'},'member')).data;
    assert.deepEqual(member,{team:{id:'team',name:'Private volunteer team'}});
    assert.doesNotMatch(JSON.stringify(member),/SECRET|Private Member|Private Name|invite|email|revision/);
  }finally{f.db.close();}
});

test('team replacement and removal compare the observed revision and reject stale writers',async()=>{
  const f=fixture();try{
    await f.post(connect);const first=(await f.get(manage)).data.revision;
    assert.equal((await f.post(connect)).status,409);
    assert.equal((await f.post({...connect,groupId:'second',expectedRevision:first})).status,200);
    const second=(await f.get(manage)).data.revision;assert.notEqual(second,first);
    assert.equal((await f.post({action:'clear',eventId:'event',expectedRevision:first})).status,409);
    assert.equal((await f.get(manage)).data.team.id,'second');
    assert.equal((await f.post({action:'clear',eventId:'event',expectedRevision:second})).status,200);
    assert.deepEqual((await f.get(manage)).data,{revision:null,team:null});
    assert.equal(f.db.prepare('SELECT count(*) n FROM home_groups').get().n,3,'disconnect does not delete a group or memberships');
  }finally{f.db.close();}
});

test('membership, group privacy, ownership and claim changes revoke access on the next read',async()=>{
  const f=fixture();try{
    await f.post(connect);const revision=(await f.get(manage)).data.revision;
    f.db.exec("DELETE FROM home_group_members WHERE group_id='team' AND user_id='member'");
    assert.deepEqual((await f.get({eventId:'event'},'member')).data,{team:null});
    f.db.exec("UPDATE home_groups SET visibility='public' WHERE id='team'");
    assert.equal((await f.get(manage)).data.team,null);assert.equal((await f.post({...connect,expectedRevision:revision})).status,409);
    f.db.exec("UPDATE home_groups SET visibility='private',owner_user_id='other' WHERE id='team'");
    assert.equal((await f.get(manage)).data.team,null);
    f.db.exec("UPDATE home_groups SET owner_user_id='organizer' WHERE id='team'; UPDATE church_directory_claims SET id='revised'");
    assert.equal((await f.get(manage)).data.team,null);assert.equal((await f.post({...connect,expectedRevision:revision})).status,409);
    assert.equal((await f.post({action:'clear',eventId:'event',expectedRevision:revision})).status,200,'owner can remove a now-hidden association');
  }finally{f.db.close();}
});

test('group picker pages all eligible owned groups and excludes public or foreign groups',async()=>{
  const f=fixture();try{
    for(let i=0;i<104;i++)f.group('group-'+String(i).padStart(3,'0'));
    f.db.exec("UPDATE home_groups SET roster_visibility='names' WHERE id='second'");
    const first=(await f.get({view:'options'})).data;assert.equal(first.items.length,100);assert.ok(first.nextCursor);
    const last=(await f.get({view:'options',after:first.nextCursor})).data;assert.equal(last.items.length,5);assert.equal(last.nextCursor,null);
    assert.equal(new Set([...first.items,...last.items].map(item=>item.id)).size,105);
    assert.equal([...first.items,...last.items].some(item=>['foreign','second'].includes(item.id)),false);
    f.db.exec("UPDATE accounts SET email_verified_at=NULL WHERE id='organizer'");
    assert.deepEqual((await f.get({view:'options'})).data.items,[]);
  }finally{f.db.close();}
});

test('storage failures do not report team changes and deleting a group cascades only its association',async()=>{
  const f=fixture();try{
    await f.post(connect);const revision=(await f.get(manage)).data.revision;
    f.setUnavailable();assert.equal((await f.get(manage)).status,503);
    assert.equal((await f.post({action:'clear',eventId:'event',expectedRevision:revision})).status,503);
    assert.equal(f.db.prepare('SELECT count(*) n FROM event_teams').get().n,1);
    f.db.exec("DELETE FROM home_groups WHERE id='team'");assert.equal(f.db.prepare('SELECT count(*) n FROM event_teams').get().n,0);
    assert.equal(f.db.prepare('SELECT count(*) n FROM church_events').get().n,1);
  }finally{f.db.close();}
});
