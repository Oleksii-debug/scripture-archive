import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

// Run the actual canonical content route with disposable D1/auth dependencies.
// No external services, users, or production data are accessed.
const source = readFileSync(new URL("../app/api/content/route.ts", import.meta.url), "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal(transpiled.diagnostics?.length ?? 0, 0);

function harness(mode) {
  const calls = { batch: 0, prepare: 0, bound: [] };
  const ok = { success: true, meta: { changes: 1 } };
  const DB = {
    prepare(sql) {
      calls.prepare++;
      return {
        bind(...values) {
          calls.bound.push({sql, values});
          return {
            sql, values,
            first: async () => ({ kind: "book", title: "Existing", locale: "uk", data: "{}" }),
          };
        },
      };
    },
    async batch(statements) {
      calls.batch++;
      assert.equal(statements.length, 2, "content and revision share one D1 batch");
      if (mode === "throw") throw Error("simulated D1 failure");
      if (mode === "missing") return undefined;
      if (mode === "short") return [ok];
      if (mode === "false") return [ok, { success: false, meta: { changes: 1 } }];
      if (mode === "no-changes") return [ok, { success: true, meta: { changes: 0 } }];
      if (mode === "bad-meta") return [ok, { success: true }];
      return [ok, ok];
    },
  };
  const fixtureModule = { exports: {} };
  const dependency = id => {
    if (id === "cloudflare:workers") return { env: { DB } };
    if (id.endsWith("/lib/auth")) return {
      authenticateRequest: async () => ({ userId: "owner" }),
      isVerifiedOwner: identity => identity?.userId === "owner",
      sameOrigin: req => req.headers.get("origin") === new URL(req.url).origin,
    };
    throw Error("Unexpected import " + id);
  };
  new Function("require", "module", "exports", "crypto", transpiled.outputText)(
    dependency, fixtureModule, fixtureModule.exports, { randomUUID: () => "test-generated-id" }
  );
  async function invoke(operation, origin = "https://scripture.invalid", payloadOverride = undefined, deleteId = "record") {
    const method = operation === "delete" ? "DELETE" : "PUT";
    const url = "https://scripture.invalid/api/content" + (operation === "delete" ? "?id=" + encodeURIComponent(deleteId) : "");
    const payload = operation === "upsert" ?
      { action: "upsert-item", id: "record", kind: "book", locale: "uk",
        title: "Example", status: "draft", data: { text: "Local test" } } :
      { liveNote: { uk: "Перевірка", ru: "", en: "" } };
    const request = new Request(url, {
      method, headers: { Origin: origin, "Content-Type": "application/json" },
      ...(method === "PUT" ? { body: JSON.stringify(payloadOverride === undefined ? payload : payloadOverride) } : {}),
    });
    return fixtureModule.exports[method](request);
  }
  return { invoke, calls };
}

for (const operation of ["upsert", "public-note", "delete"]) {
  test(operation + " acknowledges both content and revision writes", async () => {
    const h = harness("ok");
    const response = await h.invoke(operation);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).ok, true);
    assert.equal(h.calls.batch, 1);
  });

  for (const mode of ["missing", "short", "false", "no-changes", "bad-meta", "throw"]) {
    test(operation + " refuses incomplete D1 receipt " + mode, async () => {
      const h = harness(mode);
      const response = await h.invoke(operation);
      assert.equal(response.status, 503);
      const data = await response.json();
      assert.equal(data.error, operation === "delete" ? "content_hide_unconfirmed" : "content_save_unconfirmed");
      assert.equal(data.ok, undefined);
      assert.equal(h.calls.batch, 1);
    });
  }

  test(operation + " rejects cross-origin writes without D1 mutation", async () => {
    const h = harness("ok");
    const response = await h.invoke(operation, "https://outsider.invalid");
    assert.equal(response.status, 403);
    assert.equal(h.calls.batch, 0);
  });
}

