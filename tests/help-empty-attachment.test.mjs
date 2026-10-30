import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

// Execute the checked-in support API, not an imitation of its file validation.
// Local D1 and email fakes ensure no real personal content is sent anywhere.
const source = readFileSync(new URL("../app/api/help/route.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal(compiled.diagnostics?.length ?? 0, 0);

function fixture() {
  const calls = { batch: 0, mail: 0, prepared: 0, attachmentCount: null };
  const DB = {
    prepare(sql) {
      calls.prepared++;
      return {
        sql, args: [],
        bind(...args) { this.args = args; return this; },
      };
    },
    async batch(statements) {
      calls.batch++;
      calls.attachmentCount = statements.length - 1;
      return statements.map(() => ({ success: true, meta: { changes: 1 } }));
    },
  };
  const module = { exports: {} };
  new Function("require", "module", "exports", compiled.outputText)(
    specifier => {
      if (specifier === "cloudflare:workers") return { env: { DB } };
      if (specifier.endsWith("/lib/auth")) return {
        authenticateRequest: async () => null,
        rateLimit: async () => true,
        requestAddress: () => "isolated-test",
        sameOrigin: request => request.headers.get("origin") === new URL(request.url).origin,
      };
      if (specifier.endsWith("/lib/email")) return {
        sendSupportRequestEmail: async () => { calls.mail++; return { delivered: false }; },
      };
      throw Error("Unexpected dependency: " + specifier);
    }, module, module.exports,
  );
  async function submit(entries = []) {
    const form = new FormData();
    form.set("email", "local@example.invalid");
    form.set("subject", "Help with attachment");
    form.set("message", "A disposable, entirely local test request.");
    form.set("acceptPrivacy", "yes");
    for (const item of entries) form.append("files", item);
    const response = await module.exports.POST(new Request("https://scripture.invalid/api/help", {
      method: "POST", headers: { Origin: "https://scripture.invalid" }, body: form,
    }));
    return { status: response.status, body: await response.json() };
  }
  return { calls, submit };
}

const textFile = (data, name = "note.txt") => new File([data], name, { type: "text/plain" });
const emptyFile = () => new File([], "selected-empty.txt", { type: "text/plain" });

for (const entries of [
  [emptyFile()],
  [textFile("valid evidence"), emptyFile()],
  [emptyFile(), textFile("valid evidence")],
  [textFile("one"), emptyFile(), textFile("two")],
]) {
  test("selected empty attachment is rejected atomically before D1/email", async () => {
    const h = fixture();
    const result = await h.submit(entries);
    assert.equal(result.status, 400);
    assert.equal(result.body.error, "invalid_attachment");
    assert.equal(h.calls.batch, 0);
    assert.equal(h.calls.mail, 0);
    assert.equal(h.calls.prepared, 0);
  });
}

test("browser empty filename placeholder is not a user-selected attachment", async () => {
  const h = fixture();
  const result = await h.submit([new File([], "", { type: "application/octet-stream" })]);
  assert.equal(result.status, 201);
  assert.equal(h.calls.batch, 1);
  assert.equal(h.calls.attachmentCount, 0);
  assert.equal(h.calls.mail, 1);
});

test("nonempty unnamed file is rejected rather than silently discarded", async () => {
  const h = fixture();
  const result = await h.submit([textFile("content", "")]);
  assert.equal(result.status, 400);
  assert.equal(result.body.error, "invalid_attachment");
  assert.equal(h.calls.batch, 0);
  assert.equal(h.calls.mail, 0);
});

test("malformed text field named files is rejected, not treated as no upload", async () => {
  const h = fixture();
  const result = await h.submit(["I am not a File"]);
  assert.equal(result.status, 400);
  assert.equal(result.body.error, "invalid_attachment");
  assert.equal(h.calls.batch, 0);
  assert.equal(h.calls.mail, 0);
});

test("normal attachment-free request is still accepted", async () => {
  const h = fixture();
  const result = await h.submit();
  assert.equal(result.status, 201);
  assert.equal(h.calls.attachmentCount, 0);
  assert.equal(h.calls.mail, 1);
});

test("valid named UTF-8 support evidence is still saved and forwarded once", async () => {
  const h = fixture();
  const result = await h.submit([textFile("Допомога та пояснення.\n")]);
  assert.equal(result.status, 201);
  assert.equal(h.calls.attachmentCount, 1);
  assert.equal(h.calls.mail, 1);
});
