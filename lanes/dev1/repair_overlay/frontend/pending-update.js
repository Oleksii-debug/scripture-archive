const API_VERSION='scripture.transport.v1';
const STATUS_COMMAND='application_update.pending_status';
const CANCEL_COMMAND='application_update.cancel_pending';
const $=id=>document.getElementById(id);
let sequence=0;

function announce(message){
  const global=$('global-status');
  if(global){global.textContent='';requestAnimationFrame(()=>{global.textContent=message})}
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
  for(const id of ['pending-update-check','pending-update-cancel']){
    const button=$(id);if(button)button.disabled=busy;
  }
}

function clearDetails(){$('pending-update-details')?.replaceChildren()}

function renderPending(data){
  const host=$('pending-update-details');
  if(!host||data.pending!==true)return;
  host.replaceChildren();
  const rows=[
    ['Статус','Підготовлено, але не встановлено'],
    ['Продукт',data.product_id],['Платформа',data.target_platform],
    ['Поточна версія',data.current_version],['Цільова версія',data.target_version],
    ['Source head',data.source_head],['Файл пакета',data.artifact_name],
    ['Розмір',Number.isFinite(Number(data.artifact_size))?`${data.artifact_size} байт`:'—'],
    ['SHA-256',data.artifact_sha256],['Автентичність','Same-publisher Authenticode повторно підтверджено']
  ];
  for(const [label,value] of rows){host.append(element('dt',label),element('dd',value??'—'))}
}

async function checkPending(){
  setBusy(true);clearDetails();announce('Повторно перевіряю підготовлене оновлення.');
  try{
    const data=await invoke(STATUS_COMMAND);
    if(data.pending===true&&data.status==='staged'){
      renderPending(data);
      announce(`Підготовлене оновлення ${data.artifact_name??'пакет'} → ${data.target_version??'цільова версія'} повторно перевірено. Воно ще не встановлене.`);
    }else if(data.pending===false&&data.status==='none')announce('Підготовленого оновлення немає.');
    else throw new Error('Отримано неочікуваний стан.');
  }catch(error){clearDetails();announce(`Pending update не підтверджено: ${error?.message||'невідома помилка'}`)}
  finally{setBusy(false)}
}

async function cancelPending(){
  setBusy(true);clearDetails();announce('Скасовую підготовлений стан оновлення.');
  try{
    const data=await invoke(CANCEL_COMMAND);
    if(data.pending===false&&(data.status==='cancelled'||data.status==='none')){
      announce(data.status==='cancelled'?'Підготовлене оновлення скасовано. Інсталяція не виконувалась.':'Підготовленого оновлення вже немає.');
    }else throw new Error('Скасування не підтверджено.');
  }catch(error){announce(`Не вдалося безпечно скасувати pending update: ${error?.message||'невідома помилка'}`)}
  finally{setBusy(false)}
}

function mount(){
  const view=$('application-update-view');if(!view||$('pending-update-recovery'))return;
  const section=element('section');section.id='pending-update-recovery';section.className='surface';section.setAttribute('aria-labelledby','pending-update-heading');
  const heading=element('h3','Підготовлене оновлення після перезапуску');heading.id='pending-update-heading';
  const help=element('p','Перевірка повторно звіряє приватний pending state програми. Скасування прибирає лише статус підготовленого оновлення; встановлення тут не виконується.');
  const actions=element('div');actions.className='action-row';
  const check=element('button','Перевірити підготовлене оновлення');check.type='button';check.id='pending-update-check';
  const cancel=element('button','Скасувати підготовлене оновлення');cancel.type='button';cancel.id='pending-update-cancel';
  actions.append(check,cancel);
  const status=element('p','Стан pending update ще не перевірявся.');status.id='pending-update-status';status.className='notice info';status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.setAttribute('aria-atomic','true');
  const details=element('dl');details.id='pending-update-details';details.className='details-list';details.setAttribute('aria-label','Повторно перевірені метадані підготовленого оновлення');
  section.append(heading,help,actions,status,details);view.append(section);
  check.addEventListener('click',checkPending);cancel.addEventListener('click',cancelPending);
}

mount();
