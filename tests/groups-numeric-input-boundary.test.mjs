import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import ts from 'typescript';
import vm from 'node:vm';

// Execute the actual production POST handler and its SQL with an isolated
// SQLite/D1-compatible fixture; no production account, D1 or live site touched.
function fixture() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys=ON');
  const root = new URL('../drizzle/', import.meta.url);
  for (const name of readdirSync(root).filter(n => /^\d{4}_.+\.sql$/.test(n)).sort()) {
    db.exec(readFileSync(new URL(name, root), 'utf8'));
  }
  db.prepare("INSERT INTO profiles(user_id,email,first_name,last_name,age_range) VALUES ('alice','alice@example.invalid','Alice','Test','18-24')").run();
  db.prepare("INSERT INTO home_groups(id,owner_user_id,name,invite_code,visibility,bible_edition) VALUES ('g','alice','Fixture group','AABBCCDD','private','en-web')").run();
  db.prepare("INSERT INTO home_group_members(group_id,user_id,display_name,role) VALUES ('g','alice','Alice','owner')").run();

  let writes = 0, usageOverride = undefined;
  function statement(sql, args=[]) {
    return {
      bind(...values) { return statement(sql, values); },
      async first() { if(sql.includes('SELECT COUNT(DISTINCT book_id') && usageOverride !== undefined) return usageOverride; return db.prepare(sql).get(...args) ?? null; },
      async all() { return {success:true,results:db.prepare(sql).all(...args)}; },
      async run() {
        const result=db.prepare(sql).run(...args); writes++;
        return {success:true,meta:{changes:Number(result.changes)}};
      },
      sql, args,
    };
  }
  const D1={
    prepare(sql) { return statement(sql); },
    async batch(statements) {
      db.exec('BEGIN');
      try {
        const receipts=[];
        for (const s of statements) {
          const result=db.prepare(s.sql).run(...s.args);
          writes++;
          receipts.push({success:true,meta:{changes:Number(result.changes)}});
        }
        db.exec('COMMIT');
        return receipts;
      } catch(error) { db.exec('ROLLBACK'); throw error; }
    },
  };
  const actual=readFileSync(new URL('../app/api/groups/route.ts', import.meta.url), 'utf8');
  const compiled=ts.transpileModule(actual,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const exports={};
  vm.runInNewContext(compiled,{
    exports,Request,Response,URL,crypto,
    require(path) {
      if (path==='cloudflare:workers') return {env:{DB:D1}};
      if (path.endsWith('catalog.json')) return {default:JSON.parse(readFileSync(new URL('../public/data/catalog.json',import.meta.url),'utf8'))};
      if (path.endsWith('/auth')) return {
        sameOrigin:request=>request.headers.get('origin')==='https://local.invalid',
        authenticateRequest:async()=>({userId:'alice',provider:'password',emailVerified:true}),
      };
      throw Error('Unexpected dependency '+path);
    },
  });
  async function post(action, payload) {
    const request=new Request('https://local.invalid/api/groups?action='+action,{
      method:'POST',headers:{origin:'https://local.invalid','content-type':'application/json'},
      body:JSON.stringify(payload),
    });
    const response=await exports.POST(request);
    return {status:response.status,body:await response.json()};
  }
  return {db,post,setUsageOverride:value=>{usageOverride=value;},get writes(){return writes;}};
}

