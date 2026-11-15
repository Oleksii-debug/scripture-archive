import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dossierAtlasMarkup,dossierMarkup,searchScriptureDossiers,validateDossierGraph} from '../public/scripture-dossiers.js';

const catalog=JSON.parse(readFileSync(new URL('../public/data/catalog.json',import.meta.url),'utf8'));
const esc=value=>String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

test('SA-EXT-05: all BMP variation selectors fail closed in native dossier and atlas GET search',()=>{
  assert.equal(validateDossierGraph(catalog),true);
  for(const lang of ['uk','ru','en']){
    for(let cp=0xfe00;cp<=0xfe0f;cp++){
      const query='Abra'+String.fromCodePoint(cp)+'ham';
      assert.deepEqual(searchScriptureDossiers(lang,query,catalog),[],
        lang+' U+'+cp.toString(16));
      const dossier=dossierMarkup(catalog,lang,null,esc,query);
      const atlas=dossierAtlasMarkup(catalog,lang,esc,query);
      for(const html of [dossier,atlas]){
        assert.match(html,/role="alert"/,lang+' U+'+cp.toString(16));
        assert.doesNotMatch(html,/href="\/reader\//,'no source links for hidden query');
        assert.doesNotMatch(html,/href="\/dossiers\?/,'no dossier links for hidden query');
        assert.doesNotMatch(html,/<form /,'do not echo hidden query into form controls');
      }
    }
    assert.ok(searchScriptureDossiers(lang,'GEN 12',catalog).some(item=>item.id==='abraham'));
    assert.match(dossierMarkup(catalog,lang,'abraham',esc,'GEN 12'),/href="\/reader\/GEN\/12\?verse=1"/);
    assert.match(dossierAtlasMarkup(catalog,lang,esc,'GEN 12'),/href="\/reader\//);
    assert.match(dossierMarkup(catalog,lang,null,esc,' \t '),/href="\/reader\//,
      'ordinary blank GET remains backward compatible');
  }
});
