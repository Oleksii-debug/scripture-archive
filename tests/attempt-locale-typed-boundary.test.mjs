import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const route = readFileSync(new URL("../app/api/attempts/route.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(route, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  reportDiagnostics: true,
});
assert.equal(compiled.diagnostics?.length ?? 0, 0);

const task = {
  id: "locale-check", book: "GEN", chapter: 12, type: "single-choice", verses: [1],
  question: { uk: "Тест українською", ru: "Тест по-русски", en: "Test in English" },
  options: { uk: ["Так", "Ні"], ru: ["Да", "Нет"], en: ["Yes", "No"] },
  correct: [0], success: { uk: "Так", ru: "Да", en: "Yes" },
};
function fixture() {
  const queries = [], writes = [];
  let authCalls = 0;
  const DB = {
    prepare(sql) {
      const call = { sql, args: [] }; queries.push(call);
      return {
        bind(...args) { call.args = args; return this; },
        async first() { return { id: "read-token" }; },
      };
    },
    async batch(statements) {
      writes.push(statements);
      return [{success:true,meta:{changes:1}}, {success:true,meta:{changes:1}}, {success:true,meta:{changes:1}}];
    },
  };
  const exports = {};
  vm.runInNewContext(compiled.outputText, {
    exports, Request, Response, URL, Date, crypto,
    require(path) {
      if (path === "cloudflare:workers") return { env: { DB } };
      if (path === "../../../content/mission-abraham.json") return {
        __esModule: true, default: { id: "OT-AB-01", title: {uk:"Початок"}, intro: {}, tasks:[task] },
      };
      if (path === "../../../lib/auth") return {
        authenticateRequest: async () => { authCalls++; return { userId:"alice", provider:"password", emailVerified:true }; },
        GUEST_COOKIE:"sa_guest", guestCookie:()=>"", parseCookies:()=>new Map(),
        randomToken:()=>"", sameOrigin:r=>r.headers.get("origin")===new URL(r.url).origin,
        sha256:async()=>"",
      };
      throw Error("Unexpected import "+path);
    },
  });
  return {
    queries, writes, authCalls:()=>authCalls,
    async start(locale, { origin="https://scripture.test", extra={} }={}) {
      const req = new Request("https://scripture.test/api/attempts?action=start", {
        method:"POST", headers: {Origin:origin, "Content-Type":"application/json"},
        body: JSON.stringify({missionId:"OT-AB-01", book:"GEN",chapter:12,locale,...extra}),
      });
      const response = await exports.POST(req);
      return {status:response.status,body:await response.json(),cache:response.headers.get("cache-control")};
    },
  };
}

for (const value of [ ["en"], ["ru","en"], {locale:"en"}, {toString:"en"}, 1, 0, true, false ]) {
  test("POST start rejects non-string locale "+JSON.stringify(value)+" before D1", async () => {
    const h=fixture();
    const response=await h.start(value);
    assert.equal(response.status,400);
    assert.equal(response.body.error,"invalid_locale");
    assert.match(response.cache,/no-store/);
    assert.ok(!("task" in response.body));
    assert.equal(h.queries.length,0);
    assert.equal(h.writes.length,0);
  });
}

for (const [locale,expected] of [
  ["uk","Тест українською"], ["ru","Тест по-русски"], ["en","Test in English"],
  [null,"Тест українською"], ["","Тест українською"],
  [undefined,"Тест українською"], ["sk","Тест українською"]
]) {
  test("POST start retains approved locale/default "+String(locale),async()=>{
    const h=fixture();
    const response=await h.start(locale);
    assert.equal(response.status,201);
    assert.equal(response.body.task.question,expected);
    assert.equal(response.body.guest,false);
    assert.equal(h.queries.length,1);
    assert.match(h.queries[0].sql,/chapter_read_receipts/);
    assert.equal(h.writes.length,1);
    assert.match(response.cache,/no-store/);
  });
}

test("cross-origin is denied before locale parsing or auth/D1",async()=>{
  const h=fixture();
  const response=await h.start(["en"],{origin:"https://attacker.test"});
  assert.equal(response.status,403);
  assert.equal(response.body.error,"cross_origin_request");
  assert.equal(h.authCalls(),0);
  assert.equal(h.queries.length,0);
  assert.equal(h.writes.length,0);
});

test("valid locale does not bypass mission or chapter constraints",async()=>{
  const h=fixture();
  const response=await h.start("en",{extra:{chapter:999}});
  assert.equal(response.status,404);
  assert.equal(response.body.error,"mission_chapter_unavailable");
  assert.equal(h.queries.length,0);
  assert.equal(h.writes.length,0);
});
