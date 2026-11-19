import test from 'node:test';
import assert from 'node:assert/strict';
import {mountOwnMaterialPages,ownMaterialControls} from '../public/own-materials.js';
const row=id=>({id,title:'Material '+id,locale:'en',visibility:'private',data:{reference:'GEN 12'}});
const cursor=id=>({updatedAt:'2026-11-19 12:00:00',id});
function fixture(){
 const previous=globalThis.fetch;let current=true,hidden=false,binds=0;const requests=[];
 const doc={body:{},activeElement:null};doc.activeElement=doc.body;
 const more={isConnected:true,get hidden(){return hidden;},set hidden(value){hidden=value;if(value&&doc.activeElement===more)doc.activeElement=doc.body;}};
 const status={textContent:''},heading={focus(){doc.activeElement=this;}};
 const list={isConnected:true,innerHTML:'Original list',insertAdjacentHTML(_where,value){this.innerHTML+=value;},querySelector:()=>heading};
 const root={isConnected:true,ownerDocument:doc,querySelector:selector=>({'.own-material-more':more,'.own-material-status':status,'.material-list':list}[selector]||null)};
 const data={materials:[row('first')],nextCursor:cursor('first')},draft={title:'Unsaved working text'};
 mountOwnMaterialPages(root,data,'en',String,m=>`<article>${m.title}</article>`,()=>binds++,()=>current);
 return {root,doc,more,status,heading,list,data,draft,requests,get binds(){return binds;},retire(){current=false;},setFetch(fn){globalThis.fetch=async url=>{requests.push(url);return fn(url);};},restore(){globalThis.fetch=previous;}};
}
test('older draft pages append without replacing unsaved form and keep final-page keyboard focus',async()=>{
 const f=fixture();try{
  assert.match(ownMaterialControls('uk'),/Показати старіші матеріали/);
  f.setFetch(()=>Response.json({materials:[row('older')],nextCursor:cursor('older')}));f.doc.activeElement=f.more;await f.more.onclick();
  assert.match(f.list.innerHTML,/Original list.*Material older/);assert.equal(f.draft.title,'Unsaved working text');assert.equal(f.data.materials.length,2);assert.equal(f.binds,1);assert.equal(f.doc.activeElement,f.heading);
  assert.equal(new URL(f.requests[0],'https://example.invalid').searchParams.get('afterId'),'first');
  f.setFetch(()=>Response.json({materials:[row('last')],nextCursor:null}));f.doc.activeElement=f.more;await f.more.onclick();
  assert.equal(f.more.hidden,true);assert.equal(f.doc.activeElement,f.heading);assert.equal(f.data.materials.length,3);assert.match(f.status.textContent,/All your materials/);
 }finally{f.restore();}
});
test('page reads are single-flight and a failed read retries the same cursor without dropping existing records',async()=>{
 const f=fixture();try{
  let finish;f.setFetch(()=>new Promise(resolve=>finish=resolve));const pending=f.more.onclick();await f.more.onclick();assert.equal(f.requests.length,1);
  finish(Response.json({error:'unavailable'},{status:503}));await pending;assert.equal(f.list.innerHTML,'Original list');assert.equal(f.data.materials.length,1);assert.match(f.status.textContent,/Could not load/);
  f.setFetch(()=>Response.json({materials:[row('older')],nextCursor:null}));await f.more.onclick();assert.equal(f.requests[0],f.requests[1]);assert.equal(f.data.materials.length,2);
 }finally{f.restore();}
});
for(const retirement of ['identity','detached'])test('a late private page cannot append after '+retirement+' changes',async()=>{
 const f=fixture();try{let finish;f.setFetch(()=>new Promise(resolve=>finish=resolve));const pending=f.more.onclick();if(retirement==='identity')f.retire();else f.more.isConnected=false;finish(Response.json({materials:[row('private-older')],nextCursor:null}));await pending;assert.equal(f.list.innerHTML,'Original list');assert.equal(f.data.materials.length,1);assert.equal(f.binds,0);}finally{f.restore();}
});
test('a moved keyboard focus is preserved and duplicate records do not multiply cards',async()=>{
 const f=fixture();try{let finish;f.setFetch(()=>new Promise(resolve=>finish=resolve));f.doc.activeElement=f.more;const pending=f.more.onclick(),elsewhere={};f.doc.activeElement=elsewhere;finish(Response.json({materials:[row('first'),row('older'),row('older')],nextCursor:null}));await pending;assert.equal(f.data.materials.length,2);assert.equal(f.doc.activeElement,elsewhere);assert.equal((f.list.innerHTML.match(/Material older/g)||[]).length,1);}finally{f.restore();}
});
test('malformed and cyclic page receipts remain retryable and cannot advance the private catalogue',async()=>{
 for(const reply of [{materials:[],nextCursor:{id:'first',updatedAt:'2026-11-19 12:00:00'}},{materials:[row('older')]},{materials:[{...row('bad'),id:''}],nextCursor:null},{materials:Array.from({length:51},(_,i)=>row('overflow-'+i)),nextCursor:null}]){
  const f=fixture();try{f.setFetch(()=>Response.json(reply));await f.more.onclick();assert.equal(f.data.materials.length,1);assert.equal(f.list.innerHTML,'Original list');assert.equal(f.more.hidden,false);assert.match(f.status.textContent,/Could not load/);}finally{f.restore();}
 }
});
