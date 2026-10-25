import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const app = await readFile(new URL("../public/app.js", import.meta.url), "utf8");

test("global navigation labels follow the active language", () => {
  assert.match(page, /data-i18n="skipToContent"/);
  assert.match(page, /data-i18n-aria-label="brandHome"/);
  assert.match(page, /data-i18n-aria-label="primaryNavigation"/);
  assert.doesNotMatch(page, /id="language" aria-label="Language"/);
  assert.match(app, /querySelectorAll\("\[data-i18n-aria-label\]"\)/);
  for (const text of [
    "Основна навігація",
    "Основная навигация",
    "Primary navigation",
    "Перейти до основного вмісту",
    "Перейти к основному содержимому",
    "Skip to main content",
  ]) assert.ok(app.includes(text), `missing localized label: ${text}`);
});

test("reading timer explains its purpose and announces state changes", () => {
  for (const text of [
    "Таймер особистого читання",
    "Таймер личного чтения",
    "Personal reading timer",
    "timerStarted",
    "timerPaused",
    "timerResetDone",
    "timerDone",
  ]) assert.ok(app.includes(text), `missing timer copy or behavior: ${text}`);
  assert.match(app, /role="timer"/);
  assert.match(app, /role="status" aria-live="polite" aria-atomic="true"/);
  assert.match(app, /aria-controls="timer-display timer-status"/);
});

test("reader rerenders restore focus to the control that changed", () => {
  assert.match(app, /pendingFocusId='bible-edition'/);
  assert.match(app, /pendingFocusId='book-select'/);
  assert.match(app, /pendingFocusId='chapter-select'/);
  assert.match(app, /pendingFocusId = "language"/);
  assert.match(app, /document\.getElementById\(focusId\)\?\.focus\(\{ preventScroll: true \}\)/);
});

