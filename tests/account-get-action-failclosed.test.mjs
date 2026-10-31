import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Exercise the shipping account GET handler, not a duplicated action dispatcher.
const catalog = JSON.parse(readFileSync(new URL("../public/data/catalog.json", import.meta.url), "utf8"));
const source = readFileSync(new URL("../app/api/account/route.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal(compiled.diagnostics?.length ?? 0, 0);

function fixture({ anonymous = false, dbAvailable = true, profile = {} } = {}) {
  const calls = { auth: 0, reads: 0 };
  const db = {
    prepare(sql) {
      calls.reads++;
      assert.match(sql, /SELECT \* FROM profiles WHERE user_id=\?/);
      return {
        bind(userId) {
          assert.equal(userId, "reader-a");
          return { async first() { return { first_name: "Private", last_name: "Reader", locale: "uk", ...profile }; } };
        },
      };
    },
  };
  const exports = {};
  vm.runInNewContext(compiled.outputText, {
    exports, Request, Response, URL,
    require(name) {
      if (name === "cloudflare:workers") return { env: { DB: dbAvailable ? db : undefined } };
      if (name === "../../../public/data/catalog.json") return { default: catalog };
      if (name === "../../../content/mission-abraham.json")
        return { default: { tasks: [] } };
      if (name === "../../../lib/auth") return {
        authenticateRequest: async () => {
          calls.auth++;
          return anonymous ? null : {
            userId: "reader-a", email: "reader@example.invalid",
            provider: "password", emailVerified: true,
          };
        },
        isVerifiedOwner: () => false,
        sameOrigin: () => true,
      };
      throw Error("unexpected account route dependency " + name);
    },
  });
  async function get(action) {
    const suffix = action === undefined ? "" : "?action=" + encodeURIComponent(action);
    const response = await exports.GET(new Request("https://archive.invalid/api/account" + suffix));
    return {
      status: response.status,
      body: await response.json(),
      cache: response.headers.get("cache-control"),
    };
  }
  return { get, calls };
}

test("authenticated unknown account GET actions return private 400 without profile read", async () => {
  const f = fixture();
  for (const action of ["unrecognized", "progress-typo", "PROFILE", "", "users-extra"]) {
    const result = await f.get(action);
    assert.equal(result.status, 400, action);
    assert.deepEqual(result.body, { error: "unknown_action" });
    assert.equal(Object.hasOwn(result.body, "user"), false);
    assert.match(result.cache, /no-store, private/);
  }
  assert.equal(f.calls.auth, 5);
  assert.equal(f.calls.reads, 0);
});

test("canonical me and existing profile aliases still read only this principal", async () => {
  const f = fixture();
  for (const action of [undefined, "me", "profile"]) {
    const result = await f.get(action);
    assert.equal(result.status, 200);
    assert.equal(result.body.user.id, "reader-a");
    assert.equal(result.body.user.firstName, "Private");
    assert.match(result.cache, /no-store, private/);
  }
  assert.equal(f.calls.reads, 3);
});

test("anonymous callers retain existing me response and cannot inspect unknown action", async () => {
  const f = fixture({ anonymous: true });
  const me = await f.get("me");
  assert.equal(me.status, 200);
  assert.deepEqual(me.body, { user: null });
  const unknown = await f.get("unrecognized");
  assert.equal(unknown.status, 401);
  assert.equal(unknown.body.error, "authentication_required");
  assert.equal(f.calls.reads, 0);
});

test("non-owner users action remains forbidden rather than falling through", async () => {
  const f = fixture();
  const result = await f.get("users");
  assert.equal(result.status, 403);
  assert.equal(result.body.error, "forbidden");
  assert.equal(f.calls.reads, 0);
});

test("missing database still fails before reading identity or returning profile", async () => {
  const f = fixture({ dbAvailable: false });
  const result = await f.get("unexpected");
  assert.equal(result.status, 503);
  assert.equal(result.body.error, "database_unavailable");
  assert.deepEqual(f.calls, { auth: 0, reads: 0 });
});

test("private account GET exposes consent and church visibility only for exact numeric v1 flags", async () => {
  const scenarios = [
    [0, 0, 0, false, false],
    [0, 1, 0, false, false],
    [1, 0, 1, false, false],
    [1, 1, 0, true, false],
    [1, 1, 1, true, true],
    [2, 1, 1, false, false],
    [-1, 1, 1, false, false],
    ["1", 1, 1, false, false],
    [1, 2, 1, false, false],
    [1, "1", 1, false, false],
    [1, 1, 2, true, false],
    [1, 1, "1", true, false],
  ];
  for (const [consent, version, visibility, expectedConsent, expectedChurch] of scenarios) {
    const f = fixture({ profile: {
      sensitive_consent: consent,
      sensitive_consent_version: version,
      public_church: visibility,
      church: "Private affiliation",
    } });
    const result = await f.get("me");
    assert.equal(result.status, 200);
    assert.equal(result.body.user.sensitiveConsent, expectedConsent, JSON.stringify([consent,version,visibility]));
    assert.equal(result.body.user.visibility.church, expectedChurch, JSON.stringify([consent,version,visibility]));
    assert.match(result.cache, /no-store, private/);
    assert.deepEqual(f.calls, { auth: 1, reads: 1 });
  }
});

test("profile visibility and has-children flags accept only exact D1 numeric booleans", async () => {
  const cases = [
    [0, false], [1, true], [2, false], [-1, false],
    ["0", false], ["1", false], [null, false], [false, false],
  ];
  for (const [stored, expected] of cases) {
    const f = fixture({ profile: {
      public_first_name: stored, public_last_name: stored,
      public_progress: stored, public_community: stored, has_children: stored,
    } });
    const result = await f.get("me");
    assert.equal(result.status, 200, JSON.stringify(stored));
    assert.equal(result.body.user.visibility.firstName, expected, "firstName " + JSON.stringify(stored));
    assert.equal(result.body.user.visibility.lastName, expected, "lastName " + JSON.stringify(stored));
    assert.equal(result.body.user.visibility.progress, expected, "progress " + JSON.stringify(stored));
    assert.equal(result.body.user.visibility.community, expected, "community " + JSON.stringify(stored));
    assert.equal(result.body.user.hasChildren, stored === null ? null : expected, "hasChildren " + JSON.stringify(stored));
    assert.equal(Object.hasOwn(result.body.user.visibility, "church"), true);
    assert.match(result.cache, /no-store, private/);
    assert.deepEqual(f.calls, { auth: 1, reads: 1 });
  }
});

test("community visibility additionally requires an exact public name flag", async () => {
  const f=fixture({profile:{public_first_name:0,public_last_name:0,public_community:1}});
  const result=await f.get("me");
  assert.equal(result.status,200);
  assert.equal(result.body.user.visibility.community,false);
});
