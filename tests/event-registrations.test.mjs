import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import ts from 'typescript';
import vm from 'node:vm';
import {validateProgramme} from '../public/event-programme.js';
import { registrationExport,registrationForm,registrationSettings,rosterControl } from '../public/event-registration.js';

function fixture(){
  const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');
  db.exec('CREATE TABLE accounts (id TEXT PRIMARY KEY,email TEXT NOT NULL,email_verified_at TEXT,deleted_at TEXT)');
  db.exec("INSERT INTO accounts VALUES ('alice','alice@example.invalid',CURRENT_TIMESTAMP,NULL),('bob','bob@example.invalid',CURRENT_TIMESTAMP,NULL),('carol','carol@example.invalid',CURRENT_TIMESTAMP,NULL)");
  for(const file of ['0017_verified_church_claims','0018_verified_church_events','0019_event_programmes','0020_event_registrations'])db.exec(readFileSync(new URL(`../drizzle/${file}.sql`,import.meta.url),'utf8'));
  db.exec(`INSERT INTO church_directory_claims (id,claimant_user_id,name,city,country_code,locale,tradition,representation_attested,website_consent,status,reviewed_at,reviewed_by,verification_evidence)
    VALUES ('church','alice','Grace Community','Kyiv','UA','uk','other',1,1,'approved',CURRENT_TIMESTAMP,'owner','Verified authority');
    INSERT INTO church_events (id,church_claim_id,organizer_user_id,title,summary,city,country_code,locale,starts_on,ends_on,accessibility_details,organizer_authority_attested,publication_consent,status,registration_enabled)
    VALUES ('event','church','alice','Bible study','Accessible programme','Kyiv','UA','uk','2099-05-10','2099-05-11','Text notes',1,1,'active',1)`);
  let unavailable=false,batchFailure=false;
  const D1={prepare(sql){return {bind(...args){return {
    first:async()=>{if(unavailable)throw Error('offline');return db.prepare(sql).get(...args)??null;},
    all:async()=>{if(unavailable)throw Error('offline');return {success:true,results:db.prepare(sql).all(...args)};},
    run:async()=>{if(unavailable)throw Error('offline');return {success:true,meta:{changes:Number(db.prepare(sql).run(...args).changes)}};},
  };}};}};
  D1.batch=async statements=>{db.exec('BEGIN');try{const receipts=[];for(const [i,statement] of statements.entries()){if(batchFailure&&i===1)throw Error('batch failed');receipts.push(await statement.run());}db.exec('COMMIT');return receipts;}catch(error){db.exec('ROLLBACK');throw error;}};
  function load(file){
  const source=readFileSync(new URL('../app/api/'+file+'/route.ts',import.meta.url),'utf8');
  const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}),exports={};
  vm.runInNewContext(compiled.outputText,{exports,Request,Response,URL,crypto,Set,Date,Number,require(module){
    if(module.endsWith('/event-programme.js'))return {validateProgramme};
    if(module==='cloudflare:workers')return {env:{DB:D1}};
    if(module.endsWith('/auth'))return {sameOrigin:r=>r.headers.get('origin')==='https://local.invalid',authenticateRequest:async r=>{const userId=r.headers.get('x-user');return userId?{userId,emailVerified:userId!=='unverified',provider:userId==='agent'?'agent':'password'}:null;}};
    throw Error(module);
  }});
  return exports;}
  const exports=load('event-registrations'),events=load('events');
  const eventWithdraw=async(user='alice')=>events.POST(new Request('https://local.invalid/api/events',{method:'POST',headers:{origin:'https://local.invalid','content-type':'application/json','x-user':user},body:JSON.stringify({action:'withdraw',id:'event'})}));
  const request=async(method,body,user='bob',params={})=>{
    const response=await exports[method](new Request('https://local.invalid/api/event-registrations?'+new URLSearchParams(params),{method,headers:{origin:'https://local.invalid','content-type':'application/json','x-user':user},...(body?{body:JSON.stringify(body)}:{})}));
    return {status:response.status,data:await response.json(),cache:response.headers.get('cache-control')};
  };
  return {db,request,eventWithdraw,setBatchFailure(value){batchFailure=value;},setUnavailable(){unavailable=true;}};
}
const registration={action:'register',eventId:'event',attendeeName:'Reader Alias',sharingConsent:true};

test('event registration requires explicit consent and a live approved organizer; duplicate registration is idempotent',async()=>{
  const f=fixture();try{
    for(const [actor,status] of [['',401],['agent',403],['unverified',403]])assert.equal((await f.request('POST',registration,actor)).status,status);
    for(const change of [{sharingConsent:false},{attendeeName:'A'},{attendeeName:'Hidden\u202e'},{eventId:'bad id'}])assert.equal((await f.request('POST',{...registration,...change})).status,400);
    f.db.exec('UPDATE church_events SET registration_enabled=0');
    assert.equal((await f.request('POST',registration)).status,409);
    f.db.exec('UPDATE church_events SET registration_enabled=1');
    assert.equal((await f.request('POST',registration)).status,201);
    assert.equal((await f.request('POST',{...registration,attendeeName:'Updated Alias'})).status,201);
    assert.equal(f.db.prepare('SELECT count(*) n FROM event_registrations').get().n,1);
    const own=await f.request('GET');assert.match(own.cache,/no-store/);assert.equal(own.data.items[0].attendeeName,'Updated Alias');
    assert.deepEqual((await f.request('GET',null,'carol')).data.items,[]);
    f.db.exec("UPDATE church_directory_claims SET id='changed',status='pending'");
    assert.equal((await f.request('POST',registration)).status,409);
    assert.equal((await f.request('GET')).data.items[0].available,false);
    assert.equal((await f.request('GET',null,'alice',{view:'roster',eventId:'event'})).status,404);
    assert.equal((await f.request('POST',{action:'cancel',eventId:'event'})).status,200);
    assert.equal((await f.request('POST',{action:'cancel',eventId:'event'})).status,200);
    assert.equal(f.db.prepare('SELECT count(*) n FROM event_registrations').get().n,0);
  }finally{f.db.close();}
});

