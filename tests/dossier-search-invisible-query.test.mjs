import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {
  searchScriptureDossiers, dossierMarkup, dossierAtlasMarkup,
  validateDossierGraph,
} from '../public/scripture-dossiers.js';

const catalog=JSON.parse(readFileSync(new URL('../public/data/catalog.json',import.meta.url),'utf8'));
const esc=value=>String(value).replace(/&/g,'&amp;').replace(/"/g,'&quot;')
  .replace(/</g,'&lt;').replace(/>/g,'&gt;');

test('verified dossier catalogue remains valid',()=>{
  assert.equal(validateDossierGraph(catalog),true);
});

for(const lang of ['uk','ru','en']){
  test(lang+': reject pasted invisible controls before exposing dossier references',()=>{
    // Before this repair, trim() silently promoted a newline-padded citation
    // into a valid search for published evidence; bidi/ZWSP echoed into UI.
    const invalid=[
      'GEN 17:15\n','GEN 17:15\r','GEN 17:15\t',
      'GEN 17:15\u202e','GEN 17:15\u200b','GEN 17:15\u2066',
      'GEN 17:15\u0000','GEN 17:15\ud800',
      '\n','\r','\u2028','\u2029','\ufeff',
    ];
    for(const query of invalid){
      assert.deepEqual(searchScriptureDossiers(lang,query,catalog),[]);
      assert.deepEqual(searchScriptureDossiers(lang,query),[]);
      for(const id of ['sarah',null]){
        const dossier=dossierMarkup(catalog,lang,id,esc,query);
        assert.match(dossier,/^<p role="alert">/,JSON.stringify({lang,query,id}));
        assert.doesNotMatch(dossier,/dossier-layout|dossier-article|href="\/reader\//);
      }
      const atlas=dossierAtlasMarkup(catalog,lang,esc,query);
      assert.match(atlas,/^<p role="alert">/,JSON.stringify({lang,query}));
      assert.doesNotMatch(atlas,/dossier-atlas|href="\/reader\//);
    }
  });

  test(lang+': valid exact citation, spaces and empty search recover normally',()=>{
    assert.ok(searchScriptureDossiers(lang,'GEN 17:15',catalog).some(item=>item.id==='sarah'));
    assert.ok(searchScriptureDossiers(lang,' GEN 17:15 ',catalog).some(item=>item.id==='sarah'));
    assert.ok(searchScriptureDossiers(lang,'',catalog).length>0);
    assert.deepEqual(searchScriptureDossiers(lang,'\t',catalog),
      searchScriptureDossiers(lang,'',catalog));
    assert.equal(dossierAtlasMarkup(catalog,lang,esc,'\t'),
      dossierAtlasMarkup(catalog,lang,esc,''));
    assert.match(dossierMarkup(catalog,lang,'sarah',esc,' GEN 17:15 '),/class="dossier-layout"/);
    assert.match(dossierAtlasMarkup(catalog,lang,esc,' GEN 17:15 '),/class="card dossier-atlas"/);
    assert.match(dossierMarkup(catalog,lang,null,esc,''),/class="dossier-layout"/);
  });
}
