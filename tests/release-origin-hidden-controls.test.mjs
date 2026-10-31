import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSecureOrigin, verifyDeclaredOrigins } from '../scripts/check-web-release-origin.mjs';

const canonical='https://scripture-archive.com';
test('R0 release origin cannot silently normalize hidden URL control bytes',()=>{
 const deceptive=[
  canonical+'\n', canonical+'\t', canonical+'\r',
  ' '+canonical, canonical+' ', canonical+'/\n',
  'https://scripture-\narchive.com',
  'https://scripture-\tarchive.com',
  'https://scripture-\rarchive.com',
  'https://scripture-archive.com\u2066',
  'https://scripture-archive.com\u2028',
  'https://@scripture-archive.com',
  'https://:@scripture-archive.com',
 ];
 for(const value of deceptive){
  assert.throws(()=>normalizeSecureOrigin(value),/invalid URL/,
   'must refuse a visually ambiguous declared origin');
  assert.throws(()=>verifyDeclaredOrigins({
   expectedOrigin:canonical,siteUrl:value,appBaseUrl:canonical,
  }),/invalid URL/);
 }
 assert.equal(verifyDeclaredOrigins({
  expectedOrigin:canonical,siteUrl:canonical+'/',appBaseUrl:canonical,
 }).verdict,'DECLARED_ORIGIN_MATCH_ONLY');
 assert.equal(normalizeSecureOrigin('https://SCRIPTURE-ARCHIVE.com/'),canonical);
});

test('R0 origin preflight rejects 34 formerly normalized nonliteral release declarations',()=>{
  // Checked against the pre-fix source: every vector normalized to the canonical origin.
  // A strict URL() comparison is insufficient for an operator-selected release target.
  const nonliteral=[
    "https:scripture-archive.com",
    "https:/scripture-archive.com",
    "https:\\scripture-archive.com",
    "https:\\\\scripture-archive.com",
    "https:///scripture-archive.com",
    "https:////scripture-archive.com",
    "https:/\\scripture-archive.com",
    "https:\\/scripture-archive.com",
    "https://scripture-archive.com\\",
    "https://scripture-archive.com/.",
    "https://scripture-archive.com/./",
    "https://scripture-archive.com/..",
    "https://scripture-archive.com/../",
    "https://scripture-archive.com/%2e",
    "https://scripture-archive.com/%2E/",
    "https://scripture-archive.com/%2e%2e",
    "https://scripture-archive.com/%2E%2E/",
    "https://scripture-archive.com/a/..",
    "https://scripture-archive.com/a/../",
    "https://scripture-archive.com/a/%2e%2e",
    "https://scripture-archive.com/a/%2E%2E/",
    "https://scripture-%61rchive.com",
    "https://%73cripture-archive.com",
    "https://scripture-archive%2ecom",
    "https://scripture-archive.com?",
    "https://scripture-archive.com#",
    "https://scripture-archive.com/?",
    "https://scripture-archive.com/#",
    "https://scripture-archive.com/?#",
    "https://scripture-archive.com:443?",
    "https://scripture-archive.com:443#",
    "https://scripture-archive.com:443/./",
    "https://scripture-archive.com:443/%2e/",
    "https://scripture-archive.com:443/%2E%2E/",
  ];
  assert.equal(nonliteral.length,34);
  for (const value of nonliteral) {
    assert.throws(()=>normalizeSecureOrigin(value),/invalid URL syntax/,
      `malformed release origin must fail: ${JSON.stringify(value)}`);
    assert.throws(()=>verifyDeclaredOrigins({expectedOrigin:canonical,siteUrl:value,appBaseUrl:canonical}),
      /invalid URL syntax/);
  }
  // Preserve already authorized canonical origins and legitimate URL normalization.
  for (const value of [canonical,canonical+'/', 'https://SCRIPTURE-ARCHIVE.com/', canonical+':443']) {
    assert.equal(normalizeSecureOrigin(value),canonical);
  }
});


test('R0.1 rejects IDNA compatibility glyphs, Unicode dots and padded ports before release parity', () => {
  // WHATWG URL() converts these nonliteral authorities into the exact public
  // origin. The release gate must not report declaration parity for them.
  const nonliteral = [
    'https://ｓcripture-archive.com',
    'https://ⓢcripture-archive.com',
    'https://scripture-archive。com',
    'https://scripture-archive．com',
    'https://scripture-archive｡com',
    'https://ＳＣＲＩＰＴＵＲＥ-ＡＲＣＨＩＶＥ.com',
    'https://scripture-archive.com:000443',
    'https://scripture-archive.com:0443',
    'https://scripture-archive.com:0008443',
  ];
  for (const value of nonliteral) {
    assert.equal(new URL(value).origin,
      value.endsWith('0008443') ? canonical.replace('.com', '.com:8443') : canonical,
      'regression vector must actually normalize to an approved ASCII origin');
    assert.throws(() => normalizeSecureOrigin(value), /literal bare HTTPS origin/,
      `nonliteral authority accepted: ${JSON.stringify(value)}`);
    assert.throws(() => verifyDeclaredOrigins({
      expectedOrigin: canonical, siteUrl: value, appBaseUrl: canonical,
    }), /literal bare HTTPS origin/);
  }
  // U+212A (Kelvin sign) lowercases to ASCII k in JavaScript itself.
  // Merely comparing value.toLowerCase() to URL.origin is insufficient.
  const kelvin = 'https://staKe.example.test';
  const stage = 'https://stake.example.test';
  assert.equal(new URL(kelvin).origin, stage);
  assert.equal(kelvin.toLowerCase(), stage);
  assert.throws(() => normalizeSecureOrigin(kelvin), /literal bare HTTPS origin/);
  assert.throws(() => verifyDeclaredOrigins({
    expectedOrigin: stage, siteUrl: kelvin, appBaseUrl: stage,
  }), /literal bare HTTPS origin/);
  // Valid declarations, recovery and explicitly selected non-default ports
  // must retain their original contract.
  for (const value of [
    canonical, canonical + '/', canonical + ':443', canonical + ':443/',
    'https://SCRIPTURE-ARCHIVE.COM/', 'https://stage.example.test:8443',
    'https://[::1]',
  ]) {
    assert.equal(normalizeSecureOrigin(value), new URL(value).origin);
  }
  assert.equal(verifyDeclaredOrigins({
    expectedOrigin: canonical, siteUrl: canonical + ':443/', appBaseUrl: canonical,
  }).verdict, 'DECLARED_ORIGIN_MATCH_ONLY');
});
