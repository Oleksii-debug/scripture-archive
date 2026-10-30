import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Execute the real renderGroups implementation without introducing a second
// group creation view. The backend already supports marathon registration.
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const begin=app.indexOf('async function renderGroups() {');
const end=app.indexOf('\nasync function renderGroup(',begin);
assert.ok(begin>=0 && end>begin,'use the canonical real group route');
const liveSource=app.slice(begin,end);
const buildRoute=new Function('deps',
  'const {state,setActiveNav,groupRequest,groupPageCurrent,t,field,shell,groupCard,document,FormData,announce,navigateTo}=deps;\n'+
  liveSource+'\nreturn renderGroups;');

async function routeScenario({language='uk',mode='regular',profileComplete=true}={}) {
  let html='',request=null,navigated=null;
  const control={isConnected:true,onsubmit:null,mode};
  const document={querySelector(selector){
    if(selector==='#group-form'&&profileComplete)return control;
    return null;
  }};
  const FormData=class {
    constructor(element){
      assert.equal(element,control);
      this.values=new Map([
        ['name','Study group'],
        ['visibility','public'],
        ['rosterVisibility','count'],
        ['weeklyGoal','3'],
        ['catchupMode','steady'],
        ['groupMode',element.mode],
      ]);
    }
    [Symbol.iterator](){return this.values[Symbol.iterator]();}
    get(name){return this.values.get(name)??null;}
    has(name){return this.values.has(name);}
  };
  const state={lang:language,user:{id:'owner',profileComplete}};
  const groupRequest=async(action,method,body)=>{
    if(method==='GET')return {groups:[]};
    request={action,method,body};
    return {ok:true,groupId:'created-group'};
  };
  const render=buildRoute({
    state,setActiveNav(){},groupRequest,
    groupPageCurrent:()=>true,
    t:key=>language+':'+key,
    field:(name,label)=>'<label>'+name+' '+label+'</label>',
    shell:markup=>{html=markup;},
    groupCard:()=>'',document,FormData,
    announce(){},navigateTo:to=>{navigated=to;},
  });
  await render();
  return {
    html,control,request:()=>request,navigated:()=>navigated,
    submit:async()=>{
      assert.equal(typeof control.onsubmit,'function');
      await control.onsubmit({currentTarget:control,preventDefault(){}});
      return request;
    },
  };
}

for(const lang of ['uk','ru','en']){
  test(lang+': existing group form exposes normal and marathon modes to keyboard/screen readers',async()=>{
    const f=await routeScenario({language:lang});
    assert.match(f.html,/<fieldset class="account-field full"><legend>/);
    assert.match(f.html,new RegExp(lang+':groupMode'));
    assert.match(f.html,/type="radio" name="groupMode" value="regular" checked/);
    assert.match(f.html,/type="radio" name="groupMode" value="marathon"/);
    for(const key of ['regularGroup','regularGroupNote','marathonGroup','marathonGroupNote'])
      assert.ok(f.html.includes(lang+':'+key),key);
  });

  test(lang+': ordinary group remains off by default and never joins marathon',async()=>{
    const f=await routeScenario({language:lang,mode:'regular'});
    const r=await f.submit();
    assert.equal(r.action,'create');
    assert.equal(r.method,'POST');
    assert.equal(r.body.marathonEnabled,false);
    assert.equal(typeof r.body.marathonEnabled,'boolean');
    assert.equal(Object.hasOwn(r.body,'groupMode'),false,
      'UI-only choice must not become another API authority');
    assert.equal(r.body.weeklyGoal,3);
    assert.equal(f.navigated(),'/groups/created-group');
  });

  test(lang+': explicit marathon opt-in reaches canonical server as boolean true',async()=>{
    const f=await routeScenario({language:lang,mode:'marathon'});
    const r=await f.submit();
    assert.equal(r.body.marathonEnabled,true);
    assert.equal(typeof r.body.marathonEnabled,'boolean');
    assert.equal(r.body.catchupMode,'steady');
    assert.equal(r.body.visibility,'public');
    assert.equal(f.navigated(),'/groups/created-group');
  });
}

test('incomplete profile does not get group creation or opt-in controls',async()=>{
  const f=await routeScenario({profileComplete:false});
  assert.doesNotMatch(f.html,/name="groupMode"/);
  assert.doesNotMatch(f.html,/id="group-form"/);
  assert.equal(f.control.onsubmit,null);
});

test('approved localized group-format labels exist in the shipped translation tables',()=>{
  for(const label of [
    'Приєднати групу до марафону',
    'Присоединить группу к марафону',
    'Join a group marathon',
  ])assert.ok(app.includes(label),label);
  assert.match(app,/marathonEnabled = form\.get\("groupMode"\) === "marathon"/);
});
