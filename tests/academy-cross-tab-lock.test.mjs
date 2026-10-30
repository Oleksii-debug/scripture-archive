import assert from 'node:assert/strict';
import test from 'node:test';
import {attachAcademy,academyProgressKey,readAcademyProgress} from '../public/scripture-academy.js';
const progress={available:true,completed:[]};
const store=()=>{const items=new Map();return {items,getItem:key=>items.get(key)??null,setItem:(key,value)=>items.set(key,value)};};
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function panel(user,storage,lockManager,isCurrent=()=>true){
 const buttons=['abraham','sarah','joseph'].map(id=>({
   attrs:{'data-academy-lesson':id,'aria-pressed':'false'},textContent:'',
   getAttribute(name){return this.attrs[name];},
   setAttribute(name,value){this.attrs[name]=value;},
   addEventListener(name,listener){assert.equal(name,'click');this.click=listener;}
 }));
 const els=new Map(['#academy-reading-status','#academy-reading-progress','#academy-reading-badge','#academy-reading-error'].map(name=>[name,{textContent:'',value:0}]));
 const root={querySelectorAll:()=>buttons,querySelector:name=>els.get(name)};
 const doc={querySelector:name=>name==='[data-academy-root]'?root:null};
 attachAcademy(doc,storage,'en',user,progress,isCurrent,lockManager);
 return {buttons,els,doc,root};
}
function serialLocks(){
 const tails=new Map(),names=[];
 return {names,request(name,options,callback){
   assert.equal(options.mode,'exclusive');names.push(name);
   const prior=tails.get(name)||Promise.resolve();
   let release;const gate=new Promise(resolve=>{release=resolve;});
   tails.set(name,gate);
   return prior.then(async()=>{try{return await callback({name,mode:'exclusive'});}
     finally{release();if(tails.get(name)===gate)tails.delete(name);}});
 }};
}
test('two simultaneous distinct lesson marks are serialized by one same-origin lock',async()=>{
 const storage=store(),locks=serialLocks(),user={id:'alice'};
 const a=panel(user,storage,locks),b=panel(user,storage,locks);
 a.buttons[0].click();b.buttons[1].click();await flush();
 assert.deepEqual(readAcademyProgress(storage,academyProgressKey(user)).completed,['abraham','sarah']);
 assert.deepEqual(locks.names,Array(2).fill('sa-academy-progress:'+academyProgressKey(user)));
 assert.equal(b.buttons[0].attrs['aria-pressed'],'true');
});
test('mixed mark and unmark preserves unrelated lesson progress',async()=>{
 const storage=store(),locks=serialLocks(),user={id:'alice'};
 const a=panel(user,storage,locks),b=panel(user,storage,locks);
 a.buttons[0].click();b.buttons[1].click();await flush();
 a.buttons[0].click();await flush();
 assert.deepEqual(readAcademyProgress(storage,academyProgressKey(user)).completed,['sarah']);
});
test('stale displayed mark does not remove another tab’s newer mark',async()=>{
 const storage=store(),locks=serialLocks(),user={id:'alice'};
 const a=panel(user,storage,locks),b=panel(user,storage,locks);
 a.buttons[0].click();await flush();b.buttons[0].click();await flush();
 assert.deepEqual(readAcademyProgress(storage,academyProgressKey(user)).completed,['abraham']);
});
test('principal switch while waiting for lock cannot write previous account',()=>{
 const storage=store(),user={id:'alice'},key=academyProgressKey(user);
 let invoke;const deferred={request(_name,_options,callback){invoke=callback;return Promise.resolve();}};
 let active=true;const p=panel(user,storage,deferred,()=>active);
 p.buttons[0].click();active=false;invoke();
 assert.equal(storage.getItem(key),null);
});
test('route replacement while waiting for lock cannot write previous page',()=>{
 const storage=store(),user={id:'alice'},key=academyProgressKey(user);
 let invoke;const deferred={request(_name,_options,callback){invoke=callback;return Promise.resolve();}};
 const p=panel(user,storage,deferred);
 p.buttons[0].click();p.doc.querySelector=()=>null;invoke();
 assert.equal(storage.getItem(key),null);
});
test('unsupported browser lock API refuses write and explains why',()=>{
 const storage=store(),user={id:'alice'},p=panel(user,storage,{});
 p.buttons[0].click();
 assert.equal(storage.getItem(academyProgressKey(user)),null);
 assert.match(p.els.get('#academy-reading-error').textContent,/cross-tab saving is unavailable/);
 assert.equal(p.buttons[0].attrs['aria-pressed'],'false');
});
test('rejected or thrown lock admission cannot mutate storage',async()=>{
 for(const locks of [{request(){throw Error('denied');}},{request(){return Promise.reject(Error('denied'));}}]){
   const storage=store(),user={id:'alice'},p=panel(user,storage,locks);
   p.buttons[0].click();await flush();
   assert.equal(storage.getItem(academyProgressKey(user)),null);
   assert.match(p.els.get('#academy-reading-error').textContent,/cross-tab saving is unavailable/);
 }
});
test('corrupt legacy progress introduced while lock is pending stays untouched',()=>{
 const storage=store(),user={id:'alice'},key=academyProgressKey(user);
 let invoke;const locks={request(_name,_options,callback){invoke=callback;return Promise.resolve();}};
 const p=panel(user,storage,locks);
 p.buttons[0].click();storage.setItem(key,'{broken');invoke();
 assert.equal(storage.getItem(key),'{broken');
 assert.match(p.els.get('#academy-reading-error').textContent,/could not be read or verified/);
});
test('legacy v1 progress survives new lesson marked under lock',async()=>{
 const storage=store(),locks=serialLocks(),user={id:'alice'},key=academyProgressKey(user);
 storage.setItem(key,JSON.stringify({version:1,completed:['joseph']}));
 panel(user,storage,locks).buttons[0].click();await flush();
 assert.deepEqual(readAcademyProgress(storage,key).completed,['abraham','joseph']);
});
test('different principals receive separate lock namespaces',async()=>{
 const storage=store(),locks=serialLocks(),alice={id:'alice'},bob={id:'bob'};
 panel(alice,storage,locks).buttons[0].click();
 panel(bob,storage,locks).buttons[1].click();await flush();
 assert.notEqual(locks.names[0],locks.names[1]);
 assert.deepEqual(readAcademyProgress(storage,academyProgressKey(alice)).completed,['abraham']);
 assert.deepEqual(readAcademyProgress(storage,academyProgressKey(bob)).completed,['sarah']);
});