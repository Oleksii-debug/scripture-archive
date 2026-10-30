import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';

// Execute the actual checked-in SQLite migrations, not reconstructed schemas.
// This is a disposable v9 fixture, not a production-D1 or rollback claim.
const folder = new URL('../drizzle/', import.meta.url);
const scripts = readdirSync(folder).filter(name => /^\d{4}_.+\.sql$/.test(name)).sort();
const apply = (db, name) => db.exec(readFileSync(new URL(name, folder), 'utf8'));
const old = scripts.filter(name => Number(name.slice(0, 4)) <= 9);
const next = scripts.filter(name => Number(name.slice(0, 4)) >= 10 && Number(name.slice(0, 4)) <= 12);

test('v9 data survives the real consent and editorial migrations with privacy defaults', () => {
  assert.deepEqual(old.map(name => name.slice(0,4)), Array.from({length:10}, (_,i)=>String(i).padStart(4,'0')));
  assert.deepEqual(next.map(name=>name.slice(0,4)), ['0010','0011','0012']);
  const db=new DatabaseSync(':memory:');
  try {
    db.exec('PRAGMA foreign_keys = ON');
    for (const name of old) apply(db, name);
    db.exec(`
      INSERT INTO accounts(id,email,password_hash,password_salt,password_iterations,first_name,last_name)
        VALUES ('alice','alice@example.invalid','hash','salt',100000,'Alice','Reader'),
               ('bob','bob@example.invalid','hash','salt',100000,'Bob','Reader');
      INSERT INTO profiles(user_id,email,first_name,last_name,age_range,church,sensitive_consent,public_church)
        VALUES ('alice','alice@example.invalid','Alice','Reader','25-34','Private church',1,1),
               ('bob','bob@example.invalid','Bob','Reader','25-34',NULL,0,0);
      INSERT INTO progress(user_id,mission_id,data) VALUES ('alice','READING','[{"book":"GEN","chapter":1,"title":"Genesis"}]');
      INSERT INTO reader_bookmarks(user_id,edition,book,chapter) VALUES ('alice','en-web','GEN',1);
      INSERT INTO home_groups(id,owner_user_id,name,invite_code) VALUES ('group-1','alice','Legacy group','INVCODE1');
      INSERT INTO home_group_members(group_id,user_id,display_name,role) VALUES ('group-1','alice','Alice','owner');
      INSERT INTO study_materials(id,owner_user_id,title,locale,data) VALUES ('draft-1','alice','Saved draft','en','{"text":"kept"}');
    `);
    for (const name of next) apply(db,name);
    const profile=db.prepare('SELECT church,sensitive_consent,sensitive_consent_version,public_church FROM profiles WHERE user_id=?').get('alice');
    assert.equal(profile.church,'Private church');
    assert.equal(profile.sensitive_consent,1);
    assert.equal(profile.sensitive_consent_version,0);
    assert.equal(profile.public_church,0,'unconfirmed legacy consent must no longer publish church');
    assert.equal(db.prepare('SELECT data FROM progress WHERE user_id=?').get('alice').data,'[{"book":"GEN","chapter":1,"title":"Genesis"}]');
    assert.equal(db.prepare('SELECT chapter FROM reader_bookmarks WHERE user_id=?').get('alice').chapter,1);
    assert.equal(db.prepare('SELECT name FROM home_groups WHERE id=?').get('group-1').name,'Legacy group');
    assert.equal(db.prepare('SELECT role FROM home_group_members WHERE group_id=? AND user_id=?').get('group-1','alice').role,'owner');
    assert.equal(db.prepare('SELECT data FROM study_materials WHERE id=?').get('draft-1').data,'{"text":"kept"}');
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM accounts').get().n,2);
    db.exec(`INSERT INTO material_submissions(id,material_id,author_id,snapshot,provenance,rights_attested,status)
      VALUES ('submission-1','draft-1','alice','{}','source',1,'pending');`);
    assert.throws(()=>db.exec(`INSERT INTO material_submissions(id,material_id,author_id,snapshot,provenance,rights_attested,status)
      VALUES ('submission-2','draft-1','alice','{}','source',1,'pending')`));
    assert.throws(()=>db.exec("UPDATE material_submissions SET status='approved' WHERE id='submission-1'"));
    db.exec("INSERT INTO editorial_roles(user_id,granted_by) VALUES ('bob','alice')");
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM editorial_role_events WHERE subject_user_id='bob' AND action='grant'").get().n,1);
    assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0);
  } finally { db.close(); }
});
