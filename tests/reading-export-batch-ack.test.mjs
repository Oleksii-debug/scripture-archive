import { validBookmarkTimestamp } from "../lib/bookmark-timestamp.js";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { EDITIONS } from "../public/editions.js";

// Execute the production export route, not a model or a parallel implementation.
const source = readFileSync(new URL("../app/api/reading-export/route.ts", import.meta.url), "utf8");
const catalog = JSON.parse(readFileSync(new URL("../public/data/catalog.json", import.meta.url), "utf8"));
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  fileName: "app/api/reading-export/route.ts", reportDiagnostics: true,
});
assert.equal(compiled.diagnostics?.length ?? 0, 0, "canonical export handler must transpile");

const success = results => ({ success: true, results });
const standardRows = () => [
  success([{ first_name: "Alice", locale: "uk", public_community: 1 }]),
  success([{ mission_id: "READING", data: '[{"book":"GEN","chapter":1,"title":"Genesis"}]', updated_at: "2026-10-29" }]),
  success([{ edition: "en-web", book: "GEN", chapter: 1, created_at: "2026-10-29" }]),
  success([{ id: "a1", mission_id: "OT-AB-01", book_id: "GEN", chapter: 1,
    group_id: null, locale: "uk", started_at: "2026-10-29", completed_at: "2026-10-29",
    result_json: '{"score":1,"details":[]}' }]),
];

function fixture({ results = standardRows(), dbPresent = true, identity = {
  userId: "reader-a", email: "reader-a@example.invalid", provider: "password",
}, batchError = null, authError = null } = {}) {
  const statements = [];
  let batches = 0, authentications = 0;
  const db = {
    prepare(sql) {
      return { bind(...params) { statements.push({ sql, params }); return { sql, params }; } };
    },
    async batch(input) {
      batches++;
      assert.equal(input.length, 4);
      if (batchError) throw batchError;
      return results;
    },
  };
  const exports = {};
  vm.runInNewContext(compiled.outputText, {
    exports, Response, Request, Date,
    require(moduleName) {
      if (moduleName.endsWith("lib/bookmark-timestamp.js")) return { validBookmarkTimestamp };
      if (moduleName === "cloudflare:workers") return { env: { DB: dbPresent ? db : null } };
      if (moduleName === "../../../public/data/catalog.json") return { default: catalog };
      if (moduleName === "../../../public/editions.js") return { EDITIONS };
      if (moduleName === "../../../lib/auth") return { authenticateRequest: async () => {
        authentications++;
        if (authError) throw authError;
        return identity;
      } };
      throw Error("Unexpected dependency " + moduleName);
    },
  });
  return {
    call: () => exports.GET(new Request("https://test.invalid/api/reading-export")),
    statements, get batches() { return batches; }, get authentications() { return authentications; },
  };
}
async function outcome(fixtureValue) {
  const response = await fixtureValue.call();
  return { response, body: await response.json() };
}

test("complete acknowledged D1 batch exports the user's actual stored data", async () => {
  const f = fixture(), { response, body } = await outcome(f);
  assert.equal(response.status, 200);
  assert.equal(body.format, "scripture-archive-reading-export");
  assert.equal(body.version, 1);
  assert.equal(body.account.email, "reader-a@example.invalid");
  assert.equal(body.profile.first_name, "Alice");
  assert.equal(body.profile.public_community, 1);
  assert.equal(body.progress[0].mission, "READING");
  assert.equal(body.progress[0].data[0].book, "GEN");
  assert.equal(body.bookmarks[0].chapter, 1);
  assert.equal(body.attemptHistory[0].result.score, 1);
  assert.equal(f.batches, 1);
  assert.equal(f.statements.length, 4);
  assert.match(f.statements[0].sql,/public_community/);
  assert.equal(f.statements.every(item => item.params.length === 1 && item.params[0] === "reader-a"), true);
  assert.match(response.headers.get("cache-control"), /no-store/);
  assert.match(response.headers.get("cache-control"), /private/);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.match(response.headers.get("content-disposition"), /attachment/);
});

test("a true empty account export remains valid only with all four D1 confirmations", async () => {
  const f = fixture({ results: [success([]), success([]), success([]), success([])] });
  const { response, body } = await outcome(f);
  assert.equal(response.status, 200);
  assert.equal(body.profile, null);
  assert.deepEqual(Array.from(body.progress), []);
  assert.deepEqual(Array.from(body.bookmarks), []);
  assert.deepEqual(Array.from(body.attemptHistory), []);
});

