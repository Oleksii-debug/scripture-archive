// SA-EXT-07: one real, self-directed Scripture course built from the canonical,
// citation-verified dossier graph. This is NOT graded, accredited, or synced.
import { scriptureDossiers, validateDossierGraph } from './scripture-dossiers.js';

export const academyLessonIds=Object.freeze(['abraham','sarah','joseph','moses','exodus','david','nativity']);
const LANGS=['uk','ru','en'];
const COPY={
  uk:{title:'Академія: читання біблійних першоджерел',intro:'Сім послідовних занять за вже перевіреними біблійними досьє. Відкрийте уривки в читальні, дослідіть запитання і самостійно позначте опрацьовані теми.',privacy:'Позначки зберігаються лише у цьому браузері, окремо для кожного облікового запису. Вони не синхронізуються із сервером.',honesty:'Це самостійний читацький маршрут, а не іспит, диплом чи церковна або державна акредитація.',progress:'Опрацьовано',badge:'Особистий читацький маршрут завершено (самооцінка, без сертифіката).',read:'Відкрити уривок у читальні',question:'Запитання для роздумів',mark:'Позначити як опрацьоване',unmark:'Прибрати позначку',unavailable:'Не вдалося прочитати або підтвердити локальні позначки занять. Прогрес не змінено.',saveError:'Не вдалося підтвердити збереження позначки на цьому пристрої. Перевірте її стан після повторного відкриття сторінки.',lockUnavailable:'Безпечне збереження між вкладками недоступне в цьому браузері. Позначку не змінено.',invalid:'Джерела цього курсу наразі не перевірені.'},
  ru:{title:'Академия: чтение библейских первоисточников',intro:'Семь последовательных занятий по уже проверенным библейским досье. Откройте отрывки в читальне, изучите вопросы и самостоятельно отметьте пройденные темы.',privacy:'Отметки хранятся только в этом браузере, отдельно для каждой учётной записи. Они не синхронизируются с сервером.',honesty:'Это самостоятельный читательский маршрут, а не экзамен, диплом или церковная либо государственная аккредитация.',progress:'Пройдено',badge:'Личный читательский маршрут завершён (самооценка, без сертификата).',read:'Открыть отрывок в читальне',question:'Вопросы для размышления',mark:'Отметить как пройденное',unmark:'Убрать отметку',unavailable:'Не удалось прочитать или подтвердить локальные отметки занятий. Прогресс не изменён.',saveError:'Не удалось подтвердить сохранение отметки на этом устройстве. Проверьте её состояние после повторного открытия страницы.',lockUnavailable:'Безопасное сохранение между вкладками недоступно в этом браузере. Отметка не изменена.',invalid:'Источники курса пока не проверены.'},
  en:{title:'Academy: read the primary Scripture sources',intro:'Seven sequential lessons from the already verified biblical dossiers. Read the source passages, reflect on the questions, and mark lessons studied yourself.',privacy:'Markers are saved only in this browser, separately for each account. They do not synchronize with the server.',honesty:'This is a self-directed reading path, not a graded exam, diploma, or religious/government accreditation.',progress:'Studied',badge:'Personal reading path completed (self-report only; no certificate).',read:'Open passage in reader',question:'Reflection questions',mark:'Mark studied',unmark:'Unmark studied',unavailable:'Local lesson markers could not be read or verified. Progress has not been changed.',saveError:'Could not verify that the marker was saved on this device. Reopen the page to check its current state.',lockUnavailable:'Safe cross-tab saving is unavailable in this browser. The marker was not changed.',invalid:'Course source references are not currently verified.'}
};
const RESET_COPY={
  uk:{title:'Очистити позначки цього курсу',detail:'Буде видалено всі позначки курсу лише для поточного користувача в цьому браузері. Інші пристрої не зміняться. Закрийте інші вкладки курсу, щоб вони знову не записали позначки.',confirm:'Я хочу видалити ці позначки з цього браузера',action:'Очистити позначки',confirmFirst:'Спершу підтвердьте видалення позначок.',done:'Позначки видалено з цього браузера. Оновіть сторінку, щоб продовжити.',uncertain:'Не вдалося підтвердити видалення. Оновіть сторінку й перевірте стан позначок.'},
  ru:{title:'Очистить отметки этого курса',detail:'Все отметки курса будут удалены только для текущего пользователя в этом браузере. Другие устройства не изменятся. Закройте другие вкладки курса, чтобы они снова не записали отметки.',confirm:'Я хочу удалить эти отметки из этого браузера',action:'Очистить отметки',confirmFirst:'Сначала подтвердите удаление отметок.',done:'Отметки удалены из этого браузера. Обновите страницу, чтобы продолжить.',uncertain:'Не удалось подтвердить удаление. Обновите страницу и проверьте состояние отметок.'},
  en:{title:'Clear this course’s markers',detail:'All course markers for the current user will be removed only from this browser. Other devices will not change. Close other course tabs to prevent them from saving markers again.',confirm:'I want to remove these markers from this browser',action:'Clear markers',confirmFirst:'Confirm removal first.',done:'Markers removed from this browser. Reload the page to continue.',uncertain:'Could not confirm removal. Reload the page and check the markers.'}
};
const SYNC_ERROR={
  uk:'Не вдалося прочитати оновлені позначки з іншої вкладки. Оновіть сторінку й перевірте їх.',
  ru:'Не удалось прочитать обновлённые отметки из другой вкладки. Обновите страницу и проверьте их.',
  en:'Could not read the updated markers from another tab. Reload the page and check them.'
};
const languageOf=value=>LANGS.includes(value)?value:'uk';

