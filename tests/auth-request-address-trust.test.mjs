import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Execute the actual canonical rate-limit identity selector in lib/auth.ts.
// Do not copy its logic into a test helper: hostile X-Forwarded-For data must
// not create free new login, registration or recovery throttle buckets.
const source = readFileSync(new URL("../lib/auth.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal(compiled.diagnostics?.length ?? 0, 0);
const exports = {};
vm.runInNewContext(compiled.outputText, {
  exports, URL, TextEncoder, crypto, atob, btoa,
  require(specifier) {
    if (specifier === "cloudflare:workers") return { env: {} };
    throw new Error("Unexpected module: " + specifier);
  },
});

function selected(edgeIp, forwardedIp) {
  const headers = {};
  if (edgeIp !== null) headers["CF-Connecting-IP"] = edgeIp;
  if (forwardedIp !== null) headers["X-Forwarded-For"] = forwardedIp;
  const request = new Request("https://scripture-archive.com/api/auth?action=login", { headers });
  return exports.requestAddress(request);
}

const spoofedForwardedOnly = [
  "203.0.113.1", "203.0.113.2", "198.51.100.1", "192.0.2.10",
  "8.8.8.8", "1.1.1.1", "::1", "2001:db8::1",
  "10.0.0.1, 203.0.113.1", "127.0.0.1", "unknown", "invalid",
];
for (const forwarded of spoofedForwardedOnly) {
  test("client-controlled forwarded address cannot create bucket: " + forwarded, () => {
    assert.equal(selected(null, forwarded), "unknown");
  });
}

const trustedEdgeCases = [
  ["203.0.113.1", "203.0.113.1"],
  ["203.0.113.2", "203.0.113.2"],
  ["198.51.100.1", "198.51.100.1"],
  ["192.0.2.10", "192.0.2.10"],
  ["8.8.8.8", "8.8.8.8"],
  ["1.1.1.1", "1.1.1.1"],
  ["127.0.0.1", "127.0.0.1"],
  ["10.0.0.1", "10.0.0.1"],
  ["0.0.0.0", "0.0.0.0"],
  ["255.255.255.255", "255.255.255.255"],
  ["::1", "::1"],
  ["2001:db8::1", "2001:db8::1"],
  ["2001:0DB8:0000:0000::0001", "2001:db8::1"],
  ["fe80::1", "fe80::1"],
  ["::", "::"],
];
for (const [edge, expected] of trustedEdgeCases) {
  test("trusted Cloudflare IP wins over forged forwarded IP: " + edge, () => {
    assert.equal(selected(edge, "198.51.100.240, 203.0.113.99"), expected);
    assert.equal(selected(edge, null), expected);
  });
}

const invalidEdgeCases = [
  "", "unknown", "example.invalid", "999.1.2.3", "256.0.0.1",
  "192.0.2", "192.0.2.1:443", "192.0.2.01", "001.2.3.4",
  "192.0.2.1,198.51.100.2", ":::", "2001:::1", "2001:db8::zz",
  "2001:db8::1:2:3:4:5:6:7", "[::1]", "::ffff:999.0.2.1",
  "a".repeat(100),
];
for (const edge of invalidEdgeCases) {
  test("malformed edge metadata cannot manufacture a bucket: " + edge, () => {
    assert.equal(selected(edge, "203.0.113.123"), "unknown");
  });
}

test("valid IPv6 aliases share the same throttling identity", () => {
  assert.equal(selected("2001:db8::1", "198.51.100.2"),
    selected("2001:0DB8:0000:0000::0001", "203.0.113.2"));
});
test("no edge or forwarded metadata uses a shared bounded fallback", () => {
  assert.equal(selected(null, null), "unknown");
});
