import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the canonical owner POST route, with disposable dependencies only.
// This is not a live D1, owner-account, scheduler or production acceptance test.
const source=readFileSync(new URL('../app/api/community/route.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
assert.equal(compiled.diagnostics?.length??0,0);

function fixture({mode='ok',owner=true,origin=true}={}){
  const calls={lease:0,control:0,advance:0};
  const exports={};
  vm.runInNewContext(compiled.outputText,{
    exports,Request,Response,URL,Date,
    require(name){
      if(name==='cloudflare:workers')return {env:{DB:{}}};
      if(name==='../../../lib/auth')return {
        authenticateRequest:async()=>({userId:'owner'}),
        isVerifiedOwner:()=>owner,
        sameOrigin:()=>origin,
      };
      if(name==='../../../lib/community')return {COMMUNITY_RUN_ID:'test-run'};
      if(name==='../../../public/data/catalog.json')return {default:{books:{en:[]},editionBooks:{}}};
      if(name==='../../../lib/community-engine')return {
        leaseCommunityAgents(){
          calls.lease++;
          if(mode==='throw')throw Error('internal D1 lease failure: private detail');
          if(mode==='reject')return Promise.reject(Error('internal D1 lease failure: private detail'));
          return Promise.resolve({jobs:[],status:'paused'});
        },
        controlCommunity:async()=>{calls.control++;return {ok:true};},
        advanceCommunity:async()=>{calls.advance++;},
      };
      throw Error('unexpected dependency '+name);
    },
  });
  return {
    calls,
    async post(){
      const response=await exports.POST(new Request('https://archive.invalid/api/community',{
        method:'POST',headers:{Origin:'https://archive.invalid','Content-Type':'application/json'},
        body:JSON.stringify({action:'lease',limit:2}),
      }));
      return {status:response.status,payload:await response.json(),cache:response.headers.get('cache-control')};
    },
  };
}

for(const mode of ['throw','reject']){
  test('R0.4 owner lease '+mode+' outage returns private retryable 503, not an uncaught error',async()=>{
    const f=fixture({mode});
    const response=await f.post();
    assert.equal(response.status,503);
    assert.deepEqual(response.payload,{error:'community_unavailable'});
    assert.match(response.cache??'',/no-store/);
    assert.equal(f.calls.lease,1);
    assert.equal(f.calls.control,0);
    assert.equal(f.calls.advance,0);
  });
}

test('R0.4 owner lease recovers to an acknowledged paused empty result',async()=>{
  const f=fixture();
  const response=await f.post();
  assert.equal(response.status,200);
  assert.deepEqual(response.payload,{jobs:[],status:'paused'});
  assert.match(response.cache??'',/no-store/);
  assert.deepEqual(f.calls,{lease:1,control:0,advance:0});
});

test('R0.4 unauthorized lease cannot reach scheduler',async()=>{
  const f=fixture({owner:false});
  const response=await f.post();
  assert.equal(response.status,403);
  assert.equal(response.payload.error,'forbidden');
  assert.deepEqual(f.calls,{lease:0,control:0,advance:0});
});

test('R0.4 cross-origin lease cannot reach scheduler',async()=>{
  const f=fixture({origin:false});
  const response=await f.post();
  assert.equal(response.status,403);
  assert.equal(response.payload.error,'cross_origin_request');
  assert.deepEqual(f.calls,{lease:0,control:0,advance:0});
});
