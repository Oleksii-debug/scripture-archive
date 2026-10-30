import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// Execute the real renderHelp function extracted from the canonical public
// application; isolate only DOM and fetch. No external requests or email.
const appSource = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const start = appSource.indexOf("function renderHelp() {");
const end = appSource.indexOf("async function renderAbout() {", start);
assert.ok(start >= 0 && end > start, "canonical help renderer exists");
const extract = appSource.slice(start, end);
const renderFactory = new Function("state", "setActiveNav", "shell", "document",
  "window", "t", "esc", "FormData", "fetch", extract + "\nreturn renderHelp;");

const id = "12345678-abcd-1234-9876-0123456789ab";
const copy = {
  uk: {
    accepted: "Звернення збережено",
    mailUnknown: "Стан доставки сповіщення команді не підтверджений",
    receiptUnknown: "Не вдалося підтвердити номер звернення",
    generalError: "Не вдалося надіслати звернення",
  },
  ru: {
    accepted: "Обращение сохранено",
    mailUnknown: "Доставка уведомления команде пока не подтверждена",
    receiptUnknown: "Не удалось подтвердить номер обращения",
    generalError: "Не удалось отправить обращение",
  },
  en: {
    accepted: "Your request was saved",
    mailUnknown: "Delivery of the notification to the team has not been confirmed",
    receiptUnknown: "The request reference could not be confirmed",
    generalError: "The request could not be sent",
  },
};

function fixture(lang, fetchResponse) {
  const state = { lang, user: null };
  const effects = { reset: 0, analytics: 0, fetch: 0, shell: "" };
  const status = { textContent: "" }, button = { disabled: false };
  const form = {
    reset() { effects.reset++; },
    querySelector(selector) {
      assert.equal(selector, "button[type=submit]");
      return button;
    },
    onsubmit: null,
  };
  class FormDataStub {
    constructor(owner) { assert.equal(owner, form); this.values = new Map(); }
    set(key, value) { this.values.set(key, value); }
  }
  const document = { querySelector(selector) {
    if (selector === "#help-form") return form;
    if (selector === "#help-state") return status;
    throw Error("Unexpected selector " + selector);
  } };
  const window = { saAnalytics: { track(event, data) {
    assert.equal(event, "support_click");
    assert.equal(data.destination, "help_request");
    effects.analytics++;
  } } };
  const fetch = async (url, init) => {
    assert.equal(url, "/api/help");
    assert.equal(init.method, "POST");
    effects.fetch++;
    if (fetchResponse instanceof Error) throw fetchResponse;
    return fetchResponse;
  };
  const renderHelp = renderFactory(state, () => {}, html => { effects.shell = html; },
    document, window, name => name, value => value, FormDataStub, fetch);
  renderHelp();
  assert.match(effects.shell, /id="help-state" role="status" aria-live="polite"/);
  async function submit() {
    assert.equal(typeof form.onsubmit, "function", "real form is wired");
    let prevented = false;
    await form.onsubmit({currentTarget: form, preventDefault() { prevented = true; }});
    assert.equal(prevented, true);
    assert.equal(button.disabled, false, "button always re-enabled");
    return status.textContent;
  }
  return { effects, submit };
}

for (const lang of ["uk", "ru", "en"]) {
  test(lang + ": acknowledged D1 request shows real reference without promised email", async () => {
    const h = fixture(lang, Response.json({ ok: true, requestId: id }, { status: 201 }));
    const message = await h.submit();
    assert.ok(message.includes(copy[lang].accepted));
    assert.ok(message.includes(id));
    assert.doesNotMatch(message, /will reply by email|відповідь надійде|ответ придёт/i);
    assert.equal(h.effects.reset, 1);
    assert.equal(h.effects.analytics, 1);
    assert.equal(h.effects.fetch, 1);
  });
  for (const mailStatus of ["delivery_unknown", "delivery_record_pending"]) {
    test(lang + ": " + mailStatus + " is candid about uncertain notification", async () => {
      const h = fixture(lang, Response.json({ ok: true, requestId: id, mailStatus }, { status: 201 }));
      const message = await h.submit();
      assert.ok(message.includes(copy[lang].accepted));
      assert.ok(message.includes(copy[lang].mailUnknown));
      assert.ok(message.includes(id));
      assert.equal(h.effects.reset, 1);
      assert.equal(h.effects.analytics, 1);
    });
  }
  for (const response of [
    Response.json({ ok: true }, { status: 201 }),
    new Response("not a receipt", { status: 201, headers: { "Content-Type": "text/html" } }),
  ]) {
    test(lang + ": HTTP success without valid receipt never falsely acknowledges", async () => {
      const h = fixture(lang, response);
      const message = await h.submit();
      assert.ok(message.includes(copy[lang].receiptUnknown));
      assert.equal(h.effects.reset, 0);
      assert.equal(h.effects.analytics, 0);
    });
  }
  test(lang + ": real error response preserves form and localized error", async () => {
    const h = fixture(lang, Response.json({ error: "support_unavailable" }, { status: 503 }));
    const message = await h.submit();
    assert.ok(message.includes(copy[lang].generalError));
    assert.equal(h.effects.reset, 0);
    assert.equal(h.effects.analytics, 0);
  });
}

test("network interruption does not fabricate a receipt", async () => {
  const h = fixture("uk", new Error("network interrupted"));
  const message = await h.submit();
  assert.ok(message.includes(copy.uk.generalError));
  assert.equal(h.effects.reset, 0);
  assert.equal(h.effects.analytics, 0);
});

test("malformed receipt ID cannot be displayed as a trustworthy reference", async () => {
  const h = fixture("en", Response.json({ ok: true, requestId: "<script>unsafe</script>" }, { status: 201 }));
  const message = await h.submit();
  assert.ok(message.includes(copy.en.receiptUnknown));
  assert.doesNotMatch(message, /unsafe/);
  assert.equal(h.effects.reset, 0);
  assert.equal(h.effects.analytics, 0);
});
