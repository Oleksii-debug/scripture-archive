import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

// Execute the actual TypeScript API handler, replacing only Cloudflare/D1/email
// integrations with disposable local fakes. Never sends a network request.
const routeFile = new URL('../app/api/help/route.ts', import.meta.url);
async function fixture({ identity = null } = {}) {
  const source = await readFile(routeFile, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: 'app/api/help/route.ts', reportDiagnostics: true,
  });
  assert.equal(transpiled.diagnostics?.length || 0, 0, 'real route transpiles');
  const state = { batches: [], emails: [], reads: 0, failRead: false, throwRead: false };
  const DB = {
    prepare(sql) {
      state.reads += /SELECT/i.test(sql) ? 1 : 0;
      return {
        sql, args: [],
        bind(...args) { this.args = args; return this; },
        async all() { if (state.throwRead) throw Error('disposable read outage'); return state.failRead ? { success: false, results: [] } : { success: true, results: [] }; },
        async run() { state.batches.push([{ sql: this.sql, args: this.args }]); return { success: true }; },
      };
    },
    async batch(statements) {
      state.batches.push(statements.map(statement => ({ sql: statement.sql, args: statement.args })));
      return statements.map(() => ({ success: true, meta: { changes: 1 } }));
    },
  };
  const requireFake = id => {
    if (id === 'cloudflare:workers') return { env: { DB } };
    if (id.endsWith('lib/auth')) return {
      authenticateRequest: async () => identity,
      rateLimit: async () => true,
      requestAddress: () => 'synthetic-local-test',
      sameOrigin: request => request.headers.get('origin') === new URL(request.url).origin,
    };
    if (id.endsWith('lib/email')) return {
      sendSupportRequestEmail: async input => {
        state.emails.push(input);
        return { delivered: false, reason: 'mock_delivery_disabled' };
      },
    };
    throw new Error('Unexpected dependency ' + id);
  };
  const fixtureModule = { exports: {} };
  new Function('require', 'module', 'exports', transpiled.outputText)(requireFake, fixtureModule, fixtureModule.exports);
  return { route: fixtureModule.exports, state };
}

function submission({ attachments = [], locale = 'uk', origin = 'https://sa.invalid' } = {}) {
  const form = new FormData();
  form.set('email', 'tester@example.invalid');
  form.set('subject', 'Synthetic support request');
  form.set('message', 'Disposable support fixture only.');
  form.set('locale', locale);
  form.set('acceptPrivacy', 'yes');
  for (const file of attachments) form.append('files', file);
  return new Request('https://sa.invalid/api/help', { method: 'POST', headers: { origin }, body: form });
}

const png = Uint8Array.from(Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGMQUDD4DwACBAFgjby7cQAAAABJRU5ErkJggg==',
  'base64',
));
const file = (bytes, name, type) => new File([bytes], name, { type });

for (const locale of ['uk', 'ru', 'en']) {
  test('valid PNG in ' + locale + ' reaches disposable support persistence', async () => {
    const { route, state } = await fixture();
    const response = await route.POST(submission({ locale, attachments: [file(png, 'evidence.png', 'image/png')] }));
    assert.equal(response.status, 201);
    assert.equal(state.batches.length, 1);
    assert.equal(state.batches[0].length, 2);
    assert.equal(state.batches[0][0].args[5], locale);
    assert.equal(state.emails.length, 1);
    assert.equal(state.emails[0].attachments[0].contentType, 'image/png');
  });
}

test('malicious non-image declared image/png does not persist or email', async () => {
  const { route, state } = await fixture();
  const response = await route.POST(submission({ attachments: [file('<script>not an image</script>', 'image.png', 'image/png')] }));
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'invalid_attachment' });
  assert.equal(state.batches.length, 0);
  assert.equal(state.emails.length, 0);
});

test('valid PNG bytes with .html suffix are refused despite image MIME', async () => {
  const { route, state } = await fixture();
  const response = await route.POST(submission({ attachments: [file(png, 'evidence.html', 'image/png')] }));
  assert.equal(response.status, 400);
  assert.equal(state.batches.length, 0);
  assert.equal(state.emails.length, 0);
});


