import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import ts from 'typescript';
import vm from 'node:vm';
import { renderChurchDirectory } from '../public/church-directory.js';

function fixture() {
  const db=new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys=ON');
  db.exec('CREATE TABLE accounts (id TEXT PRIMARY KEY,email TEXT NOT NULL,email_verified_at TEXT,deleted_at TEXT)');
  db.exec("INSERT INTO accounts VALUES ('alice','alice@example.invalid',CURRENT_TIMESTAMP,NULL),('bob','bob@example.invalid',CURRENT_TIMESTAMP,NULL),('unverified','unverified@example.invalid',NULL,NULL),('owner','dordiaioleksii1@gmail.com',CURRENT_TIMESTAMP,NULL)");
  db.exec(readFileSync(new URL('../drizzle/0017_verified_church_claims.sql',import.meta.url),'utf8'));
  let authFailure=false;
  const D1={prepare(sql){return {bind(...args){return {
    all:async()=>({success:true,results:db.prepare(sql).all(...args)}),
    run:async()=>{const result=db.prepare(sql).run(...args);return {success:true,meta:{changes:Number(result.changes)}};},
  };},all:async()=>({success:true,results:db.prepare(sql).all()})};}};
  const source=readFileSync(new URL('../app/api/churches/route.ts',import.meta.url),'utf8');
  const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
  assert.equal(compiled.diagnostics?.length??0,0);
  const exports={};
  vm.runInNewContext(compiled.outputText,{exports,Request,Response,URL,crypto,Set,require(id){
    if(id==='cloudflare:workers')return {env:{DB:D1}};
    if(id.endsWith('/auth'))return {
      sameOrigin:request=>request.headers.get('origin')==='https://local.invalid',
      isVerifiedOwner:actor=>Boolean(actor&&actor.provider!=='agent'&&actor.emailVerified&&actor.email?.toLowerCase()==='dordiaioleksii1@gmail.com'),
      authenticateRequest:async request=>{
        if(authFailure)throw Error('session store offline');
        const userId=request.headers.get('x-user');
        if(!userId)return null;
        return {userId,email:userId==='owner'?'dordiaioleksii1@gmail.com':`${userId}@example.invalid`,emailVerified:userId!=='unverified',provider:userId==='agent'?'agent':'password'};
      },
    };
    throw Error('unexpected import '+id);
  }});
  async function post(body,user='alice',origin='https://local.invalid'){
    const response=await exports.POST(new Request('https://local.invalid/api/churches',{method:'POST',headers:{origin,'content-type':'application/json',...(user?{'x-user':user}:{})},body:JSON.stringify(body)}));
    return {status:response.status,data:await response.json()};
  }
  async function get(view='public',user='',query=''){
    const search=view==='public'?`q=${encodeURIComponent(query)}`:`view=${view}`;
    const response=await exports.GET(new Request(`https://local.invalid/api/churches?${search}`,{headers:user?{'x-user':user}:{}}));
    return {status:response.status,data:await response.json()};
  }
  return {db,post,get,setAuthFailure:value=>{authFailure=value;}};
}

const claim={action:'submit',name:'Grace Community',city:'Kyiv',countryCode:'UA',locale:'uk',tradition:'protestant',websiteUrl:'https://grace.example/church',representationAttested:true,websiteConsent:true};

