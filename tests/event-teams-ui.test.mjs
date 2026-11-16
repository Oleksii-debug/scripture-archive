import test from 'node:test';
import assert from 'node:assert/strict';
import {mountEventTeams,eventTeamControl} from '../public/event-teams.js';

function fixture(){
  let current=true;
  const doc={activeElement:null,body:{}};
  const node=()=>({innerHTML:'',textContent:'',value:'',checked:false,hidden:false,setAttribute(){},removeAttribute(){},focus(){doc.activeElement=this;}});
  const open=node(),status=node(),view=node(),select=node(),consent=node(),save=node(),clear=node(),more=node(),reload=node(),heading=node();
  const nodes={'.event-team-status':status,'.event-team-current':view,'.event-team-select':select,'.event-team-consent':consent,'.event-team-save':save,'.event-team-clear':clear,'.event-team-more':more,'.event-team-reload':reload,'h4':heading};
  const panel={innerHTML:'',querySelector:selector=>nodes[selector]};
  const container={isConnected:true,dataset:{eventId:'event',manage:'1'},querySelector:selector=>selector==='.event-team-open'?open:panel};
  const root={ownerDocument:doc,querySelectorAll:()=>[container]};
  mountEventTeams(root,'en',String,()=>current);
  return {doc,open,status,view,select,consent,save,clear,more,reload,expire(){current=false;}};
}

test('team selection requires fresh confirmation, uses observed revision and blocks duplicate or stale writes',async()=>{
  const previous=globalThis.fetch,f=fixture();let revision=null,writes=0,release;
  globalThis.fetch=async(url,options)=>{
    if(options){writes++;const body=JSON.parse(options.body);assert.equal(body.expectedRevision,null);assert.equal(body.confirm,true);await new Promise(resolve=>release=resolve);revision='new-revision';return Response.json({ok:true});}
    if(url.includes('options'))return Response.json({items:[{id:'team',name:'Private team'}],nextCursor:null});
    return Response.json({revision,team:revision?{id:'team',name:'Private team'}:null});
  };
  try{
    await f.open.onclick();f.select.value='team';await f.save.onclick();assert.equal(writes,0);
    f.consent.checked=true;f.doc.activeElement=f.save;const pending=f.save.onclick();await f.save.onclick();assert.equal(writes,1);
    release();await pending;assert.equal(f.status.textContent,'Team updated.');assert.match(f.view.innerHTML,/\/groups\/team/);
    assert.equal(f.consent.checked,false);assert.equal(f.doc.activeElement,f.status);
    f.expire();await f.save.onclick();assert.equal(writes,1);
  }finally{globalThis.fetch=previous;}
});

test('uncertain team writes require explicit reload and never announce successful connection',async()=>{
  const previous=globalThis.fetch,f=fixture();let writes=0;
  globalThis.fetch=async(url,options)=>{
    if(options){writes++;return Response.json({ok:'true'});}
    return url.includes('options')?Response.json({items:[{id:'team',name:'Private team'}],nextCursor:null}):Response.json({revision:null,team:null});
  };
  try{
    await f.open.onclick();f.select.value='team';f.consent.checked=true;await f.save.onclick();assert.match(f.status.textContent,/could not be completed/);
    await f.save.onclick();assert.equal(writes,1);
    await f.reload.onclick();assert.equal(f.consent.checked,false);
    f.select.value='team';f.consent.checked=true;await f.save.onclick();assert.equal(writes,2);
  }finally{globalThis.fetch=previous;}
});

test('private group picker preserves pages, selection and focus; stale account response is ignored',async()=>{
  const previous=globalThis.fetch,f=fixture();let release;
  globalThis.fetch=async url=>{
    if(!url.includes('options'))return Response.json({revision:null,team:null});
    if(!url.includes('after='))return Response.json({items:[{id:'first',name:'First private team'}],nextCursor:'first'});
    return Response.json({items:[{id:'second',name:'Second private team'}],nextCursor:null});
  };
  try{
    await f.open.onclick();f.select.value='first';f.doc.activeElement=f.more;f.more.onclick();await new Promise(resolve=>setImmediate(resolve));
    assert.match(f.select.innerHTML,/First private team/);assert.match(f.select.innerHTML,/Second private team/);assert.equal(f.select.value,'first');assert.equal(f.more.hidden,true);assert.equal(f.doc.activeElement,f.select);
    globalThis.fetch=async()=>{await new Promise(resolve=>release=resolve);return Response.json({revision:'new',team:{id:'secret',name:'Late private name'}});};
    const pending=f.reload.onclick();f.expire();release();await pending;assert.doesNotMatch(f.view.innerHTML,/Late private name/);
  }finally{globalThis.fetch=previous;}
});

test('team controls have localized native buttons and escape event identifiers',()=>{
  const esc=value=>String(value).replaceAll('"','&quot;').replaceAll('<','&lt;');
  for(const lang of ['uk','ru','en']){
    const html=eventTeamControl({id:'x"<script>'},lang,esc,true);assert.match(html,/type="button"/);assert.match(html,/x&quot;&lt;script>/);assert.doesNotMatch(html,/<script>/);
  }
});
