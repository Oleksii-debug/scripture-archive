import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {
  academyAllLessonIds,
  academyLessonIds,
  academyMarkup,
  academyPlaceLessonIds,
  academyProgressKey,
  attachAcademy,
  readAcademyProgress,
} from '../public/scripture-academy.js';
import {scriptureDossiers} from '../public/scripture-dossiers.js';

const catalog=JSON.parse(readFileSync(new URL('../public/data/catalog.json',import.meta.url),'utf8'));
const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');

test('Academy exposes a distinct non-chronological source-linked place track',()=>{
  for(const lang of ['uk','ru','en']){
    const foundationDone={available:true,completed:[...academyLessonIds]};
    const html=academyMarkup(catalog,lang,esc,foundationDone);
    assert.match(html,/class="academy-place-track"/);
    assert.match(html,/id="academy-place-progress" max="6" value="0"/);
    assert.match(html,/id="academy-reading-progress" max="7" value="7"/);
    assert.doesNotMatch(html,/id="academy-place-badge" role="status">[^<]+</);
    for(const [index,id] of academyPlaceLessonIds.entries()){
      const dossier=scriptureDossiers.find(item=>item.id===id);
      assert.equal(dossier?.type,'place');
      const start=html.indexOf('<h4 id="academy-lesson-'+id+'" tabindex="-1">'+(index+1)+'. ');
      const end=html.indexOf('</article>',start);
      assert.ok(start>=0&&end>start,lang+' '+id+' is an independently navigable lesson');
      const article=html.slice(start,end);
      assert.ok(article.includes('href="/dossiers?id='+id+'"'));
      for(const source of dossier.sources){
        assert.ok(article.includes('href="/reader/'+source.book+'/'+source.chapter+'?verse='+source.first+'"'));
      }
      for(const prompt of dossier.prompts[lang])assert.ok(article.includes(esc(prompt)));
    }
  }
  assert.match(academyMarkup(catalog,'en',esc,{available:true,completed:[]}),/not a historical chronology or a claim about modern locations/);
});

test('existing v1 marker records preserve both original and place lessons in canonical order',()=>{
  const key=academyProgressKey({id:'alice'}),values=new Map([[key,JSON.stringify({
    version:1,completed:['galilee','abraham','jerusalem'],
  })]]);
  const storage={getItem:name=>values.get(name)??null};
  assert.deepEqual(readAcademyProgress(storage,key),{
    available:true,completed:['abraham','jerusalem','galilee'],
  });
  assert.equal(academyAllLessonIds.length,13);
});

test('marking the final place study updates only its separate honest completion badge',()=>{
  const user={id:'alice'},key=academyProgressKey(user);
  const before=[...academyLessonIds,...academyPlaceLessonIds.slice(0,-1)];
  const values=new Map([[key,JSON.stringify({version:1,completed:before})]]);
  const storage={getItem:name=>values.get(name)??null,setItem:(name,value)=>values.set(name,value)};
  const attrs={'data-academy-lesson':'galilee','aria-pressed':'false'};
  let click;
  const placeButton={
    getAttribute:name=>attrs[name],setAttribute:(name,value)=>attrs[name]=value,
    addEventListener(_event,handler){click=handler;},textContent:'Mark studied',
  };
  const foundationMeter={value:7},foundationStatus={textContent:'Studied: 7/7'},foundationBadge={textContent:'foundation complete'};
  const placeMeter={value:5},placeStatus={textContent:'Studied: 5/6'},placeBadge={textContent:''},error={textContent:''};
  const nodes={
    '#academy-reading-progress':foundationMeter,'#academy-reading-status':foundationStatus,
    '#academy-reading-badge':foundationBadge,'#academy-place-progress':placeMeter,
    '#academy-place-status':placeStatus,'#academy-place-badge':placeBadge,
    '#academy-reading-error':error,
  };
  const root={querySelector:selector=>nodes[selector]??null,querySelectorAll:()=>[placeButton]};
  const document={querySelector:selector=>selector==='[data-academy-root]'?root:null};
  attachAcademy(document,storage,'en',user,{available:true,completed:before});
  click();
  assert.deepEqual(readAcademyProgress(storage,key).completed,academyAllLessonIds);
  assert.equal(foundationMeter.value,7);
  assert.equal(foundationStatus.textContent,'Studied: 7/7');
  assert.equal(placeMeter.value,6);
  assert.equal(placeStatus.textContent,'Studied: 6/6');
  assert.match(placeBadge.textContent,/no certificate/);
  assert.equal(attrs['aria-pressed'],'true');
  assert.equal(error.textContent,'');
});

test('place-track resume uses fresh current-principal markers and focuses the next place',()=>{
  const user={id:'alice'},key=academyProgressKey(user);
  const storage={getItem:name=>name===key?JSON.stringify({version:1,completed:['jerusalem']}):null};
  let click,focused='';
  const resume={addEventListener(_event,handler){click=handler;}};
  const status={textContent:''};
  const root={
    querySelector(selector){
      if(selector==='#academy-place-resume')return resume;
      if(selector==='#academy-place-resume-status')return status;
      if(selector==='#academy-lesson-bethlehem')return {focus(){focused=selector;}};
      return null;
    },
    querySelectorAll(){return [];},
  };
  const document={querySelector:selector=>selector==='[data-academy-root]'?root:null};
  attachAcademy(document,storage,'en',user,{available:true,completed:['jerusalem']});
  click();
  assert.equal(focused,'#academy-lesson-bethlehem');
  assert.equal(status.textContent,'');
});
