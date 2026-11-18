import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';
import vm from 'node:vm';
import * as resources from '../public/material-resource.js';
import {validPublicMaterial,renderMaterialItems,queueMarkup,reviewText} from '../public/material-review.js';

const data={kind:'resource',resourceType:'audio',url:'https://publisher.example/reading.mp3',prompt:'An introduction to the passage.',reference:'GEN 12',accessibility:'Transcript: Abram leaves his country in response to the call.'};
const draft={...data,title:'Accessible audio reading',locale:'en'};
const submission=id=>({action:'submit',materialId:id,provenance:'Original author recording',rightsHolder:'Original Author',rightsBasis:'original',rightsConfirmed:true});
const approve=id=>({action:'review',id,decision:'approve',sourceChecked:true,rightsChecked:true});
function fixture(){
  const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');
  for(const file of readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort())db.exec(readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
  for(const id of ['author','editor','other'])db.prepare("INSERT INTO accounts(id,email,password_hash,password_salt,password_iterations,first_name,last_name,email_verified_at) VALUES (?,?,'hash','salt',100000,'Test','User',CURRENT_TIMESTAMP)").run(id,id+'@example.invalid');
  db.exec("INSERT INTO editorial_roles(user_id,granted_by) VALUES ('editor','editor')");
  const D1={prepare(sql){const statement=(args=[])=>({bind:(...v)=>statement(v),first:async()=>db.prepare(sql).get(...args)||null,all:async()=>({success:true,results:db.prepare(sql).all(...args)}),run:async()=>({success:true,meta:{changes:Number(db.prepare(sql).run(...args).changes)}}),read:()=>sql.trimStart().startsWith('SELECT')});return statement();},async batch(statements){db.exec('BEGIN');try{const out=[];for(const s of statements)out.push(await(s.read()?s.all():s.run()));db.exec('COMMIT');return out;}catch(e){db.exec('ROLLBACK');throw e;}}};
  const routes={};
  for(const route of ['materials','material-review']){
    const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../app/api/'+route+'/route.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Request,Response,URL,crypto,require(name){if(name.endsWith('/material-resource.js'))return resources;if(name==='cloudflare:workers')return {env:{DB:D1}};if(name.endsWith('/auth'))return {sameOrigin:r=>r.headers.get('origin')==='https://local.invalid',isVerifiedOwner:()=>false,authenticateRequest:async r=>{const userId=r.headers.get('x-user');return userId?{userId,provider:'password',emailVerified:true}:null;}};throw Error(name);}});routes[route]=exports;
  }
  return {db,async call(route,body,user='author',method=body?'POST':'GET',origin='https://local.invalid'){
    const response=await routes[route.split('?')[0]][method](new Request('https://local.invalid/api/'+route,{method,headers:{origin,'x-user':user},...(body?{body:JSON.stringify(body)}:{})}));return {status:response.status,data:await response.json()};
  }};
}

