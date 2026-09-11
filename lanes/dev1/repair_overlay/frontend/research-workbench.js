import {ResearchPersistenceUI} from './research-persistence.js';

const byId=id=>document.getElementById(id);

function cleanList(values){
  const out=[];
  for(const value of Array.isArray(values)?values:[]){
    const text=String(value??'').trim();
    if(text && !out.includes(text))out.push(text);
  }
  return out.slice(0,24);
}

export function evidenceSummary(evidence){
  return evidence?`Показано лише докази, які користувач уже відкрив у player. Confidence: ${evidence.confidence_code||'—'}; TX1: ${evidence.textual_variant_flag||'none'}.`:'Докази ще не були відкриті в player.';
}

export class ResearchWorkbenchUI{
  constructor({announce,onReturn,invoke,capabilities}={}){
    this.announce=announce||(()=>{});
    this.onReturn=onReturn||(()=>{});
    this.task=null;this.mission=null;this.evidence=null;this.pinned=new Set();
    this.tabs=['context','sources','compare'];
    this._bind();
    this.persistence=new ResearchPersistenceUI({host:byId('research-panel-context'),invoke,capabilities,announce:this.announce});
    this.render();
  }
  _bind(){
    byId('research-return').onclick=()=>this.onReturn();
    this.tabs.forEach((name,index)=>{
      const tab=byId(`research-tab-${name}`);
      tab.onclick=()=>this.activateTab(name,true);
      tab.onkeydown=e=>{
        if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
        e.preventDefault();
        let next=index;
        if(e.key==='ArrowLeft')next=(index-1+this.tabs.length)%this.tabs.length;
        if(e.key==='ArrowRight')next=(index+1)%this.tabs.length;
        if(e.key==='Home')next=0;
        if(e.key==='End')next=this.tabs.length-1;
        this.activateTab(this.tabs[next],true);
      };
    });
  }
  setContext({task=null,mission=null}={}){
    const priorId=this.task?.node_id;
    this.task=task;this.mission=mission;
    if(priorId!==task?.node_id){this.evidence=null;this.pinned.clear();}
    this.persistence?.setContext({task,mission});
    this.render();
  }
  async refreshPersistence(){await this.persistence?.refresh();}
  setEvidence(data){this.evidence=data||null;this.render();}
  focusHeading(){byId('research-heading')?.focus();}
  activateTab(name,focus=false){
    if(!this.tabs.includes(name))return;
    this.tabs.forEach(tabName=>{
      const active=tabName===name;
      const tab=byId(`research-tab-${tabName}`),panel=byId(`research-panel-${tabName}`);
      tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;
      panel.classList.toggle('hidden',!active);
    });
    if(focus)byId(`research-tab-${name}`)?.focus();
  }
  _togglePin(ref){
    if(this.pinned.has(ref))this.pinned.delete(ref);else this.pinned.add(ref);
    this.renderSources();this.renderCompare();this.renderLinear();
    this.announce(this.pinned.has(ref)?`Закріплено ${ref}`:`Відкріплено ${ref}`);
  }
  render(){
    const task=this.task,mission=this.mission;
    byId('research-context-summary').textContent=task?`${mission?.campaign_id||''} / ${mission?.mission_id||task.mission_id||''} / ${task.node_id}`:'Відкрийте завдання, щоб передати видимий контекст у дослідницький простір.';
    const details=byId('research-context-details');details.replaceChildren();
    const rows=task?[['Вузол',task.node_id],['Тип',task.task_type||'—'],['Місія',mission?.title||mission?.mission_id||task.mission_id||'—'],['Складність',task.difficulty||'—']]:[['Стан','Немає відкритого завдання']];
    rows.forEach(([key,value])=>{const dt=document.createElement('dt');dt.textContent=key;const dd=document.createElement('dd');dd.textContent=String(value);details.append(dt,dd)});
    byId('research-prompt').textContent=task?.prompt||'Немає відкритого завдання.';
    byId('research-source-scope').textContent=task?.source_scope||'Не вказано.';
    this.renderSources();this.renderEvidence();this.renderCompare();this.renderLinear();
  }
  renderSources(){
    const list=byId('research-source-list');list.replaceChildren();
    const refs=cleanList(this.task?.source_references);
    if(!refs.length){const li=document.createElement('li');li.textContent='Немає видимих source references для поточного контексту.';list.append(li);return;}
    refs.forEach(ref=>{
      const li=document.createElement('li'),label=document.createElement('span'),button=document.createElement('button');
      li.className='research-source-row';label.textContent=ref;button.type='button';button.textContent=this.pinned.has(ref)?'Відкріпити':'Закріпити для порівняння';button.setAttribute('aria-pressed',String(this.pinned.has(ref)));button.onclick=()=>this._togglePin(ref);li.append(label,button);list.append(li);
    });
  }
  renderEvidence(){
    const list=byId('research-evidence-list');list.replaceChildren();
    const values=cleanList(this.evidence?.evidence);
    byId('research-evidence-status').textContent=evidenceSummary(this.evidence);
    values.forEach(value=>{const li=document.createElement('li');li.textContent=value;list.append(li)});
  }
  renderCompare(){
    const body=byId('research-compare-body');body.replaceChildren();
    const refs=cleanList(this.task?.source_references).filter(ref=>this.pinned.has(ref));
    if(refs.length<2){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=3;td.textContent='Закріпіть щонайменше два видимі джерела для порівняння.';tr.append(td);body.append(tr);return;}
    const evidenceState=this.evidence?'Відкриті в player':'Не відкриті';
    refs.forEach(ref=>{const tr=document.createElement('tr');[ref,this.task?.source_scope||'Не вказано.',evidenceState].forEach(value=>{const td=document.createElement('td');td.textContent=value;tr.append(td)});body.append(tr)});
  }
  renderLinear(){
    const host=byId('research-linear-output');host.replaceChildren();
    const task=this.task,refs=cleanList(task?.source_references),evidence=cleanList(this.evidence?.evidence);
    const p=document.createElement('p');p.textContent=task?`Контекст ${task.node_id}: ${task.prompt||'без prompt'}`:'Немає відкритого завдання.';host.append(p);
    const scope=document.createElement('p');scope.textContent=`Source scope: ${task?.source_scope||'не вказано'}.`;host.append(scope);
    const h4=document.createElement('h4');h4.textContent='Видимі джерела';host.append(h4);
    const ul=document.createElement('ul');(refs.length?refs:['Немає']).forEach(ref=>{const li=document.createElement('li');li.textContent=`${ref}${this.pinned.has(ref)?' — закріплено':''}`;ul.append(li)});host.append(ul);
    const eh=document.createElement('h4');eh.textContent='Відкриті докази';host.append(eh);
    const provenance=document.createElement('p');provenance.textContent=evidenceSummary(this.evidence);host.append(provenance);
    const ep=document.createElement('p');ep.textContent=evidence.length?evidence.join('; '):'Докази не відкриті або відсутні.';host.append(ep);
    const caution=document.createElement('p');caution.textContent='Workbench не робить consensus/harmonization висновків і не переносить твердження між свідками.';host.append(caution);
  }
}
