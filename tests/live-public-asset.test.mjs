import test from 'node:test';
import assert from 'node:assert/strict';
import { comparePublicAppBytes, requireExactCleanHead, MAX_PUBLIC_ASSET_BYTES, main } from '../scripts/verify-live-public-asset.mjs';

const origin = 'https://scripture-archive.com';
const original = Buffer.from('console.log("chapter accepted");\n', 'utf8');
const sha = '0123456789abcdef0123456789abcdef01234567';
const response = (body, init = {}) => new Response(body, {status: 200, headers: {'content-type':'application/javascript'}, ...init});

test('exact public byte match is explicitly scoped, read-only and credential-free', async () => {
  const calls = [];
  const result = await comparePublicAppBytes({origin, sourceBytes: original, fetchImpl: async (...args) => {
    calls.push(args);
    return response(original);
  }});
  assert.equal(result.verdict, 'PUBLIC_APP_JS_BYTE_MATCH');
  assert.equal(result.checkedUrl, `${origin}/app.js`);
  assert.equal(result.observedBytes, original.length);
  assert.equal(result.expectedSha256, result.observedSha256);
  assert.match(result.warning, /NOT live worker SHA/);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0][0], `${origin}/app.js`);
  assert.equal(calls[0][1].method, 'GET');
  assert.equal(calls[0][1].redirect, 'manual');
  assert.equal(calls[0][1].credentials, 'omit');
  assert.equal(calls[0][1].cache, 'no-store');
  assert.equal(calls[0][1].headers['Cache-Control'], 'no-cache');
  assert.equal(calls[0][1].headers['Accept-Encoding'], 'identity');
});

test('historical/different public JS produces a mismatch, not a deployment-ready claim', async () => {
  const result = await comparePublicAppBytes({origin, sourceBytes: original, fetchImpl: async () => response('console.log("old edition");')});
  assert.equal(result.verdict, 'PUBLIC_APP_JS_BYTE_MISMATCH');
  assert.notEqual(result.expectedSha256, result.observedSha256);
});

test('redirects, missing resource, missing body and HTTP error reject verification', async () => {
  const bad = [
    new Response(null,{status:302,headers:{location:'/login'}}),
    new Response(null,{status:204}),
    new Response('not found',{status:404}),
    new Response(null,{status:200}),
  ];
  for (const result of bad) {
    await assert.rejects(comparePublicAppBytes({origin, sourceBytes:original, fetchImpl:async()=>result}),/HTTP 200 body required/);
  }
});

test('rejects wrong or unsafe origins and impossible local source', async () => {
  for (const bad of ['http://scripture-archive.com','https://scripture-archive.com/private',
    'https://user@scripture-archive.com','https://scripture-archive.com?token=secret',
    'https://scripture-archive.com\n']) {
    await assert.rejects(comparePublicAppBytes({origin:bad,sourceBytes:original,fetchImpl:async()=>response(original)}),/invalid URL|bare HTTPS|whitespace|controls/i);
  }
  for (const sourceBytes of [new Uint8Array(0),new Uint8Array(MAX_PUBLIC_ASSET_BYTES+1),null,'not bytes']) {
    await assert.rejects(comparePublicAppBytes({origin,sourceBytes,fetchImpl:async()=>response(original)}),/missing or oversized/);
  }
});

test('rejects contradictory content length, oversized declared/streamed body and missing bytes', async () => {
  for (const res of [
    response(original,{headers:{'content-length':'0'}}),
    response(original,{headers:{'content-length':'5000000'}}),
    response(original,{headers:{'content-length':'NaN'}}),
    response(Buffer.alloc(MAX_PUBLIC_ASSET_BYTES+1)),
    response(''),
  ]) {
    await assert.rejects(comparePublicAppBytes({origin,sourceBytes:original,fetchImpl:async()=>res}),/length|byte limit|empty|oversized/i);
  }
});

test('CDN compressed HTTP representation compares decoded payload, not wire Content-Length', async () => {
  const result = await comparePublicAppBytes({origin, sourceBytes:original, fetchImpl:async()=>response(original,{headers:{'content-length':'9','content-encoding':'gzip'}})});
  assert.equal(result.verdict,'PUBLIC_APP_JS_BYTE_MATCH');
});

test('requires an explicitly named clean exact-head source, no guessed checkout', () => {
  const seen=[];
  const runGit = (_command,args)=>{
    seen.push(args);
    const command=args.slice(2).join(' ');
    if (command==='rev-parse HEAD') return {status:0,stdout:`${sha}\n`};
    if (command==='status --porcelain -- public/app.js') return {status:0,stdout:''};
    throw Error('wrong git command');
  };
  assert.equal(requireExactCleanHead(sha,'/tmp/canonical',runGit),sha);
  assert.deepEqual(seen.map(x=>x.slice(2).join(' ')),['rev-parse HEAD','status --porcelain -- public/app.js']);
  for (const invalid of ['abc',sha.toUpperCase(),'0'.repeat(64),null]) {
    assert.throws(()=>requireExactCleanHead(invalid,'/tmp/canonical',runGit),/exact 40-character/);
  }
  assert.throws(()=>requireExactCleanHead('a'.repeat(40),'/tmp/canonical',runGit),/not the explicitly selected/);
  const dirty=(cmd,args)=>args.includes('--porcelain')?{status:0,stdout:' M public/app.js\n'}:{status:0,stdout:`${sha}\n`};
  assert.throws(()=>requireExactCleanHead(sha,'/tmp/canonical',dirty),/differs from/);
  const broken=()=>({status:128,stdout:''});
  assert.throws(()=>requireExactCleanHead(sha,'/tmp/canonical',broken),/could not be independently/);
});

test('CLI argument contract cannot silently choose live origin or checkout', async () => {
  await assert.rejects(main([]),/Usage/);
  await assert.rejects(main(['--expected-origin',origin]),/Usage/);
  await assert.rejects(main(['--expected-origin',origin,'--expected-head','xyz']),/exact 40-character/);
});
