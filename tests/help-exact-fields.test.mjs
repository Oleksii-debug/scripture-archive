import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';

// Exercise the REAL Cloudflare Help route after TypeScript transpilation.
// All database, authentication and email dependencies are disposable fakes.
const source = readFileSync(new URL('../app/api/help/route.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
  reportDiagnostics:true,
});
assert.equal(compiled.diagnostics?.length ?? 0,0);

function fixture({identity=null}={}) {
  const calls={batch:0,email:0,prepared:0,values:[]};
  const DB={
    prepare(sql){
      calls.prepared++;
      return {
        bind(...values){this.values=values;return this;},
        async run(){return {success:true,meta:{changes:1}};},
      };
    },
    async batch(statements){
      calls.batch++;
      calls.values=statements.map(s=>s.values);
      return statements.map(()=>({success:true,meta:{changes:1}}));
    },
  };
  const exports={};
  vm.runInNewContext(compiled.outputText,{
    exports,Request,Response,URL,FormData,File,crypto,TextDecoder,Uint8Array,DataView,btoa,
    require(specifier){
      if(specifier==='cloudflare:workers')return {env:{DB}};
      if(specifier==='../../../lib/auth')return {
        authenticateRequest:async()=>identity,
        rateLimit:async()=>true,requestAddress:()=> 'test-address',
        sameOrigin:req=>req.headers.get('origin')===new URL(req.url).origin,
      };
      if(specifier==='../../../lib/email')return {
        sendSupportRequestEmail:async()=>{calls.email++;return {delivered:false};},
      };
      throw Error('Unexpected dependency: '+specifier);
    }
  },{filename:'app/api/help/route.ts'});
  async function submit({email='reader@example.invalid',
    subject='An exact meaningful subject',message='A verified message with my exact text.',
    acceptPrivacy='yes'}={}){
    const form=new FormData();
    form.set('email',email);form.set('subject',subject);
    form.set('message',message);form.set('acceptPrivacy',acceptPrivacy);
    const response=await exports.POST(new Request('https://scripture.invalid/api/help',{
      method:'POST',headers:{Origin:'https://scripture.invalid'},body:form,
    }));
    return {status:response.status,body:await response.json()};
  }
  return {submit,calls};
}

test('overlong anonymous email is rejected instead of rewritten to a new valid contact',async()=>{
  const exact254='a'.repeat(242)+'@example.com';
  assert.equal(exact254.length,254);
  const f=fixture();
  for (const email of [exact254+'different-recipient', 'a'.repeat(255)+'@example.com']){
    const response=await f.submit({email});
    assert.equal(response.status,400);
    assert.equal(response.body.error,'invalid_request');
  }
  assert.equal(f.calls.batch,0);
  assert.equal(f.calls.email,0);
  assert.equal(f.calls.prepared,0);
});

test('overlong subject is rejected without storing edited user intent or sending mail',async()=>{
  const f=fixture();
  for(const subject of ['S'.repeat(161),'  '+'S'.repeat(161)+'  ']){
    const r=await f.submit({subject});
    assert.equal(r.status,400);assert.equal(r.body.error,'invalid_request');
  }
  assert.equal(f.calls.batch,0);assert.equal(f.calls.email,0);
});

test('overlong support message is rejected without silently dropping tail text',async()=>{
  const f=fixture();
  for(const message of ['M'.repeat(6001),'  '+'M'.repeat(6001)+'  ']){
    const r=await f.submit({message});
    assert.equal(r.status,400);assert.equal(r.body.error,'invalid_request');
  }
  assert.equal(f.calls.batch,0);assert.equal(f.calls.email,0);
});

test('valid exact-length email, subject and message are preserved at D1 boundary',async()=>{
  const email='a'.repeat(64)+'@'+'b'.repeat(63)+'.'+'c'.repeat(63)+'.'+'d'.repeat(57)+'.com';
  assert.equal(email.length,254);
  const subject='S'.repeat(160),message='M'.repeat(6000);
  const f=fixture();const response=await f.submit({email,subject,message});
  assert.equal(response.status,201);assert.equal(response.body.ok,true);
  assert.equal(f.calls.batch,1);assert.equal(f.calls.email,1);
  assert.equal(f.calls.values[0][2],email);
  assert.equal(f.calls.values[0][3],subject);
  assert.equal(f.calls.values[0][4],message);
});

test('normal surrounding whitespace remains trimmed without clipping',async()=>{
  const f=fixture();const response=await f.submit({
    email:'  Reader@Example.INVALID  ',subject:'  Support request  ',
    message:'  This is my exact private support message.  ',
  });
  assert.equal(response.status,201);assert.equal(f.calls.batch,1);
  assert.equal(f.calls.values[0][2],'reader@example.invalid');
  assert.equal(f.calls.values[0][3],'Support request');
  assert.equal(f.calls.values[0][4],'This is my exact private support message.');
});

test('verified account email cannot be clipped into a different recipient',async()=>{
  const identity={userId:'owner',email:'a'.repeat(242)+'@example.com'+'tail',fullName:'Owner'};
  const f=fixture({identity});
  const response=await f.submit({email:'other@example.invalid'});
  assert.equal(response.status,400);assert.equal(response.body.error,'invalid_request');
  assert.equal(f.calls.batch,0);assert.equal(f.calls.email,0);
});
