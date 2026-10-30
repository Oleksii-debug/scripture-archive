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
