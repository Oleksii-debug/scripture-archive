import assert from "node:assert/strict";
import { setTimeout } from "node:timers/promises";
import { identityFor, stableNumber } from "../lib/community.ts";

// Exercise actual registration, sessions, reading and server grading. This is
// intentionally confined to a local test worker, whose tokens cannot be issued
// by the production origin. It does not bypass production email verification.
const origin = new URL(process.env.COMMUNITY_ORIGIN || "http://127.0.0.1:8787").origin;
if (!process.argv.includes("--local-test") || !["localhost", "127.0.0.1", "[::1]"].includes(new URL(origin).hostname))
  throw Error("Learning-agent verification requires --local-test and a loopback worker.");
const sequence = Number(process.env.AGENT_SEQUENCE || 1);
if (!Number.isInteger(sequence) || sequence < 1) throw Error("Invalid agent sequence.");
const name = identityFor(sequence);
const email = `learning-agent-${crypto.randomUUID()}@example.test`;
const password = `Agent-${crypto.randomUUID()}!`;
let cookie = "";
const actions = [];
async function request(path, body, method = body ? "POST" : "GET") {
  const response = await fetch(origin + path, {
    method, redirect: "manual", headers: {
      Origin: origin, ...(cookie ? { Cookie: cookie } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    }, body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok && response.status !== 303) throw Error(`${path.split("?",1)[0]}: HTTP ${response.status} (${data.error || "request_failed"})`);
  if (response.headers.get("set-cookie")) cookie = response.headers.get("set-cookie").split(";",1)[0];
  return data;
}
const registered = await request("/api/auth?action=register", {
  firstName:name.firstName,lastName:name.lastName,age:30,gender:"prefer_not",tradition:"prefer_not",
  maritalStatus:"prefer_not",email,password,acceptPrivacy:true,locale:name.locale === "sk" ? "en" : name.locale,
});
if (!registered.testToken) throw Error("Local test verification token is unavailable; agent stopped before sign-in.");
await request(`/api/auth?action=verify&token=${encodeURIComponent(registered.testToken)}`);
actions.push("register", "verify_local_token");
await request("/api/auth?action=login", {email,password});actions.push("sign_in");
const identity=await request("/api/account?action=me");
await request("/api/account?action=visibility",{firstName:true,lastName:true,church:false,progress:true,community:true},"PUT");
const manifest=await request("/api/attempts?action=manifest");
const passage=manifest.chapters[0];
const chapter=await request(`/data/bible/en/${passage.book}.json`);
assert.ok(chapter, "A real chapter response is required before recording reading.");
await setTimeout(process.argv.includes("--smoke") ? 1000 : 30000);
await request("/api/account?action=reading",{reading:[{book:passage.book,chapter:passage.chapter,title:passage.book}]},"PUT");
await request("/api/attempts?action=read",{book:passage.book,chapter:passage.chapter});actions.push("read_chapter");
let attempt=await request("/api/attempts?action=start",{missionId:manifest.id,book:passage.book,chapter:passage.chapter,locale:"en"});
const attemptId=attempt.attemptId;actions.push("start_attempt");
while(attempt.task){
  assert.equal("correct" in attempt.task,false);
  const selected=[stableNumber(`${sequence}:${attempt.task.question}`)%attempt.task.options.length];
  attempt=await request("/api/attempts?action=answer",{attemptId,taskIndex:attempt.task.index,selected});
  actions.push("submit_answer");
}
assert.equal(attempt.completed,true);actions.push("complete_attempt");
const community=await request(`/api/community?q=${encodeURIComponent(name.firstName+" "+name.lastName)}`);
const member=community.members.find(person=>person.id===identity.user.id);
assert.equal(member?.missionsCompleted,1);
assert.equal(member?.chaptersRead,1);
const before=await request("/api/account?action=progress");
await request("/api/auth?action=logout",{});actions.push("sign_out");
await request("/api/auth?action=login",{email,password});
const after=await request("/api/account?action=progress");
assert.deepEqual(after.progress,before.progress);actions.push("sign_in_and_restore_progress");
await request("/api/auth?action=logout",{});
console.log(JSON.stringify({localOnly:true,displayName:`${name.firstName} ${name.lastName}`,actions,
  score:attempt.result.score,total:attempt.result.total,progressRestored:true,usesAnswerKeys:false}));
