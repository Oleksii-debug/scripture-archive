import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runCommunityAgent } from "../lib/run-community-agent.mjs";

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

  const withoutSensitiveConsent = await request("/api/auth?action=register", { method: "POST", body: {
    firstName: "Test", lastName: "Reader", age: 30, gender: "prefer_not", tradition: "other",
    maritalStatus: "prefer_not", email, password: firstPassword, acceptPrivacy: true, locale: "en",
  }});
  assert.equal(withoutSensitiveConsent.response.status, 400);
  assert.equal(withoutSensitiveConsent.data.error, "sensitive_consent_required");
  const invalidSensitiveConsent = await request("/api/auth?action=register", { method: "POST", body: {
    firstName: "Test", lastName: "Reader", age: 30, gender: "prefer_not", tradition: "prefer_not", denomination: "Church",
    maritalStatus: "prefer_not", email, password: firstPassword, acceptPrivacy: true, acceptSensitive: "true", locale: "en",
  }});
  assert.equal(invalidSensitiveConsent.response.status, 400);
  assert.equal(invalidSensitiveConsent.data.error, "sensitive_consent_required");
  const registration = await request("/api/auth?action=register", { method: "POST", body: {
    firstName: "Test", lastName: "Reader", age: 30, gender: "prefer_not", tradition: "other",
    maritalStatus: "prefer_not", hasChildren: null, email, password: firstPassword, acceptPrivacy: true, acceptSensitive: true, locale: "en",
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
  assert.match(result.response.headers.get("cache-control"), /no-store/);
  assert.match(result.response.headers.get("cache-control"), /private/);
  const anonymousProgress = await request("/api/account?action=progress", { useCookie: false });
  assert.equal(anonymousProgress.response.status, 401);
  assert.match(anonymousProgress.response.headers.get("cache-control"), /no-store/);
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
  const ownerPayload = {firstName:"Owner",lastName:"Test",age:30,gender:"prefer_not",tradition:"prefer_not",maritalStatus:"prefer_not",email:"dordiaioleksii1@gmail.com",password:ownerPassword,acceptPrivacy:true,locale:"en"};
  const ownerRegister = await fetch(`${base}/api/auth?action=register`, {method:"POST",headers:{Origin:base,"Content-Type":"application/json"},body:JSON.stringify(ownerPayload)});
  const ownerRegistration = await ownerRegister.json();
  assert.equal(ownerRegister.status, 201);
  await fetch(`${base}/api/auth?action=verify&token=${encodeURIComponent(ownerRegistration.testToken)}`, {redirect:"manual"});
  const ownerLogin = await fetch(`${base}/api/auth?action=login`, {method:"POST",headers:{Origin:base,"Content-Type":"application/json"},body:JSON.stringify({email:ownerPayload.email,password:ownerPassword})});
  assert.equal(ownerLogin.status, 200);
  const ownerCookie = ownerLogin.headers.get("set-cookie").split(";",1)[0];
  const ownAccount = await (await fetch(`${base}/api/account?action=me`, {headers:{Cookie:cookie}})).json();
  // The local Wrangler proxy may drop a following request when its Worker
  // rejects an early POST without consuming a nonempty JSON body. For role/origin
  // preflight checks the body is irrelevant: the real-route source test
  // editor-origin-preflight.test.mjs separately asserts the same rejection with
  // an actual JSON body, before any auth or D1 access.
  const roleAction = (action, principal = ownerCookie, origin = base, omitBody = false) => fetch(`${base}/api/editor-roles`, {
    method:'POST',
    headers:{Origin:origin,Cookie:principal,...(omitBody ? {} : {'Content-Type':'application/json'})},
    ...(omitBody ? {} : {body:JSON.stringify({action,userId:ownAccount.user.id})}),
  });
  assert.equal((await roleAction('grant',cookie,base,true)).status,403);
  // An Origin with another port is cross-origin under the browser's
  // scheme/host/port tuple, without changing the Wrangler dev proxy hostname.
  // Separate real-handler tests also reject a genuinely remote host.
  const forgedLocalOrigin = new URL(base);
  forgedLocalOrigin.port = forgedLocalOrigin.port === '54321' ? '54322' : '54321';
  assert.notEqual(forgedLocalOrigin.origin, new URL(base).origin);
  const forgedGrant = await roleAction('grant',ownerCookie,forgedLocalOrigin.origin,true);
  assert.equal(forgedGrant.status,403,
    `Cross-origin mutation must be rejected; local Worker response: ${(await forgedGrant.clone().text()).slice(0,300)}`);
  const emailGrant = await fetch(`${base}/api/editor-roles`,{method:'POST',headers:{Origin:base,Cookie:ownerCookie,'Content-Type':'application/json'},body:JSON.stringify({action:'grant',email:ownAccount.user.email.toUpperCase()})});
  assert.equal(emailGrant.status,200,(await emailGrant.clone().text()).slice(0,300));
  assert.equal((await roleAction('grant')).status,409);
  assert.equal((await fetch(`${base}/api/editor-roles?view=audit`,{headers:{Cookie:cookie}})).status,403);
  assert.equal((await (await fetch(`${base}/api/editor-roles?view=me`,{headers:{Cookie:cookie}})).json()).editor,true);
  assert.equal((await fetch(`${base}/api/material-review?view=queue`,{headers:{Cookie:cookie}})).status,200);
  assert.equal((await roleAction('revoke')).status,200);
  assert.equal((await roleAction('revoke')).status,404);
  const roleAudit=await (await fetch(`${base}/api/editor-roles?view=audit`,{headers:{Cookie:ownerCookie}})).json();
  assert.deepEqual(roleAudit.events.map(event=>event.action),['revoke','grant']);
  assert.ok(roleAudit.events.every(event=>event.subject_user_id===ownAccount.user.id && event.actor_user_id));
  assert.equal((await (await fetch(`${base}/api/editor-roles?view=me`,{headers:{Cookie:cookie}})).json()).editor,false);
  assert.equal((await fetch(`${base}/api/material-review?view=queue`,{headers:{Cookie:cookie}})).status,403);
  // Exercise the representative-claim boundary through the real Worker and
  // disposable D1. This local fixture is never published as a real church.
  const churchPost = async (body, principal = cookie) => {
    const response = await fetch(`${base}/api/churches`, { method:'POST', headers:{Origin:base,Cookie:principal,'Content-Type':'application/json'}, body:JSON.stringify(body) });
    return {response,data:await response.json()};
  };
  const churchClaim = {action:'submit',name:'Integration Fixture Community',city:'Test City',countryCode:'UA',locale:'en',tradition:'other',websiteUrl:'',representationAttested:true,websiteConsent:true};
  assert.equal((await churchPost(churchClaim)).response.status,201);
  assert.equal((await (await fetch(`${base}/api/churches`)).json()).items.length,0);
  const churchQueueResponse=await fetch(`${base}/api/churches?view=queue`,{headers:{Cookie:ownerCookie}});
  assert.equal(churchQueueResponse.status,200);
  const churchQueue=await churchQueueResponse.json();
  assert.equal(churchQueue.items.length,1);assert.equal(churchQueue.items[0].claimantEmail,email);
  const churchId=churchQueue.items[0].id;
  assert.equal((await fetch(`${base}/api/churches?view=detail&id=${churchId}`)).status,404);
  assert.equal(churchQueue.nextCursor,null);
  const reviewCursor=new URLSearchParams({view:'queue',afterSubmittedAt:churchQueue.items[0].submittedAt,afterId:churchId});
  const afterReviewPage=await fetch(`${base}/api/churches?${reviewCursor}`,{headers:{Cookie:ownerCookie}});
  assert.equal(afterReviewPage.status,200);assert.deepEqual(await afterReviewPage.json(),{items:[],nextCursor:null});
  assert.equal((await fetch(`${base}/api/churches?view=queue&afterId=partial`,{headers:{Cookie:ownerCookie}})).status,400);
  assert.equal((await fetch(`${base}/api/churches?${reviewCursor}`,{headers:{Cookie:cookie}})).status,403);

  assert.equal((await churchPost({action:'review',id:churchId,decision:'approve',verificationEvidence:'Disposable integration authority fixture',note:''},ownerCookie)).response.status,200);
  const publicChurches=await (await fetch(`${base}/api/churches`)).json();
  assert.equal(publicChurches.items.length,1);assert.equal(publicChurches.items[0].name,churchClaim.name);
  assert.equal(publicChurches.nextCursor,null);
  const churchDetail=await fetch(`${base}/api/churches?view=detail&id=${churchId}`);
  assert.equal(churchDetail.status,200);assert.match(churchDetail.headers.get('cache-control'),/no-store/);
  assert.deepEqual((await churchDetail.json()).item,publicChurches.items[0]);
  assert.equal((await fetch(`${base}/api/churches?view=detail&id=${churchId}&id=other`)).status,400);
  const filteredChurches=await (await fetch(`${base}/api/churches?locale=en&tradition=other&q=Integration`)).json();
  assert.equal(filteredChurches.items.length,1);
  assert.equal((await (await fetch(`${base}/api/churches?locale=uk`)).json()).items.length,0);
  assert.equal((await fetch(`${base}/api/churches?afterId=partial`)).status,400);
  assert.equal((await fetch(`${base}/api/churches?locale=en&locale=uk`)).status,400);

  assert.equal('claimantEmail' in publicChurches.items[0],false);assert.equal('verificationEvidence' in publicChurches.items[0],false);
  // The verified representative can publish an event without giving this
  // catalogue any attendee, payment, or registration records.
  const eventPost = async body => {
    const response=await fetch(`${base}/api/events`,{method:'POST',headers:{Origin:base,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify(body)});
    return {response,data:await response.json()};
  };
  const eventFixture={action:'submit',registrationEnabled:true,churchId, title:'Disposable Integration Conference',summary:'A local route and migration fixture.',city:'Test City',countryCode:'UA',locale:'en',startsOn:'2099-05-10',endsOn:'2099-05-11',accessibilityDetails:'Step-free venue and captions.',programmeUrl:'',registrationUrl:'',programme:[{date:'2099-05-10',startsAt:'09:00',endsAt:'10:00',title:'Opening study',details:'Accessible text notes.'}],timeZone:'Europe/Kyiv',organizerAuthorityAttested:true,publicationConsent:true};
  const createdEvent=await eventPost(eventFixture);assert.equal(createdEvent.response.status,201);
  let publicEvents=await (await fetch(`${base}/api/events`)).json();assert.equal(publicEvents.items.length,1);
  assert.deepEqual(publicEvents.items[0].programme,eventFixture.programme);assert.equal(publicEvents.items[0].timeZone,'Europe/Kyiv');
  assert.equal(publicEvents.items[0].registrationEnabled,true);
  assert.deepEqual((await (await fetch(`${base}/api/events?churchId=${churchId}`)).json()).items,publicEvents.items);
  assert.deepEqual((await (await fetch(`${base}/api/events?churchId=absent`)).json()).items,[]);
  assert.equal((await fetch(`${base}/api/events?churchId=${churchId}&churchId=other`)).status,400);
  // Real Worker/D1 keyset continuation: no organization-wide or owner bypass.
  for(let index=0;index<51;index++){
    const extra=await eventPost({...eventFixture,title:`Pagination fixture ${index}`,startsOn:'2099-06-01',endsOn:'2099-06-01',programme:[],timeZone:''});
    assert.equal(extra.response.status,201);
  }
  const ownPage=await (await fetch(`${base}/api/events?view=mine`,{headers:{Cookie:cookie}})).json();
  assert.equal(ownPage.items.length,50);assert.ok(ownPage.nextCursor);
  const ownContinuation=new URLSearchParams({view:'mine',afterDate:ownPage.nextCursor.startsOn,afterId:ownPage.nextCursor.id});
  const ownLast=await (await fetch(`${base}/api/events?${ownContinuation}`,{headers:{Cookie:cookie}})).json();
  assert.equal(ownLast.items.length,2);assert.equal(ownLast.nextCursor,null);
  assert.equal(new Set([...ownPage.items,...ownLast.items].map(item=>item.id)).size,52);
  assert.equal((await fetch(`${base}/api/events?${ownContinuation}`)).status,401);
  assert.deepEqual((await (await fetch(`${base}/api/events?${ownContinuation}`,{headers:{Cookie:ownerCookie}})).json()).items,[]);
  assert.equal((await fetch(`${base}/api/events?view=mine&afterId=partial`,{headers:{Cookie:cookie}})).status,400);
  // Withdraw disposable extras so the remainder of this acceptance flow keeps its single active event.
  for(const item of [...ownPage.items,...ownLast.items])if(item.id!==createdEvent.data.id)
    assert.equal((await eventPost({action:'withdraw',id:item.id})).response.status,200);
  const attendance=async(body,principal=ownerCookie)=>{
    const response=await fetch(`${base}/api/event-registrations`,{method:'POST',headers:{Origin:base,Cookie:principal,'Content-Type':'application/json'},body:JSON.stringify(body)});
    return {status:response.status,data:await response.json()};
  };
  const signup={action:'register',eventId:createdEvent.data.id,attendeeName:'Disposable Reader Alias',sharingConsent:true};
  assert.equal((await attendance({...signup,sharingConsent:false})).status,400);
  assert.equal((await attendance(signup)).status,201);
  assert.equal((await attendance(signup)).status,201);
  const readAttendance=async(principal,query='view=mine')=>fetch(`${base}/api/event-registrations?${query}`,{headers:{Cookie:principal}});
  const myRegistration=await (await readAttendance(ownerCookie)).json();assert.equal(myRegistration.items.length,1);
  assert.equal(myRegistration.items[0].attendeeName,signup.attendeeName);
  assert.equal((await readAttendance(ownerCookie,`view=roster&eventId=${createdEvent.data.id}`)).status,404);
  let roster=await (await readAttendance(cookie,`view=roster&eventId=${createdEvent.data.id}`)).json();
  assert.equal(roster.items.length,1);assert.equal('email' in roster.items[0],false);assert.equal('userId' in roster.items[0],false);
  assert.equal((await attendance({action:'cancel',eventId:createdEvent.data.id})).status,200);
  assert.equal((await (await readAttendance(ownerCookie)).json()).items.length,0);
  assert.equal((await attendance(signup)).status,201);

  assert.equal((await eventPost({...eventFixture,id:createdEvent.data.id,programme:[{...eventFixture.programme[0],endsAt:'08:00'}]})).response.status,400);
  assert.equal(publicEvents.items[0].title,eventFixture.title);assert.equal('organizer_user_id' in publicEvents.items[0],false);
  assert.equal((await churchPost({...churchClaim,city:'Corrected Test City'})).response.status,201);
  assert.equal((await (await fetch(`${base}/api/churches`)).json()).items.length,0,'a correction must be reviewed again');
  assert.equal((await (await fetch(`${base}/api/events`)).json()).items.length,0,'church correction must immediately hide its events');
  assert.equal((await readAttendance(cookie,`view=roster&eventId=${createdEvent.data.id}`)).status,404);
  assert.equal((await (await readAttendance(ownerCookie)).json()).items[0].available,false);

  const correctedChurch=(await (await fetch(`${base}/api/churches?view=mine`,{headers:{Cookie:cookie}})).json()).items[0];
  assert.notEqual(correctedChurch.id,churchId);
  assert.equal((await fetch(`${base}/api/churches?view=detail&id=${churchId}`)).status,404);
  assert.equal((await fetch(`${base}/api/churches?view=detail&id=${correctedChurch.id}`)).status,404);
  assert.deepEqual((await (await fetch(`${base}/api/events?churchId=${churchId}`)).json()).items,[]);
  assert.equal((await churchPost({action:'review',id:correctedChurch.id,decision:'approve',verificationEvidence:'Disposable corrected authority fixture',note:''},ownerCookie)).response.status,200);
  const ownedEventsAfterReview=await (await fetch(`${base}/api/events?view=mine`,{headers:{Cookie:cookie}})).json();
  publicEvents=await (await fetch(`${base}/api/events`)).json();
  assert.equal(publicEvents.items.length,0,'a representative-claim revision does not silently republish an older event');
  assert.deepEqual(ownedEventsAfterReview.items.filter(item=>item.id===createdEvent.data.id).map(({id,status})=>({id,status})),[{id:createdEvent.data.id,status:'hidden'}]);
  const republishedEvent=await eventPost({...eventFixture,id:createdEvent.data.id,churchId:correctedChurch.id,title:'Republished Integration Conference'});
  assert.equal(republishedEvent.response.status,201);
  assert.equal(republishedEvent.data.id,createdEvent.data.id);
  assert.deepEqual((await (await fetch(`${base}/api/events`)).json()).items.map(({id,churchId})=>({id,churchId})),[{id:createdEvent.data.id,churchId:correctedChurch.id}]);
  const correctedEvent=await eventPost({...eventFixture,id:republishedEvent.data.id,churchId:correctedChurch.id,title:'Corrected Integration Conference'});
  assert.equal(correctedEvent.response.status,201);assert.equal((await (await fetch(`${base}/api/events`)).json()).items[0].title,'Corrected Integration Conference');
  assert.equal((await churchPost({action:'delete',id:correctedChurch.id,confirmDeletion:false})).response.status,400);
  assert.equal((await churchPost({action:'delete',id:correctedChurch.id,confirmDeletion:true},ownerCookie)).response.status,409);
  assert.equal((await churchPost({action:'delete',id:churchId,confirmDeletion:true})).response.status,409);
  assert.equal((await churchPost({action:'delete',id:correctedChurch.id,confirmDeletion:true})).response.status,200);
  assert.deepEqual((await (await fetch(`${base}/api/churches?view=mine`,{headers:{Cookie:cookie}})).json()).items,[]);
  assert.equal((await fetch(`${base}/api/churches?view=detail&id=${correctedChurch.id}`)).status,404);
  assert.deepEqual((await (await fetch(`${base}/api/events?churchId=${correctedChurch.id}`)).json()).items,[]);
  assert.equal((await readAttendance(cookie,`view=roster&eventId=${createdEvent.data.id}`)).status,404);
  assert.equal((await (await readAttendance(ownerCookie)).json()).items[0].available,false);
  assert.equal((await (await fetch(`${base}/api/events?view=mine`,{headers:{Cookie:cookie}})).json()).items.find(item=>item.id===createdEvent.data.id).status,'hidden');
  assert.equal((await (await fetch(`${base}/api/account`,{headers:{Cookie:cookie}})).json()).user.id,ownAccount.user.id);
  assert.equal((await eventPost({action:'withdraw',id:republishedEvent.data.id})).response.status,200);
  assert.equal((await (await fetch(`${base}/api/events`)).json()).items.length,0);
  assert.equal((await (await readAttendance(ownerCookie)).json()).items.length,0,'withdrawing an event erases its attendee list');
  assert.equal((await churchPost({action:'delete',id:correctedChurch.id,confirmDeletion:true})).response.status,409);
  const mark = { edition: "en-web", book: "GEN", chapter: 12 };
  // The disposable Wrangler proxy can abort a following request when an
  // early Origin-rejected PUT carries an unread request body. This probe tests
  // only the cross-origin gate, so omit its body in THIS local HTTP sequence.
  // The production-route test bookmark-auth-availability.test.mjs separately
  // sends a genuine nonempty JSON body and still demands 403 before auth/D1.
  const bookmarkWrite = (body, method = "PUT", origin = base, omitBody = false) => fetch(`${base}/api/bookmarks`, {
    method,
    headers: { Origin: origin, Cookie: cookie, ...(omitBody ? {} : {"Content-Type": "application/json"}) },
    ...(omitBody ? {} : { body: JSON.stringify(body) }),
  });
  assert.equal((await fetch(`${base}/api/bookmarks`)).status, 401);
  assert.equal((await bookmarkWrite(mark, "PUT", "https://attacker.invalid", true)).status, 403);
  const invalidBookmark = await bookmarkWrite({ ...mark, chapter: -1 });
  assert.equal(invalidBookmark.status, 400, (await invalidBookmark.text()).slice(0, 500));
  assert.equal((await bookmarkWrite(mark)).status, 200);
  assert.equal((await bookmarkWrite(mark)).status, 200, "saving a bookmark twice is idempotent");
  const ownBookmarks = await (await fetch(`${base}/api/bookmarks`, { headers: { Cookie: cookie } })).json();
  assert.equal(ownBookmarks.bookmarks.length, 1);
  assert.equal(ownBookmarks.bookmarks[0].book, "GEN");
  assert.equal((await fetch(`${base}/api/reading-export`)).status, 401);
  const exportResponse = await fetch(`${base}/api/reading-export`, { headers: { Cookie: cookie } });
  assert.equal(exportResponse.status, 200);
  assert.match(exportResponse.headers.get("cache-control"), /no-store/);
  assert.match(exportResponse.headers.get("content-disposition"), /attachment/);
  const ownExport = await exportResponse.json();
  assert.equal(ownExport.account.email, email);
  assert.equal(ownExport.profile.first_name, "Test");
  assert.equal(ownExport.profile.tradition, "other");
  assert.equal(ownExport.profile.sensitive_consent, 1);
  assert.equal(ownExport.profile.sensitive_consent_version, 1);
  assert.equal(ownExport.bookmarks.length, 1);
  assert.equal(JSON.stringify(ownExport).includes(firstPassword), false);
  assert.doesNotMatch(JSON.stringify(ownExport), /password_hash|password_salt|token_hash/);
  const ownerExport = await (await fetch(`${base}/api/reading-export`, { headers: { Cookie: ownerCookie } })).json();
  assert.equal(ownerExport.bookmarks.length, 0, "another account's bookmarks must never appear in this export");
  assert.equal(ownerExport.profile.tradition, null);
  assert.equal(ownerExport.profile.sensitive_consent, 0);
  assert.equal(ownerExport.profile.sensitive_consent_version, 0);
  assert.notEqual(ownerExport.account.email, ownExport.account.email);
  const ownerConsent = await fetch(`${base}/api/account?action=sensitive-consent`, { method: "PUT", headers: { Cookie: ownerCookie, Origin: base, "Content-Type": "application/json" }, body: JSON.stringify({ acceptSensitive: true, tradition: "other", denomination: "Owner private" }) });
  assert.equal(ownerConsent.status, 200);
  let consentChange = await request("/api/account?action=sensitive-consent", { method: "PUT", body: { acceptSensitive: "true" } });
  assert.equal(consentChange.response.status, 400);
  // The disposable Wrangler proxy can drop the *next* write if an early
  // cross-origin rejection leaves a nonempty request body unread. This HTTP
  // sequence checks the 403 gate with no body; the real route's nonempty-body
  // 403 preflight is separately asserted in account-write-failclosed.test.mjs.
  // Do not retry or weaken the subsequent sensitive-consent mutation.
  consentChange = await request("/api/account?action=sensitive-consent", { method: "PUT", origin: "https://attacker.invalid" });
  assert.equal(consentChange.response.status, 403);
  consentChange = await request("/api/account?action=sensitive-consent", { method: "PUT", body: { acceptSensitive: true, tradition: "other", denomination: "Example denomination", church: "Example church" } });
  // A bare 503 hides whether the local Worker/D1 failed authentication,
  // mutation acknowledgement, or the post-write readback. Log only the
  // canonical public error CODE (never account/consent fields or a raw body).
  const consentErrorCode = consentChange.data &&
    typeof consentChange.data.error === 'string' &&
    /^[a-z_]{1,64}$/.test(consentChange.data.error)
    ? consentChange.data.error : 'missing_or_noncanonical';
  assert.equal(consentChange.response.status, 200,
    `Sensitive-consent E2E: expected HTTP 200; error_code=${consentErrorCode}`);
  assert.equal(consentChange.data.user.sensitiveConsent, true);
  await request("/api/account?action=visibility", { method: "PUT", body: { firstName: false, lastName: false, church: true, progress: false, community: false } });
  consentChange = await request("/api/account?action=sensitive-consent", { method: "PUT", body: { acceptSensitive: false } });
  assert.equal(consentChange.response.status, 200);
  assert.equal(consentChange.data.user.sensitiveConsent, false);
  let privacyExport = await (await fetch(`${base}/api/reading-export`, { headers: { Cookie: cookie } })).json();
  assert.equal(privacyExport.profile.tradition, null);
  assert.equal(privacyExport.profile.denomination, null);
  assert.equal(privacyExport.profile.church, null);
  assert.equal(privacyExport.profile.public_church, 0);
  assert.equal(privacyExport.profile.sensitive_consent_version, 0);
  const visibilityWithoutConsent = await request("/api/account?action=visibility", { method: "PUT", body: { firstName: false, lastName: false, church: true, progress: false, community: false } });
  assert.equal(visibilityWithoutConsent.data.user.visibility.church, false, "publication cannot be enabled before sensitive consent");
  const ownerAfterOtherWithdrawal = await (await fetch(`${base}/api/reading-export`, { headers: { Cookie: ownerCookie } })).json();
  assert.equal(ownerAfterOtherWithdrawal.profile.denomination, "Owner private", "withdrawal must not modify another user's profile");
  await request("/api/account?action=sensitive-consent", { method: "PUT", body: { acceptSensitive: true, tradition: "other", denomination: "Example denomination", church: "Example church" } });
  privacyExport = await (await fetch(`${base}/api/reading-export`, { headers: { Cookie: cookie } })).json();
  assert.equal(privacyExport.profile.public_church, 0, "later consent must not automatically publish a church");
  assert.equal(privacyExport.profile.sensitive_consent_version, 1);
  await request("/api/account?action=profile", { method: "PUT", body: { firstName: "Test", lastName: "Reader", ageRange: "25-34", acceptPrivacy: true, acceptSensitive: false, locale: "en" } });
  privacyExport = await (await fetch(`${base}/api/reading-export`, { headers: { Cookie: cookie } })).json();
  assert.equal(privacyExport.profile.denomination, null, "legacy profile update must also clear denomination on withdrawal");
  await request("/api/account?action=sensitive-consent", { method: "PUT", body: { acceptSensitive: true, tradition: "other" } });
  const otherBookmarks = await (await fetch(`${base}/api/bookmarks`, { headers: { Cookie: ownerCookie } })).json();
  assert.equal(otherBookmarks.bookmarks.length, 0, "bookmarks are private to the account");
  assert.equal((await bookmarkWrite(mark, "DELETE")).status, 200);
  assert.equal((await (await fetch(`${base}/api/bookmarks`, { headers: { Cookie: cookie } })).json()).bookmarks.length, 0);
  const beforeHelp = await (await fetch(`${base}/api/help`, { headers: { Cookie: ownerCookie } })).json();
  async function submitHelp(bytes, filename, type) {
    const form = new FormData();
    for (const [key, value] of Object.entries({ email, subject: "Support fixture", message: "Local integration fixture only", locale: "en", acceptPrivacy: "yes" })) form.set(key, value);
    form.append("files", new File([bytes], filename, { type }));
    return fetch(`${base}/api/help`, { method: "POST", headers: { Origin: base, Cookie: cookie }, body: form });
  }
  const rejectedHelp = await submitHelp("not a PNG", "fake.png", "image/png");
  assert.equal(rejectedHelp.status, 400);
  assert.equal((await (await fetch(`${base}/api/help`, { headers: { Cookie: ownerCookie } })).json()).items.length, beforeHelp.items.length);
  const image = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGMQUDD4DwACBAFgjby7cQAAAABJRU5ErkJggg==", "base64"));
  const acceptedHelp = await submitHelp(image, "fixture.png", "image/png");
  assert.equal(acceptedHelp.status, 201);
  const afterHelp = await (await fetch(`${base}/api/help`, { headers: { Cookie: ownerCookie } })).json();
  assert.equal(afterHelp.items.length, beforeHelp.items.length + 1);
  assert.equal(afterHelp.items[0].attachment_count, 1);
  // Exercise the real Worker and local D1 with stale snapshots from concurrent tabs.
  const reading = chapter => ({ book: "GEN", chapter, title: `Genesis ${chapter}` });
  const writes = await Promise.all([12, 13].map(chapter => request("/api/account?action=reading", {
    method: "PUT", body: { reading: [reading(chapter)] },
  })));
  assert.deepEqual(writes.map(item => item.response.status), [200, 200]);
  result = await request("/api/account?action=reading", { method: "PUT", body: { reading: [reading(12)] } });
  assert.equal(result.response.status, 200);
  result = await request("/api/account?action=reading");
  assert.deepEqual(result.data.reading.map(row => row.chapter).sort((a, b) => a - b), [12, 13]);

  const material = { id: `integration-${crypto.randomUUID()}`, title: "Test material", prompt: "Choose an answer", reference: "GEN 12", explanation: "Test explanation", answer: "one", options: ["one", "two"] };
  result = await request("/api/materials", { method: "POST", body: { ...material, options: ["one", "one"] } });
  assert.equal(result.response.status, 400, "duplicate answer options are ambiguous");
  result = await request("/api/materials", { method: "POST", body: material });
  assert.equal(result.response.status, 201);
  const forbiddenMaterial = await fetch(`${base}/api/materials`, { method: "POST", headers: { Origin: base, Cookie: ownerCookie, "Content-Type": "application/json" }, body: JSON.stringify({ ...material, title: "Overwrite attempt" }) });
  assert.equal(forbiddenMaterial.status, 403);
  result = await request("/api/materials?mine=1");
  assert.equal(result.data.materials.find(item => item.id === material.id).title, material.title);
  // Draft -> review -> published immutable snapshot -> replacement -> withdrawal.
  const submitReview = { action: "submit", materialId: material.id, provenance: "Original exercise; source GEN 12", rightsHolder: "API flow author", rightsBasis: "original", licenseUrl: "", rightsConfirmed: true };
  const reviewPost = async (body, principal = cookie, origin = base, omitBody = false) => {
    const response = await fetch(`${base}/api/material-review`, { method: "POST",
      headers: { Origin: origin, Cookie: principal, ...(omitBody ? {} : { "Content-Type": "application/json" }) },
      ...(omitBody ? {} : { body: JSON.stringify(body) }) });
    if (response.status >= 500) console.error("Local review HTTP failure", response.status, response.headers.get("content-type"), (await response.clone().text()).slice(0, 300));
    return { response, data: await response.json() };
  };
  const ownerMaterial = { ...material, id: `owner-${crypto.randomUUID()}` };
  const ownerDraft = await fetch(`${base}/api/materials`, { method: 'POST', headers: { Origin: base, Cookie: ownerCookie, 'Content-Type': 'application/json' }, body: JSON.stringify(ownerMaterial) });
  assert.equal(ownerDraft.status, 201);
  const ownerSubmission = await reviewPost({ ...submitReview, materialId: ownerMaterial.id }, ownerCookie);
  assert.equal(ownerSubmission.response.status, 201);
  for (const decision of ['approve', 'reject']) {
    const ownDecision = await reviewPost({ action: 'review', id: ownerSubmission.data.id, decision, sourceChecked: true, rightsChecked: true, note: 'Review note' }, ownerCookie);
    assert.equal(ownDecision.response.status, 403);
    assert.equal(ownDecision.data.error, 'self_review_forbidden');
  }
  const ownerQueue = await (await fetch(`${base}/api/material-review?view=queue`, { headers: { Cookie: ownerCookie } })).json();
  assert.ok(ownerQueue.items.some(item => item.id === ownerSubmission.data.id), 'self-review keeps the submission pending');
  const ownerDelete = await fetch(`${base}/api/materials?id=${encodeURIComponent(ownerMaterial.id)}`, { method: 'DELETE', headers: { Origin: base, Cookie: ownerCookie } });
  assert.equal(ownerDelete.status, 200);
  // The local Wrangler proxy must not see an unread body on a request
  // rejected by Origin before parsing. Exact shipping route/body semantics
  // are checked in material-review-origin-preflight.test.mjs.
  assert.equal((await reviewPost(submitReview, cookie, "https://attacker.invalid", true)).response.status, 403);
  assert.equal((await reviewPost({ ...submitReview, rightsConfirmed: false })).response.status, 400);
  assert.equal((await reviewPost(submitReview, ownerCookie)).response.status, 409, "another user cannot submit the author's draft");
  const submissions = await Promise.all([reviewPost(submitReview), reviewPost(submitReview)]);
  assert.deepEqual(submissions.map(item => item.response.status).sort(), [201, 409]);
  const submission = submissions.find(item => item.response.status === 201).data.id;
  assert.equal((await fetch(`${base}/api/material-review?view=queue`, { headers: { Cookie: cookie } })).status, 403);
  assert.equal((await reviewPost({ action: "review", id: submission, decision: "approve", sourceChecked: true, rightsChecked: true })).response.status, 403);
  assert.equal((await reviewPost({ action: "review", id: submission, decision: "approve" }, ownerCookie)).response.status, 400);
  assert.equal((await reviewPost({ action: "answer", id: submission, choice: 0 })).response.status, 404, "pending answers stay private");
  let library = await reviewPost({ action: "librarySearch", query: "Test material", cursor: null }, '');
  assert.equal(library.response.status, 200);
  assert.equal(library.data.items.some(item => item.id === submission), false, "pending drafts are not searchable");
  const queue = await (await fetch(`${base}/api/material-review?view=queue`, { headers: { Cookie: ownerCookie } })).json();
  assert.equal(queue.items.find(item => item.id === submission).snapshot.data.answer, "one");
  assert.equal((await reviewPost({ action: "review", id: submission, decision: "approve", sourceChecked: true, rightsChecked: true }, ownerCookie)).response.status, 200);
  // Event attachments reuse this approved snapshot and the current community authority.
  assert.equal((await churchPost(churchClaim)).response.status,201);
  const materialChurch=(await (await fetch(`${base}/api/churches?view=mine`,{headers:{Cookie:cookie}})).json()).items[0];
  assert.equal((await churchPost({action:'review',id:materialChurch.id,decision:'approve',verificationEvidence:'Disposable material event authority',note:''},ownerCookie)).response.status,200);
  const materialEvent=await eventPost({...eventFixture,churchId:materialChurch.id});
  assert.equal(materialEvent.response.status,201);
  const attachMaterial={action:'attachEventMaterial',eventId:materialEvent.data.id,submissionId:submission,publicationConsent:true};
  assert.equal((await reviewPost({...attachMaterial,publicationConsent:false})).response.status,400);
  assert.equal((await reviewPost(attachMaterial,ownerCookie)).response.status,409);
  assert.equal((await reviewPost(attachMaterial)).response.status,200);
  assert.equal((await reviewPost(attachMaterial)).response.status,200);
  const eventMaterialQuery={action:'eventMaterials',eventId:materialEvent.data.id};
  const eventMaterials=await reviewPost(eventMaterialQuery,'');
  assert.equal(eventMaterials.response.status,200);assert.equal(eventMaterials.data.items.length,1);
  assert.equal(eventMaterials.data.items[0].title,material.title);
  assert.equal('answer' in eventMaterials.data.items[0],false);
  assert.equal('explanation' in eventMaterials.data.items[0],false);
  // Media links share the immutable editorial authority and event lifecycle.
  const resourceDraft={id:`resource-${Date.now()}`,title:'Reviewed accessible audio',locale:'en',category:'audiobook',kind:'resource',resourceType:'audio',url:'https://publisher.example/reading.mp3',prompt:'An introduction to the passage.',reference:'GEN 12',accessibility:'Transcript: Abram leaves his country after the call.'};
  assert.equal((await request('/api/materials',{method:'POST',body:resourceDraft})).response.status,201);
  const resourceSubmission=await reviewPost({...submitReview,materialId:resourceDraft.id});
  assert.equal(resourceSubmission.response.status,201);
  assert.equal((await reviewPost({action:'review',id:resourceSubmission.data.id,decision:'approve',sourceChecked:true,rightsChecked:true},ownerCookie)).response.status,200);
  const resourceLink={...attachMaterial,submissionId:resourceSubmission.data.id};
  assert.equal((await reviewPost(resourceLink)).response.status,200);
  const publicResource=(await reviewPost(eventMaterialQuery,'')).data.items.find(item=>item.id===resourceSubmission.data.id);
  assert.equal(publicResource.category,'audiobook');assert.equal(publicResource.kind,'resource');assert.equal(publicResource.url,resourceDraft.url);assert.equal(publicResource.accessibility,resourceDraft.accessibility);assert.equal('options' in publicResource,false);
  assert.equal((await reviewPost({action:'answer',id:resourceSubmission.data.id,choice:0},'')).data.error,'not_an_exercise');
  assert.ok((await reviewPost({action:'librarySearch',query:'Abram leaves'},'')).data.items.some(item=>item.id===resourceSubmission.data.id));
  assert.ok((await reviewPost({action:'librarySearch',query:'',category:'audiobook',materialType:'audio',locale:'en'},'')).data.items.some(item=>item.id===resourceSubmission.data.id));
  assert.equal((await reviewPost({action:'librarySearch',query:'',materialType:'quiz'},'')).data.items.some(item=>item.id===resourceSubmission.data.id),false);
  assert.equal((await request('/api/materials',{method:'POST',body:{...resourceDraft,category:'sermon',url:'https://publisher.example/new-draft'}})).response.status,200);
  assert.equal((await reviewPost(eventMaterialQuery,'')).data.items.find(item=>item.id===resourceSubmission.data.id).url,resourceDraft.url);
  const resourceExport=(await (await fetch(`${base}/api/materials?mine=1&export=1`,{headers:{Cookie:cookie}})).json()).submissions.find(item=>item.id===resourceSubmission.data.id);
  assert.equal(resourceExport.snapshot.data.url,resourceDraft.url);assert.equal(resourceExport.snapshot.data.category,'audiobook');
  assert.equal((await reviewPost({action:'librarySearch',query:'',category:'sermon'},'')).data.items.some(item=>item.id===resourceSubmission.data.id),false);
  assert.equal((await reviewPost({action:'withdraw',id:resourceSubmission.data.id})).response.status,200);
  assert.equal((await reviewPost(eventMaterialQuery,'')).data.items.some(item=>item.id===resourceSubmission.data.id),false);
  assert.equal((await reviewPost({...resourceLink,action:'detachEventMaterial'})).response.status,200);
  let publicReviews = await (await fetch(`${base}/api/material-review?view=public`)).json();
  const published = publicReviews.items.find(item => item.id === submission);
  assert.equal(published.title, material.title);
  assert.equal("answer" in published, false); assert.equal("explanation" in published, false);
  library = await reviewPost({ action: "librarySearch", query: "TEST MATERIAL", cursor: null }, '');
  assert.equal(library.response.status, 200);
  const libraryItem = library.data.items.find(item => item.id === submission);
  assert.equal(libraryItem.title, material.title);
  assert.equal("answer" in libraryItem, false); assert.equal("explanation" in libraryItem, false);
  let checked = await reviewPost({ action: "answer", id: submission, choice: 1 });
  assert.deepEqual(checked.data, { correct: false });
  checked = await reviewPost({ action: "answer", id: submission, choice: 0 });
  assert.equal(checked.data.correct, true); assert.equal(checked.data.explanation, material.explanation);
  result = await request("/api/materials", { method: "POST", body: { ...material, title: "Edited draft" } });
  assert.equal(result.response.status, 200);
  publicReviews = await (await fetch(`${base}/api/material-review?view=public`)).json();
  assert.equal(publicReviews.items.find(item => item.id === submission).title, material.title, "editing a draft cannot change its published snapshot");
  const nextSubmission = await reviewPost(submitReview);
  assert.equal(nextSubmission.response.status, 201);
  assert.equal((await reviewPost({ action: "review", id: nextSubmission.data.id, decision: "reject" }, ownerCookie)).response.status, 400);
  assert.equal((await reviewPost({ action: "review", id: nextSubmission.data.id, decision: "approve", sourceChecked: true, rightsChecked: true }, ownerCookie)).response.status, 200);
  publicReviews = await (await fetch(`${base}/api/material-review?view=public`)).json();
  assert.deepEqual((await reviewPost(eventMaterialQuery,'')).data.items,[], 'replaced snapshot disappears from its event');
  const staleEventMaterials=await reviewPost({...eventMaterialQuery,view:'mine'});
  assert.deepEqual(staleEventMaterials.data.unavailableIds,[submission]);
  assert.equal((await reviewPost({...attachMaterial,action:'detachEventMaterial'})).response.status,200);
  assert.equal((await reviewPost({...attachMaterial,submissionId:nextSubmission.data.id})).response.status,200);
  assert.equal(publicReviews.items.some(item => item.id === submission), false);
  assert.equal(publicReviews.items.find(item => item.id === nextSubmission.data.id).title, "Edited draft");
  assert.equal((await churchPost({action:'delete',id:materialChurch.id,confirmDeletion:true})).response.status,200);
  assert.deepEqual((await reviewPost(eventMaterialQuery,'')).data.items,[]);
  const orphanedMaterials=await reviewPost({...eventMaterialQuery,view:'mine'});
  assert.deepEqual(orphanedMaterials.data.items.map(item=>item.id),[nextSubmission.data.id]);
  assert.deepEqual((await reviewPost({...eventMaterialQuery,view:'mine'},ownerCookie)).data.items,[]);
  assert.equal((await reviewPost({...attachMaterial,submissionId:nextSubmission.data.id})).response.status,409);
  assert.equal((await reviewPost({ action: "withdraw", id: nextSubmission.data.id }, ownerCookie)).response.status, 409);
  assert.equal((await reviewPost({ action: "withdraw", id: nextSubmission.data.id })).response.status, 200);
  assert.equal((await reviewPost({ action: "answer", id: nextSubmission.data.id, choice: 0 })).response.status, 404);
  assert.deepEqual((await reviewPost(eventMaterialQuery,'')).data.items,[]);
  assert.equal((await eventPost({action:'withdraw',id:materialEvent.data.id})).response.status,200);
  assert.deepEqual((await reviewPost({...eventMaterialQuery,view:'mine'})).data.unavailableIds,[nextSubmission.data.id]);
  assert.equal((await reviewPost({...attachMaterial,submissionId:nextSubmission.data.id,action:'detachEventMaterial'},ownerCookie)).response.status,409);
  assert.equal((await reviewPost({...attachMaterial,submissionId:nextSubmission.data.id,action:'detachEventMaterial'})).response.status,200);
  assert.deepEqual((await reviewPost({...eventMaterialQuery,view:'mine'})).data,{items:[],unavailableIds:[]});
  assert.equal((await churchPost({action:'withdraw',id:materialChurch.id})).response.status,409);
  library = await reviewPost({ action: "librarySearch", query: "Edited draft", cursor: null }, '');
  assert.equal(library.response.status, 200);
  assert.equal(library.data.items.some(item => item.id === nextSubmission.data.id), false, "withdrawn materials are not searchable");
  // A real local D1 batch must atomically remove a rights-disputed approved
  // item and record the editor's reason without exposing it publicly.
  const rightsSubmission = await reviewPost(submitReview);
  assert.equal(rightsSubmission.response.status, 201);
  assert.equal((await reviewPost({ action: "review", id: rightsSubmission.data.id, decision: "approve", sourceChecked: true, rightsChecked: true }, ownerCookie)).response.status, 200);
  assert.equal((await reviewPost({ action: "takedown", id: rightsSubmission.data.id, reason: "Rights concern" })).response.status, 403);
  assert.equal((await reviewPost({ action: "takedown", id: rightsSubmission.data.id, reason: "Rights concern" }, ownerCookie)).response.status, 200);
  assert.equal((await reviewPost({ action: "answer", id: rightsSubmission.data.id, choice: 0 })).response.status, 404);
  const rightsSearch = await reviewPost({ action: "librarySearch", query: "Edited draft", cursor: null }, '');
  assert.equal(rightsSearch.data.items.some(item => item.id === rightsSubmission.data.id), false);
  const rightsAudit = await (await fetch(`${base}/api/material-review?view=history`, { headers: { Cookie: ownerCookie } })).json();
  assert.equal(rightsAudit.items.find(item => item.id === rightsSubmission.data.id).takedownReason, "Rights concern");
  const reviewHistory = await (await fetch(`${base}/api/material-review?view=mine`, { headers: { Cookie: cookie } })).json();
  assert.ok(reviewHistory.items.some(item => item.id === submission && item.status === "superseded"));
  assert.ok(reviewHistory.items.some(item => item.id === nextSubmission.data.id && item.status === "withdrawn"));
  assert.equal((await fetch(`${base}/api/materials?mine=1&export=1`)).status, 401);
  const materialExportResponse = await fetch(`${base}/api/materials?mine=1&export=1`, { headers: { Cookie: cookie } });
  assert.equal(materialExportResponse.status, 200);
  assert.match(materialExportResponse.headers.get("cache-control"), /no-store/);
  assert.match(materialExportResponse.headers.get("content-disposition"), /attachment/);
  const materialExport = await materialExportResponse.json();
  assert.equal(materialExport.materials.find(item => item.id === material.id).title, "Edited draft");
  assert.ok(materialExport.submissions.some(item => item.id === submission && item.status === "superseded"));
  const exportedSubmission=materialExport.submissions.find(item=>item.id===submission);
  assert.equal(exportedSubmission.rights_holder,submitReview.rightsHolder);
  assert.equal(exportedSubmission.rights_basis,submitReview.rightsBasis);
  assert.equal(exportedSubmission.license_url,null);
  const otherExport = await (await fetch(`${base}/api/materials?mine=1&export=1`, { headers: { Cookie: ownerCookie } })).json();
  assert.equal(otherExport.materials.some(item => item.id === material.id), false);
  const deleteOther = await fetch(`${base}/api/materials?id=${encodeURIComponent(material.id)}`, { method: "DELETE", headers: { Origin: base, Cookie: ownerCookie } });
  assert.equal(deleteOther.status, 200);
  assert.ok((await (await fetch(`${base}/api/materials?mine=1`, { headers: { Cookie: cookie } })).json()).materials.some(item => item.id === material.id), "another user cannot delete a draft");
  // More than one private page must remain reachable through the real Worker/D1.
  const olderIds=[];
  for(let i=0;i<52;i++){
    const id=`older-draft-${String(i).padStart(3,'0')}`;olderIds.push(id);
    assert.equal((await request('/api/materials',{method:'POST',body:{...material,id,title:'Older draft '+i}})).response.status,201);
  }
  let ownCursor=null;const ownIds=[],ownPageSizes=[];
  do{
    const params=new URLSearchParams({mine:'1',...(ownCursor?{afterUpdatedAt:ownCursor.updatedAt,afterId:ownCursor.id}:{})});
    const page=await request('/api/materials?'+params);assert.equal(page.response.status,200);
    ownIds.push(...page.data.materials.map(item=>item.id));ownPageSizes.push(page.data.materials.length);ownCursor=page.data.nextCursor;
  }while(ownCursor);
  assert.deepEqual(ownPageSizes,[50,4]);assert.equal(new Set(ownIds).size,54);
  assert.ok(olderIds.every(id=>ownIds.includes(id)));assert.ok(ownIds.includes(material.id));assert.ok(ownIds.includes(resourceDraft.id));
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
  assert.match(result.response.headers.get("cache-control"), /no-store/);
  result = await request("/api/account?action=visibility", { method: "PUT", body: { firstName: true, lastName: true, church: false, progress: true, community: true } });
  assert.equal(result.data.user.visibility.progress, true);
  const communityResponse = await fetch(`${base}/api/community?q=Test%20Reader&pageSize=12`);
  assert.equal(communityResponse.status, 200);
  const community = await communityResponse.json();
  const publicMember = community.members.find(member => member.displayName === "Test Reader");
  assert.ok(publicMember);
  assert.equal(publicMember.chaptersRead, 2);
  assert.equal("sourceKind" in publicMember, false);
  // Same constraint for progress; source-executed account-write-failclosed
  // preserves the real full-body forged-Origin 403 preflight.
  result = await request("/api/account?action=progress", { method: "PUT", origin: "https://attacker.invalid" });
  assert.equal(result.response.status, 403);

  // Both existing local Ukrainian editions are available for the guarded comparison.
  const comparedBooks = await Promise.all(['uk-ohiienko','uk'].map(async folder => {
    const response = await fetch(`${base}/data/bible/${folder}/GEN.json`);
    assert.equal(response.status, 200); return response.json();
  }));
  assert.deepEqual(comparedBooks.map(book => book.editionId), ['uk-ohiienko','UKRPAN']);
  assert.ok(comparedBooks.every(book => book.bookCode === 'GEN' && book.chapters[0].length > 0));

  result = await request("/api/attempts?action=read", { method: "POST", body: { book: "GEN", chapter: 12 } });
  assert.equal(result.response.status, 201, JSON.stringify(result.data));
  const attemptStarts = await Promise.all([0, 1].map(() => request("/api/attempts?action=start", { method: "POST", body: { missionId: "OT-AB-01", book: "GEN", chapter: 12, locale: "en" } })));
  assert.deepEqual(attemptStarts.map(item => item.response.status).sort(), [201, 409]);
  result = attemptStarts.find(item => item.response.status === 201);
  const attemptId = result.data.attemptId;
  for (const forbidden of ["book", "chapter", "verses", "reference", "correct", "success", "hint", "id"])
    assert.equal(forbidden in result.data.task, false, forbidden);
  result = await request("/api/attempts?action=manifest");
  assert.deepEqual(Object.keys(result.data).sort(), ["locked", "taskCount"]);
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
  result = await request("/api/attempts?action=answer", {method:"POST",body:{attemptId,taskIndex:chapter12.length,selected:chapter12.at(-1).correct}});
  assert.equal(result.data.completed, true, "the last answer can be retried after a lost response");
  result = await request("/api/attempts?action=history");
  assert.equal(result.response.status, 200);
  assert.equal(result.data.attempts[0].id, attemptId);
  assert.equal("result" in result.data.attempts[0], false);
  const ownerHistory = await fetch(`${base}/api/attempts?action=history`, {headers:{Cookie:ownerCookie}});
  assert.ok(!(await ownerHistory.json()).attempts.some(item=>item.id===attemptId));
  result = await request("/api/account?action=progress");
  assert.equal(result.data.progress.correct.length, chapter12.length);
  const secondBrowserLogin = await fetch(`${base}/api/auth?action=login`, {method:"POST",headers:{Origin:base,"Content-Type":"application/json"},body:JSON.stringify({email,password:firstPassword})});
  const secondBrowserCookie = secondBrowserLogin.headers.get("set-cookie").split(";",1)[0];
  const restoredProgress = await fetch(`${base}/api/account?action=progress`, {headers:{Cookie:secondBrowserCookie}});
  assert.equal((await restoredProgress.json()).progress.correct.length, chapter12.length);
  const learningExport = await (await fetch(`${base}/api/reading-export`, { headers: { Cookie: cookie } })).json();
  assert.ok(learningExport.progress.some(item => item.mission.startsWith("OT-AB-01:")));
  assert.equal(learningExport.attemptHistory.find(item => item.id===attemptId).result.score,chapter12.length);
  const ownerLearningExport = await (await fetch(`${base}/api/reading-export`, { headers: { Cookie: ownerCookie } })).json();
  assert.ok(!ownerLearningExport.attemptHistory.some(item=>item.id===attemptId));

  result = await request("/api/attempts?action=read", { method: "POST", body: { book: "GEN", chapter: 12 } });
  assert.equal(result.response.status, 201);
  result = await request("/api/attempts?action=chapter", { method: "POST", body: { book: "GEN", chapter: 12 } });
  assert.equal(result.response.status, 200);
  result = await request("/api/attempts?action=start", { method: "POST", body: { missionId: "OT-AB-01", book: "GEN", chapter: 12, locale: "en" } });
  assert.equal(result.response.status, 409);
  assert.equal(result.data.error, "chapter_must_be_read");
  await request("/api/attempts?action=read", { method: "POST", body: { book: "GEN", chapter: 12 } });
  result = await request("/api/attempts?action=start", { method: "POST", body: { missionId: "OT-AB-01", book: "GEN", chapter: 12, locale: "en" } });
  const invalidatedId = result.data.attemptId;
  result = await request("/api/attempts?action=history");
  assert.deepEqual(result.data, {locked:true,attempts:[]});
  result = await request("/api/attempts?action=chapter&book=GEN&chapter=12");
  assert.equal(result.response.status, 405);
  assert.equal(result.response.headers.get("allow"), "POST");
  assert.deepEqual(result.data, { error: "method_not_allowed" });
  const unrelatedLookup = await request("/api/attempts?action=chapter&book=JHN&chapter=3", { useCookie: false });
  assert.equal(unrelatedLookup.response.status, 405);
  assert.deepEqual(unrelatedLookup.data, result.data);
  // The canonical attempts handler's full-body cross-origin refusal is
  // separately source-executed by attempt-availability-boundary.test.mjs.
  result = await request("/api/attempts?action=chapter", { method: "POST", origin: "https://attacker.invalid" });
  assert.equal(result.response.status, 403);
  for (const options of [
    { body: { book: "GEN", chapter: 12 }, useCookie: false },
    { body: { book: "GEN", chapter: 13 } },
  ]) {
    result = await request("/api/attempts?action=chapter", { method: "POST", ...options });
    assert.equal(result.response.status, 200);
    assert.deepEqual(result.data, { invalidated: false });
  }
  const otherActorReopen = await fetch(`${base}/api/attempts?action=chapter`, { method: "POST", headers: { Cookie: ownerCookie, Origin: base, "Content-Type": "application/json" }, body: JSON.stringify({ book: "GEN", chapter: 12 }) });
  assert.deepEqual(await otherActorReopen.json(), { invalidated: false });
  result = await request(`/api/attempts?action=current&attemptId=${encodeURIComponent(invalidatedId)}`);
  assert.equal(result.response.status, 200, "unrelated readers and cross-origin requests must not invalidate an attempt");
  const reopened = await Promise.all([0, 1].map(() => request("/api/attempts?action=chapter", { method: "POST", body: { book: "GEN", chapter: 12, groupId: "unrelated-group" } })));
  assert.deepEqual(reopened.map(item => item.response.status), [200, 200]);
  assert.deepEqual(reopened.map(item => item.data.invalidated).sort(), [false, true]);
  for (const item of reopened) assert.deepEqual(Object.keys(item.data), ["invalidated"]);
  result = await request(`/api/attempts?action=current&attemptId=${encodeURIComponent(invalidatedId)}`);
  assert.equal(result.response.status, 409);
  assert.equal(result.data.error, "attempt_invalidated");

  const groupBody = { name: "Integration group", visibility: "private", rosterVisibility: "private", weeklyGoal: 3, catchupMode: "flexible", marathonEnabled: false, bibleEdition: "en-web" };
  result = await request("/api/groups?action=create", { method: "POST", body: { ...groupBody, name: "Public privacy test", visibility: "public" } });
  const publicGroupId = result.data.groupId;
  result = await request("/api/groups?action=session", { method: "POST", body: { groupId: publicGroupId, bookId: "GEN", chapter: 12, answersTotal: 2, answersCorrect: 1, meetingDate: "2026-10-28", reflection: "Private group discussion" } });
  assert.equal(result.response.status, 200);
  result = await request(`/api/groups?groupId=${encodeURIComponent(publicGroupId)}`);
  assert.equal(result.data.sessions[0].reflection, "Private group discussion");
  const publicGroup = await fetch(`${base}/api/groups?groupId=${encodeURIComponent(publicGroupId)}`);
  assert.equal(publicGroup.status, 200);
  assert.equal((await publicGroup.json()).sessions[0].reflection, null);
  const directory=await request('/api/groups?action=directorySearch',{method:'POST',useCookie:false,body:{query:'PUBLIC PRIVACY',marathon:false,cursor:null}});
  assert.equal(directory.response.status,200);assert.deepEqual(directory.data.groups.map(g=>g.id),[publicGroupId]);
  assert.equal(directory.data.groups[0].memberCount,null);assert.equal('inviteCode' in directory.data.groups[0],false);
  assert.doesNotMatch(JSON.stringify(directory.data),/Private group discussion/);
  assert.deepEqual((await request('/api/groups?action=directorySearch',{method:'POST',useCookie:false,body:{query:'Private group discussion'}})).data.groups,[]);
  assert.equal((await request('/api/groups?action=directorySearch',{method:'POST',origin:'https://attacker.invalid',body:{query:''}})).response.status,403);

  for(let i=0;i<12;i++) {
    result=await request('/api/groups?action=session',{method:'POST',body:{groupId:publicGroupId,bookId:'GEN',chapter:12,answersTotal:0,answersCorrect:0,meetingDate:'2026-10-28',participantCount:4,reflection:'Private earlier meeting'}});
    assert.equal(result.response.status,200);
  }
  result=await request(`/api/groups?action=meetings&groupId=${publicGroupId}`);
  assert.equal(result.response.status,200);assert.equal(result.data.sessions.length,12);assert.ok(result.data.nextCursor);
  const firstMeetingPage=result.data;
  assert.ok(firstMeetingPage.sessions.every(session=>typeof session.reflection==='string'));
  result=await request(`/api/groups?action=meetings&groupId=${publicGroupId}&before=${encodeURIComponent(firstMeetingPage.nextCursor)}`);
  assert.equal(result.response.status,200);assert.equal(result.data.sessions.length,1);assert.equal(result.data.nextCursor,null);
  assert.equal(new Set([...firstMeetingPage.sessions,...result.data.sessions].map(session=>session.id)).size,13);
  const editableMeeting=firstMeetingPage.sessions[0];assert.equal(editableMeeting.canEdit,true);
  const originalNotes={reflection:editableMeeting.reflection,participantCount:editableMeeting.participant_count};
  const correctedNotes={reflection:'Corrected private discussion\nSecond line',participantCount:8};
  const notesPayload={groupId:publicGroupId,sessionId:editableMeeting.id,expected:originalNotes,notes:correctedNotes};
  const forbiddenNotes=await fetch(`${base}/api/groups?action=meeting-notes`,{method:'POST',headers:{Cookie:ownerCookie,Origin:base,'Content-Type':'application/json'},body:JSON.stringify(notesPayload)});
  assert.equal(forbiddenNotes.status,409);
  result=await request('/api/groups?action=meeting-notes',{method:'POST',body:notesPayload});assert.equal(result.response.status,200);assert.deepEqual(result.data.notes,correctedNotes);
  result=await request(`/api/groups?action=meeting-notes&groupId=${publicGroupId}&sessionId=${editableMeeting.id}`);assert.deepEqual(result.data.notes,correctedNotes);
  result=await request('/api/groups?action=meeting-notes',{method:'POST',body:notesPayload});assert.equal(result.response.status,409);
  const publicMeetings=await (await fetch(`${base}/api/groups?action=meetings&groupId=${publicGroupId}`)).json();
  assert.ok(publicMeetings.sessions.every(session=>session.reflection===null&&session.participant_count===null&&session.canEdit===false));
  result = await request("/api/groups?action=create", { method: "POST", body: groupBody });
  assert.equal(result.response.status, 201);
  const groupId = result.data.groupId;
  assert.equal((await fetch(`${base}/api/groups?action=meetings&groupId=${groupId}`)).status,404);
  await request("/api/attempts?action=read", { method: "POST", body: { book: "GEN", chapter: 12, groupId } });
  result = await request("/api/attempts?action=start", { method: "POST", body: { missionId: "OT-AB-01", book: "GEN", chapter: 12, locale: "en", groupId } });
  assert.equal(result.response.status, 201);
  const firstGroupAttemptId = result.data.attemptId;
  // A personal reader still exposes the same text to the same person. It must
  // invalidate a group assessment even when no group context is supplied.
  result = await request("/api/attempts?action=chapter", { method: "POST", body: { book: "GEN", chapter: 12 } });
  assert.deepEqual(result.data, { invalidated: true });
  result = await request(`/api/attempts?action=current&attemptId=${encodeURIComponent(firstGroupAttemptId)}`);
  assert.equal(result.response.status, 409);
  await request("/api/attempts?action=read", { method: "POST", body: { book: "GEN", chapter: 12, groupId } });
  result = await request("/api/attempts?action=start", { method: "POST", body: { missionId: "OT-AB-01", book: "GEN", chapter: 12, locale: "en", groupId } });
  assert.equal(result.response.status, 201);
  const groupAttemptId = result.data.attemptId;
  for (let index = 0; index < chapter12.length; index += 1)
    result = await request("/api/attempts?action=answer", { method: "POST", body: { attemptId: groupAttemptId, taskIndex: index + 1, selected: chapter12[index].correct } });
  assert.equal(result.data.groupId, groupId);
  assert.equal(result.data.groupRecorded, true);
  result = await request("/api/attempts?action=finalize", {method:"POST",body:{attemptId:groupAttemptId}});
  assert.equal(result.data.groupRecorded, true);
  result = await request("/api/attempts?action=history");
  assert.equal(result.data.attempts.find(item=>item.id===groupAttemptId).mode,"group");
  assert.equal(result.data.attempts.find(item=>item.id===attemptId).mode,"personal");
  result = await request(`/api/groups?groupId=${encodeURIComponent(groupId)}`);
  assert.equal(result.data.sessions.length, 1);
  assert.equal(result.data.sessions[0].answers_correct, chapter12.length);

  // Exercise membership lifecycle with two independent authenticated accounts on real D1.
  const managerMe = await (await fetch(`${base}/api/account?action=me`, {headers:{Cookie:ownerCookie}})).json();
  result = await request('/api/groups?action=create', {method:'POST',body:{...groupBody,name:'Membership lifecycle'}});
  assert.equal(result.response.status,201);
  const lifecycleId = result.data.groupId;
  result = await request(`/api/groups?groupId=${lifecycleId}`);
  const lifecycleInvite = result.data.group.inviteCode;
  const lifecycleSettings=Object.fromEntries(['name','church','country','city','description','visibility','rosterVisibility'].map(key=>[key,result.data.group[key]]));
  assert.match(lifecycleInvite,/^[A-F0-9]{32}$/);
  async function managerGroup(action, body) {
    return fetch(`${base}/api/groups?action=${action}`, {method:'POST',headers:{Cookie:ownerCookie,Origin:base,'Content-Type':'application/json'},body:JSON.stringify(body)});
  }
  assert.equal((await managerGroup('join',{inviteCode:lifecycleInvite})).status,200);
  // A volunteer team is an explicit association with this existing private group.
  assert.equal((await churchPost(churchClaim)).response.status,201);
  const teamChurch=(await (await fetch(`${base}/api/churches?view=mine`,{headers:{Cookie:cookie}})).json()).items[0];
  assert.equal((await churchPost({action:'review',id:teamChurch.id,decision:'approve',verificationEvidence:'Disposable team authority',note:''},ownerCookie)).response.status,200);
  const teamEvent=await eventPost({...eventFixture,churchId:teamChurch.id});assert.equal(teamEvent.response.status,201);
  const teamParams=new URLSearchParams({eventId:teamEvent.data.id});
  assert.equal((await fetch(`${base}/api/event-teams?${teamParams}`)).status,401);
  const teamOptions=await request('/api/event-teams?view=options');assert.ok(teamOptions.data.items.some(item=>item.id===lifecycleId));
  const connectTeam={action:'set',eventId:teamEvent.data.id,groupId:lifecycleId,expectedRevision:null,confirm:true};
  result=await request('/api/event-teams',{method:'POST',body:connectTeam});assert.equal(result.response.status,200);
  result=await request(`/api/event-teams?${teamParams}&view=manage`);const teamRevision=result.data.revision;assert.equal(result.data.team.id,lifecycleId);
  const volunteerTeam=await (await fetch(`${base}/api/event-teams?${teamParams}`,{headers:{Cookie:ownerCookie}})).json();
  assert.deepEqual(volunteerTeam,{team:{id:lifecycleId,name:'Membership lifecycle'}});
  result=await request('/api/event-teams',{method:'POST',body:connectTeam});assert.equal(result.response.status,409,'stale tab cannot replace a newer association');

  const editedSettings={...lifecycleSettings,name:'Updated group',description:'Full description\nSecond line',visibility:'public',rosterVisibility:'names',city:'Kyiv'};
  assert.equal((await managerGroup('settings',{groupId:lifecycleId,expected:lifecycleSettings,settings:editedSettings})).status,409);
  result=await request('/api/groups?action=settings',{method:'POST',body:{groupId:lifecycleId,expected:lifecycleSettings,settings:editedSettings}});
  assert.equal(result.response.status,200);
  const visitorSettings=await (await fetch(`${base}/api/groups?groupId=${lifecycleId}`)).json();
  assert.equal(visitorSettings.group.name,'Updated group');assert.equal(visitorSettings.group.description,editedSettings.description);
  assert.equal(visitorSettings.members.length,0);
  assert.deepEqual((await (await fetch(`${base}/api/event-teams?${teamParams}`,{headers:{Cookie:ownerCookie}})).json()).team,null,'public group settings revoke private team association');
  result=await request('/api/event-teams',{method:'POST',body:{action:'clear',eventId:teamEvent.data.id,expectedRevision:teamRevision}});assert.equal(result.response.status,200);
  assert.equal((await eventPost({action:'withdraw',id:teamEvent.data.id})).response.status,200);
  assert.equal((await churchPost({action:'withdraw',id:teamChurch.id})).response.status,200);

  const memberNameChoice=await (await fetch(`${base}/api/groups?action=name-visibility&groupId=${lifecycleId}`,{headers:{Cookie:ownerCookie}})).json();
  assert.equal(memberNameChoice.publicName,false);
  assert.equal((await managerGroup('name-visibility',{groupId:lifecycleId,publicName:true,expectedPublicName:false})).status,200);
  assert.equal((await (await fetch(`${base}/api/groups?groupId=${lifecycleId}`)).json()).members.length,1);
  assert.equal((await managerGroup('name-visibility',{groupId:lifecycleId,publicName:false,expectedPublicName:true})).status,200);
  assert.equal((await (await fetch(`${base}/api/groups?groupId=${lifecycleId}`)).json()).members.length,0);

  result=await request('/api/groups?action=settings',{method:'POST',body:{groupId:lifecycleId,expected:lifecycleSettings,settings:editedSettings}});
  assert.equal(result.response.status,409,'a stale editor cannot overwrite new metadata');
  result=await request('/api/groups?action=settings',{method:'POST',body:{groupId:lifecycleId,expected:editedSettings,settings:{...editedSettings,visibility:'private'}}});
  assert.equal(result.response.status,200);
  assert.equal((await fetch(`${base}/api/groups?groupId=${lifecycleId}`)).status,404);

  const memberView = await (await fetch(`${base}/api/groups?groupId=${lifecycleId}`,{headers:{Cookie:ownerCookie}})).json();
  assert.deepEqual(memberView.managementMembers,[]);
  assert.equal((await managerGroup('delete',{groupId:lifecycleId,confirm:true})).status,403);
  result = await request('/api/groups?action=role',{method:'POST',body:{groupId:lifecycleId,targetUserId:managerMe.user.id,expectedRole:'member',role:'facilitator'}});
  assert.equal(result.response.status,200);
  assert.equal((await managerGroup('session',{groupId:lifecycleId,bookId:'GEN',chapter:12,answersTotal:0,answersCorrect:0,meetingDate:'2026-10-28'})).status,200);
  result = await request('/api/groups?action=role',{method:'POST',body:{groupId:lifecycleId,targetUserId:managerMe.user.id,expectedRole:'facilitator',role:'member'}});
  assert.equal(result.response.status,200);
  assert.equal((await managerGroup('session',{groupId:lifecycleId,bookId:'GEN',chapter:12,answersTotal:0,answersCorrect:0,meetingDate:'2026-10-28'})).status,403);
  result = await request('/api/groups?action=rotate-invite',{method:'POST',body:{groupId:lifecycleId,expectedInviteCode:lifecycleInvite,confirm:true}});
  assert.equal(result.response.status,200);assert.notEqual(result.data.inviteCode,lifecycleInvite);
  const replacementInvite=result.data.inviteCode;
  assert.equal((await managerGroup('leave',{groupId:lifecycleId})).status,200);
  assert.equal((await managerGroup('join',{inviteCode:lifecycleInvite})).status,404);
  assert.equal((await managerGroup('join',{inviteCode:replacementInvite})).status,200);
  result = await request('/api/groups?action=leave',{method:'POST',body:{groupId:lifecycleId}});
  assert.equal(result.response.status,409);
  result = await request('/api/groups?action=transfer',{method:'POST',body:{groupId:lifecycleId,targetUserId:managerMe.user.id}});
  assert.equal(result.response.status,200);
  result = await request(`/api/groups?groupId=${lifecycleId}`);
  assert.equal(result.data.membership,'member');
  const managerView = await (await fetch(`${base}/api/groups?groupId=${lifecycleId}`,{headers:{Cookie:ownerCookie}})).json();
  assert.equal(managerView.membership,'owner');
  assert.equal(managerView.managementMembers.filter(m=>m.role==='owner').length,1);
  result = await request('/api/groups?action=leave',{method:'POST',body:{groupId:lifecycleId}});
  assert.equal(result.response.status,200);
  result = await request(`/api/groups?groupId=${lifecycleId}`);assert.equal(result.response.status,404);
  assert.equal((await managerGroup('delete',{groupId:lifecycleId,confirm:true})).status,200);
  assert.equal((await fetch(`${base}/api/groups?groupId=${lifecycleId}`,{headers:{Cookie:ownerCookie}})).status,404);

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

  async function ownerCommunity(body) {
    const response=await fetch(`${base}/api/community`,{method:"POST",headers:{Origin:base,Cookie:ownerCookie,"Content-Type":"application/json"},body:JSON.stringify(body)});
    return {response,data:await response.json()};
  }
  let control=await fetch(`${base}/api/community?action=owner`,{headers:{Cookie:ownerCookie}});
  let ownerState=await control.json();
  assert.equal(ownerState.run.status,"waiting");
  assert.equal(ownerState.synthetic.total,0,"a public visit must not start registrations");
  const realCommunityBefore = await (await fetch(`${base}/api/community`)).json();
  const deniedStart=await fetch(`${base}/api/community`,{method:"POST",headers:{Origin:base,"Content-Type":"application/json"},body:JSON.stringify({action:"start"})});
  assert.equal(deniedStart.status,403);
  const deniedDispatch=await fetch(`${base}/api/community/dispatch`,{method:"POST"});
  assert.equal(deniedDispatch.status,403);
  const starts=await Promise.all([0,1].map(()=>ownerCommunity({action:"start"})));
  assert.deepEqual(starts.map(item=>item.response.status).sort(),[200,409]);
  control=await fetch(`${base}/api/community?action=owner`,{headers:{Cookie:ownerCookie}});
  ownerState=await control.json();
  assert.equal(ownerState.run.status,"running");
  assert.equal(ownerState.synthetic.total,1);
  assert.equal(ownerState.waves.reduce((sum,wave)=>sum+wave.target_count,0),2700);
  assert.ok(ownerState.waves.every(wave=>wave.starts_at>=ownerState.run.started_at));
  const leases=await Promise.all([0,1].map(()=>ownerCommunity({action:"lease",limit:2})));
  const jobs=leases.flatMap(item=>item.data.jobs);
  assert.equal(jobs.length,1,"concurrent workers must not receive the same participant");
  const originalJob=jobs[0];
  let actorMe=await fetch(`${base}/api/account?action=me`,{headers:{Cookie:`sa_agent=${originalJob.token}`}});
  assert.equal((await actorMe.json()).user.authProvider,"agent");
  const protectedUsers=await fetch(`${base}/api/account?action=users`,{headers:{Cookie:`sa_agent=${originalJob.token}`}});
  assert.equal(protectedUsers.status,401);
  let publicView=await (await fetch(`${base}/api/community`)).json();
  assert.equal(publicView.members.some(member=>member.id===originalJob.memberId),false);
  assert.equal(publicView.summary.registered,realCommunityBefore.summary.registered);
  assert.equal(publicView.summary.visible,realCommunityBefore.summary.visible);
  assert.equal(publicView.summary.online,realCommunityBefore.summary.online);
  assert.equal(JSON.stringify(publicView).includes(originalJob.token),false);
  assert.equal((await ownerCommunity({action:"pause"})).data.status,"paused");
  actorMe=await fetch(`${base}/api/account?action=me`,{headers:{Cookie:`sa_agent=${originalJob.token}`}});
  assert.equal((await actorMe.json()).user,null);
  publicView=await (await fetch(`${base}/api/community`)).json();
  assert.equal(publicView.members.some(member=>member.id===originalJob.memberId),false);
  assert.equal((await ownerCommunity({action:"lease"})).data.jobs.length,0);
  assert.equal((await ownerCommunity({action:"resume"})).data.status,"running");
  actorMe=await fetch(`${base}/api/account?action=me`,{headers:{Cookie:`sa_agent=${originalJob.token}`}});
  assert.equal((await actorMe.json()).user,null,"paused credentials stay revoked after resume");
  const resumed=await ownerCommunity({action:"lease"});
  assert.equal(resumed.data.jobs.length,1);
  const job=resumed.data.jobs[0];
  assert.notEqual(job.token,originalJob.token);
  const activity=await runCommunityAgent({origin:base,token:job.token,seed:job.seed,smoke:true});
  assert.equal(activity.completed,true);
  publicView=await (await fetch(`${base}/api/community`)).json();
  assert.equal(publicView.members.some(member=>member.id===job.memberId),false);
  assert.equal(publicView.summary.registered,realCommunityBefore.summary.registered);
  assert.equal((await ownerCommunity({action:"stop"})).data.status,"stopped");
  assert.equal((await ownerCommunity({action:"resume"})).response.status,409);
  const finalState=await (await fetch(`${base}/api/community?action=owner`,{headers:{Cookie:ownerCookie}})).json();
  assert.ok(finalState.log.some(event=>event.event_type==="agent_session_completed"));
  assert.equal((await fetch(`${base}/api/community?action=owner`)).status,403);

  const chapter14 = mission.tasks.filter(task => task.book === "GEN" && task.chapter === 14);
  result = await request("/api/attempts?action=manifest");
  assert.equal(result.data.taskCount, mission.tasks.length);
  assert.ok(result.data.chapters.some(chapter => chapter.book === "GEN" && chapter.chapter === 14));
  assert.equal((await request("/api/attempts?action=read", {method:"POST",body:{book:"GEN",chapter:14}})).response.status,201);
  result = await request("/api/attempts?action=start", {
    method:"POST",body:{missionId:"OT-AB-01",book:"GEN",chapter:14,locale:"uk"},
  });
  assert.equal(result.response.status,201);
  assert.equal(result.data.task.question,chapter14[0].question.uk);
  const chapter14Attempt = result.data.attemptId;
  for (const [index, task] of chapter14.entries()) {
    const selected = index===chapter14.length-1 ? [0] : task.correct;
    result = await request("/api/attempts?action=answer", {
      method:"POST",body:{attemptId:chapter14Attempt,taskIndex:index+1,selected},
    });
    assert.equal(result.response.status,200);
    if (index < chapter14.length-1) assert.equal("result" in result.data,false);
  }
  assert.equal(result.data.completed,true);
  assert.equal(result.data.result.score,2);
  assert.deepEqual(result.data.result.mistakes.map(({reference,explanation})=>({reference,explanation})),[
    {reference:"GEN 14:21–24",explanation:chapter14[2].success.uk},
  ]);

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
  result = await request("/api/auth?action=login", { method: "POST", body: { email, password: secondPassword } });
  assert.equal(result.response.status, 200);
  assert.equal((await bookmarkWrite(mark)).status, 200);
  const deletionSession = cookie;
  result = await request("/api/auth?action=delete-account", { method: "POST", body: { password: "wrong-password" } });
  assert.equal(result.response.status, 401);
  result = await request("/api/auth?action=delete-account", { method: "POST", body: { password: secondPassword } });
  assert.equal(result.response.status, 200);
  assert.equal((await (await fetch(`${base}/api/account?action=me`, { headers: { Cookie: deletionSession } })).json()).user, null);
  assert.equal((await fetch(`${base}/api/bookmarks`, { headers: { Cookie: cookie } })).status, 401);
  result = await request("/api/auth?action=login", { method: "POST", body: { email, password: secondPassword } });
  assert.equal(result.response.status, 401);
});
