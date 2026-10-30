import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {academyMarkup,academyProgressKey,attachAcademy} from '../public/scripture-academy.js';
const catalog=JSON.parse(readFileSync(new URL('../public/data/catalog.json',import.meta.url),'utf8'));
const esc=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const payload=completed=>JSON.stringify({format:'scripture-archive-academy-markers',version:1,completed});
function mount({raw=payload(['david']),current=()=>true,lock=async(_key,_opts,fn)=>fn(),corrupt=false,ignore=false}={}) {
  const alice=academyProgressKey({id:'alice'}),bob=academyProgressKey({id:'bob'});
  const values=new Map([[alice,corrupt?'{broken':JSON.stringify({version:1,completed:['abraham']})],[bob,JSON.stringify({version:1,completed:['sarah']})]]);
  const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>{if(!ignore)values.set(key,value)}};
  const file={size:raw.length,text:async()=>raw}, input={files:[file],value:'chosen'}, status={textContent:''};
  let handler;const button={disabled:false,addEventListener(_event,fn){handler=fn;}};
  const meter={value:1},summary={textContent:''},badge={textContent:''};
  const lesson={attrs:{'data-academy-lesson':'david','aria-pressed':'false'},getAttribute(n){return this.attrs[n]},setAttribute(n,v){this.attrs[n]=v},addEventListener(){}};
  const root={querySelector:sel=>({'#academy-import':button,'#academy-import-file':input,'#academy-import-status':status,'#academy-reading-progress':meter,'#academy-reading-status':summary,'#academy-reading-badge':badge}[sel]||null),querySelectorAll:()=>[lesson]};
  const doc={querySelector:()=>root};
  attachAcademy(doc,storage,'en',{id:'alice'},{available:true,completed:['abraham']},current,lock?{request:lock}:null,null);
  return {input,status,values,alice,bob,meter,summary,lesson,click:()=>handler()};
}
test('validated import adds markers to latest current-account progress under lock',async()=>{
  let lockName;const f=mount({lock:async(name,opts,fn)=>{lockName=name;assert.equal(opts.mode,'exclusive');return fn();}});
  await f.click();assert.equal(lockName,'sa-academy-progress:'+f.alice);
  assert.deepEqual(JSON.parse(f.values.get(f.alice)),{version:1,completed:['abraham','david']});
  assert.deepEqual(JSON.parse(f.values.get(f.bob)),{version:1,completed:['sarah']});
  assert.equal(f.meter.value,2);assert.equal(f.lesson.attrs['aria-pressed'],'true');assert.match(f.status.textContent,/were added/);
});
test('invalid, duplicated, oversized, or foreign data cannot overwrite markers',async()=>{
  for(const raw of ['bad',payload(['david','david']),payload(['unknown']),JSON.stringify({format:'scripture-archive-academy-markers',version:1,completed:[],extra:'x'}),'x'.repeat(4097)]){
    const f=mount({raw});const original=f.values.get(f.alice);await f.click();assert.equal(f.values.get(f.alice),original);assert.match(f.status.textContent,/invalid/);
  }
});
test('unavailable storage, unconfirmed writes and unavailable lock do not claim success',async()=>{
  for(const opts of [{corrupt:true},{ignore:true},{lock:null}]){const f=mount(opts);const before=f.values.get(f.alice);await f.click();assert.equal(f.values.get(f.alice),before);assert.doesNotMatch(f.status.textContent,/were added/);}
});
test('principal change while waiting for lock retires the import',async()=>{
  let active=true,release;const lock=async(_n,_o,fn)=>{await new Promise(resolve=>release=resolve);return fn()};
  const f=mount({current:()=>active,lock});const before=f.values.get(f.alice);const pending=f.click();
  await new Promise(resolve=>setImmediate(resolve));active=false;release();await pending;assert.equal(f.values.get(f.alice),before);assert.equal(f.status.textContent,'');
});
test('import controls are accessible and absent for unreadable local storage',()=>{
  for(const lang of ['uk','ru','en']){const html=academyMarkup(catalog,lang,esc,{available:true,completed:[]});assert.match(html,/for="academy-import-file"/);assert.match(html,/id="academy-import-status" role="status"/);assert.doesNotMatch(academyMarkup(catalog,lang,esc,{available:false,completed:[]}),/id="academy-import"/);}
});
