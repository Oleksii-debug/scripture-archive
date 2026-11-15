import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const start=source.indexOf('function attemptReviewHref(');
const end=source.indexOf('\nlet missionViewEpoch',start);
assert.ok(start>=0&&end>start,'assessment review helpers must remain extractable');

function fixture(lang='en'){
  let html='';
  const context={
    Number,encodeURIComponent,
    state:{lang,user:null},
    ATTEMPT_COPY:{
      [lang]:{
        completed:'Completed',score:'Score',mastered:'Mastered',mistakes:'Review',
        noMistakes:'No mistakes',reviewSource:'Open the passage for review',
        reopen:'Open text',groupNotRecorded:'Not recorded',
      },
    },
    esc:value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),
    shell:value=>{html=value;},syncProgress:()=>{},t:()=>'',play:()=>{},window:{},
  };
  const helpers=vm.runInNewContext(source.slice(start,end)+';({attemptReviewHref,renderAttemptResult})',context);
  return {helpers,render:(result,book='GEN',chapter=12)=>{helpers.renderAttemptResult(result,book,chapter);return html;}};
}

test('SA-EXT-02 mistake review opens the exact canonical source verse with an accessible name',()=>{
  const f=fixture();
  const result={score:0,total:1,mastered:[],mistakes:[{
    reference:'GEN 12:1–3',explanation:'Read the command again.',correctAnswers:['Go'],
  }]};
  const html=f.render(result);
  assert.match(html,/href="\/reader\/GEN\/12\?verse=1"/);
  assert.match(html,/aria-label="Open the passage for review: GEN 12:1–3"/);
  assert.match(html,/>GEN 12:1–3<\/a>/);
});

test('assessment review never turns an unrelated or malformed stored reference into navigation',()=>{
  const {helpers}=fixture();
  for(const reference of [
    'EXO 12:1','GEN 13:1','GEN 12:0','GEN 12:3–1','GEN 12:257',
    'GEN 12:1?next=https://attacker.invalid','<img src=x>','GEN 012:1',
  ]) assert.equal(helpers.attemptReviewHref(reference,'GEN',12),null,reference);
  assert.equal(helpers.attemptReviewHref('GEN 12:16','GEN',12),'/reader/GEN/12?verse=16');
});

