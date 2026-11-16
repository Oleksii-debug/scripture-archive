const COPY={
  uk:{memberHelp:'Тут доступна лише команда, до якої ви вже належите. Запрошення, ролі та вихід — на сторінці групи.',open:'Моя волонтерська команда',manage:'Волонтерська команда заходу',help:'Виберіть власну приватну групу з приватним списком учасників. Запрошення, ролі й вихід із команди доступні на сторінці групи. Відвідувачі події не побачать її назву, склад або код запрошення.',empty:'Доступної вам команди для цієї події немає.',group:'Приватна група для координації',choose:'Виберіть групу',more:'Ще мої приватні групи',confirm:'Підтверджую використання вибраної групи для координації цього заходу.',save:'Підключити команду',clear:'Відключити команду від заходу',reload:'Оновити команду',saved:'Команду оновлено.',error:'Не вдалося виконати дію. Оновіть команду та повторіть вибір.',visit:'Відкрити групу команди',create:'Створити приватну групу',loading:'Завантаження команди…'},
  ru:{memberHelp:'Здесь доступна только команда, в которой вы уже состоите. Приглашения, роли и выход — на странице группы.',open:'Моя волонтёрская команда',manage:'Волонтёрская команда события',help:'Выберите свою приватную группу с приватным списком участников. Приглашения, роли и выход из команды доступны на странице группы. Посетители события не увидят её название, состав или код приглашения.',empty:'Доступной вам команды для этого события нет.',group:'Приватная группа для координации',choose:'Выберите группу',more:'Ещё мои приватные группы',confirm:'Подтверждаю использование выбранной группы для координации этого события.',save:'Подключить команду',clear:'Отключить команду от события',reload:'Обновить команду',saved:'Команда обновлена.',error:'Не удалось выполнить действие. Обновите команду и повторите выбор.',visit:'Открыть группу команды',create:'Создать приватную группу',loading:'Загрузка команды…'},
  en:{memberHelp:'Only a team you already belong to is available here. Invitations, roles and leaving are on the group page.',open:'My volunteer team',manage:'Event volunteer team',help:'Choose a private group you own with a private roster. Invitations, roles and leaving the team are available on the group page. Event visitors will not see its name, members or invite code.',empty:'No team for this event is available to you.',group:'Private coordination group',choose:'Choose a group',more:'More of my private groups',confirm:'I confirm using this group to coordinate this event.',save:'Connect team',clear:'Disconnect team from event',reload:'Refresh team',saved:'Team updated.',error:'The action could not be completed. Refresh the team and choose again.',visit:'Open team group',create:'Create a private group',loading:'Loading team…'},
};
const copy=lang=>Object.hasOwn(COPY,lang)?COPY[lang]:COPY.uk;
const validId=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(value);
const validTeam=team=>team===null||(team&&validId(team.id)&&typeof team.name==='string'&&team.name.trim()&&team.name.length<=100);
async function api(params,body){
  const response=await fetch('/api/event-teams'+(params?'?'+new URLSearchParams(params):''),body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:undefined);
  const data=await response.json();if(!response.ok)throw Error('team unavailable');return data;
}
export function eventTeamControl(item,lang,esc,manage=false){const w=copy(lang);return `<section class="event-team" data-event-id="${esc(item.id)}" data-manage="${manage?'1':'0'}"><button type="button" class="button event-team-open">${esc(manage?w.manage:w.open)}</button><div class="event-team-panel"></div></section>`;}
const invalidate=new WeakMap();
export function mountEventTeams(root,lang,esc,isCurrent){
  const w=copy(lang);
  root.querySelectorAll('.event-team').forEach(container=>{
    if(container.dataset.bound==='1')return;container.dataset.bound='1';
    const manage=container.dataset.manage==='1',eventId=container.dataset.eventId,panel=container.querySelector('.event-team-panel'),open=container.querySelector('.event-team-open');
    const active=()=>{try{return container.isConnected!==false&&isCurrent()===true;}catch{return false;}};
    let epoch=0,loading=false,saving=false,optionsLoading=false,known=false,revision=null,cursor=null,seen=new Set(),groups=[];
    let status,current,select,consent,save,clear,more;
    invalidate.set(container,()=>{epoch++;loading=false;known=false;if(current)current.innerHTML='';});
    async function load(){
      if(!active()||loading||saving)return;
      const token=++epoch;loading=true;known=false;status.textContent=w.loading;current.innerHTML='';if(consent)consent.checked=false;
      try{
        const data=await api({eventId,view:manage?'manage':'member'});
        if(!active()||token!==epoch)return;
        if(!validTeam(data.team)||(manage&&data.revision!==null&&!validId(data.revision)))throw Error('invalid team');
        revision=manage?data.revision:null;known=true;
        current.innerHTML=data.team?`<p>${esc(data.team.name)}</p><a class="button" href="/groups/${encodeURIComponent(data.team.id)}">${esc(w.visit)}</a>`:`<p>${esc(w.empty)}</p>`;
        if(clear)clear.hidden=revision===null;
        status.textContent='';
      }catch{if(active()&&token===epoch)status.textContent=w.error;}
      finally{if(token===epoch)loading=false;}
    }
    async function options(){
      if(!active()||optionsLoading)return;optionsLoading=true;
      const token=epoch,oldCursor=cursor,hadFocus=root.ownerDocument?.activeElement===more;
      try{
        const data=await api({view:'options',...(oldCursor?{after:oldCursor}:{})});
        if(!active()||token!==epoch)return;
        if(!Array.isArray(data.items)||data.items.length>100||!data.items.every(item=>item!==null&&validTeam(item))||
          (data.nextCursor!==null&&(!validId(data.nextCursor)||seen.has(data.nextCursor))))throw Error('invalid groups');
        const selected=select.value;for(const group of data.items)if(!groups.some(item=>item.id===group.id))groups.push(group);
        cursor=data.nextCursor;if(cursor)seen.add(cursor);
        select.innerHTML=`<option value="">${esc(w.choose)}</option>`+groups.map(group=>`<option value="${esc(group.id)}">${esc(group.name)}</option>`).join('');select.value=selected;
        const keepFocus=hadFocus&&root.ownerDocument?.activeElement===more;more.hidden=!cursor;
        if(keepFocus)select.focus();
      }catch{if(active()&&token===epoch)status.textContent=w.error;}
      finally{optionsLoading=false;}
    }
    async function write(action,button){
      if(!active()||saving||loading)return;
      if(!known||(action==='set'&&(!consent.checked||!groups.some(group=>group.id===select.value)))){status.textContent=w.error;return;}
      saving=true;button.setAttribute('aria-disabled','true');
      try{
        const data=await api(null,{action,eventId,expectedRevision:revision,...(action==='set'?{groupId:select.value,confirm:true}:{})});
        if(!active())return;
        if(data?.ok!==true)throw Error('unconfirmed team');
        const hadFocus=root.ownerDocument?.activeElement===button;
        root.querySelectorAll('.event-team').forEach(other=>{if(other.dataset.eventId===eventId)invalidate.get(other)?.();});
        saving=false;await load();
        if(!active())return;
        if(known)status.textContent=w.saved;
        if(hadFocus&&(root.ownerDocument?.activeElement===button||root.ownerDocument?.activeElement===root.ownerDocument?.body))status.focus();
      }catch{if(active()){known=false;status.textContent=w.error;}}
      finally{saving=false;button.removeAttribute('aria-disabled');}
    }
    open.onclick=async()=>{
      if(!active())return;
      if(status){await load();return;}
      panel.innerHTML=`<h4 tabindex="-1">${esc(w.manage)}</h4><p>${esc(manage?w.help:w.memberHelp)}</p><p class="event-team-status" role="status" tabindex="-1"></p><div class="event-team-current"></div><button class="button event-team-reload" type="button">${esc(w.reload)}</button>`+
        (manage?`<label class="account-field"><span>${esc(w.group)}</span><select class="event-team-select"><option value="">${esc(w.choose)}</option></select></label><button class="button event-team-more" type="button" hidden>${esc(w.more)}</button><a href="/groups">${esc(w.create)}</a><label class="account-check"><input class="event-team-consent" type="checkbox"><span>${esc(w.confirm)}</span></label><button class="button event-team-save" type="button">${esc(w.save)}</button><button class="button event-team-clear" type="button" hidden>${esc(w.clear)}</button>`:'');
      status=panel.querySelector('.event-team-status');current=panel.querySelector('.event-team-current');
      panel.querySelector('.event-team-reload').onclick=async()=>{await load();if(manage&&known){cursor=null;seen=new Set();groups=[];await options();}};
      if(manage){
        select=panel.querySelector('.event-team-select');consent=panel.querySelector('.event-team-consent');save=panel.querySelector('.event-team-save');clear=panel.querySelector('.event-team-clear');more=panel.querySelector('.event-team-more');
        select.onchange=()=>{if(active())consent.checked=false;};more.onclick=()=>{if(cursor)void options();};save.onclick=()=>write('set',save);clear.onclick=()=>write('clear',clear);
      }
      const hadFocus=root.ownerDocument?.activeElement===open;await load();if(manage&&active()&&known)await options();
      if(active()&&hadFocus&&root.ownerDocument?.activeElement===open)panel.querySelector('h4')?.focus();
    };
  });
}
