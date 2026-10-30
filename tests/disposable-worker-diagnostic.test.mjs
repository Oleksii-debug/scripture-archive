import test from "node:test";
import assert from "node:assert/strict";
import {diagnoseDisposableWorkerReads} from "../scripts/disposable-worker-diagnostic.mjs";

const BASE = "http://127.0.0.1:54321";
const signalFactory = ms => ({ requested_timeout_ms: ms });

test("three canonical anonymous GETs remain read-only and reveal only statuses", async () => {
  const requests=[];
  const report=await diagnoseDisposableWorkerReads(BASE,{
    signalFactory, fetcher:async(url,init)=>{
      requests.push({url,init});
      if(url.includes("action=me"))return {status:200,json:async()=>({user:null, secret:"never logged"})};
      if(url.includes("view=me"))return {status:200,json:async()=>({editor:false, privateUserId:"never logged"})};
      return {status:200,json:async()=>({items:[],private:"never logged"})};
    }
  });
  assert.equal(report.all_responsive,true);
  assert.deepEqual(report.probes.map(x=>x.target),["account","editor","public-review"]);
  assert.deepEqual(report.probes.map(x=>x.status),[200,200,200]);
  assert.deepEqual(report.probes.map(x=>x.shape_ok),[true,true,true]);
  assert.equal(JSON.stringify(report).includes("secret"),false);
  assert.equal(JSON.stringify(report).includes("private"),false);
  assert.equal(requests.length,3);
  for(const r of requests){
    assert.equal(r.init.method,"GET");
    assert.equal(r.init.redirect,"manual");
    assert.equal(r.init.cache,"no-store");
    assert.equal(r.init.signal.requested_timeout_ms,900);
    assert.ok(r.url.startsWith(BASE+"/api/"));
    assert.equal(r.init.body,undefined);
    assert.equal(r.init.headers,undefined);
  }
});

test("worker 503 is reported without error text or a stateful retry",async()=>{
  let count=0;
  const report=await diagnoseDisposableWorkerReads(BASE,{
    signalFactory,fetcher:async()=>{count++;return {status:503,json:async()=>({error:"private-user-data"})};}
  });
  assert.equal(count,3);
  assert.equal(report.all_responsive,false);
  assert.deepEqual(report.probes.map(x=>x.status),[503,503,503]);
  assert.equal(JSON.stringify(report).includes("private-user-data"),false);
});

test("bad JSON, malformed healthy schema and network errors fail closed",async()=>{
  let i=0;
  const report=await diagnoseDisposableWorkerReads(BASE,{
    signalFactory,fetcher:async()=>{
      i++;
      if(i===1)return {status:200,json:async()=>{throw new SyntaxError("private text")}};
      if(i===2)return {status:200,json:async()=>({editor:true,secret:"never log"})};
      throw Error("private network token");
    }
  });
  assert.equal(report.all_responsive,false);
  assert.deepEqual(report.probes.map(x=>x.status),[200,200,null]);
  assert.deepEqual(report.probes.map(x=>x.shape_ok),[false,false,false]);
  assert.equal(JSON.stringify(report).includes("private"),false);
});

test("refuse remote destinations and unbounded probes before any network call",async()=>{
  let sent=0;
  const opts={signalFactory,fetcher:async()=>{sent++;return {status:200,json:async()=>({user:null})}}};
  for(const address of ["https://127.0.0.1:54321","http://localhost:54321",
    "http://192.168.0.1:54321","http://127.0.0.1:54321/other",
    "http://127.0.0.1:99999","http://127.0.0.1:0",""]) {
    await assert.rejects(()=>diagnoseDisposableWorkerReads(address,opts),RangeError,address);
  }
  for(const timeoutMs of [0,99,2001,1.5,Number.POSITIVE_INFINITY]){
    await assert.rejects(()=>diagnoseDisposableWorkerReads(BASE,{...opts,timeoutMs}),RangeError);
  }
  assert.equal(sent,0);
});
