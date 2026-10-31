import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Execute the real checked-in TypeScript auth helper. No parallel cookie parser.
const source = readFileSync(new URL("../lib/auth.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal(compiled.diagnostics?.length ?? 0, 0);
const methods = {};
let reads = 0;
const db = { prepare() { reads++; throw Error("ambiguous cookie reached D1"); } };
vm.runInNewContext(compiled.outputText, {
  exports: methods, TextEncoder, URL, Request, Response, crypto, atob, btoa,
  require(id) {
    if (id === "cloudflare:workers") return { env: { DB: db } };
    throw Error("Unknown auth dependency: " + id);
  },
});
const request = cookie => new Request("https://archive.example.invalid/api/account?action=me",
  { headers: { cookie } });

test("single canonical session with encoded equals retains its exact token", () => {
  const cookies = methods.parseCookies(request("sa_session=token%3Da%3Db; theme=dark"));
  assert.equal(cookies.get("sa_session"), "token=a=b");
  assert.equal(cookies.get("theme"), "dark");
});

for (const cookie of [
  "sa_session=real; sa_session=impostor",
  "sa_session=impostor; sa_session=real",
  "sa_session=real; sa_session=real",
  "sa_session=%XX; sa_session=real",
  "sa_session=real; sa_session=%XX",
]) {
  test("ambiguous session fails closed: " + cookie, async () => {
    const r = request(cookie);
    assert.equal(methods.parseCookies(r).has("sa_session"), false);
    assert.equal(await methods.authenticateRequest(r), null);
    await assert.rejects(methods.revokeCurrentSession(r), /ambiguous_session_cookie/);
    assert.equal(reads, 0, "no auth or revocation D1 query on ambiguous identity");
  });
}

test("duplicate agent and guest cookies cannot become an arbitrary identity", () => {
  const cookies = methods.parseCookies(request(
    "sa_agent=first; sa_agent=second; sa_guest=old; sa_guest=new; sa_session=unique"));
  assert.equal(cookies.has("sa_agent"), false);
  assert.equal(cookies.has("sa_guest"), false);
  assert.equal(cookies.get("sa_session"), "unique");
});

test("unrelated repeated preference cookies do not suppress one unambiguous session", () => {
  const cookies = methods.parseCookies(request(
    "theme=dark; sa_session=live; theme=light; tracking=ok"));
  assert.equal(cookies.has("theme"), false);
  assert.equal(cookies.get("sa_session"), "live");
  assert.equal(cookies.get("tracking"), "ok");
});

test("malformed unrelated cookie and ignored fragments do not change session meaning", () => {
  const cookies = methods.parseCookies(request(
    "not-a-pair; broken=%ZZ; sa_session=valid%3Dtoken; other=x=y"));
  assert.equal(cookies.get("sa_session"), "valid=token");
  assert.equal(cookies.get("other"), "x=y");
  assert.equal(cookies.has("broken"), false);
});

test("absent session remains an idempotent anonymous logout", async () => {
  await methods.revokeCurrentSession(request("theme=dark"));
  assert.equal(reads, 0);
});
