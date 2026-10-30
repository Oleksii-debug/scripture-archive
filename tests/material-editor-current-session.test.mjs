import test from 'node:test';
import assert from 'node:assert/strict';
import { attachReviewControls, attachEditorRoles, reviewText } from '../public/material-review.js';

const success = () => new Response('{}', {status: 200, headers: {'content-type': 'application/json'}});
const deferred = () => {
  let release;
  return { promise: new Promise(resolve => { release = resolve; }), release };
};

function setup(onRefresh = async () => {}) {
  const original = {fetch: globalThis.fetch, FormData: globalThis.FormData};
  globalThis.FormData = class {
    constructor(form) { this.form = form; }
    get(key) { return {provenance: 'GEN 12, original', note: 'Needs work', email: 'editor@example.invalid'}[key] ?? null; }
    has(key) { return key === 'rights' || key === 'source'; }
  };
  let current = true, refreshed = 0, announced = 0, posts = 0;
  globalThis.fetch = async () => { posts++; return success(); };
  const status = {textContent: ''};
  const submissionButton = {disabled: false, isConnected: true};
  const submission = {
    dataset: {id: 'm1'}, isConnected: true,
    querySelector: selector => selector === 'button' ? submissionButton : status,
  };
  const withdraw = {dataset: {id: 'v1'}, isConnected: true, disabled: false};
  const decisionButton = {dataset: {decision: 'approve'}, isConnected: true, disabled: false};
  const review = {
    dataset: {id: 'v2'}, isConnected: true,
    querySelector: () => status,
    querySelectorAll: () => [decisionButton],
  };
  const root = {
    isConnected: true, ownerDocument: null,
    querySelectorAll(selector) {
      return ({
        '.material-submit': [submission], '.material-withdraw': [withdraw],
        '.material-review': [review],
      })[selector] ?? [];
    },
    querySelector: () => status,
  };
  const w = reviewText('en');
  attachReviewControls(root, w, async () => { refreshed++; await onRefresh(); }, () => { announced++; }, () => current, () => current);
  return {
    root, submission, withdraw, review, decisionButton, status,
    setCurrent: value => { current = value; }, setFetch: fn => { globalThis.fetch = fn; },
    countedFetch: () => { posts++; return success(); },
    posts: () => posts, refreshed: () => refreshed, announced: () => announced,
    restore() {globalThis.fetch = original.fetch; globalThis.FormData = original.FormData;},
  };
}

test('retained former-principal submit, withdraw and review controls cannot issue writes', async () => {
  const s = setup();
  try {
    s.setCurrent(false);
    await s.submission.onsubmit({preventDefault() {}});
    await s.withdraw.onclick();
    await s.decisionButton.onclick();
    assert.equal(s.posts(), 0);
    assert.equal(s.refreshed(), 0);
    assert.equal(s.announced(), 0);
  } finally {s.restore();}
});

test('detached editor controls and broken identity predicate fail closed', async () => {
  const s = setup();
  try {
    s.submission.isConnected = false;
    s.withdraw.isConnected = false;
    s.review.isConnected = false;
    await s.submission.onsubmit({preventDefault() {}});
    await s.withdraw.onclick();
    await s.decisionButton.onclick();
    assert.equal(s.posts(), 0);
    s.review.isConnected = true;
    s.root.isConnected = false;
    await s.decisionButton.onclick();
    assert.equal(s.posts(), 0);
  } finally {s.restore();}
});

test('completed original-account submission must not refresh or announce after account replacement', async () => {
  const s = setup();
  try {
    const gate = deferred();
    s.setFetch(async () => { const response = s.countedFetch(); await gate.promise; return response; });
    const action = s.submission.onsubmit({preventDefault() {}});
    assert.equal(s.posts(), 1);
    s.setCurrent(false);
    gate.release(success());
    await action;
    assert.equal(s.refreshed(), 0);
    assert.equal(s.announced(), 0);
  } finally {s.restore();}
});

test('a current editor still completes a genuine independent review and announces it', async () => {
  const s = setup();
  try {
    await s.decisionButton.onclick();
    assert.equal(s.posts(), 1);
    assert.equal(s.refreshed(), 1);
    assert.equal(s.announced(), 1);
  } finally {s.restore();}
});

function editorFixture(onRefresh = async () => {}) {
  const original = {fetch: globalThis.fetch, FormData: globalThis.FormData};
  let current = true, posts = 0, refreshed = 0, announced = 0;
  globalThis.FormData = class { get() { return 'editor@example.invalid'; } };
  globalThis.fetch = async () => { posts++; return success(); };
  const status = {textContent: ''};
  const grant = {isConnected: true, disabled: false};
  const form = {isConnected: true, querySelector: () => grant};
  const revoke = {dataset: {id: 'bob'}, isConnected: true, disabled: false};
  const root = {
    isConnected: true, ownerDocument: null,
    querySelector: selector => selector === '#editor-role-status' ? status : form,
    querySelectorAll: () => [revoke],
  };
  attachEditorRoles(root, 'en', async () => {refreshed++; await onRefresh();}, () => {announced++;}, () => current, () => current);
  return {
    form, revoke, setCurrent: val => {current = val;}, setFetch: fn => {globalThis.fetch = fn;},
    posts: () => posts, tick: () => {posts++;}, refreshed: () => refreshed, announced: () => announced,
    restore() {globalThis.fetch = original.fetch; globalThis.FormData = original.FormData;},
  };
}

test('old account owner cannot grant/revoke an editor; late role response cannot redraw', async () => {
  const e = editorFixture();
  try {
    e.setCurrent(false);
    e.form.onsubmit({preventDefault() {}});
    await e.revoke.onclick();
    assert.equal(e.posts(), 0);
    e.setCurrent(true);
    const gate = deferred();
    e.setFetch(() => {e.tick(); return gate.promise;});
    const action = e.revoke.onclick();
    assert.equal(e.posts(), 1);
    e.setCurrent(false);
    gate.release(success());
    await action;
    assert.equal(e.refreshed(), 0);
    assert.equal(e.announced(), 0);
  } finally {e.restore();}
});

test('submit response cannot announce into a replacement principal after its refresh completes', async () => {
  let s;
  s = setup(async () => { s.setCurrent(false); });
  try {
    await s.submission.onsubmit({preventDefault() {}});
    assert.equal(s.posts(), 1);
    assert.equal(s.refreshed(), 1);
    assert.equal(s.announced(), 0);
  } finally {s.restore();}
});

test('owner role response cannot announce into a replacement principal after its refresh completes', async () => {
  let e;
  e = editorFixture(async () => { e.setCurrent(false); });
  try {
    await e.revoke.onclick();
    assert.equal(e.posts(), 1);
    assert.equal(e.refreshed(), 1);
    assert.equal(e.announced(), 0);
  } finally {e.restore();}
});
