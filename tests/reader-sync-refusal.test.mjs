import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Run the actual canonical reader completion handler with bounded DOM/HTTP doubles.
// This is a unit regression, not a claim of live-browser or D1 integration.
const source = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const statement = source.split(/\r?\n/).find((line) =>
  line.includes("document.querySelector('#mark-read').onclick="),
);
assert.ok(statement?.trim().endsWith(';'), 'canonical mark-read handler must exist');
const copy = {
  uk: { retry: 'Повторити збереження', pending: 'Прочитане збережено на цьому пристрої, але сервер не підтвердив збереження. Повторіть спробу.' },
  ru: { retry: 'Повторить сохранение', pending: 'Прочитанное сохранено на этом устройстве, но сервер не подтвердил сохранение. Повторите попытку.' },
  en: { retry: 'Retry saving', pending: 'Your reading is saved on this device, but the server did not confirm the save. Please retry.' },
};
function scenario({ locale = 'uk', signedIn = true, cloud = [true], refuseAttempt = false, cloudGate = null, attemptGate = null, sharedStore = null, chapter = 1 } = {}) {
  const button = { disabled: false, textContent: 'Mark', dataset: {}, attrs: {}, setAttribute(k,v) { this.attrs[k]=v; }, removeAttribute(k) { delete this.attrs[k]; } };
  const questions = { unlocked: false, removeAttribute(name) { assert.equal(name, 'disabled'); this.unlocked = true; } };
  const document = { querySelector: (selector) =>
    selector === '#mark-read' ? button : selector === '#start-questions' ? questions : null };
  const store = sharedStore || new Map();
  const history = store.has('sa.readingHistory') ? JSON.parse(store.get('sa.readingHistory')) : [];
  const meta = { code: 'GEN' }, alreadyRead = false;
  const state = { user: signedIn ? { id: 'person-1' } : null }, hasTasks = true, groupId = '';
  const principal = state.user, readerStillCurrent = () => state.user === principal;
  const w = { readMarked: 'Read marked' }, bookTitle = () => 'Genesis';
  let saved = [], cloudCalls = 0, attemptCalls = 0;
  const cloudReadings = [];
  const localStorage = { setItem(key, json) {
    assert.equal(key, 'sa.readingHistory'); saved = JSON.parse(json); store.set(key,json);
  } };
  const loadJSON = (key, fallback) => {
    assert.equal(key, 'sa.readingHistory');
    try { return store.has(key) ? JSON.parse(store.get(key)) : fallback; }
    catch { return fallback; }
  };
  const accountRequest = async (action, method, payload) => {
    assert.equal(action, 'reading'); assert.equal(method, 'PUT');
    assert.ok(Array.isArray(payload.reading));
    cloudReadings.push(payload.reading.map(item => item.chapter));
    if (!cloud[cloudCalls++]) throw Error('503');
    if (cloudGate) await cloudGate;
  };
  const attemptRequest = async () => {
    attemptCalls++;
    if (attemptGate) await attemptGate;
    if (refuseAttempt) throw Error('503');
  };
  const announcements = [], announce = message => announcements.push(message);
  const t = key => ({
    readingSyncRetry: copy[locale].retry,
    readingSyncPending: copy[locale].pending,
    errorLoad: 'Load failed',
  })[key];
  const args = { document, history, loadJSON, meta, chapter, alreadyRead, state, readerStillCurrent,
    hasTasks, groupId, w, bookTitle, localStorage, accountRequest, attemptRequest, announce, t };
  const init = new Function(...Object.keys(args),
    statement + '\nreturn document.querySelector("#mark-read").onclick;');
  const click = init(...Object.values(args));
  const nextButton = { disabled: false, textContent: 'Next chapter' };
  const nextQuestions = { unlocked: false, removeAttribute() { this.unlocked = true; } };
  return {
    switchAccount() { state.user = { id: 'person-2' }; },
    navigateAway() {
      document.querySelector = selector => selector === '#mark-read' ? nextButton : selector === '#start-questions' ? nextQuestions : null;
    },
    nextButton, nextQuestions,
    click, button, questions, announcements, cloudReadings,
    initialHistory: history,
    get saved() { return saved; },
    get cloudCalls() { return cloudCalls; },
    get attemptCalls() { return attemptCalls; },
  };
}
test('refused authenticated PUT cannot report synced completion or unlock questions', async () => {
  const h = scenario({ cloud: [false] });
  await h.click();
  assert.equal(h.cloudCalls, 1);
  assert.equal(h.attemptCalls, 0);
  assert.equal(h.button.disabled, false);
  assert.equal(h.button.attrs['aria-busy'], undefined);
  assert.equal(h.button.textContent, copy.uk.retry);
  assert.deepEqual(h.announcements, [copy.uk.pending]);
  assert.equal(h.saved.length, 1);
  assert.equal(h.questions.unlocked, false);
});
test('retry persists without duplicate reading entries, then unlocks questions', async () => {
  const h = scenario({ cloud: [false, true] });
  await h.click(); await h.click();
  assert.equal(h.cloudCalls, 2);
  assert.equal(h.attemptCalls, 1);
  assert.equal(h.saved.length, 1);
  assert.equal(h.questions.unlocked, true);
  assert.equal(h.button.disabled, true);
  assert.deepEqual(h.announcements, [copy.uk.pending, 'Read marked']);
});
test('anonymous user retains local reading capability', async () => {
  const h = scenario({ signedIn: false });
  await h.click();
  assert.equal(h.cloudCalls, 0);
  assert.equal(h.saved.length, 1);
  assert.equal(h.button.disabled, true);
});
test('failed attempt receipt remains a visible error and leaves questions locked', async () => {
  const h = scenario({ refuseAttempt: true });
  await h.click();
  assert.equal(h.questions.unlocked, false);
  assert.equal(h.button.disabled, false);
  assert.deepEqual(h.announcements, ['Load failed']);
});
for (const locale of ['uk', 'ru', 'en']) {
  test(locale + ' refusal and retry messaging is localized', async () => {
    const h = scenario({ locale, cloud: [false] });
    await h.click();
    assert.equal(h.button.textContent, copy[locale].retry);
    assert.deepEqual(h.announcements, [copy[locale].pending]);
    assert.ok(source.includes('readingSyncRetry: "' + copy[locale].retry + '"'));
    assert.ok(source.includes('readingSyncPending: "' + copy[locale].pending + '"'));
  });
}

