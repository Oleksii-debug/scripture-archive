import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import { canonicalReadingChapterBounds, reviewSuggestions, reviewScheduleMarkup, missionHistoryMarkup } from '../public/workspace.js';

const sourceCatalog=JSON.parse(readFileSync(new URL('../public/data/catalog.json',import.meta.url),'utf8'));
const realChapters=canonicalReadingChapterBounds(sourceCatalog);

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

test('review calendar never suggests forged book/chapter pairs from historical receipts',()=>{
  assert.equal(realChapters.size,66);
  for(const [book,chapter] of [['FAK',2],['GEN',51],['JOL',5],['PSA',151],['REV',23]]) {
    const row={...attempt(1),book,chapter};
    assert.deepEqual(reviewSuggestions([row],now,realChapters),[],
      'no suggestion from unverified passage '+book+':'+chapter);
    const html=reviewScheduleMarkup({attempts:[row],pending:[]},'en',esc,now,realChapters);
    assert.equal(html,'','inconsistent history is not an empty verified review schedule');
  }
  const joel={...attempt(1),book:'JOL',chapter:4};
  const suggestions=reviewSuggestions([joel],now,realChapters);
  assert.equal(suggestions.length,1,'approved Ukrainian edition has Joel chapter 4');
  assert.equal(suggestions[0].book,'JOL');
  const html=reviewScheduleMarkup({attempts:[joel],pending:[]},'en',esc,now,realChapters);
  assert.match(html,/href="\/reader\/JOL\/4"/);
});

test('unavailable catalog never creates optimistic scheduled reviews',()=>{
  const row=attempt(1);
  for(const invalid of [null,new Map(),new Map([['FAK',150]])]){
    assert.deepEqual(reviewSuggestions([row],now,invalid),[]);
    assert.equal(reviewScheduleMarkup({attempts:[row],pending:[]},'en',esc,now,invalid),'');
  }
});


test('SA-EXT-02 duplicate completed attempt ID cannot fabricate extra spaced repetitions',()=>{
  const saved=attempt(1);
  const duplicated=[saved,{...saved}];
  assert.deepEqual(reviewSuggestions(duplicated,now,realChapters),[],
    'two identical records are not two independent study events');
  for(const lang of ['uk','ru','en']){
    const history={attempts:duplicated,pending:[]};
    assert.equal(reviewScheduleMarkup(history,lang,esc,now,realChapters),'',
      'no invented due date or study link is exposed');
    const rendered=missionHistoryMarkup(history,lang,esc,realChapters);
    assert.ok(rendered.includes('id="retry-mission-history"'),
      'duplicate receipt is reported as unavailable, not as two completed lessons');
    assert.ok(!rendered.includes('href="/mission/attempt/fixture-1-personal-12"'),
      'no duplicate personal attempt rendered');
  }
});

test('SA-EXT-02 completion/pending collision is a broken private history receipt',()=>{
  const completed=attempt(3);
  const pending={id:completed.id,book:completed.book,chapter:completed.chapter,
    startedAt:'2026-01-03 17:00:00'};
  const history={attempts:[completed],pending:[pending]};
  assert.equal(reviewScheduleMarkup(history,'en',esc,now,realChapters),'');
  const rendered=missionHistoryMarkup(history,'en',esc,realChapters);
  assert.match(rendered,/retry-mission-history/);
  assert.ok(!rendered.includes('href="/mission/attempt/'),
    'no conflicting same-ID row can leak as a resumable active assessment');
});

test('SA-EXT-02 conflicting duplicate IDs across passages quarantine both review entries',()=>{
  const first=attempt(1);
  const other={...attempt(3),id:first.id,book:'EXO',chapter:2};
  assert.deepEqual(reviewSuggestions([first,other],now,realChapters),[]);
  assert.deepEqual(reviewSuggestions([other,first],now,realChapters),[],
    'reordering a malformed history does not create an apparently trusted suggestion');
  for(const lang of ['uk','ru','en']){
    const history={attempts:[first,other],pending:[]};
    assert.equal(reviewScheduleMarkup(history,lang,esc,now,realChapters),'');
  }
});

test('SA-EXT-02 separate attempts on the same canonical passage still form valid repetition streaks',()=>{
  const first=attempt(1),second=attempt(3),third=attempt(7);
  const list=reviewSuggestions([third,second,first],now,realChapters);
  assert.equal(list.length,1);
  assert.equal(list[0].streak,3);
  assert.equal(list[0].dueAt,'2026-01-14');
  const html=reviewScheduleMarkup({attempts:[third,second,first],pending:[]},'en',esc,now,realChapters);
  assert.ok(html.includes('href="/reader/GEN/12"'));
});
