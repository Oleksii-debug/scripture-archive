import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';
import vm from 'node:vm';

// Exercise the real, transpiled /api/account write route against SQLite's
// JSON1 engine; the limits come from the production catalog, never a test list.
const source=readFileSync(new URL('../app/api/account/route.ts',import.meta.url),'utf8');
const catalog=JSON.parse(readFileSync(new URL('../public/data/catalog.json',import.meta.url),'utf8'));
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
assert.equal(compiled.diagnostics?.length??0,0);
function harness(){
  const sqlite=new DatabaseSync(':memory:');
  sqlite.exec('CREATE TABLE progress(user_id TEXT NOT NULL, mission_id TEXT NOT NULL, data TEXT NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(user_id,mission_id))');
  const d1={prepare(sql){return {bind(...args){return {async run(){
    const out=sqlite.prepare(sql).run(...args);
    return {success:true,meta:{changes:out.changes}};
  }};}};}};
  const exports={};
  vm.runInNewContext(compiled.outputText,{exports,Request,Response,URL,require(name){
    if(name==='cloudflare:workers')return {env:{DB:d1}};
    if(name==='../../../public/data/catalog.json')return {default:catalog};
    if(name==='../../../content/mission-abraham.json')return {default:{tasks:[]}};
    if(name==='../../../lib/auth')return {
      sameOrigin:request=>request.headers.get('Origin')===new URL(request.url).origin,
      authenticateRequest:async()=>({userId:'reader',provider:'password'}),
      isVerifiedOwner:()=>false
    };
    throw Error('unexpected dependency '+name);
  }});
  const put=async reading=>{
    const result=await exports.PUT(new Request('https://reader.invalid/api/account?action=reading',{
      method:'PUT',headers:{Origin:'https://reader.invalid','Content-Type':'application/json'},
      body:JSON.stringify({reading})
    }));
    return {status:result.status,body:await result.json()};
  };
  const stored=()=>sqlite.prepare("SELECT data FROM progress WHERE user_id='reader' AND mission_id='READING'").get()?.data;
  const setStored=entries=>sqlite.prepare("INSERT INTO progress(user_id,mission_id,data) VALUES('reader','READING',?) ON CONFLICT(user_id,mission_id) DO UPDATE SET data=excluded.data").run(entries);
  return {put,stored,setStored,sqlite};
}
const incoming=[{book:'GEN',chapter:1,title:'Genesis 1'}];
test('real atomic D1 merge refuses invented legacy books instead of ACKing a corrupt history',async()=>{
  for(const row of [
    {book:'FAK',chapter:2,title:'Invented'},
    {book:'GEN',chapter:51,title:'Out of bounds'},
    {book:'JOL',chapter:5,title:'Above local four-chapter edition'},
    {book:'GEN',chapter:2,title:'   '},
    {book:'GEN',chapter:2,title:'\n\t'}
  ]){
    const h=harness(),legacy=JSON.stringify([row]);
    h.setStored(legacy);
    const result=await h.put(incoming);
    assert.equal(result.status,503,JSON.stringify(row));
    assert.equal(result.body.error,'reading_state_unavailable');
    assert.equal(h.stored(),legacy,'failed atomic merge cannot destroy legacy private history');
    h.sqlite.close();
  }
});
test('valid legacy history merges without re-labeling, duplicating or losing prior receipts',async()=>{
  const h=harness();
  h.setStored(JSON.stringify([{book:'JOL',chapter:4,title:'Joel local edition'}, {book:'GEN',chapter:1,title:'Older verified title'}]));
  const result=await h.put([...incoming,{book:'PSA',chapter:150,title:'Psalm 150'}]);
  assert.equal(result.status,200);
  assert.deepEqual(result.body,{ok:true});
  assert.deepEqual(JSON.parse(h.stored()),[
    {book:'JOL',chapter:4,title:'Joel local edition'},
    {book:'GEN',chapter:1,title:'Older verified title'},
    {book:'PSA',chapter:150,title:'Psalm 150'}
  ]);
  h.sqlite.close();
});
test('fresh account keeps canonical write and malformed JSON fails closed without a false 200',async()=>{
  const h=harness();
  assert.equal((await h.put(incoming)).status,200);
  assert.deepEqual(JSON.parse(h.stored()),incoming);
  h.setStored('{bad json');
  const before=h.stored();
  assert.equal((await h.put([{book:'GEN',chapter:2,title:'Genesis 2'}])).status,503);
  assert.equal(h.stored(),before);
  h.sqlite.close();
});


test('atomic merge refuses the 2001st saved receipt instead of stranding private GET',async()=>{
  const h=harness();
  const previous=Array.from({length:2000},(_,i)=>({book:'GEN',chapter:1,title:'Legacy '+i}));
  const exact=JSON.stringify(previous);
  h.setStored(exact);
  const result=await h.put([{book:'EXO',chapter:1,title:'Exodus'}]);
  assert.equal(result.status,503,'a rejected overflow cannot be falsely acknowledged');
  assert.equal(result.body.error,'reading_save_failed');
  assert.equal(h.stored(),exact,'overflow cannot mutate old private history');
  h.sqlite.close();
});

test('boundary accepts the 2000th receipt but refuses two new chapters from 1999',async()=>{
  const h=harness();
  const old=Array.from({length:1999},(_,i)=>({book:'GEN',chapter:1,title:'Legacy '+i}));
  h.setStored(JSON.stringify(old));
  let result=await h.put([{book:'EXO',chapter:1,title:'Exodus'}]);
  assert.equal(result.status,200);
  assert.equal(JSON.parse(h.stored()).length,2000);
  const stable=h.stored();
  result=await h.put([{book:'PSA',chapter:1,title:'Psalm'},{book:'EXO',chapter:2,title:'Exodus 2'}]);
  assert.equal(result.status,503);
  assert.equal(result.body.error,'reading_save_failed');
  assert.equal(h.stored(),stable,'multi-chapter overflow cannot partially persist');
  h.sqlite.close();
});

test('a repeat of an existing chapter at capacity does not consume a new slot',async()=>{
  const h=harness();
  const old=Array.from({length:2000},(_,i)=>({book:'GEN',chapter:1,title:'Legacy '+i}));
  h.setStored(JSON.stringify(old));
  const result=await h.put([{book:'GEN',chapter:1,title:'New client snapshot'}]);
  assert.equal(result.status,200);
  assert.deepEqual(result.body,{ok:true});
  assert.deepEqual(JSON.parse(h.stored()),old,'duplicate replay is safe and idempotent');
  h.sqlite.close();
});

test('fresh saved histories remain independent of the capacity guard',async()=>{
  const h=harness();
  const result=await h.put([{book:'JOL',chapter:4,title:'Joel chapter 4'}]);
  assert.equal(result.status,200);
  assert.deepEqual(JSON.parse(h.stored()),[{book:'JOL',chapter:4,title:'Joel chapter 4'}]);
  h.sqlite.close();
});