const meeting={groupId:'g',bookId:'GEN',chapter:12,answersCorrect:2,answersTotal:3,participantCount:4,meetingDate:'2026-10-28'};
const group={name:'Fixture second group',weeklyGoal:3,catchupMode:'steady',visibility:'private',rosterVisibility:'count',bibleEdition:'en-web'};
// These values were previously coerced by Number(value). Some are valid only
// because Number(true)===1, Number([])===0 and Number('0xC')===12.
const malformed=[
  ['chapter',true],['chapter',[12]],['chapter','0xC'],['chapter','1.2e1'],
  ['chapter','0b1100'],['chapter','0o14'],['chapter',null],
  ['chapter',{}],['chapter',''],['chapter','  '],['chapter','+12'],
  ['chapter','12.0'],['chapter','12foo'],['chapter',false],
  ['answersCorrect',false],['answersCorrect',[]],['answersCorrect',[2]],
  ['answersCorrect','0x2'],['answersCorrect','2e0'],['answersCorrect','2.0'],
  ['answersCorrect',null],['answersCorrect',{}],['answersCorrect',''],
  ['answersTotal',false],['answersTotal',[]],['answersTotal',[3]],
  ['answersTotal','0x3'],['answersTotal','3e0'],['answersTotal','3.0'],
  ['answersTotal',null],['answersTotal',{}],['answersTotal',''],
  ['participantCount',true],['participantCount',[4]],['participantCount','0x4'],
  ['participantCount','4e0'],['participantCount',{}],['participantCount',' '],
  ['participantCount',false],
];
for (const [field,value] of malformed) {
  test('reject malformed meeting '+field+' '+JSON.stringify(value),async()=>{
    const f=fixture();
    try {
      const previous=f.writes;
      const response=await f.post('session',{...meeting,[field]:value});
      assert.equal(response.status,400,JSON.stringify(response.body));
      assert.equal(f.writes,previous,'invalid field must not reach a database mutation');
      assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM group_sessions').get().n,0);
    } finally { f.db.close(); }
  });
}
for(const value of [true,false,[],[3],null,{},'', ' ', '0x3','3e0','3.0','+3','0b11','0o3']) {
  test('reject malformed group weeklyGoal '+JSON.stringify(value),async()=>{
    const f=fixture();
    try {
      const response=await f.post('create',{...group,weeklyGoal:value});
      assert.equal(response.status,400,JSON.stringify(response.body));
      assert.equal(f.writes,0,'invalid weekly goal must not mutate group state');
      assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM home_groups').get().n,1);
    } finally {f.db.close();}
  });
}

// Existing production POST create and genuine D1/SQLite: never acknowledge
// a different group profile from the one its owner entered.
for (const [field, changed] of [
  ['name',{name:'N'.repeat(101)}],
  ['church',{church:'C'.repeat(161)}],
  ['country',{country:'X'.repeat(81)}],
  ['city',{city:'Y'.repeat(81)}],
  ['description',{description:'D'.repeat(601)}],
]) {
  test('reject overlong group '+field+' without any SQLite mutation',async()=>{
    const f=fixture();
    try {
      const result=await f.post('create',{...group,...changed});
      assert.equal(result.status,400,field+' '+JSON.stringify(result.body));
      assert.equal(result.body.error,'invalid_group');
      assert.equal(f.writes,0,'oversized field must not reach D1');
      assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM home_groups').get().n,1);
    } finally {f.db.close();}
  });
}

// An omitted/null optional value remains valid, but a supplied value of the
// wrong JSON type must not be silently converted to a different saved record.
for (const field of ['church','country','city','description']) {
  for (const [kind,value] of [
    ['boolean',true], ['number',42], ['array',['unexpected']],
    ['object',{unexpected:'value'}],
  ]) {
    test('reject explicit '+kind+' group '+field+' before D1',async()=>{
      const f=fixture();
      try {
        const response=await f.post('create',{...group,[field]:value});
        assert.equal(response.status,400,field+' '+kind+' '+JSON.stringify(response.body));
        assert.equal(response.body.error,'invalid_group');
        assert.equal(f.writes,0,'wrong-type optional field must not reach D1');
        assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM home_groups').get().n,1);
      } finally {f.db.close();}
    });
  }
}
for (const [label,optionalFields] of [
  ['omitted',{}],
  ['explicit null',{church:null,country:null,city:null,description:null}],
]) {
  test('group create accepts '+label+' optional profile fields',async()=>{
    const f=fixture();
    try {
      const response=await f.post('create',{...group,...optionalFields});
      assert.equal(response.status,201,JSON.stringify(response.body));
      const row=f.db.prepare('SELECT church,country,city,description FROM home_groups WHERE id=?')
        .get(response.body.groupId);
      for (const field of ['church','country','city','description'])
        assert.equal(row[field],null,field+' should remain explicitly optional');
    } finally {f.db.close();}
  });
}

