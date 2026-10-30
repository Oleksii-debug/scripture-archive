import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const code = source.slice(source.indexOf('function renderPrivacy() {'), source.indexOf('\nfunction cleanPublicCopy()'));
function render(lang, analytics) {
  let html = '';
  const button = {}, grantButton = {}, status = {};
  const context = {
    state: { lang }, window: { saAnalytics: analytics },
    setActiveNav() {}, shell(value) { html = value; },
    document: { querySelector: selector => selector === '#withdraw-analytics-consent' ? button : selector === '#grant-analytics-consent' ? grantButton : status },
  };
  runInNewContext(code + '\nrenderPrivacy();', context);
  return { html, button, grantButton, status };
}
for (const lang of ['uk', 'ru', 'en']) {
  test(`${lang} privacy withdrawal offers a working action and honest feedback`, () => {
    for (const result of [true, false]) {
      let calls = 0;
      const view = render(lang, { withdrawConsent() { calls++; return result; } });
      assert.match(view.html, /id="withdraw-analytics-consent"/);
      assert.match(view.html, /role="status"/);
      view.button.onclick();
      assert.equal(calls, 1);
      assert.ok(view.status.textContent);
      if (result) assert.doesNotMatch(view.status.textContent, /could not|не вдалося|не удалось/i);
      else assert.match(view.status.textContent, /could not|не вдалося|не удалось/i);
    }
    const unavailable = render(lang, null);
    unavailable.button.onclick();
    assert.match(unavailable.status.textContent, /unavailable|недоступ/i);
  });
}

for (const lang of ['uk', 'ru', 'en']) {
  test(`${lang} privacy opt-in requires an explicit action and reports success or failure`, () => {
    for (const result of [true, false]) {
      let calls = 0;
      const view = render(lang, { grantConsent() { calls++; return result; } });
      assert.match(view.html, /id="grant-analytics-consent"/);
      assert.equal(calls, 0);
      view.grantButton.onclick();
      assert.equal(calls, 1);
      if (result) assert.doesNotMatch(view.status.textContent, /could not|не вдалося|не удалось/i);
      else assert.match(view.status.textContent, /could not|не вдалося|не удалось/i);
    }
    const unavailable = render(lang, null);
    unavailable.grantButton.onclick();
    assert.match(unavailable.status.textContent, /unavailable|недоступ/i);
  });
}
