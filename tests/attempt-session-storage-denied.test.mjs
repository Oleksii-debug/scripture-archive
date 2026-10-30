import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
function excerpt(start, end) {
  const a=source.indexOf(start), b=source.indexOf(end,a);
  assert.ok(a>=0 && b>a, "canonical assessment source anchor missing");
  return source.slice(a,b);
}
const helpers=excerpt("function rememberActiveAttempt(", "async function getSession() {");
const confirmHandler=excerpt(
  "document.querySelector('#confirm-attempt')?.addEventListener('click', async event => {",
  '\n  document.querySelector("#uk-spelling")'
);

function fixture({ denyRead=false, denyWrite=false, denyRemove=false, saved=null,
  untrusted=false }={}) {
  const stored=new Map(saved===null?[]:[["sa.activeAttempt",saved]]);
  const calls=[], navigations=[], analytics=[], broadcasts=[];
  const state={activeAttempt:null,localReadingStorageUntrusted:untrusted,mission:"old",currentReader:{} ,lang:"uk"};
  const storage={
    getItem(key){calls.push(["get",key]);if(denyRead)throw Error("SecurityError");return stored.get(key)||null;},
    setItem(key,value){calls.push(["set",key]);if(denyWrite)throw Error("SecurityError");stored.set(key,value);},
    removeItem(key){calls.push(["remove",key]);if(denyRemove)throw Error("SecurityError");stored.delete(key);},
  };
  const trigger={isConnected:true};
  const status={textContent:""};
  const dialog={closed:false,close(){this.closed=true;}};
  const listeners={};
  const document={querySelector(selector){
    if(selector==="#confirm-attempt")return {...trigger,addEventListener(name,fn){listeners[name]=fn;}};
    if(selector==="#attempt-state")return status;
    if(selector==="#attempt-dialog")return dialog;
    return null;
  }};
  // The real page reuses the same DOM button identity across both lookups.
  const button={addEventListener(name,fn){listeners[name]=fn;}};
  document.querySelector=selector=>{
    if(selector==="#confirm-attempt")return button;
    if(selector==="#attempt-state")return status;
    if(selector==="#attempt-dialog")return dialog;
    return null;
  };
  let count=0, stillCurrent=true;
  const ctx=vm.createContext({
    state,sessionStorage:storage,document,
    readerStillCurrent:()=>stillCurrent,
    attemptRequest:async()=>{count++;return {attemptId:"server-accepted-42"};},
    meta:{code:"GEN"},chapter:12,groupId:"",
    attemptChannel:{postMessage:message=>broadcasts.push(message)},
    window:{saAnalytics:{track:(...values)=>analytics.push(values)}},
    navigateTo:(path,replace)=>navigations.push([path,replace]),
    attemptCopy:{readRequired:"read first"},
    t:key=>key,
  });
  vm.runInContext(helpers+"\n"+confirmHandler,ctx);
  return {ctx,state,stored,calls,navigations,analytics,broadcasts,status,dialog,
    click:()=>listeners.click({preventDefault(){},currentTarget:button}),
    count:()=>count,setCurrent:value=>{stillCurrent=value;}};
}

test("accepted assessment starts and navigates despite sessionStorage SecurityError", async () => {
  const f=fixture({denyWrite:true});
  await f.click();
  assert.equal(f.count(),1,"must not re-POST an accepted attempt");
  assert.equal(f.state.activeAttempt.attemptId,"server-accepted-42");
  assert.deepEqual(f.navigations,[["/mission/attempt/server-accepted-42",true]]);
  assert.equal(f.dialog.closed,true);
  assert.equal(f.ctx.activeAttemptId(),"server-accepted-42");
  assert.equal(f.status.textContent,"");
});

test("normal session storage retains the canonical server-issued attempt id", async () => {
  const f=fixture();
  await f.click();
  assert.equal(f.stored.get("sa.activeAttempt"),"server-accepted-42");
  assert.equal(f.state.activeAttempt.attemptId,"server-accepted-42");
});

test("an obsolete reader or changed account never publishes a late attempt", async () => {
  const f=fixture({denyWrite:true});
  f.setCurrent(false);
  await f.click();
  assert.equal(f.count(),0);
  assert.equal(f.navigations.length,0);
  assert.equal(f.state.activeAttempt,null);
});

test("denied sessionStorage read uses the current tab's accepted server attempt", () => {
  const f=fixture({denyRead:true,denyWrite:true});
  f.ctx.rememberActiveAttempt({attemptId:"tab-attempt"});
  assert.equal(f.ctx.activeAttemptId(),"tab-attempt");
});

test("stale stored session attempt is not resumed when account cache is untrusted", () => {
  const f=fixture({saved:"old-user-attempt",untrusted:true});
  assert.equal(f.ctx.activeAttemptId(),null);
  assert.equal(f.state.activeAttempt,null);
});

test("a trusted stored attempt may still be recovered after page reload", () => {
  const f=fixture({saved:"same-user-attempt"});
  assert.equal(f.ctx.activeAttemptId(),"same-user-attempt");
  assert.equal(f.ctx.activeAttemptId(),"same-user-attempt");
});

test("completed attempt cleanup works even with blocked storage; mismatched ids are retained", () => {
  const f=fixture({denyRead:true,denyRemove:true});
  f.ctx.rememberActiveAttempt({attemptId:"active-1"});
  f.ctx.forgetActiveAttemptIf("other-attempt");
  assert.equal(f.ctx.activeAttemptId(),"active-1");
  assert.doesNotThrow(()=>f.ctx.forgetActiveAttemptIf("active-1"));
  assert.equal(f.ctx.activeAttemptId(),null);
  assert.ok(f.calls.some(([action])=>action==="remove"));
});

test("reader, mission and account transitions use the single guarded attempt authority", () => {
  assert.match(source,/function clearPersonalProgress\(\)\s*\{[\s\S]*?forgetActiveAttempt\(\)/);
  assert.match(excerpt("async function renderMissions() {","\nasync function groupRequest("),/activeAttemptId\(\)/);
  assert.match(excerpt("async function renderMission(parts = []) {","\nasync function accountRequest("),/activeAttemptId\(\)/);
  assert.match(excerpt("async function renderReader(", "\nasync function renderMissions()"),/forgetActiveAttempt\(\)/);
  assert.doesNotMatch(excerpt("async function renderMission(parts = []) {","\nasync function accountRequest("),/sessionStorage\.(getItem|removeItem)/);
});
