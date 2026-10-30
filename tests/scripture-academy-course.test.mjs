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
  assert.ok(workspace.includes('attachAcademy(globalThis.document,storage,state.lang,state.user,courseProgress,'), 'Academy must mount a current-principal callback');
  assert.ok(workspace.includes('!state.sessionUnavailable'), 'current session must gate Academy writes');
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


test('simultaneous same-account academy views preserve newer lesson selections',()=>{
  const storage=store(), user={id:'two-tab-account'}, key=academyProgressKey(user);
  const first=view(),second=view(),start={available:true,completed:[]};
  attachAcademy(first.document,storage,'en',user,start);
  attachAcademy(second.document,storage,'en',user,start);
  first.buttons[0].click(); // Abraham in one tab
  second.buttons[1].click(); // Sarah in the other tab
  assert.deepEqual(readAcademyProgress(storage,key).completed,['abraham','sarah'],
    'a stale panel must not erase another tab\'s saved mark');
  assert.equal(second.buttons[0].attrs['aria-pressed'],'true',
    'the active panel must reflect the freshly loaded saved selection');
  first.buttons[0].click();
  assert.deepEqual(readAcademyProgress(storage,key).completed,['sarah'],
    'removing one mark preserves marks introduced by the other tab');
  assert.equal(first.buttons[1].attrs['aria-pressed'],'true');
});

test('stale same-lesson controls perform the action they display',()=>{
  const storage=store(),user={id:'same-lesson'},key=academyProgressKey(user);
  const first=view(),second=view(),start={available:true,completed:[]};
  attachAcademy(first.document,storage,'en',user,start);
  attachAcademy(second.document,storage,'en',user,start);
  first.buttons[0].click();
  second.buttons[0].click(); // still displays mark; must not remove the mark
  assert.deepEqual(readAcademyProgress(storage,key).completed,['abraham']);
  first.buttons[0].click(); // first still displays unmark
  second.buttons[0].click(); // also displays unmark; must not mark it again
  assert.deepEqual(readAcademyProgress(storage,key).completed,[]);
});

test('academy never overwrites progress corrupted by another tab after rendering',()=>{
  const storage=store(),user={id:'test-account'},key=academyProgressKey(user),ui=view();
  attachAcademy(ui.document,storage,'en',user,{available:true,completed:[]});
  storage.setItem(key,'{bad-json');
  ui.buttons[0].click();
  assert.equal(storage.getItem(key),'{bad-json');
  assert.equal(ui.buttons[0].attrs['aria-pressed'],'false');
  assert.match(ui.error.textContent,/could not be read or verified/);
});

test('academy controls cannot mutate an old account after a principal switch or session outage',()=>{
  const storage=store(),ui=view(),owner={id:'alice'},
    context={user:owner,sessionUnavailable:false},
    key=academyProgressKey(owner);
  attachAcademy(ui.document,storage,'en',owner,{available:true,completed:[]},
    ()=>!context.sessionUnavailable&&context.user?.id===owner.id);
  context.user={id:'bob'};
  ui.buttons[0].click();
  assert.equal(storage.getItem(key),null,'old account must not acquire new progress');
  context.user=owner;context.sessionUnavailable=true;
  ui.buttons[0].click();
  assert.equal(storage.getItem(key),null,'uncertain session must not write');
  context.sessionUnavailable=false;
  ui.buttons[0].click();
  assert.deepEqual(readAcademyProgress(storage,key).completed,['abraham'],
    'the same verified principal can still save progress');
});

test('academy callbacks from a replaced route must not update device progress',()=>{
  const storage=store(),ui=view(),user={id:'alice'},key=academyProgressKey(user);
  const original=ui.document.querySelector;
  attachAcademy(ui.document,storage,'en',user,{available:true,completed:[]});
  ui.document.querySelector=()=>null;
  ui.buttons[0].click();
  assert.equal(storage.getItem(key),null,'detached view must not write');
  assert.equal(ui.buttons[0].attrs['aria-pressed'],'false');
  ui.document.querySelector=original;
  ui.buttons[0].click();
  assert.deepEqual(readAcademyProgress(storage,key).completed,['abraham']);
});
