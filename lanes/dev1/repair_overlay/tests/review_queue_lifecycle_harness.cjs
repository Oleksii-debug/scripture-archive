'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return {promise, resolve, reject};
}

const observers = new Set();
function notifyMutation() {
  queueMicrotask(() => {
    for (const observer of [...observers]) observer.callback([], observer);
  });
}

class FakeClassList {
  constructor(owner) {
    this.owner = owner;
    this.values = new Set();
  }
  add(...names) {
    let changed = false;
    for (const name of names) {
      if (!this.values.has(name)) {
        this.values.add(name);
        changed = true;
      }
    }
    if (changed) notifyMutation();
  }
  remove(...names) {
    let changed = false;
    for (const name of names) changed = this.values.delete(name) || changed;
    if (changed) notifyMutation();
  }
  contains(name) {
    return this.values.has(name);
  }
  replaceFromString(value) {
    this.values = new Set(String(value || '').split(/\s+/u).filter(Boolean));
    notifyMutation();
  }
}

class FakeElement {
  constructor(tagName, document) {
    this.tagName = String(tagName).toUpperCase();
    this.ownerDocument = document;
    this.children = [];
    this.attributes = new Map();
    this.listeners = new Map();
    this.classList = new FakeClassList(this);
    this.textContent = '';
    this.tabIndex = 0;
    this.focusCount = 0;
    this._id = '';
  }
  get id() {
    return this._id;
  }
  set id(value) {
    if (this._id) this.ownerDocument.byId.delete(this._id);
    this._id = String(value || '');
    if (this._id) this.ownerDocument.byId.set(this._id, this);
  }
  get className() {
    return [...this.classList.values].join(' ');
  }
  set className(value) {
    this.classList.replaceFromString(value);
  }
  setAttribute(name, value) {
    if (name === 'id') this.id = value;
    else if (name === 'class') this.className = value;
    else this.attributes.set(String(name), String(value));
  }
  append(...nodes) {
    for (const node of nodes) {
      node.parentNode = this;
      this.children.push(node);
    }
    notifyMutation();
  }
  replaceChildren(...nodes) {
    this.children = [];
    this.append(...nodes);
  }
  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }
  click() {
    for (const listener of this.listeners.get('click') || []) listener({target: this});
  }
  focus() {
    this.focusCount += 1;
    this.ownerDocument.activeElement = this;
  }
}

class FakeDocument {
  constructor() {
    this.byId = new Map();
    this.readyState = 'complete';
    this.activeElement = null;
    this.nav = new FakeElement('nav', this);
    this.main = new FakeElement('main', this);
  }
  createElement(tagName) {
    return new FakeElement(tagName, this);
  }
  getElementById(id) {
    return this.byId.get(id) || null;
  }
  querySelector(selector) {
    if (selector === '.top-nav') return this.nav;
    if (selector === 'main') return this.main;
    return null;
  }
  addEventListener() {}
}

class FakeMutationObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {
    observers.add(this);
  }
  disconnect() {
    observers.delete(this);
  }
}

function queuePayload(queueId) {
  return {
    truth_owner: 'D5/runtime',
    review_queue: [{
      queue_id: queueId,
      concept_id: 'CONCEPT',
      node_id: 'NODE-1',
      due_at: '2026-09-12T00:00:00+00:00',
      priority: 55,
      relation: 'EXACT',
      reason: 'runtime-owned',
    }],
  };
}

function elementText(node) {
  return `${node.textContent || ''} ${node.children.map(elementText).join(' ')}`.trim();
}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise(resolve => setImmediate(resolve));
}

async function waitForQueueCalls(queueDeferreds, expected) {
  for (let attempt = 0; attempt < 30 && queueDeferreds.length < expected; attempt += 1) await flush();
  assert.strictEqual(queueDeferreds.length, expected, `expected ${expected} queue calls, saw ${queueDeferreds.length}`);
}

