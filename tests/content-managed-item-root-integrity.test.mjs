import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

// Real owner CMS GET source under an isolated D1/auth boundary.
const source=readFileSync(new URL("../app/api/content/route.ts",import.meta.url),"utf8");
const compiled=ts.transpileModule(source,{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
  reportDiagnostics:true,
});
assert.equal(compiled.diagnostics?.length ?? 0,0);

const validItem={
  id:"author-001",kind:"book",locale:"uk",title:"Готовий матеріал",
  status:"draft",data:'{"text":"Збережено"}',
  created_at:"2026-10-29",updated_at:"2026-10-30",
};
const validRevision={
  id:"revision-001",content_key:"book:author-001",created_at:"2026-10-30",
  created_by:"owner",
};

function harness(rows,{owner=true,dbPresent=true,revisionOk=true}={}){
  const counts={auth:0,queries:[],all:0,mutations:0};
  const db={
    prepare(sql){
      counts.queries.push(sql);
      return { async all(){
        counts.all++;
        if(sql.includes("FROM managed_content"))return {success:true,results:rows};
        if(sql.includes("FROM content_revisions"))return revisionOk
          ? {success:true,results:[validRevision]}
          : {success:false,results:[]};
        throw Error("unexpected SQL "+sql);
      }};
    },
    async batch(){counts.mutations++;throw Error("owner GET must not write");},
  };
  const exports={};
  vm.runInNewContext(compiled.outputText,{
    exports,Request,Response,URL,
    require(name){
      if(name==="cloudflare:workers")return {env:{DB:dbPresent?db:undefined}};
      if(name==="../../../lib/auth")return {
        authenticateRequest:async()=>{counts.auth++;return {userId:"owner",provider:"password"};},
        isVerifiedOwner:()=>owner,
        sameOrigin:()=>true,
      };
      throw Error("unexpected import "+name);
    },
  });
  return {
    counts,
    async read(){
      const response=await exports.GET(new Request("https://scripture.test/api/content?admin=1"));
      return {response,body:await response.json()};
    },
  };
}

test("editorial owner receives valid source object, metadata and revisions without mutation",async()=>{
  const h=harness([validItem]);
  const {response,body}=await h.read();
  assert.equal(response.status,200);
  assert.equal(body.items.length,1);
  assert.deepEqual(body.items[0].data,{text:"Збережено"});
  assert.equal(body.items[0].title,validItem.title);
  assert.equal(body.revisions.length,1);
  assert.equal(h.counts.auth,1);
  assert.equal(h.counts.all,2);
  assert.equal(h.counts.mutations,0);
});
test("empty owner catalogue and real revision history remain valid",async()=>{
  const h=harness([]);
  const {response,body}=await h.read();
  assert.equal(response.status,200);
  assert.deepEqual(body.items,[]);
  assert.deepEqual(body.revisions,[validRevision]);
  assert.equal(h.counts.all,2);
});
test("multiple valid legacy object records stay readable without altering their structure",async()=>{
  const h=harness([
    {...validItem,id:"a",data:'{}'},
    {...validItem,id:"b",data:'{"paragraphs":["Перевірка"],"provenance":{"book":"GEN"}}'},
  ]);
  const {response,body}=await h.read();
  assert.equal(response.status,200);
  assert.deepEqual(body.items.map(item=>item.id),["a","b"]);
  assert.equal(body.items[1].data.paragraphs[0],"Перевірка");
  assert.equal(h.counts.mutations,0);
});
test("unverified editor cannot read even a valid owner-only catalogue",async()=>{
  const h=harness([validItem],{owner:false});
  const {response,body}=await h.read();
  assert.equal(response.status,403);
  assert.deepEqual(body,{error:"forbidden"});
  assert.equal(h.counts.queries.length,0);
});

const corrupted=[
 ["JSON null","null"],
 ["empty JSON array","[]"],
 ["array with fake object",'[{"text":"fake"}]'],
 ["JSON true","true"],
 ["JSON false","false"],
 ["number zero","0"],
 ["number other","20"],
 ["JSON string",'"fake published material"'],
 ["empty JSON string",'""'],
 ["invalid JSON",'{invalid'],
 ["broken array",'[1,'],
 ["missing data",undefined],
 ["null D1 data",null],
 ["numeric D1 data",3],
 ["object-valued D1 data",{text:"wrong transport shape"}],
 ["array-valued D1 data",[{text:"wrong transport shape"}]],
 ["boolean D1 data",true],
];
for(const [label,bad] of corrupted){
  for(const position of ["only","before valid","after valid"]){
    test("owner catalogue fails closed on "+label+" / "+position,async()=>{
      const damaged={...validItem,id:"corrupt",data:bad};
      const rows=position==="only"?[damaged]
        :position==="before valid"?[damaged,validItem]
        :[validItem,damaged];
      const h=harness(rows);
      const {response,body}=await h.read();
      assert.equal(response.status,503,label+" "+position);
      assert.deepEqual(body,{error:"content_unavailable"});
      assert.match(response.headers.get("cache-control"),/no-store, private/);
      assert.equal("items" in body,false);
      assert.equal("revisions" in body,false);
      assert.equal(h.counts.auth,1);
      assert.equal(h.counts.all,2);
      assert.equal(h.counts.mutations,0);
    });
  }
}
test("a separately rejected revisions read cannot expose a seemingly complete owner catalogue",async()=>{
  const h=harness([validItem],{revisionOk:false});
  const {response,body}=await h.read();
  assert.equal(response.status,503);
  assert.deepEqual(body,{error:"content_unavailable"});
  assert.equal(h.counts.all,2);
});
