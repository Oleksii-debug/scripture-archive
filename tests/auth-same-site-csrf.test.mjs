import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Exercise the real shared auth authority and its canonical HTTP route.
// A sibling subdomain is "same-site" to the browser, never "same-origin".
function compile(path) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    reportDiagnostics: true,
  });
  assert.equal(result.diagnostics?.length ?? 0, 0);
  return result.outputText;
}

const checks = { dbReads: 0 };
const env = { DB: { prepare() { checks.dbReads++; throw Error("unexpected database access"); } } };
const auth = {};
vm.runInNewContext(compile("../lib/auth.ts"), {
  exports: auth, require(id) {
    if (id === "cloudflare:workers") return { env };
    throw Error("unexpected auth dependency: " + id);
  },
  URL, Request, Response, crypto, TextEncoder, Uint8Array, btoa, atob,
});
const route = {};
vm.runInNewContext(compile("../app/api/auth/route.ts"), {
  exports: route, require(id) {
    if (id === "cloudflare:workers") return { env };
    if (id.endsWith("/lib/auth")) return auth;
    if (id.endsWith("/lib/email")) return { sendSecurityEmail() { throw Error("unexpected email"); } };
    throw Error("unexpected route dependency: " + id);
  },
  URL, Request, Response, crypto,
});

function request(origin, site) {
  return new Request("https://scripture-archive.com/api/auth?action=unknown", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(origin === null ? {} : { Origin: origin }),
      ...(site === null ? {} : { "Sec-Fetch-Site": site }),
    },
    body: "{}",
  });
}

test("cross-subdomain same-site request without Origin fails the shared CSRF guard", () => {
  assert.equal(auth.sameOrigin(request(null, "same-site")), false);
});

test("same-site header is never a substitute for same-origin, even with claimed Origin", () => {
  assert.equal(auth.sameOrigin(request("https://scripture-archive.com", "same-site")), false);
  assert.equal(auth.sameOrigin(request("https://untrusted.scripture-archive.com", "same-site")), false);
});

test("same-origin calls and nonbrowser legacy calls preserve their existing behavior", () => {
  assert.equal(auth.sameOrigin(request("https://scripture-archive.com", "same-origin")), true);
  assert.equal(auth.sameOrigin(request(null, "same-origin")), true);
  assert.equal(auth.sameOrigin(request(null, null)), true);
  assert.equal(auth.sameOrigin(request(null, "none")), true);
});

test("foreign Origin, cross-site and malformed site metadata are denied", () => {
  assert.equal(auth.sameOrigin(request("https://untrusted.example", "same-origin")), false);
  assert.equal(auth.sameOrigin(request(null, "cross-site")), false);
  assert.equal(auth.sameOrigin(request(null, "SAME-ORIGIN")), false);
});

test("actual POST route blocks sibling-origin CSRF before touching account storage", async () => {
  checks.dbReads = 0;
  for (const candidate of [request(null, "same-site"), request("https://untrusted.scripture-archive.com", "same-site")]) {
    const response = await route.POST(candidate);
    assert.equal(response.status, 403);
    assert.equal((await response.json()).error, "cross_origin_request");
    assert.equal(response.headers.get("set-cookie"), null);
  }
  assert.equal(checks.dbReads, 0);
  const sameOriginResponse = await route.POST(request("https://scripture-archive.com", "same-origin"));
  assert.equal(sameOriginResponse.status, 400);
  assert.equal((await sameOriginResponse.json()).error, "unknown_action");
});
