import test from 'node:test';
import assert from 'node:assert/strict';
import {meetingHistoryCopy,meetingHistoryMarkup,meetingRowsMarkup,mountMeetingHistory} from '../public/group-meeting-history.js';

const row=id=>({id,book_id:'GEN',chapter:12,meeting_date:'2026-10-28',answers_correct:2,answers_total:3,participant_count:4,reflection:'Private discussion',canEdit:false});
const page=(start,count=12,more=true)=>{const sessions=Array.from({length:count},(_,i)=>row(String(start+i)));return {sessions,nextCursor:more?sessions.at(-1).id:null};};
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
function fixture(request,{forms=[]}={}){
  let current=true;const requests=[],appended=[],headings=[];
  const doc={body:{}};doc.activeElement=doc.body;
  const button={disabled:true,hidden:false,focus(){doc.activeElement=this;}};
  const status={textContent:'',focus(){doc.activeElement=this;}};
  const list={insertAdjacentHTML(_where,html){appended.push(html);for(let i=0;i<JSON.parse(html).length;i++)headings.push({focus(){doc.activeElement=this;}});},querySelectorAll(selector){return selector==='[data-meeting-heading]'?headings:forms;},set textContent(value){assert.equal(value,'');appended.length=0;headings.length=0;}};
  const root={isConnected:true,ownerDocument:doc,querySelector:s=>({'[data-meeting-list]':list,'[data-meeting-more]':button,'[data-meeting-status]':status}[s])};
  const copy=meetingHistoryCopy('en');
  const controller=mountMeetingHistory(root,{copy,groupId:'group id',isCurrent:()=>current,request:async(...args)=>{requests.push(args);return request(...args);},renderRows:rows=>JSON.stringify(rows)});
  return {...controller,root,doc,button,status,list,copy,requests,appended,headings,switchAccount(){current=false;},load:()=>button.onclick()};
}
test('meeting history loads bounded pages, encodes the group/cursor and focuses the first new record',async()=>{
  let reads=0;const f=fixture(async()=>++reads===1?page(0):page(12,3,false));
  await f.ready;assert.equal(f.requests[0][3],'groupId=group%20id');assert.equal(f.headings.length,12);assert.equal(f.button.disabled,false);
  f.doc.activeElement=f.button;await f.load();assert.equal(f.requests[1][3],'groupId=group%20id&before=11');
  assert.equal(f.headings.length,15);assert.equal(f.doc.activeElement,f.headings[12]);assert.equal(f.button.hidden,true);assert.match(f.status.textContent,/15/);
  await f.load();assert.equal(f.requests.length,2);
});
test('a failed history page preserves records and cursor for an explicit retry',async()=>{
  let reads=0;const f=fixture(async()=>{if(++reads===2)throw Error('groups_unavailable');return reads===1?page(0):page(12,1,false);});
  await f.ready;f.doc.activeElement=f.button;await f.load();
  assert.equal(f.headings.length,12);assert.equal(f.status.textContent,f.copy.error);assert.equal(f.button.disabled,false);assert.equal(f.doc.activeElement,f.button);
  await f.load();assert.equal(f.requests[1][3],f.requests[2][3]);assert.equal(f.headings.length,13);
});
test('revoked membership or missing cursor clears prior private reflections and announces reopening',async()=>{
  for(const error of ['not_found','meeting_cursor_unavailable','authentication_required']){
    let reads=0;const f=fixture(async()=>{if(++reads>1)throw Error(error);return page(0);});
    await f.ready;f.doc.activeElement=f.button;await f.load();
    assert.equal(f.headings.length,0);assert.equal(f.status.textContent,f.copy.expired);assert.equal(f.button.hidden,true);assert.equal(f.doc.activeElement,f.status);
    await f.load();assert.equal(reads,2);
  }
});
test('history suppresses duplicate requests and delayed replies after route/account changes',async()=>{
  const gate=deferred();const f=fixture(async()=>gate.promise);
  await f.load();assert.equal(f.requests.length,1);f.switchAccount();gate.resolve(page(0));await f.ready;
  assert.equal(f.appended.length,0);await f.load();assert.equal(f.requests.length,1);
  const more=deferred();let reads=0;const g=fixture(async()=>++reads===1?page(0):more.promise);
  await g.ready;const loading=g.load();g.root.isConnected=false;more.resolve(page(12,1,false));await loading;
  assert.equal(g.headings.length,12);
});
test('invalid, duplicate and nonadvancing pages never append or silently finish history',async()=>{
  for(const bad of [{sessions:[]},{sessions:[],nextCursor:'bad'},page(0),{...page(12),sessions:[row('12'),row('12')]},{sessions:[{...row('12'),answers_correct:'2'}],nextCursor:null}]){
    let reads=0;const f=fixture(async()=>++reads===1?page(0):bad);
    await f.ready;await f.load();assert.equal(f.headings.length,12);assert.equal(f.status.textContent,f.copy.error);assert.equal(f.button.hidden,false);
  }
});
test('loading meetings respects user focus movement and empty history is explicit',async()=>{
  const gate=deferred();let reads=0;const f=fixture(async()=>++reads===1?page(0):gate.promise);
  await f.ready;f.doc.activeElement=f.button;const loading=f.load();const other={};f.doc.activeElement=other;gate.resolve(page(12,1,false));await loading;
  assert.equal(f.doc.activeElement,other);
  const empty=fixture(async()=>page(0,0,false));await empty.ready;assert.equal(empty.status.textContent,empty.copy.empty);assert.equal(empty.button.hidden,true);
});
test('meeting markup has labelled native pagination, focusable headings and escaped private text',()=>{
  const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  for(const lang of ['uk','ru','en']){
    const copy=meetingHistoryCopy(lang);assert.match(meetingHistoryMarkup(copy),/type="button" data-meeting-more disabled/);assert.match(meetingHistoryMarkup(copy),/role="status"/);
    const html=meetingRowsMarkup([{...row('s'),reflection:'<img onerror=alert(1)>',participant_count:null}],{copy,esc,titleFor:()=>'<Genesis>'});
    assert.match(html,/h3 tabindex="-1" data-meeting-heading/);assert.ok(!html.includes('<img'));assert.ok(html.includes('&lt;Genesis&gt;'));assert.ok(!html.includes('null'));
  }
});


