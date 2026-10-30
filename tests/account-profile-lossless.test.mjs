import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

// Exercise the actual canonical account route with a fake D1 boundary.
const catalog = JSON.parse(readFileSync(new URL("../public/data/catalog.json", import.meta.url), "utf8"));
const source = readFileSync(new URL("../app/api/account/route.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal(compiled.diagnostics?.length ?? 0, 0);

function harness() {
  const writes = [];
  const DB = { prepare(sql) { return { bind(...args) {
    return {
      async run() { writes.push({ sql, args }); return { success: true, meta: { changes: 1 } }; },
      async first() { return { first_name: "Ada", last_name: "Reader", locale: "uk" }; },
    };
  } }; } };
  const exports = {};
  vm.runInNewContext(compiled.outputText, {
    exports, Request, Response, URL,
    require(name) {
      if (name === "cloudflare:workers") return { env: { DB } };
      if (name === "../../../public/data/catalog.json") return { default: catalog };
      if (name === "../../../content/mission-abraham.json") return { default: { tasks: [] } };
      if (name === "../../../lib/auth") return {
        sameOrigin: r => r.headers.get("origin") === new URL(r.url).origin,
        authenticateRequest: async () => ({ userId: "reader", email: "reader@example.invalid",
          provider: "password", emailVerified: true }),
        isVerifiedOwner: () => false,
      };
      throw Error("unexpected dependency " + name);
    },
  });
  async function post(action, body) {
    const response = await exports.POST(new Request("https://archive.invalid/api/account?action=" + action, {
      method: "POST",
      headers: { Origin: "https://archive.invalid", "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }));
    return { status: response.status, body: await response.json(),
      cache: response.headers.get("cache-control") };
  }
  return { writes, post };
}
const profile = { firstName: "Ada", lastName: "Reader", ageRange: "18-24",
  acceptPrivacy: true, acceptSensitive: false, locale: "uk" };
const consent = { acceptSensitive: true, tradition: "protestant",
  denomination: "Study group", church: "Local congregation" };

for (const [field, value] of [
  ["firstName", "А".repeat(81)],
  ["lastName", "Б".repeat(81)],
  ["ageRange", "18-24extra-long"],
  ["tradition", "orthodox" + "x".repeat(40)],
  ["maritalStatus", "single" + "x".repeat(40)],
  ["gender", "woman" + "x".repeat(30)],
  ["church", "Ц".repeat(161)],
  ["locale", "en-US"],
]) {
  test("profile must reject overlong " + field + " before any D1 mutation", async () => {
    const h = harness(), result = await h.post("profile", { ...profile, [field]: value });
    assert.equal(result.status, 400);
    assert.equal(result.body.error, "invalid_profile_field");
    assert.equal(h.writes.length, 0);
    assert.match(result.cache, /no-store, private/);
  });
}

for (const [field, value] of [
  ["tradition", "other" + "x".repeat(40)],
  ["denomination", "Д".repeat(161)],
  ["church", "Ц".repeat(161)],
]) {
  test("sensitive-consent must not silently shorten private " + field, async () => {
    const h = harness(), result = await h.post("sensitive-consent", { ...consent, [field]: value });
    assert.equal(result.status, 400);
    assert.equal(result.body.error, "invalid_profile_field");
    assert.equal(h.writes.length, 0);
  });
}

test("exact-length profile fields and intentional trim are stored without loss", async () => {
  const h = harness(), first = "І".repeat(80), last = "Ї".repeat(80),
    church = "Ц".repeat(160);
  const result = await h.post("profile", { ...profile,
    firstName: "  " + first + "  ", lastName: " " + last + " ", church });
  assert.equal(result.status, 200);
  assert.equal(h.writes.length, 1);
  assert.ok(h.writes[0].args.includes(first));
  assert.ok(h.writes[0].args.includes(last));
});

test("exact-length consent details are accepted without truncation", async () => {
  const h = harness(), denomination = "Д".repeat(160), church = "Ц".repeat(160);
  const result = await h.post("sensitive-consent", { ...consent, denomination, church });
  assert.equal(result.status, 200);
  assert.equal(h.writes.length, 1);
  assert.ok(h.writes[0].args.includes(denomination));
  assert.ok(h.writes[0].args.includes(church));
});

  
// Execute the canonical profile route and D1 bind path. Unsupported explicit
// locale input must not be rewritten to Ukrainian with a success receipt.
for (const [label, value] of [
  ['slovak code','sk'], ['unknown code','zz'], ['wrong case','UK'],
  ['array',['en']], ['boolean',true], ['number',42], ['object',{code:'en'}],
]) {
  test('explicitly selected profile locale is never silently changed: '+label,async()=>{
    const h=harness();
    const result=await h.post('profile',{...profile,locale:value});
    assert.equal(result.status,400,label+' '+JSON.stringify(result.body));
    assert.equal(result.body.error,'invalid_profile_field');
    assert.equal(h.writes.length,0,'refused locale must never mutate D1');
  });
}

for (const [label,value,expected] of [
  ['Ukrainian','uk','uk'], ['Russian','ru','ru'], ['English','en','en'],
  ['trimmed English','  en  ','en'], ['null default',null,'uk'],
  ['blank default','  ','uk'], ['omitted default',undefined,'uk'],
]) {
  test('supported or legacy default profile locale retains exact choice: '+label,async()=>{
    const h=harness();
    const payload={...profile};
    if(value===undefined)delete payload.locale;
    else payload.locale=value;
    const result=await h.post('profile',payload);
    assert.equal(result.status,200,label+' '+JSON.stringify(result.body));
    assert.equal(h.writes.length,1,'valid locale should be persisted');
    assert.equal(h.writes[0].args[9],expected,'persist the chosen canonical locale');
  });
}
