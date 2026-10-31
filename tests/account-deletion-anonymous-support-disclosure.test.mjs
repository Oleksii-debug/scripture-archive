import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Exercise the real account renderer, not a duplicated translation fixture.
const source = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const start = source.indexOf('function renderAccount() {');
const end = source.indexOf('\nlet editorViewEpoch', start);
assert.ok(start >= 0 && end > start, 'canonical account renderer must exist');
const renderSource = source.slice(start, end);

function renderedAccount(lang) {
  const html = [];
  const selectors = [
    '#logout-button', '#visibility-form', '#password-form', '#delete-form',
    '#sensitive-form', '#login-form', '#forgot-form', '#register-form',
  ];
  const controls = Object.fromEntries(selectors.map(key => [key, {}]));
  controls['#sensitive-form'].elements = {
    tradition: { value: '' }, denomination: { value: '' }, church: { value: '' },
  };
  const document = {
    querySelector(selector) {
      if (selector === '.profile-controls') return { insertAdjacentHTML() {} };
      return controls[selector] ?? null;
    },
  };
  const state = {
    lang,
    sessionUnavailable: false,
    user: {
      id: 'fixture-principal', email: 'example@invalid.test',
      firstName: 'A', lastName: 'B', profileComplete: true, authProvider: 'password',
      visibility: {}, sensitiveConsent: false,
    },
  };
  const ctx = vm.createContext({
    state, document, location: { search: '' }, URLSearchParams,
    ACCOUNT_OPTIONS: { uk: { religion: [] }, ru: { religion: [] }, en: { religion: [] } },
    t: key => key, esc: String, options: () => '', field: () => '',
    setActiveNav() {}, shell(markup) { html.push(markup); },
    accountRequest() { throw Error('unexpected private IO'); },
    authRequest() { throw Error('unexpected account mutation'); },
    clearPersonalProgress() { throw Error('unexpected progress mutation'); },
    FormData: class {},
  });
  vm.runInContext(renderSource, ctx);
  ctx.renderAccount();
  assert.equal(html.length, 1);
  return html[0];
}

for (const [lang, anonymous, support, retained, deletion] of [
  ['uk', 'Анонімні звернення до підтримки', 'зверніться до підтримки', 'Надіслані листи й резервні копії', 'Видалити обліковий запис'],
  ['ru', 'Анонимные обращения в поддержку', 'обратитесь в поддержку', 'Отправленные письма и резервные копии', 'Удалить учётную запись'],
  ['en', 'Anonymous support requests', 'contact support', 'Previously sent emails and backups', 'Delete account'],
]) {
  test('account deletion discloses retained anonymous support records and external copies: ' + lang, () => {
    const html = renderedAccount(lang);
    assert.ok(html.includes('id="delete-form"'), 'must appear in the actual authenticated deletion form');
    assert.ok(html.includes(anonymous));
    assert.ok(html.includes(support));
    assert.ok(html.includes(retained));
    assert.ok(html.includes(deletion));
    assert.ok(html.includes('id="logout-button"'));
    assert.doesNotMatch(html, /undefined|null/);
  });
}
