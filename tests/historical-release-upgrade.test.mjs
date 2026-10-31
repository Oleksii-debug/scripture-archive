import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, readdirSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import test from 'node:test';

// Normalized SHA-256 of the SQL from the owner's verified historical Sites
// source bundle at 3a04d1213a96ce333e891c0f2abf72f007ec4d13. Only trailing
// CR/LF is normalized: 0004-0006 differ from today's files only at EOF.
// This is source evidence, not the live site's current SHA or D1 ledger.
const historical = {
  '0000_scripture_archive.sql':'086c0613227e8e75473aabbfa6e07f53e5ef46bac1462bc090cced70298e660f',
  '0001_home_groups.sql':'72fb830a3cfbe520b805636a9bf31e0b5e078a266a84c7ac0be392f2112e1e22',
  '0002_group_modes.sql':'068a8ee0af5d1d2668f13320004acd0bb95fc09c0523e5ff534c82b3d0856012',
  '0003_group_answers.sql':'c4f59171d8a15cde4727228c2bfcf2c15916516ab76f8d564a026573b440ca26',
  '0004_accounts_attempts.sql':'d4eb9668c7e311ac06cda0a9e1b215b9783bf2787eea07b0a3478837579428e8',
  '0005_usage_analytics.sql':'d762b0795d85764b89caa888801589e1d7ab7b078105d694148d80d54eec8320',
  '0006_support_requests.sql':'05e8671c0c4b4cd16f7f003cdbaed399ada3e75c67c8a053ce2c56d9020f133a',
  '0007_community.sql':'78c7a94f4344388b4c4177f10959f3ec446a9f251a3ac54c2dc85646f231b5cc',
  '0008_community_controls.sql':'f23b1b8b475c33279877216de77c1c9efa4eb983b16328e7f0095f339b6c9713',
};
const folder=new URL('../drizzle/',import.meta.url);
const sql=name=>readFileSync(new URL(name,folder),'utf8');
const normalizedHash=text=>createHash('sha256').update(text.replace(/[\r\n]+$/,'')+'\n').digest('hex');

