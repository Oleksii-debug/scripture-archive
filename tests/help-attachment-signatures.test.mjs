import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

// Execute the actual TypeScript API handler, replacing only Cloudflare/D1/email
// integrations with disposable local fakes. Never sends a network request.
const routeFile = new URL('../app/api/help/route.ts', import.meta.url);
async function fixture() {
  const source = await readFile(routeFile, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: 'app/api/help/route.ts', reportDiagnostics: true,
  });
  assert.equal(transpiled.diagnostics?.length || 0, 0, 'real route transpiles');
  const state = { batches: [], emails: [], reads: 0 };
  const DB = {
    prepare(sql) {
      state.reads += /SELECT/i.test(sql) ? 1 : 0;
      return {
        sql, args: [],
        bind(...args) { this.args = args; return this; },
        async all() { return { results: [] }; },
        async run() { state.batches.push([{ sql: this.sql, args: this.args }]); return { success: true }; },
      };
    },
    async batch(statements) {
      state.batches.push(statements.map(statement => ({ sql: statement.sql, args: statement.args })));
      return statements.map(() => ({ success: true }));
    },
  };
  const requireFake = id => {
    if (id === 'cloudflare:workers') return { env: { DB } };
    if (id.endsWith('lib/auth')) return {
      authenticateRequest: async () => null,
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
  const module = { exports: {} };
  new Function('require', 'module', 'exports', transpiled.outputText)(requireFake, module, module.exports);
  return { route: module.exports, state };
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
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAuMBgVOWyr0AAAAASUVORK5CYII=',
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
