import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import vm from 'node:vm';
import ts from 'typescript';
function fixture(){
 const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');
 for(const file of readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort())db.exec(readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
 let authCalls=0,offline=false;
 const DB={prepare(sql){if(offline)throw Error('offline');const stmt=(args=[])=>({bind:(...values)=>stmt(values),all:async()=>({success:true,results:db.prepare(sql).all(...args)})});return stmt();}};
 const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../app/api/groups/route.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,{exports,Request,Response,URL,crypto,require(name){
  if(name==='cloudflare:workers')return {env:{DB}};
  if(name.endsWith('/catalog.json'))return {__esModule:true,default:{books:{en:[]}}};
  if(name.endsWith('/auth'))return {sameOrigin:r=>r.headers.get('origin')==='https://local.invalid',authenticateRequest:async()=>{authCalls++;throw Error('broken_session');}};
  throw Error(name);
 }});
 return {db,get authCalls(){return authCalls;},offline(){offline=true;},add(id,{visibility='public',name='Спільне читання',city='Київ',description='Дослідження Писання',marathon=0,roster='count'}={}){db.prepare("INSERT INTO home_groups(id,owner_user_id,name,city,description,visibility,invite_code,marathon_enabled,roster_visibility) VALUES (?,'author',?,?,?,?,?,?,?)").run(id,name,city,description,visibility,id+'-SECRET',marathon,roster);},async search(body,origin='https://local.invalid'){
  const r=await exports.POST(new Request('https://local.invalid/api/groups?action=directorySearch',{method:'POST',headers:{origin},body:JSON.stringify(body)}));return {status:r.status,data:await r.json(),cache:r.headers.get('cache-control')};
 }};
}
test('public group discovery traverses every page and never exposes private groups, invitations or names',async()=>{
 const f=fixture();try{
  for(let i=0;i<135;i++)f.add('group-'+String(i).padStart(3,'0'),{roster:i===0?'private':'count'});
  f.add('private',{visibility:'private',name:'Secret location',city:'Hidden city'});
  f.db.exec("INSERT INTO home_group_members(group_id,user_id,display_name,role) VALUES ('group-000','author','Private member','owner')");
  let cursor=null;const ids=[];do{const r=await f.search({query:'',cursor});assert.equal(r.status,200);assert.match(r.cache,/no-store/);assert.doesNotMatch(JSON.stringify(r.data),/SECRET|Private member|Secret location|Hidden city/);if(cursor===null)assert.equal(r.data.groups[0].memberCount,null);ids.push(...r.data.groups.map(g=>g.id));cursor=r.data.nextCursor;}while(cursor);
  assert.equal(ids.length,135);assert.equal(new Set(ids).size,135);assert.equal(f.authCalls,0,'public reads do not depend on a session');
  assert.deepEqual((await f.search({query:'SECRET'})).data.groups,[]);
  assert.deepEqual((await f.search({query:'Private member'})).data.groups,[]);
  assert.deepEqual((await f.search({query:'Hidden city'})).data.groups,[]);
 }finally{f.db.close();}
});
test('Unicode public fields and study format combine beyond the 200-record scan; opt-out removes future matches',async()=>{
 const f=fixture();try{
  for(let i=0;i<205;i++)f.add('a-'+String(i).padStart(3,'0'),{city:'Львів'});
  f.add('z-1',{city:'КИЇВ',marathon:1});f.add('z-2',{city:'Київ',marathon:0});
  const first=await f.search({query:'київ',marathon:true});assert.deepEqual(first.data.groups,[]);assert.ok(first.data.nextCursor);
  const last=await f.search({query:'київ',marathon:true,cursor:first.data.nextCursor});assert.deepEqual(last.data.groups.map(g=>g.id),['z-1']);assert.equal(last.data.nextCursor,null);
  assert.deepEqual((await f.search({query:'київ',marathon:false,cursor:first.data.nextCursor})).data.groups.map(g=>g.id),['z-2']);
  f.db.exec("UPDATE home_groups SET visibility='private' WHERE id='z-1'");assert.deepEqual((await f.search({query:'київ',marathon:true,cursor:first.data.nextCursor})).data.groups,[]);
 }finally{f.db.close();}
});
test('discovery rejects malformed filters, cross-origin requests and unavailable or corrupt storage',async()=>{
 const f=fixture();try{
  for(const body of [null,{},[],{query:1},{query:'x'.repeat(101)},{query:'',marathon:'true'},{query:'',marathon:[]},{query:'',cursor:{}},{query:'',cursor:''},{query:'',cursor:' bad'},{query:'',cursor:'x'.repeat(81)}])assert.equal((await f.search(body)).status,400,JSON.stringify(body));
  assert.equal((await f.search({query:''},'https://other.invalid')).status,403);
  f.add('group');f.db.exec("UPDATE home_groups SET name='' WHERE id='group'");assert.equal((await f.search({query:''})).status,503);
  f.offline();assert.equal((await f.search({query:''})).status,503);assert.equal(f.authCalls,0);
 }finally{f.db.close();}
});
