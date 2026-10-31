import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {routeSourceFromLocation} from '../public/route-location.js';
import {renderWorkspace,retirePrivateWorkspaceOnPageHide,resumePrivateWorkspaceAfterSession} from '../public/workspace.js';

const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const begin=source.indexOf('let editorialPrivateNeedsReauthorization=false;');
const end=source.indexOf('Promise.all([getCMS(), getSession().catch(() => null)]).finally(',begin);
assert.ok(begin>0&&end>begin,'canonical app browser lifecycle must remain present');
const actualHandlers='let editorViewEpoch=5;\n'+source.slice(begin,end)+
  '\n({epoch:()=>editorViewEpoch,needs:()=>editorialPrivateNeedsReauthorization})';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function deferred(){
  let resolve,reject;
  const promise=new Promise((ok,fail)=>{resolve=ok;reject=fail;});
  return {promise,resolve,reject};
}
function lifecycleFixture({path='/builder',mounted=true,request=()=>Promise.resolve({id:'alice'})}={}){
  const handlers=new Map(),events={clear:0,auth:0,route:0,retire:0,resume:0};
  let visible=mounted;
  const main={
    querySelector(selector){
      if(selector==='.builder-layout, .editor-grid, .progress-stat, .resume-card, .account-dashboard, .profile-card, .auth-grid, .auth-card')return visible?{}:null;
      return null;
    },
    replaceChildren(){visible=false;events.clear++;},
  };
  const location={pathname:path,hash:'',search:''};
  const controller=vm.runInNewContext(actualHandlers,{
    window:{addEventListener:(type,callback)=>handlers.set(type,callback)},
    main,location,routeSourceFromLocation,
    retirePrivateWorkspaceOnPageHide:()=>events.retire++,
    resumePrivateWorkspaceAfterSession:()=>events.resume++,
    getSession:()=>{events.auth++;return request();},
    route:()=>{events.route++;return Promise.resolve();},
  });
  return {handlers,events,controller,main,location,pagehide:()=>handlers.get('pagehide')(),
    pageshow:()=>handlers.get('pageshow')()};
}

test('profile with private email and consent controls clears on pagehide',()=>{
  const f=lifecycleFixture({path:'/account',mounted:true});
  f.pagehide();
  assert.equal(f.events.clear,1);
  assert.equal(f.controller.epoch(),6);
  assert.equal(f.controller.needs(),true);
});
test('unmounted sign-in route gets a new authoritative session after BFCache restore',async()=>{
  const f=lifecycleFixture({path:'/account',mounted:false});
  f.pagehide();f.pageshow();
  await tick();
  assert.equal(f.events.clear,1);
  assert.equal(f.events.auth,1);
  assert.equal(f.events.route,1);
});
test('retained password form or account dashboard after leaving route cannot survive pagehide',()=>{
  const f=lifecycleFixture({path:'/privacy',mounted:true});
  f.pagehide();
  assert.equal(f.events.clear,1);
  assert.equal(f.events.retire,1);
});
test('account session re-read holds route re-entry until server accepts or fails',async()=>{
  const read=deferred(),f=lifecycleFixture({path:'/account',request:()=>read.promise});
  f.pagehide();f.pageshow();
  assert.equal(f.events.auth,1);
  assert.equal(f.events.route,0);
  read.resolve({id:'new-session'});
  await tick();
  assert.equal(f.events.route,1);
});
test('an old account refresh cannot navigate after the user leaves again',async()=>{
  const first=deferred(),f=lifecycleFixture({path:'/account',request:()=>first.promise});
  f.pagehide();f.pageshow();f.pagehide();
  first.resolve({id:'retired-session'});
  await tick();
  assert.equal(f.events.route,0);
  assert.equal(f.controller.needs(),true);
});
test('canonical renderAccount refuses private re-entry on pagehide and pending reauthorization',()=>{
  const start=source.indexOf('function renderAccount() {');
  const end=source.indexOf('\nlet editorViewEpoch = 0;',start);
  assert.ok(start>0&&end>start);
  const actual=source.slice(start,end);
  for(const [hidden,awaiting] of [[true,false],[false,true]]){
    const events=[];
    const api=vm.runInNewContext(actual+'\nrenderAccount', {
      editorialPageHidden:hidden,editorialAwaitingSession:awaiting,
      setActiveNav:()=>events.push('nav'),
      state:{lang:'uk'},location:{search:''}
    });
    assert.equal(api(),undefined);
    assert.deepEqual(events,[],'hidden account renders neither navigation nor private HTML');
  }
});

