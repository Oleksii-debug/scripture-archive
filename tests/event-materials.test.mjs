import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';
import vm from 'node:vm';
import {eventMaterialsControl} from '../public/event-materials.js';
import {renderMaterialItems,reviewText} from '../public/material-review.js';

function fixture(){
  const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');
  for(const name of readdirSync(new URL('../drizzle/',import.meta.url)).filter(name=>name.endsWith('.sql')).sort())db.exec(readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8'));
  for(const id of ['organizer','author','other'])db.prepare(`INSERT INTO accounts(id,email,password_hash,password_salt,password_iterations,first_name,last_name,email_verified_at) VALUES (?,?, 'hash','salt',100000,'Test','User',CURRENT_TIMESTAMP)`).run(id,id+'@example.invalid');
  db.exec(`INSERT INTO church_directory_claims (id,claimant_user_id,name,city,country_code,locale,tradition,representation_attested,website_consent,status,reviewed_at,reviewed_by,verification_evidence)
    VALUES ('church','organizer','Test Community','Kyiv','UA','en','other',1,1,'approved',CURRENT_TIMESTAMP,'owner','Fixture authority');
    INSERT INTO church_events(id,church_claim_id,organizer_user_id,title,summary,city,country_code,locale,starts_on,ends_on,accessibility_details,organizer_authority_attested,publication_consent,status)
    VALUES ('event','church','organizer','Test meeting','Accessible programme','Kyiv','UA','en','2099-05-10','2099-05-11','Text notes',1,1,'active')`);
  const snapshot={title:'Reviewed exercise',locale:'en',data:{prompt:'Which option is correct?',reference:'GEN 12',options:['one','two'],answer:'one',explanation:'Private grading explanation'}};
  function add(id,status='approved'){
    db.prepare("INSERT INTO study_materials(id,owner_user_id,title,locale,data) VALUES (?,'author','Reviewed exercise','en',?)").run(id,JSON.stringify(snapshot.data));
    db.prepare(`INSERT INTO material_submissions(id,material_id,author_id,snapshot,provenance,rights_attested,status,reviewed_at,reviewed_by,source_checked,rights_checked,rights_holder,rights_basis)
      VALUES (?,?,'author',?,'Original author exercise',1,?,CURRENT_TIMESTAMP,'editor',1,1,'Test Author','original')`).run(id,id,JSON.stringify(snapshot),status);
  }
  add('approved');add('pending','pending');
  let failure=false;
  const D1={prepare(sql){const statement=(args=[])=>({bind:(...values)=>statement(values),all:async()=>{if(failure)throw Error('offline');return {success:true,results:db.prepare(sql).all(...args)};},first:async()=>{if(failure)throw Error('offline');return db.prepare(sql).get(...args);},run:async()=>{if(failure)throw Error('offline');return {success:true,meta:{changes:Number(db.prepare(sql).run(...args).changes)}};}});return statement();}};
  const source=readFileSync(new URL('../app/api/material-review/route.ts',import.meta.url),'utf8'),exports={};
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Request,Response,URL,crypto,require(name){
    if(name==='cloudflare:workers')return {env:{DB:D1}};
    if(name.endsWith('/auth'))return {sameOrigin:r=>r.headers.get('origin')==='https://local.invalid',isVerifiedOwner:()=>false,authenticateRequest:async r=>{const userId=r.headers.get('x-user');return userId?{userId,provider:userId==='agent'?'agent':'password',emailVerified:userId!=='unverified'}:null;}};
    throw Error(name);
  }});
  return {db,add,setFailure(){failure=true;},async post(body,user='organizer',origin='https://local.invalid'){
    const response=await exports.POST(new Request('https://local.invalid/api/material-review',{method:'POST',headers:{origin,'x-user':user},body:JSON.stringify(body)}));return {status:response.status,data:await response.json(),cache:response.headers.get('cache-control')};
  }};
}
const attach={action:'attachEventMaterial',eventId:'event',submissionId:'approved',publicationConsent:true};
const list={action:'eventMaterials',eventId:'event'};

test('event materials reuse approved snapshots, explicit consent and current organizer ownership',async()=>{
  const f=fixture();try{
    assert.equal((await f.post(attach,'','https://attacker.invalid')).status,403);
    for(const [user,status] of [['',401],['agent',403],['unverified',403],['other',409]])assert.equal((await f.post(attach,user)).status,status);
    assert.equal((await f.post({...attach,publicationConsent:false})).status,400);
    assert.equal((await f.post({...attach,submissionId:'pending'})).status,409);
    assert.equal((await f.post(attach)).status,200);assert.equal((await f.post(attach)).status,200);
    assert.equal(f.db.prepare('SELECT count(*) n FROM event_materials').get().n,1);
    const publicList=await f.post(list,'');assert.match(publicList.cache,/no-store/);
    assert.equal(publicList.data.items[0].title,'Reviewed exercise');
    assert.equal(publicList.data.items[0].rights.holder,'Test Author');
    assert.equal('answer' in publicList.data.items[0],false);assert.equal('explanation' in publicList.data.items[0],false);
    assert.equal('author_id' in publicList.data.items[0],false);
    f.db.exec("UPDATE study_materials SET title='Changed unpublished draft' WHERE id='approved'");
    assert.equal((await f.post(list,'')).data.items[0].title,'Reviewed exercise');
    assert.deepEqual((await f.post({...list,view:'mine'},'other')).data.items,[]);
  }finally{f.db.close();}
});

