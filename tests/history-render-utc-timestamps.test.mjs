import test from 'node:test';
import assert from 'node:assert/strict';
import {missionHistoryMarkup,reviewScheduleMarkup} from '../public/workspace.js';

const esc = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;')
  .replaceAll('>','&gt;').replaceAll('"','&quot;');
const completed = {id:'one',book:'GEN',chapter:12,mode:'personal',score:1,total:2,
  completedAt:'2026-10-30 06:00:00'};
const pending = {id:'wait',book:'GEN',chapter:12,startedAt:'2026-10-30 07:00:00'};
const invalid = [
  'not-a-date','', ' ', '2026-02-30 06:00:00', '2026-02-29 06:00:00',
  '2026-04-31 06:00:00', '2026-00-30 06:00:00', '2026-13-30 06:00:00',
  '2026-10-00 06:00:00', '2026-10-32 06:00:00', '2026-10-30 24:00:00',
  '2026-10-30 27:00:00','2026-10-30 06:60:00','2026-10-30 06:00:60',
  '2026-10-30T06:00:00Z','2026-10-30 06:00:00Z',
  '2026-10-30 06:00:00+00:00','2026-10-30 06:00',
  '2026-10-30 06:00:00.000','2026-10-30 06:00:00 UTC',
  '2026-10-30 06:00:00 ',' 2026-10-30 06:00:00',
  '2026-10-30 06:00:00\nextra','2026-10-30 06:00:00\u0000',
  '2026-1-30 06:00:00','0000-00-00 00:00:00',
  null, true, 3, {}, ['2026-10-30 06:00:00']
];
for(const [i,bad] of invalid.entries()){
  test('bad completedAt #'+(i+1)+' never becomes a verified completed mission UTC record',()=>{
    const payload={attempts:[{...completed,completedAt:bad}],pending:[]};
    const html=missionHistoryMarkup(payload,'uk',esc);
    assert.match(html,/retry-mission-history/);
    assert.doesNotMatch(html,/href="\/mission\/attempt\/|href="\/reader\//);
    assert.equal(reviewScheduleMarkup(payload,'uk',esc),'');
  });
  test('bad startedAt #'+(i+1)+' never creates an active mission resume link',()=>{
    const payload={attempts:[],pending:[{...pending,startedAt:bad}]};
    const html=missionHistoryMarkup(payload,'en',esc);
    assert.match(html,/retry-mission-history/);
    assert.doesNotMatch(html,/href="\/mission\/attempt\//);
    assert.equal(reviewScheduleMarkup(payload,'en',esc),'');
  });
}
for(const date of ['2024-02-29 23:59:59','2026-01-01 00:00:00','2026-10-30 06:00:00']){
  test('canonical completed UTC '+date+' retains real history and repeat navigation',()=>{
    const payload={attempts:[{...completed,completedAt:date}],pending:[]};
    const html=missionHistoryMarkup(payload,'en',esc);
    assert.match(html,/href="\/mission\/attempt\/one"/);
    assert.match(html,/href="\/reader\/GEN\/12"/);
    assert.doesNotMatch(html,/retry-mission-history/);
  });
  test('canonical pending UTC '+date+' retains real resume navigation',()=>{
    const payload={attempts:[],pending:[{...pending,startedAt:date}]};
    const html=missionHistoryMarkup(payload,'ru',esc);
    assert.match(html,/href="\/mission\/attempt\/wait"/);
    assert.doesNotMatch(html,/retry-mission-history/);
  });
}
test('legacy missing optional timestamps keep preexisting no-crash behavior',()=>{
  const a=missionHistoryMarkup({attempts:[{...completed,completedAt:undefined}],pending:[]},'en',esc);
  const b=missionHistoryMarkup({attempts:[],pending:[{...pending,startedAt:undefined}]},'en',esc);
  assert.doesNotMatch(a,/retry-mission-history/);
  assert.doesNotMatch(b,/retry-mission-history/);
});
