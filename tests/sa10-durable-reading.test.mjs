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
    if(id==='../../../content/mission-abraham.json')return {default:{tasks:[{id:'OTAB01-N001'},{id:'OTAB01-N002'},{id:'OTAB01-N003'},{id:'OTAB01-N004'},{id:'OTAB01-N005'}]}};
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
      assert.equal((await call(api,'reading','PUT',{reading:[chapter(1)]})).status,503);
      assert.equal(db.db.prepare('SELECT data FROM progress WHERE user_id=?').get('reader-a').data,'{}');
      db.db.prepare('DELETE FROM progress WHERE user_id=?').run('reader-a');
      db.failNext=true;assert.equal((await call(api,'reading','PUT',{reading:[chapter(2)]})).status,503);
      assert.deepEqual((await call(api,'reading')).body.reading,[]);
      db.failNext=true;assert.equal((await call(api,'progress','PUT',{progress:{correct:['A']}})).status,403);
      assert.equal(db.db.prepare("SELECT count(*) AS n FROM progress WHERE mission_id='OT-AB-01'").get().n,0);
      const profile={firstName:'Synthetic',lastName:'Reader',ageRange:'25-34',acceptPrivacy:true,locale:'ru'};
      db.failNext=true;assert.equal((await call(api,'profile','PUT',profile)).status,503);
      assert.equal((await call(api,'profile','PUT',profile)).body.user.locale,'ru');
      db.failNext=true;assert.equal((await call(api,'visibility','PUT',{firstName:true})).status,503);
      db.close();
    }finally{f.dispose()}
  });
}


// SA10: A damaged canonical row must not masquerade as successful readback or change on GET.
for (const mode of ['DELETE', 'WAL']) {
  test(`${mode}: corrupt/nonarray reading returns explicit unavailable without mutation`,async()=>{
    const f=fixture(mode);try{const db=new D1Test(f.file),api=worker(db);
      for(const broken of ['{invalid-json','{}']){
        db.db.prepare("INSERT INTO progress (user_id,mission_id,data) VALUES (?,'READING',?) ON CONFLICT(user_id,mission_id) DO UPDATE SET data=excluded.data").run('reader-a',broken);
        const response=await call(api,'reading');
        assert.equal(response.status,503,'corrupt reading must not ACK as successful 200 or raise uncontrolled exception');
        assert.equal(response.body.error,'reading_state_unavailable');
        assert.equal(db.db.prepare("SELECT data FROM progress WHERE user_id=? AND mission_id='READING'").get('reader-a').data,broken,'GET is read-only');
        assert.deepEqual((await call(api,'reading','GET',undefined,'reader-b')).body.reading,[],'unaffected user still accessible');
      }
      db.db.prepare("UPDATE progress SET data=? WHERE user_id=? AND mission_id='READING'").run(JSON.stringify([chapter(9)]),'reader-a');
      db.close();const reopened=new D1Test(f.file);
      assert.deepEqual((await call(worker(reopened),'reading')).body.reading,[chapter(9)],'repaired test-only row restored after reopening');
      reopened.close();
    }finally{f.dispose()}
  });
  test(`${mode}: legacy mission snapshots are rejected, attempts aggregate, corruption is isolated`,async()=>{
    const f=fixture(mode);try{const db=new D1Test(f.file),api=worker(db);
      db.db.prepare("INSERT INTO progress(user_id,mission_id,data) VALUES (?,?,?)").run('reader-a','OT-AB-01','{"correct":["stale"]}');
      db.db.prepare("INSERT INTO progress(user_id,mission_id,data) VALUES (?,?,?)").run('reader-a','OT-AB-01:broken','{broken');
      db.db.prepare("INSERT INTO progress(user_id,mission_id,data) VALUES (?,?,?)").run('reader-a','OT-AB-01:ok',JSON.stringify({details:[{taskId:'OTAB01-N001',correct:true},{taskId:'OTAB01-N002',correct:false}]}));
      const response=await call(api,'progress');
      assert.equal(response.status,200);
      assert.deepEqual(response.body.progress,{index:2,correct:['OTAB01-N001'],complete:false});
      assert.equal((await call(api,'progress','PUT',{progress:{correct:['wrong']}})).status,403);
      assert.equal(db.db.prepare("SELECT data FROM progress WHERE user_id=? AND mission_id='OT-AB-01'").get('reader-a').data,'{"correct":["stale"]}');
      db.close();const reopened=new D1Test(f.file);
      assert.deepEqual((await call(worker(reopened),'progress')).body.progress,{index:2,correct:['OTAB01-N001'],complete:false});
      reopened.close();
    }finally{f.dispose()}
  });
}

