import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const base = process.env.SCRIPTURE_TEST_URL;
const integration = base ? test : test.skip;

integration("account, progress, attempts, groups, marathon limit and password recovery", async () => {
  const mission = JSON.parse(await readFile(new URL("../content/mission-abraham.json", import.meta.url), "utf8"));
  const chapter12 = mission.tasks.filter(task => task.book === "GEN" && task.chapter === 12);
  const email = `release-${Date.now()}@example.com`;
  const firstPassword = `Release-${crypto.randomUUID()}!`, secondPassword = `Changed-${crypto.randomUUID()}!`;
  let cookie = "";

  async function request(path, { method = "GET", body, useCookie = true, redirect = "follow", origin = base } = {}) {
    const response = await fetch(`${base}${path}`, {
      method,
      redirect,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(origin ? { Origin: origin } : {}),
        ...(useCookie && cookie ? { Cookie: cookie } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";", 1)[0];
    const data = await response.json().catch(() => ({}));
    return { response, data };
  }

  const registration = await request("/api/auth?action=register", { method: "POST", body: {
    firstName: "Test", lastName: "Reader", age: 30, gender: "prefer_not", tradition: "other",
    maritalStatus: "prefer_not", hasChildren: null, email, password: firstPassword, acceptPrivacy: true, locale: "en",
  }});
  assert.equal(registration.response.status, 201);
  assert.equal(registration.data.verificationRequired, true);
  assert.ok(registration.data.testToken);

  let result = await request("/api/auth?action=login", { method: "POST", body: { email, password: firstPassword } });
  assert.equal(result.response.status, 403);
  assert.equal(result.data.error, "email_not_verified");

  const confirmations = await Promise.all([0, 1].map(() => request(`/api/auth?action=verify&token=${encodeURIComponent(registration.data.testToken)}`, { redirect: "manual", origin: "" })));
  assert.deepEqual(confirmations.map(item => item.response.status).sort(), [303, 400]);
  result = await request("/api/auth?action=login", { method: "POST", body: { email, password: firstPassword } });
  assert.equal(result.response.status, 200);
  assert.match(cookie, /^sa_session=/);

  result = await request("/api/account?action=me");
  assert.equal(result.data.user.email, email);
  assert.equal(result.data.user.emailVerified, true);
  const analyticsSession = crypto.randomUUID();
  result = await request("/api/analytics", { method: "POST", body: { action: "event", sessionId: analyticsSession, eventType: "page_view", pageName: "account", source: "direct", value: { page_name: "account" } } });
  assert.equal(result.response.status, 202);
  result = await request("/api/analytics", { method: "POST", body: { action: "heartbeat", sessionId: analyticsSession, pageName: "account", source: "direct", activeSeconds: 30 } });
  assert.equal(result.response.status, 202);
  const spoofedOwner = await fetch(`${base}/api/analytics?days=30`, { headers: { "oai-authenticated-user-id": "owner-test", "oai-authenticated-user-email": "dordiaioleksii1@gmail.com" } });
  assert.equal(spoofedOwner.status, 403, "client identity headers must not grant owner access");
  const malformedCookie = await fetch(`${base}/api/account?action=me`, { headers: { Cookie: "sa_session=%E0%A4%A" } });
  assert.equal(malformedCookie.status, 200);
  assert.equal((await malformedCookie.json()).user, null);
  const ownerPassword = `Owner-${crypto.randomUUID()}!`;
  const ownerPayload = {firstName:"Owner",lastName:"Test",age:30,gender:"prefer_not",tradition:"other",maritalStatus:"prefer_not",email:"dordiaioleksii1@gmail.com",password:ownerPassword,acceptPrivacy:true,locale:"en"};
  const ownerRegister = await fetch(`${base}/api/auth?action=register`, {method:"POST",headers:{Origin:base,"Content-Type":"application/json"},body:JSON.stringify(ownerPayload)});
  const ownerRegistration = await ownerRegister.json();
  assert.equal(ownerRegister.status, 201);
  await fetch(`${base}/api/auth?action=verify&token=${encodeURIComponent(ownerRegistration.testToken)}`, {redirect:"manual"});
  const ownerLogin = await fetch(`${base}/api/auth?action=login`, {method:"POST",headers:{Origin:base,"Content-Type":"application/json"},body:JSON.stringify({email:ownerPayload.email,password:ownerPassword})});
  assert.equal(ownerLogin.status, 200);
  const ownerCookie = ownerLogin.headers.get("set-cookie").split(";",1)[0];
  const analyticsResponse = await fetch(`${base}/api/analytics?days=30`, { headers: { Cookie:ownerCookie } });
  assert.equal(analyticsResponse.status, 200);
  const analytics = await analyticsResponse.json();
  assert.equal(Number(analytics.summary.sessions), 1);
  assert.equal(Number(analytics.summary.page_views), 1);
  assert.equal(Number(analytics.summary.active_seconds), 30);
  assert.equal(analytics.pages[0].label, "account");
  result = await request("/api/account?action=progress", { method: "PUT", body: { progress: { complete: false, correct: [1] } } });
  assert.equal(result.response.status, 403, "scores are written only by server-side grading");
  result = await request("/api/account?action=progress");
  assert.deepEqual(result.data.progress.correct, []);
  result = await request("/api/account?action=visibility", { method: "PUT", body: { firstName: true, lastName: true, progress: true } });
  assert.equal(result.data.user.visibility.progress, true);
  const communityResponse = await fetch(`${base}/api/community?q=Test%20Reader&pageSize=12`);
  assert.equal(communityResponse.status, 200);
  const community = await communityResponse.json();
  const publicMember = community.members.find(member => member.displayName === "Test Reader");
  assert.ok(publicMember);
  assert.equal(publicMember.chaptersRead, 0);
  assert.equal("sourceKind" in publicMember, false);
  result = await request("/api/account?action=progress", { method: "PUT", body: { progress: {} }, origin: "https://attacker.invalid" });
  assert.equal(result.response.status, 403);

  result = await request("/api/attempts?action=read", { method: "POST", body: { book: "GEN", chapter: 12 } });
  assert.equal(result.response.status, 201, JSON.stringify(result.data));
  result = await request("/api/attempts?action=start", { method: "POST", body: { missionId: "OT-AB-01", book: "GEN", chapter: 12, locale: "en" } });
  assert.equal(result.response.status, 201, JSON.stringify(result.data));
  const attemptId = result.data.attemptId;
  for (const forbidden of ["book", "chapter", "verses", "reference", "correct", "success", "hint", "id"])
    assert.equal(forbidden in result.data.task, false, forbidden);
  result = await request("/api/attempts?action=manifest");
  assert.deepEqual(Object.keys(result.data).sort(), ["id", "locked", "taskCount"]);
  for (let index = 0; index < chapter12.length; index += 1) {
    if(index===0){
      const answers=await Promise.all([0,1].map(()=>request("/api/attempts?action=answer", {method:"POST",body:{attemptId,taskIndex:1,selected:chapter12[0].correct}})));
      assert.deepEqual(answers.map(answer=>answer.response.status).sort(),[200,409]);
      result=answers.find(answer=>answer.response.status===200);
    }else result = await request("/api/attempts?action=answer", { method: "POST", body: { attemptId, taskIndex: index + 1, selected: chapter12[index].correct } });
    assert.equal(result.response.status, 200);
    if (index < chapter12.length - 1) {
      assert.equal(result.data.completed, undefined);
      assert.equal("correct" in result.data, false);
      assert.equal("result" in result.data, false);
    }
  }
  assert.equal(result.data.completed, true);
  assert.equal(result.data.result.score, chapter12.length);
  assert.equal(result.data.book, "GEN");
  assert.equal(result.data.chapter, 12);
  result = await request("/api/account?action=progress");
  assert.equal(result.data.progress.correct.length, chapter12.length);
  const secondBrowserLogin = await fetch(`${base}/api/auth?action=login`, {method:"POST",headers:{Origin:base,"Content-Type":"application/json"},body:JSON.stringify({email,password:firstPassword})});
  const secondBrowserCookie = secondBrowserLogin.headers.get("set-cookie").split(";",1)[0];
  const restoredProgress = await fetch(`${base}/api/account?action=progress`, {headers:{Cookie:secondBrowserCookie}});
  assert.equal((await restoredProgress.json()).progress.correct.length, chapter12.length);

  await request("/api/attempts?action=read", { method: "POST", body: { book: "GEN", chapter: 12 } });
  result = await request("/api/attempts?action=start", { method: "POST", body: { missionId: "OT-AB-01", book: "GEN", chapter: 12, locale: "en" } });
  const invalidatedId = result.data.attemptId;
  result = await request("/api/attempts?action=chapter&book=GEN&chapter=12");
  assert.equal(result.data.active.id, invalidatedId);
  await request("/api/attempts?action=invalidate", { method: "POST", body: { attemptId: invalidatedId, reason: "chapter_opened" } });
  result = await request(`/api/attempts?action=current&attemptId=${encodeURIComponent(invalidatedId)}`);
  assert.equal(result.response.status, 409);
  assert.equal(result.data.error, "attempt_invalidated");

  const groupBody = { name: "Integration group", visibility: "private", rosterVisibility: "private", weeklyGoal: 3, catchupMode: "flexible", marathonEnabled: false, bibleEdition: "en-web" };
  result = await request("/api/groups?action=create", { method: "POST", body: groupBody });
  assert.equal(result.response.status, 201);
  const groupId = result.data.groupId;
  await request("/api/attempts?action=read", { method: "POST", body: { book: "GEN", chapter: 12, groupId } });
  result = await request("/api/attempts?action=start", { method: "POST", body: { missionId: "OT-AB-01", book: "GEN", chapter: 12, locale: "en", groupId } });
  const groupAttemptId = result.data.attemptId;
  // A personal reader must never resume the group's in-progress chapter attempt.
  result = await request("/api/attempts?action=chapter&book=GEN&chapter=12");
  assert.equal(result.response.status, 200);
  assert.equal(result.data.active, null, "personal chapter lookup must exclude group attempts");
  result = await request(`/api/attempts?action=chapter&book=GEN&chapter=12&groupId=${encodeURIComponent(groupId)}`);
  assert.equal(result.response.status, 200);
  assert.equal(result.data.active?.id, groupAttemptId, "matching group must resume its own attempt");
  for (let index = 0; index < chapter12.length; index += 1)
    result = await request("/api/attempts?action=answer", { method: "POST", body: { attemptId: groupAttemptId, taskIndex: index + 1, selected: chapter12[index].correct } });
  assert.equal(result.data.groupId, groupId);
  result = await request(`/api/groups?groupId=${encodeURIComponent(groupId)}`);
  assert.equal(result.data.sessions.length, 1);
  assert.equal(result.data.sessions[0].answers_correct, chapter12.length);

  const marathon = { ...groupBody, name: "Strict one", visibility: "public", weeklyGoal: 1, catchupMode: "steady", marathonEnabled: true };
  result = await request("/api/groups?action=create", { method: "POST", body: marathon });
  const strictOne = result.data.groupId;
  result = await request("/api/groups?action=create", { method: "POST", body: { ...marathon, name: "Strict two" } });
  assert.equal(result.data.cohortStatus, "ready");
  result = await request("/api/groups?action=start", { method: "POST", body: { groupId: strictOne } });
  assert.equal(result.response.status, 200);
  await request("/api/attempts?action=read", { method: "POST", body: { book: "GEN", chapter: 13, groupId: strictOne } });
  result = await request("/api/attempts?action=start", { method: "POST", body: { missionId: "OT-AB-01", book: "GEN", chapter: 13, locale: "en", groupId: strictOne } });
  assert.equal(result.response.status, 409);
  assert.ok(["passage_not_in_current_plan", "weekly_limit_reached"].includes(result.data.error));

  result = await request("/api/auth?action=forgot-password", { method: "POST", body: { email } });
  assert.ok(result.data.testToken);
  const resetToken = result.data.testToken;
  const resets = await Promise.all([0, 1].map(() => request("/api/auth?action=reset-password", { method: "POST", body: { token: resetToken, password: secondPassword } })));
  assert.deepEqual(resets.map(item => item.response.status).sort(), [200, 400]);
  const revokedSecondSession = await fetch(`${base}/api/account?action=me`, {headers:{Cookie:secondBrowserCookie}});
  assert.equal((await revokedSecondSession.json()).user, null);
  result = await request("/api/account?action=me");
  assert.equal(result.data.user, null);
  result = await request("/api/auth?action=login", { method: "POST", body: { email, password: firstPassword } });
  assert.equal(result.response.status, 401);
  result = await request("/api/auth?action=login", { method: "POST", body: { email, password: secondPassword } });
  assert.equal(result.response.status, 200);
  result = await request("/api/auth?action=logout", { method: "POST", body: {} });
  assert.equal(result.response.status, 200);
  result = await request("/api/account?action=me");
  assert.equal(result.data.user, null);
});
