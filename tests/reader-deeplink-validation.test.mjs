import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// Exercise the current production functions, not a copied implementation.
const app = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
const start = app.indexOf("function readerVerseUrl(");
const end = app.indexOf("\nasync function renderReader(", start);
assert.ok(start >= 0 && end > start, "canonical reader helper region must remain in app.js");
const helpers = new Function(app.slice(start, end) + "\nreturn { readerVerseFromUrl, readerChapterNumber };")();

test("actual reader rejects ambiguous, absent, malformed and overflow verse coordinates", () => {
  const valid = "https://scripture.invalid/reader/GEN/1?verse=3";
  assert.equal(helpers.readerVerseFromUrl(valid, 31), 3);
  for (const suffix of ["", "?verse=0", "?verse=-1", "?verse=01", "?verse=1.5", "?verse=1e2", "?verse=3&verse=4", "?verse=3&verse=", "?verse=9999999999999999999999999", "?verse=%20", "?chapter=3"]) {
    const url = "https://scripture.invalid/reader/GEN/1" + suffix;
    assert.equal(helpers.readerVerseFromUrl(url, 31), null, suffix);
  }
  assert.equal(helpers.readerVerseFromUrl(valid, 2), null, "out-of-range existing chapter");
  assert.equal(helpers.readerVerseFromUrl(valid, 0), null, "empty chapter");
});

test("actual reader accepts only canonical safe integer chapters for edition-specific bounds", () => {
  for (const max of [3,4,21,50,150]) {
    assert.equal(helpers.readerChapterNumber("1",max),1);
    assert.equal(helpers.readerChapterNumber(String(max),max),max);
    assert.equal(helpers.readerChapterNumber(max+1,max),max);
  }
  for (const bad of ["1.5","0.5","NaN","Infinity","-1","1e2","0x10","01","",1.5,Number.NaN,Number.POSITIVE_INFINITY,Number.MAX_SAFE_INTEGER+1])
    assert.equal(helpers.readerChapterNumber(bad,21),1,String(bad));
  assert.equal(helpers.readerChapterNumber("4",4),4,"four-chapter Ohiienko Joel");
  assert.equal(helpers.readerChapterNumber("4",3),3,"three-chapter historical Joel");
});

test("canonical reader refuses verse focus when its URL does not match the displayed coordinate", () => {
  assert.match(app,/const chapter = readerChapterNumber\(parts\[2\] \|\| state\.reader\?\.chapter \|\| 1, meta\.chapters\)/);
  assert.match(app,/const verseCoordinateMatches = parts\[1\] === meta\.code && parts\[2\] === String\(chapter\)/);
  assert.match(app,/const selectedVerse = verseCoordinateMatches \? readerVerseFromUrl\(location\.href, verses\.length\) : null/);
  assert.match(app,/selected\.focus\(\{ preventScroll: true \}\)/);
});
