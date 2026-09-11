const KINDS=new Set(['PERSON','EVENT','PLACE','THEME']);

function element(tag,{id=null,className=null,text=null}={}){
  const node=document.createElement(tag);
  if(id)node.id=id;
  if(className)node.className=className;
  if(text!==null)node.textContent=text;
  return node;
}

function clean(value,max){
  return typeof value==='string'&&value.length>0&&value.length<=max&&value===value.trim()&&!/[\u0000-\u001f\u007f]/.test(value);
}

export class DossierUI{
  constructor({invoke,announce,showView,enabled=true}){
    this.invoke=invoke;
    this.announce=announce;
    this.showView=showView;
    this.enabled=Boolean(enabled);
    this.inFlight=null;
  }

  mount({nav,main}){
    if(!nav||!main)throw new Error('DossierUI requires nav and main hosts');
    if(document.getElementById('dossier-view'))return;

    const navButton=element('button',{id:'nav-dossier',text:'Досьє'});
    navButton.type='button';
    navButton.disabled=!this.enabled;
    navButton.setAttribute('aria-disabled',String(!this.enabled));
    if(!this.enabled)navButton.title='Досьє недоступні без канонічного runtime';
    navButton.onclick=()=>this.open();
    nav.append(navButton);
    this.navButton=navButton;

    const section=element('section',{id:'dossier-view',className:'hidden'});
    section.setAttribute('aria-labelledby','dossier-heading');
    const eyebrow=element('p',{className:'eyebrow',text:'Canonical Evidence · unlocked only'});
    const heading=element('h2',{id:'dossier-heading',text:'Досьє'});
    heading.tabIndex=-1;
    const explanation=element('p',{text:'Досьє є лише похідним представленням поточного runtime-owned evidence. Воно не додає біографію, хронологію, consensus або зв’язки, яких немає у канонічних доказах.'});
    const safety=element('p',{className:'notice info',text:'Якщо cited canonical runtime не містить безпечної підтримки суб’єкта, правильний результат: “Not stated in cited text”.'});

    const form=document.createElement('form');
    form.id='dossier-form';
    const idLabel=element('label',{text:'Canonical subject ID'});idLabel.htmlFor='dossier-subject-id';
    const subjectId=document.createElement('input');subjectId.id='dossier-subject-id';subjectId.name='subject_id';subjectId.maxLength=100;subjectId.required=true;
    const nameLabel=element('label',{text:'Display name'});nameLabel.htmlFor='dossier-display-name';
    const displayName=document.createElement('input');displayName.id='dossier-display-name';displayName.name='display_name';displayName.maxLength=160;displayName.required=true;
    const kindLabel=element('label',{text:'Kind'});kindLabel.htmlFor='dossier-kind';
    const kind=document.createElement('select');kind.id='dossier-kind';kind.name='kind';
    [['PERSON','Person'],['EVENT','Event'],['PLACE','Place'],['THEME','Theme']].forEach(([value,label])=>{const option=document.createElement('option');option.value=value;option.textContent=label;kind.append(option)});
    const submit=element('button',{id:'dossier-submit',text:'Відкрити досьє'});submit.type='submit';
    form.append(idLabel,subjectId,nameLabel,displayName,kindLabel,kind,submit);
    form.onsubmit=event=>{event.preventDefault();this.load();};

    const status=element('div',{id:'dossier-status',className:'sr-status'});status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.setAttribute('aria-atomic','true');
    const resultHeading=element('h3',{id:'dossier-result-heading',text:'Результат'});resultHeading.tabIndex=-1;
    const summary=element('p',{id:'dossier-summary',text:'Ще не завантажено.'});
    const table=document.createElement('table');table.id='dossier-table';table.setAttribute('aria-labelledby','dossier-result-heading');
    const caption=element('caption',{text:'Semantic dossier rows from visible canonical evidence'});table.append(caption);
    const thead=document.createElement('thead');const tr=document.createElement('tr');['Type','ID','Statement','Provenance'].forEach(text=>{const th=element('th',{text});th.scope='col';tr.append(th)});thead.append(tr);
    const tbody=document.createElement('tbody');table.append(thead,tbody);
    const linearHeading=element('h3',{id:'dossier-linear-heading',text:'Повний лінійний еквівалент'});
    const linear=element('pre',{id:'dossier-linear'});linear.tabIndex=0;linear.setAttribute('aria-labelledby','dossier-linear-heading');linear.textContent='Not stated in cited text';
    const back=element('button',{id:'dossier-back',text:'Повернутися на головну'});back.type='button';back.onclick=()=>this.showView('home','home-heading');
    section.append(eyebrow,heading,explanation,safety,form,status,resultHeading,summary,table,linearHeading,linear,back);
    main.append(section);
    Object.assign(this,{section,heading,form,subjectId,displayName,kind,submit,status,resultHeading,summary,tbody,linear});
  }