// SA10: both directions must reject structurally invalid receipts without a false 200 ACK.
for (const mode of ['DELETE', 'WAL']) {
  test(`${mode}: invalid incoming receipts are rejected atomically without damaging durable history`,async()=>{
    const f=fixture(mode);try{const db=new D1Test(f.file),api=worker(db);
      assert.equal((await call(api,'reading','PUT',{reading:[chapter(7)]})).status,200);
      for(const payload of [
        [null],
        [{book:'BAD!',chapter:3,title:'Synthetic'}],
        [{book:'GEN',chapter:8,title:'Good'}, {book:'GEN',chapter:0,title:'Bad'}],
        [{book:'GEN',chapter:9,title:42}],
      ]){
        const r=await call(api,'reading','PUT',{reading:payload});
        assert.equal(r.status,400,'invalid input must not return a false ACK');
        assert.equal(r.body.error,'invalid_reading');
      }
      db.close();const reopened=new D1Test(f.file);
      assert.deepEqual((await call(worker(reopened),'reading')).body.reading,[chapter(7)]);
      reopened.close();
    }finally{f.dispose()}
  });
  test(`${mode}: malformed-but-array stored history is not ACKed or overwritten`,async()=>{
    const f=fixture(mode);try{const db=new D1Test(f.file),api=worker(db);
      for(const bad of ['[null]','[1]','[{"book":"GEN","chapter":12}]', '[{"book":"GEN","chapter":0,"title":"x"}]', '[{"book":"BAD!","chapter":2,"title":"x"}]']){
        db.db.prepare("INSERT INTO progress(user_id,mission_id,data) VALUES (?,'READING',?) ON CONFLICT(user_id,mission_id) DO UPDATE SET data=excluded.data").run('reader-a',bad);
        const read=await call(api,'reading');
        assert.equal(read.status,503,'structural corruption must not masquerade as good readback');
        assert.equal(read.body.error,'reading_state_unavailable');
        const write=await call(api,'reading','PUT',{reading:[chapter(10)]});
        assert.equal(write.status,503,'cannot ACK a merged history that remains corrupted');
        assert.equal(db.db.prepare("SELECT data FROM progress WHERE user_id=? AND mission_id='READING'").get('reader-a').data,bad,'no overwrite of corrupted original');
      }
      db.close();
    }finally{f.dispose()}
  });
}

// SA10: all three planned profile locales persist through a fresh connection.
for (const mode of ['DELETE', 'WAL']) {
  test(`${mode}: UK/RU/EN locale durable write -> ACK -> independent reopen`,async()=>{
    const f=fixture(mode);try{
      for(const locale of ['uk','ru','en']){
        const db=new D1Test(f.file),api=worker(db);
        const profile={firstName:'Synthetic',lastName:'Reader',ageRange:'25-34',acceptPrivacy:true,locale};
        const saved=await call(api,'profile','PUT',profile);
        assert.equal(saved.status,200);
        assert.equal(saved.body.user.locale,locale);
        db.close();
        const reopened=new D1Test(f.file);
        const read=await call(worker(reopened),'me');
        assert.equal(read.status,200);
        assert.equal(read.body.user.locale,locale);
        reopened.close();
      }
      const db=new D1Test(f.file);
      const invalid=await call(worker(db),'profile','PUT',{firstName:'Synthetic',lastName:'Reader',ageRange:'25-34',acceptPrivacy:true,locale:'de'});
      assert.equal(invalid.status,200);
      assert.equal(invalid.body.user.locale,'uk','unsupported locale falls back to UK');
      db.close();
    }finally{f.dispose()}
  });
}