test('only the current organizer sees a paginated roster without email, account ids or profile fields',async()=>{
  const f=fixture();try{
    for(let i=0;i<105;i++){
      const id=`participant-${String(i).padStart(3,'0')}`;
      f.db.prepare('INSERT INTO accounts VALUES (?,?,CURRENT_TIMESTAMP,NULL)').run(id,`${id}@example.invalid`);
      f.db.prepare("INSERT INTO event_registrations (id,event_id,user_id,attendee_name,consent_version) VALUES (?,'event',?,'Alias',1)").run(id,id);
    }
    assert.equal((await f.request('GET',null,'bob',{view:'roster',eventId:'event'})).status,404);
    const page=(await f.request('GET',null,'alice',{view:'roster',eventId:'event'})).data;
    assert.equal(page.items.length,100);assert.equal(page.nextCursor,'participant-099');
    assert.deepEqual(Object.keys(page.items[0]).sort(),['attendeeName','consentAt','id']);
    const end=(await f.request('GET',null,'alice',{view:'roster',eventId:'event',after:page.nextCursor})).data;
    assert.equal(end.items.length,5);assert.equal(end.nextCursor,null);
    assert.equal(end.items[0].id,'participant-100');
    f.db.exec("UPDATE accounts SET email_verified_at=NULL WHERE id='alice'");
    assert.equal((await f.request('GET',null,'alice',{view:'roster',eventId:'event'})).status,404);
    assert.equal((await f.request('POST',registration)).status,409);
  }finally{f.db.close();}
});

test('event withdrawal removes registrations in the same transaction and rolls back on deletion failure',async()=>{
  const f=fixture();try{
    await f.request('POST',registration);
    await f.request('POST',{...registration,attendeeName:'Second'},'carol');
    assert.equal((await f.eventWithdraw('bob')).status,409);
    assert.equal(f.db.prepare('SELECT count(*) n FROM event_registrations').get().n,2);
    f.setBatchFailure(true);
    assert.equal((await f.eventWithdraw()).status,503);
    assert.equal(f.db.prepare("SELECT status FROM church_events WHERE id='event'").get().status,'active');
    assert.equal(f.db.prepare('SELECT count(*) n FROM event_registrations').get().n,2);
    f.setBatchFailure(false);
    assert.equal((await f.eventWithdraw()).status,200);
    assert.equal(f.db.prepare('SELECT count(*) n FROM event_registrations').get().n,0);
  }finally{f.db.close();}
});

test('registration limit is enforced at write time and still permits a corrected name',async()=>{
  const f=fixture();try{
    for(let i=0;i<100;i++){
      const eventId=`event-${i}`;
      f.db.prepare(`INSERT INTO church_events (id,church_claim_id,organizer_user_id,title,summary,city,country_code,locale,starts_on,ends_on,accessibility_details,organizer_authority_attested,publication_consent,status,registration_enabled)
        SELECT ? ,church_claim_id,organizer_user_id,title,summary,city,country_code,locale,starts_on,ends_on,accessibility_details,1,1,'active',1 FROM church_events WHERE id='event'`).run(eventId);
      assert.equal((await f.request('POST',{...registration,eventId})).status,201);
    }
    assert.equal((await f.request('POST',registration)).status,409);
    assert.equal((await f.request('POST',{...registration,eventId:'event-0',attendeeName:'Correction'})).status,201);
    assert.equal((await f.request('GET')).data.items.length,100);
    f.setUnavailable();assert.equal((await f.request('GET')).status,503);assert.equal((await f.request('POST',registration)).status,503);
  }finally{f.db.close();}
});

for(const lang of ['uk','ru','en'])test(`registration ${lang} defaults to no consent and exports only the user's projected record`,()=>{
  const form=registrationForm({id:'event',registrationEnabled:true},lang,String,true);
  assert.match(form,/name="sharingConsent" type="checkbox" required/);assert.doesNotMatch(form,/checked|email|firstName/);
  assert.equal(registrationForm({id:'event',registrationEnabled:false},lang,String,true),'');
  assert.match(registrationSettings(lang,String),/name="registrationEnabled" type="checkbox"/);
  assert.equal(rosterControl({id:'event',status:'hidden'},lang,String),'');
  const data=JSON.parse(registrationExport([{eventId:'event',title:'Title',attendeeName:'Alias',consentAt:'2099-05-10 09:00:00',email:'private@example.invalid',user_id:'private',privateProfile:{}}]));
  assert.equal(data.registrations[0].attendeeName,'Alias');assert.equal('email' in data.registrations[0],false);assert.equal('user_id' in data.registrations[0],false);
});
