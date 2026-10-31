import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dossierMarkup,validateDossierGraph} from '../public/scripture-dossiers.js';

const catalog=JSON.parse(readFileSync(new URL('../public/data/catalog.json',import.meta.url),'utf8'));
const esc=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const show=(lang,left,right)=>dossierMarkup(catalog,lang,left,esc,'',right);

test('SA-EXT-05 comparison is linked from the canonical dossier route and keyboard GET form',()=>{
  assert.equal(validateDossierGraph(catalog),true);
  const source=readFileSync(new URL('../public/workspace.js',import.meta.url),'utf8');
  assert.match(source,/get\('compare'\)/);
  assert.match(source,/dossierMarkup\(catalog,state\.lang,selectedId,esc,searchQuery,compareId\)/);
  const html=show('uk','abraham',null);
  assert.match(html,/<form action="\/dossiers" method="get">/);
  assert.match(html,/<input type="hidden" name="id" value="abraham">/);
  assert.match(html,/<label for="dossier-compare">/);
  assert.match(html,/<select id="dossier-compare" name="compare">/);
  assert.match(html,/<option value="sarah">/);
  assert.doesNotMatch(html,/id="dossier-comparison-heading"/);
});

test('comparison presents both complete primary-source lists and actual overlapping verse scopes, not invented history',()=>{
  const html=show('en','abraham','sarah');
  assert.match(html,/<section aria-labelledby="dossier-comparison-heading">/);
  assert.match(html,/<dt>Abraham \(Abram\)<\/dt>/);
  assert.match(html,/<dt>Sarah \(Sarai\)<\/dt>/);
  assert.match(html,/Overlapping verse ranges/);
  assert.match(html,/\/reader\/HEB\/11\?verse=8/);
  assert.match(html,/\/reader\/HEB\/11\?verse=11/);
  assert.match(html,/Thematic comparison, not independent historical proof/);
  assert.match(html,/do not prove independent witnesses/);
});

test('non-overlap and invalid/same dossier comparison fail without a false shared witness',()=>{
  const disjoint=show('uk','abraham','joseph');
  assert.match(disjoint,/діапазони .* не перетинаються/);
  assert.doesNotMatch(disjoint,/<h4>[^<]*<\/h4><ol>/);
  for(const bad of ['__proto__','DOES_NOT_EXIST','abraham']){
    const html=show('ru','abraham',bad);
    assert.match(html,/<p role="alert">Второе досье не найдено/);
    assert.doesNotMatch(html,/id="dossier-comparison-heading"/);
  }
});

test('comparison labels and selected options remain localized in each supported language',()=>{
  for(const [lang,label] of [['uk','Порівняти з іншим досьє'],['ru','Сравнить с другим досье'],['en','Compare with another dossier']]){
    const html=show(lang,'abraham','sarah');
    assert.ok(html.includes(label));
    assert.match(html,/<option value="sarah" selected>/);
    assert.match(html,/<a href="\/reader\/HEB\/11\?verse=11"/);
  }
});

test('SA-EXT-05: overlapping source pairs link the exact shared intersection, not the entire parent passages',()=>{
  for(const [lang,label] of [['uk','Спільні вірші'],['ru','Общие стихи'],['en','Shared verses']]){
    const abraham=show(lang,'abraham','sarah');
    const comparison=abraham.slice(abraham.indexOf('id="dossier-comparison-heading"'));
    assert.ok(comparison.includes('<strong>'+label+':</strong> <a href="/reader/HEB/11?verse=11">'),lang+' semantic common-range label and start');
    assert.match(comparison,/>[^<]+ 11:11–12<\/a>/,lang+' exact shared HEB verses, not original 8–12');
    assert.match(comparison,/\/reader\/HEB\/11\?verse=8/,lang+' preserve original Abraham source provenance');
    const david=show(lang,'david','jerusalem');
    const shared=david.slice(david.indexOf('id="dossier-comparison-heading"'));
    assert.ok(shared.includes('<strong>'+label+':</strong> <a href="/reader/2SA/5?verse=6">'),lang+' same-chapter intersection start');
    assert.match(shared,/>[^<]+ 5:6–10<\/a>/,lang+' exact common span from 2SA 5:1–10 and 5:6–10');
    const disjoint=show(lang,'abraham','joseph');
    assert.doesNotMatch(disjoint,/<strong>[^<]+:<\/strong> <a href="\/reader\//,lang+' no invented common verse');
  }
});
