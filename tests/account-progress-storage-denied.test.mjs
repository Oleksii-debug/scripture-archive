import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
function part(first,last) {
  const a=source.indexOf(first),b=source.indexOf(last,a);
  assert.ok(a>=0&&b>a,'existing canonical function markers must survive');
  return source.slice(a,b);
}
const session=part('async function getSession() {','async function getBook(');
const progress=part('async function syncProgress() {','function field(');
function harness({oldOwner='one',nextUser={id:'two'},denied=[],remoteOk=true}={}){
  const disk=new Map([['sa.progressOwner',oldOwner],['sa.readingHistory','[{"book":"GEN","chapter":1}]'],
    ['sa.mission.OTAB01','{"index":7,"correct":["T"],"complete":false}']]);
  const writes=[],calls=[];
  const storage={
    getItem(key){if(denied.includes('get:'+key)||denied.includes('all'))throw Error('SecurityError');return disk.get(key)??null;},
    setItem(key,value){if(denied.includes('set:'+key)||denied.includes('all'))throw Error('SecurityError');disk.set(key,value);writes.push([key,value]);},
    removeItem(key){if(denied.includes('remove:'+key)||denied.includes('all'))throw Error('SecurityError');disk.delete(key);writes.push([key,null]);},
  };
  const state={user:{id:'one'},sessionUnavailable:false,progressSyncStatus:null,
    missionProgress:{index:7,correct:['T'],complete:false}};
  const context=vm.createContext({state,localStorage:storage,JSON,Number,Map,
    loadJSON:(key,fallback)=>JSON.parse(disk.get(key)??JSON.stringify(fallback)),
    fetch:async()=>remoteOk?{ok:true,json:async()=>({user:nextUser})}:{ok:false},
    accountRequest:async(action,method,body)=>{calls.push({action,method,body});
      if(action==='reading')return method==='PUT'?{ok:true}:{reading:[]};
      if(action==='progress')return {progress:{index:0,correct:[],complete:false}};
      throw Error('unexpected API');},
  });
  const actions=vm.runInContext(session+'\n'+progress+'\n({getSession,syncProgress,clearPersonalProgress})',context);
  return {...actions,state,disk,writes,calls};
}

test('verified account remains signed in when every browser storage operation is denied',async()=>{
  const h=harness({denied:['all']});
  assert.equal((await h.getSession()).id,'two');
  assert.equal(h.state.user.id,'two');
  assert.equal(h.state.sessionUnavailable,false);
  assert.equal(h.state.localReadingCacheTrusted,false);
  assert.equal(h.state.progressSyncStatus,'unavailable');
  assert.equal(h.state.missionProgress.index,0);
  await h.syncProgress();
  assert.equal(h.calls.filter(x=>x.action==='reading'&&x.method==='PUT').length,0);
});

test('normal account switch clears local personal records and records new verified owner',async()=>{
  const h=harness();
  await h.getSession();
  assert.equal(h.disk.get('sa.progressOwner'),'two');
  assert.equal(h.disk.get('sa.readingHistory'),'[]');
  assert.equal(JSON.parse(h.disk.get('sa.mission.OTAB01')).index,0);
  assert.equal(h.state.localReadingCacheTrusted,true);
  assert.equal(h.state.progressSyncStatus,null);
});

test('failed old-reading deletion retains previous owner and forbids cross-principal upload',async()=>{
  const h=harness({denied:['set:sa.readingHistory']});
  await h.getSession();
  assert.equal(h.disk.get('sa.progressOwner'),'one','retain marker until private cache actually cleared');
  assert.equal(h.state.localReadingCacheTrusted,false);
  assert.equal(h.state.progressSyncStatus,'unavailable');
  await h.syncProgress();
  assert.equal(h.calls.filter(x=>x.action==='reading'&&x.method==='PUT').length,0,
    'never copy previous account local reading to the current account');
});

test('one failed cleanup does not stop attempting other private-key wipes',()=>{
  const h=harness({denied:['set:sa.mission.OTAB01']});
  assert.equal(h.clearPersonalProgress(),false);
  assert.equal(h.disk.get('sa.readingHistory'),'[]');
  assert.equal(h.disk.get('sa.progressOwner'),'one');
  assert.equal(h.state.missionProgress.index,0);
});

test('logout reset remains non-throwing with fully blocked browser storage',()=>{
  const h=harness({denied:['all']});
  assert.equal(h.clearPersonalProgress(),false);
  assert.equal(h.state.missionProgress.index,0);
  assert.equal(h.state.localReadingCacheTrusted,false);
});

test('unavailable server identity still fails closed and preserves local cache for retry',async()=>{
  const h=harness({remoteOk:false});
  await assert.rejects(h.getSession(),/account_unavailable/);
  assert.equal(h.state.user,null);
  assert.equal(h.state.sessionUnavailable,true);
  assert.equal(h.state.progressSyncStatus,'unavailable');
  assert.equal(h.disk.get('sa.progressOwner'),'one');
  assert.equal(JSON.parse(h.disk.get('sa.readingHistory')).length,1);
});

test('missing owner marker cannot allow previous live account data into a different login',async()=>{
  const h=harness({oldOwner:null});
  assert.equal(h.disk.get('sa.progressOwner'),null);
  await h.getSession();
  assert.equal(h.state.user.id,'two');
  assert.equal(h.disk.get('sa.readingHistory'),'[]');
  assert.equal(h.disk.get('sa.progressOwner'),'two');
  await h.syncProgress();
  assert.equal(h.calls.filter(x=>x.action==='reading'&&x.method==='PUT').length,0);
});

test('a previously untrusted cache is cleared before storage becomes available again',async()=>{
  const h=harness({oldOwner:'two'});
  h.state.user={id:'two'};
  h.state.localReadingCacheTrusted=false;
  await h.getSession();
  assert.equal(h.disk.get('sa.readingHistory'),'[]');
  assert.equal(h.state.localReadingCacheTrusted,true);
  assert.equal(h.disk.get('sa.progressOwner'),'two');
});
