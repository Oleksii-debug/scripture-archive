import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
function excerpt(first, next) {
  const a = source.indexOf(first), b = source.indexOf(next, a);
  assert.ok(a >= 0 && b > a, "canonical account/progress source must exist");
  return source.slice(a, b);
}
const sourceUnderTest = [
  excerpt("function rememberActiveAttempt(", "async function getSession() {"),
  excerpt("async function getSession() {", "\nasync function getBook("),
  excerpt("async function syncProgress() {", "\nfunction clearPersonalProgress() {"),
  excerpt("function clearPersonalProgress() {", "\nfunction field("),
].join("\n");

function fixture({ user = { id: "alice" }, prior = null, marker = null,
                   denyRead = false, denyFirstReadingRead = false, denyOwnerMarkerRead = false,
                   denyFirstMissionRead = false, denyMissionArchiveWrites = false,
                   denyWrites = false, denyDelete = false,
                   silentlyIgnoreReadingWrites = false, silentlyIgnoreMissionWrites = false,
                   serverReading = [], oldReading = [] } = {}) {
  const initial = [
    ["sa.progressOwner", marker],
    ["sa.readingHistory", JSON.stringify(oldReading)],
    ["sa.mission.OTAB01", JSON.stringify({ index: 3, correct: [1], complete: false })],
  ].filter(([,v]) => v !== null);
  const entries = new Map(initial);
  const storageCalls = [], apiCalls = [];
  let firstReadingReadDenied = false;
  let firstMissionReadDenied = false;
  const storage = {
    getItem(key) {
      storageCalls.push(["get", key]);
      if (denyRead || (denyOwnerMarkerRead && key === "sa.progressOwner")) throw Error("SecurityError");
      if (denyFirstReadingRead && key === "sa.readingHistory" && !firstReadingReadDenied) {
        firstReadingReadDenied = true;
        throw Error("SecurityError");
      }
      if (denyFirstMissionRead && key === "sa.mission.OTAB01" && !firstMissionReadDenied) {
        firstMissionReadDenied = true;
        throw Error("SecurityError");
      }
      return entries.has(key) ? entries.get(key) : null;
    },
    setItem(key, value) {
      storageCalls.push(["set", key]);
      if (denyWrites || (denyMissionArchiveWrites && key === "sa.unownedMissionProgress.v1")) throw Error("QuotaExceededError");
      if (silentlyIgnoreReadingWrites && key === "sa.readingHistory") return;
      if (silentlyIgnoreMissionWrites && key === "sa.mission.OTAB01") return;
      entries.set(key, value);
    },
    removeItem(key) {
      storageCalls.push(["remove", key]);
      if (denyDelete) throw Error("SecurityError");
      entries.delete(key);
    },
  };
  const state = {
    user: prior && { id: prior },
    sessionUnavailable: false,
    progressSyncStatus: null,
    localReadingStorageUntrusted: false,
    missionProgress: { index: 3, correct: [1], complete: false },
  };
  const ctx = vm.createContext({
    state, localStorage: storage,
    sessionStorage: { removeItem() {} },
    fetch: async () => ({ ok: true, json: async () => ({user}) }),
    accountRequest: async (action, method, payload) => {
      apiCalls.push([action,method,payload]);
      if (action === "reading" && method === undefined) return {reading:serverReading};
      if (action === "progress") return {progress:{index:2,correct:[0],complete:false}};
      return {ok:true};
    },
    loadJSON: (key, fallback) => {
      try { return JSON.parse(storage.getItem(key)) || fallback; }
      catch { return fallback; }
    },
  });
  vm.runInContext(sourceUnderTest, ctx);
  return {ctx,state,entries,storageCalls,apiCalls,
    session: () => ctx.getSession(), sync: () => ctx.syncProgress(),
    clear: () => ctx.clearPersonalProgress()};
}

test("valid server account session survives a localStorage SecurityError", async () => {
  const f=fixture({user:{id:"alice"},denyRead:true,denyWrites:true,denyDelete:true});
  const identity=await f.session();
  assert.equal(identity.id,"alice");
  assert.equal(f.state.user.id,"alice");
  assert.equal(f.state.sessionUnavailable,false);
  assert.equal(f.state.localReadingStorageUntrusted,true);
  assert.equal(f.state.missionProgress.index,0);
});

