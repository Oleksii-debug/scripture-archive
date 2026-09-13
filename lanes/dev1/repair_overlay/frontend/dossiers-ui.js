import {chooseTransport, unwrap} from './transport.js';

const RESPONSE_SCHEMA='scripture.research.dossiers.v1';
const DOSSIER_SCHEMA='scripture.dossier-view.v1';
const KINDS=new Set(['PERSON','EVENT','PLACE','THEME']);
const ROW_TYPES=new Set(['EVIDENCE','CLAIM','RELATION']);
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
function safeText(value,name,max=6000,{allowEmpty=false}={}){
  if(typeof value!=='string'||(!allowEmpty&&!value)||value.length>max)throw new Error(`Invalid ${name}`);
  for(const ch of value){const code=ch.codePointAt(0);if(code<32||(code>=127&&code<=159)||code===8232||code===8233)throw new Error(`Unsafe ${name}`)}
  return value;
}
function nullableText(value,name,max=2000){
  if(value===null||value===undefined)return null;
  return safeText(value,name,max);
}
function textList(value,name,maxItems=512){
  if(!Array.isArray(value)||value.length>maxItems)throw new Error(`Invalid ${name}`);
  value.forEach((item,index)=>safeText(item,`${name}[${index}]`,512));
  return value;
}
function validateRow(row,dossierIndex,rowIndex){
  const prefix=`dossiers[${dossierIndex}].rows[${rowIndex}]`;
  if(!row||typeof row!=='object'||Array.isArray(row)||!ROW_TYPES.has(row.row_type))throw new Error(`Invalid ${prefix}`);
  safeText(row.row_id,`${prefix}.row_id`,512);
  safeText(row.proposition,`${prefix}.proposition`,6000);
  if(row.confidence!==null&&row.confidence!==undefined&&!CONFIDENCE.has(row.confidence))throw new Error(`Invalid ${prefix}.confidence`);
  if(typeof row.tx1!=='boolean')throw new Error(`Invalid ${prefix}.tx1`);
  nullableText(row.witness,`${prefix}.witness`,512);
  if(typeof row.source_scope!=='string'||row.source_scope.length>3000)throw new Error(`Invalid ${prefix}.source_scope`);
  nullableText(row.uncertainty,`${prefix}.uncertainty`,3000);
  textList(row.passage_ids,`${prefix}.passage_ids`);
  textList(row.evidence_ids,`${prefix}.evidence_ids`);
  nullableText(row.relation_type,`${prefix}.relation_type`,512);
  nullableText(row.related_id,`${prefix}.related_id`,512);
  if(!Array.isArray(row.passage_witnesses)||row.passage_witnesses.length>512)throw new Error(`Invalid ${prefix}.passage_witnesses`);
  row.passage_witnesses.forEach((item,index)=>{
    if(!item||typeof item!=='object'||Array.isArray(item))throw new Error(`Invalid ${prefix}.passage_witnesses[${index}]`);
    safeText(item.passage_id,`${prefix}.passage_witnesses[${index}].passage_id`,512);
    nullableText(item.witness,`${prefix}.passage_witnesses[${index}].witness`,512);
  });
  return row;
}
function validateDossier(dossier,index){
  if(!dossier||typeof dossier!=='object'||Array.isArray(dossier)||dossier.schema!==DOSSIER_SCHEMA)throw new Error(`Invalid dossiers[${index}]`);
  const subject=dossier.subject;
  if(!subject||typeof subject!=='object'||Array.isArray(subject))throw new Error(`Invalid dossiers[${index}].subject`);
  safeText(subject.subject_id,`dossiers[${index}].subject.subject_id`,512);
  safeText(subject.display_name,`dossiers[${index}].subject.display_name`,512);
  if(!KINDS.has(subject.kind))throw new Error(`Invalid dossiers[${index}].subject.kind`);
  if(dossier.stated!==true)throw new Error(`Packaged dossiers must include only source-safe stated views`);
  if(dossier.status_text!=='Supported by cited canonical records')throw new Error(`Invalid dossiers[${index}].status_text`);
  if(!Array.isArray(dossier.rows)||dossier.rows.length<1||dossier.rows.length>5000)throw new Error(`Invalid dossiers[${index}].rows`);
  dossier.rows.forEach((row,rowIndex)=>validateRow(row,index,rowIndex));
  textList(dossier.linear,`dossiers[${index}].linear`,5001);
  if(dossier.linear.length<2)throw new Error(`Incomplete dossiers[${index}].linear`);
  return dossier;
}
function validatePayload(data){
  if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Dossiers response must be an object');
  if(data.schema!==RESPONSE_SCHEMA||data.read_only!==true||data.evidence_scope!=='unlocked_only'||data.truth_owner!=='D5/runtime')throw new Error('Dossiers response contract mismatch');
  if(!Number.isInteger(data.dossier_count)||data.dossier_count<0||data.dossier_count>10000)throw new Error('Invalid dossier_count');
  if(!Array.isArray(data.dossiers)||data.dossiers.length!==data.dossier_count)throw new Error('Dossier count mismatch');
  data.dossiers.forEach(validateDossier);
  textList(data.linear,'linear',50000);
  if(!data.truth||typeof data.truth!=='object'||data.truth.mutation!==false||data.truth.locked_evidence_exposed!==false||data.truth.inferred_subject_labels!==false||data.truth.automatic_harmonization!==false)throw new Error('Dossiers truth contract mismatch');
  return data;
}
function hideSurface(){generation+=1;document.getElementById('dossiers-view')?.classList.add('hidden')}
function hideOtherViews(){
  document.querySelectorAll('main > section[id$="-view"]').forEach(section=>{
    if(section.id!=='dossiers-view')section.classList.add('hidden');
  });
}
function announce(message){const status=document.getElementById('dossiers-status');if(status)status.textContent=message}
function clearRendered(){document.getElementById('dossiers-table-body')?.replaceChildren();document.getElementById('dossiers-linear')?.replaceChildren()}
function joinIds(values){return values.length?values.join(', '):'none'}
function witnessText(row){
  if(row.passage_witnesses.length)return row.passage_witnesses.map(item=>`${item.passage_id}@${item.witness||'not_stated'}`).join(', ');
  return row.witness||'not stated';
}
function render(data){
  const summary=document.getElementById('dossiers-summary');
  const body=document.getElementById('dossiers-table-body');
  const linear=document.getElementById('dossiers-linear');
  if(!summary||!body||!linear)return;
  summary.textContent=data.dossier_count
    ? `${data.dossier_count} source-safe dossiers from currently unlocked canonical evidence.`
    : 'No source-safe unlocked dossier records are available in the current scope.';
  body.replaceChildren();
  data.dossiers.forEach(dossier=>{
    dossier.rows.forEach(row=>{
      const tr=el('tr');
      const relation=row.relation_type?`${row.relation_type} → ${row.related_id||'not stated'}`:'none';
      [
        `${dossier.subject.display_name} (${dossier.subject.kind})`,row.row_type,row.proposition,
        row.confidence?`${row.confidence}${row.tx1?' TX1':''}`:(row.tx1?'TX1':'not stated'),witnessText(row),
        row.source_scope||'not stated',joinIds(row.passage_ids),joinIds(row.evidence_ids),relation,row.uncertainty||'none'
      ].forEach(value=>tr.append(el('td',{text:value})));
      body.append(tr);
    });
  });
  linear.replaceChildren();
  data.linear.forEach(line=>linear.append(el('li',{text:line})));
}
async function loadDossiers({focusHeading=false}={}){
  const token=++generation;clearRendered();announce('Loading Dossiers…');
  try{
    const data=validatePayload(unwrap(await chooseTransport().invoke('research.get_dossiers',{})));
    const view=document.getElementById('dossiers-view');
    if(token!==generation||!view||view.classList.contains('hidden'))return;
    render(data);
    announce(data.dossier_count?`Dossiers loaded: ${data.dossier_count}.`:'Dossiers loaded: current unlocked scope has no source-safe dossier records.');
    if(focusHeading)document.getElementById('dossiers-heading')?.focus();
  }catch(error){
    const view=document.getElementById('dossiers-view');
    if(token!==generation||!view||view.classList.contains('hidden'))return;
    clearRendered();
    const summary=document.getElementById('dossiers-summary');
    if(summary)summary.textContent='Dossiers are unavailable. No locked, inferred, or substituted source claims were shown.';
    announce(`Dossiers could not be loaded: ${error instanceof Error?error.message:'unknown error'}`);
  }
}
function openDossiers(){
  hideOtherViews();
  const view=document.getElementById('dossiers-view');if(!view)return;
  view.classList.remove('hidden');document.getElementById('dossiers-heading')?.focus();void loadDossiers();
}
function closeDossiers(){
  hideSurface();const home=document.getElementById('nav-home');
  if(home)home.click();else{document.getElementById('home-view')?.classList.remove('hidden');document.getElementById('main-content')?.focus()}
}
function addHeaderCell(row,text){row.append(el('th',{text,attrs:{scope:'col'}}))}
function buildSurface(){
  if(document.getElementById('dossiers-view'))return;
  const nav=document.querySelector('.top-nav');const main=document.getElementById('main-content');if(!nav||!main)return;
  const navButton=el('button',{id:'nav-dossiers',text:'Dossiers',attrs:{type:'button'}});navButton.addEventListener('click',openDossiers);nav.append(navButton);
  const view=el('section',{id:'dossiers-view',className:'hidden',attrs:{'aria-labelledby':'dossiers-heading'}});
  const back=el('button',{className:'back-link',text:'← До головної',attrs:{type:'button'}});back.addEventListener('click',closeDossiers);view.append(back);
  view.append(el('h2',{id:'dossiers-heading',text:'Dossiers',attrs:{tabindex:'-1'}}));
  view.append(el('p',{text:'Read-only dossiers derived only from currently unlocked canonical evidence. Locked records, conflicting witness attributions, inferred labels, and automatic harmonization are not exposed.'}));
  const controls=el('div',{className:'action-row'});const refresh=el('button',{id:'dossiers-refresh',text:'Оновити',attrs:{type:'button'}});refresh.addEventListener('click',()=>void loadDossiers());controls.append(refresh);view.append(controls);
  view.append(el('div',{id:'dossiers-status',className:'sr-status',attrs:{role:'status','aria-live':'polite','aria-atomic':'true'}}));
  const summarySection=el('section',{className:'surface subtle',attrs:{'aria-labelledby':'dossiers-summary-heading'}});summarySection.append(el('h3',{id:'dossiers-summary-heading',text:'Current source-safe scope'}));summarySection.append(el('p',{id:'dossiers-summary',text:'Dossiers have not been loaded.'}));view.append(summarySection);
  const tableSection=el('section',{className:'surface',attrs:{'aria-labelledby':'dossiers-table-heading'}});tableSection.append(el('h3',{id:'dossiers-table-heading',text:'Dossier evidence table'}));
  const table=el('table',{id:'dossiers-table'});table.append(el('caption',{text:'Dossier rows with source, witness, confidence, TX1, relation, and uncertainty metadata'}));const thead=el('thead');const header=el('tr');['Subject','Row type','Proposition','Confidence / TX1','Witness','Source scope','Passages','Evidence','Relation','Uncertainty'].forEach(text=>addHeaderCell(header,text));thead.append(header);table.append(thead);table.append(el('tbody',{id:'dossiers-table-body'}));tableSection.append(table);view.append(tableSection);
  const linearSection=el('section',{className:'surface subtle',attrs:{'aria-labelledby':'dossiers-linear-heading'}});linearSection.append(el('h3',{id:'dossiers-linear-heading',text:'Повний лінійний еквівалент'}));linearSection.append(el('p',{text:'The list carries the same canonical dossier rows and provenance without requiring a graph, mouse, color, or spatial interpretation.'}));linearSection.append(el('ol',{id:'dossiers-linear'}));view.append(linearSection);main.append(view);
  observer=new MutationObserver(()=>{if(view.classList.contains('hidden'))return;const anotherVisible=[...document.querySelectorAll('main > section[id$="-view"]')].some(section=>section!==view&&!section.classList.contains('hidden'));if(anotherVisible)hideSurface()});observer.observe(main,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
}

if(typeof document!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',buildSurface,{once:true});
  else buildSurface();
}

export {buildSurface, validatePayload};
