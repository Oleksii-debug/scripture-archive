import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  validateDossierGraph, searchScriptureDossiers,
  dossierMarkup, dossierAtlasMarkup,
} from '../public/scripture-dossiers.js';

// Use the real approved Bible catalogue and graph; hostile wrappers must
// never lend their prototype's book names to visible source citations.
const catalog = JSON.parse(readFileSync(new URL('../public/data/catalog.json', import.meta.url), 'utf8'));
const esc = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;')
  .replaceAll('>','&gt;').replaceAll('"','&quot;');
const inherited = value => Object.create(value);
const fakeTitle = 'UNOWNED FORGED GENESIS SOURCE';
const fakeBooks = catalog.books.uk.map(book =>
  book.code === 'GEN' ? {...book, title:fakeTitle} : {...book});
const inheritedInventories = {books:inherited({
  uk:fakeBooks, ru:catalog.books.ru, en:catalog.books.en,
})};

test('real canonical catalogue still validates and exposes its published citations', () => {
  assert.equal(validateDossierGraph(catalog), true);
  const html = dossierMarkup(catalog,'uk','abraham',esc);
  assert.match(html, /\/reader\/GEN\/12/);
  assert.doesNotMatch(html, /UNOWNED FORGED/);
  assert.match(dossierAtlasMarkup(catalog,'en',esc), /Scripture atlas/);
});

test('inherited books root cannot authorize a source graph or its links', () => {
  const spoofed = inherited({books:catalog.books});
  assert.equal(validateDossierGraph(spoofed), false);
  assert.match(dossierMarkup(spoofed,'en','abraham',esc), /role="alert"/);
  assert.match(dossierAtlasMarkup(spoofed,'en',esc), /role="alert"/);
});

test('inherited language inventories cannot authorize a dossier or atlas', () => {
  assert.equal(validateDossierGraph(inheritedInventories), false);
  const html = dossierMarkup(inheritedInventories,'uk','abraham',esc);
  assert.match(html, /role="alert"/);
  assert.doesNotMatch(html, /UNOWNED FORGED/);
  const atlas = dossierAtlasMarkup(inheritedInventories,'uk',esc);
  assert.match(atlas, /role="alert"/);
  assert.doesNotMatch(atlas, /UNOWNED FORGED/);
});

test('inherited code, title and chapter fields cannot authorize source labels', () => {
  for (const field of ['code','title','chapters']) {
    const altered = catalog.books.uk.map(book => {
      const record = {...book};
      const value = record[field];
      delete record[field];
      return Object.assign(Object.create({[field]:value}), record);
    });
    const spoofed = {books:{...catalog.books,uk:altered}};
    assert.equal(validateDossierGraph(spoofed),false,field);
    assert.match(dossierMarkup(spoofed,'uk','abraham',esc),/role="alert"/,field);
  }
});

test('standalone public search cannot discover fabricated inherited book titles', () => {
  assert.deepEqual(searchScriptureDossiers('uk',fakeTitle,inheritedInventories),[]);
  const spoofedFields = {books:{...catalog.books,uk:catalog.books.uk.map(book =>
    book.code === 'GEN' ? Object.assign(Object.create({title:fakeTitle}), {
      code:book.code, chapters:book.chapters,
    }) : book)}};
  assert.deepEqual(searchScriptureDossiers('uk',fakeTitle,spoofedFields),[]);
  const realName=catalog.books.en.find(book=>book.code==='GEN').title;
  assert.ok(searchScriptureDossiers('en',realName,catalog).length>0);
});

test('own properties on null-prototype catalogues remain valid; no false denial', () => {
  const ownBooks=Object.assign(Object.create(null),catalog.books);
  const ownRoot=Object.assign(Object.create(null),{books:ownBooks});
  assert.equal(validateDossierGraph(ownRoot),true);
  assert.match(dossierMarkup(ownRoot,'en','abraham',esc), /\/reader\/GEN\/12/);
});

test('sparse or oversized book arrays fail closed instead of throwing in Map', () => {
  for (const language of ['uk','ru','en']) {
    const sparse = [...catalog.books[language]];
    delete sparse[1];
    const spoofed = {books:{...catalog.books,[language]:sparse}};
    assert.doesNotThrow(()=>validateDossierGraph(spoofed),language);
    assert.equal(validateDossierGraph(spoofed),false,language);
    assert.match(dossierMarkup(spoofed,language,'abraham',esc),/role="alert"/);
    assert.match(dossierAtlasMarkup(spoofed,language,esc),/role="alert"/);
    const oversized = Array.from({length:201},()=>({...catalog.books[language][0]}));
    assert.equal(validateDossierGraph({books:{...catalog.books,[language]:oversized}}),false,language);
  }
});
