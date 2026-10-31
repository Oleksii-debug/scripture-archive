import test from 'node:test';
import assert from 'node:assert/strict';
import { renderPublicMaterials, reviewText } from '../public/material-review.js';

// Execute the actual public /library + /builder review handler, simulating
// Chromium's behavior when a focused submit button becomes disabled.
async function scenario({
  lang='en', reply='correct', originallyFocused=true,
  moveFocus=false, changePrincipal=false, detachForm=false, detachRoot=false,
  focusThrows=false, missingChoice=false, alreadyDisabled=false, changeChoice=false
}={}) {
  const originalFetch=globalThis.fetch;
  const originalFormData=globalThis.FormData;
  const body={kind:'body'}, elsewhere={kind:'outside'};
  const document={body,activeElement:null};
  let focused=0, sent=0, current=true, settle, reject;
  let selectedChoice='1';
  const pending=new Promise((resolve,rejectFn)=>{settle=resolve; reject=rejectFn;});
  const button={
    _disabled:false,
    focus(options){
      focused++;
      assert.deepEqual(options,{preventScroll:true});
      if(focusThrows)throw Error('detached focus');
      document.activeElement=button;
    },
  };
  Object.defineProperty(button,'disabled',{
    get(){return this._disabled;},
    set(value){
      this._disabled=Boolean(value);
      if(value && document.activeElement===button)document.activeElement=body;
    }
  });
  const status={textContent:''};
  const form={
    isConnected:true,dataset:{id:'approved-1'},onsubmit:null,
    querySelector:selector=>selector==='button'?button:status,
  };
  const root={
    isConnected:true,ownerDocument:document,innerHTML:'',
    querySelectorAll:selector=>selector==='.public-material'?[form]:[],
    querySelector:()=>null,
  };
  globalThis.FormData=class {get(name){return name==='choice'&&!missingChoice?selectedChoice:null;}};
  globalThis.fetch=async (url,options)=>{
    if(url==='/api/material-review?view=public')return {
      ok:true,json:async()=>({items:[{
        id:'approved-1',title:'A real reviewed study',reference:'GEN 1:1',
        provenance:'Public domain text',prompt:'Choose the source statement',
        options:['Option A','Option B'],locale:'en',reviewedAt:'2026-10-31 10:00:00',
        rights:{holder:'Public domain',basis:'public_domain',licenseUrl:null},
      }]})
    };
    assert.equal(url,'/api/material-review');
    assert.equal(options.method,'POST');
    assert.deepEqual(JSON.parse(options.body),{
      action:'answer',id:'approved-1',choice:1
    });
    sent++;
    return pending;
  };
  try{
    await renderPublicMaterials(root,reviewText(lang),value=>String(value),()=>current);
    assert.equal(typeof form.onsubmit,'function');
    document.activeElement=originallyFocused?button:body;
    button.disabled=alreadyDisabled;
    const action=form.onsubmit({preventDefault(){}});
    if(!missingChoice&&!alreadyDisabled){
      assert.equal(button.disabled,true);
      if(moveFocus)document.activeElement=elsewhere;
      if(changeChoice)selectedChoice='0';
      if(changePrincipal)current=false;
      if(detachForm)form.isConnected=false;
      if(detachRoot)root.isConnected=false;
      if(reply==='error')reject(Error('network interrupted'));
      else settle({ok:true,json:async()=>({correct:reply==='correct',explanation:'Source explanation'})});
    }
    await action;
    return {document,button,status,root,form,focused,sent,elsewhere};
  }finally{
    if(originalFetch===undefined)delete globalThis.fetch;else globalThis.fetch=originalFetch;
    if(originalFormData===undefined)delete globalThis.FormData;else globalThis.FormData=originalFormData;
  }
}