test('replaced or withdrawn publications disappear without exposing their snapshot; organizer can remove the stale link',async()=>{
  const f=fixture();try{
    await f.post(attach);
    for(const status of ['withdrawn','superseded','rejected','pending']){
      f.db.prepare("UPDATE material_submissions SET status=?,snapshot='private revoked text' WHERE id='approved'").run(status);
      assert.deepEqual((await f.post(list,'')).data.items,[]);
      const own=await f.post({...list,view:'mine'});assert.deepEqual(own.data,{items:[],unavailableIds:['approved']});
    }
    assert.equal((await f.post({...attach,action:'detachEventMaterial'},'other')).status,409);
    assert.equal((await f.post({...attach,action:'detachEventMaterial'})).status,200);
    assert.equal(f.db.prepare('SELECT count(*) n FROM event_materials').get().n,0);
  }finally{f.db.close();}
});

test('event visibility rechecks claim revision, withdrawal and verified account; stale attachment writes fail',async()=>{
  const f=fixture();try{
    await f.post(attach);
    f.db.exec("UPDATE church_directory_claims SET id='new-revision'");
    assert.deepEqual((await f.post(list,'')).data.items,[]);assert.equal((await f.post(attach)).status,409);
    assert.equal((await f.post({...list,view:'mine'})).data.items.length,1);
    f.db.exec("UPDATE church_events SET church_claim_id='new-revision',status='withdrawn'");
    assert.deepEqual((await f.post(list,'')).data.items,[]);assert.equal((await f.post(attach)).status,409);
    f.db.exec("UPDATE church_events SET status='active'; UPDATE accounts SET email_verified_at=NULL WHERE id='organizer'");
    assert.deepEqual((await f.post(list,'')).data.items,[]);assert.equal((await f.post(attach)).status,409);
    assert.deepEqual((await f.post({...list,view:'mine'})).data.items,[]);
  }finally{f.db.close();}
});

test('attachment limit, foreign key cleanup and storage failures preserve saved content',async()=>{
  const f=fixture();try{
    for(let i=0;i<20;i++){const id='material-'+i;f.add(id);assert.equal((await f.post({...attach,submissionId:id})).status,200);}
    assert.equal((await f.post(attach)).status,409);assert.equal((await f.post({...attach,submissionId:'material-0'})).status,200);
    f.db.exec("DELETE FROM study_materials WHERE id='material-0'");
    assert.equal(f.db.prepare('SELECT count(*) n FROM event_materials').get().n,19);
    assert.equal((await f.post(attach)).status,200);
    f.setFailure();assert.equal((await f.post(list,'')).status,503);assert.equal((await f.post({...attach,action:'detachEventMaterial'})).status,503);
    assert.equal(f.db.prepare('SELECT count(*) n FROM event_materials').get().n,20);
    f.db.exec("DELETE FROM church_events WHERE id='event'");assert.equal(f.db.prepare('SELECT count(*) n FROM event_materials').get().n,0);
  }finally{f.db.close();}
});

test('approved corrupted snapshot and partial rights metadata fail closed on the event surface',async()=>{
  const f=fixture();try{
    await f.post(attach);assert.throws(()=>f.db.exec("UPDATE material_submissions SET rights_holder=NULL WHERE id='approved'"),/material_rights_metadata_incomplete/);
    f.db.prepare("UPDATE material_submissions SET rights_holder=? WHERE id='approved'").run('Hidden\u202e Author');
    assert.equal((await f.post(list,'')).status,503);
    f.db.exec("UPDATE material_submissions SET rights_holder='Test Author',snapshot='{}' WHERE id='approved'");
    assert.equal((await f.post(list,'')).status,503);
  }finally{f.db.close();}
});

test('event material controls and canonical exercise rendering escape content and preserve rights and hidden answers',()=>{
  const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
  for(const lang of ['uk','ru','en'])assert.match(eventMaterialsControl({id:'event"<script>'},lang,esc,true),/data-event-id="event&quot;&lt;script>/);
  const root={innerHTML:'',querySelectorAll:()=>[]};
  const item={id:'approved',title:'<script>title',locale:'en',reference:'GEN 12',prompt:'Which option?',options:['one','two'],provenance:'Original',reviewedAt:'2026-11-16',rights:{holder:'Author',basis:'original',licenseUrl:null},answer:'DO NOT RENDER',explanation:'PRIVATE'};
  renderMaterialItems(root,[item],reviewText('en'),esc,()=>true);
  assert.match(root.innerHTML,/&lt;script>/);assert.match(root.innerHTML,/Author/);assert.doesNotMatch(root.innerHTML,/DO NOT RENDER|PRIVATE/);
  const previous=root.innerHTML;renderMaterialItems(root,[],reviewText('en'),esc,()=>false);assert.equal(root.innerHTML,previous);
});
