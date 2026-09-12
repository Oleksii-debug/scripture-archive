const API_VERSION='scripture.transport.v1';
const DIAGNOSTICS_COMMAND='diagnostics.get_report';
const $=id=>document.getElementById(id);
let sequence=0;

function make(tag,{id,className,attrs={},text}={}){
  const node=document.createElement(tag);
  if(id)node.id=id;
  if(className)node.className=className;
  for(const [name,value] of Object.entries(attrs))node.setAttribute(name,value);
  if(text!==undefined)node.textContent=text;
  return node;
}

function announce(message){
  const global=$('global-status');
  if(global){global.textContent='';requestAnimationFrame(()=>{global.textContent=message})}
  const local=$('diagnostics-status');
  if(local)local.textContent=message;
}

function mountSurface(){
  if($('diagnostics-view'))return;
  const nav=document.querySelector('.top-nav');
  const main=$('main-content');
  if(!nav||!main)return;

  const navButton=make('button',{id:'nav-diagnostics',text:'Діагностика'});
  navButton.type='button';
  nav.append(navButton);

  const view=make('section',{id:'diagnostics-view',className:'hidden',attrs:{'aria-labelledby':'diagnostics-heading'}});
  view.append(
    make('p',{className:'eyebrow',text:'Packaged Windows application'}),
    make('h2',{id:'diagnostics-heading',attrs:{tabindex:'-1'},text:'Діагностика і готовність відновлення'}),
    make('p',{text:'Цей екран лише читає санітизований стан локального сховища. Він не запускає відновлення, міграцію, rollback або зміну файлів.'})
  );

  const surface=make('section',{className:'surface',attrs:{'aria-labelledby':'diagnostics-action-heading'}});
  surface.append(
    make('h3',{id:'diagnostics-action-heading',text:'Перевірка локального стану'}),
    make('p',{text:'Звіт не містить локальних шляхів, тексту Писання, нотаток, відповідей, профілю, журналів, змінних середовища або секретів.'})
  );
  const run=make('button',{id:'diagnostics-run',className:'primary',text:'Запустити діагностику'});
  run.type='button';
  surface.append(run);
  surface.append(make('p',{id:'diagnostics-status',className:'notice info',attrs:{role:'status','aria-live':'polite','aria-atomic':'true'},text:'Діагностика ще не запускалася.'}));
  surface.append(make('dl',{id:'diagnostics-details',className:'details-list',attrs:{'aria-label':'Санітизовані результати діагностики'}}));

  const findingsHeading=make('h3',{id:'diagnostics-findings-heading',text:'Знахідки'});
  const findings=make('ul',{id:'diagnostics-findings',attrs:{'aria-labelledby':'diagnostics-findings-heading'}});
  surface.append(findingsHeading,findings);

  const snapshotHeading=make('h3',{id:'diagnostics-snapshot-heading',text:'Support snapshot'});
  const snapshotHelp=make('p',{text:'Санітизований deterministic snapshot нижче можна виділити й скопіювати клавіатурою для підтримки.'});
  const snapshot=make('pre',{id:'diagnostics-snapshot',attrs:{tabindex:'0','aria-labelledby':'diagnostics-snapshot-heading'},text:'Ще не сформовано.'});
  surface.append(snapshotHeading,snapshotHelp,snapshot);
  surface.append(make('p',{className:'notice warning',text:'Recovery execution: не виконується на цьому екрані. Діагностика readiness не є підтвердженням успішного rollback.'}));
  view.append(surface);
  main.append(view);

  navButton.addEventListener('click',openDiagnosticsView);
  run.addEventListener('click',runDiagnostics);
  for(const id of ['nav-home','nav-research','nav-authoring','nav-application-update']){
    $(id)?.addEventListener('click',hideDiagnosticsView);
  }
}

function standardViews(){
  return [...document.querySelectorAll('#main-content > section')].filter(node=>node.id!=='diagnostics-view');
}

function openDiagnosticsView(){
  standardViews().forEach(node=>node.classList.add('hidden'));
  $('diagnostics-view')?.classList.remove('hidden');
  setTimeout(()=>$('diagnostics-heading')?.focus(),0);
  announce('Діагностика готова до read-only перевірки локального стану.');
}

function hideDiagnosticsView(){
  $('diagnostics-view')?.classList.add('hidden');
}

function appendRow(host,label,value){
  const dt=make('dt',{text:label});
  const dd=make('dd',{text:value??'—'});
  host.append(dt,dd);
}

function renderReport(data){
  const report=data?.report??{};
  const identity=report.identity??{};
  const persistence=report.persistence??{};
  const details=$('diagnostics-details');
  if(details){
    details.replaceChildren();
    appendRow(details,'Статус',report.status);
    appendRow(details,'Версія продукту',identity.product_version);
    appendRow(details,'Runtime API',identity.runtime_api_version);
    appendRow(details,'Build SHA',identity.build_sha);
    appendRow(details,'Основний стан',persistence.state_status);
    appendRow(details,'Резервна копія',persistence.backup_status);
    appendRow(details,'Recovery points',String(persistence.recovery_point_count??0));
    appendRow(details,'Перевірено recovery points',String(persistence.inspected_recovery_point_count??0));
    appendRow(details,'Валідні recovery points',String(persistence.valid_recovery_point_count??0));
    appendRow(details,'Discovery capped',persistence.recovery_point_count_capped===true?'так':'ні');
    appendRow(details,'Режим',data.read_only===true?'read-only':'не підтверджено');
    appendRow(details,'Recovery execution',data.recovery_execution==='not_performed'?'не виконувалося':'не підтверджено');
  }

  const findings=$('diagnostics-findings');
  if(findings){
    findings.replaceChildren();
    const rows=Array.isArray(report.findings)?report.findings:[];
    if(!rows.length)findings.append(make('li',{text:'Знахідок немає.'}));
    for(const finding of rows){
      findings.append(make('li',{text:`${finding?.severity??'—'} · ${finding?.code??'UNKNOWN'}`}));
    }
  }
  const snapshot=$('diagnostics-snapshot');
  if(snapshot)snapshot.textContent=typeof data.support_snapshot==='string'?data.support_snapshot:'Snapshot недоступний.';
}

async function invokeNativeDiagnostics(){
  const invoke=window.pywebview?.api?.invoke;
  if(typeof invoke!=='function')throw new Error('Діагностика доступна лише у packaged Windows application.');
  const response=await invoke({
    api_version:API_VERSION,
    request_id:`diagnostics-ui-${Date.now()}-${++sequence}`,
    command:DIAGNOSTICS_COMMAND,
    payload:{},
  });
  if(!response?.ok)throw new Error(response?.error?.message||'Діагностика завершилась помилкою.');
  return response.data??{};
}

async function runDiagnostics(){
  const button=$('diagnostics-run');
  if(button)button.disabled=true;
  announce('Виконується read-only діагностика локального стану.');
  try{
    const data=await invokeNativeDiagnostics();
    renderReport(data);
    const status=data?.report?.status??'UNKNOWN';
    announce(`Діагностику завершено. Статус: ${status}. Жодне відновлення не запускалося.`);
  }catch(error){
    $('diagnostics-details')?.replaceChildren();
    $('diagnostics-findings')?.replaceChildren();
    const snapshot=$('diagnostics-snapshot');
    if(snapshot)snapshot.textContent='Snapshot недоступний.';
    announce(`Діагностика недоступна: ${error?.message||'невідома помилка'}`);
  }finally{
    if(button)button.disabled=false;
  }
}

mountSurface();
