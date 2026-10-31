import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderWorkspace} from '../public/workspace.js';
import {renderReviewedLibrary, reviewText} from '../public/material-review.js';

const escapeText=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;')
  .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');

function scenario(lang='en') {
  const prior={fetch:globalThis.fetch,document:globalThis.document,location:globalThis.location};
  const input={value:''},submit={},form={querySelector:selector=>selector==='input'?input:selector==='button'?submit:null};
  const status={textContent:''},more={hidden:true},results={innerHTML:'',isConnected:true,
    insertAdjacentHTML(_where,html){this.innerHTML+=html;},querySelectorAll(){return[];},querySelector(){return null;}};
  const list={isConnected:true,innerHTML:'',querySelector:selector=>({'.library-search':form,
    '.library-search-status':status,'.library-search-results':results,'.library-search-more':more}[selector]||null)};
  const nav=[],shells=[],state={lang,user:null,sessionUnavailable:false};
  globalThis.location={pathname:'/library',search:'',hash:''};
  const document={body:{},activeElement:null,querySelector:selector=>selector==='#public-materials'?list:null};
  const heading={focus(){document.activeElement=heading;}};
  results.querySelector=selector=>selector.startsWith('#library-search-page-')?heading:null;
  results.ownerDocument=document; list.ownerDocument=document;
  globalThis.document=document;
  const context={state,t:key=>key,esc:escapeText,setActiveNav:name=>nav.push(name),shell:html=>shells.push(html)};
  return {list,results,form,input,submit,status,more,document,heading,nav,shells,state,context,restore() {
    for(const key of ['fetch','document','location']) {
      if(prior[key]===undefined)delete globalThis[key];
      else globalThis[key]=prior[key];
    }
  }};
}

