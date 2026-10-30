import test from 'node:test';
import assert from 'node:assert/strict';
import { verifiedLocalReadingHistory, renderWorkspace } from '../public/workspace.js';

const row = (book, chapter, title) => ({ book, chapter, title });

test('a repeated canonical chapter counts once and keeps its newest localized title', () => {
  const actual = verifiedLocalReadingHistory([
    row('GEN', 1, 'Genesis'), row('EXO', 2, 'Exodus'),
    row('GEN', 1, 'Буття'), row('GEN', 1, 'Буття (виправлено)'),
  ]);
  assert.deepEqual(actual, [
    row('EXO', 2, 'Exodus'), row('GEN', 1, 'Буття (виправлено)'),
  ]);
});

test('different books sharing a chapter number remain independent', () => {
  assert.deepEqual(verifiedLocalReadingHistory([
    row('GEN', 1, 'A'), row('EXO', 1, 'B'), row('JHN', 1, 'C'),
  ]), [row('GEN', 1, 'A'), row('EXO', 1, 'B'), row('JHN', 1, 'C')]);
});

test('different chapters in the same book remain independent', () => {
  assert.deepEqual(verifiedLocalReadingHistory([
    row('GEN', 1, 'First'), row('GEN', 2, 'Second'),
  ]), [row('GEN', 1, 'First'), row('GEN', 2, 'Second')]);
});

test('the latest duplicate sets chronology, not the first duplicate', () => {
  assert.deepEqual(verifiedLocalReadingHistory([
    row('GEN', 1, 'Old'), row('EXO', 2, 'Middle'), row('JHN', 3, 'Third'),
    row('GEN', 1, 'Newest'),
  ]), [row('EXO', 2, 'Middle'), row('JHN', 3, 'Third'), row('GEN', 1, 'Newest')]);
});

test('a rejected newest row cannot shadow a validated older chapter', () => {
  assert.deepEqual(verifiedLocalReadingHistory([
    row('GEN', 1, 'Valid'),
    row('GEN', 1, ' '.repeat(201)),
    {book:'GEN',chapter:1,title:null},
    {book:'GEN',chapter:1,title:'   '},
  ]), [row('GEN', 1, 'Valid')]);
});

test('invalid duplicate shapes are ignored without deleting valid bookmarks', () => {
  const actual = verifiedLocalReadingHistory([
    null, row('GEN', 1, 'Valid'), [], 1, 'bad',
    {book:'GEN',chapter:'1',title:'String chapter'},
    {book:'GEN',chapter:1.5,title:'Fraction'},
    {book:'GEN',chapter:151,title:'Out of range'},
    row('GEN', 1, 'Newest'),
  ]);
  assert.deepEqual(actual, [row('GEN', 1, 'Newest')]);
});

test('do not mutate source array or source records while deduplicating', () => {
  const input = [row('GEN', 1, 'First'), row('EXO', 2, 'Second'), row('GEN', 1, 'Last')];
  const before=JSON.stringify(input);
  const result=verifiedLocalReadingHistory(input);
  assert.equal(JSON.stringify(input), before);
  assert.deepEqual(result, [row('EXO', 2, 'Second'), row('GEN', 1, 'Last')]);
  assert.notStrictEqual(result,input);
});

test('exactly 2048 unique valid recent entries remain visible', () => {
  const input=Array.from({length:2048},(_,i)=>row('PSA',(i%150)+1,'Entry'+i));
  const result=verifiedLocalReadingHistory(input);
  assert.equal(result.length,150);
  assert.equal(result[0].title,'Entry1898');
  assert.equal(result.at(-1).title,'Entry2047');
});

test('the newest bounded window takes precedence over a duplicate before it', () => {
  const input=[row('GEN', 1, 'Discarded')]
    .concat(Array.from({length:2047},(_,i)=>row('PSA',(i%150)+1,'Old'+i)),
            [row('GEN', 1, 'Retained')]);
  const result=verifiedLocalReadingHistory(input);
  assert.equal(result.filter(x=>x.book==='GEN'&&x.chapter===1).length,1);
  assert.equal(result.at(-1).title,'Retained');
});

test('a latest window without a duplicate survives unchanged', () => {
  const input=[row('GEN',1,'Old')].concat(
    Array.from({length:2048},(_,i)=>row('PSA',(i%150)+1,'New'+i)));
  const result=verifiedLocalReadingHistory(input);
  assert.ok(result.every(x=>x.book==='PSA'));
  assert.equal(result.at(-1).title,'New2047');
});

test('a replay of 2048 identical chapters is a single actual read chapter', () => {
  const records=Array.from({length:2048},(_,i)=>row('GEN',12,'Read '+i));
  const result=verifiedLocalReadingHistory(records);
  assert.equal(result.length,1);
  assert.equal(result[0].title,'Read 2047');
});

test('non-array storage does not produce a fabricated read chapter', () => {
  for(const invalid of [null,undefined,0,1,'text',{},true]) {
    assert.deepEqual(verifiedLocalReadingHistory(invalid),[]);
  }
});

test('all legal normalized book-code shapes keep separate chapter identities', () => {
  const records=[
    row('GEN',1,'Genesis'),row('JHN',1,'John'),
    row('1CO',1,'First Corinthians'),row('2CO',1,'Second Corinthians'),
    row('3JN',1,'Third John'),
  ];
  assert.deepEqual(verifiedLocalReadingHistory(records),records);
});

test('duplicate filtering never promotes malformed codes or non-positive chapters', () => {
  const records=[
    row('gen',1,'lowercase'),row('GEN',0,'zero'),
    row('GEN',-1,'negative'),row('GEN',NaN,'NaN'),
    row('GEN',Infinity,'Infinity'),row('../GEN',1,'path'),
    row('ABCD',1,'four-letter fabricated book'),row('1ABCD',1,'numeric fabricated book'),
    row('GEN',1,'Approved'),
  ];
  assert.deepEqual(verifiedLocalReadingHistory(records),[row('GEN',1,'Approved')]);
});

test('canonical progress screen shows distinct count and only one chapter link', async () => {
  const previous={fetch:globalThis.fetch,location:globalThis.location,document:globalThis.document};
  let html='';
  const state={
    lang:'en',user:{id:'alice'},sessionUnavailable:false,
    missionProgress:{correct:[],complete:false,index:0},
  };
  globalThis.location={pathname:'/progress',search:'',hash:''};
  globalThis.document={querySelector:()=>null};
  globalThis.fetch=async ()=>({ok:true,json:async()=>({attempts:[]})});
  try{
    await renderWorkspace('progress',{
      state,t:key=>key,esc:String,shell:markup=>{html=markup;},
      setActiveNav(){},getMission:async()=>({taskCount:2,title:{en:'Mission'}}),
      loadJSON:()=>[row('GEN',12,'First'),row('EXO',3,'Other'),row('GEN',12,'Newest')],
      announce(){},play(){},getCatalog:async()=>({}),
    });
    assert.match(html,/<strong>2<\/strong><p>Chapters marked as read<\/p>/);
    assert.equal((html.match(/href="\/reader\/GEN\/12"/g)||[]).length,1);
    assert.equal((html.match(/href="\/reader\/EXO\/3"/g)||[]).length,1);
    assert.match(html,/Newest/);
    assert.doesNotMatch(html,/First/);
  }finally{
    for(const key of ['fetch','location','document']){
      if(previous[key]===undefined)delete globalThis[key];else globalThis[key]=previous[key];
    }
  }
});