test('minimal structurally valid DOCX still passes the existing attachment workflow', async () => {
  const { route, state } = await fixture();
  const validDocx = Uint8Array.from(Buffer.from(
    'UEsDBBQAAAAIAPgRWV1Rl+gEsQAAABQBAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbH2QvQ7CMAyEX6XKilpXDAyo7QKswMALWInbRjQ/StxS3p4UUAcGRvu7O59c3Z6eYjabwcZa9Mx+DxBlTwZj4TzZRFoXDHIaQwce5R07gm1Z7kA6y2Q55yVDNNWRWhwHzk5zWkftbC2SXWSHj245VQv0ftASOWFYKDTVZaIQtKLsioHPaJIKHi4oUE6OJjmL/zGTVT9dc9e2WtLqX9J8cJJi1LYzQ7ESg9puvj3g/YzmBVBLAwQUAAAACAD4EVldYXsvQ4kAAADyAAAACwAAAF9yZWxzLy5yZWxzjc87DgIhEAbgqxAOsLNaWBigstnWeAECwyMujwwY9fZSWKzGwnLmn3x/Rpxx1T2W3EKsjT3Smpvkofd6BGgmYNJtKhXzSFyhpPsYyUPV5qo9wn6eD0BbgyuxNdliJafF7ji7PCv+YxfnosFTMbeEuf+o+LoYsiaPXfJ7IQv2vZ4Gy0EJ+HhRvQBQSwMEFAAAAAgA+BFZXSBUuLZ0AAAAmQAAABEAAAB3b3JkL2RvY3VtZW50LnhtbEXOMQrDMAwF0KuUHKAKGToY12Pu4dpuYogsIys4vX2jdOjyPh8h+LabSGHHVOR24Faa6c9hFakGoIU1oW93qqmctzcxejkrL9CJY2UKqbVcFtxgGscHoM9lcLabF8WPZlVYETfnQ3ZOFrSofFkvfw/wH+O+UEsBAhQDFAAAAAgA+BFZXVGX6ASxAAAAFAEAABMAAAAAAAAAAAAAAIABAAAAAFtDb250ZW50X1R5cGVzXS54bWxQSwECFAMUAAAACAD4EVldYXsvQ4kAAADyAAAACwAAAAAAAAAAAAAAgAHiAAAAX3JlbHMvLnJlbHNQSwECFAMUAAAACAD4EVldIFS4tnQAAACZAAAAEQAAAAAAAAAAAAAAgAGUAQAAd29yZC9kb2N1bWVudC54bWxQSwUGAAAAAAMAAwC5AAAANwIAAAAA',
    'base64',
  ));
  const response = await route.POST(submission({ attachments: [file(validDocx, 'fixture.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')] }));
  assert.equal(response.status, 201);
  assert.equal(state.batches.length, 1);
  assert.equal(state.emails.length, 1);
});

test('ZIP header alone cannot masquerade as DOCX package', async () => {
  const { route, state } = await fixture();
  const zip = Uint8Array.from([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]);
  const response = await route.POST(submission({ attachments: [file(zip, 'lesson.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')] }));
  assert.equal(response.status, 400);
  assert.equal(state.batches.length, 0);
  assert.equal(state.emails.length, 0);
});

test('invalid UTF-8 bytes in text/plain are refused', async () => {
  const { route, state } = await fixture();
  const response = await route.POST(submission({ attachments: [file(Uint8Array.from([0xc3, 0x28]), 'notes.txt', 'text/plain')] }));
  assert.equal(response.status, 400);
  assert.equal(state.batches.length, 0);
  assert.equal(state.emails.length, 0);
});

test('a mixed upload containing one good and one spoofed file remains atomic', async () => {
  const { route, state } = await fixture();
  const response = await route.POST(submission({ attachments: [file(png, 'real.png', 'image/png'), file('bad', 'fake.pdf', 'application/pdf')] }));
  assert.equal(response.status, 400);
  assert.equal(state.batches.length, 0);
  assert.equal(state.emails.length, 0);
});

test('normal UTF-8 Ukrainian and Russian plain text remains accepted', async () => {
  const { route, state } = await fixture();
  const response = await route.POST(submission({ attachments: [file('Український текст. Русский текст.\n', 'notes.txt', 'text/plain')] }));
  assert.equal(response.status, 201);
  assert.equal(state.batches.length, 1);
  assert.equal(state.emails.length, 1);
});

test('unchanged contract refuses forbidden application/octet-stream', async () => {
  const { route, state } = await fixture();
  const response = await route.POST(submission({ attachments: [file(png, 'unknown.exe', 'application/octet-stream')] }));
  assert.equal(response.status, 400);
  assert.equal(state.batches.length, 0);
});

test('unchanged contract keeps attachment-free feedback available', async () => {
  const { route, state } = await fixture();
  const response = await route.POST(submission());
  assert.equal(response.status, 201);
  assert.equal(state.batches.length, 1);
  assert.equal(state.emails.length, 1);
});

