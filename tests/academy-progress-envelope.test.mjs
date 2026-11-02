import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  academyMarkup, academyProgressKey, readAcademyProgress,
} from '../public/scripture-academy.js';

const catalog=JSON.parse(readFileSync(new URL('../public/data/catalog.json',import.meta.url),'utf8'));
const esc=value=>String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const alice=academyProgressKey({id:'alice'});
const bob=academyProgressKey({id:'bob'});
const canonical=JSON.stringify({version:1,completed:['abraham']});

function readOnlyStorage(records){
  const values=new Map(Object.entries(records));
  let writes=0;
  return {
    getItem:key=>values.has(key)?values.get(key):null,
    setItem(){writes++;throw Error('read must never write');},
    removeItem(){writes++;throw Error('read must never delete');},
    snapshot:()=>[...values],
    writes:()=>writes,
  };
}

test('SA-EXT-07: persisted marker envelope rejects extra private or ambiguous fields without mutation',()=>{
  const invalid=[
    JSON.stringify({version:1,completed:['abraham'],accountId:'bob'}),
    JSON.stringify({version:1,completed:['abraham'],accessToken:'not-a-real-token'}),
    JSON.stringify({version:1,completed:['abraham'],updatedAt:123}),
    '{"version":1,"completed":["abraham"],"__proto__":{"completed":["sarah"]}}',
    JSON.stringify({version:1,completed:['abraham'],format:'scripture-archive-academy-markers'}),
  ];
  for(const raw of invalid){
    const store=readOnlyStorage({[alice]:raw,[bob]:canonical});
    const before=store.snapshot();
    assert.deepEqual(readAcademyProgress(store,alice),{available:false,completed:[]},
      'unknown fields cannot be silently treated as verified progress');
    assert.deepEqual(readAcademyProgress(store,bob),{available:true,completed:['abraham']},
      'other principal remains readable');
    assert.deepEqual(store.snapshot(),before,'damaged evidence must remain unchanged');
    assert.equal(store.writes(),0);
    for(const lang of ['uk','ru','en']){
      const html=academyMarkup(catalog,lang,esc,readAcademyProgress(store,alice));
      assert.match(html,/id="academy-reading-unavailable" role="alert"/);
      assert.doesNotMatch(html,/data-academy-lesson=|aria-pressed=|<progress /);
      assert.match(html,/href="\/reader\//,'public source reading stays available');
    }
  }
});

test('SA-EXT-07: canonical version-one envelope remains readable for guest and account',()=>{
  const guest=academyProgressKey(null);
  const store=readOnlyStorage({[alice]:canonical,[guest]:JSON.stringify({version:1,completed:[]})});
  assert.deepEqual(readAcademyProgress(store,alice),{available:true,completed:['abraham']});
  assert.deepEqual(readAcademyProgress(store,guest),{available:true,completed:[]});
  assert.equal(store.writes(),0);
});
