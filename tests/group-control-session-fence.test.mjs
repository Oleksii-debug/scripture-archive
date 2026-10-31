import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import {meetingHistoryCopy,meetingHistoryMarkup} from '../public/group-meeting-history.js';

// The actual production handlers are evaluated, not a copied implementation.
// Avoid importing app.js because it bootstraps the browser at module load time.
const source = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const first = source.indexOf('function groupPageCurrent(expected, principal) {');
const last = source.indexOf('\nfunction renderAttemptResult(', first);
assert.ok(first >= 0 && last > first, 'canonical group controller must exist');
const production = source.slice(first, last) + '\n({groupPageCurrent, renderGroups, renderGroup})';

class FakeFormData {
  constructor(form) { this.entries = Object.entries(form.values || {}); }
  [Symbol.iterator]() { return this.entries[Symbol.iterator](); }
  has(key) { return this.entries.some(([k]) => k === key); }
}
function deferred() {
  let resolve;
  return {promise: new Promise(r => {resolve = r;}), resolve};
}
function fixture({detail = false, pendingAction = '', holdSecondCatalog = false, settings = false, postError = '', postResult = {ok:true,groupId:'g1'}} = {}) {
  const state = {
    user: {id:'alice',profileComplete:true}, lang:'en', sessionUnavailable:false,
  };
  const location = {pathname:detail?'/groups/g1':'/groups',hash:''};
  const events = {requests:[],navigation:[],announcements:[],confirmations:0,html:[],focus:[]};
  const groupForm = {isConnected:true,values:{name:'Study Group',weeklyGoal:'3'}};
  const joinForm = {isConnected:true,values:{inviteCode:'invite-code'}};
  const sessionForm = {isConnected:true,values:{bookId:'GEN',chapter:'12',meetingDate:'2026-10-30'}};
  const leave = {isConnected:true,disabled:false};
  const remove = {isConnected:true,disabled:false};
  const rotate = {isConnected:true,disabled:false};
  const readingBook = {isConnected:true,value:'GEN'};
  const readingChapter = {isConnected:true,value:'12'};
  const readingPreview = {textContent:''};
  const readingLink = {href:'',isConnected:true,addEventListener() {}};
  const status = {isConnected:true,textContent:''};
  const settingsSave={isConnected:true,disabled:false};
  const settingsForm={isConnected:true,values:{name:'Edited',church:'',country:'Ukraine',city:'Kyiv',description:'Draft text',visibility:'private',rosterVisibility:'count'},querySelector:()=>settingsSave};
  const settingsReload={isConnected:true};
  const settingsSummary={focus:()=>events.focus.push('settings')};
  const controls = {
    '#group-form':groupForm,'#join-form':joinForm,
    '#session-form':sessionForm,'#leave-group':leave,'#delete-group':remove,
    '#rotate-group-invite':rotate,
    ...(settings?{'#group-settings-form':settingsForm,'#group-settings-status':status,'#reload-group-settings':settingsReload,'#group-settings-summary':settingsSummary}:{}),
    '#target-book':readingBook,'#target-chapter':readingChapter,
    '#reading-preview':readingPreview,'#chapter-link':readingLink,
    '#group-manage-status':status,'#group-form-state':status,'#join-state':status,'#session-state':status,
  };
  const document = {
    querySelector: selector => controls[selector] || null,
    querySelectorAll: () => [],
  };
  const group = {
    id:'g1',name:'Group',description:'',church:'',city:'',country:'',visibility:'private',rosterVisibility:'count',
    inviteCode:'private-invite',memberCount:1,chaptersCompleted:0,answersCorrect:0,
    answersTotal:0,qualityPercent:null,weeklyGoal:3,catchupMode:'steady',
    marathonEnabled:false,bibleEdition:'en-kjv',
  };
  const data = {group,membership:'owner',members:[],sessions:[],peers:[],managementMembers:[]};
  const postGate = pendingAction ? deferred() : null;
  const catalogReadback = holdSecondCatalog ? deferred() : null;
  const secondCatalogStarted = deferred();
  let catalogReads=0;
  const ctx = {
    state,location,document,FormData:FakeFormData,meetingHistoryCopy,meetingHistoryMarkup,
    window:{confirm:() => {events.confirmations++; return true;}},
    setActiveNav() {}, t: key => key, esc: String,
    field: () => '', groupStatus:()=>'',groupMetrics:()=>'',groupCard:()=>'',groupManagementMarkup:()=>'',groupManagementCopy:()=>({leaveConfirm:'Leave?',deleteConfirm:'Delete?',left:'Left',deleted:'Deleted',rotateConfirm:'Rotate?',rotated:'Rotated',error:'Error',settingsSaved:'Settings saved',settingsConflict:'Conflict',settingsUnconfirmed:'Unconfirmed',publishConfirm:'Publish?',reloadConfirm:'Reload?'}),
    shell: html => {events.html.push(html);},
    groupRequest: async (action,method,payload,query) => {
      events.requests.push({action,method,payload,query});
      if(method==='GET')return action==='' && query?.includes('groupId=')?data:{groups:[]};
      if(action===pendingAction)await postGate.promise;
      if(postError)throw Error(postError);
      return postResult;
    },
    navigateTo:path=>events.navigation.push(path),
    announce:message=>events.announcements.push(message),
    getCatalog:async()=>{
      if (++catalogReads > 1 && catalogReadback) {
        secondCatalogStarted.resolve();
        await catalogReadback.promise;
      }
      return {books:{en:[{code:'GEN',name:'Genesis'}]}};
    },
    bookTitle:book=>book.name,
    EDITIONS:{en:true},localStorage:{setItem(){}},setStaticI18n() {},
    console,
  };
  const controller = vm.runInNewContext(production,ctx);
  return {state,location,events,groupForm,joinForm,sessionForm,settingsForm,settingsSave,settingsReload,status,group,leave,remove,rotate,readingBook,readingChapter,postGate,catalogReadback,secondCatalogStarted,...controller,
    posts() {return events.requests.filter(x=>x.method==='POST');},
  };
}
const submit = form => form.onsubmit({preventDefault() {},currentTarget:form});

