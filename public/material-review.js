const TEXT = {
  uk: {publicTitle:'Перевірені матеріали',empty:'Перевірених матеріалів поки немає.',provenance:'Джерело та права',check:'Перевірити відповідь',correct:'Правильно.',wrong:'Спробуйте ще раз.',answerError:'Не вдалося перевірити відповідь. Спробуйте ще раз.',submit:'Передати на перевірку',source:'Джерело матеріалу та підстава використання',rights:'Підтверджую право надати цей матеріал для публікації.',send:'Надіслати редактору',sent:'Матеріал передано на перевірку.',history:'Версії та рішення',pending:'Очікує перевірки',approved:'Опубліковано',rejected:'Потрібні виправлення',withdrawn:'Відкликано',superseded:'Замінено новішою версією',withdraw:'Відкликати',queue:'Матеріали на перевірці',noQueue:'Немає матеріалів на перевірці.',sourceChecked:'Я перевірив джерело та біблійне посилання.',rightsChecked:'Я перевірив право публікації.',note:'Зауваження редактора',approve:'Затвердити',reject:'Повернути на виправлення',reviewed:'Рішення збережено.',error:'Не вдалося виконати дію. Перевірте дані та повторіть спробу.',login:'Увійдіть, щоб створювати власні матеріали.',builder:'Конструктор'},
  ru: {publicTitle:'Проверенные материалы',empty:'Проверенных материалов пока нет.',provenance:'Источник и права',check:'Проверить ответ',correct:'Правильно.',wrong:'Попробуйте ещё раз.',answerError:'Не удалось проверить ответ. Попробуйте ещё раз.',submit:'Передать на проверку',source:'Источник материала и основание использования',rights:'Подтверждаю право предоставить материал для публикации.',send:'Отправить редактору',sent:'Материал передан на проверку.',history:'Версии и решения',pending:'Ожидает проверки',approved:'Опубликовано',rejected:'Требует исправлений',withdrawn:'Отозвано',superseded:'Заменено новой версией',withdraw:'Отозвать',queue:'Материалы на проверке',noQueue:'Нет материалов на проверке.',sourceChecked:'Я проверил источник и библейскую ссылку.',rightsChecked:'Я проверил право публикации.',note:'Замечания редактора',approve:'Одобрить',reject:'Вернуть на исправление',reviewed:'Решение сохранено.',error:'Не удалось выполнить действие. Проверьте данные и повторите попытку.',login:'Войдите, чтобы создавать материалы.',builder:'Конструктор'},
  en: {publicTitle:'Reviewed materials',empty:'There are no reviewed materials yet.',provenance:'Source and rights',check:'Check answer',correct:'Correct.',wrong:'Try again.',answerError:'Could not check the answer. Please try again.',submit:'Submit for review',source:'Source and basis for use',rights:'I confirm that I may submit this material for publication.',send:'Send to editor',sent:'Material submitted for review.',history:'Versions and decisions',pending:'Awaiting review',approved:'Published',rejected:'Changes requested',withdrawn:'Withdrawn',superseded:'Replaced by a newer version',withdraw:'Withdraw',queue:'Materials awaiting review',noQueue:'No materials await review.',sourceChecked:'I checked the source and Bible reference.',rightsChecked:'I checked the right to publish.',note:'Editor’s notes',approve:'Approve',reject:'Request changes',reviewed:'Decision saved.',error:'Could not complete the action. Check the details and try again.',login:'Sign in to create your own materials.',builder:'Builder'},
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
export function reviewText(lang) { return { ...(TEXT[lang] || TEXT.uk), ...(DELETE_TEXT[lang] || DELETE_TEXT.uk), selfReview: SELF_REVIEW_TEXT[lang] || SELF_REVIEW_TEXT.uk }; }
async function api(path, options) {
  const response = await fetch(path, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || String(response.status));
  return data;
}
const post = body => api('/api/material-review', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});

