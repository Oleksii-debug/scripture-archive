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


test('SA-EXT-01 edition about reuses strict raw HTTPS source and licence admission in three languages',()=>{
  // Old standalone helper silently normalized away CR/LF/TAB and empty @
  // credentials; this public rights screen must not link altered provenance.
  const deceptive=[
    'https://@source.example/',
    'https://:@source.example/',
    'https://source.example\r.evil.example/',
    'https://source.example/\nchapter',
    'https://source.example/\tchapter',
    ' https://source.example/',
    'https://source.example/ ',
    'https://source.example/\u007f',
  ];
  for(const lang of ['uk','ru','en']){
    for(const bad of deceptive){
      for(const field of ['source','licenseUrl']){
        const edition={
          title:'Source verification',license:'Public Domain',
          source:'https://publisher.safe.test/path',
          licenseUrl:'https://rights.safe.test/terms'
        };
        edition[field]=bad;
        const html=editionAboutMarkup({translations:{'uk-ohiienko':edition},editions:{}},lang,esc);
        assert.ok(html.includes('Source verification'),'the original edition remains listed');
        assert.ok(!html.includes('source.example'),
          'normalized-away '+field+' URI is never linked in '+lang+': '+JSON.stringify(bad));
        const stillSafe=field==='source'?'https://rights.safe.test/terms':'https://publisher.safe.test/path';
        assert.ok(html.includes('href="'+stillSafe+'"'),
          'the other independently valid source/license link stays available');
      }
    }
  }
  const legitimate=editionAboutMarkup({translations:{'uk-ohiienko':{
    title:'Approved',license:'Public Domain',
    source:'HTTPS://publisher.example/path%20with%20spaces?name=a@b',
    licenseUrl:'https://license.example/terms%20of%20use'
  }},editions:{}},'en',esc);
  assert.match(legitimate,/href="https:\/\/publisher\.example\/path%20with%20spaces\?name=a@b"/);
  assert.match(legitimate,/href="https:\/\/license\.example\/terms%20of%20use"/);
});
test('SA-EXT-01 about page hides deceptive Unicode edition claims without losing independent safe provenance',()=>{
  const controls=['\u00ad','\u034f','\u115f','\u1160','\u180e','\u2800','\u3164','\uffa0','\u202e'];
  for(const lang of ['uk','ru','en']) for(const field of ['title','license','attribution','formatting']) {
    for(const hidden of controls){
      const edition={
        title:'Verified edition',license:'Public Domain',attribution:'Publisher board',
        formatting:'Original orthography',
        source:'https://source.safe.example/edition',licenseUrl:'https://rights.safe.example/terms',
      };
      edition[field]='SPOOFED'+hidden+'LEGAL';
      const html=editionAboutMarkup({translations:{'uk-ohiienko':edition},editions:{}},lang,esc);
      assert.ok(!html.includes('SPOOFED'+hidden+'LEGAL'),field+' must not show concealed rights text in '+lang);
      if(field==='title')assert.ok(!html.includes('source.safe.example'),'unsafe title cannot label a trusted source');
      else {
        assert.ok(html.includes('<strong>Verified edition</strong>'),'valid independent title remains');
        assert.ok(html.includes('href="https://source.safe.example/edition"'),'safe source remains');
        assert.ok(html.includes('href="https://rights.safe.example/terms"'),'safe licence URL remains');
      }
    }
  }
});
test('SA-EXT-01 about page preserves legitimate Cyrillic, visible Braille and multiline licence',()=>{
  const edition={title:'Легітимне видання \u2801',license:'Публічний текст\nПереклад',attribution:'Український комітет',formatting:'Історичний правопис',
    source:'https://publisher.example/source',licenseUrl:'https://publisher.example/terms'};
  const html=editionAboutMarkup({translations:{'uk-ohiienko':edition},editions:{}},'uk',esc);
  for(const value of [edition.title,edition.license,edition.attribution,edition.formatting])
    assert.ok(html.includes(esc(value)),'legitimate field must remain visible');
});
