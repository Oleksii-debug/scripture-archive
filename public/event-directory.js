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
const valid=(item, mine=false)=>item&&typeof item==='object'&&!Array.isArray(item)&&typeof item.id==='string'&&item.id.length>0&&item.id.length<=100&&typeof item.churchId==='string'&&visible(item.churchName,3,160)&&visible(item.title,3,160)&&visible(item.summary,3,500)&&visible(item.city,2,120)&&/^[A-Z]{2}$/.test(item.countryCode)&&['uk','ru','en'].includes(item.locale)&&date(item.startsOn)&&date(item.endsOn)&&item.endsOn>=item.startsOn&&visible(item.accessibilityDetails,3,500)&&(item.programmeUrl===null||https(item.programmeUrl))&&(item.registrationUrl===null||https(item.registrationUrl))&&(item.status==='active'||(mine&&['hidden','withdrawn'].includes(item.status)))&&(item.registrationEnabled===undefined||typeof item.registrationEnabled==='boolean')&&timestamp(item.createdAt)&&timestamp(item.updatedAt)&&Boolean((item.programme===undefined&&item.timeZone===undefined)||validateProgramme(item.programme,item.timeZone,item.startsOn,item.endsOn));
async function api(path,options){const response=await fetch(path,options);const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.error||String(response.status));return data;}
const post=body=>api('/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
const cards=(items,w,esc,lang,eligible)=>`<div class="card-grid event-directory-results">${items.map(item=>`<article class="card"><h3 lang="${esc(item.locale)}">${esc(item.title)}</h3><p>${esc(item.churchName)} · ${esc(item.city)}, ${esc(item.countryCode)}</p><p>${esc(item.summary)}</p><dl><dt>${esc(w.dates)}</dt><dd><time datetime="${esc(item.startsOn)}">${esc(item.startsOn)}</time> — <time datetime="${esc(item.endsOn)}">${esc(item.endsOn)}</time></dd><dt>${esc(w.access)}</dt><dd>${esc(item.accessibilityDetails)}</dd></dl>${programmeMarkup(item,lang,esc)}${item.programmeUrl?`<a href="${esc(https(item.programmeUrl))}" rel="noreferrer">${esc(w.programme)}</a>`:''}${item.registrationUrl?` <a href="${esc(https(item.registrationUrl))}" rel="noreferrer">${esc(w.registration)}</a>`:''}${registrationForm(item,lang,esc,eligible)}</article>`).join('')}</div>`;
function eventForm(church,w,esc,lang){const languages=['uk','ru','en'].map(value=>`<option value="${value}">${esc(w.languages[value])}</option>`).join('');return `<section class="card event-organizer"><h2>${esc(w.form)}</h2><p>${esc(w.help)}</p><p><strong>${esc(church.name)}</strong></p><form class="event-form"><input type="hidden" name="id"><label class="account-field"><span>${esc(w.titleField)}</span><input name="title" minlength="3" maxlength="160" required></label><label class="account-field"><span>${esc(w.summary)}</span><textarea name="summary" minlength="3" maxlength="500" required></textarea></label><label class="account-field"><span>${esc(w.city)}</span><input name="city" minlength="2" maxlength="120" required></label><label class="account-field"><span>${esc(w.country)}</span><input name="countryCode" minlength="2" maxlength="2" pattern="[A-Za-z]{2}" required></label><label class="account-field"><span>${esc(w.locale)}</span><select name="locale">${languages}</select></label><label class="account-field"><span>${esc(w.start)}</span><input name="startsOn" type="date" required></label><label class="account-field"><span>${esc(w.end)}</span><input name="endsOn" type="date" required></label><label class="account-field"><span>${esc(w.accessDetails)}</span><textarea name="accessibilityDetails" minlength="3" maxlength="500" required></textarea></label><label class="account-field"><span>${esc(w.programmeUrl)}</span><input name="programmeUrl" type="url" maxlength="500" placeholder="https://"></label><label class="account-field"><span>${esc(w.registrationUrl)}</span><input name="registrationUrl" type="url" maxlength="500" placeholder="https://"></label>${programmeEditorMarkup(lang,esc)}${registrationSettings(lang,esc)}<label class="account-check"><input name="authority" type="checkbox" required><span>${esc(w.authority)}</span></label><label class="account-check"><input name="consent" type="checkbox" required><span>${esc(w.consent)}</span></label><button class="button" type="submit">${esc(w.submit)}</button><p class="event-form-status" role="status"></p></form></section>`;}
function mine(items, w, esc, canEdit, lang) {
  if (!items.length) return '';
  const entries = items.map(item => {
    const edit = canEdit
      ? `<button class="button event-edit" data-id="${esc(item.id)}" type="button">${esc(item.status==='hidden' ? w.republish : w.edit)}</button>`
      : '';
    const withdraw = item.status==='withdrawn' ? ''
      : `<button class="button event-withdraw" data-id="${esc(item.id)}" type="button">${esc(w.withdraw)}</button>`;
    return `<article><h3 lang="${esc(item.locale)}">${esc(item.title)}</h3><p>${esc(w[item.status])}</p>${edit}${withdraw}${canEdit?rosterControl(item,lang,esc):''}</article>`;
  }).join('');
  return `<section class="card event-mine"><h2>${esc(w.mine)}</h2>${entries}<p role="status"></p></section>`;
}

export async function renderEventDirectory(root,lang,esc,user,isCurrent=()=>true){
  const w=copy(lang),principal=user?.id??null,canOrganize=user?.emailVerified===true&&user?.authProvider!=='agent';
  const pages = typeof lang==='string' && Object.hasOwn(PAGE_COPY,lang) ? PAGE_COPY[lang] : PAGE_COPY.uk;
  const active=()=>{try{return root?.isConnected!==false&&isCurrent()===true&&(user?.id??null)===principal;}catch{return false;}};
  if(!active())return;
  root.innerHTML=`<section class="event-directory" aria-labelledby="event-directory-title"><div class="section-head"><div><p class="eyebrow">Scripture Archive</p><h1 id="event-directory-title">${esc(w.title)}</h1></div></div><p class="lead">${esc(w.lead)}</p><p>${esc(w.honesty)}</p><form class="event-search"><label class="account-field"><span>${esc(w.search)}</span><input name="query" type="search" maxlength="80"></label><button class="button" type="submit">${esc(w.find)}</button></form><p class="event-status" role="status" tabindex="-1"></p><div class="event-public"></div><button class="button event-more" type="button" hidden>${esc(pages.more)}</button><div class="event-attendance"></div><div class="event-private">${canOrganize?'':`<p><a href="/account">${esc(w.signin)}</a></p>`}</div></section>`;
  const search=root.querySelector('.event-search'),query=search?.querySelector('input'),publicRoot=root.querySelector('.event-public'),privateRoot=root.querySelector('.event-private'),status=root.querySelector('.event-status');
  const registrations=createEventRegistrations(root,lang,esc,canOrganize,active);
  const more = root.querySelector('.event-more'), seenCursors = new Set(), listed = new Set();
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
    if (cursor) {
      parameters.set('afterDate',cursor.startsOn);
      parameters.set('afterTitle',cursor.title);
      parameters.set('afterId',cursor.id);
    }
    try {
      const data=await api('/api/events?'+parameters);
      if (!active() || token!==epoch) return;
      const continuation=data.nextCursor??null;
      if (!Array.isArray(data.items) || data.items.length>200 || !data.items.every(item=>valid(item)) ||
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
      status.textContent=entries.length ? pages.found(entries.length) : emptyMessage;
      const restoreFocus=hadFocus && root.ownerDocument?.activeElement===more;
      if (more) more.hidden=!nextCursor;
      if (restoreFocus) publicRoot.querySelector(`#${headingId}`)?.focus();
    } catch {
      if (active() && token===epoch) status.textContent=w.error;
    } finally {
      if (token===epoch) loading=false;
    }
  }
  if (more) more.onclick=()=>{
    if (active() && !loading && nextCursor) void publicLoad(activeQuery,nextCursor);
  };
  async function privateLoad(){if(!canOrganize||!active())return;try{const [churches,events]=await Promise.all([api('/api/churches?view=mine'),api('/api/events?view=mine')]);if(!active()||!Array.isArray(churches.items)||churches.items.length>1||!Array.isArray(events.items)||events.items.length>200||!events.items.every(item=>valid(item,true)))throw Error('invalid private events');owned=events.items;const church=churches.items.find(item=>item?.status==='approved');const organizer=church?eventForm(church,w,esc,lang):`<p><a href="/churches">${esc(w.churchRequired)}</a></p>`;privateRoot.innerHTML=organizer+mine(owned,w,esc,Boolean(church),lang);attach(church);registrations.attachRosters();}catch{if(active())privateRoot.innerHTML=`<p role="alert">${esc(w.error)}</p>`;}}
  function attach(church){
    const form=root.querySelector('.event-form');
    const programmeEditor=form?mountProgrammeEditor(form,lang,esc,active):null;
    let saving=false;
    if(form)form.onsubmit=async event=>{
      event.preventDefault();
      if(!active()||saving)return;
      const data=new FormData(form),button=form.querySelector('button[type="submit"]'),feedback=form.querySelector('.event-form-status');
      saving=true;button.setAttribute('aria-disabled','true');
      try{
        await post({action:'submit',registrationEnabled:data.has('registrationEnabled'),...programmeEditor.read(),id:data.get('id'),churchId:church.id,title:data.get('title'),summary:data.get('summary'),city:data.get('city'),countryCode:String(data.get('countryCode')||'').toUpperCase(),locale:data.get('locale'),startsOn:data.get('startsOn'),endsOn:data.get('endsOn'),accessibilityDetails:data.get('accessibilityDetails'),programmeUrl:data.get('programmeUrl'),registrationUrl:data.get('registrationUrl'),organizerAuthorityAttested:data.has('authority'),publicationConsent:data.has('consent')});
        if(!active())return;
        const returnFocus=root.ownerDocument?.activeElement===button;
        await Promise.all([publicLoad(),privateLoad(),registrations.loadMine()]);
        if(!active())return;
        status.textContent=w.saved;
        if(returnFocus&&root.ownerDocument?.activeElement===root.ownerDocument?.body)status.focus();
      }catch{
        if(active())feedback.textContent=w.error;
      }finally{
        saving=false;button.removeAttribute('aria-disabled');
      }
    };
    root.querySelectorAll('.event-edit').forEach(button=>button.onclick=()=>{const item=owned.find(row=>row.id===button.dataset.id);if(!item||!form||!active())return;for(const name of ['id','title','summary','city','countryCode','locale','startsOn','endsOn','accessibilityDetails','programmeUrl','registrationUrl'])form.elements[name].value=item[name]??'';programmeEditor.fill(item);form.elements.registrationEnabled.checked=item.registrationEnabled===true;form.elements.authority.checked=false;form.elements.consent.checked=false;form.elements.title.focus();});
    root.querySelectorAll('.event-withdraw').forEach(button=>button.onclick=async()=>{if(!active()||button.disabled)return;button.disabled=true;try{await post({action:'withdraw',id:button.dataset.id});if(active())await Promise.all([publicLoad(),privateLoad(),registrations.loadMine()]);}catch{if(active()){button.disabled=false;privateRoot.querySelector('[role="status"]').textContent=w.error;}}});}
  if(search)search.onsubmit=event=>{event.preventDefault();if(active())void publicLoad(query.value.trim());};
  await Promise.all([publicLoad(),privateLoad(),registrations.loadMine()]);
}
