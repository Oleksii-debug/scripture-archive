import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import assert from 'node:assert/strict';

// Both requests have already observed the same unconsumed receipt before either
// transaction begins; execute the exact production SQL in transaction order.
test('two stale receipt observations can produce only one attempt', () => {
  const source = readFileSync(new URL('../app/api/attempts/route.ts', import.meta.url), 'utf8');
  const block = source.slice(source.indexOf('const started = await env.DB.batch(['), source.indexOf('const startChanges = confirmedBatch(started, 3)'));
  const sql = [...block.matchAll(/env\.DB\.prepare\("([^"]+)"\)/g)].map(match => match[1]);
  assert.equal(sql.length, 3);
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(`CREATE TABLE home_group_members (group_id TEXT, user_id TEXT, role TEXT); INSERT INTO home_group_members VALUES ('group-a','actor','facilitator');
      CREATE TABLE chapter_read_receipts (id TEXT PRIMARY KEY, actor_id TEXT, consumed_at TEXT);
      CREATE TABLE mission_attempts (id TEXT PRIMARY KEY, actor_id TEXT, mission_id TEXT, book_id TEXT, chapter INTEGER, group_id TEXT, locale TEXT, task_limit INTEGER, expires_at TEXT, status TEXT DEFAULT 'active', invalidated_at TEXT, invalidation_reason TEXT);
      INSERT INTO chapter_read_receipts VALUES ('receipt','actor',NULL);`);
    const observe = () => db.prepare('SELECT id FROM chapter_read_receipts WHERE id=? AND consumed_at IS NULL').get('receipt');
    assert.ok(observe()); assert.ok(observe());
    const start = id => {
      db.exec('BEGIN');
      try {
        const inserted = db.prepare(sql[0]).run(id,'actor','mission','GEN',12,null,'en',1,'receipt','actor','','','actor').changes;
        db.prepare(sql[1]).run('actor',id,'',id);
        db.prepare(sql[2]).run('receipt',id);
        db.exec('COMMIT'); return inserted;
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    };
    assert.equal(start('first'),1);
    assert.equal(start('second'),0);
    assert.deepEqual(db.prepare('SELECT id,status FROM mission_attempts').all().map(row => ({...row})), [{id:'first',status:'active'}]);
  } finally { db.close(); }
});

test('chapter opening and start serialize safely in either order across contexts', () => {
  const source = readFileSync(new URL('../app/api/attempts/route.ts', import.meta.url), 'utf8');
  const startBlock = source.slice(source.indexOf('const started = await env.DB.batch(['), source.indexOf('const startChanges = confirmedBatch(started, 3)'));
  const startSql = [...startBlock.matchAll(/env\.DB\.prepare\("([^"]+)"\)/g)].map(m => m[1]);
  const chapterStart = source.indexOf('if (action === "chapter") {', source.indexOf('export async function POST'));
  const chapterBlock = source.slice(chapterStart, source.indexOf('if (action === "read")', chapterStart));
  const chapterSql = [...chapterBlock.matchAll(/env\.DB\.prepare\("([^"]+)"\)/g)].map(m => m[1]);
  assert.equal(chapterSql.length, 2);
  for (const openFirst of [true, false]) for (const group of [null, 'group-a']) {
    const db = new DatabaseSync(':memory:');
    try {
      db.exec(`CREATE TABLE home_group_members (group_id TEXT, user_id TEXT, role TEXT); INSERT INTO home_group_members VALUES ('group-a','actor','facilitator');
      CREATE TABLE chapter_read_receipts (id TEXT PRIMARY KEY, actor_id TEXT, book_id TEXT, chapter INTEGER, group_id TEXT, consumed_at TEXT);
        CREATE TABLE mission_attempts (id TEXT PRIMARY KEY, actor_id TEXT, mission_id TEXT, book_id TEXT, chapter INTEGER, group_id TEXT, locale TEXT, task_limit INTEGER, expires_at TEXT, status TEXT DEFAULT 'active', invalidated_at TEXT, invalidation_reason TEXT);`);
      db.prepare('INSERT INTO chapter_read_receipts VALUES (?,?,?,?,?,NULL)').run('receipt','actor','GEN',12,group);
      db.prepare('INSERT INTO chapter_read_receipts VALUES (?,?,?,?,?,NULL)').run('other','other','GEN',12,group);
      const open = () => { db.exec('BEGIN'); for (const sql of chapterSql) db.prepare(sql).run('actor','GEN',12,group || ''); db.exec('COMMIT'); };
      const start = () => { db.exec('BEGIN'); const n=db.prepare(startSql[0]).run('attempt','actor','mission','GEN',12,group,'en',1,'receipt','actor',group || '',group || '','actor').changes; db.prepare(startSql[1]).run('actor','attempt',group || '','attempt'); db.prepare(startSql[2]).run('receipt','attempt'); db.exec('COMMIT'); return n; };
      if (openFirst) { open(); assert.equal(start(),0); } else { assert.equal(start(),1); open(); assert.equal(db.prepare("SELECT status FROM mission_attempts WHERE id='attempt'").get().status,'invalidated'); }
      assert.equal(db.prepare("SELECT consumed_at FROM chapter_read_receipts WHERE id='other'").get().consumed_at,null);
    } finally { db.close(); }
  }
});

test('a failed receipt consumption rolls back the entire start transaction', () => {
  const source = readFileSync(new URL('../app/api/attempts/route.ts', import.meta.url), 'utf8');
  const block = source.slice(source.indexOf('const started = await env.DB.batch(['), source.indexOf('const startChanges = confirmedBatch(started, 3)'));
  const sql = [...block.matchAll(/env\.DB\.prepare\("([^"]+)"\)/g)].map(m => m[1]);
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(`CREATE TABLE home_group_members (group_id TEXT, user_id TEXT, role TEXT); INSERT INTO home_group_members VALUES ('group-a','actor','facilitator');
      CREATE TABLE chapter_read_receipts (id TEXT PRIMARY KEY, actor_id TEXT, consumed_at TEXT);
      CREATE TABLE mission_attempts (id TEXT PRIMARY KEY, actor_id TEXT, mission_id TEXT, book_id TEXT, chapter INTEGER, group_id TEXT, locale TEXT, task_limit INTEGER, expires_at TEXT, status TEXT DEFAULT 'active', invalidated_at TEXT, invalidation_reason TEXT);
      INSERT INTO chapter_read_receipts VALUES ('receipt','actor',NULL);
      INSERT INTO mission_attempts (id,actor_id,status) VALUES ('existing','actor','active');
      CREATE TRIGGER fail_consumption BEFORE UPDATE ON chapter_read_receipts BEGIN SELECT RAISE(ABORT,'test failure'); END;`);
    db.exec('BEGIN');
    db.prepare(sql[0]).run('new','actor','mission','GEN',12,null,'en',1,'receipt','actor','','','actor');
    db.prepare(sql[1]).run('actor','new','','new');
    assert.throws(() => db.prepare(sql[2]).run('receipt','new'), /test failure/);
    db.exec('ROLLBACK');
    assert.deepEqual(db.prepare('SELECT id,status FROM mission_attempts').all().map(row => ({...row})), [{id:'existing',status:'active'}]);
    assert.equal(db.prepare('SELECT consumed_at FROM chapter_read_receipts').get().consumed_at,null);
  } finally { db.close(); }
});


test('a new group attempt cannot invalidate another context even on the same chapter', () => {
  const source = readFileSync(new URL('../app/api/attempts/route.ts', import.meta.url), 'utf8');
  const block = source.slice(source.indexOf('const started = await env.DB.batch(['), source.indexOf('const startChanges = confirmedBatch(started, 3)'));
  const sql = [...block.matchAll(/env\.DB\.prepare\("([^"]+)"\)/g)].map(match => match[1]);
  assert.equal(sql.length, 3);
  assert.match(sql[1], /COALESCE\(group_id,''\)=\?/);
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(`CREATE TABLE home_group_members (group_id TEXT, user_id TEXT, role TEXT);
      INSERT INTO home_group_members VALUES ('group-a','actor','facilitator');
      CREATE TABLE chapter_read_receipts (id TEXT PRIMARY KEY, actor_id TEXT, consumed_at TEXT);
      CREATE TABLE mission_attempts (id TEXT PRIMARY KEY, actor_id TEXT, mission_id TEXT, book_id TEXT, chapter INTEGER, group_id TEXT, locale TEXT, task_limit INTEGER, expires_at TEXT, status TEXT DEFAULT 'active', invalidated_at TEXT, invalidation_reason TEXT);
      INSERT INTO chapter_read_receipts VALUES ('receipt','actor',NULL);
      INSERT INTO mission_attempts (id,actor_id,book_id,chapter,group_id,status) VALUES
        ('personal','actor','GEN',12,NULL,'active'),
        ('same-group','actor','GEN',12,'group-a','active'),
        ('other-group','actor','GEN',12,'group-b','active'),
        ('another-user','other','GEN',12,'group-a','active');`);
    db.exec('BEGIN');
    try {
      assert.equal(db.prepare(sql[0]).run('new','actor','mission','GEN',12,'group-a','en',1,'receipt','actor','group-a','group-a','actor').changes,1);
      assert.equal(db.prepare(sql[1]).run('actor','new','group-a','new').changes,1);
      assert.equal(db.prepare(sql[2]).run('receipt','new').changes,1);
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
    const statuses = Object.fromEntries(db.prepare('SELECT id,status FROM mission_attempts').all().map(row => [row.id,row.status]));
    assert.deepEqual(statuses,{
      personal:'active','same-group':'invalidated','other-group':'active','another-user':'active',new:'active'
    });
  } finally { db.close(); }
});
