import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { normalizeSecureOrigin, verifyDeclaredOrigins } from '../scripts/check-web-release-origin.mjs';

const example = 'https://stage.example.test';
const valid = { expectedOrigin: example, siteUrl: example, appBaseUrl: example };

test('accepts only identical explicitly selected HTTPS origins (normalizes trailing slash)', () => {
  assert.equal(verifyDeclaredOrigins({ ...valid, appBaseUrl: `${example}/` }).verdict, 'DECLARED_ORIGIN_MATCH_ONLY');
  assert.equal(normalizeSecureOrigin('https://STAGE.example.test/'), example);
});

test('rejects missing environment declaration (no silent fallback to unverified host)', () => {
  for (const field of ['siteUrl', 'appBaseUrl', 'expectedOrigin']) {
    assert.throws(() => verifyDeclaredOrigins({ ...valid, [field]: undefined }), /explicit URL required/);
  }
});

test('rejects wrong staging/custom-domain pair even if both URLs are syntactically valid', () => {
  for (const field of ['siteUrl', 'appBaseUrl', 'expectedOrigin']) {
    assert.throws(() => verifyDeclaredOrigins({ ...valid, [field]: 'https://other.example.test' }), /Release origin mismatch/);
  }
});

test('rejects HTTP, credentials, path, query, fragment and non-web protocols', () => {
  const invalid = [ 'http://stage.example.test', 'https://user:password@stage.example.test',
    `${example}/private`, `${example}/?token=secret`, `${example}/#reader`,
    'javascript:alert(1)', '//stage.example.test', 'https://', 'http://127.0.0.1:8787' ];
  for (const value of invalid) assert.throws(() => verifyDeclaredOrigins({ ...valid, siteUrl: value }), /invalid URL|bare HTTPS/);
});

test('CLI fails closed without named origin and environment variables', () => {
  const script = new URL('../scripts/check-web-release-origin.mjs', import.meta.url);
  const env = { PATH: process.env.PATH };
  const noArgs = spawnSync(process.execPath, [script.pathname], { env, encoding: 'utf8' });
  assert.equal(noArgs.status, 1);
  const missing = spawnSync(process.execPath, [script.pathname, '--expected-origin', example], { env, encoding: 'utf8' });
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /DECLARED_ORIGIN_INVALID/);
});

test('CLI reports only declaration parity, never "deployed"', () => {
  const script = new URL('../scripts/check-web-release-origin.mjs', import.meta.url);
  const result = spawnSync(process.execPath, [script.pathname, '--expected-origin', example], {
    env: { PATH: process.env.PATH, NEXT_PUBLIC_SITE_URL: example, APP_BASE_URL: example }, encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  const data = JSON.parse(result.stdout);
  assert.equal(data.verdict, 'DECLARED_ORIGIN_MATCH_ONLY');
  assert.match(data.warning, /No DNS, domain ownership, live HTTPS/);
});
