import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import assert from 'node:assert/strict';

// Both requests have already observed the same unconsumed receipt before either
// transaction begins; execute the exact production SQL in transaction order.
test('two stale receipt observations can produce only one attempt', () => {
  const source = readFileSync(new URL('../app/api/attempts/route.ts', import.meta.url), 'utf8');
  const block = source.slice(source.indexOf('const started = await env.DB.batch(['), source.indexOf('if (!started[0].meta.changes)'));
  const sql = [...block.matchAll(/env\.DB\.prepare\("([^"]+)"\)/g)].map(match => match[1]);
  assert.equal(sql.length, 3);
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(`CREATE TABLE chapter_read_receipts (id TEXT PRIMARY KEY, actor_id TEXT, consumed_at TEXT);
      CREATE TABLE mission_attempts (id TEXT PRIMARY KEY, actor_id TEXT, mission_id TEXT, book_id TEXT, chapter INTEGER, group_id TEXT, locale TEXT, task_limit INTEGER, expires_at TEXT, status TEXT DEFAULT 'active', invalidated_at TEXT, invalidation_reason TEXT);
      INSERT INTO chapter_read_receipts VALUES ('receipt','actor',NULL);`);
    const observe = () => db.prepare('SELECT id FROM chapter_read_receipts WHERE id=? AND consumed_at IS NULL').get('receipt');
    assert.ok(observe()); assert.ok(observe());
    const start = id => {
      db.exec('BEGIN');
      try {
        const inserted = db.prepare(sql[0]).run(id,'actor','mission','GEN',12,null,'en',1,'receipt','actor').changes;
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
