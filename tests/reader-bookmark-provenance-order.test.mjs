import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// Execute the actual primary reader's verse-focus / bookmark / provenance
// boundary. Do not replace the reader, its catalog, or its storage contract.
const source = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const readerStart = source.indexOf('async function renderReader(parts) {');
const start = source.indexOf('  const verseCoordinateMatches = ', readerStart);
const end = source.indexOf('  const citationCopy = ', start);
assert.ok(readerStart >= 0 && start > readerStart && end > start);
const actual = new Function(
  'state','parts','meta','chapter','verses','location','readerVerseFromUrl',
  'localStorage','localEditionMetadata','editionDetails','catalog',
  source.slice(start, end) + '\nreturn {edition,editionInfo,selectedVerse};'
);

function fixture({ lang='uk', metadata=()=>({title:'Verified edition'}),
  details=edition=>({title:edition.title}), storage=()=>{} }={}) {
  const old={book:'JHN',chapter:3}, currentReader={book:'GEN',chapter:12};
  const state={lang,reader:old,currentReader}, writes=[];
  const run=()=>actual(state,['reader','GEN','12'],{code:'GEN'},12,['verse'],
    {href:'https://example.org/reader/GEN/12?verse=1'},()=>1,
    {setItem:(key,value)=>{writes.push([key,value]);storage(key,value);}},
    metadata,details,{});
  return {old,currentReader,state,writes,run};
}

for(const lang of ['uk','ru','en']){
  test(lang+': unavailable publisher rights do not replace last readable chapter',()=>{
    const h=fixture({lang,metadata:()=>{throw Error('local_edition_provenance_unavailable');}});
    assert.throws(h.run,/local_edition_provenance_unavailable/);
    assert.equal(h.state.reader,h.old,'previous in-memory bookmark remains');
    assert.equal(h.state.currentReader,null,'unlicensed chapter cannot retain transient reader authority');
    assert.equal(h.writes.length,0,'no browser preference write for unlicensed chapter');
  });

  test(lang+': unusable edition details do not overwrite last verified bookmark',()=>{
    const h=fixture({lang,details:()=>{throw Error('edition_details_unavailable');}});
    assert.throws(h.run,/edition_details_unavailable/);
    assert.equal(h.state.reader,h.old);
    assert.equal(h.state.currentReader,null,'failed edition details retire transient reader');
    assert.equal(h.writes.length,0);
  });

  test(lang+': verified publisher rights allow normal reader resume and verse focus',()=>{
    const h=fixture({lang});
    const result=h.run();
    assert.equal(result.editionInfo.title,'Verified edition');
    assert.equal(result.selectedVerse,1);
    assert.deepEqual(h.state.reader,{book:'GEN',chapter:12});
    assert.equal(h.state.currentReader,h.currentReader,'valid chapter retains its transient lease');
    assert.deepEqual(h.writes,[['sa.reader',JSON.stringify({book:'GEN',chapter:12})]]);
  });
}

test('denied preference storage still permits an authorized in-memory chapter',()=>{
  const h=fixture({storage:()=>{throw Error('storage denied');}});
  assert.doesNotThrow(h.run);
  assert.deepEqual(h.state.reader,{book:'GEN',chapter:12});
  assert.equal(h.state.currentReader,h.currentReader);
  assert.equal(h.writes.length,1,'one attempted preference write, no false durability claim');
});
