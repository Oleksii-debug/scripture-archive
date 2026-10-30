import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

// Execute the canonical public GET route, not a reimplemented validator.
// Only the disposable D1 and Cloudflare module imports are controlled.
const source = readFileSync(new URL("../app/api/content/route.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal(compiled.diagnostics?.length ?? 0, 0);

function harness(row) {
  const calls = { prepare: 0, first: 0, auth: 0, batches: 0 };
  const db = {
    prepare(sql) {
      calls.prepare++;
      assert.match(sql, /FROM site_content WHERE key='public'/);
      return { async first() { calls.first++; return row; } };
    },
    async batch() { calls.batches++; throw Error("public GET must never write"); },
  };
  const exports = {};
  vm.runInNewContext(compiled.outputText, {
    exports, Request, Response, URL,
    require(name) {
      if (name === "cloudflare:workers") return {env:{DB:db}};
      if (name === "../../../lib/auth") return {
        authenticateRequest: async () => { calls.auth++; throw Error("public GET must not authenticate"); },
        isVerifiedOwner: () => false,
        sameOrigin: () => false,
      };
      throw Error("unexpected import: " + name);
    },
  });
  return {
    calls,
    async read() {
      const response = await exports.GET(new Request("https://scripture.test/api/content"));
      return { response, data: await response.json() };
    },
  };
}

const published = {
  updates: [],
  text: {},
  liveNote: {uk:"Українською",ru:"По-русски",en:"English"},
};
test("valid original three-language public content survives with D1 publication timestamp", async()=>{
  const h = harness({data:JSON.stringify(published),updated_at:"2026-10-30 13:00:00"});
  const {response,data} = await h.read();
  assert.equal(response.status,200);
  assert.deepEqual(data,{...published,updatedAt:"2026-10-30 13:00:00"});
  assert.equal(h.calls.prepare,1);
  assert.equal(h.calls.first,1);
  assert.equal(h.calls.auth,0);
  assert.equal(h.calls.batches,0);
});
test("valid historical public JSON object remains compatible",async()=>{
  const h=harness({data:JSON.stringify({liveNote:{uk:"Збережено"}}),updated_at:"2026-10-30"});
  const {response,data}=await h.read();
  assert.equal(response.status,200);
  assert.equal(data.liveNote.uk,"Збережено");
  assert.equal(data.updatedAt,"2026-10-30");
});
test("absent public publication remains a valid empty response",async()=>{
  const h=harness(null);
  const {response,data}=await h.read();
  assert.equal(response.status,200);
  assert.deepEqual(data,{updates:[],text:{},liveNote:{uk:"",ru:"",en:""}});
});

const corruptRoots = [
  ["JSON null","null"],
  ["false","false"],
  ["true","true"],
  ["number zero","0"],
  ["number positive","17"],
  ["empty string",JSON.stringify("")],
  ["forged character-index string",JSON.stringify("private-looking-data")],
  ["empty array","[]"],
  ["array of words",'["fake","publication"]'],
  ["array of objects",'[{"liveNote":{"uk":"fake"}}]'],
  ["malformed JSON",'{malformed'],
  ["truncated JSON",'{"updates":'],
];
for (const [label,payload] of corruptRoots) {
  test("corrupt published content "+label+" fails closed without any partial 200",async()=>{
    const h=harness({data:payload,updated_at:"2026-10-30 13:00:00"});
    const {response,data}=await h.read();
    assert.equal(response.status,503,label);
    assert.deepEqual(data,{error:"content_unavailable"},label);
    assert.match(response.headers.get("cache-control"),/no-store, private/);
    assert.equal(h.calls.first,1);
    assert.equal(h.calls.auth,0);
    assert.equal(h.calls.batches,0);
  });
}
for (const [label, row] of [
  ["missing data",{updated_at:"2026-10-30"}],
  ["null data",{data:null,updated_at:"2026-10-30"}],
  ["typed object data",{data:{updates:[]},updated_at:"2026-10-30"}],
  ["number data",{data:8,updated_at:"2026-10-30"}],
  ["missing timestamp",{data:"{}"}],
  ["null timestamp",{data:"{}",updated_at:null}],
  ["number timestamp",{data:"{}",updated_at:123}],
  ["blank timestamp",{data:"{}",updated_at:"    "}],
]) {
  test("corrupt D1 publication metadata "+label+" does not claim success",async()=>{
    const h=harness(row);
    const {response,data}=await h.read();
    assert.equal(response.status,503,label);
    assert.deepEqual(data,{error:"content_unavailable"});
    assert.match(response.headers.get("cache-control"),/no-store, private/);
    assert.equal(h.calls.auth,0);
    assert.equal(h.calls.batches,0);
  });
}
