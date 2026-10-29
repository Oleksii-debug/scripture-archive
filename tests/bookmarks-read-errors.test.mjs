import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import ts from 'typescript';
function handler(result) {
  const source = readFileSync(new URL('../app/api/bookmarks/route.ts', import.meta.url),'utf8');
  const compiled = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  const exports = {};
  vm.runInNewContext(compiled,{exports,Response,require(id) {
    if (id === 'cloudflare:workers') return {env:{DB:{prepare:()=>({bind:()=>({all:async()=>{if(result instanceof Error)throw result;return result}})})}}};
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
  const response=await handler({success:true,results:[{book:'GEN',chapter:1}]});
  assert.equal(response.status,200); assert.equal((await response.json()).bookmarks[0].book,'GEN');
});
