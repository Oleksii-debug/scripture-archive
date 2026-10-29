import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const begin=app.indexOf('async function syncProgress() {');
const end=app.indexOf('\nfunction clearPersonalProgress()',begin);
assert.ok(begin>=0 && end>begin,'run canonical progress sync source');
const source=app.slice(begin,end);

async function execute({reading={reading:[]},progress={progress:{index:1,correct:['T1'],complete:false}},fail='',local=[]}={}){
 const memory = new Map([['sa.readingHistory',JSON.stringify(local)],['sa.mission.OTAB01',JSON.stringify({index:8,correct:['T0'],complete:false})]]);
 const state={user:{id:'a'},missionProgress:{index:8,correct:['T0'],complete:false},progressSyncStatus:null};
 const calls=[];
 const ctx={state,Map,JSON,Number,Error,localStorage:{setItem:(k,v)=>memory.set(k,v)},loadJSON:(k,d)=>JSON.parse(memory.get(k)??JSON.stringify(d)),accountRequest:async(action,method)=>{
   calls.push([action,method]);
   if(action===fail)throw Error('private D1 read failed');
   if(action==='reading')return method==='PUT'?{ok:true}:reading;
   if(action==='progress')return progress;
   throw Error('unknown call');
 }};
 const fn=vm.runInNewContext(source+'\n({syncProgress})',ctx).syncProgress;
 await fn();return {state,memory,calls};
}

test('missing or malformed reading array fails closed and preserves prior local history and progress',async()=>{
 for(const reading of [{}, {reading:null}, {reading:'no'}, {reading:{}}]){
   const r=await execute({reading,local:[{book:'GEN',chapter:12,title:'Genesis'}]});
   assert.equal(r.state.progressSyncStatus,'unavailable');
   assert.equal(r.state.missionProgress.index,8);
   assert.deepEqual(JSON.parse(r.memory.get('sa.readingHistory')),[{book:'GEN',chapter:12,title:'Genesis'}]);
   assert.equal(r.calls.length,1);
 }
});

test('private progress read failure or malformed success never commits a premature reading cache',async()=>{
 const defaults={reading:{reading:[{book:'JHN',chapter:3,title:'John'}]}};
 for(const opts of [
   {...defaults,fail:'progress'},
   {...defaults,progress:{}},
   {...defaults,progress:{progress:{index:0,correct:null,complete:false}}},
   {...defaults,progress:{progress:{index:-1,correct:[],complete:false}}},
   {...defaults,progress:{progress:{index:0,correct:[],complete:'yes'}}},
 ]){
   const r=await execute(opts);
   assert.equal(r.state.progressSyncStatus,'unavailable');
   assert.equal(r.state.missionProgress.index,8);
   assert.deepEqual(JSON.parse(r.memory.get('sa.readingHistory')),[]);
   assert.equal(JSON.parse(r.memory.get('sa.mission.OTAB01')).index,8);
 }
});

test('fully successful sync saves both receipts and retains partial warning evidence',async()=>{
 const options={reading:{reading:[{book:'JHN',chapter:3,title:'John'}]},local:[{book:'GEN',chapter:12,title:'Genesis'}]};
 for(const warning of [undefined,'partial_progress_history']){
   const r=await execute({...options,progress:{progress:{index:2,correct:['T1'],complete:false},warning}});
   assert.equal(r.state.progressSyncStatus,warning?'partial':null);
   assert.deepEqual(JSON.parse(r.memory.get('sa.readingHistory')).map(x=>x.book),['JHN','GEN']);
   assert.equal(r.state.missionProgress.index,2);
   assert.equal(JSON.parse(r.memory.get('sa.mission.OTAB01')).index,2);
 }
});

test('nonexistent D1 reading query cannot be represented as confirmed empty',async()=>{
 const r=await execute({fail:'reading'});
 assert.equal(r.state.progressSyncStatus,'unavailable');
 assert.equal(r.calls.length,1);
});
