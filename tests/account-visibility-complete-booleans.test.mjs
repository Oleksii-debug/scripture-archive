import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Execute the canonical account route: do not duplicate the visibility handler.
const source = readFileSync(new URL("../app/api/account/route.ts", import.meta.url), "utf8");
const catalog = JSON.parse(readFileSync(new URL("../public/data/catalog.json", import.meta.url), "utf8"));
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal(compiled.diagnostics?.length ?? 0, 0);

function fixture() {
  const calls = { writes: [], reads: 0 };
  const db = {
    prepare(sql) {
      return {
        bind(...values) {
          return {
            async run() {
              calls.writes.push({ sql, values });
              return { success: true, meta: { changes: 1 } };
            },
            async first() {
              calls.reads++;
              return {
                first_name: "Ada", last_name: "Reader", locale: "uk",
                sensitive_consent: 1, sensitive_consent_version: 1,
              };
            },
          };
        },
      };
    },
  };
  const exports = {};
  vm.runInNewContext(compiled.outputText, {
    exports, Request, Response, URL,
    require(spec) {
      if (spec === "cloudflare:workers") return { env: { DB: db } };
      if (spec === "../../../public/data/catalog.json") return { default: catalog };
      if (spec === "../../../content/mission-abraham.json") return { default: { tasks: [] } };
      if (spec === "../../../lib/auth") return {
        sameOrigin: () => true,
        authenticateRequest: async () => ({
          userId: "ada", email: "ada@example.invalid",
          provider: "password", emailVerified: true, fullName: "Ada Reader",
        }),
        isVerifiedOwner: () => false,
      };
      throw Error("unexpected dependency " + spec);
    },
  });
  async function post(value) {
    const response = await exports.PUT(new Request("https://example.invalid/api/account?action=visibility", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Origin: "https://example.invalid" },
      body: JSON.stringify(value),
    }));
    return { status: response.status, data: await response.json(), cache: response.headers.get("cache-control") };
  }
  return { post, calls };
}
const valid = { firstName: true, lastName: false, church: true, progress: false, community: true };
for (const key of Object.keys(valid)) {
  test("missing " + key + " refuses a partial visibility snapshot", async () => {
    const h = fixture();
    const payload = { ...valid };
    delete payload[key];
    const res = await h.post(payload);
    assert.equal(res.status, 400);
    assert.equal(res.data.error, "invalid_visibility");
    assert.equal(h.calls.writes.length, 0);
    assert.equal(h.calls.reads, 0);
  });
  for (const value of [null, 0, "true", [], {}]) {
    test("non-boolean " + key + " " + JSON.stringify(value) + " refuses a visibility write", async () => {
      const h = fixture();
      const res = await h.post({ ...valid, [key]: value });
      assert.equal(res.status, 400);
      assert.equal(res.data.error, "invalid_visibility");
      assert.equal(h.calls.writes.length, 0);
      assert.match(res.cache, /no-store, private/);
    });
  }
}
for (const value of [true, 42, "text", [], null, {}, { ...valid, extra: true }]) {
  test("malformed or unexpected visibility structure fails closed: " + JSON.stringify(value), async () => {
    const h = fixture();
    const res = await h.post(value);
    assert.equal(res.status, value === null ? 400 : 400);
    assert.equal(h.calls.writes.length, 0);
  });
}
test("community opt-in without either public name is refused before D1", async () => {
  const h=fixture(),res=await h.post({firstName:false,lastName:false,church:false,progress:false,community:true});
  assert.equal(res.status,400);
  assert.equal(res.data.error,"invalid_visibility");
  assert.equal(h.calls.writes.length,0);
});
for (const payload of [valid, { firstName: false, lastName: true, church: false, progress: true, community: false }]) {
  test("complete boolean snapshot saves exactly five intended flags", async () => {
    const h = fixture();
    const res = await h.post(payload);
    assert.equal(res.status, 200);
    assert.equal(h.calls.writes.length, 1);
    assert.deepEqual(h.calls.writes[0].values.slice(0, 5),
      [payload.firstName, payload.lastName, payload.church, payload.progress, payload.community].map(Boolean).map(Number));
    assert.equal(h.calls.writes[0].values[5], "ada");
  });
}
