import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import test from "node:test";

test("fatal route errors expose a localized screen-reader alert without internal details", async () => {
  const app = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
  const start = app.indexOf("async function route() {");
  const end = app.indexOf('\nlangSelect.addEventListener("change"', start);
  assert.ok(start !== -1 && end > start, "exercise the canonical route function");
  const actualRoute = app.slice(start, end);

  for (const [lang, message] of Object.entries({
    uk: "Не вдалося завантажити",
    ru: "Не удалось загрузить",
    en: "Unable to load",
  })) {
    let rendered = "";
    const context = {
      clearInterval() {},
      timerInterval: null,
      communityRefreshInterval: null,
      communityOwnerRefreshInterval: null,
      location: { hash: "", pathname: "/reader" },
      state: { lang, currentReader: null },
      async renderReader() { throw new Error("private internal diagnostics"); },
      shell(html) { rendered = html; },
      t(key) { assert.ok(["errorLoad", "retryLoad"].includes(key)); return key === "errorLoad" ? message : "retry"; },
      document: { querySelector() { return { addEventListener() {} }; } },
      console: { error() {} },
      window: { saAnalytics: null, scrollTo() {} },
    };
    await runInNewContext(actualRoute + "\nroute();", context);
    assert.match(rendered, /<div class="notice error" role="alert">/, `${lang}: error announcement must be a live alert`);
    assert.ok(rendered.includes(message), `${lang}: localized error content must be visible`);
    assert.ok(rendered.includes('id="retry-load"'), "retry control must remain available");
    assert.ok(!rendered.includes("private internal diagnostics"), "do not expose internal exception details");
  }
});