test("principal switch clears both in-memory and stored personal history", async () => {
  const f=fixture({user:{id:"bob"},prior:"alice",marker:"alice",
    oldReading:[{book:"GEN",chapter:12}]});
  await f.session();
  assert.equal(f.state.user.id,"bob");
  assert.equal(f.state.missionProgress.index,0);
  assert.equal(f.entries.get("sa.readingHistory"),"[]");
  assert.equal(f.entries.get("sa.progressOwner"),"bob");
  assert.equal(f.state.localReadingStorageUntrusted,false);
});

test("failed identity cache cleanup never uploads another account's reading", async () => {
  const f=fixture({user:{id:"bob"},prior:"alice",marker:"alice",
    denyWrites:true,denyDelete:true,
    oldReading:[{book:"GEN",chapter:12}]});
  await f.session();
  assert.equal(f.state.localReadingStorageUntrusted,true);
  await f.sync();
  assert.equal(f.apiCalls.some(([action,method])=>action==="reading"&&method==="PUT"),false);
  // A denied persistence write must not publish an unsaved progress snapshot.
  assert.equal(f.state.missionProgress.index,0);
  assert.equal(f.state.progressSyncStatus,"unavailable");
  assert.deepEqual(JSON.parse(f.entries.get("sa.readingHistory")),[{book:"GEN",chapter:12}]);
});

test("untrusted browser cache cannot contaminate a valid server reading", async () => {
  const f=fixture({user:{id:"bob"},marker:"alice",denyWrites:true,
    oldReading:[{book:"EXO",chapter:5}],serverReading:[{book:"GEN",chapter:1}]});
  await f.session();
  await f.sync();
  const put=f.apiCalls.find(([action,method])=>action==="reading"&&method==="PUT");
  assert.ok(put,"server-owned data should still be safely handled");
  assert.deepEqual(JSON.parse(JSON.stringify(put[2].reading)),[{book:"GEN",chapter:1}]);
});

test("an unchanged principal keeps its local progress and normal sync", async () => {
  const f=fixture({user:{id:"alice"},prior:"alice",marker:"alice",
    oldReading:[{book:"GEN",chapter:12}]});
  await f.session();
  assert.equal(f.state.missionProgress.index,3);
  assert.equal(f.state.localReadingStorageUntrusted,false);
  await f.sync();
  const put=f.apiCalls.find(([action,method])=>action==="reading"&&method==="PUT");
  assert.ok(put);
  assert.deepEqual(JSON.parse(JSON.stringify(put[2].reading)),[{book:"GEN",chapter:12}]);
});

test("logout and account deletion cleanup do not throw on denied storage", () => {
  const f=fixture({prior:"alice",marker:"alice",denyRead:true,denyWrites:true,denyDelete:true});
  f.state.user=null;
  assert.doesNotThrow(()=>f.clear());
  assert.equal(f.state.missionProgress.index,0);
  assert.equal(f.state.localReadingStorageUntrusted,true);
  assert.ok(f.storageCalls.filter(([action])=>action==="set").length>=2);
  assert.equal(f.storageCalls.some(([action])=>action==="remove"),false,
    "never discard owner marker when prior private cache writes were denied");
});

test("a failed server account read is still unavailable, not a fabricated login", async () => {
  const f=fixture({prior:"alice",marker:"alice"});
  f.ctx.fetch=async()=>({ok:false,status:503,json:async()=>({user:null})});
  await assert.rejects(f.session(),/account_unavailable/);
  assert.equal(f.state.user,null);
  assert.equal(f.state.sessionUnavailable,true);
  assert.equal(f.state.missionProgress.index,3);
});

