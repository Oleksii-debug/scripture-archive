import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const start=source.indexOf("document.querySelector('#mark-read').onclick=async");
const end=source.indexOf("\n  document.querySelector('#start-questions')?.addEventListener",start);
assert.ok(start>=0&&end>start,'real reader mark-read handler exists');
const handler=source.slice(start,end).trim();

const copies={
  uk:'Не вдалося перевірити збережену історію читання.',
  ru:'Не удалось проверить сохранённую историю чтения.',
  en:'Saved reading history could not be verified.',
};
function setup({decoded=[],lang='uk',signedIn=false,stale=false}={}) {
  const initial=JSON.stringify(decoded);
  const button={dataset:{},disabled:false,textContent:'Mark',attrs:{},
    setAttribute(key,value){this.attrs[key]=value;},
    removeAttribute(key){delete this.attrs[key];}};
  const questions={unlocked:false,removeAttribute(){this.unlocked=true;}};
  const document={activeElement:null,querySelector(selector){
    if(selector==='#mark-read')return button;
    if(selector==='#start-questions')return questions;
    return null;
  }};
  let writes=0,cloudCalls=0,attemptCalls=0,reads=0;
  const announcements=[],saved=[];
  const state={user:signedIn?{id:'user-1'}:null};
  const env={
    document,state,readerStillCurrent:()=>!stale,
    loadJSON:()=>{reads++;return decoded;},
    meta:{code:'GEN'},chapter:1,bookTitle:()=> 'Genesis',
    groupId:'',hasTasks:false,w:{readMarked:'Marked'},
    storeReaderPreference:(key,raw)=>{writes++;assert.equal(key,'sa.readingHistory');saved.push(JSON.parse(raw));return true;},
    accountRequest:async()=>{cloudCalls++;return{};},
    attemptRequest:async()=>{attemptCalls++;return{};},
    announce:value=>announcements.push(value),
    t:key=>key==='readerHistoryNeedsRecovery'?copies[lang]:key==='readingSyncRetry'?'Retry saving':key,
  };
  const init=new Function(...Object.keys(env),handler+"\nreturn document.querySelector('#mark-read').onclick;");
  const click=init(...Object.values(env));
  return {click,button,questions,announcements,initial,
    get writes(){return writes;},get cloudCalls(){return cloudCalls;},
    get attemptCalls(){return attemptCalls;},get reads(){return reads;},
    get saved(){return saved;},get decoded(){return decoded;}
  };
}
const good={book:'GEN',chapter:1,title:'Genesis'};
const malformed=[
  null, false, 'not an array', {}, 17,
  [null], [false], [[good]], [{}],
  [{book:'GEN',chapter:1,title:null}],
  [{book:'GEN',chapter:'1',title:'Genesis'}],
  [{book:'https://unsafe.example',chapter:1,title:'Forged'}],
  [{book:'GEN',chapter:151,title:'Outside limit'}],
  [{book:'GEN',chapter:1.5,title:'Fraction'}],
  [{book:'GEN',chapter:1,title:'  '}],
  [{book:'GEN',chapter:1,title:'X'.repeat(201)}],
  [good,null],
];

test('malformed decoded history never silently replaces source, saves or unlocks',async()=>{
  for(const decoded of malformed){
    const h=setup({decoded,signedIn:true});
    await h.click();
    assert.equal(h.writes,0,'no private local write: '+JSON.stringify(decoded));
    assert.equal(h.cloudCalls,0,'no server PUT for uncertain history');
    assert.equal(h.attemptCalls,0,'no unlock for uncertain history');
    assert.equal(h.questions.unlocked,false);
    assert.equal(JSON.stringify(h.decoded),h.initial,'keep source bytes untouched');
    assert.equal(h.button.disabled,false);
    assert.equal(h.button.attrs['aria-busy'],undefined,'busy flag is always retired');
    assert.equal(h.button.dataset.saSaving,undefined);
    assert.equal(h.button.textContent,'Retry saving');
    assert.equal(h.announcements.length,1);
  }
});

for(const lang of ['uk','ru','en']){
  test(lang+' announces truthful corrupt-history recovery to screen-reader',async()=>{
    const h=setup({lang,decoded:[good,null]});
    await h.click();
    assert.deepEqual(h.announcements,[copies[lang]]);
    assert.ok(source.includes('readerHistoryNeedsRecovery: "'+copies[lang]));
    assert.equal(h.writes,0);
  });
}

test('an already valid history still marks chapter and persists unchanged',async()=>{
  const h=setup({decoded:[good]});
  await h.click();
  assert.equal(h.writes,1);
  assert.deepEqual(h.saved,[[good]]);
  assert.equal(h.button.disabled,true);
  assert.equal(h.attemptCalls,0);
  assert.equal(h.announcements.at(-1),'Marked');
});

test('a valid new chapter remains writable without discarding earlier history',async()=>{
  const previous={book:'EXO',chapter:2,title:'Exodus'};
  const h=setup({decoded:[previous]});
  await h.click();
  assert.equal(h.writes,1);
  assert.deepEqual(h.saved,[[previous,good]]);
});

test('valid duplicate visits are preserved without insertion or silent replacement',async()=>{
  const h=setup({decoded:[good,{...good,title:'Genesis updated'}]});
  await h.click();
  assert.equal(h.writes,1);
  assert.equal(h.saved[0].length,2);
});

test('an invalid row mixed into real history prevents any partial overwrite',async()=>{
  const h=setup({decoded:[good,null,{book:'EXO',chapter:2,title:'Exodus'}]});
  await h.click();
  assert.equal(h.writes,0);
  assert.equal(h.cloudCalls,0);
  assert.equal(h.button.disabled,false);
});

test('stale chapter/account does not inspect or overwrite local history',async()=>{
  const h=setup({decoded:[null],stale:true});
  await h.click();
  assert.equal(h.reads,0);
  assert.equal(h.writes,0);
  assert.deepEqual(h.announcements,[]);
});

test('guest malformed history cannot falsely complete reading',async()=>{
  const h=setup({decoded:[null],signedIn:false});
  await h.click();
  assert.equal(h.writes,0);
  assert.equal(h.cloudCalls,0);
  assert.equal(h.button.disabled,false);
});

test('authenticated valid reading retains canonical acknowledged API sequence',async()=>{
  const h=setup({decoded:[],signedIn:true});
  await h.click();
  assert.equal(h.writes,1);
  assert.equal(h.cloudCalls,1);
  assert.equal(h.button.disabled,true);
});
