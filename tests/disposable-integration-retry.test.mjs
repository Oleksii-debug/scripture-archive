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

const deniedOriginRestart = failedRun(
  'AssertionError [ERR_ASSERTION]: Cross-origin mutation must be rejected; local Worker response: Your worker restarted mid-request. Please try sending the request again. Only GET or HEAD requests are retried automatically.\n  503 !== 403'
);

test('explicit sole Worker restart in a forged-origin 403 assertion may retry a fresh full suite', async () => {
  assert.equal(isDisposableWorkerRestart(deniedOriginRestart),true);
  let runs=0;
  const result=await runWithFreshState(async()=>++runs===1
    ? {code:1,log:deniedOriginRestart} : {code:0,log:'22/22 passed'});
  assert.deepEqual(result,{attempts:2,recovered:true});
  assert.equal(runs,2);
});

test('mixed assertions or app-generated failures with an origin label never qualify',()=>{
  assert.equal(isDisposableWorkerRestart(deniedOriginRestart+'\n  AssertionError: actual persistence mismatch'),false);
  assert.equal(isDisposableWorkerRestart(failedRun('AssertionError [ERR_ASSERTION]: Cross-origin mutation must be rejected; local Worker response: database_unavailable')),false);
});

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

// Node includes the standard ERR_ASSERTION code after a recognized custom
// failure message; that metadata alone is not an independent test failure.
test('standard Node assertion metadata does not defeat an explicitly proven proxy restart',()=>{
  const actual=deniedOriginRestart+"\n    generatedMessage: false,\n    code: 'ERR_ASSERTION',\n    actual: 503,\n    expected: 403,\n    operator: 'strictEqual'";
  assert.equal(isDisposableWorkerRestart(actual),true);
  assert.equal(isDisposableWorkerRestart(actual+"\n  AssertionError: a second, unrelated failure"),false);
});

test('exact proxy body used as a status assertion message also qualifies one disposable replay',async()=>{
  const direct=failedRun("AssertionError [ERR_ASSERTION]: Your worker restarted mid-request. Please try sending the request again. Only GET or HEAD requests are retried automatically.\n  503 !== 400\n    code: 'ERR_ASSERTION'");
  assert.equal(isDisposableWorkerRestart(direct),true);
  assert.equal(isDisposableWorkerRestart(direct+"\n  AssertionError: wrong ownership persisted"),false);
  assert.equal(isDisposableWorkerRestart(failedRun("AssertionError [ERR_ASSERTION]: Your worker restarted mid-request but context unknown")),false);
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
