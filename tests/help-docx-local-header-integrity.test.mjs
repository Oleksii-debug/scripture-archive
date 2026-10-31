import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

// Execute the actual production DOCX admission helper, not a reimplementation.
// No network, Cloudflare credentials, D1 writes or support email.
const source = readFileSync(new URL("../app/api/help/route.ts", import.meta.url), "utf8");
const start = source.indexOf("function docxHasParts(");
const end = source.indexOf("\n// Check PNG chunk boundaries", start);
assert.ok(start >= 0 && end > start, "real support ZIP validation seam");
const compiled = ts.transpileModule(source.slice(start, end), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  reportDiagnostics: true,
});
assert.equal(compiled.diagnostics?.length ?? 0, 0);
const docxHasParts = new Function(compiled.outputText + "\nreturn docxHasParts;")();

function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++)
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function syntheticDocxZip() {
  const enc = new TextEncoder();
  const entries = [
    ["[Content_Types].xml", enc.encode('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>')],
    ["word/document.xml", enc.encode('<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body/></w:document>')],
  ];
  const chunks = [];
  const directory = [];
  const refs = [];
  let length = 0;
  function append(bytes) { chunks.push(bytes); length += bytes.length; }

  for (const [name, data] of entries) {
    const nameBytes = enc.encode(name), localOffset = length;
    const local = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(local.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint32(14, crc32(data), true);
    view.setUint32(18, data.length, true);
    view.setUint32(22, data.length, true);
    view.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    append(local);
    append(data);
    directory.push({ nameBytes, data, localOffset });
    refs.push({ name, localOffset, centralOffset: 0 });
  }
  const centralStart = length;
  for (const [index, entry] of directory.entries()) {
    refs[index].centralOffset = length;
    const central = new Uint8Array(46 + entry.nameBytes.length);
    const view = new DataView(central.buffer);
    view.setUint32(0, 0x02014b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 20, true);
    view.setUint32(16, crc32(entry.data), true);
    view.setUint32(20, entry.data.length, true);
    view.setUint32(24, entry.data.length, true);
    view.setUint16(28, entry.nameBytes.length, true);
    view.setUint32(42, entry.localOffset, true);
    central.set(entry.nameBytes, 46);
    append(central);
  }
  const centralSize = length - centralStart;
  const end = new Uint8Array(22), view = new DataView(end.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(8, directory.length, true);
  view.setUint16(10, directory.length, true);
  view.setUint32(12, centralSize, true);
  view.setUint32(16, centralStart, true);
  append(end);
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return { bytes, refs, centralStart };
}

test("valid two-part stored ZIP stays eligible for DOCX structural support admission", () => {
  assert.equal(docxHasParts(syntheticDocxZip().bytes), true);
});

const mutations = [
  ["central entry redirected to a different local filename", (b, ref) =>
    new DataView(b.buffer).setUint32(ref.centralOffset + 42, 0, true)],
  ["central entry redirected inside central directory", (b, ref, fixture) =>
    new DataView(b.buffer).setUint32(ref.centralOffset + 42, fixture.centralStart, true)],
  ["claimed local entry signature damaged", (b, ref) => { b[ref.localOffset] ^= 1; }],
  ["central and local filenames disagree", (b, ref) => { b[ref.localOffset + 30] ^= 1; }],
  ["claimed compressed payload extends into central directory", (b, ref) =>
    new DataView(b.buffer).setUint32(ref.centralOffset + 20, b.length, true)],
  ["central and local compression methods disagree", (b, ref) =>
    new DataView(b.buffer).setUint16(ref.localOffset + 8, 8, true)],
  ["central and local encryption flags disagree", (b, ref) =>
    new DataView(b.buffer).setUint16(ref.localOffset + 6, 1, true)],
  ["central and local filename lengths disagree", (b, ref) =>
    new DataView(b.buffer).setUint16(ref.localOffset + 26, 0, true)],
  ["local extra-field crosses central directory", (b, ref) =>
    new DataView(b.buffer).setUint16(ref.localOffset + 28, 0x7fff, true)],
];

for (const [label, mutate] of mutations) {
  test("reject ungrounded DOCX central directory: " + label, () => {
    const fixture = syntheticDocxZip();
    const tampered = Uint8Array.from(fixture.bytes);
    mutate(tampered, fixture.refs[1], fixture);
    assert.equal(docxHasParts(tampered), false,
      "central-file declaration must be bound to real local-header bytes");
  });
}

test("an unchanged genuine first local entry does not excuse forged second part", () => {
  const fixture = syntheticDocxZip();
  const tampered = Uint8Array.from(fixture.bytes);
  new DataView(tampered.buffer).setUint32(fixture.refs[1].centralOffset + 42,
    fixture.refs[0].localOffset, true);
  assert.equal(docxHasParts(tampered), false);
  assert.equal(docxHasParts(fixture.bytes), true, "negative test must not poison recovery");
});
