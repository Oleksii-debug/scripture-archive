import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// The real account-page translations are evaluated from the deployed public
// app source, rather than maintaining another set of copy in the test.
const source = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const begin = source.indexOf("function renderAccount() {");
assert.ok(begin >= 0, "canonical /account renderer is present");
const copyBegin = source.indexOf("  const copy = {", begin);
const copyEnd = source.indexOf("  }[state.lang];", copyBegin);
assert.ok(copyBegin > begin && copyEnd > copyBegin, "canonical account copy expression exists");
const accountCopyExpression = source.slice(
  copyBegin + "  const copy = ".length, copyEnd + "  }[state.lang]".length,
);
const accountCopy = new Function("state", "return (" + accountCopyExpression + ");");

// Actual server policy: the forgot-password endpoint intentionally returns an
// enumeration-resistant generic ok:true receipt for both unknown addresses and
// existing, verified accounts whose mail provider may report delivered:false.
// Thus the UI cannot truthfully claim email was delivered on this response.
const authSource = readFileSync(new URL("../app/api/auth/route.ts", import.meta.url), "utf8");
const authStart = authSource.indexOf('if (action === "forgot-password")');
const authEnd = authSource.indexOf('if (action === "reset-password")', authStart);
assert.ok(authStart >= 0 && authEnd > authStart);
const forgotPasswordHandler = authSource.slice(authStart, authEnd);
assert.match(forgotPasswordHandler, /sendSecurityEmail/);
assert.match(forgotPasswordHandler, /return json\(\{ ok: true/);
assert.doesNotMatch(forgotPasswordHandler, /emailDelivered\s*:/);

const languages = [
  ["uk", /не підтверджує доставку листа/i, /якщо обліковий запис існує/i, /пошту/i],
  ["ru", /не подтверждает доставку письма/i, /если учётная запись существует/i, /почту/i],
  ["en", /does not confirm email delivery/i, /if the account exists/i, /inbox/i],
];
for (const [lang, disclaimer, conditional, instructions] of languages) {
  test(lang + ": password reset acknowledgement does not assert email delivery", () => {
    const copy = accountCopy({lang});
    assert.equal(typeof copy.resetSent, "string");
    assert.match(copy.resetSent, disclaimer);
    assert.match(copy.resetSent, conditional);
    assert.match(copy.resetSent, instructions);
    assert.doesNotMatch(copy.resetSent, /already sent|has been sent|уже надіслано|уже отправлено/i);
  });
  test(lang + ": recovery UI uses the same non-enumerating receipt for all addresses", () => {
    const copy = accountCopy({lang});
    // This is user-facing copy for the single generic action, not a branch
    // dependent on account existence or provider delivery status.
    assert.ok(!copy.resetSent.includes("emailDelivered"));
    assert.ok(!copy.resetSent.includes("testToken"));
    assert.ok(copy.resetSent.length > 40);
  });
}
