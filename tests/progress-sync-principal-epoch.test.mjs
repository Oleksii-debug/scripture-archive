import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const start=source.indexOf('async function syncProgress() {');
const end=source.indexOf('\nfunction field(',start);
assert.ok(start>=0 && end>start,'canonical progress sync and reset functions must be present');
const activeStart=source.indexOf('function rememberActiveAttempt(');
const activeEnd=source.indexOf('async function getSession() {',activeStart);
assert.ok(activeStart>=0 && activeEnd>activeStart,'canonical active attempt helpers exist');
const fragment=source.slice(activeStart,activeEnd)+'\n'+source.slice(start,end);

function deferred(){
  let resolve,reject;
  const promise=new Promise((ok,bad)=>{resolve=ok;reject=bad;});
  return {promise,resolve,reject};
}
function harness(accountRequest){
  const state={user:{id:'one'},progressSyncStatus:null,
    missionProgress:{index:9,correct:['original'],complete:false}};
  const disk=new Map([['sa.readingHistory','[]'],['sa.progressOwner','one']]);
  const writes=[];
  const localStorage={
    getItem:key=>disk.get(key)??null,
    setItem:(key,value)=>{writes.push([key,value]);disk.set(key,value);},
    removeItem:key=>disk.delete(key),
  };
  const loadJSON=(key,fallback)=>JSON.parse(disk.get(key)||JSON.stringify(fallback));
  const funcs=vm.runInNewContext(fragment+'\n({syncProgress,clearPersonalProgress})',
    {state,localStorage,sessionStorage:{removeItem(){}},loadJSON,accountRequest,Map,Number,JSON});
  return {...funcs,state,disk,writes};
}
const validReading={reading:[{book:'GEN',chapter:1,title:'Genesis'}]};
const validProgress={progress:{index:2,correct:['completed'],complete:false}};

test('logout during the first pending private read cannot write old progress to local storage',async()=>{
  const gate=deferred(),calls=[];
  const h=harness(async(action,method)=>{calls.push([action,method]);return action==='reading'&&!method?gate.promise:validProgress;});
  const pending=h.syncProgress();
  h.state.user=null;h.clearPersonalProgress();
  gate.resolve(validReading);await pending;
  assert.equal(calls.length,1,'old session must not issue another private API call');
  assert.equal(h.state.missionProgress.index,0);
  assert.equal(h.state.progressSyncStatus,null);
  assert.equal(h.disk.get('sa.mission.OTAB01')?.includes('completed'),false);
});

test('different login, even with the same user ID, cannot consume a stale response',async()=>{
  const gate=deferred(),calls=[];
  const h=harness(async(action,method)=>{calls.push([action,method]);return action==='reading'&&!method?gate.promise:validProgress;});
  const pending=h.syncProgress();
  h.state.user={id:'one'};h.state.progressSyncStatus=null;
  gate.resolve(validReading);await pending;
  assert.equal(calls.length,1);
  assert.equal(h.writes.length,0);
  assert.equal(h.state.missionProgress.index,9);
  assert.equal(h.state.progressSyncStatus,null);
});

test('old private reading PUT acknowledgment cannot trigger subsequent cross-account progress read',async()=>{
  const gate=deferred(),calls=[];
  const h=harness(async(action,method)=>{
    calls.push([action,method]);return action==='reading'&&method==='PUT'?gate.promise:
      action==='reading'?validReading:validProgress;
  });
  const pending=h.syncProgress();
  while(calls.length<2)await Promise.resolve();
  h.state.user={id:'two'};h.state.progressSyncStatus=null;
  gate.resolve({ok:true});await pending;
  assert.deepEqual(calls.map(x=>x[0]),['reading','reading']);
  assert.equal(h.writes.length,0);
  assert.equal(h.state.missionProgress.index,9);
});

test('old progress response after principal switch cannot persist or dismiss warnings',async()=>{
  const gate=deferred(),calls=[];
  const h=harness(async(action,method)=>{
    calls.push([action,method]);return action==='progress'?gate.promise:
      action==='reading'?{reading:[]}:validProgress;
  });
  const pending=h.syncProgress();
  while(!calls.some(x=>x[0]==='progress'))await Promise.resolve();
  h.state.user={id:'two'};h.state.progressSyncStatus='partial';
  gate.resolve(validProgress);await pending;
  assert.equal(h.writes.length,0);
  assert.equal(h.state.missionProgress.index,9);
  assert.equal(h.state.progressSyncStatus,'partial');
});

test('later same-principal refresh wins over an earlier slow request',async()=>{
  const gate=deferred();let reads=0;
  const h=harness(async(action,method)=>{
    if(action==='reading'&&!method)return ++reads===1?gate.promise:{reading:[]};
    if(action==='progress')return {progress:{index:4,correct:['fresh'],complete:false}};
    return {ok:true};
  });
  const older=h.syncProgress();
  await h.syncProgress();
  gate.resolve({reading:[{book:'EXO',chapter:2,title:'stale'}]});await older;
  assert.equal(h.state.missionProgress.index,4);
  assert.equal(h.state.progressSyncStatus,null);
  assert.equal(JSON.parse(h.disk.get('sa.readingHistory')).length,0);
});

test('stale rejection after logout must not reinstate an unavailable account warning',async()=>{
  const gate=deferred();
  const h=harness(async()=>gate.promise);
  const pending=h.syncProgress();
  h.state.user=null;h.clearPersonalProgress();
  gate.reject(Error('old private D1 failure'));await pending;
  assert.equal(h.state.progressSyncStatus,null);
});

test('valid current receipts still update the canonical cache and retain partial-history warnings',async()=>{
  for(const partial of [false,true]){
    const h=harness(async(action,method)=>action==='reading'&&!method?validReading:
      action==='progress'?{...validProgress,...(partial?{warning:'partial_progress_history'}:{})}:{ok:true});
    await h.syncProgress();
    assert.equal(h.state.missionProgress.index,2);
    assert.equal(h.state.progressSyncStatus,partial?'partial':null);
    assert.equal(JSON.parse(h.disk.get('sa.readingHistory')).length,1);
  }
});

test('malformed current receipt keeps last private cache and honest unavailable warning',async()=>{
  const h=harness(async(action)=>action==='reading'?{reading:null}:validProgress);
  await h.syncProgress();
  assert.equal(h.writes.length,0);
  assert.equal(h.state.missionProgress.index,9);
  assert.equal(h.state.progressSyncStatus,'unavailable');
});
