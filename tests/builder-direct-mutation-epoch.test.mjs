import test from 'node:test';
import assert from 'node:assert/strict';
import { renderWorkspace } from '../public/workspace.js';

const answer = data => ({ok:true,json:async()=>data});
function deferred() {
  let resolve;
  const promise = new Promise(done => {resolve=done;});
  return {promise,resolve};
}
function fixture() {
  const prior={fetch:globalThis.fetch,location:globalThis.location,
    document:globalThis.document,FormData:globalThis.FormData,window:globalThis.window};
  const state={lang:'en',user:{id:'alice'},sessionUnavailable:false}, shells=[], announcements=[];
  const form={isConnected:true}, remove={dataset:{delete:'owned'},isConnected:true,disabled:false};
  const status={textContent:''};
  globalThis.location={pathname:'/builder',search:'',hash:''};
  const main={isConnected:true,querySelectorAll:()=>[]};
  globalThis.document={
    querySelector:key=>({'main':main,'#material-form':form,'#material-status':status,
      '#new-material':{},'#public-materials':{isConnected:false}}[key]||null),
    querySelectorAll:key=>key==='[data-delete]'?[remove]:[],
  };
  globalThis.window={confirm:()=>true};
  globalThis.FormData=class {
    *[Symbol.iterator]() {
      yield ['title','My study']; yield ['prompt','Question'];
      yield ['reference','GEN 1']; yield ['options','Yes\nNo'];
      yield ['answer','Yes']; yield ['explanation','Source'];
    }
  };
  let roleReads=0, writes=0;
  const pendingRole=deferred(), roleStarted=deferred();
  globalThis.fetch=async(url,options={})=>{
    if(url==='/api/editor-roles?view=me') {
      roleReads++;
      if(roleReads===2){roleStarted.resolve();return pendingRole.promise;}
      return answer({editor:false,owner:false});
    }
    if(url==='/api/materials?mine=1')return answer({materials:[
      {id:'owned',title:'My study',visibility:'private',data:{reference:'GEN 1'}}]});
    if(url==='/api/material-review?view=mine'||url==='/api/material-review?view=public')
      return answer({items:[]});
    if(url.startsWith('/api/materials')&&['POST','DELETE'].includes(options.method)){
      writes++;
      return answer({acknowledged:true});
    }
    throw Error('unexpected builder API '+url);
  };
  const ctx={state,t:key=>key,esc:String,shell:value=>shells.push(value),
    setActiveNav(){},announce:value=>announcements.push(value)};
  return {state,ctx,form,remove,status,shells,announcements,roleStarted,pendingRole,
    writes:()=>writes,roleReads:()=>roleReads,
    restore(){
      for(const [name,value] of Object.entries(prior)){
        if(value===undefined)delete globalThis[name];else globalThis[name]=value;
      }
    }};
}
for(const operation of ['save','delete']){
  test('SA-EXT-03 stale '+operation+' refresh cannot announce after later same-principal view',async()=>{
    const f=fixture();
    try{
      await renderWorkspace('builder',f.ctx);
      const action=operation==='save'
        ? f.form.onsubmit({preventDefault(){},currentTarget:f.form})
        : f.remove.onclick();
      await f.roleStarted.promise;
      // Same authenticated user and URL but newer render supersedes the builder.
      await renderWorkspace('live',f.ctx);
      f.pendingRole.resolve(answer({editor:false,owner:false}));
      await action;
      assert.deepEqual(f.announcements,[]);
      assert.equal(f.writes(),1);
      assert.equal(f.roleReads(),2);
    }finally{f.restore();}
  });
}
for(const operation of ['save','delete']){
  test('SA-EXT-03 detached '+operation+' control cannot issue a mutation',async()=>{
    const f=fixture();
    try{
      await renderWorkspace('builder',f.ctx);
      if(operation==='save') {
        f.form.isConnected=false;
        await f.form.onsubmit({preventDefault(){},currentTarget:f.form});
      }else{
        f.remove.isConnected=false;
        await f.remove.onclick();
      }
      assert.equal(f.writes(),0);
      assert.deepEqual(f.announcements,[]);
    }finally{f.restore();}
  });
}
