import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import ts from 'typescript';
import { EDITIONS } from '../public/editions.js';
function handler(result) {
  const source = readFileSync(new URL('../app/api/bookmarks/route.ts', import.meta.url),'utf8');
  const compiled = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  const catalog = JSON.parse(readFileSync(new URL('../public/data/catalog.json', import.meta.url),'utf8'));
  const exports = {};
  vm.runInNewContext(compiled,{exports,Response,require(id) {
    if (id === 'cloudflare:workers') return {env:{DB:{prepare:()=>({bind:()=>({all:async()=>{if(result instanceof Error)throw result;return result}})})}}};
    if (id.endsWith('public/data/catalog.json')) return { default: catalog };
    if (id.endsWith('public/editions.js')) return { EDITIONS };
    if (id.endsWith('lib/auth')) return {authenticateRequest:async()=>({userId:'alice',provider:'local'})};
    throw Error(id);
  }});
  return exports.GET(new Request('http://localhost/api/bookmarks'));
}
test('bookmark reads report failure without false successful data',async()=>{
  for (const result of [{success:false,results:[]},{success:true},new Error('DB down')]) {
    const response=await handler(result); assert.equal(response.status,503); assert.equal((await response.json()).error,'bookmarks_unavailable');
    assert.match(response.headers.get('cache-control'),/no-store/);
  }
  const response=await handler({success:true,results:[{edition:'en-web',book:'GEN',chapter:1,created_at:'2026-10-30'}]});
  assert.equal(response.status,200); assert.equal((await response.json()).bookmarks[0].book,'GEN');
});

test('bookmark GET refuses corrupt legacy/nonlocal or impossible stored rows without false navigation success',async()=>{
  const bad = [
    null, {}, {edition:'en-web',book:'GEN',chapter:1},
    {edition:'en-web',book:'GEN',chapter:1,created_at:''},
    {edition:'en-web',book:'GEN',chapter:1,created_at:null},
    {edition:'en-niv',book:'GEN',chapter:1,created_at:'2026-10-30'},
    {edition:'unknown',book:'GEN',chapter:1,created_at:'2026-10-30'},
    {edition:'en-web',book:'FAK',chapter:1,created_at:'2026-10-30'},
    {edition:'en-web',book:'GEN',chapter:51,created_at:'2026-10-30'},
    {edition:'en-web',book:'GEN',chapter:'1',created_at:'2026-10-30'},
    {edition:'en-web',book:'JOL',chapter:4,created_at:'2026-10-30'},
    {edition:'uk-ohiienko',book:'JOL',chapter:5,created_at:'2026-10-30'},
  ];
  for (const row of bad) {
    const response=await handler({success:true,results:[{edition:'en-web',book:'GEN',chapter:1,created_at:'2026-10-30'},row]});
    assert.equal(response.status,503,JSON.stringify(row));
    const body=await response.json();
    assert.deepEqual(body,{error:'bookmarks_unavailable'});
    assert.equal('bookmarks' in body,false);
    assert.match(response.headers.get('cache-control'),/no-store/);
  }
});
test('bookmark GET preserves real multi-edition records including Ohiienko Joel 4',async()=>{
  const actual=[
    {edition:'en-web',book:'GEN',chapter:1,created_at:'2026-10-30'},
    {edition:'uk-ohiienko',book:'JOL',chapter:4,created_at:'2026-10-30'},
  ];
  const response=await handler({success:true,results:actual});
  assert.equal(response.status,200);
  const body=await response.json();
  assert.deepEqual(body.bookmarks,actual);
});
