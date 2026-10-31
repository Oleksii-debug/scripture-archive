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
  db.exec("INSERT INTO accounts(id,email,email_verified_at) VALUES('editor','dordiaioleksii1@gmail.com',CURRENT_TIMESTAMP)");
  db.exec(readFileSync(new URL('../drizzle/0012_editor_roles.sql', import.meta.url), 'utf8'));
  db.exec("CREATE TABLE study_materials (id TEXT PRIMARY KEY,owner_user_id TEXT NOT NULL,title TEXT NOT NULL,locale TEXT NOT NULL,data TEXT NOT NULL,visibility TEXT NOT NULL DEFAULT 'private')");
  db.exec(readFileSync(new URL('../drizzle/0011_material_review.sql', import.meta.url), 'utf8'));
  db.exec(readFileSync(new URL('../drizzle/0014_material_takedowns.sql', import.meta.url), 'utf8'));
  db.exec(readFileSync(new URL('../drizzle/0015_material_rights_metadata.sql', import.meta.url), 'utf8'));
  const input = {prompt:'A valid question?',reference:'GEN 12',options:['one','two'],answer:'one',explanation:'Source based explanation'};
  db.prepare('INSERT INTO study_materials(id,owner_user_id,title,locale,data) VALUES (?,?,?,?,?)').run('m1','alice','Original','uk',JSON.stringify(input));
  db.prepare('INSERT INTO study_materials(id,owner_user_id,title,locale,data) VALUES (?,?,?,?,?)').run('m2','bob','Other','en',JSON.stringify(input));
  let failRead = false, throwRead = false, failBatchAt = -1, afterDraftRead = null, afterRoleRead = null, submitReceiptMode = 'normal', reviewReceiptMode = 'normal', withdrawReceiptMode = 'normal', throwAuth = false;
  const D1 = {prepare(sql){return {bind(...args){return {
    first:async()=>{const row=db.prepare(sql).get(...args)??null;if(sql.startsWith('SELECT title,locale,data') && afterDraftRead) {const hook=afterDraftRead;afterDraftRead=null;hook();}if(sql.startsWith('SELECT r.user_id') && afterRoleRead) {const hook=afterRoleRead;afterRoleRead=null;hook();}return row;},
    all:async()=>{if(throwRead)throw Error('offline');return failRead ? {success:false,results:[]} : {success:true,results:db.prepare(sql).all(...args)};},
    run:async()=>{const r=db.prepare(sql).run(...args);
      if(sql.startsWith('INSERT INTO material_submissions') && submitReceiptMode!=='normal'){
        const mode=submitReceiptMode;submitReceiptMode='normal';
        if(mode==='failed')return {success:false,meta:{changes:Number(r.changes)}};
        if(mode==='missing')return {success:true,meta:{}};
        if(mode==='text')return {success:true,meta:{changes:'1'}};
        if(mode==='boolean')return {success:true,meta:{changes:true}};
        if(mode==='null')return {success:true,meta:{changes:null}};
        if(mode==='negative')return {success:true,meta:{changes:-1}};
      }
      if(sql.startsWith("UPDATE material_submissions SET status='withdrawn'") && withdrawReceiptMode!=='normal'){
        const mode=withdrawReceiptMode;withdrawReceiptMode='normal';
        if(mode==='failed')return {success:false,meta:{changes:Number(r.changes)}};
        if(mode==='missing')return {success:true,meta:{}};
        if(mode==='negative')return {success:true,meta:{changes:-1}};
        if(mode==='text')return {success:true,meta:{changes:'1'}};
      }
      return {success:true,meta:{changes:Number(r.changes)}};},
  };}, all:async()=>{if(throwRead)throw Error('offline');return failRead ? {success:false,results:[]} : {success:true,results:db.prepare(sql).all()};}};},
  async batch(statements){db.exec('BEGIN');try {const r=[];for(const [i,s] of statements.entries()){if(i===failBatchAt)throw Error('forced failure');r.push(await s.run());}db.exec('COMMIT');
    const mode=reviewReceiptMode;reviewReceiptMode='normal';
    if(mode==='missing-first')r[0]={...r[0],meta:{}};
    if(mode==='missing-last')r[1]={...r[1],meta:{}};
    if(mode==='failed-last')r[1]={...r[1],success:false};
    return r;}catch(e){db.exec('ROLLBACK');throw e;}}};
  const source=readFileSync(new URL('../app/api/material-review/route.ts',import.meta.url),'utf8');
  const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const exports={};
  vm.runInNewContext(js,{exports,Request,Response,URL,crypto,require(id){
    if(id==='cloudflare:workers')return {env:{DB:D1}};
    if(id.endsWith('/auth'))return {isVerifiedOwner:id=>Boolean(id&&id.provider!=='agent'&&id.emailVerified&&id.email?.toLowerCase()==='dordiaioleksii1@gmail.com'),sameOrigin:r=>r.headers.get('origin')==='https://local.invalid',authenticateRequest:async r=>{if(throwAuth)throw Error('private session store failed');const id=r.headers.get('x-user');return id?{userId:id,email:id==='editor'?'dordiaioleksii1@gmail.com':`${id}@example.invalid`,emailVerified:id!=='unverified',provider:id==='agent'?'agent':'password'}:null;}};
    throw Error('unexpected import '+id);
  }});
  async function post(body,user='alice',origin='https://local.invalid') {const r=await exports.POST(new Request('https://local.invalid/api/material-review',{method:'POST',headers:{origin,'content-type':'application/json',...(user?{'x-user':user}:{})},body:JSON.stringify(body)}));return {status:r.status,data:await r.json()};}
  async function get(view,user='') {const r=await exports.GET(new Request('https://local.invalid/api/material-review?view='+view,{headers:user?{'x-user':user}:{}}));return {status:r.status,data:await r.json()};}
  return {db,post,get,setReadFailure:value=>{failRead=value;},setReadThrow:value=>{throwRead=value;},setBatchFailure:value=>{failBatchAt=value;},afterDraftRead:hook=>{afterDraftRead=hook;},afterRoleRead:hook=>{afterRoleRead=hook;},setSubmitReceiptMode:mode=>{submitReceiptMode=mode;},setReviewReceiptMode:mode=>{reviewReceiptMode=mode;},setWithdrawReceiptMode:mode=>{withdrawReceiptMode=mode;},setAuthFailure:v=>{throwAuth=v;}};
}
const submission={action:'submit',materialId:'m1',provenance:'Original work, GEN 12',rightsHolder:'Alice Author',rightsBasis:'original',licenseUrl:'',rightsConfirmed:true};
const approve=id=>({action:'review',id,decision:'approve',sourceChecked:true,rightsChecked:true});

