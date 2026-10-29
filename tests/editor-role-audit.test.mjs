import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

test('role audit is transactional, ignores no-ops, and preserves the actual actor',()=>{
  const db=new DatabaseSync(':memory:');
  try {
    db.exec('PRAGMA foreign_keys=ON');
    db.exec('CREATE TABLE accounts(id TEXT PRIMARY KEY)');
    db.exec(readFileSync(new URL('../drizzle/0012_editor_roles.sql',import.meta.url),'utf8'));
    db.prepare("INSERT INTO accounts(id) VALUES('subject')").run();
    db.exec('BEGIN');
    db.prepare("INSERT INTO editorial_roles(user_id,granted_by) VALUES('subject','owner-a')").run();
    assert.equal(db.prepare('SELECT count(*) n FROM editorial_role_events').get().n,1);
    db.exec('ROLLBACK');
    assert.equal(db.prepare('SELECT count(*) n FROM editorial_role_events').get().n,0);
    db.prepare("INSERT INTO editorial_roles(user_id,granted_by) VALUES('subject','owner-a') ON CONFLICT DO NOTHING").run();
    db.prepare("INSERT INTO editorial_roles(user_id,granted_by) VALUES('subject','owner-a') ON CONFLICT DO NOTHING").run();
    db.exec('BEGIN');
    db.prepare("UPDATE editorial_roles SET revoked_by='owner-b' WHERE user_id='subject'").run();
    db.prepare("DELETE FROM editorial_roles WHERE user_id='subject' AND revoked_by='owner-b'").run();
    db.exec('ROLLBACK');
    assert.equal(db.prepare('SELECT count(*) n FROM editorial_role_events').get().n,1);
    db.prepare("UPDATE editorial_roles SET revoked_by='owner-b' WHERE user_id='subject'").run();
    db.prepare("DELETE FROM editorial_roles WHERE user_id='subject' AND revoked_by='owner-b'").run();
    db.prepare("DELETE FROM editorial_roles WHERE user_id='subject'").run();
    const events=db.prepare('SELECT subject_user_id,actor_user_id,action FROM editorial_role_events ORDER BY id').all();
    assert.deepEqual(events.map(x=>[x.subject_user_id,x.actor_user_id,x.action]),[['subject','owner-a','grant'],['subject','owner-b','revoke']]);
  } finally {db.close();}
});
