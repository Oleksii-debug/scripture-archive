const COPY = {
  uk: { enable: 'Приймати реєстрації на цьому сайті', ownerHelp: 'Список учасників приватний. Відкликання події видаляє її реєстрації. Вимкнення приймання закриває лише нові записи.', title: 'Реєстрація на подію', name: 'Ім’я для організатора (можна псевдонім)', consent: 'Дозволяю організатору цієї події бачити вказане ім’я та дату реєстрації. Запис зберігається до мого скасування, відкликання події або видалення мого акаунта чи акаунта організатора.', submit: 'Зареєструватися', saved: 'Реєстрацію збережено. Вона доступна в розділі «Мої реєстрації».', mine: 'Мої реєстрації', empty: 'Ви ще не зареєструвалися на події.', cancel: 'Скасувати реєстрацію', cancelled: 'Реєстрацію скасовано, ім’я видалено зі списку.', unavailable: 'Подія зараз прихована. Реєстрацію можна скасувати.', export: 'Завантажити мої реєстрації (JSON)', roster: 'Переглянути учасників', more: 'Наступні учасники', rosterTitle: 'Приватний список учасників', date: 'Дата згоди (UTC)', none: 'Учасників ще немає.', end: 'Усі учасники показані.', error: 'Не вдалося виконати дію. Перевірте дані й повторіть спробу.', signin: 'Увійдіть підтвердженим обліковим записом, щоб зареєструватися.', boundary: 'Показуються лише добровільно вказані імена. Електронна пошта й інші дані профілю не передаються організатору.' },
  ru: { enable: 'Принимать регистрации на этом сайте', ownerHelp: 'Список участников приватный. Отзыв события удаляет его регистрации. Отключение приёма закрывает только новые записи.', title: 'Регистрация на событие', name: 'Имя для организатора (можно псевдоним)', consent: 'Разрешаю организатору этого события видеть указанное имя и дату регистрации. Запись хранится до моей отмены, отзыва события или удаления моей учётной записи либо учётной записи организатора.', submit: 'Зарегистрироваться', saved: 'Регистрация сохранена. Она доступна в разделе «Мои регистрации».', mine: 'Мои регистрации', empty: 'Вы ещё не зарегистрировались на события.', cancel: 'Отменить регистрацию', cancelled: 'Регистрация отменена, имя удалено из списка.', unavailable: 'Событие сейчас скрыто. Регистрацию можно отменить.', export: 'Скачать мои регистрации (JSON)', roster: 'Посмотреть участников', more: 'Следующие участники', rosterTitle: 'Приватный список участников', date: 'Дата согласия (UTC)', none: 'Участников пока нет.', end: 'Все участники показаны.', error: 'Не удалось выполнить действие. Проверьте данные и повторите попытку.', signin: 'Войдите в подтверждённую учётную запись, чтобы зарегистрироваться.', boundary: 'Показываются только добровольно указанные имена. Электронная почта и другие данные профиля организатору не передаются.' },
  en: { enable: 'Accept registrations on this site', ownerHelp: 'The attendee list is private. Withdrawing the event removes its registrations. Disabling registration only closes new entries.', title: 'Event registration', name: 'Name for the organizer (an alias is allowed)', consent: 'I allow this event’s organizer to see the name entered here and my registration date. The record is kept until I cancel, the event is withdrawn, or my account or the organizer’s account is deleted.', submit: 'Register', saved: 'Registration saved. It is available under My registrations.', mine: 'My registrations', empty: 'You have not registered for any events yet.', cancel: 'Cancel registration', cancelled: 'Registration cancelled and the name removed from the list.', unavailable: 'This event is currently hidden. You can cancel your registration.', export: 'Download my registrations (JSON)', roster: 'View attendees', more: 'Next attendees', rosterTitle: 'Private attendee list', date: 'Consent date (UTC)', none: 'No attendees yet.', end: 'All attendees are shown.', error: 'The action could not be completed. Check the details and try again.', signin: 'Sign in with a verified account to register.', boundary: 'Only voluntarily supplied names are shown. Email addresses and other profile details are not shared with the organizer.' },
};
const copy = lang => Object.hasOwn(COPY, lang) ? COPY[lang] : COPY.uk;
const id = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(value);
const stamp = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value);
const visible=(value,min,max)=>typeof value==='string'&&value.trim()===value&&value.length>=min&&value.length<=max&&!/[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}\u00a0\u034f\u115f\u1160\u2800\u3164\uffa0]/u.test(value);
const date=value=>{if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const parsed=new Date(value+'T00:00:00.000Z');return Number.isFinite(parsed.valueOf())&&parsed.toISOString().slice(0,10)===value;};
const valid = item => item && id(item.id) && visible(item.attendeeName,2,120) && stamp(item.consentAt);
async function api(parameters, body) {
  const response = await fetch('/api/event-registrations' + (parameters ? '?' + new URLSearchParams(parameters) : ''),
    body ? {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)} : undefined);
  const data = await response.json();
  if (!response.ok || (body && data?.ok !== true)) throw Error('registration unavailable');
  return data;
}
export function registrationSettings(lang, esc) {
  const w=copy(lang);
  return `<label class="account-check"><input name="registrationEnabled" type="checkbox"><span>${esc(w.enable)}</span></label><p>${esc(w.ownerHelp)}</p>`;
}
export function registrationForm(item, lang, esc, eligible) {
  if (!item.registrationEnabled) return '';
  const w=copy(lang);
  if (!eligible) return `<p><a href="/account">${esc(w.signin)}</a></p>`;
  return `<form class="event-registration" data-event="${esc(item.id)}"><fieldset><legend>${esc(w.title)}: ${esc(item.title)}</legend><p>${esc(w.boundary)}</p><label class="account-field"><span>${esc(w.name)}</span><input name="attendeeName" minlength="2" maxlength="120" required autocomplete="off"></label><label class="account-check"><input name="sharingConsent" type="checkbox" required><span>${esc(w.consent)}</span></label><button class="button" type="submit">${esc(w.submit)}</button><p role="status"></p></fieldset></form>`;
}
export function rosterControl(item, lang, esc) {
  if (item.status !== 'active') return '';
  return `<button class="button event-roster" type="button" data-event="${esc(item.id)}">${esc(copy(lang).roster)}</button><div class="event-roster-result"></div>`;
}
export function registrationExport(items) {
  return JSON.stringify({ version:1, registrations:items.map(item=>({
    eventId:item.eventId,title:item.title,startsOn:item.startsOn,endsOn:item.endsOn,
    attendeeName:item.attendeeName,consentAt:item.consentAt,available:item.available,
  })) },null,2);
}
export function createEventRegistrations(root, lang, esc, eligible, active) {
  const w=copy(lang), mine=root.querySelector('.event-attendance'), busy=new WeakSet();
  let epoch=0,rosterEpoch=0;
  const live=node=>active()&&node?.isConnected!==false;
  async function loadMine(message='') {
    if (!eligible || !mine || !active()) return;
    const token=++epoch;
    try {
      const data=await api({view:'mine'});
      if (!active() || token!==epoch) return;
      if (!Array.isArray(data.items) || data.items.length>100 || !data.items.every(item=>valid(item)&&id(item.eventId)&&visible(item.title,3,160)&&date(item.startsOn)&&date(item.endsOn)&&item.endsOn>=item.startsOn&&typeof item.available==='boolean')) throw Error('invalid records');
      mine.innerHTML=`<section class="card"><h2>${esc(w.mine)}</h2><p class="event-attendance-status" role="status" tabindex="-1">${esc(message)}</p>${data.items.length ? `<ul>${data.items.map(item=>`<li><h3>${esc(item.title)}</h3><p>${esc(item.startsOn)} — ${esc(item.endsOn)}</p><p>${esc(w.name)}: ${esc(item.attendeeName)}</p>${item.available?'':`<p>${esc(w.unavailable)}</p>`}<button class="button event-registration-cancel" type="button" data-event="${esc(item.eventId)}">${esc(w.cancel)}</button></li>`).join('')}</ul><button class="button event-registration-export" type="button">${esc(w.export)}</button>` : `<p>${esc(w.empty)}</p>`}</section>`;
      mine.querySelectorAll('.event-registration-cancel').forEach(button=>button.onclick=async()=>{
        if (!live(button)||busy.has(button)) return;
        busy.add(button);button.setAttribute('aria-disabled','true');
        try {
          await api(null,{action:'cancel',eventId:button.dataset.event});
          if(!live(button))return;
          const focus=root.ownerDocument?.activeElement===button;
          resetRosters();
          await loadMine(w.cancelled);
          if(active()&&focus&&root.ownerDocument?.activeElement===root.ownerDocument?.body)mine.querySelector('.event-attendance-status')?.focus();
        }catch{if(live(button))mine.querySelector('.event-attendance-status').textContent=w.error;}
        finally{busy.delete(button);button.removeAttribute('aria-disabled');}
      });
      const download=mine.querySelector('.event-registration-export');
      if(download)download.onclick=()=>{
        if(!live(download))return;
        const url=URL.createObjectURL(new Blob([registrationExport(data.items)],{type:'application/json;charset=utf-8'}));
        const link=root.ownerDocument.createElement('a');link.href=url;link.download='scripture-event-registrations.json';link.click();
        setTimeout(()=>URL.revokeObjectURL(url),1000);
      };
    }catch{if(active()&&token===epoch)mine.innerHTML=`<p role="alert">${esc(w.error)}</p>`;}
  }
  function attachForms() {
    if(!eligible)return;
    root.querySelectorAll('.event-registration').forEach(form=>form.onsubmit=async event=>{
      event.preventDefault();if(!live(form)||busy.has(form))return;
      const data=new FormData(form),button=form.querySelector('button'),feedback=form.querySelector('[role="status"]');
      busy.add(form);button.setAttribute('aria-disabled','true');
      try {
        await api(null,{action:'register',eventId:form.dataset.event,attendeeName:data.get('attendeeName'),sharingConsent:data.has('sharingConsent')});
        if(live(form)){feedback.textContent=w.saved;resetRosters();await loadMine();}
      }catch{if(live(form))feedback.textContent=w.error;}
      finally{busy.delete(form);button.removeAttribute('aria-disabled');}
    });
  }
  function resetRosters() {
    root.querySelectorAll('.event-roster-result').forEach(target=>{target.innerHTML='';});
    root.querySelectorAll('.event-roster').forEach(button=>{button.hidden=false;button.textContent=w.roster;});
    attachRosters();
  }
  function attachRosters() {
    const version=++rosterEpoch;
    root.querySelectorAll('.event-roster').forEach(button=>{
      let cursor=null,loaded=false;
      const seen=new Set(),items=[];
      button.onclick=async()=>{
        if(!live(button)||version!==rosterEpoch||busy.has(button)||(loaded&&!cursor))return;
        busy.add(button);button.setAttribute('aria-disabled','true');
        const target=button.closest('article').querySelector('.event-roster-result');
        try{
          const data=await api({view:'roster',eventId:button.dataset.event,...(cursor?{after:cursor}:{})});
          if(!live(button)||version!==rosterEpoch)return;
          if(!Array.isArray(data.items)||data.items.length>100||!data.items.every(valid)||
            (data.nextCursor!==null&&(!id(data.nextCursor)||seen.has(data.nextCursor))))throw Error('invalid roster');
          const existing=new Set(items.map(item=>item.id));
          items.push(...data.items.filter(item=>!existing.has(item.id)));
          cursor=data.nextCursor;if(cursor)seen.add(cursor);loaded=true;
          target.innerHTML=`<h4 tabindex="-1">${esc(w.rosterTitle)}</h4><p>${esc(w.boundary)}</p>${items.length?`<table><thead><tr><th scope="col">${esc(w.name)}</th><th scope="col">${esc(w.date)}</th></tr></thead><tbody>${items.map(item=>`<tr><td>${esc(item.attendeeName)}</td><td>${esc(item.consentAt)}</td></tr>`).join('')}</tbody></table>`:`<p>${esc(w.none)}</p>`}${cursor?'':`<p>${esc(w.end)}</p>`}`;
          if(root.ownerDocument?.activeElement===button)target.querySelector('h4')?.focus();
          button.textContent=cursor?w.more:w.roster;button.hidden=!cursor;
        }catch{if(live(button)&&version===rosterEpoch)target.innerHTML=`<p role="alert">${esc(w.error)}</p>`;}
        finally{busy.delete(button);button.removeAttribute('aria-disabled');}
      };
    });
  }
  return {loadMine,attachForms,attachRosters};
}
