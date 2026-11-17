import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {churchRouteId,renderChurchDetail} from '../public/church-directory.js';
import {churchEventFilter,renderEventDirectory} from '../public/event-directory.js';
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const item={id:'church-1',name:'Grace <Community>',city:'Kyiv',countryCode:'UA',locale:'uk',tradition:'other',websiteUrl:'https://example.invalid/',reviewedAt:'2026-11-17 12:00:00'};
const root=()=>({innerHTML:'',isConnected:true});

test('community route and event filter reject ambiguous, malformed and extra path components',()=>{
  assert.equal(churchRouteId('churches'),'');assert.equal(churchRouteId('churches/'),'');
  assert.equal(churchRouteId('churches/church-1/'),'church-1');
  for(const path of [null,'churches//church-1','churches/church-1/extra','churches/%2F','churches/'+ 'a'.repeat(101)])assert.equal(churchRouteId(path),null);
  assert.equal(churchEventFilter('?q=study'),'');assert.equal(churchEventFilter('?churchId=church-1&q=study'),'church-1');
  for(const search of ['?churchId=','?churchId=a&churchId=b','?churchId=a%2Fb','?churchId='+ 'a'.repeat(101)])assert.equal(churchEventFilter(search),null);
});

test('detail renders escaped approved fields, reciprocal navigation and a keyboard heading',async()=>{
  const original=globalThis.fetch,calls=[],r=root(),doc={activeElement:{}};r.ownerDocument=doc;
  const heading={focus(){doc.activeElement=this;}};r.querySelector=selector=>selector==='h1'?heading:null;
  globalThis.fetch=async url=>{calls.push(url);return Response.json({item:{...item,claimantEmail:'SECRET',verificationEvidence:'SECRET'}});};
  try{
    await renderChurchDetail(r,'uk',esc,item.id);
    assert.deepEqual(calls,['/api/churches?view=detail&id=church-1']);
    assert.match(r.innerHTML,/Grace &lt;Community&gt;/);assert.doesNotMatch(r.innerHTML,/SECRET|<Community>/);
    assert.match(r.innerHTML,/href="\/events\?churchId=church-1"/);assert.match(r.innerHTML,/href="\/churches"/);
    assert.match(r.innerHTML,/datetime="2026-11-17T12:00:00Z"/);assert.equal(doc.activeElement,heading);
  }finally{globalThis.fetch=original;}
});

test('missing and damaged details replace all old content and invalid routes make no request',async()=>{
  const original=globalThis.fetch,r=root();let calls=0,status=404,payload={item};
  globalThis.fetch=async()=>{calls++;return Response.json(payload,{status});};
  try{
    await renderChurchDetail(r,'en',esc,item.id);assert.match(r.innerHTML,/unavailable or its publication has been withdrawn/);assert.doesNotMatch(r.innerHTML,/events\?/);
    status=503;await renderChurchDetail(r,'en',esc,item.id);assert.match(r.innerHTML,/role="alert"/);assert.doesNotMatch(r.innerHTML,/Grace/);
    status=200;
    for(const damaged of [{...item,id:'other'},{...item,websiteUrl:'javascript:alert(1)'},{...item,reviewedAt:null},{...item,name:'Bad\u202eName'}]){
      payload={item:damaged};await renderChurchDetail(r,'en',esc,item.id);assert.match(r.innerHTML,/role="alert"/);assert.doesNotMatch(r.innerHTML,/events\?|javascript:/);
    }
    const before=calls;await renderChurchDetail(r,'en',esc,null);assert.equal(calls,before);
    await renderEventDirectory(r,'en',esc,null,()=>true,null);assert.equal(calls,before);assert.match(r.innerHTML,/href="\/events"/);
  }finally{globalThis.fetch=original;}
});

test('late detail replies cannot replace a new route or steal focus after user navigation',async()=>{
  const original=globalThis.fetch,r=root(),pending=[];let current=true;
  const doc={activeElement:{}};r.ownerDocument=doc;let focusCalls=0;r.querySelector=()=>({focus(){focusCalls++;}});
  globalThis.fetch=()=>new Promise(resolve=>pending.push(resolve));
  try{
    const old=renderChurchDetail(r,'en',esc,item.id);
    const next=renderChurchDetail(r,'en',esc,'church-2');
    doc.activeElement={};pending[1](Response.json({item:{...item,id:'church-2',name:'Second community'}}));await next;
    assert.equal(focusCalls,0);const markup=r.innerHTML;
    pending[0](Response.json({item}));await old;assert.equal(r.innerHTML,markup);
    const abandoned=renderChurchDetail(r,'en',esc,item.id,()=>current);current=false;r.innerHTML='New route';
    pending[2](Response.json({item}));await abandoned;assert.equal(r.innerHTML,'New route');
  }finally{globalThis.fetch=original;}
});

test('server metadata preserves community permalinks and invalid nested church routes return not found',async()=>{
  const source=readFileSync(new URL('../app/[...slug]/page.tsx',import.meta.url),'utf8');
  const exports={};const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(output,{exports,require(id){
    if(id==='next/navigation')return {notFound(){throw Error('NOT_FOUND');}};
    if(id==='react/jsx-runtime')return {jsx:()=> 'HOME'};
    if(id==='../page')return {default:()=>null};
    throw Error(id);
  }});
  const params=slug=>({params:Promise.resolve({slug})});
  const detail=await exports.generateMetadata(params(['churches','church-1']));
  assert.equal(detail.alternates.canonical,'/churches/church-1');assert.equal(detail.openGraph.url,'/churches/church-1');
  assert.equal(await exports.default(params(['churches','church-1'])),'HOME');
  for(const slug of [['churches','a','extra'],['churches','bad/path']])await assert.rejects(exports.default(params(slug)),/NOT_FOUND/);
  assert.equal((await exports.generateMetadata(params(['churches']))).alternates.canonical,'/churches');
  assert.equal((await exports.generateMetadata(params(['account']))).alternates.canonical,'/');
});
