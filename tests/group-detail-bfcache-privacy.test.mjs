import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// Execute the real group controller and window lifecycle handlers from app.js,
// not a copy of their authorization and browser-cache behavior.
const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const groupStart=source.indexOf('let groupDetailViewEpoch=0,groupDetailNeedsReauthorization=false;');
const groupEnd=source.indexOf('\nfunction renderAttemptResult(',groupStart);
const listenerStart=source.indexOf('// Group owners can see invite codes and a private management roster.');
const listenerEnd=source.indexOf('Promise.all([getCMS(), getSession().catch(() => null)]).finally(',listenerStart);
assert.ok(groupStart>0&&groupEnd>groupStart&&listenerStart>groupEnd&&listenerEnd>listenerStart);
const production=source.slice(groupStart,groupEnd)+'\n'+source.slice(listenerStart,listenerEnd)+
  '\n({renderGroup,getEpoch:()=>groupDetailViewEpoch,needsReauthorization:()=>groupDetailNeedsReauthorization})';

function deferred(){
  let resolve,reject;
  const promise=new Promise((ok,fail)=>{resolve=ok;reject=fail;});
  return {promise,resolve,reject};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture({routePath='groups/g1',detailPresent=true,getGroup=async()=>({group:{id:'g1'}}),getCatalog=async()=>({books:{en:[]}}),reauth=async()=>({})}={}){
  const handlers=new Map(),events={renders:[],auth:0,route:0,cleared:0};
  const detail={
    html:'PRIVATE_INVITATION_AND_MANAGEMENT_ROSTER',
    replaceChildren(){this.html='';events.cleared++;},
  };
  const main={querySelector:selector=>selector==='.group-detail'&&detailPresent?detail:null};
  const location={pathname:'/'+routePath,hash:''};
  const state={user:{id:'alice'},lang:'en',sessionUnavailable:false};
  const controller=vm.runInNewContext(production,{
    window:{addEventListener:(name,callback)=>handlers.set(name,callback)},
    main,location,state,
    routeSourceFromLocation:()=>location.pathname.replace(/^\/+/,''),
    getSession:()=>{events.auth++;return reauth();},
    route:()=>{events.route++;return Promise.resolve();},
    groupPageCurrent:()=>true,
    groupRequest:(...args)=>getGroup(...args),
    getCatalog,setActiveNav(){},esc:value=>String(value),bookTitle:book=>book.title??book.code,
  });
  return {controller,handlers,events,detail,location,main,state,
    pagehide(){handlers.get('pagehide')();},
    pageshow(){handlers.get('pageshow')();},
  };
}

test('pagehide synchronously retires visible private invitation and management DOM',async()=>{
  const f=fixture();
  assert.match(f.detail.html,/PRIVATE_INVITATION/);
  f.pagehide();
  assert.equal(f.detail.html,'');
  assert.equal(f.events.cleared,1);
  assert.equal(f.controller.getEpoch(),1);
  assert.equal(f.controller.needsReauthorization(),true);
});

test('page restore waits for canonical account reauthorization before routing',async()=>{
  const gate=deferred();
  const f=fixture({reauth:()=>gate.promise});
  f.pagehide();f.pageshow();
  assert.equal(f.events.auth,1);
  assert.equal(f.events.route,0);
  gate.resolve({user:{id:'alice'}});
  await tick();
  assert.equal(f.events.route,1);
  assert.equal(f.detail.html,'');
});

test('repeated pageshow does not duplicate session reads or re-render',async()=>{
  const f=fixture();
  f.pageshow();
  assert.equal(f.events.auth,0);
  f.pagehide();
  f.pageshow();f.pageshow();
  await tick();
  assert.equal(f.events.auth,1);
  assert.equal(f.events.route,1);
});

test('pagehide invalidates group GET started before navigation',async()=>{
  const pending=deferred();
  const f=fixture({getGroup:()=>pending.promise});
  const rendering=f.controller.renderGroup('g1');
  f.pagehide();
  pending.resolve({group:{id:'g1'}});
  await rendering;
  assert.deepEqual(f.events.renders,[]);
  assert.equal(f.controller.getEpoch(),1);
  assert.equal(f.detail.html,'');
});

test('pagehide invalidates in-flight catalog processing before private shell render',async()=>{
  const pending=deferred(),started=deferred();
  const f=fixture({getCatalog:()=>{started.resolve();return pending.promise;}});
  const rendering=f.controller.renderGroup('g1');
  await started.promise;
  f.pagehide();
  pending.resolve({books:{en:[{code:'GEN',title:'Genesis'}]}});
  await rendering;
  assert.equal(f.controller.getEpoch(),1);
  assert.equal(f.detail.html,'');
});

test('group route awaiting a fetch still advances the epoch when no detail DOM exists',async()=>{
  const f=fixture({detailPresent:false,routePath:'groups/g1'});
  f.pagehide();
  assert.equal(f.controller.getEpoch(),1);
  assert.equal(f.controller.needsReauthorization(),true);
  f.pageshow();
  await tick();
  assert.equal(f.events.auth,1);
});

test('a former group DOM is cleared even if the URL already changed to account',async()=>{
  const f=fixture({routePath:'account'});
  f.pagehide();
  assert.equal(f.detail.html,'');
  assert.equal(f.controller.getEpoch(),1);
});

test('unrelated public page does not restart session or change its content',async()=>{
  const f=fixture({routePath:'home',detailPresent:false});
  f.pagehide();f.pageshow();
  await tick();
  assert.equal(f.controller.getEpoch(),0);
  assert.equal(f.events.auth,0);
  assert.equal(f.events.cleared,0);
});

test('failed server identity refresh still routes into canonical fail-closed error UI',async()=>{
  const f=fixture({reauth:()=>Promise.reject(Error('account_unavailable'))});
  f.pagehide();f.pageshow();
  await tick();
  assert.equal(f.events.auth,1);
  assert.equal(f.events.route,1);
  assert.equal(f.detail.html,'');
});


test('second pagehide cancels late first-session restore and requires a new authorized read',async()=>{
  const first=deferred(),second=deferred();let requests=0;
  const f=fixture({reauth:()=>++requests===1?first.promise:second.promise});
  f.pagehide();f.pageshow();
  assert.equal(f.events.auth,1);
  f.pagehide();
  first.resolve({user:{id:'alice'}});
  await tick();
  assert.equal(f.events.route,0,'hidden BFCache must not reenter router after stale auth');
  assert.equal(f.controller.needsReauthorization(),true);
  f.pageshow();
  assert.equal(f.events.auth,2);
  first.resolve({user:{id:'alice'}});
  await tick();
  assert.equal(f.events.route,0);
  second.resolve({user:{id:'alice'}});
  await tick();
  assert.equal(f.events.route,1,'only the newest visible authorized restore routes');
});

test('group route stays inert while page is hidden or reauthorization pending',async()=>{
  const reauthorization=deferred();let groupReads=0;
  const f=fixture({
    reauth:()=>reauthorization.promise,
    getGroup:async()=>{groupReads++;return {group:{id:'g1'}};},
  });
  f.pagehide();
  await f.controller.renderGroup('g1');
  assert.equal(groupReads,0,'hidden page must not fetch private details');
  f.pageshow();
  await f.controller.renderGroup('g1');
  assert.equal(groupReads,0,'cached principal must not bypass pending server identity');
  reauthorization.resolve({user:{id:'alice'}});
  await tick();
  assert.equal(f.events.route,1);
});

test('late session refresh after leaving the group for a public route remains retired',async()=>{
  const reauthorization=deferred();
  const f=fixture({reauth:()=>reauthorization.promise});
  f.pagehide();f.pageshow();
  f.location.pathname='/home';
  f.pagehide();
  reauthorization.resolve({user:{id:'alice'}});
  await tick();
  assert.equal(f.events.route,0,'public route pagehide still invalidates group re-entry');
});
