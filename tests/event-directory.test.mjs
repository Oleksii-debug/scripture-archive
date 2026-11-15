import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import ts from 'typescript';
import vm from 'node:vm';
import { renderEventDirectory } from '../public/event-directory.js';

function fixture(){
  const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');
  db.exec('CREATE TABLE accounts (id TEXT PRIMARY KEY,email TEXT NOT NULL,email_verified_at TEXT,deleted_at TEXT)');
  db.exec("INSERT INTO accounts VALUES ('alice','alice@example.invalid',CURRENT_TIMESTAMP,NULL),('bob','bob@example.invalid',CURRENT_TIMESTAMP,NULL),('unverified','unverified@example.invalid',NULL,NULL),('owner','dordiaioleksii1@gmail.com',CURRENT_TIMESTAMP,NULL)");
  db.exec(readFileSync(new URL('../drizzle/0017_verified_church_claims.sql',import.meta.url),'utf8'));
  db.exec(readFileSync(new URL('../drizzle/0018_verified_church_events.sql',import.meta.url),'utf8'));
  db.prepare(`INSERT INTO church_directory_claims
    (id,claimant_user_id,name,city,country_code,locale,tradition,website_url,representation_attested,website_consent,status,reviewed_at,reviewed_by,verification_evidence)
    VALUES ('church','alice','Grace Community','Kyiv','UA','uk','protestant',NULL,1,1,'approved',CURRENT_TIMESTAMP,'owner','Authority confirmed')`).run();
  const D1={prepare(sql){return {bind(...args){return {all:async()=>({success:true,results:db.prepare(sql).all(...args)}),run:async()=>{const result=db.prepare(sql).run(...args);return {success:true,meta:{changes:Number(result.changes)}};}};},all:async()=>({success:true,results:db.prepare(sql).all()})};}};
  const source=readFileSync(new URL('../app/api/events/route.ts',import.meta.url),'utf8');
  const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
  assert.equal(compiled.diagnostics?.length??0,0);const exports={};
  vm.runInNewContext(compiled.outputText,{exports,Request,Response,URL,crypto,Set,Date,Number,require(id){
    if(id==='cloudflare:workers')return {env:{DB:D1}};
    if(id.endsWith('/auth'))return {sameOrigin:r=>r.headers.get('origin')==='https://local.invalid',authenticateRequest:async r=>{const userId=r.headers.get('x-user');if(!userId)return null;return {userId,email:`${userId}@example.invalid`,emailVerified:userId!=='unverified',provider:userId==='agent'?'agent':'password'};}};
    throw Error('unexpected import '+id);
  }});
  const post=async(body,user='alice',origin='https://local.invalid')=>{const response=await exports.POST(new Request('https://local.invalid/api/events',{method:'POST',headers:{origin,'content-type':'application/json',...(user?{'x-user':user}:{})},body:JSON.stringify(body)}));return {status:response.status,data:await response.json()};};
  const get=async(view='public',user='',query='',cursor={})=>{const search=view==='public'?new URLSearchParams({q:query,...cursor}):`view=${view}`;const response=await exports.GET(new Request(`https://local.invalid/api/events?${search}`,{headers:user?{'x-user':user}:{}}));return {status:response.status,data:await response.json()};};
  return {db,post,get};
}

const event={action:'submit',churchId:'church',title:'Accessible Bible Conference',summary:'A two-day programme of Scripture study.',city:'Kyiv',countryCode:'UA',locale:'en',startsOn:'2099-05-10',endsOn:'2099-05-11',accessibilityDetails:'Step-free venue, captions, and an accessible transcript.',programmeUrl:'https://events.example/programme',registrationUrl:'https://events.example/register',organizerAuthorityAttested:true,publicationConsent:true};

test('only an approved church representative can publish an event and no attendee data is exposed',async()=>{const f=fixture();try{
  assert.equal((await f.get()).data.items.length,0);
  assert.equal((await f.post(event,'')).status,401);assert.equal((await f.post(event,'unverified')).status,403);assert.equal((await f.post(event,'agent')).status,403);assert.equal((await f.post(event,'alice','https://other.invalid')).status,403);
  for(const body of [{...event,organizerAuthorityAttested:false},{...event,publicationConsent:false},{...event,startsOn:'2099-02-30'},{...event,endsOn:'2099-05-09'},{...event,registrationUrl:'http://events.example'},{...event,accessibilityDetails:'\u202eHidden'}])assert.equal((await f.post(body)).status,400);
  assert.equal((await f.post(event,'bob')).status,409);
  const created=await f.post(event);assert.equal(created.status,201);assert.equal(typeof created.data.id,'string');
  const items=(await f.get()).data.items;assert.equal(items.length,1);assert.equal(items[0].churchName,'Grace Community');assert.equal(items[0].title,event.title);
  for(const key of ['organizerUserId','email','attendee','publicationConsent'])assert.equal(key in items[0],false);
  assert.equal((await f.get('public','', 'grace')).data.items.length,1);assert.equal((await f.get('public','', 'missing')).data.items.length,0);
  const mine=(await f.get('mine','alice')).data.items;assert.equal(mine.length,1);assert.equal((await f.get('mine','')).status,401);assert.equal((await f.get('mine','agent')).status,403);
}finally{f.db.close();}});