test('unchanged CSRF boundary blocks cross-origin feedback before DB writes', async () => {
  const { route, state } = await fixture();
  const response = await route.POST(submission({ origin: 'https://evil.invalid' }));
  assert.equal(response.status, 403);
  assert.equal(state.batches.length, 0);
  assert.equal(state.emails.length, 0);
});

test('unchanged owner boundary prevents anonymous support list reads', async () => {
  const { route, state } = await fixture();
  const response = await route.GET(new Request('https://sa.invalid/api/help'));
  assert.equal(response.status, 403);
  assert.equal(state.reads, 0);
});

test('PNG magic header without image chunks never reaches persistence', async () => {
  const { route, state } = await fixture();
  const fake = Uint8Array.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);
  const response = await route.POST(submission({ attachments: [file(fake, 'fake.png', 'image/png')] }));
  assert.equal(response.status, 400);
  assert.equal(state.batches.length, 0);
  assert.equal(state.emails.length, 0);
});

test('PNG with spoofed IEND but no IDAT cannot reach persistence', async () => {
  const { route, state } = await fixture();
  const bytes = new Uint8Array(45);
  bytes.set([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);
  new DataView(bytes.buffer).setUint32(8, 13, false);
  bytes.set(Buffer.from('IHDR'), 12);
  new DataView(bytes.buffer).setUint32(16, 1, false);
  new DataView(bytes.buffer).setUint32(20, 1, false);
  bytes.set(Buffer.from('IEND'), 37);
  const response = await route.POST(submission({ attachments: [file(bytes, 'fake.png', 'image/png')] }));
  assert.equal(response.status, 400);
  assert.equal(state.batches.length, 0);
  assert.equal(state.emails.length, 0);
});


test('PNG with corrupted IHDR CRC is refused before persistence or email', async () => {
  const { route, state } = await fixture();
  const tampered = Uint8Array.from(png);
  tampered[29] ^= 0x01; // IHDR checksum, pixel dimensions unchanged.
  const response = await route.POST(submission({ attachments: [file(tampered, 'crc-ihdr.png', 'image/png')] }));
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'invalid_attachment' });
  assert.equal(state.batches.length, 0);
  assert.equal(state.emails.length, 0);
});

test('PNG with corrupted IDAT checksum is refused before persistence or email', async () => {
  const { route, state } = await fixture();
  const tampered = Uint8Array.from(png);
  const marker = Buffer.from('IDAT');
  const at = Buffer.from(tampered).indexOf(marker);
  assert.ok(at > 0, 'IDAT chunk is present');
  const size = new DataView(tampered.buffer).getUint32(at - 4, false);
  tampered[at + 4 + size] ^= 0x01; // CRC for the compressed image payload.
  const response = await route.POST(submission({ attachments: [file(tampered, 'crc-idat.png', 'image/png')] }));
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'invalid_attachment' });
  assert.equal(state.batches.length, 0);
  assert.equal(state.emails.length, 0);
});

// SA-12 WebP ingress regression: authentic WebP samples and malformed RIFF.
// All requests use disposable fake D1/email, never production endpoints.

test('valid lossy WebP remains accepted without external email', async () => {
  const { route, state } = await fixture();
  const valid = Uint8Array.from(Buffer.from('UklGRj4AAABXRUJQVlA4IDIAAADQAQCdASoDAAIAAQAcJaACdLoB+AADsAD+4Ll/9ej+ej+ej/P9//Qof0KH9Ch/9FwAAA==', 'base64'));
  const response = await route.POST(submission({ locale: 'en', attachments: [file(valid, 'picture.webp', 'image/webp')] }));
  assert.equal(response.status, 201);
  assert.equal(state.batches.length, 1);
  assert.equal(state.emails.length, 1); // fake only
});

test('valid lossless WebP remains accepted without external email', async () => {
  const { route, state } = await fixture();
  const valid = Uint8Array.from(Buffer.from('UklGRh4AAABXRUJQVlA4TBEAAAAvAkAAAAdQov5XpP+BiOh/AAA=', 'base64'));
  const response = await route.POST(submission({ locale: 'en', attachments: [file(valid, 'picture.webp', 'image/webp')] }));
  assert.equal(response.status, 201);
  assert.equal(state.batches.length, 1);
  assert.equal(state.emails.length, 1); // fake only
});

