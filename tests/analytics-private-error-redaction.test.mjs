import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../public/analytics.js', import.meta.url), 'utf8');
const SECRET = 'reset_token=owner-private-token';
const ADDRESS = 'owner@example.test';

function boot(consent = 'granted', measurementId = 'G-TEST') {
  const listeners = new Map();
  const posts = [];
  const loadedScripts = [];
  const document = {
    title: 'Private account', referrer: '', visibilityState: 'visible',
    documentElement: { lang: 'uk' },
    querySelector: selector => selector.startsWith('meta[name="sa-ga4-id"]')
      ? (measurementId ? { content: measurementId } : null) : null,
    addEventListener: (type, handler) => listeners.set(type, handler),
    createElement: name => ({ tagName: name, dataset: {}, setAttribute() {} }),
    head: { appendChild: script => loadedScripts.push(script) },
    body: { appendChild() {} },
  };
  const window = {
    addEventListener: (type, handler) => listeners.set(type, handler),
    setInterval: () => 1,
  };
  const localStorage = {
    getItem: key => key === 'sa.analyticsConsent' ? consent : null,
    setItem() {},
  };
  const sessionStorage = {
    getItem: () => 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    setItem() {},
  };
  const location = {
    hash: '#/account', pathname: '/account/reset',
    origin: 'https://scripture-archive.com', hostname: 'scripture-archive.com',
    search: '?' + SECRET,
  };
  runInNewContext(source, {
    window, document, localStorage, sessionStorage, location,
    crypto: { randomUUID: () => 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' },
    navigator: { sendBeacon: () => false },
    fetch: async (url, request) => {
      posts.push({ url, payload: JSON.parse(request.body) });
      return { ok: true };
    },
    Blob, URL, URLSearchParams, Date,
  }, { filename: 'public/analytics.js' });
  const gaEvents = () => [...(window.dataLayer || [])]
    .filter(call => call[0] === 'event')
    .map(call => ({ name: call[1], values: JSON.parse(JSON.stringify(call[2])) }));
  return { window, listeners, posts, gaEvents, loadedScripts };
}

test('consented auth and client errors never export private email or reset token to either analytics sink', () => {
  const app = boot();
  app.window.saAnalytics.track('login_error', { error: 'Login ' + ADDRESS + ' ' + SECRET });
  app.window.saAnalytics.track('sign_up_error', { error: 'Invalid ' + SECRET });
  app.listeners.get('error')({ message: 'Uncaught ' + ADDRESS + ' ' + SECRET });
  assert.deepEqual(app.posts.map(item => item.payload.value.error), ['other', 'other', 'script_error']);
  assert.deepEqual(app.gaEvents().map(item => item.values.error), ['other', 'other', 'script_error']);
  const sent = JSON.stringify([app.posts, app.gaEvents()]);
  assert.ok(!sent.includes(ADDRESS));
  assert.ok(!sent.includes(SECRET));
  assert.equal(app.posts.length, 3, 'preserve useful anonymous error counts');
});

test('stable, explicitly enumerated error codes survive, but lookalikes and long arbitrary strings do not', () => {
  const app = boot();
  for (const code of [
    'email_in_use', 'email_not_verified', 'too_many_requests',
    'chapter_must_be_read', 'sensitive_consent_required',
  ]) app.window.saAnalytics.track('login_error', { error: code });
  for (const unsafe of [
    'email_not_verified ' + ADDRESS, 'email_in_use?token=private',
    'EMAIL_IN_USE', '<script>alert(1)</script>', ADDRESS, SECRET.repeat(9),
  ]) app.window.saAnalytics.track('login_error', { error: unsafe });
  const expected = [
    'email_in_use', 'email_not_verified', 'too_many_requests',
    'chapter_must_be_read', 'sensitive_consent_required',
    ...Array(6).fill('other'),
  ];
  assert.deepEqual(app.posts.map(item => item.payload.value.error), expected);
  assert.deepEqual(app.gaEvents().map(item => item.values.error), expected);
});

test('analytics account page location strips the password-reset token and deep account path', () => {
  const app = boot();
  app.window.saAnalytics.pageView();
  const expected = 'https://scripture-archive.com/account';
  assert.equal(app.posts[0].payload.value.page_location, expected);
  assert.equal(app.gaEvents()[0].values.page_location, expected);
  assert.equal(app.posts[0].payload.value.page_name, 'account');
  assert.ok(app.loadedScripts.length >= 1);
});

test('denied analytics consent remains completely silent for first-party events and GA4 events', () => {
  const app = boot('denied');
  app.window.saAnalytics.track('login_error', { error: ADDRESS });
  app.listeners.get('error')({ message: SECRET });
  app.window.saAnalytics.pageView();
  assert.equal(app.posts.length, 0);
  assert.equal(app.gaEvents().length, 0);
  assert.equal(app.loadedScripts.length, 0);
});

test('without GA4, error redaction still applies to the first-party endpoint', () => {
  const app = boot('granted', '');
  app.window.saAnalytics.track('sign_up_error', { error: ADDRESS + SECRET });
  assert.equal(app.posts[0].payload.value.error, 'other');
  assert.deepEqual(app.gaEvents(), []);
});
