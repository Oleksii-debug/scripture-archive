function eventBinding(e){const parts=[];if(e.ctrlKey)parts.push('Ctrl');if(e.altKey)parts.push('Alt');if(e.shiftKey)parts.push('Shift');if(e.metaKey)parts.push('Meta');let key=e.key;if(['Control','Alt','Shift','Meta'].includes(key))return null;const map={' ':'Space','ArrowRight':'ArrowRight','ArrowLeft':'ArrowLeft','ArrowUp':'ArrowUp','ArrowDown':'ArrowDown','Escape':'Escape','Enter':'Enter','Home':'Home','Tab':'Tab'};key=map[key]||((key.length===1)?key.toUpperCase():key);parts.push(key);return parts.join('+')}
function editableTarget(target){const el=target?.nodeType===3?target.parentElement:target;return !!el?.closest?.('textarea,input:not([type=button]):not([type=checkbox]):not([type=radio]),select,[contenteditable="true"],[contenteditable=""]')}
export class HotkeyDispatcher{
 constructor(execute){this.execute=execute;this.actions=[];this.capture=null;document.addEventListener('keydown',e=>this.onKey(e),true)}
 setActions(a){this.actions=a||[]}
 setCapture(fn){this.capture=fn}
 clearCapture(){this.capture=null}
 onKey(e){
   if(this.capture){
     // Escape must remain the native modal-cancel key and Tab/Shift+Tab must
     // continue to move focus. They are never swallowed by shortcut capture.
     if(e.key==='Escape'){this.clearCapture();return}
     if(e.key==='Tab')return
     const b=eventBinding(e);if(b){e.preventDefault();e.stopPropagation();this.capture(b,e)}return
   }
   const editable=editableTarget(e.target);
   const b=eventBinding(e);if(!b)return;const activeContext=document.querySelector('#authoring-view:not(.hidden)')?'authoring':document.querySelector('#player-view:not(.hidden)')?'player':'global';
   const action=this.actions.find(a=>a.current_binding===b&&(a.allowed_contexts||[]).includes(activeContext));if(!action)return;
   // Never steal ordinary typing/navigation in editors/selects. Modified,
   // explicit ActionRegistry bindings remain available there.
   if(editable&&!e.ctrlKey&&!e.altKey&&!e.metaKey)return;
   e.preventDefault();this.execute(action.action_id)
 }
}
export {eventBinding,editableTarget};
