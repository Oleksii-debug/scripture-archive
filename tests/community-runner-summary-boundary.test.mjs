import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import test from "node:test";

// Exercise the actual release scheduler CLI. All traffic and the synthetic
// owner cookie remain confined to a disposable 127.0.0.1 HTTP server.
async function runWithSummary(summary) {
  const seen = [];
  const server = createServer((req, res) => {
    seen.push(req.method + " " + req.url);
    res.setHeader("Content-Type", "application/json");
    if (req.method === "GET" && req.url === "/api/community?public=summary") {
      res.end(JSON.stringify({ summary }));
    } else if (req.method === "POST" && req.url === "/api/community") {
      res.end(JSON.stringify({ jobs: [] }));
    } else {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: "unexpected_test_request" }));
    }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    const origin = "http://127.0.0.1:" + server.address().port;
    const child = spawn(process.execPath, ["scripts/run-community.mjs", "--agents", "--once"], {
      cwd: new URL("../", import.meta.url),
      env: { ...process.env, COMMUNITY_ORIGIN: origin, COMMUNITY_OWNER_COOKIE: "LOOPBACK_TEST_ONLY" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "", stderr = "";
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    const exit = await new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("exit", resolve);
    });
    return { exit, stdout, stderr, seen };
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

for (const [label, summary] of [
  ["negative registered", { registered: -1, online: 0 }],
  ["negative online", { registered: 2, online: -1 }],
  ["online exceeds registered", { registered: 1, online: 2 }],
  ["unsafe registered integer", { registered: Number.MAX_SAFE_INTEGER + 1, online: 0 }],
  ["unsafe online integer", { registered: Number.MAX_SAFE_INTEGER + 1, online: Number.MAX_SAFE_INTEGER + 1 }],
  ["fractional online", { registered: 1, online: 0.5 }],
  ["string registered", { registered: "3", online: 1 }],
  ["missing online", { registered: 3 }],
]) {
  test("R0.4 refuses owner lease after " + label, async () => {
    const result = await runWithSummary(summary);
    assert.equal(result.exit, 1, "invalid counts must fail closed");
    assert.match(result.stderr, /unexpected payload/);
    assert.equal(result.stdout, "", "invalid summary must not be announced");
    assert.deepEqual(result.seen, ["GET /api/community?public=summary"],
      "invalid summary must not reach the owner-lease POST");
  });
}

test("R0.4 valid bounded counters retain one loopback-only lease", async () => {
  const result = await runWithSummary({ registered: 3, online: 2 });
  assert.equal(result.exit, 0, result.stderr);
  assert.deepEqual(result.seen, ["GET /api/community?public=summary", "POST /api/community"]);
  assert.equal(JSON.parse(result.stdout).summary.registered, 3);
});

test("R0.4 emits only bounded public counters and never logs unexpected summary fields", async () => {
  const marker = "SECRET_SESSION_EXAMPLE_DO_NOT_PRINT";
  const result = await runWithSummary({
    registered: 3, online: 2, visible: 1,
    privateSession: marker,
    adminEmail: "example-private@example.invalid",
    notes: { token: marker },
  });
  assert.equal(result.exit, 0, result.stderr);
  assert.deepEqual(result.seen, ["GET /api/community?public=summary", "POST /api/community"]);
  assert.deepEqual(JSON.parse(result.stdout).summary, { registered: 3, online: 2, visible: 1 });
  assert.equal(result.stdout.includes(marker), false, "private upstream fields cannot reach stdout");
  assert.equal(result.stdout.includes("example-private@example.invalid"), false);
});

test("R0.4 never announces malformed optional visible count", async () => {
  for (const visible of [-1, 1.25, "1", Number.MAX_SAFE_INTEGER + 1, 8]) {
    const result = await runWithSummary({ registered: 3, online: 2, visible });
    assert.equal(result.exit, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout).summary, { registered: 3, online: 2 });
  }
});