const completedNote = {uk:"Збережено",ru:"Сохранено",en:"Saved"};
const invalidContentCommands = [
  ["empty object", {}, "invalid_content_command"],
  ["unrecognized action", {action:"upsert-ite"}, "invalid_content_command"],
  ["unsupported action", {action:"delete"}, "invalid_content_command"],
  ["null action with note", {action:null,liveNote:completedNote}, "invalid_content_command"],
  ["blank action with note", {action:"",liveNote:completedNote}, "invalid_content_command"],
  ["unknown action with note", {action:"hide-item",liveNote:completedNote}, "invalid_content_command"],
  ["no liveNote key", {preview:true}, "invalid_content_command"],
  ["scalar note", {liveNote:3}, "invalid_content_command"],
  ["string note", {liveNote:"text"}, "invalid_content_command"],
  ["boolean note", {liveNote:false}, "invalid_content_command"],
  ["null note", {liveNote:null}, "invalid_content_command"],
  ["array note", {liveNote:[]}, "invalid_content_command"],
  ["empty note", {liveNote:{}}, "invalid_content_note"],
  ["missing Ukrainian", {liveNote:{ru:"",en:""}}, "invalid_content_note"],
  ["missing Russian", {liveNote:{uk:"",en:""}}, "invalid_content_note"],
  ["missing English", {liveNote:{uk:"",ru:""}}, "invalid_content_note"],
  ["numeric Ukrainian", {liveNote:{uk:1,ru:"",en:""}}, "invalid_content_note"],
  ["numeric Russian", {liveNote:{uk:"",ru:2,en:""}}, "invalid_content_note"],
  ["numeric English", {liveNote:{uk:"",ru:"",en:3}}, "invalid_content_note"],
  ["null Ukrainian", {liveNote:{uk:null,ru:"",en:""}}, "invalid_content_note"],
  ["array Russian", {liveNote:{uk:"",ru:[],en:""}}, "invalid_content_note"],
  ["object English", {liveNote:{uk:"",ru:"",en:{text:"fake"}}}, "invalid_content_note"],
  ["empty array payload", [], "invalid_json"],
  ["array payload", [{liveNote:completedNote}], "invalid_json"],
  ["text payload", "overwrite", "invalid_json"],
  ["numeric payload", 7, "invalid_json"],
  ["zero payload", 0, "invalid_json"],
  ["boolean payload", true, "invalid_json"],
  ["false payload", false, "invalid_json"],
  ["null payload", null, "invalid_json"],
];

for (const [label, payload, expected] of invalidContentCommands) {
  test("malformed owner CMS command cannot clear published notes: " + label, async () => {
    const h = harness("ok");
    const response = await h.invoke("public-note", "https://scripture.invalid", payload);
    assert.equal(response.status, 400, label);
    assert.equal((await response.json()).error, expected, label);
    assert.equal(h.calls.batch, 0, "bad commands must cause zero D1 mutations");
  });
}

test("intentional complete three-language blank note remains a valid owner action", async () => {
  const h = harness("ok");
  const response = await h.invoke("public-note", "https://scripture.invalid", {
    liveNote:{uk:"",ru:"",en:""}
  });
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).liveNote, {uk:"",ru:"",en:""});
  assert.equal(h.calls.batch, 1);
});

test("explicit complete three-language note preserves existing authoring contract", async () => {
  const h = harness("ok");
  const response = await h.invoke("public-note", "https://scripture.invalid", {liveNote:completedNote});
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).liveNote, completedNote);
  assert.equal(h.calls.batch, 1);
});

// Exercise the real transpiled owner CMS route: the persisted note must equal
// the explicitly authorized text, never a silent 600-character prefix.
for (const locale of ["uk", "ru", "en"]) {
  test("owner CMS refuses oversized " + locale + " public note before D1", async () => {
    const h = harness("ok");
    const response = await h.invoke("public-note", "https://scripture.invalid", {
      liveNote: { ...completedNote, [locale]: "Ж".repeat(601) },
    });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error, "invalid_content_note");
    assert.equal(h.calls.batch, 0);
    assert.equal(h.calls.prepare, 0);
  });
}

test("public note accepts full 600-character Unicode boundary without clipping", async () => {
  const h = harness("ok");
  const full = "Ж".repeat(600);
  const response = await h.invoke("public-note", "https://scripture.invalid", {
    liveNote: { uk: full, ru: "Сохранено", en: "Saved" },
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).liveNote.uk, full);
  assert.equal(h.calls.batch, 1);
});

test("public note trims surrounding whitespace before enforcing limit", async () => {
  const h = harness("ok");
  const full = "Ж".repeat(600);
  const response = await h.invoke("public-note", "https://scripture.invalid", {
    liveNote: { uk: "  " + full + "  ", ru: "Сохранено", en: "Saved" },
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).liveNote.uk, full);
  assert.equal(h.calls.batch, 1);
});

