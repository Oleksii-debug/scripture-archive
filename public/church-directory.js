const COPY={
  uk:{title:'Каталог перевірених церков і громад',lead:'Тут з’являються лише записи, які подав підтверджений представник і окремо схвалив власник Scripture Archive після перевірки повноважень.',honesty:'Порожній каталог означає, що перевірених заявок ще немає. Назви церков з особистих профілів сюди автоматично не потрапляють.',search:'Пошук за назвою, містом, країною або традицією',find:'Знайти',empty:'Перевірених записів не знайдено.',website:'Офіційний сайт',reviewed:'Перевірено',claim:'Подати або виправити заявку представника',claimHelp:'Новий або виправлений запис не публікується до повторної перевірки. Особисті дані заявника не показуються.',name:'Назва церкви або громади',city:'Місто',country:'Код країни (2 літери)',locale:'Основна мова',tradition:'Традиція',optionalWebsite:'Публічний HTTPS-сайт (необов’язково)',represent:'Я підтверджую, що маю право представляти цю громаду.',consent:'Я дозволяю опублікувати наведені дані та сайт після перевірки.',submit:'Передати на перевірку',saved:'Заявку передано на перевірку.',mine:'Моя заявка',pending:'Очікує перевірки',approved:'Опубліковано',rejected:'Потрібні виправлення',withdrawn:'Відкликано',withdraw:'Відкликати заявку',queue:'Заявки на перевірку',claimant:'Контакт заявника (лише для перевірки)',evidence:'Приватний доказ перевірки повноважень',note:'Зауваження заявнику',approve:'Схвалити',reject:'Відхилити',updated:'Рішення збережено.',error:'Не вдалося виконати дію. Перевірте дані й спробуйте ще раз.',signin:'Увійдіть підтвердженим обліковим записом, щоб подати заявку.',languages:{uk:'Українська',ru:'Російська',en:'Англійська'},traditions:{orthodox:'Православна',catholic:'Католицька',protestant:'Протестантська',adventist:'Адвентистська',other:'Інша'}},
  ru:{title:'Каталог проверенных церквей и общин',lead:'Здесь появляются только записи, поданные подтверждённым представителем и отдельно одобренные владельцем Scripture Archive после проверки полномочий.',honesty:'Пустой каталог означает, что проверенных заявок пока нет. Названия церквей из личных профилей сюда автоматически не попадают.',search:'Поиск по названию, городу, стране или традиции',find:'Найти',empty:'Проверенных записей не найдено.',website:'Официальный сайт',reviewed:'Проверено',claim:'Подать или исправить заявку представителя',claimHelp:'Новая или исправленная запись не публикуется до повторной проверки. Личные данные заявителя не показываются.',name:'Название церкви или общины',city:'Город',country:'Код страны (2 буквы)',locale:'Основной язык',tradition:'Традиция',optionalWebsite:'Публичный HTTPS-сайт (необязательно)',represent:'Я подтверждаю, что имею право представлять эту общину.',consent:'Я разрешаю опубликовать указанные данные и сайт после проверки.',submit:'Передать на проверку',saved:'Заявка передана на проверку.',mine:'Моя заявка',pending:'Ожидает проверки',approved:'Опубликовано',rejected:'Нужны исправления',withdrawn:'Отозвано',withdraw:'Отозвать заявку',queue:'Заявки на проверку',claimant:'Контакт заявителя (только для проверки)',evidence:'Приватное доказательство проверки полномочий',note:'Замечание заявителю',approve:'Одобрить',reject:'Отклонить',updated:'Решение сохранено.',error:'Не удалось выполнить действие. Проверьте данные и попробуйте снова.',signin:'Войдите в подтверждённую учётную запись, чтобы подать заявку.',languages:{uk:'Украинский',ru:'Русский',en:'Английский'},traditions:{orthodox:'Православная',catholic:'Католическая',protestant:'Протестантская',adventist:'Адвентистская',other:'Другая'}},
  en:{title:'Verified church and community directory',lead:'Only records submitted by a verified representative and separately approved by the Scripture Archive owner after an authority check appear here.',honesty:'An empty directory means that there are no verified claims yet. Church names from personal profiles are never added automatically.',search:'Search by name, city, country, or tradition',find:'Search',empty:'No verified records were found.',website:'Official website',reviewed:'Verified',claim:'Submit or correct a representative claim',claimHelp:'A new or corrected record stays unpublished until it is verified again. The claimant’s personal details are not displayed.',name:'Church or community name',city:'City',country:'Country code (2 letters)',locale:'Primary language',tradition:'Tradition',optionalWebsite:'Public HTTPS website (optional)',represent:'I confirm that I am authorized to represent this community.',consent:'I consent to publication of the supplied fields and website after verification.',submit:'Send for verification',saved:'The claim was sent for verification.',mine:'My claim',pending:'Awaiting verification',approved:'Published',rejected:'Changes required',withdrawn:'Withdrawn',withdraw:'Withdraw claim',queue:'Claims awaiting verification',claimant:'Claimant contact (verification only)',evidence:'Private evidence of representative authority',note:'Note to claimant',approve:'Approve',reject:'Reject',updated:'The decision was saved.',error:'The action could not be completed. Check the details and try again.',signin:'Sign in with a verified account to submit a claim.',languages:{uk:'Ukrainian',ru:'Russian',en:'English'},traditions:{orthodox:'Orthodox',catholic:'Catholic',protestant:'Protestant',adventist:'Adventist',other:'Other'}},
};
const copy=lang=>typeof lang==='string'&&Object.hasOwn(COPY,lang)?COPY[lang]:COPY.uk;
const PAGE_COPY = {
  uk: { all: 'Усі', more: 'Продовжити пошук', emptyPage: 'У цій частині збігів немає. Пошук можна продовжити.', end: 'Більше збігів немає.', heading: 'Результати, сторінка', found: n => `Громад на цій сторінці: ${n}.` },
  ru: { all: 'Все', more: 'Продолжить поиск', emptyPage: 'В этой части совпадений нет. Поиск можно продолжить.', end: 'Больше совпадений нет.', heading: 'Результаты, страница', found: n => `Общин на этой странице: ${n}.` },
  en: { all: 'All', more: 'Continue search', emptyPage: 'No matches in this part. You can continue searching.', end: 'No more matches.', heading: 'Results, page', found: n => `Communities on this page: ${n}.` },
};
const ACTION_COPY = {
  uk: { edit: 'Виправити цю заявку', loaded: 'Дані завантажено у форму. Перевірте зміни й знову підтвердьте повноваження та згоду.', withdrawn: 'Заявку відкликано.', refreshError: 'Дію збережено, але оновити список не вдалося. Перезавантажте сторінку.' },
  ru: { edit: 'Исправить эту заявку', loaded: 'Данные загружены в форму. Проверьте изменения и снова подтвердите полномочия и согласие.', withdrawn: 'Заявка отозвана.', refreshError: 'Действие сохранено, но список обновить не удалось. Перезагрузите страницу.' },
  en: { edit: 'Correct this claim', loaded: 'The saved fields are in the form. Check your changes and confirm authority and consent again.', withdrawn: 'The claim was withdrawn.', refreshError: 'The change was saved, but the list could not be refreshed. Reload the page.' },
};
const canonicalHttps=value=>{try{if(typeof value!=='string'||value.length<9||value.length>500||value.trim()!==value||!/^(https):\/\//i.test(value)||/[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}\s]/u.test(value))return null;const authority=value.slice(value.indexOf('://')+3).split(/[/?#]/u,1)[0];if(!authority||authority.includes('@'))return null;const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}catch{return null;}};
const visible=(value,min,max)=>typeof value==='string'&&value.trim()===value&&value.length>=min&&value.length<=max&&!/[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}\u00a0\u034f\u115f\u1160\u2800\u3164\uffa0]/u.test(value);
const validId=value=>typeof value==='string'&&value.length>0&&value.length<=100;
const validTimestamp=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value);
const validCore=item=>item&&typeof item==='object'&&!Array.isArray(item)&&validId(item.id)&&visible(item.name,3,160)&&visible(item.city,2,120)&&typeof item.countryCode==='string'&&/^[A-Z]{2}$/.test(item.countryCode)&&['uk','ru','en'].includes(item.locale)&&['orthodox','catholic','protestant','adventist','other'].includes(item.tradition)&&(item.websiteUrl===null||canonicalHttps(item.websiteUrl));
const validPublic=item=>validCore(item)&&validTimestamp(item.reviewedAt);
const validSubmitted=item=>validTimestamp(item.submittedAt);
const validMine=item=>validCore(item)&&validSubmitted(item)&&['pending','approved','rejected','withdrawn'].includes(item.status)&&(item.reviewedAt===null||validTimestamp(item.reviewedAt))&&typeof item.reviewNote==='string'&&item.reviewNote.length<=2000;
const validQueue=item=>validCore(item)&&validSubmitted(item)&&validId(item.claimantId)&&typeof item.claimantEmail==='string'&&item.claimantEmail.length>=3&&item.claimantEmail.length<=320&&item.claimantEmail.trim()===item.claimantEmail&&item.claimantEmail.includes('@')&&!/[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}\s]/u.test(item.claimantEmail)&&item.status==='pending';
async function api(path,options){const response=await fetch(path,options);const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.error||String(response.status));return data;}
const post=async body=>{const data=await api('/api/churches',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(data?.ok!==true)throw Error('unconfirmed change');return data;};

function publicMarkup(items,w,esc){
  return items.length?`<div class="card-grid church-directory-results">${items.map(item=>`<article class="card"><h3 lang="${esc(item.locale)}">${esc(item.name)}</h3><p>${esc(item.city)}, ${esc(item.countryCode)}</p><dl><dt>${esc(w.locale)}</dt><dd>${esc(w.languages[item.locale])}</dd><dt>${esc(w.tradition)}</dt><dd>${esc(w.traditions[item.tradition])}</dd><dt>${esc(w.reviewed)}</dt><dd><time datetime="${esc(item.reviewedAt)}">${esc(item.reviewedAt)} UTC</time></dd></dl>${item.websiteUrl?`<p><a href="${esc(canonicalHttps(item.websiteUrl))}" rel="noreferrer">${esc(w.website)}</a></p>`:''}</article>`).join('')}</div>`:`<p>${esc(w.empty)}</p>`;
}
function claimForm(w,esc){
  const languages=['uk','ru','en'].map(value=>`<option value="${value}">${esc(w.languages[value])}</option>`).join('');
  const traditions=['orthodox','catholic','protestant','adventist','other'].map(value=>`<option value="${value}">${esc(w.traditions[value])}</option>`).join('');
  return `<section class="card"><h2>${esc(w.claim)}</h2><p>${esc(w.claimHelp)}</p><form class="church-claim"><label class="account-field"><span>${esc(w.name)}</span><input name="name" minlength="3" maxlength="160" required></label><label class="account-field"><span>${esc(w.city)}</span><input name="city" minlength="2" maxlength="120" required></label><label class="account-field"><span>${esc(w.country)}</span><input name="countryCode" minlength="2" maxlength="2" pattern="[A-Za-z]{2}" required></label><label class="account-field"><span>${esc(w.locale)}</span><select name="locale">${languages}</select></label><label class="account-field"><span>${esc(w.tradition)}</span><select name="tradition">${traditions}</select></label><label class="account-field"><span>${esc(w.optionalWebsite)}</span><input name="websiteUrl" type="url" maxlength="500" inputmode="url" placeholder="https://"></label><label class="account-check"><input name="represent" type="checkbox" required><span>${esc(w.represent)}</span></label><label class="account-check"><input name="consent" type="checkbox" required><span>${esc(w.consent)}</span></label><button class="button" type="submit">${esc(w.submit)}</button><p role="status"></p></form></section>`;
}
function mineMarkup(items,w,esc,actions){return items.length?`<section class="card church-claim-mine"><h2>${esc(w.mine)}</h2>${items.map(item=>`<article><h3>${esc(item.name)}</h3><p>${esc(item.city)}, ${esc(item.countryCode)} — ${esc(w[item.status]||item.status)}</p>${item.reviewNote?`<p>${esc(item.reviewNote)}</p>`:''}<button class="button church-claim-edit" data-id="${esc(item.id)}" type="button">${esc(actions.edit)}</button>${['pending','approved'].includes(item.status)?`<button class="button church-claim-withdraw" data-id="${esc(item.id)}" type="button">${esc(w.withdraw)}</button>`:''}</article>`).join('')}<p role="status"></p></section>`:'';}
function queueMarkup(items,w,esc){return `<section class="card church-claim-queue"><h2>${esc(w.queue)}</h2>${items.length?items.map(item=>`<article><h3>${esc(item.name)}</h3><p>${esc(item.city)}, ${esc(item.countryCode)} · ${esc(w.languages[item.locale])} · ${esc(w.traditions[item.tradition])}</p><p>${esc(w.claimant)}: <a href="mailto:${esc(item.claimantEmail)}">${esc(item.claimantEmail)}</a></p>${item.websiteUrl?`<p><a href="${esc(canonicalHttps(item.websiteUrl))}" rel="noreferrer">${esc(w.website)}</a></p>`:''}<form class="church-claim-review" data-id="${esc(item.id)}"><label class="account-field"><span>${esc(w.evidence)}</span><textarea name="evidence" minlength="3" maxlength="1000"></textarea></label><label class="account-field"><span>${esc(w.note)}</span><textarea name="note" maxlength="2000"></textarea></label><button class="button" type="button" data-decision="approve">${esc(w.approve)}</button><button class="button" type="button" data-decision="reject">${esc(w.reject)}</button><p role="status"></p></form></article>`).join(''):`<p>${esc(w.empty)}</p>`}</section>`;}

export async function renderChurchDirectory(root,lang,esc,user,isOwner=false,isCurrent=()=>true){
  const w=copy(lang),principal=user?.id??null,canClaim=user?.emailVerified===true&&user?.authProvider!=='agent';
  const actions=typeof lang==='string'&&Object.hasOwn(ACTION_COPY,lang)?ACTION_COPY[lang]:ACTION_COPY.uk;
  const pages=typeof lang==='string'&&Object.hasOwn(PAGE_COPY,lang)?PAGE_COPY[lang]:PAGE_COPY.uk;
  const active=()=>{try{return root?.isConnected!==false&&isCurrent()===true&&(user?.id??null)===principal;}catch{return false;}};
  if(!active())return;
  root.innerHTML=`<section class="church-directory" aria-labelledby="church-directory-title"><div class="section-head"><div><p class="eyebrow">Scripture Archive</p><h1 id="church-directory-title">${esc(w.title)}</h1></div></div><p class="lead">${esc(w.lead)}</p><p>${esc(w.honesty)}</p><form class="church-directory-search"><label class="account-field"><span>${esc(w.search)}</span><input name="query" type="search" maxlength="80"></label><label class="account-field"><span>${esc(w.locale)}</span><select name="locale"><option value="">${esc(pages.all)}</option>${Object.entries(w.languages).map(([id,title])=>`<option value="${id}">${esc(title)}</option>`).join('')}</select></label><label class="account-field"><span>${esc(w.tradition)}</span><select name="tradition"><option value="">${esc(pages.all)}</option>${Object.entries(w.traditions).map(([id,title])=>`<option value="${id}">${esc(title)}</option>`).join('')}</select></label><button class="button" type="submit">${esc(w.find)}</button></form><p class="church-directory-status" role="status"></p><div class="church-directory-public"></div><button class="button church-directory-more" type="button" hidden>${esc(pages.more)}</button>${canClaim?claimForm(w,esc):`<p><a href="/account">${esc(w.signin)}</a></p>`}<p class="church-claim-feedback" role="status" tabindex="-1"></p><div class="church-directory-private"></div>${isOwner?'<div class="church-directory-owner"></div>':''}</section>`;
  const search=root.querySelector('.church-directory-search'),query=search?.querySelector('input'),publicRoot=root.querySelector('.church-directory-public'),status=root.querySelector('.church-directory-status'),privateRoot=root.querySelector('.church-directory-private'),ownerRoot=root.querySelector('.church-directory-owner');
  const more = root.querySelector('.church-directory-more'), seenCursors = new Set(), listed = new Set();
  let epoch=0, nextCursor=null, activeQuery={q:'',locale:'',tradition:''}, page=0, loading=false;
  function cursorKey(cursor) {
    return JSON.stringify([cursor.name, cursor.city, cursor.id]);
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
    const parameters=new URLSearchParams(text);
    if (cursor) {
      parameters.set('afterName',cursor.name);
      parameters.set('afterCity',cursor.city);
      parameters.set('afterId',cursor.id);
    }
    try {
      const data=await api('/api/churches?'+parameters);
      if (!active() || token!==epoch) return;
      const continuation=data.nextCursor??null;
      if (!Array.isArray(data.items) || data.items.length>200 || !data.items.every(validPublic) ||
          (continuation!==null && (!visible(continuation.name,3,160) || !visible(continuation.city,2,120) ||
            typeof continuation.id!=='string' || !continuation.id || continuation.id.length>100 ||
            seenCursors.has(cursorKey(continuation))))) throw Error('invalid churches');
      nextCursor=continuation;
      if (nextCursor) seenCursors.add(cursorKey(nextCursor));
      const entries=data.items.filter(item=>{
        if (listed.has(item.id)) return false;
        listed.add(item.id);
        return true;
      });
      page++;
      const headingId=`church-page-${page}`;
      const emptyMessage=nextCursor ? pages.emptyPage : page===1 ? w.empty : pages.end;
      const content=entries.length ? publicMarkup(entries,w,esc) : `<p>${esc(emptyMessage)}</p>`;
      const section=`<section aria-labelledby="${headingId}"><h2 id="${headingId}" tabindex="-1">${esc(pages.heading)} ${page}</h2>${content}</section>`;
      if (!cursor) publicRoot.innerHTML=section;
      else publicRoot.insertAdjacentHTML('beforeend',section);
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
  let privateEpoch=0, savedClaims=[], mutationPending=false;
  const feedback=root.querySelector('.church-claim-feedback');
  function announce(message, focus=false) {
    if (!active() || !feedback) return;
    feedback.textContent=message;
    if (focus) feedback.focus();
  }
  async function privateLoad(){
    if(!canClaim||!active())return false;
    const token=++privateEpoch;
    try {
      const [mine,queue]=await Promise.all([api('/api/churches?view=mine'),isOwner?api('/api/churches?view=queue'):Promise.resolve({items:[]})]);
      if(!active()||token!==privateEpoch)return false;
      if(!Array.isArray(mine.items)||mine.items.length>1||!mine.items.every(validMine)||!Array.isArray(queue.items)||queue.items.length>200||!queue.items.every(validQueue))throw Error('invalid private claims');
      savedClaims=mine.items;
      privateRoot.innerHTML=mineMarkup(mine.items,w,esc,actions);
      if(ownerRoot)ownerRoot.innerHTML=queueMarkup(queue.items,w,esc);
      attach();
      return true;
    } catch {
      if(active()&&token===privateEpoch){savedClaims=[];privateRoot.innerHTML=`<p role="alert">${esc(w.error)}</p>`;if(ownerRoot)ownerRoot.innerHTML='';}
      return false;
    }
  }
  async function mutate(body,message,resetConsent=false) {
    if(!active()||mutationPending)return;
    mutationPending=true;
    // Retire a private read started before this write, so it cannot restore
    // a withdrawn or superseded claim while the current state is loading.
    privateEpoch++;
    const controls=[...root.querySelectorAll('.church-claim button, .church-claim-withdraw, .church-claim-edit, .church-claim-review button')];
    controls.forEach(button=>{button.disabled=true;});
    const focused=root.ownerDocument?.activeElement;
    const hadFocus=controls.includes(focused);
    announce('');
    try {
      await post(body);
      if(!active())return;
      if(resetConsent){
        const form=root.querySelector('.church-claim');
        for(const name of ['represent','consent']) { const field=form?.querySelector(`[name=${name}]`);if(field)field.checked=false; }
      }
      const [,refreshed]=await Promise.all([publicLoad(),privateLoad()]);
      const current=root.ownerDocument?.activeElement;
      const restoreFocus=hadFocus&&(current===focused||current===root.ownerDocument?.body);
      announce(refreshed?message:actions.refreshError,restoreFocus);
    } catch {
      const current=root.ownerDocument?.activeElement;
      announce(w.error,hadFocus&&(current===focused||current===root.ownerDocument?.body));
    } finally {
      mutationPending=false;
      if(active())controls.forEach(button=>{button.disabled=false;});
    }
  }
  function attach(){
    const form=root.querySelector('.church-claim');
    if(form)form.onsubmit=async event=>{
      event.preventDefault();if(!active()||mutationPending)return;
      const data=new FormData(form);
      await mutate({action:'submit',name:data.get('name'),city:data.get('city'),countryCode:String(data.get('countryCode')||'').toUpperCase(),locale:data.get('locale'),tradition:data.get('tradition'),websiteUrl:data.get('websiteUrl'),representationAttested:data.has('represent'),websiteConsent:data.has('consent')},w.saved,true);
    };
    root.querySelectorAll('.church-claim-edit').forEach(button=>button.onclick=()=>{
      if(!active()||mutationPending||!form)return;
      const item=savedClaims.find(claim=>claim.id===button.dataset.id);
      if(!item)return;
      for(const name of ['name','city','countryCode','locale','tradition','websiteUrl']) {
        const field=form.querySelector(`[name=${name}]`);if(field)field.value=item[name]??'';
      }
      for(const name of ['represent','consent']) { const field=form.querySelector(`[name=${name}]`);if(field)field.checked=false; }
      announce(actions.loaded);
      form.querySelector('[name=name]')?.focus();
    });
    root.querySelectorAll('.church-claim-withdraw').forEach(button=>button.onclick=()=>mutate({action:'withdraw',id:button.dataset.id},actions.withdrawn));
    root.querySelectorAll('.church-claim-review').forEach(form=>form.querySelectorAll('[data-decision]').forEach(button=>button.onclick=()=>{
      if(!active()||mutationPending)return;
      const data=new FormData(form);
      return mutate({action:'review',id:form.dataset.id,decision:button.dataset.decision,verificationEvidence:data.get('evidence'),note:data.get('note')},w.updated);
    }));
  }
  if(search)search.onsubmit=event=>{event.preventDefault();if(active())void publicLoad({q:query.value.trim(),locale:search.querySelector('[name=locale]')?.value||'',tradition:search.querySelector('[name=tradition]')?.value||''});};
  attach();
  await Promise.all([publicLoad(),privateLoad()]);
}