  open(){
    if(!this.enabled){this.announce?.('Досьє недоступні без канонічного runtime');return;}
    this.showView('dossier','dossier-heading');
    setTimeout(()=>this.subjectId?.focus(),0);
  }

  request(){
    const subject_id=this.subjectId.value;
    const display_name=this.displayName.value;
    const kind=this.kind.value;
    if(!clean(subject_id,100))throw new Error('Некоректний canonical subject ID');
    if(!clean(display_name,160))throw new Error('Некоректна display name');
    if(!KINDS.has(kind))throw new Error('Некоректний kind');
    return {subject_id,display_name,kind};
  }

  async load(){
    if(!this.enabled||this.inFlight)return this.inFlight;
    let request;
    try{request=this.request();}catch(error){this.status.textContent=error.message;this.announce?.(error.message);return;}
    this.submit.disabled=true;this.status.textContent='Завантаження source-safe досьє…';
    const run=(async()=>{
      try{
        const data=await this.invoke('dossier.get',request);
        const dossier=this.validate(data,request);
        this.render(dossier);
        this.status.textContent='Досьє оновлено.';
        this.announce?.(`Досьє ${request.display_name} оновлено`);
        this.resultHeading.focus();
      }catch(error){
        this.tbody.replaceChildren();this.summary.textContent='Досьє недоступне.';this.linear.textContent='';
        this.status.textContent=`Помилка досьє: ${error?.message||'невідома помилка'}`;this.announce?.(this.status.textContent);
      }finally{this.submit.disabled=false;}
    })();
    this.inFlight=run;
    try{await run;}finally{if(this.inFlight===run)this.inFlight=null;}
  }

  validate(data,request){
    const d=data?.dossier;
    if(!d||typeof d!=='object'||d.schema!=='scripture.dossier-view.v1')throw new Error('Некоректна dossier schema');
    if(d.evidence_scope!=='unlocked_only')throw new Error('Досьє порушило unlocked_only scope');
    if(!d.subject||d.subject.subject_id!==request.subject_id||d.subject.display_name!==request.display_name||d.subject.kind!==request.kind)throw new Error('Досьє повернуло інший subject');
    if(typeof d.stated!=='boolean'||typeof d.status_text!=='string')throw new Error('Некоректний dossier status');
    if(!Array.isArray(d.rows)||d.rows.length>1000)throw new Error('Некоректні dossier rows');
    if(!Array.isArray(d.linear)||d.linear.length>2000||d.linear.some(line=>typeof line!=='string'||line.length>4000))throw new Error('Некоректний linear equivalent');
    for(const row of d.rows){
      if(!row||typeof row!=='object'||!['EVIDENCE','CLAIM','RELATION'].includes(row.row_type))throw new Error('Некоректний dossier row');
      if(!clean(row.row_id,160)||typeof row.proposition!=='string'||row.proposition.length>4000)throw new Error('Некоректний dossier row content');
      if(![null,'T1','T2','C1','I1','D1'].includes(row.confidence)||typeof row.tx1!=='boolean')throw new Error('Некоректний provenance code');
    }
    return d;
  }

  render(d){
    this.tbody.replaceChildren();
    this.summary.textContent=d.status_text;
    for(const row of d.rows){
      const tr=document.createElement('tr');
      const provenance=[row.confidence,row.tx1?'TX1':null,row.witness?`witness=${row.witness}`:null,row.source_scope?`scope=${row.source_scope}`:null,row.uncertainty?`uncertainty=${row.uncertainty}`:null].filter(Boolean).join('; ')||'No additional provenance stated';
      [row.row_type,row.row_id,row.proposition,provenance].forEach(text=>tr.append(element('td',{text})));
      this.tbody.append(tr);
    }
    if(!d.rows.length){const tr=document.createElement('tr');const td=element('td',{text:'Not stated in cited text'});td.colSpan=4;tr.append(td);this.tbody.append(tr);}
    this.linear.textContent=d.linear.join('\n');
  }
}