test('verified representative claims stay private until an evidenced owner approval',async()=>{
  const f=fixture();try{
    assert.equal((await f.get()).data.items.length,0);
    assert.equal((await f.post(claim,'')).status,401);
    assert.equal((await f.post(claim,'unverified')).status,403);
    assert.equal((await f.post(claim,'agent')).status,403);
    assert.equal((await f.post(claim,'alice','https://other.invalid')).status,403);
    for(const body of [
      {...claim,representationAttested:false},
      {...claim,websiteConsent:false},
      {...claim,countryCode:'Ukraine'},
      {...claim,websiteUrl:'http://grace.example'},
      {...claim,websiteUrl:'https://user:secret@grace.example'},
      {...claim,name:'Grace\u202eCommunity'},
    ]) assert.equal((await f.post(body)).status,400);

    assert.equal((await f.post(claim)).status,201);
    assert.equal((await f.get()).data.items.length,0,'pending claims are never public');
    const mine=await f.get('mine','alice');
    assert.equal(mine.status,200);assert.equal(mine.data.items.length,1);assert.equal(mine.data.items[0].status,'pending');
    assert.equal((await f.get('mine','bob')).data.items.length,0);
    assert.equal((await f.get('queue','alice')).status,403);
    const queue=await f.get('queue','owner');
    assert.equal(queue.status,200);assert.equal(queue.data.items.length,1);
    assert.equal(queue.data.items[0].claimantId,'alice');
    assert.equal(queue.data.items[0].claimantEmail,'alice@example.invalid');
    assert.equal('verificationEvidence' in queue.data.items[0],false);
    const id=queue.data.items[0].id;
    assert.equal((await f.post({action:'review',id,decision:'approve',verificationEvidence:'',note:''},'owner')).status,400);
    assert.equal((await f.post({action:'review',id,decision:'approve',verificationEvidence:'E'.repeat(1001),note:''},'owner')).status,400);
    assert.equal((await f.post({action:'review',id,decision:'reject',verificationEvidence:'',note:'N'.repeat(2001)},'owner')).status,400);
    assert.equal((await f.post({action:'review',id,decision:'approve',verificationEvidence:'Video call and domain email confirmed',note:''},'alice')).status,403);
    assert.equal((await f.post({action:'review',id,decision:'approve',verificationEvidence:'Video call and domain email confirmed',note:''},'owner')).status,200);

    const published=(await f.get()).data.items;
    assert.equal(published.length,1);assert.equal(published[0].name,'Grace Community');
    for(const privateKey of ['claimantId','claimantEmail','verificationEvidence','reviewNote'])assert.equal(privateKey in published[0],false);
    assert.equal((await f.get('public','', 'kyiv')).data.items.length,1);
    assert.equal((await f.get('public','', 'missing')).data.items.length,0);
  }finally{f.db.close();}
});

test('corrections immediately unpublish, rejection is explained, and claimant can withdraw',async()=>{
  const f=fixture();try{
    await f.post(claim);
    let id=(await f.get('queue','owner')).data.items[0].id;
    await f.post({action:'review',id,decision:'approve',verificationEvidence:'Authority confirmed',note:''},'owner');
    assert.equal((await f.get()).data.items.length,1);

    assert.equal((await f.post({...claim,city:'Lviv'})).status,201);
    assert.equal((await f.get()).data.items.length,0,'a correction requires a fresh authority review');
    const reset=f.db.prepare('SELECT status,reviewed_at,reviewed_by,verification_evidence FROM church_directory_claims').get();
    assert.equal(reset.status,'pending');assert.equal(reset.reviewed_at,null);assert.equal(reset.reviewed_by,null);assert.equal(reset.verification_evidence,'');
    const correctedId=(await f.get('queue','owner')).data.items[0].id;
    assert.notEqual(correctedId,id,'each revision invalidates an owner queue snapshot');
    assert.equal((await f.post({action:'review',id,decision:'approve',verificationEvidence:'Stale review',note:''},'owner')).status,409);
    id=correctedId;
    assert.equal((await f.post({action:'review',id,decision:'reject',verificationEvidence:'',note:''},'owner')).status,400);
    assert.equal((await f.post({action:'review',id,decision:'reject',verificationEvidence:'ignored',note:'Please confirm the city'},'owner')).status,200);
    assert.equal((await f.get('mine','alice')).data.items[0].reviewNote,'Please confirm the city');

    await f.post({...claim,city:'Lviv'});
    id=(await f.get('queue','owner')).data.items[0].id;
    await f.post({action:'review',id,decision:'approve',verificationEvidence:'Fresh confirmation received',note:''},'owner');
    assert.equal((await f.post({action:'withdraw',id},'bob')).status,409);
    assert.equal((await f.post({action:'withdraw',id},'alice')).status,200);
    assert.equal((await f.get()).data.items.length,0);
  }finally{f.db.close();}
});

