import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import vm from "node:vm";
import ts from "typescript";

// Execute the exact production advanceCommunity SQL against a real disposable
// SQLite schema with D1.batch transaction semantics; no live Agents/D1/site.
const sqlDate = now => now.toISOString().replace("T", " ").slice(0, 19);
function fixture({ duplicate = false, paused = false, storageFailure = -1, afterClaimRace = false, ackFailure = -1 } = {}) {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys=ON");
  const migrations = readdirSync(new URL("../drizzle/", import.meta.url)).filter(name => /^000[0-8]_.*\.sql$/.test(name)).sort();
  for (const name of migrations)
    db.exec(readFileSync(new URL("../drizzle/" + name, import.meta.url), "utf8"));
  const run = "fixture-run", wave = run + ":initial";
  db.prepare("INSERT INTO community_runs(id,status,control_version,activated_at) VALUES(?,?,4,'2026-10-31 12:00:00')")
    .run(run, paused ? "paused" : "running");
  db.prepare("INSERT INTO community_waves(id,run_id,label,starts_at,next_at,target_count,interval_pattern) VALUES(?,?,?,'2026-10-31 12:00:00','2026-10-31 12:00:00',1,'[120]')")
    .run(wave,run,"first");
  if (duplicate) db.prepare("INSERT INTO community_members(id,run_id,wave_id,sequence_number,first_name,last_name,locale,country_code,persona,seed,joined_at) VALUES('preexisting',?,?,1,'Existing','Person','uk','UA','active',1,'2026-10-31 12:00:00')")
    .run(run,wave);
  const calls = {batch:0,cleanups:0};
  function statement(sql,args=[]) {
    return {
      sql,args,
      bind(...values) { return statement(sql,values); },
      async first() {
        const value = db.prepare(sql).get(...args)??null;
        if (afterClaimRace && sql.includes("RETURNING control_version") && value)
          db.prepare("UPDATE community_runs SET control_version=control_version+1 WHERE id=?").run(run);
        return value;
      },
      async all() { return {success:true,results:db.prepare(sql).all(...args)}; },
      async run() {
        if (sql.includes("SET lease_token=NULL")) calls.cleanups++;
        const result = db.prepare(sql).run(...args);
        return {success:true,meta:{changes:Number(result.changes)}};
      },
    };
  }
  const D1 = {
    prepare(sql) {return statement(sql);},
    async batch(items) {
      calls.batch++;
      db.exec("BEGIN");
      try {
        const results=[];
        for (const [i,item] of items.entries()) {
          if (storageFailure===i) throw Error("simulated write outage");
          results.push(await item.run());
        }
        db.exec("COMMIT");
        if (ackFailure>=0)results[ackFailure]={success:false,meta:{changes:results[ackFailure].meta.changes}};
        return results;
      } catch (error) {db.exec("ROLLBACK");throw error;}
    },
  };
  const dependencies = {
    "cloudflare:workers": {env:{DB:D1}},
    "./auth": {randomToken:()=> "token",sha256:async()=>"hash"},
    "./community": {
      COMMUNITY_RUN_ID:run,COMMUNITY_TARGET:1,communityWavePlan:()=>[],
      identityFor:()=>({firstName:"New",lastName:"Person",locale:"uk",countryCode:"UA",persona:"active",seed:7}),
      intervalSeconds:()=>120,sqlDate,
    },
  };
  const source = readFileSync(new URL("../lib/community-engine.ts",import.meta.url),"utf8");
  const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
  assert.equal(code.diagnostics?.length??0,0);
  const exports={};
  vm.runInNewContext(code.outputText,{exports,Date,crypto,console,require(name){
    if (!Object.hasOwn(dependencies,name))throw Error("unexpected dependency "+name);
    return dependencies[name];
  }});
  return {
    db,calls,advance:()=>exports.advanceCommunity(new Date("2026-10-31T12:00:01Z")),
    counts:()=>({
      wave:db.prepare("SELECT created_count FROM community_waves WHERE id=?").get(wave).created_count,
      pattern:db.prepare("SELECT pattern_index FROM community_waves WHERE id=?").get(wave).pattern_index,
      rows:db.prepare("SELECT count(*) n FROM community_members WHERE run_id=?").get(run).n,
      status:db.prepare("SELECT status FROM community_waves WHERE id=?").get(wave).status,
      lease:db.prepare("SELECT lease_token FROM community_runs WHERE id=?").get(run).lease_token,
    }),
    close:()=>db.close(),
  };
}

test("real new member increments counter exactly once and completes the due wave",async()=>{
  const f=fixture();
  try{
    await f.advance();
    assert.deepEqual(f.counts(),{wave:1,pattern:1,rows:1,status:"complete",lease:null});
    await f.advance();
    assert.deepEqual(f.counts(),{wave:1,pattern:1,rows:1,status:"complete",lease:null});
    assert.equal(f.calls.cleanups,2);
  } finally {f.close();}
});

test("ignored duplicate member never advances wave count or falsely marks complete",async()=>{
  const f=fixture({duplicate:true});
  try{
    const before=f.counts();
    await f.advance();
    const after=f.counts();
    assert.equal(before.wave,0);
    assert.deepEqual(after,{wave:0,pattern:0,rows:1,status:"running",lease:null});
    await f.advance();
    assert.deepEqual(f.counts(),after,"retries cannot fabricate a completed wave");
    assert.equal(f.calls.cleanups,2);
  } finally {f.close();}
});

for(const index of [0,1]){
  test("D1 failure at wave batch step "+index+" rolls back both member and count",async()=>{
    const f=fixture({storageFailure:index});
    try{
      await assert.rejects(()=>f.advance(),/simulated write outage/);
      assert.deepEqual(f.counts(),{wave:0,pattern:0,rows:0,status:"running",lease:null});
      assert.equal(f.calls.cleanups,1);
    } finally {f.close();}
  });
  test("unconfirmed D1 receipt at wave batch step "+index+" refuses accepted progress claim",async()=>{
    const f=fixture({ackFailure:index});
    try{
      await assert.rejects(()=>f.advance(),/community_wave_write_unconfirmed/);
      const count=f.counts();
      assert.equal(count.wave,1,"a committed batch may precede its lost acknowledgement");
      assert.equal(count.rows,1);
      assert.equal(count.lease,null);
      // The next pass sees a completed wave, so it cannot duplicate the member.
      await f.advance();
      assert.equal(f.counts().rows,1);
    } finally {f.close();}
  });
}

test("paused run cannot progress or silently lease a member",async()=>{
  const f=fixture({paused:true});
  try{
    await f.advance();
    assert.deepEqual(f.counts(),{wave:0,pattern:0,rows:0,status:"running",lease:null});
    assert.equal(f.calls.batch,0);
  }finally{f.close();}
});

test("stale control version between lease and insert cannot advance wave",async()=>{
  const f=fixture({afterClaimRace:true});
  try{
    await f.advance();
    assert.deepEqual(f.counts(),{wave:0,pattern:0,rows:0,status:"running",lease:null});
    assert.equal(f.calls.cleanups,1);
  }finally{f.close();}
});
