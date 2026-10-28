import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import ts from 'typescript';
import vm from 'node:vm';

function compile(path, require) {
  const source = readFileSync(new URL('../' + path, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const exports = {};
  vm.runInNewContext(code, {exports, require, Date, crypto, console});
  return exports;
}

test('waves are anchored to database activation time even when request clock is earlier', async () => {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys=ON');
  for (const name of readdirSync(new URL('../drizzle/', import.meta.url)).filter(n => /^000[0-8]_.*\.sql$/.test(n)).sort())
    db.exec(readFileSync(new URL('../drizzle/' + name, import.meta.url), 'utf8'));
  const D1 = {prepare(sql) {return {bind(...args) {return {first:async()=>db.prepare(sql).get(...args)??null, all:async()=>({results:db.prepare(sql).all(...args)}), run:async()=>{const r=db.prepare(sql).run(...args);return {success:true,meta:{changes:Number(r.changes)}};}};}};},async batch(statements) {db.exec('BEGIN');try {const results=[];for(const s of statements) results.push(await s.run());db.exec('COMMIT');return results;}catch(e){db.exec('ROLLBACK');throw e;}}};
  const community = compile('lib/community.ts', () => {throw Error('unexpected import');});
  const engine = compile('lib/community-engine.ts', id => {
    if(id === 'cloudflare:workers') return {env:{DB:D1}};
    if(id === './community') return community;
    if(id === './auth') return {};
    throw Error('unexpected import ' + id);
  });
  const result = await engine.controlCommunity('start', new Date('2001-01-01T00:00:00Z'));
  assert.equal(result.ok, true);
  const run = db.prepare('SELECT started_at,activated_at FROM community_runs').get();
  const waves = db.prepare('SELECT starts_at,next_at FROM community_waves ORDER BY starts_at').all();
  assert.equal(waves.length, 4);
  assert.equal(run.started_at, run.activated_at);
  assert.equal(waves[0].starts_at, run.activated_at);
  for (const wave of waves) {assert.ok(wave.starts_at >= run.activated_at);assert.equal(wave.next_at,wave.starts_at);}
  assert.equal(db.prepare("SELECT datetime(?,'+305 minutes') expected").get(run.activated_at).expected, waves[1].starts_at);
  db.close();
});