test('directory reads and authentication fail closed for damaged or unavailable private state',async()=>{
  const f=fixture();try{
    await f.post(claim);
    const id=(await f.get('queue','owner')).data.items[0].id;
    await f.post({action:'review',id,decision:'approve',verificationEvidence:'Authority confirmed',note:''},'owner');
    f.db.prepare('UPDATE church_directory_claims SET name=? WHERE id=?').run('Grace\u202eCommunity',id);
    assert.equal((await f.get()).status,503);
    assert.equal((await f.get('mine','alice')).status,503);
    f.setAuthFailure(true);
    assert.equal((await f.get('mine','alice')).status,503);
    assert.equal((await f.post({...claim,city:'Odesa'},'alice')).status,503);
  }finally{f.db.close();}
});

test('migration prevents an unevidenced approved record',()=>{
  const f=fixture();try{
    assert.throws(()=>f.db.prepare(`INSERT INTO church_directory_claims
      (id,claimant_user_id,name,city,country_code,locale,tradition,website_url,representation_attested,website_consent,status,reviewed_at,reviewed_by)
      VALUES ('bad','alice','Grace Community','Kyiv','UA','uk','other',NULL,1,1,'approved',CURRENT_TIMESTAMP,'owner')`).run());
  }finally{f.db.close();}
});

test('anonymous directory UI is honest about empty verification and rejects malformed public payloads',async()=>{
  const prior=globalThis.fetch;
  const publicRoot={innerHTML:''},status={textContent:''},searchInput={value:''},search={querySelector:()=>searchInput,onsubmit:null};
  const root={isConnected:true,innerHTML:'',querySelector(selector){return {'.church-directory-search':search,'.church-directory-public':publicRoot,'.church-directory-status':status,'.church-directory-private':{innerHTML:''},'.church-directory-owner':null,'.church-claim':null}[selector]??null;},querySelectorAll(){return [];}};
  const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  try{
    globalThis.fetch=async()=>new Response(JSON.stringify({items:[]}));
    await renderChurchDirectory(root,'en',esc,null,false);
    assert.match(root.innerHTML,/An empty directory means that there are no verified claims yet/);
    assert.match(root.innerHTML,/Church names from personal profiles are never added automatically/);
    assert.match(root.innerHTML,/Sign in with a verified account/);
    assert.match(publicRoot.innerHTML,/No verified records were found/);

    globalThis.fetch=async()=>new Response(JSON.stringify({items:[{id:'x',name:'Fake Church',city:'City',countryCode:'UA',locale:'en',tradition:'other',websiteUrl:null,reviewedAt:null}]}));
    await renderChurchDirectory(root,'en',esc,null,false);
    assert.equal(publicRoot.innerHTML,'');assert.match(status.textContent,/could not be completed/i);
  }finally{globalThis.fetch=prior;}
});

test('church directory is discoverable as a public workspace without creating seeded profiles',()=>{
  const page=readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');
  const route=readFileSync(new URL('../app/[...slug]/page.tsx',import.meta.url),'utf8');
  const sitemap=readFileSync(new URL('../app/sitemap.xml/route.ts',import.meta.url),'utf8');
  const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
  const workspace=readFileSync(new URL('../public/workspace.js',import.meta.url),'utf8');
  assert.match(page,/href="\/churches"[^>]+data-workspace="churches"/);
  assert.match(route,/"churches"/);assert.match(sitemap,/\["\/churches"/);
  assert.match(app,/"churches"/);assert.match(workspace,/renderChurchDirectory/);
  assert.doesNotMatch(readFileSync(new URL('../drizzle/0017_verified_church_claims.sql',import.meta.url),'utf8'),/INSERT INTO church_directory_claims/i);
});
