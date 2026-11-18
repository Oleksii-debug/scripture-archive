import test from 'node:test';
import assert from 'node:assert/strict';
import {renderEventDirectory} from '../public/event-directory.js';
const item={id:'event-1',churchId:'church',churchName:'Grace Community',title:'Bible reading day',summary:'A community reading programme.',city:'Kyiv',countryCode:'UA',locale:'en',startsOn:'2099-05-10',endsOn:'2099-05-11',accessibilityDetails:'Captions and step-free access.',programmeUrl:null,registrationUrl:null,programme:[],timeZone:'',status:'active',createdAt:'2026-11-18 00:00:00',updatedAt:'2026-11-18 00:00:00',registrationEnabled:false};
const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
function fixture(){
  const doc={body:{},activeElement:null};let current=true,form=null,buttons=[],edits=[];
  const node=()=>({value:'',checked:false,textContent:'',innerHTML:'',disabled:false,attributes:{},focus(){doc.activeElement=this;},setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];}});
  const status=node(),feedback=node(),publicRoot=node(),searchInput=node(),search={querySelector:()=>searchInput};
  const privateRoot={html:'',get innerHTML(){return this.html;},set innerHTML(html){
    const old=[...buttons,...edits,...(form?[form.submit,...Object.values(form.elements)]:[])];
    if(old.includes(doc.activeElement))doc.activeElement=doc.body;
    this.html=html;buttons=[];edits=[];form=null;
    if(html.includes('class="event-form"')){
      const elements=Object.fromEntries(['id','title','summary','city','countryCode','locale','startsOn','endsOn','accessibilityDetails','programmeUrl','registrationUrl','authority','consent','registrationEnabled'].map(name=>[name,node()]));
      for(const [name,field] of Object.entries(elements))field.value=item[name]??'';
      elements.id.value='';elements.authority.checked=true;elements.consent.checked=true;
      const submit=node(),localFeedback=node();
      form={elements,submit,localFeedback,querySelector:s=>({'button[type="submit"]':submit,'.event-form-status':localFeedback})[s]??null};
    }
    for(const [css,target] of [['event-withdraw',buttons],['event-edit',edits]])for(const match of html.matchAll(new RegExp(`class="button ${css}" data-id="([^"]+)"`,'g')))target.push({...node(),dataset:{id:match[1]}});
  }};
  const root={isConnected:true,innerHTML:'',ownerDocument:doc,querySelector(s){return {'.event-form':form,'.event-public':publicRoot,'.event-private':privateRoot,'.event-status':status,'.event-action-status':feedback,'.event-search':search}[s]??null;},querySelectorAll(s){if(s==='.event-withdraw')return buttons;if(s==='.event-edit')return edits;if(s.includes(','))return [...(form?[form.submit]:[]),...buttons,...edits];return [];}};
  return {root,doc,status,feedback,privateRoot,publicRoot,searchInput,get form(){return form;},get withdraw(){return buttons[0];},get edit(){return edits[0];},expire(){current=false;},render:()=>renderEventDirectory(root,'en',esc,{id:'alice',emailVerified:true},()=>current)};
}
async function run(callback){
  const oldFetch=globalThis.fetch,oldForm=globalThis.FormData,f=fixture(),writes=[],reads=[];let events=[{...item}];
  globalThis.FormData=class{constructor(form){this.form=form;}get(name){return this.form.elements[name]?.value??'';}has(name){return this.form.elements[name]?.checked===true;}};
  const network=async(url,options)=>{
    if(options){const body=JSON.parse(options.body);writes.push(body);if(body.action==='withdraw')events=events.map(event=>({...event,status:'withdrawn'}));return Response.json(body.action==='submit'?{ok:true,id:body.id||'new-event'}:{ok:true});}
    reads.push(url);
    if(url==='/api/churches?view=mine')return Response.json({items:[{id:'church',name:'Grace Community',status:'approved'}]});
    if(url==='/api/events?view=mine')return Response.json({items:events});
    if(url.startsWith('/api/events?'))return Response.json({items:events.filter(event=>event.status==='active'),nextCursor:null});
    return Response.json({items:[]});
  };
  globalThis.fetch=network;
  try{await f.render();await callback(f,writes,reads,network);}finally{globalThis.fetch=oldFetch;globalThis.FormData=oldForm;}
}
const submit=form=>form.onsubmit({preventDefault(){}});

