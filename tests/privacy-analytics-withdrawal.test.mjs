import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const code = source.slice(source.indexOf('function renderPrivacy() {'), source.indexOf('\nfunction cleanPublicCopy()'));
function render(lang, analytics) {
  let html = '';
  const button = {}, status = {};
  const context = {
    state: { lang }, window: { saAnalytics: analytics },
    setActiveNav() {}, shell(value) { html = value; },
    document: { querySelector: selector => selector === '#withdraw-analytics-consent' ? button : status },
  };
  runInNewContext(code + '\nrenderPrivacy();', context);
  return { html, button, status };
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
