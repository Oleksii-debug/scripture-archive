import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source=readFileSync(new URL('../app/api/editor-roles/route.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;

function fixture(db=null) {
  let authCalls=0;
  const exports={};
  vm.runInNewContext(compiled,{exports,Request,Response,URL,require(id) {
    if(id==='cloudflare:workers') return {env:{DB:db}};
    if(id.endsWith('/auth')) return {
      sameOrigin:request=>request.headers.get('origin')===new URL(request.url).origin,
      authenticateRequest:async()=>{authCalls++;throw Error('Unauthorized identity lookup');},
    };
    throw Error('Unexpected import '+id);
  }});
  const write=async origin=>{
    const response=await exports.POST(new Request('https://scripture-archive.com/api/editor-roles',{
      method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({action:'grant',email:'person@example.invalid'}),
    }));
    return {status:response.status,body:await response.json()};
  };
  return {write,authCalls:()=>authCalls};
}

test('forged origin is refused before identity or unavailable D1 is touched',async()=>{
  const f=fixture();
  const result=await f.write('https://attacker.invalid');
  assert.equal(result.status,403);
  assert.equal(result.body.error,'cross_origin_request');
  assert.equal(f.authCalls(),0);
});

test('valid origin cannot pass a missing D1 binding, and never attempts identity lookup',async()=>{
  const f=fixture();
  const result=await f.write('https://scripture-archive.com');
  assert.equal(result.status,503);
  assert.equal(result.body.error,'database_unavailable');
  assert.equal(f.authCalls(),0);
});