for (const change of ['account','route','session-outage','detached']) {
  test('group directory refuses retained create and join controls after '+change, async () => {
    const f = fixture();
    await f.renderGroups();
    if (change === 'account') f.state.user = {id:'bob',profileComplete:true};
    if (change === 'route') f.location.pathname = '/account';
    if (change === 'session-outage') f.state.sessionUnavailable = true;
    if (change === 'detached') { f.groupForm.isConnected = false; f.joinForm.isConnected = false; }
    await submit(f.groupForm);
    await submit(f.joinForm);
    assert.equal(f.posts().length,0,'stale control must not mutate any group');
    assert.deepEqual(f.events.navigation,[]);
    assert.deepEqual(f.events.announcements,[]);
  });
}

test('late group-creation acknowledgement never navigates across account changes',async()=>{
  const f=fixture({pendingAction:'create'});
  await f.renderGroups();
  const action=submit(f.groupForm);
  assert.equal(f.posts().length,1);
  f.state.user={id:'bob',profileComplete:true};
  f.postGate.resolve();
  await action;
  assert.deepEqual(f.events.navigation,[]);
  assert.deepEqual(f.events.announcements,[]);
});

test('same-principal create retains canonical POST and group-detail navigation',async()=>{
  const f=fixture();
  await f.renderGroups();
  await submit(f.groupForm);
  assert.equal(f.posts().length,1);
  assert.equal(f.posts()[0].action,'create');
  assert.deepEqual(f.events.navigation,['/groups/g1']);
});

test('old group detail cannot confirm delete/leave or submit a meeting',async()=>{
  const f=fixture({detail:true});
  await f.renderGroup('g1');
  f.state.user={id:'bob',profileComplete:true};
  f.leave.onclick();
  f.remove.onclick();
  await submit(f.sessionForm);
  assert.equal(f.events.confirmations,0,'no stale destructive confirmation');
  assert.equal(f.posts().length,0,'no stale group mutation');
});

test('meeting save never announces or repaints group after route changes mid-flight',async()=>{
  const f=fixture({detail:true,pendingAction:'session'});
  await f.renderGroup('g1');
  const action=submit(f.sessionForm);
  assert.equal(f.posts().length,1);
  f.location.pathname='/account';
  f.postGate.resolve();
  await action;
  assert.deepEqual(f.events.announcements,[]);
  assert.equal(f.events.html.length,1,'no stale detail rerender');
});

