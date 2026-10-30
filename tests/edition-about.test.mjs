import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { editionAboutMarkup, renderWorkspace } from '../public/workspace.js';

const catalog=JSON.parse(readFileSync(new URL('../public/data/catalog.json',import.meta.url),'utf8'));
const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
for(const lang of ['uk','ru','en'])test(`${lang}: about page shows all actual local editions and their provenance`,async()=>{
  let html='';let called=0;
  await renderWorkspace('about',{state:{lang},t:key=>key,esc,shell:value=>{html=value;},setActiveNav:()=>{},getCatalog:async()=>{called++;return catalog;}});
  assert.equal(called,1);
  for(const edition of [catalog.translations['uk-ohiienko'],catalog.editions.uk,catalog.editions.ru,catalog.editions.en]){
    assert.ok(html.includes(esc(edition.title)),edition.title);
    assert.ok(html.includes(esc(edition.source)),edition.source);
    assert.ok(html.includes(esc(edition.license)),edition.license);
  }
  assert.ok(html.includes(esc(catalog.translations['uk-ohiienko'].attribution)));
  assert.ok(html.includes(esc(catalog.translations['uk-ohiienko'].formatting)));
  assert.ok(html.includes('https://creativecommons.org/licenses/by-sa/4.0/'));
  const external=html.slice(html.indexOf('<h3>',html.indexOf('</ul>')));
  assert.ok(!external.includes('Огієнка')&&!external.includes('Огиенко')&&!external.includes('Ohiienko'));
});

test('about page escapes catalogue text, rejects unsafe links and reports missing data',()=>{
  const bad={translations:{'uk-ohiienko':{title:'<img src=x onerror=alert(1)>',source:'javascript:alert(1)',licenseUrl:'data:text/html,bad',attribution:'<script>bad</script>'}},editions:{}};
  const html=editionAboutMarkup(bad,'en',esc);
  assert.ok(!html.includes('<script>')&&!html.includes('<img ')&&!html.includes('javascript:')&&!html.includes('data:text'));
  assert.ok(html.includes('&lt;script&gt;bad&lt;/script&gt;'));
  assert.equal((html.match(/Details for this edition are unavailable/g)||[]).length,3);
});

test('about page rejects credential-bearing provenance and licence URLs',()=>{
  const bad={translations:{'uk-ohiienko':{
    title:'Test edition',source:'https://publisher.example@attacker.example/read',
    licenseUrl:'https://user:secret@licenses.example/terms',license:'Public Domain'
  }},editions:{}};
  const html=editionAboutMarkup(bad,'en',esc);
  assert.ok(html.includes('Test edition'));
  assert.ok(!html.includes('attacker.example')&&!html.includes('licenses.example'),
    'credentialed URLs must not be presented as verified provenance links');
  const mixed={translations:{'uk-ohiienko':{
    ...bad.translations['uk-ohiienko'],source:'https://publisher.example/read'
  }},editions:{}};
  const safe=editionAboutMarkup(mixed,'en',esc);
  assert.ok(safe.includes('href="https://publisher.example/read"'));
  assert.ok(!safe.includes('licenses.example'));
});
