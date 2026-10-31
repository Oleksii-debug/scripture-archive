import test from 'node:test';
import assert from 'node:assert/strict';
import { mountGroupNamePrivacy,groupManagementMarkup,groupManagementCopy } from '../public/workspace.js';
function fixture(request,onSaved){
  let current=true;const checkbox={checked:false,disabled:true},save={disabled:true,focus(){this.focused=true;}},reload={disabled:false,focus(){this.focused=true;}},status={textContent:''};
  const controls={'[name="publicName"]':checkbox,'[type="submit"]':save,'[data-reload-name]':reload,'[data-name-status]':status};
  const form={isConnected:true,ownerDocument:{activeElement:save,body:{}},querySelector:selector=>controls[selector]};
  const copy=groupManagementCopy('en');const events=[];
  const controller=mountGroupNamePrivacy(form,{groupId:'g',copy,isCurrent:()=>current,onSaved,request:async(...args)=>{events.push(args);return request(...args);}});
  return {form,checkbox,save,reload,status,copy,events,...controller,switchAccount(){current=false;},submit:()=>form.onsubmit({preventDefault(){}})};
}
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};

test('name privacy reads the saved choice before allowing a write and restores submit focus',async()=>{
  const f=fixture(async(_action,method,body)=>method==='GET'?{publicName:true}:{ok:true,publicName:body.publicName});
  assert.equal(f.save.disabled,true);await f.ready;assert.equal(f.checkbox.checked,true);assert.equal(f.save.disabled,false);
  f.checkbox.checked=false;await f.submit();assert.deepEqual(f.events[1][2],{groupId:'g',publicName:false,expectedPublicName:true});
  assert.equal(f.status.textContent,f.copy.namePrivacySaved);assert.equal(f.save.focused,true);
});

test('failed or malformed name reads never default to granting or revoking consent',async()=>{
  for(const data of [{},{publicName:1},{publicName:'false'}]){
    const f=fixture(async()=>data);await f.ready;await f.submit();
    assert.equal(f.save.disabled,true);assert.equal(f.checkbox.disabled,true);assert.equal(f.events.length,1);assert.equal(f.status.textContent,f.copy.namePrivacyError);
  }
});

test('an uncertain name save preserves selection and requires explicit readback before retry',async()=>{
  for(const error of ['name_visibility_changed_or_membership_missing','database_unavailable','malformed']){
    let stored=false;
    const f=fixture(async(_action,method)=>{if(method==='GET')return {publicName:stored};stored=true;if(error==='malformed')return {};throw Error(error);});
    await f.ready;f.checkbox.checked=true;await f.submit();
    assert.equal(f.checkbox.checked,true);assert.equal(f.save.disabled,true);await f.submit();assert.equal(f.events.length,2);
    assert.notEqual(f.status.textContent,f.copy.namePrivacySaved);
    await f.reload.onclick();assert.equal(f.checkbox.checked,true);assert.equal(f.save.disabled,false);
  }
});

test('stale name controls and delayed responses never act on a replacement account',async()=>{
  const gate=deferred();const f=fixture(async()=>gate.promise);f.switchAccount();gate.resolve({publicName:true});await f.ready;
  assert.equal(f.checkbox.checked,false);assert.equal(f.save.disabled,true);await f.submit();await f.reload.onclick();assert.equal(f.events.length,1);
  const postGate=deferred();const g=fixture(async(_a,method)=>method==='GET'?{publicName:false}:postGate.promise);
  await g.ready;g.checkbox.checked=true;const saving=g.submit();await g.submit();assert.equal(g.events.length,2);
  g.switchAccount();postGate.resolve({ok:true,publicName:true});await saving;assert.notEqual(g.status.textContent,g.copy.namePrivacySaved);assert.notEqual(g.save.focused,true);
});

test('all members receive native name consent controls with no preselected grant',()=>{
  for(const language of ['uk','ru','en'])for(const membership of ['owner','facilitator','member']){
    const html=groupManagementMarkup({membership},language,String);
    assert.match(html,/name="publicName" type="checkbox" disabled/);assert.ok(!html.includes('type="checkbox" checked'));
    assert.match(html,/role="status" data-name-status/);assert.match(html,/<label class="account-check">/);
  }
  assert.equal(groupManagementMarkup({},'uk',String),'');
});


test('name save waits for roster refresh and suppresses late completion after account change',async()=>{
  const gate=deferred(),started=deferred();let refreshed=0;
  const f=fixture(async(_a,method,body)=>method==='GET'?{publicName:false}:{ok:true,publicName:body.publicName},async()=>{refreshed++;started.resolve();await gate.promise;});
  await f.ready;f.checkbox.checked=true;const saving=f.submit();await started.promise;
  assert.equal(refreshed,1);assert.notEqual(f.status.textContent,f.copy.namePrivacySaved);
  f.switchAccount();gate.resolve();await saving;assert.notEqual(f.status.textContent,f.copy.namePrivacySaved);
});


test('name-choice recovery keeps keyboard focus without stealing it after navigation',async()=>{
  for(const moved of [false,true]){
    const gate=deferred();let reads=0;
    const f=fixture(async(_a,method)=>{if(method==='GET'){if(++reads>1)return gate.promise;return {publicName:false};}throw Error('storage unavailable');});
    await f.ready;
    await f.submit();
    assert.equal(f.reload.focused,true,'failed save focuses the enabled recovery control');
    f.reload.focused=false;f.form.ownerDocument.activeElement=f.reload;
    const loading=f.reload.onclick();
    f.form.ownerDocument.activeElement=moved?{}:f.form.ownerDocument.body;
    gate.resolve({publicName:false});await loading;
    assert.equal(f.reload.focused,!moved,'reload restores focus only if disabling lost it');
  }
});
