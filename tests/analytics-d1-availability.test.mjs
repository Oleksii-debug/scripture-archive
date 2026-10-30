import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../app/api/analytics/route.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal(compiled.diagnostics?.length ?? 0, 0);

function harness({ dbPresent = true, dbMode = "ok", auth = "owner", limit = "allow", community = "ok" } = {}) {
  const calls = { auth: 0, rate: 0, prepare: 0, batch: 0, community: 0 };
  const database = {
    prepare() {
      calls.prepare++;
      if (dbMode === "prepare-throw") throw Error("D1 prepare failed");
      return { bind() { return this; } };
    },
    async batch(statements) {
      calls.batch++;
      if (dbMode === "batch-throw") throw Error("D1 batch failed");
      if (statements.length === 9) {
        return statements.map((_, i) => ({
          success: !(dbMode === "read-false" && i === 0),
          ...(dbMode === "read-missing" && i === 0 ? {} : { results: i < 2 ? [{ total: 0 }] : [] }),
        }));
      }
      return statements.map((_, i) => ({
        success: !(dbMode === "write-false" && i === 0),
        meta: dbMode === "write-no-ack" ? {} : { changes: dbMode === "write-zero" ? 0 : 1 },
      }));
    },
  };
  const exports = {};
  vm.runInNewContext(compiled.outputText, {
    exports, Request, Response, URL, crypto,
    require(specifier) {
      if (specifier === "cloudflare:workers") return { env: { DB: dbPresent ? database : undefined } };
      if (specifier === "../../../lib/auth") return {
        authenticateRequest: async () => {
          calls.auth++;
          if (auth === "throw") throw Error("identity-store unavailable");
          if (auth === "anonymous") return null;
          return { userId: "owner-one", emailVerified: true, provider: "password" };
        },
        isVerifiedOwner: identity => Boolean(identity) && auth === "owner",
        rateLimit: async () => {
          calls.rate++;
          if (limit === "throw") throw Error("rate limit unavailable");
          return limit !== "deny";
        },
        requestAddress: () => "remote-ip",
        sameOrigin: request => request.headers.get("origin") === new URL(request.url).origin,
      };
      if (specifier === "../community/route") return {
        ownerCommunityState: async () => {
          calls.community++;
          if (community === "throw") throw Error("community DB outage");
          return { registered: 0 };
        },
      };
      throw Error("Unexpected import: " + specifier);
    },
  });
  async function invoke(method, { origin = "https://scripture.test", action = "heartbeat" } = {}) {
    const body = {
      sessionId: "deadbeef-dead-4eef-8eef-001122334455",
      action,
      pageName: "reading",
      eventType: "page_view",
    };
    const request = new Request("https://scripture.test/api/analytics", {
      method,
      headers: { Origin: origin, "Content-Type": "application/json" },
      ...(method === "POST" ? { body: JSON.stringify(body) } : {}),
    });
    const response = await exports[method](request);
    return { status: response.status, body: await response.json(), cache: response.headers.get("cache-control") };
  }
  return { invoke, calls };
}

for (const method of ["POST", "GET"]) {
  test(method + " missing D1 returns 503 before authentication", async () => {
    const h = harness({ dbPresent: false });
    const r = await h.invoke(method);
    assert.equal(r.status, 503);
    assert.equal(r.body.error, "database_unavailable");
    assert.equal(h.calls.auth, 0);
    assert.equal(h.calls.batch, 0);
  });
  test(method + " identity-store outage is private 503 and no analytics SQL", async () => {
    const h = harness({ auth: "throw" });
    const r = await h.invoke(method);
    assert.equal(r.status, 503);
    assert.equal(r.body.error, "analytics_unavailable");
    assert.match(r.cache, /no-store, private/);
    assert.equal(h.calls.prepare, 0);
  });
  test(method + " D1 prepare failure is private 503", async () => {
    const h = harness({ dbMode: "prepare-throw" });
    const r = await h.invoke(method);
    assert.equal(r.status, 503);
    assert.equal(r.body.error, "analytics_unavailable");
    assert.match(r.cache, /no-store, private/);
  });
  test(method + " D1 batch failure is private 503", async () => {
    const h = harness({ dbMode: "batch-throw" });
    const r = await h.invoke(method);
    assert.equal(r.status, 503);
    assert.equal(r.body.error, "analytics_unavailable");
    assert.match(r.cache, /no-store, private/);
  });
}

test("POST cross-origin mutation still denies before rate limit/identity/DB reads", async () => {
  const h = harness();
  const r = await h.invoke("POST", { origin: "https://attacker.invalid" });
  assert.equal(r.status, 403);
  assert.equal(r.body.error, "cross_origin_request");
  assert.equal(h.calls.rate, 0);
  assert.equal(h.calls.auth, 0);
  assert.equal(h.calls.prepare, 0);
});

test("POST fails closed when rate limiter becomes unavailable", async () => {
  const h = harness({ limit: "throw" });
  const r = await h.invoke("POST");
  assert.equal(r.status, 503);
  assert.equal(r.body.error, "analytics_unavailable");
  assert.equal(h.calls.auth, 0);
});

test("POST rate-limit rejection preserves HTTP 429 and makes no writes", async () => {
  const h = harness({ limit: "deny" });
  const r = await h.invoke("POST");
  assert.equal(r.status, 429);
  assert.equal(r.body.error, "too_many_requests");
  assert.equal(h.calls.prepare, 0);
});

for (const dbMode of ["write-false", "write-no-ack", "write-zero"]) {
  for (const action of ["heartbeat", "event"]) {
    test("POST " + action + " must not acknowledge " + dbMode, async () => {
      const h = harness({ dbMode });
      const r = await h.invoke("POST", { action });
      assert.equal(r.status, 503);
      assert.equal(r.body.error, "analytics_unavailable");
      assert.equal(h.calls.batch, 1);
    });
  }
}

for (const action of ["heartbeat", "event"]) {
  test("POST " + action + " confirms every write receipt before 202", async () => {
    const h = harness();
    const r = await h.invoke("POST", { action });
    assert.equal(r.status, 202);
    assert.equal(r.body.ok, true);
    assert.equal(h.calls.batch, 1);
    assert.equal(h.calls.prepare, action === "event" ? 2 : 1);
  });
}

test("GET cannot disclose analytics to anonymous or unverified user", async () => {
  const h = harness({ auth: "anonymous" });
  const r = await h.invoke("GET");
  assert.equal(r.status, 403);
  assert.equal(r.body.error, "forbidden");
  assert.equal(h.calls.prepare, 0);
});

test("GET verified owner still receives canonical grouped analytics", async () => {
  const h = harness();
  const r = await h.invoke("GET");
  assert.equal(r.status, 200);
  assert.equal(r.body.days, 30);
  assert.equal(r.body.accounts.total, 0);
  assert.deepEqual(JSON.parse(JSON.stringify(r.body.daily)), []);
  assert.equal(h.calls.batch, 1);
  assert.equal(h.calls.community, 1);
});

for (const dbMode of ["read-false", "read-missing"]) {
  test("GET refuses unconfirmed analytics results (" + dbMode + ")", async () => {
    const h = harness({ dbMode });
    const r = await h.invoke("GET");
    assert.equal(r.status, 503);
    assert.equal(r.body.error, "analytics_unavailable");
    assert.equal(h.calls.community, 0);
  });
}

test("GET refuses unavailable linked community aggregation", async () => {
  const h = harness({ community: "throw" });
  const r = await h.invoke("GET");
  assert.equal(r.status, 503);
  assert.equal(r.body.error, "analytics_unavailable");
});
