import {AccessibilitySettingsUI} from './settings-ui.js';
const byId=id=>document.getElementById(id);
const focusSoon=el=>{if(el?.isConnected)setTimeout(()=>el.focus(),0)};
export class KeymapUI{
 constructor(api,dispatcher,announce){this.api=api;this.dispatcher=dispatcher;this.announce=announce;this.actions=[];this.editing=null;this.keymapReturn=null;this.shortcutReturn=null;this.savingShortcut=false;this.accessibilitySettings=new AccessibilitySettingsUI({api,announce,documentObject:document});this.wire()}
 wire(){
   byId('nav-keymap').onclick=e=>this.open(e.currentTarget);
   byId('keymap-search').oninput=()=>this.render();
   byId('keymap-context').onchange=()=>this.render();
   byId('reset-keymap-section').onclick=()=>this.resetSection();
   byId('reset-keymap-all').onclick=()=>this.resetAll();
   byId('shortcut-save').onclick=()=>this.saveShortcut();
   byId('shortcut-dialog').addEventListener('close',()=>{this.dispatcher.clearCapture();if(!this.savingShortcut)focusSoon(this.shortcutReturn);this.shortcutReturn=null});
   byId('keymap-dialog').addEventListener('close',()=>{focusSoon(this.keymapReturn);this.keymapReturn=null});
   byId('export-keymap').onclick=()=>this.exportData();
   byId('import-keymap').onclick=()=>document.dispatchEvent(new CustomEvent('scripture-json-dialog',{detail:{mode:'keymap-import',text:''}}));
 }
 async refresh(){await this.accessibilitySettings.initialize();this.actions=(await this.api('keymap.list')).actions;this.dispatcher.setActions(this.actions)}
 async open(opener=document.activeElement){await this.refresh();this.render();this.keymapReturn=opener;const dlg=byId('keymap-dialog');if(!dlg.open)dlg.showModal();focusSoon(byId('keymap-search'))}
 render(){const q=byId('keymap-search').value.toLowerCase();const c=byId('keymap-context').value;const host=byId('keymap-list');host.replaceChildren();this.actions.filter(a=>(!q||`${a.action_id} ${a.description}`.toLowerCase().includes(q))&&(!c||a.context===c||(a.allowed_contexts||[]).includes(c))).forEach(a=>{const row=document.createElement('div');row.className='keymap-row';const desc=document.createElement('div');desc.innerHTML=`<strong></strong><br><small></small>`;desc.querySelector('strong').textContent=a.description;desc.querySelector('small').textContent=`${a.action_id} · ${a.context}`;const bind=document.createElement('code');bind.textContent=a.current_binding||'Не призначено';const change=document.createElement('button');change.type='button';change.textContent='Змінити';change.dataset.keymapChange=a.action_id;change.setAttribute('aria-label',`Змінити комбінацію: ${a.description}. Поточна: ${a.current_binding||'не призначено'}`);change.onclick=()=>this.edit(a,change);const clear=document.createElement('button');clear.type='button';clear.textContent='Очистити';clear.dataset.keymapClear=a.action_id;clear.setAttribute('aria-label',`Очистити комбінацію: ${a.description}`);clear.onclick=async()=>{const aid=a.action_id;await this.api('keymap.clear',{action_id:aid});await this.refresh();this.render();focusSoon(this.findActionButton('clear',aid));this.announce('Комбінацію очищено')};row.append(desc,bind,change,clear);host.append(row)})}
 findActionButton(kind,actionId){const attr=kind==='clear'?'keymapClear':'keymapChange';return [...document.querySelectorAll(`[data-${kind==='clear'?'keymap-clear':'keymap-change'}]`)].find(x=>x.dataset[attr]===actionId)||null}
 edit(a,opener){this.editing=a;this.shortcutReturn=opener;byId('shortcut-action-name').textContent=a.description;byId('shortcut-capture').value='';byId('shortcut-error').textContent='';const dlg=byId('shortcut-dialog');if(!dlg.open)dlg.showModal();const inp=byId('shortcut-capture');focusSoon(inp);this.dispatcher.setCapture(binding=>{inp.value=binding;byId('shortcut-error').textContent=''},inp)}
 async saveShortcut(){try{const binding=byId('shortcut-capture').value;if(!binding)throw new Error('Натисніть комбінацію');const aid=this.editing.action_id;this.savingShortcut=true;await this.api('keymap.rebind',{action_id:aid,binding});byId('shortcut-dialog').close();await this.refresh();this.render();this.savingShortcut=false;focusSoon(this.findActionButton('change',aid));this.announce('Комбінацію змінено')}catch(e){this.savingShortcut=false;byId('shortcut-error').textContent=e.message;focusSoon(byId('shortcut-capture'))}}
 async resetSection(){const c=byId('keymap-context').value;if(!c){this.announce('Оберіть контекст для reset current section');return}await this.api('keymap.reset_context',{context:c});await this.refresh();this.render();focusSoon(byId('reset-keymap-section'));this.announce('Контекст скинуто')}
 async resetAll(){await this.api('keymap.reset_all');await this.refresh();this.render();focusSoon(byId('reset-keymap-all'));this.announce('Усі комбінації скинуто')}
 async exportData(){const data=await this.api('keymap.export');document.dispatchEvent(new CustomEvent('scripture-json-dialog',{detail:{mode:'readonly',text:JSON.stringify(data,null,2)}}))}
 async importData(data){await this.api('keymap.import',{data});await this.refresh();this.render();this.announce('Keymap імпортовано')}
}
