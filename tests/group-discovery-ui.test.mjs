import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mountGroupDiscovery} from '../public/group-discovery.js';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const group=id=>({id,name:'Group '+id,visibility:'public'});
function fixture(){
 const saved=globalThis.fetch,calls=[];let current=true,handler=async()=>Response.json({groups:[],nextCursor:null});
 const input={value:''},format={value:''},button={},more={hidden:true},status={textContent:''};
 const doc={activeElement:null},heading={focus(){doc.activeElement=this;}};
 const results={innerHTML:'',insertAdjacentHTML(_at,html){this.innerHTML+=html;},querySelector:()=>heading};
 const form={querySelector:s=>({input,select:format,button}[s])};
 const root={isConnected:true,ownerDocument:doc,innerHTML:'',querySelector:s=>({form,'.group-discovery-status':status,'.group-discovery-results':results,'.group-discovery-more':more}[s])};
 globalThis.fetch=async(url,options)=>{const body=JSON.parse(options.body);calls.push({url,body});return handler(body);};
 return {root,input,format,button,more,status,results,doc,heading,calls,setHandler:fn=>handler=fn,retire:()=>current=false,async mount(){await mountGroupDiscovery(root,'en',String,g=>'<article>'+g.id+'</article>',()=>current);},async search(){form.onsubmit({preventDefault(){}});await tick();},restore(){globalThis.fetch=saved;}};
}
test('group directory combines query and format, retains submitted filters for pagination, and focuses results',async()=>{
 const f=fixture();try{
  f.setHandler(async b=>Response.json({groups:[group(b.cursor?'second':'first')],nextCursor:b.cursor?null:'first'}));await f.mount();
  assert.match(f.root.innerHTML,/Private groups and invitation codes are not searched/);
  f.input.value='Київ';f.format.value='true';f.doc.activeElement=f.button;await f.search();assert.equal(f.doc.activeElement,f.heading);
  f.input.value='Other';f.format.value='false';f.doc.activeElement=f.more;f.more.onclick();await tick();
  assert.deepEqual(f.calls.at(-1),{url:'/api/groups?action=directorySearch',body:{query:'Київ',marathon:true,cursor:'first'}});
  assert.match(f.results.innerHTML,/first/);assert.match(f.results.innerHTML,/second/);assert.equal(f.more.hidden,true);assert.equal(f.doc.activeElement,f.heading);
  await f.search();assert.equal(f.calls.at(-1).body.query,'Other');assert.equal(f.calls.at(-1).body.marathon,false);assert.doesNotMatch(f.results.innerHTML,/second/);
 }finally{f.restore();}
});
test('failed continuation is retryable with the same cursor; repeated clicks issue a single read',async()=>{
 const f=fixture();try{
  f.setHandler(async()=>Response.json({groups:[group('one')],nextCursor:'one'}));await f.mount();
  let resolve;f.setHandler(()=>new Promise(done=>resolve=done));f.more.onclick();f.more.onclick();assert.equal(f.calls.length,2);resolve(Response.json({error:'unavailable'},{status:503}));await tick();assert.match(f.status.textContent,/Could not load/);assert.match(f.results.innerHTML,/one/);assert.equal(f.more.hidden,false);
  f.setHandler(async()=>Response.json({groups:[group('two')],nextCursor:null}));f.more.onclick();await tick();assert.equal(f.calls.at(-1).body.cursor,'one');assert.match(f.results.innerHTML,/two/);
 }finally{f.restore();}
});
test('new query, retired principal and detached directory suppress late responses',async()=>{
 for(const change of ['query','principal','detached']){
  const f=fixture();try{await f.mount();let resolve;f.setHandler(()=>new Promise(done=>resolve=done));f.input.value='old';await f.search();
   if(change==='query'){f.setHandler(async()=>Response.json({groups:[group('new')],nextCursor:null}));f.input.value='new';await f.search();}
   if(change==='principal')f.retire();if(change==='detached')f.root.isConnected=false;
   resolve(Response.json({groups:[group('stale')],nextCursor:null}));await tick();assert.doesNotMatch(f.results.innerHTML,/stale/);if(change==='query')assert.match(f.results.innerHTML,/new/);
  }finally{f.restore();}
 }
});
test('malformed pages and cyclic cursors do not append cards or steal moved focus',async()=>{
 const f=fixture();try{
  f.setHandler(async()=>Response.json({groups:[group('one')],nextCursor:'one'}));await f.mount();const before=f.results.innerHTML;
  for(const payload of [{groups:[{...group('private'),visibility:'private'}],nextCursor:null},{groups:[{...group('invite'),inviteCode:'secret'}],nextCursor:null},{groups:[group('repeat')],nextCursor:'one'}]){
   f.setHandler(async()=>Response.json(payload));f.more.onclick();await tick();assert.equal(f.results.innerHTML,before);assert.match(f.status.textContent,/Could not load/);
  }
  let resolve;f.setHandler(()=>new Promise(done=>resolve=done));f.doc.activeElement=f.more;f.more.onclick();const elsewhere={};f.doc.activeElement=elsewhere;resolve(Response.json({groups:[group('two')],nextCursor:null}));await tick();assert.equal(f.doc.activeElement,elsewhere);
 }finally{f.restore();}
});
test('canonical group page mounts search inside a separate directory region',()=>{
 const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');assert.match(source,/import \{mountGroupDiscovery\} from '\.\/group-discovery.js'/);assert.match(source,/id="group-discovery"/);assert.match(source,/mountGroupDiscovery\(discovery,state.lang,esc,groupCard,\(\)=>groupPageCurrent\("groups",principal\)\)/);
});
