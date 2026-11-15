import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {
  academyMarkup,
  academyProgressKey,
  academyWitnessLessonIds,
  attachAcademy,
  readAcademyProgress,
} from '../public/scripture-academy.js';
import {scriptureDossiers} from '../public/scripture-dossiers.js';

const catalog=JSON.parse(readFileSync(new URL('../public/data/catalog.json',import.meta.url),'utf8'));
const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');

test('SA-EXT-07 exposes a distinct source-linked study track for four additional biblical people',()=>{
  assert.deepEqual(academyWitnessLessonIds,['ruth','paul','mary-mother','peter']);
  for(const lang of ['uk','ru','en']){
    const html=academyMarkup(catalog,lang,esc,{available:true,completed:[]});
    assert.match(html,/class="academy-witness-track"/);
    assert.match(html,/id="academy-witness-progress" max="4" value="0"/);
    assert.match(html,/id="academy-witness-resume"/);
    for(const [index,id] of academyWitnessLessonIds.entries()){
      const dossier=scriptureDossiers.find(item=>item.id===id);
      assert.equal(dossier?.type,'person');
      const start=html.indexOf('<h4 id="academy-lesson-'+id+'" tabindex="-1">'+(index+1)+'. ');
      const end=html.indexOf('</article>',start);
      assert.ok(start>=0&&end>start,lang+' '+id+' is an independently navigable study');
      const article=html.slice(start,end);
      assert.ok(article.includes('href="/dossiers?id='+id+'"'));
      for(const source of dossier.sources)
        assert.ok(article.includes('href="/reader/'+source.book+'/'+source.chapter+'?verse='+source.first+'"'));
      for(const prompt of dossier.prompts[lang])assert.ok(article.includes(esc(prompt)));
    }
  }
  const english=academyMarkup(catalog,'en',esc,{available:true,completed:[]});
  assert.match(english,/limited to the cited Scripture passages/);
  assert.match(english,/not a ranking or a complete biography/);
});

test('marking the final additional study updates only its honest local completion state',()=>{
  const user={id:'alice'},key=academyProgressKey(user);
  const before=academyWitnessLessonIds.slice(0,-1);
  const values=new Map([[key,JSON.stringify({version:1,completed:before})]]);
  const storage={getItem:name=>values.get(name)??null,setItem:(name,value)=>values.set(name,value)};
  const attrs={'data-academy-lesson':'peter','aria-pressed':'false'};
  let click;
  const button={
    getAttribute:name=>attrs[name],setAttribute:(name,value)=>attrs[name]=value,
    addEventListener(_event,handler){click=handler;},textContent:'Mark studied',
  };
  const witnessMeter={value:3},witnessStatus={textContent:'Studied: 3/4'},witnessBadge={textContent:''};
  const foundationMeter={value:0},placeMeter={value:0},error={textContent:''};
  const nodes={
    '#academy-reading-progress':foundationMeter,'#academy-place-progress':placeMeter,
    '#academy-witness-progress':witnessMeter,'#academy-witness-status':witnessStatus,
    '#academy-witness-badge':witnessBadge,'#academy-reading-error':error,
  };
  const root={querySelector:selector=>nodes[selector]??null,querySelectorAll:()=>[button]};
  const document={querySelector:selector=>selector==='[data-academy-root]'?root:null};
  attachAcademy(document,storage,'en',user,{available:true,completed:before});
  click();
  assert.deepEqual(readAcademyProgress(storage,key).completed,academyWitnessLessonIds);
  assert.equal(foundationMeter.value,0);
  assert.equal(placeMeter.value,0);
  assert.equal(witnessMeter.value,4);
  assert.equal(witnessStatus.textContent,'Studied: 4/4');
  assert.match(witnessBadge.textContent,/no certificate/);
  assert.equal(attrs['aria-pressed'],'true');
  assert.equal(error.textContent,'');
});

test('additional-study resume reads fresh current-principal markers and focuses the next source study',()=>{
  const user={id:'alice'},key=academyProgressKey(user);
  const storage={getItem:name=>name===key?JSON.stringify({version:1,completed:['ruth']}):null};
  let click,focused='';
  const resume={addEventListener(_event,handler){click=handler;}};
  const status={textContent:''};
  const root={
    querySelector(selector){
      if(selector==='#academy-witness-resume')return resume;
      if(selector==='#academy-witness-resume-status')return status;
      if(selector==='#academy-lesson-paul')return {focus(){focused=selector;}};
      return null;
    },
    querySelectorAll(){return [];},
  };
  const document={querySelector:selector=>selector==='[data-academy-root]'?root:null};
  attachAcademy(document,storage,'en',user,{available:true,completed:['ruth']});
  click();
  assert.equal(focused,'#academy-lesson-paul');
  assert.equal(status.textContent,'');
});

