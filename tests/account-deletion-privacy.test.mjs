import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import ts from 'typescript';
import vm from 'node:vm';

test('account deletion clears personal records while preserving other users', async () => {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys=ON');
  for (const name of readdirSync(new URL('../drizzle/', import.meta.url)).filter(n => /^000[0-8]_.*\.sql$/.test(n)).sort())
    db.exec(readFileSync(new URL('../drizzle/' + name, import.meta.url), 'utf8'));
  for (const id of ['alice', 'bob']) {
    db.prepare("INSERT INTO accounts (id,email,password_hash,password_salt,password_iterations,first_name,last_name) VALUES (?,?,?,?,?,?,?)").run(id, `${id}@example.invalid`, 'hash', 'salt', 1, 'First', 'Last');
    db.prepare("INSERT INTO progress(user_id,mission_id,data) VALUES (?,'READING','[]')").run(id);
    db.prepare("INSERT INTO auth_tokens(token_hash,user_id,purpose,expires_at) VALUES (?,?,'reset','2099-01-01')").run('token-'+id,id);
    db.prepare("INSERT INTO auth_sessions(token_hash,user_id,session_version,user_agent_hash,expires_at) VALUES (?,?,1,'agent','2099-01-01')").run('session-'+id,id);
    db.prepare("INSERT INTO mission_attempts(id,actor_id,mission_id,book_id,chapter,locale,task_limit,expires_at) VALUES (?,?,'M','GEN',1,'uk',1,'2099-01-01')").run('attempt-'+id,id);
    db.prepare("INSERT INTO mission_attempt_answers(attempt_id,task_id,selected_json,is_correct) VALUES (?,'task','[]',0)").run('attempt-'+id);
    db.prepare("INSERT INTO chapter_read_receipts(id,actor_id,book_id,chapter) VALUES (?,?,'GEN',1)").run('receipt-'+id,id);
    db.prepare("INSERT INTO support_requests(id,user_id,email,subject,message) VALUES (?,?,?,'Subject','Synthetic message')").run('request-'+id,id,`${id}@example.invalid`);
    db.prepare("INSERT INTO support_attachments(id,request_id,filename,content_type,size_bytes,content_base64) VALUES (?,?,'a.txt','text/plain',1,'YQ==')").run('attachment-'+id,'request-'+id);
  }
  let failAfter = -1;
  const D1 = {prepare(sql) {return {bind(...args) {return {first: async () => db.prepare(sql).get(...args), run: async () => db.prepare(sql).run(...args)};}};}, async batch(statements) {db.exec('BEGIN');try {for (const [index, statement] of statements.entries()) {if(index === failAfter) throw Error('simulated database failure'); await statement.run();}db.exec('COMMIT');} catch(error) {db.exec('ROLLBACK');throw error;}}};
  const source = readFileSync(new URL('../app/api/auth/route.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {exports, Request, Response, URL, crypto, require(id) {
    if (id === 'cloudflare:workers') return {env:{DB:D1}};
    if (id.endsWith('lib/auth')) return {sameOrigin: () => true, requestAddress: () => 'test', authenticateRequest: async () => ({userId:'alice',provider:'password'}), verifyPassword: async password => password === 'correct', clearSessionCookie: () => 'sa_session=; Max-Age=0'};
    if (id.endsWith('lib/email')) return {};
    throw Error('Unexpected dependency');
  }});
  const request = password => new Request('https://example.invalid/api/auth?action=delete-account', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});
  assert.equal((await exports.POST(request('wrong'))).status, 401);
  assert.equal(db.prepare('SELECT count(*) n FROM mission_attempts').get().n, 2);
  failAfter = 3;
  await assert.rejects(exports.POST(request('correct')), /simulated database failure/);
  assert.equal(db.prepare("SELECT count(*) n FROM progress WHERE user_id='alice'").get().n, 1, 'failed batch rolls back earlier deletions');
  assert.equal(db.prepare("SELECT deleted_at FROM accounts WHERE id='alice'").get().deleted_at, null);
  failAfter = -1;
  assert.equal((await exports.POST(request('correct'))).status, 200);
  const alice = db.prepare("SELECT email,first_name,last_name,password_hash,password_salt,deleted_at FROM accounts WHERE id='alice'").get();
  assert.equal(alice.first_name, ''); assert.equal(alice.last_name, ''); assert.equal(alice.password_hash, ''); assert.equal(alice.password_salt, ''); assert.ok(alice.deleted_at); assert.equal(alice.email, 'deleted-alice@invalid.local');
  for (const [table,column] of [['progress','user_id'],['auth_tokens','user_id'],['auth_sessions','user_id'],['mission_attempts','actor_id'],['chapter_read_receipts','actor_id'],['support_requests','user_id']]) {
    assert.equal(db.prepare(`SELECT count(*) n FROM ${table} WHERE ${column}=?`).get('alice').n, 0, table);
    assert.equal(db.prepare(`SELECT count(*) n FROM ${table} WHERE ${column}=?`).get('bob').n, 1, table);
  }
  assert.equal(db.prepare("SELECT count(*) n FROM mission_attempt_answers WHERE attempt_id='attempt-alice'").get().n, 0);
  assert.equal(db.prepare("SELECT count(*) n FROM support_attachments WHERE request_id='request-alice'").get().n, 0);
  assert.equal(db.prepare("SELECT count(*) n FROM support_attachments WHERE request_id='request-bob'").get().n, 1);
  db.close();
});
