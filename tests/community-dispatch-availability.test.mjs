import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Execute the canonical signed-dispatch POST route in a disposable VM.
// This is NOT a production scheduler, D1, OIDC, or Cloudflare attestation.
const source = readFileSync(new URL("../app/api/community/dispatch/route.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal(compiled.diagnostics?.length ?? 0, 0);

function fixture({ failure = "", valid = true, allowed = true, status = "stopped", autostart = "0" } = {}) {
  const calls = { rate: 0, verify: 0, ensure: 0, read: 0, control: 0, lease: 0 };
  const db = {
    prepare(sql) {
      return {
        bind() { return this; },
        async first() {
          calls.read++;
          assert.match(sql, /SELECT status FROM community_runs/);
          if (failure === "read") throw Error("simulated D1 read outage");
          return { status };
        },
      };
    },
  };
  const exports = {};
  vm.runInNewContext(compiled.outputText, {
    exports, Request, Response, URL,
    require(name) {
      if (name === "cloudflare:workers") return { env: { DB: db, COMMUNITY_AUTOSTART: autostart } };
      if (name === "../../../../lib/community-runner-identity.mjs") return {
        verifyCommunityRunner: async () => {
          calls.verify++;
          if (failure === "verify") throw Error("simulated OIDC verifier outage");
          return valid;
        },
      };
      if (name === "../../../../lib/community-engine") return {
        ensureCommunityRun: async () => {
          calls.ensure++;
          if (failure === "ensure") throw Error("simulated D1 initialization outage");
        },
        controlCommunity: async () => {
          calls.control++;
          if (failure === "control") throw Error("simulated D1 control outage");
          return { ok: true };
        },
        leaseCommunityAgents: async () => {
          calls.lease++;
          if (failure === "lease") throw Error("simulated D1 lease outage");
          return { jobs: [], status };
        },
      };
      if (name === "../../../../lib/community") return { COMMUNITY_RUN_ID: "fixture-run" };
      if (name === "../../../../lib/auth") return {
        rateLimit: async () => {
          calls.rate++;
          if (failure === "rate") throw Error("simulated D1 rate limiter outage");
          return allowed;
        },
        requestAddress: () => "fixture-ip",
      };
      throw Error("unexpected import " + name);
    },
  });
  return {
    calls,
    async post(bearer = "Bearer fixture-signed-token") {
      const response = await exports.POST(new Request("https://archive.invalid/api/community/dispatch", {
        method: "POST", headers: { authorization: bearer },
      }));
      return {
        status: response.status,
        body: await response.json(),
        cache: response.headers.get("cache-control"),
      };
    },
  };
}

for (const failure of ["rate", "verify", "ensure", "read", "lease"]) {
  test("R0.4 signed dispatch fails closed on " + failure + " outage, without a 500 or jobs", async () => {
    const f = fixture({ failure, status: "running" });
    const response = await f.post();
    assert.equal(response.status, 503, failure);
    assert.equal(response.body.error, "community_unavailable");
    assert.equal(Object.hasOwn(response.body, "jobs"), false);
    assert.match(response.cache || "", /no-store/);
    assert.equal(f.calls.control, 0, "outage must never activate owner control");
  });
}

test("R0.4 invalid OIDC identity is forbidden without scheduler mutation", async () => {
  const f = fixture({ valid: false });
  const response = await f.post();
  assert.equal(response.status, 403);
  assert.equal(response.body.error, "forbidden");
  assert.deepEqual(f.calls, { rate: 1, verify: 1, ensure: 0, read: 0, control: 0, lease: 0 });
});

test("R0.4 rate quota preserves 429 without identity or scheduler work", async () => {
  const f = fixture({ allowed: false });
  const response = await f.post();
  assert.equal(response.status, 429);
  assert.equal(response.body.error, "too_many_requests");
  assert.deepEqual(f.calls, { rate: 1, verify: 0, ensure: 0, read: 0, control: 0, lease: 0 });
});

test("R0.4 owner-stopped run is not auto-started by a valid dispatch", async () => {
  const f = fixture({ status: "stopped", autostart: "1" });
  const response = await f.post();
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.jobs, []);
  assert.equal(f.calls.control, 0);
  assert.equal(f.calls.lease, 1);
});

test("R0.4 waiting run stays waiting without explicit autostart", async () => {
  const f = fixture({ status: "waiting", autostart: "0" });
  const response = await f.post();
  assert.equal(response.status, 200);
  assert.equal(response.body.status, "waiting");
  assert.deepEqual(response.body.jobs, []);
  assert.equal(f.calls.control, 0);
  assert.equal(f.calls.lease, 0);
});

test("R0.4 a recovered signed running dispatch leases only after all checks pass", async () => {
  const f = fixture({ status: "running" });
  const response = await f.post();
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.jobs, []);
  assert.equal(f.calls.rate, 1);
  assert.equal(f.calls.verify, 1);
  assert.equal(f.calls.ensure, 1);
  assert.equal(f.calls.read, 1);
  assert.equal(f.calls.lease, 1);
  assert.equal(f.calls.control, 0);
});
