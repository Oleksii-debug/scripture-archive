import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { routeSourceFromLocation } from "../public/route-location.js";

// Execute the canonical route resolver and actual reader URL helper, not a
// parallel URL parser. Legacy #/reader links are still a supported entrypoint.
const source = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const start = source.indexOf("function readerChapterUrl(");
const end = source.indexOf("\nasync function renderReader(", start);
assert.ok(start >= 0 && end > start, "canonical reader URL helpers exist");
const { readerVerseFromUrl } = vm.runInNewContext(
  source.slice(start, end) + "\n({readerVerseFromUrl})",
  { URL, URLSearchParams, Number, encodeURIComponent },
);

test("legacy hash verse query stays outside the chapter coordinate", () => {
  assert.equal(
    routeSourceFromLocation({ pathname: "/", hash: "#/reader/JHN/3?verse=16" }),
    "reader/JHN/3",
  );
  assert.equal(
    routeSourceFromLocation({ pathname: "/", hash: "#/reader/JHN/3/group/g_123?verse=16" }),
    "reader/JHN/3/group/g_123",
  );
  assert.equal(
    routeSourceFromLocation({ pathname: "/reader/JHN/3", hash: "#v16" }),
    "reader/JHN/3",
    "ordinary fragment anchors are not routes",
  );
});

test("supported legacy hash reader links focus their exact verse", () => {
  for (const url of [
    "https://scripture.invalid/#/reader/JHN/3?verse=16",
    "https://scripture.invalid/#/reader/jhn/3?verse=16",
    "https://scripture.invalid/#/reader/JHN/3/group/g_123?verse=16",
    "https://scripture.invalid/?verse=16#/reader/JHN/3",
  ]) {
    assert.equal(readerVerseFromUrl(url, 36), 16, url);
  }
  assert.equal(readerVerseFromUrl("https://scripture.invalid/reader/JHN/3?verse=16", 36), 16);
});

test("legacy hash verse queries fail closed on ambiguous and invalid coordinates", () => {
  for (const query of [
    "verse=0", "verse=01", "verse=-1", "verse=1e2", "verse=16x",
    "verse=37", "verse=999999999999999999999999",
    "verse=16&verse=17", "verse=16&verse=", "chapter=16",
  ]) {
    const url = "https://scripture.invalid/#/reader/JHN/3?" + query;
    assert.equal(readerVerseFromUrl(url, 36), null, query);
  }
  assert.equal(
    readerVerseFromUrl("https://scripture.invalid/?verse=15#/reader/JHN/3?verse=16", 36),
    null, "two independent verse authorities must not be silently reconciled",
  );
  assert.equal(readerVerseFromUrl("https://scripture.invalid/#/reader/JHN/3?verse=16", 15), null);
});

test("canonical route passes the legacy chapter, not its query, to the reader", async () => {
  const routeStart = source.indexOf("async function route() {");
  const routeEnd = source.indexOf('\n}\n\nlangSelect.addEventListener("change"', routeStart);
  assert.ok(routeStart >= 0 && routeEnd > routeStart);
  const received = [];
  const ctx = {
    state: {}, location: { pathname: "/", search: "", hash: "#/reader/JHN/3?verse=16" },
    routeSourceFromLocation, clearInterval() {}, timerInterval: null,
    communityRefreshInterval: null, communityOwnerRefreshInterval: null,
    renderReader: async parts => received.push([...parts]),
    cleanPublicCopy() {}, setStaticI18n() {}, updatePageMetadata() {},
    window: { scrollTo() {}, saAnalytics: { track() {} } },
    main: { querySelector() { return null; } },
    shell() { throw Error("unexpected error shell"); },
    console: { error(error) { throw error; } },
  };
  const { route } = vm.runInNewContext(source.slice(routeStart, routeEnd + 2) + "\n({route})", ctx);
  await route();
  assert.deepEqual(received, [["reader", "JHN", "3"]]);
});