test('focused submit returns keyboard focus after actual successful answer',async()=>{
  const x=await scenario();
  assert.equal(x.document.activeElement,x.button);
  assert.equal(x.focused,1);
  assert.equal(x.button.disabled,false);
  assert.match(x.status.textContent,/Correct/);
  assert.match(x.status.textContent,/Source explanation/);
  assert.equal(x.sent,1);
});
test('focused submit returns keyboard focus on wrong answer',async()=>{
  const x=await scenario({reply:'wrong'});
  assert.equal(x.document.activeElement,x.button);
  assert.equal(x.focused,1);
  assert.match(x.status.textContent,/Try again/);
  assert.equal(x.sent,1);
});
test('focused submit returns keyboard focus after recoverable network error',async()=>{
  const x=await scenario({reply:'error'});
  assert.equal(x.document.activeElement,x.button);
  assert.equal(x.focused,1);
  assert.equal(x.button.disabled,false);
  assert.match(x.status.textContent,/Could not check/);
});
test('user focus move during pending answer is never stolen',async()=>{
  const x=await scenario({moveFocus:true});
  assert.equal(x.document.activeElement,x.elsewhere);
  assert.equal(x.focused,0);
  assert.equal(x.button.disabled,false);
});
test('the former principal does not receive response or focus after account change',async()=>{
  const x=await scenario({changePrincipal:true});
  assert.equal(x.focused,0);
  assert.equal(x.document.activeElement,x.document.body);
  assert.equal(x.status.textContent,'');
});
test('unmounted form never receives answer or focus',async()=>{
  const x=await scenario({detachForm:true});
  assert.equal(x.focused,0);
  assert.equal(x.status.textContent,'');
});
test('unmounted answer panel never receives answer or focus',async()=>{
  const x=await scenario({detachRoot:true});
  assert.equal(x.focused,0);
  assert.equal(x.status.textContent,'');
});
test('a click without original keyboard focus does not steal focus',async()=>{
  const x=await scenario({originallyFocused:false});
  assert.equal(x.focused,0);
  assert.equal(x.document.activeElement,x.document.body);
  assert.match(x.status.textContent,/Correct/);
});
test('a focus exception cannot erase verified answer result',async()=>{
  const x=await scenario({focusThrows:true});
  assert.equal(x.focused,1);
  assert.equal(x.button.disabled,false);
  assert.match(x.status.textContent,/Correct/);
});
test('missing selected answer cannot mutate or move focus',async()=>{
  const x=await scenario({missingChoice:true});
  assert.equal(x.sent,0);
  assert.equal(x.focused,0);
  assert.equal(x.button.disabled,false);
});
test('a second concurrent submit is ignored while control is disabled',async()=>{
  const x=await scenario({alreadyDisabled:true});
  assert.equal(x.sent,0);
  assert.equal(x.focused,0);
  assert.equal(x.button.disabled,true);
});
test('Ukrainian success announcement survives focus restoration',async()=>{
  const x=await scenario({lang:'uk'});
  assert.equal(x.focused,1);
  assert.match(x.status.textContent,/Правильно/);
});
test('Russian error announcement survives focus restoration',async()=>{
  const x=await scenario({lang:'ru',reply:'error'});
  assert.equal(x.focused,1);
  assert.match(x.status.textContent,/Не удалось/);
});

test('a changed radio during pending grade never announces the previous choice as correct',async()=>{
  for(const lang of ['uk','ru','en']){
    const x=await scenario({lang,changeChoice:true});
    const w=reviewText(lang);
    assert.equal(x.sent,1,'the original answer was submitted only once');
    assert.equal(x.status.textContent,w.choiceChanged,
      'NVDA live region must describe the changed selection, not the stale grade');
    assert.doesNotMatch(x.status.textContent,/Answer A was correct|Source explanation|Правильно|Правильно\\.|Correct\\.|Верно\\./);
    assert.equal(x.button.disabled,false,'the user can check the newly selected answer');
    assert.equal(x.document.activeElement,x.button,'keyboard focus returns to the live submit');
  }
});

test('a changed choice with a negative receipt also remains unresolved until recheck',async()=>{
  const x=await scenario({lang:'en',reply:'wrong',changeChoice:true});
  assert.equal(x.status.textContent,reviewText('en').choiceChanged);
  assert.doesNotMatch(x.status.textContent,/Try again\\.|Correct\\./);
  assert.equal(x.button.disabled,false);
});

test('changing the selected answer clears the prior grading result and explanation', async () => {
  for (const reply of ['correct', 'wrong', 'error']) {
    const x = await scenario({reply});
    assert.ok(x.status.textContent);
    x.form.onchange({target:{name:'choice',type:'radio'}});
    assert.equal(x.status.textContent, '');
  }
});

test('unrelated form changes do not erase answer feedback', async () => {
  const x = await scenario();
  const prior = x.status.textContent;
  x.form.onchange({target:{name:'other',type:'radio'}});
  x.form.onchange({target:{name:'choice',type:'text'}});
  assert.equal(x.status.textContent, prior);
});