export function submissionForm(material, w, esc) {
  return `<details><summary>${w.submit}</summary><form class="material-submit" data-id="${esc(material.id)}"><label class="account-field"><span>${w.source}</span><textarea name="provenance" minlength="3" maxlength="1000" required></textarea></label><label class="account-check"><input name="rights" type="checkbox" required><span>${w.rights}</span></label><button class="button" type="submit">${w.send}</button><p role="status"></p></form></details>`;
}
export function historyMarkup(items, w, esc) {
  return `<section class="card"><h2>${w.history}</h2>${items.length ? `<ol>${items.map(item=>`<li><strong>${esc(item.snapshot.title)}</strong> — ${esc(w[item.status] || item.status)}${item.reviewNote ? `<p>${esc(item.reviewNote)}</p>` : ''}${['pending','approved'].includes(item.status) ? `<button class="button material-withdraw" data-id="${esc(item.id)}">${w.withdraw}</button>` : ''}</li>`).join('')}</ol>` : `<p>${w.empty}</p>`}<p class="review-history-status" role="status"></p></section>`;
}
export function queueMarkup(items, w, esc) {
  return `<section class="card"><h2>${w.queue}</h2>${items.length ? items.map(item=>`<article><h3>${esc(item.snapshot.title)}</h3><p>${esc(item.snapshot.data.reference)} — ${esc(item.snapshot.data.prompt)}</p><ul>${item.snapshot.data.options.map(option=>`<li>${esc(option)}</li>`).join('')}</ul><p>${esc(item.snapshot.data.answer)}</p><p>${esc(item.snapshot.data.explanation)}</p><p><strong>${w.provenance}:</strong> ${esc(item.provenance)}</p><form class="material-review" data-id="${esc(item.id)}"><label class="account-field"><span>${w.note}</span><textarea name="note" maxlength="2000"></textarea></label><label class="account-check"><input type="checkbox" name="source"><span>${w.sourceChecked}</span></label><label class="account-check"><input type="checkbox" name="rights"><span>${w.rightsChecked}</span></label><button class="button" type="button" data-decision="approve">${w.approve}</button><button class="button" type="button" data-decision="reject">${w.reject}</button><p role="status"></p></form></article>`).join('') : `<p>${w.noQueue}</p>`}</section>`;
}
export function auditMarkup(items, w, esc) {
  return `<details class="card"><summary>${w.audit}</summary>${items.length ? `<ol>${items.map(item=>`<li><strong>${esc(item.snapshot.title)}</strong> — ${esc(w[item.status] || item.status)}; ${esc(item.submittedAt)}; ${w.author}: ${esc(item.authorId || '')}${item.reviewerId ? `; ${w.reviewer}: ${esc(item.reviewerId)}` : ''}${item.reviewNote ? `<p>${esc(item.reviewNote)}</p>` : ''}</li>`).join('')}</ol>` : `<p>${w.noQueue}</p>`}</details>`;
}
export function attachReviewControls(root, w, refresh, announce) {
  root.querySelectorAll('.material-submit').forEach(form => form.onsubmit = async event => {
    event.preventDefault(); const f = new FormData(form), button = form.querySelector('button'), status = form.querySelector('[role="status"]'); button.disabled = true;
    try { await post({action:'submit',materialId:form.dataset.id,provenance:f.get('provenance'),rightsConfirmed:f.has('rights')}); await refresh(); announce(w.sent); }
    catch { status.textContent = w.error; button.disabled = false; }
  });
  root.querySelectorAll('.material-withdraw').forEach(button => button.onclick = async () => {
    button.disabled = true; try { await post({action:'withdraw',id:button.dataset.id}); await refresh(); announce(w.withdrawn); }
    catch { root.querySelector('.review-history-status').textContent = w.error; button.disabled = false; }
  });
  root.querySelectorAll('.material-review').forEach(form => form.querySelectorAll('[data-decision]').forEach(button => button.onclick = async () => {
    const f = new FormData(form), status = form.querySelector('[role="status"]');
    const decision = button.dataset.decision;
    if ((decision === 'approve' && (!f.has('source') || !f.has('rights'))) || (decision === 'reject' && !String(f.get('note') || '').trim())) { status.textContent = w.error; return; }
    const buttons = form.querySelectorAll('button'); buttons.forEach(item => { item.disabled = true; });
    try { await post({action:'review',id:form.dataset.id,decision,note:f.get('note'),sourceChecked:f.has('source'),rightsChecked:f.has('rights')}); await refresh(); announce(w.reviewed); }
    catch (error) { status.textContent = error?.message === 'self_review_forbidden' ? w.selfReview : w.error; buttons.forEach(item => { item.disabled = false; }); }
  }));
}
export async function renderPublicMaterials(root, w, esc) {
  try {
    const {items} = await api('/api/material-review?view=public');
    if (!root.isConnected) return;
    root.innerHTML = `<h2>${w.publicTitle}</h2>${items.length ? items.map(item=>`<article class="card"><h3>${esc(item.title)}</h3><p>${esc(item.reference)}</p><p>${esc(item.provenance)}</p><form class="public-material" data-id="${esc(item.id)}"><fieldset><legend>${esc(item.prompt)}</legend>${item.options.map((option,index)=>`<label class="option"><input type="radio" name="choice" value="${index}" required><span>${esc(option)}</span></label>`).join('')}</fieldset><button class="button" type="submit">${w.check}</button><p role="status"></p></form></article>`).join('') : `<p>${w.empty}</p>`}`;
    root.querySelectorAll('.public-material').forEach(form => form.onsubmit = async event => {
      event.preventDefault(); const status=form.querySelector('[role="status"]'), button=form.querySelector('button'), choice = new FormData(form).get('choice');
      if (choice === null) return; button.disabled=true;
      try { const result=await post({action:'answer',id:form.dataset.id,choice:Number(choice)}); status.textContent=result.correct ? `${w.correct} ${result.explanation || ''}` : w.wrong; }
      catch { status.textContent=w.answerError; } finally { button.disabled=false; }
    });
  } catch { if (root.isConnected) root.innerHTML=`<h2>${w.publicTitle}</h2><p role="alert">${w.error}</p>`; }
}
export async function loadReviewData(isEditor) {
  const [mine, queue, history] = await Promise.all([api('/api/material-review?view=mine'), isEditor ? api('/api/material-review?view=queue') : Promise.resolve({items:[]}), isEditor ? api('/api/material-review?view=history') : Promise.resolve({items:[]})]);
  return { mine: mine.items, queue: queue.items, history: history.items };
}
const ROLE_TEXT = {
  uk:{title:'Редактори',help:'Додайте підтверджений акаунт за адресою електронної пошти.',email:'Електронна пошта редактора',grant:'Надати доступ',revoke:'Відкликати доступ',empty:'Додаткових редакторів немає.',saved:'Доступ оновлено.',error:'Не вдалося змінити доступ. Перевірте адресу або спробуйте ще раз.'},
  ru:{title:'Редакторы',help:'Добавьте подтверждённый аккаунт по адресу электронной почты.',email:'Электронная почта редактора',grant:'Предоставить доступ',revoke:'Отозвать доступ',empty:'Дополнительных редакторов нет.',saved:'Доступ обновлён.',error:'Не удалось изменить доступ. Проверьте адрес или повторите попытку.'},
  en:{title:'Editors',help:'Add a verified account by email address.',email:'Editor email',grant:'Grant access',revoke:'Revoke access',empty:'There are no additional editors.',saved:'Access updated.',error:'Could not update access. Check the address or try again.'},
};
export function editorRolesMarkup(items,lang,esc) {
  const w=ROLE_TEXT[lang]||ROLE_TEXT.uk;
  return `<section class="card"><h2>${w.title}</h2><p>${w.help}</p><form id="editor-role-form"><label class="account-field"><span>${w.email}</span><input type="email" name="email" maxlength="254" required></label><button class="button">${w.grant}</button></form>${items.length?`<ul>${items.map(item=>`<li>${esc(item.email)} <button class="button editor-revoke" type="button" data-id="${esc(item.id)}">${w.revoke}</button></li>`).join('')}</ul>`:`<p>${w.empty}</p>`}<p id="editor-role-status" role="status"></p></section>`;
}
export function attachEditorRoles(root,lang,refresh,announce) {
  const w=ROLE_TEXT[lang]||ROLE_TEXT.uk, status=root.querySelector('#editor-role-status');
  async function change(body,buttons) {
    buttons.forEach(b=>b.disabled=true);
    try { await api('/api/editor-roles',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); await refresh(); announce(w.saved); }
    catch { status.textContent=w.error; buttons.forEach(b=>b.disabled=false); }
  }
  const form=root.querySelector('#editor-role-form');
  form.onsubmit=event=>{event.preventDefault();void change({action:'grant',email:new FormData(form).get('email')},[form.querySelector('button')]);};
  root.querySelectorAll('.editor-revoke').forEach(button=>button.onclick=()=>change({action:'revoke',userId:button.dataset.id},[button]));
}
