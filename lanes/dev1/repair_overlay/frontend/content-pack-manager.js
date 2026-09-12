import {chooseTransport,unwrap} from './transport.js';

let mounted=false;
let transport=null;
let trigger=null;
let dialog=null;
let candidateSelect=null;
let statusNode=null;
let inboxNode=null;
let installedBody=null;
let previewNode=null;

const SCHEMA='scripture.content-pack-manager.v1';
const text=(tag,value)=>{const node=document.createElement(tag);node.textContent=value;return node};
const button=(label,handler)=>{const node=document.createElement('button');node.type='button';node.textContent=label;node.addEventListener('click',handler);return node};
async function api(command,payload={}){return await unwrap(transport,command,payload)}
function announce(message,isError=false){if(!statusNode)return;statusNode.textContent='';statusNode.dataset.state=isError?'error':'ok';requestAnimationFrame(()=>{statusNode.textContent=message})}
function selectedCandidate(){const value=candidateSelect?.value||'';if(!value)throw new Error('Оберіть ZIP-пакет із приватної папки імпорту.');return value}
function checkedSnapshot(data){
  if(!data||data.schema!==SCHEMA||typeof data.inbox_path!=='string'||!Array.isArray(data.candidates)||!Array.isArray(data.installed))throw new Error('Некоректна відповідь Content Pack Manager.');
  for(const item of data.candidates){if(!item||typeof item.file_name!=='string'||!Number.isSafeInteger(item.size_bytes)||item.size_bytes<0)throw new Error('Некоректний список пакетів у папці імпорту.');}
  for(const pack of data.installed){if(!pack||typeof pack.pack_id!=='string'||!(pack.active_version===null||pack.active_version===undefined||typeof pack.active_version==='string')||!Array.isArray(pack.versions)||pack.versions.some(version=>typeof version!=='string'))throw new Error('Некоректний список встановлених content packs.');}
  return data;
}
function checkedInspection(value){
  const manifest=value?.manifest;
  if(!value||!manifest||typeof manifest.pack_id!=='string'||typeof manifest.version!=='string'||typeof value.archive_sha256!=='string'||!Number.isSafeInteger(value.file_count)||!Number.isSafeInteger(value.node_count))throw new Error('Некоректний результат перевірки content pack.');
  return value;
}

function renderCandidates(data){
  candidateSelect.replaceChildren(new Option('— оберіть пакет —',''));
  data.candidates.forEach(item=>candidateSelect.append(new Option(`${item.file_name} · ${item.size_bytes} B`,item.file_name)));
  inboxNode.textContent=data.inbox_path;
}
function actionCell(row,label,handler){const td=document.createElement('td');const b=button(label,handler);td.append(b);row.append(td)}
function renderInstalled(data){
  installedBody.replaceChildren();
  const packs=data.installed;
  if(!packs.length){const row=document.createElement('tr');const cell=document.createElement('td');cell.colSpan=5;cell.textContent='Встановлених content packs ще немає.';row.append(cell);installedBody.append(row);return}
  packs.forEach(pack=>{
    pack.versions.forEach((version,index)=>{
      const row=document.createElement('tr');
      row.append(text('td',index===0?pack.pack_id:''),text('td',version),text('td',pack.active_version===version?'Активна':'Неактивна'));
      actionCell(row,'Перевірити',()=>runAction('content_packs.verify',{pack_id:pack.pack_id,version},`Перевірено ${pack.pack_id}@${version}`));
      if(pack.active_version===version) actionCell(row,'Відкотити',()=>runAction('content_packs.rollback',{pack_id:pack.pack_id},`Виконано rollback ${pack.pack_id}`));
      else actionCell(row,'Активувати',()=>runAction('content_packs.activate',{pack_id:pack.pack_id,version},`Активовано ${pack.pack_id}@${version}`));
      installedBody.append(row);
    });
  });
}
function renderSnapshot(data){const checked=checkedSnapshot(data);renderCandidates(checked);renderInstalled(checked)}
function renderInspection(inspection){
  previewNode.replaceChildren();
  if(!inspection)return;
  const checked=checkedInspection(inspection);const manifest=checked.manifest;
  const dl=document.createElement('dl');
  [['Pack',`${manifest.pack_id} @ ${manifest.version}`],['Schema',manifest.content_schema_version||'—'],['Nodes',String(checked.node_count)],['Files',String(checked.file_count)],['SHA-256',checked.archive_sha256]].forEach(([key,value])=>{const dt=text('dt',key);const dd=text('dd',value);dl.append(dt,dd)});
  previewNode.append(dl);
}
async function refresh(){const data=checkedSnapshot(await api('content_packs.list'));renderSnapshot(data);return data}
async function runAction(command,payload,success){try{const data=checkedSnapshot(await api(command,payload));renderSnapshot(data);renderInspection(data.inspection||null);announce(success)}catch(error){announce(`Помилка: ${error.message}`,true)}}
async function inspect(){try{const data=checkedSnapshot(await api('content_packs.inspect',{file_name:selectedCandidate()}));renderSnapshot(data);renderInspection(data.inspection);announce('Пакет перевірено без встановлення.')}catch(error){announce(`Помилка: ${error.message}`,true)}}
async function install(){try{const file_name=selectedCandidate();const data=checkedSnapshot(await api('content_packs.install',{file_name,activate:false}));renderSnapshot(data);const inspection=checkedInspection(data.inspection);renderInspection(inspection);announce(`Встановлено ${inspection.manifest.pack_id}; активація виконується окремо.`)}catch(error){announce(`Помилка: ${error.message}`,true)}}

