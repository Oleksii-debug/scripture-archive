import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import ts from 'typescript';
import vm from 'node:vm';
import { historyMarkup, queueMarkup, submissionForm, reviewText, renderPublicMaterials, attachReviewControls, editorRolesMarkup } from '../public/material-review.js';

function fixture() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys=ON');
  db.exec('CREATE TABLE accounts (id TEXT PRIMARY KEY,email TEXT NOT NULL,email_verified_at TEXT,deleted_at TEXT)');
  db.exec(readFileSync(new URL('../drizzle/0012_editor_roles.sql', import.meta.url), 'utf8'));
  db.exec("CREATE TABLE study_materials (id TEXT PRIMARY KEY,owner_user_id TEXT NOT NULL,title TEXT NOT NULL,locale TEXT NOT NULL,data TEXT NOT NULL,visibility TEXT NOT NULL DEFAULT 'private')");
  db.exec(readFileSync(new URL('../drizzle/0011_material_review.sql', import.meta.url), 'utf8'));
  const input = {prompt:'A valid question?',reference:'GEN 12',options:['one','two'],answer:'one',explanation:'Source based explanation'};
  db.prepare('INSERT INTO study_materials(id,owner_user_id,title,locale,data) VALUES (?,?,?,?,?)').run('m1','alice','Original','uk',JSON.stringify(input));
  db.prepare('INSERT INTO study_materials(id,owner_user_id,title,locale,data) VALUES (?,?,?,?,?)').run('m2','bob','Other','en',JSON.stringify(input));
  let failRead = false, throwRead = false, failBatchAt = -1, afterDraftRead = null, afterRoleRead = null, submitReceiptMode = 'normal';
  const D1 = {prepare(sql){return {bind(...args){return {
    first:async()=>{const row=db.prepare(sql).get(...args)??null;if(sql.startsWith('SELECT title,locale,data') && afterDraftRead) {const hook=afterDraftRead;afterDraftRead=null;hook();}if(sql.startsWith('SELECT r.user_id') && afterRoleRead) {const hook=afterRoleRead;afterRoleRead=null;hook();}return row;},
    all:async()=>{if(throwRead)throw Error('offline');return failRead ? {success:false,results:[]} : {success:true,results:db.prepare(sql).all(...args)};},
    run:async()=>{const r=db.prepare(sql).run(...args);
      if(sql.startsWith('INSERT INTO material_submissions') && submitReceiptMode!=='normal'){
        const mode=submitReceiptMode;submitReceiptMode='normal';
        if(mode==='failed')return {success:false,meta:{changes:Number(r.changes)}};
        if(mode==='missing')return {success:true,meta:{}};
      }
      return {success:true,meta:{changes:Number(r.changes)}};},
  };}, all:async()=>{if(throwRead)throw Error('offline');return failRead ? {success:false,results:[]} : {success:true,results:db.prepare(sql).all()};}};},
  async batch(statements){db.exec('BEGIN');try {const r=[];for(const [i,s] of statements.entries()){if(i===failBatchAt)throw Error('forced failure');r.push(await s.run());}db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}}};
  const source=readFileSync(new URL('../app/api/material-review/route.ts',import.meta.url),'utf8');
  const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const exports={};
  vm.runInNewContext(js,{exports,Request,Response,URL,crypto,require(id){
    if(id==='cloudflare:workers')return {env:{DB:D1}};
    if(id.endsWith('/auth'))return {isVerifiedOwner:id=>Boolean(id&&id.provider!=='agent'&&id.emailVerified&&id.email?.toLowerCase()==='dordiaioleksii1@gmail.com'),sameOrigin:r=>r.headers.get('origin')==='https://local.invalid',authenticateRequest:async r=>{const id=r.headers.get('x-user');return id?{userId:id,email:id==='editor'?'dordiaioleksii1@gmail.com':`${id}@example.invalid`,emailVerified:id!=='unverified',provider:id==='agent'?'agent':'password'}:null;}};
    throw Error('unexpected import '+id);
  }});
  async function post(body,user='alice',origin='https://local.invalid') {const r=await exports.POST(new Request('https://local.invalid/api/material-review',{method:'POST',headers:{origin,'content-type':'application/json',...(user?{'x-user':user}:{})},body:JSON.stringify(body)}));return {status:r.status,data:await r.json()};}
  async function get(view,user='') {const r=await exports.GET(new Request('https://local.invalid/api/material-review?view='+view,{headers:user?{'x-user':user}:{}}));return {status:r.status,data:await r.json()};}
  return {db,post,get,setReadFailure:value=>{failRead=value;},setReadThrow:value=>{throwRead=value;},setBatchFailure:value=>{failBatchAt=value;},afterDraftRead:hook=>{afterDraftRead=hook;},afterRoleRead:hook=>{afterRoleRead=hook;},setSubmitReceiptMode:mode=>{submitReceiptMode=mode;}};
}
const submission={action:'submit',materialId:'m1',provenance:'Original work, GEN 12',rightsConfirmed:true};
const approve=id=>({action:'review',id,decision:'approve',sourceChecked:true,rightsChecked:true});

