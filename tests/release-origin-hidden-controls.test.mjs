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