test('editor account listing clears synchronously on pagehide and invalidates old owner render',()=>{
  const f=lifecycleFixture({path:'/editor'});
  f.pagehide();
  assert.equal(f.events.clear,1);
  assert.equal(f.events.retire,1);
  assert.equal(f.controller.epoch(),6);
  assert.equal(f.controller.needs(),true);
});
test('builder private author drafts and review queue are retired on pagehide',()=>{
  const f=lifecycleFixture();
  f.pagehide();
  assert.equal(f.events.clear,1);
  assert.equal(f.events.retire,1);
});
test('pending builder navigation is fenced even if private DOM is not mounted yet',()=>{
  const f=lifecycleFixture({mounted:false});
  f.pagehide();
  assert.equal(f.events.clear,1);
  assert.equal(f.events.retire,1);
  assert.equal(f.controller.epoch(),6);
});
test('abandoned session refresh cannot re-enter private editor after another pagehide',async()=>{
  const pending=deferred();
  const f=lifecycleFixture({path:'/editor',request:()=>pending.promise});
  f.pagehide();f.pageshow();
  f.pagehide();
  pending.resolve({id:'old'});
  await tick();
  assert.equal(f.events.route,0);
  assert.equal(f.controller.needs(),true);
});
test('second page restore supersedes the first pending authentication result',async()=>{
  const old=deferred(),newer=deferred();
  let n=0;
  const f=lifecycleFixture({path:'/builder',request:()=>++n===1?old.promise:newer.promise});
  f.pagehide();f.pageshow();f.pagehide();f.pageshow();
  newer.resolve({id:'new'});
  await tick();
  assert.equal(f.events.route,1);
  old.resolve({id:'old'});
  await tick();
  assert.equal(f.events.route,1);
});
test('private editorial page only navigates after an authoritative session refresh',async()=>{
  const pending=deferred(),f=lifecycleFixture({path:'/editor',request:()=>pending.promise});
  f.pagehide();
  f.pageshow();
  assert.equal(f.events.auth,1);
  assert.equal(f.events.route,0);
  pending.resolve({id:'alice'});
  await tick();
  assert.equal(f.events.route,1);
  assert.equal(f.controller.needs(),false);
});
test('session outage on private restore routes to canonical fail-closed sign-in',async()=>{
  const f=lifecycleFixture({request:()=>Promise.reject(Error('account_unavailable'))});
  f.pagehide();f.pageshow();await tick();
  assert.equal(f.events.auth,1);
  assert.equal(f.events.route,1);
});
test('duplicate pageshow events never trigger two independent editorial GETs',async()=>{
  const f=lifecycleFixture();
  f.pageshow();
  assert.equal(f.events.auth,0);
  f.pagehide();f.pageshow();f.pageshow();await tick();
  assert.equal(f.events.auth,1);
  assert.equal(f.events.route,1);
});
test('a cached private editor DOM is retired even after the route moved elsewhere',()=>{
  const f=lifecycleFixture({path:'/account',mounted:true});
  f.pagehide();
  assert.equal(f.events.clear,1);
  assert.equal(f.events.retire,1);
});
test('unrelated public page does not wipe public content or force session read',async()=>{
  const f=lifecycleFixture({path:'/home',mounted:false});
  f.pagehide();f.pageshow();await tick();
  assert.equal(f.events.clear,0);
  assert.equal(f.events.retire,0);
  assert.equal(f.events.auth,0);
  assert.equal(f.controller.epoch(),5);
});

