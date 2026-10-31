import test from 'node:test';
import assert from 'node:assert/strict';
import {
  academyAllLessonIds, academyProgressKey, readAcademyProgress,
} from '../public/scripture-academy.js';

const alice = academyProgressKey({id:'alice'});
const bob = academyProgressKey({id:'bob'});
const saved = completed => JSON.stringify({version:1,completed});

function storageWith(records) {
  const values = new Map(Object.entries(records));
  let reads = 0;
  return {
    getItem(key) { reads++; return values.has(key) ? values.get(key) : null; },
    setItem() { throw Error('read must not write private markers'); },
    removeItem() { throw Error('read must not delete private markers'); },
    get reads() { return reads; },
    snapshot: () => [...values],
  };
}

test('Academy refuses valid-looking oversized persisted JSON without changing stored bytes', () => {
  // Before the bound, JSON.parse accepted this padded record and treated it
  // as verified progress even though the local payload exceeded the import
  // limit by thousands of characters.
  const overlong = saved(['abraham']) + ' '.repeat(8192);
  const storage = storageWith({[alice]:overlong,[bob]:saved(['sarah'])});
  const before = storage.snapshot();
  assert.deepEqual(readAcademyProgress(storage,alice),{available:false,completed:[]});
  assert.deepEqual(storage.snapshot(),before,'recovery must not erase evidence');
  assert.deepEqual(readAcademyProgress(storage,bob),{available:true,completed:['sarah']});
  assert.equal(storage.reads,2);
});

test('Academy rejects non-string storage adapter values and excess marker arrays', () => {
  for(const raw of [undefined,42,{},[],saved([...academyAllLessonIds,'abraham'])]){
    const storage=storageWith({[alice]:raw});
    assert.deepEqual(readAcademyProgress(storage,alice),{available:false,completed:[]});
  }
});

test('Academy preserves all 13 legitimate markers, guest empty state, and unavailable storage', () => {
  const reversed=[...academyAllLessonIds].reverse();
  const storage=storageWith({[alice]:saved(reversed)});
  assert.deepEqual(readAcademyProgress(storage,alice),{
    available:true,completed:[...academyAllLessonIds],
  });
  assert.deepEqual(readAcademyProgress(storage,academyProgressKey(null)),{
    available:true,completed:[],
  });
  assert.deepEqual(readAcademyProgress({getItem(){throw Error('blocked');}},alice),{
    available:false,completed:[],
  });
  assert.deepEqual(readAcademyProgress(storage,null),{
    available:false,completed:[],
  });
});

test('Academy accepts the largest permitted raw record but rejects the next character', () => {
  const prefix=saved(['abraham']);
  const atLimit=prefix+' '.repeat(4096-prefix.length);
  const storage=storageWith({[alice]:atLimit});
  assert.deepEqual(readAcademyProgress(storage,alice),{
    available:true,completed:['abraham'],
  });
  const oversized=storageWith({[alice]:atLimit+' '});
  assert.deepEqual(readAcademyProgress(oversized,alice),{
    available:false,completed:[],
  });
});
