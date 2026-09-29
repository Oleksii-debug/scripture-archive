import {chooseTransport,unwrap} from './transport.js';

const $=id=>document.getElementById(id);
let transport=null,mounted=false,busy=false;

async function api(command,payload={}){return await unwrap(transport,command,payload)}
function announce(message,isError=false){const host=$('global-status');if(host){host.textContent='';host.dataset.state=isError?'error':'ok';requestAnimationFrame(()=>host.textContent=message)}}
function reportFailure(context,message,error){console.error(context,error);announce(message,true)}
function currentDraftId(){const input=$('draft-id');const value=input?.value?.trim();if(value)return value;announce('Спочатку відкрийте збережену чернетку.',true);input?.focus();return null}
function makeButton(label,handler){const button=document.createElement('button');button.type='button';button.textContent=label;button.dataset.constructorV2Action='true';button.disabled=busy;button.onclick=handler;return button}
function text(tag,value){const el=document.createElement(tag);el.textContent=value;return el}
function syncDraftList(){const nav=$('nav-authoring');if(nav)nav.click()}
function setBusy(value){busy=value;const panel=$('constructor-v2-panel');if(panel)panel.setAttribute('aria-busy',value?'true':'false');document.querySelectorAll('[data-constructor-v2-action="true"]').forEach(button=>{button.disabled=value})}
async function serialize(operation){if(busy)return;setBusy(true);try{await operation()}finally{setBusy(false)}}

async function refreshHistory(){
  const output=$('constructor-v2-output');
  if(!output)return;
  output.replaceChildren();
  const draftId=currentDraftId();
  if(!draftId){output.append(text('p','Спочатку відкрийте збережену чернетку.'));return}
  try{
    const history=await api('authoring.history',{draft_id:draftId});
    output.append(text('p',`Revision ${history.revision}. Undo: ${history.can_undo?'так':'ні'}. Redo: ${history.can_redo?'так':'ні'}.`));
    const changes=text('h4','Історія змін');output.append(changes);
    const changeList=document.createElement('ol');
    (history.change_record||[]).slice(-20).forEach(row=>changeList.append(text('li',`${row.action||'change'} · revision ${row.revision??'—'} · ${row.timestamp??'—'}`)));
    if(!changeList.children.length)changeList.append(text('li','Записів змін ще немає.'));
    output.append(changeList);

    output.append(text('h4','Snapshots'));
    const snapshots=document.createElement('ul');
    for(const row of history.snapshots||[]){
      const li=document.createElement('li');
      li.append(document.createTextNode(`${row.label||row.snapshot_id} · revision ${row.draft_revision??'—'} `));
      li.append(makeButton('Diff до поточної',()=>serialize(async()=>{
        try{const diff=await api('authoring.diff_draft',{draft_id:draftId,from_snapshot_id:row.snapshot_id});announce(diff.changed?`Змінено шляхів: ${diff.changed_paths.length}`:'Відмінностей немає');const pre=document.createElement('pre');pre.textContent=(diff.changed_paths||[]).join('\n')||'No changes';li.append(pre)}catch(error){reportFailure('Constructor snapshot diff failed','Не вдалося порівняти snapshot із поточною чернеткою.',error)}
      })));
      li.append(makeButton('Відновити snapshot',()=>serialize(async()=>{
        try{await api('authoring.restore_snapshot',{draft_id:draftId,snapshot_id:row.snapshot_id});announce('Snapshot відновлено як нову revision; попередній стан збережено safety snapshot. Перевідкрийте чернетку.');syncDraftList();await refreshHistory()}catch(error){reportFailure('Constructor snapshot restore failed','Не вдалося відновити snapshot.',error)}
      })));
      snapshots.append(li);
    }
    if(!snapshots.children.length)snapshots.append(text('li','Snapshots ще немає.'));
    output.append(snapshots);

    output.append(text('h4','Published version artifacts'));
    const versions=document.createElement('ul');
    for(const row of history.versions||[]){
      const li=document.createElement('li');
      li.append(document.createTextNode(`${row.version_id} · source revision ${row.draft_revision??'—'} · canonical write: ні `));
      li.append(makeButton('Rollback у draft',()=>serialize(async()=>{
        try{await api('authoring.rollback_version',{draft_id:draftId,version_id:row.version_id});announce('Version artifact відновлено у draft як нову revision; canonical content не змінено. Перевідкрийте чернетку.');syncDraftList();await refreshHistory()}catch(error){reportFailure('Constructor version rollback failed','Не вдалося відновити version artifact у draft.',error)}
      })));
      versions.append(li);
    }
    if(!versions.children.length)versions.append(text('li','Version artifacts ще немає.'));
    output.append(versions);
  }catch(error){console.error('Constructor history refresh failed',error);output.append(text('p','Не вдалося прочитати Constructor history.'));announce('Не вдалося прочитати Constructor history.',true)}
}

async function mutate(command,message){
  return await serialize(async()=>{
    const draftId=currentDraftId();if(!draftId)return;
    try{await api(command,{draft_id:draftId});announce(message);syncDraftList();await refreshHistory()}catch(error){reportFailure(`Constructor mutation failed: ${command}`,'Не вдалося виконати Constructor operation.',error)}
  })
}

async function installConstructorV2Surface(){
  if(mounted)return;
  const form=$('authoring-form');
  if(!form)return;
  try{transport=chooseTransport();const bootstrap=await api('system.bootstrap');if(!bootstrap?.capabilities?.constructor_v2_history)return}catch(error){console.error('Constructor V2 mount failed',error);return}
  mounted=true;
  const actions=form.querySelector('.sticky-actions')||form;
  actions.append(
    makeButton('Snapshot',()=>serialize(async()=>{const draftId=currentDraftId();if(!draftId)return;try{await api('authoring.create_snapshot',{draft_id:draftId,label:'Manual snapshot'});announce('Snapshot збережено.');await refreshHistory()}catch(error){reportFailure('Constructor snapshot create failed','Не вдалося створити snapshot.',error)}})),
    makeButton('Undo saved',()=>mutate('authoring.undo','Undo виконано як нову persisted revision. Перевідкрийте чернетку.')),
    makeButton('Redo saved',()=>mutate('authoring.redo','Redo виконано як нову persisted revision. Перевідкрийте чернетку.')),
    makeButton('History / versions',()=>serialize(refreshHistory)),
    makeButton('Publish saved version',()=>serialize(async()=>{
      const draftId=currentDraftId();if(!draftId)return;
      try{const compatibility=(await api('authoring.pack_compatibility',{})).compatibility;const result=await api('authoring.publish_version',{draft_id:draftId,compatibility});announce(`Version artifact ${result.version.version_id} створено. Canonical content не змінено.`);await refreshHistory()}catch(error){reportFailure('Constructor publish failed','Не вдалося створити version artifact.',error)}
    })),
  );
  const section=document.createElement('section');section.id='constructor-v2-panel';section.className='surface subtle';section.setAttribute('aria-labelledby','constructor-v2-heading');section.setAttribute('aria-busy','false');
  const heading=text('h3','Constructor V2 — історія та версії');heading.id='constructor-v2-heading';heading.tabIndex=-1;
  const note=text('p','Операції працюють лише зі збереженою draft revision. Publish створює version artifact для explicit integration review і ніколи не записує canonical source-audited corpus напряму.');
  const output=document.createElement('div');output.id='constructor-v2-output';output.setAttribute('aria-live','polite');
  section.append(heading,note,output);form.append(section);
}

export {installConstructorV2Surface};