for (const index of [0, 1, 2, 3]) {
  test("D1 batch member " + index + " missing results fails closed instead of exporting incomplete data", async () => {
    const rows = standardRows();
    rows[index] = { success: true, results: undefined };
    const { response, body } = await outcome(fixture({ results: rows }));
    assert.equal(response.status, 503);
    assert.equal(body.error, "export_unavailable");
    assert.equal("bookmarks" in body, false);
    assert.match(response.headers.get("cache-control"), /no-store/);
  });
  test("D1 batch member " + index + " failed receipt never yields a download", async () => {
    const rows = standardRows();
    rows[index] = { success: false, results: [] };
    const { response, body } = await outcome(fixture({ results: rows }));
    assert.equal(response.status, 503);
    assert.equal(body.error, "export_unavailable");
    assert.equal(response.headers.get("content-disposition"), null);
  });
}
test("bookmarks null and object results cannot become a false 200 data export", async () => {
  for (const malformed of [null, {}, { 0: "fake" }, "not rows"]) {
    const rows = standardRows(); rows[2] = { success: true, results: malformed };
    const { response, body } = await outcome(fixture({ results: rows }));
    assert.equal(response.status, 503);
    assert.equal(body.error, "export_unavailable");
  }
});
test("missing or truthy-but-invalid D1 success acknowledgements never authorize export", async () => {
  for (const acknowledged of [undefined, null, "true", 1]) {
    const rows = standardRows(); rows[0] = { success: acknowledged, results: [] };
    const { response, body } = await outcome(fixture({ results: rows }));
    assert.equal(response.status, 503);
    assert.equal(body.error, "export_unavailable");
  }
});
test("a D1 batch exception produces a private error, never a partial file", async () => {
  const f = fixture({ batchError: Error("internal private SQL error") });
  const { response, body } = await outcome(f);
  assert.equal(response.status, 503);
  assert.deepEqual(body, { error: "export_unavailable" });
  assert.match(response.headers.get("cache-control"), /private/);
  assert.equal(f.batches, 1);
});
test("corrupt progress or attempt result JSON refuses export without false success", async () => {
  for (const index of [1, 3]) {
    const rows = standardRows();
    if (index === 1) rows[1].results[0].data = "not-json";
    else rows[3].results[0].result_json = "[1,2]";
    const { response, body } = await outcome(fixture({ results: rows }));
    assert.equal(response.status, 503);
    assert.equal(body.error, "export_unavailable");
  }
});
test("owner data export retains genuine object and array mission progress without reinterpretation", async () => {
  const rows = standardRows();
  rows[1].results.push({
    mission_id: "COURSE-01",
    data: '{"mastery":{"chapter":3},"completed":true}',
    updated_at: "2026-10-30",
  });
  const { response, body } = await outcome(fixture({ results: rows }));
  assert.equal(response.status, 200);
  assert.equal(body.progress.length, 2);
  assert.equal(body.progress[0].data[0].book, "GEN");
  assert.equal(body.progress[1].data.mastery.chapter, 3);
  assert.equal(body.progress[1].data.completed, true);
});

for (const data of ["null", "0", "12.5", "false", '"completed"']) {
  test("owner export refuses valid-JSON scalar progress rather than delivering a false backup: "+data, async () => {
    const rows = standardRows();
    rows[1].results[0].data = data;
    const f = fixture({ results: rows });
    const { response, body } = await outcome(f);
    assert.equal(response.status, 503);
    assert.deepEqual(body, { error: "export_unavailable" });
    assert.equal(response.headers.get("content-disposition"), null);
    assert.equal(f.batches, 1);
    assert.equal(f.statements.every(item => item.params[0] === "reader-a"), true);
  });
}

for (const data of [null, undefined, 12, { forged: "progress" }]) {
  test("owner export refuses non-text legacy D1 progress rows: "+String(data), async () => {
    const rows = standardRows();
    rows[1].results[0].data = data;
    const { response, body } = await outcome(fixture({ results: rows }));
    assert.equal(response.status, 503);
    assert.equal(body.error, "export_unavailable");
    assert.equal("progress" in body, false);
    assert.equal(response.headers.get("content-disposition"), null);
  });
}

