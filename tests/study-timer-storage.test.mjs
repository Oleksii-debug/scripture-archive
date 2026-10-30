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

function fixture({ lang = "uk", denied = false, quota = false, duration = 2, remaining = 120 } = {}) {
  const writes = [], sounds = [], intervals = [];
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
    clearInterval: () => {},
    setInterval: (callback, milliseconds) => {
      assert.equal(milliseconds, 1000);
      intervals.push(callback);
      return 19;
    },
  });
  vm.runInContext("let timerInterval = null;\n" + timerCode, context);
  return {
    state, controls, writes, sounds, intervals,
    mount: () => context.activateTimer(),
    save: () => context.saveTimer(),
    setDenied: value => { denied = value; },
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

test("permission recovery during an active tick removes only the temporary-only storage warning", () => {
  for (const lang of ["uk", "ru", "en"]) {
    const f = fixture({ lang, denied: true });
    f.mount();
    f.controls["#timer-start"].onclick();
    assert.notEqual(f.controls["#timer-status"].textContent, "");
    f.setDenied(false);
    f.intervals[0]();
    assert.equal(f.controls["#timer-status"].textContent, "");
    assert.equal(f.state.studyTimer.running, true);
    assert.equal(f.writes.length, 1);
    assert.equal(JSON.parse(f.writes[0][1]).running, true);
  }
});

test("continued storage denial preserves a truthful warning on every active timer tick", () => {
  const f = fixture({ denied: true });
  f.mount();
  f.controls["#timer-start"].onclick();
  const warning = f.controls["#timer-status"].textContent;
  f.intervals[0]();
  assert.equal(f.controls["#timer-status"].textContent, warning);
  assert.equal(f.writes.length, 0);
});

test("successful storage must never clear the completed-timer announcement", () => {
  const f = fixture({ denied: false, duration: 1, remaining: 0 });
  f.mount();
  assert.equal(f.controls["#timer-status"].textContent, "timerDone");
  assert.deepEqual(f.sounds, ["done"]);
  assert.equal(f.writes.length, 1);
});

test("real normalization on scheduled expiration announces completion exactly once", () => {
  const begin = source.indexOf("function normalizeTimer() {");
  const end = source.indexOf("\nconst TIMER_EPHEMERAL_COPY =", begin);
  assert.ok(begin >= 0 && end > begin, "canonical normalization must be executed");
  const fields = {
    "#timer-minutes": { value: "1", disabled: false },
    "#timer-display": { textContent: "" },
    "#timer-start": { textContent: "" },
    "#timer-reset": { textContent: "" },
    "#timer-status": { textContent: "" },
  };
  const state = {
    lang: "uk",
    studyTimer: { durationMinutes: 1, remainingSeconds: 1, running: false, endsAt: null },
  };
  const sounds = [];
  let tick, cleared = 0;
  const context = vm.createContext({
    state,
    localStorage: { setItem: () => undefined },
    document: { querySelector: key => fields[key] ?? null },
    timerText: timer => String(timer.remainingSeconds),
    t: key => key,
    play: sound => sounds.push(sound),
    clearInterval: () => { cleared++; },
    setInterval: callback => { tick = callback; return 42; },
  });
  vm.runInContext(
    "let timerInterval = null;\n" + source.slice(begin, end) + "\n" + timerCode,
    context,
  );
  context.activateTimer();
  fields["#timer-start"].onclick();
  assert.equal(state.studyTimer.running, true);
  // Simulate the monotonic deadline having elapsed between interval ticks.
  state.studyTimer.endsAt = Date.now() - 1000;
  tick();
  assert.equal(state.studyTimer.running, false);
  assert.equal(state.studyTimer.remainingSeconds, 0);
  assert.equal(fields["#timer-display"].textContent, "0");
  assert.equal(fields["#timer-status"].textContent, "timerDone");
  assert.deepEqual(sounds, ["done"]);
  assert.ok(cleared >= 2, "completed interval must be cleared");
  tick();
  assert.deepEqual(sounds, ["done"], "repeated ticks must not replay completion");
});
