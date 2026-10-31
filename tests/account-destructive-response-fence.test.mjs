import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const start=source.indexOf('function renderAccount() {');
const end=source.indexOf('\nlet editorViewEpoch',start);
assert.ok(start>=0&&end>start);
const accountSource=source.slice(start,end);
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject};}
function fixture(){
  const alice={id:'alice',email:'alice@example.test',firstName:'Alice',lastName:'A',profileComplete:true,authProvider:'password',visibility:{}}, bob={id:'bob',email:'bob@example.test',profileComplete:true};
  const state={user:alice,lang:'en',sessionUnavailable:false};
  const controls=Object.fromEntries(['#logout-button','#visibility-form','#password-form','#delete-form','#sensitive-form','#login-form','#forgot-form','#register-form'].map(id=>[id,{id}]));
  const status={textContent:''};
  const doc={querySelector(selector){
    if(selector==='.profile-controls')return {insertAdjacentHTML(){}};
    if(['#password-state','#delete-state','#sensitive-state','#visibility-state','#account-logout-state'].includes(selector))return status;
    return controls[selector]??null;
  }};
  const pending=deferred(),profile=deferred(),calls=[];
  controls['#sensitive-form'].elements={tradition:{value:'x'},denomination:{value:'x'},church:{value:'x'}};
  const ctx=vm.createContext({state,document:doc,location:{search:''},URLSearchParams,
    ACCOUNT_OPTIONS:{en:{religion:[]}},
    t:key=>key,esc:String,options:()=>'',field:()=>'',setActiveNav:()=>{},shell:()=>calls.push('shell'),
    authRequest:(action)=>{calls.push(action);return pending.promise},accountRequest:(action)=>{calls.push(action);return profile.promise},route:()=>{calls.push('route')},
    clearPersonalProgress:()=>calls.push('clear'),
    FormData:class {constructor(form){this.form=form}get(name){return this.form[name]??'password'}*[Symbol.iterator](){yield ['currentPassword','password'];yield ['newPassword','newpassword']}has(name){return name==='confirm'}},
  });
  vm.runInContext(accountSource,ctx);ctx.renderAccount();calls.length=0;
  return {ctx,state,alice,bob,controls,status,pending,profile,calls};
}
for(const action of ['delete','password','logout']){
  test(`late ${action} success does not clear or redraw a later principal`,async()=>{
    const h=fixture();
    const control=h.controls[action==='delete'?'#delete-form':action==='password'?'#password-form':'#logout-button'];
    const event={preventDefault(){},currentTarget:control};
    const operation=action==='logout'?control.onclick(event):control.onsubmit(event);
    h.state.user=h.bob;h.pending.resolve({ok:true});await operation;
    assert.equal(h.state.user,h.bob);
    assert.equal(h.calls.includes('clear'),false);
    assert.equal(h.calls.includes('shell'),false);
  });
}

for(const action of ['delete','password','logout']){
  test(`current ${action} success clears its own in-tab progress`,async()=>{
    const h=fixture(),control=h.controls[action==='delete'?'#delete-form':action==='password'?'#password-form':'#logout-button'];
    const event={preventDefault(){},currentTarget:control};
    const operation=action==='logout'?control.onclick(event):control.onsubmit(event);
    h.pending.resolve({ok:true});await operation;
    assert.equal(h.state.user,null);assert.ok(h.calls.includes('clear'));assert.ok(h.calls.includes('shell'));
  });
}
// An HTTP 200 alone is not proof that the destructive D1 batch committed.
// The canonical API returns an explicit {ok:true} only after every receipt.
for (const [name, receipt] of [
  ['missing body', undefined],
  ['null body', null],
  ['empty object', {}],
  ['explicit false', {ok:false}],
  ['numeric ok', {ok:1}],
  ['provider error', {error:'deletion_failed'}],
  ['array body', []],
]) {
  test(`account deletion rejects unconfirmed successful HTTP reply: ${name}`, async () => {
    const h = fixture(), control = h.controls['#delete-form'];
    const operation = control.onsubmit({preventDefault(){},currentTarget:control});
    h.pending.resolve(receipt);
    await operation;
    assert.equal(h.state.user,h.alice,'do not claim account deletion');
    assert.equal(h.calls.includes('clear'),false,'preserve private local progress');
    assert.match(h.status.textContent,/could not be completed/i);
  });
}

test('late unconfirmed deletion response cannot change another principal or announce failure', async () => {
  const h=fixture(),control=h.controls['#delete-form'];
  const operation=control.onsubmit({preventDefault(){},currentTarget:control});
  h.state.user=h.bob;
  h.pending.resolve({});
  await operation;
  assert.equal(h.state.user,h.bob);
  assert.equal(h.calls.includes('clear'),false);
  assert.equal(h.status.textContent,'');
});