test("failed marker reads invalidate private in-memory data even for a changed identity", async () => {
  const f=fixture({user:{id:"bob"},prior:"alice",marker:"alice",denyRead:true});
  await f.session();
  assert.equal(f.state.user.id,"bob");
  assert.equal(f.state.missionProgress.index,0);
  assert.equal(f.entries.get("sa.progressOwner"),"alice",
    "unreadable owner and reading must never certify a new owner");
  assert.equal(f.state.localReadingStorageUntrusted,true);
  assert.equal(f.state.unownedReadingPendingRecovery,true);
  await f.sync();
  assert.equal(f.apiCalls.length,0);
});

test("marker persistence failure also forbids reuse of local history", async () => {
  const f=fixture({user:{id:"alice"},prior:"alice",marker:"alice",
    denyWrites:true,oldReading:[{book:"GEN",chapter:2}]});
  await f.session();
  assert.equal(f.state.localReadingStorageUntrusted,true);
  await f.sync();
  assert.equal(f.apiCalls.some(([action,method])=>action==="reading"&&method==="PUT"),false);
});

test("denied cleanup never reassigns surviving private history to the new owner", async () => {
  const f=fixture({user:{id:"bob"},prior:"alice",marker:"alice",
    denyWrites:true,denyDelete:false,oldReading:[{book:"GEN",chapter:12}]});
  await f.session();
  assert.equal(f.entries.get("sa.progressOwner"),"alice",
    "old owner marker must survive while old private history survives");
  assert.equal(f.state.localReadingStorageUntrusted,true);
  assert.equal(f.storageCalls.some(([action,key])=>action==="remove"&&key==="sa.progressOwner"),false);
  await f.sync();
  assert.equal(f.apiCalls.some(([action,method])=>action==="reading"&&method==="PUT"),false);
});

test("recovered storage cannot relabel a previously untrusted same-user cache", async () => {
  const f=fixture({user:{id:"alice"},prior:"alice",marker:"alice",
    oldReading:[{book:"EXO",chapter:5}]});
  f.state.localReadingStorageUntrusted=true;
  await f.session();
  assert.equal(f.entries.get("sa.readingHistory"),"[]");
  assert.equal(f.entries.get("sa.progressOwner"),"alice");
  assert.equal(f.state.localReadingStorageUntrusted,false);
});


test("missing owner marker quarantines previous reading before another user can sync", async () => {
  const oldReading=[{book:"GEN",chapter:12,title:"private legacy history"}];
  const f=fixture({user:{id:"bob"},marker:null,oldReading});
  await f.session();
  assert.equal(f.entries.get("sa.unownedReadingHistory.v1"),JSON.stringify(oldReading));
  assert.equal(f.entries.get("sa.readingHistory"),"[]");
  assert.equal(f.entries.get("sa.progressOwner"),"bob");
  assert.equal(f.state.missionProgress.index,0);
  await f.sync();
  assert.equal(f.apiCalls.some(([action,method])=>action==="reading"&&method==="PUT"),false);
});

test("unowned data is preserved verbatim even if prior reading JSON is malformed", async () => {
  const f=fixture({user:{id:"bob"},marker:null});
  f.entries.set("sa.readingHistory",'{"incomplete":');
  await f.session();
  assert.equal(f.entries.get("sa.unownedReadingHistory.v1"),'{"incomplete":');
  assert.equal(f.entries.get("sa.readingHistory"),"[]");
  assert.equal(f.entries.get("sa.progressOwner"),"bob");
});

test("conflicting existing unowned archive cannot be overwritten or reattributed", async () => {
  const old=[{book:"EXO",chapter:2}];
  const saved='[{"book":"GEN","chapter":1}]';
  const f=fixture({user:{id:"bob"},marker:null,oldReading:old});
  f.entries.set("sa.unownedReadingHistory.v1",saved);
  await f.session();
  assert.equal(f.entries.get("sa.unownedReadingHistory.v1"),saved);
  assert.equal(f.entries.get("sa.readingHistory"),JSON.stringify(old));
  assert.equal(f.entries.has("sa.progressOwner"),false);
  assert.equal(f.state.unownedReadingPendingRecovery,true);
  assert.equal(f.state.missionProgress.index,0);
  await f.sync();
  assert.equal(f.apiCalls.length,0,"blocked identity must not read/put private progress");
});

