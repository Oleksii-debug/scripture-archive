import { validBookmarkTimestamp } from "../lib/bookmark-timestamp.js";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { webcrypto } from "node:crypto";
import { TextEncoder } from "node:util";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { EDITIONS } from "../public/editions.js";

const schema = readFileSync(new URL("../drizzle/0009_reader_bookmarks.sql", import.meta.url), "utf8").replaceAll("--> statement-breakpoint", "");
const source = readFileSync(new URL("../app/api/bookmarks/route.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
const catalog = JSON.parse(readFileSync(new URL("../public/data/catalog.json", import.meta.url), "utf8"));

function harness() {
  const db = new DatabaseSync(":memory:");
  db.exec(schema);
  let principal = "alice";
  const env = {DB:{
    prepare(sql) {
      const statement = db.prepare(sql);
      return {
        args: [],
        bind(...args) {this.args=args;return this;},
        async all() {return {success:true,results:statement.all(...this.args)};},
        async first() {return statement.get(...this.args) ?? null;},
        async run() {const result=statement.run(...this.args);return {success:true,meta:{changes:result.changes}};},
      };
    },
  }};
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,Request,Response,TextEncoder,crypto:webcrypto,
    require(name) {
      if (name.endsWith("lib/bookmark-timestamp.js")) return { validBookmarkTimestamp };
      if (name==="cloudflare:workers") return {env};
      if (name.endsWith("lib/auth")) return {
        authenticateRequest:async()=>principal?{userId:principal,provider:"password"}:null,
        sameOrigin:r=>r.headers.get("origin")===new URL(r.url).origin,
      };
      if (name.endsWith("public/data/catalog.json")) return {default:catalog};
      if (name.endsWith("public/editions.js")) return {EDITIONS};
      throw Error(name);
    },
  });
  const insert=(owner,edition,book,chapter,created="2026-10-30T10:00:00Z") =>
    db.prepare("INSERT INTO reader_bookmarks(user_id,edition,book,chapter,created_at) VALUES(?,?,?,?,?)").run(owner,edition,book,chapter,created);
  const rows=()=>db.prepare("SELECT rowid,* FROM reader_bookmarks ORDER BY rowid").all();
  async function send(method,body,{origin="https://scripture.test"}={}) {
    const req=new Request("https://scripture.test/api/bookmarks",{
      method,headers:{"Origin":origin,"Content-Type":"application/json"},
      ...(method==="GET"?{}:{body:JSON.stringify(body)}),
    });
    const res=await exports[method](req);
    return {status:res.status,data:await res.json()};
  }
  return {db,send,insert,rows,setUser:id=>{principal=id;},close:()=>db.close()};
}
const seed = h => {
  h.insert("alice","en-web","GEN",1);
  h.insert("alice","broken<script>","GEN",999);
  h.insert("bob","broken<script>","GEN",999);
};

test("real SQLite schema exposes separate rowids for valid and malformed bookmarks",async()=>{
  const h=harness();try {
    seed(h);
    const result=await h.send("GET");
    assert.equal(result.status,200);
    assert.equal(result.data.bookmarks.length,1);
    assert.equal(result.data.invalid_bookmarks.length,1);
    assert.equal(result.data.warning,"partial_bookmarks");
    assert.match(result.data.invalid_bookmarks[0].reference,/^[1-9][0-9]*\.[a-f0-9]{64}$/);
  }finally{h.close();}
});

test("confirmed damaged-record deletion changes exactly one row, preserving valid and foreign entries",async()=>{
  const h=harness();try{
    seed(h);
    const token=(await h.send("GET")).data.invalid_bookmarks[0].reference;
    assert.equal((await h.send("DELETE",{recovery_ref:token})).status,200);
    const rows=h.rows();
    assert.equal(rows.length,2);
    assert.ok(rows.some(r=>r.user_id==="alice"&&r.edition==="en-web"));
    assert.ok(rows.some(r=>r.user_id==="bob"&&r.edition==="broken<script>"));
  }finally{h.close();}
});

