import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

// Execute the actual production lib/email.ts in an isolated CommonJS harness.
// Outbound email is replaced with a local response stub: no real message sent.
const source = await readFile(new URL("../lib/email.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal(compiled.diagnostics?.length ?? 0, 0);

function harness(reply, configured = true, baseOrigin = "https://scripture-archive.com") {
  const calls = [];
  const fakeFetch = async (url, options) => {
    calls.push({ url, options });
    if (reply instanceof Error) throw reply;
    return reply;
  };
  const fixtureModule = { exports: {} };
  const fakeRequire = name => {
    if (name !== "cloudflare:workers") throw Error("Unexpected import: " + name);
    return { env: {
      APP_BASE_URL: baseOrigin,
      EMAIL_API_KEY: configured ? "nonsecret-test-key" : "",
      EMAIL_FROM: configured ? "noreply@example.invalid" : "",
      SUPPORT_RECIPIENT: "support@example.invalid",
    } };
  };
  new Function("require", "module", "exports", "fetch", compiled.outputText)(
    fakeRequire, fixtureModule, fixtureModule.exports, fakeFetch
  );
  return { email: fixtureModule.exports, calls };
}

const accepted = payload => ({ ok: true, json: async () => payload });
const rejected = () => ({ ok: false, json: async () => ({ message: "rejected" }) });

test("verification and reset require a real provider message id", async () => {
  const h = harness(accepted({ id: "a12b34cd-11aa-4f40-b123-123456789012" }));
  for (const purpose of ["verify", "reset"]) {
    const result = await h.email.sendSecurityEmail(
      "person@example.invalid", "uk", purpose, "https://scripture-archive.com/account?key=test"
    );
    assert.equal(result.delivered, true);
  }
  assert.equal(h.calls.length, 2);
  for (const call of h.calls) {
    assert.equal(call.url, "https://api.resend.com/emails");
    assert.equal(call.options.method, "POST");
    assert.deepEqual(JSON.parse(call.options.body).to, ["person@example.invalid"]);
  }
});

test("a bare 2xx, error-shaped 2xx or broken provider JSON cannot claim mail acceptance", async () => {
  for (const response of [
    accepted({}), accepted({ ok: true }), accepted({ id: "" }),
    accepted({ id: "   " }), accepted({ id: 14 }),
    accepted({ id: "x".repeat(201) }), accepted([]),
    accepted({ id: "accepted-looking-id", error: { message: "provider rejected" } }),
    accepted({ id: "accepted-looking-id", errors: [{ message: "invalid sender" }] }),
    { ok: true, json: async () => { throw Error("invalid JSON"); } },
    rejected(), null, new Error("network outage"),
  ]) {
    const h = harness(response);
    const result = await h.email.sendSecurityEmail(
      "person@example.invalid", "en", "reset", "https://scripture-archive.com/account?reset=test"
    );
    assert.deepEqual(result, { delivered: false, reason: "email_provider_error" });
    assert.equal(h.calls.length, 1);
  }
});

test("support mail follows the same provider acceptance rule without exposing raw HTML", async () => {
  const input = {
    requestId: "r-test", email: "sender@example.invalid",
    subject: "<script>bad</script>", message: "Help <unsafe>!",
    locale: "uk", attachments: [],
  };
  const absent = harness(accepted({}));
  assert.equal((await absent.email.sendSupportRequestEmail(input)).delivered, false);
  const contradictory = harness(accepted({ id: "message-accepted-42", error: "rejected" }));
  assert.deepEqual(await contradictory.email.sendSupportRequestEmail(input),
    { delivered: false, reason: "email_provider_error" });
  const present = harness(accepted({ id: "message-accepted-42" }));
  assert.equal((await present.email.sendSupportRequestEmail(input)).delivered, true);
  assert.equal(present.calls.length, 1);
  const body = JSON.parse(present.calls[0].options.body);
  assert.deepEqual(body.to, ["support@example.invalid"]);
  assert.equal(body.reply_to, input.email);
  assert.match(body.html, /&lt;script&gt;bad&lt;\/script&gt;/);
  assert.doesNotMatch(body.html, /<script>/);
});

test("missing mail configuration makes no provider request and no success claim", async () => {
  const h = harness(accepted({ id: "should-not-be-used" }), false);
  assert.deepEqual(await h.email.sendSecurityEmail("x@example.invalid", "ru", "verify", "https://scripture-archive.com"),
    { delivered: false, reason: "email_not_configured" });
  assert.deepEqual(await h.email.sendSupportRequestEmail({
    requestId: "z", email: "x@example.invalid", subject: "Help",
    message: "Local test", locale: "ru", attachments: [],
  }), { delivered: false, reason: "email_not_configured" });
  assert.equal(h.calls.length, 0);
});


test("P0: security email never dispatches one-time tokens to an unapproved origin", async () => {
  const h = harness(accepted({ id: "provider-accepted" }));
  for (const url of [
    "https://attacker.example/account?reset=secret",
    "http://scripture-archive.com/account?reset=secret",
    "https://user@scripture-archive.com/account?reset=secret",
    "https://scripture-archive.com/account?reset=secret#fragment",
    "https://scripture-archive.com\n/account?reset=secret",
  ]) {
    assert.deepEqual(await h.email.sendSecurityEmail("person@example.invalid", "uk", "reset", url),
      { delivered: false, reason: "security_link_origin_unverified" });
  }
  assert.equal(h.calls.length, 0);
  // Recovery: a rejected input must not poison the subsequent valid request.
  assert.equal((await h.email.sendSecurityEmail("person@example.invalid", "uk", "reset",
    "https://scripture-archive.com/account?reset=valid")).delivered, true);
  assert.equal(h.calls.length, 1);
});

test("P0: absent, downgraded or non-origin APP_BASE_URL blocks security mail", async () => {
  for (const base of ["", "http://scripture-archive.com",
    "https://scripture-archive.com/path", "https://user@scripture-archive.com",
    "https://scripture-archive.com?source=unsafe", "https://other.example"]) {
    const h = harness(accepted({ id: "provider-accepted" }), true, base);
    assert.deepEqual(await h.email.sendSecurityEmail("person@example.invalid", "en", "verify",
      "https://scripture-archive.com/api/auth?action=verify&token=valid"),
      { delivered: false, reason: "security_link_origin_unverified" });
    assert.equal(h.calls.length, 0);
  }
  const trailing = harness(accepted({ id: "provider-accepted" }), true, "https://scripture-archive.com/");
  assert.equal((await trailing.email.sendSecurityEmail("person@example.invalid", "ru", "verify",
    "https://scripture-archive.com/api/auth?action=verify&token=valid")).delivered, true);
  assert.equal(trailing.calls.length, 1);
});


test("P0 R0.2: normalized-away security-link syntax cannot carry one-time tokens to mail", async () => {
  // These inputs were accepted by the previous production trustedSecurityLink:
  // WHATWG URL normalization made their origins appear identical to APP_BASE_URL.
  const invalid = [
    "https://@scripture-archive.com/account?reset=secret",
    "https://:@scripture-archive.com/account?reset=secret",
    "https://scripture-archive.com\\@other.invalid/account?reset=secret",
    "https://scripture-archive.com:0443/account?reset=secret",
    "https://scripture-archive.com/account/../account?reset=secret",
    "https://scripture-archive.com/account?reset=secret#",
    "https://scripture-archive.com/account?reset=secret\u2028",
    "https://scripture-archive.com/account?reset=secret\u200b",
  ];
  const h = harness(accepted({ id: "provider-accepted" }));
  for (const link of invalid) {
    assert.deepEqual(
      await h.email.sendSecurityEmail("person@example.invalid", "en", "reset", link),
      { delivered: false, reason: "security_link_origin_unverified" },
      "rejected ambiguous link: " + JSON.stringify(link)
    );
  }
  assert.equal(h.calls.length, 0, "no provider request for rejected token-bearing links");
  // Recovery and legitimate encoded query parameters remain operational.
  for (const [purpose, link] of [
    ["reset", "https://scripture-archive.com/account?reset=valid%2Ftoken"],
    ["verify", "https://scripture-archive.com/api/auth?action=verify&token=valid"],
  ]) {
    assert.equal((await h.email.sendSecurityEmail("person@example.invalid", "uk", purpose, link)).delivered, true);
  }
  assert.equal(h.calls.length, 2);
  assert.deepEqual(h.calls.map(call => JSON.parse(call.options.body).to),
    [["person@example.invalid"], ["person@example.invalid"]]);
});
