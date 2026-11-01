import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { routeSourceFromLocation } from "../public/route-location.js";

// Execute the canonical renderReader route-shape gate, not a substitute
// path parser. A legacy fragment query is not part of its route coordinates.
const source = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const start = source.indexOf('  const readerPath = typeof location === "undefined" ? "" :');
const end = source.indexOf("  const catalog = await getCatalog();", start);
assert.ok(start >= 0 && end > start, "canonical reader route-shape gate exists");
const check = vm.runInNewContext(
  "(location, routeSourceFromLocation, state, shell, t, parts) => {\n" +
    source.slice(start, end) + "\nreturn readerPath;\n}",
);

function probe(location) {
  const state = { currentReader: { book: "GEN", chapter: 3 } };
  const alerts = [];
  const parts = routeSourceFromLocation(location).split("/").filter(Boolean);
  const readerPath = check(location, routeSourceFromLocation, state,
    markup => alerts.push(markup), key => key, parts);
  return { readerPath, state, alerts };
}

test("legacy hash reader query does not become a malformed route coordinate", () => {
  for (const hash of [
    "#/reader/GEN/3?verse=16&source=https://example.invalid/a/b",
    "#/reader/GEN/3/group/g_123?verse=16&source=https://example.invalid/a/b",
    "#/reader/GEN/3?source=https://example.invalid/a/b",
  ]) {
    const result = probe({ pathname: "/", search: "", hash });
    assert.equal(result.readerPath, hash.slice(2).split("?")[0], hash);
    assert.deepEqual(result.alerts, [], hash);
    assert.deepEqual(result.state.currentReader, { book: "GEN", chapter: 3 }, hash);
  }
});

test("actual empty reader path segments still fail closed before catalog access", () => {
  for (const location of [
    { pathname: "//reader/GEN/3", search: "", hash: "" },
    { pathname: "/", search: "", hash: "#//reader/GEN/3" },
    { pathname: "/reader/GEN//3", search: "?source=https://example.invalid/a", hash: "" },
    { pathname: "/", search: "", hash: "#/reader/GEN//3?source=https://example.invalid/a" },
    { pathname: "/", search: "", hash: "#/reader/GEN/3/group//g_123?verse=16" },
  ]) {
    const result = probe(location);
    assert.equal(result.readerPath, undefined);
    assert.equal(result.state.currentReader, null);
    assert.equal(result.alerts.length, 1);
    assert.match(result.alerts[0], /role="alert"/);
    assert.match(result.alerts[0], /href="\/reader"/);
  }
});

test("ordinary reader URL and legacy verse-only query remain accepted", () => {
  for (const location of [
    { pathname: "/reader/GEN/3", search: "?verse=16", hash: "" },
    { pathname: "/", search: "", hash: "#/reader/GEN/3?verse=16" },
  ]) {
    const result = probe(location);
    assert.equal(result.readerPath, "reader/GEN/3");
    assert.deepEqual(result.alerts, []);
  }
});
