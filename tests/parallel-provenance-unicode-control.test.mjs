import test from 'node:test';
import assert from 'node:assert/strict';
import { safeProvenanceHttpsUrl, mountParallelReader } from '../public/parallel-reader.js';
import { editionAboutMarkup } from '../public/workspace.js';

// The URL parser itself accepts these raw controls by percent-encoding them.
// Bible provenance and rights metadata must never be silently rewritten.
const hidden = ['\u0085','\u00a0','\u061c','\u200b','\u200c','\u200d','\u200e','\u200f',
  '\u2028','\u2029','\u202a','\u202e','\u2060','\u2066','\u2069','\u206a','\u206f','\ufeff','\ud800'];
const esc = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;')
  .replaceAll('>','&gt;').replaceAll('"','&quot;');

test('SA-EXT-01 refuses raw invisible and direction-changing source URLs', () => {
  for (const control of hidden) {
    const raw = 'https://publisher.example/edition' + control + 'license';
    assert.notEqual(new URL(raw).href, raw, 'runtime URL parser rewrites this control');
    assert.equal(safeProvenanceHttpsUrl(raw), '', 'raw hidden control must be refused: ' + control.codePointAt(0).toString(16));
  }
});

test('SA-EXT-01 preserves legitimate licensed HTTPS URLs and rejects credential authorities', () => {
  const valid = 'https://publisher.example/a%20b?source=a@b';
  assert.equal(safeProvenanceHttpsUrl(valid), valid);
  assert.equal(safeProvenanceHttpsUrl('HTTPS://publisher.example/read'), 'https://publisher.example/read');
  for (const raw of ['https://@publisher.example/read',
    'https://trusted.example@publisher.example/read',
    'http://publisher.example/read', 'https://publisher.example/\nread']) {
    const input = raw.replace('\\n', '\n');
    assert.equal(safeProvenanceHttpsUrl(input), '');
  }
});

test('edition information hides deceptive source/license links but retains independent legitimate rights', () => {
  for (const control of hidden) for (const field of ['source','licenseUrl']) {
    const item = { title:'Verified edition', license:'Public Domain',
      source:'https://publisher.safe.example/read',
      licenseUrl:'https://rights.safe.example/terms' };
    item[field] = 'https://deceptive.example/rights' + control + 'title';
    const html = editionAboutMarkup({ translations:{ 'uk-ohiienko':item },editions:{} },'uk',esc);
    assert.ok(html.includes('Verified edition'));
    assert.ok(!html.includes('deceptive.example'), 'unsafe ' + field + ' never becomes a link');
    assert.ok(html.includes(field==='source'?'rights.safe.example':'publisher.safe.example'),
      'safe independent provenance remains accessible');
  }
});

test('parallel reader refuses to render licensed verses under a deceptive source', async () => {
  const previous = globalThis.FormData;
  globalThis.FormData = class { get() { return 'uk-kulish'; } };
  try {
    const button={ disabled:false };
    const status={ textContent:'' };
    const result={innerHTML:'', replaceChildren(){ this.innerHTML=''; }};
    const form={ querySelector(){return button;} };
    const panel={isConnected:true,querySelector(s){
      return s==='.parallel-form'?form:s==='.parallel-status'?status:result;
    }};
    mountParallelReader(panel,{
      editions:[{id:'uk-kulish',local:true,contentId:'UKRPAN'}],
      catalog:{translations:{},editions:{uk:{
        id:'UKRPAN',title:'Куліш',license:'Public Domain',
        source:'https://publisher.example/rights\u202elink'
      }}},
      lang:'uk',book:'GEN',bookTitle:'Буття',chapter:1,esc,
      getBook:async()=>({chapters:[['Вірш не має з\u2019явитися']]}),
      check:async()=>({invalidated:false}),
      current:()=>true,lock(){},failClosed(){},
    });
    await form.onsubmit({preventDefault(){}});
    assert.equal(result.innerHTML,'', 'cannot display text with untrusted declared provenance');
    assert.match(status.textContent,/Не вдалося/);
    assert.equal(button.disabled,false,'retry remains available');
  } finally {
    globalThis.FormData=previous;
  }
});

test('SA-EXT-01 raw visually blank URL aliases and backslashes never acquire publisher authority', () => {
  // The WHATWG parser encodes invisible fillers and treats backslashes as slashes.
  // Neither transformation is acceptable for edition rights or source citations.
  const hidden = ['\\u034f','\\u115f','\\u1160','\\u2800','\\u3164','\\uffa0','\\\\'];
  for (const character of hidden) {
    for (const field of ['source','licenseUrl']) {
      const raw='https://deceptive.example/terms'+character+'label';
      assert.notEqual(new URL(raw).href,raw,'control is rewritten by the URL parser');
      assert.equal(safeProvenanceHttpsUrl(raw),'','refuse altered URL '+character.codePointAt(0).toString(16));
      const item={title:'Verified edition',license:'Public Domain',source:'https://publisher.safe.example/read',licenseUrl:'https://rights.safe.example/terms'};
      item[field]=raw;
      const html=editionAboutMarkup({translations:{'uk-ohiienko':item},editions:{}},'en',esc);
      assert.ok(!html.includes('deceptive.example'),'unverified target is not presented');
      assert.ok(html.includes(field==='source'?'rights.safe.example':'publisher.safe.example'),'independent valid source remains');
    }
  }
  for (const legitimate of ['https://publisher.example/a%20b?source=a@b','HTTPS://publisher.example/read','https://publisher.example/path/%5Cencoded'])
    assert.ok(safeProvenanceHttpsUrl(legitimate),'valid encoded/normal URL remains usable');
});