test('active facilitator retains real meeting write, feedback and canonical rerender',async()=>{
  const f=fixture({detail:true});
  await f.renderGroup('g1');
  await submit(f.sessionForm);
  assert.equal(f.posts().length,1);
  assert.equal(f.posts()[0].action,'session');
  assert.deepEqual(f.events.announcements,['meetingSaved']);
  assert.equal(f.events.html.length,2);
});

test('old owner success cannot be announced after a second-stage group readback crosses accounts',async()=>{
  const f=fixture({detail:true,holdSecondCatalog:true});
  await f.renderGroup('g1');
  f.rotate.onclick();
  await f.secondCatalogStarted.promise;
  assert.equal(f.posts().length,1,'a valid old-owner rotation already committed');
  assert.equal(f.posts()[0].action,'rotate-invite');
  f.state.user={id:'bob',profileComplete:true};
  f.catalogReadback.resolve();
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(f.events.announcements,[],
    'the completed old owner action must not announce into the new identity');
  assert.equal(f.events.html.length,1,'the second group readback is discarded');
});

test('same owner still hears successful rotation after the asynchronous detail readback',async()=>{
  const f=fixture({detail:true,holdSecondCatalog:true});
  await f.renderGroup('g1');
  f.rotate.onclick();
  await f.secondCatalogStarted.promise;
  f.catalogReadback.resolve();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(f.posts().length,1);
  assert.equal(f.events.html.length,2,'current detail is refreshed');
  assert.deepEqual(f.events.announcements,['Rotated']);
});

for(const change of ['account','route','session-outage','detached'])test('settings retained form cannot write after '+change,async()=>{
  const f=fixture({detail:true,settings:true});await f.renderGroup('g1');
  if(change==='account')f.state.user={id:'bob'};
  if(change==='route')f.location.pathname='/account';
  if(change==='session-outage')f.state.sessionUnavailable=true;
  if(change==='detached')f.settingsForm.isConnected=false;
  await submit(f.settingsForm);await f.settingsReload.onclick();
  assert.equal(f.posts().length,0);assert.equal(f.events.confirmations,0);
});

test('settings keeps draft and reports conflict or uncertain acknowledgement without success',async()=>{
  for(const options of [{postError:'group_settings_changed_or_forbidden',message:'Conflict'},{postError:'database_unavailable',message:'Unconfirmed'},{postResult:{},message:'Unconfirmed'}]) {
    const f=fixture({detail:true,settings:true,...options});await f.renderGroup('g1');
    await submit(f.settingsForm);
    assert.equal(f.status.textContent,options.message);assert.equal(f.settingsForm.values.description,'Draft text');
    assert.equal(f.settingsSave.disabled,false);assert.deepEqual(f.events.announcements,[]);
    assert.equal(f.events.html.length,1,'failed save must not replace the form');
  }
});

test('settings sends exact snapshot, confirms public exposure and restores focus after save readback',async()=>{
  const f=fixture({detail:true,settings:true});await f.renderGroup('g1');
  f.settingsForm.values.visibility='public';
  await submit(f.settingsForm);
  const payload=f.posts()[0].payload;
  assert.equal(payload.expected.name,'Group');assert.equal(payload.expected.visibility,'private');
  assert.equal(payload.settings.name,'Edited');assert.equal(payload.settings.church,null);
  assert.equal(payload.settings.description,'Draft text');assert.equal(payload.settings.visibility,'public');
  assert.equal(f.events.confirmations,1);assert.deepEqual(f.events.focus,['settings']);
  assert.deepEqual(f.events.announcements,['Settings saved']);
});

test('a late settings save must not reload or announce to a different account',async()=>{
  const f=fixture({detail:true,settings:true,pendingAction:'settings'});await f.renderGroup('g1');
  const pending=submit(f.settingsForm);assert.equal(f.settingsSave.disabled,true);
  await submit(f.settingsForm);assert.equal(f.posts().length,1,'prevent duplicate click while pending');
  f.state.user={id:'bob'};f.postGate.resolve();await pending;
  assert.equal(f.events.html.length,1);assert.deepEqual(f.events.announcements,[]);assert.deepEqual(f.events.focus,[]);
});
