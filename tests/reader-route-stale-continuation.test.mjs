import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { routeSourceFromLocation } from "../public/route-location.js";

// Execute the canonical route() body, not a parallel router. An old reader
// request may settle after a later navigation to another public page.
const source = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const start = source.indexOf("async function route() {");
const end = source.indexOf('\n}\n\nlangSelect.addEventListener("change"', start);
assert.ok(start >= 0 && end > start, "canonical route entry must exist");
const actualRoute = source.slice(start, end + 2);

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function harness(lang, reader) {
  const events = [];
  const location = { pathname: "/reader/GEN/3", search: "", hash: "" };
  const state = { lang, currentReader: { book: "GEN", chapter: 3 } };
  const ctx = {
    state, location, routeSourceFromLocation,
    clearInterval() {}, timerInterval: null,
    communityRefreshInterval: null, communityOwnerRefreshInterval: null,
    renderReader: () => reader.promise,
    renderPrivacy() { events.push("privacy"); },
    cleanPublicCopy() { events.push("clean"); },
    setStaticI18n() { events.push("i18n"); },
    updatePageMetadata(name) { events.push("metadata:" + name); },
    window: {
      scrollTo() { events.push("scroll"); },
      saAnalytics: { track(name) { events.push("analytics:" + name); } },
    },
    main: { querySelector() { return null; } },
    shell(html) { events.push("error-shell:" + html); },
    document: { querySelector() { return null; } },
    t(key) { return key; },
    console: { error() { events.push("console-error"); } },
  };
  const { route } = vm.runInNewContext(actualRoute + "\n({route})", ctx);
  return { route, state, location, events };
}

for (const lang of ["uk", "ru", "en"]) {
  test(lang + ": rejected old reader request cannot overwrite newer privacy page", async () => {
    const reader = deferred();
    const h = harness(lang, reader);
    const older = h.route();
    h.location.pathname = "/privacy";
    await h.route();
    reader.reject(new Error("old_reader_request_failed"));
    await older;
    assert.deepEqual(h.events, [
      "privacy", "clean", "i18n", "metadata:privacy", "analytics:page_view", "scroll",
    ]);
    assert.equal(Object.keys(h.state).includes("__routeToken"), false,
      "navigation ownership must not become persisted account state");
  });

  test(lang + ": successful old reader request cannot overwrite newer page metadata", async () => {
    const reader = deferred();
    const h = harness(lang, reader);
    const older = h.route();
    h.location.pathname = "/privacy";
    await h.route();
    reader.resolve();
    await older;
    assert.deepEqual(h.events, [
      "privacy", "clean", "i18n", "metadata:privacy", "analytics:page_view", "scroll",
    ]);
  });

  test(lang + ": current reader failure still exposes accessible retry", async () => {
    const reader = deferred();
    const h = harness(lang, reader);
    const current = h.route();
    reader.reject(new Error("current_reader_request_failed"));
    await current;
    assert.ok(h.events.includes("console-error"));
    assert.equal(h.events.filter(e => e.startsWith("error-shell:")).length, 1);
    assert.match(h.events.find(e => e.startsWith("error-shell:")), /role="alert"/);
    assert.match(h.events.find(e => e.startsWith("error-shell:")), /id="retry-load"/);
  });
}
