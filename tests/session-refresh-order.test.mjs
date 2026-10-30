import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const start=source.indexOf('async function getSession() {'),end=source.indexOf('\nasync function getBook(',start);
assert.ok(start>=0&&end>start);
const segment=source.slice(start,end);
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject};}
function fixture(initial=null){
  const requests=[],values=new Map([['sa.progressOwner','bob'],['sa.readingHistory','[]'],['sa.mission.OTAB01',JSON.stringify({index:0,correct:[],complete:false})]]);
  let wipes=0;
  const state={user:initial,sessionUnavailable:false,progressSyncStatus:null,localReadingStorageUntrusted:false,unownedReadingPendingRecovery:false,missionProgress:{index:0,correct:[],complete:false}};
  const localStorage={getItem:key=>values.has(key)?values.get(key):null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
  const context=vm.createContext({state,localStorage,fetch:()=>{const d=deferred();requests.push(d);return d.promise},
    clearPersonalProgress:()=>{wipes++;values.set('sa.readingHistory','[]');values.delete('sa.progressOwner');return true},forgetActiveAttempt:()=>{}});
  vm.runInContext(segment,context);
  return {state,values,requests,call:()=>context.getSession(),wipes:()=>wipes};
}
const response=user=>({ok:true,json:async()=>({user})});
test('a late older account read cannot replace a newer account or clear its progress',async()=>{
  const h=fixture(),first=h.call(),second=h.call();
  h.requests[1].resolve(response({id:'bob'}));await second;
  h.values.set('sa.readingHistory','[{"book":"GEN","chapter":1}]');
  h.requests[0].resolve(response({id:'alice'}));await first;
  assert.equal(h.state.user.id,'bob');assert.equal(h.values.get('sa.progressOwner'),'bob');
  assert.equal(h.values.get('sa.readingHistory'),'[{"book":"GEN","chapter":1}]');assert.equal(h.wipes(),0);
});
test('a late older failed read cannot sign out a newer confirmed account',async()=>{
  const h=fixture(),first=h.call(),second=h.call();
  h.requests[1].resolve(response({id:'bob'}));await second;
  h.requests[0].reject(Error('network'));await first;
  assert.equal(h.state.user.id,'bob');assert.equal(h.state.sessionUnavailable,false);
});
test('a session read cannot resurrect a principal after another local transition',async()=>{
  const old={id:'alice'},h=fixture(old),pending=h.call();h.state.user=null;
  h.requests[0].resolve(response(old));await pending;
  assert.equal(h.state.user,null);assert.equal(h.values.get('sa.progressOwner'),'bob');assert.equal(h.wipes(),0);
});
test('a failed latest request still reports unavailable instead of assuming sign-out',async()=>{
  const h=fixture({id:'alice'}),pending=h.call();h.requests[0].reject(Error('network'));
  await assert.rejects(pending,/account_unavailable/);assert.equal(h.state.user,null);assert.equal(h.state.sessionUnavailable,true);
});

test('a local null-to-null session reset retires an earlier account read',async()=>{
  const h=fixture(null),pending=h.call();h.state.sessionEpoch=(h.state.sessionEpoch||0)+1;
  h.requests[0].resolve(response({id:'alice'}));await pending;
  assert.equal(h.state.user,null);assert.equal(h.values.get('sa.progressOwner'),'bob');assert.equal(h.wipes(),0);
  assert.match(source,/function clearPersonalProgress\(\) \{[\s\S]*?state\.sessionEpoch=\(state\.sessionEpoch\|\|0\)\+1/);
});
test('late JSON parsing cannot replace the newer confirmed session',async()=>{
  const h=fixture(),first=h.call(),body=deferred();
  h.requests[0].resolve({ok:true,json:()=>body.promise});
  await Promise.resolve();
  const second=h.call();h.requests[1].resolve(response({id:'bob'}));await second;
  body.resolve({user:{id:'alice'}});await first;
  assert.equal(h.state.user.id,'bob');assert.equal(h.wipes(),0);
});
