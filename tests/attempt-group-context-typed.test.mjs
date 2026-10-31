import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Execute the canonical route, replacing only Cloudflare/auth/D1 dependencies.
const source=readFileSync(new URL('../app/api/attempts/route.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,
},reportDiagnostics:true});
assert.equal(compiled.diagnostics?.length??0,0);

const task={
  id:'group-context-test',book:'GEN',chapter:12,type:'single-choice',verses:[1],
  question:{uk:'Запитання',ru:'Вопрос',en:'Question'},
  options:{uk:['Так','Ні'],ru:['Да','Нет'],en:['Yes','No']},
  correct:[0],success:{uk:'Так',ru:'Да',en:'Yes'},
};
function fixture() {
  const queries=[],batches=[];
  let authCalls=0;
  const DB={
    prepare(sql){
      const query={sql,args:[]};queries.push(query);
      return {
        bind(...args){query.args=args;return this;},
        async first(){
          // A valid group may have no marathon registration; a synthetic
          // receipt row here incorrectly invents a stopped marathon.
          if (sql.includes('FROM group_marathon_registrations')) return null;
          return sql.includes('home_group_members')?{role:'owner'}:{id:'receipt'};
        },
        async run(){return {success:true,meta:{changes:1}};},
      };
    },
    async batch(statements){
      batches.push(statements);
      return statements.map(()=>({success:true,meta:{changes:1}}));
    },
  };
  const exports={};
  vm.runInNewContext(compiled.outputText,{
    exports,Request,Response,URL,Date,crypto,
    require(specifier){
      if(specifier==='cloudflare:workers')return {env:{DB}};
      if(specifier==='../../../content/mission-abraham.json')return {
        __esModule:true,default:{id:'OT-AB-01',title:{uk:'Test'},intro:{},tasks:[task]},
      };
      if(specifier==='../../../lib/auth')return {
        authenticateRequest:async()=>{authCalls++;return {userId:'alice',emailVerified:true,provider:'password'};},
        GUEST_COOKIE:'guest',guestCookie:()=>'',parseCookies:()=>new Map(),
        randomToken:()=>'',sha256:async()=>'',sameOrigin:request=>request.headers.get('origin')===new URL(request.url).origin,
      };
      throw Error('Unexpected import '+specifier);
    },
  });
  return {queries,batches,authCalls:()=>authCalls,async invoke(action,groupId,include=true,origin='https://archive.test',overrides={}){
    const body={book:'GEN',chapter:12,missionId:'OT-AB-01',locale:'en',...overrides};
    if(include)body.groupId=groupId;
    const response=await exports.POST(new Request('https://archive.test/api/attempts?action='+action,{
      method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body),
    }));
    return {status:response.status,body:await response.json(),cache:response.headers.get('cache-control')};
  }};
}

const bad=[
  ['array', ['group-1']],['object',{id:'group-1'}],['number',123],
  ['zero',0],['true',true],['false',false],
  ['whitespace','   '],['too-long','g'.repeat(81)],
  ['existing-id-plus-suffix','g'.repeat(80)+'tail'],
];
for(const action of ['read','start']){
  for(const [name,value] of bad){
    test(action+' rejects explicit malformed group context '+name+' without D1 mutation',async()=>{
      const f=fixture(),response=await f.invoke(action,value);
      assert.equal(response.status,400);
      assert.equal(response.body.error,'invalid_group');
      assert.match(response.cache,/no-store/);
      assert.equal(f.queries.length,0,'malformed group cannot downgrade to a personal SQL query');
      assert.equal(f.batches.length,0);
      assert.equal(f.authCalls(),1);
    });
  }
  for(const [name,value,include,expected] of [
    ['omitted',null,false,''],['explicit null',null,true,''],
    ['blank', '',true,''],['valid','group-1',true,'group-1'],
    ['trimmed',' group-1 ',true,'group-1'],
    ['exact maximum','g'.repeat(80),true,'g'.repeat(80)],
  ]){
    test(action+' retains the intended personal or authorized group mode: '+name,async()=>{
      const f=fixture(),response=await f.invoke(action,value,include);
      assert.equal(response.status,201);
      assert.equal(response.body.error,undefined);
      const target=f.queries.find(x=>x.sql.includes(action==='read'?'INSERT INTO chapter_read_receipts':'INSERT INTO mission_attempts'));
      assert.ok(target,'canonical persistence path reached');
      assert.ok(target.args.includes(expected || null),'saved scope remains exact');
      assert.equal(action==='start'?f.batches.length:0,action==='start'?1:0);
    });
  }
}

test('cross-origin group mutation is denied before identity or D1 access',async()=>{
  const f=fixture(),response=await f.invoke('read',['group-1'],true,'https://evil.test');
  assert.equal(response.status,403);
  assert.equal(response.body.error,'cross_origin_request');
  assert.equal(f.authCalls(),0);
  assert.equal(f.queries.length,0);
  assert.equal(f.batches.length,0);
});


// Source regression for the actual chapter/read/start routes: previously
// clean(body.book, 8) truncated a forged long identity to an existing GEN
// chapter and could consume receipts / invalidate an active assessment.
const malformedBookIds = [
  ['missing',undefined],['null',null],['number',12],['boolean',true],
  ['array',['GEN']],['object',{id:'GEN'}],['empty',''],
  ['leading whitespace',' GEN'],['trailing whitespace','GEN '],
  ['padding alias','GEN     forged'],['overlength book code','GEN123456'],
  ['hidden newline','GEN\\n'],['embedded nul','GEN\\u0000'],
  ['zero-width Unicode','GEN\\u200b'],['slash','GEN/12'],
  ['punctuation','GEN.'],['markup','<GEN>'],
  ['single character','G'],['Unicode lookalike','GЕN'],
];
for (const action of ['chapter','read','start']) {
  for (const [name,value] of malformedBookIds) {
    test(action+' rejects malformed book identifier '+name+' before any SQL write',async()=>{
      const f=fixture(),response=await f.invoke(action,undefined,false,'https://archive.test',{book:value});
      assert.equal(response.status,400,JSON.stringify(response.body));
      assert.equal(response.body.error,'invalid_book');
      assert.match(response.cache,/no-store/);
      assert.equal(f.queries.length,0,'invalid book cannot reach D1');
      assert.equal(f.batches.length,0,'no assessment or reading mutation');
      assert.equal(f.authCalls(),action==='chapter'?0:1,
        'chapter input is denied before looking up an actor');
    });
  }
  for (const code of ['GEN','gen','GeN']) {
    test(action+' preserves an exact or case-insensitive valid book code '+code,async()=>{
      const f=fixture(),response=await f.invoke(action,undefined,false,'https://archive.test',{book:code});
      assert.equal(response.status,action==='chapter'?200:201,JSON.stringify(response.body));
      const bookBound=f.queries.some(query=>query.args.includes('GEN'));
      assert.equal(bookBound,true,'the canonical code is bound to real D1 SQL');
      assert.equal(f.batches.length,action==='start'||action==='chapter'?1:0);
      assert.equal(f.authCalls(),1);
    });
  }
}