test('history mounts each correction form once and updates the matching displayed meeting after saving',async()=>{
  const reflection={textContent:'Old',hidden:false},attendanceView={textContent:'4 participants'};
  const article={querySelector:s=>s==='[data-meeting-reflection]'?reflection:attendanceView};
  const note={value:'Old'},attendance={value:'4'},save={focus(){}},reload={focus(){}},status={textContent:''};
  const form={isConnected:true,ownerDocument:{body:{}},dataset:{meetingNoteId:'0',meetingSnapshot:JSON.stringify({reflection:'Old',participantCount:4})},closest:()=>article,querySelector:s=>({'[name="reflection"]':note,'[name="participantCount"]':attendance,'[type="submit"]':save,'[data-notes-reload]':reload,'[data-notes-status]':status}[s])};
  let reads=0;
  const f=fixture(async(action,method,body)=>action==='meeting-notes'?{ok:true,notes:body.notes}:++reads===1?page(0):page(12,1,false),{forms:[form]});
  await f.ready;assert.equal(typeof form.onsubmit,'function');const firstHandler=form.onsubmit;
  note.value='New discussion';await f.load();assert.equal(form.onsubmit,firstHandler,'loading older records must not rebind or reset existing edits');
  attendance.value='9';await form.onsubmit({preventDefault(){}});
  assert.equal(reflection.textContent,'New discussion');assert.equal(attendanceView.textContent,'9 participants · ');
  note.value='';attendance.value='';await form.onsubmit({preventDefault(){}});
  assert.equal(reflection.hidden,true);assert.equal(attendanceView.textContent,'');
});


const invalidDates=['0000-01-01','2026-00-01','2026-13-01','2026-01-00',
  '2026-01-32','2025-02-29','2024-02-30','1900-02-29','2026-04-31',
  '2026-11-31','2026-06-31','2026-09-31'];
const invalidBooks=['GEN ',' GEN','X'.repeat(65),'X'.repeat(256),
  'X'.repeat(1024),'X'.repeat(4096),'  GEN  ','GEN\t','GEN\n',
  '0'.repeat(66),'1'.repeat(70),'a'.repeat(101)];
const oversizedReflections=[1201,1202,1300,1500,2000,3000,4096,8192,16384,32000];
const invalidMeetingRows=[
  ...invalidDates.map(meeting_date=>({meeting_date})),
  ...invalidBooks.map(book_id=>({book_id})),
  ...oversizedReflections.map(n=>({reflection:'X'.repeat(n)})),
];
for(const [index,mutation] of invalidMeetingRows.entries()){
  test('meeting history rejects malformed/oversized server row '+(index+1),async()=>{
    let calls=0;
    const f=fixture(async()=>++calls===1?page(0):{
      sessions:[{...row('new'),...mutation}],nextCursor:null,
    });
    await f.ready;
    await f.load();
    assert.equal(f.headings.length,12,'untrusted row must not enter existing private DOM');
    assert.equal(f.status.textContent,f.copy.error);
    assert.equal(f.button.disabled,false,'user can retry when backend recovers');
  });
}
for(const validDate of ['2024-02-29','2000-02-29','2026-10-28','1900-02-28']){
  test('meeting history preserves real Gregorian date '+validDate,async()=>{
    const f=fixture(async()=>({sessions:[{...row('good'),meeting_date:validDate}],nextCursor:null}));
    await f.ready;
    assert.equal(f.headings.length,1);
    assert.match(f.status.textContent,/1/);
  });
}
