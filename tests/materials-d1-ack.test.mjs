import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

// Real production handler + actual SQLite constraints, disposable and offline.
const source = readFileSync(new URL("../app/api/materials/route.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const valid = { title: "Real draft", prompt: "Which verse?", reference: "GEN 12",
  explanation: "Source based explanation", answer: "first", options: ["first", "second"], locale: "uk" };

function fixture() {
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE study_materials (
    id TEXT PRIMARY KEY, owner_user_id TEXT NOT NULL, title TEXT NOT NULL, locale TEXT NOT NULL,
    data TEXT NOT NULL, visibility TEXT NOT NULL DEFAULT 'private',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  let ack = "normal", afterOwnerRead = null, prepareFailure = null, deleteAck = "normal";
  const D1 = { prepare(sql) {
    if (prepareFailure && sql.startsWith(prepareFailure)) throw Error("disposable D1 prepare failure");
    const statement = (...args) => ({
      async first() {
        const row = db.prepare(sql).get(...args) || null;
        if (sql.startsWith("SELECT owner_user_id") && afterOwnerRead) {
          const callback = afterOwnerRead; afterOwnerRead = null; callback();
        }
        return row;
      },
      async all() { return { success: true, results: db.prepare(sql).all(...args) }; },
      async run() {
        const result = db.prepare(sql).run(...args);
        if (sql.startsWith("DELETE FROM study_materials") && deleteAck !== "normal") {
          const mode = deleteAck; deleteAck = "normal";
          if (mode === "missing") return { success: true, meta: {} };
          if (mode === "negative") return { success: true, meta: { changes: -1 } };
          if (mode === "text") return { success: true, meta: { changes: "1" } };
          if (mode === "boolean") return { success: true, meta: { changes: true } };
          if (mode === "null") return { success: true, meta: { changes: null } };
          return { success: false, meta: { changes: Number(result.changes) } };
        }
        if (sql.startsWith("INSERT INTO study_materials") && ack !== "normal") {
          const mode = ack; ack = "normal";
          if (mode === "missing") return { success: true, meta: {} };
          if (mode === "negative") return { success: true, meta: { changes: -1 } };
          if (mode === "text") return { success: true, meta: { changes: "1" } };
          if (mode === "boolean") return { success: true, meta: { changes: true } };
          if (mode === "null") return { success: true, meta: { changes: null } };
          return { success: false, meta: { changes: Number(result.changes) } };
        }
        return { success: true, meta: { changes: Number(result.changes) } };
      },
    });
    return { bind: (...args) => statement(...args), ...statement() };
  } };
  const exported = {};
  vm.runInNewContext(compiled.outputText, {
    exports: exported, Request, Response, URL, crypto,
    require(id) {
      if (id === "cloudflare:workers") return { env: { DB: D1 } };
      if (id.endsWith("lib/auth")) return {
        isVerifiedOwner: identity => Boolean(identity && identity.emailVerified && identity.provider !== "agent" &&
          identity.email?.toLowerCase() === "dordiaioleksii1@gmail.com"),
        authenticateRequest: async request => {
          const userId = request.headers.get("x-user");
          return userId ? { userId, email: userId + "@example.invalid", emailVerified: true, provider: "password" } : null;
        },
        sameOrigin: request => request.headers.get("origin") === new URL(request.url).origin,
      };
      throw Error("unexpected module " + id);
    },
  });
  const base = "https://test.invalid";
  async function post(data = valid, user = "alice", origin = base) {
    const request = new Request(base + "/api/materials", {
      method: "POST", headers: { origin, "x-user": user, "content-type": "application/json" },
      body: JSON.stringify(data),
    });
    const response = await exported.POST(request);
    return { status: response.status, body: await response.json() };
  }
  async function get(mine = false, user = "") {
    const request = new Request(base + "/api/materials" + (mine ? "?mine=1" : ""), {
      headers: user ? { "x-user": user } : {},
    });
    const response = await exported.GET(request);
    return { status: response.status, body: await response.json() };
  }
  async function remove(id = "draft", user = "alice") {
    const request = new Request(base + "/api/materials?id=" + encodeURIComponent(id), {
      method: "DELETE", headers: { origin: base, "x-user": user },
    });
    const response = await exported.DELETE(request);
    return { status: response.status, body: await response.json() };
  }
  return { db, post, get, remove,
    setAck(mode) { ack = mode; },
    setDeleteAck(mode) { deleteAck = mode; },
    setPrepareFailure(prefix) { prepareFailure = prefix; },
    afterOwnerRead(fn) { afterOwnerRead = fn; },
  };
}

test("saved material ACK represents a committed owner-conditional write", async () => {
  const f = fixture();
  try {
    assert.equal((await f.post(valid, "alice", "https://attacker.invalid")).status, 403);
    // Only a verified owner may even attempt publication, and every publication
    // still requires independent editorial review; ordinary draft saves are private.
    assert.equal((await f.post({ ...valid, id: "synthetic-draft", visibility: "public" })).status, 403);
    const first = await f.post({ ...valid, id: "synthetic-draft" });
    assert.equal(first.status, 201);
    assert.equal(first.body.id, "synthetic-draft");
    const row = f.db.prepare("SELECT owner_user_id,visibility FROM study_materials WHERE id=?").get(first.body.id);
    assert.equal(row.owner_user_id, "alice");
    assert.equal(row.visibility, "private", "only a review can publish a new draft");
    assert.equal((await f.post({ ...valid, id: first.body.id, title: "Updated draft" })).status, 200);
    assert.equal((await f.post({ ...valid, id: first.body.id }, "bob")).status, 403);
    assert.equal((await f.get(true, "alice")).body.materials.length, 1);
  } finally { f.db.close(); }
});

test("draft builder refuses silently dropped, truncated, or overflowed choice lists before any D1 write", async () => {
  const invalid=[
    ["first","second",""],
    ["first","second",null],
    ["first","second",false],
    ["first","second",42],
    ["first","second",{}],
    ["first","second","x".repeat(501)],
    ["first","second","   "],
    ["first","second","third","fourth","fifth","sixth","seventh","eighth","ninth"],
  ];
  for (const options of invalid) {
    const f=fixture();
    try {
      const result=await f.post({...valid,id:"invalid-options",options});
      assert.equal(result.status,400,"must not save a silently changed option set");
      assert.equal(result.body.error,"invalid_material");
      assert.equal(f.db.prepare("SELECT COUNT(*) AS count FROM study_materials").get().count,0,
        "malformed choices cannot create any private draft");
    } finally { f.db.close(); }
  }
});

test("valid boundary-size choice lists keep the submitted order and answer",async()=>{
  const f=fixture();
  try {
    const options=["first","second","third","fourth","fifth","sixth","seventh","eighth"];
    const result=await f.post({...valid,id:"eight-valid-choices",options});
    assert.equal(result.status,201);
    const row=f.db.prepare("SELECT data FROM study_materials WHERE id=?").get("eight-valid-choices");
    const saved=JSON.parse(row.data);
    assert.deepEqual(saved.options,options);
    assert.equal(saved.answer,"first");
  } finally { f.db.close(); }
});

test("false and missing D1 ACKs return 503 even when SQLite completed the write", async () => {
  for (const mode of ["failed", "missing", "negative", "text", "boolean", "null"]) {
    const f = fixture();
    try {
      f.setAck(mode);
      const first = await f.post({ ...valid, id: "unknown-ack" });
      assert.equal(first.status, 503);
      assert.equal(first.body.error, "material_save_failed");
      const row = f.db.prepare("SELECT owner_user_id FROM study_materials WHERE id=?").get("unknown-ack");
      assert.equal(row.owner_user_id, "alice", "lost ACK must not fabricate a rollback");
      const retry = await f.post({ ...valid, id: "unknown-ack" });
      assert.equal(retry.status, 200, "idempotent upsert of owned draft may recover after a lost ACK");
      assert.equal(f.db.prepare("SELECT COUNT(*) AS count FROM study_materials").get().count, 1);
    } finally { f.db.close(); }
  }
});

test("a competing owner cannot steal an ID inserted after the preflight read", async () => {
  const f = fixture();
  try {
    f.afterOwnerRead(() => f.db.prepare("INSERT INTO study_materials(id,owner_user_id,title,locale,data,visibility) VALUES (?,?,?,?,?,?)")
      .run("race-id", "bob", "Bob draft", "en", JSON.stringify({}), "private"));
    const response = await f.post({ ...valid, id: "race-id" });
    assert.equal(response.status, 403);
    const row = f.db.prepare("SELECT owner_user_id,title FROM study_materials WHERE id=?").get("race-id");
    assert.equal(row.owner_user_id, "bob");
    assert.equal(row.title, "Bob draft");
  } finally { f.db.close(); }
});

test("legacy public material list redacts answer and explanation", async () => {
  const f = fixture();
  try {
    f.db.prepare("INSERT INTO study_materials(id,owner_user_id,title,locale,data,visibility) VALUES (?,?,?,?,?,?)")
      .run("legacy", "owner", "Historical", "uk", JSON.stringify(valid), "public");
    const response = await f.get();
    assert.equal(response.status, 200);
    const data = response.body.materials[0].data;
    assert.equal("answer" in data, false);
    assert.equal("explanation" in data, false);
    assert.deepEqual(data.options, ["first", "second"]);
  } finally { f.db.close(); }
});

test("corrupt legacy public materials fail closed without leaking a partial list", async () => {
  const f = fixture();
  try {
    const insert = f.db.prepare("INSERT INTO study_materials(id,owner_user_id,title,locale,data,visibility) VALUES (?,?,?,?,?,?)");
    insert.run("good", "alice", "Valid public lesson", "uk", JSON.stringify(valid), "public");
    insert.run("damaged", "alice", "Corrupted old lesson", "uk", "{broken JSON", "public");
    const result = await f.get();
    assert.equal(result.status, 503);
    assert.equal(result.body.error, "materials_unavailable");
    assert.equal("materials" in result.body, false, "no partially disclosed public list");
  } finally { f.db.close(); }
});

test("corrupt private drafts fail closed rather than rejecting with an uncaught error", async () => {
  const f = fixture();
  try {
    f.db.prepare("INSERT INTO study_materials(id,owner_user_id,title,locale,data,visibility) VALUES (?,?,?,?,?,?)")
      .run("damaged", "alice", "Private corrupt draft", "en", "null", "private");
    const result = await f.get(true, "alice");
    assert.equal(result.status, 503);
    assert.equal(result.body.error, "materials_unavailable");
    assert.equal("materials" in result.body, false);
  } finally { f.db.close(); }
});

test("unavailable D1 material query returns a controlled private 503, not a thrown 500", async () => {
  const f = fixture();
  f.db.close();
  const result = await f.get(true, "alice");
  assert.equal(result.status, 503);
  assert.equal(result.body.error, "materials_unavailable");
  assert.equal("materials" in result.body, false);
});

test("D1 prepare failure for public or private material list returns an uncacheable 503", async () => {
  for (const mine of [false, true]) {
    const f = fixture();
    try {
      f.setPrepareFailure("SELECT id,title,locale,data,visibility,updated_at");
      const response = await f.get(mine, mine ? "alice" : "");
      assert.equal(response.status, 503);
      assert.equal(response.body.error, "materials_unavailable");
      assert.equal("materials" in response.body, false);
    } finally { f.db.close(); }
  }
});

test("D1 ownership preflight failure never inserts a private draft or raises 500", async () => {
  const f = fixture();
  try {
    f.setPrepareFailure("SELECT owner_user_id FROM study_materials");
    const response = await f.post({ ...valid, id: "preflight-unavailable" });
    assert.equal(response.status, 503);
    assert.equal(response.body.error, "material_save_failed");
    assert.equal(f.db.prepare("SELECT COUNT(*) AS total FROM study_materials").get().total, 0);
  } finally { f.db.close(); }
});

test("a D1 delete prepare failure returns a stable error without losing a private draft", async () => {
  const f = fixture();
  try {
    assert.equal((await f.post({ ...valid, id: "persisted-draft" })).status, 201);
    f.setPrepareFailure("DELETE FROM study_materials");
    const response = await f.remove("persisted-draft");
    assert.equal(response.status, 503);
    assert.equal(response.body.error, "delete_failed");
    assert.equal(f.db.prepare("SELECT COUNT(*) AS total FROM study_materials").get().total, 1);
  } finally { f.db.close(); }
});

test("missing, false, or invalid D1 delete receipts never claim success", async () => {
  for (const ack of ["missing", "negative", "failed", "text", "boolean", "null"]) {
    const f = fixture();
    try {
      assert.equal((await f.post({ ...valid, id: "lost-delete-ack" })).status, 201);
      f.setDeleteAck(ack);
      const response = await f.remove("lost-delete-ack");
      assert.equal(response.status, 503);
      assert.equal(response.body.error, "delete_failed");
      // The actual SQLite deletion may have committed even if the D1 ACK was lost.
      assert.equal(f.db.prepare("SELECT COUNT(*) AS total FROM study_materials").get().total, 0);
      assert.equal((await f.remove("lost-delete-ack")).status, 200,
        "repeated delete after a failed ACK remains an idempotent no-op");
    } finally { f.db.close(); }
  }
});

test("delete preserves owner isolation and idempotence under a valid D1 receipt", async () => {
  const f = fixture();
  try {
    assert.equal((await f.post({ ...valid, id: "owned-draft" })).status, 201);
    assert.equal((await f.remove("owned-draft", "bob")).status, 200);
    assert.equal(f.db.prepare("SELECT COUNT(*) AS total FROM study_materials").get().total, 1);
    assert.equal((await f.remove("owned-draft", "alice")).status, 200);
    assert.equal((await f.remove("owned-draft", "alice")).status, 200);
    assert.equal(f.db.prepare("SELECT COUNT(*) AS total FROM study_materials").get().total, 0);
  } finally { f.db.close(); }
});


test("legacy public material response includes only the three visible exercise fields", async () => {
  const f=fixture();
  try {
    const legacy={...valid, extraComment:"not-for-display", alternateAnswer:"unpublished"};
    f.db.prepare("INSERT INTO study_materials(id,owner_user_id,title,locale,data,visibility) VALUES (?,?,?,?,?,?)")
      .run("legacy-extra", "owner", "Historic", "uk", JSON.stringify(legacy), "public");
    const result=await f.get();
    assert.equal(result.status,200);
    assert.deepEqual(JSON.parse(JSON.stringify(result.body.materials[0].data)),
      {prompt:valid.prompt,reference:valid.reference,options:valid.options});
    assert.ok(!JSON.stringify(result.body).includes("not-for-display"));
    assert.ok(!JSON.stringify(result.body).includes("unpublished"));
  }finally{f.db.close();}
});

test("invalid public legacy options reject the entire read",async()=>{
  const f=fixture();
  try{
    const insert=f.db.prepare("INSERT INTO study_materials(id,owner_user_id,title,locale,data,visibility) VALUES (?,?,?,?,?,?)");
    insert.run("good","owner","Good","uk",JSON.stringify(valid),"public");
    insert.run("bad","owner","Bad","uk",JSON.stringify({...valid,options:["one",{label:"two"}]}),"public");
    const result=await f.get();
    assert.equal(result.status,503);
    assert.equal(result.body.error,"materials_unavailable");
    assert.equal("materials" in result.body,false);
  }finally{f.db.close();}
});

test("private author view still includes the complete authored draft",async()=>{
  const f=fixture();
  try{
    f.db.prepare("INSERT INTO study_materials(id,owner_user_id,title,locale,data,visibility) VALUES (?,?,?,?,?,?)")
      .run("owned","alice","Owned draft","en",JSON.stringify(valid),"private");
    const result=await f.get(true,"alice");
    assert.equal(result.status,200);
    assert.equal(result.body.materials[0].data.answer,valid.answer);
    assert.equal(result.body.materials[0].data.explanation,valid.explanation);
  }finally{f.db.close();}
});


test("explicit oversized or malformed draft IDs cannot alias a shorter owned draft", async()=>{
  const f=fixture();try {
    const existingId="i".repeat(80);
    assert.equal((await f.post({...valid,id:existingId,title:"Original private draft"})).status,201);
    for(const id of [existingId+"suffix", existingId+"  z", 42, true, [], {}, ["other-id"]]){
      const response=await f.post({...valid,id,title:"Alias overwrite"});
      assert.equal(response.status,400,JSON.stringify(id));
      assert.equal(response.body.error,"invalid_material");
      assert.equal(f.db.prepare("SELECT title FROM study_materials WHERE id=?").get(existingId).title,"Original private draft");
      assert.equal(f.db.prepare("SELECT count(*) n FROM study_materials").get().n,1);
    }
    // Preserve regular update, new-draft UUID generation and a trim-safe ID.
    assert.equal((await f.post({...valid,id:existingId,title:"Intended update"})).status,200);
    assert.equal(f.db.prepare("SELECT title FROM study_materials WHERE id=?").get(existingId).title,"Intended update");
    assert.equal((await f.post({...valid,id:"   "})).status,201);
    assert.equal(f.db.prepare("SELECT count(*) n FROM study_materials").get().n,2);
    assert.equal((await f.post({...valid,id:"  fresh-id  "})).body.id,"fresh-id");
  }finally{f.db.close();}
});