test("quota denial leaves legacy history and ownership marker untouched", async () => {
  const old=[{book:"GEN",chapter:12}];
  const f=fixture({user:{id:"bob"},marker:null,oldReading:old,denyWrites:true});
  await f.session();
  assert.equal(f.entries.get("sa.readingHistory"),JSON.stringify(old));
  assert.equal(f.entries.has("sa.progressOwner"),false);
  assert.equal(f.state.localReadingStorageUntrusted,true);
  assert.equal(f.state.unownedReadingPendingRecovery,true);
  await f.sync();
  assert.equal(f.apiCalls.length,0);
});

test("same immutable unowned archive is idempotent on another authenticated refresh", async () => {
  const old=[{book:"GEN",chapter:12}];
  const f=fixture({user:{id:"bob"},marker:null,oldReading:old});
  f.entries.set("sa.unownedReadingHistory.v1",JSON.stringify(old));
  await f.session();
  assert.equal(f.entries.get("sa.unownedReadingHistory.v1"),JSON.stringify(old));
  assert.equal(f.entries.get("sa.readingHistory"),"[]");
  assert.equal(f.entries.get("sa.progressOwner"),"bob");
  assert.equal(f.state.unownedReadingPendingRecovery,false);
});

test("unresolved orphan remains isolated after a simulated fresh page load", async () => {
  const old=[{book:"EXO",chapter:4}];
  for(let reload=0;reload<2;reload++){
    const f=fixture({user:{id:"new-user"},marker:null,oldReading:old});
    f.entries.set("sa.unownedReadingHistory.v1",'[{"book":"GEN","chapter":1}]');
    await f.session();
    await f.sync();
    assert.equal(f.entries.has("sa.progressOwner"),false);
    assert.equal(f.entries.get("sa.readingHistory"),JSON.stringify(old));
    assert.equal(f.apiCalls.length,0);
    assert.equal(f.state.unownedReadingPendingRecovery,true);
  }
});

test("after removing conflicting archive the next refresh safely retains orphan and recovers", async () => {
  const old=[{book:"EXO",chapter:4}];
  const f=fixture({user:{id:"bob"},marker:null,oldReading:old});
  f.entries.set("sa.unownedReadingHistory.v1",'[{"book":"GEN","chapter":1}]');
  await f.session();
  assert.equal(f.state.unownedReadingPendingRecovery,true);
  f.entries.delete("sa.unownedReadingHistory.v1");
  await f.session();
  assert.equal(f.state.unownedReadingPendingRecovery,false);
  assert.equal(f.entries.get("sa.unownedReadingHistory.v1"),JSON.stringify(old));
  assert.equal(f.entries.get("sa.readingHistory"),"[]");
  assert.equal(f.entries.get("sa.progressOwner"),"bob");
});

test("genuinely empty first-login reading does not create a misleading orphan archive", async () => {
  const f=fixture({user:{id:"bob"},marker:null,oldReading:[]});
  await f.session();
  assert.equal(f.entries.has("sa.unownedReadingHistory.v1"),false);
  assert.equal(f.entries.get("sa.progressOwner"),"bob");
  assert.equal(f.state.unownedReadingPendingRecovery,false);
});


test("transient first ownerless-history read error never certifies or uploads foreign history", async () => {
  const oldReading=[{book:"GEN",chapter:12,title:"private orphan"}];
  const f=fixture({user:{id:"bob"},marker:null,oldReading,denyFirstReadingRead:true});
  await f.session();
  assert.equal(f.state.unownedReadingPendingRecovery,true);
  assert.equal(f.state.localReadingStorageUntrusted,true);
  assert.equal(f.state.missionProgress.index,0);
  assert.equal(f.entries.has("sa.progressOwner"),false,
    "a transient history read error cannot prove this browser history belongs to bob");
  assert.equal(f.entries.get("sa.readingHistory"),JSON.stringify(oldReading),
    "do not silently delete or mutate ambiguous user history");
  await f.sync();
  assert.equal(f.apiCalls.length,0,"never merge orphan history into the account");

  // After the transient error is gone, an explicit fresh session may safely
  // quarantine original bytes before clearing the active ownerless cache.
  await f.session();
  assert.equal(f.entries.get("sa.unownedReadingHistory.v1"),JSON.stringify(oldReading));
  assert.equal(f.entries.get("sa.readingHistory"),"[]");
  assert.equal(f.entries.get("sa.progressOwner"),"bob");
  assert.equal(f.state.unownedReadingPendingRecovery,false);
});

