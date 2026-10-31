import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {routeSourceFromLocation} from '../public/route-location.js';
import {renderWorkspace,retirePrivateWorkspaceOnPageHide,resumePrivateWorkspaceAfterSession} from '../public/workspace.js';

// Execute the canonical browser lifecycle from app.js so these checks fail if
// /campaigns is ever removed from the shared private BFCache barrier.
const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const begin=source.indexOf('let editorialPrivateNeedsReauthorization=false;');
const end=source.indexOf('Promise.all([getCMS(), getSession().catch(() => null)]).finally(',begin);
assert.ok(begin>0&&end>begin,'shared private browser lifecycle must remain present');
const lifecycle='let editorViewEpoch=4;\n'+source.slice(begin,end)+
  '\n({needs:()=>editorialPrivateNeedsReauthorization})';
const tick=()=>new Promise(resolve=>setImmediate(resolve));

function deferred(){
  let resolve,reject;
  const promise=new Promise((ok,fail)=>{resolve=ok;reject=fail;});
  return {promise,resolve,reject};
}

function browserFixture({mounted=true,reauth=()=>Promise.resolve({user:{id:'alice'}})}={}){
  const handlers=new Map(),events={clear:0,retire:0,resume:0,auth:0,route:0};
  let visible=mounted;
  const main={
    querySelector(selector){
      return selector==='.builder-layout, .editor-grid, .progress-stat, .resume-card, .account-dashboard, .profile-card, .auth-grid, .auth-card, .academy-reading'&&visible?{}:null;
    },
    replaceChildren(){visible=false;events.clear++;},
  };
  const location={pathname:'/campaigns',search:'',hash:''};
  const controller=vm.runInNewContext(lifecycle,{
    window:{addEventListener:(type,callback)=>handlers.set(type,callback)},
    main,location,routeSourceFromLocation,
    retirePrivateWorkspaceOnPageHide:()=>events.retire++,
    resumePrivateWorkspaceAfterSession:()=>events.resume++,
    getSession:()=>{events.auth++;return reauth();},
    route:()=>{events.route++;return Promise.resolve();},
  });
  return {controller,events,pagehide:()=>handlers.get('pagehide')(),pageshow:()=>handlers.get('pageshow')()};
}

test('Academy account markers are cleared before a BFCache snapshot',()=>{
  const f=browserFixture();
  f.pagehide();
  assert.equal(f.events.clear,1);
  assert.equal(f.events.retire,1);
  assert.equal(f.controller.needs(),true);
});

test('an in-flight Academy route without mounted DOM still requires current session authority',async()=>{
  const gate=deferred(),f=browserFixture({mounted:false,reauth:()=>gate.promise});
  f.pagehide();
  assert.equal(f.events.clear,1);
  f.pageshow();
  assert.equal(f.events.auth,1);
  assert.equal(f.events.route,0);
  gate.resolve({user:{id:'bob'}});
  await tick();
  assert.equal(f.events.resume,1);
  assert.equal(f.events.route,1);
});

const workspaceContext=shell=>({
  state:{user:{id:'alice'},lang:'en',sessionUnavailable:false},
  t:value=>value,esc:String,shell,setActiveNav(){},
});

test('late Academy source responses cannot repaint prior-account markers after pagehide',async()=>{
  const mission=deferred(),catalog=deferred(),drawn=[];
  const previousLocation=globalThis.location;
  globalThis.location={pathname:'/campaigns',search:'',hash:''};
  resumePrivateWorkspaceAfterSession();
  try{
    const c=workspaceContext(html=>drawn.push(html));
    c.getMission=()=>mission.promise;
    c.getCatalog=()=>catalog.promise;
    const running=renderWorkspace('campaigns',c);
    retirePrivateWorkspaceOnPageHide();
    mission.resolve({title:{en:'Private course'}});
    catalog.resolve({books:{uk:[],ru:[],en:[]}});
    await running;
    assert.deepEqual(drawn,[]);
  }finally{
    resumePrivateWorkspaceAfterSession();
    if(previousLocation===undefined)delete globalThis.location;
    else globalThis.location=previousLocation;
  }
});

test('hidden Academy route starts no mission or catalogue reads',async()=>{
  const previousLocation=globalThis.location;
  globalThis.location={pathname:'/campaigns',search:'',hash:''};
  let calls=0;
  retirePrivateWorkspaceOnPageHide();
  try{
    const c=workspaceContext(()=>{throw Error('Academy rendered while hidden');});
    c.getMission=()=>{calls++;throw Error('mission read while hidden');};
    c.getCatalog=()=>{calls++;throw Error('catalogue read while hidden');};
    await renderWorkspace('campaigns',c);
    assert.equal(calls,0);
  }finally{
    resumePrivateWorkspaceAfterSession();
    if(previousLocation===undefined)delete globalThis.location;
    else globalThis.location=previousLocation;
  }
});
