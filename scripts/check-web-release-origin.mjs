#!/usr/bin/env node
/** Read-only release preflight: verifies *declared* origins, not DNS, TLS, deployment or ownership. */
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export function normalizeSecureOrigin(value, label = 'origin') {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label}: explicit URL required`);
  // WHATWG URL silently strips TAB, CR and LF (even inside the hostname).
  // An operator-selected release origin must not normalize hidden controls
  // or whitespace into a seemingly approved public host.
  if (value !== value.trim() || /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}\s]/u.test(value))
    throw new Error(`${label}: invalid URL whitespace or controls`);
  // WHATWG URL also discards empty userinfo (`https://@host` or `https://:@host`),
  // making a credential-bearing authority indistinguishable from a bare host.
  if (/^https:\/\/[^/?#]*@/iu.test(value))
    throw new Error(`${label}: invalid URL userinfo separator`);
  // WHATWG URL repairs malformed HTTPS separators, backslashes, dot segments,
  // percent-encoded hostnames and empty query/hash delimiters before inspection.
  // Release authority must be a literal bare origin, not only normalize to one.
  if (!/^https:\/\/[^\/?#\\%]+\/?$/iu.test(value))
    throw new Error(`${label}: invalid URL syntax; use a literal bare HTTPS origin`);
  let url;
  try { url = new URL(value); }
  catch { throw new Error(`${label}: invalid URL`); }
  if (url.protocol !== 'https:' || !url.hostname || url.username || url.password ||
      url.pathname !== '/' || url.search || url.hash) {
    throw new Error(`${label}: use a bare HTTPS origin without credentials, path, query or fragment`);
  }
  // WHATWG URL also folds Unicode compatibility host glyphs and Unicode
  // dot separators into ASCII, and normalizes padded port numbers. An
  // operator's release target must be a literal authority, not a lookalike.
  // Preserve the already-supported ASCII hostname case, optional slash and
  // explicit canonical HTTPS :443, plus literal non-default ports.
  // Non-ASCII compatibility case folding (for example Kelvin sign K -> k)
  // can also happen in JavaScript lowercasing itself. Require an ASCII literal;
  // internationalized domains must be explicitly written as punycode.
  if (/[^\x00-\x7f]/u.test(value))
    throw new Error(`${label}: invalid URL syntax; use a literal bare HTTPS origin`);
  const literal = value.replace(/\/$/, '').toLowerCase();
  if (literal !== url.origin && literal !== `${url.origin}:443`)
    throw new Error(`${label}: invalid URL syntax; use a literal bare HTTPS origin`);
  return url.origin;
}

export function verifyDeclaredOrigins({ siteUrl, appBaseUrl, expectedOrigin }) {
  const expected = normalizeSecureOrigin(expectedOrigin, 'expected origin');
  const publicOrigin = normalizeSecureOrigin(siteUrl, 'NEXT_PUBLIC_SITE_URL');
  const appOrigin = normalizeSecureOrigin(appBaseUrl, 'APP_BASE_URL');
  if (expected !== publicOrigin || expected !== appOrigin) {
    throw new Error('Release origin mismatch: NEXT_PUBLIC_SITE_URL and APP_BASE_URL must both equal the explicitly selected origin');
  }
  return { verdict: 'DECLARED_ORIGIN_MATCH_ONLY', origin: expected,
    warning: 'No DNS, domain ownership, live HTTPS, certificate, deployed SHA, migrations or route was checked.' };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 4 || process.argv[2] !== '--expected-origin')
      throw new Error('Usage: node scripts/check-web-release-origin.mjs --expected-origin https://approved-host.example');
    console.log(JSON.stringify(verifyDeclaredOrigins({
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
      appBaseUrl: process.env.APP_BASE_URL,
      expectedOrigin: process.argv[3],
    }), null, 2));
  } catch (error) {
    console.error(JSON.stringify({ verdict: 'DECLARED_ORIGIN_INVALID', error: error.message }));
    process.exitCode = 1;
  }
}