test("public note refuses normalized overlimit without rewriting any language", async () => {
  const h = harness("ok");
  const response = await h.invoke("public-note", "https://scripture.invalid", {
    liveNote: { uk: "Збережено", ru: "  " + "А".repeat(601) + "  ", en: "Saved" },
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, "invalid_content_note");
  assert.equal(h.calls.batch, 0);
});

// The owner-generated immutable revision and the managed title must never
// silently differ from the editor's original title.
for (const [label, title] of [
  ["201 characters", "Ж".repeat(201)],
  ["overlimit after trimming", "  "+"Ж".repeat(201)+"  "],
]) {
  test("CMS upsert rejects "+label+" title before any D1 mutation",async()=>{
    const h=harness("ok");
    const response=await h.invoke("upsert","https://scripture.invalid",{
      action:"upsert-item",id:"record",kind:"book",locale:"uk",title,
      status:"draft",data:{text:"Author content"},
    });
    assert.equal(response.status,400);
    assert.equal((await response.json()).error,"invalid_content_item");
    assert.equal(h.calls.batch,0);
    assert.equal(h.calls.prepare,0);
  });
}

test("CMS upsert preserves the full Unicode 200-character title in D1 bind",async()=>{
  const h=harness("ok");
  const full="Ж".repeat(200);
  const response=await h.invoke("upsert","https://scripture.invalid",{
    action:"upsert-item",id:"record",kind:"book",locale:"uk",title:"  "+full+"  ",
    status:"draft",data:{text:"Author content"},
  });
  assert.equal(response.status,200);
  assert.equal(h.calls.batch,1);
  const write=h.calls.bound.find(x=>x.sql.includes("INSERT INTO managed_content"));
  assert.ok(write);
  assert.equal(write.values[3],full,"bound title is the complete authored normalized title");
});

const existingIdentity = "k".repeat(100);
const upsertWithIdentity = id => ({
  action:"upsert-item", id, kind:"book", locale:"uk",
  title:"Canonical entry", status:"draft", data:{text:"existing source"}
});
for (const [label, identity] of [
  ["101-character key", existingIdentity+"x"],
  ["101-character spaced key", " "+existingIdentity+"x "],
  ["leading ASCII whitespace alias", " record"],
  ["trailing ASCII whitespace alias", "record "],
  ["surrounded ASCII whitespace alias", " record "],
  ["leading Unicode whitespace alias", "\u00a0record"],
  ["trailing newline alias", "record\n"],
  ["numeric key", 42],
  ["array key", ["record"]],
  ["object key", {key:"record"}],
  ["boolean key", false],
]) {
  test("explicit malformed upsert identity cannot alias a saved content key: "+label, async () => {
    const h = harness("ok");
    const response = await h.invoke("upsert", "https://scripture.invalid", upsertWithIdentity(identity));
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error, "invalid_content_item");
    assert.equal(h.calls.batch, 0);
    assert.equal(h.calls.prepare, 0);
  });
}

for (const [label, identity] of [
  ["101-character key", existingIdentity+"x"],
  ["101-character spaced key", " "+existingIdentity+"x "],
  ["leading ASCII whitespace alias", " record"],
  ["trailing ASCII whitespace alias", "record "],
  ["surrounded ASCII whitespace alias", " record "],
  ["leading Unicode whitespace alias", "\u00a0record"],
  ["trailing newline alias", "record\n"],
  ["empty identity", ""],
  ["whitespace identity", "  "],
]) {
  test("invalid delete URL cannot hide an unrelated prefix-matching item: "+label, async () => {
    const h = harness("ok");
    const response = await h.invoke("delete", "https://scripture.invalid", undefined, identity);
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error, "invalid_content_id");
    assert.equal(h.calls.batch, 0);
    assert.equal(h.calls.prepare, 0, "reject before looking up a possibly different record");
  });
}

test("exactly 100-character upsert identity remains a valid existing CMS key", async () => {
  const h = harness("ok");
  const response = await h.invoke("upsert","https://scripture.invalid",upsertWithIdentity(existingIdentity));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).id, existingIdentity);
  assert.equal(h.calls.batch, 1);
});
test("exactly 100-character deletion still hides only the requested key", async () => {
  const h = harness("ok");
  const response = await h.invoke("delete","https://scripture.invalid",undefined,existingIdentity);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).ok, true);
  assert.equal(h.calls.batch, 1);
});
test("omitted upsert identity still creates a canonical UUID-backed item", async () => {
  const h = harness("ok");
  const response = await h.invoke("upsert","https://scripture.invalid",upsertWithIdentity(undefined));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).id, "test-generated-id");
  assert.equal(h.calls.batch, 1);
});

// Execute the canonical owner item upsert rather than trusting a DTO mock.
// Rejecting long titles is a content-integrity rule: a 200 response must not
// silently publish a different title than the one the editor entered.
for (const [label, title] of [
  ["201 Unicode letters", "Ї".repeat(201)],
  ["101 emoji / 202 UTF-16 units", "🙂".repeat(101)],
  ["201 after trimming", "   " + "A".repeat(201) + "   "],
]) {
  test("owner CMS refuses oversized item title before D1: " + label, async () => {
    const h = harness("ok");
    const response = await h.invoke("upsert", "https://scripture.invalid", {
      ...upsertWithIdentity("existing-cms-id"), title,
    });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error, "invalid_content_item");
    assert.equal(h.calls.batch, 0);
    assert.equal(h.calls.prepare, 0);
  });
}

for (const [label, title] of [
  ["exactly 200 Ukrainian letters", "Ї".repeat(200)],
  ["exactly 100 emoji / 200 UTF-16 units", "🙂".repeat(100)],
  ["trimmed exact-boundary title", "  " + "Ї".repeat(200) + "  "],
]) {
  test("owner CMS saves valid item title without clipping: " + label, async () => {
    const h = harness("ok");
    const response = await h.invoke("upsert", "https://scripture.invalid", {
      ...upsertWithIdentity("existing-cms-id"), title,
    });
    assert.equal(response.status, 200);
    assert.equal(h.calls.batch, 1);
  });
}
