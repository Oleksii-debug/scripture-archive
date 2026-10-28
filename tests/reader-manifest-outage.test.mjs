import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

// Read the production reader/manifest path. These tests are source-level
// regressions, not a substitute for running the deployed Next.js application.
const source = (await readFile(new URL("../public/app.js", import.meta.url), "utf8"))
  .replaceAll("\r\n", "\n");
const helper = source.match(
  /(async function readerMissionManifest\(\) \{[\s\S]*?\n\})\nfunction setActiveNav\(/,
);
assert.ok(helper, "canonical reader manifest fallback must exist");

function makeReaderManifest(getMission, state = { mission: null }) {
  return vm.runInNewContext("(" + helper[1] + ")", {
    getMission,
    console: { warn() {} },
    state,
  });
}

test("manifest 503 must not reject public Scripture reading", async () => {
  const mission = makeReaderManifest(async () => { throw Error("HTTP 503"); });
  assert.equal(await mission(), null);
});

test("valid manifest remains the canonical source for available tasks", async () => {
  const canonical = { chapters: [{ book: "GEN", chapter: 1 }] };
  assert.equal(await makeReaderManifest(async () => canonical)(), canonical);
});

test("temporary failure is retryable on a subsequent reader route", async () => {
  let calls = 0;
  const canonical = { chapters: [{ book: "GEN", chapter: 1 }] };
  const mission = makeReaderManifest(async () => {
    if (++calls === 1) throw Error("offline");
    return canonical;
  });
  assert.equal(await mission(), null);
  assert.equal(await mission(), canonical);
  assert.equal(calls, 2);
});

const start = source.indexOf("  const w=workspaceCopy(state.lang),attemptCopy=ATTEMPT_COPY[");
const end = source.indexOf("\n  document.querySelector('.chapter-nav')", start);
assert.ok(start >= 0 && end > start, "canonical reader's task gate must exist");
const gate = source.slice(start, end);

function runGate(missionManifest) {
  return vm.runInNewContext(
    "(async () => {" + gate + "\nreturn {hasTasks};})",
    {
      readerMissionManifest: async () => missionManifest,
      workspaceCopy: () => ({}),
      loadJSON: () => [],
      ATTEMPT_COPY: { uk: {} },
      state: { lang: "uk" },
      meta: { code: "GEN" },
      chapter: 1,
    },
  )();
}

test("reader task gate fails open for Bible text but does not fabricate tasks", async () => {
  assert.equal((await runGate(null)).hasTasks, false);
  assert.equal(
    (await runGate({ chapters: [{ book: "GEN", chapter: 1 }] })).hasTasks,
    true,
  );
  assert.equal(
    (await runGate({ chapters: [{ book: "EXO", chapter: 1 }] })).hasTasks,
    false,
  );
});

test("UK/RU/EN have visible truthful temporary-unavailability notice", () => {
  for (const message of [
    "Завдання тимчасово недоступні. Читання та пошук доступні.",
    "Задания временно недоступны. Чтение и поиск доступны.",
    "Exercises are temporarily unavailable. Reading and search are still available.",
  ]) assert.ok(source.includes(message), message);
  assert.match(source, /<p class="notice" role="status">\$\{t\("readerMissionUnavailable"\)\}<\/p>/);
  assert.match(source, /missionManifest=await readerMissionManifest\(\)/);
});

test("malformed HTTP 200 manifests do not abort public reading", async () => {
  const cache = { mission: { chapters: { fake: true } } };
  const manifest = makeReaderManifest(async () => cache.mission, cache);
  assert.equal(await manifest(), null);
  assert.equal(cache.mission, null, "invalid success must not poison the cache");
  assert.equal((await runGate({ chapters: { fake: true } })).hasTasks, false);
});

test("an invalid cached response can recover on the next reader route", async () => {
  const cache = { mission: null };
  let calls = 0;
  const valid = { chapters: [{ book: "GEN", chapter: 1 }] };
  const manifest = makeReaderManifest(async () => {
    cache.mission = ++calls === 1 ? { chapters: "corrupt" } : valid;
    return cache.mission;
  }, cache);
  assert.equal(await manifest(), null);
  assert.equal(cache.mission, null);
  assert.equal(await manifest(), valid);
  assert.equal(calls, 2);
});

test("an active-attempt locked response stays locked but is not cached indefinitely", async () => {
  const cache = { mission: { id: "mission", locked: true } };
  const locked = cache.mission;
  assert.equal(await makeReaderManifest(async () => cache.mission, cache)(), locked);
  assert.equal(cache.mission, null);
  assert.equal((await runGate(locked)).hasTasks, false);
});

test("malformed null chapter entries cannot crash reading or fabricate tasks", async () => {
  assert.equal((await runGate({ chapters: [null] })).hasTasks, false);
  assert.equal((await runGate({ chapters: [null, { book: "GEN", chapter: 1 }] })).hasTasks, true);
});
