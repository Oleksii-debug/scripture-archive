import test from 'node:test';
import assert from 'node:assert/strict';
import {attachAcademy,academyProgressKey} from '../public/scripture-academy.js';
function mount(action,{move=false,stale=false,fail=false,initialFocus=true}={}){
  const body={},elsewhere={},doc={body,activeElement:null},key=academyProgressKey({id:'alice'});
  let active=true,handler,release,focusCount=0;
  const values=new Map([[key,JSON.stringify({version:1,completed:['abraham']})]]);
  const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
  const button={isConnected:true,_disabled:false,addEventListener(_name,fn){handler=fn},focus(opts){assert.deepEqual(opts,{preventScroll:true});focusCount++;doc.activeElement=button;}};
  Object.defineProperty(button,'disabled',{get(){return this._disabled},set(v){this._disabled=v;if(v&&doc.activeElement===button)doc.activeElement=body}});
  const fileContent=JSON.stringify({format:'scripture-archive-academy-markers',version:1,completed:['david']});
  const input={files:[{size:fileContent.length,text:async()=>fileContent}],value:'chosen'},confirm={checked:true},status={textContent:''};
  const elements=action==='import'?{'#academy-import':button,'#academy-import-file':input,'#academy-import-status':status}:{'#academy-reset':button,'#academy-reset-confirm':confirm,'#academy-reset-status':status};
  const root={querySelector:s=>elements[s]||null,querySelectorAll:()=>[]};doc.querySelector=()=>root;
  const locks={request:async(_name,_options,fn)=>{await new Promise(resolve=>{release=resolve});if(fail)throw Error('lock rejected');return fn()}};
  attachAcademy(doc,storage,'en',{id:'alice'},{available:true,completed:['abraham']},()=>active,locks,null);
  doc.activeElement=initialFocus?button:elsewhere;
  return {doc,button,body,elsewhere,status,get focusCount(){return focusCount},async run(){const result=handler();await new Promise(resolve=>setImmediate(resolve));assert.ok(release);if(move)doc.activeElement=elsewhere;if(stale)active=false;release();await result;await new Promise(resolve=>setImmediate(resolve));}};
}
for(const action of ['import','reset']){
  test(`${action}: focus returns after an asynchronous success or failure`,async()=>{
    for(const fail of [false,true]){const f=mount(action,{fail});await f.run();assert.equal(f.button.disabled,false);assert.equal(f.focusCount,1);assert.equal(f.doc.activeElement,f.button);}
  });
  test(`${action}: focus is not stolen after user movement or route change`,async()=>{
    for(const options of [{move:true},{stale:true},{initialFocus:false}]){const f=mount(action,options);await f.run();assert.equal(f.focusCount,0);}
  });
}
