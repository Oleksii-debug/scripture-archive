import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Verify the actual canonical parser and actual #mark-read click handler.
// Neither mocked parsing nor a parallel storage implementation is authoritative.
const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const parserStart=source.indexOf('function loadJSON(');
const parserEnd=source.indexOf('\nfunction t(',parserStart);
const readerStart=source.indexOf("document.querySelector('#mark-read').onclick=async");
const readerEnd=source.indexOf("\n  document.querySelector('#start-questions')?.addEventListener",readerStart);
assert.ok(parserStart>=0&&parserEnd>parserStart);
assert.ok(readerStart>=0&&readerEnd>readerStart);
const parserSource=source.slice(parserStart,parserEnd);
const readerSource=source.slice(readerStart,readerEnd);

function scenario({raw='[]',lang='en',signedIn=false,readDenied=false,stale=false}={}) {
  let currentRaw=raw, writes=0, reads=0, cloud=0, unlock=0;
  const localStorage={
    getItem(key){
      assert.equal(key,'sa.readingHistory');
      reads++;
      if(readDenied)throw Error('StorageAccessDenied');
      return currentRaw;
    },
    setItem(key,value){assert.equal(key,'sa.readingHistory');writes++;currentRaw=value;},
  };
  const loadJSON=new Function('localStorage',parserSource+'\nreturn loadJSON;')(localStorage);
  const button={dataset:{},disabled:false,textContent:'Mark',attrs:{},
    setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];}};
  const document={activeElement:null,querySelector:s=>s==='#mark-read'?button:null};
  const announce=[];
  const copy={
    uk:'Не вдалося перевірити збережену історію читання.',
    ru:'Не удалось проверить сохранённую историю чтения.',
    en:'Saved reading history could not be verified.',
  };
  const state={user:signedIn?{id:'alice'}:null,localReadingStorageUntrusted:false};
  const env={
    document,state,loadJSON,readerStillCurrent:()=>!stale,
    meta:{code:'GEN'},chapter:1,bookTitle:()=> 'Genesis',
    groupId:'',hasTasks:false,w:{readMarked:'Marked'},
    storeReaderPreference:(key,value)=>{localStorage.setItem(key,value);return true;},
    accountRequest:async()=>{cloud++;return{};},
    attemptRequest:async()=>{unlock++;return{};},
    announce:msg=>announce.push(msg),
    t:key=>({readerHistoryNeedsRecovery:copy[lang],readingSyncRetry:'Retry saving'})[key]||key,
  };
  const onclick=new Function(...Object.keys(env),readerSource+"\nreturn document.querySelector('#mark-read').onclick;")(...Object.values(env));
  return {click:onclick,button,announce,localStorage,loadJSON,
    get raw(){return currentRaw;},get writes(){return writes;},
    get reads(){return reads;},get cloud(){return cloud;},get unlock(){return unlock;}};
}

test('strict parser distinguishes absent storage from corrupt existing JSON',()=>{
  const x=scenario({raw:null});
  assert.deepEqual(x.loadJSON('sa.readingHistory',[],true),[]);
  assert.deepEqual(x.loadJSON('sa.readingHistory',[]),[]);
  const y=scenario({raw:'{broken'});
  assert.equal(y.loadJSON('sa.readingHistory',[],true),null);
  assert.deepEqual(y.loadJSON('sa.readingHistory',[]),[]);
});

test('default parser behavior is unchanged for ordinary JSON cache consumers',()=>{
  for(const raw of ['false','null','0','""','{']) {
    const x=scenario({raw});
    assert.deepEqual(x.loadJSON('sa.readingHistory',[]),[]);
  }
  const y=scenario({raw:'{"index":3}'});
  assert.deepEqual(y.loadJSON('sa.readingHistory',{}),{index:3});
});

test('damaged raw reading bytes are kept byte-identical with no writes or unlock',async()=>{
  for(const raw of ['{broken','not JSON','[null','[{"book":"GEN",}', '[{}', '{', '[', 'undefined']){
    const x=scenario({raw,signedIn:true});
    await x.click();
    assert.equal(x.raw,raw,'preserve exact bytes: '+raw);
    assert.equal(x.writes,0);
    assert.equal(x.cloud,0,'do not upload empty fallback');
    assert.equal(x.unlock,0);
    assert.equal(x.button.disabled,false);
    assert.equal(x.button.dataset.saSaving,undefined);
    assert.equal(x.button.attrs['aria-busy'],undefined);
    assert.equal(x.button.textContent,'Retry saving');
    assert.deepEqual(x.announce,['Saved reading history could not be verified.']);
  }
});

test('existing valid but nonarray JSON also cannot be overwritten',async()=>{
  for(const raw of ['false','null','1','"old"','{"history":[]}']){
    const x=scenario({raw});
    await x.click();
    assert.equal(x.raw,raw);
    assert.equal(x.writes,0);
    assert.equal(x.button.disabled,false);
  }
});

test('fresh visitor with no reading key can still mark and persist the chapter',async()=>{
  const x=scenario({raw:null});
  await x.click();
  assert.equal(x.writes,1);
  assert.deepEqual(JSON.parse(x.raw),[{book:'GEN',chapter:1,title:'Genesis'}]);
  assert.equal(x.button.disabled,true);
  assert.deepEqual(x.announce,['Marked']);
});

test('valid serialized empty history behaves like fresh visitor',async()=>{
  const x=scenario({raw:'[]'});
  await x.click();
  assert.equal(x.writes,1);
  assert.deepEqual(JSON.parse(x.raw),[{book:'GEN',chapter:1,title:'Genesis'}]);
  assert.equal(x.button.disabled,true);
});

test('valid previous chapter is never erased by the next marked chapter',async()=>{
  const previous={book:'EXO',chapter:2,title:'Exodus'};
  const x=scenario({raw:JSON.stringify([previous]),signedIn:true});
  await x.click();
  assert.deepEqual(JSON.parse(x.raw),[previous,{book:'GEN',chapter:1,title:'Genesis'}]);
  assert.equal(x.cloud,1);
});

test('denied device read is not misclassified as verified empty history',async()=>{
  const x=scenario({raw:'[private]',readDenied:true,signedIn:true});
  await x.click();
  assert.equal(x.raw,'[private]');
  assert.equal(x.writes,0);
  assert.equal(x.cloud,0);
  assert.equal(x.button.disabled,false);
});

for(const lang of ['uk','ru','en']){
  test(lang+' damaged raw bytes produce only localized recovery feedback',async()=>{
    const x=scenario({raw:'notJSON',lang});
    await x.click();
    assert.equal(x.writes,0);
    assert.equal(x.announce.length,1);
    assert.ok(x.announce[0].length>25);
    assert.ok(source.includes('readerHistoryNeedsRecovery: "'+x.announce[0]));
  });
}

test('stale reader cannot read or overwrite corrupt device bytes',async()=>{
  const x=scenario({raw:'invalid',stale:true});
  await x.click();
  assert.equal(x.reads,0);
  assert.equal(x.writes,0);
  assert.deepEqual(x.announce,[]);
});
