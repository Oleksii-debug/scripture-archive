// SA-EXT-07: one real, self-directed Scripture course built from the canonical,
// citation-verified dossier graph. This is NOT graded, accredited, or synced.
import { scriptureDossiers, validateDossierGraph } from './scripture-dossiers.js';

export const academyLessonIds=Object.freeze(['abraham','sarah','joseph','moses','exodus','david','nativity']);
export const academyPlaceLessonIds=Object.freeze(['jerusalem','bethlehem','egypt','nazareth','jericho','galilee']);
export const academyAllLessonIds=Object.freeze([...academyLessonIds,...academyPlaceLessonIds]);
const LANGS=['uk','ru','en'];
const COPY={
  uk:{title:'Академія: читання біблійних першоджерел',intro:'Сім послідовних занять за вже перевіреними біблійними досьє. Відкрийте уривки в читальні, дослідіть запитання і самостійно позначте опрацьовані теми.',placesTitle:'Біблійні місця у першоджерелах',placesIntro:'Шість окремих досліджень місць за перевіреними біблійними досьє. Їхній порядок не є історичною хронологією або твердженням про сучасну локалізацію.',privacy:'Позначки зберігаються лише у цьому браузері, окремо для кожного облікового запису. Вони не синхронізуються із сервером.',honesty:'Це самостійний читацький маршрут, а не іспит, диплом чи церковна або державна акредитація.',progress:'Опрацьовано',badge:'Особистий читацький маршрут завершено (самооцінка, без сертифіката).',placesBadge:'Особистий маршрут дослідження місць завершено (самооцінка, без сертифіката).',read:'Відкрити уривок у читальні',question:'Запитання для роздумів',mark:'Позначити як опрацьоване',unmark:'Прибрати позначку',unavailable:'Не вдалося прочитати або підтвердити локальні позначки занять. Прогрес не змінено.',saveError:'Не вдалося підтвердити збереження позначки на цьому пристрої. Перевірте її стан після повторного відкриття сторінки.',lockUnavailable:'Безпечне збереження між вкладками недоступне в цьому браузері. Позначку не змінено.',invalid:'Джерела цього курсу наразі не перевірені.'},
  ru:{title:'Академия: чтение библейских первоисточников',intro:'Семь последовательных занятий по уже проверенным библейским досье. Откройте отрывки в читальне, изучите вопросы и самостоятельно отметьте пройденные темы.',placesTitle:'Библейские места в первоисточниках',placesIntro:'Шесть отдельных исследований мест по проверенным библейским досье. Их порядок не является исторической хронологией или утверждением о современной локализации.',privacy:'Отметки хранятся только в этом браузере, отдельно для каждой учётной записи. Они не синхронизируются с сервером.',honesty:'Это самостоятельный читательский маршрут, а не экзамен, диплом или церковная либо государственная аккредитация.',progress:'Пройдено',badge:'Личный читательский маршрут завершён (самооценка, без сертификата).',placesBadge:'Личный маршрут исследования мест завершён (самооценка, без сертификата).',read:'Открыть отрывок в читальне',question:'Вопросы для размышления',mark:'Отметить как пройденное',unmark:'Убрать отметку',unavailable:'Не удалось прочитать или подтвердить локальные отметки занятий. Прогресс не изменён.',saveError:'Не удалось подтвердить сохранение отметки на этом устройстве. Проверьте её состояние после повторного открытия страницы.',lockUnavailable:'Безопасное сохранение между вкладками недоступно в этом браузере. Отметка не изменена.',invalid:'Источники курса пока не проверены.'},
  en:{title:'Academy: read the primary Scripture sources',intro:'Seven sequential lessons from the already verified biblical dossiers. Read the source passages, reflect on the questions, and mark lessons studied yourself.',placesTitle:'Biblical places in the primary sources',placesIntro:'Six separate place studies from verified biblical dossiers. Their order is not a historical chronology or a claim about modern locations.',privacy:'Markers are saved only in this browser, separately for each account. They do not synchronize with the server.',honesty:'This is a self-directed reading path, not a graded exam, diploma, or religious/government accreditation.',progress:'Studied',badge:'Personal reading path completed (self-report only; no certificate).',placesBadge:'Personal place-study path completed (self-report only; no certificate).',read:'Open passage in reader',question:'Reflection questions',mark:'Mark studied',unmark:'Unmark studied',unavailable:'Local lesson markers could not be read or verified. Progress has not been changed.',saveError:'Could not verify that the marker was saved on this device. Reopen the page to check its current state.',lockUnavailable:'Safe cross-tab saving is unavailable in this browser. The marker was not changed.',invalid:'Course source references are not currently verified.'}
};
const RESET_COPY={
  uk:{title:'Очистити позначки цього курсу',detail:'Буде видалено всі позначки курсу лише для поточного користувача в цьому браузері. Інші пристрої не зміняться. Закрийте інші вкладки курсу, щоб вони знову не записали позначки.',confirm:'Я хочу видалити ці позначки з цього браузера',action:'Очистити позначки',confirmFirst:'Спершу підтвердьте видалення позначок.',done:'Позначки видалено з цього браузера. Оновіть сторінку, щоб продовжити.',uncertain:'Не вдалося підтвердити видалення. Оновіть сторінку й перевірте стан позначок.'},
  ru:{title:'Очистить отметки этого курса',detail:'Все отметки курса будут удалены только для текущего пользователя в этом браузере. Другие устройства не изменятся. Закройте другие вкладки курса, чтобы они снова не записали отметки.',confirm:'Я хочу удалить эти отметки из этого браузера',action:'Очистить отметки',confirmFirst:'Сначала подтвердите удаление отметок.',done:'Отметки удалены из этого браузера. Обновите страницу, чтобы продолжить.',uncertain:'Не удалось подтвердить удаление. Обновите страницу и проверьте состояние отметок.'},
  en:{title:'Clear this course’s markers',detail:'All course markers for the current user will be removed only from this browser. Other devices will not change. Close other course tabs to prevent them from saving markers again.',confirm:'I want to remove these markers from this browser',action:'Clear markers',confirmFirst:'Confirm removal first.',done:'Markers removed from this browser. Reload the page to continue.',uncertain:'Could not confirm removal. Reload the page and check the markers.'}
};
const EXPORT_COPY={
  uk:{button:'Завантажити позначки курсу',detail:'Файл містить лише локальні позначки цього курсу. Це самостійна оцінка, а не сертифікат; його можна додати до локальних позначок нижче.',requested:'Завантаження запитано. Перевірте файл у браузері.',error:'Не вдалося підготувати файл із перевірених локальних позначок.'},
  ru:{button:'Скачать отметки курса',detail:'Файл содержит только локальные отметки этого курса. Это самооценка, а не сертификат; его можно добавить к локальным отметкам ниже.',requested:'Загрузка запрошена. Проверьте файл в браузере.',error:'Не удалось подготовить файл из проверенных локальных отметок.'},
  en:{button:'Download course markers',detail:'The file contains only this course’s local markers. These are self-reported, not a certificate; you can add them to local markers below.',requested:'Download requested. Check your browser for the file.',error:'Could not prepare a file from verified local markers.'}
};
const IMPORT_COPY={
  uk:{label:'Файл позначок курсу',action:'Додати позначки з файлу',detail:'Імпорт додає позначки до наявних лише в цьому браузері та для поточного користувача; нічого не видаляє і не перевіряє знання.',done:'Позначки з файлу додано до цього браузера.',invalid:'Файл не розпізнано або не вдалося прочитати. Позначки не змінено.',uncertain:'Не вдалося підтвердити збереження. Оновіть сторінку та перевірте позначки.',lock:'Безпечне збереження між вкладками недоступне. Позначки не змінено.'},
  ru:{label:'Файл отметок курса',action:'Добавить отметки из файла',detail:'Импорт добавляет отметки к имеющимся только в этом браузере и для текущего пользователя; ничего не удаляет и не проверяет знания.',done:'Отметки из файла добавлены в этот браузер.',invalid:'Файл не распознан или не прочитан. Отметки не изменены.',uncertain:'Не удалось подтвердить сохранение. Обновите страницу и проверьте отметки.',lock:'Безопасное сохранение между вкладками недоступно. Отметки не изменены.'},
  en:{label:'Course markers file',action:'Add markers from file',detail:'Import adds markers to existing ones only in this browser for the current user; it does not delete markers or verify knowledge.',done:'Markers from the file were added in this browser.',invalid:'The file is invalid or could not be read. Markers were not changed.',uncertain:'Could not confirm the save. Reload the page and check the markers.',lock:'Safe cross-tab saving is unavailable. Markers were not changed.'}
};
const RESUME_COPY={
  uk:{button:'Перейти до наступного неопрацьованого заняття',placeButton:'Перейти до наступного неопрацьованого місця',done:'Усі заняття позначено як опрацьовані. Це самооцінка.',placeDone:'Усі дослідження місць позначено як опрацьовані. Це самооцінка.',error:'Не вдалося визначити наступне заняття. Перевірте локальні позначки.'},
  ru:{button:'Перейти к следующему непройденному занятию',placeButton:'Перейти к следующему непройденному месту',done:'Все занятия отмечены как пройденные. Это самооценка.',placeDone:'Все исследования мест отмечены как пройденные. Это самооценка.',error:'Не удалось определить следующее занятие. Проверьте локальные отметки.'},
  en:{button:'Go to the next unmarked lesson',placeButton:'Go to the next unmarked place study',done:'All lessons are marked studied. This is self-reported.',placeDone:'All place studies are marked studied. This is self-reported.',error:'Could not determine the next lesson. Check your local markers.'}
};
const SYNC_ERROR={
  uk:'Не вдалося прочитати оновлені позначки з іншої вкладки. Оновіть сторінку й перевірте їх.',
  ru:'Не удалось прочитать обновлённые отметки из другой вкладки. Обновите страницу и проверьте их.',
  en:'Could not read the updated markers from another tab. Reload the page and check them.'
};
// Reuse each validated canonical dossier witness kind as an explicit lesson label.
const SOURCE_KIND_LABELS={
  uk:{narrative:'Зв’язок у біблійній оповіді',interpretive:'Тематичне зіставлення, не незалежний історичний доказ'},
  ru:{narrative:'Связь в библейском повествовании',interpretive:'Тематическое сопоставление, не независимое историческое доказательство'},
  en:{narrative:'Connection in the biblical narrative',interpretive:'Thematic comparison, not independent historical proof'},
};
const languageOf=value=>LANGS.includes(value)?value:'uk';

