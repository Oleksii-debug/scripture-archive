import assert from "node:assert/strict";
import test from "node:test";
import { waitForStableWorker } from "../scripts/integration-ready.mjs";

function scripted(statuses) {
  const seen = [];
  let i = 0;
  return {
    seen,
    fetcher: async (url, init) => {
      seen.push({ url, method: init.method });
      const item = statuses[Math.min(i++, statuses.length - 1)];
      if (item === "throw") throw Error("Local worker restarted.");
      if (item === "html") return new Response("<html>Login page</html>");
      return Response.json({ user: item === 200 ? null : {id:"somebody"} }, { status: item === 200 ? 200 : item });
    },
    sleep: async () => {},
  };
}

test("readiness requires eight consecutive genuine unauthenticated 200s", async () => {
  const f=scripted([200,200,"throw",503,200,200,200,200,200,200,200,200]);
  assert.equal(await waitForStableWorker("http://127.0.0.1:9999",{...f,attempts:15}),true);
  assert.equal(f.seen.length,12);
  assert.ok(f.seen.every(req => req.method==="GET" && req.url==="http://127.0.0.1:9999/api/account?action=me"));
});
test("readiness refuses 503, HTML, stale account identities and exhausted retries", async () => {
  const f=scripted([503,"html",403,200,200]);
  assert.equal(await waitForStableWorker("http://localhost:9000",{...f,attempts:5,consecutive:3}),false);
});
test("readiness aborts when the local worker exits", async () => {
  let reads=0;
  const fetcher=async()=>{reads++;return Response.json({user:null})};
  assert.equal(await waitForStableWorker("http://127.0.0.1",{fetcher,sleep:async()=>{},attempts:10,isStopped:()=>reads===2,consecutive:8}),false);
  assert.equal(reads,2);
});
test("invalid limits fail explicitly rather than appearing ready", async () => {
  await assert.rejects(waitForStableWorker("http://127.0.0.1",{consecutive:0}),RangeError);
  await assert.rejects(waitForStableWorker("http://127.0.0.1",{attempts:0}),RangeError);
});