test('the representative can correct or withdraw an event and church approval remains the publication gate',async()=>{const f=fixture();try{
  const created=await f.post(event),id=created.data.id;
  assert.equal((await f.post({...event,id,title:'Corrected conference title'})).status,201);
  assert.equal((await f.get()).data.items[0].title,'Corrected conference title');
  assert.equal((await f.post({...event,id,title:'Stolen correction'},'bob')).status,409);
  f.db.prepare("UPDATE church_directory_claims SET id='church2',status='pending' WHERE id='church'").run();
  assert.equal((await f.get()).data.items.length,0,'event disappears when the representative claim is no longer approved');
  assert.equal((await f.post({...event,id},'alice')).status,409);
  f.db.prepare("UPDATE church_directory_claims SET status='approved' WHERE id='church2'").run();
  assert.equal((await f.get()).data.items.length,0,'a new approved claim leaves the old event hidden');
  const [hidden]=(await f.get('mine','alice')).data.items;
  assert.equal(hidden.id,id);
  assert.equal(hidden.status,'hidden');
  assert.equal((await f.post({...event,id,churchId:'church2',publicationConsent:false})).status,400);
  assert.equal((await f.get()).data.items.length,0);
  assert.equal((await f.post({...event,id,churchId:'church2'})).data.id,id);
  const [republished]=(await f.get()).data.items;
  assert.equal(republished.id,id);
  assert.equal(republished.churchId,'church2');
  assert.equal((await f.post({action:'withdraw',id},'bob')).status,409);assert.equal((await f.post({action:'withdraw',id})).status,200);assert.equal((await f.get()).data.items.length,0);
}finally{f.db.close();}});