// A group must not claim it saved the requested Bible edition after coercing
// an explicit JSON value into the Ukrainian default. Use the real route+SQLite.
for (const [label,value] of [
  ['array',['en-web']],['boolean',true],['number',42],
  ['object',{id:'en-web'}],['false',false],
]) {
  test('reject explicit '+label+' Bible edition before D1 group creation',async()=>{
    const f=fixture();
    try {
      const response=await f.post('create',{...group,bibleEdition:value});
      assert.equal(response.status,400,JSON.stringify(response.body));
      assert.equal(response.body.error,'invalid_edition');
      assert.equal(f.writes,0,'invalid edition cannot write any group record');
      assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM home_groups').get().n,1);
    } finally { f.db.close(); }
  });
}
for (const [label,fields,expected] of [
  ['omitted',{},'uk-ohiienko'],
  ['explicit null',{bibleEdition:null},'uk-ohiienko'],
  ['blank HTML selection',{bibleEdition:''},'uk-ohiienko'],
  ['trimmed named edition',{bibleEdition:'  en-web  '},'en-web'],
]) {
  test('preserve '+label+' Bible edition selection',async()=>{
    const f=fixture();
    try {
      const payload={...group,...fields};
      if(label==='omitted')delete payload.bibleEdition;
      const response=await f.post('create',payload);
      assert.equal(response.status,201,JSON.stringify(response.body));
      assert.equal(f.db.prepare('SELECT bible_edition FROM home_groups WHERE id=?')
        .get(response.body.groupId).bible_edition,expected);
    } finally { f.db.close(); }
  });
}

test('group creation persists the exact maximum authored fields',async()=>{
  const f=fixture();
  try{
    const fields={...group,name:'N'.repeat(100),church:'C'.repeat(160),
      country:'X'.repeat(80),city:'Y'.repeat(80),description:'D'.repeat(600)};
    const result=await f.post('create',fields);
    assert.equal(result.status,201,JSON.stringify(result.body));
    const persisted=f.db.prepare('SELECT name,church,country,city,description FROM home_groups WHERE id=?')
      .get(result.body.groupId);
    for (const field of ['name','church','country','city','description'])
      assert.equal(persisted[field],fields[field],field+' must never be shortened');
  }finally{f.db.close();}
});

test('group create retains harmless whitespace trim at exact name boundary',async()=>{
  const f=fixture();
  try{
    const full='N'.repeat(100);
    const result=await f.post('create',{...group,name:'  '+full+'  '});
    assert.equal(result.status,201,JSON.stringify(result.body));
    assert.equal(f.db.prepare('SELECT name FROM home_groups WHERE id=?')
      .get(result.body.groupId).name,full);
  }finally{f.db.close();}
});

test('accept genuine numeric JSON and decimal HTML-form numeric strings',async()=>{
  const f=fixture();
  try {
    for(const fields of [
      {chapter:12,answersCorrect:2,answersTotal:3,participantCount:4},
      {chapter:'12',answersCorrect:'2',answersTotal:'3',participantCount:'4'},
      {chapter:' 12 ',answersCorrect:'02',answersTotal:'03',participantCount:''},
    ]) {
      const outcome=await f.post('session',{...meeting,...fields});
      assert.equal(outcome.status,200,JSON.stringify(outcome.body));
    }
    assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM group_sessions').get().n,3);
    const created=await f.post('create',{...group,weeklyGoal:'3'});
    assert.equal(created.status,201,JSON.stringify(created.body));
    assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM home_groups').get().n,2);
  } finally {f.db.close();}
});


function activeMarathon(f) {
  // Exercise the shipped schema and authorization path, not a fake function
  // invoked instead of POST /api/groups?action=session.
  f.db.prepare("INSERT INTO group_marathon_registrations(id,group_id,weekly_goal,catchup_mode,cohort_key,status,start_date) VALUES('m','g',3,'steady','cohort','active',?)").run(meeting.meetingDate);
}

for (const [description, receipt] of [
  ['missing SQL aggregate row', null],
  ['empty SQL aggregate object', {}],
  ['NULL count', {count:null}],
  ['missing count', {count:undefined}],
  ['non-numeric TEXT', {count:'bad'}],
  ['coercible TEXT zero', {count:'0'}],
  ['negative SQL count', {count:-1}],
  ['fractional count', {count:0.5}],
  ['non-finite Infinity', {count:Infinity}],
  ['non-finite NaN', {count:NaN}]
]) {
  test('SA-EXT-04 marathon refuses '+description+' before creating a meeting',async()=>{
    const f=fixture();try{
      activeMarathon(f);
      f.setUsageOverride(receipt);
      const previous=f.writes;
      const result=await f.post('session',meeting);
      assert.equal(result.status,503,JSON.stringify(result.body));
      assert.equal(result.body.error,'database_unavailable');
      assert.equal(f.writes,previous,'unconfirmed count cannot write a group session');
      assert.equal(f.db.prepare('SELECT COUNT(*) n FROM group_sessions').get().n,0);
    }finally{f.db.close();}
  });
}