export function academyProgressKey(user){
  // Only a truly absent principal is anonymous. Do not alias an invalid
  // authenticated identity (including reserved "guest") to anonymous data.
  if(user===null || user===undefined)return 'sa.academy.reading.v1:guest';
  // Only an own data-property ID from the authenticated account projection
  // can select private markers. Inherited IDs, accessor getters, arrays and
  // hostile property descriptors must never alias another principal's data.
  try {
    if(typeof user!=='object' || Array.isArray(user))return null;
    const descriptor=Object.getOwnPropertyDescriptor(user,'id');
    const id=descriptor?.value;
    if(typeof id!=='string' || !/^[a-zA-Z0-9_-]{1,120}$/.test(id) || id==='guest')return null;
    return 'sa.academy.reading.v1:'+id;
  } catch {return null;}
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
       record.completed.some(id=>typeof id!=='string'||!academyAllLessonIds.includes(id)) ||
       new Set(record.completed).size!==record.completed.length)throw Error('invalid saved progress');
    return {available:true,completed:academyAllLessonIds.filter(id=>record.completed.includes(id))};
  }catch{return {available:false,completed:[]};}
}

export function academyMarkup(catalog,language,esc,progress) {
  const lang=languageOf(language),w=COPY[lang],reset=RESET_COPY[lang],exportCopy=EXPORT_COPY[lang],importCopy=IMPORT_COPY[lang],resume=RESUME_COPY[lang];
  // A private progress read can be unavailable without making public lessons
  // inaccessible. Show source-verified lessons read-only, never guessed marks.
  // A malformed progress projection must not fabricate completion badges or
  // crash the public course. Keep source-verified lessons readable, but retire
  // private marker controls until a fresh, validated device readback.
  const completed = progress?.completed;
  const validCompleted = Array.isArray(completed) &&
    completed.length <= academyAllLessonIds.length &&
    completed.every(id=>typeof id==='string' && academyAllLessonIds.includes(id)) &&
    new Set(completed).size===completed.length;
  const readOnly = progress?.available === false ||
    (progress?.available === true && !validCompleted);
  if(!validateDossierGraph(catalog) || (!readOnly && progress?.available !== true))
    return '<section class="card" role="alert">'+esc(w.invalid)+'</section>';
  const byId=new Map(scriptureDossiers.map(item=>[item.id,item]));
  if(academyAllLessonIds.some(id=>!byId.has(id)))return '<section role="alert">'+esc(w.invalid)+'</section>';
  const titles=new Map(catalog.books[lang].map(book=>[book.code,book.title]));
  const selected=new Set(readOnly?[]:progress.completed);
  const lessons=(ids,headingLevel)=>ids.map((id,index)=>{
    const node=byId.get(id),name=esc(node.names[lang]);
    const passages=node.sources.map(ref=>{
      const label=titles.get(ref.book)+' '+ref.chapter+':'+ref.first+'–'+ref.last;
      return '<li><a href="/reader/'+ref.book+'/'+ref.chapter+'?verse='+ref.first+'" aria-label="'+esc(w.read)+': '+esc(label)+' — '+esc(SOURCE_KIND_LABELS[lang][ref.kind])+'">'+esc(label)+'</a> — '+esc(SOURCE_KIND_LABELS[lang][ref.kind])+'</li>';
    }).join('');
    // Preserve every source-approved research question rather than silently
    // dropping all but the first one when composing the accessible course.
    const questions=node.prompts[lang].map(prompt=>'<li>'+esc(prompt)+'</li>').join('');
    const studied=selected.has(id);
    const questionLevel=headingLevel+1;
    return '<li><article class="card"><h'+headingLevel+' id="academy-lesson-'+id+'" tabindex="-1">'+String(index+1)+'. <a href="/dossiers?id='+id+'">'+name+'</a></h'+headingLevel+'><p>'+esc(node.summaries[lang])+'</p><ul>'+passages+'</ul><h'+questionLevel+'>'+esc(w.question)+'</h'+questionLevel+'><ol>'+questions+'</ol>'+(readOnly?'':'<button type="button" class="button" data-academy-lesson="'+id+'" aria-pressed="'+studied+'">'+esc(studied?w.unmark:w.mark)+'</button>')+'</article></li>';
  }).join('');
  const foundationCount=academyLessonIds.filter(id=>selected.has(id)).length;
  const placesCount=academyPlaceLessonIds.filter(id=>selected.has(id)).length;
  const privateControls=readOnly?'':'<label for="academy-reading-progress">'+esc(w.progress)+'</label> <progress id="academy-reading-progress" max="'+academyLessonIds.length+'" value="'+foundationCount+'"></progress> <span id="academy-reading-status" role="status" aria-live="polite">'+esc(w.progress)+': '+foundationCount+'/'+academyLessonIds.length+'</span><p id="academy-reading-badge" role="status">'+(foundationCount===academyLessonIds.length?esc(w.badge):'')+'</p><p id="academy-reading-error" role="alert"></p><button type="button" class="button" id="academy-resume">'+esc(resume.button)+'</button><p id="academy-resume-status" role="status" aria-live="polite"></p>';
  const placesControls=readOnly?'':'<label for="academy-place-progress">'+esc(w.progress)+'</label> <progress id="academy-place-progress" max="'+academyPlaceLessonIds.length+'" value="'+placesCount+'"></progress> <span id="academy-place-status" role="status" aria-live="polite">'+esc(w.progress)+': '+placesCount+'/'+academyPlaceLessonIds.length+'</span><p id="academy-place-badge" role="status">'+(placesCount===academyPlaceLessonIds.length?esc(w.placesBadge):'')+'</p><button type="button" class="button" id="academy-place-resume">'+esc(resume.placeButton)+'</button><p id="academy-place-resume-status" role="status" aria-live="polite"></p>';
  return '<section class="academy-reading" data-academy-root aria-labelledby="academy-reading-title"><h2 id="academy-reading-title">'+esc(w.title)+'</h2><p>'+esc(w.intro)+'</p><p>'+esc(w.privacy)+'</p><p>'+esc(w.honesty)+'</p>'+(readOnly?'<p id="academy-reading-unavailable" role="alert">'+esc(w.unavailable)+'</p>':privateControls)+(readOnly?'':'<p>'+esc(exportCopy.detail)+'</p><button type="button" class="button" id="academy-export">'+esc(exportCopy.button)+'</button><p id="academy-export-status" role="status" aria-live="polite"></p><p>'+esc(importCopy.detail)+'</p><label for="academy-import-file">'+esc(importCopy.label)+'</label> <input id="academy-import-file" type="file" accept="application/json,.json"> <button type="button" class="button" id="academy-import">'+esc(importCopy.action)+'</button><p id="academy-import-status" role="status" aria-live="polite"></p>')+'<details><summary>'+esc(reset.title)+'</summary><p>'+esc(reset.detail)+'</p><label><input type="checkbox" id="academy-reset-confirm"> '+esc(reset.confirm)+'</label> <button type="button" class="button" id="academy-reset">'+esc(reset.action)+'</button><p id="academy-reset-status" role="status" aria-live="polite"></p></details><ol>'+lessons(academyLessonIds,3)+'</ol><section class="academy-place-track" aria-labelledby="academy-place-title"><h3 id="academy-place-title">'+esc(w.placesTitle)+'</h3><p>'+esc(w.placesIntro)+'</p>'+placesControls+'<ol>'+lessons(academyPlaceLessonIds,4)+'</ol></section></section>';
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
  const placeStatus=root.querySelector('#academy-place-status');
  const placeMeter=root.querySelector('#academy-place-progress');
  const placeBadge=root.querySelector('#academy-place-badge');
  const error=root.querySelector('#academy-reading-error');
  const unavailable=root.querySelector('#academy-reading-unavailable');
  const resetButton=root.querySelector('#academy-reset');
  const resetConfirm=root.querySelector('#academy-reset-confirm');
  const resetStatus=root.querySelector('#academy-reset-status');
  const syncProgress=(selected)=>{
    const foundationCount=academyLessonIds.filter(id=>selected.has(id)).length;
    const placeCount=academyPlaceLessonIds.filter(id=>selected.has(id)).length;
    if(meter)meter.value=foundationCount;
    if(status)status.textContent=w.progress+': '+foundationCount+'/'+academyLessonIds.length;
    if(badge)badge.textContent=foundationCount===academyLessonIds.length?w.badge:'';
    if(placeMeter)placeMeter.value=placeCount;
    if(placeStatus)placeStatus.textContent=w.progress+': '+placeCount+'/'+academyPlaceLessonIds.length;
    if(placeBadge)placeBadge.textContent=placeCount===academyPlaceLessonIds.length?w.placesBadge:'';
  };
  const syncButtons=(selected)=>{
    for(const button of buttons){
      const id=button.getAttribute('data-academy-lesson');
      if(!academyAllLessonIds.includes(id))continue;
      // A successful verified read is the only path that restores editable
      // private markers after a corrupted cross-tab storage event.
      button.disabled=false;
      button.setAttribute('aria-pressed',String(selected.has(id)));
      button.textContent=selected.has(id)?w.unmark:w.mark;
    }
  };
  const redactUnreadableProgress=()=>{
    // A storage event may replace a previously complete private record with
    // corrupt/unreadable bytes. The old DOM must not keep announcing another
    // account's or an obsolete tab's completion while the readback is denied.
    for(const button of buttons){
      if(!academyAllLessonIds.includes(button.getAttribute('data-academy-lesson')))continue;
      button.disabled=true;
      button.setAttribute('aria-pressed','false');
      button.textContent=w.mark;
    }
    if(meter)meter.value=0;
    // Do not claim "progress has not changed" after another tab replaced it:
    // its persisted state is unknown, not confirmed unchanged.
    if(status)status.textContent=SYNC_ERROR[languageOf(language)];
    if(badge)badge.textContent='';
    if(placeMeter)placeMeter.value=0;
    if(placeStatus)placeStatus.textContent=SYNC_ERROR[languageOf(language)];
    if(placeBadge)placeBadge.textContent='';
  };
  const currentView=()=>{
    try{return Boolean(isCurrent()) && document?.querySelector('[data-academy-root]')===root;}
    catch{return false;}
  };
  // Disabling a focused button may move Chromium's focus to the body.
  // Restore only if the same view remains mounted and focus did not move on.
  const restoreActionFocus=(button,wasFocused)=>{
    if(!wasFocused || !currentView() || button?.isConnected===false ||
       !document?.body || document.activeElement!==document.body || typeof button.focus!=='function')return;
    try { button.focus({preventScroll:true}); } catch { /* status remains available */ }
  };
  const resume=RESUME_COPY[languageOf(language)];
  const attachResume=(resumeButton,resumeStatus,ids,done)=>{
    if(!resumeButton || typeof resumeButton.addEventListener!=='function')return;
    resumeButton.addEventListener('click',()=>{
      if(!currentView())return;
      const current=readAcademyProgress(storage,key);
      if(!current.available){if(resumeStatus)resumeStatus.textContent=resume.error;return;}
      const next=ids.find(id=>!current.completed.includes(id));
      if(!next){if(resumeStatus)resumeStatus.textContent=done;return;}
      try {
        const heading=root.querySelector('#academy-lesson-'+next);
        if(!heading || typeof heading.focus!=='function')throw Error('lesson unavailable');
        if(resumeStatus)resumeStatus.textContent='';
        heading.focus();
      } catch {if(resumeStatus)resumeStatus.textContent=resume.error;}
    });
  };
  attachResume(root.querySelector('#academy-resume'),root.querySelector('#academy-resume-status'),academyLessonIds,resume.done);
  attachResume(root.querySelector('#academy-place-resume'),root.querySelector('#academy-place-resume-status'),academyPlaceLessonIds,resume.placeDone);
  const exportButton=root.querySelector('#academy-export');
  const exportStatus=root.querySelector('#academy-export-status');
  const exportCopy=EXPORT_COPY[languageOf(language)];
  if(exportButton && typeof exportButton.addEventListener==='function') {
    exportButton.addEventListener('click',()=>{
      if(!currentView())return;
      const current=readAcademyProgress(storage,key);
      if(!current.available){if(exportStatus)exportStatus.textContent=exportCopy.error;return;}
      try {
        const record={format:'scripture-archive-academy-markers',version:1,completed:current.completed};
        const link=document.createElement('a');
        link.href='data:application/json;charset=utf-8,'+encodeURIComponent(JSON.stringify(record,null,2));
        link.download='scripture-archive-academy-markers.json';
        link.click();
        if(currentView()&&exportStatus)exportStatus.textContent=exportCopy.requested;
      } catch { if(currentView()&&exportStatus)exportStatus.textContent=exportCopy.error; }
    });
  }
  const importButton=root.querySelector('#academy-import');
  const importFile=root.querySelector('#academy-import-file');
  const importStatus=root.querySelector('#academy-import-status');
  const importCopy=IMPORT_COPY[languageOf(language)];
  let importing=false;
  if(importButton && importFile && typeof importButton.addEventListener==='function') {
    importButton.addEventListener('click',async()=>{
      if(!currentView() || importing)return;
      const file=importFile.files?.[0];
      if(!file || !Number.isSafeInteger(file.size) || file.size<0 || file.size>4096 || typeof file.text!=='function'){
        if(importStatus)importStatus.textContent=importCopy.invalid;return;
      }
      if(typeof key!=='string' || !locks || typeof locks.request!=='function'){
        if(importStatus)importStatus.textContent=importCopy.lock;return;
      }
      const hadFocus=document?.activeElement===importButton;
      importing=true;importButton.disabled=true;
      try {
        const text=await file.text();
        if(!currentView() || importFile.files?.[0]!==file)return;
        let record;
        try {
          if(typeof text!=='string' || text.length>4096)throw Error('invalid size');
          record=JSON.parse(text);
          if(!record || typeof record!=='object' || Array.isArray(record) ||
             Object.keys(record).sort().join(',')!=='completed,format,version' ||
             record.format!=='scripture-archive-academy-markers' || record.version!==1 ||
             !Array.isArray(record.completed) || record.completed.length>academyAllLessonIds.length ||
             record.completed.some(id=>typeof id!=='string'||!academyAllLessonIds.includes(id)) ||
             new Set(record.completed).size!==record.completed.length)throw Error('invalid markers');
        } catch {if(importStatus)importStatus.textContent=importCopy.invalid;return;}
        await locks.request('sa-academy-progress:'+key,{mode:'exclusive'},()=>{
          if(!currentView() || importFile.files?.[0]!==file)return;
          const existing=readAcademyProgress(storage,key);
          if(!existing.available){if(importStatus)importStatus.textContent=importCopy.uncertain;return;}
          const merged=new Set([...existing.completed,...record.completed]);
          const completed=academyAllLessonIds.filter(id=>merged.has(id));
          try {
            const saved=JSON.stringify({version:1,completed});
            storage.setItem(key,saved);
            if(storage.getItem(key)!==saved)throw Error('unconfirmed save');
          } catch {if(currentView()&&importStatus)importStatus.textContent=importCopy.uncertain;return;}
          if(!currentView())return;
          const selected=new Set(completed);
          syncButtons(selected);
          syncProgress(selected);
          if(error)error.textContent='';
          if(importStatus)importStatus.textContent=importCopy.done;
          importFile.value='';
        });
      } catch {if(currentView()&&importStatus)importStatus.textContent=importCopy.uncertain;}
      finally {importing=false;importButton.disabled=false;restoreActionFocus(importButton,hadFocus);}
    });
  }
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
      const hadFocus=document?.activeElement===resetButton;
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
        const selected=new Set();
        syncButtons(selected);
        syncProgress(selected);
        if(error)error.textContent='';
        if(unavailable)unavailable.textContent='';
        if(resetStatus)resetStatus.textContent=reset.done;
      };
      const finish=()=>{resetButton.disabled=false;restoreActionFocus(resetButton,hadFocus);};
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
        redactUnreadableProgress();
        if(error)error.textContent=SYNC_ERROR[languageOf(language)];
        return;
      }
      const selected=new Set(latest.completed);
      syncButtons(selected);
      syncProgress(selected);
      if(error)error.textContent='';
    };
    events.addEventListener('storage',refresh);
    detachAcademyStorageListener=()=>events.removeEventListener('storage',refresh);
  }
  for(const button of buttons){
    const id=button.getAttribute('data-academy-lesson');
    if(!academyAllLessonIds.includes(id))continue;
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
      const completed=academyAllLessonIds.filter(x=>next.has(x));
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
      syncButtons(next);
      if(error)error.textContent='';
      syncProgress(next);
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
