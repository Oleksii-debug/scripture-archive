import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {scriptureDossiers,validateDossierGraph,dossierMarkup,dossierAtlasMarkup} from '../public/scripture-dossiers.js';

const catalog=JSON.parse(readFileSync(new URL('../public/data/catalog.json',import.meta.url),'utf8'));
const esc=value=>String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const words={
  uk:{narrative:'Зв’язок у біблійній оповіді',interpretive:'Тематичне зіставлення, не незалежний історичний доказ'},
  ru:{narrative:'Связь в библейском повествовании',interpretive:'Тематическое сопоставление, не независимое историческое доказательство'},
  en:{narrative:'Connection in the biblical narrative',interpretive:'Thematic comparison, not independent historical proof'}
};
const links=markup=>[...markup.matchAll(/<a href="\/reader\/[^"]+" aria-label="([^"]+)"/g)].map(match=>match[1]);

test('each dossier citation and relationship witness retains evidence class in the reader-link accessible name',()=>{
  assert.equal(validateDossierGraph(catalog),true);
  assert.equal(scriptureDossiers.length,17);
  for(const lang of ['uk','ru','en']){
    for(const dossier of scriptureDossiers){
      const markup=dossierMarkup(catalog,lang,dossier.id,esc);
      const found=links(markup);
      const refs=[...dossier.sources,...dossier.related.map(edge=>edge.via)];
      assert.equal(found.length,refs.length,lang+' '+dossier.id+' source/link coverage');
      refs.forEach((ref,index)=>{
        assert.ok(found[index].endsWith(' — '+esc(words[lang][ref.kind])),
          lang+' '+dossier.id+' '+ref.book+' '+ref.kind+' missing in accessible reader link');
      });
    }
  }
});

test('atlas preserves every approved source and relationship with spoken source classification',()=>{
  const refs=scriptureDossiers.flatMap(node=>node.sources);
  const relations=scriptureDossiers.flatMap(node=>node.related.map(edge=>edge.via));
  assert.equal(relations.length,17,'approved relationship witnesses must all remain');
  for(const lang of ['uk','ru','en']){
    const markup=dossierAtlasMarkup(catalog,lang,esc);
    const found=links(markup);
    assert.equal(found.length,refs.length+relations.length,lang+' full atlas source coverage');
    for(const label of found){
      assert.ok(label.endsWith(' — '+esc(words[lang].narrative))||
                label.endsWith(' — '+esc(words[lang].interpretive)),
          lang+' source category lost in the link accessible name');
    }
  }
});

test('unsupported language uses Ukrainian provenance and invalid catalogue is fail-closed',()=>{
  const fallback=dossierMarkup(catalog,'__proto__','abraham',esc);
  assert.ok(links(fallback).every(label=>label.includes(' — '+words.uk.narrative)||
                                            label.includes(' — '+words.uk.interpretive)));
  const broken=structuredClone(catalog);
  broken.books.uk[0].chapters=0;
  for(const markup of [dossierMarkup(broken,'uk','abraham',esc),dossierAtlasMarkup(broken,'uk',esc)]){
    assert.match(markup,/role="alert"/);
    assert.equal(links(markup).length,0);
  }
});
