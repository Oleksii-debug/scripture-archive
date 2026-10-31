const TEXT = {
  uk: {publicTitle:'Перевірені матеріали',empty:'Перевірених матеріалів поки немає.',provenance:'Джерело та права',check:'Перевірити відповідь',correct:'Правильно.',wrong:'Спробуйте ще раз.',answerError:'Не вдалося перевірити відповідь. Спробуйте ще раз.',choiceChanged:'Вибрану відповідь змінено під час перевірки. Натисніть «Перевірити відповідь» ще раз.',submit:'Передати на перевірку',source:'Джерело матеріалу та підстава використання',rights:'Підтверджую право надати цей матеріал для публікації.',send:'Надіслати редактору',sent:'Матеріал передано на перевірку.',history:'Версії та рішення',pending:'Очікує перевірки',approved:'Опубліковано',rejected:'Потрібні виправлення',withdrawn:'Відкликано',superseded:'Замінено новішою версією',withdraw:'Відкликати',queue:'Матеріали на перевірці',noQueue:'Немає матеріалів на перевірці.',sourceChecked:'Я перевірив джерело та біблійне посилання.',rightsChecked:'Я перевірив право публікації.',note:'Зауваження редактора',approve:'Затвердити',reject:'Повернути на виправлення',reviewed:'Рішення збережено.',error:'Не вдалося виконати дію. Перевірте дані та повторіть спробу.',login:'Увійдіть, щоб створювати власні матеріали.',builder:'Конструктор',retry:'Спробувати ще раз'},
  ru: {publicTitle:'Проверенные материалы',empty:'Проверенных материалов пока нет.',provenance:'Источник и права',check:'Проверить ответ',correct:'Правильно.',wrong:'Попробуйте ещё раз.',answerError:'Не удалось проверить ответ. Попробуйте ещё раз.',choiceChanged:'Выбранный ответ изменён во время проверки. Нажмите «Проверить ответ» ещё раз.',submit:'Передать на проверку',source:'Источник материала и основание использования',rights:'Подтверждаю право предоставить материал для публикации.',send:'Отправить редактору',sent:'Материал передан на проверку.',history:'Версии и решения',pending:'Ожидает проверки',approved:'Опубликовано',rejected:'Требует исправлений',withdrawn:'Отозвано',superseded:'Заменено новой версией',withdraw:'Отозвать',queue:'Материалы на проверке',noQueue:'Нет материалов на проверке.',sourceChecked:'Я проверил источник и библейскую ссылку.',rightsChecked:'Я проверил право публикации.',note:'Замечания редактора',approve:'Одобрить',reject:'Вернуть на исправление',reviewed:'Решение сохранено.',error:'Не удалось выполнить действие. Проверьте данные и повторите попытку.',login:'Войдите, чтобы создавать материалы.',builder:'Конструктор',retry:'Повторить'},
  en: {publicTitle:'Reviewed materials',empty:'There are no reviewed materials yet.',provenance:'Source and rights',check:'Check answer',correct:'Correct.',wrong:'Try again.',answerError:'Could not check the answer. Please try again.',choiceChanged:'The selected answer changed while being checked. Select Check answer again.',submit:'Submit for review',source:'Source and basis for use',rights:'I confirm that I may submit this material for publication.',send:'Send to editor',sent:'Material submitted for review.',history:'Versions and decisions',pending:'Awaiting review',approved:'Published',rejected:'Changes requested',withdrawn:'Withdrawn',superseded:'Replaced by a newer version',withdraw:'Withdraw',queue:'Materials awaiting review',noQueue:'No materials await review.',sourceChecked:'I checked the source and Bible reference.',rightsChecked:'I checked the right to publish.',note:'Editor’s notes',approve:'Approve',reject:'Request changes',reviewed:'Decision saved.',error:'Could not complete the action. Check the details and try again.',login:'Sign in to create your own materials.',builder:'Builder',retry:'Try again'},
};
const DELETE_TEXT = {
  uk: {remove:'Видалити матеріал',confirm:'Видалити матеріал і всі його версії? Опубліковані версії також зникнуть.',removed:'Матеріал і його версії видалено.',audit:'Журнал редакційних рішень',author:'Автор',reviewer:'Редактор'},
  ru: {remove:'Удалить материал',confirm:'Удалить материал и все его версии? Опубликованные версии тоже исчезнут.',removed:'Материал и его версии удалены.',audit:'Журнал редакционных решений',author:'Автор',reviewer:'Редактор'},
  en: {remove:'Delete material',confirm:'Delete this material and all its versions? Published versions will also disappear.',removed:'Material and its versions deleted.',audit:'Editorial history',author:'Author',reviewer:'Editor'},
};
const SELF_REVIEW_TEXT = {
  uk: 'Власний матеріал має перевірити інший редактор.',
  ru: 'Собственный материал должен проверить другой редактор.',
  en: 'Your own material must be reviewed by another editor.',
};
const TAKEDOWN_TEXT = {
  uk:{takeDown:'Зняти з публікації',takeDownReason:'Причина зняття з публікації',takeDownSaved:'Матеріал знято з публікації.',takeDownLabel:'Знято з публікації: ',takeDownActor:'Зняв редактор'},
  ru:{takeDown:'Снять с публикации',takeDownReason:'Причина снятия с публикации',takeDownSaved:'Материал снят с публикации.',takeDownLabel:'Снято с публикации: ',takeDownActor:'Снял редактор'},
  en:{takeDown:'Remove from publication',takeDownReason:'Reason for removal',takeDownSaved:'Material removed from publication.',takeDownLabel:'Removed from publication: ',takeDownActor:'Removed by editor'},
};
const RIGHTS_TEXT = {
  uk:{rightsHolder:'Правовласник або статус прав',rightsBasis:'Підстава публікації',licenseUrl:'Публічне HTTPS-посилання на ліцензію (необов’язково)',original:'Оригінальний матеріал правовласника',permission:'Публікація з дозволу',open_license:'Відкрита ліцензія',public_domain:'Суспільне надбання',language:'Мова матеріалу',reviewDate:'Дата редакційної перевірки',legacyRights:'Структуровані відомості про правовласника не були записані для цієї попередньої версії.',licenseLink:'Переглянути ліцензію',rightsConcern:'Повідомити про права на цей матеріал'},
  ru:{rightsHolder:'Правообладатель или статус прав',rightsBasis:'Основание публикации',licenseUrl:'Публичная HTTPS-ссылка на лицензию (необязательно)',original:'Оригинальный материал правообладателя',permission:'Публикация с разрешения',open_license:'Открытая лицензия',public_domain:'Общественное достояние',language:'Язык материала',reviewDate:'Дата редакционной проверки',legacyRights:'Структурированные сведения о правообладателе не были записаны для этой предыдущей версии.',licenseLink:'Открыть лицензию',rightsConcern:'Сообщить о правах на этот материал'},
  en:{rightsHolder:'Rights holder or rights status',rightsBasis:'Publication basis',licenseUrl:'Public HTTPS licence URL (optional)',original:'Rights holder’s original work',permission:'Published with permission',open_license:'Open licence',public_domain:'Public domain',language:'Material language',reviewDate:'Editorial review date',legacyRights:'Structured rights-holder details were not recorded for this earlier version.',licenseLink:'View licence',rightsConcern:'Report a rights concern about this material'},
};
// Language can originate from a document or stored preference. Never read
// inherited Object.prototype keys as translation dictionaries, and never
// coerce untrusted objects to property names. Keep one canonical fallback for
// the public catalogue, editorial actions, permissions and takedown search.
const ownLocaleCopy = (copies, language) =>
  typeof language === 'string' && Object.hasOwn(copies, language)
    ? copies[language]
    : copies.uk;

