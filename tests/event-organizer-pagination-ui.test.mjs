import test from 'node:test';
import assert from 'node:assert/strict';
import {renderEventDirectory} from '../public/event-directory.js';
const event={churchId:'church',churchName:'Grace Community',title:'Reading conference',summary:'Community reading programme.',city:'Kyiv',countryCode:'UA',locale:'en',startsOn:'2099-05-10',endsOn:'2099-05-11',accessibilityDetails:'Captions and step-free access.',programmeUrl:null,registrationUrl:null,programme:[],timeZone:'',status:'hidden',createdAt:'2026-11-18 00:00:00',updatedAt:'2026-11-18 00:00:00',registrationEnabled:false};
const items=Array.from({length:230},(_,i)=>({...event,id:`event-${String(i).padStart(3,'0')}`}));
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(){
  const doc={body:{},activeElement:null},user={id:'alice',emailVerified:true};let current=true,form=null,buttons=[],edits=[];
  const node=()=>({value:'',checked:false,textContent:'',innerHTML:'',disabled:false,hidden:true,attributes:{},focus(){doc.activeElement=this;},setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];}});
  const more=node(),status=node(),feedback=node(),publicRoot=node(),searchInput=node(),search={querySelector:()=>searchInput},headings=new Map();
  function capture(html){
    for(const [css,target] of [['event-withdraw',buttons],['event-edit',edits]])for(const match of html.matchAll(new RegExp(`class="button ${css}" data-id="([^"]+)"`,'g')))target.push({...node(),dataset:{id:match[1]}});
    for(const match of html.matchAll(/<h2 id="(event-mine-page-\d+)"/g))headings.set('#'+match[1],node());
  }
  const continuation={innerHTML:'',querySelector:s=>headings.get(s),insertAdjacentHTML(_,html){this.innerHTML+=html;capture(html);}};
  const privateRoot={html:'',get innerHTML(){return this.html;},set innerHTML(html){
    if([...buttons,...edits,...(form?[form.submit,...Object.values(form.elements)]:[])].includes(doc.activeElement))doc.activeElement=doc.body;
    this.html=html;buttons=[];edits=[];form=null;
    if(html.includes('class="event-form"')){
      const elements=Object.fromEntries(['id','title','summary','city','countryCode','locale','startsOn','endsOn','accessibilityDetails','programmeUrl','registrationUrl','authority','consent','registrationEnabled'].map(name=>[name,node()]));
      const submit=node(),localFeedback=node(),zone=node();
      form={elements,submit,zone,querySelector:s=>({'button[type="submit"]':submit,'.event-form-status':localFeedback,'[name="timeZone"]':zone})[s]??null};
    }
    capture(html);
  }};
  const root={isConnected:true,innerHTML:'',ownerDocument:doc,querySelector(s){return {'.event-form':form,'.event-public':publicRoot,'.event-private':privateRoot,'.event-status':node(),'.event-action-status':feedback,'.event-search':search,'.event-mine-more':more,'.event-mine-status':status,'.event-mine-continuation':continuation}[s]??null;},querySelectorAll(s){if(s==='.event-withdraw')return buttons;if(s==='.event-edit')return edits;if(s.includes(','))return [...(form?[form.submit]:[]),...buttons,...edits];return [];}};
  return {root,doc,user,more,status,feedback,privateRoot,continuation,headings,searchInput,get form(){return form;},get withdraw(){return buttons[0];},get edits(){return edits;},expire(){current=false;},render:()=>renderEventDirectory(root,'en',String,user,()=>current)};
}
async function run(callback){
  const original=globalThis.fetch,f=fixture(),reads=[],writes=[];
  const network=async(url,options)=>{
    if(options){writes.push(JSON.parse(options.body));return Response.json({ok:true});}
    if(url==='/api/churches?view=mine')return Response.json({items:[{id:'church',name:'Grace Community',status:'approved'}]});
    const p=new URL(url,'https://local.invalid').searchParams;
    if(url.startsWith('/api/events?')&&p.get('view')==='mine'){
      reads.push(url);const after=p.get('afterId'),start=after?items.findIndex(item=>item.id===after)+1:0,rows=items.slice(start,start+50),last=rows.at(-1);
      return Response.json({items:rows,nextCursor:start+50<items.length?{startsOn:last.startsOn,id:last.id}:null});
    }
    return Response.json({items:[],nextCursor:null});
  };
  globalThis.fetch=network;try{await f.render();await callback(f,reads,writes,network);}finally{globalThis.fetch=original;}
}