test("silent storage no-op cannot certify the wrong user's surviving history", async () => {
  const legacy=[{book:"EXO",chapter:6,title:"unowned browser cache"}];
  const f=fixture({user:{id:"new-user"},marker:null,oldReading:legacy,
    silentlyIgnoreReadingWrites:true});
  await f.session();
  assert.equal(f.entries.get("sa.unownedReadingHistory.v1"),JSON.stringify(legacy));
  assert.equal(f.entries.get("sa.readingHistory"),JSON.stringify(legacy));
  assert.equal(f.entries.has("sa.progressOwner"),false);
  assert.equal(f.state.unownedReadingPendingRecovery,true);
  assert.equal(f.state.localReadingStorageUntrusted,true);
  await f.sync();
  assert.equal(f.apiCalls.length,0,"no cross-principal account transport");
});


test("unreadable owner marker quarantines readable legacy history before owner certification", async () => {
  const legacy=[{book:"GEN",chapter:8,title:"belongs to an unknown account"}];
  const f=fixture({user:{id:"bob"},marker:"unknown",oldReading:legacy,
    denyOwnerMarkerRead:true});
  await f.session();
  assert.equal(f.entries.get("sa.unownedReadingHistory.v1"),JSON.stringify(legacy));
  assert.equal(f.entries.get("sa.readingHistory"),"[]");
  assert.equal(f.entries.get("sa.progressOwner"),"bob");
  assert.equal(f.state.localReadingStorageUntrusted,false);
  await f.sync();
  const uploaded=f.apiCalls.find(([action,method])=>action==="reading"&&method==="PUT");
  if (uploaded) assert.equal(JSON.stringify(uploaded[2]).includes("unknown account"),false);
});

test("unreadable owner marker and history leaves ambiguous bytes intact and never syncs", async () => {
  const legacy=[{book:"EXO",chapter:2,title:"keep this"}];
  const f=fixture({user:{id:"bob"},marker:"unknown",oldReading:legacy,
    denyOwnerMarkerRead:true,denyFirstReadingRead:true});
  await f.session();
  assert.equal(f.entries.get("sa.readingHistory"),JSON.stringify(legacy));
  assert.equal(f.entries.get("sa.progressOwner"),"unknown");
  assert.equal(f.state.unownedReadingPendingRecovery,true);
  assert.equal(f.state.localReadingStorageUntrusted,true);
  await f.sync();
  assert.equal(f.apiCalls.length,0);
});

test("unsigned guest reload preserves local reading without attributing it to any account", async () => {
  const guestReading=[{book:"GEN",chapter:8,title:"guest local history"}];
  const f=fixture({user:null,marker:null,oldReading:guestReading});
  await f.session();
  assert.equal(f.state.user,null);
  assert.equal(f.entries.get("sa.readingHistory"),JSON.stringify(guestReading));
  assert.equal(f.entries.has("sa.unownedReadingHistory.v1"),false);
  assert.equal(f.entries.has("sa.progressOwner"),false);
  await f.sync();
  assert.equal(f.apiCalls.length,0);
});

test("logout during pending orphan recovery never silently discards the unowned bytes", async () => {
  const orphan=[{book:"EXO",chapter:9}];
  const f=fixture({user:{id:"bob"},marker:null,oldReading:orphan});
  f.entries.set("sa.unownedReadingHistory.v1",'[{"book":"GEN","chapter":2}]');
  await f.session();
  assert.equal(f.state.unownedReadingPendingRecovery,true);
  f.ctx.fetch=async()=>({ok:true,json:async()=>({user:null})});
  await f.session();
  assert.equal(f.state.user,null);
  assert.equal(f.state.unownedReadingPendingRecovery,true);
  assert.equal(f.entries.get("sa.readingHistory"),JSON.stringify(orphan));
  assert.equal(f.entries.has("sa.progressOwner"),false);
  assert.equal(f.entries.get("sa.unownedReadingHistory.v1"),'[{"book":"GEN","chapter":2}]');
});