// Durable session revocation and password rotation return {ok:true} from the
// canonical auth API; a bare HTTP 2xx is not evidence that either took effect.
for (const action of ['password','logout']) {
  for (const [name,receipt] of [
    ['missing body',undefined],
    ['null body',null],
    ['empty object',{}],
    ['explicit false',{ok:false}],
    ['numeric ok',{ok:1}],
    ['error envelope',{error:'unconfirmed'}],
    ['array body',[]],
  ]) {
    test(`${action} refuses unconfirmed success envelope: ${name}`,async()=>{
      const h=fixture(),control=h.controls[action==='password'?'#password-form':'#logout-button'];
      const operation=action==='logout'?control.onclick():control.onsubmit({preventDefault(){},currentTarget:control});
      h.pending.resolve(receipt);
      await operation;
      assert.equal(h.state.user,h.alice,'unconfirmed exit must not assert a signed-out account');
      assert.equal(h.calls.includes('clear'),false,'private cached progress cannot be discarded');
      assert.match(h.status.textContent,/could not be completed/i);
    });
  }
  test(`late unconfirmed ${action} response cannot overwrite a new principal`,async()=>{
    const h=fixture(),control=h.controls[action==='password'?'#password-form':'#logout-button'];
    const operation=action==='logout'?control.onclick():control.onsubmit({preventDefault(){},currentTarget:control});
    h.state.user=h.bob;
    h.pending.resolve({});
    await operation;
    assert.equal(h.state.user,h.bob);
    assert.equal(h.calls.includes('clear'),false);
    assert.equal(h.status.textContent,'');
  });
}

for(const action of ['delete','password','logout']){
  test(`detached ${action} control cannot issue a request`,async()=>{
    const h=fixture(),key=action==='delete'?'#delete-form':action==='password'?'#password-form':'#logout-button',control=h.controls[key];
    h.controls[key]=null;
    const event={preventDefault(){},currentTarget:control};
    await (action==='logout'?control.onclick(event):control.onsubmit(event));
    assert.deepEqual(h.calls,[]);assert.equal(h.state.user,h.alice);
  });
}
for(const action of ['delete','password']){
  test(`late ${action} failure cannot announce into a later account`,async()=>{
    const h=fixture(),control=h.controls[action==='delete'?'#delete-form':'#password-form'];
    const operation=control.onsubmit({preventDefault(){},currentTarget:control});
    h.state.user=h.bob;h.pending.reject(Error('network failure'));await operation;
    assert.equal(h.status.textContent,'');assert.equal(h.state.user,h.bob);
  });
}
test('successful exit after navigating away refreshes the current route, not the old dashboard',async()=>{
  const h=fixture(),control=h.controls['#delete-form'];
  const operation=control.onsubmit({preventDefault(){},currentTarget:control});
  h.controls['#logout-button']=null;h.pending.resolve({ok:true});await operation;
  assert.equal(h.state.user,null);assert.ok(h.calls.includes('clear'));assert.ok(h.calls.includes('route'));assert.equal(h.calls.includes('shell'),false);
});
for(const [key,action] of [['#visibility-form','visibility'],['#sensitive-form','sensitive-consent']]){
  test(`late ${action} response cannot restore the previous profile`,async()=>{
    const h=fixture(),control=h.controls[key];
    const operation=control.onsubmit({preventDefault(){},currentTarget:control});
    h.state.user=h.bob;h.profile.resolve({user:{...h.alice}});await operation;
    assert.equal(h.state.user,h.bob);assert.equal(h.status.textContent,'');
  });
  test(`same-account ${action} update preserves access to dashboard controls`,async()=>{
    const h=fixture(),control=h.controls[key];
    const operation=control.onsubmit({preventDefault(){},currentTarget:control});
    const refreshed={...h.alice};h.profile.resolve({user:refreshed});await operation;
    assert.equal(h.state.user,refreshed);
    const logout=h.controls['#logout-button'];const exit=logout.onclick();
    h.pending.resolve({ok:true});await exit;
    assert.equal(h.state.user,null);assert.ok(h.calls.includes('clear'));
  });
}

test('session uncertainty while an exit is pending preserves cached progress',async()=>{
  const h=fixture(),control=h.controls['#delete-form'];
  const operation=control.onsubmit({preventDefault(){},currentTarget:control});
  h.state.sessionUnavailable=true;h.pending.resolve({ok:true});await operation;
  assert.equal(h.state.user,h.alice);assert.equal(h.calls.includes('clear'),false);assert.equal(h.calls.includes('shell'),false);
});
for(const [key,action] of [['#visibility-form','visibility'],['#sensitive-form','sensitive-consent']]){
  test(`${action} rejects a successful envelope containing a different identity`,async()=>{
    const h=fixture(),control=h.controls[key];
    const operation=control.onsubmit({preventDefault(){},currentTarget:control});
    h.profile.resolve({user:h.bob});await operation;
    assert.equal(h.state.user,h.alice);assert.match(h.status.textContent,/could not be completed/i);
  });
}

test('current logout failure announces the error and preserves its account and progress',async()=>{
  const h=fixture(),control=h.controls['#logout-button'];
  const operation=control.onclick();h.pending.reject(Error('unconfirmed revocation'));await operation;
  assert.equal(h.state.user,h.alice);assert.equal(h.calls.includes('clear'),false);assert.match(h.status.textContent,/could not be completed/i);
});
test('late logout failure cannot announce into a later account',async()=>{
  const h=fixture(),control=h.controls['#logout-button'];
  const operation=control.onclick();h.state.user=h.bob;h.pending.reject(Error('unconfirmed revocation'));await operation;
  assert.equal(h.state.user,h.bob);assert.equal(h.status.textContent,'');assert.equal(h.calls.includes('clear'),false);
});
