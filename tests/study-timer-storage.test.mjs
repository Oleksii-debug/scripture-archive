import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const saveBegin = source.indexOf("const TIMER_EPHEMERAL_COPY =");
const saveEnd = source.indexOf("\nfunction timerText(", saveBegin);
const activateBegin = source.indexOf("function activateTimer() {", saveEnd);
const activateEnd = source.indexOf("\nconst ATTEMPT_COPY =", activateBegin);
assert.ok(saveBegin >= 0 && saveEnd > saveBegin, "the canonical timer storage implementation must exist");
assert.ok(activateBegin > saveEnd && activateEnd > activateBegin, "the real timer controls must exist");
const timerCode = source.slice(saveBegin, saveEnd) + "\n" + source.slice(activateBegin, activateEnd);
const normalizeBegin = source.indexOf("function normalizeTimer() {");
const normalizeEnd = source.indexOf("\nconst TIMER_EPHEMERAL_COPY =", normalizeBegin);
assert.ok(normalizeBegin >= 0 && normalizeEnd > normalizeBegin, "the real timer state transition must exist");
const normalizeCode = source.slice(normalizeBegin, normalizeEnd) + "\n";

function fixture({ lang = "uk", denied = false, quota = false, duration = 2, remaining = 120, realNormalize = false } = {}) {
  const writes = [], sounds = [], intervals = [], clears = [];
  const controls = {
    "#timer-minutes": { value: String(duration), disabled: false },
    "#timer-display": { textContent: "" },
    "#timer-start": { textContent: "", disabled: false },
    "#timer-reset": { textContent: "" },
    "#timer-status": { textContent: "" },
  };
  const state = {
    lang, studyTimer: { durationMinutes: duration, remainingSeconds: remaining, running: false, endsAt: null },
  };
  const context = vm.createContext({
    state,
    localStorage: {
      setItem(key, value) {
        if (denied) throw Error("SecurityError");
        if (quota) throw Error("QuotaExceededError");
        writes.push([key, value]);
      },
    },
    document: { querySelector: key => controls[key] ?? null },
    normalizeTimer: () => state.studyTimer,
    timerText: timer => String(timer.remainingSeconds),
    t: key => key,
    play: sound => sounds.push(sound),
    clearInterval: id => clears.push(id),
    setInterval: (callback, milliseconds) => {
      assert.equal(milliseconds, 1000);
      intervals.push(callback);
      return 19;
    },
  });
  vm.runInContext("let timerInterval = null;\n" + (realNormalize ? normalizeCode : "") + timerCode, context);
  return {
    state, controls, writes, sounds, intervals, clears,
    mount: () => context.activateTimer(),
    save: () => context.saveTimer(),
  };
}

test("denied browser storage never prevents initial timer controls from mounting", () => {
  const f = fixture({ denied: true });
  assert.doesNotThrow(() => f.mount());
  assert.equal(f.controls["#timer-start"].textContent, "timerStart");
  assert.equal(f.controls["#timer-display"].textContent, "120");
  assert.match(f.controls["#timer-status"].textContent, /лише в цій вкладці/);
  assert.equal(f.writes.length, 0);
  assert.equal(f.intervals.length, 1);
});

test("start, pause, and reset remain real in-tab actions with denied persistence", () => {
  const f = fixture({ denied: true });
  f.mount();
  const start = f.controls["#timer-start"];
  start.onclick();
  assert.equal(f.state.studyTimer.running, true);
  assert.equal(start.textContent, "timerPause");
  assert.equal(f.controls["#timer-minutes"].disabled, true);
  assert.match(f.controls["#timer-status"].textContent, /лише в цій вкладці/);
  start.onclick();
  assert.equal(f.state.studyTimer.running, false);
  assert.equal(start.textContent, "timerStart");
  f.controls["#timer-minutes"].value = "5";
  f.controls["#timer-reset"].onclick();
  assert.equal(f.state.studyTimer.durationMinutes, 5);
  assert.equal(f.state.studyTimer.remainingSeconds, 300);
  assert.match(f.controls["#timer-status"].textContent, /лише в цій вкладці/);
});

test("permitted storage persists the real timer state without a false warning", () => {
  const f = fixture();
  f.mount();
  f.controls["#timer-start"].onclick();
  assert.equal(f.writes.length, 2);
  assert.deepEqual(f.writes.map(([name]) => name), ["sa.studyTimer", "sa.studyTimer"]);
  assert.equal(JSON.parse(f.writes[1][1]).running, true);
  assert.equal(f.controls["#timer-status"].textContent, "");
  assert.equal(f.save(), true);
});