test("missing D1 binding refuses before authentication or database reads", async () => {
  const f = fixture({ dbPresent: false });
  const { response, body } = await outcome(f);
  assert.equal(response.status, 503);
  assert.equal(body.error, "database_unavailable");
  assert.equal(f.authentications, 0);
  assert.equal(f.statements.length, 0);
});
test("identity storage failure returns private 503 without exposing errors or creating a download", async () => {
  const f = fixture({ authError: Error("private session database detail") });
  const { response, body } = await outcome(f);
  assert.equal(response.status, 503);
  assert.deepEqual(body, { error: "export_unavailable" });
  assert.match(response.headers.get("cache-control"), /no-store, private/);
  assert.equal(response.headers.get("content-disposition"), null);
  assert.equal(f.authentications, 1);
  assert.equal(f.statements.length, 0);
  assert.equal(f.batches, 0);
});
test("unauthenticated and agent identities cannot access private export", async () => {
  for (const identity of [null, { userId: "agent", provider: "agent" }]) {
    const f = fixture({ identity });
    const { response, body } = await outcome(f);
    assert.equal(response.status, 401);
    assert.equal(body.error, "authentication_required");
    assert.equal(f.statements.length, 0);
    assert.equal(f.batches, 0);
  }
});

for (const malformed of [
  '{}', '{"reading":[]}', '{"book":"GEN","chapter":1,"title":"Genesis"}',
  '[null]', '[1]', '["GEN"]', '[[]]',
  '[{}]', '[{"book":"GEN","chapter":"1","title":"Genesis"}]',
  '[{"book":"GEN","chapter":0,"title":"Genesis"}]',
  '[{"book":"GEN","chapter":1,"title":null}]',
  '[{"book":"ABCD","chapter":1,"title":"Fabricated"}]',
  '[{"book":"1ABCD","chapter":1,"title":"Fabricated"}]',
  '[{"book":"gen","chapter":1,"title":"Wrong case"}]',
  '[{"book":"GEN","chapter":151,"title":"Outside canonical reader range"}]',
  '[{"book":"GEN","chapter":9007199254740991,"title":"Huge"}]',
  '[{"book":"GEN","chapter":1,"title":"   "}]',
  JSON.stringify([{book:"GEN",chapter:1,title:"x".repeat(201)}]),
]) {
  test("private export refuses structurally non-restorable READING receipt: " + malformed, async () => {
    const rows = standardRows();
    rows[1].results[0].data = malformed;
    const f = fixture({ results: rows });
    const { response, body } = await outcome(f);
    assert.equal(response.status, 503);
    assert.equal(body.error, "export_unavailable");
    assert.equal(Object.hasOwn(body, "progress"), false);
    assert.equal(response.headers.get("content-disposition"), null);
    assert.match(response.headers.get("cache-control"), /no-store, private/);
    assert.equal(f.batches, 1);
  });
}


for (const title of [
  "a".repeat(101), "Б".repeat(101), "x".repeat(150),
  "Ж".repeat(200), "  " + "Р".repeat(100) + "  ",
]) {
  test("private READING export refuses title that canonical account reader cannot reopen: length " + title.length, async () => {
    const rows = standardRows();
    rows[1].results[0].data = JSON.stringify([
      { book:"GEN", chapter:1, title:"Existing valid chapter" },
      { book:"EXO", chapter:1, title },
    ]);
    const f = fixture({ results: rows });
    const { response, body } = await outcome(f);
    assert.equal(response.status,503);
    assert.deepEqual(body,{ error:"export_unavailable" });
    assert.equal(response.headers.get("content-disposition"),null);
    assert.match(response.headers.get("cache-control"),/no-store, private/);
    assert.equal(f.batches,1);
    assert.equal(f.statements.length,4);
  });
}

for (const title of ["x".repeat(100), "Ж".repeat(100)]) {
  test("private READING export preserves exact canonical 100-character title: " + title[0], async () => {
    const rows = standardRows();
    rows[1].results[0].data = JSON.stringify([{ book:"GEN",chapter:1,title }]);
    const {response,body}=await outcome(fixture({results:rows}));
    assert.equal(response.status,200);
    assert.equal(body.progress[0].data[0].title,title);
    assert.match(response.headers.get("content-disposition"),/attachment/);
  });
}

