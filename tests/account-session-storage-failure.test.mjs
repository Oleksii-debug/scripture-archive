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
  excerpt("async function getSession() {", "\nasync function getBook("),
  excerpt("async function syncProgress() {", "\nfunction clearPersonalProgress() {"),
  excerpt("function clearPersonalProgress() {", "\nfunction field("),
].join("\n");

function fixture({ user = { id: "alice" }, prior = null, marker = null,
                   denyRead = false, denyWrites = false, denyDelete = false,
                   serverReading = [], oldReading = [] } = {}) {
  const initial = [
    ["sa.progressOwner", marker],
    ["sa.readingHistory", JSON.stringify(oldReading)],
    ["sa.mission.OTAB01", JSON.stringify({ index: 3, correct: [1], complete: false })],
  ].filter(([,v]) => v !== null);
  const entries = new Map(initial);
  const storageCalls = [], apiCalls = [];
  const storage = {
    getItem(key) {
      storageCalls.push(["get", key]);
      if (denyRead) throw Error("SecurityError");
      return entries.has(key) ? entries.get(key) : null;
    },
    setItem(key, value) {
      storageCalls.push(["set", key]);
      if (denyWrites) throw Error("QuotaExceededError");
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
  assert.ok(f.storageCalls.some(([action])=>action==="remove"));
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
  assert.equal(f.entries.get("sa.progressOwner"),"bob");
  assert.equal(f.state.localReadingStorageUntrusted,false);
});

test("marker persistence failure also forbids reuse of local history", async () => {
  const f=fixture({user:{id:"alice"},prior:"alice",marker:"alice",
    denyWrites:true,oldReading:[{book:"GEN",chapter:2}]});
  await f.session();
  assert.equal(f.state.localReadingStorageUntrusted,true);
  await f.sync();
  assert.equal(f.apiCalls.some(([action,method])=>action==="reading"&&method==="PUT"),false);
});