export function reviewText(lang) {
  return {
    ...ownLocaleCopy(TEXT, lang),
    ...ownLocaleCopy(DELETE_TEXT, lang),
    ...ownLocaleCopy(TAKEDOWN_TEXT, lang),
    ...ownLocaleCopy(RIGHTS_TEXT, lang),
    selfReview: ownLocaleCopy(SELF_REVIEW_TEXT, lang),
  };
}
async function api(path, options) {
  const response = await fetch(path, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || String(response.status));
  return data;
}
const post = body => api('/api/material-review', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});

export function submissionForm(material, w, esc) {
  return `<details><summary>${w.submit}</summary><form class="material-submit" data-id="${esc(material.id)}"><label class="account-field"><span>${w.source}</span><textarea name="provenance" minlength="3" maxlength="1000" required></textarea></label><label class="account-field"><span>${w.rightsHolder}</span><input name="rightsHolder" minlength="2" maxlength="160" required></label><label class="account-field"><span>${w.rightsBasis}</span><select name="rightsBasis" required><option value="original">${w.original}</option><option value="permission">${w.permission}</option><option value="open_license">${w.open_license}</option><option value="public_domain">${w.public_domain}</option></select></label><label class="account-field"><span>${w.licenseUrl}</span><input name="licenseUrl" type="url" maxlength="500" inputmode="url" placeholder="https://"></label><label class="account-check"><input name="rights" type="checkbox" required><span>${w.rights}</span></label><button class="button" type="submit">${w.send}</button><p role="status"></p></form></details>`;
}
const RIGHTS_BASES = new Set(['original','permission','open_license','public_domain']);
function canonicalPublicHttps(value) {
  // A source-link parser canonicalizes raw bidi and invisible characters to
  // percent-encoded text; refuse the original input, just like the server and
  // the primary Bible reader, before any public catalogue HTML is created.
  if(typeof value!=='string'||value.length<9||value.length>500||value.trim()!==value||
     !/^https:\/\//i.test(value)||/[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}\s]/u.test(value))return null;
  const authority=value.slice(value.indexOf('://')+3).split(/[/?#]/u,1)[0];
  if(!authority||authority.includes('@'))return null;
  try {const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;} catch {return null;}
}
function validRightsMetadata(rights) {
  if(rights===null)return true;
  if(!rights||typeof rights!=='object'||Array.isArray(rights)||Object.keys(rights).sort().join(',')!=='basis,holder,licenseUrl'||
     typeof rights.holder!=='string'||rights.holder.trim()!==rights.holder||rights.holder.length<2||rights.holder.length>160||
     /[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}\u00a0\u034f\u115f\u1160\u2800\u3164\uffa0]/u.test(rights.holder)||
     typeof rights.basis!=='string'||!RIGHTS_BASES.has(rights.basis)||
     !(rights.licenseUrl===null||canonicalPublicHttps(rights.licenseUrl)))return false;
  return rights.basis!=='open_license'||rights.licenseUrl!==null;
}
function rightsMetadataMarkup(item,w,esc) {
  if(!validRightsMetadata(item?.rights))return '';
  const context=`<dt>${esc(w.language)}</dt><dd>${esc(item.locale)}</dd><dt>${esc(w.reviewDate)}</dt><dd><time datetime="${esc(item.reviewedAt)}">${esc(item.reviewedAt)} UTC</time></dd>`;
  if(item.rights===null)return `<dl class="material-rights">${context}</dl><p>${esc(w.legacyRights)}</p>`;
  const license=item.rights.licenseUrl?`<dt>${esc(w.licenseUrl)}</dt><dd><a href="${esc(canonicalPublicHttps(item.rights.licenseUrl))}" rel="noreferrer">${esc(w.licenseLink)}</a></dd>`:'';
  return `<dl class="material-rights">${context}<dt>${esc(w.rightsHolder)}</dt><dd>${esc(item.rights.holder)}</dd><dt>${esc(w.rightsBasis)}</dt><dd>${esc(w[item.rights.basis])}</dd>${license}</dl>`;
}
function validPublicMaterial(item) {
  return item && ['id','title','locale','reference','prompt','provenance','reviewedAt'].every(key=>typeof item[key]==='string') &&
    item.id.length>0 && item.id.length<=100 && item.title.length>0 && item.title.length<=160 &&
    ['uk','ru','en'].includes(item.locale) && item.reference.length>0 && item.reference.length<=200 &&
    item.reviewedAt.length>0 && item.reviewedAt.length<=100 && validRightsMetadata(item.rights) && rightsRequestUrl(item)!==null &&
    Array.isArray(item.options) && item.options.length>=2 && item.options.length<=8 &&
    item.options.every(value=>typeof value==='string' && value.length>0 && value.length<=500);
}
function rightsRequestUrl(item) {
  try {
    return `/help?topic=rights&material=${encodeURIComponent(item.id)}&title=${encodeURIComponent(item.title)}`;
  } catch { return null; }
}
export function historyMarkup(items, w, esc) {
  return `<section class="card"><h2>${w.history}</h2>${items.length ? `<ol>${items.map(item=>`<li><strong>${esc(item.snapshot.title)}</strong> — ${esc(w[item.status] || item.status)}${rightsMetadataMarkup({...item,locale:item.snapshot.locale,reviewedAt:item.reviewedAt||item.submittedAt},w,esc)}${item.reviewNote ? `<p>${esc(item.reviewNote)}</p>` : ''}${item.takedownReason ? `<p>${w.takeDownLabel}${esc(item.takedownReason)}</p>` : ''}${['pending','approved'].includes(item.status) ? `<button class="button material-withdraw" data-id="${esc(item.id)}">${w.withdraw}</button>` : ''}</li>`).join('')}</ol>` : `<p>${w.empty}</p>`}<p class="review-history-status" role="status"></p></section>`;
}
export function queueMarkup(items, w, esc) {
  return `<section class="card"><h2>${w.queue}</h2>${items.length ? items.map(item=>`<article><h3>${esc(item.snapshot.title)}</h3><p>${esc(item.snapshot.data.reference)} — ${esc(item.snapshot.data.prompt)}</p><ul>${item.snapshot.data.options.map(option=>`<li>${esc(option)}</li>`).join('')}</ul><p>${esc(item.snapshot.data.answer)}</p><p>${esc(item.snapshot.data.explanation)}</p><p><strong>${w.provenance}:</strong> ${esc(item.provenance)}</p>${rightsMetadataMarkup({...item,locale:item.snapshot.locale,reviewedAt:item.reviewedAt||item.submittedAt},w,esc)}<form class="material-review" data-id="${esc(item.id)}"><label class="account-field"><span>${w.note}</span><textarea name="note" maxlength="2000"></textarea></label><label class="account-check"><input type="checkbox" name="source"><span>${w.sourceChecked}</span></label><label class="account-check"><input type="checkbox" name="rights"><span>${w.rightsChecked}</span></label><button class="button" type="button" data-decision="approve">${w.approve}</button><button class="button" type="button" data-decision="reject">${w.reject}</button><p role="status"></p></form></article>`).join('') : `<p>${w.noQueue}</p>`}</section>`;
}
export function auditMarkup(items, w, esc) {
  return `<details class="card"><summary>${w.audit}</summary>${items.length ? `<ol>${items.map(item=>`<li><strong>${esc(item.snapshot.title)}</strong> — ${esc(w[item.status] || item.status)}; ${esc(item.submittedAt)}; ${w.author}: ${esc(item.authorId || '')}${item.reviewerId ? `; ${w.reviewer}: ${esc(item.reviewerId)}` : ''}${rightsMetadataMarkup({...item,locale:item.snapshot.locale,reviewedAt:item.reviewedAt||item.submittedAt},w,esc)}${item.reviewNote ? `<p>${esc(item.reviewNote)}</p>` : ''}${item.takedownReason ? `<p>${w.takeDownLabel}${esc(item.takedownReason)}${item.takedownActor ? `; ${w.takeDownActor}: ${esc(item.takedownActor)}` : ''}</p>` : ''}${item.status==='approved' ? `<form class="material-takedown" data-id="${esc(item.id)}"><label class="account-field"><span>${w.takeDownReason}</span><textarea name="reason" minlength="3" maxlength="2000" required></textarea></label><button class="button" type="submit">${w.takeDown}</button><p role="status"></p></form>` : ''}</li>`).join('')}</ol>` : `<p>${w.noQueue}</p>`}</details>`;
}
// Mutation callbacks redraw the builder and detach its focused button.
// Restore a visible heading for keyboard/NVDA only when the user had focused
// the original action and has not moved focus elsewhere during the request.
export function restoreEditorialFocus(root, hadFocus, selector = '.section-head h1') {
  const doc = root?.ownerDocument;
  if (!hadFocus || !doc || root.isConnected === false) return false;
  if (doc.activeElement && doc.activeElement !== doc.body && doc.activeElement !== doc.documentElement) return false;
  const target = root.querySelector?.(selector);
  if (!target || typeof target.focus !== 'function') return false;
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
  return true;
}
const wasEditorialControlFocused = (root, form) => Boolean(
  root?.ownerDocument && typeof form.contains === 'function' &&
  form.contains(root.ownerDocument.activeElement)
);

export function attachReviewControls(root, w, refresh, announce, isCurrent = () => true, canPresent = isCurrent) {
  // The main shell remains mounted across route/account changes. Retained
  // editor controls and late mutations must never act for a replaced principal.
  const active = target => {
    try { return isCurrent() === true && root?.isConnected !== false && target?.isConnected !== false; }
    catch { return false; }
  };
  // A successful refresh intentionally replaces the old form. Check its original
  // principal/route, not the detached control or the obsolete render epoch.
  const present = () => {
    try { return canPresent() === true && root?.isConnected !== false; }
    catch { return false; }
  };
  root.querySelectorAll('.material-submit').forEach(form => form.onsubmit = async event => {
    event.preventDefault(); if (!active(form)) return;
    const f = new FormData(form), button = form.querySelector('button'), status = form.querySelector('[role="status"]');
    const hadFocus = wasEditorialControlFocused(root, form); button.disabled = true;
    try { await post({action:'submit',materialId:form.dataset.id,provenance:f.get('provenance'),rightsHolder:f.get('rightsHolder'),rightsBasis:f.get('rightsBasis'),licenseUrl:f.get('licenseUrl'),rightsConfirmed:f.has('rights')}); if (!active(form)) return; await refresh(); if (!present()) return; restoreEditorialFocus(root, hadFocus); announce(w.sent); }
    catch { if (active(form)) { status.textContent = w.error; button.disabled = false; } }
  });
  root.querySelectorAll('.material-withdraw').forEach(button => button.onclick = async () => {
    if (!active(button)) return;
    const hadFocus = wasEditorialControlFocused(root, button.parentElement || button);
    button.disabled = true; try { await post({action:'withdraw',id:button.dataset.id}); if (!active(button)) return; await refresh(); if (!present()) return; restoreEditorialFocus(root, hadFocus); announce(w.withdrawn); }
    catch { if (active(button)) { root.querySelector('.review-history-status').textContent = w.error; button.disabled = false; } }
  });
  root.querySelectorAll('.material-takedown').forEach(form => form.onsubmit = async event => {
    event.preventDefault(); if (!active(form)) return;
    const reason=new FormData(form).get('reason'), button=form.querySelector('button'), status=form.querySelector('[role="status"]');
    if (typeof reason!=='string' || reason.trim().length<3 || reason.trim().length>2000) { status.textContent=w.error; return; }
    const hadFocus=wasEditorialControlFocused(root,form); button.disabled=true;
    try { await post({action:'takedown',id:form.dataset.id,reason}); if (!active(form)) return; await refresh(); if (!present()) return; restoreEditorialFocus(root,hadFocus); announce(w.takeDownSaved); }
    catch { if (active(form)) { status.textContent=w.error; button.disabled=false; } }
  });
  root.querySelectorAll('.material-review').forEach(form => form.querySelectorAll('[data-decision]').forEach(button => button.onclick = async () => {
    if (!active(form)) return;
    const f = new FormData(form), status = form.querySelector('[role="status"]');
    const decision = button.dataset.decision;
    if ((decision === 'approve' && (!f.has('source') || !f.has('rights'))) || (decision === 'reject' && !String(f.get('note') || '').trim())) { status.textContent = w.error; return; }
    const hadFocus = wasEditorialControlFocused(root, form);
    const buttons = form.querySelectorAll('button'); buttons.forEach(item => { item.disabled = true; });
    try { await post({action:'review',id:form.dataset.id,decision,note:f.get('note'),sourceChecked:f.has('source'),rightsChecked:f.has('rights')}); if (!active(form)) return; await refresh(); if (!present()) return; restoreEditorialFocus(root, hadFocus); announce(w.reviewed); }
    catch (error) { if (active(form)) { status.textContent = error?.message === 'self_review_forbidden' ? w.selfReview : w.error; buttons.forEach(item => { item.disabled = false; }); } }
  }));
}
function publicMaterialMarkup(items, w, esc) {
  return items.map(item=>`<article class="card"><h3>${esc(item.title)}</h3><p>${esc(item.reference)}</p><p>${esc(item.provenance)}</p>${rightsMetadataMarkup(item,w,esc)}<p class="material-rights-request"><a href="${esc(rightsRequestUrl(item))}">${esc(w.rightsConcern)}</a></p><form class="public-material" data-id="${esc(item.id)}"><fieldset><legend>${esc(item.prompt)}</legend>${item.options.map((option,index)=>`<label class="option"><input type="radio" name="choice" value="${index}" required><span>${esc(option)}</span></label>`).join('')}</fieldset><button class="button" type="submit">${w.check}</button><p role="status"></p></form></article>`).join('');
}
// Concurrent reads for one mounted public-material panel must be ordered by
// the request that STARTED last, not whichever fetch happens to finish last.
// Keep the principal/route predicate as an independent authority boundary.
const publicMaterialRenderEpoch = new WeakMap();

function attachPublicMaterialAnswers(root, w, active) {
  root.querySelectorAll('.public-material').forEach(form => {
    // A grading receipt applies only to the selected option at submission.
    // Do not leave its result or explanation next to a later selection.
    form.onchange = event => {
      if (!active() || form.isConnected === false) return;
      if (event.target?.name !== 'choice' || event.target?.type !== 'radio') return;
      const status = form.querySelector('[role="status"]');
      if (status) status.textContent = '';
    };
    form.onsubmit = async event => {
      event.preventDefault();
      if (!active() || form.isConnected === false) return;
      const status=form.querySelector('[role="status"]'), button=form.querySelector('button');
      if (button.disabled) return;
      const choice = new FormData(form).get('choice');
      if (choice === null) return;
      // Chromium drops keyboard focus to BODY when a focused submit control is
      // disabled. Restore only for the same live answer form, and only if the
      // reader has not deliberately focused another control while awaiting IO.
      const doc=root?.ownerDocument;
      const hadSubmitFocus=Boolean(doc && doc.activeElement===button);
      button.disabled=true;
      try {
        const result=await post({action:'answer',id:form.dataset.id,choice:Number(choice)});
        // Never accept a truthy string or numeric "correct" as grading evidence.
        // A malformed receipt must not announce success or expose an unverified explanation.
        if (!result || typeof result.correct !== 'boolean' ||
            (result.correct && result.explanation != null && typeof result.explanation !== 'string'))
          throw Error('invalid public material answer receipt');
        if (active() && form.isConnected !== false) {
          // A radio option remains editable while Submit is disabled. A late
          // authoritative answer for option A must not announce option B as
          // correct or show A's explanation under the now-selected option B.
          // Recheck the *actual* selected value after the request completes.
          const selectedNow = new FormData(form).get('choice');
          status.textContent = selectedNow === choice
            ? (result.correct ? `${w.correct} ${result.explanation || ''}` : w.wrong)
            : w.choiceChanged;
        }
      } catch {
        if (active() && form.isConnected !== false) status.textContent=w.answerError;
      } finally {
        if (active() && form.isConnected !== false) {
          button.disabled=false;
          if (hadSubmitFocus && doc.activeElement===doc.body && typeof button.focus==='function') {
            try { button.focus({preventScroll:true}); }
            catch { /* A removed or disabled control must not interrupt feedback. */ }
          }
        }
      }
    };
  });
}
export async function renderPublicMaterials(root, w, esc, isCurrent = () => true) {
  if (!root || (typeof root !== 'object' && typeof root !== 'function')) return;
  // The same principal may issue successive refreshes before an earlier HTTP
  // response settles. Only the newest call may install results, errors, retry
  // controls, or answer handlers for this root.
  const epoch = (publicMaterialRenderEpoch.get(root) || 0) + 1;
  publicMaterialRenderEpoch.set(root, epoch);
  const active = () => {
    try {
      return root.isConnected !== false &&
        publicMaterialRenderEpoch.get(root) === epoch &&
        isCurrent() === true;
    } catch { return false; }
  };
  if (!active()) return;
  try {
    const {items} = await api('/api/material-review?view=public');
    if (!active()) return;
    if(!Array.isArray(items)||items.length>200||!items.every(validPublicMaterial))throw Error('invalid public catalogue');
    root.innerHTML = `<h2>${w.publicTitle}</h2>${items.length ? publicMaterialMarkup(items,w,esc) : `<p>${w.empty}</p>`}`;
    attachPublicMaterialAnswers(root, w, active);
  } catch {
    if (!active()) return;
    // Public-load failure is recoverable without leaving the editor/reader;
    // the same principal and route guard must apply to the retry.
    root.innerHTML=`<h2>${w.publicTitle}</h2><p role="alert">${w.error}</p><button type="button" class="button" id="retry-public-materials">${w.retry}</button>`;
    const retry=root.querySelector('#retry-public-materials');
    if (retry) retry.onclick=async () => {
      if (!active() || retry.isConnected === false || retry.disabled) return;
      const hadFocus=wasEditorialControlFocused(root,retry);
      retry.disabled=true;
      // Starting the retry intentionally retires this failed render's epoch.
      // Restore keyboard focus only if the retry is still the newest view;
      // a later navigation/refresh must not have its focus stolen.
      const retryEpoch=epoch+1;
      await renderPublicMaterials(root,w,esc,isCurrent);
      let currentRetry=false;
      try {
        currentRetry=root.isConnected !== false &&
          publicMaterialRenderEpoch.get(root) === retryEpoch &&
          isCurrent() === true;
      } catch {}
      if (currentRetry) restoreEditorialFocus(root,hadFocus,'h2');
    };
  }
}

const LIBRARY_SEARCH = {
  uk: {label:'Пошук матеріалів', hint:'Шукайте за назвою, запитанням, біблійним посиланням або джерелом.', submit:'Шукати', more:'Продовжити пошук', heading:'Результати пошуку', loading:'Пошук матеріалів…', empty:'Збігів не знайдено.', end:'Більше збігів немає.', batchEmpty:'У цій частині збігів немає. Продовжте пошук.', moreHint:'Пошук можна продовжити.', found:n=>`Знайдено в цій частині: ${n}.`},
  ru: {label:'Поиск материалов', hint:'Ищите по названию, вопросу, библейской ссылке или источнику.', submit:'Искать', more:'Продолжить поиск', heading:'Результаты поиска', loading:'Поиск материалов…', empty:'Совпадений не найдено.', end:'Больше совпадений нет.', batchEmpty:'В этой части совпадений нет. Продолжите поиск.', moreHint:'Поиск можно продолжить.', found:n=>`Найдено в этой части: ${n}.`},
  en: {label:'Search materials', hint:'Search by title, question, Bible reference, or source.', submit:'Search', more:'Continue search', heading:'Search results', loading:'Searching materials…', empty:'No matches found.', end:'No more matches.', batchEmpty:'No matches in this part. Continue searching.', moreHint:'You can continue searching.', found:n=>`Found in this part: ${n}.`},
};

// The public library uses the reviewed-material authority, not a separate
// catalogue. Search terms stay in the request body, not a URL or browser history.
export async function renderReviewedLibrary(root, w, lang, esc, isCurrent = () => true) {
  const copy=ownLocaleCopy(LIBRARY_SEARCH,lang);
  const active=()=>{ try { return root?.isConnected !== false && isCurrent() === true; } catch { return false; } };
  if (!active()) return;
  root.innerHTML=`<form class="library-search"><label class="account-field"><span>${copy.label}</span><input name="query" type="search" maxlength="100" aria-describedby="library-search-help"></label><p id="library-search-help">${copy.hint}</p><button class="button" type="submit">${copy.submit}</button></form><p class="library-search-status" role="status"></p><div class="library-search-results"></div><button class="button library-search-more" type="button" hidden>${copy.more}</button>`;
  const form=root.querySelector('.library-search'), input=form?.querySelector('input'), submit=form?.querySelector('button');
  const status=root.querySelector('.library-search-status'), results=root.querySelector('.library-search-results'), more=root.querySelector('.library-search-more');
  if (!form || !input || !status || !results || !more) return;
  let requestEpoch=0, searchEpoch=0, nextCursor=null, currentQuery='', page=0, loading=false;
  async function load(query, cursor, trigger) {
    if (!active()) return;
    const request=++requestEpoch, search=searchEpoch;
    const doc=root.ownerDocument, hadFocus=Boolean(trigger && doc?.activeElement===trigger);
    loading=true;
    status.textContent=copy.loading;
    try {
      const data=await post({action:'librarySearch',query,cursor});
      if (!active() || request!==requestEpoch || search!==searchEpoch) return;
      const validCursor=data?.nextCursor===null || (data?.nextCursor &&
        typeof data.nextCursor.id==='string' && data.nextCursor.id.length>0 && data.nextCursor.id.length<=100 &&
        typeof data.nextCursor.submittedAt==='string' && data.nextCursor.submittedAt.length>0 && data.nextCursor.submittedAt.length<=100);
      if (!Array.isArray(data?.items) || data.items.length>12 || !validCursor ||
        !data.items.every(validPublicMaterial))
        throw Error('invalid library response');
      nextCursor=data.nextCursor;
      currentQuery=query;
      page++;
      const headingId=`library-search-page-${page}`;
      const message=data.items.length ? `${copy.found(data.items.length)} ${nextCursor ? copy.moreHint : ''}` :
        (nextCursor ? copy.batchEmpty : page===1 ? copy.empty : copy.end);
      results.insertAdjacentHTML('beforeend',`<section aria-labelledby="${headingId}"><h2 id="${headingId}" tabindex="-1">${copy.heading} ${page}</h2>${data.items.length ? publicMaterialMarkup(data.items,w,esc) : `<p>${esc(message)}</p>`}</section>`);
      attachPublicMaterialAnswers(results,w,()=>active() && search===searchEpoch);
      status.textContent=message;
      const shouldFocus=hadFocus && doc?.activeElement===trigger;
      more.hidden=!nextCursor;
      // Keep the next batch in the keyboard reading order, but do not steal
      // focus if the reader moved elsewhere while the request was in flight.
      // Capture this before hiding the final-page button, which can itself
      // cause the browser to move focus to the document body.
      if (shouldFocus) {
        try { results.querySelector(`#${headingId}`)?.focus(); } catch { /* Results are still usable if focus fails. */ }
      }
    } catch {
      if (active() && request===requestEpoch && search===searchEpoch) status.textContent=w.error;
    } finally {
      if (request===requestEpoch) loading=false;
    }
  }
  form.onsubmit=event=>{
    event.preventDefault();
    if (!active()) return;
    searchEpoch++; page=0; nextCursor=null; more.hidden=true; results.innerHTML='';
    void load(input.value.trim(),null,submit);
  };
  more.onclick=()=>{
    if (!active() || loading || !nextCursor) return;
    void load(currentQuery,nextCursor,more);
  };
  await load('',null,null);
}
const EDITOR_SEARCH_COPY = {
  uk:{title:'Пошук опублікованих матеріалів',label:'Назва, уривок або джерело',submit:'Знайти',more:'Показати наступні результати',found:n=>'Знайдено в цій частині: '+n,empty:'У цій частині збігів немає.',continuation:'Можна продовжити пошук.',error:'Не вдалося виконати пошук. Спробуйте ще раз.',page:'Результати, частина'},
  ru:{title:'Поиск опубликованных материалов',label:'Название, отрывок или источник',submit:'Найти',more:'Показать следующие результаты',found:n=>'Найдено в этой части: '+n,empty:'В этой части совпадений нет.',continuation:'Можно продолжить поиск.',error:'Не удалось выполнить поиск. Попробуйте ещё раз.',page:'Результаты, часть'},
  en:{title:'Find published materials',label:'Title, passage or source',submit:'Search',more:'Show more results',found:n=>'Found in this part: '+n,empty:'No matches in this part.',continuation:'You can continue searching.',error:'Could not search. Try again.',page:'Results, part'}
};
// Uses the same public, bounded catalogue search as the library; editorial
// authority remains on the existing server-side takedown action.
export function renderEditorialTakedownSearch(root, mainRoot, w, lang, esc, refresh, announce, isCurrent=()=>true, canPresent=isCurrent) {
  if(!root || !mainRoot)return;
  const copy=ownLocaleCopy(EDITOR_SEARCH_COPY,lang);
  const active=()=>{try{return root.isConnected!==false && mainRoot.isConnected!==false && isCurrent()===true;}catch{return false;}};
  const present=()=>{try{return mainRoot.isConnected!==false && canPresent()===true;}catch{return false;}};
  if(!active())return;
  root.innerHTML=`<h2>${esc(copy.title)}</h2><form class="editor-public-search"><label class="account-field"><span>${esc(copy.label)}</span><input name="query" type="search" maxlength="100"></label><button type="submit" class="button">${esc(copy.submit)}</button></form><p class="editor-public-status" role="status" aria-live="polite"></p><div class="editor-public-results"></div><button type="button" class="button editor-public-more" hidden>${esc(copy.more)}</button>`;
  const form=root.querySelector('.editor-public-search'),input=form?.querySelector('input'),submit=form?.querySelector('button');
  const status=root.querySelector('.editor-public-status'),results=root.querySelector('.editor-public-results'),more=root.querySelector('.editor-public-more');
  if(!form||!input||!status||!results||!more)return;
  let epoch=0,cursor=null,query='',page=0,loading=false;
  const attach=()=>results.querySelectorAll('.material-takedown').forEach(target=>{
    target.onsubmit=async event=>{
      event.preventDefault();if(!active()||target.isConnected===false)return;
      const button=target.querySelector('button'),feedback=target.querySelector('[role="status"]');
      if(!button||!feedback||button.disabled)return;
      const reason=new FormData(target).get('reason');
      if(typeof reason!=='string'||reason.trim().length<3||reason.trim().length>2000){feedback.textContent=w.error;return;}
      const hadFocus=wasEditorialControlFocused(mainRoot,target);button.disabled=true;
      try {await post({action:'takedown',id:target.dataset.id,reason});if(!active()||target.isConnected===false)return;await refresh();if(!present())return;restoreEditorialFocus(mainRoot,hadFocus);announce(w.takeDownSaved);}
      catch {if(active()&&target.isConnected!==false){feedback.textContent=w.error;button.disabled=false;}}
    };
  });
  async function load(text,next,trigger) {
    if(!active())return;
    const request=++epoch,doc=root.ownerDocument,hadFocus=Boolean(trigger&&doc?.activeElement===trigger);
    loading=true;
    try {
      const data=await post({action:'librarySearch',query:text,cursor:next});
      if(!active()||request!==epoch)return;
      const nextCursor=data?.nextCursor;
      const validCursor=nextCursor===null || (nextCursor && typeof nextCursor.id==='string' && nextCursor.id.length>0 && nextCursor.id.length<=100 && typeof nextCursor.submittedAt==='string' && nextCursor.submittedAt.length>0 && nextCursor.submittedAt.length<=100 && !(next && next.id===nextCursor.id && next.submittedAt===nextCursor.submittedAt));
      if(!Array.isArray(data?.items)||data.items.length>12||!validCursor||!data.items.every(item=>item && typeof item.id==='string' && item.id.length>0 && item.id.length<=100 && typeof item.title==='string' && item.title.length>0 && item.title.length<=160 && typeof item.reference==='string' && item.reference.length>0 && item.reference.length<=200))throw Error('invalid search result');
      cursor=nextCursor;query=text;page++;
      const id=`editor-public-page-${page}`;
      results.insertAdjacentHTML('beforeend',`<section><h3 id="${id}" tabindex="-1">${esc(copy.page)} ${page}</h3>${data.items.map(item=>`<article><h4>${esc(item.title)}</h4><p>${esc(item.reference)}</p><form class="material-takedown" data-id="${esc(item.id)}"><label class="account-field"><span>${esc(w.takeDownReason)}</span><textarea name="reason" minlength="3" maxlength="2000" required></textarea></label><button class="button" type="submit">${esc(w.takeDown)}</button><p role="status"></p></form></article>`).join('')}</section>`);
      attach();
      status.textContent=(data.items.length?copy.found(data.items.length):copy.empty)+(cursor?' '+copy.continuation:'');
      const shouldFocus=hadFocus&&doc?.activeElement===trigger;
      more.hidden=!cursor;
      if(shouldFocus){try{results.querySelector('#'+id)?.focus();}catch{}}
    } catch {if(active()&&request===epoch)status.textContent=copy.error;}
    finally {if(request===epoch)loading=false;}
  }
  form.onsubmit=event=>{event.preventDefault();if(!active())return;epoch++;page=0;cursor=null;more.hidden=true;results.innerHTML='';void load(input.value.trim(),null,submit);};
  more.onclick=()=>{if(active()&&!loading&&cursor)void load(query,cursor,more);};
}

export async function loadReviewData(isEditor) {
  const [mine, queue, history] = await Promise.all([api('/api/material-review?view=mine'), isEditor ? api('/api/material-review?view=queue') : Promise.resolve({items:[]}), isEditor ? api('/api/material-review?view=history') : Promise.resolve({items:[]})]);
  return { mine: mine.items, queue: queue.items, history: history.items };
}
const ROLE_TEXT = {
  uk:{title:'Редактори',help:'Додайте підтверджений акаунт за адресою електронної пошти.',email:'Електронна пошта редактора',grant:'Надати доступ',revoke:'Відкликати доступ',empty:'Додаткових редакторів немає.',saved:'Доступ оновлено.',error:'Не вдалося змінити доступ. Перевірте адресу або спробуйте ще раз.',audit:'Історія доступу редакторів',granted:'Доступ надано',revoked:'Доступ відкликано',noEvents:'Записів поки немає.'},
  ru:{title:'Редакторы',help:'Добавьте подтверждённый аккаунт по адресу электронной почты.',email:'Электронная почта редактора',grant:'Предоставить доступ',revoke:'Отозвать доступ',empty:'Дополнительных редакторов нет.',saved:'Доступ обновлён.',error:'Не удалось изменить доступ. Проверьте адрес или повторите попытку.',audit:'История доступа редакторов',granted:'Доступ предоставлен',revoked:'Доступ отозван',noEvents:'Записей пока нет.'},
  en:{title:'Editors',help:'Add a verified account by email address.',email:'Editor email',grant:'Grant access',revoke:'Revoke access',empty:'There are no additional editors.',saved:'Access updated.',error:'Could not update access. Check the address or try again.',audit:'Editor access history',granted:'Access granted',revoked:'Access revoked',noEvents:'There are no records yet.'},
};
export function editorRolesMarkup(items,lang,esc,events=[]) {
  const w=ownLocaleCopy(ROLE_TEXT,lang);
  return `<section class="card"><h2>${w.title}</h2><p>${w.help}</p><form id="editor-role-form"><label class="account-field"><span>${w.email}</span><input type="email" name="email" maxlength="254" required></label><button class="button">${w.grant}</button></form>${items.length?`<ul>${items.map(item=>`<li>${esc(item.email)} <button class="button editor-revoke" type="button" data-id="${esc(item.id)}" aria-label="${w.revoke}: ${esc(item.email)}">${w.revoke}</button></li>`).join('')}</ul>`:`<p>${w.empty}</p>`}<p id="editor-role-status" role="status"></p><details><summary>${w.audit}</summary>${events.length?`<ol>${events.map(event=>`<li>${esc(event.subject_email || event.subject_user_id)} — ${event.action==='grant'?w.granted:w.revoked}; ${esc(event.created_at)}; ${esc(event.actor_user_id)}</li>`).join('')}</ol>`:`<p>${w.noEvents}</p>`}</details></section>`;
}
export function attachEditorRoles(root,lang,refresh,announce,isCurrent = () => true, canPresent = isCurrent) {
  const active = target => {
    try { return isCurrent() === true && root?.isConnected !== false && target?.isConnected !== false; }
    catch { return false; }
  };
  // A successful refresh intentionally replaces the old form. Check its original
  // principal/route, not the detached control or the obsolete render epoch.
  const present = () => {
    try { return canPresent() === true && root?.isConnected !== false; }
    catch { return false; }
  };
  const w=ownLocaleCopy(ROLE_TEXT,lang), status=root.querySelector('#editor-role-status');
  async function change(body,buttons) {
    if (!active(buttons[0])) return;
    const hadFocus = Boolean(root?.ownerDocument && buttons.some(b => b === root.ownerDocument.activeElement));
    buttons.forEach(b=>b.disabled=true);
    try { await api('/api/editor-roles',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); if (!active(buttons[0])) return; await refresh(); if (!present()) return; restoreEditorialFocus(root, hadFocus); announce(w.saved); }
    catch { if (active(buttons[0])) { status.textContent=w.error; buttons.forEach(b=>b.disabled=false); } }
  }
  const form=root.querySelector('#editor-role-form');
  form.onsubmit=event=>{event.preventDefault();if (!active(form)) return;void change({action:'grant',email:new FormData(form).get('email')},[form.querySelector('button')]);};
  root.querySelectorAll('.editor-revoke').forEach(button=>button.onclick=()=>change({action:'revoke',userId:button.dataset.id},[button]));
}