function withFakeNetwork(requests,fn,pathname='/builder'){
  const previousFetch=globalThis.fetch,previousLocation=globalThis.location;
  globalThis.fetch=()=>requests.shift()?.promise??Promise.reject(Error('unexpected request'));
  globalThis.location={pathname,hash:'',search:''};
  resumePrivateWorkspaceAfterSession();
  return Promise.resolve().then(fn).finally(()=>{
    resumePrivateWorkspaceAfterSession();
    globalThis.fetch=previousFetch;
    if(previousLocation===undefined)delete globalThis.location;
    else globalThis.location=previousLocation;
  });
}
const context=shell=>({
  state:{user:{id:'alice'},lang:'en',sessionUnavailable:false},
  t:x=>x,esc:String,shell,setActiveNav(){},
});

test('personal progress DOM is retired before browser saves a BFCache snapshot',()=>{
  const f=lifecycleFixture({path:'/progress',mounted:true});
  f.pagehide();
  assert.equal(f.events.clear,1);
  assert.equal(f.events.retire,1);
  assert.equal(f.controller.needs(),true);
});
test('unmounted in-flight progress route is also reauthenticated after pageshow',async()=>{
  const f=lifecycleFixture({path:'/progress',mounted:false});
  f.pagehide();f.pageshow();await tick();
  assert.equal(f.events.clear,1);
  assert.equal(f.events.auth,1);
  assert.equal(f.events.route,1);
});
test('private progress attempt-history response cannot repaint after pagehide',async()=>{
  const history=deferred(),drawn=[];
  await withFakeNetwork([history],async()=>{
    const c=context(html=>drawn.push(html));
    c.getMission=async()=>({taskCount:5,title:{en:'Abraham'}});
    const running=renderWorkspace('progress',c);
    await tick();
    retirePrivateWorkspaceOnPageHide();
    history.resolve({ok:true,json:async()=>({items:[{id:'PRIVATE_ATTEMPT'}]})});
    await running;
    assert.deepEqual(drawn,[]);
  },'/progress');
});
test('hidden personal history route does not begin any mission or account request',async()=>{
  let calls=0;
  await withFakeNetwork([],async()=>{
    retirePrivateWorkspaceOnPageHide();
    const c=context(()=>{throw Error('personal history rendered while hidden')});
    c.getMission=()=>{calls++;throw Error('mission call while hidden')};
    await renderWorkspace('progress',c);
    assert.equal(calls,0);
  },'/progress');
});

test('retirement rejects a late editor-role GET before private builder shell renders',async()=>{
  const role=deferred(),drawn=[];
  await withFakeNetwork([role],async()=>{
    const running=renderWorkspace('builder',context(html=>drawn.push(html)));
    retirePrivateWorkspaceOnPageHide();
    role.resolve({ok:true,json:async()=>({editor:true,owner:true})});
    await running;
    assert.deepEqual(drawn,[]);
  });
});
test('retirement rejects a late private material/queue read after verified editor role',async()=>{
  const materials=deferred(),drawn=[];
  await withFakeNetwork([
    {promise:Promise.resolve({ok:true,json:async()=>({editor:false,owner:false})})},
    materials,
    {promise:Promise.resolve({ok:true,json:async()=>({items:[]})})},
  ],async()=>{
    const running=renderWorkspace('builder',context(html=>drawn.push(html)));
    // Allow the role GET to settle and the material GET to begin.
    await tick();
    retirePrivateWorkspaceOnPageHide();
    materials.resolve({ok:true,json:async()=>({materials:[]})});
    await running;
    assert.deepEqual(drawn,[]);
  });
});
