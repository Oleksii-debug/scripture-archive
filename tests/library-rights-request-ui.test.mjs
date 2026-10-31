import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

import {renderPublicMaterials,reviewText} from '../public/material-review.js';

const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const item={
  id:'submission:123/alpha',
  title:'A reviewed title & evidence',
  locale:'en',
  reference:'GEN 1',
  prompt:'What is recorded?',
  provenance:'Reviewed source',
  reviewedAt:'2026-10-31 10:00:00',
  rights:{holder:'Named holder',basis:'permission',licenseUrl:null},
  options:['One','Two'],
};

for(const [lang,label] of Object.entries({
  uk:'Повідомити про права на цей матеріал',
  ru:'Сообщить о правах на этот материал',
  en:'Report a rights concern about this material',
}))test(`${lang}: every reviewed item links to the item-bound rights intake`,async()=>{
  const previous=globalThis.fetch;
  globalThis.fetch=async()=>({ok:true,json:async()=>({items:[item]})});
  const root={isConnected:true,innerHTML:'',querySelectorAll:()=>[]};
  try{
    await renderPublicMaterials(root,reviewText(lang),esc);
    assert.ok(root.innerHTML.includes(label));
    assert.match(root.innerHTML,/href="\/help\?topic=rights&amp;material=submission%3A123%2Falpha&amp;title=A%20reviewed%20title%20%26%20evidence"/);
  }finally{globalThis.fetch=previous;}
});

test('a public payload with a non-encodable item identity fails closed',async()=>{
  const previous=globalThis.fetch;
  globalThis.fetch=async()=>({ok:true,json:async()=>({items:[{...item,title:'broken\ud800title'}]})});
  const root={isConnected:true,innerHTML:'',querySelectorAll:()=>[],querySelector:()=>null};
  try{
    await renderPublicMaterials(root,reviewText('en'),esc);
    assert.match(root.innerHTML,/Could not complete the action/);
    assert.doesNotMatch(root.innerHTML,/topic=rights/);
  }finally{globalThis.fetch=previous;}
});

const appSource=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const start=appSource.indexOf('function renderHelp() {');
const end=appSource.indexOf('async function renderAbout() {',start);
assert.ok(start>=0&&end>start,'canonical help renderer exists');
const extract=appSource.slice(start,end);
const renderFactory=new Function('state','setActiveNav','shell','document','window','t','esc','FormData','fetch',extract+'\nreturn renderHelp;');

function helpMarkup(lang,search){
  let html='';
  const form={onsubmit:null};
  const document={querySelector(selector){
    if(selector==='#help-form')return form;
    throw Error(`Unexpected selector ${selector}`);
  }};
  const render=renderFactory({lang,user:null},()=>{},value=>{html=value;},document,{location:{search}},name=>name,esc,class {},async()=>{});
  render();
  return html;
}

for(const [lang,copy] of Object.entries({
  uk:{context:'Звернення щодо прав на опублікований матеріал',subject:'Права на матеріал',reference:'Ідентифікатор публікації'},
  ru:{context:'Обращение о правах на опубликованный материал',subject:'Права на материал',reference:'Идентификатор публикации'},
  en:{context:'Request about rights to a published material',subject:'Rights to material',reference:'Publication reference'},
}))test(`${lang}: a bounded rights link prefills an editable, candid support request`,()=>{
  const title='Reviewed <title> & rights';
  const search=`?topic=rights&material=${encodeURIComponent(item.id)}&title=${encodeURIComponent(title)}`;
  const html=helpMarkup(lang,search);
  assert.ok(html.includes(copy.context));
  assert.ok(html.includes(`${copy.subject} — ${item.id}`));
  assert.ok(html.includes(copy.reference));
  assert.match(html,/name="subject"[^>]*value="[^"]+"[^>]*required/);
  assert.match(html,/name="message"[^>]*required>[^<]+<\/textarea>/);
  assert.ok(html.includes('Reviewed &lt;title&gt; &amp; rights'));
  assert.doesNotMatch(html,/<title>/);
  assert.match(html,/не знімає матеріал автоматично|не снимает материал автоматически|does not remove material automatically/);
});

for(const search of [
  '?topic=rights&material=ok&title=',
  '?topic=rights&topic=other&material=ok&title=Title',
  '?topic=rights&material=%20bad&title=Title',
  `?topic=rights&material=${'a'.repeat(101)}&title=Title`,
  '?topic=rights&material=ok&title=Line%0Abreak',
])test(`malformed rights context is ignored: ${search.slice(0,45)}`,()=>{
  const html=helpMarkup('en',search);
  assert.doesNotMatch(html,/help-rights-context/);
  assert.match(html,/name="subject" maxlength="160" value="" required/);
  assert.match(html,/name="message"[^>]*required><\/textarea>/);
});
