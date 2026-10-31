import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

// Run the actual canonical attempts route with a deliberately corrupt D1 row.
const source = readFileSync(new URL('../app/api/attempts/route.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  reportDiagnostics: true,
});
assert.equal(compiled.diagnostics?.length ?? 0, 0);

const task = {
  id: 'GEN12-1', book: 'GEN', chapter: 12, type: 'single-choice', verses: [1],
  question: { uk: 'Private question', ru: 'Private question', en: 'Private question' },
  options: { uk: ['A', 'B'], ru: ['A', 'B'], en: ['A', 'B'] },
  correct: [0], success: { uk: 'Explanation', ru: 'Explanation', en: 'Explanation' },
};

function fixture({ mission_id = 'OT-AB-01', status = 'completed' } = {}) {
  let reads = 0, writes = 0;
  const attempt = {
    id: 'attempt-1', actor_id: 'alice', mission_id,
    book_id: 'GEN', chapter: 12, group_id: null, locale: 'uk',
    task_limit: 1, current_index: 1, status, expires_at: '2099-01-01',
    result_json: JSON.stringify({ score: 1, total: 1 }), score: 1, total: 1,
  };
  const DB = {
    prepare(sql) {
      reads += 1;
      assert.match(sql, /mission_attempts/);
      return {
        bind(id, actor) {
          assert.equal(id, 'attempt-1');
          assert.equal(actor, 'alice');
          return this;
        },
        async first() { return attempt; },
      };
    },
    async batch() { writes += 1; throw Error('Corrupt mission must not write'); },
  };
  const exports = {};
  vm.runInNewContext(compiled.outputText, {
    exports, Request, Response, URL, Date, crypto,
    require(name) {
      if (name === 'cloudflare:workers') return { env: { DB } };
      if (name === '../../../content/mission-abraham.json')
        return { __esModule: true, default: { tasks: [task], title: {}, intro: {} } };
      if (name === '../../../lib/auth') return {
        authenticateRequest: async () => ({ userId: 'alice', provider: 'password', emailVerified: true }),
        GUEST_COOKIE: 'guest', guestCookie: () => '', parseCookies: () => new Map(),
        randomToken: () => '', sameOrigin: () => true, sha256: async () => '',
      };
      throw Error('Unexpected import: ' + name);
    },
  });
  async function invoke(method, action) {
    const url = 'https://archive.invalid/api/attempts?action=' + action + (method === 'GET' ? '&attemptId=attempt-1' : '');
    const request = method === 'GET' ? new Request(url) : new Request(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attemptId: 'attempt-1', taskIndex: 1, selected: [0] }),
    });
    const response = await exports[method](request);
    return { status: response.status, payload: await response.json(), cache: response.headers.get('Cache-Control') };
  }
  return { invoke, counters: () => ({ reads, writes }) };
}

for (const [method, action, status] of [
  ['GET', 'current', 'completed'],
  ['POST', 'finalize', 'completed'],
  ['POST', 'answer', 'completed'],
  ['POST', 'finalize', 'grading'],
]) {
  test(method + ' ' + action + ' rejects foreign mission in ' + status + ' state', async () => {
    const f = fixture({ mission_id: 'OTHER-MISSION', status });
    const result = await f.invoke(method, action);
    assert.equal(result.status, 503);
    assert.equal(result.payload.error, 'attempt_state_invalid');
    assert.ok(!('completed' in result.payload) && !('grading' in result.payload));
    assert.match(result.cache, /no-store/);
    assert.deepEqual(f.counters(), { reads: 1, writes: 0 });
  });
}

for (const [method, action] of [['GET', 'current'], ['POST', 'finalize'], ['POST', 'answer']]) {
  test(method + ' ' + action + ' preserves canonical completed result', async () => {
    const f = fixture();
    const result = await f.invoke(method, action);
    assert.equal(result.status, 200);
    assert.equal(result.payload.completed, true);
    assert.deepEqual([result.payload.result.score, result.payload.result.total], [1, 1]);
    assert.match(result.cache, /no-store/);
    assert.deepEqual(f.counters(), { reads: 1, writes: 0 });
  });
}
