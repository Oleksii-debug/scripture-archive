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
