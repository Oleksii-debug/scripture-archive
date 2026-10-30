import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewSuggestions, reviewScheduleMarkup, missionHistoryMarkup } from '../public/workspace.js';

const attempt=(day,score=4,mode='personal',chapter=12)=>({id:`fixture-${day}-${mode}-${chapter}`,book:'GEN',chapter,mode,score,total:4,completedAt:`2026-01-${String(day).padStart(2,'0')} 18:00:00`});
const now=new Date('2026-01-10T23:00:00Z');
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

test('personal repetitions lengthen intervals and mistakes reset the next suggestion',()=>{
  assert.equal(reviewSuggestions([attempt(1)],now)[0].dueAt,'2026-01-02');
  assert.equal(reviewSuggestions([attempt(3),attempt(1)],now)[0].dueAt,'2026-01-06');
  assert.equal(reviewSuggestions([attempt(7),attempt(3),attempt(1)],now)[0].dueAt,'2026-01-14');
  assert.equal(reviewSuggestions([attempt(15),attempt(7),attempt(3),attempt(1)],now)[0].dueAt,'2026-01-29');
  const reset=reviewSuggestions([attempt(9,1),attempt(7),attempt(3),attempt(1)],now)[0];
  assert.equal(reset.dueAt,'2026-01-10');assert.equal(reset.due,true);
});

test('group attempts never alter an individual suggestion',()=>{
  assert.deepEqual(reviewSuggestions([attempt(5,0,'group')],now),[]);
  const items=reviewSuggestions([attempt(7),attempt(5,0,'group'),attempt(1)],now);
  assert.equal(items[0].dueAt,'2026-01-10');
  assert.ok(missionHistoryMarkup({attempts:[attempt(5,0,'group')]},'en',esc).includes('Group attempt'));
});

test('attempt creation order prevents an old recovered result from replacing a newer one',()=>{
  const latest=attempt(3,4),recoveredOld=attempt(28,0);
  const suggestion=reviewSuggestions([latest,recoveredOld],now)[0];
  assert.equal(suggestion.dueAt,'2026-01-04');
});

test('review dates are UTC and invalid records do not create guesses',()=>{
  const leap={...attempt(1),completedAt:'2028-02-29 23:59:59'};
  assert.equal(reviewSuggestions([leap],new Date('2028-03-01T00:00:00Z'))[0].dueAt,'2028-03-01');
  assert.deepEqual(reviewSuggestions([{...attempt(1),completedAt:'2026-02-30 12:00:00'}],now),[]);
  assert.deepEqual(reviewSuggestions([attempt(3),{...attempt(1),score:8}],now),[]);
  assert.deepEqual(reviewSuggestions([{...attempt(1),book:'<script>'}],now),[]);
  assert.deepEqual(reviewSuggestions([attempt(1)],new Date('invalid')),[]);
});

test('suggestions are accessible text links and hidden when history is unavailable',()=>{
  const html=reviewScheduleMarkup({attempts:[attempt(1)]},'en',esc,now);
  assert.ok(html.includes('<h2>Suggested review</h2>'));
  assert.ok(html.includes('Ready to review'));
  assert.ok(html.includes('href="/reader/GEN/12"'));
  assert.ok(html.includes('not a measure of mastery'));
  assert.equal(reviewScheduleMarkup({locked:true},'en',esc,now),'');
  assert.equal(reviewScheduleMarkup({error:true},'en',esc,now),'');
});
