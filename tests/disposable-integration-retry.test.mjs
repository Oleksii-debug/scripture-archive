import test from 'node:test';
import assert from 'node:assert/strict';
import {isDisposableWorkerRestart,runWithFreshState} from '../scripts/run-disposable-integration.mjs';

test('local Worker text restart permits one complete fresh-D1 re-execution',async()=>{
  let runs=0;const reports=[];
  const result=await runWithFreshState(async()=>++runs===1 ?
    {code:1,log:'SyntaxError [Error]: Unexpected token \'Y\', "Your worke"... is not valid JSON'} :
    {code:0,log:'22/22 passed'},message=>reports.push(message));
  assert.deepEqual(result,{attempts:2,recovered:true});
  assert.equal(runs,2);assert.equal(reports.length,1);
});

test('application failures and generic HTTP 503 are never classified as infrastructure restart',async()=>{
  assert.equal(isDisposableWorkerRestart('503 Service Unavailable: database_unavailable'),false);
  let runs=0;
  await assert.rejects(runWithFreshState(async()=>{runs++;return {code:1,log:'AssertionError: 503 !== 200'};}),/attempt 1/);
  assert.equal(runs,1);
});

test('two independent Worker restarts remain red and never certify the product',async()=>{
  let runs=0;
  await assert.rejects(runWithFreshState(async()=>{runs++;return {code:1,log:'Your worker restarted mid-request'};}),/attempt 2/);
  assert.equal(runs,2);
});

test('ordinary success runs only once',async()=>{
  let runs=0;const result=await runWithFreshState(async()=>{runs++;return {code:0,log:'ok'};});
  assert.deepEqual(result,{attempts:1,recovered:false});assert.equal(runs,1);
});
