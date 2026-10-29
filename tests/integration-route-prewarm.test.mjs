import test from 'node:test';
import assert from 'node:assert/strict';
import {waitForStableWorker} from '../scripts/integration-ready.mjs';

const routes = [
  {path:'/api/editor-roles?view=me', validate:data=>data?.editor===false},
  {path:'/api/material-review?view=public', validate:data=>Array.isArray(data?.items)},
];

test('readiness primes new GET modules in every healthy cycle without sending writes', async () => {
  const seen=[];
  const fetcher=async (url,init)=>{
    seen.push([new URL(url).pathname + new URL(url).search,init.method]);
    if (url.includes('editor-roles')) return Response.json({editor:false});
    if (url.includes('material-review')) return Response.json({items:[]});
    return Response.json({user:null});
  };
  assert.equal(await waitForStableWorker('http://127.0.0.1:1',{fetcher,routes,sleep:async()=>{},attempts:5,consecutive:3}),true);
  assert.equal(seen.length,9);
  assert.ok(seen.every(([path,method])=>method==='GET'));
  assert.deepEqual(seen.slice(0,3).map(x=>x[0]),['/api/account?action=me','/api/editor-roles?view=me','/api/material-review?view=public']);
});

test('a lazy module 503 resets the sequence, never skipping a missing route',async()=>{
  let calls=0;
  const fetcher=async url=>{
    calls++;
    if (url.includes('editor-roles')) return Response.json({editor:false},{status:calls===2?503:200});
    if (url.includes('material-review')) return Response.json({items:[]});
    return Response.json({user:null});
  };
  assert.equal(await waitForStableWorker('http://127.0.0.1:1',{fetcher,routes,sleep:async()=>{},attempts:5,consecutive:3}),true);
  assert.equal(calls,11);
});

test('malformed or HTML warmup cannot count toward readiness',async()=>{
  const fetcher=async url=>url.includes('editor-roles')?new Response('<html>loading</html>'):Response.json({user:null});
  assert.equal(await waitForStableWorker('http://127.0.0.1:1',{fetcher,routes,sleep:async()=>{},attempts:3,consecutive:2}),false);
});

test('invalid probe paths and validators are explicitly rejected',async()=>{
  for(const routes of [[{path:'//evil.invalid',validate:()=>true}],[{path:'/bad'}],{}]) {
    await assert.rejects(waitForStableWorker('http://127.0.0.1:1',{routes}),RangeError);
  }
});
