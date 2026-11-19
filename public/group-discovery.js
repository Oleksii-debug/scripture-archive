const COPY={
 uk:{label:'Пошук публічних груп',hint:'Назва, громада, місто, країна або опис. Приватні групи й коди запрошень не входять до пошуку.',kind:'Формат навчання',all:'Усі групи',regular:'Звичайні групи',marathon:'Навчальні марафони',search:'Знайти групи',more:'Продовжити пошук груп',loading:'Пошук груп…',empty:'Збігів не знайдено.',continue:'Можна продовжити пошук.',error:'Не вдалося завантажити групи. Повторіть пошук або продовження.',heading:'Знайдені групи, частина',found:n=>'Груп у цій частині: '+n+'.'},
 ru:{label:'Поиск публичных групп',hint:'Название, община, город, страна или описание. Приватные группы и коды приглашений не входят в поиск.',kind:'Формат обучения',all:'Все группы',regular:'Обычные группы',marathon:'Учебные марафоны',search:'Найти группы',more:'Продолжить поиск групп',loading:'Поиск групп…',empty:'Совпадений не найдено.',continue:'Можно продолжить поиск.',error:'Не удалось загрузить группы. Повторите поиск или продолжение.',heading:'Найденные группы, часть',found:n=>'Групп в этой части: '+n+'.'},
 en:{label:'Search public groups',hint:'Name, community, city, country or description. Private groups and invitation codes are not searched.',kind:'Study format',all:'All groups',regular:'Regular groups',marathon:'Study marathons',search:'Find groups',more:'Continue group search',loading:'Searching groups…',empty:'No matches found.',continue:'You can continue searching.',error:'Could not load groups. Retry the search or continuation.',heading:'Group results, part',found:n=>'Groups in this part: '+n+'.'},
};
export async function mountGroupDiscovery(root,lang,esc,cardMarkup,isCurrent=()=>true){
 const w=typeof lang==='string'&&Object.hasOwn(COPY,lang)?COPY[lang]:COPY.uk;
 const active=()=>{try{return root?.isConnected!==false&&isCurrent()===true;}catch{return false;}};
 if(!root||!active())return;
 root.innerHTML=`<form class="group-discovery-search"><label class="account-field"><span>${esc(w.label)}</span><input name="query" type="search" maxlength="100" aria-describedby="group-discovery-hint"></label><label class="account-field"><span>${esc(w.kind)}</span><select name="marathon"><option value="">${esc(w.all)}</option><option value="false">${esc(w.regular)}</option><option value="true">${esc(w.marathon)}</option></select></label><p id="group-discovery-hint">${esc(w.hint)}</p><button class="button" type="submit">${esc(w.search)}</button></form><p class="group-discovery-status" role="status"></p><div class="group-discovery-results"></div><button class="button group-discovery-more" type="button" hidden>${esc(w.more)}</button>`;
 const form=root.querySelector('form'),input=form.querySelector('input'),format=form.querySelector('select'),button=form.querySelector('button');
 const status=root.querySelector('.group-discovery-status'),results=root.querySelector('.group-discovery-results'),more=root.querySelector('.group-discovery-more');
 let generation=0,loading=false,cursor=null,filters={query:'',marathon:null},page=0;
 const seen=new Set(),ids=new Set();
 async function load(nextFilters,after,trigger){
  if(!active())return;
  const current=++generation,doc=root.ownerDocument,focused=Boolean(trigger&&doc?.activeElement===trigger);
  loading=true;status.textContent=w.loading;
  try{
   const response=await fetch('/api/groups?action=directorySearch',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...nextFilters,cursor:after}),cache:'no-store'});
   if(!response.ok)throw Error('search_failed');const data=await response.json();
   if(!active()||generation!==current)return;
   if(!Array.isArray(data?.groups)||data.groups.length>12||
      !(data.nextCursor===null||(typeof data.nextCursor==='string'&&data.nextCursor.length>0&&data.nextCursor.length<=80&&data.nextCursor.trim()===data.nextCursor&&!seen.has(data.nextCursor)))||
      !data.groups.every(g=>g&&typeof g.id==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(g.id)&&typeof g.name==='string'&&g.name.trim()&&g.name.length<=100&&g.visibility==='public'&&!Object.hasOwn(g,'inviteCode')))
     throw Error('invalid_group_page');
   const fresh=data.groups.filter(g=>!ids.has(g.id));
   const heading='group-discovery-page-'+(page+1);
   const cards=fresh.map(cardMarkup).join('');
   results.insertAdjacentHTML('beforeend',`<section aria-labelledby="${heading}"><h3 id="${heading}" tabindex="-1">${esc(w.heading)} ${page+1}</h3>${fresh.length?`<div class="group-grid">${cards}</div>`:`<p>${esc(w.empty)}</p>`}</section>`);
   fresh.forEach(g=>ids.add(g.id));page++;cursor=data.nextCursor;filters=nextFilters;if(cursor)seen.add(cursor);
   status.textContent=(fresh.length?w.found(fresh.length):w.empty)+(cursor?' '+w.continue:'');
   const restore=focused&&doc.activeElement===trigger;more.hidden=!cursor;
   if(restore)results.querySelector('#'+heading)?.focus();
  }catch{if(active()&&generation===current)status.textContent=w.error;}
  finally{if(generation===current)loading=false;}
 }
 form.onsubmit=event=>{
  event.preventDefault();if(!active())return;
  // A new query retires an older response without replacing author/join forms.
  cursor=null;page=0;seen.clear();ids.clear();results.innerHTML='';more.hidden=true;
  void load({query:input.value.trim(),marathon:format.value==='true'?true:format.value==='false'?false:null},null,button);
 };
 more.onclick=()=>{if(active()&&!loading&&cursor)void load(filters,cursor,more);};
 await load(filters,null,null);
}