test('valid animated WebP remains accepted without external email', async () => {
  const { route, state } = await fixture();
  const valid = Uint8Array.from(Buffer.from('UklGRsgAAABXRUJQVlA4WAoAAAACAAAAAgAAAQAAQU5JTQYAAAAAAAAAAABBTk1GSAAAAAAAAAAAAAIAAAEAAEsAAAJWUDggMAAAADABAJ0BKgMAAgABQCYloAADcAD+3FH//8/M//gf/3T4M///hTX/+FNf/4U1/wAAAEFOTUZMAAAAAAAAAAAAAgAAAQAASwAAAFZQOCA0AAAANAEAnQEqAwACAAAAJiWgAANwAP7pIh//958//7nz//ufP+jP//8p+//yOP//I4/+UCAAAA==', 'base64'));
  const response = await route.POST(submission({ locale: 'en', attachments: [file(valid, 'picture.webp', 'image/webp')] }));
  assert.equal(response.status, 201);
  assert.equal(state.batches.length, 1);
  assert.equal(state.emails.length, 1); // fake only
});

test('RIFF WEBP with no VP8 frame must not reach persistence or email', async () => {
  const { route, state } = await fixture();
  const bad = Uint8Array.from(Buffer.from('RIFF\x0c\x00\x00\x00WEBPJUNK\x00\x00\x00\x00', 'latin1'));
  const response = await route.POST(submission({ attachments: [file(bad, 'spoofed.webp', 'image/webp')] }));
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'invalid_attachment' });
  assert.equal(state.batches.length, 0);
  assert.equal(state.emails.length, 0);
});

test('WebP whose RIFF declared size contradicts byte length is refused', async () => {
  const { route, state } = await fixture();
  const bad = Uint8Array.from(Buffer.from("UklGRj4AAABXRUJQVlA4IDIAAADQAQCdASoDAAIAAQAcJaACdLoB+AADsAD+4Ll/9ej+ej+ej/P9//Qof0KH9Ch/9FwAAA==" , 'base64'));
  new DataView(bad.buffer).setUint32(4, 4, true);
  const response = await route.POST(submission({ attachments: [file(bad, 'badlength.webp', 'image/webp')] }));
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'invalid_attachment' });
  assert.equal(state.batches.length, 0);
  assert.equal(state.emails.length, 0);
});

test('WebP frame with corrupt VP8 start code is refused', async () => {
  const { route, state } = await fixture();
  const bad = Uint8Array.from(Buffer.from("UklGRj4AAABXRUJQVlA4IDIAAADQAQCdASoDAAIAAQAcJaACdLoB+AADsAD+4Ll/9ej+ej+ej/P9//Qof0KH9Ch/9FwAAA==" , 'base64'));
  bad[23] ^= 0x01; // VP8 frame start code: 0x9d 0x01 0x2a
  const response = await route.POST(submission({ attachments: [file(bad, 'badframe.webp', 'image/webp')] }));
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'invalid_attachment' });
  assert.equal(state.batches.length, 0);
  assert.equal(state.emails.length, 0);
});

test('support inbox is readable only with a verified non-agent owner identity', async () => {
  const ownerEmail = 'dordiaioleksii1@gmail.com';
  const identity = (email, emailVerified, provider = 'password') =>
    ({ userId: 'disposable', email, emailVerified, provider });
  for (const rejected of [
    null,
    identity(ownerEmail, false),
    identity(ownerEmail, true, 'agent'),
    identity('other@example.invalid', true),
    identity('other@example.invalid', false, 'chatgpt'),
  ]) {
    const { route, state } = await fixture({ identity: rejected });
    const response = await route.GET(new Request('https://sa.invalid/api/help'));
    assert.equal(response.status, 403);
    assert.equal(state.reads, 0, 'unauthorized identities never query the private inbox');
    assert.equal((await response.json()).error, 'forbidden');
    assert.match(response.headers.get('Cache-Control'), /no-store/);
  }
  for (const provider of ['password', 'chatgpt']) {
    const { route, state } = await fixture({ identity: identity(ownerEmail.toUpperCase(), true, provider) });
    const response = await route.GET(new Request('https://sa.invalid/api/help'));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { items: [] });
    assert.equal(state.reads, 1);
  }
});

test('verified owner gets an explicit 503, never a success response, when inbox storage fails', async () => {
  for (const failure of ['failRead', 'throwRead']) {
    const { route, state } = await fixture({ identity: {
      userId: 'owner', email: 'dordiaioleksii1@gmail.com', emailVerified: true, provider: 'password',
    } });
    state[failure] = true;
    const response = await route.GET(new Request('https://sa.invalid/api/help'));
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error, 'support_unavailable');
    assert.match(response.headers.get('Cache-Control'), /no-store/);
    assert.equal(state.reads, 1);
  }
});