test("missing owner marker quarantines nonempty mission even when reading is empty", async () => {
  const f=fixture({user:{id:"bob"},marker:null,oldReading:[]});
  const originalMission=f.entries.get("sa.mission.OTAB01");
  await f.session();
  assert.equal(f.entries.has("sa.unownedReadingHistory.v1"),false);
  assert.equal(f.entries.get("sa.unownedMissionProgress.v1"),originalMission);
  assert.equal(f.entries.get("sa.mission.OTAB01"),JSON.stringify({index:0,correct:[],complete:false}));
  assert.equal(f.entries.get("sa.progressOwner"),"bob");
  assert.equal(f.state.missionProgress.index,0,"unowned in-memory progress cannot move to bob");
  assert.equal(f.state.unownedReadingPendingRecovery,false);
  await f.sync();
  assert.equal(f.state.missionProgress.index,2,"only acknowledged server progress may be restored");
});

test("conflicting stored orphan mission blocks ownership without deleting either copy", async () => {
  const f=fixture({user:{id:"bob"},marker:null,oldReading:[]});
  const legacy=f.entries.get("sa.mission.OTAB01");
  const archive='{"index":9,"correct":[1,3],"complete":true}';
  f.entries.set("sa.unownedMissionProgress.v1",archive);
  await f.session();
  assert.equal(f.entries.get("sa.unownedMissionProgress.v1"),archive);
  assert.equal(f.entries.get("sa.mission.OTAB01"),legacy);
  assert.equal(f.entries.has("sa.progressOwner"),false);
  assert.equal(f.state.localReadingStorageUntrusted,true);
  assert.equal(f.state.unownedReadingPendingRecovery,true);
  assert.equal(f.state.missionProgress.index,0);
  await f.sync();
  assert.equal(f.apiCalls.length,0);
});

test("silent mission-progress wipe failure never certifies an unsigned old mission as new account", async () => {
  const f=fixture({user:{id:"bob"},marker:null,oldReading:[],
    silentlyIgnoreMissionWrites:true});
  const legacy=f.entries.get("sa.mission.OTAB01");
  await f.session();
  assert.equal(f.entries.get("sa.unownedMissionProgress.v1"),legacy);
  assert.equal(f.entries.get("sa.mission.OTAB01"),legacy);
  assert.equal(f.entries.has("sa.progressOwner"),false);
  assert.equal(f.state.unownedReadingPendingRecovery,true);
  await f.sync();
  assert.equal(f.apiCalls.length,0);
});

test("logged-out guest with unsigned local mission does not lose it on page refresh", async () => {
  const f=fixture({user:null,marker:null,oldReading:[]});
  const original=f.entries.get("sa.mission.OTAB01");
  await f.session();
  assert.equal(f.entries.get("sa.mission.OTAB01"),original);
  assert.equal(f.entries.has("sa.unownedMissionProgress.v1"),false);
  assert.equal(f.entries.has("sa.progressOwner"),false);
});


test("D1 progress outage cannot revive ownerless mission under a new signed-in principal", async () => {
  const legacy={index:5,correct:["A-1"],complete:true};
  const f=fixture({user:{id:"bob"},marker:null,oldReading:[]});
  f.entries.set("sa.mission.OTAB01",JSON.stringify(legacy));
  f.state.missionProgress=legacy;
  await f.session();
  assert.equal(f.entries.get("sa.unownedMissionProgress.v1"),JSON.stringify(legacy));
  assert.equal(f.state.missionProgress.index,0);
  f.ctx.accountRequest=async (action,method,payload)=>{
    f.apiCalls.push([action,method,payload]);
    if(action==="reading")return {reading:[]};
    if(action==="progress")throw Error("D1 progress read failed");
    throw Error("unexpected call");
  };
  await f.sync();
  assert.equal(f.state.progressSyncStatus,"unavailable");
  assert.equal(f.state.missionProgress.index,0);
  assert.equal(f.entries.get("sa.mission.OTAB01"),JSON.stringify({index:0,correct:[],complete:false}));
  assert.equal(f.entries.get("sa.progressOwner"),"bob");
  assert.equal(f.entries.get("sa.unownedMissionProgress.v1"),JSON.stringify(legacy));
  assert.equal(f.apiCalls.some(([action,method])=>action==="reading"&&method==="PUT"),false);
});

