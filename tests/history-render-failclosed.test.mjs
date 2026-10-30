import test from 'node:test';
import assert from 'node:assert/strict';
import { missionHistoryMarkup, reviewScheduleMarkup } from '../public/workspace.js';

const esc = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const valid={id:'one',book:'GEN',chapter:12,score:1,total:2,mode:'personal',completedAt:'2026-10-30 06:00:00'};
const pending={id:'pending',book:'GEN',chapter:12,startedAt:'2026-10-30 06:05:00'};
const history=({attempts=[valid],pending:rows=[pending]}={})=>({attempts,pending:rows});

test('empty authoritative arrays differ from missing/untrusted history',()=>{
  const good=missionHistoryMarkup({attempts:[],pending:[]},'en',esc);
  assert.match(good,/There are no completed attempts yet/);
  for (const bad of [{}, {attempts:null}, {attempts:'empty'}, {attempts:{}},
    {attempts:[],pending:null},{attempts:[],pending:'broken'}]) {
    const html=missionHistoryMarkup(bad,'en',esc);
    assert.match(html,/retry-mission-history/,JSON.stringify(bad));
    assert.doesNotMatch(html,/There are no completed attempts yet/);
    assert.equal(reviewScheduleMarkup(bad,'en',esc),'');
  }
});

test('malformed completed rows produce localized retry, not fabricated links or results',()=>{
  const invalid=[
    null,[],{}, {...valid,id:null},{...valid,id:''},{...valid,id:'\uD800'},
    {...valid,book:12},{...valid,book:''},{...valid,chapter:'12'},
    {...valid,chapter:0},{...valid,chapter:Infinity},
    {...valid,score:null},{...valid,score:'1'}, {...valid,total:0},
    {...valid,score:3},{...valid,mode:'unknown'},{...valid,completedAt:42},
  ];
  for(const bad of invalid){
    const payload={attempts:[valid,bad],pending:[]};
    const html=missionHistoryMarkup(payload,'uk',esc);
    assert.match(html,/retry-mission-history/);
    assert.doesNotMatch(html,/href="\/mission\/attempt\//);
    assert.doesNotMatch(html,/NaN|Infinity/);
    assert.equal(reviewScheduleMarkup(payload,'uk',esc),'');
  }
});

test('malformed pending rows never break the whole progress workspace',()=>{
  for(const bad of [null,{},{...pending,id:'\uDFFF'},{...pending,chapter:NaN},{...pending,book:[]},{...pending,startedAt:5}]){
    const html=missionHistoryMarkup(history({pending:[pending,bad]}),'ru',esc);
    assert.match(html,/retry-mission-history/);
    assert.doesNotMatch(html,/href="/);
  }
});

test('malformed history book codes never create a fabricated reader route',()=>{
  // A bounded text value is not a canonical Scripture book identifier.
  // Check both historical completions and resumable attempts.
  const invalidBooks=['NOT/A/BOOK','GEN?chapter=1','<script>','GEN ','ABCD','A','1A','4CO','gen','\\uD800'];
  for(const book of invalidBooks){
    const completed=missionHistoryMarkup(history({attempts:[{...valid,book}],pending:[]}), 'en',esc);
    assert.match(completed,/retry-mission-history/,book);
    assert.doesNotMatch(completed,/href="\\/reader\\//,book);
    assert.doesNotMatch(completed,/href="\\/mission\\/attempt\\//,book);
    assert.equal(reviewScheduleMarkup(history({attempts:[{...valid,book}],pending:[]}), 'en',esc),'');
    const resumed=missionHistoryMarkup(history({attempts:[],pending:[{...pending,book}]}),'en',esc);
    assert.match(resumed,/retry-mission-history/,book);
    assert.doesNotMatch(resumed,/href="/,book);
  }
  const canonical={...valid,book:'1CO',chapter:10};
  const html=missionHistoryMarkup(history({attempts:[canonical],pending:[]}), 'en',esc);
  assert.match(html,/href="\\/reader\\/1CO\\/10"/);
  assert.doesNotMatch(html,/retry-mission-history/);
});

test('server history bounds are enforced and an invalid row is not silently dropped',()=>{
  const overHistory={attempts:Array(101).fill(valid),pending:[]};
  const overPending={attempts:[],pending:Array(21).fill(pending)};
  for(const payload of [overHistory,overPending]){
    assert.match(missionHistoryMarkup(payload,'en',esc),/retry-mission-history/);
    assert.equal(reviewScheduleMarkup(payload,'en',esc),'');
  }
});

test('valid canonical rows retain completed links, corrections and pending recovery',()=>{
  const html=missionHistoryMarkup(history(),'en',esc);
  assert.match(html,/href="\/mission\/attempt\/one"/);
  assert.match(html,/href="\/reader\/GEN\/12"/);
  assert.match(html,/Finish saving the result: GEN 12/);
  assert.match(reviewScheduleMarkup(history(),'en',esc),/Suggested review/);
  assert.doesNotMatch(html,/retry-mission-history/);
});

test('guest, error and active-attempt panels retain existing safe behavior',()=>{
  assert.match(missionHistoryMarkup({guest:true},'uk',esc),/Увійдіть/);
  assert.match(missionHistoryMarkup({error:true},'en',esc),/retry-mission-history/);
  assert.match(missionHistoryMarkup({locked:true},'ru',esc),/История скрыта/);
  for(const payload of [{guest:true},{error:true},{locked:true}])
    assert.equal(reviewScheduleMarkup(payload,'en',esc),'');
});
