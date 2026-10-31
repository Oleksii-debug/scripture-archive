import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const start = source.indexOf("let missionViewEpoch = 0;");
const end = source.indexOf("\nfunction renderAtlas()", start);
assert.ok(start > 0 && end > start, "canonical mission renderer must remain present");
const production = source.slice(start, end) + "\n;({renderMission})";
const task = { index: 1, total: 5, type: "single", question: "Private account question", options: ["Answer A", "Answer B"] };

function deferred() {
  let resolve, reject;
  const promise = new Promise((a, b) => { resolve = a; reject = b; });
  return { promise, resolve, reject };
}

function fixture({ attemptRequest, path = "/mission/attempt/A" } = {}) {
  const state = { user: { id: "alice" }, lang: "en", currentReader: null };
  const location = { pathname: path, hash: "" };
  const html = [], resultViews = [], lockedViews = [], calls = [], broadcasts = [], removed = [];
  const button = { disabled: false };
  const answerForm = { onsubmit: null };
  const context = vm.createContext({
    state, location,
    ATTEMPT_COPY: { en: { prepareTitle: "Prepare", readRequired: "Read", reread: "Reread", retryLoad: "Retry",
      memory: "Memory task", submit: "Submit", selectAll: "All", selectOne: "One", lockedText: "Locked" } },
    sessionStorage: { getItem: () => "A", removeItem: key => { removed.push(key); } },
    setActiveNav() {}, shell: value => { html.push(value); },
    attemptRequest: async (...args) => { calls.push(args[0]); return attemptRequest(...args); },
    renderLockedChapter: (...args) => { lockedViews.push(args); },
    renderAttemptResult: (...args) => { resultViews.push(args); },
    document: {
      querySelector: selector => selector === "#answer-form" ? answerForm : button,
      querySelectorAll: () => [{ value: "0" }],
    },
    attemptChannel: { postMessage: message => broadcasts.push(message) },
    t: key => key, esc: v => String(v),
    announce() {}, console,
  });
  const { renderMission } = vm.runInContext(production, context);
  return { state, location, html, calls, removed, resultViews, lockedViews, answerForm, button, broadcasts,
    render: () => renderMission(["mission", "attempt", "A"]),
    changeAccount: () => { state.user = { id: "bob" }; },
    submit: () => answerForm.onsubmit({ preventDefault() {}, currentTarget: { querySelector: () => button } }),
  };
}

test("late current-attempt response cannot display another user's task", async () => {
  const io = deferred();
  const h = fixture({ attemptRequest: () => io.promise });
  const work = h.render();
  h.changeAccount();
  io.resolve({ task });
  await work;
  assert.deepEqual(h.html, []);
  assert.deepEqual(h.resultViews, []);
  assert.deepEqual(h.removed, []);
  assert.deepEqual(h.calls, ["current"]);
});

test("late invalidated attempt error cannot overwrite the next account or erase its active attempt", async () => {
  const io = deferred();
  const h = fixture({ attemptRequest: () => io.promise });
  const work = h.render();
  h.changeAccount();
  io.reject(Error("attempt_closed"));
  await work;
  assert.deepEqual(h.html, []);
  assert.deepEqual(h.lockedViews, []);
  assert.deepEqual(h.removed, []);
});

test("late grading result is suppressed after a session switch", async () => {
  const finish = deferred(), started = deferred();
  const h = fixture({ attemptRequest: action => {
    if (action === "current") return { grading: true };
    if (action === "finalize") { started.resolve(); return finish.promise; }
    throw Error("unexpected action");
  } });
  const work = h.render();
  await started.promise;
  h.changeAccount();
  finish.resolve({ completed: true, result: { score: 5 }, book: "GEN", chapter: 12 });
  await work;
  assert.deepEqual(h.calls, ["current", "finalize"]);
  assert.deepEqual(h.resultViews, []);
  assert.deepEqual(h.removed, []);
});

test("leaving a mission route before data returns cannot show its previous task", async () => {
  const io = deferred();
  const h = fixture({ attemptRequest: () => io.promise });
  const work = h.render();
  h.location.pathname = "/account";
  io.resolve({ task });
  await work;
  assert.deepEqual(h.html, []);
});

