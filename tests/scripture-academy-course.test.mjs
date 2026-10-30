import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { academyLessonIds,academyProgressKey,readAcademyProgress,academyMarkup,attachAcademy } from '../public/scripture-academy.js';
import { scriptureDossiers } from '../public/scripture-dossiers.js';

const catalog=JSON.parse(readFileSync(new URL('../public/data/catalog.json',import.meta.url),'utf8'));
const workspace=readFileSync(new URL('../public/workspace.js',import.meta.url),'utf8');
const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const store=()=>{const values=new Map();return {values,getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};};

test('the real campaigns route opens a canonical, trilingual and source-validated academy course',()=>{
  assert.equal(academyLessonIds.length,7);
  assert.equal(new Set(academyLessonIds).size,7);
  assert.ok(workspace.includes("from './scripture-academy.js'"));
  assert.ok(workspace.includes('academyMarkup(catalog,state.lang,esc,courseProgress)'));
  assert.ok(workspace.includes('attachAcademy(globalThis.document,storage,state.lang,state.user,courseProgress)'));
  for(const lang of ['uk','ru','en']){
    const html=academyMarkup(catalog,lang,esc,{available:true,completed:[]});
    assert.ok(html.includes('data-academy-root'));
    assert.ok(html.includes('role="status"'));
    assert.ok(html.includes('role="alert"'));
    assert.ok(html.includes('<progress '));
    assert.equal((html.match(/data-academy-lesson=/g)||[]).length,7);
    assert.equal((html.match(/aria-pressed="false"/g)||[]).length,7);
    assert.ok(html.includes('aria-live="polite"'));
    assert.ok(!html.includes('onclick=')&&!html.includes('href="http://'));
    for(const id of academyLessonIds){
      const dossier=scriptureDossiers.find(x=>x.id===id);
      assert.ok(dossier,'academy uses a real existing dossier');
      assert.ok(html.includes(esc(dossier.names[lang])));
      assert.ok(html.includes('href="/dossiers?id='+id+'"'));
      for(const ref of dossier.sources){
        assert.ok(html.includes('href="/reader/'+ref.book+'/'+ref.chapter+'?verse='+ref.first+'"'),
          'every lesson points to verified exact Scripture verse');
      }
    }
  }
  assert.match(academyMarkup(catalog,'en',esc,{available:true,completed:[]}),/not a graded exam/);
});

test('per-principal markers are validated, deduplicated and recover without sharing other accounts',()=>{
  const storage=store();
  const alice=academyProgressKey({id:'alice'}),bob=academyProgressKey({id:'bob'});
  assert.notEqual(alice,bob);
  assert.notEqual(alice,academyProgressKey(null));
  assert.equal(readAcademyProgress(storage,alice).available,true);
  storage.setItem(alice,JSON.stringify({version:1,completed:['joseph','abraham']}));
  assert.deepEqual(readAcademyProgress(storage,alice).completed,['abraham','joseph']);
  assert.deepEqual(readAcademyProgress(storage,bob).completed,[]);
  for(const bad of [
    '{bad-json','null','{}',
    JSON.stringify({version:2,completed:[]}),
    JSON.stringify({version:1,completed:['unsupported']}),
    JSON.stringify({version:1,completed:['abraham','abraham']}),
  ]){
    storage.setItem(alice,bad);
    assert.equal(readAcademyProgress(storage,alice).available,false,'do not overwrite uncertain saved data');
    assert.match(academyMarkup(catalog,'uk',esc,readAcademyProgress(storage,alice)),/role="alert"/);
    assert.ok(!academyMarkup(catalog,'uk',esc,readAcademyProgress(storage,alice)).includes('data-academy-lesson='));
  }
});

function view(){
  const buttons=academyLessonIds.map(id=>({
    id,attrs:{'data-academy-lesson':id,'aria-pressed':'false'},textContent:'',
    getAttribute(k){return this.attrs[k];},setAttribute(k,v){this.attrs[k]=v;},
    addEventListener(event,callback){assert.equal(event,'click');this.click=callback;},
  }));
  const status={textContent:''},badge={textContent:''},error={textContent:''},meter={value:0};
  const elements={
    '#academy-reading-status':status,
    '#academy-reading-badge':badge,
    '#academy-reading-error':error,
    '#academy-reading-progress':meter,
  };
  const root={querySelectorAll:()=>buttons,querySelector:s=>elements[s]};
  return {document:{querySelector:s=>s==='[data-academy-root]'?root:null},
    buttons,status,badge,error,meter};
}
test('keyboard-native lesson buttons persist honest self-marked progress and final non-accredited badge',()=>{
  const storage=store(),ui=view(),user={id:'alice'};
  attachAcademy(ui.document,storage,'en',user,{available:true,completed:[]});
  for(let i=0;i<academyLessonIds.length;i++){
    ui.buttons[i].click();
    const stored=JSON.parse(storage.getItem(academyProgressKey(user)));
    assert.equal(stored.version,1);
    assert.equal(stored.completed.length,i+1);
    assert.equal(ui.buttons[i].attrs['aria-pressed'],'true');
    assert.equal(ui.meter.value,i+1);
    assert.equal(ui.status.textContent,'Studied: '+(i+1)+'/7');
  }
  assert.match(ui.badge.textContent,/no certificate/);
  ui.buttons[0].click();
  assert.equal(ui.buttons[0].attrs['aria-pressed'],'false');
  assert.equal(ui.meter.value,6);
  assert.equal(ui.badge.textContent,'');
  assert.equal(readAcademyProgress(storage,academyProgressKey(user)).completed.length,6);
});

test('storage failure leaves the previous confirmed state and badge untouched, and announces the error',()=>{
  const storage={getItem:()=>null,setItem:()=>{throw Error('quota or forbidden storage')}};
  const ui=view(),progress={available:true,completed:[]};
  attachAcademy(ui.document,storage,'uk',null,progress);
  ui.buttons[0].click();
  assert.equal(ui.buttons[0].attrs['aria-pressed'],'false');
  assert.equal(ui.meter.value,0);
  assert.equal(ui.badge.textContent,'');
  assert.match(ui.error.textContent,/Не вдалося зберегти позначку/);
});

test('source catalog failures never display a claimed course or locally confirmed completion',()=>{
  const broken=structuredClone(catalog);broken.books.en[0].chapters=0;
  const html=academyMarkup(broken,'en',esc,{available:true,completed:academyLessonIds.slice()});
  assert.match(html,/role="alert"/);
  assert.ok(!html.includes('data-academy-lesson='));
  assert.ok(!html.includes('href="/reader/'));
});