test('SA-EXT-04 marathon permits real zero usage, refuses exhausted quota, and preserves exact count threshold',async()=>{
  for(const [count,status] of [[0,200],[2,200],[3,409],[4,409]]) {
    const f=fixture();try{
      activeMarathon(f);
      f.setUsageOverride({count});
      const previous=f.writes;
      const result=await f.post('session',meeting);
      assert.equal(result.status,status,'count='+count+' '+JSON.stringify(result.body));
      assert.equal(f.db.prepare('SELECT COUNT(*) n FROM group_sessions').get().n,status===200?1:0);
      assert.equal(f.writes-previous,status===200?2:0);
    }finally{f.db.close();}
  }
});


// SA-EXT-04 exact meeting date and private reflection: do not silently turn
// a raw malformed date into a different valid date or erase an author's tail.
for (const [description, fields] of [
  ['date suffix', {meetingDate:'2026-10-28extra'}],
  ['multiline date', {meetingDate:'2026-10-28\\n2026-10-29'}],
  ['NUL date suffix', {meetingDate:'2026-10-28\\u0000'}],
  ['array date', {meetingDate:['2026-10-28']}],
  ['object date', {meetingDate:{value:'2026-10-28'}}],
  ['oversized private reflection', {reflection:'R'.repeat(1201)}],
  ['array reflection', {reflection:['private reflection']}],
  ['object reflection', {reflection:{message:'private reflection'}}],
]) {
  test('SA-EXT-04 rejects raw '+description+' with zero meeting writes',async()=>{
    const f=fixture();
    try {
      const before=f.writes;
      const response=await f.post('session',{...meeting,...fields});
      assert.equal(response.status,400,description+' '+JSON.stringify(response.body));
      assert.equal(response.body.error,'invalid_session');
      assert.equal(f.writes,before,'invalid raw data must not persist a session');
      assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM group_sessions').get().n,0);
    } finally {f.db.close();}
  });
}

test('SA-EXT-04 preserves an exact 1200-character private reflection',async()=>{
  const f=fixture();try{
    const reflection='R'.repeat(1200);
    const response=await f.post('session',{...meeting,reflection});
    assert.equal(response.status,200,JSON.stringify(response.body));
    const row=f.db.prepare('SELECT meeting_date,reflection FROM group_sessions').get();
    assert.equal(row.meeting_date,'2026-10-28');
    assert.equal(row.reflection,reflection);
    assert.equal(row.reflection.length,1200);
  }finally{f.db.close();}
});

test('SA-EXT-04 trims harmless date/reflection whitespace without clipping',async()=>{
  const f=fixture();try{
    const response=await f.post('session',{...meeting,
      meetingDate:' 2026-10-28 ',reflection:'  A precise study reflection  '});
    assert.equal(response.status,200,JSON.stringify(response.body));
    const row=f.db.prepare('SELECT meeting_date,reflection FROM group_sessions').get();
    assert.equal(row.meeting_date,'2026-10-28');
    assert.equal(row.reflection,'A precise study reflection');
  }finally{f.db.close();}
});


// SA-EXT-04: overlength caller IDs must not normalize into an existing group.
for (const [action, fields] of [
  ['session', meeting],
  ['rotate-invite', { expectedInviteCode: 'AABBCCDD', confirm: true }],
  ['delete', { confirm: true }],
]) {
  test('reject overlength group identity for '+action+' without D1 write', async () => {
    const f = fixture();
    try {
      const malformed = 'g' + ' '.repeat(80);
      const before = f.writes;
      const result = await f.post(action, { ...fields, groupId: malformed });
      assert.notEqual(result.status, 200, action+' must not accept an aliased group');
      assert.notEqual(result.status, 201, action+' must not accept an aliased group');
      assert.equal(f.writes, before, 'invalid identifier must be rejected before any D1 mutation');
      assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM home_groups').get().n, 1);
      assert.equal(f.db.prepare("SELECT invite_code FROM home_groups WHERE id='g'").get().invite_code, 'AABBCCDD');
      assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM group_sessions').get().n, 0);
    } finally { f.db.close(); }
  });
}

test('valid exact group identifier continues to create a real meeting', async () => {
  const f = fixture();
  try {
    const result = await f.post('session', meeting);
    assert.equal(result.status, 200, JSON.stringify(result.body));
    assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM group_sessions').get().n, 1);
  } finally { f.db.close(); }
});