test("valid empty READING archive remains exportable, preserving legitimate nonreading array snapshots",async()=>{
  const rows=standardRows();
  rows[1].results[0].data='[]';
  rows[1].results.push({mission_id:'LEGACY-ARRAY',data:'[{"event":"known"}]',updated_at:'2026-10-30'});
  const {response,body}=await outcome(fixture({results:rows}));
  assert.equal(response.status,200);
  assert.deepEqual(Array.from(body.progress[0].data),[]);
  assert.equal(body.progress[1].mission,'LEGACY-ARRAY');
  assert.equal(body.progress[1].data[0].event,'known');
});

test("canonical 2/3-character and numbered book records remain exportable without reinterpretation", async () => {
  const rows = standardRows();
  rows[1].results[0].data = JSON.stringify([
    {book:"GEN",chapter:1,title:"Genesis"},
    {book:"1CO",chapter:16,title:"1 Corinthians"},
    {book:"3JN",chapter:1,title:"3 John"},
    {book:"PSA",chapter:150,title:"Psalm 150"},
  ]);
  const {response,body}=await outcome(fixture({results:rows}));
  assert.equal(response.status,200);
  assert.deepEqual(Array.from(body.progress[0].data, entry=>entry.book),["GEN","1CO","3JN","PSA"]);
});

test("READING export refuses syntactically valid but nonexistent books and impossible chapters", async () => {
  // These used to be silently accepted by the 1..150 structural check, even
  // though /api/account?action=reading and /progress reject them.
  for (const item of [
    {book:"FAK",chapter:2,title:"Invented"},
    {book:"GEN",chapter:51,title:"Beyond Genesis"},
    {book:"JOL",chapter:5,title:"Beyond every approved Joel edition"},
    {book:"3JN",chapter:2,title:"Beyond 3 John"},
  ]) {
    const rows = standardRows();
    rows[1].results[0].data = JSON.stringify([item]);
    const { response, body } = await outcome(fixture({ results: rows }));
    assert.equal(response.status, 503, JSON.stringify(item));
    assert.deepEqual(body, { error:"export_unavailable" });
    assert.equal(response.headers.get("content-disposition"), null);
    assert.match(response.headers.get("cache-control"), /no-store, private/);
  }
});

test("READING export preserves approved edition-specific Joel 4 without inventing chapters", async () => {
  // The real Ohiienko edition numbers Joel through chapter 4.
  const rows = standardRows();
  rows[1].results[0].data = JSON.stringify([
    {book:"GEN",chapter:50,title:"Last Genesis chapter"},
    {book:"JOL",chapter:4,title:"Ohiienko Joel"},
    {book:"PSA",chapter:150,title:"Final Psalm"},
  ]);
  const {response,body} = await outcome(fixture({results:rows}));
  assert.equal(response.status,200);
  assert.deepEqual(Array.from(body.progress[0].data, row=>row.book+":"+row.chapter),
    ["GEN:50","JOL:4","PSA:150"]);
});


test("private export refuses corrupt completed-attempt metadata rather than claiming a restorable backup", async () => {
  const badRows = [
    {id:""}, {mission_id:""}, {book_id:"FAK"}, {book_id:"GEN",chapter:51},
    {book_id:"JOL",chapter:5}, {book_id:"3JN",chapter:2},
    {chapter:0}, {chapter:1.5}, {chapter:"1"}, {locale:"de"},
    {group_id:false}, {group_id:""}, {started_at:null}, {completed_at:""},
  ];
  for (const mutation of badRows) {
    const rows = standardRows();
    rows[3].results[0] = {...rows[3].results[0], ...mutation};
    const f = fixture({results:rows});
    const {response,body} = await outcome(f);
    assert.equal(response.status,503,JSON.stringify(mutation));
    assert.deepEqual(body,{error:"export_unavailable"});
    assert.equal(response.headers.get("content-disposition"),null);
    assert.match(response.headers.get("cache-control"),/no-store, private/);
    assert.equal(f.batches,1);
  }
});

test("valid completed-attempt export preserves canonical local chapter exceptions and group identity", async () => {
  const rows=standardRows();
  rows[3].results[0]={...rows[3].results[0],book_id:"JOL",chapter:4,locale:"en",group_id:"class-1"};
  const {response,body}=await outcome(fixture({results:rows}));
  assert.equal(response.status,200);
  assert.equal(body.attemptHistory[0].book,"JOL");
  assert.equal(body.attemptHistory[0].chapter,4);
  assert.equal(body.attemptHistory[0].groupId,"class-1");
  assert.equal(body.attemptHistory[0].locale,"en");
  assert.equal(body.attemptHistory[0].result.score,1);
});