test('public reviewed-material library is discoverable in canonical Next route, navigation and client router',()=>{
  const router=readFileSync(new URL('../app/[...slug]/page.tsx',import.meta.url),'utf8');
  const shell=readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');
  const sitemap=readFileSync(new URL('../app/sitemap.xml/route.ts',import.meta.url),'utf8');
  const client=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
  assert.match(router,/PUBLIC_ROUTES[^\n]*"library"/);
  assert.match(router,/library: \{ title:/);
  assert.match(shell,/href="\/library" data-route="library" data-workspace="library"/);
  assert.ok(sitemap.includes('["/library", "weekly", "0.6"]'));
  assert.match(client,/\["home-groups", "live", "campaigns", "dossiers", "library",/);
  assert.match(client,/renderWorkspace\(name==='home-groups'\?'live':name/);
});

test('all three library languages show only actual editor-approved public API items and safe markup',async()=>{
  for(const [lang,heading] of [['uk','Бібліотека перевірених матеріалів'],
    ['ru','Библиотека проверенных материалов'],['en','Library of reviewed materials']]) {
    const f=scenario(lang);
    try {
      let calls=0;
      globalThis.fetch=async (url,options)=>{
        calls++;
        assert.equal(url,'/api/material-review');
        assert.equal(options.method,'POST');
        assert.deepEqual(JSON.parse(options.body),{action:'librarySearch',query:'',cursor:null});
        return Response.json({items:[{
          id:'approval-1',title:'Approved <study>',reference:'GEN 12:1–3',
        provenance:'https://example.org/source',prompt:'Which promise is recorded?',locale:'en',reviewedAt:'2026-10-31 10:00:00',rights:{holder:'Example Publisher',basis:'open_license',licenseUrl:'https://example.org/license'},
          options:['A & B','C'],
        }],nextCursor:null});
      };
      await renderWorkspace('library',f.context);
      assert.deepEqual(f.nav,['library']);
      assert.equal(f.shells.length,1);
      assert.ok(f.shells[0].includes(heading));
      assert.match(f.shells[0],/id="public-materials"/);
      assert.match(f.shells[0],/href="\/builder"/);
      assert.equal(calls,1);
      assert.match(f.results.innerHTML,/Approved &lt;study&gt;/);
      assert.match(f.results.innerHTML,/A &amp; B/);
      assert.match(f.results.innerHTML,/data-id="approval-1"/);
      assert.doesNotMatch(f.results.innerHTML,/<study>|href="\/api\/materials\?mine=/);
    }finally{f.restore();}
  }
});

test('public library remains accessible without registered account and on approved empty catalogue',async()=>{
  const f=scenario();
  try {
    globalThis.fetch=async()=>Response.json({items:[],nextCursor:null});
    await renderWorkspace('library',f.context);
    assert.match(f.status.textContent,/No matches found/);
    assert.doesNotMatch(f.results.innerHTML,/data-id=/);
  }finally{f.restore();}
});

test('slow reviewed-library response cannot repaint a different principal or route',async()=>{
  for(const change of ['principal','route','session']) {
    const f=scenario();
    let resolve;
    const pending=new Promise(done=>{resolve=done;});
    try {
      globalThis.fetch=()=>pending;
      const rendering=renderWorkspace('library',f.context);
      if(change==='principal')f.state.user={id:'other-account'};
      if(change==='route')globalThis.location.pathname='/campaigns';
      if(change==='session')f.state.sessionUnavailable=true;
      resolve(Response.json({items:[{
        id:'private-old',title:'Stale reviewed item',reference:'GEN 1',
        provenance:'Old account',prompt:'Stale question',options:['Yes','No'],locale:'en',reviewedAt:'2026-10-31 10:00:00',rights:null,
      }],nextCursor:null}));
      await rendering;
      assert.equal(f.results.innerHTML,'','changed context must suppress stale public data');
    }finally{f.restore();}
  }
});

test('library public API outage announces a recoverable error rather than an empty approved list',async()=>{
  const f=scenario('uk');
  try {
    globalThis.fetch=async()=>{throw Error('network unavailable')};
    await renderWorkspace('library',f.context);
    assert.match(f.list.innerHTML,/role="status"/);
    assert.match(f.status.textContent,/Не вдалося виконати дію/);
    assert.equal(typeof f.form.onsubmit,'function');
  }finally{f.restore();}
});


test('actual public library item submits its answer through existing reviewed-material API',async()=>{
  const f=scenario('en'),originalFormData=globalThis.FormData;
  const status={textContent:''},button={disabled:false},form={
    isConnected:true,dataset:{id:'approved-lesson'},onsubmit:null,
    querySelector:selector=>selector==='[role="status"]'?status:selector==='button'?button:null,
  };
  f.results.querySelectorAll=selector=>selector==='.public-material'?[form]:[];
  const calls=[];
  try {
    globalThis.FormData=class {
      constructor(target){assert.equal(target,form);}
      get(name){assert.equal(name,'choice');return '1';}
    };
    globalThis.fetch=async (url,options)=>{
      calls.push({url,options});
      if(JSON.parse(options.body).action==='librarySearch') return Response.json({items:[{
        id:'approved-lesson',title:'Source-verified study',reference:'GEN 12:2',
        provenance:'Reviewed source',prompt:'Which answer is supported?',locale:'en',reviewedAt:'2026-10-31 10:00:00',rights:{holder:'Study Author',basis:'permission',licenseUrl:null},
        options:['One','Two'],
      }],nextCursor:null});
      if(url==='/api/material-review'){
        assert.equal(options?.method,'POST');
        assert.deepEqual(JSON.parse(options.body),{action:'answer',id:'approved-lesson',choice:1});
        return Response.json({correct:true,explanation:'The referenced verse supports this response.'});
      }
      throw Error('unexpected second API');
    };
    await renderWorkspace('library',f.context);
    assert.equal(typeof form.onsubmit,'function','real library form is wired');
    let prevented=false;
    await form.onsubmit({preventDefault(){prevented=true;}});
    assert.equal(prevented,true);
    assert.match(status.textContent,/Correct.*referenced verse/);
    assert.equal(button.disabled,false);
    assert.deepEqual(calls.map(item=>item.url),
      ['/api/material-review','/api/material-review']);
  }finally{globalThis.FormData=originalFormData;f.restore();}
});

const tick=()=>new Promise(resolve=>setImmediate(resolve));
const libraryItem=(id,title)=>({id,title,reference:'GEN 1',provenance:'Reviewed source',prompt:'What does the passage say?',options:['Yes','No'],locale:'en',reviewedAt:'2026-10-31 10:00:00',rights:{holder:'Study Author',basis:'permission',licenseUrl:null}});

test('library searches and continues through bounded pages without replacing earlier answers',async()=>{
  const f=scenario(), calls=[];
  try {
    globalThis.fetch=async (_url,options)=>{
      const body=JSON.parse(options.body);calls.push(body);
      if(body.query==='') return Response.json({items:[],nextCursor:null});
      if(body.cursor===null) return Response.json({items:[],nextCursor:{id:'last-200',submittedAt:'2026-01-01'}});
      return Response.json({items:[libraryItem('answerable','Found <source>')],nextCursor:null});
    };
    await renderWorkspace('library',f.context);
    assert.match(f.list.innerHTML,/type="search"/);
    assert.match(f.list.innerHTML,/aria-describedby="library-search-help"/);
    f.input.value=' церкви ';
    f.form.onsubmit({preventDefault(){}});
    await tick();
    assert.equal(f.more.hidden,false);
    assert.match(f.status.textContent,/Continue searching/);
    f.more.onclick();
    await tick();
    assert.deepEqual(calls.slice(1),[
      {action:'librarySearch',query:'церкви',cursor:null},
      {action:'librarySearch',query:'церкви',cursor:{id:'last-200',submittedAt:'2026-01-01'}}
    ]);
    assert.match(f.results.innerHTML,/Found &lt;source&gt;/);
    assert.equal(f.more.hidden,true);
    assert.match(f.status.textContent,/Found in this part: 1/);
  }finally{f.restore();}
});

test('an older search cannot repaint newer results or announce an obsolete error',async()=>{
  const f=scenario();let resolveOld;
  try {
    globalThis.fetch=async (_url,options)=>{
      const query=JSON.parse(options.body).query;
      if(query==='old')return new Promise(resolve=>{resolveOld=resolve;});
      return Response.json({items:query==='new'?[libraryItem('new','New result')]:[],nextCursor:null});
    };
    await renderWorkspace('library',f.context);
    f.input.value='old';f.form.onsubmit({preventDefault(){}});
    f.input.value='new';f.form.onsubmit({preventDefault(){}});
    await tick();
    resolveOld(Response.json({items:[libraryItem('old','Old result')],nextCursor:null}));
    await tick();
    assert.match(f.results.innerHTML,/New result/);
    assert.doesNotMatch(f.results.innerHTML,/Old result/);
    assert.match(f.status.textContent,/Found in this part: 1/);
  }finally{f.restore();}
});

test('failed continuation preserves displayed results and can be retried',async()=>{
  const f=scenario();let calls=0;
  try {
    globalThis.fetch=async (_url,options)=>{
      const body=JSON.parse(options.body);calls++;
      if(!body.cursor)return Response.json({items:[libraryItem('first','First item')],nextCursor:{id:'first',submittedAt:'2026-01-01'}});
      if(calls===2)throw Error('offline');
      return Response.json({items:[libraryItem('second','Second item')],nextCursor:null});
    };
    await renderWorkspace('library',f.context);
    f.more.onclick();await tick();
    assert.match(f.status.textContent,/Could not complete/);
    assert.match(f.results.innerHTML,/First item/);
    assert.equal(f.more.hidden,false);
    f.more.onclick();await tick();
    assert.match(f.results.innerHTML,/First item/);
    assert.match(f.results.innerHTML,/Second item/);
    assert.equal(f.more.hidden,true);
  }finally{f.restore();}
});

test('malformed library responses are errors, not evidence of an empty catalogue',async()=>{
  const f=scenario();
  try {
    globalThis.fetch=async()=>Response.json({items:[]});
    await renderWorkspace('library',f.context);
    assert.match(f.status.textContent,/Could not complete/);
    assert.doesNotMatch(f.status.textContent,/No matches/);
  }finally{f.restore();}
});

test('continued results move keyboard focus to their heading only if the reader has not moved',async()=>{
  for(const moved of [false,true]) {
    const f=scenario();let finish;
    const elsewhere={};
    try {
      globalThis.fetch=async (_url,options)=>{
        const body=JSON.parse(options.body);
        if(!body.cursor)return Response.json({items:[libraryItem('first','First')],nextCursor:{id:'first',submittedAt:'2026-01-01'}});
        return new Promise(resolve=>{finish=resolve;});
      };
      await renderWorkspace('library',f.context);
      let hidden=f.more.hidden;
      Object.defineProperty(f.more,'hidden',{
        get(){return hidden;},
        set(value){hidden=Boolean(value);if(hidden && f.document.activeElement===f.more)f.document.activeElement=f.document.body;},
      });
      f.document.activeElement=f.more;
      f.more.onclick();
      if(moved)f.document.activeElement=elsewhere;
      finish(Response.json({items:[libraryItem('second','Second')],nextCursor:null}));
      await tick();
      assert.equal(f.document.activeElement,moved?elsewhere:f.heading);
      assert.match(f.results.innerHTML,/tabindex="-1"/);
    }finally{f.restore();}
  }
});

test('shared button styles cannot override the continuation control hidden state',()=>{
  const styles=readFileSync(new URL('../public/styles.css',import.meta.url),'utf8');
  assert.match(styles,/\.library-search-more\[hidden\]\s*\{\s*display\s*:\s*none/);
});


test('library locale uses own dictionary keys and preserves accessible Ukrainian fallback', async()=>{
  // A locale can originate in locally stored user/session input. JavaScript's
  // inherited Object.prototype names must never become translation objects.
  const inherited=['__proto__','constructor','toString','valueOf','hasOwnProperty'];
  const invalid=[...inherited,'unknown','',null,undefined,42,true,{},Object.create(null)];
  for (const lang of invalid) {
    const f=scenario('uk');
    try {
      globalThis.fetch=async (url,options)=>{
        assert.equal(url,'/api/material-review');
        assert.deepEqual(JSON.parse(options.body),{action:'librarySearch',query:'',cursor:null});
        return Response.json({items:[],nextCursor:null});
      };
      await renderReviewedLibrary(f.list,reviewText('uk'),lang,escapeText);
      assert.match(f.list.innerHTML,/Пошук матеріалів/);
      assert.match(f.list.innerHTML,/Шукайте за назвою/);
      assert.match(f.list.innerHTML,/Шукати/);
      assert.doesNotMatch(f.list.innerHTML,/\\bundefined\\b/);
      assert.match(f.status.textContent,/Збігів не знайдено/);
      assert.equal(typeof f.form.onsubmit,'function');
    } finally { f.restore(); }
  }
});

test('library own-key language switch keeps all three reviewed-material search copies',async()=>{
  const languages=[
    ['uk','Пошук матеріалів','Збігів не знайдено'],
    ['ru','Поиск материалов','Совпадений не найдено'],
    ['en','Search materials','No matches found'],
  ];
  for(const [lang,label,empty] of languages){
    const f=scenario(lang);
    try{
      globalThis.fetch=async()=>Response.json({items:[],nextCursor:null});
      await renderReviewedLibrary(f.list,reviewText(lang),lang,escapeText);
      assert.ok(f.list.innerHTML.includes(label),lang);
      assert.ok(f.status.textContent.includes(empty),lang);
      assert.equal(f.more.hidden,true);
    } finally{f.restore();}
  }
});
