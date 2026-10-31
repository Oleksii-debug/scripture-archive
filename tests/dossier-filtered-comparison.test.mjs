import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dossierMarkup, validateDossierGraph} from '../public/scripture-dossiers.js';

const catalog=JSON.parse(readFileSync(new URL('../public/data/catalog.json',import.meta.url),'utf8'));
const esc=value=>String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const compareForm=html=>html.match(/<form action="\/dossiers" method="get">[\s\S]*?<\/form>/u)?.[0];

test('SA-EXT-05: comparing filtered published dossiers retains the same native GET search',()=>{
  assert.equal(validateDossierGraph(catalog),true);
  for(const [lang,query,id,other] of [
    ['en','Moses','moses','abraham'],
    ['uk','Мойсей','moses','abraham'],
    ['ru','Моисей','moses','abraham'],
    ['en','GEN 17:15','abraham','sarah'],
    ['en','GEN 17:15–19','abraham','sarah'],
    ['en','Which name changes','sarah','abraham']
  ]){
    const html=dossierMarkup(catalog,lang,id,esc,query,other);
    const form=compareForm(html);
    assert.ok(form,lang+' compare form is in the real dossier interface');
    assert.ok(form.includes('<input type="hidden" name="q" value="'+esc(query)+'">'),lang+' '+query);
    assert.ok(form.includes('<input type="hidden" name="id" value="'+id+'">'));
    assert.ok(form.includes('name="compare"'));
    assert.ok(form.includes('<option value="'+other+'" selected>'),lang+' selected comparison');
    assert.match(html,/id="dossier-comparison-heading"/u);
    assert.match(html,/href="\/reader\//u);
  }
});

test('SA-EXT-05: preserved search uses the visible bounded and trimmed query',()=>{
  const html=dossierMarkup(catalog,'en','abraham',esc,'  GEN 17:15  ','sarah');
  const form=compareForm(html);
  assert.ok(form?.includes('name="q" value="GEN 17:15"'));
  assert.ok(!form.includes('value="  GEN 17:15  "'));
  const params=new URLSearchParams({q:'GEN 17:15',id:'abraham',compare:'sarah'});
  const roundtrip=dossierMarkup(catalog,'en',params.get('id'),esc,params.get('q'),params.get('compare'));
  assert.match(roundtrip,/id="dossier-comparison-heading"/u);
  assert.ok(compareForm(roundtrip).includes('name="q" value="GEN 17:15"'));
});

test('SA-EXT-05: the legacy unfiltered comparison sends no phantom search parameter',()=>{
  const html=dossierMarkup(catalog,'en','abraham',esc,'','sarah');
  const form=compareForm(html);
  assert.ok(form);
  assert.doesNotMatch(form,/name="q"/u);
  assert.ok(form.includes('name="id" value="abraham"'));
  assert.match(html,/id="dossier-comparison-heading"/u);
});

test('SA-EXT-05: hidden comparison filters never bypass an invalid or nonmatching dossier',()=>{
  for(const [id,query] of [['abraham','Moses'],['unpublished-id','Moses'],['moses','no-matching-source']]){
    const html=dossierMarkup(catalog,'en',id,esc,query,'abraham');
    assert.equal(compareForm(html),undefined);
    assert.doesNotMatch(html,/id="dossier-comparison-heading"/u);
    assert.doesNotMatch(html,/href="\/reader\//u);
    assert.match(html,/role="alert"/u);
  }
});

test('SA-EXT-05: canonical workspace still routes comparison through the same GET params',()=>{
  const source=readFileSync(new URL('../public/workspace.js',import.meta.url),'utf8');
  assert.match(source,/get\('q'\)/u);
  assert.match(source,/get\('compare'\)/u);
  assert.match(source,/dossierMarkup\(catalog,state\.lang,selectedId,esc,searchQuery,compareId\)/u);
});
