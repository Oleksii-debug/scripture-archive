import test from 'node:test';
import assert from 'node:assert/strict';
import {isDisposableWorkerRestart,runWithFreshState} from '../scripts/run-disposable-integration.mjs';

function failedRun(failure, {count=1, trailer=''}={}) {
  return [
    'ℹ tests 22',
    'ℹ pass 21',
    'ℹ fail '+count,
    '✖ failing tests:',
    'test at tests/api-flow.test.mjs:9:1',
    '✖ account and editor roles',
    '  '+failure,
    trailer,
  ].join('\n');
}

const provenRestart = failedRun(
  'SyntaxError: Unexpected token \'Y\', "Your worker restarted mid-request" is not valid JSON'
);

test('one positively identified disposable restart permits one full fresh-D1 run',async()=>{
  assert.equal(isDisposableWorkerRestart(provenRestart),true);
  let runs=0;const reports=[];
  const result=await runWithFreshState(async()=>++runs===1 ?
    {code:1,log:provenRestart} : {code:0,log:'22/22 passed'},
    message=>reports.push(message));
  assert.deepEqual(result,{attempts:2,recovered:true});
  assert.equal(runs,2);
  assert.equal(reports.length,1);
});

test('generic 503, truncated JSON message and standalone restart banner do not permit retry',async()=>{
  const uncertain=[
    '503 Service Unavailable: database_unavailable',
    'Your worker restarted mid-request',
    failedRun('SyntaxError: Unexpected token \'Y\', "Your worke"... is not valid JSON'),
    failedRun('AssertionError: 503 !== 403'),
    failedRun('AssertionError: 503 !== 403', {trailer:'[wrangler:info] Your worker restarted mid-request'}),
  ];
  for(const log of uncertain) {
    assert.equal(isDisposableWorkerRestart(log),false,log);
    let runs=0;
    await assert.rejects(runWithFreshState(async()=>{runs++;return {code:1,log};}),/attempt 1/);
    assert.equal(runs,1);
  }
});

test('multiple failed tests and mixed restart plus assertion always stay red',async()=>{
  assert.equal(isDisposableWorkerRestart(failedRun('Your worker restarted mid-request',{count:2,trailer:'✖ other assertion'})),false);
  assert.equal(isDisposableWorkerRestart(failedRun('Your worker restarted mid-request\n  AssertionError: data was not durable')),false);
  assert.equal(isDisposableWorkerRestart(failedRun('AssertionError: lost update\n  Your worker restarted mid-request')),false);
});

test('a second independently proven restart remains red',async()=>{
  let runs=0;
  await assert.rejects(runWithFreshState(async()=>{runs++;return {code:1,log:provenRestart};}),/attempt 2/);
  assert.equal(runs,2);
});

test('ordinary success runs only once',async()=>{
  let runs=0;
  const result=await runWithFreshState(async()=>{runs++;return {code:0,log:'ok'};});
  assert.deepEqual(result,{attempts:1,recovered:false});
  assert.equal(runs,1);
});

test('exact Worker restart HTTP 503 in a single assertion permits only a fresh-state whole-suite retry', async () => {
  const actualRestart = failedRun(
    'AssertionError [ERR_ASSERTION]: Your worker restarted mid-request. Please try sending the request again. Only GET or HEAD requests are retried automatically.\n\n  503 !== 200'
  );
  assert.equal(isDisposableWorkerRestart(actualRestart), true);
  let runs = 0;
  const result = await runWithFreshState(async () => ++runs === 1
    ? {code:1,log:actualRestart} : {code:0,log:'22 of 22 passed'});
  assert.deepEqual(result,{attempts:2,recovered:true});
  assert.equal(runs,2);
});

test('mixed assertion, unrelated restart banner, or non-503 evidence cannot trigger retry', async () => {
  const phrase = 'Your worker restarted mid-request. Please try sending the request again. Only GET or HEAD requests are retried automatically.';
  const rejected = [
    failedRun('AssertionError [ERR_ASSERTION]: data was not durable\n  503 !== 200\n  '+phrase),
    failedRun('AssertionError [ERR_ASSERTION]: '+phrase+'\n  502 !== 200'),
    failedRun('AssertionError [ERR_ASSERTION]: '+phrase+'\n  503 !== 200\n  AssertionError: another failure'),
    failedRun('AssertionError [ERR_ASSERTION]: '+phrase+'\n  503 !== 200',{count:2}),
    failedRun('AssertionError [ERR_ASSERTION]: 503 Service Unavailable\n  503 !== 200',{trailer:'[wrangler:info] '+phrase}),
  ];
  for(const log of rejected) {
    assert.equal(isDisposableWorkerRestart(log), false, log);
  }
});