// Route-executing SQLite checks for lossless editorial audit notes. The UI
// already limits input to 2000, but direct JSON clients must not get a
// successful review after their longer authored text was silently shortened.
for (const decision of ['approve', 'reject']) {
  test('overlong '+decision+' review note cannot mutate a pending decision', async () => {
    const f=fixture();try {
      const id=(await f.post(submission)).data.id;
      const body=decision==='approve'
        ? {...approve(id),note:'Ж'.repeat(2001)}
        : {action:'review',id,decision:'reject',note:'Ж'.repeat(2001)};
      const response=await f.post(body,'editor');
      assert.equal(response.status,400);
      assert.equal(response.data.error,'invalid_review');
      const row=f.db.prepare('SELECT status,reviewed_by,review_note FROM material_submissions WHERE id=?').get(id);
      assert.equal(row.status,'pending');
      assert.equal(row.reviewed_by,null);
      assert.ok(!row.review_note, 'no partial audit text may persist');
    }finally{f.db.close();}
  });
}

test('editor rejection persists an exact 2000-character Unicode rationale',async()=>{
  const f=fixture();try{
    const id=(await f.post(submission)).data.id;
    const full='Ж'.repeat(2000);
    assert.equal((await f.post({action:'review',id,decision:'reject',note:full},'editor')).status,200);
    const row=f.db.prepare('SELECT status,review_note FROM material_submissions WHERE id=?').get(id);
    assert.equal(row.status,'rejected');
    assert.equal(row.review_note,full);
    const history=(await f.get('mine','alice')).data.items.find(item=>item.id===id);
    assert.equal(history.reviewNote,full);
  }finally{f.db.close();}
});