export function academyProgressKey(user){
  // Only a truly absent principal is anonymous. Do not alias an invalid
  // authenticated identity (including reserved "guest") to anonymous data.
  if(user===null || user===undefined)return 'sa.academy.reading.v1:guest';
  if(typeof user!=='object' || typeof user.id!=='string' ||
     !/^[a-zA-Z0-9_-]{1,120}$/.test(user.id) || user.id==='guest')return null;
  return 'sa.academy.reading.v1:'+user.id;
}
export function readAcademyProgress(storage,key){
  try{
    if(typeof key!=='string' ||
       !/^sa\.academy\.reading\.v1:[a-zA-Z0-9_-]{1,120}$/.test(key))
      throw Error('invalid principal progress key');
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
  const lang=languageOf(language),w=COPY[lang],reset=RESET_COPY[lang];
  // A private progress read can be unavailable without making public lessons
  // inaccessible. Show source-verified lessons read-only, never guessed marks.
  const readOnly = progress?.available === false;
  if(!validateDossierGraph(catalog) || (!readOnly && progress?.available !== true))
    return '<section class="card" role="alert">'+esc(w.invalid)+'</section>';
  const byId=new Map(scriptureDossiers.map(item=>[item.id,item]));
  if(academyLessonIds.some(id=>!byId.has(id)))return '<section role="alert">'+esc(w.invalid)+'</section>';
  const titles=new Map(catalog.books[lang].map(book=>[book.code,book.title]));
  const selected=new Set(readOnly?[]:progress.completed);
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
    return '<li><article class="card"><h3>'+String(index+1)+'. <a href="/dossiers?id='+id+'">'+name+'</a></h3><p>'+esc(node.summaries[lang])+'</p><ul>'+passages+'</ul><h4>'+esc(w.question)+'</h4><ol>'+questions+'</ol>'+(readOnly?'':'<button type="button" class="button" data-academy-lesson="'+id+'" aria-pressed="'+studied+'">'+esc(studied?w.unmark:w.mark)+'</button>')+'</article></li>';
  }).join('');
  const total=academyLessonIds.length,count=selected.size;
  return '<section class="academy-reading" data-academy-root aria-labelledby="academy-reading-title"><h2 id="academy-reading-title">'+esc(w.title)+'</h2><p>'+esc(w.intro)+'</p><p>'+esc(w.privacy)+'</p><p>'+esc(w.honesty)+'</p>'+(readOnly?'<p id="academy-reading-unavailable" role="alert">'+esc(w.unavailable)+'</p>':'<label for="academy-reading-progress">'+esc(w.progress)+'</label> <progress id="academy-reading-progress" max="'+total+'" value="'+count+'"></progress> <span id="academy-reading-status" role="status" aria-live="polite">'+esc(w.progress)+': '+count+'/'+total+'</span><p id="academy-reading-badge" role="status">'+(count===total?esc(w.badge):'')+'</p><p id="academy-reading-error" role="alert"></p>')+'<details><summary>'+esc(reset.title)+'</summary><p>'+esc(reset.detail)+'</p><label><input type="checkbox" id="academy-reset-confirm"> '+esc(reset.confirm)+'</label> <button type="button" class="button" id="academy-reset">'+esc(reset.action)+'</button><p id="academy-reset-status" role="status" aria-live="polite"></p></details><ol>'+lessons+'</ol></section>';
}

