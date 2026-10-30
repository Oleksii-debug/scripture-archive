import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

// Run the real canonical CMS PUT handler. Only Cloudflare D1 and owner auth
// are replaced; no production account, database or remote service is used.
const source = readFileSync(new URL("../app/api/content/route.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal(compiled.diagnostics?.length ?? 0, 0);

function harness() {
  const writes = [];
  const database = {
    prepare(sql) {
      return { bind(...values) { return { sql, values }; } };
    },
    async batch(statements) {
      writes.push(statements);
      return statements.map(() => ({ success: true, meta: { changes: 1 } }));
    },
  };
  const module = { exports: {} };
  new Function("require", "module", "exports", "crypto", compiled.outputText)(
    id => {
      if (id === "cloudflare:workers") return { env: { DB: database } };
      if (id.endsWith("/lib/auth")) return {
        authenticateRequest: async () => ({ userId: "authorized-owner" }),
        isVerifiedOwner: identity => identity?.userId === "authorized-owner",
        sameOrigin: request => request.headers.get("origin") === new URL(request.url).origin,
      };
      throw Error("unexpected dependency: " + id);
    },
    module, module.exports, { randomUUID: () => "test-revision-id" },
  );
  async function save(liveNote) {
    const request = new Request("https://scripture.invalid/api/content", {
      method: "PUT",
      headers: { Origin: "https://scripture.invalid", "Content-Type": "application/json" },
      body: JSON.stringify({ liveNote }),
    });
    const response = await module.exports.PUT(request);
    return { status: response.status, body: await response.json() };
  }
  return { save, writes };
}

const valid = { uk: "Зміст", ru: "Содержание", en: "Content" };

for (const locale of ["uk", "ru", "en"]) {
  for (const [label, excessive] of [
    ["601 visible characters", "Ж".repeat(601)],
    ["601 after trimming outer spaces", "  " + "Ж".repeat(601) + "  "],
    ["302 emoji (604 UTF-16 units)", "🙂".repeat(302)],
  ]) {
    test(`CMS note rejects without D1 writes: ${locale} / ${label}`, async () => {
      const h = harness();
      const result = await h.save({ ...valid, [locale]: excessive });
      assert.equal(result.status, 400);
      assert.equal(result.body.error, "invalid_content_note");
      assert.equal(h.writes.length, 0, "no truncated private note or revision may be committed");
    });
  }

  test(`CMS note preserves exactly 600 author units in ${locale}`, async () => {
    const h = harness();
    const text = locale === "en" ? "A".repeat(600) : "Ж".repeat(600);
    const result = await h.save({ ...valid, [locale]: text });
    assert.equal(result.status, 200);
    assert.equal(result.body.liveNote[locale], text);
    assert.equal(h.writes.length, 1);
    assert.equal(h.writes[0].length, 2, "revision and current note remain one D1 batch");
    const saved = JSON.parse(h.writes[0][1].values[0]);
    assert.equal(saved.liveNote[locale], text);
  });
}

test("CMS retains existing whitespace trim without shortening valid text", async () => {
  const h = harness();
  const result = await h.save({ ...valid, uk: "  " + "Ї".repeat(600) + "  " });
  assert.equal(result.status, 200);
  assert.equal(result.body.liveNote.uk, "Ї".repeat(600));
  assert.equal(h.writes.length, 1);
});

test("CMS preserves exactly 300 emoji instead of splitting a surrogate pair", async () => {
  const h = harness();
  const text = "🙂".repeat(300); // 600 UTF-16 units, valid as a whole.
  const result = await h.save({ ...valid, en: text });
  assert.equal(result.status, 200);
  assert.equal(result.body.liveNote.en, text);
  assert.equal(JSON.parse(h.writes[0][1].values[0]).liveNote.en, text);
});

test("oversized note in any one locale prevents all three writes", async () => {
  const h = harness();
  const result = await h.save({ uk: "У".repeat(600), ru: "Р".repeat(601), en: "E".repeat(600) });
  assert.equal(result.status, 400);
  assert.equal(h.writes.length, 0);
});
