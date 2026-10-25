import assert from "node:assert/strict";
import test from "node:test";
import { activityFor, identityFor, intervalSeconds, warsawMoment } from "../lib/community.ts";

test("community identities are deterministic, mostly Ukrainian, and preserve Slovak spelling", () => {
  const people = Array.from({ length: 2100 }, (_, index) => identityFor(index + 1));
  assert.deepEqual(identityFor(777), identityFor(777));
  const ukrainian = people.filter(person => person.locale === "uk").length;
  const slovak = people.filter(person => person.locale === "sk");
  const english = people.filter(person => person.locale === "en").length;
  assert.ok(ukrainian / people.length > 0.68);
  assert.ok(slovak.length > 250);
  assert.ok(english > 180);
  assert.ok(slovak.some(person => /[áčďéíĺľňóôŕšťúýž]/i.test(`${person.firstName}${person.lastName}`)));
  const fullNames = people.map(person => `${person.firstName} ${person.lastName}`);
  assert.ok(new Set(fullNames).size < fullNames.length, "natural duplicate names are expected");
});

test("registration intervals follow the requested waves and slow overnight", () => {
  assert.equal(intervalSeconds("[180]", 0, "2026-10-25 01:00:00"), 180);
  assert.deepEqual([0, 1, 2].map(index => intervalSeconds("[120,240,360]", index, "2026-10-25 10:00:00")), [120, 240, 360]);
  assert.ok(intervalSeconds("adaptive", 0, "2026-10-25 03:00:00") >= 480);
  assert.ok(intervalSeconds("adaptive", 0, "2026-10-25 12:00:00") <= 360);
});

test("Warsaw wave times and activity remain bounded", () => {
  const reference = new Date("2026-10-25T01:55:00Z");
  assert.equal(warsawMoment(reference, 8).toISOString(), "2026-10-25T07:00:00.000Z");
  const activity = activityFor(12345, "active", "2026-10-20 10:00:00", new Date("2026-10-25T19:00:00Z"));
  assert.ok(activity.chapters >= 0);
  assert.ok(activity.missions >= 0);
  assert.ok(["reading", "mission", "groups", "exploring", "away"].includes(activity.activity));
});
