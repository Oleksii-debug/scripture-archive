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
  async function get(view='public',user='',query='',parameters={}){
    const search=new URLSearchParams(view==='public'?{q:query,...parameters}:{view,...parameters});
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

test('an approved church leaves public search when its representative is deleted or loses verification',async()=>{
  const f=fixture();
  try {
    assert.equal((await f.post(claim,'alice')).status,201);
    assert.equal((await f.post({...claim,name:'Hope Community'},'bob')).status,201);
    for (const {id} of (await f.get('queue','owner')).data.items)
      assert.equal((await f.post({action:'review',id,decision:'approve',verificationEvidence:'Authority confirmed',note:''},'owner')).status,200);
    assert.equal((await f.get()).data.items.length,2);
    f.db.prepare("UPDATE accounts SET deleted_at=CURRENT_TIMESTAMP WHERE id='alice'").run();
    f.db.prepare("UPDATE accounts SET email_verified_at=NULL WHERE id='bob'").run();
    assert.deepEqual((await f.get()).data.items,[]);
    assert.deepEqual((await f.get('public','','grace')).data.items,[]);
    f.db.prepare("UPDATE accounts SET email_verified_at=CURRENT_TIMESTAMP WHERE id='bob'").run();
    assert.deepEqual((await f.get()).data.items.map(item=>item.name),['Hope Community']);
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


test('church search reaches rows after the scan bound, traverses ties and combines verified filters',async()=>{
  const f=fixture();
  try {
    const account=f.db.prepare("INSERT INTO accounts VALUES (?, ?, CURRENT_TIMESTAMP, NULL)");
    const insert=f.db.prepare(`INSERT INTO church_directory_claims
      (id,claimant_user_id,name,city,country_code,locale,tradition,representation_attested,website_consent,status,reviewed_at,reviewed_by,verification_evidence)
      VALUES (?,?,'Grace Community','Kyiv',?, ?, ?,1,1,'approved',CURRENT_TIMESTAMP,'owner','Authority fixture')`);
    for(let i=0;i<230;i++) {
      const id=`church-${String(i).padStart(3,'0')}`;
      account.run(id,`${id}@example.invalid`);
      insert.run(id,id,i===229?'SK':'UA',i===229?'uk':'en',i===229?'adventist':'other');
    }
    const cursor=({name,city,id})=>({afterName:name,afterCity:city,afterId:id});
    const first=(await f.get('public','','SK')).data;
    assert.deepEqual(first.items,[]);assert.equal(first.nextCursor.id,'church-199');
    const last=(await f.get('public','','SK',cursor(first.nextCursor))).data;
    assert.deepEqual(last.items.map(item=>item.id),['church-229']);assert.equal(last.nextCursor,null);
    let page=(await f.get()).data;
    const ids=[];
    for(let i=0;i<20;i++) {
      assert.ok(page.items.length<=24);ids.push(...page.items.map(item=>item.id));
      if(!page.nextCursor)break;
      page=(await f.get('public','','',cursor(page.nextCursor))).data;
    }
    assert.equal(ids.length,230);assert.equal(new Set(ids).size,230);
    const filtered=(await f.get('public','','grace',{locale:'uk',tradition:'adventist'})).data;
    assert.deepEqual(filtered.items.map(item=>item.id),['church-229']);assert.equal(filtered.nextCursor,null);
    assert.deepEqual((await f.get('public','','',{locale:'en',tradition:'adventist'})).data.items,[]);
    for(const parameters of [{afterId:'church-001'},{afterName:'Grace Community',afterCity:'K',afterId:'x'},{locale:'xx'},{tradition:'unknown'},{locale:['en','uk']}])
      assert.equal((await f.get('public','','',parameters)).status,400);
    f.db.prepare("UPDATE accounts SET deleted_at=CURRENT_TIMESTAMP WHERE id='church-229'").run();
    assert.deepEqual((await f.get('public','','',{locale:'uk',tradition:'adventist'})).data.items,[]);
  }finally{f.db.close();}
});

test('church pagination retains submitted filters, earlier pages and native keyboard focus',async()=>{
  const originalFetch=globalThis.fetch,calls=[],input={value:''},locale={value:''},tradition={value:''},more={hidden:true,disabled:false};
  const doc={activeElement:null},heading={focus(){doc.activeElement=this;}};
  const publicRoot={innerHTML:'',insertAdjacentHTML(_where,html){this.innerHTML+=html;},querySelector:()=>heading};
  const nodes={'.church-directory-search':{querySelector:selector=>({'input':input,'[name=locale]':locale,'[name=tradition]':tradition})[selector]},'.church-directory-public':publicRoot,'.church-directory-private':{innerHTML:''},'.church-directory-status':{textContent:''},'.church-directory-more':more};
  const root={isConnected:true,innerHTML:'',ownerDocument:doc,querySelector:selector=>nodes[selector]??null,querySelectorAll:()=>[]};
  globalThis.fetch=async url=>{
    const params=new URL(url,'https://local.invalid').searchParams;
    calls.push([params.get('q'),params.get('locale'),params.get('tradition'),params.get('afterId')]);
    return Response.json({items:[],nextCursor:params.get('q')&&!params.has('afterId')?{name:'Grace Community',city:'Kyiv',id:'church-199'}:null});
  };
  const tick=()=>new Promise(resolve=>setImmediate(resolve));
  try {
    await renderChurchDirectory(root,'en',String,null);
    input.value='Grace';locale.value='uk';tradition.value='adventist';
    nodes['.church-directory-search'].onsubmit({preventDefault(){}});await tick();
    assert.equal(more.hidden,false);assert.match(publicRoot.innerHTML,/You can continue searching/);
    input.value='unsubmitted';locale.value='en';tradition.value='other';doc.activeElement=more;
    more.onclick();more.onclick();assert.equal(more.disabled,false);await tick();
    assert.deepEqual(calls,[['','','',null],['Grace','uk','adventist',null],['Grace','uk','adventist','church-199']]);
    assert.match(publicRoot.innerHTML,/Results, page 1/);assert.match(publicRoot.innerHTML,/Results, page 2/);
    assert.equal(more.hidden,true);assert.equal(doc.activeElement,heading);
  }finally{globalThis.fetch=originalFetch;}
});


test('private review queue reaches all 230 claims with stable cursors despite moderation',async()=>{
  const f=fixture();
  try {
    const account=f.db.prepare("INSERT INTO accounts VALUES (?, ?, CURRENT_TIMESTAMP, NULL)");
    const insert=f.db.prepare(`INSERT INTO church_directory_claims
      (id,claimant_user_id,name,city,country_code,locale,tradition,representation_attested,website_consent,status,submitted_at)
      VALUES (?,?,'Grace Community','Kyiv','UA','uk','other',1,1,'pending','2026-11-16 10:00:00')`);
    for(let i=0;i<230;i++) {const id=`claim-${String(i).padStart(3,'0')}`;account.run(id,`${id}@example.invalid`);insert.run(id,id);}
    let page=(await f.get('queue','owner')).data;
    assert.equal(page.items.length,50);assert.equal(page.nextCursor.id,'claim-049');
    assert.equal((await f.post({action:'review',id:'claim-049',decision:'reject',note:'Duplicate fixture'},'owner')).status,200);
    const ids=page.items.map(item=>item.id);
    for(let i=0;page.nextCursor&&i<10;i++) {
      page=(await f.get('queue','owner','',{afterSubmittedAt:page.nextCursor.submittedAt,afterId:page.nextCursor.id})).data;
      ids.push(...page.items.map(item=>item.id));
    }
    assert.equal(ids.length,230);assert.equal(new Set(ids).size,230);assert.equal(ids.at(-1),'claim-229');assert.equal(page.nextCursor,null);
    assert.equal((await f.post({action:'review',id:'claim-229',decision:'approve',verificationEvidence:'Authority confirmed'},'owner')).status,200);
    assert.equal((await f.get()).data.items[0].id,'claim-229');
    for(const user of ['alice','agent','unverified'])assert.equal((await f.get('queue',user,'',{afterSubmittedAt:'2026-11-16 10:00:00',afterId:'claim-199'})).status,403);
    for(const parameters of [{afterId:'claim-001'},{afterSubmittedAt:'2026-11-16 10:00:00'},{afterSubmittedAt:'invalid',afterId:'x'}])assert.equal((await f.get('queue','owner','',parameters)).status,400);
  }finally{f.db.close();}
});
