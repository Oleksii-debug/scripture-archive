import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const workflow=readFileSync(new URL('../.github/workflows/manual-public-asset-parity.yml',import.meta.url),'utf8');

test('R0.1 public asset probe runs only by explicit manual dispatch, never automatically',()=>{
  assert.match(workflow,/^on:\s*\n  workflow_dispatch:\s*$/m);
  assert.doesNotMatch(workflow,/^  (?:push|pull_request|schedule|repository_dispatch|workflow_run):/m);
  assert.match(workflow,/^      expected_head:\s*$/m);
  assert.match(workflow,/^      expected_origin:\s*$/m);
  assert.match(workflow,/default: 'https:\/\/scripture-archive\.com'/);
  assert.match(workflow,/^permissions:\s*\n  contents: read\s*$/m);
});

test('job checks immutable dispatch commit, not attacker-provided ref or unpinned main',()=>{
  assert.match(workflow,/ref: \$\{\{ github\.sha \}\}/);
  assert.match(workflow,/persist-credentials: false/);
  assert.match(workflow,/github\.repository == 'Oleksii-debug\/scripture-archive'/);
  assert.match(workflow,/timeout-minutes: 5/);
});

test('untrusted manual inputs never interpolate into shell source or checkout ref',()=>{
  assert.match(workflow,/APPROVED_SITE_ORIGIN: \$\{\{ inputs\.expected_origin \}\}/);
  assert.match(workflow,/EXPECTED_CHECKOUT_HEAD: \$\{\{ inputs\.expected_head \}\}/);
  assert.match(workflow,/--expected-origin "\$APPROVED_SITE_ORIGIN" --expected-head "\$EXPECTED_CHECKOUT_HEAD"/);
  const run=workflow.split('        run: |').at(-1);
  assert.doesNotMatch(run,/\$\{\{\s*inputs\./);
  assert.doesNotMatch(workflow,/^\s+uses: .*deploy/im);
  assert.doesNotMatch(workflow,/secrets\./);
});