test("two principals with identical damaged values receive different row-bound references",async()=>{
  const h=harness();try{
    seed(h);
    const alice=(await h.send("GET")).data.invalid_bookmarks[0].reference;
    h.setUser("bob");
    const bob=(await h.send("GET")).data.invalid_bookmarks[0].reference;
    assert.notEqual(alice,bob);
    assert.equal((await h.send("DELETE",{recovery_ref:alice})).status,409);
    assert.equal(h.rows().length,3);
  }finally{h.close();}
});

test("reusing a deleted token cannot falsely claim a second deletion",async()=>{
  const h=harness();try{
    seed(h);
    const token=(await h.send("GET")).data.invalid_bookmarks[0].reference;
    assert.equal((await h.send("DELETE",{recovery_ref:token})).status,200);
    assert.equal((await h.send("DELETE",{recovery_ref:token})).status,409);
  }finally{h.close();}
});

test("concurrent SQLite edition correction rejects stale token and retains the updated row",async()=>{
  const h=harness();try{
    seed(h);
    const token=(await h.send("GET")).data.invalid_bookmarks[0].reference;
    h.db.prepare("UPDATE reader_bookmarks SET edition=? WHERE user_id=? AND chapter=?").run("en-web","alice",999);
    assert.equal((await h.send("DELETE",{recovery_ref:token})).status,409);
    assert.ok(h.rows().some(r=>r.user_id==="alice"&&r.edition==="en-web"&&r.chapter===999));
  }finally{h.close();}
});

test("concurrent SQLite chapter update rejects stale token without touching valid bookmark",async()=>{
  const h=harness();try{
    seed(h);
    const token=(await h.send("GET")).data.invalid_bookmarks[0].reference;
    h.db.prepare("UPDATE reader_bookmarks SET chapter=? WHERE user_id=? AND chapter=?").run(998,"alice",999);
    assert.equal((await h.send("DELETE",{recovery_ref:token})).status,409);
    assert.equal(h.rows().length,3);
  }finally{h.close();}
});

test("cross-origin recovery is denied before database mutation",async()=>{
  const h=harness();try{
    seed(h);
    const token=(await h.send("GET")).data.invalid_bookmarks[0].reference;
    assert.equal((await h.send("DELETE",{recovery_ref:token},{origin:"https://evil.test"})).status,403);
    assert.equal(h.rows().length,3);
  }finally{h.close();}
});

test("signed-out recovery is denied without altering any persisted bookmark",async()=>{
  const h=harness();try{
    seed(h);const token=(await h.send("GET")).data.invalid_bookmarks[0].reference;
    h.setUser(null);
    assert.equal((await h.send("DELETE",{recovery_ref:token})).status,401);
    assert.equal(h.rows().length,3);
  }finally{h.close();}
});

test("legacy valid bookmark removal remains scoped to the signed-in principal",async()=>{
  const h=harness();try{
    seed(h);h.insert("bob","en-web","GEN",1);
    const result=await h.send("DELETE",{edition:"en-web",book:"GEN",chapter:1});
    assert.equal(result.status,200);
    assert.equal(h.rows().filter(r=>r.edition==="en-web").length,1);
    assert.equal(h.rows().find(r=>r.edition==="en-web").user_id,"bob");
  }finally{h.close();}
});

test("special characters in stored damaged description never become SQL syntax or delete a valid row",async()=>{
  const h=harness();try{
    h.insert("alice","en-web","GEN",1);
    h.insert("alice","x' OR 1=1 --","GEN",777);
    const get=await h.send("GET");
    assert.match(get.data.invalid_bookmarks[0].description,/OR 1=1/);
    assert.equal((await h.send("DELETE",{recovery_ref:get.data.invalid_bookmarks[0].reference})).status,200);
    assert.equal(h.rows().length,1);
    assert.equal(h.rows()[0].chapter,1);
  }finally{h.close();}
});
