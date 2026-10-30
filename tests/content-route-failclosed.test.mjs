import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

// Execute the actual Next route code; only Cloudflare DB and session are mocked.
const source = readFileSync(new URL("../app/api/content/route.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal(compiled.diagnostics?.length ?? 0, 0);

function harness({ dbPresent = true, auth = "ok", dbMode = "ok", isOwner = false } = {}) {
  const calls = { auth: 0, prepare: 0, first: 0, all: 0 };
  const database = {
    prepare() {
      calls.prepare++;
      if (dbMode === "throw") throw Error("database interrupted");
      return {
        bind() { return this; },
        async first() {
          calls.first++;
          if (dbMode === "corrupt") return { data: "{broken json", updated_at: "now" };
          return null;
        },
        async all() {
          calls.all++;
          if (dbMode === "failed-items" && calls.all === 1 ||
              dbMode === "failed-revisions" && calls.all === 2)
            return { success: false, results: [] };
          if (dbMode === "missing-items" && calls.all === 1 ||
              dbMode === "missing-revisions" && calls.all === 2)
            return { success: true };
          if (dbMode === "object-items" && calls.all === 1 ||
              dbMode === "object-revisions" && calls.all === 2)
            return { success: true, results: { length: 0 } };
          if (dbMode === "truthy-items" && calls.all === 1 ||
              dbMode === "truthy-revisions" && calls.all === 2)
            return { success: "true", results: [] };
          if (dbMode === "with-items")
            return calls.all === 1
              ? { success: true, results: [{ id:"item-1",kind:"book",locale:"uk",title:"Example",status:"draft",data:'{"text":"Saved"}' }] }
              : { success: true, results: [{ id:"revision-1",content_key:"book:item-1",created_by:"owner" }] };
          return { success: true, results: [] };
        },
      };
    },
  };
  const exports = {};
  vm.runInNewContext(compiled.outputText, {
    exports, Request, Response, URL, crypto,
    require(specifier) {
      if (specifier === "cloudflare:workers")
        return { env: { DB: dbPresent ? database : undefined } };
      if (specifier === "../../../lib/auth") return {
        authenticateRequest: async () => {
          calls.auth++;
          if (auth === "throw") throw Error("identity D1 unavailable");
          return auth === "anonymous" ? null : { userId: "editor-one", provider: "password" };
        },
        isVerifiedOwner: () => isOwner,
        sameOrigin: request => request.headers.get("origin") === new URL(request.url).origin,
      };
      throw Error("Unexpected import: " + specifier);
    },
  });
  async function invoke(method, { admin = false, origin = "https://scripture.test" } = {}) {
    const url = "https://scripture.test/api/content" + (method === "GET" && admin ? "?admin=1" : method === "DELETE" ? "?id=one" : "");
    const request = new Request(url, {
      method,
      headers: { Origin: origin, "Content-Type": "application/json" },
      ...(method === "PUT" ? { body: JSON.stringify({liveNote:{uk:"",ru:"",en:""}}) } : {}),
    });
    const response = await exports[method](request);
    return { status: response.status, body: await response.json(), cache: response.headers.get("cache-control") };
  }
  return { invoke, calls };
}

for (const method of ["GET", "PUT", "DELETE"]) {
  test(method + " rejects absent D1 as private 503", async () => {
    const h = harness({ dbPresent: false });
    const r = await h.invoke(method);
    assert.equal(r.status, 503);
    assert.equal(r.body.error, "content_unavailable");
    assert.match(r.cache, /no-store, private/);
    assert.equal(h.calls.auth, 0);
    assert.equal(h.calls.prepare, 0);
  });
  test(method + " reports D1 interruption rather than leaking a 500", async () => {
    const h = harness({ dbMode: "throw", isOwner: true });
    const r = await h.invoke(method);
    assert.equal(r.status, 503);
    if (method !== "PUT") {
      assert.equal(r.body.error, "content_unavailable");
      assert.match(r.cache, /no-store, private/);
    } else {
      assert.equal(r.body.error, "content_save_unconfirmed");
    }
  });
}

for (const method of ["PUT", "DELETE"]) {
  test(method + " preserves cross-origin 403 before identity access", async () => {
    const h = harness({ dbPresent: false, auth: "throw" });
    const r = await h.invoke(method, { origin: "https://attacker.invalid" });
    assert.equal(r.status, 403);
    assert.equal(r.body.error, "cross_origin_request");
    assert.equal(h.calls.auth, 0);
  });
  test(method + " refuses identity-store outage with private 503 and zero DB queries", async () => {
    const h = harness({ auth: "throw" });
    const r = await h.invoke(method);
    assert.equal(r.status, 503);
    assert.equal(r.body.error, "content_unavailable");
    assert.match(r.cache, /no-store, private/);
    assert.equal(h.calls.prepare, 0);
  });
  test(method + " keeps true non-owner / anonymous authorization failure", async () => {
    const h = harness({ auth: "anonymous" });
    const r = await h.invoke(method);
    assert.equal(r.status, 403);
    assert.equal(r.body.error, "forbidden");
    assert.equal(h.calls.prepare, 0);
  });
}

test("admin content GET contains identity-store outages without DB reads", async () => {
  const h = harness({ auth: "throw" });
  const r = await h.invoke("GET", { admin: true });
  assert.equal(r.status, 503);
  assert.equal(r.body.error, "content_unavailable");
  assert.equal(h.calls.prepare, 0);
});

test("non-owner admin GET remains forbidden rather than disclosing editor content", async () => {
  const h = harness({ auth: "anonymous" });
  const r = await h.invoke("GET", { admin: true });
  assert.equal(r.status, 403);
  assert.equal(r.body.error, "forbidden");
  assert.equal(h.calls.prepare, 0);
});


for (const [dbMode,reads] of [
  ["failed-items",1],["failed-revisions",2],
  ["missing-items",1],["missing-revisions",2],
  ["object-items",1],["object-revisions",2],
  ["truthy-items",1],["truthy-revisions",2],
]) {
  test("owner CMS GET refuses unacknowledged editorial SELECT: "+dbMode,async()=>{
    const h=harness({dbMode,isOwner:true});
    const result=await h.invoke("GET",{admin:true});
    assert.equal(result.status,503);
    assert.equal(result.body.error,"content_unavailable");
    assert.ok(!("items" in result.body) && !("revisions" in result.body));
    assert.match(result.cache,/no-store, private/);
    assert.equal(h.calls.all,reads);
    assert.equal(h.calls.prepare,reads);
  });
}

test("genuinely empty owner CMS catalog remains a confirmed read",async()=>{
  const h=harness({isOwner:true});
  const result=await h.invoke("GET",{admin:true});
  assert.equal(result.status,200);
  assert.deepEqual(Array.from(result.body.items),[]);
  assert.deepEqual(Array.from(result.body.revisions),[]);
  assert.equal(h.calls.all,2);
});

test("owner CMS returns acknowledged real items and revision history unchanged",async()=>{
  const h=harness({dbMode:"with-items",isOwner:true});
  const result=await h.invoke("GET",{admin:true});
  assert.equal(result.status,200);
  assert.equal(result.body.items.length,1);
  assert.equal(result.body.items[0].data.text,"Saved");
  assert.equal(result.body.revisions.length,1);
  assert.equal(result.body.revisions[0].id,"revision-1");
  assert.equal(h.calls.all,2);
});

test("public content GET retains its empty fallback and does not require account", async () => {
  const h = harness({ auth: "throw" });
  const r = await h.invoke("GET");
  assert.equal(r.status, 200);
  assert.deepEqual(JSON.parse(JSON.stringify(r.body)), { updates: [], text: {}, liveNote: { uk: "", ru: "", en: "" } });
  assert.equal(h.calls.auth, 0);
  assert.equal(h.calls.first, 1);
});

test("corrupt public content JSON fails closed instead of exposing a framework error", async () => {
  const h = harness({ dbMode: "corrupt" });
  const r = await h.invoke("GET");
  assert.equal(r.status, 503);
  assert.equal(r.body.error, "content_unavailable");
  assert.match(r.cache, /no-store, private/);
});
