import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {academyMarkup, academyProgressKey, attachAcademy} from '../public/scripture-academy.js';

const catalog=JSON.parse(readFileSync(new URL('../public/data/catalog.json',import.meta.url),'utf8'));
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function storage(initial={}){
  const values=new Map(Object.entries(initial));
  return {values,getItem:k=>values.has(k)?values.get(k):null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
}
function mount(store,{progress={available:true,completed:['abraham']},user={id:'alice'},isCurrent=()=>true,locks={request:async(_name,_opts,cb)=>cb()}}={}){
  const events={};
  const reset={disabled:false,addEventListener:(name,fn)=>events[name]=fn};
  const confirm={checked:false}, output={textContent:''}, unavailable={textContent:'Local markers could not be read. Progress has not been changed.'};
  const lesson={attrs:{'data-academy-lesson':'abraham','aria-pressed':'true'},textContent:'Unmark studied',
    getAttribute(k){return this.attrs[k]},setAttribute(k,v){this.attrs[k]=v},addEventListener(){}};
  const status={textContent:'Studied: 1/7'},meter={value:1},badge={textContent:'badge'},error={textContent:'error'};
  const elements={'#academy-reset':reset,'#academy-reset-confirm':confirm,'#academy-reset-status':output,'#academy-reading-unavailable':unavailable,'#academy-reading-status':status,'#academy-reading-progress':meter,'#academy-reading-badge':badge,'#academy-reading-error':error};
  const root={querySelector:s=>elements[s]??null,querySelectorAll:()=>progress.available?[lesson]:[]};
  const doc={active:true,querySelector:s=>s==='[data-academy-root]'&&doc.active?root:null};
  attachAcademy(doc,store,'en',user,progress,isCurrent,locks);
  return {reset,confirm,output,unavailable,status,meter,badge,error,lesson,doc,click:()=>events.click()};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const alice=academyProgressKey({id:'alice'}),bob=academyProgressKey({id:'bob'}),guest=academyProgressKey(null);
const record=JSON.stringify({version:1,completed:['abraham']});

test('clear is explicitly confirmed, account-scoped, locked, and announces only read-back removal',async()=>{
  const store=storage({[alice]:record,[bob]:record,[guest]:record});
  let requests=0;const locks={request:async(name,opts,fn)=>{requests++;assert.equal(name,'sa-academy-progress:'+alice);assert.deepEqual(opts,{mode:'exclusive'});return fn()}};
  const ui=mount(store,{locks});ui.click();await flush();
  assert.equal(requests,0);assert.equal(store.getItem(alice),record);assert.match(ui.output.textContent,/Confirm removal first/);
  ui.confirm.checked=true;ui.click();await flush();
  assert.equal(requests,1);assert.equal(store.getItem(alice),null);
  assert.equal(store.getItem(bob),record);assert.equal(store.getItem(guest),record);
  assert.equal(ui.lesson.attrs['aria-pressed'],'false');assert.equal(ui.meter.value,0);
  assert.equal(ui.status.textContent,'Studied: 0/7');assert.equal(ui.badge.textContent,'');
  assert.match(ui.output.textContent,/Markers removed/);assert.equal(ui.confirm.checked,false);assert.equal(ui.reset.disabled,false);
});

test('read-only corrupt course can be recovered explicitly without destroying other principals',async()=>{
  const store=storage({[alice]:'{broken',[bob]:record});
  const ui=mount(store,{progress:{available:false,completed:[]}});ui.confirm.checked=true;ui.click();await flush();
  assert.equal(store.getItem(alice),null);assert.equal(store.getItem(bob),record);
  assert.match(ui.output.textContent,/Reload the page/);assert.equal(ui.unavailable.textContent,'');
  for(const lang of ['en','uk','ru']){
    const html=academyMarkup(catalog,lang,esc,{available:false,completed:[]});
    assert.match(html,/<details><summary>/);assert.match(html,/id="academy-reset-confirm"/);
    assert.match(html,/id="academy-reset"/);assert.match(html,/id="academy-reset-status" role="status"/);
    assert.doesNotMatch(html,/data-academy-lesson=/);
  }
});

test('unverified, failed, or silently ignored removal never claims success or resets displayed completion',async()=>{
  for(const mode of ['ignore','throw','read-fails']){
    const store=storage({[alice]:record});const realRemove=store.removeItem;
    if(mode==='ignore')store.removeItem=()=>{};
    if(mode==='throw')store.removeItem=()=>{throw Error('denied')};
    if(mode==='read-fails'){store.removeItem=realRemove;store.getItem=()=>{throw Error('blocked')}}
    const ui=mount(store);ui.confirm.checked=true;ui.click();await flush();
    assert.match(ui.output.textContent,/Could not confirm removal/);
    assert.equal(ui.meter.value,1);assert.equal(ui.lesson.attrs['aria-pressed'],'true');
    assert.equal(ui.confirm.checked,true);
  }
});

test('unavailable lock, invalid principal, detached page or changed principal cannot erase progress',async()=>{
  const store=storage({[alice]:record,[bob]:record,[guest]:record});
  let ui=mount(store,{locks:null});ui.confirm.checked=true;ui.click();await flush();assert.match(ui.output.textContent,/cross-tab saving is unavailable/);
  ui=mount(store,{user:{id:'guest'}});ui.confirm.checked=true;ui.click();await flush();
  assert.equal(store.getItem(guest),record);
  let current=true,held;const locks={request:(_n,_o,fn)=>new Promise(resolve=>{held=()=>resolve(fn())})};
  ui=mount(store,{locks,isCurrent:()=>current});ui.confirm.checked=true;ui.click();current=false;held();await flush();
  assert.equal(store.getItem(alice),record);assert.equal(ui.output.textContent,'');
  current=true;ui=mount(store,{locks});ui.confirm.checked=true;ui.click();ui.doc.active=false;held();await flush();
  assert.equal(store.getItem(alice),record);assert.equal(store.getItem(bob),record);
});

test('account deletion explains the actual per-browser Academy retention',()=>{
  assert.match(app,/Локальні позначки Академії в браузерах не видаляються автоматично/);
  assert.match(app,/Локальные отметки Академии в браузерах не удаляются автоматически/);
  assert.match(app,/Local Academy markers in browsers are not removed automatically/);
});