for(const resourceType of ['text','document','audio','video','image'])test(resourceType+' uses canonical private draft, independent review, search, immutable snapshot, export and withdrawal',async()=>{
  const f=fixture();try{
    const saved=await f.call('materials',{...draft,resourceType});assert.equal(saved.status,201);const id=saved.data.id;
    assert.equal((await f.call('materials',{...draft,id},'other')).status,403);
    assert.equal((await f.call('material-review',submission(id),'other')).status,409);
    assert.equal((await f.call('material-review',{...submission(id),rightsConfirmed:false})).status,400);
    const submitted=await f.call('material-review',submission(id));assert.equal(submitted.status,201);const sid=submitted.data.id;
    assert.equal((await f.call('material-review?view=public',null,'')).data.items.length,0);
    const queue=(await f.call('material-review?view=queue',null,'editor')).data.items;
    assert.equal(queue[0].snapshot.data.resourceType,resourceType);
    assert.equal((await f.call('material-review',approve(sid))).status,403);
    assert.equal((await f.call('material-review',approve(sid),'editor')).status,200);
    const search=await f.call('material-review',{action:'librarySearch',query:'Abram'},'');assert.equal(search.status,200);assert.equal(search.data.items.length,1);
    const item=search.data.items[0];assert.equal(item.resourceType,resourceType);assert.equal(item.accessibility,data.accessibility);assert.equal(item.rights.holder,'Original Author');assert.equal(validPublicMaterial(item),true);assert.equal('options' in item,false);
    const answer=await f.call('material-review',{action:'answer',id:sid,choice:0},'');assert.equal(answer.status,400);assert.equal(answer.data.error,'not_an_exercise');
    assert.equal((await f.call('materials',{...draft,id,resourceType,url:'https://publisher.example/edited',accessibility:'Changed draft transcript.'})).status,200);
    assert.equal((await f.call('material-review?view=public',null,'')).data.items[0].url,data.url);
    const exported=await f.call('materials?mine=1&export=1');assert.equal(exported.status,200);assert.equal(exported.data.materials[0].data.url,'https://publisher.example/edited');assert.equal(exported.data.submissions[0].snapshot.data.url,data.url);
    assert.equal((await f.call('materials?mine=1&export=1',null,'other')).data.materials.length,0);
    assert.equal((await f.call('material-review',{action:'withdraw',id:sid})).status,200);
    assert.equal((await f.call('material-review?view=public',null,'')).data.items.length,0);
    assert.equal((await f.call('material-review',{action:'librarySearch',query:'Abram'},'')).data.items.length,0);
  }finally{f.db.close();}
});

test('resource boundaries reject unsafe links, incomplete alternatives, mixed exercise payloads and unsupported kinds before writing',async()=>{
  const f=fixture();try{
    for(const patch of [
      ...['javascript:alert(1)','http://example.com/a','https://user:password@example.com/a','https://@example.com/a','https://example.com/\u202Efile','https://example.com/\nfile','https://example.com\\@evil.invalid/a','https://example.com/'+ 'x'.repeat(500)].map(url=>({url})),
      {accessibility:''},{accessibility:'x'.repeat(3001)},{resourceType:'iframe'},{kind:'unknown'},
      {answer:'private answer'},{options:['a','b']},{explanation:'not a transcript'},
    ])assert.equal((await f.call('materials',{...draft,...patch})).status,400,JSON.stringify(patch));
    assert.equal((await f.call('materials',draft,'author','POST','https://evil.invalid')).status,403);
    assert.equal((await f.call('materials',draft,'')).status,401);
    assert.equal(f.db.prepare('SELECT count(*) n FROM study_materials').get().n,0);
  }finally{f.db.close();}
});

test('resource rendering escapes text, exposes a deliberate external link and transcript, and never installs quiz or remote embeds',()=>{
  const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const item={...data,id:'resource',title:'Recording',locale:'en',provenance:'Source',reviewedAt:'2026-11-18',rights:null,accessibility:'Transcript <img src=x onerror=alert(1)>'};
  const root={innerHTML:'',querySelectorAll:()=>[]};renderMaterialItems(root,[item],reviewText('en'),esc,()=>true);
  assert.match(root.innerHTML,/Open material on external site/);assert.match(root.innerHTML,/&lt;img/);assert.match(root.innerHTML,/noreferrer noopener/);assert.doesNotMatch(root.innerHTML,/<(?:audio|video|iframe|img|form)\b/);
  const queue=queueMarkup([{id:'resource',snapshot:{title:item.title,locale:'en',data:item},provenance:'Source',rights:null,submittedAt:'2026-11-18'}],reviewText('en'),esc);
  assert.match(queue,/Transcript &lt;img/);assert.match(queue,/material-review/);
  assert.equal(validPublicMaterial({...item,url:'javascript:alert(1)'}),false);
  assert.equal(validPublicMaterial({...item,kind:'unknown',options:['a','b']}),false);
});
