import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {academyLessonIds, academyMarkup, attachAcademy, readAcademyProgress, academyProgressKey} from '../public/scripture-academy.js';

const catalog=JSON.parse(readFileSync(new URL('../public/data/catalog.json',import.meta.url),'utf8'));
const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');

test('denied localStorage keeps all seven genuine source-linked lessons readable in every locale',()=>{
  const denied={getItem(){throw new DOMException('blocked','SecurityError')},setItem(){throw Error('should not write')}};
  for(const lang of ['uk','ru','en']){
    const progress=readAcademyProgress(denied,academyProgressKey({id:'alice'}));
    assert.deepEqual(progress,{available:false,completed:[]});
    const html=academyMarkup(catalog,lang,esc,progress);
    assert.match(html,/data-academy-root/);
    assert.match(html,/role="alert"/);
    assert.equal((html.match(/<article class="card">/g)||[]).length,7);
    assert.equal((html.match(/href="\/reader\//g)||[]).length>0,true);
    for(const id of academyLessonIds)assert.ok(html.includes('href="/dossiers?id='+id+'"'));
    assert.doesNotMatch(html,/data-academy-lesson=|aria-pressed=|<progress |academy-reading-badge/);
  }
});

test('corrupted private progress never leaks prior account marks into read-only Academy',()=>{
  const storage={getItem(){return JSON.stringify({version:1,completed:['abraham','invented']})},setItem(){throw Error('write forbidden')}};
  const progress=readAcademyProgress(storage,academyProgressKey({id:'alice'}));
  assert.equal(progress.available,false);
  const html=academyMarkup(catalog,'en',esc,progress);
  assert.match(html,/href="\/reader\/GEN\/12\?verse=/);
  assert.doesNotMatch(html,/aria-pressed="true"|Personal reading path completed|data-academy-lesson=/);
  const missingPrincipal=readAcademyProgress(storage,null);
  assert.equal(missingPrincipal.available,false);
  assert.doesNotMatch(academyMarkup(catalog,'en',esc,missingPrincipal),/data-academy-lesson=/);
});

test('unavailable progress never mounts action handlers or writes',()=>{
  let called=0;
  const root={querySelectorAll(){called++;return []}};
  const doc={querySelector(){called++;return root}};
  const storage={setItem(){throw Error('unexpected write')}};
  attachAcademy(doc,storage,'uk',{id:'alice'},{available:false,completed:[]});
  assert.equal(called,0);
});

test('invalid source catalog remains fail-closed even when storage is unavailable',()=>{
  const bad=structuredClone(catalog);
  bad.books.en[0].chapters=0;
  const html=academyMarkup(bad,'en',esc,{available:false,completed:[]});
  assert.match(html,/role="alert"/);
  assert.doesNotMatch(html,/data-academy-root|href="\/reader\//);
});

test('normal stored progress retains all seven genuine completion controls',()=>{
  const html=academyMarkup(catalog,'uk',esc,{available:true,completed:['abraham']});
  assert.equal((html.match(/data-academy-lesson=/g)||[]).length,7);
  assert.match(html,/aria-pressed="true"/);
  assert.match(html,/<progress id="academy-reading-progress"/);
});