test('private draft requires consent and editor approval; public answers remain server-side',async()=>{
  const f=fixture();try {
    assert.equal((await f.post(submission,'','https://local.invalid')).status,401);
    assert.equal((await f.post(submission,'alice','https://other.invalid')).status,403);
    assert.equal((await f.post({...submission,rightsConfirmed:false})).status,400);
    assert.equal((await f.post(submission,'bob')).status,409);
    assert.equal((await f.post(submission,'agent')).status,401);
    const submitted=await f.post(submission);assert.equal(submitted.status,201);
    assert.equal((await f.post(submission)).status,409);
    assert.equal((await f.get('queue','alice')).status,403);
    assert.equal((await f.get('history','bob')).status,403);
    assert.equal((await f.get('queue','agent')).status,401);
    assert.equal((await f.post(approve(submitted.data.id),'unverified')).status,403);
    assert.equal((await f.post(approve(submitted.data.id),'bob')).status,403);
    assert.equal((await f.post({...approve(submitted.data.id),rightsChecked:false},'editor')).status,400);
    assert.equal((await f.post({action:'answer',id:submitted.data.id,choice:0},'')).status,404);
    assert.equal((await f.post(approve(submitted.data.id),'editor')).status,200);
    const audit=(await f.get('history','editor')).data.items[0];
    assert.equal(audit.authorId,'alice');assert.equal(audit.reviewerId,'editor');assert.equal(audit.sourceChecked,true);assert.equal(audit.rightsChecked,true);
    const publicItems=(await f.get('public')).data.items;
    assert.equal(publicItems.length,1);assert.equal('answer' in publicItems[0],false);assert.equal('explanation' in publicItems[0],false);
    assert.deepEqual((await f.post({action:'answer',id:submitted.data.id,choice:1},'')).data,{correct:false});
    const right=await f.post({action:'answer',id:submitted.data.id,choice:0},'');assert.equal(right.data.correct,true);assert.equal(right.data.explanation,'Source based explanation');
    assert.equal((await f.post({action:'answer',id:submitted.data.id,choice:8},'')).status,400);
  }finally{f.db.close();}
});

test('revisions are immutable; failed review rolls back and withdrawal revokes answers',async()=>{
  const f=fixture();try {
    const first=(await f.post(submission)).data.id;assert.equal((await f.post(approve(first),'editor')).status,200);
    f.db.prepare("UPDATE study_materials SET title='Changed draft' WHERE id='m1'").run();
    const second=(await f.post(submission)).data.id;
    assert.equal((await f.get('public')).data.items[0].title,'Original');
    f.setBatchFailure(1);assert.equal((await f.post(approve(second),'editor')).status,503);
    assert.equal((await f.get('public')).data.items[0].id,first,'failed replacement keeps previous publication');
    f.setBatchFailure(-1);assert.equal((await f.post({action:'review',id:second,decision:'reject'},'editor')).status,400);
    assert.equal((await f.post({action:'review',id:second,decision:'reject',note:'Needs source review'},'editor')).status,200);
    assert.equal((await f.get('public')).data.items[0].id,first,'rejection does not remove previous publication');
    const third=(await f.post(submission)).data.id;assert.equal((await f.post(approve(third),'editor')).status,200);
    const visible=(await f.get('public')).data.items;assert.equal(visible.length,1);assert.equal(visible[0].title,'Changed draft');
    assert.equal((await f.post({action:'withdraw',id:third},'bob')).status,409);
    assert.equal((await f.post({action:'withdraw',id:third})).status,200);
    assert.equal((await f.post({action:'answer',id:third,choice:0},'')).status,404);
    const history=(await f.get('mine','alice')).data.items;
    assert.equal(history.find(x=>x.id===first).status,'superseded');assert.equal(history.find(x=>x.id===second).reviewNote,'Needs source review');
    assert.equal((await f.get('mine','bob')).data.items.length,0);
    f.db.prepare("DELETE FROM study_materials WHERE id='m1'").run();
    assert.equal(f.db.prepare('SELECT count(*) n FROM material_submissions').get().n,0,'material deletion cascades to snapshots');
    f.setReadFailure(true);assert.equal((await f.get('public')).status,503);
    f.setReadFailure(false);f.setReadThrow(true);assert.equal((await f.get('public')).status,503);
  }finally{f.db.close();}
});