test("storage quota exhaustion cannot break timer changes", () => {
  const f = fixture({ quota: true });
  f.mount();
  assert.equal(f.save(), false);
  assert.doesNotThrow(() => f.controls["#timer-minutes"].onchange());
  assert.doesNotThrow(() => f.controls["#timer-start"].onclick());
  assert.equal(f.state.studyTimer.running, true);
  assert.match(f.controls["#timer-status"].textContent, /лише в цій вкладці/);
});

test("storage warning is localized for Ukrainian, Russian, and English", () => {
  for (const [lang, expected] of [
    ["uk", /Таймер працює лише/],
    ["ru", /Таймер работает только/],
    ["en", /Timer works only in this tab/],
  ]) {
    const f = fixture({ lang, denied: true });
    f.mount();
    assert.match(f.controls["#timer-status"].textContent, expected);
  }
});

test("completion announcement is never overwritten by a storage warning", () => {
  const f = fixture({ denied: true, duration: 1, remaining: 0 });
  f.mount();
  assert.equal(f.controls["#timer-status"].textContent, "timerDone");
  assert.deepEqual(f.sounds, ["done"]);
});

test("countdown still updates on a scheduled tick with unavailable storage", () => {
  const f = fixture({ denied: true });
  f.mount();
  f.controls["#timer-start"].onclick();
  const prior = f.controls["#timer-display"].textContent;
  f.state.studyTimer.remainingSeconds = 99;
  assert.doesNotThrow(() => f.intervals[0]());
  assert.notEqual(f.controls["#timer-display"].textContent, prior);
  assert.equal(f.controls["#timer-display"].textContent, "99");
  assert.match(f.controls["#timer-status"].textContent, /лише в цій вкладці/);
});

test("real countdown expiry updates UI, announces completion and retires interval", () => {
  const f = fixture({ duration: 1, remaining: 1, realNormalize: true });
  f.mount();
  f.controls["#timer-start"].onclick();
  f.state.studyTimer.endsAt = Date.now() - 1000;
  f.intervals[0]();
  assert.equal(f.state.studyTimer.running, false);
  assert.equal(f.controls["#timer-start"].textContent, "timerStart");
  assert.equal(f.controls["#timer-display"].textContent, "0");
  assert.equal(f.controls["#timer-status"].textContent, "timerDone");
  assert.deepEqual(f.sounds, ["done"]);
  assert.ok(f.clears.includes(19), "expired countdown must release its interval");
});

test("late interval callback cannot announce timer completion a second time", () => {
  const f = fixture({ duration: 1, remaining: 1, realNormalize: true });
  f.mount();
  f.controls["#timer-start"].onclick();
  f.state.studyTimer.endsAt = Date.now() - 1000;
  f.intervals[0]();
  f.intervals[0]();
  assert.deepEqual(f.sounds, ["done"]);
  assert.equal(f.controls["#timer-status"].textContent, "timerDone");
});

test("paused timer and zero-duration stopwatch do not claim deadline completion", () => {
  const paused = fixture({ duration: 1, remaining: 1, realNormalize: true });
  paused.mount();
  paused.controls["#timer-start"].onclick();
  paused.controls["#timer-start"].onclick();
  paused.state.studyTimer.remainingSeconds = 0;
  paused.intervals[0]();
  assert.equal(paused.controls["#timer-status"].textContent, "");
  assert.deepEqual(paused.sounds, []);
  const stopwatch = fixture({ duration: 0, remaining: 0, realNormalize: true });
  stopwatch.mount();
  stopwatch.controls["#timer-start"].onclick();
  stopwatch.intervals[0]();
  assert.equal(stopwatch.controls["#timer-status"].textContent, "");
  assert.deepEqual(stopwatch.sounds, []);
});

test("completion remains announced even when persistent browser storage is denied", () => {
  const f = fixture({ duration: 1, remaining: 1, realNormalize: true, denied: true });
  f.mount();
  f.controls["#timer-start"].onclick();
  f.state.studyTimer.endsAt = Date.now() - 1000;
  f.intervals[0]();
  assert.equal(f.controls["#timer-status"].textContent, "timerDone");
  assert.deepEqual(f.sounds, ["done"]);
  assert.equal(f.controls["#timer-start"].textContent, "timerStart");
});
