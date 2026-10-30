import test from 'node:test';
import assert from 'node:assert/strict';
import {attachAcademy,academyProgressKey,academyLessonIds} from '../public/scripture-academy.js';

function setup(){
  const key=academyProgressKey({id:'alice'}),map=new Map(),listeners=new Set(),writes=[];
  const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>{writes.push(k);map.set(k,v)}};
  const events={addEventListener:(type,fn)=>{assert.equal(type,'storage');listeners.add(fn)},removeEventListener:(_type,fn)=>listeners.delete(fn),emit:e=>{for(const fn of [...listeners])fn(e)}};
  const buttons=academyLessonIds.map(id=>({attrs:{'data-academy-lesson':id,'aria-pressed':'false'},textContent:'',getAttribute(k){return this.attrs[k]},setAttribute(k,v){this.attrs[k]=v},addEventListener(){}}));
  const status={textContent:''},meter={value:0},badge={textContent:''},error={textContent:''};
  const nodes={'#academy-reading-status':status,'#academy-reading-progress':meter,'#academy-reading-badge':badge,'#academy-reading-error':error};
  const root={querySelectorAll:()=>buttons,querySelector:s=>nodes[s]??null};
  const document={current:root,querySelector:()=>document.current};
  let active=true;
  const mount=()=>attachAcademy(document,storage,'en',{id:'alice'},{available:true,completed:[]},()=>active,null,events);
  mount();
  return {key,map,listeners,writes,storage,events,buttons,status,meter,badge,error,document,mount,setActive:v=>{active=v}};
}
const record=completed=>JSON.stringify({version:1,completed});
test('another tab updates current lesson buttons, progress, and non-accredited completion',()=>{
  const h=setup();h.map.set(h.key,record(['abraham','sarah']));h.events.emit({key:h.key,storageArea:h.storage});
  assert.equal(h.buttons[0].attrs['aria-pressed'],'true');assert.equal(h.buttons[1].attrs['aria-pressed'],'true');
  assert.equal(h.meter.value,2);assert.equal(h.status.textContent,'Studied: 2/7');assert.deepEqual(h.writes,[]);
  h.map.set(h.key,record(academyLessonIds));h.events.emit({key:h.key,storageArea:h.storage});assert.match(h.badge.textContent,/no certificate/);
  h.map.delete(h.key);h.events.emit({key:h.key,storageArea:h.storage});assert.equal(h.meter.value,0);assert.equal(h.badge.textContent,'');
});
test('other users, other storage and stale views never redraw the current controls',()=>{
  const h=setup();h.map.set(h.key,record(['abraham']));
  h.events.emit({key:academyProgressKey({id:'bob'}),storageArea:h.storage});
  h.events.emit({key:h.key,storageArea:{}});h.setActive(false);h.events.emit({key:h.key,storageArea:h.storage});
  assert.equal(h.meter.value,0);h.setActive(true);h.document.current=null;h.events.emit({key:h.key,storageArea:h.storage});assert.equal(h.meter.value,0);
});
test('corrupt or unreadable updates do not invent empty completion or overwrite storage',()=>{
  const h=setup();h.map.set(h.key,record(['abraham']));h.events.emit({key:h.key,storageArea:h.storage});
  h.map.set(h.key,'{broken');h.events.emit({key:h.key,storageArea:h.storage});
  assert.equal(h.meter.value,1);assert.equal(h.buttons[0].attrs['aria-pressed'],'true');assert.match(h.error.textContent,/Could not read the updated markers/);assert.deepEqual(h.writes,[]);
  h.map.set(h.key,record(['sarah']));h.events.emit({key:h.key,storageArea:h.storage});assert.equal(h.error.textContent,'');assert.equal(h.buttons[1].attrs['aria-pressed'],'true');
});
test('remount replaces the old event listener',()=>{
  const h=setup();assert.equal(h.listeners.size,1);h.mount();assert.equal(h.listeners.size,1);
});
