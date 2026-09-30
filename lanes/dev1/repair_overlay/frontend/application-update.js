const API_VERSION='scripture.transport.v1';
const VERIFY_UPDATE_COMMAND='application_update.select_verify';
const STAGE_UPDATE_COMMAND='application_update.select_verify_stage';
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
  announce('Оновлення: можна лише перевірити локальний пакет або перевірити й підготувати його у приватному сховищі програми. Встановлення не виконується.');
}

function hideUpdateView(){
  $('application-update-view')?.classList.add('hidden');
}

function clearDetails(){
  $('application-update-details')?.replaceChildren();
}

function authenticityLabel(status){
  if(status==='same_publisher_authenticode_verified'){
    return 'Підтверджено: чинний Authenticode; сертифікат видавця збігається з поточною програмою';
  }
  if(status==='not_proven_by_local_hash_verification'){
    return 'Не підтверджено: локальний SHA-256 не доводить автентичність підпису або походження';
  }
  return 'Не підтверджено: невідомий статус автентичності';
}

function renderDetails(data){
  const host=$('application-update-details');
  if(!host)return;
  host.replaceChildren();
  const rows=[
    ['Статус',data.staged===true?'Перевірено й підготовлено':'Перевірено'],
    ['Продукт',data.product_id],
    ['Платформа',data.target_platform],
    ['Поточна версія',data.current_version],
    ['Цільова версія',data.target_version],
    ['Source head',data.source_head],
    ['Файл пакета',data.artifact_name],
    ['Розмір',Number.isFinite(Number(data.artifact_size))?`${data.artifact_size} байт`:'—'],
    ['SHA-256',data.artifact_sha256],
    ['Автентичність',authenticityLabel(data.authenticity)],
  ];
  for(const [label,value] of rows){
    const dt=document.createElement('dt');dt.textContent=label;
    const dd=document.createElement('dd');dd.textContent=value??'—';
    host.append(dt,dd);
  }
}

async function invokeNativeUpdate(command){
  const invoke=window.pywebview?.api?.invoke;
  if(typeof invoke!=='function')throw new Error('Оновлення доступне лише у packaged Windows application.');
  const response=await invoke({
    api_version:API_VERSION,
    request_id:`update-ui-${Date.now()}-${++sequence}`,
    command,
    payload:{},
  });
  if(!response?.ok)throw new Error(response?.error?.message||'Локальна операція оновлення завершилась помилкою.');
  return response.data??{};
}

function setBusy(busy){
  const view=$('application-update-view');
  if(view)view.setAttribute('aria-busy',busy?'true':'false');
  for(const id of ['application-update-select','application-update-stage']){
    const button=$(id);
    if(button)button.disabled=busy;
  }
}

function reportFailure(error,message){
  console.error('application update operation failed',error);
  announce(message);
}

async function selectAndVerify(command=VERIFY_UPDATE_COMMAND){
  const staging=command===STAGE_UPDATE_COMMAND;
  setBusy(true);
  clearDetails();
  announce(staging
    ?'Відкрито native file picker. Після перевірки підпису й точних байтів пакет буде скопійовано у приватне сховище програми; встановлення не виконується.'
    :'Відкрито native file picker. Спочатку виберіть manifest, потім локальний пакет.');
  try{
    const data=await invokeNativeUpdate(command);
    if(data.verified===true&&data.status==='staged'&&data.staged===true){
      renderDetails(data);
      announce(`Локальний пакет ${data.artifact_name??'пакет'} перевірено та підготовлено для майбутнього оновлення. Same-publisher Authenticode підтверджено. Нічого не встановлено, не замінено й не запущено.`);
    }else if(data.verified===true&&data.status==='verified'){
      renderDetails(data);
      const publisherStatus=data.authenticity==='same_publisher_authenticode_verified'
        ?' Видавець підтверджений чинним Authenticode і збігається з поточною програмою.'
        :' Автентичність видавця не підтверджена.';
      announce(`Локальний пакет перевірено: ${data.artifact_name??'пакет'} → ${data.target_version??'цільова версія'}.${publisherStatus} Нічого не встановлено.`);
    }else if(data.status==='cancelled'){
      announce(data.message||'Вибір локального оновлення скасовано.');
    }else{
      throw new Error(staging?'Native staging не підтвердив підготовку пакета.':'Native verifier не підтвердив локальний пакет.');
    }
  }catch(error){
    clearDetails();
    reportFailure(
      error,
      staging
        ?'Оновлення не підготовлено. Пакет не встановлено й файли програми не змінено.'
        :'Оновлення не перевірено. Виберіть локальний manifest і пакет та повторіть перевірку.'
    );
  }finally{
    setBusy(false);
  }
}

function mountStagingControl(){
  const verify=$('application-update-select');
  if(!verify||$('application-update-stage'))return;
  const stage=document.createElement('button');
  stage.type='button';
  stage.id='application-update-stage';
  stage.textContent='Перевірити й підготувати оновлення';
  stage.setAttribute('aria-describedby','application-update-stage-help');
  verify.insertAdjacentElement('afterend',stage);

  const help=document.createElement('p');
  help.id='application-update-stage-help';
  help.textContent='Підготовка дозволена лише для пакета з чинним same-publisher Authenticode. Точні байти копіюються у приватне сховище програми та перевіряються повторно. Install, replace, restart і rollback не виконуються.';
  stage.insertAdjacentElement('afterend',help);
  stage.addEventListener('click',()=>selectAndVerify(STAGE_UPDATE_COMMAND));

  const intro=document.querySelector('#application-update-view > p:not(.eyebrow)');
  if(intro){
    intro.textContent='Цей екран перевіряє локальний manifest і пакет через native Windows file picker. Browser не передає шлях до файлу. Окрема дія може підготувати лише same-publisher пакет у приватному сховищі програми; жодне встановлення або заміна executable тут не виконується.';
  }
}

function mount(){
  mountStagingControl();
  $('nav-application-update')?.addEventListener('click',openUpdateView);
  $('application-update-select')?.addEventListener('click',()=>selectAndVerify(VERIFY_UPDATE_COMMAND));
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
void import('./diagnostics-ui.js');
void import('./pending-update.js');
