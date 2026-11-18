import { reviewText, validPublicMaterial, renderMaterialItems } from './material-review.js';

const COPY = {
  uk: { open:'Матеріали події', manage:'Керувати матеріалами', heading:'Перевірені матеріали події', help:'До 20 вправ або ресурсів із редакційної бібліотеки. Відкликані або замінені публікації перестають показуватися автоматично.', empty:'Прикріплених доступних матеріалів немає.', search:'Пошук у перевіреній бібліотеці', find:'Знайти матеріали', more:'Продовжити пошук матеріалів', select:'Виберіть матеріал для прикріплення', choose:'Виберіть матеріал', consent:'Я погоджуюся показати вибраний матеріал на сторінці цієї події.', attach:'Прикріпити матеріал', detach:'Прибрати зі сторінки події', unavailable:'Публікація більше недоступна', saved:'Матеріал прикріплено.', removed:'Матеріал прибрано зі сторінки події.', error:'Не вдалося виконати дію. Перевірте дані або повторіть спробу.', retry:'Оновити матеріали', noMatches:'У цій частині збігів немає.', found:n=>`Матеріалів у цій частині: ${n}.` },
  ru: { open:'Материалы события', manage:'Управлять материалами', heading:'Проверенные материалы события', help:'До 20 упражнений или ресурсов из редакционной библиотеки. Отозванные или заменённые публикации автоматически перестают показываться.', empty:'Доступных прикреплённых материалов нет.', search:'Поиск в проверенной библиотеке', find:'Найти материалы', more:'Продолжить поиск материалов', select:'Выберите материал для прикрепления', choose:'Выберите материал', consent:'Я согласен показать выбранный материал на странице этого события.', attach:'Прикрепить материал', detach:'Убрать со страницы события', unavailable:'Публикация больше недоступна', saved:'Материал прикреплён.', removed:'Материал убран со страницы события.', error:'Не удалось выполнить действие. Проверьте данные или повторите попытку.', retry:'Обновить материалы', noMatches:'В этой части совпадений нет.', found:n=>`Материалов в этой части: ${n}.` },
  en: { open:'Event materials', manage:'Manage materials', heading:'Reviewed event materials', help:'Up to 20 exercises or resources from the editorial library. Withdrawn or replaced publications automatically stop appearing.', empty:'No available materials are attached.', search:'Search the reviewed library', find:'Find materials', more:'Continue material search', select:'Choose a material to attach', choose:'Choose a material', consent:'I consent to showing the selected material on this event page.', attach:'Attach material', detach:'Remove from event page', unavailable:'Publication no longer available', saved:'Material attached.', removed:'Material removed from the event page.', error:'The action could not be completed. Check the details or try again.', retry:'Refresh materials', noMatches:'No matches in this part.', found:n=>`Materials in this part: ${n}.` },
};
const copy = lang => Object.hasOwn(COPY,lang) ? COPY[lang] : COPY.uk;
const validId = id => typeof id==='string' && id.length>0 && id.length<=100;
const invalidateRead = new WeakMap();
async function post(body) {
  const response=await fetch('/api/material-review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const data=await response.json();
  if(!response.ok)throw Error('materials unavailable');
  return data;
}
export function eventMaterialsControl(item,lang,esc,manage=false) {
  const w=copy(lang);
  return `<section class="event-materials" data-event-id="${esc(item.id)}" data-manage="${manage?'1':'0'}"><button type="button" class="button event-materials-open">${esc(manage?w.manage:w.open)}</button><div class="event-materials-panel"></div></section>`;
}

export function mountEventMaterials(root,lang,esc,isCurrent) {
  const w=copy(lang),review=reviewText(lang);
  root.querySelectorAll('.event-materials').forEach(container=>{
    if(container.dataset.bound==='1')return;
    container.dataset.bound='1';
    const manage=container.dataset.manage==='1',eventId=container.dataset.eventId;
    const active=()=>{try{return container.isConnected!==false && isCurrent()===true;}catch{return false;}};
    const panel=container.querySelector('.event-materials-panel'),open=container.querySelector('.event-materials-open');
    let loading=false,readEpoch=0,mutation=false,searchEpoch=0,searching=false,cursor=null,query='',candidates=[],seen=new Set();
    let status,list,search,select,preview,consent,more;
    invalidateRead.set(container,()=>{readEpoch++;loading=false;if(list)list.innerHTML='';});
    async function load() {
      if(!active()||loading)return;
      const epoch=++readEpoch;
      loading=true; status.textContent='';
      // Clear stale titles/exercises before rechecking current publication.
      list.innerHTML='';
      try {
        const data=await post({action:'eventMaterials',eventId,view:manage?'mine':'public'});
        if(!active()||epoch!==readEpoch)return;
        if(!Array.isArray(data.items)||data.items.length>20||!data.items.every(validPublicMaterial)||
          (manage&&(!Array.isArray(data.unavailableIds)||data.unavailableIds.some(id=>!validId(id))||data.items.length+data.unavailableIds.length>20)))throw Error('invalid materials');
        if(manage){
          list.innerHTML=data.items.map(item=>`<article><h5 lang="${esc(item.locale)}">${esc(item.title)}</h5><p>${esc(item.reference)}</p><button type="button" class="button event-material-detach" data-id="${esc(item.id)}">${esc(w.detach)}: ${esc(item.title)}</button></article>`).join('')+
            data.unavailableIds.map((id,index)=>`<article><p>${esc(w.unavailable)} ${index+1}</p><button type="button" class="button event-material-detach" data-id="${esc(id)}">${esc(w.detach)}: ${esc(w.unavailable)} ${index+1}</button></article>`).join('');
          if(!data.items.length&&!data.unavailableIds.length)list.innerHTML=`<p>${esc(w.empty)}</p>`;
          list.querySelectorAll('.event-material-detach').forEach(button=>button.onclick=()=>mutate('detachEventMaterial',button.dataset.id,button));
        }else if(data.items.length)renderMaterialItems(list,data.items,review,esc,active);
        else list.innerHTML=`<p>${esc(w.empty)}</p>`;
      }catch{if(active()&&epoch===readEpoch)status.textContent=w.error;}
      finally{if(epoch===readEpoch)loading=false;}
    }
    async function mutate(action,submissionId,button) {
      if(!active()||mutation||!validId(submissionId)||(action==='attachEventMaterial'&&!consent.checked))return;
      mutation=true;button.setAttribute('aria-disabled','true');
      try{
        const data=await post({action,eventId,submissionId,publicationConsent:action==='attachEventMaterial'});
        if(!active())return;
        if(data?.ok!==true)throw Error('unconfirmed write');
        const hadFocus=root.ownerDocument?.activeElement===button;
        if(consent)consent.checked=false;
        // Retire every mounted public copy before its next explicit refresh.
        root.querySelectorAll('.event-materials[data-manage="0"]').forEach(other=>{
          if(other.dataset.eventId===eventId)invalidateRead.get(other)?.();
        });
        invalidateRead.get(container)?.();
        await load();
        if(!active())return;
        if(!status.textContent)status.textContent=action==='attachEventMaterial'?w.saved:w.removed;
        if(hadFocus&&(root.ownerDocument?.activeElement===button||root.ownerDocument?.activeElement===root.ownerDocument?.body))status.focus();
      }catch{if(active())status.textContent=w.error;}
      finally{mutation=false;button.removeAttribute('aria-disabled');}
    }
    async function find(next=false) {
      if(!active()||searching||(next&&!cursor))return;
      const epoch=++searchEpoch,trigger=next?more:search.querySelector('button'),hadFocus=root.ownerDocument?.activeElement===trigger;
      searching=true;
      if(!next){query=search.elements.query.value.trim();cursor=null;seen=new Set();}
      // New search results invalidate any prior selection and publication consent.
      candidates=[];select.innerHTML=`<option value="">${esc(w.choose)}</option>`;preview.innerHTML='';consent.checked=false;
      try {
        const data=await post({action:'librarySearch',query,cursor});
        if(!active()||epoch!==searchEpoch)return;
        const key=data.nextCursor===null?null:JSON.stringify(data.nextCursor);
        if(!Array.isArray(data.items)||data.items.length>12||!data.items.every(validPublicMaterial)||
          (data.nextCursor!==null&&(!validId(data.nextCursor?.id)||typeof data.nextCursor?.submittedAt!=='string'||!data.nextCursor.submittedAt||data.nextCursor.submittedAt.length>100||seen.has(key))))throw Error('invalid search');
        cursor=data.nextCursor;if(cursor)seen.add(key);candidates=data.items;
        select.innerHTML=`<option value="">${esc(w.choose)}</option>`+candidates.map(item=>`<option value="${esc(item.id)}" lang="${esc(item.locale)}">${esc(item.title)} — ${esc(item.reference)}</option>`).join('');
        const keepFocus=hadFocus&&root.ownerDocument?.activeElement===trigger;
        more.hidden=!cursor;
        status.textContent=candidates.length?w.found(candidates.length):w.noMatches;
        if(keepFocus)(candidates.length?select:status).focus();
      }catch{if(active())status.textContent=w.error;}
      finally{searching=false;}
    }
    open.onclick=async()=>{
      if(!active())return;
      if(status){await load();return;}
      panel.innerHTML=`<h4 tabindex="-1">${esc(w.heading)}</h4><p>${esc(w.help)}</p><p class="event-materials-status" role="status" tabindex="-1"></p><div class="event-materials-list"></div><button class="button event-materials-refresh" type="button">${esc(w.retry)}</button>`+
        (manage?`<form class="event-material-search"><label class="account-field"><span>${esc(w.search)}</span><input name="query" type="search" maxlength="100"></label><button type="submit" class="button">${esc(w.find)}</button></form><button type="button" class="button event-material-more" hidden>${esc(w.more)}</button><label class="account-field"><span>${esc(w.select)}</span><select class="event-material-select"><option value="">${esc(w.choose)}</option></select></label><div class="event-material-preview"></div><label class="account-check"><input class="event-material-consent" type="checkbox"><span>${esc(w.consent)}</span></label><button class="button event-material-attach" type="button">${esc(w.attach)}</button>`:'');
      status=panel.querySelector('.event-materials-status');list=panel.querySelector('.event-materials-list');
      panel.querySelector('.event-materials-refresh').onclick=()=>load();
      if(manage){
        search=panel.querySelector('.event-material-search');select=panel.querySelector('.event-material-select');preview=panel.querySelector('.event-material-preview');consent=panel.querySelector('.event-material-consent');more=panel.querySelector('.event-material-more');
        search.onsubmit=event=>{event.preventDefault();void find();};more.onclick=()=>find(true);
        select.onchange=()=>{if(!active())return;consent.checked=false;const item=candidates.find(item=>item.id===select.value);renderMaterialItems(preview,item?[item]:[],review,esc,active);};
        const attach=panel.querySelector('.event-material-attach');
        attach.onclick=()=>{if(!active())return;if(!consent.checked||!candidates.some(item=>item.id===select.value)){status.textContent=w.error;return;}void mutate('attachEventMaterial',select.value,attach);};
      }
      const hadFocus=root.ownerDocument?.activeElement===open;
      await load();
      if(active()&&hadFocus&&root.ownerDocument?.activeElement===open)panel.querySelector('h4')?.focus();
    };
  });
}
