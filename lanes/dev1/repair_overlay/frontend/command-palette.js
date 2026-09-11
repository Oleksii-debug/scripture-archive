export class CommandPaletteUI{
  constructor({registry,announce=()=>{},documentRef=globalThis.document}={}){
    if(!registry||typeof registry.list!=='function'||typeof registry.execute!=='function')throw new TypeError('registry is required');
    if(!documentRef)throw new TypeError('document is required');
    this.registry=registry;
    this.announce=announce;
    this.document=documentRef;
    this.results=[];
    this.selected=0;
    this.returnFocus=null;
    this.trigger=null;
    this.dialog=null;
    this.input=null;
    this.list=null;
    this.empty=null;
  }

  mount(){
    if(this.dialog)return this;
    const d=this.document;
    this.trigger=d.createElement('button');
    this.trigger.type='button';
    this.trigger.id='command-palette-trigger';
    this.trigger.textContent='Команди';
    this.trigger.setAttribute('aria-haspopup','dialog');
    this.trigger.setAttribute('aria-controls','command-palette-dialog');

    this.dialog=d.createElement('dialog');
    this.dialog.id='command-palette-dialog';
    this.dialog.className='card';
    this.dialog.setAttribute('aria-labelledby','command-palette-heading');

    const heading=d.createElement('h2');
    heading.id='command-palette-heading';
    heading.textContent='Палітра команд';
    const help=d.createElement('p');
    help.id='command-palette-help';
    help.textContent='Введіть назву команди. Стрілки, Home/End і Enter працюють без миші; Escape закриває палітру.';
    const label=d.createElement('label');
    label.htmlFor='command-palette-search';
    label.textContent='Пошук команд';
    this.input=d.createElement('input');
    this.input.id='command-palette-search';
    this.input.type='search';
    this.input.autocomplete='off';
    this.input.setAttribute('aria-describedby','command-palette-help');
    this.input.setAttribute('aria-controls','command-palette-list');
    this.input.setAttribute('aria-autocomplete','list');

    this.list=d.createElement('ul');
    this.list.id='command-palette-list';
    this.list.setAttribute('role','listbox');
    this.list.setAttribute('aria-label','Доступні команди');
    this.empty=d.createElement('p');
    this.empty.id='command-palette-empty';
    this.empty.setAttribute('role','status');
    this.empty.textContent='Команд не знайдено.';
    this.empty.hidden=true;
    const close=d.createElement('button');
    close.type='button';
    close.textContent='Закрити';

    label.append(this.input);
    this.dialog.append(heading,help,label,this.list,this.empty,close);
    const host=d.querySelector('nav')??d.body;
    host.append(this.trigger);
    d.body.append(this.dialog);

    this.trigger.addEventListener('click',()=>this.open());
    close.addEventListener('click',()=>this.close());
    this.input.addEventListener('input',()=>{this.selected=0;this.render()});
    this.input.addEventListener('keydown',event=>this.onKeydown(event));
    this.list.addEventListener('click',event=>{
      const option=event.target.closest?.('[role="option"]');
      if(!option)return;
      const index=Number(option.dataset.index);
      if(Number.isInteger(index)){this.selected=index;this.runSelected()}
    });
    this.dialog.addEventListener('cancel',event=>{event.preventDefault();this.close()});
    this.dialog.addEventListener('close',()=>this.restoreFocus());
    this.render();
    return this;
  }

  open(){
    if(!this.dialog)this.mount();
    this.returnFocus=this.document.activeElement;
    this.input.value='';
    this.selected=0;
    this.render();
    if(typeof this.dialog.showModal==='function')this.dialog.showModal();
    else this.dialog.setAttribute('open','');
    this.input.focus();
    this.announce('Палітру команд відкрито');
  }

  close({restore=true}={}){
    if(!this.dialog)return;
    this._restoreAfterClose=restore;
    if(typeof this.dialog.close==='function'&&this.dialog.open)this.dialog.close();
    else{this.dialog.removeAttribute('open');this.restoreFocus()}
  }

  restoreFocus(){
    const shouldRestore=this._restoreAfterClose!==false;
    this._restoreAfterClose=true;
    if(shouldRestore&&this.returnFocus&&typeof this.returnFocus.focus==='function')this.returnFocus.focus();
    this.returnFocus=null;
  }

  onKeydown(event){
    if(event.key==='Escape'){event.preventDefault();this.close();return}
    if(!this.results.length)return;
    let next=this.selected;
    if(event.key==='ArrowDown')next=(this.selected+1)%this.results.length;
    else if(event.key==='ArrowUp')next=(this.selected-1+this.results.length)%this.results.length;
    else if(event.key==='Home')next=0;
    else if(event.key==='End')next=this.results.length-1;
    else if(event.key==='Enter'){event.preventDefault();this.runSelected();return}
    else return;
    event.preventDefault();
    this.selected=next;
    this.syncSelection();
  }

  render(){
    this.results=this.registry.list(this.input?.value??'');
    if(this.selected>=this.results.length)this.selected=Math.max(0,this.results.length-1);
    this.list.replaceChildren();
    this.results.forEach((action,index)=>{
      const item=this.document.createElement('li');
      item.id=`command-palette-option-${index}`;
      item.setAttribute('role','option');
      item.dataset.index=String(index);
      const name=this.document.createElement('strong');
      name.textContent=action.label;
      const detail=this.document.createElement('span');
      detail.textContent=action.description?` — ${action.description}`:` — ${action.group}`;
      item.append(name,detail);
      this.list.append(item);
    });
    this.empty.hidden=this.results.length!==0;
    this.syncSelection();
  }

  syncSelection(){
    [...this.list.children].forEach((item,index)=>item.setAttribute('aria-selected',String(index===this.selected)));
    const active=this.results.length?`command-palette-option-${this.selected}`:'';
    if(active)this.input.setAttribute('aria-activedescendant',active);
    else this.input.removeAttribute('aria-activedescendant');
  }

  runSelected(){
    const action=this.results[this.selected];
    if(!action)return;
    const result=this.registry.execute(action.id);
    if(result===false){
      this.selected=0;
      this.render();
      this.announce('Команда більше недоступна в поточному контексті');
      return false;
    }
    this.close({restore:false});
    this.announce(`Команда: ${action.label}`);
    return result;
  }
}
