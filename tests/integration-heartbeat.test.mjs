import test from 'node:test';
import assert from 'node:assert/strict';
import {startReadOnlyHeartbeat} from '../scripts/integration-ready.mjs';

test('local heartbeat maintains only a safe unauthenticated GET and stops cleanly', async () => {
  let pulse, cancelled = false;
  const handle = Symbol('safe-heartbeat');
  const calls = [];
  const stop = startReadOnlyHeartbeat('http://127.0.0.1:8765', {
    intervalMs: 1100,
    schedule: (callback, ms) => {
      pulse = callback;
      assert.equal(ms, 1100);
      return handle;
    },
    cancel: value => {
      assert.equal(value, handle);
      cancelled = true;
    },
    fetcher: async (url, init) => {
      calls.push({url, method:init.method});
      return Response.json({user:null});
    },
  });
  pulse();
  const metrics = await stop();
  assert.deepEqual(metrics, {probes:1,failures:0});
  assert.deepEqual(calls, [{url:'http://127.0.0.1:8765/api/account?action=me',method:'GET'}]);
  assert.equal(cancelled,true);
  pulse();
  assert.equal(calls.length,1,'a stopped heartbeat cannot send further requests');
});

test('heartbeat is non-overlapping, records response failures and never replays a mutation', async () => {
  let pulse, release;
  const calls=[];
  const stop=startReadOnlyHeartbeat('http://localhost:3344', {
    schedule: cb => {pulse=cb;return 1;},
    cancel:()=>{},
    fetcher: async (url, init) => {
      calls.push([url,init.method]);
      return new Promise(resolve => { release=resolve; });
    },
  });
  pulse();
  await Promise.resolve();
  pulse();
  assert.equal(calls.length,1);
  release(Response.json({user:{id:'unexpected'}},{status:200}));
  assert.deepEqual(await stop(),{probes:1,failures:1});
  assert.equal(calls[0][1],'GET');
});

test('invalid heartbeat destinations and unsafe timing are refused before scheduling', () => {
  for (const base of ['https://example.invalid/path', 'file:///tmp/a', 'http://example.invalid/other', '']) {
    assert.throws(() => startReadOnlyHeartbeat(base),RangeError);
  }
  assert.throws(() => startReadOnlyHeartbeat('http://localhost',{intervalMs:0}),RangeError);
  assert.throws(() => startReadOnlyHeartbeat('http://localhost',{intervalMs:5000}),RangeError);
});