test("a previous account's retained answer form must never submit into another account", async () => {
  const h = fixture({ attemptRequest: action => {
    if (action === "current") return { task };
    throw Error("stale form unexpectedly submitted");
  } });
  await h.render();
  assert.equal(h.html.length, 1);
  assert.match(h.html[0], /Private account question/);
  h.changeAccount();
  await h.submit();
  assert.deepEqual(h.calls, ["current"]);
  assert.deepEqual(h.resultViews, []);
});

test("answer result received after account change cannot render private grade", async () => {
  const answer = deferred(), started = deferred();
  const h = fixture({ attemptRequest: action => {
    if (action === "current") return { task };
    if (action === "answer") { started.resolve(); return answer.promise; }
    throw Error("unexpected request");
  } });
  await h.render();
  const work = h.submit();
  await started.promise;
  h.changeAccount();
  answer.resolve({ completed: true, result: { score: 5 }, book: "GEN", chapter: 12 });
  await work;
  assert.deepEqual(h.resultViews, []);
  assert.deepEqual(h.removed, []);
  assert.deepEqual(h.broadcasts, []);
});

test("newer same-page mission request supersedes an older in-flight response", async () => {
  const first = deferred();
  let times = 0;
  const h = fixture({ attemptRequest: action => {
    assert.equal(action, "current");
    return ++times === 1 ? first.promise : { task: { ...task, question: "Most recent private task" } };
  } });
  const old = h.render();
  await h.render();
  assert.equal(h.html.length, 1);
  assert.match(h.html[0], /Most recent private task/);
  first.resolve({ task });
  await old;
  assert.equal(h.html.length, 1);
  assert.doesNotMatch(h.html[0], /Private account question/);
});

test("healthy mission still renders a native keyboard form and keeps its answer handler", async () => {
  const h = fixture({ attemptRequest: action => {
    if (action === "current") return { task };
    return { completed: false };
  } });
  await h.render();
  assert.equal(h.html.length, 1);
  assert.match(h.html[0], /id="answer-form"/);
  assert.equal(typeof h.answerForm.onsubmit, "function");
});

test("malformed successful mission response is quarantined into accessible retry instead of crashing", async () => {
  const corrupt = [
    null, [], {}, { task: null }, { grading: "false", task },
    { completed: "false", task }, { task: { ...task, type: "unknown" } },
    { task: { ...task, index: 0 } }, { task: { ...task, total: 0 } },
    { task: { ...task, index: 6 } }, { task: { ...task, total: 1001 } },
    { task: { ...task, question: 42 } }, { task: { ...task, question: "   " } },
    { task: { ...task, options: null } }, { task: { ...task, options: ["only one"] } },
    { task: { ...task, options: ["A", , "B"] } },
    { task: { ...task, options: ["A", null] } },
    { task: { ...task, options: ["A", " ".repeat(3)] } },
  ];
  for (const response of corrupt) {
    const h = fixture({ attemptRequest: action => {
      assert.equal(action, "current");
      return response;
    } });
    await assert.doesNotReject(h.render(), "bad HTTP 200 should recover: " + String(response?.task?.type));
    assert.equal(h.html.length, 1);
    assert.match(h.html[0], /role="status"/);
    assert.match(h.html[0], /id="retry-attempt"/);
    assert.doesNotMatch(h.html[0], /id="answer-form"/);
    assert.equal(h.answerForm.onsubmit, null);
    assert.equal(typeof h.button.onclick, "function");
    assert.deepEqual(h.calls, ["current"]);
    assert.deepEqual(h.resultViews, []);
  }
});

test("malformed finalize response preserves retry without disclosing grade or task", async () => {
  const h = fixture({ attemptRequest: action => action === "current" ? { grading: true } : { task: null } });
  await assert.doesNotReject(h.render());
  assert.deepEqual(h.calls, ["current", "finalize"]);
  assert.equal(h.html.length, 1);
  assert.match(h.html[0], /id="retry-attempt"/);
  assert.equal(h.answerForm.onsubmit, null);
  assert.deepEqual(h.resultViews, []);
});
