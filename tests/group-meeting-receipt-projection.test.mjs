import test from 'node:test';
import assert from 'node:assert/strict';
import {meetingNotesCopy, mountMeetingNotes} from '../public/group-meeting-notes.js';

function fixture({onSaved = () => {}, request} = {}) {
  let writes=0, reads=0, current=true, saveConfirmed=false;
  const doc={body:{}},note={value:'Original'},attendance={value:'4'};
  const save={disabled:false,focus() {doc.activeElement=this;}};
  const reload={disabled:false,focus() {doc.activeElement=this;}};
  const status={textContent:''};
  const fields={
    '[name="reflection"]':note,'[name="participantCount"]':attendance,
    '[type="submit"]':save,'[data-notes-reload]':reload,
    '[data-notes-status]':status
  };
  doc.activeElement=save;
  const form={isConnected:true,ownerDocument:doc,
    dataset:{meetingNoteId:'s1',meetingSnapshot:JSON.stringify({reflection:'Original',participantCount:4})},
    querySelector:selector=>fields[selector]};
  const handle=async(area,method,payload)=>{
    assert.equal(area,'meeting-notes');
    if(request)return request(area,method,payload);
    if(method==='POST'){
      writes++;saveConfirmed=true;return {ok:true,notes:payload.notes};
    }
    if(method==='GET'){reads++;return {notes:{reflection:'From server',participantCount:8}};}
    throw Error('unexpected method');
  };
  const copy=meetingNotesCopy('uk');
  mountMeetingNotes(form,{request:handle,groupId:'g1',copy,
    isCurrent:()=>current,confirm:()=>true,onSaved});
  return {form,note,attendance,save,reload,status,copy,
    count:()=>({writes,reads,saveConfirmed}),submit:()=>form.onsubmit({preventDefault(){}}),
    invalidate:()=>{current=false;}};
}

test('confirmed POST remains confirmed when optional meeting row rendering fails',async()=>{
  const f=fixture({onSaved(){throw Error('stale meeting row');}});
  f.note.value='Persisted amendment';f.attendance.value='6';
  await f.submit();
  assert.deepEqual(f.count(),{writes:1,reads:0,saveConfirmed:true});
  assert.equal(f.status.textContent,f.copy.savedDisplayStale);
  assert.notEqual(f.status.textContent,f.copy.error);
  assert.equal(f.save.disabled,false,'new confirmed snapshot remains editable');
  assert.deepEqual(JSON.parse(f.form.dataset.meetingSnapshot),{
    reflection:'Persisted amendment',participantCount:6});
  f.note.value='New edit';
  await f.submit();
  assert.equal(f.count().writes,2,'subsequent CAS uses acknowledged version');
});
test('confirmed GET restores form and trusted snapshot despite optional list projection exception',async()=>{
  const f=fixture({onSaved(){throw Error('detached row');}});
  f.note.value='unsaved user draft';
  await f.reload.onclick();
  assert.equal(f.count().reads,1);
  assert.equal(f.status.textContent,f.copy.loadedDisplayStale);
  assert.equal(f.note.value,'From server');
  assert.equal(f.attendance.value,'8');
  assert.equal(f.save.disabled,false);
  assert.deepEqual(JSON.parse(f.form.dataset.meetingSnapshot),{
    reflection:'From server',participantCount:8});
});
test('network write without confirmed receipt still fails closed',async()=>{
  const f=fixture({request:async()=>({ok:false,notes:{reflection:'Tampered',participantCount:2}}),
    onSaved(){throw Error('must never execute');}});
  f.note.value='New note';
  await f.submit();
  assert.equal(f.status.textContent,f.copy.error);
  assert.equal(f.save.disabled,true);
  assert.equal(f.note.value,'New note');
});
test('normal successful save still publishes once and uses original success label',async()=>{
  const published=[];
  const f=fixture({onSaved:notes=>published.push({...notes})});
  f.note.value='Valid';
  await f.submit();
  assert.equal(f.status.textContent,f.copy.saved);
  assert.deepEqual(published,[{reflection:'Valid',participantCount:4}]);
});
test('semantic stale-view notices exist for all three supported languages',()=>{
  for(const lang of ['uk','ru','en']){
    const text=meetingNotesCopy(lang);
    assert.equal(typeof text.savedDisplayStale,'string');
    assert.equal(typeof text.loadedDisplayStale,'string');
    assert.ok(text.savedDisplayStale.length>20);
    assert.ok(text.loadedDisplayStale.length>20);
    assert.notEqual(text.savedDisplayStale,text.error);
  }
});
