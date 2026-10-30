import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

// Execute the actual canonical GET /api/materials?mine=1&export=1 handler.
// No parallel export implementation or mocked response serialization.
const source=readFileSync(new URL('../app/api/materials/route.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
  fileName:'app/api/materials/route.ts',reportDiagnostics:true,
});
assert.equal(compiled.diagnostics?.length??0,0);

const draft={id:'m-1',title:'Owned lesson',locale:'en',
  data:JSON.stringify({prompt:'Which passage?',reference:'GEN 12',answer:'A',
    explanation:'Reviewed source',options:['A','B']})};
const submission={id:'s-1',material_id:'m-1',
  snapshot:JSON.stringify({title:'Owned lesson',locale:'en',
    data:{prompt:'Which passage?',reference:'GEN 12',answer:'A',
      explanation:'Reviewed source',options:['A','B']}})};
const ok=results=>({success:true,results});
function fixture({draftData=draft.data,snapshot=submission.snapshot,
  identity={userId:'alice',provider:'password'}}={}){
  const queries=[];
  let batches=0;
  const results=[ok([{...draft,data:draftData}]),ok([{...submission,snapshot}])];
  const db={
    prepare(sql){return {bind(...params){queries.push({sql,params});return {sql,params};}};},
    async batch(statements){
      batches++;
      assert.equal(statements.length,2);
      return results;
    },
  };
  const exports={};
  vm.runInNewContext(compiled.outputText,{
    exports,Request,Response,URL,Date,crypto,
    require(name){
      if(name==='cloudflare:workers')return {env:{DB:db}};
      if(name==='../../../lib/auth')return {
        authenticateRequest:async()=>identity,
        isVerifiedOwner:()=>false,sameOrigin:()=>true,
      };
      throw Error('Unexpected dependency '+name);
    },
  });
  return {
    async get(){
      const response=await exports.GET(new Request('https://test.invalid/api/materials?mine=1&export=1'));
      return {response,body:await response.json()};
    },
    queries,get batches(){return batches;},
  };
}

test('real owner materials export keeps structured draft and review-history snapshots',async()=>{
  const f=fixture();
  const {response,body}=await f.get();
  assert.equal(response.status,200);
  assert.equal(body.format,'scripture-archive-materials-export');
  assert.equal(body.version,1);
  assert.equal(body.materials[0].data.answer,'A');
  assert.equal(body.submissions[0].snapshot.data.reference,'GEN 12');
  assert.equal(f.batches,1);
  assert.equal(f.queries.length,2);
  assert.equal(f.queries.every(query=>query.params[0]==='alice'),true);
  assert.match(response.headers.get('cache-control'),/no-store, private/);
  assert.match(response.headers.get('content-disposition'),/attachment/);
});

for(const raw of ['null','true','42','[]','"forged"']){
  for(const field of ['draftData','snapshot']){
    test(field+' refuses JSON scalar/array instead of claiming complete owner export: '+raw,async()=>{
      const f=fixture({[field]:raw});
      const {response,body}=await f.get();
      assert.equal(response.status,503);
      assert.equal(body.error,'export_unavailable');
      assert.equal('materials' in body,false);
      assert.equal('submissions' in body,false);
      assert.match(response.headers.get('cache-control'),/no-store, private/);
      assert.equal(response.headers.get('content-disposition'),null);
      assert.equal(f.batches,1);
    });
  }
}
for(const raw of [null,42,{fake:'record'}]){
  for(const field of ['draftData','snapshot']){
    test(field+' rejects non-string D1 payload without exposing any private archive',async()=>{
      const {response,body}=await fixture({[field]:raw}).get();
      assert.equal(response.status,503);
      assert.deepEqual(body,{error:'export_unavailable'});
      assert.equal(response.headers.get('content-disposition'),null);
    });
  }
}

test('anonymous reader cannot use private materials export',async()=>{
  const f=fixture({identity:null});
  const {response,body}=await f.get();
  assert.equal(response.status,401);
  assert.equal(body.error,'authentication_required');
  assert.equal(f.batches,0);
  assert.equal(f.queries.length,0);
});


test('editorial export rejects JSON objects without restorable canonical exercise fields', async () => {
  // A JSON object is not enough: malformed authored content must not be
  // advertised as a complete private backup after an acknowledged D1 batch.
  const original = JSON.parse(draft.data);
  const malformed = [
    {}, { ...original, prompt:'' }, { ...original, prompt:'short' },
    { ...original, reference:4 }, { ...original, reference:'x' },
    { ...original, explanation:null }, { ...original, explanation:'short' },
    { ...original, answer:'not-an-option' }, { ...original, answer:'' },
    { ...original, options:[] }, { ...original, options:['A'] },
    { ...original, options:['A','A'] }, { ...original, options:['A',''] },
    { ...original, options:['A',false] },
    { ...original, options:['A','B','C','D','E','F','G','H','I'] },
    { ...original, prompt:'P'.repeat(3001) },
    { ...original, reference:'R'.repeat(201) },
    { ...original, explanation:'E'.repeat(2001) },
    { ...original, answer:'A'.repeat(501) },
  ];
  for (const item of malformed) {
    const f = fixture({ draftData: JSON.stringify(item) });
    const { response, body } = await f.get();
    assert.equal(response.status,503,JSON.stringify(item).slice(0,100));
    assert.deepEqual(body,{error:'export_unavailable'});
    assert.equal(response.headers.get('content-disposition'),null);
    assert.equal('materials' in body,false);
    assert.equal(f.batches,1);
  }
});

test('editorial submission snapshots must preserve authored content and reviewed language', async () => {
  const original=JSON.parse(submission.snapshot);
  const malformed=[
    { ...original, title:'' }, { ...original, title:'xy' },
    { ...original, title:'T'.repeat(161) },
    { ...original, locale:'de' }, { ...original, locale:4 },
    { ...original, data:{} }, { ...original, data:null },
    { ...original, data:[original.data] },
    { ...original, data:{...original.data,answer:'not-an-option'} },
    { ...original, data:{...original.data,options:['A','A']} },
    { ...original, data:{...original.data,explanation:'short'} },
  ];
  for(const item of malformed){
    const f=fixture({snapshot:JSON.stringify(item)});
    const {response,body}=await f.get();
    assert.equal(response.status,503,JSON.stringify(item).slice(0,120));
    assert.deepEqual(body,{error:'export_unavailable'});
    assert.equal(response.headers.get('content-disposition'),null);
    assert.equal('submissions' in body,false);
    assert.equal(f.batches,1);
  }
});

test('valid UTF-8 authored content and optional legacy metadata remain lossless in owner export',async()=>{
  const complete={...JSON.parse(draft.data),
    prompt:'Хто був Авраам і яке значення має Буття 12?',
    reference:'Буття 12:1',answer:'Покликання',
    options:['Покликання','Мандрівка'],explanation:'Обґрунтування джерела',
    authorNote:'Older private source metadata',
  };
  const archived={title:'Український урок',locale:'uk',data:complete};
  const {response,body}=await fixture({draftData:JSON.stringify(complete),snapshot:JSON.stringify(archived)}).get();
  assert.equal(response.status,200);
  assert.deepEqual(body.materials[0].data,complete);
  assert.deepEqual(body.submissions[0].snapshot,archived);
  assert.match(response.headers.get('content-disposition'),/attachment/);
});
