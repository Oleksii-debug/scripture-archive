import test from 'node:test';
import assert from 'node:assert/strict';
import {renderChurchDirectory} from '../public/church-directory.js';

const saved={id:'claim-1',name:'Grace Community',city:'Kyiv',countryCode:'UA',locale:'uk',tradition:'protestant',websiteUrl:'https://example.invalid/church',submittedAt:'2026-11-16 10:00:00',reviewedAt:null,status:'pending',reviewNote:''};
const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
function fixture(owner=false){
  let current=true,editButtons=[],withdrawButtons=[];
  const doc={body:{},activeElement:null};
  const node=()=>({value:'',checked:false,disabled:false,textContent:'',innerHTML:'',focus(){doc.activeElement=this;}});
  const fields=Object.fromEntries(['name','city','countryCode','locale','tradition','websiteUrl','represent','consent'].map(name=>[name,node()]));
  const submit=node(),feedback=node(),searchInput=node(),reviewApprove={...node(),dataset:{decision:'approve'}},reviewReject={...node(),dataset:{decision:'reject'}};
  const form={fields,querySelector(selector){if(selector==='button')return submit;const name=selector.match(/^\[name=(.*)\]$/)?.[1];return fields[name]??node();}};
  const review={fields:{evidence:{value:'Authority verified'},note:{value:'Please correct the city'}},dataset:{id:'claim-1'},querySelectorAll(){return [reviewApprove,reviewReject];}};
  const privateRoot={html:'',get innerHTML(){return this.html;},set innerHTML(html){this.html=html;editButtons=[];withdrawButtons=[];for(const [css,target] of [['church-claim-edit',editButtons],['church-claim-withdraw',withdrawButtons]])for(const match of html.matchAll(new RegExp(`class="button ${css}" data-id="([^"]+)"`,'g')))target.push({...node(),dataset:{id:match[1]}});}};
  const nodes={'.church-directory-search':{querySelector:()=>searchInput},'.church-directory-public':node(),'.church-directory-status':node(),'.church-directory-private':privateRoot,'.church-directory-owner':owner?node():null,'.church-claim':form,'.church-claim-feedback':feedback};
  const root={isConnected:true,innerHTML:'',ownerDocument:doc,querySelector:selector=>nodes[selector]??null,querySelectorAll(selector){
    if(selector==='.church-claim-edit')return editButtons;
    if(selector==='.church-claim-withdraw')return withdrawButtons;
    if(selector==='.church-claim-review')return owner?[review]:[];
    if(selector.includes(','))return [submit,...editButtons,...withdrawButtons,...(owner?[reviewApprove,reviewReject]:[])];
    return [];
  }};
  return {root,fields,submit,feedback,form,doc,privateRoot,reviewApprove,reviewReject,get edit(){return editButtons[0];},get withdraw(){return withdrawButtons[0];},expire(){current=false;},render:()=>renderChurchDirectory(root,'en',esc,{id:'alice',emailVerified:true},owner,()=>current)};
}
class FixtureFormData {
  constructor(form){this.fields=form.fields;}
  get(name){return this.fields[name]?.value??null;}
  has(name){return this.fields[name]?.checked===true;}
}
async function runFixture(callback,owner=false){
  const previousFetch=globalThis.fetch,previousForm=globalThis.FormData;
  globalThis.FormData=FixtureFormData;
  const f=fixture(owner);let claim={...saved},writes=[];
  const network=async(url,options)=>{
    if(options){const body=JSON.parse(options.body);writes.push(body);if(body.action==='submit')claim={...claim,...body,id:'claim-2',status:'pending'};if(body.action==='withdraw')claim={...claim,status:'withdrawn'};return Response.json({ok:true});}
    if(url.includes('view=mine'))return Response.json({items:[claim]});
    if(url.includes('view=queue'))return Response.json({items:[]});
    return Response.json({items:[],nextCursor:null});
  };
  globalThis.fetch=network;
  try{await f.render();await callback(f,writes,network);}finally{globalThis.fetch=previousFetch;globalThis.FormData=previousForm;}
}

