import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("language selector takes its accessible name from the localized associated label", async () => {
  const [page, app] = await Promise.all([read("app/page.tsx"), read("public/app.js")]);
  const label = page.match(/<label\b[^>]*\bhtmlFor="language"[^>]*>/)?.[0];
  const select = page.match(/<select\b[^>]*\bid="language"[^>]*>/)?.[0];

  assert.ok(label, "language selector needs a native associated label");
  assert.match(label, /\bdata-i18n="language"/);
  assert.ok(select, "native language selector must remain present");
  // aria-label takes precedence over <label> in the accessible-name computation.
  assert.doesNotMatch(select, /\baria-label\s*=/, "do not mask translated label with a fixed name");

  for (const translation of ['Мова', 'Язык', 'Language'])
    assert.ok(app.includes(`language: "${translation}"`), `missing locale label: ${translation}`);
  assert.match(app, /document\.documentElement\.lang\s*=\s*state\.lang/);
  assert.match(app, /querySelectorAll\("\[data-i18n\]"\)/);
});
