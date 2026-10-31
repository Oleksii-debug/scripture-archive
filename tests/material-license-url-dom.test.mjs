import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewText, renderPublicMaterials } from '../public/material-review.js';

const copy=reviewText('en');
const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const seed={id:'published',title:'Reviewed exercise',locale:'en',reference:'GEN 12',prompt:'What happened to Abraham?',provenance:'Publisher source',reviewedAt:'2026-10-31 10:00:00',options:['One','Two'],rights:{holder:'Verified Publisher',basis:'open_license',licenseUrl:'https://publisher.example/license'}};
function panel(){return {isConnected:true,innerHTML:'',querySelectorAll(){return []},querySelector(){return null}};}
async function render(item){const prev=globalThis.fetch;globalThis.fetch=async()=>({ok:true,json:async()=>({items:[item]})});const root=panel();try{await renderPublicMaterials(root,copy,esc);return root.innerHTML;}finally{globalThis.fetch=prev;}}

test('public reviewed-material DOM rejects every raw invisible/bidi licence URL and offers a recoverable alert',async()=>{
  for(const cp of [0x85,0xa0,0x061c,0x200b,0x200e,0x202e,0x2066,0xfeff,0xd800]){
    const url='https://publisher.example/license'+String.fromCharCode(cp)+'text';
    const markup=await render({...seed,rights:{...seed.rights,licenseUrl:url}});
    assert.match(markup,/role="alert"/,'visible recoverable error for U+'+cp.toString(16));
    assert.doesNotMatch(markup,/href="https:\/\/publisher\.example/);
  }
});

test('public reviewed-material DOM rejects empty user-info and raw newline yet keeps safe rights links',async()=>{
  for(const url of ['https://@publisher.example/license','https://user@publisher.example/license',
    'https://publisher.example/'+String.fromCharCode(10)+'license','http://publisher.example/license']) {
    assert.match(await render({...seed,rights:{...seed.rights,licenseUrl:url}}),/role="alert"/);
  }
  const safe='https://publisher.example/a%20b?source=a@b';
  const html=await render({...seed,rights:{...seed.rights,licenseUrl:safe}});
  assert.match(html,/href="https:\/\/publisher\.example\/a%20b\?source=a@b"/);
  assert.doesNotMatch(html,/role="alert"/);
  // A source outage or invalid response must not poison a later successful fetch.
  assert.match(await render(seed),/href="https:\/\/publisher\.example\/license"/);
});