test('historical v8 source upgrades representative saved records through v15',()=>{
  const files=readdirSync(folder).filter(x=>/^\d{4}_.+\.sql$/.test(x)).sort();
  const baseline=files.filter(x=>Number(x.slice(0,4))<=8);
  const upgrade=files.filter(x=>Number(x.slice(0,4))>=9&&Number(x.slice(0,4))<=15);
  assert.deepEqual(baseline,Object.keys(historical));
  assert.deepEqual(upgrade.map(x=>x.slice(0,4)),['0009','0010','0011','0012','0013','0014','0015']);
  for(const name of baseline)assert.equal(normalizedHash(sql(name)),historical[name],`${name} differs from the historical source`);
  const db=new DatabaseSync(':memory:');
  try {
    db.exec('PRAGMA foreign_keys=ON');
    for(const name of baseline)db.exec(sql(name));
    // Synthetic records exist only in this in-memory test database.
    db.exec(`
      INSERT INTO accounts(id,email,password_hash,password_salt,password_iterations,first_name,last_name)
        VALUES ('fixture-user','fixture@example.invalid','hash','salt',100000,'Test','User');
      INSERT INTO auth_sessions(token_hash,user_id,session_version,user_agent_hash,expires_at)
        VALUES ('session-hash','fixture-user',1,'agent-hash','2099-01-01');
      INSERT INTO profiles(user_id,email,first_name,last_name,age_range,church,sensitive_consent,public_church)
        VALUES ('fixture-user','fixture@example.invalid','Test','User','25-34','Private church',1,1);
      INSERT INTO progress(user_id,mission_id,data) VALUES ('fixture-user','READING','[{"book":"GEN","chapter":1}]');
      INSERT INTO home_groups(id,owner_user_id,name,invite_code) VALUES ('group','fixture-user','Private group','INVITE01');
      INSERT INTO home_group_members(group_id,user_id,display_name,role) VALUES ('group','fixture-user','Test User','owner');
      INSERT INTO group_sessions(id,group_id,created_by,book_id,chapter,reflection,meeting_date)
        VALUES ('meeting','group','fixture-user','GEN',1,'Fixture reflection','2026-01-01');
      INSERT INTO mission_attempts(id,actor_id,mission_id,book_id,chapter,locale,task_limit,expires_at)
        VALUES ('attempt','fixture-user','OT-AB-01','GEN',12,'uk',1,'2099-01-01');
      INSERT INTO study_materials(id,owner_user_id,title,locale,data) VALUES ('draft','fixture-user','Draft','uk','{"text":"kept"}');
      INSERT INTO support_requests(id,user_id,email,subject,message,attachment_count)
        VALUES ('request','fixture-user','fixture@example.invalid','Fixture subject','Fixture message',1);
      INSERT INTO support_attachments(id,request_id,filename,content_type,size_bytes,content_base64)
        VALUES ('attachment','request','fixture.txt','text/plain',3,'YWJj');
      INSERT INTO usage_sessions(session_id,user_id,active_seconds) VALUES ('usage','fixture-user',7);
      INSERT INTO community_runs(id,status,control_version) VALUES ('run','paused',3);
    `);
    for (const name of upgrade) {
      db.exec(sql(name));
      if (name.startsWith('0012_')) {
        // Reproduce unsafe coexistence: a still-running v8 Worker can restore
        // public_church after migration 0010 and before the 0013 cutover guard.
        db.exec("UPDATE profiles SET public_church=1 WHERE user_id='fixture-user'");
        assert.equal(db.prepare("SELECT public_church FROM profiles WHERE user_id='fixture-user'").get().public_church,1);
      }
    }
    assert.equal(db.prepare("SELECT email FROM accounts WHERE id='fixture-user'").get().email,'fixture@example.invalid');
    assert.equal(db.prepare("SELECT session_version FROM auth_sessions WHERE token_hash='session-hash'").get().session_version,1);
    const p=db.prepare("SELECT church,sensitive_consent_version,public_church FROM profiles WHERE user_id='fixture-user'").get();
    assert.equal(p.church,'Private church');assert.equal(p.sensitive_consent_version,0);assert.equal(p.public_church,0);
    assert.equal(db.prepare("SELECT data FROM progress WHERE user_id='fixture-user'").get().data,'[{"book":"GEN","chapter":1}]');
    assert.equal(db.prepare("SELECT role FROM home_group_members WHERE group_id='group'").get().role,'owner');
    assert.equal(db.prepare("SELECT reflection FROM group_sessions WHERE id='meeting'").get().reflection,'Fixture reflection');
    assert.equal(db.prepare("SELECT status FROM mission_attempts WHERE id='attempt'").get().status,'active');
    assert.equal(db.prepare("SELECT data FROM study_materials WHERE id='draft'").get().data,'{"text":"kept"}');
    assert.equal(db.prepare("SELECT message FROM support_requests WHERE id='request'").get().message,'Fixture message');
    assert.equal(db.prepare("SELECT content_base64 FROM support_attachments WHERE id='attachment'").get().content_base64,'YWJj');
    assert.equal(db.prepare("SELECT active_seconds FROM usage_sessions WHERE session_id='usage'").get().active_seconds,7);
    const run=db.prepare("SELECT status,control_version FROM community_runs WHERE id='run'").get();
    assert.equal(run.status,'paused');assert.equal(run.control_version,3);
    db.exec("INSERT INTO reader_bookmarks(user_id,edition,book,chapter) VALUES ('fixture-user','en-web','GEN',1)");
    assert.equal(db.prepare("SELECT chapter FROM reader_bookmarks WHERE user_id='fixture-user'").get().chapter,1);
    assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0);
    // R0 release upgrade must exercise the *whole* current migration chain.
    // 0013 protects the legacy visibility reset when a stale pre-0010 worker
    // attempts to re-publish church data after the historical site is upgraded.
    const guards=db.prepare("SELECT name FROM sqlite_master WHERE type='trigger' AND tbl_name='profiles' ORDER BY name").all().map(row=>row.name);
    assert.deepEqual(guards,[
      'profiles_public_church_consent_insert_v1',
      'profiles_public_church_consent_update_v1',
    ]);
    // Exercise the real 0013 INSERT trigger, not only its installed name.
    // Use a valid new account so a foreign-key failure cannot mask the guard.
    db.exec("INSERT INTO accounts(id,email,password_hash,password_salt,password_iterations,first_name,last_name) VALUES ('insert-user','insert@example.invalid','hash','salt',100000,'Insert','User')");
    const insertProfile=(consent,version)=>db.prepare(
      "INSERT INTO profiles(user_id,email,first_name,last_name,age_range,church,sensitive_consent,sensitive_consent_version,public_church) VALUES ('insert-user','insert@example.invalid','Insert','User','25-34','Private church',?,?,1)"
    ).run(consent,version);
    assert.throws(()=>insertProfile(1,0),/public_church_requires_current_explicit_consent/,
      'legacy registration must not publish without versioned consent');
    assert.throws(()=>insertProfile(0,1),/public_church_requires_current_explicit_consent/,
      'a version alone is not explicit consent');
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM profiles WHERE user_id='insert-user'").get().n,0,
      'rejected registration must not leave a partial profile');
    insertProfile(1,1);
    assert.equal(db.prepare("SELECT public_church FROM profiles WHERE user_id='insert-user'").get().public_church,1,
      'confirmed v1 registration remains functional');
    assert.throws(()=>db.exec("UPDATE profiles SET sensitive_consent_version=0 WHERE user_id='insert-user'"),
      /public_church_requires_current_explicit_consent/,
      'revocation cannot leave public identity behind');
    assert.throws(
      ()=>db.exec("UPDATE profiles SET public_church=1 WHERE user_id='fixture-user'"),
      /public_church_requires_current_explicit_consent/
    );
    assert.equal(db.prepare("SELECT public_church FROM profiles WHERE user_id='fixture-user'").get().public_church,0);
    // A separately and explicitly confirmed version-1 consent permits
    // intentional visibility, but withdrawing consent cannot leave it public.
    db.exec("UPDATE profiles SET sensitive_consent_version=1 WHERE user_id='fixture-user'");
    db.exec("UPDATE profiles SET public_church=1 WHERE user_id='fixture-user'");
    assert.throws(
      ()=>db.exec("UPDATE profiles SET sensitive_consent=0 WHERE user_id='fixture-user'"),
      /public_church_requires_current_explicit_consent/
    );
    db.exec("UPDATE profiles SET public_church=0,sensitive_consent=0 WHERE user_id='fixture-user'");
    assert.equal(db.prepare("SELECT public_church FROM profiles WHERE user_id='fixture-user'").get().public_church,0);
    // 0014 editorial takedown provenance must also exist after an actual
    // old-site upgrade, rather than only in a fresh-install test.
    const takedown=db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='material_takedowns'").get();
    assert.match(takedown?.sql||'',/submission_id TEXT PRIMARY KEY/);
    assert.match(takedown.sql,/REFERENCES material_submissions\(id\) ON DELETE CASCADE/);
    const rightsColumns=db.prepare("PRAGMA table_info('material_submissions')").all().map(row=>row.name);
    assert.ok(rightsColumns.includes('rights_holder'));
    assert.ok(rightsColumns.includes('rights_basis'));
    assert.ok(rightsColumns.includes('license_url'));
    assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0);
  } finally {db.close();}
});
