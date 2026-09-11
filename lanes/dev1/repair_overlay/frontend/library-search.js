import {chooseTransport, unwrap} from './transport.js';

const BASE_VIEWS=['home-view','mission-view','player-view','authoring-view'];
const byId=(doc,id)=>doc.getElementById(id);
const text=(value)=>value===null||value===undefined?'':String(value);

function setText(doc,id,value){const node=byId(doc,id);if(node)node.textContent=text(value)}
function addText(doc,parent,tag,value,className=''){
  const node=doc.createElement(tag);if(className)node.className=className;node.textContent=text(value);parent.append(node);return node;
}
function uniqueText(values){const seen=new Set(),out=[];for(const raw of Array.isArray(values)?values:[]){const value=text(raw).trim();const key=value.toLocaleLowerCase();if(value&&!seen.has(key)){seen.add(key);out.push(value)}}return out}

export function createLibrarySearchController({doc=document,api}){
  if(typeof api!=='function')throw new TypeError('api must be function');
  let catalogLoaded=false;
  let returnFocus=null;
  let requestGeneration=0;

  const view=()=>byId(doc,'library-view');
  const status=(message)=>setText(doc,'library-status',message);
  const hideLibrary=()=>view()?.classList.add('hidden');
  const hideBaseViews=()=>BASE_VIEWS.forEach(id=>byId(doc,id)?.classList.add('hidden'));
  const visibleBaseView=()=>BASE_VIEWS.some(id=>{const node=byId(doc,id);return node&&!node.classList.contains('hidden')});

  function showLibrary(){
    returnFocus=doc.activeElement;
    hideBaseViews();
    view()?.classList.remove('hidden');
    setTimeout(()=>byId(doc,'library-heading')?.focus(),0);
  }

  function renderCapabilityNote(catalog){
    const hasFullText=catalog?.bundled_full_bible_text===true;
    const hasProvider=catalog?.text_provider_available===true;
    const note=hasFullText||hasProvider
      ? 'Каталог повідомляє про доступний канонічний text provider. Пошук нижче все одно відображає лише дані, повернуті allowlisted Library API.'
      : 'Цей пакет не містить повного тексту Біблії і не має активного text provider. Бібліотека показує лише канонічні метадані та посилання на уривки; відсутній текст не вигадується.';
    setText(doc,'library-scope-note',note);
  }

  function renderCatalog(catalog){
    if(catalog?.schema!=='scripture.library.catalog.v1')throw new Error('Unexpected Library catalog schema');
    renderCapabilityNote(catalog);
    const refs=uniqueText(catalog.source_references);
    const missions=Array.isArray(catalog.missions)?catalog.missions:[];
    setText(doc,'library-catalog-summary',`${missions.length} місій · ${Number(catalog.machine_node_count)||0} machine-readable вузлів · ${refs.length} видимих посилань на уривки.`);
    const list=byId(doc,'library-source-list');
    list?.replaceChildren();
    if(list){
      if(!refs.length)addText(doc,list,'li','Немає видимих посилань на уривки в поточному канонічному archive scope.');
      else refs.forEach(ref=>addText(doc,list,'li',ref));
    }
  }

  function renderResults(data){
    if(data?.schema!=='scripture.library.search.v1')throw new Error('Unexpected Library search schema');
    const rows=Array.isArray(data.results)?data.results:[];
    const list=byId(doc,'library-results');
    list?.replaceChildren();
    setText(doc,'library-results-summary',rows.length?`Знайдено ${Number(data.total)||rows.length}; показано ${rows.length}.`:`Нічого не знайдено для «${text(data.query)}».`);
    if(!list)return;
    for(const row of rows){
      const li=doc.createElement('li');
      const article=doc.createElement('article');article.className='card';
      addText(doc,article,'h4',row.title||row.id||'Результат');
      const identity=[row.kind,row.campaign_id,row.mission_id,row.id].filter(Boolean).map(text).join(' · ');
      if(identity)addText(doc,article,'p',identity,'eyebrow');
      if(row.snippet)addText(doc,article,'p',row.snippet);
      const refs=uniqueText(row.source_references);
      if(refs.length)addText(doc,article,'p',`Джерела: ${refs.join('; ')}`);
      li.append(article);list.append(li);
    }
  }

  async function loadCatalog(){
    if(catalogLoaded)return;
    status('Завантаження каталогу…');
    const catalog=await api('library.catalog',{});
    renderCatalog(catalog);catalogLoaded=true;status('Каталог завантажено.');
  }

  async function open(){
    showLibrary();
    try{await loadCatalog()}catch(error){status(`Не вдалося завантажити каталог: ${error.message}`)}
  }

  async function search(event){
    event?.preventDefault?.();
    const query=text(byId(doc,'library-query')?.value).trim();
    if(!query){status('Введіть пошуковий запит.');byId(doc,'library-query')?.focus();return}
    if(query.length>200){status('Запит має містити не більше 200 символів.');return}
    const generation=++requestGeneration;
    const button=byId(doc,'library-search-button');if(button)button.disabled=true;
    status(`Пошук «${query}»…`);
    try{
      const data=await api('library.search',{query,limit:50});
      if(generation!==requestGeneration||view()?.classList.contains('hidden'))return;
      renderResults(data);status(`Пошук завершено: ${Number(data.total)||0} результатів.`);byId(doc,'library-results-heading')?.focus();
    }catch(error){if(generation===requestGeneration)status(`Помилка пошуку: ${error.message}`)}
    finally{if(generation===requestGeneration&&button)button.disabled=false}
  }

  function back(){
    requestGeneration++;
    hideLibrary();
    const home=byId(doc,'nav-home');home?.click();
    setTimeout(()=>{if(returnFocus&&typeof returnFocus.focus==='function')returnFocus.focus()},0);
  }

  function bind(){
    byId(doc,'nav-library')?.addEventListener('click',open);
    byId(doc,'library-back')?.addEventListener('click',back);
    byId(doc,'library-search-form')?.addEventListener('submit',search);
    if(typeof MutationObserver!=='undefined'){
      const observer=new MutationObserver(()=>{if(!view()?.classList.contains('hidden')&&visibleBaseView()){requestGeneration++;hideLibrary()}});
      BASE_VIEWS.forEach(id=>{const node=byId(doc,id);if(node)observer.observe(node,{attributes:true,attributeFilter:['class']})});
    }
  }

  return {bind,open,search,back,renderCatalog,renderResults};
}

let adapterPromise=null;
const api=async(command,payload={})=>unwrap(await (adapterPromise??=chooseTransport()),command,payload);
const controller=createLibrarySearchController({api});
controller.bind();
