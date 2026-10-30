import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";

const workflow = readFileSync(fileURLToPath(new URL("../.github/workflows/source-quality.yml", import.meta.url)), "utf8");
const ROOT_CONFIGURATION = ["*.config.*", "tsconfig.json", "cloudflare-env.d.ts", ".npmrc", "pytest.ini"];

function pathsFor(trigger, source = workflow) {
  const lines = source.split("\n");
  const start = lines.indexOf(`  ${trigger}:`);
  assert.ok(start >= 0, `Missing ${trigger} event`);
  const end = lines.findIndex((line, i) => i > start &&
    /^  [a-z_]+:$/.test(line));
  const section = lines.slice(start + 1, end < 0 ? undefined : end);
  const pathStart = section.indexOf("    paths:");
  assert.ok(pathStart >= 0, `Missing ${trigger}.paths`);
  const paths = [];
  for (const line of section.slice(pathStart + 1)) {
    const match = /^      - '([^']+)'$/.exec(line);
    if (!match) break;
    paths.push(match[1]);
  }
  return paths;
}

for (const trigger of ["pull_request", "push"]) {
  test(`source-quality ${trigger} includes each current root configuration`, () => {
    const registered = pathsFor(trigger);
    for (const path of ROOT_CONFIGURATION) {
      assert.equal(registered.filter(value => value === path).length, 1,
        `${trigger} must exactly once cover root ${path}`);
    }
    assert.ok(registered.includes(".github/workflows/source-quality.yml"));
  });

  test(`source-quality ${trigger} fails when configuration gate is omitted`, () => {
    const missing = workflow.replace(
      new RegExp(`(  ${trigger}:\\n(?:[^\\n]*\\n)*?)(      - 'tsconfig.json'\\n)`),
      (_all, prefix) => prefix
    );
    assert.notEqual(missing, workflow, "test mutation must actually delete the path");
    assert.equal(pathsFor(trigger, missing).includes("tsconfig.json"), false);
    assert.equal(pathsFor(trigger).includes("tsconfig.json"), true);
  });
}
