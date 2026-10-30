import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderWorkspace} from '../public/workspace.js';

const escapeText=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;')
  .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');

function scenario(lang='en') {
  const prior={fetch:globalThis.fetch,document:globalThis.document,location:globalThis.location};
  const list={isConnected:true,innerHTML:'',querySelectorAll(){return[];},querySelector(){return null;}};
  const nav=[],shells=[],state={lang,user:null,sessionUnavailable:false};
  globalThis.location={pathname:'/library',search:'',hash:''};
  globalThis.document={querySelector:selector=>selector==='#public-materials'?list:null};
  const context={state,t:key=>key,esc:escapeText,setActiveNav:name=>nav.push(name),shell:html=>shells.push(html)};
  return {list,nav,shells,state,context,restore() {
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
        assert.equal(url,'/api/material-review?view=public');
        assert.equal(options,undefined,'reviewed catalogue is read-only GET');
        return Response.json({items:[{
          id:'approval-1',title:'Approved <study>',reference:'GEN 12:1–3',
          provenance:'https://example.org/source',prompt:'Which promise is recorded?',
          options:['A & B','C'],
        }]});
      };
      await renderWorkspace('library',f.context);
      assert.deepEqual(f.nav,['library']);
      assert.equal(f.shells.length,1);
      assert.ok(f.shells[0].includes(heading));
      assert.match(f.shells[0],/id="public-materials"/);
      assert.match(f.shells[0],/href="\/builder"/);
      assert.equal(calls,1);
      assert.match(f.list.innerHTML,/Approved &lt;study&gt;/);
      assert.match(f.list.innerHTML,/A &amp; B/);
      assert.match(f.list.innerHTML,/data-id="approval-1"/);
      assert.doesNotMatch(f.list.innerHTML,/<study>|href="\/api\/materials\?mine=/);
    }finally{f.restore();}
  }
});

test('public library remains accessible without registered account and on approved empty catalogue',async()=>{
  const f=scenario();
  try {
    globalThis.fetch=async()=>Response.json({items:[]});
    await renderWorkspace('library',f.context);
    assert.match(f.list.innerHTML,/There are no reviewed materials yet/);
    assert.doesNotMatch(f.list.innerHTML,/data-id=/);
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
        provenance:'Old account',prompt:'Stale question',options:['Yes','No'],
      }]}));
      await rendering;
      assert.equal(f.list.innerHTML,'','changed context must suppress stale public data');
    }finally{f.restore();}
  }
});

test('library public API outage announces a recoverable error rather than an empty approved list',async()=>{
  const f=scenario('uk');
  try {
    globalThis.fetch=async()=>{throw Error('network unavailable')};
    await renderWorkspace('library',f.context);
    assert.match(f.list.innerHTML,/role="alert"/);
    assert.match(f.list.innerHTML,/retry-public-materials/);
    assert.match(f.list.innerHTML,/Не вдалося виконати дію/);
  }finally{f.restore();}
});