test("private export refuses corrupt or nonlocal bookmark metadata rather than advertising a usable backup", async () => {
  const malformed = [
    {edition:"not-local"}, {edition:"uk-khomenko"}, {edition:7},
    {book:"FAK"}, {book:"gen"}, {book:null},
    {chapter:0}, {chapter:51}, {chapter:1.5}, {chapter:"1"},
    {edition:"en-web",book:"JOL",chapter:4},
    {created_at:null}, {created_at:""},
  ];
  for(const mutation of malformed){
    const rows=standardRows();
    rows[2].results[0]={...rows[2].results[0],...mutation};
    const f=fixture({results:rows});
    const {response,body}=await outcome(f);
    assert.equal(response.status,503,JSON.stringify(mutation));
    assert.deepEqual(body,{error:"export_unavailable"});
    assert.equal(response.headers.get("content-disposition"),null);
    assert.equal(f.batches,1);
  }
  const rows=standardRows();
  rows[2].results[0]=null;
  const {response,body}=await outcome(fixture({results:rows}));
  assert.equal(response.status,503);
  assert.deepEqual(body,{error:"export_unavailable"});
});

test("private bookmark export accepts the real Ohiienko fourth Joel chapter but not its WEB alias", async () => {
  const rows=standardRows();
  rows[2].results=[
    {edition:"uk-ohiienko",book:"JOL",chapter:4,created_at:"2026-10-29"},
    {edition:"en-web",book:"GEN",chapter:50,created_at:"2026-10-29"},
  ];
  const {response,body}=await outcome(fixture({results:rows}));
  assert.equal(response.status,200);
  assert.deepEqual(Array.from(body.bookmarks,x=>x.edition+":"+x.book+":"+x.chapter),
    ["uk-ohiienko:JOL:4","en-web:GEN:50"]);
  assert.equal(body.attemptHistory[0].chapter,1);
});


test("private export refuses corrupt progress identity and updated-at metadata", async () => {
  // The canonical progress table uses (user_id, mission_id) as a key and
  // updated_at NOT NULL. A malformed D1 result is not a valid backup merely
  // because its JSON snapshot parses.
  const invalid = [
    null,
    { mission_id: null }, { mission_id: 12 }, { mission_id: "" },
    { mission_id: "   " }, { mission_id: undefined },
    { updated_at: null }, { updated_at: 0 }, { updated_at: "" },
    { updated_at: " \n\t " }, { updated_at: undefined },
  ];
  for (const mutation of invalid) {
    const results = standardRows();
    results[1].results[0] = mutation === null
      ? null
      : { ...results[1].results[0], ...mutation };
    const f = fixture({ results });
    const { response, body } = await outcome(f);
    assert.equal(response.status, 503, JSON.stringify(mutation));
    assert.deepEqual(body, { error: "export_unavailable" });
    assert.equal(response.headers.get("content-disposition"), null);
    assert.match(response.headers.get("cache-control"), /no-store, private/);
    assert.equal(f.batches, 1);
    assert.equal(f.statements.length, 4);
  }
});

test("private export preserves valid non-READING mission keys and update time", async () => {
  const rows = standardRows();
  rows[1].results.push({
    mission_id: "OT-AB-01:lesson/2",
    data: '{"completed":true}',
    updated_at: "2026-10-30 12:55:00",
  });
  const { response, body } = await outcome(fixture({ results: rows }));
  assert.equal(response.status, 200);
  assert.equal(body.progress[1].mission, "OT-AB-01:lesson/2");
  assert.equal(body.progress[1].updatedAt, "2026-10-30 12:55:00");
  assert.equal(body.progress[1].data.completed, true);
});


test("owner READING export preserves two distinct canonical passages without rewriting metadata", async () => {
  const rows = standardRows();
  rows[1].results[0].data = JSON.stringify([
    {book:"GEN",chapter:1,title:"Буття 1"},
    {book:"GEN",chapter:2,title:"Буття 2"},
  ]);
  const {response,body} = await outcome(fixture({results:rows}));
  assert.equal(response.status,200);
  assert.equal(body.progress[0].data.length,2);
  assert.deepEqual(body.progress[0].data.map(r=>r.chapter),[1,2]);
  assert.equal(body.progress[0].updatedAt,"2026-10-29");
});