let detachAcademyStorageListener=()=>{};
export function attachAcademy(document,storage,language,user,progress,isCurrent=()=>true,lockManager=undefined,eventTarget=undefined){
  // Replaced views must not accumulate live origin-wide listeners.
  detachAcademyStorageListener();
  detachAcademyStorageListener=()=>{};
  const root=document?.querySelector('[data-academy-root]');
  if(!root)return;
  const w=COPY[languageOf(language)],reset=RESET_COPY[languageOf(language)],key=academyProgressKey(user);
  // localStorage has no atomic CAS; use an origin-wide Web Lock in browsers.
  const locks=lockManager===undefined
    ? (typeof window==='undefined'?null:globalThis.navigator?.locks)
    : lockManager;
  // Existing single-context Node fixtures do not emulate browser tabs.
  // The shortcut never applies on a browser page.
  const nonBrowserFixture=typeof window==='undefined'&&lockManager===undefined;
  const buttons=[...root.querySelectorAll('button[data-academy-lesson]')];
  const status=root.querySelector('#academy-reading-status');
  const meter=root.querySelector('#academy-reading-progress');
  const badge=root.querySelector('#academy-reading-badge');
  const error=root.querySelector('#academy-reading-error');
  const unavailable=root.querySelector('#academy-reading-unavailable');
  const resetButton=root.querySelector('#academy-reset');
  const resetConfirm=root.querySelector('#academy-reset-confirm');
  const resetStatus=root.querySelector('#academy-reset-status');
  const currentView=()=>{
    try{return Boolean(isCurrent()) && document?.querySelector('[data-academy-root]')===root;}
    catch{return false;}
  };
  if(resetButton && typeof resetButton.addEventListener==='function' && resetConfirm){
    resetButton.addEventListener('click',()=>{
      if(!currentView())return;
      if(!resetConfirm.checked){if(resetStatus)resetStatus.textContent=reset.confirmFirst;return;}
      // This is the same origin-wide principal lock used by lesson updates.
      // It never clears the guest or another account as a fallback.
      if(typeof key!=='string'||(!nonBrowserFixture&&(!locks||typeof locks.request!=='function'))){
        if(resetStatus)resetStatus.textContent=w.lockUnavailable;
        return;
      }
      resetButton.disabled=true;
      const remove=()=>{
        if(!currentView() || !resetConfirm.checked)return;
        try{
          if(!storage || typeof storage.removeItem!=='function' || typeof storage.getItem!=='function')throw Error('storage unavailable');
          storage.removeItem(key);
          if(storage.getItem(key)!==null)throw Error('unconfirmed removal');
        }catch{
          if(currentView()&&resetStatus)resetStatus.textContent=reset.uncertain;
          return;
        }
        if(!currentView())return;
        resetConfirm.checked=false;
        for(const updatedButton of buttons){
          updatedButton.setAttribute('aria-pressed','false');
          updatedButton.textContent=w.mark;
        }
        if(meter)meter.value=0;
        if(status)status.textContent=w.progress+': 0/'+academyLessonIds.length;
        if(badge)badge.textContent='';
        if(error)error.textContent='';
        if(unavailable)unavailable.textContent='';
        if(resetStatus)resetStatus.textContent=reset.done;
      };
      const finish=()=>{resetButton.disabled=false;};
      if(nonBrowserFixture){try{remove();}finally{finish();}return;}
      try{
        Promise.resolve(locks.request('sa-academy-progress:'+key,{mode:'exclusive'},remove))
          .catch(()=>{if(currentView()&&resetStatus)resetStatus.textContent=w.lockUnavailable;})
          .finally(finish);
      }catch{
        finish();
        if(currentView()&&resetStatus)resetStatus.textContent=w.lockUnavailable;
      }
    });
  }
  if(!progress?.available)return;
  const events=eventTarget===undefined ? (typeof window==='undefined'?null:window) : eventTarget;
  if(typeof key==='string' && events && typeof events.addEventListener==='function' && typeof events.removeEventListener==='function'){
    const refresh=event=>{
      if(!currentView())return;
      if(event?.key!==key && event?.key!==null)return;
      if(event?.storageArea && event.storageArea!==storage)return;
      if(resetStatus)resetStatus.textContent='';
      const latest=readAcademyProgress(storage,key);
      if(!latest.available){
        if(error)error.textContent=SYNC_ERROR[languageOf(language)];
        return;
      }
      const selected=new Set(latest.completed);
      for(const button of buttons){
        const id=button.getAttribute('data-academy-lesson');
        if(!academyLessonIds.includes(id))continue;
        button.setAttribute('aria-pressed',String(selected.has(id)));
        button.textContent=selected.has(id)?w.unmark:w.mark;
      }
      if(meter)meter.value=selected.size;
      if(status)status.textContent=w.progress+': '+selected.size+'/'+academyLessonIds.length;
      if(badge)badge.textContent=selected.size===academyLessonIds.length?w.badge:'';
      if(error)error.textContent='';
    };
    events.addEventListener('storage',refresh);
    detachAcademyStorageListener=()=>events.removeEventListener('storage',refresh);
  }
  for(const button of buttons){
    const id=button.getAttribute('data-academy-lesson');
    if(!academyLessonIds.includes(id))continue;
    const update=()=>{
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
      // Apply the action shown on this button, even if another view has
      // changed this same lesson since it was rendered.
      if(button.getAttribute('aria-pressed')==='true')next.delete(id);else next.add(id);
      const completed=academyLessonIds.filter(x=>next.has(x));
      try{
        if(!storage || typeof storage.setItem!=='function')throw Error('no storage');
        const saved=JSON.stringify({version:1,completed});
        storage.setItem(key,saved);
        // Storage may silently ignore or alter writes (privacy mode, quota,
        // broken adapters). Do not claim progress until the exact value can
        // be read back under the same verified principal.
        if (storage.getItem(key)!==saved) throw Error('unconfirmed academy progress write');
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
    };
    button.addEventListener('click',()=>{
      // Recheck before and after lock acquisition (inside update()).
      let active=false;
      try{active=Boolean(isCurrent())&&document?.querySelector('[data-academy-root]')===root;}catch{}
      if(!active)return;
      if(nonBrowserFixture){update();return;}
      if(typeof key!=='string'||!locks||typeof locks.request!=='function'){
        if(error)error.textContent=w.lockUnavailable;
        return;
      }
      try{
        Promise.resolve(locks.request('sa-academy-progress:'+key,{mode:'exclusive'},()=>update())).catch(()=>{
          let stillCurrent=false;
          try{stillCurrent=Boolean(isCurrent())&&document?.querySelector('[data-academy-root]')===root;}catch{}
          if(stillCurrent&&error)error.textContent=w.lockUnavailable;
        });
      }catch{
        if(error)error.textContent=w.lockUnavailable;
      }
    });
  }
}
