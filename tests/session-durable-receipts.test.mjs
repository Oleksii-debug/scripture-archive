import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {TextEncoder} from 'node:util';
import ts from 'typescript';
import vm from 'node:vm';

const compile=file=>ts.transpileModule(readFileSync(new URL(file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const authCode=compile('../lib/auth.ts'),routeCode=compile('../app/api/auth/route.ts');
function fixture(){
  const db=new DatabaseSync(':memory:');
  // The real session INSERT now reads the verified account snapshot.
  // Keep this existing route-level receipt fixture representative of that D1 schema.
  db.exec(`CREATE TABLE accounts(id TEXT PRIMARY KEY,email_verified_at TEXT,deleted_at TEXT,session_version INTEGER NOT NULL);
    INSERT INTO accounts VALUES ('alice','2026-01-01',NULL,1);
    CREATE TABLE auth_sessions(token_hash TEXT PRIMARY KEY,user_id TEXT,session_version INTEGER,user_agent_hash TEXT,created_at TEXT,expires_at TEXT,revoked_at TEXT)`);
  let mode='ok';
  const D1={prepare(sql){return {bind(...args){return {
    async run(){
      if(mode==='throw')throw Error('database outage');
      if(mode==='false')return {success:false,meta:{changes:0}};
      const result=db.prepare(sql).run(...args),changes=Number(result.changes);
      if(mode==='missing')return {success:true};
      if(mode==='typed')return {success:true,meta:{changes:String(changes)}};
      if(mode==='zero')return {success:true,meta:{changes:0}};
      if(mode==='multiple')return {success:true,meta:{changes:2}};
      return {success:true,meta:{changes}};
    },
    async first(){return {id:'alice',email:'alice@example.invalid',email_verified_at:'2026-01-01',password_hash:'x',password_salt:'y',password_iterations:1,session_version:1}},
  }}}}};
  const env={DB:D1},base={Request,Response,URL,TextEncoder,crypto,btoa,atob};
  const auth={};vm.runInNewContext(authCode,{...base,exports:auth,require:id=>{if(id==='cloudflare:workers')return {env};throw Error(id)}});
  const handlers={};vm.runInNewContext(routeCode,{...base,exports:handlers,require:id=>{
    if(id==='cloudflare:workers')return {env};
    if(id.endsWith('lib/auth'))return {...auth,rateLimit:async()=>true,verifyPassword:async()=>true};
    if(id.endsWith('lib/email'))return {sendSecurityEmail:async()=>({delivered:true})};
    throw Error(id);
  }});
  return {db,auth,handlers,setMode:v=>{mode=v}};
}
const req=(action,cookie='')=>new Request('https://example.invalid/api/auth?action='+action,{method:'POST',headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(action==='login'?{email:'alice@example.invalid',password:'correct-password'}:{})});

test('actual login refuses to set a session cookie when the session insert receipt is unconfirmed',async()=>{
  for(const mode of ['false','missing','typed','zero','multiple','throw']){
    const f=fixture();f.setMode(mode);const response=await f.handlers.POST(req('login'));
    assert.equal(response.status,503,mode);assert.equal((await response.json()).error,'authentication_unavailable',mode);
    assert.equal(response.headers.get('set-cookie'),null,mode);f.db.close();
  }
});
test('actual login returns a cookie only after one acknowledged session insert',async()=>{
  const f=fixture();const response=await f.handlers.POST(req('login'));
  assert.equal(response.status,200);assert.match(response.headers.get('set-cookie'),/^sa_session=/);
  assert.equal(f.db.prepare('SELECT count(*) AS n FROM auth_sessions').get().n,1);f.db.close();
});
test('actual logout reports unavailable and keeps the cookie when revocation cannot be confirmed',async()=>{
  for(const mode of ['false','missing','typed','multiple','throw']){
    const f=fixture(),hash=await f.auth.sha256('alice-token');
    f.db.prepare("INSERT INTO auth_sessions(token_hash,user_id,expires_at) VALUES (?,'alice','2099-01-01')").run(hash);
    f.setMode(mode);const response=await f.handlers.POST(req('logout','sa_session=alice-token'));
    assert.equal(response.status,503,mode);assert.equal((await response.json()).error,'logout_unavailable',mode);
    assert.equal(response.headers.get('set-cookie'),null,mode);f.db.close();
  }
});
test('logout revokes only its token and accepts an already absent token as idempotent',async()=>{
  const f=fixture(),a=await f.auth.sha256('alice-token'),b=await f.auth.sha256('bob-token');
  f.db.prepare("INSERT INTO auth_sessions(token_hash,user_id,expires_at) VALUES (?,'alice','2099-01-01'),(?,'bob','2099-01-01')").run(a,b);
  let response=await f.handlers.POST(req('logout','sa_session=alice-token'));
  assert.equal(response.status,200);assert.equal(response.headers.get('set-cookie'),null,'server revocation must not clear a newer browser login');
  assert.ok(f.db.prepare('SELECT revoked_at FROM auth_sessions WHERE token_hash=?').get(a).revoked_at);
  assert.equal(f.db.prepare('SELECT revoked_at FROM auth_sessions WHERE token_hash=?').get(b).revoked_at,null);
  response=await f.handlers.POST(req('logout','sa_session=unknown'));
  assert.equal(response.status,200);f.db.close();
});