test('a verified granted editor may review, and revocation immediately removes access',async()=>{
  const f=fixture();try {
    f.db.prepare("INSERT INTO accounts(id,email,email_verified_at) VALUES('bob','bob@example.invalid',CURRENT_TIMESTAMP)").run();
    const first=(await f.post(submission)).data.id;
    assert.equal((await f.post(approve(first),'bob')).status,403);
    f.db.prepare("INSERT INTO editorial_roles(user_id,granted_by) VALUES('bob','editor')").run();
    assert.equal((await f.get('queue','bob')).status,200);
    assert.equal((await f.post(approve(first),'bob')).status,200);
    const next=(await f.post(submission)).data.id;
    f.afterRoleRead(()=>f.db.prepare("DELETE FROM editorial_roles WHERE user_id='bob'").run());
    assert.equal((await f.get('queue','bob')).data.items.length,0,'revoked role cannot read pending snapshots');
    f.db.prepare("INSERT INTO editorial_roles(user_id,granted_by) VALUES('bob','editor')").run();
    f.afterRoleRead(()=>f.db.prepare("DELETE FROM editorial_roles WHERE user_id='bob'").run());
    assert.equal((await f.post(approve(next),'bob')).status,409,'revocation after authorization cannot publish or supersede');
    assert.equal((await f.get('queue','bob')).status,403);
    assert.equal((await f.post(approve(next),'bob')).status,403);
    assert.equal((await f.get('public')).data.items[0].id,first);
  }finally{f.db.close();}
});

test('an editor cannot review their own submission or supersede its published version',async()=>{
  const f=fixture();try {
    f.db.prepare("UPDATE study_materials SET owner_user_id='editor' WHERE id='m1'").run();
    const first=(await f.post(submission,'editor')).data.id;
    // An already published snapshot represents a past independent review.
    f.db.prepare("UPDATE material_submissions SET status='approved',reviewed_by='other-editor',reviewed_at=CURRENT_TIMESTAMP,source_checked=1,rights_checked=1 WHERE id=?").run(first);
    const second=(await f.post(submission,'editor')).data.id;
    const ownApproval = await f.post(approve(second),'editor');
    assert.equal(ownApproval.status,403); assert.equal(ownApproval.data.error,'self_review_forbidden');
    const ownRejection = await f.post({action:'review',id:second,decision:'reject',note:'Needs work'},'editor');
    assert.equal(ownRejection.status,403); assert.equal(ownRejection.data.error,'self_review_forbidden');
    assert.equal((await f.get('public')).data.items[0].id,first);
    assert.equal(f.db.prepare('SELECT status FROM material_submissions WHERE id=?').get(second).status,'pending');
  }finally{f.db.close();}
});

test('self-review refusal is announced and the review controls remain usable',async()=>{
  const oldFetch=globalThis.fetch, oldFormData=globalThis.FormData;
  try {
    globalThis.fetch=async()=>new Response(JSON.stringify({error:'self_review_forbidden'}),{status:403,headers:{'content-type':'application/json'}});
    globalThis.FormData=class { has(){return true;} get(){return ''; } };
    for (const lang of ['uk','ru','en']) {
      const status={textContent:''}, button={dataset:{decision:'approve'},disabled:false};
      const form={dataset:{id:'own'},querySelector:()=>status,querySelectorAll:()=>[button]};
      const root={querySelectorAll:selector=>selector==='.material-review'?[form]:[]};
      const words=reviewText(lang); let refreshed=false;
      attachReviewControls(root,words,async()=>{refreshed=true;},()=>{});
      await button.onclick();
      assert.equal(status.textContent,words.selfReview);
      assert.equal(button.disabled,false); assert.equal(refreshed,false);
    }
  } finally { globalThis.fetch=oldFetch; globalThis.FormData=oldFormData; }
});