test('two rapid activations cannot double-submit reading receipt or unlock twice', async () => {
  let release;
  const cloudGate = new Promise(resolve => { release = resolve; });
  const h = scenario({ cloud: [true], cloudGate });
  const first = h.click();
  const second = h.click();
  assert.equal(h.cloudCalls, 1, 'only one request while the server is pending');
  assert.equal(h.button.disabled, false, 'keep native button focusable while saving');
  assert.equal(h.button.attrs['aria-busy'], 'true');
  release();
  await Promise.all([first, second]);
  assert.equal(h.cloudCalls, 1);
  assert.equal(h.attemptCalls, 1);
  assert.equal(h.saved.length, 1);
  assert.deepEqual(h.announcements, ['Read marked']);
  assert.equal(h.button.attrs['aria-busy'], undefined);
});


test('navigation during pending successful cloud save cannot mark a different chapter complete', async () => {
  let release;
  const cloudGate = new Promise(resolve => { release = resolve; });
  const h = scenario({ cloud: [true], cloudGate });
  const pending = h.click();
  h.navigateAway();
  release();
  await pending;
  assert.equal(h.nextButton.disabled, false);
  assert.equal(h.nextButton.textContent, 'Next chapter');
  assert.equal(h.nextQuestions.unlocked, false);
  assert.deepEqual(h.announcements, []);
  assert.equal(h.button.attrs['aria-busy'], undefined);
  assert.equal(h.attemptCalls, 0);
});

test('navigation during refused cloud save does not replace a new chapter action', async () => {
  const h = scenario({ cloud: [false] });
  const pending = h.click();
  h.navigateAway();
  await pending;
  assert.equal(h.nextButton.disabled, false);
  assert.equal(h.nextButton.textContent, 'Next chapter');
  assert.equal(h.nextQuestions.unlocked, false);
  assert.deepEqual(h.announcements, []);
  assert.equal(h.button.attrs['aria-busy'], undefined);
});

test('navigation during pending attempt receipt cannot unlock another chapter questions', async () => {
  let release;
  const attemptGate = new Promise(resolve => { release = resolve; });
  const h = scenario({ cloud: [true], attemptGate });
  const pending = h.click();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(h.attemptCalls, 1, 'attempt acknowledgement is pending');
  h.navigateAway();
  release();
  await pending;
  assert.equal(h.nextButton.disabled, false);
  assert.equal(h.nextButton.textContent, 'Next chapter');
  assert.equal(h.nextQuestions.unlocked, false);
  assert.deepEqual(h.announcements, []);
  assert.equal(h.button.attrs['aria-busy'], undefined);
});

for (const locale of ['uk', 'ru', 'en']) {
  test(locale + ' reopens combined progress after two independently opened tabs', async () => {
    const sharedStore = new Map();
    const first = scenario({ locale, sharedStore, chapter: 1 });
    const second = scenario({ locale, sharedStore, chapter: 2 });
    assert.deepEqual(first.initialHistory, []);
    assert.deepEqual(second.initialHistory, []);
    await first.click();
    await second.click();
    const saved = JSON.parse(sharedStore.get('sa.readingHistory'));
    assert.deepEqual(saved.map(row => row.chapter), [1, 2]);
    assert.deepEqual(second.cloudReadings.at(-1), [1, 2]);
    const reopened = scenario({ locale, sharedStore, chapter: 1 });
    assert.deepEqual(reopened.initialHistory.map(row => row.chapter), [1, 2]);
  });
}

test('account replacement while reading save is pending cannot unlock the next user', async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const h = scenario({ cloud: [true], cloudGate: gate });
  const pending = h.click();
  assert.equal(h.cloudCalls, 1);
  h.switchAccount();
  release();
  await pending;
  assert.equal(h.attemptCalls, 0, 'no attempt receipt under the new session');
  assert.equal(h.questions.unlocked, false);
  assert.deepEqual(h.announcements, []);
  assert.equal(h.button.disabled, false);
  assert.equal(h.button.attrs['aria-busy'], undefined);
});

test('account replacement during attempt receipt cannot announce or unlock old read completion', async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const h = scenario({ cloud: [true], attemptGate: gate });
  const pending = h.click();
  for (let i = 0; i < 5; i++) await Promise.resolve();
  assert.equal(h.attemptCalls, 1);
  h.switchAccount();
  release();
  await pending;
  assert.equal(h.questions.unlocked, false);
  assert.deepEqual(h.announcements, []);
  assert.equal(h.button.disabled, false);
  assert.equal(h.button.attrs['aria-busy'], undefined);
});

test('a retained old-account read-completion handler cannot initiate a new write', async () => {
  const h = scenario();
  h.switchAccount();
  await h.click();
  assert.equal(h.cloudCalls, 0);
  assert.equal(h.attemptCalls, 0);
  assert.deepEqual(h.saved, []);
  assert.equal(h.button.dataset.saSaving, undefined);
});
