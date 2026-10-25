import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { DatabaseSync, backup } from 'node:sqlite';
import vm from 'node:vm';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);
const ts=require('typescript');
const source=readFileSync(join(root,'app/api/account/route.ts'),'utf8');
const migration=readFileSync(join(root,'drizzle/0000_scripture_archive.sql'),'utf8');
const sqlTable=(name)=>migration.match(new RegExp('CREATE TABLE `'+name+'`[^;]+;'))?.[0];
assert.ok(sqlTable('progress')&&sqlTable('profiles'),'canonical schema required');
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
assert.equal(compiled.diagnostics?.length??0,0);
class D1Test {
  constructor(file){this.db=new DatabaseSync(file);this.failNext=false;}
  prepare(sql){const self=this;return {bind(...args){return {
    async run(){if(self.failNext){self.failNext=false;return {success:false};}const v=self.db.prepare(sql).run(...args);return {success:true,meta:{changes:Number(v.changes)}};},
    async first(){return self.db.prepare(sql).get(...args)??null;},
    async all(){return {results:self.db.prepare(sql).all(...args)};}
  };}};}
  close(){this.db.close()}
}
function fixture(mode){const dir=mkdtempSync(join(tmpdir(),'sa10-canonical-'));const file=join(dir,'test.sqlite');const db=new D1Test(file);
  db.db.exec(`PRAGMA journal_mode=${mode}`);db.db.exec(sqlTable('progress'));db.db.exec(sqlTable('profiles'));
  for(const col of ['privacy_accepted_at text','public_first_name integer','public_last_name integer','public_church integer','public_progress integer'])db.db.exec(`ALTER TABLE profiles ADD COLUMN ${col}`);
  db.close();return {file,dispose:()=>rmSync(dir,{recursive:true,force:true})};
}
function worker(db){const exports={};vm.runInNewContext(compiled.outputText,{exports,require(id){
    if(id==='cloudflare:workers')return {env:{DB:db}};
    if(id==='../../../lib/auth')return {sameOrigin:r=>r.headers.get('origin')==='https://test.invalid',authenticateRequest:async r=>{
      const userId=r.headers.get('x-test-user');return userId?{userId,email:`${userId}@test.invalid`,emailVerified:true,provider:'test',fullName:null}:null;
    }};
    throw Error('unexpected isolated import '+id);
  },Request,Response,URL,console});return exports;
}
async function call(api,action,method='GET',data,who='reader-a'){
  const req=new Request(`https://test.invalid/api/account?action=${action}`,{method,headers:{origin:'https://test.invalid','x-test-user':who,'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});
  const response=await api[method](req);return {status:response.status,body:await response.json()};
}
const chapter=(n)=>({book:'GEN',chapter:n,title:'Synthetic Genesis'});
for(const mode of ['DELETE','WAL']){
  test(`${mode}: reading commit/reopen/stale retry/duplicate and independent user`,async()=>{
    const f=fixture(mode);try{const a=new D1Test(f.file),api=worker(a);
      for(const n of [12,13,12])assert.equal((await call(api,'reading','PUT',{reading:[chapter(n)]})).status,200);
      a.close();const b=new D1Test(f.file),after=worker(b);
      assert.deepEqual((await call(after,'reading')).body.reading,[chapter(12),chapter(13)]);
      assert.deepEqual((await call(after,'reading','GET',undefined,'reader-b')).body.reading,[]);
      b.close();
    }finally{f.dispose()}
  });
  test(`${mode}: lost ACK after COMMIT, four synthetic clients, safe snapshot`,async()=>{
    const f=fixture(mode);const clients=[];try{
      for(let n=0;n<4;n++)clients.push(new D1Test(f.file));
      const receipts=await Promise.all(clients.map((db,i)=>call(worker(db),'reading','PUT',{reading:[chapter([4,5,6,4][i])]})));
      assert.deepEqual(receipts.map(r=>r.status),[200,200,200,200]);
      clients.forEach(c=>c.close());clients.length=0;
      const restarted=new D1Test(f.file),api=worker(restarted);
      // The client lost the previous response and repeats a snapshot.
      assert.equal((await call(api,'reading','PUT',{reading:[chapter(4)]})).status,200);
      assert.deepEqual((await call(api,'reading')).body.reading.map(r=>r.chapter).sort(),[4,5,6]);
      const snapshot=join(dirname(f.file),'backup.sqlite');await backup(restarted.db,snapshot);restarted.close();
      const copy=new D1Test(snapshot);assert.equal(copy.db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
      assert.deepEqual((await call(worker(copy),'reading')).body.reading.map(r=>r.chapter).sort(),[4,5,6]);copy.close();
    }finally{clients.forEach(c=>c.close());f.dispose()}
  });
  test(`${mode}: bad predecessor and false D1 ACK fail closed`,async()=>{
    const f=fixture(mode);try{const db=new D1Test(f.file),api=worker(db);
      db.db.prepare('INSERT INTO progress(user_id,mission_id,data) VALUES (?,?,?)').run('reader-a','READING','{}');
      await assert.rejects(call(api,'reading','PUT',{reading:[chapter(1)]}),/malformed JSON/i);
      assert.equal(db.db.prepare('SELECT data FROM progress WHERE user_id=?').get('reader-a').data,'{}');
      db.db.prepare('DELETE FROM progress WHERE user_id=?').run('reader-a');
      db.failNext=true;assert.equal((await call(api,'reading','PUT',{reading:[chapter(2)]})).status,503);
      assert.deepEqual((await call(api,'reading')).body.reading,[]);
      db.failNext=true;assert.equal((await call(api,'progress','PUT',{progress:{correct:['A']}})).status,503);
      const profile={firstName:'Synthetic',lastName:'Reader',ageRange:'25-34',acceptPrivacy:true,locale:'ru'};
      db.failNext=true;assert.equal((await call(api,'profile','PUT',profile)).status,503);
      assert.equal((await call(api,'profile','PUT',profile)).body.user.locale,'ru');
      db.failNext=true;assert.equal((await call(api,'visibility','PUT',{firstName:true})).status,503);
      db.close();
    }finally{f.dispose()}
  });
}
