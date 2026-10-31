import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// Exercise the real browser reader's catalog admission; no duplicated validator.
const source = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const start = source.indexOf('function validBibleCatalog(');
const end = source.indexOf('\nasync function getCatalog(', start);
assert.ok(start >= 0 && end > start, 'production reader catalog validator exists');
const validate = new Function(source.slice(start, end) + '\nreturn validBibleCatalog;')();
// Extract the two existing native reader expressions directly; do not
// duplicate or replace their canonical implementation in this regression.
const entryStart = source.indexOf('const entries = state.catalog?.editionBooks');
const entryEnd = source.indexOf('\n        const expectedChapters', entryStart);
const readerStart = source.indexOf('  const books = catalog.editionBooks && Object.hasOwn(');
const readerEnd = source.indexOf('\n  const code = ', readerStart);
assert.ok(entryStart >= 0 && entryEnd > entryStart && readerStart >= 0 && readerEnd > readerStart);
const chooseForBook = new Function('state', 'edition', 'requestLocale',
  source.slice(entryStart, entryEnd) + '\nreturn entries;');
const chooseForReader = new Function('catalog', 'chosenEdition', 'state',
  source.slice(readerStart, readerEnd) + '\nreturn books;');
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

test('rejects inherited source and edition metadata rather than accepting prototype values', () => {
  const cases = [
    c => { c.books = Object.create(c.books); },
    c => { c.editions = Object.create(c.editions); },
    c => { c.books.uk[0] = Object.create(c.books.uk[0]); },
    c => { c.editions.uk = Object.create(c.editions.uk); },
    c => { const value = c.books; delete c.books; Object.setPrototypeOf(c, {books:value}); },
    c => { const value = c.editions; delete c.editions; Object.setPrototypeOf(c, {editions:value}); },
    c => { const value = c.editionBooks; delete c.editionBooks; Object.setPrototypeOf(c, {editionBooks:value}); },
  ];
  for (const [index, corrupt] of cases.entries()) {
    const damaged = clone();
    corrupt(damaged);
    assert.equal(validate(damaged), false, 'inherited source case '+index);
    assert.equal(validate(catalog), true, 'canonical source remains usable');
  }
});

test('never selects a forged inherited alternate inventory for reader or book fetch', () => {
  const damaged = clone();
  const alternate = damaged.editionBooks['uk-ohiienko'];
  delete damaged.editionBooks['uk-ohiienko'];
  alternate[0].title = 'UNVERIFIED INHERITED TITLE';
  Object.setPrototypeOf(damaged.editionBooks, {'uk-ohiienko':alternate});
  assert.equal(validate(damaged), false, 'validator rejects uninspected inherited edition');
  for (const select of [
    c => chooseForReader(c, {id:'uk-ohiienko'}, {lang:'uk'}),
    c => chooseForBook({catalog:c}, {id:'uk-ohiienko'}, 'uk'),
  ]) {
    assert.equal(select(damaged), damaged.books.uk,
      'reader and book fetch reject inherited alternate');
    assert.equal(select(catalog), catalog.editionBooks['uk-ohiienko'],
      'healthy local Ohiienko edition remains selected');
  }
  assert.equal(chooseForReader(catalog, {id:'uk-kulish'}, {lang:'uk'}), catalog.books.uk,
    'primary historical Ukrainian edition retains its fallback');
  const nullPrototype = clone();
  Object.setPrototypeOf(nullPrototype.editionBooks, null);
  assert.equal(validate(nullPrototype), true, 'safe null-prototype own-key inventory remains valid');
});


test('rejects coordinated all-locale source reordering and valid-looking invented codes', () => {
  // A self-consistent but damaged Ukrainian list must not become its own
  // canonical authority: all three locales and alternate editions can agree
  // on a false 66-book sequence. Exercise the exact production validator.
  const allInventories = value => [
    ...Object.values(value.books), ...Object.values(value.editionBooks),
  ];
  for (let index = 0; index < 66; index++) {
    const damaged = clone();
    for (const books of allInventories(damaged)) books[index].code = 'ZZZ';
    assert.equal(validate(damaged), false, 'invented book code at index ' + index);
  }
  for (let index = 1; index < 66; index++) {
    const damaged = clone();
    for (const books of allInventories(damaged))
      [books[0], books[index]] = [books[index], books[0]];
    assert.equal(validate(damaged), false, 'all-inventory canonical reorder at index ' + index);
  }
  // Never read an inherited accessor before checking ownership of source
  // fields: corrupt catalogue objects must fail closed without executing it.
  const inheritedGetter = clone();
  inheritedGetter.books.uk[0] = Object.create({
    get code() { throw Error('untrusted inherited source getter'); },
  });
  assert.equal(validate(inheritedGetter), false, 'inherited source getter is not consulted');
  const intact = clone();
  assert.equal(validate(intact), true, 'original 66-book catalogue remains accepted');
  // Edition-specific chapter counts are legitimate, unlike a changed code/order.
  intact.books.uk.find(book => book.code === 'JOL').chapters = 4;
  assert.equal(validate(intact), true, 'legitimate edition chapter variation is preserved');
});


test('canonical 39 OT and 27 NT books cannot be relabelled across all editions', () => {
  const inventories = value => [...Object.values(value.books), ...Object.values(value.editionBooks)];
  for (let index = 0; index < 66; index++) {
    const damaged = clone();
    const falseTestament = index < 39 ? 'NT' : 'OT';
    for (const books of inventories(damaged)) books[index].testament = falseTestament;
    assert.equal(validate(damaged), false, 'false canonical testament at index ' + index);
  }
  const valid = clone();
  assert.equal(validate(valid), true, 'actual OT/NT boundaries remain readable');
  valid.books.uk.find(book => book.code === 'JOL').chapters = 4;
  assert.equal(validate(valid), true, 'legitimate edition chapter counts remain independent');
});
