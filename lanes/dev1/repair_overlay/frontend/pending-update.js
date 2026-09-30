const API_VERSION='scripture.transport.v1';
const HEALTH_COMMAND='application_update.commit_post_restart_health';
const STATUS_COMMAND='application_update.pending_status';
const PREPARE_APPLY_COMMAND='application_update.prepare_apply';
const APPLY_AND_RESTART_COMMAND='application_update.apply_and_restart';
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
  const section=$('pending-update-recovery');
  if(section)section.setAttribute('aria-busy',busy?'true':'false');
  for(const id of ['pending-update-check','pending-update-prepare-apply','pending-update-apply-restart','pending-update-cancel']){
    const button=$(id);if(button)button.disabled=busy||(id==='pending-update-apply-restart'&&button.dataset.ready!=='true');
  }
}

function reportFailure(context,error,message){
  console.error(context,error);
  setStatus(message);
}

function setApplyReady(ready){
  const button=$('pending-update-apply-restart');
  if(!button)return;
  button.dataset.ready=ready?'true':'false';
  button.disabled=!ready;
}

function clearDetails(){$('pending-update-details')?.replaceChildren()}

function renderPending(data){
  const host=$('pending-update-details');
  if(!host||data.pending!==true)return;
  host.replaceChildren();
  const rows=[
    ['Статус',data.status==='apply_ready'?'Намір встановлення підготовлено; можна встановити й перезапустити':'Підготовлено, але не встановлено'],
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
    if(data.pending===true&&(data.status==='staged'||data.status==='apply_ready')){
      renderPending(data);
      const ready=data.status==='apply_ready';
      setApplyReady(ready);
      setStatus(ready
        ?`Захищений намір встановлення ${data.artifact_name??'пакета'} → ${data.target_version??'цільова версія'} відновлено й повторно перевірено. Можна встановити та перезапустити програму.`
        :`Підготовлене оновлення ${data.artifact_name??'пакет'} → ${data.target_version??'цільова версія'} повторно перевірено. Воно ще не встановлене.`);
    }else if(data.pending===false&&data.status==='none'){
      setApplyReady(false);
      setStatus('Підготовленого оновлення немає.',{global:!startup});
    }else throw new Error('Отримано неочікуваний стан.');
  }catch(error){
    clearDetails();setApplyReady(false);
    reportFailure('pending update status failed',error,'Підготовлене оновлення не вдалося безпечно перевірити. Спробуйте перевірити його ще раз.');
  }finally{setBusy(false)}
}

async function prepareApply(){
  setBusy(true);setApplyReady(false);setStatus('Повторно перевіряю пакет і готую захищений намір встановлення.');
  try{
    const data=await invoke(PREPARE_APPLY_COMMAND);
    if(data.pending===true&&data.status==='apply_ready'&&data.installation_performed===false){
      renderPending(data);setApplyReady(true);
      setStatus(`Намір встановлення ${data.artifact_name??'пакета'} → ${data.target_version??'цільова версія'} підготовлено. Файли програми ще не замінювались. Окрема кнопка «Встановити й перезапустити» запускає підписаний native updater.`);
    }else throw new Error('Підготовку apply handoff не підтверджено.');
  }catch(error){
    setApplyReady(false);
    reportFailure('prepare update apply failed',error,'Не вдалося безпечно підготувати встановлення. Файли програми не змінено.');
  }
  finally{setBusy(false)}
}

async function applyAndRestart(){
  setBusy(true);
  setStatus('Запускаю перевірений native updater. Програма закриється; updater дочекається завершення цього процесу, встановить точні повторно перевірені байти й запустить програму знову.');
  try{
    const data=await invoke(APPLY_AND_RESTART_COMMAND);
    if(data.pending===true&&data.status==='updater_started'&&data.updater_process_started===true&&data.restart_requested===true){
      setStatus('Native updater запущено. Завершую поточну програму для безпечного встановлення та перезапуску.');
    }else throw new Error('Запуск native updater не підтверджено.');
  }catch(error){
    reportFailure('start native updater failed',error,'Не вдалося безпечно запустити встановлення. Поточна версія програми залишається активною.');
    setBusy(false);
  }
}