function buildSurface(){
  trigger=button('Content packs',async()=>{dialog.showModal();await runRefresh();dialog.querySelector('h2')?.focus()});trigger.id='nav-content-packs';
  const anchor=document.getElementById('nav-authoring')||document.getElementById('nav-home');
  if(!anchor?.parentElement)return false;
  anchor.parentElement.append(trigger);
  dialog=document.createElement('dialog');dialog.id='content-pack-manager-dialog';dialog.setAttribute('aria-labelledby','content-pack-manager-heading');
  const heading=text('h2','Content Pack Manager');heading.id='content-pack-manager-heading';heading.tabIndex=-1;
  const intro=text('p','ZIP-пакети читаються лише з приватної папки імпорту. Перевірка, хеші, schema, безпечне розпакування, immutable versions та rollback належать canonical backend.');
  const inboxLabel=text('p','Папка імпорту: ');inboxNode=text('code','—');inboxLabel.append(inboxNode);
  const candidateLabel=document.createElement('label');candidateLabel.htmlFor='content-pack-candidate';candidateLabel.textContent='Кандидат ZIP';candidateSelect=document.createElement('select');candidateSelect.id='content-pack-candidate';
  const controls=document.createElement('div');controls.append(button('Оновити',runRefresh),button('Перевірити',inspect),button('Встановити',install));
  previewNode=document.createElement('section');previewNode.setAttribute('aria-label','Результат перевірки пакета');
  const table=document.createElement('table');const caption=text('caption','Встановлені версії content packs');const thead=document.createElement('thead');const hr=document.createElement('tr');['Pack','Version','State','Verify','Activate / rollback'].forEach(label=>hr.append(text('th',label)));thead.append(hr);installedBody=document.createElement('tbody');table.append(caption,thead,installedBody);
  statusNode=text('p','');statusNode.id='content-pack-manager-status';statusNode.setAttribute('role','status');statusNode.setAttribute('aria-live','polite');
  const close=button('Закрити',()=>{dialog.close();trigger.focus()});
  dialog.append(heading,intro,inboxLabel,candidateLabel,candidateSelect,controls,previewNode,table,statusNode,close);document.body.append(dialog);return true
}
async function runRefresh(){try{await refresh();announce('Content Pack Manager оновлено.')}catch(error){announce(`Помилка: ${error.message}`,true)}}
async function mount(){if(mounted)return;mounted=true;try{transport=await chooseTransport();const bootstrap=await api('system.bootstrap');if(bootstrap?.capabilities?.content_pack_manager!==true)return;if(!buildSurface())return;await runRefresh()}catch(error){mounted=false}}
export function installContentPackManagerSurface(){if(window.pywebview)window.addEventListener('pywebviewready',()=>mount(),{once:true});else setTimeout(()=>mount(),0)}
