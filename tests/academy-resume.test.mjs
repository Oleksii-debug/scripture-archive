import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {academyMarkup,academyProgressKey,academyLessonIds,attachAcademy} from '../public/scripture-academy.js';
const catalog=JSON.parse(readFileSync(new URL('../public/data/catalog.json',import.meta.url),'utf8'));
const esc=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function mount({raw=null,current=()=>true,missing=false}={}){
  let handler,focused='';const status={textContent:''},button={addEventListener(_type,fn){handler=fn}};
  const root={querySelector:s=>s==='#academy-resume'?button:s==='#academy-resume-status'?status:s.startsWith('#academy-lesson-')&&!missing?{focus(){focused=s}}:null,querySelectorAll:()=>[]};
  const doc={querySelector:()=>root},storage={getItem:key=>{assert.equal(key,academyProgressKey({id:'alice'}));return raw;}};
  attachAcademy(doc,storage,'en',{id:'alice'},{available:true,completed:[]},current,null,null);
  return {status,click:()=>handler(),setRaw:value=>{raw=value},get focused(){return focused}};
}
test('resume reads fresh current-principal progress and focuses the next lesson heading',()=>{
  const f=mount();f.setRaw(JSON.stringify({version:1,completed:['abraham','sarah']}));f.click();
  assert.equal(f.focused,'#academy-lesson-joseph');assert.equal(f.status.textContent,'');
});
test('completed, invalid and stale states do not direct to an invented lesson',()=>{
  const done=mount({raw:JSON.stringify({version:1,completed:academyLessonIds})});done.click();assert.equal(done.focused,'');assert.match(done.status.textContent,/self-reported/);
  for(const opts of [{raw:'broken'},{missing:true},{current:()=>false}]){const f=mount(opts);f.click();assert.equal(f.focused,'');if(!opts.current)assert.match(f.status.textContent,/Could not/);}
});
test('resume uses labelled native controls and programmatically focusable lesson headings',()=>{
  for(const lang of ['uk','ru','en']){const html=academyMarkup(catalog,lang,esc,{available:true,completed:[]});assert.match(html,/id="academy-resume"/);assert.match(html,/id="academy-resume-status" role="status"/);for(const id of academyLessonIds)assert.ok(html.includes('id="academy-lesson-'+id+'" tabindex="-1"'));assert.doesNotMatch(academyMarkup(catalog,lang,esc,{available:false,completed:[]}),/id="academy-resume"/);}
});
