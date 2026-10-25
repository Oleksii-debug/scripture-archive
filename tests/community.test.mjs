import assert from "node:assert/strict";
import test from "node:test";
import { COMMUNITY_TARGET, communityWavePlan, identityFor, intervalSeconds, warsawMoment } from "../lib/community.ts";

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

test("activation shifts every wave forward without backdated registrations", () => {
  const reference = new Date("2026-10-25T01:55:00Z");
  assert.equal(warsawMoment(reference, 8).toISOString(), "2026-10-25T07:00:00.000Z");
  const activated = new Date("2026-10-25T16:30:00Z");
  const waves = communityWavePlan(activated);
  assert.equal(waves[0].startsAt, "2026-10-25 16:30:00");
  assert.equal(waves[1].startsAt, "2026-10-25 21:35:00");
  assert.equal(waves[2].startsAt, "2026-10-26 04:35:00");
  assert.equal(waves.reduce((total, wave) => total + wave.count, 0), COMMUNITY_TARGET);
  assert.equal(waves[3].count, 2100);
  assert.ok(waves.every(wave => new Date(wave.startsAt.replace(" ","T")+"Z")>=activated));
});
