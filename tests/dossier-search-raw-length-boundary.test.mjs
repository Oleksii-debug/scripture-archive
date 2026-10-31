import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {
  searchScriptureDossiers, dossierMarkup, dossierAtlasMarkup,
  validateDossierGraph,
} from '../public/scripture-dossiers.js';

const catalog=JSON.parse(readFileSync(new URL('../public/data/catalog.json',import.meta.url),'utf8'));
const escapeHtml=value=>String(value).replace(/&/g,'&amp;').replace(/"/g,'&quot;')
  .replace(/</g,'&lt;').replace(/>/g,'&gt;');

test('source-backed catalogue remains validated after the GET search bound',()=>{
  assert.equal(validateDossierGraph(catalog),true);
});

for(const lang of ['uk','ru','en']){
  test(lang+': reject >120 raw UTF-16 units before trimming or NFC normalization',()=>{
    for(const q of [' '.repeat(151)+'joseph',' '.repeat(151)+'EXO 1:6','  '.repeat(59)+'GEN 17:15']){
      assert.ok(q.length>120);
      assert.deepEqual(searchScriptureDossiers(lang,q,catalog),[]);
      assert.deepEqual(searchScriptureDossiers(lang,q),[]);
      const dossier=dossierMarkup(catalog,lang,'joseph',escapeHtml,q);
      assert.match(dossier,/^<p role="alert">/);
      assert.doesNotMatch(dossier,/dossier-layout|dossier-article/);
      const atlas=dossierAtlasMarkup(catalog,lang,escapeHtml,q);
      assert.match(atlas,/^<p role="alert">/);
    }
  });

  test(lang+': exact 120-unit GET remains authorized and accessible',()=>{
    const query=' '.repeat(111)+'GEN 17:15';
    assert.equal(query.length,120);
    const ids=searchScriptureDossiers(lang,query,catalog).map(item=>item.id);
    assert.ok(ids.includes('abraham'));
    assert.ok(ids.includes('sarah'));
    const dossier=dossierMarkup(catalog,lang,'sarah',escapeHtml,query);
    assert.match(dossier,/class="dossier-layout"/);
    assert.match(dossier,/aria-current="page"/);
    const atlas=dossierAtlasMarkup(catalog,lang,escapeHtml,query);
    assert.match(atlas,/<table>/);
  });

  test(lang+': short citations, edition names, and search fallback are unchanged',()=>{
    const ids=searchScriptureDossiers(lang,'EXO 1:6',catalog).map(item=>item.id);
    assert.ok(ids.includes('joseph'));
    assert.ok(searchScriptureDossiers(lang,'GEN 17:15',catalog).some(item=>item.id==='sarah'));
    assert.equal(searchScriptureDossiers(lang,'GEN 17:19-15',catalog).length,0);
    assert.deepEqual(searchScriptureDossiers(lang,null,catalog),[]);
    assert.deepEqual(searchScriptureDossiers(lang,42,catalog),[]);
    assert.ok(dossierMarkup(catalog,lang,'sarah',escapeHtml,'GEN 17:15').includes('dossier-layout'));
  });
}
