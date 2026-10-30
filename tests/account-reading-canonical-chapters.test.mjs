import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Execute the canonical account route against its real edition-aware catalog,
// not an independently maintained test book list.
const catalog = JSON.parse(readFileSync(new URL("../public/data/catalog.json", import.meta.url), "utf8"));
const source = readFileSync(new URL("../app/api/account/route.ts", import.meta.url), "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal(transpiled.diagnostics?.length ?? 0, 0);

function harness() {
  const calls = [];
  const db = {
    prepare(sql) {
      return { bind(...args) {
        return { async run() {
          calls.push({ sql, args });
          return { success: true, meta: { changes: 1 } };
        } };
      } };
    },
  };
  const exports = {};
  vm.runInNewContext(transpiled.outputText, {
    exports, Request, Response, URL,
    require(name) {
      if (name === "cloudflare:workers") return { env: { DB: db } };
      if (name === "../../../public/data/catalog.json") return { default: catalog };
      if (name === "../../../content/mission-abraham.json")
        return { default: { tasks: [] } };
      if (name === "../../../lib/auth") return {
        sameOrigin: req => req.headers.get("origin") === new URL(req.url).origin,
        authenticateRequest: async () => ({ userId: "canonical-reader", provider: "password" }),
        isVerifiedOwner: () => false,
      };
      throw Error("unexpected isolated dependency " + name);
    },
  });
  async function put(reading) {
    const response = await exports.PUT(new Request("https://reader.invalid/api/account?action=reading", {
      method: "PUT", headers: { Origin: "https://reader.invalid", "Content-Type": "application/json" },
      body: JSON.stringify({ reading }),
    }));
    return { status: response.status, body: await response.json() };
  }
  return { put, calls };
}

const receipt = (book, chapter) => ({ book, chapter, title: "Розділ читання" });

test("canonical reading receives valid distinct local-book chapter counts", async () => {
  assert.equal(catalog.books.en.find(book => book.code === "GEN").chapters, 50);
  assert.equal(catalog.editionBooks["uk-ohiienko"].find(book => book.code === "JOL").chapters, 4);
  const f = harness();
  const good = await f.put([receipt("GEN", 50), receipt("JOL", 4), receipt("PSA", 150)]);
  assert.equal(good.status, 200);
  assert.deepEqual(good.body, { ok: true });
  assert.equal(f.calls.length, 1);
  assert.deepEqual(JSON.parse(f.calls[0].args[1]), [
    receipt("GEN", 50), receipt("JOL", 4), receipt("PSA", 150),
  ]);
});

test("reading writes reject invented books, out-of-range chapters and string coercion before D1", async () => {
  const invalid = [
    receipt("ZZZ", 1), receipt("GEN", 51), receipt("GEN", 0),
    receipt("JOL", 5), receipt("REV", 23), receipt("PSA", 151),
    receipt("GEN", "1"), receipt("GEN", null), receipt("GEN", 1.25),
    receipt("GEN", true), receipt("GEN", -1),
  ];
  for (const item of invalid) {
    const f = harness();
    const response = await f.put([item]);
    assert.equal(response.status, 400, JSON.stringify(item));
    assert.equal(response.body.error, "invalid_reading");
    assert.equal(f.calls.length, 0, "rejected input cannot mutate D1");
  }
});

test("one invalid entry rejects whole batch without acknowledging valid entries", async () => {
  const f = harness();
  const response = await f.put([receipt("GEN", 1), receipt("FAK", 5)]);
  assert.equal(response.status, 400);
  assert.equal(f.calls.length, 0);
});

test("genuine empty reading update remains a durable acknowledged write", async () => {
  const f = harness();
  const response = await f.put([]);
  assert.equal(response.status, 200);
  assert.equal(f.calls.length, 1);
});
