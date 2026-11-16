import test from 'node:test';
import assert from 'node:assert/strict';
import {mountEventMaterials} from '../public/event-materials.js';

const item={id:'reviewed',title:'Reviewed exercise',locale:'en',reference:'GEN 12',prompt:'Which choice?',options:['one','two'],provenance:'Original',reviewedAt:'2026-11-16',rights:{holder:'Author',basis:'original',licenseUrl:null}};
function fixture(){
  let current=true;
  const doc={activeElement:null,body:{}};
  const node=()=>({innerHTML:'',textContent:'',hidden:false,value:'',checked:false,setAttribute(){},removeAttribute(){},focus(){doc.activeElement=this;},querySelectorAll(){return [];}});
  const containers=[];
  function panel(manage){
    const open=node(),status=node(),list=node(),select=node(),preview=node(),consent=node(),more=node(),attach=node(),detach=node(),heading=node(),refresh=node(),find=node();
    const search={elements:{query:{value:''}},querySelector:()=>find};
    const nodes={'.event-materials-status':status,'.event-materials-list':list,'.event-materials-refresh':refresh,'.event-material-search':search,'.event-material-select':select,'.event-material-preview':preview,'.event-material-consent':consent,'.event-material-more':more,'.event-material-attach':attach,'h4':heading};
    const content={innerHTML:'',querySelector:selector=>nodes[selector]};
    detach.dataset={id:'reviewed'};
    list.querySelectorAll=selector=>selector==='.event-material-detach'&&list.innerHTML.includes('event-material-detach')?[detach]:[];
    const container={isConnected:true,dataset:{eventId:'event',manage:manage?'1':'0'},querySelector:selector=>selector==='.event-materials-open'?open:content};
    containers.push(container);
    return {open,status,list,select,preview,consent,more,attach,detach,search,container};
  }
  const manager=panel(true),reader=panel(false);
  const root={ownerDocument:doc,querySelectorAll:selector=>selector.includes('[data-manage="0"]')?[reader.container]:containers};
  mountEventMaterials(root,'en',String,()=>current);
  return {manager,reader,doc,expire(){current=false;}};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('event attachment needs consent and a confirmed receipt, rejects duplicate clicks and preserves focus',async()=>{
  const previous=globalThis.fetch,f=fixture();let writes=0,release;
  globalThis.fetch=async(_url,options)=>{
    const body=JSON.parse(options.body);
    if(body.action==='eventMaterials')return Response.json({items:[],unavailableIds:[]});
    if(body.action==='librarySearch')return Response.json({items:[item],nextCursor:null});
    writes++;await new Promise(resolve=>release=resolve);return Response.json({ok:writes>1});
  };
  try{
    const m=f.manager;await m.open.onclick();m.search.onsubmit({preventDefault(){}});await tick();
    m.select.value='reviewed';m.select.onchange();m.attach.onclick();assert.equal(writes,0);
    m.consent.checked=true;f.doc.activeElement=m.attach;m.attach.onclick();m.attach.onclick();assert.equal(writes,1);
    release();await tick();assert.match(m.status.textContent,/could not be completed/);
    m.attach.onclick();assert.equal(writes,2);release();await tick();
    assert.equal(m.status.textContent,'Material attached.');assert.equal(m.consent.checked,false);assert.equal(f.doc.activeElement,m.status);
    f.expire();m.attach.onclick();assert.equal(writes,2);
  }finally{globalThis.fetch=previous;}
});

test('detaching retires a pending public read so its old snapshot cannot reappear',async()=>{
  const previous=globalThis.fetch,f=fixture();let attached=true,release;
  globalThis.fetch=async(_url,options)=>{
    const body=JSON.parse(options.body);
    if(body.action==='detachEventMaterial'){attached=false;return Response.json({ok:true});}
    if(body.view==='public'){await new Promise(resolve=>release=resolve);return Response.json({items:[item]});}
    return Response.json({items:attached?[item]:[],unavailableIds:[]});
  };
  try{
    await f.manager.open.onclick();const pending=f.reader.open.onclick();await tick();
    await f.manager.detach.onclick();assert.equal(f.manager.status.textContent,'Material removed from the event page.');
    release();await pending;assert.equal(f.reader.list.innerHTML,'');
  }finally{globalThis.fetch=previous;}
});

test('late manager reads and searches do not render after the account or route changes',async()=>{
  const previous=globalThis.fetch,f=fixture();let release,calls=0;
  globalThis.fetch=async()=>{calls++;await new Promise(resolve=>release=resolve);return Response.json({items:[item],unavailableIds:[]});};
  try{
    const pending=f.manager.open.onclick();f.expire();release();await pending;
    assert.equal(f.manager.list.innerHTML,'');await f.manager.open.onclick();assert.equal(calls,1);
  }finally{globalThis.fetch=previous;}
});
