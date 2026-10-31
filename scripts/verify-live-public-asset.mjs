#!/usr/bin/env node
/**
 * R0.1: read-only public deployment comparison. This proves ONLY that the
 * exact checked-out public/app.js bytes match the public URL; it cannot prove
 * the server worker SHA, migrations, D1 data, authentication, or a release.
 */
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { normalizeSecureOrigin } from './check-web-release-origin.mjs';

export const MAX_PUBLIC_ASSET_BYTES = 4 * 1024 * 1024;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SHA40 = /^[0-9a-f]{40}$/;
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

export function requireExactCleanHead(expectedHead, root = ROOT, runGit = spawnSync) {
  if (typeof expectedHead !== 'string' || !SHA40.test(expectedHead))
    throw new Error('an exact 40-character lowercase checkout SHA is required');
  const command = args => {
    const result = runGit('git', ['-C', root, ...args], { encoding: 'utf8', timeout: 5000 });
    if (result.error || result.status !== 0 || typeof result.stdout !== 'string')
      throw new Error('Git checkout could not be independently verified');
    return result.stdout.trim();
  };
  if (command(['rev-parse', 'HEAD']) !== expectedHead)
    throw new Error('checkout HEAD is not the explicitly selected source SHA');
  if (command(['status', '--porcelain', '--', 'public/app.js']) !== '')
    throw new Error('public/app.js differs from its checked-out Git revision');
  return expectedHead;
}

export async function comparePublicAppBytes({ origin, sourceBytes, fetchImpl = globalThis.fetch }) {
  const verifiedOrigin = normalizeSecureOrigin(origin, 'approved public origin');
  if (!(sourceBytes instanceof Uint8Array) || sourceBytes.length === 0 ||
      sourceBytes.length > MAX_PUBLIC_ASSET_BYTES)
    throw new Error('expected public/app.js source bytes are missing or oversized');
  if (typeof fetchImpl !== 'function') throw new Error('HTTP fetch implementation unavailable');
  const url = `${verifiedOrigin}/app.js`;
  const response = await fetchImpl(url, {
    method: 'GET', redirect: 'manual', credentials: 'omit', cache: 'no-store',
    headers: { 'Accept': 'application/javascript, text/javascript, */*', 'Accept-Encoding': 'identity', 'Cache-Control': 'no-cache' },
    signal: AbortSignal.timeout(15000),
  });
  if (!response || response.status !== 200 || !response.body || typeof response.body.getReader !== 'function')
    throw new Error('public app.js HTTP 200 body required; redirects and failures are not accepted');
  // Exact JS bytes alone do not prove the browser can execute this asset:
  // HTML/JSON/unknown MIME responses can be blocked as scripts (nosniff).
  // Refuse a contradictory declared charset, which can corrupt Scripture text.
  const contentType = response.headers?.get?.('content-type');
  if (typeof contentType !== 'string' ||
      !/^(?:text|application)\/(?:javascript|ecmascript)(?:\s*;\s*charset\s*=\s*(?:"utf-8"|utf-8))?$/iu.test(contentType.trim()))
    throw new Error('public app.js JavaScript Content-Type with UTF-8 required');
  const contentLength = response.headers?.get?.('content-length');
  if (contentLength !== null && contentLength !== undefined &&
      (!/^(0|[1-9][0-9]*)$/.test(contentLength) || Number(contentLength) > MAX_PUBLIC_ASSET_BYTES))
    throw new Error('public app.js Content-Length is invalid or oversized');
  const reader = response.body.getReader();
  const hash = createHash('sha256');
  let received = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array)) throw new Error('invalid HTTP response body chunk');
      received += value.length;
      if (received > MAX_PUBLIC_ASSET_BYTES) throw new Error('public app.js response exceeds byte limit');
      hash.update(value);
    }
  } finally {
    reader.releaseLock();
  }
  if (!received) throw new Error('empty public app.js response');
  // Fetch transparently decompresses HTTP bodies: encoded Content-Length is
  // the wire size, not the decoded bytes being SHA-256 compared here.
  const encoding = response.headers?.get?.('content-encoding');
  if (contentLength != null && (!encoding || encoding === 'identity') && received !== Number(contentLength))
    throw new Error('public app.js response length differs from Content-Length');
  const expectedSha256 = digest(sourceBytes);
  const observedSha256 = hash.digest('hex');
  return {
    verdict: expectedSha256 === observedSha256 ? 'PUBLIC_APP_JS_BYTE_MATCH' : 'PUBLIC_APP_JS_BYTE_MISMATCH',
    checkedUrl: url,
    expectedSource: 'public/app.js',
    expectedSha256, observedSha256, observedBytes: received,
    warning: 'Public static JS parity only: NOT live worker SHA, installed D1 migration, browser, account, Windows or NVDA acceptance.',
  };
}

export async function main(argv = process.argv.slice(2)) {
  if (argv.length !== 4 || argv[0] !== '--expected-origin' || argv[2] !== '--expected-head')
    throw new Error('Usage: node scripts/verify-live-public-asset.mjs --expected-origin https://scripture-archive.com --expected-head 40lowercaseGitSHA');
  const expectedHead = requireExactCleanHead(argv[3]);
  const sourceBytes = await readFile(resolve(ROOT, 'public/app.js'));
  const result = await comparePublicAppBytes({ origin: argv[1], sourceBytes });
  return { ...result, checkoutHead: expectedHead };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await main();
    console.log(JSON.stringify(result));
    if (result.verdict !== 'PUBLIC_APP_JS_BYTE_MATCH') process.exitCode = 2;
  } catch (error) {
    console.error(JSON.stringify({ verdict: 'PUBLIC_APP_JS_NOT_VERIFIED', error: String(error?.message || error) }));
    process.exitCode = 2;
  }
}
