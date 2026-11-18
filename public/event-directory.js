import { eventTeamControl, mountEventTeams } from './event-teams.js';
import { eventMaterialsControl, mountEventMaterials } from './event-materials.js';
import { registrationSettings, registrationForm, rosterControl, createEventRegistrations } from './event-registration.js';
import { validateProgramme } from './event-programme.js';
import { programmeMarkup, programmeEditorMarkup, mountProgrammeEditor } from './event-programme-ui.js';
const COPY={
  uk:{title:'Перевірені події та конференції',lead:'Події тут публікують лише підтверджені представники вже перевірених церков і громад.',honesty:'Реєстрація добровільна. Організатор бачить лише вказане для події ім’я та дату згоди. Платежі тут не збираються. За зовнішні посилання відповідає організатор.',search:'Пошук за подією, церквою, містом або країною',find:'Знайти',empty:'Майбутніх перевірених подій не знайдено.',dates:'Дати',access:'Доступність',programme:'Програма',registration:'Зовнішня реєстрація',form:'Опублікувати подію від перевіреної громади',help:'Подію буде видно, доки чинна версія заявки представника схвалена. Після схвалення виправленої заявки перевірте й опублікуйте подію знову. Опишіть доступність місця або онлайн-формату.',titleField:'Назва події',summary:'Короткий опис',city:'Місто',country:'Код країни (2 літери)',locale:'Мова',start:'Дата початку',end:'Дата завершення',accessDetails:'Умови доступності',programmeUrl:'HTTPS-посилання на програму (необов’язково)',registrationUrl:'HTTPS-посилання організатора (необов’язково)',authority:'Я підтверджую право публікувати цю подію від імені громади.',consent:'Я дозволяю опублікувати ці поля й зовнішні посилання.',submit:'Опублікувати',saved:'Подію збережено.',mine:'Мої події',active:'Опубліковано',hidden:'Приховано після зміни заявки представника',republish:'Перевірити й опублікувати знову',withdrawn:'Відкликано',edit:'Виправити',withdraw:'Відкликати',churchRequired:'Спочатку подайте заявку представника церкви та дочекайтеся її схвалення.',signin:'Увійдіть підтвердженим обліковим записом.',error:'Не вдалося виконати дію. Перевірте дані й спробуйте ще раз.',languages:{uk:'Українська',ru:'Російська',en:'Англійська'}},
  ru:{title:'Проверенные события и конференции',lead:'События здесь публикуют только подтверждённые представители уже проверенных церквей и общин.',honesty:'Регистрация добровольная. Организатор видит только указанное для события имя и дату согласия. Платежи здесь не собираются. За внешние ссылки отвечает организатор.',search:'Поиск по событию, церкви, городу или стране',find:'Найти',empty:'Будущих проверенных событий не найдено.',dates:'Даты',access:'Доступность',programme:'Программа',registration:'Внешняя регистрация',form:'Опубликовать событие проверенной общины',help:'Событие видно, пока текущая версия заявки представителя одобрена. После одобрения исправленной заявки проверьте и опубликуйте событие снова. Опишите доступность места или онлайн-формата.',titleField:'Название события',summary:'Краткое описание',city:'Город',country:'Код страны (2 буквы)',locale:'Язык',start:'Дата начала',end:'Дата окончания',accessDetails:'Условия доступности',programmeUrl:'HTTPS-ссылка на программу (необязательно)',registrationUrl:'HTTPS-ссылка организатора (необязательно)',authority:'Я подтверждаю право публиковать это событие от имени общины.',consent:'Я разрешаю опубликовать эти поля и внешние ссылки.',submit:'Опубликовать',saved:'Событие сохранено.',mine:'Мои события',active:'Опубликовано',hidden:'Скрыто после изменения заявки представителя',republish:'Проверить и опубликовать снова',withdrawn:'Отозвано',edit:'Исправить',withdraw:'Отозвать',churchRequired:'Сначала подайте заявку представителя церкви и дождитесь её одобрения.',signin:'Войдите в подтверждённую учётную запись.',error:'Не удалось выполнить действие. Проверьте данные и попробуйте снова.',languages:{uk:'Украинский',ru:'Русский',en:'Английский'}},
  en:{title:'Verified events and conferences',lead:'Only representatives of already verified churches and communities may publish events here.',honesty:'Registration is voluntary. The organizer sees only the name supplied for the event and the consent date. Payments are not collected here. The organizer is responsible for external links.',search:'Search by event, church, city, or country',find:'Search',empty:'No upcoming verified events were found.',dates:'Dates',access:'Accessibility',programme:'Programme',registration:'External registration',form:'Publish an event for a verified community',help:'The event remains visible while the current version of your representative claim is approved. After a corrected claim is approved, review and republish the event. Describe venue or online-format accessibility.',titleField:'Event title',summary:'Short description',city:'City',country:'Country code (2 letters)',locale:'Language',start:'Start date',end:'End date',accessDetails:'Accessibility information',programmeUrl:'HTTPS programme link (optional)',registrationUrl:'Organizer HTTPS registration link (optional)',authority:'I confirm that I am authorized to publish this event for the community.',consent:'I consent to publication of these fields and external links.',submit:'Publish',saved:'The event was saved.',mine:'My events',active:'Published',hidden:'Hidden after the representative claim changed',republish:'Review and republish',withdrawn:'Withdrawn',edit:'Correct',withdraw:'Withdraw',churchRequired:'Submit a church representative claim and wait for its approval first.',signin:'Sign in with a verified account.',error:'The action could not be completed. Check the details and try again.',languages:{uk:'Ukrainian',ru:'Russian',en:'English'}},
};
const copy=lang=>typeof lang==='string'&&Object.hasOwn(COPY,lang)?COPY[lang]:COPY.uk;
const PAGE_COPY = {
  uk: { more: 'Продовжити пошук', emptyPage: 'У цій частині збігів немає. Пошук можна продовжити.', end: 'Більше збігів немає.', heading: 'Результати, сторінка', found: n => `Подій на цій сторінці: ${n}.` },
  ru: { more: 'Продолжить поиск', emptyPage: 'В этой части совпадений нет. Поиск можно продолжить.', end: 'Больше совпадений нет.', heading: 'Результаты, страница', found: n => `Событий на этой странице: ${n}.` },
  en: { more: 'Continue search', emptyPage: 'No matches in this part. You can continue searching.', end: 'No more matches.', heading: 'Results, page', found: n => `Events on this page: ${n}.` },
};
const visible=(value,min,max)=>typeof value==='string'&&value.trim()===value&&value.length>=min&&value.length<=max&&!/[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}\u00a0\u034f\u115f\u1160\u2800\u3164\uffa0]/u.test(value);
const date=value=>{if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const parsed=new Date(value+'T00:00:00.000Z');return Number.isFinite(parsed.valueOf())&&parsed.toISOString().slice(0,10)===value;};
const timestamp=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value);
const https=value=>{try{if(typeof value!=='string'||value.length<9||value.length>500||value.trim()!==value||!/^https:\/\//i.test(value)||/[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}\s]/u.test(value))return null;const authority=value.slice(value.indexOf('://')+3).split(/[/?#]/u,1)[0];if(!authority||authority.includes('@'))return null;const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}catch{return null;}};
const valid=(item, mine=false)=>item&&typeof item==='object'&&!Array.isArray(item)&&typeof item.id==='string'&&item.id.length>0&&item.id.length<=100&&typeof item.churchId==='string'&&((mine&&item.churchName===null)||visible(item.churchName,3,160))&&visible(item.title,3,160)&&visible(item.summary,3,500)&&visible(item.city,2,120)&&/^[A-Z]{2}$/.test(item.countryCode)&&['uk','ru','en'].includes(item.locale)&&date(item.startsOn)&&date(item.endsOn)&&item.endsOn>=item.startsOn&&visible(item.accessibilityDetails,3,500)&&(item.programmeUrl===null||https(item.programmeUrl))&&(item.registrationUrl===null||https(item.registrationUrl))&&(item.status==='active'||(mine&&['hidden','withdrawn'].includes(item.status)))&&(item.registrationEnabled===undefined||typeof item.registrationEnabled==='boolean')&&timestamp(item.createdAt)&&timestamp(item.updatedAt)&&Boolean((item.programme===undefined&&item.timeZone===undefined)||validateProgramme(item.programme,item.timeZone,item.startsOn,item.endsOn));
async function api(path,options){const response=await fetch(path,options);const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.error||String(response.status));return data;}
const post=async body=>{
  const data=await api('/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(data?.ok!==true || (body.action==='submit' && (typeof data.id!=='string' || !data.id || data.id.length>100 || (body.id && data.id!==body.id))))throw Error('unconfirmed event change');
  return data;
};
const ACTION_COPY={
  uk:{withdrawn:'Подію відкликано.',refreshError:'Дію збережено, але оновити списки не вдалося. Перезавантажте сторінку.'},
  ru:{withdrawn:'Событие отозвано.',refreshError:'Действие сохранено, но списки не удалось обновить. Перезагрузите страницу.'},
  en:{withdrawn:'The event was withdrawn.',refreshError:'The change was saved, but the lists could not be refreshed. Reload the page.'},
};
const cards=(items,w,esc,lang,eligible)=>`<div class="card-grid event-directory-results">${items.map(item=>`<article class="card"><h3 lang="${esc(item.locale)}">${esc(item.title)}</h3><p><a href="/churches/${esc(encodeURIComponent(item.churchId))}">${esc(item.churchName)}</a> · ${esc(item.city)}, ${esc(item.countryCode)}</p><p>${esc(item.summary)}</p><dl><dt>${esc(w.dates)}</dt><dd><time datetime="${esc(item.startsOn)}">${esc(item.startsOn)}</time> — <time datetime="${esc(item.endsOn)}">${esc(item.endsOn)}</time></dd><dt>${esc(w.access)}</dt><dd>${esc(item.accessibilityDetails)}</dd></dl>${programmeMarkup(item,lang,esc)}${item.programmeUrl?`<a href="${esc(https(item.programmeUrl))}" rel="noreferrer">${esc(w.programme)}</a>`:''}${item.registrationUrl?` <a href="${esc(https(item.registrationUrl))}" rel="noreferrer">${esc(w.registration)}</a>`:''}${registrationForm(item,lang,esc,eligible)}${eventMaterialsControl(item,lang,esc)}${eligible?eventTeamControl(item,lang,esc):''}</article>`).join('')}</div>`;
function eventForm(church,w,esc,lang){const languages=['uk','ru','en'].map(value=>`<option value="${value}">${esc(w.languages[value])}</option>`).join('');return `<section class="card event-organizer"><h2>${esc(w.form)}</h2><p>${esc(w.help)}</p><p><strong>${esc(church.name)}</strong></p><form class="event-form"><input type="hidden" name="id"><label class="account-field"><span>${esc(w.titleField)}</span><input name="title" minlength="3" maxlength="160" required></label><label class="account-field"><span>${esc(w.summary)}</span><textarea name="summary" minlength="3" maxlength="500" required></textarea></label><label class="account-field"><span>${esc(w.city)}</span><input name="city" minlength="2" maxlength="120" required></label><label class="account-field"><span>${esc(w.country)}</span><input name="countryCode" minlength="2" maxlength="2" pattern="[A-Za-z]{2}" required></label><label class="account-field"><span>${esc(w.locale)}</span><select name="locale">${languages}</select></label><label class="account-field"><span>${esc(w.start)}</span><input name="startsOn" type="date" required></label><label class="account-field"><span>${esc(w.end)}</span><input name="endsOn" type="date" required></label><label class="account-field"><span>${esc(w.accessDetails)}</span><textarea name="accessibilityDetails" minlength="3" maxlength="500" required></textarea></label><label class="account-field"><span>${esc(w.programmeUrl)}</span><input name="programmeUrl" type="url" maxlength="500" placeholder="https://"></label><label class="account-field"><span>${esc(w.registrationUrl)}</span><input name="registrationUrl" type="url" maxlength="500" placeholder="https://"></label>${programmeEditorMarkup(lang,esc)}${registrationSettings(lang,esc)}<label class="account-check"><input name="authority" type="checkbox" required><span>${esc(w.authority)}</span></label><label class="account-check"><input name="consent" type="checkbox" required><span>${esc(w.consent)}</span></label><button class="button" type="submit">${esc(w.submit)}</button><p class="event-form-status" role="status"></p></form></section>`;}
function mine(items, w, esc, canEdit, lang, page=1) {
  if (!items.length) return '';
  const entries = items.map(item => {
    const edit = canEdit
      ? `<button class="button event-edit" data-id="${esc(item.id)}" type="button">${esc(item.status==='hidden' ? w.republish : w.edit)}</button>`
      : '';
    const withdraw = item.status==='withdrawn' ? ''
      : `<button class="button event-withdraw" data-id="${esc(item.id)}" type="button">${esc(w.withdraw)}</button>`;
    return `<article><h3 lang="${esc(item.locale)}">${esc(item.title)}</h3><p>${esc(w[item.status])}</p>${edit}${withdraw}${canEdit?rosterControl(item,lang,esc):''}${eventMaterialsControl(item,lang,esc,true)}${eventTeamControl(item,lang,esc,true)}</article>`;
  }).join('');
  return `<section class="card event-mine" aria-labelledby="event-mine-page-${page}"><h2 id="event-mine-page-${page}" tabindex="-1">${esc(w.mine)} · ${page}</h2>${entries}<p role="status"></p></section>`;
}

export function churchEventFilter(search=''){
  const parameters=new URLSearchParams(search);
  if(!parameters.has('churchId'))return '';
  const value=parameters.get('churchId');
  return parameters.getAll('churchId').length===1&&/^[A-Za-z0-9_-]{1,100}$/.test(value)?value:null;
}
const MINE_COPY={
  uk:{more:'Показати наступні мої події',end:'Усі власні події завантажено.',found:n=>`Власних подій на цій сторінці: ${n}.`},
  ru:{more:'Показать следующие мои события',end:'Все собственные события загружены.',found:n=>`Собственных событий на этой странице: ${n}.`},
  en:{more:'Show my next events',end:'All your events have been loaded.',found:n=>`Your events on this page: ${n}.`},
};
const FILTER_COPY={uk:{active:'Події вибраної громади',back:'Сторінка громади',all:'Усі події'},ru:{active:'События выбранной общины',back:'Страница общины',all:'Все события'},en:{active:'Events from the selected community',back:'Community page',all:'All events'}};
export async function renderEventDirectory(root,lang,esc,user,isCurrent=()=>true,churchId=''){
  const w=copy(lang),principal=user?.id??null,canOrganize=user?.emailVerified===true&&user?.authProvider!=='agent';
  const actions=typeof lang==='string'&&Object.hasOwn(ACTION_COPY,lang)?ACTION_COPY[lang]:ACTION_COPY.uk;
  const mineCopy=Object.hasOwn(MINE_COPY,lang)?MINE_COPY[lang]:MINE_COPY.uk;
  const pages = typeof lang==='string' && Object.hasOwn(PAGE_COPY,lang) ? PAGE_COPY[lang] : PAGE_COPY.uk;
  const active=()=>{try{return root?.isConnected!==false&&isCurrent()===true&&(user?.id??null)===principal;}catch{return false;}};
  if(!active())return;
  const filterCopy=typeof lang==='string'&&Object.hasOwn(FILTER_COPY,lang)?FILTER_COPY[lang]:FILTER_COPY.uk;
  if(typeof churchId!=='string'||(churchId&&!/^[A-Za-z0-9_-]{1,100}$/.test(churchId))){root.innerHTML=`<h1>${esc(w.title)}</h1><p role="alert">${esc(w.error)}</p><a href="/events">${esc(filterCopy.all)}</a>`;return;}
  const filterMarkup=churchId?`<p>${esc(filterCopy.active)} · <a href="/churches/${esc(churchId)}">${esc(filterCopy.back)}</a> · <a href="/events">${esc(filterCopy.all)}</a></p>`:'';
  root.innerHTML=`<section class="event-directory" aria-labelledby="event-directory-title"><div class="section-head"><div><p class="eyebrow">Scripture Archive</p><h1 id="event-directory-title">${esc(w.title)}</h1></div></div>${filterMarkup}<p class="lead">${esc(w.lead)}</p><p>${esc(w.honesty)}</p><form class="event-search"><label class="account-field"><span>${esc(w.search)}</span><input name="query" type="search" maxlength="80"></label><button class="button" type="submit">${esc(w.find)}</button></form><p class="event-status" role="status" tabindex="-1"></p><div class="event-public"></div><button class="button event-more" type="button" hidden>${esc(pages.more)}</button><div class="event-attendance"></div><p class="event-action-status" role="status" tabindex="-1"></p><div class="event-private">${canOrganize?'':`<p><a href="/account">${esc(w.signin)}</a></p>`}</div><div class="event-mine-continuation"></div><p class="event-mine-status" role="status" tabindex="-1"></p><button class="button event-mine-more" type="button" hidden>${esc(mineCopy.more)}</button></section>`;
  const search=root.querySelector('.event-search'),query=search?.querySelector('input'),publicRoot=root.querySelector('.event-public'),privateRoot=root.querySelector('.event-private'),status=root.querySelector('.event-status');
  const registrations=createEventRegistrations(root,lang,esc,canOrganize,active);
  const more = root.querySelector('.event-more'), seenCursors = new Set(), listed = new Set();
  const actionStatus=root.querySelector('.event-action-status')||status;
  const mineMore=root.querySelector('.event-mine-more'),mineContinuation=root.querySelector('.event-mine-continuation');
  const mineStatus=root.querySelector('.event-mine-status')||actionStatus,privateCursors=new Set();
  let mutationPending=false,privateEpoch=0,privateLoading=false,privateCursor=null,privatePage=0,organizerChurch=null;
  let epoch=0, owned=[], nextCursor=null, activeQuery='', page=0, loading=false;
  function cursorKey(cursor) {
    return JSON.stringify([cursor.startsOn, cursor.title, cursor.id]);
  }
  async function publicLoad(text=activeQuery, cursor=null) {
    const token=++epoch;
    const hadFocus = Boolean(cursor && more && root.ownerDocument?.activeElement===more);
    // Keep the button focusable during the read. Disabling a focused native
    // button can move focus to the document body before results arrive.
    loading=true;
    status.textContent='';
    if (!cursor) {
      activeQuery=text;
      nextCursor=null;
      page=0;
      seenCursors.clear();
      listed.clear();
      publicRoot.innerHTML='';
      if (more) more.hidden=true;
    }
    const parameters=new URLSearchParams({q:text});
    if(churchId)parameters.set('churchId',churchId);
    if (cursor) {
      parameters.set('afterDate',cursor.startsOn);
      parameters.set('afterTitle',cursor.title);
      parameters.set('afterId',cursor.id);
    }
    try {
      const data=await api('/api/events?'+parameters);
      if (!active() || token!==epoch) return;
      const continuation=data.nextCursor??null;
      if (!Array.isArray(data.items) || data.items.length>200 || !data.items.every(item=>valid(item)&&(!churchId||item.churchId===churchId)) ||
          (continuation!==null && (!date(continuation.startsOn) || !visible(continuation.title,3,160) ||
            typeof continuation.id!=='string' || !continuation.id || continuation.id.length>100 ||
            seenCursors.has(cursorKey(continuation))))) throw Error('invalid events');
      nextCursor=continuation;
      if (nextCursor) seenCursors.add(cursorKey(nextCursor));
      const entries=data.items.filter(item=>{
        if (listed.has(item.id)) return false;
        listed.add(item.id);
        return true;
      });
      page++;
      const headingId=`event-page-${page}`;
      const emptyMessage=nextCursor ? pages.emptyPage : page===1 ? w.empty : pages.end;
      const content=entries.length ? cards(entries,w,esc,lang,canOrganize) : `<p>${esc(emptyMessage)}</p>`;
      const section=`<section aria-labelledby="${headingId}"><h2 id="${headingId}" tabindex="-1">${esc(pages.heading)} ${page}</h2>${content}</section>`;
      if (!cursor) publicRoot.innerHTML=section;
      else publicRoot.insertAdjacentHTML('beforeend',section);
      registrations.attachForms();
      mountEventMaterials(root,lang,esc,active);mountEventTeams(root,lang,esc,active);
      status.textContent=entries.length ? pages.found(entries.length) : emptyMessage;
      const restoreFocus=hadFocus && root.ownerDocument?.activeElement===more;
      if (more) more.hidden=!nextCursor;
      if (restoreFocus) publicRoot.querySelector(`#${headingId}`)?.focus();
      return true;
    } catch {
      if (active() && token===epoch) status.textContent=w.error;
      return false;
    } finally {
      if (token===epoch) loading=false;
    }
  }
  if (more) more.onclick=()=>{
    if (active() && !loading && nextCursor) void publicLoad(activeQuery,nextCursor);
  };
  async function privateLoad(cursor=null){
    if(!canOrganize||!active()||(cursor&&(privateLoading||mutationPending)))return false;
    const token=++privateEpoch,hadFocus=Boolean(cursor&&mineMore&&root.ownerDocument?.activeElement===mineMore);
    privateLoading=true;mineMore?.setAttribute('aria-disabled','true');mineStatus.textContent='';
    if(!cursor){
      privateCursor=null;privatePage=0;privateCursors.clear();
      if(mineMore)mineMore.hidden=true;
      if(mineContinuation)mineContinuation.innerHTML='';
    }
    const parameters=new URLSearchParams({view:'mine'});
    if(cursor){parameters.set('afterDate',cursor.startsOn);parameters.set('afterId',cursor.id);}
    try{
      const [churches,events]=await Promise.all([cursor?null:api('/api/churches?view=mine'),api('/api/events?'+parameters)]);
      if(!active()||token!==privateEpoch)return false;
      if(!cursor&&(!Array.isArray(churches.items)||churches.items.length>1))throw Error('invalid church');
      const continuation=events.nextCursor??null,last=events.items?.at?.(-1);
      if(!Array.isArray(events.items)||events.items.length>50||!events.items.every(item=>valid(item,true))||
        (continuation!==null&&(!date(continuation.startsOn)||typeof continuation.id!=='string'||!continuation.id||continuation.id.length>100||
          events.items.length!==50||last.startsOn!==continuation.startsOn||last.id!==continuation.id||
          privateCursors.has(JSON.stringify([continuation.startsOn,continuation.id])))))throw Error('invalid private events');
      if(!cursor){owned=[];organizerChurch=churches.items.find(item=>item?.status==='approved');}
      const ids=new Set(owned.map(item=>item.id)),entries=events.items.filter(item=>{if(ids.has(item.id))return false;ids.add(item.id);return true;});
      owned.push(...entries);privatePage++;privateCursor=continuation;
      if(continuation)privateCursors.add(JSON.stringify([continuation.startsOn,continuation.id]));
      const content=mine(entries,w,esc,Boolean(organizerChurch),lang,privatePage);
      if(!cursor){
        const organizer=organizerChurch?eventForm(organizerChurch,w,esc,lang):`<p><a href="/churches">${esc(w.churchRequired)}</a></p>`;
        privateRoot.innerHTML=organizer+content;
      }else mineContinuation.insertAdjacentHTML('beforeend',content);
      attach(organizerChurch);registrations.attachRosters();mountEventMaterials(root,lang,esc,active);mountEventTeams(root,lang,esc,active);
      mineStatus.textContent=entries.length?mineCopy.found(entries.length):mineCopy.end;
      const restoreFocus=hadFocus&&root.ownerDocument?.activeElement===mineMore;
      if(mineMore)mineMore.hidden=!privateCursor;
      if(restoreFocus)
        (mineContinuation?.querySelector(`#event-mine-page-${privatePage}`)||mineStatus).focus?.();
      return true;
    }catch{
      if(active()&&token===privateEpoch){
        mineStatus.textContent=w.error;
        if(!cursor){owned=[];privateRoot.innerHTML=`<p role="alert">${esc(w.error)}</p>`;}
      }
      return false;
    }finally{
      if(token===privateEpoch){privateLoading=false;mineMore?.removeAttribute('aria-disabled');}
    }
  }
  if(mineMore)mineMore.onclick=()=>{
    if(active()&&!privateLoading&&!mutationPending&&privateCursor)return privateLoad(privateCursor);
  };
  async function mutate(body,button,message,formFeedback=null){
    if(!active()||mutationPending)return;
    mutationPending=true;privateEpoch++;privateLoading=false;
    const controls=[...new Set([button,...(mineMore?[mineMore]:[]),...root.querySelectorAll('.event-form button[type="submit"], .event-edit, .event-withdraw')])];
    controls.forEach(control=>control.setAttribute('aria-disabled','true'));
    const focused=root.ownerDocument?.activeElement,hadFocus=focused===button;
    const announce=message=>{
      if(!active())return;
      actionStatus.textContent=message;
      const current=root.ownerDocument?.activeElement;
      if(hadFocus&&(current===focused||current===root.ownerDocument?.body))actionStatus.focus?.();
    };
    actionStatus.textContent='';if(formFeedback)formFeedback.textContent='';
    try{
      await post(body);if(!active())return;
      const [publicRefreshed,privateRefreshed]=await Promise.all([publicLoad(),privateLoad(),registrations.loadMine()]);
      announce(publicRefreshed&&privateRefreshed?message:actions.refreshError);
    }catch{
      if(active()&&formFeedback)formFeedback.textContent=w.error;
      announce(w.error);
    }finally{
      mutationPending=false;
      if(active())controls.forEach(control=>control.removeAttribute('aria-disabled'));
    }
  }
  function attach(church){
    const form=root.querySelector('.event-form');
    const programmeEditor=form?mountProgrammeEditor(form,lang,esc,active):null;
    if(form)form.onsubmit=async event=>{
      event.preventDefault();if(!active()||mutationPending)return;
      const data=new FormData(form),button=form.querySelector('button[type="submit"]'),feedback=form.querySelector('.event-form-status');
      await mutate({action:'submit',registrationEnabled:data.has('registrationEnabled'),...programmeEditor.read(),id:data.get('id'),churchId:church.id,title:data.get('title'),summary:data.get('summary'),city:data.get('city'),countryCode:String(data.get('countryCode')||'').toUpperCase(),locale:data.get('locale'),startsOn:data.get('startsOn'),endsOn:data.get('endsOn'),accessibilityDetails:data.get('accessibilityDetails'),programmeUrl:data.get('programmeUrl'),registrationUrl:data.get('registrationUrl'),organizerAuthorityAttested:data.has('authority'),publicationConsent:data.has('consent')},button,w.saved,feedback);
    };
    root.querySelectorAll('.event-edit').forEach(button=>button.onclick=()=>{const item=owned.find(row=>row.id===button.dataset.id);if(!item||!form||!active()||mutationPending)return;for(const name of ['id','title','summary','city','countryCode','locale','startsOn','endsOn','accessibilityDetails','programmeUrl','registrationUrl'])form.elements[name].value=item[name]??'';programmeEditor.fill(item);form.elements.registrationEnabled.checked=item.registrationEnabled===true;form.elements.authority.checked=false;form.elements.consent.checked=false;form.elements.title.focus();});
    root.querySelectorAll('.event-withdraw').forEach(button=>button.onclick=()=>mutate({action:'withdraw',id:button.dataset.id},button,actions.withdrawn));
  }
  if(search)search.onsubmit=event=>{event.preventDefault();if(active())void publicLoad(query.value.trim());};
  await Promise.all([publicLoad(),privateLoad(),registrations.loadMine()]);
}
