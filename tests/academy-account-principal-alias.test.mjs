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


test('inherited, accessor and array IDs never select another account’s private Academy markers', () => {
  const inherited=Object.create({id:'alice'});
  const accessor={get id(){return 'alice';}};
  const array=Object.assign([], {id:'alice'});
  const hostile=new Proxy({}, {getOwnPropertyDescriptor(){throw Error('unreadable principal');}});
  const store=storage();
  const alice=academyProgressKey({id:'alice'});
  store.setItem(alice,JSON.stringify({version:1,completed:['abraham']}));
  const original=store.values.get(alice);
  for(const user of [inherited,accessor,array,hostile]){
    assert.equal(academyProgressKey(user),null,'unverified principal must not select Alice');
    const before=store.calls.length;
    assert.deepEqual(readAcademyProgress(store,academyProgressKey(user)),{available:false,completed:[]});
    assert.equal(store.calls.length,before,'invalid identity must not touch storage');
  }
  assert.equal(store.values.get(alice),original);
  const own=Object.assign(Object.create(null),{id:'alice'});
  assert.equal(academyProgressKey(own),alice,'legitimate own data-property IDs remain valid');
});

test('stale Academy controls cannot write through a prototype-inherited principal ID', () => {
  const store=storage();
  const alice=academyProgressKey({id:'alice'});
  store.setItem(alice,JSON.stringify({version:1,completed:['abraham']}));
  const original=store.values.get(alice);
  let click=()=>{};
  const button={
    getAttribute:()=> 'sarah',
    addEventListener(_event,callback){click=callback;},
  };
  const root={querySelectorAll:()=>[button],querySelector:()=>({textContent:''})};
  const document={querySelector:value=>value==='[data-academy-root]'?root:null};
  attachAcademy(document,store,'en',Object.create({id:'alice'}),{available:true,completed:[]});
  const before=store.calls.length;
  click();
  assert.equal(store.calls.length,before,'no read or write through inherited principal');
  assert.equal(store.values.get(alice),original);
});