test('editor role controls label email and escape account information',()=>{
  const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
  for (const lang of ['uk','ru','en']) {
    const html=editorRolesMarkup([{id:'" onmouseover="x',email:'<script>'}],lang,esc,[{action:'grant',subject_email:'<script>',created_at:'2026-01-01',actor_user_id:'<script>'}]);
    assert.match(html,/type="email"/); assert.match(html,/role="status"/);
    assert.ok(!html.includes('<script>')); assert.ok(!html.includes('data-id="" onmouseover='));
  }
});

test('a concurrent draft edit cannot silently change the version sent for review',async()=>{
  const f=fixture();try {
    f.afterDraftRead(()=>f.db.prepare("UPDATE study_materials SET title='Concurrent edit' WHERE id='m1'").run());
    assert.equal((await f.post(submission)).status,409);
    assert.equal(f.db.prepare('SELECT count(*) n FROM material_submissions').get().n,0);
    const fresh=await f.post(submission);assert.equal(fresh.status,201);
    assert.equal((await f.get('mine','alice')).data.items[0].snapshot.title,'Concurrent edit');
  }finally{f.db.close();}
});

test('a damaged legacy draft cannot enter the review queue',async()=>{
  const f=fixture();try {
    f.db.prepare("UPDATE study_materials SET data=? WHERE id='m1'").run(JSON.stringify({prompt:'Valid question',reference:'GEN 12',options:['one','one'],answer:'one',explanation:'Explanation'}));
    assert.equal((await f.post(submission)).status,400);
    assert.equal(f.db.prepare('SELECT count(*) n FROM material_submissions').get().n,0);
  }finally{f.db.close();}
});

test('editorial controls escape untrusted content and public UI does not print answers',async()=>{
  const esc = s => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const w=reviewText('uk'), item={id:'id',materialId:'m1',status:'pending',reviewNote:'<script>bad</script>',provenance:'<img src=x>',snapshot:{title:'<img>',data:{reference:'GEN 12',prompt:'Question',options:['one','<b>'],answer:'one',explanation:'Because'}}};
  const html=historyMarkup([item],w,esc)+queueMarkup([item],w,esc)+submissionForm({id:'"><script>'},w,esc);
  assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img src=x>'));assert.ok(html.includes('&lt;img&gt;'));
  const previous=globalThis.fetch;
  globalThis.fetch=async()=>({ok:true,json:async()=>({items:[{id:'v',title:'<img>',reference:'GEN',provenance:'source',prompt:'Question',options:['one','two']}]})});
  const root={isConnected:true,innerHTML:'',querySelectorAll:()=>[]};
  try {await renderPublicMaterials(root,w,esc);assert.ok(root.innerHTML.includes('&lt;img&gt;'));assert.ok(!root.innerHTML.includes('answer:'));}finally{globalThis.fetch=previous;}
});

test('submission never acknowledges a write when D1 mutation receipt is missing or unsuccessful',async()=>{
  for(const mode of ['missing','failed']){
    const f=fixture();try{
      f.setSubmitReceiptMode(mode);
      const result=await f.post(submission);
      assert.equal(result.status,503,'missing or failed D1 ACK is not success');
      assert.equal(result.data.error,'submission_failed');
      assert.equal(f.db.prepare("SELECT COUNT(*) n FROM material_submissions WHERE material_id='m1' AND status='pending'").get().n,1,
        'a lost ACK must not erase a committed pending version');
      assert.equal((await f.post(submission)).status,409,'retry cannot duplicate the uncertain submission');
      const rows=(await f.get('mine','alice')).data.items;
      assert.equal(rows.length,1,'the author can recover the persisted version from the canonical history');
      assert.equal(rows[0].status,'pending');
    }finally{f.db.close();}
  }
});

test('repeat submission after an accepted write is rejected without duplicate pending snapshots',async()=>{
  const f=fixture();try{
    const original=await f.post(submission);
    assert.equal(original.status,201);
    const repeated=await f.post(submission);
    assert.equal(repeated.status,409);
    assert.equal(f.db.prepare("SELECT COUNT(*) n FROM material_submissions WHERE material_id='m1' AND status='pending'").get().n,1);
  }finally{f.db.close();}
});
