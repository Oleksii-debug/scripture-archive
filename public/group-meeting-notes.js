const COPY={
  uk:{edit:'Виправити підсумок зустрічі',help:'Власник може виправляти підсумки всіх зустрічей; ведучий — своїх. Кількість присутніх видима відвідувачам лише за відкритої кількості учасників. Підсумок читають тільки учасники групи.',reflection:'Підсумок обговорення',attendance:'Кількість присутніх (необов’язково)',save:'Зберегти виправлення',reload:'Завантажити збережені дані',reloadConfirm:'Замінити незбережені зміни збереженими даними?',saved:'Виправлення збережено.',error:'Не вдалося підтвердити збереження. Чернетку залишено. Завантажте збережені дані перед повторною спробою.',conflict:'Запис або ваші права змінилися. Чернетку залишено. Завантажте збережені дані.',invalid:'Перевірте підсумок (до 1200 символів) і кількість присутніх (від 1 до 500 або порожньо).',loading:'Завантаження збережених даних…',savedDisplayStale:'Виправлення збережено, але список зустрічей не оновився. Відкрийте групу повторно.',loadedDisplayStale:'Збережені дані завантажено, але список зустрічей не оновився. Відкрийте групу повторно.'},
  ru:{edit:'Исправить итог встречи',help:'Владелец может исправлять итоги всех встреч, ведущий — своих. Посетители видят число присутствующих только при открытом количестве участников. Итог читают только участники группы.',reflection:'Итог обсуждения',attendance:'Число присутствующих (необязательно)',save:'Сохранить исправления',reload:'Загрузить сохранённые данные',reloadConfirm:'Заменить несохранённые изменения сохранёнными данными?',saved:'Исправления сохранены.',error:'Не удалось подтвердить сохранение. Черновик оставлен. Загрузите сохранённые данные перед повторной попыткой.',conflict:'Запись или ваши права изменились. Черновик оставлен. Загрузите сохранённые данные.',invalid:'Проверьте итог (до 1200 символов) и число присутствующих (от 1 до 500 или пусто).',loading:'Загрузка сохранённых данных…',savedDisplayStale:'Исправления сохранены, но список встреч не обновился. Откройте группу заново.',loadedDisplayStale:'Сохранённые данные загружены, но список встреч не обновился. Откройте группу заново.'},
  en:{edit:'Correct meeting notes',help:'Owners can correct every meeting; facilitators can correct their own. Attendance is visible to visitors only when member counts are public. Only group members can read the discussion notes.',reflection:'Discussion notes',attendance:'Attendance (optional)',save:'Save corrections',reload:'Load saved values',reloadConfirm:'Replace unsaved edits with the saved values?',saved:'Corrections saved.',error:'Saving could not be confirmed. Your draft is kept. Load the saved values before retrying.',conflict:'The record or your permissions changed. Your draft is kept. Load the saved values.',invalid:'Check the notes (up to 1200 characters) and attendance (1 to 500, or empty).',loading:'Loading saved values…',savedDisplayStale:'Corrections were saved, but the meeting list did not refresh. Reopen the group.',loadedDisplayStale:'Saved values loaded, but the meeting list did not refresh. Reopen the group.'},
};
export const meetingNotesCopy=lang=>typeof lang==='string' && Object.hasOwn(COPY,lang) ? COPY[lang] : COPY.uk;
export function meetingNotesMarkup(session,copy,esc){
  if(session.canEdit!==true)return '';
  const snapshot={reflection:session.reflection,participantCount:session.participant_count};
  return `<details class="meeting-notes-editor"><summary>${copy.edit}</summary><p>${copy.help}</p><form class="account-form" data-meeting-note-id="${esc(session.id)}" data-meeting-snapshot="${esc(JSON.stringify(snapshot))}"><label class="account-field"><span>${copy.reflection}</span><textarea name="reflection" maxlength="1200" rows="4">${esc(session.reflection??'')}</textarea></label><label class="account-field"><span>${copy.attendance}</span><input name="participantCount" type="number" min="1" max="500" step="1" value="${esc(session.participant_count??'')}"></label><button class="button" type="submit">${copy.save}</button><button class="button" type="button" data-notes-reload>${copy.reload}</button><p role="status" data-notes-status></p></form></details>`;
}
function validNotes(notes){
  return notes&&typeof notes==='object'&&!Array.isArray(notes)&&Object.keys(notes).length===2&&
    (notes.reflection===null||(typeof notes.reflection==='string'&&notes.reflection.length<=1200))&&
    (notes.participantCount===null||(Number.isSafeInteger(notes.participantCount)&&notes.participantCount>=1&&notes.participantCount<=500));
}
export function mountMeetingNotes(form,{request,groupId,copy,isCurrent,confirm,onSaved}){
  const note=form.querySelector('[name="reflection"]'),attendance=form.querySelector('[name="participantCount"]'),save=form.querySelector('[type="submit"]'),reload=form.querySelector('[data-notes-reload]'),status=form.querySelector('[data-notes-status]');
  const sessionId=form.dataset.meetingNoteId;let expected=null,busy=false;
  try {const snapshot=JSON.parse(form.dataset.meetingSnapshot);if(validNotes(snapshot))expected=snapshot;}catch{/* Read failure never invents a previous value. */}
  const current=()=>form.isConnected!==false&&isCurrent();
  const draft=()=>({reflection:note.value===''?null:note.value,participantCount:attendance.value===''?null:/^\d+$/.test(attendance.value)?Number(attendance.value):NaN});
  function controls(){if(!current())return;save.disabled=busy||expected===null;reload.disabled=busy;note.disabled=busy;attendance.disabled=busy;}
  function finish(button,restore){
    busy=false;controls();const doc=form.ownerDocument;
    if(restore&&current()&&(doc.activeElement===button||doc.activeElement===doc.body))(button.disabled?reload:button).focus({preventScroll:true});
  }
  form.onsubmit=async event=>{
    event.preventDefault();if(busy||!expected||!current())return;
    const notes=draft();if(!validNotes(notes)){status.textContent=copy.invalid;return;}
    const restore=form.ownerDocument?.activeElement===save;busy=true;controls();status.textContent='';
    try {
      const result=await request('meeting-notes','POST',{groupId,sessionId,notes,expected});
      if(!current())return;
      if(result?.ok!==true||!validNotes(result.notes)||result.notes.reflection!==notes.reflection||result.notes.participantCount!==notes.participantCount)throw Error('unconfirmed');
      expected={...notes};form.dataset.meetingSnapshot=JSON.stringify(expected);
      // The server has already confirmed persistence. A local DOM projection
      // failure must not turn that receipt into a fabricated save failure.
      try {onSaved?.(expected);status.textContent=copy.saved;}
      catch {status.textContent=copy.savedDisplayStale;}
    }catch(error){if(current()){expected=null;status.textContent=error.message==='meeting_notes_changed_or_forbidden'?copy.conflict:copy.error;}}
    finally {finish(save,restore);}
  };
  reload.onclick=async()=>{
    if(busy||!current())return;
    let saved=null;try{saved=JSON.parse(form.dataset.meetingSnapshot||'null');}catch{/* Explicit reload can recover a malformed snapshot. */}
    const chosen=draft();
    if((!saved||chosen.reflection!==saved.reflection||chosen.participantCount!==saved.participantCount)&&!confirm(copy.reloadConfirm))return;
    if(!current())return;
    const restore=form.ownerDocument?.activeElement===reload;busy=true;controls();status.textContent=copy.loading;
    try {
      const result=await request('meeting-notes','GET',undefined,`groupId=${encodeURIComponent(groupId)}&sessionId=${encodeURIComponent(sessionId)}`);
      if(!current())return;
      if(!validNotes(result?.notes))throw Error('unconfirmed');
      expected={...result.notes};form.dataset.meetingSnapshot=JSON.stringify(expected);note.value=expected.reflection??'';attendance.value=expected.participantCount===null?'':String(expected.participantCount);
      // GET readback and form state are authoritative even if the surrounding
      // meeting-list component has been removed or failed to repaint.
      try {onSaved?.(expected);status.textContent='';}
      catch {status.textContent=copy.loadedDisplayStale;}
    }catch{if(current()){expected=null;status.textContent=copy.error;}}
    finally {finish(reload,restore);}
  };
  controls();if(!expected&&current())status.textContent=copy.error;
}
