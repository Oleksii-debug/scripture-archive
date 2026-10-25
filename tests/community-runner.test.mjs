import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import test from "node:test";

async function check(status, responseBody, verify) {
  let requests = 0;
  const server = createServer((request, response) => {
    requests += 1;
    assert.equal(request.url, "/api/community?public=summary");
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(JSON.stringify(responseBody));
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    const child = spawn(process.execPath, ["scripts/run-community.mjs", "--once"], {
      cwd: new URL("../", import.meta.url), env: { ...process.env, COMMUNITY_ORIGIN: origin },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "", error = "";
    child.stdout.on("data", data => { output += data; });
    child.stderr.on("data", data => { error += data; });
    const exit = await new Promise((resolve, reject) => { child.once("error", reject); child.once("exit", resolve); });
    verify({ exit, output, error });
    assert.equal(requests, 1);
  } finally { await new Promise(resolve => server.close(resolve)); }
}

test("community runner stops when the release endpoint is missing", async () => {
  await check(404, {}, result => { assert.equal(result.exit, 1); assert.match(result.error, /not deployed/); assert.equal(result.output, ""); });
});
test("community runner rejects a successful response with no actual summary", async () => {
  await check(200, { message: "sign in" }, result => { assert.equal(result.exit, 1); assert.match(result.error, /unexpected payload/); });
});
test("community runner reports the server summary and identifies local execution", async () => {
  await check(200, { summary: { registered: 3, online: 1, visible: 3 } }, result => {
    assert.equal(result.exit, 0); const data = JSON.parse(result.output);
    assert.equal(data.summary.registered, 3); assert.equal(data.localOnly, true);
    assert.equal(data.timeZone, "Europe/Warsaw");
  });
});
