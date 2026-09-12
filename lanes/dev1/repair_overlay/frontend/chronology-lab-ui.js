import {chooseTransport, unwrap} from './transport.js';

const RESPONSE_SCHEMA='scripture.research.chronology.v1';
const SOURCE_STATUSES=new Set(['SOURCE_BACKED_ASSERTIONS','NO_SOURCE_BACKED_ASSERTIONS']);
const KINDS=new Set(['EXACT','RANGE','RELATIVE','UNKNOWN']);
const RELATIONS=new Set(['BEFORE','AFTER','SAME_TIME','OVERLAPS']);
const CONFIDENCE=new Set(['T1','T2','C1','I1','D1']);
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
function safeText(value,name,max=2000,{allowEmpty=false}={}){
  if(typeof value!=='string'||(!allowEmpty&&!value)||value.length>max)throw new Error(`Invalid ${name}`);
  for(const ch of value){const code=ch.codePointAt(0);if(code<32||(code>=127&&code<=159)||code===8232||code===8233)throw new Error(`Unsafe ${name}`)}
  return value;
}
function nullableText(value,name,max=2000){
  if(value===null||value===undefined)return null;
  return safeText(value,name,max);
}
function idList(value,name,maxItems=256){
  if(!Array.isArray(value)||value.length>maxItems)throw new Error(`Invalid ${name}`);
  value.forEach((item,index)=>safeText(item,`${name}[${index}]`,256));
  return value;
}
function validateRow(row,index){
  if(!row||typeof row!=='object'||Array.isArray(row))throw new Error(`Invalid rows[${index}]`);
  safeText(row.assertion_id,`rows[${index}].assertion_id`,256);
  safeText(row.event_id,`rows[${index}].event_id`,256);
  safeText(row.event,`rows[${index}].event`,1000);
  if(!KINDS.has(row.temporal_kind))throw new Error(`Invalid rows[${index}].temporal_kind`);
  safeText(row.temporal,`rows[${index}].temporal`,2000);
  nullableText(row.order_scale_id,`rows[${index}].order_scale_id`,256);
  nullableText(row.relative_to_event_id,`rows[${index}].relative_to_event_id`,256);
  if(row.relative_relation!==null&&row.relative_relation!==undefined&&!RELATIONS.has(row.relative_relation))throw new Error(`Invalid rows[${index}].relative_relation`);
  if(!CONFIDENCE.has(row.confidence)||typeof row.tx1!=='boolean')throw new Error(`Invalid rows[${index}] confidence`);
  nullableText(row.witness,`rows[${index}].witness`,256);
  idList(row.passage_ids,`rows[${index}].passage_ids`);
  idList(row.evidence_ids,`rows[${index}].evidence_ids`);
  safeText(row.source_scope,`rows[${index}].source_scope`,2000);
  nullableText(row.uncertainty,`rows[${index}].uncertainty`,2000);
  return row;
}
function validatePayload(data){
  if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Chronology Lab response must be an object');
  if(data.schema!==RESPONSE_SCHEMA||data.read_only!==true||!SOURCE_STATUSES.has(data.source_status))throw new Error('Chronology Lab response contract mismatch');
  if(!Number.isInteger(data.assertion_count)||data.assertion_count<0||data.assertion_count>10000)throw new Error('Invalid assertion_count');
  if(!Array.isArray(data.rows)||data.rows.length!==data.assertion_count)throw new Error('Chronology row count mismatch');
  data.rows.forEach(validateRow);
  if(!Array.isArray(data.linear)||data.linear.length!==data.rows.length)throw new Error('Incomplete Chronology Lab linear equivalent');
  data.linear.forEach((line,index)=>safeText(line,`linear[${index}]`,6000));
  if(data.assertion_count===0)safeText(data.empty_message,'empty_message',1000);
  else if(data.empty_message!==null)throw new Error('Non-empty chronology cannot carry empty_message');
  if(!data.truth||typeof data.truth!=='object'||data.truth.mutation!==false||data.truth.inferred_chronology!==false||data.truth.narrative_order_used!==false||data.truth.automatic_harmonization!==false)throw new Error('Chronology truth contract mismatch');
  return data;
}
function hideSurface(){generation+=1;document.getElementById('chronology-lab-view')?.classList.add('hidden')}
function hideOtherViews(){
  document.querySelectorAll('main > section[id$="-view"]').forEach(section=>{
    if(section.id!=='chronology-lab-view')section.classList.add('hidden');
  });
}
function announce(message){const status=document.getElementById('chronology-lab-status');if(status)status.textContent=message}
function clearRendered(){document.getElementById('chronology-lab-table-body')?.replaceChildren();document.getElementById('chronology-lab-linear')?.replaceChildren()}
function joinIds(values){return values.length?values.join(', '):'none'}
function relationText(row){
  const parts=[];
  if(row.relative_relation)parts.push(`${row.relative_relation} ${row.relative_to_event_id}`);
  if(row.order_scale_id)parts.push(`order-scale ${row.order_scale_id}`);
  return parts.length?parts.join('; '):'none declared';
}
function render(data){
  const summary=document.getElementById('chronology-lab-summary');
  const body=document.getElementById('chronology-lab-table-body');
  const linear=document.getElementById('chronology-lab-linear');
  if(!summary||!body||!linear)return;
  summary.textContent=data.assertion_count
    ? `${data.assertion_count} source-backed chronology assertions. Dates and ordering are shown only when explicitly supplied by canonical structured data.`
    : data.empty_message;
  body.replaceChildren();
  data.rows.forEach(row=>{
    const tr=el('tr');
    [
      `${row.event} (${row.event_id})`,row.temporal,row.temporal_kind,relationText(row),
      `${row.confidence}${row.tx1?' TX1':''}`,row.witness||'not specified',row.source_scope,
      joinIds(row.passage_ids),joinIds(row.evidence_ids),row.uncertainty||'none'
    ].forEach(value=>tr.append(el('td',{text:value})));
    body.append(tr);
  });
  linear.replaceChildren();
  if(data.linear.length)data.linear.forEach(line=>linear.append(el('li',{text:line})));
  else linear.append(el('li',{text:data.empty_message}));
}
async function loadChronology({focusHeading=false}={}){
  const token=++generation;clearRendered();announce('Loading Chronology Lab…');
  try{
    const data=validatePayload(unwrap(await chooseTransport().invoke('research.get_chronology_lab',{})));
    const view=document.getElementById('chronology-lab-view');
    if(token!==generation||!view||view.classList.contains('hidden'))return;
    render(data);
    announce(data.assertion_count?`Chronology Lab loaded: ${data.assertion_count} assertions.`:'Chronology Lab loaded: no source-backed assertions are available.');
    if(focusHeading)document.getElementById('chronology-lab-heading')?.focus();
  }catch(error){
    const view=document.getElementById('chronology-lab-view');
    if(token!==generation||!view||view.classList.contains('hidden'))return;
    clearRendered();
    const summary=document.getElementById('chronology-lab-summary');
    if(summary)summary.textContent='Chronology Lab is unavailable. No chronology was inferred or substituted.';
    announce(`Chronology Lab could not be loaded: ${error instanceof Error?error.message:'unknown error'}`);
  }
}
function openChronology(){
  hideOtherViews();
  const view=document.getElementById('chronology-lab-view');if(!view)return;
  view.classList.remove('hidden');document.getElementById('chronology-lab-heading')?.focus();void loadChronology();
}
function closeChronology(){
  hideSurface();const home=document.getElementById('nav-home');
  if(home)home.click();else{document.getElementById('home-view')?.classList.remove('hidden');document.getElementById('main-content')?.focus()}
}
function addHeaderCell(row,text){row.append(el('th',{text,attrs:{scope:'col'}}))}
function buildSurface(){
  if(document.getElementById('chronology-lab-view'))return;
  const nav=document.querySelector('.top-nav');const main=document.getElementById('main-content');if(!nav||!main)return;
  const navButton=el('button',{id:'nav-chronology-lab',text:'Хронологія',attrs:{type:'button'}});navButton.addEventListener('click',openChronology);nav.append(navButton);
  const view=el('section',{id:'chronology-lab-view',className:'hidden',attrs:{'aria-labelledby':'chronology-lab-heading'}});
  const back=el('button',{className:'back-link',text:'← До головної',attrs:{type:'button'}});back.addEventListener('click',closeChronology);view.append(back);
  view.append(el('h2',{id:'chronology-lab-heading',text:'Chronology Lab',attrs:{tabindex:'-1'}}));
  view.append(el('p',{text:'Read-only chronology from canonical structured assertions only. Narrative order, verse numbering, prose, omission, and unrelated order scales never become invented dates or sequence.'}));
  const controls=el('div',{className:'action-row'});const refresh=el('button',{id:'chronology-lab-refresh',text:'Оновити',attrs:{type:'button'}});refresh.addEventListener('click',()=>void loadChronology());controls.append(refresh);view.append(controls);
  view.append(el('div',{id:'chronology-lab-status',className:'sr-status',attrs:{role:'status','aria-live':'polite','aria-atomic':'true'}}));
  const summarySection=el('section',{className:'surface subtle',attrs:{'aria-labelledby':'chronology-lab-summary-heading'}});summarySection.append(el('h3',{id:'chronology-lab-summary-heading',text:'Source status'}));summarySection.append(el('p',{id:'chronology-lab-summary',text:'Chronology Lab has not been loaded.'}));view.append(summarySection);
  const tableSection=el('section',{className:'surface',attrs:{'aria-labelledby':'chronology-lab-table-heading'}});tableSection.append(el('h3',{id:'chronology-lab-table-heading',text:'Source-backed chronology table'}));
  const table=el('table',{id:'chronology-lab-table'});table.append(el('caption',{text:'Chronology assertions with explicit provenance, uncertainty, and relation metadata'}));const thead=el('thead');const header=el('tr');['Event','Temporal statement','Kind','Declared relation / order scale','Confidence','Witness','Source scope','Passages','Evidence','Uncertainty'].forEach(text=>addHeaderCell(header,text));thead.append(header);table.append(thead);table.append(el('tbody',{id:'chronology-lab-table-body'}));tableSection.append(table);view.append(tableSection);
  const linearSection=el('section',{className:'surface subtle',attrs:{'aria-labelledby':'chronology-lab-linear-heading'}});linearSection.append(el('h3',{id:'chronology-lab-linear-heading',text:'Повний лінійний еквівалент'}));linearSection.append(el('p',{text:'The list carries the same chronology assertions and provenance without requiring spatial or visual interpretation.'}));linearSection.append(el('ol',{id:'chronology-lab-linear'}));view.append(linearSection);main.append(view);
  observer=new MutationObserver(()=>{if(view.classList.contains('hidden'))return;const anotherVisible=[...document.querySelectorAll('main > section[id$="-view"]')].some(section=>section!==view&&!section.classList.contains('hidden'));if(anotherVisible)hideSurface()});observer.observe(main,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
}

if(typeof document!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',buildSurface,{once:true});
  else buildSurface();
}

export {buildSurface, validatePayload};
