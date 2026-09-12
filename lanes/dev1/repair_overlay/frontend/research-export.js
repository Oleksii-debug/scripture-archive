const FORMAT_KEYS=new Set(['json','markdown','html']);

function element(tag,{id=null,className=null,text=null}={}){
  const node=document.createElement(tag);
  if(id)node.id=id;
  if(className)node.className=className;
  if(text!==null)node.textContent=text;
  return node;
}

export class ResearchExportUI{
  constructor({invoke,announce,showView,enabled=true}){
    this.invoke=invoke;
    this.announce=announce;
    this.showView=showView;
    this.enabled=Boolean(enabled);
    this.exportData=null;
    this.inFlight=null;
    this.requestSerial=0;
    this.active=false;
  }

  mount({nav,main}){
    if(!nav||!main)throw new Error('ResearchExportUI requires nav and main hosts');
    if(document.getElementById('export-view'))return;

    const navButton=element('button',{id:'nav-export',text:'Експорт'});
    navButton.type='button';
    navButton.disabled=!this.enabled;
    navButton.setAttribute('aria-disabled',String(!this.enabled));
    if(!this.enabled)navButton.title='Експорт недоступний без канонічного runtime';
    navButton.onclick=()=>this.open();
    nav.append(navButton);
    this.navButton=navButton;

    const section=element('section',{id:'export-view',className:'hidden'});
    section.setAttribute('aria-labelledby','export-heading');
    const eyebrow=element('p',{className:'eyebrow',text:'Research Export · unlocked evidence only'});
    const heading=element('h2',{id:'export-heading',text:'Експорт дослідження'});
    heading.tabIndex=-1;
    const scope=element('p',{text:'Експорт читає лише поточний runtime-owned unlocked evidence scope. Заблоковані докази, невидимі claims і relation metadata не повинні потрапляти у результат.'});
    const safety=element('p',{className:'notice info',text:'HTML-експорт показується як звичайний текст і не виконується як DOM. Експортер не вигадує дати, consensus або міжсвідкові твердження.'});
    const controls=element('div',{className:'action-row'});
    const formatLabel=element('label',{text:'Формат'});formatLabel.htmlFor='research-export-format';
    const format=document.createElement('select');format.id='research-export-format';
    [['json','JSON'],['markdown','Markdown'],['html','HTML']].forEach(([value,label])=>{const option=document.createElement('option');option.value=value;option.textContent=label;format.append(option)});
    format.onchange=()=>this.render();
    const refresh=element('button',{id:'research-export-refresh',text:'Оновити експорт'});refresh.type='button';refresh.onclick=()=>this.refresh();
    controls.append(formatLabel,format,refresh);
    const counts=element('p',{id:'research-export-counts',text:'Ще не завантажено.'});
    const status=element('div',{id:'research-export-status',className:'sr-status'});status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.setAttribute('aria-atomic','true');
    const outputLabel=element('h3',{id:'research-export-output-heading',text:'Текст експорту'});
    const output=element('pre',{id:'research-export-output'});output.tabIndex=0;output.setAttribute('aria-labelledby','research-export-output-heading');output.textContent='Оберіть «Оновити експорт», щоб прочитати поточний unlocked-only snapshot.';
    const back=element('button',{id:'research-export-back',text:'Повернутися до дослідження'});back.type='button';back.onclick=()=>this.showView('research','research-heading');
    section.append(eyebrow,heading,scope,safety,controls,counts,status,outputLabel,output,back);main.append(section);
    this.section=section;this.heading=heading;this.format=format;this.refreshButton=refresh;this.counts=counts;this.status=status;this.output=output;
  }

  deactivate(){
    if(!this.active)return;
    this.active=false;
    this.requestSerial+=1;
    this.inFlight=null;
    if(this.refreshButton)this.refreshButton.disabled=false;
  }

  async open(){
    if(!this.enabled){this.announce?.('Експорт недоступний без канонічного runtime');return;}
    this.active=true;
    this.showView('export','export-heading');
    await this.refresh();
  }

  async refresh(){
    if(!this.enabled||!this.active)return;
    if(this.inFlight)return this.inFlight;
    const serial=++this.requestSerial;
    this.refreshButton.disabled=true;
    this.status.textContent='Оновлення unlocked-only експорту…';
    const run=(async()=>{
      try{
        const data=await this.invoke('research.export',{});
        if(serial!==this.requestSerial||!this.active)return;
        this.exportData=this.validate(data);this.render();
        const c=this.exportData.counts;this.counts.textContent=`Claims: ${c.claims}; evidence: ${c.evidence}; relations: ${c.relations}. Scope: unlocked_only.`;
        this.status.textContent='Експорт оновлено.';this.announce?.('Експорт дослідження оновлено');
      }catch(error){
        if(serial!==this.requestSerial||!this.active)return;
        this.exportData=null;this.output.textContent='';this.counts.textContent='Експорт недоступний.';this.status.textContent=`Помилка експорту: ${error?.message||'невідома помилка'}`;this.announce?.(this.status.textContent);
      }finally{if(serial===this.requestSerial&&this.active)this.refreshButton.disabled=false;}
    })();
    this.inFlight=run;
    try{await run;}finally{if(this.inFlight===run)this.inFlight=null;}
  }

  validate(data){
    const value=data?.export;
    if(!value||typeof value!=='object')throw new Error('Некоректна відповідь research export');
    if(value.schema!=='research-export.v1')throw new Error('Невідома schema research export');
    if(value.evidence_scope!=='unlocked_only')throw new Error('Research export порушив unlocked_only scope');
    if(!value.counts||typeof value.counts!=='object')throw new Error('Research export не містить counts');
    for(const key of ['claims','evidence','relations'])if(!Number.isInteger(value.counts[key])||value.counts[key]<0)throw new Error(`Некоректний count: ${key}`);
    for(const key of FORMAT_KEYS)if(typeof value[key]!=='string')throw new Error(`Research export не містить ${key}`);
    return value;
  }

  render(){if(!this.exportData)return;const key=FORMAT_KEYS.has(this.format.value)?this.format.value:'json';this.output.textContent=this.exportData[key];}
}
