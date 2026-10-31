import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {
  academyAllLessonIds, academyLessonIds, academyMarkup
} from '../public/scripture-academy.js';

const catalog=JSON.parse(readFileSync(new URL('../public/data/catalog.json',import.meta.url),'utf8'));
const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;')
  .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');

test('SA-EXT-07: malformed private progress is source-readable but cannot fabricate Academy marks',()=>{
  const invalid=[
    {available:true},
    {available:true,completed:null},
    {available:true,completed:'abraham'},
    {available:true,completed:{}},
    {available:true,completed:['abraham','abraham']},
    {available:true,completed:['not-a-lesson']},
    {available:true,completed:[...academyLessonIds,'abraham']},
    {available:true,completed:Array(academyAllLessonIds.length+1).fill('abraham')},
  ];
  for(const lang of ['uk','ru','en']){
    for(const progress of invalid){
      let html;
      assert.doesNotThrow(()=>{html=academyMarkup(catalog,lang,esc,progress);});
      assert.match(html,/data-academy-root/);
      assert.match(html,/id="academy-reading-unavailable" role="alert"/);
      assert.match(html,/href="\\/reader\\//,'verified public Scripture links stay available');
      assert.doesNotMatch(html,/data-academy-lesson=|aria-pressed=|<progress /,
        'untrusted progress cannot render interactive markers');
      assert.doesNotMatch(html,/academy-reading-badge|academy-place-badge/,
        'untrusted progress cannot claim a completion badge');
    }
  }
});

test('SA-EXT-07: a valid complete progress readback restores honest native controls',()=>{
  for(const lang of ['uk','ru','en']){
    const html=academyMarkup(catalog,lang,esc,{available:true,completed:academyAllLessonIds.slice()});
    assert.equal((html.match(/data-academy-lesson=/g)||[]).length,academyAllLessonIds.length);
    assert.equal((html.match(/aria-pressed="true"/g)||[]).length,academyAllLessonIds.length);
    assert.match(html,/academy-reading-badge/);
    assert.match(html,/academy-place-badge/);
    assert.doesNotMatch(html,/id="academy-reading-unavailable"/);
  }
});

test('SA-EXT-07: verified empty progress and explicit storage denial remain distinct',()=>{
  const normal=academyMarkup(catalog,'en',esc,{available:true,completed:[]});
  assert.match(normal,/data-academy-lesson="abraham" aria-pressed="false"/);
  assert.doesNotMatch(normal,/id="academy-reading-unavailable"/);
  const denied=academyMarkup(catalog,'en',esc,{available:false,completed:[]});
  assert.match(denied,/id="academy-reading-unavailable"/);
  assert.doesNotMatch(denied,/data-academy-lesson=/);
});
