import test from 'node:test';
import assert from 'node:assert/strict';
import {meetingNotesCopy,meetingNotesMarkup,mountMeetingNotes} from '../public/group-meeting-notes.js';
const original={reflection:'Saved notes',participantCount:4};
function fixture(request,{snapshot=original,confirmation=true}={}){
  let current=true;const requests=[],saved=[],confirmations=[];
  const doc={body:{}};
  const note={value:'Saved notes'},attendance={value:'4'},save={focus(){doc.activeElement=this;}},reload={focus(){doc.activeElement=this;}},status={textContent:''};doc.activeElement=save;
  const form={isConnected:true,ownerDocument:doc,dataset:{meetingNoteId:'s',meetingSnapshot:typeof snapshot==='string'?snapshot:JSON.stringify(snapshot)},querySelector:s=>({'[name="reflection"]':note,'[name="participantCount"]':attendance,'[type="submit"]':save,'[data-notes-reload]':reload,'[data-notes-status]':status}[s])};
  const copy=meetingNotesCopy('en');
  mountMeetingNotes(form,{request:async(...args)=>{requests.push(args);return request(...args);},groupId:'g',copy,isCurrent:()=>current,confirm:message=>{confirmations.push(message);return confirmation;},onSaved:value=>saved.push({...value})});
  return {form,doc,note,attendance,save,reload,status,copy,requests,saved,confirmations,switchAccount(){current=false;},submit:()=>form.onsubmit({preventDefault(){}})};
}
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
test('meeting correction sends the exact prior snapshot, preserves text and updates display only after acknowledgement',async()=>{
  const f=fixture(async(_a,_m,body)=>({ok:true,notes:body.notes}));
  f.note.value='  Full notes\nSecond line  ';f.attendance.value='7';await f.submit();
  assert.deepEqual(f.requests[0][2],{groupId:'g',sessionId:'s',expected:original,notes:{reflection:f.note.value,participantCount:7}});
  assert.equal(f.status.textContent,f.copy.saved);assert.equal(f.doc.activeElement,f.save);assert.equal(f.saved.length,1);
  f.note.value='';f.attendance.value='';await f.submit();assert.deepEqual(f.requests[1][2].expected,f.saved[0]);assert.deepEqual(f.saved[1],{reflection:null,participantCount:null});
});
test('conflicts and uncertain saves keep the draft and require explicit reload before another write',async()=>{
  for(const error of ['meeting_notes_changed_or_forbidden','database_unavailable','malformed']){
    const f=fixture(async(_a,method)=>{if(method==='GET')return {notes:original};if(error==='malformed')return {ok:true,notes:{...original,reflection:'Other'}};throw Error(error);});
    f.note.value='Unsaved draft';await f.submit();assert.equal(f.note.value,'Unsaved draft');assert.equal(f.save.disabled,true);assert.equal(f.doc.activeElement,f.reload);assert.equal(f.saved.length,0);
    await f.submit();assert.equal(f.requests.length,1);
    await f.reload.onclick();assert.equal(f.confirmations.length,1);assert.equal(f.note.value,'Saved notes');assert.equal(f.save.disabled,false);assert.equal(f.saved.length,1);
  }
});
test('reload cancellation protects drafts, and malformed snapshots can recover without fabricated previous values',async()=>{
  const f=fixture(async()=>({notes:original}),{confirmation:false});f.note.value='Draft';await f.reload.onclick();assert.equal(f.requests.length,0);assert.equal(f.note.value,'Draft');
  const g=fixture(async()=>({notes:original}),{snapshot:'broken json'});assert.equal(g.save.disabled,true);await g.submit();assert.equal(g.requests.length,0);
  await g.reload.onclick();assert.equal(g.save.disabled,false);assert.equal(g.note.value,'Saved notes');
});
test('invalid attendance and overlong notes never issue a write',async()=>{
  for(const value of ['0','501','1.5','abc','1e2']){
    const f=fixture(async()=>{throw Error('unexpected');});f.attendance.value=value;await f.submit();assert.equal(f.requests.length,0);assert.equal(f.status.textContent,f.copy.invalid);
  }
  const f=fixture(async()=>{throw Error('unexpected');});f.note.value='x'.repeat(1201);await f.submit();assert.equal(f.requests.length,0);
});
test('duplicate clicks and old account controls cannot write or restore delayed notes',async()=>{
  const gate=deferred();const f=fixture(async()=>gate.promise);f.note.value='Draft';const saving=f.submit();await f.submit();assert.equal(f.requests.length,1);
  f.switchAccount();gate.resolve({ok:true,notes:{reflection:'Draft',participantCount:4}});await saving;assert.equal(f.saved.length,0);assert.notEqual(f.status.textContent,f.copy.saved);
  await f.reload.onclick();await f.submit();assert.equal(f.requests.length,1);
  const read=deferred();const g=fixture(async()=>read.promise);const loading=g.reload.onclick();g.form.isConnected=false;read.resolve({notes:{reflection:'Later',participantCount:1}});await loading;assert.equal(g.note.value,'Saved notes');
});
test('correction and reload do not steal focus when the user moves to another control',async()=>{
  for(const action of ['save','reload']){
    const gate=deferred();const f=fixture(async()=>gate.promise);f.doc.activeElement=action==='save'?f.save:f.reload;
    const loading=action==='save'?f.submit():f.reload.onclick();const other={};f.doc.activeElement=other;gate.resolve({ok:true,notes:original});await loading;
    assert.equal(f.doc.activeElement,other);
  }
});
test('only editable meetings expose native correction forms and snapshots safely escape text',()=>{
  const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  for(const lang of ['uk','ru','en']){
    const copy=meetingNotesCopy(lang),session={id:'s',canEdit:true,reflection:'</textarea><script>bad</script>\r\n',participant_count:null};
    const html=meetingNotesMarkup(session,copy,esc);assert.ok(!html.includes('<script>'));assert.match(html,/data-meeting-snapshot=/);assert.match(html,/maxlength="1200"/);assert.match(html,/type="number" min="1" max="500"/);assert.match(html,/role="status"/);
    assert.equal(meetingNotesMarkup({...session,canEdit:false},copy,esc),'');
  }
});
