import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { dossierMarkup, dossierAtlasMarkup, scriptureDossiers, validateDossierGraph } from '../public/scripture-dossiers.js';

const catalog = JSON.parse(readFileSync(new URL('../public/data/catalog.json', import.meta.url), 'utf8'));
const esc = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;')
  .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');

test('invalid authored dossier metadata fails closed before any reader/source link renders', () => {
  assert.equal(validateDossierGraph(catalog), true, 'actual shipped dossiers remain valid');
  const original = scriptureDossiers[0];
  const cases = [
    ['blank dossier name', value => { value.names.uk = '  '; }],
    ['missing dossier names', value => { value.names = null; }],
    ['empty narrative summary', value => { value.summaries.ru = ''; }],
    ['missing summaries object', value => { value.summaries = undefined; }],
    ['no English study prompts', value => { value.prompts.en = []; }],
    ['null question accepted as text', value => { value.prompts.uk = [null]; }],
    ['whitespace-only study question', value => { value.prompts.ru = ['  ']; }],
    ['missing prompt map', value => { value.prompts = null; }],
    ['missing cited source array', value => { value.sources = null; }],
    ['missing related dossier array', value => { value.related = null; }],
    ['null related dossier record', value => { value.related = [null]; }],
    ['blank internal link ID', value => { value.id = ''; }],
    ['unsafe internal link ID', value => { value.id = 'bad" onclick="alert(1)'; }],
  ];
  try {
    for (const [label, change] of cases) {
      scriptureDossiers[0] = structuredClone(original);
      change(scriptureDossiers[0]);
      assert.equal(validateDossierGraph(catalog), false, label);
      for (const lang of ['uk','ru','en']) {
        for (const rendered of [
          dossierMarkup(catalog,lang,'abraham',esc),
          dossierAtlasMarkup(catalog,lang,esc),
        ]) {
          assert.match(rendered, /role="alert"/, label+' '+lang);
          assert.doesNotMatch(rendered, /href="\/reader\//, label+' '+lang);
          assert.doesNotMatch(rendered, /href="\/dossiers\?/, label+' '+lang);
          assert.doesNotMatch(rendered, /onclick=|<script/, label+' '+lang);
        }
      }
    }
    scriptureDossiers[0] = null;
    assert.equal(validateDossierGraph(catalog), false, 'null whole node must fail closed');
  } finally {
    scriptureDossiers[0] = original;
  }
  assert.equal(validateDossierGraph(catalog), true, 'authoritative source remains intact after negative cases');
});


test('dossier catalogue chapter limits match the canonical primary Bible reader', () => {
  assert.equal(validateDossierGraph(catalog), true, 'shipped catalog is admissible');
  for (const lang of ['uk', 'ru', 'en']) {
    const oversized = structuredClone(catalog);
    const book = oversized.books[lang].find(item => item.code === 'GEN');
    assert.ok(book, 'GEN is present in the actual ' + lang + ' catalog');
    book.chapters = 201;
    assert.equal(validateDossierGraph(oversized), false, lang + ': 201 chapters must fail closed');
    for (const rendered of [
      dossierMarkup(oversized, lang, 'abraham', esc),
      dossierAtlasMarkup(oversized, lang, esc),
    ]) {
      assert.match(rendered, /role="alert"/, lang + ': visible unavailable state');
      assert.doesNotMatch(rendered, /href="\/reader\//, lang + ': no reader link on corrupt catalog');
    }
    const boundary = structuredClone(catalog);
    boundary.books[lang].find(item => item.code === 'GEN').chapters = 200;
    assert.equal(validateDossierGraph(boundary), true, lang + ': max 200 chapters remains supported');
  }
});

test('dossier citations and relationship witnesses cannot exceed reader verse bounds', () => {
  assert.equal(validateDossierGraph(catalog), true);
  const original = scriptureDossiers[0];
  const cases = [
    ['first verse 257', node => { node.sources[0].first = 257; node.sources[0].last = 257; }],
    ['last verse 257', node => { node.sources[0].last = 257; }],
    ['relationship witness last verse 257', node => { node.related[0].via.last = 257; }],
    ['relationship witness first verse 257', node => { node.related[0].via.first = 257; node.related[0].via.last = 257; }],
  ];
  try {
    for (const [label, change] of cases) {
      const mutated = structuredClone(original);
      change(mutated);
      scriptureDossiers[0] = mutated;
      assert.equal(validateDossierGraph(catalog), false, label);
      for (const lang of ['uk', 'ru', 'en']) {
        assert.match(dossierMarkup(catalog, lang, 'abraham', esc), /role="alert"/, label + ' ' + lang);
        assert.match(dossierAtlasMarkup(catalog, lang, esc), /role="alert"/, label + ' atlas ' + lang);
      }
    }
    const boundary = structuredClone(original);
    boundary.sources[0].first = 256;
    boundary.sources[0].last = 256;
    scriptureDossiers[0] = boundary;
    assert.equal(validateDossierGraph(catalog), true, 'a bounded 256th verse is structurally admissible');
  } finally {
    scriptureDossiers[0] = original;
  }
  assert.equal(validateDossierGraph(catalog), true, 'original authored source restored');
});
