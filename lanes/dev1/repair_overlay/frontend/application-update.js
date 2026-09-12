const API_VERSION='scripture.transport.v1';
const UPDATE_COMMAND='application_update.select_verify';
const $=id=>document.getElementById(id);
let sequence=0;

function announce(message){
  const global=$('global-status');
  if(global){global.textContent='';requestAnimationFrame(()=>{global.textContent=message})}
  const local=$('application-update-status');
  if(local)local.textContent=message;
}

function standardViews(){
  return [...document.querySelectorAll('#main-content > section')].filter(node=>node.id!=='application-update-view');
}

function openUpdateView(){
  standardViews().forEach(node=>node.classList.add('hidden'));
  const view=$('application-update-view');
  view?.classList.remove('hidden');
  setTimeout(()=>$('application-update-heading')?.focus(),0);
  announce('Оновлення: виберіть локальний manifest і пакет для перевірки. Файли не встановлюються.');
}

function hideUpdateView(){
  $('application-update-view')?.classList.add('hidden');
}

function clearDetails(){
  $('application-update-details')?.replaceChildren();
}

function renderDetails(data){
  const host=$('application-update-details');
  if(!host)return;
  host.replaceChildren();
  const rows=[
    ['Статус','Перевірено'],
    ['Продукт',data.product_id],
    ['Платформа',data.target_platform],
    ['Поточна версія',data.current_version],
    ['Цільова версія',data.target_version],
    ['Source head',data.source_head],
    ['Файл пакета',data.artifact_name],
    ['Розмір',Number.isFinite(Number(data.artifact_size))?`${data.artifact_size} байт`:'—'],
    ['SHA-256',data.artifact_sha256],
    ['Автентичність',data.authenticity==='not_proven_by_local_hash_verification'?'Локальний hash не доводить автентичність підпису/джерела':'—'],
  ];
  for(const [label,value] of rows){
    const dt=document.createElement('dt');dt.textContent=label;
    const dd=document.createElement('dd');dd.textContent=value??'—';
    host.append(dt,dd);
  }
}

async function invokeNativeVerification(){
  const invoke=window.pywebview?.api?.invoke;
  if(typeof invoke!=='function')throw new Error('Перевірка оновлення доступна лише у packaged Windows application.');
  const response=await invoke({
    api_version:API_VERSION,
    request_id:`update-ui-${Date.now()}-${++sequence}`,
    command:UPDATE_COMMAND,
    payload:{},
  });
  if(!response?.ok)throw new Error(response?.error?.message||'Локальна перевірка оновлення завершилась помилкою.');
  return response.data??{};
}

async function selectAndVerify(){
  const button=$('application-update-select');
  if(button)button.disabled=true;
  clearDetails();
  announce('Відкрито native file picker. Спочатку виберіть manifest, потім локальний пакет.');
  try{
    const data=await invokeNativeVerification();
    if(data.verified===true&&data.status==='verified'){
      renderDetails(data);
      announce(`Локальний пакет перевірено: ${data.artifact_name??'пакет'} → ${data.target_version??'цільова версія'}. Нічого не встановлено.`);
    }else if(data.status==='cancelled'){
      announce(data.message||'Вибір локального оновлення скасовано.');
    }else{
      throw new Error('Native verifier не підтвердив локальний пакет.');
    }
  }catch(error){
    clearDetails();
    announce(`Оновлення не перевірено: ${error?.message||'невідома помилка'}`);
  }finally{
    if(button)button.disabled=false;
  }
}

function mount(){
  $('nav-application-update')?.addEventListener('click',openUpdateView);
  $('application-update-select')?.addEventListener('click',selectAndVerify);
  for(const id of ['nav-home','nav-research','nav-authoring'])$(''+id)&&$(id)?.addEventListener('click',hideUpdateView);
  const update=$('application-update-view');
  if(update){
    const observer=new MutationObserver(()=>{
      if(standardViews().some(node=>!node.classList.contains('hidden')))update.classList.add('hidden');
    });
    standardViews().forEach(node=>observer.observe(node,{attributes:true,attributeFilter:['class']}));
  }
}

mount();
