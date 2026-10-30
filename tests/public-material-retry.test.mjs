import test from 'node:test';
import assert from 'node:assert/strict';
import { renderPublicMaterials, reviewText } from '../public/material-review.js';

const esc = x => String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const rootWithButton = () => {
  const buttons = [];
  const root = { isConnected:true, innerHTML:'', querySelectorAll:()=>[],
    querySelector(selector) {
      if(selector!=='#retry-public-materials')return null;
      const button={disabled:false,isConnected:true,onclick:null};
      buttons.push(button);return button;
    }};
  return {root,buttons};
};

test('UK, RU, EN public material listing failure gives a working in-place retry',async()=>{
  const before=globalThis.fetch;
  try {
    for(const lang of ['uk','ru','en']){
      let calls=0;
      const {root,buttons}=rootWithButton(),words=reviewText(lang);
      globalThis.fetch=async()=>{calls++;if(calls===1)throw Error('offline');return {ok:true,json:async()=>({items:[]})};};
      await renderPublicMaterials(root,words,esc);
      assert.match(root.innerHTML,/role="alert"/);
      assert.match(root.innerHTML,/id="retry-public-materials"/);
      assert.ok(root.innerHTML.includes(words.retry));
      await buttons[0].onclick();
      assert.equal(calls,2);
      assert.ok(root.innerHTML.includes(words.empty));
      assert.doesNotMatch(root.innerHTML,/retry-public-materials/);
    }
  }finally{globalThis.fetch=before;}
});

test('stale principal, detached panel and disabled retry cannot make a second request',async()=>{
  const before=globalThis.fetch;
  try{
    for(const invalidator of [
      (f)=>{f.current=false;},
      (f)=>{f.root.isConnected=false;},
      (f)=>{f.buttons[0].isConnected=false;},
      (f)=>{f.buttons[0].disabled=true;}
    ]){
      const f={...rootWithButton(),current:true};let calls=0;
      globalThis.fetch=async()=>{calls++;throw Error('offline');};
      await renderPublicMaterials(f.root,reviewText('en'),esc,()=>f.current);
      invalidator(f);
      await f.buttons[0].onclick();
      assert.equal(calls,1);
    }
  }finally{globalThis.fetch=before;}
});

test('single-flight retry and repeat failures retain an actionable recovery control',async()=>{
  const before=globalThis.fetch;
  const f=rootWithButton();
  let calls=0,release;
  const pending=new Promise(resolve=>{release=resolve;});
  globalThis.fetch=async()=>{
    calls++;
    if(calls===1 || calls===2)throw Error('offline');
    await pending;
    return {ok:true,json:async()=>({items:[]})};
  };
  try{
    await renderPublicMaterials(f.root,reviewText('en'),esc);
    await f.buttons[0].onclick();
    assert.match(f.root.innerHTML,/id="retry-public-materials"/);
    const first=f.buttons[1].onclick(),second=f.buttons[1].onclick();
    assert.equal(f.buttons[1].disabled,true);
    release();
    await Promise.all([first,second]);
    assert.equal(calls,3);
    assert.doesNotMatch(f.root.innerHTML,/id="retry-public-materials"/);
  }finally{globalThis.fetch=before;}
});
