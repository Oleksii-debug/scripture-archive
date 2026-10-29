import assert from 'node:assert/strict';
import test from 'node:test';
import {
  attachReviewControls, attachEditorRoles, restoreEditorialFocus, reviewText,
} from '../public/material-review.js';

function focusFixture() {
  const doc = { body: {}, documentElement: {}, activeElement: null };
  const attributes = new Map(), focused = [];
  const heading = {
    hasAttribute: name => attributes.has(name),
    setAttribute: (key, value) => attributes.set(key, value),
    focus: options => { focused.push(options); doc.activeElement = heading; },
  };
  const root = {
    ownerDocument: doc, isConnected: true,
    querySelector: selector => selector === '.section-head h1' ? heading : null,
    querySelectorAll: () => [],
  };
  return { doc, heading, root, attributes, focused };
}

test('keyboard focus recovers only after a replacement DOM detaches the editorial action', () => {
  const f = focusFixture();
  f.doc.activeElement = f.doc.body;
  assert.equal(restoreEditorialFocus(f.root, true), true);
  assert.equal(f.doc.activeElement, f.heading);
  assert.equal(f.attributes.get('tabindex'), '-1');
  assert.equal(f.focused.length, 1);
  assert.deepEqual(f.focused[0], { preventScroll: true });

  f.doc.activeElement = { external: true };
  assert.equal(restoreEditorialFocus(f.root, true), false, 'never steal focus after a user has moved it');
  assert.equal(restoreEditorialFocus(f.root, false), false);
  f.root.isConnected = false;
  f.doc.activeElement = f.doc.body;
  assert.equal(restoreEditorialFocus(f.root, true), false, 'do not focus a detached editor');
  assert.equal(f.focused.length, 1);
});

test('successful real editorial submission returns focus to builder heading after refresh', async () => {
  const f = focusFixture();
  const button = { disabled: false }, status = { textContent: '' };
  const form = {
    dataset: { id: 'draft-1' },
    contains: element => element === button,
    querySelector: selector => selector === 'button' ? button : status,
  };
  const previousFetch = globalThis.fetch, previousData = globalThis.FormData;
  globalThis.FormData = class { get: key => key === 'provenance' ? 'Synthetic original text' : ''; has: () => true; };
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({url, options}); return Response.json({ ok: true });
  };
  f.root.querySelectorAll = selector => selector === '.material-submit' ? [form] : [];
  let refreshCount = 0, announcements = [];
  try {
    attachReviewControls(f.root, reviewText('uk'), async () => {
      refreshCount++; f.doc.activeElement = f.doc.body;
    }, message => announcements.push(message));
    f.doc.activeElement = button;
    await form.onsubmit({ preventDefault() {} });
    assert.equal(refreshCount, 1);
    assert.equal(f.doc.activeElement, f.heading);
    assert.equal(f.focused.length, 1);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, '/api/material-review');
    assert.equal(JSON.parse(calls[0].options.body).materialId, 'draft-1');
    assert.equal(announcements.length, 1);
    assert.equal(status.textContent, '');
  } finally { globalThis.fetch = previousFetch; globalThis.FormData = previousData; }
});

test('editor role mutation restores focus only if the invoked control was focused', async () => {
  const f = focusFixture();
  const status = { textContent: '' }, button = {dataset:{id:'editor-1'},disabled:false};
  const form = { querySelector: () => ({disabled:false}), onsubmit:null };
  f.root.querySelector = selector => selector === '#editor-role-status' ? status :
    selector === '#editor-role-form' ? form : selector === '.section-head h1' ? f.heading : null;
  f.root.querySelectorAll = selector => selector === '.editor-revoke' ? [button] : [];
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ok:true});
  let refreshed = 0, announced = 0;
  try {
    attachEditorRoles(f.root, 'uk', async () => { refreshed++; f.doc.activeElement = f.doc.body; }, () => announced++);
    f.doc.activeElement = button;
    await button.onclick();
    assert.equal(f.doc.activeElement, f.heading);
    assert.equal(refreshed, 1);
    assert.equal(announced, 1);
  } finally { globalThis.fetch = previousFetch; }
});