test('claim corrections restore saved fields, require fresh consent and permit another edit after success',()=>runFixture(async(f,writes)=>{
  f.fields.represent.checked=true;f.fields.consent.checked=true;f.edit.onclick();
  for(const name of ['name','city','countryCode','locale','tradition','websiteUrl'])assert.equal(f.fields[name].value,saved[name]);
  assert.equal(f.fields.represent.checked,false);assert.equal(f.fields.consent.checked,false);assert.equal(f.doc.activeElement,f.fields.name);
  assert.match(f.feedback.textContent,/confirm authority and consent again/);
  f.fields.city.value='Lviv';f.fields.represent.checked=true;f.fields.consent.checked=true;f.doc.activeElement=f.submit;
  await f.form.onsubmit({preventDefault(){}});
  assert.equal(writes.length,1);assert.equal(writes[0].city,'Lviv');assert.equal(writes[0].websiteConsent,true);
  assert.equal(f.submit.disabled,false);assert.equal(f.fields.consent.checked,false);assert.equal(f.fields.represent.checked,false);
  assert.equal(f.doc.activeElement,f.feedback);assert.equal(f.feedback.textContent,'The claim was sent for verification.');
  assert.equal(f.edit.dataset.id,'claim-2');f.edit.onclick();assert.equal(f.fields.city.value,'Lviv');
  f.fields.city.value='Odesa';f.fields.represent.checked=true;f.fields.consent.checked=true;
  await f.form.onsubmit({preventDefault(){}});assert.equal(writes.length,2);assert.equal(writes[1].city,'Odesa');
}));

test('claim mutations are single flight and withdrawal leaves a persistent focused confirmation',()=>runFixture(async(f,writes,network)=>{
  let release;
  globalThis.fetch=async(url,options)=>{if(options)await new Promise(resolve=>release=resolve);return network(url,options);};
  const button=f.withdraw;f.doc.activeElement=button;const pending=button.onclick();
  await button.onclick();await f.form.onsubmit({preventDefault(){}});f.edit.onclick();
  assert.equal(f.submit.disabled,true);release();await pending;
  assert.equal(writes.length,1);assert.equal(writes[0].action,'withdraw');assert.equal(f.withdraw,undefined);
  assert.equal(f.feedback.textContent,'The claim was withdrawn.');assert.equal(f.doc.activeElement,f.feedback);assert.equal(f.submit.disabled,false);
}));

test('a non-confirming response is never announced as saved and controls recover',()=>runFixture(async(f,writes,network)=>{
  globalThis.fetch=(url,options)=>options?Promise.resolve(Response.json({ok:'true'})):network(url,options);
  f.fields.consent.checked=true;f.doc.activeElement=f.submit;
  await f.form.onsubmit({preventDefault(){}});
  assert.match(f.feedback.textContent,/could not be completed/);assert.equal(f.submit.disabled,false);assert.equal(f.fields.consent.checked,true);
  assert.equal(f.doc.activeElement,f.feedback);
}));

test('a confirmed mutation with a failed private refresh reports saved state without a false rollback',()=>runFixture(async(f,_writes,network)=>{
  globalThis.fetch=(url,options)=>!options&&url.includes('view=mine')?Promise.resolve(Response.json({error:'unavailable'},{status:503})):network(url,options);
  await f.withdraw.onclick();assert.match(f.feedback.textContent,/change was saved, but the list could not be refreshed/);
  assert.match(f.privateRoot.innerHTML,/role="alert"/);assert.equal(f.edit,undefined);assert.equal(f.submit.disabled,false);
}));

test('moderation protects repeated decisions, preserves deliberate focus moves and ignores an expired account',()=>runFixture(async(f,writes,network)=>{
  let release;
  globalThis.fetch=async(url,options)=>{if(options)await new Promise(resolve=>release=resolve);return network(url,options);};
  f.doc.activeElement=f.reviewApprove;const pending=f.reviewApprove.onclick();await f.reviewReject.onclick();
  f.doc.activeElement=f.fields.city;release();await pending;
  assert.equal(writes.length,1);assert.equal(writes[0].decision,'approve');assert.equal(f.doc.activeElement,f.fields.city);
  assert.equal(f.feedback.textContent,'The decision was saved.');
  const late=f.reviewApprove.onclick();f.expire();release();await late;assert.equal(f.feedback.textContent,'');
},true));