test("archived unowned mission survives a fresh authenticated reload without auto-import", async () => {
  const legacy={index:6,correct:["B-2"],complete:true};
  const first=fixture({user:{id:"bob"},marker:null,oldReading:[]});
  first.entries.set("sa.mission.OTAB01",JSON.stringify(legacy));
  await first.session();
  const archive=first.entries.get("sa.unownedMissionProgress.v1");
  const second=fixture({user:{id:"bob"},marker:"bob",oldReading:[]});
  second.state.missionProgress={index:0,correct:[],complete:false};
  for(const [key,value] of first.entries)second.entries.set(key,value);
  await second.session();
  assert.equal(second.entries.get("sa.unownedMissionProgress.v1"),archive);
  assert.equal(second.entries.get("sa.mission.OTAB01"),
    JSON.stringify({index:0,correct:[],complete:false}));
  assert.equal(second.entries.get("sa.progressOwner"),"bob");
  assert.equal(second.state.missionProgress.index,0);
});

test("quota denial while preserving orphan mission leaves its original bytes and owner unmodified", async () => {
  const f=fixture({user:{id:"bob"},marker:null,oldReading:[],denyWrites:true});
  const before=f.entries.get("sa.mission.OTAB01");
  await f.session();
  assert.equal(f.entries.get("sa.mission.OTAB01"),before);
  assert.equal(f.entries.has("sa.progressOwner"),false);
  assert.equal(f.entries.has("sa.unownedMissionProgress.v1"),false);
  assert.equal(f.state.unownedReadingPendingRecovery,true);
  assert.equal(f.state.missionProgress.index,0);
  await f.sync();
  assert.equal(f.apiCalls.length,0);
});


test("unowned mission progress is quarantined before certifying a new principal", async () => {
  const f=fixture({user:{id:"bob"},marker:null,oldReading:[]});
  const orphan=JSON.stringify({index:3,correct:[1],complete:false});
  await f.session();
  assert.equal(f.entries.get("sa.unownedMissionProgress.v1"),orphan);
  assert.equal(f.entries.get("sa.progressOwner"),"bob");
  assert.equal(JSON.parse(f.entries.get("sa.mission.OTAB01")).index,0);
  assert.equal(f.state.missionProgress.index,0);
  f.ctx.accountRequest=async action=>{
    if(action==="reading")return {reading:[]};
    throw Error("D1 unavailable");
  };
  await f.sync();
  assert.equal(f.state.missionProgress.index,0);
  assert.equal(f.state.progressSyncStatus,"unavailable");
});



test("malformed ownerless mission state is preserved verbatim before active reset", async () => {
  const f=fixture({user:{id:"bob"},marker:null,oldReading:[]});
  f.entries.set("sa.mission.OTAB01",'{"corrupt":');
  await f.session();
  assert.equal(f.entries.get("sa.unownedMissionProgress.v1"),'{"corrupt":');
  assert.equal(f.entries.get("sa.progressOwner"),"bob");
  assert.equal(JSON.parse(f.entries.get("sa.mission.OTAB01")).index,0);
});



test("truly empty mission state is not needlessly quarantined", async () => {
  const f=fixture({user:{id:"bob"},marker:null,oldReading:[]});
  f.entries.set("sa.mission.OTAB01",JSON.stringify({index:0,correct:[],complete:false}));
  await f.session();
  assert.equal(f.entries.has("sa.unownedMissionProgress.v1"),false);
  assert.equal(f.entries.get("sa.progressOwner"),"bob");
});



