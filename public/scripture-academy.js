// SA-EXT-07: one real, self-directed Scripture course built from the canonical,
// citation-verified dossier graph. This is NOT graded, accredited, or synced.
import { scriptureDossiers, validateDossierGraph } from './scripture-dossiers.js';

export const academyLessonIds=Object.freeze(['abraham','sarah','joseph','moses','exodus','david','nativity']);
const LANGS=['uk','ru','en'];
const COPY={
  uk:{title:'Академія: читання біблійних першоджерел',intro:'Сім послідовних занять за вже перевіреними біблійними досьє. Відкрийте уривки в читальні, дослідіть запитання і самостійно позначте опрацьовані теми.',privacy:'Позначки зберігаються лише у цьому браузері, окремо для кожного облікового запису. Вони не синхронізуються із сервером.',honesty:'Це самостійний читацький маршрут, а не іспит, диплом чи церковна або державна акредитація.',progress:'Опрацьовано',badge:'Особистий читацький маршрут завершено (самооцінка, без сертифіката).',read:'Відкрити уривок у читальні',question:'Запитання для роздумів',mark:'Позначити як опрацьоване',unmark:'Прибрати позначку',unavailable:'Не вдалося прочитати або підтвердити локальні позначки занять. Прогрес не змінено.',saveError:'Не вдалося зберегти позначку на цьому пристрої. Прогрес не змінено.',invalid:'Джерела цього курсу наразі не перевірені.'},
  ru:{title:'Академия: чтение библейских первоисточников',intro:'Семь последовательных занятий по уже проверенным библейским досье. Откройте отрывки в читальне, изучите вопросы и самостоятельно отметьте пройденные темы.',privacy:'Отметки хранятся только в этом браузере, отдельно для каждой учётной записи. Они не синхронизируются с сервером.',honesty:'Это самостоятельный читательский маршрут, а не экзамен, диплом или церковная либо государственная аккредитация.',progress:'Пройдено',badge:'Личный читательский маршрут завершён (самооценка, без сертификата).',read:'Открыть отрывок в читальне',question:'Вопросы для размышления',mark:'Отметить как пройденное',unmark:'Убрать отметку',unavailable:'Не удалось прочитать или подтвердить локальные отметки занятий. Прогресс не изменён.',saveError:'Не удалось сохранить отметку на этом устройстве. Прогресс не изменён.',invalid:'Источники курса пока не проверены.'},
  en:{title:'Academy: read the primary Scripture sources',intro:'Seven sequential lessons from the already verified biblical dossiers. Read the source passages, reflect on the questions, and mark lessons studied yourself.',privacy:'Markers are saved only in this browser, separately for each account. They do not synchronize with the server.',honesty:'This is a self-directed reading path, not a graded exam, diploma, or religious/government accreditation.',progress:'Studied',badge:'Personal reading path completed (self-report only; no certificate).',read:'Open passage in reader',question:'Reflection questions',mark:'Mark studied',unmark:'Unmark studied',unavailable:'Local lesson markers could not be read or verified. Progress has not been changed.',saveError:'Could not save the marker on this device. Progress has not been changed.',invalid:'Course source references are not currently verified.'}
};
const languageOf=value=>LANGS.includes(value)?value:'uk';

export function academyProgressKey(user){
  const raw=user && typeof user.id==='string' && /^[a-zA-Z0-9_-]{1,120}$/.test(user.id)?user.id:'guest';
  return 'sa.academy.reading.v1:'+raw;
}
export function readAcademyProgress(storage,key){
  try{
    if(!storage || typeof storage.getItem!=='function')throw Error('no storage');
    const raw=storage.getItem(key);
    if(raw===null)return {available:true,completed:[]};
    const record=JSON.parse(raw);
    if(!record || record.version!==1 || !Array.isArray(record.completed) ||
       record.completed.some(id=>typeof id!=='string'||!academyLessonIds.includes(id)) ||
       new Set(record.completed).size!==record.completed.length)throw Error('invalid saved progress');
    return {available:true,completed:academyLessonIds.filter(id=>record.completed.includes(id))};
  }catch{return {available:false,completed:[]};}
}