test('surrounding whitespace is trimmed without shortening an exact-limit approval',async()=>{
  const f=fixture();try{
    const id=(await f.post(submission)).data.id;
    const full='Д'.repeat(2000);
    const response=await f.post({...approve(id),note:'   '+full+'   '},'editor');
    assert.equal(response.status,200);
    assert.equal(f.db.prepare('SELECT review_note FROM material_submissions WHERE id=?').get(id).review_note,full);
  }finally{f.db.close();}
});

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
    assert.deepEqual(publicItems[0].rights,{holder:'Alice Author',basis:'original',licenseUrl:null});
    assert.equal(publicItems[0].locale,'uk');
    assert.equal(typeof publicItems[0].reviewedAt,'string');
    assert.deepEqual((await f.post({action:'answer',id:submitted.data.id,choice:1},'')).data,{correct:false});
    const right=await f.post({action:'answer',id:submitted.data.id,choice:0},'');assert.equal(right.data.correct,true);assert.equal(right.data.explanation,'Source based explanation');
    assert.equal((await f.post({action:'answer',id:submitted.data.id,choice:8},'')).status,400);
  }finally{f.db.close();}
});

test('new submissions require bounded structured rights and canonical HTTPS for open licences',async()=>{
  const f=fixture();try {
    for(const body of [
      {...submission,rightsHolder:''},
      {...submission,rightsHolder:'A'.repeat(161)},
      {...submission,rightsBasis:'unknown'},
      {...submission,rightsBasis:'open_license',licenseUrl:''},
      {...submission,rightsBasis:'open_license',licenseUrl:'http://example.org/license'},
      {...submission,rightsBasis:'permission',licenseUrl:'https://user:secret@example.org/license'},
    ]) assert.equal((await f.post(body)).status,400);
    const accepted=await f.post({...submission,rightsBasis:'open_license',rightsHolder:'Example Foundation',licenseUrl:'https://example.org/license'});
    assert.equal(accepted.status,201);
    const stored=f.db.prepare('SELECT rights_holder,rights_basis,license_url FROM material_submissions WHERE id=?').get(accepted.data.id);
    assert.deepEqual({...stored},{rights_holder:'Example Foundation',rights_basis:'open_license',license_url:'https://example.org/license'});
  }finally{f.db.close();}
});

test('license provenance rejects raw Unicode controls and credential authorities before D1 writes and public reads',async()=>{
  const f=fixture();try {
    const hidden=[0x0085,0x00a0,0x061c,0x200b,0x200e,0x202e,0x2066,0xfeff,0xd800].map(x=>String.fromCharCode(x));
    for(const control of hidden) {
      const raw='https://publisher.example/license'+control+'terms';
      const response=await f.post({...submission,rightsBasis:'open_license',licenseUrl:raw});
      assert.equal(response.status,400,'forbid raw U+'+control.codePointAt(0).toString(16));
    }
    for(const url of ['https://@publisher.example/license','https://agent@publisher.example/license',
      'https://publisher.example/'+String.fromCharCode(10)+'license','http://publisher.example/license']) {
      assert.equal((await f.post({...submission,rightsBasis:'permission',licenseUrl:url})).status,400);
    }
    assert.equal(f.db.prepare('SELECT count(*) n FROM material_submissions').get().n,0);
    const safe='https://publisher.example/a%20b?source=a@b';
    const accepted=await f.post({...submission,rightsBasis:'open_license',licenseUrl:safe});
    assert.equal(accepted.status,201);
    assert.equal(f.db.prepare('SELECT license_url FROM material_submissions WHERE id=?').get(accepted.data.id).license_url,safe);
    assert.equal((await f.post(approve(accepted.data.id),'editor')).status,200);
    assert.equal((await f.get('public')).data.items[0].rights.licenseUrl,safe);
    // Restore/imported D1 data bypasses the submission admission path.
    // The public catalogue and search must fail closed for old malformed URLs.
    f.db.prepare('UPDATE material_submissions SET license_url=? WHERE id=?')
      .run('https://publisher.example/license'+String.fromCharCode(0x202e)+'hidden',accepted.data.id);
    assert.equal((await f.get('public')).status,503);
    assert.equal((await f.get('mine','alice')).status,503);
    assert.equal((await f.post({action:'librarySearch',query:'',cursor:null},'')).status,503);
  }finally{f.db.close();}
});

