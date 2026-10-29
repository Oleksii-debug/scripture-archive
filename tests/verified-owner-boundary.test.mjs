import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

const read = path => readFile(new URL("../" + path, import.meta.url), "utf8");

test("owner identity must be independently verified, never merely name-matched", async () => {
  // Exercise the real TypeScript helper without a Cloudflare connection.
  const source = await read("lib/auth.ts");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exported = {};
  vm.runInNewContext(compiled, {
    exports: exported,
    require(id) {
      if (id === "cloudflare:workers") return { env: {} };
      throw Error("Unexpected module " + id);
    },
    TextEncoder,
  });
  const identity = (email, verified, provider = "password") => ({
    userId: "disposable", fullName: null, email, emailVerified: verified, provider,
  });
  const ownerEmail = exported.OWNER_EMAIL;
  assert.equal(exported.isVerifiedOwner(null), false);
  assert.equal(exported.isVerifiedOwner(undefined), false);
  assert.equal(exported.isVerifiedOwner(identity(ownerEmail, false)), false);
  assert.equal(exported.isVerifiedOwner(identity(ownerEmail, true, "agent")), false);
  assert.equal(exported.isVerifiedOwner(identity("other@example.invalid", true)), false);
  assert.equal(exported.isVerifiedOwner(identity(ownerEmail, true)), true);
  assert.equal(exported.isVerifiedOwner(identity(ownerEmail.toUpperCase(), true, "chatgpt")), true);
});

test("all owner-only entrypoints use the verified owner predicate", async () => {
  const [account, analytics, community, content, materials] = await Promise.all([
    read("app/api/account/route.ts"),
    read("app/api/analytics/route.ts"),
    read("app/api/community/route.ts"),
    read("app/api/content/route.ts"),
    read("app/api/materials/route.ts"),
  ]);
  assert.match(account, /isOwner:isVerifiedOwner\(id\)/);
  assert.match(account, /action==="users".*!isVerifiedOwner\(id\)/);
  assert.match(analytics, /if \(!isVerifiedOwner\(identity\)\)/);
  assert.equal((community.match(/if \(!isVerifiedOwner\(identity\)\)/g) || []).length, 2);
  assert.equal((content.match(/!isVerifiedOwner\(identity\)/g) || []).length, 3);
  assert.match(materials, /visibility = isVerifiedOwner\(identity\) && body.visibility === "public"/);
  for (const [path, source] of [
    ["account", account], ["analytics", analytics], ["community", community], ["content", content], ["materials", materials],
  ]) {
    assert.doesNotMatch(source, /email\s*(?:===|!==)\s*(?:OWNER|OWNER_EMAIL)/, path + " cannot rely on email alone");
  }
});
