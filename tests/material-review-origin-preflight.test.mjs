import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

// Execute the shipping source route, not a duplicate Origin implementation.
const source = readFileSync(new URL("../app/api/material-review/route.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal(compiled.diagnostics?.length ?? 0, 0);

test("actual review POST rejects nonempty cross-origin JSON before auth or D1", async () => {
  const calls = { auth: 0, db: 0 };
  const exports = {};
  const database = {
    prepare() {
      calls.db++;
      throw Error("cross-origin preflight must not query D1");
    },
  };
  vm.runInNewContext(compiled.outputText, {
    exports, Request, Response, URL,
    require(specifier) {
      if (specifier === "cloudflare:workers") return { env: { DB: database } };
      if (specifier === "../../../lib/auth") return {
        sameOrigin: request => request.headers.get("origin") === new URL(request.url).origin,
        authenticateRequest: async () => { calls.auth++; throw Error("no auth"); },
        isVerifiedOwner: () => false,
      };
      throw Error("unexpected dependency " + specifier);
    },
  });
  const response = await exports.POST(new Request("https://archive.invalid/api/material-review", {
    method: "POST",
    headers: { Origin: "https://attacker.invalid", "Content-Type": "application/json" },
    body: JSON.stringify({ action: "submit", materialId: "private-draft",
      provenance: "Forged source", rightsHolder: "Forged holder", rightsBasis: "original", licenseUrl: "", rightsConfirmed: true }),
  }));
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: "cross_origin_request" });
  assert.match(response.headers.get("cache-control"), /no-store/);
  assert.deepEqual(calls, { auth: 0, db: 0 });
});
