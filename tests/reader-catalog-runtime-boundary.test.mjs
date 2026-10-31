import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// Exercise the real browser reader's catalog admission; no duplicated validator.
const source = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const start = source.indexOf('function validBibleCatalog(');
const end = source.indexOf('\nasync function getCatalog(', start);
assert.ok(start >= 0 && end > start, 'production reader catalog validator exists');
const validate = new Function(source.slice(start, end) + '\nreturn validBibleCatalog;')();
const catalog = JSON.parse(readFileSync(new URL('../public/data/catalog.json', import.meta.url), 'utf8'));
const clone = () => structuredClone(catalog);

test('actual canonical Bible catalog remains readable, including all 66 books and local editions', () => {
  assert.equal(validate(catalog), true);
  for (const lang of ['uk', 'ru', 'en']) assert.equal(catalog.books[lang].length, 66);
  assert.ok(Object.keys(catalog.editionBooks).length > 0);
});

test('rejects forged book codes before using them in reader URLs, DOM, or fetch paths', () => {
  for (const code of ['GEN" onmouseover="alert(1)', '<svg/onload=alert(1)>',
    '../', 'G/N', 'gen', 'GÉN', 'GEN\n', '1234']) {
    const damaged = clone();
    for (const books of [...Object.values(damaged.books), ...Object.values(damaged.editionBooks)])
      books[0].code = code;
    assert.equal(validate(damaged), false, JSON.stringify(code));
  }
  // A single malicious alternate edition is rejected, even if the primary is safe.
  const alternate = clone();
  Object.values(alternate.editionBooks)[0][0].code = 'GEN"';
  assert.equal(validate(alternate), false);
});

test('refuses impossible or unsafe chapter counts in every edition', () => {
  for (const chapters of [0, -1, 201, Number.MAX_SAFE_INTEGER, 1e20, 3.5, '50', null]) {
    const damaged = clone();
    Object.values(damaged.editionBooks)[0][0].chapters = chapters;
    assert.equal(validate(damaged), false, String(chapters));
    damaged.editionBooks = clone().editionBooks;
    damaged.books.uk[0].chapters = chapters;
    assert.equal(validate(damaged), false, 'primary ' + chapters);
  }
  const safe = clone();
  safe.books.uk.find(book => book.code === 'PSA').chapters = 150;
  assert.equal(validate(safe), true, 'Psalm 150-chapter canonical bound remains valid');
});

test('rejects sparse primary book lists instead of treating missing slots as a 66th book', () => {
  // A damaged in-memory catalog can be sparse even though ordinary JSON
  // transport encodes holes as null. editionBooks is optional by contract.
  const damaged = clone();
  delete damaged.editionBooks;
  for (const lang of ['uk', 'ru', 'en']) delete damaged.books[lang][10];
  assert.equal(validate(damaged), false, 'matching holes across locales must fail closed');
  assert.equal(validate(catalog), true, 'unchanged canonical catalog still loads');
});

test('rejects a sparse approved-edition inventory before reader cache and citations', () => {
  for (const editionId of Object.keys(catalog.editionBooks)) {
    const damaged = clone();
    delete damaged.editionBooks[editionId][10];
    assert.equal(validate(damaged), false, editionId);
  }
  assert.equal(validate(catalog), true, 'healthy catalog recovers without mutation');
});
