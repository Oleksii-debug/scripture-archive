import test from 'node:test';
import assert from 'node:assert/strict';
import {meetingHistoryCopy,mountMeetingHistory} from '../public/group-meeting-history.js';

const row=(id,reflection='PRIVATE_MEETING_REFLECTION')=>({
  id,book_id:'GEN',chapter:12,meeting_date:'2026-10-30',
  answers_correct:1,answers_total:2,participant_count:3,reflection,
});
const page=(id,reflection)=>({sessions:[row(id,reflection)],nextCursor:null});
function deferred(){
  let resolve,reject;
  const promise=new Promise((ok,fail)=>{resolve=ok;reject=fail;});
  return {promise,resolve,reject};
}
function fixture(request){
  let valid=true,reads=0;
  const view=new EventTarget();
  const doc={body:{},defaultView:view};
  doc.activeElement=doc.body;
  const button={disabled:false,hidden:false,onclick:null,textContent:'',focus(){doc.activeElement=this;}};
  const status={textContent:'',focus(){doc.activeElement=this;}};
  const list={
    html:'',headings:[],
    set textContent(value){
      assert.equal(value,'');
      this.html='';
      this.headings=[];
    },
    insertAdjacentHTML(_where,markup){
      this.html+=markup;
      this.headings.push({focus(){doc.activeElement=this;}});
    },
    querySelectorAll(){return this.headings;},
  };
  const root={ownerDocument:doc,isConnected:true,querySelector(selector){
    return {'[data-meeting-list]':list,'[data-meeting-more]':button,'[data-meeting-status]':status}[selector];
  }};
  const copy=meetingHistoryCopy('en');
  const control=mountMeetingHistory(root,{
    request:(...args)=>{reads++;return request(...args);},
    groupId:'g',copy,isCurrent:()=>valid,
    renderRows:rows=>rows.map(item=>item.reflection??'NO_PRIVATE_NOTE').join(' '),
  });
  return {
    ...control,root,view,doc,button,status,list,copy,
    get reads(){return reads;},
    invalid(){valid=false;},
    pagehide(){view.dispatchEvent(new Event('pagehide'));},
    pageshow(){view.dispatchEvent(new Event('pageshow'));},
    click(){return button.onclick?.();},
  };
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('pagehide immediately clears member-only meeting text from mounted BFCache DOM',async()=>{
  const f=fixture(async()=>page('one','PRIVATE_MEETING_REFLECTION'));
  await f.ready;
  assert.match(f.list.html,/PRIVATE_MEETING_REFLECTION/);
  f.pagehide();
  assert.equal(f.list.html,'');
  assert.equal(f.button.hidden,true);
  assert.equal(f.button.disabled,true);
  await f.click();
  assert.equal(f.reads,1,'hidden page must not send a meeting request');
  f.destroy();
});

test('pageshow reads new server authority rather than resurrecting previous private history',async()=>{
  let counter=0;
  const f=fixture(async()=>++counter===1?page('old','OLD_PRIVATE_NOTE'):page('new','NEW_AUTHORIZED_NOTE'));
  await f.ready;
  f.pagehide();
  f.pageshow();
  await tick();
  assert.equal(f.reads,2);
  assert.doesNotMatch(f.list.html,/OLD_PRIVATE_NOTE/);
  assert.match(f.list.html,/NEW_AUTHORIZED_NOTE/);
  f.destroy();
});

test('old deferred page response never repaints private text after a new pageshow',async()=>{
  const old=deferred();
  let n=0;
  const f=fixture(()=>++n===1?old.promise:Promise.resolve(page('new','CURRENT_NOTE')));
  f.pagehide();
  f.pageshow();
  await tick();
  assert.match(f.list.html,/CURRENT_NOTE/);
  old.resolve(page('old','OLD_PRIVATE_NOTE'));
  await f.ready;
  assert.match(f.list.html,/CURRENT_NOTE/);
  assert.doesNotMatch(f.list.html,/OLD_PRIVATE_NOTE/);
  assert.equal(f.button.hidden,true,'new final page stays complete');
  f.destroy();
});

test('a late previous finally cannot unlock a new in-flight request',async()=>{
  const old=deferred(),fresh=deferred();
  let n=0;
  const f=fixture(()=>++n===1?old.promise:fresh.promise);
  f.pagehide();
  f.pageshow();
  assert.equal(f.reads,2);
  old.resolve(page('old','REVOKED_NOTE'));
  await f.ready;
  assert.equal(f.button.disabled,true,'new request still in flight');
  await f.click();
  assert.equal(f.reads,2,'no duplicate concurrent request');
  fresh.resolve(page('new','FRESH_NOTE'));
  await tick();
  assert.match(f.list.html,/FRESH_NOTE/);
  assert.doesNotMatch(f.list.html,/REVOKED_NOTE/);
  f.destroy();
});

test('rejected fresh session does not revive older meeting reflections',async()=>{
  let count=0;
  const f=fixture(async()=>{
    if(++count===1)return page('old','OLD_MEMBER_REFLECTION');
    throw Error('authentication_required');
  });
  await f.ready;
  f.pagehide();
  f.pageshow();
  await tick();
  assert.equal(f.list.html,'');
  assert.equal(f.status.textContent,f.copy.expired);
  assert.equal(f.button.hidden,true);
  f.destroy();
});

test('pageshow after route or principal replacement leaves history empty and makes no new request',async()=>{
  const f=fixture(async()=>page('old','PRIVATE_REFLECTION'));
  await f.ready;
  f.pagehide();
  f.invalid();
  f.pageshow();
  await tick();
  assert.equal(f.reads,1);
  assert.equal(f.list.html,'');
  f.destroy();
});

test('destroy retires private DOM and unregisters lifecycle listeners',async()=>{
  const f=fixture(async()=>page('old','PRIVATE_REFLECTION'));
  await f.ready;
  f.destroy();
  assert.equal(f.list.html,'');
  assert.equal(f.button.onclick,null);
  f.pageshow();
  f.pagehide();
  await tick();
  assert.equal(f.reads,1);
  assert.equal(f.list.html,'');
  f.destroy();
});

test('deferred old-request rejection after pagehide cannot reveal stale error on re-authorized page',async()=>{
  const old=deferred();
  let n=0;
  const f=fixture(()=>++n===1?old.promise:Promise.resolve(page('new','NEW_NOTE')));
  f.pagehide();
  f.pageshow();
  await tick();
  old.reject(Error('groups_unavailable'));
  await f.ready;
  assert.match(f.list.html,/NEW_NOTE/);
  assert.notEqual(f.status.textContent,f.copy.error);
  f.destroy();
});
