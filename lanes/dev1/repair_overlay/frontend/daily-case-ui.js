import {chooseTransport, unwrap} from './transport.js';

const RESPONSE_SCHEMA='scripture.player.daily_case.v1';
const PLAN_SCHEMA='daily-case.v1';
const QUEUES=new Set(['CONTINUE','NEW','DUE','WEAK','REVIEW','CROSS_CONTEXT','SYNTHESIS','USER_REQUESTED']);
const RELATIONS=new Set(['EXACT','VARIANT','PASSAGE_REVISIT','CROSS_CONTEXT','SYNTHESIS','NONE']);
let generation=0;
let observer=null;

function el(tag,{id,className,text,attrs}={}){
  const node=document.createElement(tag);
  if(id)node.id=id;
  if(className)node.className=className;
  if(text!==undefined)node.textContent=String(text);
  for(const [key,value] of Object.entries(attrs||{}))node.setAttribute(key,String(value));
  return node;
}
function boundedText(value,name,max=256){
  if(typeof value!=='string'||!value||value.length>max)throw new Error(`Invalid ${name}`);
  return value;
}
function stringList(value,name,maxItems=64){
  if(!Array.isArray(value)||value.length>maxItems)throw new Error(`Invalid ${name}`);
  value.forEach((item,index)=>boundedText(item,`${name}[${index}]`));
  return value;
}
function validatePayload(data){
  if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Daily Case response must be an object');
  if(data.schema!==RESPONSE_SCHEMA||data.read_only!==true)throw new Error('Daily Case response contract mismatch');
  if(!Number.isInteger(data.candidate_count)||data.candidate_count<0)throw new Error('Invalid candidate_count');
  const plan=data.daily_case;
  if(!plan||typeof plan!=='object'||Array.isArray(plan)||plan.schema!==PLAN_SCHEMA)throw new Error('Daily Case plan contract mismatch');
  boundedText(plan.case_id,'case_id',128); boundedText(plan.title,'title',200);
  if(!Number.isInteger(plan.item_count)||plan.item_count<0||plan.item_count>50||!Array.isArray(plan.items)||plan.items.length!==plan.item_count)throw new Error('Invalid Daily Case item count');
  plan.items.forEach((item,index)=>{
    if(!item||typeof item!=='object'||Array.isArray(item)||item.position!==index+1)throw new Error('Invalid Daily Case position');
    boundedText(item.node_id,'node_id'); boundedText(item.task_family,'task_family',128);
    if(!QUEUES.has(item.queue)||!RELATIONS.has(item.relation))throw new Error('Invalid Daily Case scheduler metadata');
    stringList(item.concept_ids,'concept_ids'); stringList(item.passage_keys,'passage_keys');
    if(item.book_key!==null&&item.book_key!==undefined)boundedText(item.book_key,'book_key',128);
  });
  if(!Array.isArray(data.linear)||data.linear.length<plan.item_count+1)throw new Error('Incomplete Daily Case linear equivalent');
  data.linear.forEach((line,index)=>boundedText(line,`linear[${index}]`,1200));
  if(!data.truth||typeof data.truth!=='object'||data.truth.mutation!==false||data.truth.inferred_source_claims!==false)throw new Error('Daily Case truth contract mismatch');
  return data;
}
function textOrNone(values){return values.length?values.join(', '):'none'}
function hideSurface(){
  generation+=1;
  const view=document.getElementById('daily-case-view');
  if(view)view.classList.add('hidden');
}
function hideOtherViews(){
  document.querySelectorAll('main > section[id$="-view"]').forEach(section=>{
    if(section.id!=='daily-case-view')section.classList.add('hidden');
  });
}
function announce(message){
  const status=document.getElementById('daily-case-status');
  if(status)status.textContent=message;
}
function clearRendered(){
  const body=document.getElementById('daily-case-table-body');
  const linear=document.getElementById('daily-case-linear');
  if(body)body.replaceChildren();
  if(linear)linear.replaceChildren();
}
function render(data){
  const plan=data.daily_case;
  const title=document.getElementById('daily-case-title');
  const summary=document.getElementById('daily-case-summary');
  const body=document.getElementById('daily-case-table-body');
  const linear=document.getElementById('daily-case-linear');
  if(!title||!summary||!body||!linear)return;
  title.textContent=plan.title;
  summary.textContent=plan.item_count
    ? `${plan.item_count} завдань із ${data.candidate_count} канонічних кандидатів. Порядок визначений runtime Scheduler.`
    : `Немає допустимих source-audited завдань із ${data.candidate_count} канонічних кандидатів.`;
  body.replaceChildren();
  plan.items.forEach(item=>{
    const row=el('tr');
    [item.position,item.node_id,item.task_family,item.queue,item.relation,textOrNone(item.concept_ids),textOrNone(item.passage_keys),item.book_key||'none'].forEach(value=>row.append(el('td',{text:value})));
    body.append(row);
  });
  linear.replaceChildren();
  data.linear.forEach(line=>linear.append(el('li',{text:line})));
}
async function loadDailyCase({focusHeading=false}={}){
  const token=++generation;
  clearRendered(); announce('Завантаження Daily Case…');
  try{
    const data=validatePayload(unwrap(await chooseTransport().invoke('player.get_daily_case',{})));
    const view=document.getElementById('daily-case-view');
    if(token!==generation||!view||view.classList.contains('hidden'))return;
    render(data);
    announce(data.daily_case.item_count?`Daily Case завантажено: ${data.daily_case.item_count} завдань.`:'Daily Case завантажено: допустимих завдань немає.');
    if(focusHeading)document.getElementById('daily-case-heading')?.focus();
  }catch(error){
    const view=document.getElementById('daily-case-view');
    if(token!==generation||!view||view.classList.contains('hidden'))return;
    clearRendered();
    const summary=document.getElementById('daily-case-summary');
    if(summary)summary.textContent='Daily Case недоступний. Дані не були змінені.';
    announce(`Не вдалося завантажити Daily Case: ${error instanceof Error?error.message:'невідома помилка'}`);
  }
}
function openDailyCase(){
  hideOtherViews();
  const view=document.getElementById('daily-case-view');
  if(!view)return;
  view.classList.remove('hidden');
  document.getElementById('daily-case-heading')?.focus();
  void loadDailyCase();
}
function closeDailyCase(){
  hideSurface();
  const home=document.getElementById('nav-home');
  if(home)home.click();
  else{
    const homeView=document.getElementById('home-view');
    if(homeView)homeView.classList.remove('hidden');
    document.getElementById('main-content')?.focus();
  }
}
function addHeaderCell(row,text){const th=el('th',{text,attrs:{scope:'col'}});row.append(th)}
function buildSurface(){
  if(document.getElementById('daily-case-view'))return;
  const nav=document.querySelector('.top-nav');
  const main=document.getElementById('main-content');
  if(!nav||!main)return;

  const navButton=el('button',{id:'nav-daily-case',text:'Щоденна справа',attrs:{type:'button'}});
  navButton.addEventListener('click',openDailyCase);
  nav.append(navButton);

  const view=el('section',{id:'daily-case-view',className:'hidden',attrs:{'aria-labelledby':'daily-case-heading'}});
  const back=el('button',{className:'back-link',text:'← До головної',attrs:{type:'button'}});
  back.addEventListener('click',closeDailyCase); view.append(back);
  view.append(el('h2',{id:'daily-case-heading',text:'Щоденна справа',attrs:{tabindex:'-1'}}));
  view.append(el('p',{text:'Read-only добірка канонічних entry/current/review завдань. Eligibility і порядок визначає єдиний runtime Scheduler; ця поверхня не оцінює, не ранжує і не змінює стан гравця.'}));

  const controls=el('div',{className:'action-row'});
  const refresh=el('button',{id:'daily-case-refresh',text:'Оновити',attrs:{type:'button'}});
  refresh.addEventListener('click',()=>void loadDailyCase()); controls.append(refresh); view.append(controls);
  view.append(el('div',{id:'daily-case-status',className:'sr-status',attrs:{role:'status','aria-live':'polite','aria-atomic':'true'}}));

  const summarySection=el('section',{className:'surface subtle',attrs:{'aria-labelledby':'daily-case-title'}});
  summarySection.append(el('h3',{id:'daily-case-title',text:'Daily Case'}));
  summarySection.append(el('p',{id:'daily-case-summary',text:'Daily Case ще не завантажено.'}));
  view.append(summarySection);

  const tableSection=el('section',{className:'surface',attrs:{'aria-labelledby':'daily-case-table-heading'}});
  tableSection.append(el('h3',{id:'daily-case-table-heading',text:'Таблиця завдань'}));
  const table=el('table',{id:'daily-case-table'});
  table.append(el('caption',{text:'Канонічний Daily Case у порядку Scheduler'}));
  const thead=el('thead'); const header=el('tr');
  ['№','Node','Family','Queue','Relation','Concepts','Passages','Book'].forEach(text=>addHeaderCell(header,text));
  thead.append(header); table.append(thead); table.append(el('tbody',{id:'daily-case-table-body'})); tableSection.append(table); view.append(tableSection);

  const linearSection=el('section',{className:'surface subtle',attrs:{'aria-labelledby':'daily-case-linear-heading'}});
  linearSection.append(el('h3',{id:'daily-case-linear-heading',text:'Повний лінійний еквівалент'}));
  linearSection.append(el('p',{text:'Цей список містить ту саму послідовність і scheduler-метадані без просторової залежності від таблиці.'}));
  linearSection.append(el('ol',{id:'daily-case-linear'})); view.append(linearSection);
  main.append(view);

  observer=new MutationObserver(()=>{
    if(view.classList.contains('hidden'))return;
    const anotherVisible=[...document.querySelectorAll('main > section[id$="-view"]')].some(section=>section!==view&&!section.classList.contains('hidden'));
    if(anotherVisible)hideSurface();
  });
  observer.observe(main,{subtree:false,childList:true});
  document.querySelectorAll('main > section[id$="-view"]').forEach(section=>observer.observe(section,{attributes:true,attributeFilter:['class']}));
}

if(typeof document!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',buildSurface,{once:true});
  else buildSurface();
}

export {buildSurface, validatePayload};