test("mission archive write denied retains original private progress and no new marker", async () => {
  const f=fixture({user:{id:"bob"},marker:null,oldReading:[],
    denyMissionArchiveWrites:true});
  const old=f.entries.get("sa.mission.OTAB01");
  await f.session();
  assert.equal(f.entries.get("sa.mission.OTAB01"),old);
  assert.equal(f.entries.has("sa.progressOwner"),false);
  assert.equal(f.state.missionProgress.index,0);
  assert.equal(f.state.unownedReadingPendingRecovery,true);
  await f.sync();
  assert.equal(f.apiCalls.length,0);
});



test("transient mission cache read failure cannot authorize a new account", async () => {
  const f=fixture({user:{id:"bob"},marker:null,oldReading:[],
    denyFirstMissionRead:true});
  const old=f.entries.get("sa.mission.OTAB01");
  await f.session();
  assert.equal(f.entries.get("sa.mission.OTAB01"),old);
  assert.equal(f.entries.has("sa.progressOwner"),false);
  assert.equal(f.state.unownedReadingPendingRecovery,true);
  await f.sync();
  assert.equal(f.apiCalls.length,0);
  await f.session();
  assert.equal(f.entries.get("sa.unownedMissionProgress.v1"),old);
  assert.equal(f.entries.get("sa.progressOwner"),"bob");
  assert.equal(f.state.unownedReadingPendingRecovery,false);
});



test("proved owner can sync its existing mission without creating unowned archive", async () => {
  const f=fixture({user:{id:"alice"},prior:"alice",marker:"alice",oldReading:[]});
  await f.session();
  assert.equal(f.state.missionProgress.index,3);
  assert.equal(f.entries.has("sa.unownedMissionProgress.v1"),false);
  assert.equal(f.entries.get("sa.progressOwner"),"alice");
});



test("two unowned private caches are quarantined before safe account initialization", async () => {
  const priorReading=[{book:"GEN",chapter:12}];
  const f=fixture({user:{id:"bob"},marker:null,oldReading:priorReading});
  const priorMission=f.entries.get("sa.mission.OTAB01");
  await f.session();
  assert.equal(f.entries.get("sa.unownedReadingHistory.v1"),JSON.stringify(priorReading));
  assert.equal(f.entries.get("sa.unownedMissionProgress.v1"),priorMission);
  assert.equal(f.entries.get("sa.readingHistory"),"[]");
  assert.equal(JSON.parse(f.entries.get("sa.mission.OTAB01")).index,0);
  assert.equal(f.entries.get("sa.progressOwner"),"bob");
});



test("known different owner still clears old progress through canonical reset", async () => {
  const f=fixture({user:{id:"bob"},prior:"alice",marker:"alice",oldReading:[]});
  await f.session();
  assert.equal(f.entries.has("sa.unownedMissionProgress.v1"),false);
  assert.equal(f.entries.get("sa.progressOwner"),"bob");
  assert.equal(f.state.missionProgress.index,0);
});



test("repeating confirmed identical mission quarantine does not overwrite its bytes", async () => {
  const f=fixture({user:{id:"bob"},marker:null,oldReading:[]});
  const raw=f.entries.get("sa.mission.OTAB01");
  f.entries.set("sa.unownedMissionProgress.v1",raw);
  await f.session();
  assert.equal(f.entries.get("sa.unownedMissionProgress.v1"),raw);
  assert.equal(f.entries.get("sa.progressOwner"),"bob");
});



test("conflict recovery on a later session preserves the original orphan snapshot", async () => {
  const f=fixture({user:{id:"bob"},marker:null,oldReading:[]});
  const raw=f.entries.get("sa.mission.OTAB01");
  f.entries.set("sa.unownedMissionProgress.v1",'{"else":"blocked"}');
  await f.session();
  assert.equal(f.state.unownedReadingPendingRecovery,true);
  f.entries.delete("sa.unownedMissionProgress.v1");
  await f.session();
  assert.equal(f.entries.get("sa.unownedMissionProgress.v1"),raw);
  assert.equal(f.state.unownedReadingPendingRecovery,false);
  assert.equal(f.entries.get("sa.progressOwner"),"bob");
});
