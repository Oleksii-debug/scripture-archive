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
  const calls = { batch: 0 };
  const ok = { success: true, meta: { changes: 1 } };
  const DB = {
    prepare(sql) {
      return {
        bind(...values) {
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
  async function invoke(operation, origin = "https://scripture.invalid", payloadOverride = undefined) {
    const method = operation === "delete" ? "DELETE" : "PUT";
    const url = "https://scripture.invalid/api/content" + (operation === "delete" ? "?id=record" : "");
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
