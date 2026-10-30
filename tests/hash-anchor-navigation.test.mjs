import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { routeSourceFromLocation, legacyRouteHashChanged } from "../public/route-location.js";

const base = "https://stage.example.test";

test("keyboard #main skip-link retains direct reader and group routes", () => {
  assert.equal(routeSourceFromLocation({ pathname: "/reader/GEN/1", hash: "#main" }), "reader/GEN/1");
  assert.equal(routeSourceFromLocation({ pathname: "/groups", hash: "#main" }), "groups");
  assert.equal(routeSourceFromLocation({ pathname: "/", hash: "#main" }), "");
});

test("ordinary page anchors never trigger SPA rerender", () => {
  assert.equal(legacyRouteHashChanged(`${base}/reader`, `${base}/reader#main`), false);
  assert.equal(legacyRouteHashChanged(`${base}/reader#main`, `${base}/reader#chapter-2`), false);
  assert.equal(legacyRouteHashChanged(`${base}/reader#chapter-2`, `${base}/reader`), false);
});

test("legacy #/ deep links still route and rerender on transitions", () => {
  assert.equal(routeSourceFromLocation({ pathname: "/", hash: "#/reader/GEN/1" }), "reader/GEN/1");
  assert.equal(routeSourceFromLocation({ pathname: "/", hash: "#/mission/abraham" }), "mission/abraham");
  assert.equal(legacyRouteHashChanged(`${base}/`, `${base}/#/reader/GEN/1`), true);
  assert.equal(legacyRouteHashChanged(`${base}/#/reader/GEN/1`, `${base}/#/groups`), true);
  assert.equal(legacyRouteHashChanged(`${base}/#/reader/GEN/1`, `${base}/#main`), true);
  assert.equal(routeSourceFromLocation({ pathname: "/", hash: "#main" }), "");
});

test("unprefixed hash does not impersonate a route", () => {
  assert.equal(routeSourceFromLocation({ pathname: "/reader", hash: "#reader/GEN/1" }), "reader");
  assert.equal(routeSourceFromLocation({ pathname: "/about", hash: "#privacy" }), "about");
});

test("canonical app uses this helper and its actual accessible skip-link", () => {
  const load = path => readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");
  const app = load("../public/app.js");
  const home = load("../app/page.tsx");
  assert.match(home, /className="skip-link" href="#main"/);
  assert.match(app, /import \{routeSourceFromLocation, legacyRouteHashChanged\} from '\.\/route-location\.js';/);
  assert.match(app, /const sourceRoute = routeSourceFromLocation\(location\);/);
  assert.match(app, /legacyRouteHashChanged\(event.oldURL, event.newURL\)/);
  assert.doesNotMatch(app, /window\.addEventListener\("hashchange", route\)/);
});
