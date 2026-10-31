const COPY={
  uk:{title:'Історія зустрічей',more:'Показати попередні зустрічі',retry:'Спробувати ще раз',loading:'Завантаження зустрічей…',error:'Не вдалося завантажити зустрічі. Показані записи збережено; спробуйте ще раз.',expired:'Список змінився або доступ втрачено. Відкрийте групу ще раз.',empty:'Зустрічей ще немає.',loaded:'Завантажено записів:',end:'Усі доступні зустрічі показано.',members:'учасників',noDepth:'Без оцінювання'},
  ru:{title:'История встреч',more:'Показать предыдущие встречи',retry:'Попробовать ещё раз',loading:'Загрузка встреч…',error:'Не удалось загрузить встречи. Показанные записи сохранены; попробуйте ещё раз.',expired:'Список изменился или доступ утрачен. Откройте группу ещё раз.',empty:'Встреч пока нет.',loaded:'Загружено записей:',end:'Показаны все доступные встречи.',members:'участников',noDepth:'Без оценивания'},
  en:{title:'Meeting history',more:'Show earlier meetings',retry:'Try again',loading:'Loading meetings…',error:'Meetings could not be loaded. Displayed records are kept; try again.',expired:'The list changed or access was lost. Open the group again.',empty:'No meetings yet.',loaded:'Records loaded:',end:'All available meetings are shown.',members:'participants',noDepth:'Not graded'},
};
export const meetingHistoryCopy=lang=>COPY[lang]||COPY.uk;
export function meetingHistoryMarkup(copy){
  return `<section class="groups-section" id="group-meeting-history"><h2>${copy.title}</h2><div data-meeting-list></div><button class="button" type="button" data-meeting-more disabled>${copy.more}</button><p role="status" aria-live="polite" data-meeting-status>${copy.loading}</p></section>`;
}
export function meetingRowsMarkup(rows,{copy,esc,titleFor}){
  return rows.map(s=>`<article class="session-row"><div><h3 tabindex="-1" data-meeting-heading>${esc(titleFor(s.book_id))} ${esc(s.chapter)}</h3><span>${esc(s.meeting_date)}</span></div><p>${s.participant_count!==null?`${esc(s.participant_count)} ${copy.members} · `:''}${s.answers_total?`${esc(s.answers_correct)}/${esc(s.answers_total)} · ${Math.round(s.answers_correct*100/s.answers_total)}%`:copy.noDepth}</p>${s.reflection?`<blockquote>${esc(s.reflection)}</blockquote>`:''}</article>`).join('');
}
function validPage(page,seen,cursor){
  if(!page||!Array.isArray(page.sessions)||page.sessions.length>12)return false;
  const ids=new Set();
  for(const s of page.sessions){
    if(!s||typeof s.id!=='string'||!s.id||s.id.length>80||s.id.trim()!==s.id||seen.has(s.id)||ids.has(s.id)||
      typeof s.book_id!=='string'||!s.book_id||typeof s.meeting_date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s.meeting_date)||
      !Number.isSafeInteger(s.chapter)||s.chapter<1||s.chapter>200||
      !Number.isSafeInteger(s.answers_correct)||!Number.isSafeInteger(s.answers_total)||s.answers_correct<0||s.answers_correct>s.answers_total||s.answers_total>1000||
      (s.participant_count!==null&&(!Number.isSafeInteger(s.participant_count)||s.participant_count<1||s.participant_count>500))||
      (s.reflection!==null&&typeof s.reflection!=='string'))return false;
    ids.add(s.id);
  }
  return page.nextCursor===null||(page.sessions.length===12&&page.nextCursor===page.sessions.at(-1).id&&page.nextCursor!==cursor);
}
export function mountMeetingHistory(root,{request,groupId,copy,isCurrent,renderRows}){
  const list=root.querySelector('[data-meeting-list]'),button=root.querySelector('[data-meeting-more]'),status=root.querySelector('[data-meeting-status]');
  const seen=new Set();let cursor=null,busy=false,finished=false,unavailable=false;
  const current=()=>root.isConnected!==false&&isCurrent();
  async function load(){
    if(busy||finished||unavailable||!current())return;
    const doc=root.ownerDocument,restore=doc?.activeElement===button,offset=seen.size;
    busy=true;button.disabled=true;status.textContent=copy.loading;
    let added=false;
    try {
      const page=await request('meetings','GET',undefined,`groupId=${encodeURIComponent(groupId)}${cursor?`&before=${encodeURIComponent(cursor)}`:''}`);
      if(!current())return;
      if(!validPage(page,seen,cursor))throw Error('invalid_meeting_page');
      const html=renderRows(page.sessions);
      list.insertAdjacentHTML('beforeend',html);
      page.sessions.forEach(s=>seen.add(s.id));
      cursor=page.nextCursor;finished=cursor===null;added=page.sessions.length>0;
      status.textContent=seen.size?`${copy.loaded} ${seen.size}. ${finished?copy.end:''}`:copy.empty;
      button.textContent=copy.more;
    } catch(error){
      if(!current())return;
      unavailable=['meeting_cursor_unavailable','not_found','authentication_required','forbidden'].includes(error.message);
      // Revoked access must not leave already-loaded private reflections visible.
      if(unavailable){list.textContent='';seen.clear();}
      status.textContent=unavailable?copy.expired:copy.error;
      button.textContent=copy.retry;
    } finally {
      busy=false;
      if(current()){
        button.disabled=finished||unavailable;button.hidden=finished||unavailable;
        if(restore&&(doc.activeElement===button||doc.activeElement===doc.body)){
          const target=added?list.querySelectorAll('[data-meeting-heading]')[offset]:button;
          if(target&&!target.hidden&&!target.disabled)target.focus({preventScroll:true});
          else {status.tabIndex=-1;status.focus({preventScroll:true});}
        }
      }
    }
  }
  button.onclick=load;
  return {ready:load()};
}
