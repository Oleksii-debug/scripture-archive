import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import { canonicalReadingChapterBounds, verifiedLocalReadingHistory, renderWorkspace } from '../public/workspace.js';

const canonicalCatalog=JSON.parse(readFileSync(new URL('../public/data/catalog.json',import.meta.url),'utf8'));
const canonicalBounds=canonicalReadingChapterBounds(canonicalCatalog);

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
      announce(){},play(){},getCatalog:async()=>canonicalCatalog,
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

test('progress admits only actual canonical books and edition-specific chapter bounds', () => {
  assert.equal(canonicalBounds.size, 66);
  assert.equal(canonicalBounds.get('GEN'), 50);
  assert.equal(canonicalBounds.get('PSA'), 150);
  assert.equal(canonicalBounds.get('JOL'), 4,
    'the approved uk-ohiienko edition includes four chapters of Joel');
  let validated = 0;
  for (const [book, max] of canonicalBounds) {
    assert.deepEqual(verifiedLocalReadingHistory([row(book,max,'Approved')],canonicalBounds),
      [row(book,max,'Approved')],book+' final real chapter must be retained');
    assert.deepEqual(verifiedLocalReadingHistory([row(book,max+1,'Invented')],canonicalBounds),
      [],book+' impossible next chapter must be rejected');
    validated += 2;
  }
  for (const fake of ['FAK','ABC','XYZ','AAA','4CO','ABCD','gen','../GEN']) {
    assert.deepEqual(verifiedLocalReadingHistory([row(fake,1,'Unverified')],canonicalBounds),
      [],fake+' must never count as a read Bible book');
    validated++;
  }
  assert.equal(validated,140,'140 source-specific positive/negative chapter checks');
});

test('catalog outages, incomplete maps and forged edition expansions fail closed', () => {
  const corrupted=[
    null,{}, {books:{en:[]}},
    {...canonicalCatalog, books:{...canonicalCatalog.books,en:canonicalCatalog.books.en.slice(1)}},
    {...canonicalCatalog, books:{...canonicalCatalog.books,en:[canonicalCatalog.books.en[0],...canonicalCatalog.books.en.slice(0,65)]}},
    {...canonicalCatalog, editionBooks:{'unknown-edition':[{code:'FAK',chapters:1}]}},
    {...canonicalCatalog, editionBooks:{'unknown-edition':[{code:'GEN',chapters:151}]}},
  ];
  for (const bad of corrupted) {
    assert.equal(canonicalReadingChapterBounds(bad),null);
    assert.deepEqual(verifiedLocalReadingHistory([row('GEN',1,'Valid')],canonicalReadingChapterBounds(bad)),[]);
  }
  assert.deepEqual(verifiedLocalReadingHistory([row('GEN',1,'A')],new Map()),[]);
});

test('real progress route excludes forged chapters but preserves the approved Joel variant', async () => {
  const previous={fetch:globalThis.fetch,location:globalThis.location,document:globalThis.document};
  let html='';
  globalThis.location={pathname:'/progress',search:'',hash:''};
  globalThis.document={querySelector:()=>null};
  globalThis.fetch=async()=>({ok:true,json:async()=>({attempts:[]})});
  try {
    await renderWorkspace('progress',{
      state:{lang:'uk',user:{id:'alice'},sessionUnavailable:false,
        missionProgress:{correct:[],complete:false,index:0}},
      t:key=>key,esc:String,shell:markup=>{html=markup;},
      setActiveNav(){},getMission:async()=>({taskCount:2,title:{uk:'Місія'}}),
      loadJSON:()=>[row('FAK',2,'Вигадана'),row('GEN',51,'Неможлива'),
        row('JOL',4,'Йоіл'),row('GEN',50,'Буття')],
      announce(){},play(){},getCatalog:async()=>canonicalCatalog,
    });
    assert.match(html,/<strong>2<\\/strong><p>Глав позначено прочитаними<\\/p>/);
    assert.match(html,/href="\\/reader\\/JOL\\/4"/);
    assert.match(html,/href="\\/reader\\/GEN\\/50"/);
    assert.doesNotMatch(html,/href="\\/reader\\/FAK\\/|href="\\/reader\\/GEN\\/51"/);
    assert.doesNotMatch(html,/Вигадана|Неможлива/);
  } finally {
    for (const key of ['fetch','location','document']) {
      if(previous[key]===undefined)delete globalThis[key];else globalThis[key]=previous[key];
    }
  }
});

test('missing verified catalog never reports invented local history as zero completed', async () => {
  const previous={fetch:globalThis.fetch,location:globalThis.location,document:globalThis.document};
  let html='';
  globalThis.location={pathname:'/progress',search:'',hash:''};
  globalThis.document={querySelector:()=>null};
  globalThis.fetch=async()=>({ok:true,json:async()=>({attempts:[]})});
  try {
    await renderWorkspace('progress',{
      state:{lang:'en',user:{id:'alice'},sessionUnavailable:false,
        missionProgress:{correct:[],complete:false,index:0}},
      t:key=>key,esc:String,shell:markup=>{html=markup;},
      setActiveNav(){},getMission:async()=>({taskCount:2,title:{en:'Mission'}}),
      loadJSON:()=>[row('GEN',1,'Genesis')],
      announce(){},play(){},getCatalog:async()=>{throw Error('offline catalog');},
    });
    assert.match(html,/<strong>—<\\/strong><p>Chapters marked as read<\\/p>/);
    assert.match(html,/Bible catalog could not be verified/);
    assert.doesNotMatch(html,/href="\\/reader\\/GEN\\/1"/);
  } finally {
    for (const key of ['fetch','location','document']) {
      if(previous[key]===undefined)delete globalThis[key];else globalThis[key]=previous[key];
    }
  }
});
