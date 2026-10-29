import { spawn } from "node:child_process";
import { access, cp, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { DatabaseSync } from "node:sqlite";
import { tmpdir } from "node:os";
import path from "node:path";
import { waitForStableWorker } from "./integration-ready.mjs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const builtOutput = path.join(root, "dist");
await access(path.join(builtOutput, "server/wrangler.json")).catch(() => { throw Error("Run npm run build before npm run test:integration."); });
const temporary = await mkdtemp(path.join(tmpdir(), "scripture-integration-"));
// Qualify an immutable build snapshot to prevent Wrangler's dev watcher from
// invalidating worker requests during an otherwise isolated D1 test.
const frozenOutput = path.join(temporary, "frozen-dist");
try { await cp(builtOutput, frozenOutput, { recursive: true }); }
catch (error) { await rm(temporary, { recursive: true, force: true }); throw error; }
const builtConfig = path.join(frozenOutput, "server/wrangler.json");
const state = path.join(temporary, "state");
const config = JSON.parse(await readFile(builtConfig, "utf8"));
const migrationConfig = path.join(temporary, "migrations.json");
await writeFile(migrationConfig, JSON.stringify({
  name: "scripture-local-integration",
  d1_databases: config.d1_databases.map(database => ({ ...database, migrations_dir: path.join(root, "drizzle") })),
}));
const server = createServer();
await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
const port = server.address().port;
await new Promise(resolve => server.close(resolve));
const base = `http://127.0.0.1:${port}`;
const wrangler = ["--import", "./scripts/sites-env.mjs", "./node_modules/wrangler/bin/wrangler.js"];
const options = { cwd: root, env: { ...process.env, WRANGLER_SEND_METRICS: "false",
  WRANGLER_CI_DISABLE_CONFIG_WATCHING: "true",
  WRANGLER_REGISTRY_PATH: path.join(temporary,"registry"),
  MINIFLARE_REGISTRY_PATH: path.join(temporary,"miniflare"),
  WRANGLER_LOG_PATH: path.join(temporary,"logs"),
} };
function run(args, extra = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { ...options, ...extra, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", code => code === 0 ? resolve() : reject(Error(`Local check exited with status ${code}`)));
  });
}
let worker;
let logs = "";
try {
  await run([...wrangler, "d1", "migrations", "apply", "DB", "--local", "--persist-to", state, "--config", migrationConfig]);
  worker = spawn(process.execPath, [...wrangler, "dev", "--local", "--persist-to", state,
    "--name", `scripture-integration-${port}`,
    "--config", builtConfig, "--ip", "127.0.0.1", "--port", String(port), "--inspector-port", "0",
    "--var", "AUTH_TEST_MODE:1", "--var", `APP_BASE_URL:${base}`], { ...options, stdio: ["ignore", "pipe", "pipe"] });
  worker.stdout.on("data", data => { logs = (logs + data).slice(-12000); });
  worker.stderr.on("data", data => { logs = (logs + data).slice(-12000); });
  worker.on("error", error => { logs += error.message; });
  // Warm only safe GET routes; never retry stateful POST or PUT requests.
  // Require eight complete, consecutive passes through all three app modules.
  const ready = await waitForStableWorker(base, {
    isStopped: () => worker.exitCode !== null,
    routes: [
      { path: "/api/editor-roles?view=me", validate: data => data?.editor === false },
      { path: "/api/material-review?view=public", validate: data => Array.isArray(data?.items) },
    ],
  });
  if (!ready) throw Error(`Local worker did not become ready. ${logs}`);
  await run(["--test", "--test-concurrency=1", "tests/api-flow.test.mjs", "tests/community.test.mjs", "tests/community-runner.test.mjs", "tests/community-smoke.test.mjs", "tests/community-runner-identity.test.mjs", "tests/security-contract.test.mjs"],
    { env: { ...options.env, SCRIPTURE_TEST_URL: base } });
  await run(["--experimental-strip-types", "scripts/test-learning-agent.mjs", "--local-test", "--smoke"],
    { env: { ...options.env, COMMUNITY_ORIGIN: base } });
  // The HTTP test deletes the user who created bookmarks and submissions.
  // Inspect the disposable D1 database to verify both were removed.
  const directory = path.join(state, "v3", "d1", "miniflare-D1DatabaseObject");
  const databases = (await readdir(directory)).filter(name => name.endsWith(".sqlite"));
  let inspected = 0;
  for (const name of databases) {
    const db = new DatabaseSync(path.join(directory, name), { readOnly: true });
    try {
      if (!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='reader_bookmarks'").get()) continue;
      inspected++;
      const row = db.prepare("SELECT COUNT(*) AS count FROM reader_bookmarks").get();
      if (Number(row.count) !== 0) throw Error("Deleted account retained reader bookmarks");
      const submissions = db.prepare("SELECT COUNT(*) AS count FROM material_submissions").get();
      if (Number(submissions.count) !== 0) throw Error("Deleted account retained material submissions");
      const roleEvents = db.prepare("SELECT COUNT(*) AS count FROM editorial_role_events").get();
      if (Number(roleEvents.count) !== 0) throw Error("Deleted account retained editorial role events");
    } finally { db.close(); }
  }
  if (inspected !== 1) throw Error(`Expected one bookmark database, found ${inspected}`);
} catch(error) {
  console.error(logs.replace(/([?&](?:token|reset)=)[^&\s]+/g,"$1[redacted]").replace(/(sa_(?:agent|session)=)[^;\s]+/g,"$1[redacted]"));
  throw error;
} finally {
  if (worker && worker.exitCode === null) {
    worker.kill("SIGTERM");
    await new Promise(resolve => worker.once("exit", resolve));
  }
  await rm(temporary, { recursive: true, force: true });
}