async function cancelPending(){
  setBusy(true);clearDetails();setApplyReady(false);setStatus('Скасовую підготовлений стан оновлення.');
  try{
    const data=await invoke(CANCEL_COMMAND);
    if(data.pending===false&&(data.status==='cancelled'||data.status==='none')){
      setStatus(data.status==='cancelled'?'Підготовлене оновлення та його apply-наміри скасовано. Інсталяція не виконувалась.':'Підготовленого оновлення вже немає.');
    }else throw new Error('Скасування не підтверджено.');
  }catch(error){
    reportFailure('cancel pending update failed',error,'Не вдалося безпечно скасувати підготовлене оновлення. Повторіть перевірку стану перед наступною дією.');
  }
  finally{setBusy(false)}
}

async function commitPostRestartHealth(){
  setBusy(true);
  setStatus('Перевіряю стан після перезапуску та збережений rollback.');
  try{
    const data=await invoke(HEALTH_COMMAND);
    if(data.status==='healthy'&&data.health_committed===true&&data.rollback_cleanup_performed===true){
      setStatus(`Оновлена версія ${data.target_version??'програми'} успішно запустила native bridge. Rollback попередньої версії ${data.previous_version??''} безпечно завершено.`);
    }else if(data.status!=='none'||data.health_committed!==false){
      throw new Error('Отримано неочікуваний post-update health state.');
    }
    await checkPending({startup:true});
  }catch(error){
    clearDetails();setApplyReady(false);setBusy(false);
    reportFailure('post-update health check failed',error,'Перевірку стану після перезапуску не підтверджено. Rollback recovery збережено; автоматичне очищення не виконано.');
  }
}

function startStartupCheck(){
  if(startupCheckStarted)return;
  startupCheckStarted=true;
  void commitPostRestartHealth();
}

function mount(){
  const view=$('application-update-view');if(!view||$('pending-update-recovery'))return;
  const section=element('section');section.id='pending-update-recovery';section.className='surface';section.setAttribute('aria-labelledby','pending-update-heading');
  const heading=element('h3','Підготовлене оновлення після перезапуску');heading.id='pending-update-heading';
  const help=element('p','Після запуску програма спочатку перевіряє post-update health receipt: точну поточну версію, встановлені байти та збережений rollback. Лише після успішної перевірки старий rollback і stale pending authority прибираються. Потім програма перевіряє звичайний pending state. «Підготувати встановлення» створює durable apply handoff, а «Встановити й перезапустити» запускає підписаний native updater. Browser не передає шляхів, PID або командного рядка updater.');
  const actions=element('div');actions.className='action-row';
  const check=element('button','Перевірити підготовлене оновлення');check.type='button';check.id='pending-update-check';
  const prepare=element('button','Підготувати встановлення');prepare.type='button';prepare.id='pending-update-prepare-apply';
  const apply=element('button','Встановити й перезапустити');apply.type='button';apply.id='pending-update-apply-restart';apply.dataset.ready='false';apply.disabled=true;
  const cancel=element('button','Скасувати підготовлене оновлення');cancel.type='button';cancel.id='pending-update-cancel';
  actions.append(check,prepare,apply,cancel);
  const status=element('p','Очікую готовності native host для post-update health і pending перевірки.');status.id='pending-update-status';status.className='notice info';status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.setAttribute('aria-atomic','true');
  const details=element('dl');details.id='pending-update-details';details.className='details-list';details.setAttribute('aria-label','Повторно перевірені метадані підготовленого оновлення');
  section.append(heading,help,actions,status,details);view.append(section);
  check.addEventListener('click',()=>checkPending());prepare.addEventListener('click',prepareApply);apply.addEventListener('click',applyAndRestart);cancel.addEventListener('click',cancelPending);

  window.addEventListener('pywebviewready',startStartupCheck,{once:true});
  if(typeof window.pywebview?.api?.invoke==='function')queueMicrotask(startStartupCheck);
}

mount();