test('legacy null rights remain explicit while partial or malformed stored rights fail every catalogue read closed',async()=>{
  const f=fixture();try {
    const id=(await f.post(submission)).data.id;
    assert.equal((await f.post(approve(id),'editor')).status,200);
    f.db.prepare('UPDATE material_submissions SET rights_holder=NULL,rights_basis=NULL,license_url=NULL WHERE id=?').run(id);
    const legacy=(await f.get('public')).data.items[0];
    assert.equal(legacy.rights,null);
    // Simulate a damaged/restored database that bypassed the normal migration
    // trigger; runtime reads must still refuse a partly structured record.
    f.db.exec('DROP TRIGGER material_rights_metadata_update');
    f.db.prepare("UPDATE material_submissions SET rights_holder='Named holder',rights_basis=NULL WHERE id=?").run(id);
    assert.equal((await f.get('public')).status,503);
    assert.equal((await f.get('mine','alice')).status,503);
    assert.equal((await f.post({action:'librarySearch',query:'',cursor:null},'')).status,503);
  }finally{f.db.close();}
});

test('rights fields and safe public disclosure are present in the actual editorial UI',async()=>{
  const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const w=reviewText('en'), form=submissionForm({id:'draft'},w,esc);
  assert.match(form,/name="rightsHolder"[^>]*required/);
  assert.match(form,/name="rightsBasis"[^>]*required/);
  assert.match(form,/name="licenseUrl" type="url"/);
  const item={id:'v',title:'Reviewed title',reference:'GEN 1',provenance:'Source record',prompt:'What is recorded?',options:['One','Two'],locale:'en',reviewedAt:'2026-10-31 10:00:00',rights:{holder:'Holder <name>',basis:'open_license',licenseUrl:'https://example.org/license'}};
  const prior=globalThis.fetch;
  globalThis.fetch=async()=>({ok:true,json:async()=>({items:[item]})});
  const root={isConnected:true,innerHTML:'',querySelectorAll:()=>[]};
  try {
    await renderPublicMaterials(root,w,esc);
    assert.match(root.innerHTML,/Holder &lt;name&gt;/);
    assert.match(root.innerHTML,/Open licence/);
    assert.match(root.innerHTML,/2026-10-31 10:00:00 UTC/);
    assert.match(root.innerHTML,/href="https:\/\/example\.org\/license"/);
  }finally{globalThis.fetch=prior;}
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
  const w=reviewText('uk'), item={id:'id',materialId:'m1',status:'pending',reviewNote:'<script>bad</script>',provenance:'<img src=x>',rights:{holder:'Rights <holder>',basis:'permission',licenseUrl:null},submittedAt:'2026-10-31 10:00:00',reviewedAt:null,snapshot:{title:'<img>',locale:'uk',data:{reference:'GEN 12',prompt:'Question',options:['one','<b>'],answer:'one',explanation:'Because'}}};
  const html=historyMarkup([item],w,esc)+queueMarkup([item],w,esc)+submissionForm({id:'"><script>'},w,esc);
  assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img src=x>'));assert.ok(html.includes('&lt;img&gt;'));
  const previous=globalThis.fetch;
  globalThis.fetch=async()=>({ok:true,json:async()=>({items:[{id:'v',title:'<img>',reference:'GEN',provenance:'source',prompt:'Question',options:['one','two'],locale:'uk',reviewedAt:'2026-10-31 10:00:00',rights:null}]})});
  const root={isConnected:true,innerHTML:'',querySelectorAll:()=>[]};
  try {await renderPublicMaterials(root,w,esc);assert.ok(root.innerHTML.includes('&lt;img&gt;'));assert.ok(!root.innerHTML.includes('answer:'));}finally{globalThis.fetch=previous;}
});