test('event save refuses absent, malformed or mismatched receipts without clearing the draft',()=>run(async(f,writes,reads,network)=>{
  f.form.elements.id.value='event-1';f.form.elements.title.value='Draft correction';const form=f.form,initialReads=reads.length;
  for(const body of [{},{ok:false},{ok:'true'},{ok:true},{ok:true,id:3},{ok:true,id:'different-event'}]){
    globalThis.fetch=async(url,options)=>options?Response.json(body):network(url,options);
    f.doc.activeElement=form.submit;await submit(form);
    assert.equal(f.form,form);assert.equal(form.elements.title.value,'Draft correction');assert.equal(reads.length,initialReads);
    assert.match(f.feedback.textContent,/could not be completed/);assert.equal(f.doc.activeElement,f.feedback);
    assert.equal(form.submit.attributes['aria-disabled'],undefined);
  }
  globalThis.fetch=network;f.doc.activeElement=form.submit;await submit(form);
  assert.equal(writes.length,1);assert.equal(writes[0].id,'event-1');assert.notEqual(f.form,form);
  assert.equal(f.feedback.textContent,'The event was saved.');assert.equal(f.doc.activeElement,f.feedback);
}));

test('withdrawal and saving share one mutation lock and retain keyboard focus through replacement',()=>run(async(f,writes,reads,network)=>{
  const button=f.withdraw,form=f.form,edit=f.edit;let release;
  globalThis.fetch=async(url,options)=>{if(options)await new Promise(resolve=>release=resolve);return network(url,options);};
  f.doc.activeElement=button;const pending=button.onclick();
  assert.equal(button.disabled,false);assert.equal(button.attributes['aria-disabled'],'true');
  await button.onclick();await submit(form);edit.onclick();assert.equal(form.elements.id.value,'');
  release();await pending;
  assert.deepEqual(writes,[{action:'withdraw',id:'event-1'}]);assert.equal(f.withdraw,undefined);
  assert.equal(f.feedback.textContent,'The event was withdrawn.');assert.equal(f.doc.activeElement,f.feedback);
  assert.equal(button.attributes['aria-disabled'],undefined);
}));

test('unconfirmed withdrawal retains its button and supports a genuine retry',()=>run(async(f,writes,reads,network)=>{
  const button=f.withdraw;
  globalThis.fetch=async(url,options)=>options?Response.json({ok:false}):network(url,options);
  f.doc.activeElement=button;await button.onclick();assert.equal(f.withdraw,button);assert.equal(button.attributes['aria-disabled'],undefined);
  assert.doesNotMatch(f.feedback.textContent,/was withdrawn/);
  globalThis.fetch=network;f.doc.activeElement=button;await button.onclick();assert.equal(writes.length,1);assert.equal(f.withdraw,undefined);
}));

test('an acknowledged change with a failed refresh reports the saved change separately from the unavailable list',()=>run(async(f,writes,reads,network)=>{
  let wrote=false;
  globalThis.fetch=async(url,options)=>{if(options){wrote=true;return network(url,options);}if(wrote&&url==='/api/events?view=mine')return Response.json({error:'offline'},{status:503});return network(url,options);};
  f.doc.activeElement=f.withdraw;await f.withdraw.onclick();
  assert.equal(writes.length,1);assert.match(f.feedback.textContent,/change was saved, but the lists could not be refreshed/);
  assert.match(f.privateRoot.innerHTML,/role="alert"/);assert.equal(f.doc.activeElement,f.feedback);
}));

test('a late event response cannot restore private data after leaving the workspace',()=>run(async(f,writes,reads,network)=>{
  let release;globalThis.fetch=async(url,options)=>{if(options)await new Promise(resolve=>release=resolve);return network(url,options);};
  const pending=f.withdraw.onclick();const before=reads.length;f.expire();f.privateRoot.innerHTML='Different route';f.feedback.textContent='Unrelated message';
  release();await pending;assert.equal(reads.length,before);assert.equal(f.privateRoot.innerHTML,'Different route');assert.equal(f.feedback.textContent,'Unrelated message');
}));

test('event completion never steals focus that moved to search while the write was pending',()=>run(async(f,writes,reads,network)=>{
  let release;globalThis.fetch=async(url,options)=>{if(options)await new Promise(resolve=>release=resolve);return network(url,options);};
  f.doc.activeElement=f.withdraw;const pending=f.withdraw.onclick();f.doc.activeElement=f.searchInput;release();await pending;
  assert.equal(f.doc.activeElement,f.searchInput);assert.equal(f.feedback.textContent,'The event was withdrawn.');
}));
