import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

// Call the current canonical TypeScript account endpoints, not copied ACK logic.
const catalog = JSON.parse(readFileSync(new URL("../public/data/catalog.json", import.meta.url), "utf8"));
const source = readFileSync(new URL("../app/api/account/route.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal(compiled.diagnostics?.length ?? 0, 0);

function harness(mode, { readFailure = false } = {}) {
  const calls = { run: 0, first: 0, bound: [] };
  const database = { prepare() {
    return { bind(...values) {
      calls.bound.push(values);
      return {
        async run() {
          calls.run++;
          if (mode === "throw") throw Error("simulated D1 failure after uncertain write");
          if (mode === "missing") return { success: true };
          if (mode === "false") return { success: false, meta: { changes: 1 } };
          if (mode === "zero") return { success: true, meta: { changes: 0 } };
          if (mode === "negative") return { success: true, meta: { changes: -1 } };
          if (mode === "not-an-integer") return { success: true, meta: { changes: "1" } };
          if (mode === "null-changes") return { success: true, meta: { changes: null } };
          if (mode === "boolean-changes") return { success: true, meta: { changes: true } };
          return { success: true, meta: { changes: 1 } };
        },
        async first() {
          calls.first++;
          if (readFailure) throw Error("simulated profile read failure");
          return { first_name: "Ada", last_name: "Reader", locale: "uk" };
        },
      };
    } };
  } };
  const exports = {};
  vm.runInNewContext(compiled.outputText, {
    exports, Request, Response, URL,
    require(specifier) {
      if (specifier === "cloudflare:workers") return { env: { DB: database } };
      if (specifier === "../../../public/data/catalog.json") return { default: catalog };
      if (specifier === "../../../content/mission-abraham.json") return { default: { tasks: [] } };
      if (specifier === "../../../lib/auth") return {
        sameOrigin: request => request.headers.get("origin") === new URL(request.url).origin,
        authenticateRequest: async () => ({
          userId: "reader-a", email: "reader@example.invalid", emailVerified: true,
          provider: "password", fullName: "Ada Reader",
        }),
        isVerifiedOwner: () => false,
      };
      throw Error("unexpected import " + specifier);
    },
  });
  async function invoke(action, overridePayload = undefined) {
    const payload = action === "reading"
      ? { reading: [{ book: "GEN", chapter: 1, title: "Genesis" }] }
      : action === "visibility"
        ? { firstName: true, lastName: false, church: false, progress: true, community: true }
        : action === "sensitive-consent"
          ? { acceptSensitive: true, tradition: "protestant", denomination: "Test", church: "Fixture" }
        : { firstName: "Ada", lastName: "Reader", ageRange: "18-24",
            acceptPrivacy: true, acceptSensitive: false, locale: "uk" };
    const request = new Request("https://archive.invalid/api/account?action=" + action, {
      method: "POST",
      headers: { Origin: "https://archive.invalid", "Content-Type": "application/json" },
      body: JSON.stringify(overridePayload === undefined ? payload : overridePayload),
    });
    const response = await exports.POST(request);
    return { status: response.status, body: await response.json(), cache: response.headers.get("cache-control") };
  }
  return { invoke, calls };
}

for (const action of ["reading", "visibility", "profile", "sensitive-consent"]) {
  test(action + ": valid confirmed D1 write and readback retain success", async () => {
    const h = harness("ok");
    const outcome = await h.invoke(action);
    assert.equal(outcome.status, 200);
    assert.equal(h.calls.run, 1);
    assert.match(outcome.cache, /no-store, private/);
    if (action === "reading") assert.equal(outcome.body.ok, true);
    else assert.equal(outcome.body.user.id, "reader-a");
  });

  for (const mode of ["missing", "false", "negative", "not-an-integer", "null-changes", "boolean-changes", "throw", "zero"]) {
    test(action + ": never acknowledges an unconfirmed D1 write (" + mode + ")", async () => {
      const h = harness(mode);
      const outcome = await h.invoke(action);
      const expectedStatus = (action === "visibility" || action === "sensitive-consent") && mode === "zero" ? 409 : 503;
      assert.equal(outcome.status, expectedStatus);
      assert.equal("ok" in outcome.body, false);
      assert.equal("user" in outcome.body, false);
      assert.match(outcome.cache, /no-store, private/);
      assert.equal(h.calls.run, 1);
      if (mode !== "zero" || (action !== "visibility" && action !== "sensitive-consent")) assert.equal(h.calls.first, 0);
    });
  }
}

for (const action of ["visibility", "profile", "sensitive-consent"]) {
  test(action + ": post-write profile read failure does not claim successful persistence", async () => {
    const h = harness("ok", { readFailure: true });
    const outcome = await h.invoke(action);
    assert.equal(outcome.status, 503);
    assert.equal("user" in outcome.body, false);
    assert.match(outcome.cache, /no-store, private/);
  });
}

// Real route input-integrity regression: consent is only accepted for data
// whose exact authored text can be persisted, never shortened or coerced.
const consentBaseline = {acceptSensitive:true,tradition:'protestant',denomination:'Test',church:'Fixture'};
for (const field of ['tradition','denomination','church']) {
  for (const [kind,value] of [
    ['boolean',true],['number',42],['array',['wrong']],
    ['object',{value:'wrong'}],
    ['overlong', 'Ж'.repeat(field==='tradition'?41:161)],
  ]) {
    test('sensitive-consent rejects '+field+' '+kind+' without a D1 write',async()=>{
      const h=harness('ok');
      const result=await h.invoke('sensitive-consent',{...consentBaseline,[field]:value});
      assert.equal(result.status,400,field+' '+kind+' '+JSON.stringify(result.body));
      assert.equal(result.body.error,'invalid_profile_field');
      assert.equal(h.calls.run,0,'invalid consent metadata cannot write to D1');
      assert.equal(h.calls.first,0,'invalid consent metadata cannot read a saved profile');
    });
  }
}
for (const [label,metadata] of [
  ['omitted',{}],
  ['explicit null',{tradition:null,denomination:null,church:null}],
]) {
  test('sensitive-consent accepts '+label+' optional metadata',async()=>{
    const h=harness('ok');
    const result=await h.invoke('sensitive-consent',{acceptSensitive:true,...metadata});
    assert.equal(result.status,200,JSON.stringify(result.body));
    assert.equal(h.calls.run,1);
    assert.equal(h.calls.first,1);
  });
}
test('sensitive-consent accepts and saves Unicode exact 160-character fields',async()=>{
  const h=harness('ok');
  const result=await h.invoke('sensitive-consent',{
    ...consentBaseline,denomination:'Д'.repeat(160),church:'Ц'.repeat(160),
  });
  assert.equal(result.status,200,JSON.stringify(result.body));
  assert.equal(h.calls.run,1);
  assert.equal(h.calls.first,1);
  assert.equal(h.calls.bound[0][3],'Д'.repeat(160),'denomination must remain exact');
  assert.equal(h.calls.bound[0][4],'Ц'.repeat(160),'church must remain exact');
});
test('sensitive-consent withdrawal remains possible with stale malformed metadata',async()=>{
  const h=harness('ok');
  const result=await h.invoke('sensitive-consent',{
    acceptSensitive:false,tradition:['bad'],denomination:42,church:{stale:true},
  });
  assert.equal(result.status,200,JSON.stringify(result.body));
  assert.equal(h.calls.run,1,'sensitive-consent withdrawal must reach canonical D1');
  assert.equal(h.calls.first,1);
});