export function academyMarkup(catalog,language,esc,progress) {
  const lang=languageOf(language),w=COPY[lang];
  if(!validateDossierGraph(catalog) || !progress?.available)
    return '<section class="card" role="alert">'+esc(progress?.available===false?w.unavailable:w.invalid)+'</section>';
  const byId=new Map(scriptureDossiers.map(item=>[item.id,item]));
  if(academyLessonIds.some(id=>!byId.has(id)))return '<section role="alert">'+esc(w.invalid)+'</section>';
  const titles=new Map(catalog.books[lang].map(book=>[book.code,book.title]));
  const selected=new Set(progress.completed);
  const lessons=academyLessonIds.map((id,index)=>{
    const node=byId.get(id),name=esc(node.names[lang]);
    const passages=node.sources.map(ref=>{
      const label=titles.get(ref.book)+' '+ref.chapter+':'+ref.first+'–'+ref.last;
      return '<li><a href="/reader/'+ref.book+'/'+ref.chapter+'?verse='+ref.first+'" aria-label="'+esc(w.read)+': '+esc(label)+'">'+esc(label)+'</a></li>';
    }).join('');
    // Preserve every source-approved research question rather than silently
    // dropping all but the first one when composing the accessible course.
    const questions=node.prompts[lang].map(prompt=>'<li>'+esc(prompt)+'</li>').join('');
    const studied=selected.has(id);
    return '<li><article class="card"><h3>'+String(index+1)+'. <a href="/dossiers?id='+id+'">'+name+'</a></h3><p>'+esc(node.summaries[lang])+'</p><ul>'+passages+'</ul><h4>'+esc(w.question)+'</h4><ol>'+questions+'</ol><button type="button" class="button" data-academy-lesson="'+id+'" aria-pressed="'+studied+'">'+esc(studied?w.unmark:w.mark)+'</button></article></li>';
  }).join('');
  const total=academyLessonIds.length,count=selected.size;
  return '<section class="academy-reading" data-academy-root aria-labelledby="academy-reading-title"><h2 id="academy-reading-title">'+esc(w.title)+'</h2><p>'+esc(w.intro)+'</p><p>'+esc(w.privacy)+'</p><p>'+esc(w.honesty)+'</p><label for="academy-reading-progress">'+esc(w.progress)+'</label> <progress id="academy-reading-progress" max="'+total+'" value="'+count+'"></progress> <span id="academy-reading-status" role="status" aria-live="polite">'+esc(w.progress)+': '+count+'/'+total+'</span><p id="academy-reading-badge" role="status">'+(count===total?esc(w.badge):'')+'</p><p id="academy-reading-error" role="alert"></p><ol>'+lessons+'</ol></section>';
}

export function attachAcademy(document,storage,language,user,progress,isCurrent=()=>true){
  if(!progress?.available)return;
  const root=document?.querySelector('[data-academy-root]');
  if(!root)return;
  const w=COPY[languageOf(language)],key=academyProgressKey(user);
  const buttons=[...root.querySelectorAll('button[data-academy-lesson]')];
  const status=root.querySelector('#academy-reading-status');
  const meter=root.querySelector('#academy-reading-progress');
  const badge=root.querySelector('#academy-reading-badge');
  const error=root.querySelector('#academy-reading-error');
  for(const button of buttons){
    const id=button.getAttribute('data-academy-lesson');
    if(!academyLessonIds.includes(id))continue;
    button.addEventListener('click',()=>{
      // An account switch, session outage, or route replacement must retire
      // stale controls before they can mutate a prior principal's device data.
      let active=false;
      try { active=Boolean(isCurrent()) && document?.querySelector('[data-academy-root]')===root; }
      catch {}
      if(!active)return;
      // Another tab may have saved newer choices since this panel rendered.
      // Never overwrite uncertain/corrupt account-scoped state.
      const current=readAcademyProgress(storage,key);
      if(!current.available){
        if(error)error.textContent=w.unavailable;
        return;
      }
      const next=new Set(current.completed);
      if(next.has(id))next.delete(id);else next.add(id);
      const completed=academyLessonIds.filter(x=>next.has(x));
      try{
        if(!storage || typeof storage.setItem!=='function')throw Error('no storage');
        storage.setItem(key,JSON.stringify({version:1,completed}));
      }catch{
        if(error)error.textContent=w.saveError;
        return;
      }
      for(const updatedButton of buttons){
        const updatedId=updatedButton.getAttribute('data-academy-lesson');
        if(!academyLessonIds.includes(updatedId))continue;
        updatedButton.setAttribute('aria-pressed',String(next.has(updatedId)));
        updatedButton.textContent=next.has(updatedId)?w.unmark:w.mark;
      }
      if(error)error.textContent='';
      if(meter)meter.value=completed.length;
      if(status)status.textContent=w.progress+': '+completed.length+'/'+academyLessonIds.length;
      if(badge)badge.textContent=completed.length===academyLessonIds.length?w.badge:'';
    });
  }
}
