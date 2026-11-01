import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import ts from 'typescript';
import vm from 'node:vm';

test('account deletion clears personal records while preserving other users', async () => {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys=ON');
  for (const name of readdirSync(new URL('../drizzle/', import.meta.url)).filter(n => /^00(?:0[0-9]|1[0-4])_.*\.sql$/.test(n)).sort())
    db.exec(readFileSync(new URL('../drizzle/' + name, import.meta.url), 'utf8'));
  for (const id of ['alice', 'bob']) {
    db.prepare("INSERT INTO accounts (id,email,password_hash,password_salt,password_iterations,first_name,last_name) VALUES (?,?,?,?,?,?,?)").run(id, `${id}@example.invalid`, 'hash', 'salt', 1, 'First', 'Last');
    db.prepare("INSERT INTO progress(user_id,mission_id,data) VALUES (?,'READING','[]')").run(id);
    db.prepare("INSERT INTO reader_bookmarks(user_id,edition,book,chapter) VALUES (?,'en-web','GEN',1)").run(id);
    db.prepare("INSERT INTO auth_tokens(token_hash,user_id,purpose,expires_at) VALUES (?,?,'reset','2099-01-01')").run('token-'+id,id);
    db.prepare("INSERT INTO auth_sessions(token_hash,user_id,session_version,user_agent_hash,expires_at) VALUES (?,?,1,'agent','2099-01-01')").run('session-'+id,id);
    db.prepare("INSERT INTO editorial_roles(user_id,granted_by) VALUES (?, 'owner')").run(id);
    db.prepare("INSERT INTO mission_attempts(id,actor_id,mission_id,book_id,chapter,locale,task_limit,expires_at) VALUES (?,?,'M','GEN',1,'uk',1,'2099-01-01')").run('attempt-'+id,id);
    db.prepare("INSERT INTO mission_attempt_answers(attempt_id,task_id,selected_json,is_correct) VALUES (?,'task','[]',0)").run('attempt-'+id);
    db.prepare("INSERT INTO chapter_read_receipts(id,actor_id,book_id,chapter) VALUES (?,?,'GEN',1)").run('receipt-'+id,id);
    db.prepare("INSERT INTO support_requests(id,user_id,email,subject,message) VALUES (?,?,?,'Subject','Synthetic message')").run('request-'+id,id,`${id}@example.invalid`);
    db.prepare("INSERT INTO support_attachments(id,request_id,filename,content_type,size_bytes,content_base64) VALUES (?,?,'a.txt','text/plain',1,'YQ==')").run('attachment-'+id,'request-'+id);
  }
  db.prepare("INSERT INTO accounts (id,email,password_hash,password_salt,password_iterations,first_name,last_name) VALUES ('carol','carol@example.invalid','hash','salt',1,'First','Last')").run();
  db.prepare("INSERT INTO editorial_roles(user_id,granted_by) VALUES ('carol','alice')").run();
  for (const [id, actor] of [['sub-alice','alice'],['sub-bob','bob']]) {
    db.prepare("INSERT INTO study_materials(id,owner_user_id,title,locale,data) VALUES (?, 'bob', 'Study','en','{}')").run('material-'+id);
    db.prepare("INSERT INTO material_submissions(id,material_id,author_id,snapshot,provenance,rights_attested,status) VALUES (?,?, 'bob','{}','source',1,'withdrawn')").run(id,'material-'+id);
    db.prepare("INSERT INTO material_takedowns(submission_id,actor_user_id,reason) VALUES (?,?, 'Rights issue')").run(id,actor);
  }
  // Alice also reviewed Bob's independently owned material. Account erasure
  // must anonymize her reviewer identity WITHOUT erasing Bob's approved record.
  const validSnapshot = JSON.stringify({title:'Reviewed lesson',locale:'en',data:{
    prompt:'What does Genesis record?',reference:'GEN 12:1',
    options:['Choice one','Choice two'],answer:'Choice one',
    explanation:'The source reference is available for review.'
  }});
  db.prepare("INSERT INTO material_submissions(id,material_id,author_id,snapshot,provenance,rights_attested,status,reviewed_at,reviewed_by,source_checked,rights_checked) VALUES ('reviewed-by-alice','material-sub-bob','bob',?,'source',1,'approved','2026-10-30','alice',1,1)").run(validSnapshot);
  db.prepare("INSERT INTO material_submissions(id,material_id,author_id,snapshot,provenance,rights_attested,status,reviewed_at,reviewed_by) VALUES ('reviewed-by-bob','material-sub-alice','bob',?,'source',1,'rejected','2026-10-30','bob')").run(validSnapshot);
  // Alice facilitated one meeting in Bob's group and owns another group.
  // Deletion must not erase Bob's independent records or retain Alice's
  // identifier or free-text reflection in a surviving shared group.
  db.prepare("INSERT INTO home_groups(id,owner_user_id,name,invite_code) VALUES ('bob-group','bob','Bob group','invite-bob')").run();
  db.prepare("INSERT INTO home_groups(id,owner_user_id,name,invite_code) VALUES ('alice-group','alice','Alice group','invite-alice')").run();
  db.prepare("INSERT INTO home_group_members(group_id,user_id,display_name,role) VALUES ('bob-group','alice','Alice','facilitator')").run();
  db.prepare("INSERT INTO home_group_members(group_id,user_id,display_name,role) VALUES ('bob-group','bob','Bob','owner')").run();
  db.prepare("INSERT INTO group_sessions(id,group_id,created_by,book_id,chapter,meeting_date,reflection,answers_correct,answers_total) VALUES ('alice-meeting','bob-group','alice','GEN',12,'2026-10-27','Alice private reflection',2,3)").run();
  db.prepare("INSERT INTO group_sessions(id,group_id,created_by,book_id,chapter,meeting_date,reflection,answers_correct,answers_total) VALUES ('bob-meeting','bob-group','bob','GEN',13,'2026-10-28','Bob authored text',3,3)").run();
  db.prepare("INSERT INTO group_sessions(id,group_id,created_by,book_id,chapter,meeting_date,reflection) VALUES ('owned-meeting','alice-group','alice','GEN',14,'2026-10-28','Owner text')").run();
  let failAfter = -1, unconfirmedBatch = false;
  const D1 = {
    prepare(sql) { return { bind(...args) { return {
      first: async () => db.prepare(sql).get(...args),
      run: async () => {
        const outcome = db.prepare(sql).run(...args);
        return { success: true, meta: { changes: Number(outcome.changes) } };
      },
    }; } }; },
    async batch(statements) {
      // A fake incomplete ACK does not assert a rollback. It proves only that
      // the API refuses to claim successful deletion without D1 confirmation.
      if (unconfirmedBatch) return statements.map((_, index) =>
        ({ success: index !== 2, meta: { changes: index === 0 ? 1 : 0 } }));
      db.exec('BEGIN');
      try {
        const receipts = [];
        for (const [index, statement] of statements.entries()) {
          if (index === failAfter) throw Error('simulated database failure');
          receipts.push(await statement.run());
        }
        db.exec('COMMIT');
        return receipts;
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    },
  };
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
  const refused = await exports.POST(request('correct'));
  assert.equal(refused.status, 503);
  assert.equal((await refused.json()).error, 'deletion_failed');
  assert.equal(db.prepare("SELECT count(*) n FROM progress WHERE user_id='alice'").get().n, 1, 'failed batch rolls back earlier deletions');
  assert.equal(db.prepare("SELECT deleted_at FROM accounts WHERE id='alice'").get().deleted_at, null);
  // Fail after BOTH shared-session and reviewed-by anonymization but before
  // group membership deletion, to prove atomic rollback of both redactions.
  failAfter = 13;
  const refusedAfterRedaction = await exports.POST(request('correct'));
  assert.equal(refusedAfterRedaction.status, 503);
  assert.equal((await refusedAfterRedaction.json()).error, 'deletion_failed');
  assert.deepEqual({...db.prepare("SELECT created_by,reflection FROM group_sessions WHERE id='alice-meeting'").get()}, {created_by:'alice',reflection:'Alice private reflection'});
  assert.deepEqual({...db.prepare("SELECT reviewed_by,status FROM material_submissions WHERE id='reviewed-by-alice'").get()},
    {reviewed_by:'alice',status:'approved'},'failed deletion rolls back shared editorial anonymization');
  assert.equal(db.prepare("SELECT count(*) AS n FROM home_group_members WHERE group_id='bob-group'").get().n, 2);
  failAfter = -1;
  unconfirmedBatch = true;
  const unconfirmed = await exports.POST(request('correct'));
  assert.equal(unconfirmed.status, 503);
  assert.equal((await unconfirmed.json()).error, 'deletion_failed');
  assert.equal(db.prepare("SELECT deleted_at FROM accounts WHERE id='alice'").get().deleted_at, null);
  assert.equal(db.prepare("SELECT count(*) n FROM progress WHERE user_id='alice'").get().n, 1);
  unconfirmedBatch = false;
  assert.equal((await exports.POST(request('correct'))).status, 200);
  const alice = db.prepare("SELECT email,first_name,last_name,password_hash,password_salt,deleted_at FROM accounts WHERE id='alice'").get();
  assert.equal(alice.first_name, ''); assert.equal(alice.last_name, ''); assert.equal(alice.password_hash, ''); assert.equal(alice.password_salt, ''); assert.ok(alice.deleted_at); assert.equal(alice.email, 'deleted-alice@invalid.local');
  for (const [table,column] of [['progress','user_id'],['reader_bookmarks','user_id'],['auth_tokens','user_id'],['auth_sessions','user_id'],['editorial_roles','user_id'],['mission_attempts','actor_id'],['chapter_read_receipts','actor_id'],['support_requests','user_id']]) {
    assert.equal(db.prepare(`SELECT count(*) n FROM ${table} WHERE ${column}=?`).get('alice').n, 0, table);
    assert.equal(db.prepare(`SELECT count(*) n FROM ${table} WHERE ${column}=?`).get('bob').n, 1, table);
  }
  assert.equal(db.prepare("SELECT count(*) n FROM mission_attempt_answers WHERE attempt_id='attempt-alice'").get().n, 0);
  assert.equal(db.prepare("SELECT count(*) n FROM support_attachments WHERE request_id='request-alice'").get().n, 0);
  assert.equal(db.prepare("SELECT count(*) n FROM support_attachments WHERE request_id='request-bob'").get().n, 1);
  const shared = db.prepare("SELECT created_by,reflection,answers_correct,answers_total,meeting_date FROM group_sessions WHERE id='alice-meeting'").get();
  assert.deepEqual({...shared}, {created_by:'deleted-account',reflection:null,answers_correct:2,answers_total:3,meeting_date:'2026-10-27'});
  assert.deepEqual({...db.prepare("SELECT created_by,reflection FROM group_sessions WHERE id='bob-meeting'").get()}, {created_by:'bob',reflection:'Bob authored text'});
  assert.deepEqual({...db.prepare("SELECT reviewed_by,status,reviewed_at,source_checked,rights_checked FROM material_submissions WHERE id='reviewed-by-alice'").get()},
    {reviewed_by:'deleted-account',status:'approved',reviewed_at:'2026-10-30',source_checked:1,rights_checked:1},
    'existing independent approved submission survives without deleted editor identifier');
  assert.deepEqual({...db.prepare("SELECT reviewed_by,status FROM material_submissions WHERE id='reviewed-by-bob'").get()},
    {reviewed_by:'bob',status:'rejected'},'another reviewer remains untouched');
  assert.equal(db.prepare("SELECT count(*) n FROM material_submissions WHERE reviewed_by='alice'").get().n,0);
  assert.equal(db.prepare("SELECT count(*) AS n FROM home_groups WHERE id='bob-group'").get().n, 1);
  assert.equal(db.prepare("SELECT count(*) AS n FROM home_group_members WHERE group_id='bob-group' AND user_id='alice'").get().n, 0);
  assert.equal(db.prepare("SELECT count(*) AS n FROM home_group_members WHERE group_id='bob-group' AND user_id='bob'").get().n, 1);
  assert.equal(db.prepare("SELECT count(*) AS n FROM home_groups WHERE id='alice-group'").get().n, 0);
  assert.equal(db.prepare("SELECT count(*) AS n FROM group_sessions WHERE group_id='alice-group'").get().n, 0);
  assert.equal(db.prepare("SELECT count(*) n FROM material_takedowns WHERE actor_user_id='alice'").get().n,0);
  assert.equal(db.prepare("SELECT count(*) n FROM material_takedowns WHERE actor_user_id='bob'").get().n,1);
  assert.equal(db.prepare("SELECT status FROM material_submissions WHERE id='sub-alice'").get().status,'withdrawn');
  assert.equal(db.prepare("SELECT count(*) n FROM editorial_role_events WHERE subject_user_id='alice' OR actor_user_id='alice'").get().n, 0);
  assert.equal(db.prepare("SELECT count(*) n FROM editorial_role_events WHERE subject_user_id='bob'").get().n, 1);
  assert.equal(db.prepare("SELECT count(*) n FROM editorial_roles WHERE user_id='carol'").get().n, 0, 'deleting grantor revokes delegated roles');
  db.close();
});