test('organizer traverses all 230 events while preserving draft, consent, programme zone and native focus',()=>run(async(f,reads)=>{
  const form=f.form;form.elements.title.value='Unfinished draft';form.elements.authority.checked=true;form.zone.value='Europe/Kyiv';
  for(let page=2;page<=5;page++){
    assert.equal(f.more.hidden,false);f.doc.activeElement=f.more;const pending=f.more.onclick();f.more.onclick();
    assert.equal(f.more.disabled,false);assert.equal(f.more.attributes['aria-disabled'],'true');await pending;
    assert.equal(f.doc.activeElement,f.headings.get('#event-mine-page-'+page));
    assert.equal(f.form,form);assert.equal(form.elements.title.value,'Unfinished draft');assert.equal(form.elements.authority.checked,true);assert.equal(form.zone.value,'Europe/Kyiv');
  }
  assert.equal(reads.length,5);assert.equal(f.edits.length,230);assert.equal(f.more.hidden,true);assert.equal(f.more.attributes['aria-disabled'],undefined);
  f.edits.at(-1).onclick();assert.equal(form.elements.id.value,'event-229');assert.equal(form.elements.title.value,event.title);
  assert.equal(form.elements.authority.checked,false);assert.equal(f.doc.activeElement,form.elements.title);
}));

test('private pagination error preserves existing records and the same draft, then retries the same cursor',()=>run(async(f,reads,writes,network)=>{
  const form=f.form;form.elements.title.value='Do not erase';const before=f.privateRoot.innerHTML;let fail=true;
  globalThis.fetch=async(url,options)=>url.includes('afterId=')&&fail?Response.json({error:'offline'},{status:503}):network(url,options);
  f.doc.activeElement=f.more;await f.more.onclick();assert.equal(f.privateRoot.innerHTML,before);assert.equal(f.form,form);assert.equal(form.elements.title.value,'Do not erase');
  assert.equal(f.more.hidden,false);assert.equal(f.doc.activeElement,f.more);assert.match(f.status.textContent,/could not be completed/);
  fail=false;await f.more.onclick();assert.equal(f.edits.length,100);assert.match(reads.at(-1),/afterId=event-049/);
}));

test('private pagination rejects malformed payloads and repeated cursors without appending or clearing draft',()=>run(async(f,reads,writes,network)=>{
  const form=f.form,good=await (await network('/api/events?view=mine&afterId=event-049')).json();
  for(const data of [{items:[{}]}, {...good,nextCursor:{startsOn:'2099-02-30',id:'bad'}}, {...good,nextCursor:{startsOn:event.startsOn,id:'event-049'}}, {...good,items:items.slice(0,51)}, {...good,nextCursor:{startsOn:event.startsOn,id:'not-last'}}]){
    globalThis.fetch=async url=>url.includes('afterId=')?Response.json(data):network(url);
    await f.more.onclick();assert.equal(f.edits.length,50);assert.equal(f.form,form);assert.equal(f.continuation.innerHTML,'');assert.match(f.status.textContent,/could not be completed/);
  }
  globalThis.fetch=network;await f.more.onclick();assert.equal(f.edits.length,100);
}));

test('late private page cannot restore records after route departure or account switch',async()=>{
  for(const accountSwitch of [false,true])await run(async(f,reads,writes,network)=>{
    let release;globalThis.fetch=async(url,options)=>{if(url.includes('afterId='))await new Promise(resolve=>release=resolve);return network(url,options);};
    const pending=f.more.onclick();if(accountSwitch)f.user.id='bob';else f.expire();f.continuation.innerHTML='New workspace';
    release();await pending;assert.equal(f.continuation.innerHTML,'New workspace');assert.equal(f.edits.length,50);
  });
});

test('mutation invalidates an in-flight private page and blocks further paging without stealing moved focus',()=>run(async(f,reads,writes,network)=>{
  let releasePage,releaseWrite;
  globalThis.fetch=async(url,options)=>{
    if(url.includes('afterId='))await new Promise(resolve=>releasePage=resolve);
    if(options)await new Promise(resolve=>releaseWrite=resolve);
    return network(url,options);
  };
  f.doc.activeElement=f.more;const page=f.more.onclick();const button=f.withdraw;f.doc.activeElement=button;
  const mutation=button.onclick();assert.equal(f.more.onclick(),undefined);
  f.doc.activeElement=f.searchInput;releaseWrite();await mutation;releasePage();await page;
  assert.equal(writes.length,1);assert.equal(f.edits.length,50);assert.equal(f.continuation.innerHTML,'');assert.equal(f.more.hidden,false);
  assert.equal(f.doc.activeElement,f.searchInput);assert.equal(f.more.attributes['aria-disabled'],undefined);
}));

test('private page completion does not steal focus moved into the organizer draft',()=>run(async(f,reads,writes,network)=>{
  let release;globalThis.fetch=async(url,options)=>{if(url.includes('afterId='))await new Promise(resolve=>release=resolve);return network(url,options);};
  f.doc.activeElement=f.more;const pending=f.more.onclick();f.form.elements.title.focus();release();await pending;
  assert.equal(f.doc.activeElement,f.form.elements.title);assert.equal(f.edits.length,100);
}));
