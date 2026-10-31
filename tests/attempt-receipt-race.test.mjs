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
        db.prepare(sql[1]).run('actor',id,id);
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
      const open = () => { db.exec('BEGIN'); for (const sql of chapterSql) db.prepare(sql).run('actor','GEN',12); db.exec('COMMIT'); };
      const start = () => { db.exec('BEGIN'); const n=db.prepare(startSql[0]).run('attempt','actor','mission','GEN',12,group,'en',1,'receipt','actor',group || '',group || '','actor').changes; db.prepare(startSql[1]).run('actor','attempt','attempt'); db.prepare(startSql[2]).run('receipt','attempt'); db.exec('COMMIT'); return n; };
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
    db.prepare(sql[1]).run('actor','new','new');
    assert.throws(() => db.prepare(sql[2]).run('receipt','new'), /test failure/);
    db.exec('ROLLBACK');
    assert.deepEqual(db.prepare('SELECT id,status FROM mission_attempts').all().map(row => ({...row})), [{id:'existing',status:'active'}]);
    assert.equal(db.prepare('SELECT consumed_at FROM chapter_read_receipts').get().consumed_at,null);
  } finally { db.close(); }
});
// Execute both answer statements extracted from the canonical API, including
// SQLite's actual changes() behavior inside one D1-equivalent transaction.
// An existing answer with an unmoved cursor can arise from old/corrupt state:
// an ignored INSERT must never advance to grading or publish the old answer.
test('answer cursor only advances after the immediately preceding answer INSERT', () => {
  const source = readFileSync(new URL('../app/api/attempts/route.ts', import.meta.url), 'utf8');
  const begin = source.indexOf('const accepted = await env.DB.batch([');
  const end = source.indexOf('const answerChanges = confirmedBatch(accepted, 2)', begin);
  assert.ok(begin > 0 && end > begin, 'canonical answer transaction must exist');
  const sql = [...source.slice(begin, end).matchAll(/env\.DB\.prepare\("([^"]+)"\)/g)].map(match => match[1]);
  assert.equal(sql.length, 2);
  assert.match(sql[1], /\bchanges\(\)\s*=\s*1\b/, 'cursor UPDATE must depend on actual answer INSERT');

  const db = new DatabaseSync(':memory:');
  try {
    db.exec(`CREATE TABLE mission_attempts (
      id TEXT PRIMARY KEY, status TEXT, current_index INTEGER, expires_at TEXT
    );
    CREATE TABLE mission_attempt_answers (
      attempt_id TEXT, task_id TEXT, selected_json TEXT, is_correct INTEGER,
      PRIMARY KEY (attempt_id, task_id)
    );
    INSERT INTO mission_attempts VALUES ('attempt', 'active', 0, '2999-01-01');`);
    const state = () => ({ ...db.prepare("SELECT status,current_index FROM mission_attempts WHERE id='attempt'").get() });
    const answer = () => {
      db.exec('BEGIN');
      try {
        const inserted = db.prepare(sql[0]).run('attempt', 'task-1', '[0]', 1, 'attempt', 0).changes;
        const advanced = db.prepare(sql[1]).run(1, 'grading', 'attempt', 0).changes;
        db.exec('COMMIT');
        return [inserted, advanced];
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    };

    // RED on the old source: INSERT OR IGNORE=0, cursor UPDATE=1, durable
    // grading cursor points at an answer that was never accepted by this POST.
    db.prepare("INSERT INTO mission_attempt_answers VALUES ('attempt','task-1','[1]',0)").run();
    assert.deepEqual(answer(), [0, 0], 'duplicate/corrupt answer cannot move the cursor');
    assert.deepEqual(state(), { status: 'active', current_index: 0 });
    assert.deepEqual({ ...db.prepare("SELECT selected_json,is_correct FROM mission_attempt_answers").get() },
      { selected_json: '[1]', is_correct: 0 });

    // Removing the invalid old answer permits a normal fresh response.
    db.prepare("DELETE FROM mission_attempt_answers WHERE attempt_id='attempt'").run();
    assert.deepEqual(answer(), [1, 1]);
    assert.deepEqual(state(), { status: 'grading', current_index: 1 });
    assert.deepEqual({ ...db.prepare("SELECT selected_json,is_correct FROM mission_attempt_answers").get() },
      { selected_json: '[0]', is_correct: 1 });

    // A delayed replay after a completed cursor cannot duplicate an answer.
    assert.deepEqual(answer(), [0, 0]);
    assert.deepEqual(state(), { status: 'grading', current_index: 1 });
  } finally { db.close(); }
});
