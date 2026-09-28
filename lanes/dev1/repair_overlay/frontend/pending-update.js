const API_VERSION='scripture.transport.v1';
const STATUS_COMMAND='application_update.pending_status';
const PREPARE_APPLY_COMMAND='application_update.prepare_apply';
const CANCEL_COMMAND='application_update.cancel_pending';
const $=id=>document.getElementById(id);
let sequence=0;
let startupCheckStarted=false;

function setStatus(message,{global=true}={}){
  if(global){
    const live=$('global-status');
    if(live){live.textContent='';requestAnimationFrame(()=>{live.textContent=message})}
  }
  const local=$('pending-update-status');
  if(local)local.textContent=message;
}

function element(tag,text){
  const node=document.createElement(tag);
  if(text!==undefined)node.textContent=text;
  return node;
}

async function invoke(command){
  const invokeNative=window.pywebview?.api?.invoke;
  if(typeof invokeNative!=='function')throw new Error('Ця дія доступна лише у packaged Windows application.');
  const response=await invokeNative({api_version:API_VERSION,request_id:`pending-${Date.now()}-${++sequence}`,command,payload:{}});
  if(!response?.ok)throw new Error(response?.error?.message||'Операція завершилась помилкою.');
  return response.data??{};
}

function setBusy(busy){
  for(const id of ['pending-update-check','pending-update-prepare-apply','pending-update-cancel']){
    const button=$(id);if(button)button.disabled=busy;
  }
}

function clearDetails(){$('pending-update-details')?.replaceChildren()}

function renderPending(data){
  const host=$('pending-update-details');
  if(!host||data.pending!==true)return;
  host.replaceChildren();
  const rows=[
    ['Статус',data.status==='apply_ready'?'Намір встановлення підготовлено; заміна ще не виконана':'Підготовлено, але не встановлено'],
    ['Продукт',data.product_id],['Платформа',data.target_platform],
    ['Поточна версія',data.current_version],['Цільова версія',data.target_version],
    ['Source head',data.source_head],['Файл пакета',data.artifact_name],
    ['Розмір',Number.isFinite(Number(data.artifact_size))?`${data.artifact_size} байт`:'—'],
    ['SHA-256',data.artifact_sha256],['Автентичність','Same-publisher Authenticode повторно підтверджено']
  ];
  for(const [label,value] of rows){host.append(element('dt',label),element('dd',value??'—'))}
}

async function checkPending({startup=false}={}){
  setBusy(true);clearDetails();
  if(!startup)setStatus('Повторно перевіряю підготовлене оновлення.');
  try{
    const data=await invoke(STATUS_COMMAND);
    if(data.pending===true&&data.status==='staged'){
      renderPending(data);
      setStatus(`Підготовлене оновлення ${data.artifact_name??'пакет'} → ${data.target_version??'цільова версія'} повторно перевірено. Воно ще не встановлене.`);
    }else if(data.pending===false&&data.status==='none'){
      setStatus('Підготовленого оновлення немає.',{global:!startup});
    }else throw new Error('Отримано неочікуваний стан.');
  }catch(error){
    clearDetails();
    setStatus(`Pending update не підтверджено: ${error?.message||'невідома помилка'}`);
  }finally{setBusy(false)}
}

async function prepareApply(){
  setBusy(true);setStatus('Повторно перевіряю пакет і готую захищений намір встановлення.');
  try{
    const data=await invoke(PREPARE_APPLY_COMMAND);
    if(data.pending===true&&data.status==='apply_ready'&&data.installation_performed===false){
      renderPending(data);
      setStatus(`Намір встановлення ${data.artifact_name??'пакета'} → ${data.target_version??'цільова версія'} підготовлено. Файли програми ще не замінювались і перезапуск не виконувався.`);
    }else throw new Error('Підготовку apply handoff не підтверджено.');
  }catch(error){setStatus(`Не вдалося безпечно підготувати встановлення: ${error?.message||'невідома помилка'}`)}
  finally{setBusy(false)}
}

async function cancelPending(){
  setBusy(true);clearDetails();setStatus('Скасовую підготовлений стан оновлення.');
  try{
    const data=await invoke(CANCEL_COMMAND);
    if(data.pending===false&&(data.status==='cancelled'||data.status==='none')){
      setStatus(data.status==='cancelled'?'Підготовлене оновлення та його apply-наміри скасовано. Інсталяція не виконувалась.':'Підготовленого оновлення вже немає.');
    }else throw new Error('Скасування не підтверджено.');
  }catch(error){setStatus(`Не вдалося безпечно скасувати pending update: ${error?.message||'невідома помилка'}`)}
  finally{setBusy(false)}
}

function startStartupCheck(){
  if(startupCheckStarted)return;
  startupCheckStarted=true;
  void checkPending({startup:true});
}

function mount(){
  const view=$('application-update-view');if(!view||$('pending-update-recovery'))return;
  const section=element('section');section.id='pending-update-recovery';section.className='surface';section.setAttribute('aria-labelledby','pending-update-heading');
  const heading=element('h3','Підготовлене оновлення після перезапуску');heading.id='pending-update-heading';
  const help=element('p','Після запуску програма автоматично перевіряє приватний pending state. «Підготувати встановлення» створює лише захищений host-owned apply handoff для наступного окремого updater-кроку: воно не замінює файли і не перезапускає програму. Скасування прибирає pending/apply authority, але не виконує інсталяцію.');
  const actions=element('div');actions.className='action-row';
  const check=element('button','Перевірити підготовлене оновлення');check.type='button';check.id='pending-update-check';
  const apply=element('button','Підготувати встановлення');apply.type='button';apply.id='pending-update-prepare-apply';
  const cancel=element('button','Скасувати підготовлене оновлення');cancel.type='button';cancel.id='pending-update-cancel';
  actions.append(check,apply,cancel);
  const status=element('p','Очікую готовності native host для перевірки pending update.');status.id='pending-update-status';status.className='notice info';status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.setAttribute('aria-atomic','true');
  const details=element('dl');details.id='pending-update-details';details.className='details-list';details.setAttribute('aria-label','Повторно перевірені метадані підготовленого оновлення');
  section.append(heading,help,actions,status,details);view.append(section);
  check.addEventListener('click',()=>checkPending());apply.addEventListener('click',prepareApply);cancel.addEventListener('click',cancelPending);

  window.addEventListener('pywebviewready',startStartupCheck,{once:true});
  if(typeof window.pywebview?.api?.invoke==='function')queueMicrotask(startStartupCheck);
}

mount();