for(const [name, reading] of [
  ["duplicate book/chapter with different titles",[
    {book:"GEN",chapter:1,title:"Genesis"}, {book:"GEN",chapter:1,title:"Genesis chapter 1"}]],
  ["identical duplicate rows",[
    {book:"1CO",chapter:2,title:"Paul"}, {book:"1CO",chapter:2,title:"Paul"}]],
  ["excessive historical receipts", Array.from({length:2001},(_,i)=>({book:"GEN",chapter:i+1,title:"Genesis"}))],
]){
  test("owner export rejects "+name+" rather than providing a falsely restorable reading archive", async ()=>{
    const rows = standardRows();
    rows[1].results[0].data=JSON.stringify(reading);
    const f=fixture({results:rows});
    const {response,body}=await outcome(f);
    assert.equal(response.status,503);
    assert.equal(body.error,"export_unavailable");
    assert.equal(response.headers.get("content-disposition"),null);
    assert.equal(f.batches,1);
    assert.equal(f.statements.every(statement=>statement.params[0]==="reader-a"),true);
  });
}

for (const created_at of [
  "2026-02-30", "2026-04-31", "2026-10-30 25:00:00",
  "2026-10-30T12:00:00+03:00", "yesterday", " ",
]) {
  test("owner reading export refuses a damaged bookmark date rather than offering a false backup: "+created_at,async()=>{
    const rows=standardRows();
    rows[2].results[0].created_at=created_at;
    const f=fixture({results:rows});
    const {response,body}=await outcome(f);
    assert.equal(response.status,503);
    assert.equal(body.error,"export_unavailable");
    assert.equal(response.headers.get("content-disposition"),null);
    assert.equal(f.batches,1);
  });
}
for (const created_at of [
  "2024-02-29", "2026-10-30", "2026-10-30 13:45:59",
  "2026-10-30T13:45:59Z", "2026-10-30T13:45:59.123Z",
]) {
  test("owner export retains genuine canonical bookmark dates: "+created_at,async()=>{
    const rows=standardRows();
    rows[2].results[0].created_at=created_at;
    const {response,body}=await outcome(fixture({results:rows}));
    assert.equal(response.status,200);
    assert.equal(body.bookmarks[0].created_at,created_at);
    assert.match(response.headers.get("content-disposition"),/attachment/);
  });
}


// SA-EXT-01/02: owner export is advertised as a recoverable complete record.
// A success-marked D1 response containing impossible history dates is not one.
for (const [field, index, invalid] of [
  ['progress.updated_at',1,'2026-02-31'],
  ['progress.updated_at',1,'1'],
  ['progress.updated_at',1,'2026-10-30 25:00:00'],
  ['attempt.started_at',3,'2026-02-30'],
  ['attempt.started_at',3,'2026-10-30 24:00:00'],
  ['attempt.completed_at',3,'2026-10-30T12:61:00Z'],
  ['attempt.completed_at',3,'not a date'],
]) {
  test('private export rejects invalid '+field+': '+invalid,async()=>{
    const rows=standardRows();
    const key=field.split('.')[1];
    rows[index].results[0][key]=invalid;
    const f=fixture({results:rows});
    const {response,body}=await outcome(f);
    assert.equal(response.status,503,field+' must not produce a successful download');
    assert.equal(body.error,'export_unavailable');
    assert.equal(response.headers.get('content-disposition'),null);
    assert.equal(f.batches,1);
  });
}

for(const time of ['2026-10-30','2026-10-30 13:59:59','2026-10-30T13:59:59Z']){
  test('private export retains canonical historical calendar time '+time,async()=>{
    const rows=standardRows();
    rows[1].results[0].updated_at=time;
    rows[3].results[0].started_at=time;
    rows[3].results[0].completed_at=time;
    const {response,body}=await outcome(fixture({results:rows}));
    assert.equal(response.status,200,JSON.stringify(body));
    assert.equal(body.progress[0].updatedAt,time);
    assert.equal(body.attemptHistory[0].startedAt,time);
    assert.equal(body.attemptHistory[0].completedAt,time);
    assert.match(response.headers.get('content-disposition'),/attachment/);
  });
}
