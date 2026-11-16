import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProgramme } from '../public/event-programme.js';
import { programmeMarkup, programmeEditorMarkup } from '../public/event-programme-ui.js';
import { renderEventDirectory } from '../public/event-directory.js';

const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const session={date:'2099-05-10',startsAt:'09:00',endsAt:'10:00',title:'Bible study <text>',details:'Text notes & captions.'};

for(const lang of ['uk','ru','en'])test(`programme ${lang} renders structured text with a named zone and escaped content`,()=>{
  const html=programmeMarkup({programme:[session],timeZone:'Europe/Kyiv',locale:lang},lang,esc);
  assert.match(html,/<ol><li>/);assert.match(html,/Europe\/Kyiv/);
  assert.match(html,/Bible study &lt;text&gt;/);assert.match(html,/Text notes &amp; captions/);
  assert.match(html,/<time datetime="2099-05-10">/);assert.match(html,/<time>09:00<\/time>/);
  assert.ok(html.includes(`lang="${lang}"`));assert.doesNotMatch(html,/<text>/);
  const form=programmeEditorMarkup(lang,esc);
  assert.match(form,/<fieldset/);assert.match(form,/<legend>/);
  assert.match(form,/aria-describedby="event-programme-zone-help"/);
  assert.match(form,/event-programme-add" type="button"/);assert.match(form,/role="status"/);
});

test('programme validator preserves local clock times without inferring the visitor zone',()=>{
  const value=validateProgramme([session],'Europe/Kyiv','2099-05-10','2099-05-11');
  assert.deepEqual(value,{sessions:[session],timeZone:'Europe/Kyiv'});
  assert.equal(validateProgramme([session],'','2099-05-10','2099-05-11'),null);
  assert.equal(validateProgramme(null,'','2099-05-10','2099-05-11'),null);
  assert.equal(validateProgramme([session],'UTC','2099-05-11','2099-05-10'),null);
  assert.deepEqual(validateProgramme([],'','2099-05-10','2099-05-11'),{sessions:[],timeZone:''});
});

test('saving an event blocks duplicate submissions and focuses the persistent result after form replacement',async()=>{
  const oldFetch=globalThis.fetch,oldFormData=globalThis.FormData;
  const document={body:{},activeElement:null},button={setAttribute(){},removeAttribute(){}},feedback={textContent:''};
  const status={textContent:'',focus(){document.activeElement=this;}};
  const form={elements:{startsOn:{value:'2099-05-10'}},querySelector(selector){return {'button[type="submit"]':button,'.event-form-status':feedback}[selector]??null;}};
  const publicRoot={innerHTML:''};
  const privateRoot={set innerHTML(_html){if(document.activeElement===button)document.activeElement=document.body;}};
  const root={isConnected:true,innerHTML:'',ownerDocument:document,
    querySelector(selector){return {'.event-public':publicRoot,'.event-private':privateRoot,'.event-status':status,'.event-form':form}[selector]??null;},querySelectorAll(){return [];}};
  let release,posts=0;
  globalThis.FormData=class{get(){return '';}has(){return true;}};
  globalThis.fetch=async(url,options)=>{
    if(options?.method==='POST'){
      posts++;
      const body=JSON.parse(options.body);assert.deepEqual(body.programme,[]);assert.equal(body.timeZone,'');
      await new Promise(resolve=>{release=resolve;});return Response.json({ok:true});
    }
    return Response.json({items:url.includes('churches')?[{id:'church',name:'Community',status:'approved'}]:[],nextCursor:null});
  };
  try{
    await renderEventDirectory(root,'en',esc,{id:'alice',emailVerified:true,authProvider:'password'});
    document.activeElement=button;
    const pending=form.onsubmit({preventDefault(){}});
    await form.onsubmit({preventDefault(){}});assert.equal(posts,1);
    release();await pending;
    assert.equal(status.textContent,'The event was saved.');assert.equal(document.activeElement,status);
  }finally{globalThis.fetch=oldFetch;globalThis.FormData=oldFormData;}
});
