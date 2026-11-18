import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';
import vm from 'node:vm';

function fixture(){
  const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');
  for(const name of readdirSync(new URL('../drizzle/',import.meta.url)).filter(name=>name.endsWith('.sql')).sort())db.exec(readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8'));
  for(const user of ['alice','bob'])db.prepare("INSERT INTO accounts(id,email,password_hash,password_salt,password_iterations,first_name,last_name,email_verified_at) VALUES (?,?,'private-hash','private-salt',100000,'Test','Author',CURRENT_TIMESTAMP)").run(user,user+'@example.invalid');
  const data={prompt:'Which passage is described?',reference:'GEN 12',options:['One','Two'],answer:'One',explanation:'The cited passage explains the answer.'};
  const snapshot=JSON.stringify({title:'An authored exercise',locale:'en',data});
  function add(key,user,basis,license=null,holder='Original Author'){
    db.prepare("INSERT INTO study_materials(id,owner_user_id,title,locale,data) VALUES (?,?,'An authored exercise','en',?)").run(key,user,JSON.stringify(data));
    db.prepare("INSERT INTO material_submissions(id,material_id,author_id,snapshot,provenance,rights_attested,status,rights_holder,rights_basis,license_url) VALUES (?,?,?,?,'Author supplied source',1,'withdrawn',?,?,?)").run('submission-'+key,key,user,snapshot,basis===null?null:holder,basis,license);
  }
  let actor='alice';
  const D1={prepare(sql){return {bind(...args){return {sql,args};}};},async batch(statements){return statements.map(({sql,args})=>({success:true,results:db.prepare(sql).all(...args)}));}};
  const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../app/api/materials/route.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
    exports,Request,Response,URL,crypto,require(name){if(name==='cloudflare:workers')return {env:{DB:D1}};if(name.endsWith('/auth'))return {authenticateRequest:async()=>({userId:actor,provider:'password'}),sameOrigin:()=>true,isVerifiedOwner:()=>false};throw Error(name);}
  });
  return {db,add,async get(user='alice'){actor=user;const response=await exports.GET(new Request('https://local.invalid/api/materials?mine=1&export=1'));return {status:response.status,headers:response.headers,data:await response.json()};}};
}

test('personal materials export preserves all rights bases, exact license URLs and honest legacy nulls',async()=>{
  const f=fixture();try{
    const url='https://publisher.example/license?edition=1&language=uk#permission';
    for(const basis of ['original','permission','open_license','public_domain'])f.add(basis,'alice',basis,basis==='open_license'?url:null,'Умовний правовласник');
    f.add('legacy','alice',null);f.add('private-bob','bob','permission',null,'Other private rights holder');
    const result=await f.get();assert.equal(result.status,200);assert.equal(result.data.submissions.length,5);
    for(const row of result.data.submissions){
      const key=row.material_id;assert.equal(row.rights_basis,key==='legacy'?null:key);
      assert.equal(row.rights_holder,key==='legacy'?null:'Умовний правовласник');
      assert.equal(row.license_url,key==='open_license'?url:null);assert.equal(row.rights_attested,1);
      assert.equal(row.status,'withdrawn');assert.equal(row.provenance,'Author supplied source');
      assert.equal(row.snapshot.data.answer,'One');
    }
    const encoded=JSON.stringify(result.data);assert.doesNotMatch(encoded,/Other private rights holder|private-bob|private-hash|private-salt/);
    assert.match(result.headers.get('cache-control'),/no-store/);assert.match(result.headers.get('content-disposition'),/attachment/);
    assert.deepEqual((await f.get('bob')).data.submissions.map(row=>row.material_id),['private-bob']);
  }finally{f.db.close();}
});

test('rights export includes every revision and never substitutes current draft metadata for a saved submission',async()=>{
  const f=fixture();try{
    f.add('original','alice','original',null,'First Author');
    const source=f.db.prepare("SELECT snapshot FROM material_submissions WHERE material_id='original'").get().snapshot;
    f.db.prepare("INSERT INTO material_submissions(id,material_id,author_id,snapshot,provenance,rights_attested,status,rights_holder,rights_basis,license_url) VALUES ('second','original','alice',?,'Later permission',1,'pending','Permission Holder','permission','https://publisher.example/permission')").run(source);
    f.db.exec("UPDATE study_materials SET title='Unpublished new draft' WHERE id='original'");
    const result=await f.get();assert.equal(result.status,200);assert.equal(result.data.submissions.length,2);
    assert.deepEqual(new Set(result.data.submissions.map(row=>row.rights_holder)),new Set(['First Author','Permission Holder']));
    assert.ok(result.data.submissions.every(row=>row.snapshot.title==='An authored exercise'));
    assert.equal(result.data.materials[0].title,'Unpublished new draft');
  }finally{f.db.close();}
});