test('migration contains no synthetic events and the public workspace is discoverable',()=>{
  const migration=readFileSync(new URL('../drizzle/0018_verified_church_events.sql',import.meta.url),'utf8');
  assert.doesNotMatch(migration,/INSERT INTO church_events/i);assert.match(migration,/ON DELETE CASCADE/);
  const page=readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');const route=readFileSync(new URL('../app/[...slug]/page.tsx',import.meta.url),'utf8');const sitemap=readFileSync(new URL('../app/sitemap.xml/route.ts',import.meta.url),'utf8');const workspace=readFileSync(new URL('../public/workspace.js',import.meta.url),'utf8');
  assert.match(page,/href="\/events"[^>]+data-workspace="events"/);assert.match(route,/"events"/);assert.match(sitemap,/\["\/events"/);assert.match(workspace,/renderEventDirectory/);
});

test('public search continues past 200 matching-date rows and preserves ties on consecutive pages',async()=>{
  const f=fixture();
  try {
    const insert=f.db.prepare(`INSERT INTO church_events
      (id,church_claim_id,organizer_user_id,title,summary,city,country_code,locale,starts_on,ends_on,
        accessibility_details,organizer_authority_attested,publication_consent,status)
      VALUES (?,'church','alice','Monthly Bible Conference','Conference summary',?,'UA','en','2099-05-10','2099-05-11','Venue accessibility',1,1,'active')`);
    for(let i=0;i<230;i++)insert.run(`event-${String(i).padStart(3,'0')}`,i===229?'Ivano-Frankivsk':'Kyiv');
    const toQuery=({startsOn,title,id})=>({afterDate:startsOn,afterTitle:title,afterId:id});
    const first=(await f.get('public','','ivano')).data;
    assert.deepEqual(first.items,[]);
    assert.equal(first.nextCursor.id,'event-199');
    const last=(await f.get('public','','ivano',toQuery(first.nextCursor))).data;
    assert.deepEqual(last.items.map(item=>item.id),['event-229']);
    assert.equal(last.nextCursor,null);
    const all=(await f.get()).data;
    assert.equal(all.items.length,24);
    const next=(await f.get('public','','',toQuery(all.nextCursor))).data;
    assert.equal(all.items.at(-1).id,'event-023');
    assert.equal(next.items[0].id,'event-024');
    for(const params of [{afterId:'event-001'}, {...toQuery(all.nextCursor),afterDate:'2099-02-31'}])
      assert.equal((await f.get('public','','',params)).status,400);
  }finally{f.db.close();}
});

test('anonymous event UI states its data boundary and rejects malformed public payloads',async()=>{
  const prior=globalThis.fetch,publicRoot={innerHTML:''},privateRoot={innerHTML:''},status={textContent:''},input={value:''},search={querySelector:()=>input,onsubmit:null};
  const root={isConnected:true,innerHTML:'',querySelector(selector){return {'.event-search':search,'.event-public':publicRoot,'.event-private':privateRoot,'.event-status':status}[selector]??null;},querySelectorAll(){return [];}};
  const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  try{
    globalThis.fetch=async()=>new Response(JSON.stringify({items:[]}));await renderEventDirectory(root,'en',esc,null);
    assert.match(root.innerHTML,/does not collect registrations, attendee lists, or payments/);assert.match(root.innerHTML,/Sign in with a verified account/);assert.match(publicRoot.innerHTML,/No upcoming verified events/);
    globalThis.fetch=async()=>new Response(JSON.stringify({items:[{id:'e',churchId:'c',churchName:'Fake Church',title:'Fake Event',summary:'Summary',city:'City',countryCode:'UA',locale:'en',startsOn:'2099-01-01',endsOn:'2099-01-02',accessibilityDetails:'Access',programmeUrl:null,registrationUrl:null,status:'active',createdAt:null,updatedAt:null}]}));
    await renderEventDirectory(root,'en',esc,null);assert.equal(publicRoot.innerHTML,'');assert.match(status.textContent,/could not be completed/i);
  }finally{globalThis.fetch=prior;}
});

test('a hidden event offers explicit republication after approval and can be withdrawn while review is pending',async()=>{
  const originalFetch=globalThis.fetch;
  const item={id:'saved-event',churchId:'corrected',churchName:'Grace Community',title:event.title,
    summary:event.summary,city:event.city,countryCode:event.countryCode,locale:event.locale,
    startsOn:event.startsOn,endsOn:event.endsOn,accessibilityDetails:event.accessibilityDetails,
    programmeUrl:event.programmeUrl,registrationUrl:event.registrationUrl,status:'hidden',
    createdAt:'2026-01-01 00:00:00',updatedAt:'2026-01-01 00:00:00'};
  const privateRoot={innerHTML:''};
  const nodes={'.event-search':{querySelector:()=>({value:''})},'.event-public':{innerHTML:''},
    '.event-private':privateRoot,'.event-status':{textContent:''}};
  const root={isConnected:true,innerHTML:'',querySelector:selector=>nodes[selector]??null,querySelectorAll:()=>[]};
  let status='pending';
  globalThis.fetch=async url=>Response.json({items:url==='/api/churches?view=mine'
    ? [{id:'corrected',name:'Grace Community',status}]
    : url==='/api/events?view=mine' ? [item] : []});
  try {
    const render=()=>renderEventDirectory(root,'en',String,{id:'alice',emailVerified:true});
    await render();
    assert.match(privateRoot.innerHTML,/Hidden after the representative claim changed/);
    assert.match(privateRoot.innerHTML,/event-withdraw/);
    assert.doesNotMatch(privateRoot.innerHTML,/event-edit/);
    status='approved';
    await render();
    assert.match(privateRoot.innerHTML,/Review and republish/);
    assert.match(privateRoot.innerHTML,/event-form/);
  }finally{globalThis.fetch=originalFetch;}
});

test('the event directory continues a submitted search after an empty page and restores keyboard focus',async()=>{
  const originalFetch=globalThis.fetch, calls=[];
  const input={value:''}, more={hidden:true,disabled:false};
  const heading={focus(){doc.activeElement=this;}}, doc={activeElement:null};
  const publicRoot={innerHTML:'',insertAdjacentHTML(_where,html){this.innerHTML+=html;},querySelector:()=>heading};
  const nodes={'.event-search':{querySelector:()=>input},'.event-public':publicRoot,'.event-private':{innerHTML:''},
    '.event-status':{textContent:''},'.event-more':more};
  const root={isConnected:true,innerHTML:'',ownerDocument:doc,querySelector:selector=>nodes[selector]??null};
  globalThis.fetch=async url=>{
    const params=new URL(url,'https://local.invalid').searchParams;
    calls.push([params.get('q'),params.get('afterId')]);
    return Response.json({items:[],nextCursor:params.get('q') && !params.has('afterId')
      ? {startsOn:'2099-05-10',title:'Next event',id:'event-199'} : null});
  };
  const tick=()=>new Promise(resolve=>setImmediate(resolve));
  try {
    await renderEventDirectory(root,'en',String,null);
    input.value='Ivano';nodes['.event-search'].onsubmit({preventDefault(){}});await tick();
    assert.equal(more.hidden,false);
    assert.match(publicRoot.innerHTML,/You can continue searching/);
    input.value='unsubmitted';doc.activeElement=more;more.onclick();more.onclick();
    assert.equal(more.disabled,false,'pending pagination keeps the native button focusable');
    await tick();
    assert.deepEqual(calls,[['',null],['Ivano',null],['Ivano','event-199']]);
    assert.match(publicRoot.innerHTML,/Results, page 2/);
    assert.equal(more.hidden,true);
    assert.equal(doc.activeElement,heading);
  }finally{globalThis.fetch=originalFetch;}
});