test('submission never acknowledges a write with an unavailable, failed or nonnumeric D1 receipt',async()=>{
  for(const mode of ['missing','failed','text','boolean','null','negative']){
    const f=fixture();try{
      f.setSubmitReceiptMode(mode);
      const result=await f.post(submission);
      assert.equal(result.status,503,'untrusted D1 ACK is not success: '+mode);
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

test('editor review cannot claim success when a committed D1 batch loses either mutation receipt', async () => {
  for(const mode of ['missing-first','missing-last','failed-last']) {
    const f=fixture();
    try {
      const submitted=await f.post(submission);
      assert.equal(submitted.status,201);
      f.setReviewReceiptMode(mode);
      const response=await f.post(approve(submitted.data.id),'editor');
      assert.equal(response.status,503,mode+' is an unacknowledged review');
      assert.equal(response.data.error,'review_failed');
      // A lost response receipt is NOT evidence the D1 transaction rolled back.
      // An editor must re-read source-of-truth review history before retrying.
      const persisted=(await f.get('history','editor')).data.items[0];
      assert.equal(persisted.status,'approved',mode+' does not fabricate a rollback');
      const retry=await f.post(approve(submitted.data.id),'editor');
      assert.equal(retry.status,409,mode+' does not publish a duplicate');
      assert.equal((await f.get('public')).data.items.length,1);
    } finally { f.db.close(); }
  }
});

test('editorial POST maps a failed session store to a private 503 without changing author records',async()=>{
  for(const action of [submission,{action:'withdraw',id:'any'},{action:'review',id:'any',decision:'approve',sourceChecked:true,rightsChecked:true}]){
    const f=fixture();
    try{
      f.setAuthFailure(true);
      const outcome=await f.post(action);
      assert.equal(outcome.status,503);
      assert.equal(outcome.data.error,'materials_unavailable');
      assert.equal(outcome.data.ok,undefined);
      assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM material_submissions').get().n,0);
    }finally{f.db.close();}
  }
});

test('withdrawal with a missing, unsuccessful or malformed D1 receipt does not falsely acknowledge success',async()=>{
  for(const mode of ['missing','failed','negative','text']){
    const f=fixture();
    try{
      const created=await f.post(submission);
      assert.equal(created.status,201);
      f.setWithdrawReceiptMode(mode);
      const uncertain=await f.post({action:'withdraw',id:created.data.id});
      assert.equal(uncertain.status,503,mode);
      assert.equal(uncertain.data.error,'withdraw_failed');
      assert.equal(uncertain.data.ok,undefined);
      // The simulated SQLite write was committed; the application must not
      // silently assume a failed ACK rolled back or claim it is missing.
      assert.equal(f.db.prepare('SELECT status FROM material_submissions WHERE id=?').get(created.data.id).status,'withdrawn');
      const retry=await f.post({action:'withdraw',id:created.data.id});
      assert.equal(retry.status,409,'safe repeated withdrawal is a verified no-op');
    }finally{f.db.close();}
  }
});

test('valid D1 withdrawal receipt acknowledges once and leaves an immutable audit row',async()=>{
  const f=fixture();
  try{
    const created=await f.post(submission);assert.equal(created.status,201);
    assert.equal((await f.post({action:'withdraw',id:created.data.id},'bob')).status,409);
    const accepted=await f.post({action:'withdraw',id:created.data.id});
    assert.equal(accepted.status,200);
    assert.equal(accepted.data.ok,true);
    const closed=f.db.prepare('SELECT author_id,status,closed_at FROM material_submissions WHERE id=?').get(created.data.id);
    assert.equal(closed.author_id,'alice');
    assert.equal(closed.status,'withdrawn');
    assert.ok(closed.closed_at);
    assert.equal((await f.post({action:'withdraw',id:created.data.id})).status,409);
  }finally{f.db.close();}
});


test('historical approved snapshots exceeding the canonical author limits fail closed', async () => {
  const f = fixture();
  try {
    const id = (await f.post(submission)).data.id;
    assert.equal((await f.post(approve(id), 'editor')).status, 200);
    const select = f.db.prepare('SELECT snapshot FROM material_submissions WHERE id=?');
    const update = f.db.prepare('UPDATE material_submissions SET snapshot=? WHERE id=?');
    const original = JSON.parse(select.get(id).snapshot);
    const cases = [
      ['title length', s => { s.title = 'T'.repeat(161); }],
      ['unsupported locale', s => { s.locale = 'de'; }],
      ['prompt length', s => { s.data.prompt = 'P'.repeat(3001); }],
      ['reference length', s => { s.data.reference = 'R'.repeat(201); }],
      ['answer length', s => { s.data.answer = 'A'.repeat(501); s.data.options[0] = s.data.answer; }],
      ['explanation length', s => { s.data.explanation = 'E'.repeat(2001); }],
      ['option length', s => { s.data.options[1] = 'O'.repeat(501); }],
      ['blank legacy option', s => { s.data.options[1] = '   '; }],
    ];
    for (const [label, mutate] of cases) {
      const snapshot = structuredClone(original);
      mutate(snapshot);
      update.run(JSON.stringify(snapshot), id);
      assert.equal((await f.get('public')).status, 503, label + ': public listing must fail closed');
      assert.equal((await f.post({action:'answer',id,choice:0},'')).status, 503, label + ': answer must not be graded');
      assert.equal((await f.get('mine','alice')).status, 503, label + ': private history must not claim a valid snapshot');
    }
    update.run(JSON.stringify(original), id);
    assert.equal((await f.get('public')).status, 200);
    assert.equal((await f.post({action:'answer',id,choice:0},'')).status, 200);
    assert.equal((await f.get('mine','alice')).status, 200);
  } finally {
    f.db.close();
  }
});

function seedLibrary(f, count) {
  const insertMaterial=f.db.prepare('INSERT INTO study_materials(id,owner_user_id,title,locale,data) VALUES (?,?,?,?,?)');
  const insertReview=f.db.prepare(`INSERT INTO material_submissions
    (id,material_id,author_id,snapshot,provenance,rights_attested,status,submitted_at,reviewed_at,reviewed_by,source_checked,rights_checked)
    VALUES (?,?,?,?,?,1,'approved',?,'2026-01-01','editor',1,1)`);
  for (let i=0;i<count;i++) {
    const id=String(i).padStart(4,'0');
    const data={prompt:'Which public source?',reference:'GEN 1:1',options:['private-answer-option','other'],answer:'private-answer-option',explanation:'private explanation secret'};
    const title=i===count-1?'ІСТОРІЯ ЦЕРКВИ':'Study '+id;
    insertMaterial.run('library-material-'+id,'alice',title,'uk',JSON.stringify(data));
    insertReview.run('library-'+id,'library-material-'+id,'alice',JSON.stringify({title,locale:'uk',data}),'Visible source','2026-01-01');
  }
}

test('public library search continues beyond 200 reviewed records, matches Cyrillic case and never searches private answer fields',async()=>{
  const f=fixture();try {
    seedLibrary(f,230);
    const unpublished={prompt:'A valid pending question?',reference:'GEN 12',options:['one','two'],answer:'one',explanation:'Source based explanation'};
    const pendingSnapshot=JSON.stringify({title:'Secret pending item',locale:'uk',data:unpublished});
    f.db.prepare(`INSERT INTO material_submissions(id,material_id,author_id,snapshot,provenance,rights_attested,status)
      VALUES ('pending','m1','alice',?,'source',1,'pending')`).run(pendingSnapshot);
    const unpublishedSearch=await f.post({action:'librarySearch',query:'Secret pending',cursor:null},'');
    assert.deepEqual(unpublishedSearch.data.items,[]);
    let first=await f.post({action:'librarySearch',query:'церкви',cursor:null},'');
    assert.equal(first.status,200);
    assert.deepEqual(first.data.items,[]);
    assert.deepEqual(first.data.nextCursor,{id:'library-0199',submittedAt:'2026-01-01'});
    const second=await f.post({action:'librarySearch',query:'церкви',cursor:first.data.nextCursor},'');
    assert.equal(second.status,200);
    assert.deepEqual(second.data.items.map(x=>x.title),['ІСТОРІЯ ЦЕРКВИ']);
    assert.equal(second.data.nextCursor,null);
    assert.equal('answer' in second.data.items[0],false);
    assert.equal('explanation' in second.data.items[0],false);
    assert.equal('snapshot' in second.data.items[0],false);
    // Searching either answer-only/option-only or explanation-only strings must
    // not let a visitor infer hidden correctness or explanatory content.
    for(const query of ['private-answer-option','private explanation secret',"x' OR 1=1--"]) {
      let cursor=null, found=[];
      do {const response=await f.post({action:'librarySearch',query,cursor},'');
        assert.equal(response.status,200); found.push(...response.data.items); cursor=response.data.nextCursor;
      } while(cursor);
      assert.deepEqual(found,[]);
    }
  }finally{f.db.close();}
});

test('library pagination uses a stable keyset for tied timestamps even when an earlier item is withdrawn',async()=>{
  const f=fixture();try {
    seedLibrary(f,31);
    const first=await f.post({action:'librarySearch',query:'study',cursor:null},'');
    assert.equal(first.data.items.length,12);
    assert.deepEqual(first.data.items.map(x=>x.id),Array.from({length:12},(_,i)=>'library-'+String(i).padStart(4,'0')));
    f.db.prepare("UPDATE material_submissions SET status='withdrawn' WHERE id='library-0005'").run();
    const second=await f.post({action:'librarySearch',query:'study',cursor:first.data.nextCursor},'');
    assert.deepEqual(second.data.items.map(x=>x.id),Array.from({length:12},(_,i)=>'library-'+String(i+12).padStart(4,'0')));
    const third=await f.post({action:'librarySearch',query:'study',cursor:second.data.nextCursor},'');
    assert.deepEqual(third.data.items.map(x=>x.id),Array.from({length:6},(_,i)=>'library-'+String(i+24).padStart(4,'0')));
    assert.equal(third.data.nextCursor,null);
    assert.equal([...first.data.items,...second.data.items,...third.data.items].some(x=>x.id==='library-0030'),false);
  }finally{f.db.close();}
});

test('library search rejects malformed cursors and surfaces unavailable storage, including cross-origin requests',async()=>{
  const f=fixture();try {
    for(const body of [
      {action:'librarySearch',query:42,cursor:null},
      {action:'librarySearch',query:'x'.repeat(101),cursor:null},
      {action:'librarySearch',query:'',cursor:[]},
      {action:'librarySearch',query:'',cursor:{id:'x',submittedAt:'t',extra:'x'}},
      {action:'librarySearch',query:'',cursor:{id:'x',submittedAt:''}},
      {action:'librarySearch',query:'',cursor:{id:'',submittedAt:'t'}},
    ]) assert.equal((await f.post(body,'')).status,400);
    assert.equal((await f.post({action:'librarySearch',query:'',cursor:null},'','https://other.invalid')).status,403);
    f.setReadFailure(true);
    assert.equal((await f.post({action:'librarySearch',query:'',cursor:null},'')).status,503);
    f.setReadFailure(false);f.setReadThrow(true);
    assert.equal((await f.post({action:'librarySearch',query:'',cursor:null},'')).status,503);
  }finally{f.db.close();}
});


test('editor rights takedown atomically hides publication and preserves original review',async()=>{
  const f=fixture();try {
    const id=(await f.post(submission)).data.id;
    assert.equal((await f.post({...approve(id),note:'Original review'},'editor')).status,200);
    assert.equal((await f.post({action:'takedown',id,reason:'Rights concern'},'bob')).status,403);
    assert.equal((await f.post({action:'takedown',id,reason:'no'},'editor')).status,400);
    assert.equal((await f.post({action:'takedown',id,reason:'Rights concern'},'editor')).status,200);
    const row=f.db.prepare('SELECT status,reviewed_by,review_note FROM material_submissions WHERE id=?').get(id);
    assert.deepEqual({...row},{status:'withdrawn',reviewed_by:'editor',review_note:'Original review'});
    const audit=f.db.prepare('SELECT actor_user_id,reason FROM material_takedowns WHERE submission_id=?').get(id);
    assert.deepEqual({...audit},{actor_user_id:'editor',reason:'Rights concern'});
    assert.equal((await f.get('public')).data.items.length,0);
    assert.equal((await f.post({action:'librarySearch',query:'',cursor:null},'')).data.items.length,0);
    assert.equal((await f.post({action:'answer',id,choice:0},'')).status,404);
    assert.equal((await f.get('mine','alice')).data.items[0].takedownReason,'Rights concern');
    assert.equal((await f.get('history','editor')).data.items[0].takedownActor,'editor');
    assert.equal((await f.post({action:'takedown',id,reason:'Repeated request'},'editor')).status,409);
  }finally{f.db.close();}
});
test('editor revoked before takedown cannot alter publication',async()=>{
  const f=fixture();try {
    const id=(await f.post(submission)).data.id;await f.post(approve(id),'editor');
    f.db.prepare("INSERT INTO accounts(id,email,email_verified_at) VALUES('bob','bob@example.invalid',CURRENT_TIMESTAMP)").run();
    f.db.prepare("INSERT INTO editorial_roles(user_id,granted_by) VALUES('bob','editor')").run();
    f.afterRoleRead(()=>f.db.prepare("DELETE FROM editorial_roles WHERE user_id='bob'").run());
    assert.equal((await f.post({action:'takedown',id,reason:'Rights issue'},'bob')).status,409);
    assert.equal(f.db.prepare('SELECT status FROM material_submissions WHERE id=?').get(id).status,'approved');
    assert.equal(f.db.prepare('SELECT COUNT(*) n FROM material_takedowns').get().n,0);
  }finally{f.db.close();}
});
test('failed takedown audit insertion rolls back the publication change',async()=>{
  const f=fixture();try {
    const id=(await f.post(submission)).data.id;await f.post(approve(id),'editor');
    f.setBatchFailure(1);assert.equal((await f.post({action:'takedown',id,reason:'Rights issue'},'editor')).status,503);
    assert.equal(f.db.prepare('SELECT status FROM material_submissions WHERE id=?').get(id).status,'approved');
  }finally{f.db.close();}
});

test('deleted owner cannot use a stale identity to take down a submission',async()=>{
  const f=fixture();try {
    const id=(await f.post(submission)).data.id;await f.post(approve(id),'editor');
    f.db.exec("UPDATE accounts SET deleted_at=CURRENT_TIMESTAMP WHERE id='editor'");
    assert.equal((await f.post({action:'takedown',id,reason:'Rights issue'},'editor')).status,409);
    assert.equal(f.db.prepare('SELECT status FROM material_submissions WHERE id=?').get(id).status,'approved');
  }finally{f.db.close();}
});
