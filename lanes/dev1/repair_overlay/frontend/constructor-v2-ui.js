import {chooseTransport,unwrap} from './transport.js';

const $=id=>document.getElementById(id);
let transport=null,mounted=false;

async function api(command,payload={}){return await unwrap(transport,command,payload)}
function announce(text){const host=$('global-status');if(host){host.textContent='';requestAnimationFrame(()=>host.textContent=text)}}
function currentDraftId(){const value=$('draft-id')?.value?.trim();if(!value)throw new Error('Спочатку відкрийте збережену чернетку.');return value}
function makeButton(label,handler){const button=document.createElement('button');button.type='button';button.textContent=label;button.onclick=handler;return button}
function text(tag,value){const el=document.createElement(tag);el.textContent=value;return el}
function syncDraftList(){const nav=$('nav-authoring');if(nav)nav.click()}

async function refreshHistory(){
  const output=$('constructor-v2-output');
  if(!output)return;
  output.replaceChildren();
  let draftId;
  try{draftId=currentDraftId()}catch(error){output.append(text('p',error.message));return}
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
      li.append(makeButton('Diff до поточної',async()=>{
        try{const diff=await api('authoring.diff_draft',{draft_id:draftId,from_snapshot_id:row.snapshot_id});announce(diff.changed?`Змінено шляхів: ${diff.changed_paths.length}`:'Відмінностей немає');const pre=document.createElement('pre');pre.textContent=(diff.changed_paths||[]).join('\n')||'No changes';li.append(pre)}catch(error){announce(`Constructor: ${error.message}`)}
      }));
      li.append(makeButton('Відновити snapshot',async()=>{
        try{await api('authoring.restore_snapshot',{draft_id:draftId,snapshot_id:row.snapshot_id});announce('Snapshot відновлено як нову revision; попередній стан збережено safety snapshot. Перевідкрийте чернетку.');syncDraftList();await refreshHistory()}catch(error){announce(`Constructor: ${error.message}`)}
      }));
      snapshots.append(li);
    }
    if(!snapshots.children.length)snapshots.append(text('li','Snapshots ще немає.'));
    output.append(snapshots);

    output.append(text('h4','Published version artifacts'));
    const versions=document.createElement('ul');
    for(const row of history.versions||[]){
      const li=document.createElement('li');
      li.append(document.createTextNode(`${row.version_id} · source revision ${row.draft_revision??'—'} · canonical write: ні `));
      li.append(makeButton('Rollback у draft',async()=>{
        try{await api('authoring.rollback_version',{draft_id:draftId,version_id:row.version_id});announce('Version artifact відновлено у draft як нову revision; canonical content не змінено. Перевідкрийте чернетку.');syncDraftList();await refreshHistory()}catch(error){announce(`Constructor: ${error.message}`)}
      }));
      versions.append(li);
    }
    if(!versions.children.length)versions.append(text('li','Version artifacts ще немає.'));
    output.append(versions);
  }catch(error){output.append(text('p',`Не вдалося прочитати Constructor history: ${error.message}`))}
}

async function mutate(command,message){
  try{const draftId=currentDraftId();await api(command,{draft_id:draftId});announce(message);syncDraftList();await refreshHistory()}catch(error){announce(`Constructor: ${error.message}`)}
}

async function installConstructorV2Surface(){
  if(mounted)return;
  const form=$('authoring-form');
  if(!form)return;
  try{transport=chooseTransport();const bootstrap=await api('system.bootstrap');if(!bootstrap?.capabilities?.constructor_v2_history)return}catch(_error){return}
  mounted=true;
  const actions=form.querySelector('.sticky-actions')||form;
  actions.append(
    makeButton('Snapshot',async()=>{try{const draftId=currentDraftId();await api('authoring.create_snapshot',{draft_id:draftId,label:'Manual snapshot'});announce('Snapshot збережено.');await refreshHistory()}catch(error){announce(`Constructor: ${error.message}`)}}),
    makeButton('Undo saved',()=>mutate('authoring.undo','Undo виконано як нову persisted revision. Перевідкрийте чернетку.')),
    makeButton('Redo saved',()=>mutate('authoring.redo','Redo виконано як нову persisted revision. Перевідкрийте чернетку.')),
    makeButton('History / versions',refreshHistory),
    makeButton('Publish saved version',async()=>{
      try{const draftId=currentDraftId();const compatibility=(await api('authoring.pack_compatibility',{})).compatibility;const result=await api('authoring.publish_version',{draft_id:draftId,compatibility});announce(`Version artifact ${result.version.version_id} створено. Canonical content не змінено.`);await refreshHistory()}catch(error){announce(`Constructor publish: ${error.message}`)}
    }),
  );
  const section=document.createElement('section');section.id='constructor-v2-panel';section.className='surface subtle';section.setAttribute('aria-labelledby','constructor-v2-heading');
  const heading=text('h3','Constructor V2 — історія та версії');heading.id='constructor-v2-heading';heading.tabIndex=-1;
  const note=text('p','Операції працюють лише зі збереженою draft revision. Publish створює version artifact для explicit integration review і ніколи не записує canonical source-audited corpus напряму.');
  const output=document.createElement('div');output.id='constructor-v2-output';output.setAttribute('aria-live','polite');
  section.append(heading,note,output);form.append(section);
}

export {installConstructorV2Surface};
