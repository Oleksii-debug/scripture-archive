import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

test("robots allows the public missions page while excluding private attempts", async () => {
  const source = await readFile(new URL("../app/robots.txt/route.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, Response, require: () => ({ siteUrl: () => "https://example.invalid" }) });
  const response = exports.GET();
  assert.equal(response.status, 200);
  const rules = (await response.text()).split("\n").flatMap(line => {
    const match = /^(Allow|Disallow):\s*(\/\S*)$/.exec(line);
    return match ? [{ allow: match[1] === "Allow", path: match[2] }] : [];
  });
  const allowed = path => rules.filter(rule => path.startsWith(rule.path)).sort((a, b) => b.path.length - a.path.length || Number(b.allow) - Number(a.allow))[0]?.allow;
  assert.equal(allowed("/missions"), true);
  assert.equal(allowed("/mission/attempt/opaque"), false);
  assert.equal(allowed("/account"), false);
  assert.equal(allowed("/reader/GEN/1"), true);
});
