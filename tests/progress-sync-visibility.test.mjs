import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

// Run the actual public client sync function; avoid a test-only reimplementation.
const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const workspace = readFileSync(new URL('../public/workspace.js', import.meta.url), 'utf8');
const start = app.indexOf('async function syncProgress() {');
const end = app.indexOf('\nfunction clearPersonalProgress()', start);
assert.ok(start >= 0 && end > start, 'canonical progress sync function missing');
const body = app.slice(start, end);

async function harness({ reading, progress, errorAt, user = true, local = [] } = {}) {
  const state = {
    user: user ? { id:'reader' } : null,
    missionProgress: { index:1,correct:['T-1'],complete:false },
    progressSyncUnavailable:false,
  };
  const disk = new Map([['sa.readingHistory',JSON.stringify(local)]]);
  const calls = [];
  const { syncProgress } = vm.runInNewContext(body + '\n({syncProgress})', {
    state, Map, Number, JSON,
    loadJSON: key => JSON.parse(disk.get(key) || '[]'),
    localStorage: { setItem: (key, value) => disk.set(key, value) },
    accountRequest: async (action, method, data) => {
      calls.push({action,method,data});
      if (action === errorAt) throw Error('D1 unavailable');
      if (action === 'reading' && method === 'PUT') return {ok:true};
      if (action === 'reading') return reading ?? {reading:[]};
      if (action === 'progress') return progress ?? {progress:{index:2,correct:['T-1'],complete:false}};
      throw Error('unknown action');
    },
  });
  await syncProgress();
  return {state,disk,calls};
}

test('signed-in reader shows an unavailable status without overwriting local history on failed D1 read', async () => {
  const snapshot=[{book:'GEN',chapter:12,title:'Genesis'}];
  const result=await harness({errorAt:'reading',local:snapshot});
  assert.equal(result.state.progressSyncUnavailable,true);
  assert.deepEqual(JSON.parse(result.disk.get('sa.readingHistory')),snapshot);
  assert.deepEqual(JSON.parse(JSON.stringify(result.state.missionProgress)),{index:1,correct:['T-1'],complete:false});
  assert.equal(result.calls.length,1,'no writes after failed first read');
});

test('failed or malformed progress response does not replace prior saved mission state', async () => {
  for(const options of [{errorAt:'progress'}, {progress:{error:'progress_state_unavailable'}}, {progress:{progress:{index:0,correct:null,complete:false}}}]) {
    const result=await harness(options);
    assert.equal(result.state.progressSyncUnavailable,true);
    assert.equal(result.state.missionProgress.index,1);
    assert.equal(result.disk.has('sa.mission.OTAB01'),false);
  }
});

test('successful private reads clear the warning and save verified reading and mission progress', async () => {
  const reading={reading:[{book:'JHN',chapter:3,title:'John'}]};
  const local=[{book:'GEN',chapter:12,title:'Genesis'}];
  const result=await harness({reading,local});
  assert.equal(result.state.progressSyncUnavailable,false);
  assert.equal(result.state.missionProgress.index,2);
  assert.deepEqual(JSON.parse(result.disk.get('sa.readingHistory')).map(r=>r.book),['JHN','GEN']);
  assert.equal(result.calls.filter(c=>c.action==='reading'&&c.method==='PUT').length,1);
});

test('guests do not initiate account reads or show private-sync warnings', async () => {
  const result=await harness({user:false});
  assert.equal(result.calls.length,0);
  assert.equal(result.state.progressSyncUnavailable,false);
});

test('progress UI exposes a localized accessible warning, never a silent stale-cache success', () => {
  assert.match(workspace,/state\.user\?\.progressSyncUnavailable\?\x60<p class="notice error" role="alert">/);
  assert.equal((workspace.match(/syncUnavailable:/g)||[]).length,3);
  for(const message of ['Не вдалося підтвердити дані','Не удалось подтвердить данные','Server data could not be confirmed']) {
    assert.ok(workspace.includes(message));
  }
  assert.match(app,/state\.progressSyncUnavailable=true/);
  assert.match(app,/state\.progressSyncUnavailable=false/);
});
