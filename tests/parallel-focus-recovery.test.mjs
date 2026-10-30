import test from 'node:test';
import assert from 'node:assert/strict';
import {mountParallelReader} from '../public/parallel-reader.js';

const selected = {id:'uk-kulish', contentId:'UKRPAN', title:'Куліш', local:true};
const catalog = {translations:{},editions:{uk:{
  id:'UKRPAN', title:'Куліш', source:'https://example.org/source',
  license:'Public Domain'
}}};

async function scenario({mode='success', noFocus=false, stale=false, detached=false,
  external=false, selection=false, invalidated=false}={}) {
  const previousDocument=globalThis.document;
  const previousFormData=globalThis.FormData;
  const document={body:{id:'body'},activeElement:null};
  const outside={id:'outside'};
  const dropdown={id:'edition-select'};
  let focusCalls=0, nowCurrent=true, locked=0, failed=0;
  const button={
    _disabled:false,
    focus(){ focusCalls++; document.activeElement=this; }
  };
  Object.defineProperty(button,'disabled',{
    get(){return this._disabled;},
    set(value){
      this._disabled=!!value;
      // The browser drops keyboard focus when a focused button is disabled.
      if (value && document.activeElement===button)
        document.activeElement=document.body;
    }
  });
  const status={textContent:''};
  const result={innerHTML:'',replaceChildren(){this.innerHTML='';}};
  const form={onsubmit:null,querySelector:()=>button};
  const panel={
    isConnected:true,
    querySelector(selector){
      return selector==='.parallel-form' ? form :
        selector==='.parallel-status' ? status : result;
    }
  };
  let release, rejectLoad;
  const pending = new Promise((resolve,reject)=>{
    release=resolve; rejectLoad=reject;
  });
  globalThis.document=document;
  globalThis.FormData=class {get(){return selected.id;}};
  try {
    mountParallelReader(panel,{
      editions:[selected],catalog,lang:'uk',book:'GEN',bookTitle:'Буття',
      chapter:1,esc:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;'),
      getBook:()=>pending,
      check:async()=>({invalidated}),
      current:()=>nowCurrent,
      lock:()=>{locked++;nowCurrent=false;},
      failClosed:()=>{failed++;nowCurrent=false;}
    });
    document.activeElement = noFocus ? document.body : selection ? dropdown : button;
    const submitted = form.onsubmit({preventDefault(){}});
    assert.equal(button.disabled,true,'guarded request starts single-flight');
    // Allow the first guard to run before the second-text promise resolves.
    await Promise.resolve(); await Promise.resolve();
    if (stale) nowCurrent=false;
    if (detached) panel.isConnected=false;
    if (external) document.activeElement=outside;
    if (mode==='error') rejectLoad(Error('offline'));
    else release({chapters:[['Verified text']]});
    await submitted;
    return {
      status:status.textContent,result:result.innerHTML,
      active:document.activeElement,button,dropdown,outside,document,
      disabled:button.disabled,focusCalls,locked,failed
    };
  } finally {
    if (previousDocument===undefined) delete globalThis.document;
    else globalThis.document=previousDocument;
    if (previousFormData===undefined) delete globalThis.FormData;
    else globalThis.FormData=previousFormData;
  }
}

test('focused comparison submit returns focus after successful guarded load',async()=>{
  const state=await scenario();
  assert.equal(state.active,state.button);
  assert.equal(state.focusCalls,1);
  assert.equal(state.disabled,false);
  assert.match(state.result,/Verified text/);
});

test('focused comparison submit is restored after recoverable loading failure',async()=>{
  const state=await scenario({mode:'error'});
  assert.equal(state.active,state.button);
  assert.equal(state.focusCalls,1);
  assert.match(state.status,/Не вдалося/);
  assert.equal(state.disabled,false);
});

test('unrelated external keyboard focus is not stolen during pending comparison',async()=>{
  const state=await scenario({external:true});
  assert.equal(state.active,state.outside);
  assert.equal(state.focusCalls,0);
});

test('focus is not restored after principal or chapter context changes',async()=>{
  const state=await scenario({stale:true});
  assert.equal(state.active,state.document.body);
  assert.equal(state.focusCalls,0);
  assert.equal(state.result,'');
});

test('focus is not restored in a removed comparison panel',async()=>{
  const state=await scenario({detached:true});
  assert.equal(state.active,state.document.body);
  assert.equal(state.focusCalls,0);
  assert.equal(state.result,'');
});

test('native edition dropdown keeps focus after keyboard form submission',async()=>{
  const state=await scenario({selection:true});
  assert.equal(state.active,state.dropdown);
  assert.equal(state.focusCalls,0);
});

test('programmatic submission from BODY does not steal focus',async()=>{
  const state=await scenario({noFocus:true});
  assert.equal(state.active,state.document.body);
  assert.equal(state.focusCalls,0);
});

test('invalidated chapter aborts comparison without restoring stale submit',async()=>{
  const state=await scenario({invalidated:true});
  assert.equal(state.locked,1);
  assert.equal(state.active,state.document.body);
  assert.equal(state.focusCalls,0);
  assert.equal(state.result,'');
});