(async () => {
  const frontend = path.resolve(__dirname, '..', 'frontend');
  const helperSource = fs.readFileSync(path.join(frontend, 'review-queue-request-gate.js'), 'utf8');
  const helperModule = await import(`data:text/javascript;base64,${Buffer.from(helperSource).toString('base64')}`);

  const document = new FakeDocument();
  globalThis.document = document;
  globalThis.MutationObserver = FakeMutationObserver;
  globalThis.__createRequestGenerationGate = helperModule.createRequestGenerationGate;

  const home = document.createElement('section');
  home.id = 'home-view';
  document.main.append(home);
  const navHome = document.createElement('button');
  navHome.id = 'nav-home';
  navHome.addEventListener('click', () => {
    home.classList.remove('hidden');
    document.getElementById('review-queue-view')?.classList.add('hidden');
  });
  document.nav.append(navHome);

  const queueDeferreds = [];
  globalThis.__chooseTransport = async () => ({kind: 'fake'});
  globalThis.__unwrap = async (_transport, command) => {
    if (command === 'system.bootstrap') return {capabilities: {review_queue: true}};
    if (command === 'player.get_review_queue') {
      const pending = deferred();
      queueDeferreds.push(pending);
      return await pending.promise;
    }
    throw new Error(`unexpected command ${command}`);
  };

  let uiSource = fs.readFileSync(path.join(frontend, 'review-queue-ui.js'), 'utf8');
  uiSource = uiSource.replace(
    "import {chooseTransport, unwrap} from './transport.js';",
    'const chooseTransport = globalThis.__chooseTransport; const unwrap = globalThis.__unwrap;'
  );
  uiSource = uiSource.replace(
    "import {createRequestGenerationGate} from './review-queue-request-gate.js';",
    'const createRequestGenerationGate = globalThis.__createRequestGenerationGate;'
  );
  await import(`data:text/javascript;base64,${Buffer.from(uiSource).toString('base64')}`);
  await flush();

  const navReview = document.getElementById('nav-review-queue');
  const reviewView = document.getElementById('review-queue-view');
  const results = document.getElementById('review-queue-results');
  const heading = document.getElementById('review-queue-heading');
  const status = document.getElementById('review-queue-status');
  const refresh = document.getElementById('review-queue-refresh');
  assert(navReview && reviewView && results && heading && status && refresh, 'review queue surface was not built');

  // A starts, the user leaves, then B starts after reopening. B resolves first.
  navReview.click();
  await waitForQueueCalls(queueDeferreds, 1);
  home.classList.remove('hidden');
  await flush();
  assert(reviewView.classList.contains('hidden'), 'leaving another view must hide Review Queue');

  navReview.click();
  await waitForQueueCalls(queueDeferreds, 2);
  queueDeferreds[1].resolve(queuePayload('QUEUE-NEW'));
  await flush();
  assert(elementText(results).includes('QUEUE-NEW'), 'newer reopened queue must render');
  const focusAfterNew = heading.focusCount;
  const statusAfterNew = status.textContent;

  queueDeferreds[0].resolve(queuePayload('QUEUE-OLD'));
  await flush();
  assert(elementText(results).includes('QUEUE-NEW'), 'late pre-leave queue must not replace newer truth');
  assert(!elementText(results).includes('QUEUE-OLD'), 'late pre-leave queue leaked into visible results');
  assert.strictEqual(heading.focusCount, focusAfterNew, 'late pre-leave completion stole focus');
  assert.strictEqual(status.textContent, statusAfterNew, 'late pre-leave completion rewrote status');

  // Two refreshes overlap. Ensure refresh A reaches the runtime queue await before B supersedes it.
  refresh.click();
  await waitForQueueCalls(queueDeferreds, 3);
  refresh.click();
  await waitForQueueCalls(queueDeferreds, 4);
  queueDeferreds[3].resolve(queuePayload('QUEUE-REFRESH-NEW'));
  await flush();
  assert(elementText(results).includes('QUEUE-REFRESH-NEW'), 'newest refresh queue must render');
  const focusAfterRefresh = heading.focusCount;
  const statusAfterRefresh = status.textContent;

  queueDeferreds[2].resolve(queuePayload('QUEUE-REFRESH-OLD'));
  await flush();
  assert(elementText(results).includes('QUEUE-REFRESH-NEW'), 'older refresh must not overwrite newer queue');
  assert(!elementText(results).includes('QUEUE-REFRESH-OLD'), 'older refresh leaked into visible results');
  assert.strictEqual(heading.focusCount, focusAfterRefresh, 'older refresh completion stole focus');
  assert.strictEqual(status.textContent, statusAfterRefresh, 'older refresh completion rewrote status');

  process.stdout.write('review queue lifecycle deferred-response harness: PASS\n');
})().catch(error => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
