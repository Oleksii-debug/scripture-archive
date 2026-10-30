import test from 'node:test';
import assert from 'node:assert/strict';
import { academyProgressKey, readAcademyProgress, attachAcademy } from '../public/scripture-academy.js';

const guest = academyProgressKey(null);
const storage = () => {
  const values = new Map();
  const calls = [];
  return {
    values, calls,
    getItem(key) { calls.push(['get', key]); return values.get(key) ?? null; },
    setItem(key, value) { calls.push(['set', key]); values.set(key, value); },
  };
};

test('anonymous and valid registered accounts retain their own stable progress keys', () => {
  assert.equal(guest, 'sa.academy.reading.v1:guest');
  assert.equal(academyProgressKey(undefined), guest);
  assert.equal(academyProgressKey({id:'alice-1'}), 'sa.academy.reading.v1:alice-1');
  assert.equal(academyProgressKey({id:'bob_2'}), 'sa.academy.reading.v1:bob_2');
  assert.notEqual(academyProgressKey({id:'alice-1'}), academyProgressKey({id:'bob_2'}));
});

test('malformed account projections can never alias the anonymous progress record', () => {
  const bad = [
    {}, {id:null}, {id:0}, {id:''}, {id:'guest'},
    {id:'alice@example.org'}, {id:'alice/other'}, {id:'alice space'},
    {id:'x'.repeat(121)}, 'alice', [], true,
  ];
  const store = storage();
  store.setItem(guest, JSON.stringify({version:1,completed:['abraham']}));
  for (const user of bad) {
    const key=academyProgressKey(user);
    assert.equal(key, null, 'invalid signed-in account must fail closed');
    const before=store.calls.length;
    assert.deepEqual(readAcademyProgress(store,key), {available:false,completed:[]});
    assert.equal(store.calls.length,before,'no private guest read on invalid identity');
  }
  assert.deepEqual(readAcademyProgress(store,guest), {available:true,completed:['abraham']});
});

test('malformed storage keys fail before any read or write', () => {
  const store=storage();
  for (const key of [null,42,'',{},'sa.academy.reading.v1:user@invalid',
      'sa.academy.reading.v1:a/b','sa.other:alice']) {
    const before=store.calls.length;
    assert.deepEqual(readAcademyProgress(store,key), {available:false,completed:[]});
    assert.equal(store.calls.length,before);
  }
  assert.deepEqual(readAcademyProgress(store,academyProgressKey({id:'alice'})),
    {available:true,completed:[]});
});

test('invalid authenticated account cannot mutate guest progress even with a stale available panel', () => {
  const store=storage();
  store.setItem(guest,JSON.stringify({version:1,completed:['abraham']}));
  const saved=store.values.get(guest);
  let click=()=>{};
  const button={
    getAttribute:()=> 'sarah',
    addEventListener(_event,callback) { click=callback; },
  };
  const root={
    querySelectorAll:()=>[button],
    querySelector:()=>({textContent:''}),
  };
  const document={
    querySelector:value=>value==='[data-academy-root]'?root:null,
  };
  attachAcademy(document,store,'uk',{id:'guest'}, {available:true,completed:[]});
  click();
  attachAcademy(document,store,'uk',{id:'bad@email'}, {available:true,completed:[]});
  click();
  assert.equal(store.values.get(guest),saved);
  assert.equal(store.calls.filter(([method])=>method==='set').length,1,
    'only fixture setup may have written anonymous data');
});
