import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const migration=readFileSync(new URL('../drizzle/0016_explicit_community_profile.sql',import.meta.url),'utf8');
const account=readFileSync(new URL('../app/api/account/route.ts',import.meta.url),'utf8');
const community=readFileSync(new URL('../app/api/community/route.ts',import.meta.url),'utf8');
const exportRoute=readFileSync(new URL('../app/api/reading-export/route.ts',import.meta.url),'utf8');
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');

function apply(db,sql){
  for(const statement of sql.split('--> statement-breakpoint').map(value=>value.trim()).filter(Boolean))db.exec(statement);
}

test('0016 keeps every legacy account out until a separate valid community opt-in',()=>{
  const db=new DatabaseSync(':memory:');
  try{
    db.exec(`CREATE TABLE profiles(
      user_id TEXT PRIMARY KEY,
      public_first_name INTEGER NOT NULL DEFAULT 0,
      public_last_name INTEGER NOT NULL DEFAULT 0
    );
    INSERT INTO profiles(user_id,public_first_name,public_last_name) VALUES
      ('legacy-public-name',1,0),('private-name',0,0);`);
    apply(db,migration);
    assert.deepEqual(db.prepare('SELECT user_id,public_community FROM profiles ORDER BY user_id').all().map(row=>({...row})),[
      {user_id:'legacy-public-name',public_community:0},
      {user_id:'private-name',public_community:0},
    ]);
    assert.throws(()=>db.exec("UPDATE profiles SET public_community=1 WHERE user_id='private-name'"),/public_community_requires_public_name/);
    db.exec("UPDATE profiles SET public_first_name=1,public_community=1 WHERE user_id='private-name'");
    assert.equal(db.prepare("SELECT public_community FROM profiles WHERE user_id='private-name'").get().public_community,1);
    assert.throws(()=>db.exec("UPDATE profiles SET public_first_name=0 WHERE user_id='private-name'"),/public_community_requires_public_name/);
    db.exec("UPDATE profiles SET public_first_name=0,public_community=0 WHERE user_id='private-name'");
    assert.throws(()=>db.exec("UPDATE profiles SET public_community=2 WHERE user_id='legacy-public-name'"),/CHECK constraint failed/);
  }finally{db.close();}
});

test('canonical account, directory and export use one explicit opt-in authority',()=>{
  assert.match(account,/visibilityKeys=\["firstName","lastName","church","progress","community"\]/);
  assert.match(account,/public_community=\?/);
  assert.match(account,/body\.community===true&&body\.firstName!==true&&body\.lastName!==true/);
  assert.match(community,/WHERE a\.deleted_at IS NULL AND p\.public_community=1 AND \(p\.public_first_name=1 OR p\.public_last_name=1\)/);
  assert.match(exportRoute,/public_progress,public_community,created_at/);
});

test('account UI makes community publication separate, candid and available in existing locales',()=>{
  for(const text of [
    'Добровільно показувати мій профіль у спільноті',
    'Добровольно показывать мой профиль в сообществе',
    'Voluntarily show my profile in the community',
    'дату долучення, стан «у мережі»',
    'дата присоединения, состояние «в сети»',
    'join date, online status',
  ])assert.ok(app.includes(text),text);
  assert.match(app,/input name="community" type="checkbox" aria-describedby="community-visibility-help"/);
  assert.match(app,/community:form\.has\("community"\)/);
  assert.match(app,/communityVisibility\.disabled=!hasName;if\(!hasName\)communityVisibility\.checked=false/);
});
