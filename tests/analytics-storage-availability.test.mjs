import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// Execute the actual shipped browser module; do not replace analytics logic
// with an unrelated test-only consent implementation.
const script = readFileSync(new URL('../public/analytics.js', import.meta.url), 'utf8');

function boot(options = {}) {
  const behavior = { ...options };
  const events = new Map(), posts = [], externalScripts = [], writes = [], clearedTimers = [];
  const persisted = { consent: behavior.storedConsent ?? null, session: behavior.storedSession ?? null };
  let banner = null;
  const localStorage = {
    getItem(key) {
      if (behavior.localReadThrows) throw Error('SecurityError: localStorage');
      return key === 'sa.analyticsConsent' ? persisted.consent : null;
    },
    setItem(key, value) {
      if (behavior.localWriteThrows) throw Error('QuotaExceededError: localStorage');
      writes.push([key, value]);
      if (key === 'sa.analyticsConsent' && !behavior.discardLocalWrites)
        persisted.consent = value;
    },
  };
  const sessionStorage = {
    getItem(key) {
      if (behavior.sessionReadThrows) throw Error('SecurityError: sessionStorage');
      return key === 'sa.analyticsSession' ? persisted.session : null;
    },
    setItem(key, value) {
      if (behavior.sessionWriteThrows) throw Error('QuotaExceededError: sessionStorage');
      if (key === 'sa.analyticsSession') persisted.session = value;
    },
  };
  const node = tag => ({
    tag, attrs: {}, children: [], hidden: false, dataset: {},
    setAttribute(key, value) { this.attrs[key] = value; },
    appendChild(child) { this.children.push(child); },
    addEventListener(name, callback) { this[name] = callback; },
    remove() { this.removed = true; },
  });
  const document = {
    title: 'Scripture Archive', referrer: '', visibilityState: 'visible',
    documentElement: { lang: behavior.lang || 'uk' },
    querySelector(selector) {
      return selector.startsWith('meta[name="sa-ga4-id"]')
        ? (behavior.measurement === false ? null : { content: 'G-TEST' })
        : null;
    },
    createElement: node,
    addEventListener: (name, callback) => events.set(name, callback),
    head: { appendChild: element => externalScripts.push(element) },
    body: { appendChild: element => { banner = element; } },
  };
  const window = {
    addEventListener: (name, callback) => events.set(name, callback),
    setInterval: () => 1,
    clearInterval: id => clearedTimers.push(id),
  };
  const location = {
    origin: 'https://scripture-archive.com', hostname: 'scripture-archive.com',
    pathname: '/account/reset', hash: '#/account', search: '?token=private',
  };
  runInNewContext(script, {
    document, window, localStorage, sessionStorage, location,
    crypto: { randomUUID: () => behavior.randomUUID ? behavior.randomUUID() : 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' },
    navigator: {}, Blob, URL, URLSearchParams, Date,
    fetch: async (url, options) => {
      const request = { url, body: JSON.parse(options.body) };
      posts.push(request);
      return behavior.fetchOverride ? behavior.fetchOverride(request) : { ok: true };
    },
  }, { filename: 'public/analytics.js' });
  const click = action => {
    assert.ok(banner, 'consent banner should be rendered');
    banner.click({ target: { closest: () => ({ dataset: { consent: action } }) } });
  };
  const gaEvents = () => Array.from(window.dataLayer || [])
    .filter(args => args[0] === 'event')
    .map(args => ({ name: args[1], data: args[2] }));
  return { behavior, persisted, writes, banner, window, posts, externalScripts, events, clearedTimers, click, gaEvents };
}

test('localStorage read SecurityError does not break page bootstrap or imply consent', () => {
  const a = boot({ localReadThrows: true });
  assert.ok(a.window.saAnalytics && a.banner);
  a.window.saAnalytics.pageView();
  assert.equal(a.posts.length, 0);
  assert.equal(a.externalScripts.length, 0);
});

test('sessionStorage read SecurityError preserves an accessible consent decision', () => {
  const a = boot({ sessionReadThrows: true });
  assert.ok(a.banner);
  assert.ok(a.window.saAnalytics);
  assert.equal(a.posts.length, 0);
});

test('sessionStorage write QuotaExceededError uses only ephemeral session identity', () => {
  const a = boot({ sessionWriteThrows: true });
  assert.ok(a.banner);
  assert.equal(a.persisted.session, null);
  assert.equal(a.posts.length, 0);
});

test('unexpected old localStorage consent values re-prompt instead of hiding controls', () => {
  const a = boot({ storedConsent: 'granted???' });
  assert.ok(a.banner);
  assert.equal(a.externalScripts.length, 0);
  a.window.saAnalytics.pageView();
  assert.equal(a.posts.length, 0);
});

test('previously denied consent stays silent and does not display another prompt', () => {
  const a = boot({ storedConsent: 'denied' });
  assert.equal(a.banner, null);
  a.window.saAnalytics.track('login_error', { error: 'private' });
  assert.equal(a.posts.length, 0);
  assert.equal(a.gaEvents().length, 0);
  assert.equal(a.externalScripts.length, 0);
});

test('a stored opt-in keeps working when only sessionStorage is blocked', () => {
  const a = boot({ storedConsent: 'granted', sessionReadThrows: true });
  assert.equal(a.banner, null);
  a.window.saAnalytics.pageView();
  assert.equal(a.posts.length, 1);
  assert.equal(a.gaEvents().length, 1);
});

test('successful opt-in requires exact persisted readback before network activity', () => {
  const a = boot();
  assert.equal(a.externalScripts.length, 0);
  a.click('granted');
  assert.equal(a.persisted.consent, 'granted');
  assert.equal(a.banner.removed, true);
  assert.equal(a.posts.length, 1);
  assert.equal(a.gaEvents()[0].name, 'page_view');
  assert.equal(a.posts[0].body.value.page_location, 'https://scripture-archive.com/account');
});

test('denied consent write rejects opt-in without starting either analytics sink', () => {
  const a = boot({ localWriteThrows: true, lang: 'uk' });
  a.click('granted');
  assert.equal(a.banner.removed, undefined);
  const alert = a.banner.children[0];
  assert.equal(alert.attrs.role, 'alert');
  assert.equal(alert.hidden, false);
  assert.match(alert.textContent, /Аналітику не ввімкнено/);
  assert.equal(a.externalScripts.length, 0);
  assert.equal(a.posts.length, 0);
  assert.equal(a.gaEvents().length, 0);
});

test('blocked readback after apparent write also denies analytics opt-in', () => {
  const a = boot({ localReadThrows: true, lang: 'en' });
  a.click('granted');
  assert.equal(a.banner.removed, undefined);
  assert.match(a.banner.children[0].textContent, /Analytics is not enabled/);
  assert.equal(a.posts.length, 0);
  assert.equal(a.externalScripts.length, 0);
});

test('silently discarded browser consent writes fail closed', () => {
  const a = boot({ discardLocalWrites: true, lang: 'ru' });
  a.click('granted');
  assert.equal(a.banner.removed, undefined);
  assert.match(a.banner.children[0].textContent, /Аналитика не включена/);
  assert.equal(a.posts.length, 0);
  assert.equal(a.externalScripts.length, 0);
});

test('decline remains usable when persistent storage denies writes', () => {
  const a = boot({ localWriteThrows: true });
  a.click('denied');
  assert.equal(a.banner.removed, true);
  a.window.saAnalytics.pageView();
  a.events.get('error')({ message: 'private text' });
  assert.equal(a.posts.length, 0);
  assert.equal(a.externalScripts.length, 0);
});

test('a failed opt-in may safely be retried when browser storage is restored', () => {
  const a = boot({ localWriteThrows: true });
  a.click('granted');
  assert.equal(a.posts.length, 0);
  a.behavior.localWriteThrows = false;
  a.click('granted');
  assert.equal(a.persisted.consent, 'granted');
  assert.equal(a.banner.removed, true);
  assert.equal(a.banner.children[0].hidden, true);
  assert.equal(a.posts.length, 1);
});

test('unrecognized forged button action never grants analytics', () => {
  const a = boot();
  a.click('maybe');
  assert.equal(a.persisted.consent, null);
  assert.equal(a.posts.length, 0);
  assert.equal(a.externalScripts.length, 0);
  assert.equal(a.banner.removed, undefined);
});

test('prior source-level private error redaction remains effective after storage fix', () => {
  const a = boot({ storedConsent: 'granted' });
  a.window.saAnalytics.track('login_error', { error: 'owner@example.test?reset_token=private' });
  assert.equal(a.posts.length, 1);
  assert.equal(a.posts[0].body.value.error, 'other');
  assert.equal(a.gaEvents()[0].data.error, 'other');
});

test('unknown stored values with GA4 configured do not load its script', () => {
  const a = boot({ storedConsent: 'blocked', measurement: true });
  assert.equal(a.externalScripts.length, 0);
  assert.ok(a.banner);
  assert.equal(a.posts.length, 0);
});

test('cross-tab consent denial immediately stops first-party and GA4 events and heartbeat', () => {
  const a = boot({ storedConsent: 'granted' });
  a.window.saAnalytics.pageView();
  assert.equal(a.posts.length, 1);
  assert.equal(a.gaEvents().length, 1);
  a.events.get('storage')({ key: 'sa.analyticsConsent', newValue: 'denied' });
  a.window.saAnalytics.pageView();
  a.window.saAnalytics.track('login', { method: 'password' });
  assert.equal(a.posts.length, 1);
  assert.equal(a.gaEvents().length, 1);
  assert.deepEqual(a.clearedTimers, [1]);
  assert.ok(Array.from(a.window.dataLayer).some(args =>
    args[0] === 'consent' && args[1] === 'update' && args[2].analytics_storage === 'denied'));
});

test('cross-tab clearing consent also stops a previously granted tab', () => {
  for (const [key, newValue] of [['sa.analyticsConsent', null], [null, null], ['sa.analyticsConsent', 'corrupt']]) {
    const a = boot({ storedConsent: 'granted' });
    a.events.get('storage')({ key, newValue });
    a.window.saAnalytics.pageView();
    assert.equal(a.posts.length, 0);
    assert.equal(a.gaEvents().length, 0);
    assert.deepEqual(a.clearedTimers, [1]);
  }
});

test('unrelated storage changes cannot revoke consent, and remote grant never enables it', () => {
  const granted = boot({ storedConsent: 'granted' });
  granted.events.get('storage')({ key: 'unrelated', newValue: null });
  granted.window.saAnalytics.pageView();
  assert.equal(granted.posts.length, 1);
  assert.deepEqual(granted.clearedTimers, []);
  const denied = boot({ storedConsent: 'denied' });
  denied.events.get('storage')({ key: 'sa.analyticsConsent', newValue: 'granted' });
  denied.window.saAnalytics.pageView();
  assert.equal(denied.posts.length, 0);
  assert.equal(denied.externalScripts.length, 0);
});

test('malformed persisted session IDs are retired before analytics sends', () => {
  for (const storedSession of ['------------------------------------',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'aaaaaaaa-aaaa-4aaa-1aaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaaZ']) {
    const a = boot({ storedConsent: 'granted', storedSession });
    a.window.saAnalytics.pageView();
    assert.equal(a.persisted.session, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
    assert.equal(a.posts[0].body.sessionId, a.persisted.session);
  }
});

test('valid version-four stored analytics session identity remains stable', () => {
  const storedSession = '11111111-2222-4333-8abc-555555555555';
  const a = boot({ storedConsent: 'granted', storedSession });
  a.window.saAnalytics.pageView();
  assert.equal(a.persisted.session, storedSession);
  assert.equal(a.posts[0].body.sessionId, storedSession);
});

test('privacy withdrawal immediately stops analytics and durably records denial', () => {
  const a = boot({ storedConsent: 'granted' });
  a.window.saAnalytics.pageView();
  assert.equal(a.posts.length, 1);
  assert.equal(a.window.saAnalytics.withdrawConsent(), true);
  assert.equal(a.persisted.consent, 'denied');
  assert.deepEqual(a.clearedTimers, [1]);
  a.window.saAnalytics.pageView();
  assert.equal(a.posts.length, 1);
  assert.equal(a.window.dataLayer.at(-1)[2].analytics_storage, 'denied');
});

test('withdrawal stops this tab even if denial cannot be persisted', () => {
  for (const behavior of [{ localWriteThrows: true }, { discardLocalWrites: true }, { localReadThrows: true }]) {
    const a = boot({ storedConsent: 'granted', ...behavior });
    assert.equal(a.window.saAnalytics.withdrawConsent(), false);
    a.window.saAnalytics.pageView();
    assert.equal(a.posts.length, 0);
    assert.equal(a.window.dataLayer.at(-1)[2].analytics_storage, 'denied');
  }
});

test('privacy opt-in after denial requires explicit saved consent and may be withdrawn again', () => {
  const a = boot({ storedConsent: 'denied' });
  a.window.saAnalytics.pageView();
  assert.equal(a.posts.length, 0);
  assert.equal(a.window.saAnalytics.grantConsent(), true);
  assert.equal(a.persisted.consent, 'granted');
  assert.equal(a.posts.length, 1);
  assert.equal(a.window.saAnalytics.withdrawConsent(), true);
  a.window.saAnalytics.pageView();
  assert.equal(a.posts.length, 1);
  assert.equal(a.persisted.consent, 'denied');
});

test('privacy opt-in cannot enable analytics when consent storage fails or discards writes', () => {
  for (const behavior of [{ localWriteThrows: true }, { discardLocalWrites: true }, { localReadThrows: true }]) {
    const a = boot({ storedConsent: 'denied', ...behavior });
    assert.equal(a.window.saAnalytics.grantConsent(), false);
    a.window.saAnalytics.pageView();
    assert.equal(a.posts.length, 0);
    assert.equal(a.externalScripts.length, 0);
  }
});

test('privacy choice removes an outstanding consent prompt', () => {
  for (const method of ['grantConsent', 'withdrawConsent']) {
    const a = boot();
    assert.ok(a.banner);
    assert.equal(a.window.saAnalytics[method](), true);
    assert.equal(a.banner.removed, true);
  }
});

test('repeating an already granted privacy opt-in does not create a second page view', () => {
  const a = boot({ storedConsent: 'granted' });
  assert.equal(a.window.saAnalytics.grantConsent(), true);
  assert.equal(a.posts.length, 0);
});

test('failed consent readback attempts to undo a possibly successful grant write', () => {
  const a = boot({ storedConsent: 'denied', localReadThrows: true });
  assert.equal(a.window.saAnalytics.grantConsent(), false);
  assert.equal(a.persisted.consent, 'denied');
  assert.deepEqual(a.writes.slice(-2), [['sa.analyticsConsent', 'granted'], ['sa.analyticsConsent', 'denied']]);
  a.window.saAnalytics.pageView();
  assert.equal(a.posts.length, 0);
});

const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('verified session conflict rotates for future events without replaying the old event', async () => {
  let count=0;
  const ids=['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'];
  const a=boot({storedConsent:'granted',randomUUID:()=>ids.shift(),fetchOverride:async()=>++count===1
    ? {status:409,json:async()=>({error:'analytics_session_conflict'})} : {status:202}});
  a.window.saAnalytics.pageView();await tick();
  assert.equal(a.posts.length,1);
  assert.equal(a.posts[0].body.sessionId,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  assert.equal(a.persisted.session,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
  a.window.saAnalytics.pageView();
  assert.equal(a.posts[1].body.sessionId,a.persisted.session);
});
test('generic failures and unrelated conflicts never rotate or retry analytics', async () => {
  for(const response of [{status:503},{status:409,json:async()=>({error:'other'})}]) {
    const a=boot({storedConsent:'granted',fetchOverride:async()=>response});
    a.window.saAnalytics.pageView();await tick();assert.equal(a.posts.length,1);
  }
});
test('withdrawal while the conflict response is pending prevents retry', async () => {
  let finish;const pending=new Promise(resolve=>{finish=resolve;});
  const a=boot({storedConsent:'granted',fetchOverride:()=>pending});
  a.window.saAnalytics.pageView();a.window.saAnalytics.withdrawConsent();
  finish({status:409,json:async()=>({error:'analytics_session_conflict'})});await tick();
  assert.equal(a.posts.length,1);
});
test('simultaneous conflicting requests share one replacement identifier', async () => {
  let issued=0, calls=0;
  const ids=['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'];
  const a=boot({storedConsent:'granted',randomUUID:()=>{issued++;return ids.shift()},fetchOverride:async()=>++calls<=2
    ? {status:409,json:async()=>({error:'analytics_session_conflict'})} : {status:202}});
  a.window.saAnalytics.pageView();a.window.saAnalytics.pageView();await tick();
  assert.equal(issued,2);assert.equal(a.posts.length,2);
  a.window.saAnalytics.pageView();
  assert.equal(a.posts[2].body.sessionId,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
});

test('old conflicting request is not retried after withdrawal and a new grant', async () => {
  let finish, count=0;
  const pending=new Promise(resolve=>{finish=resolve;});
  const a=boot({storedConsent:'granted',fetchOverride:()=>++count===1?pending:Promise.resolve({status:202})});
  a.window.saAnalytics.pageView();a.window.saAnalytics.withdrawConsent();a.window.saAnalytics.grantConsent();
  const before=a.posts.length;
  finish({status:409,json:async()=>({error:'analytics_session_conflict'})});await tick();
  assert.equal(a.posts.length,before);
});
