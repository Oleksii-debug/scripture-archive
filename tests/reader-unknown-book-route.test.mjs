import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

// Execute the actual entry portion of renderReader: its selected book must
// come from the published catalog, never from a fabricated deep-link code.
const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const start=source.indexOf('async function renderReader(parts) {');
const end=source.indexOf('  const readerContext = state.currentReader;',start);
assert.ok(start>=0 && end>start,'canonical reader entry remains available');
const entry=source.slice(start,end)+'\n  return {book:meta.code,chapter};\n}';

function readerHarness(lang='uk',savedBook='JHN') {
  const notices=[],catalog={
    books:{[lang]:[{code:'GEN',chapters:50},{code:'JHN',chapters:21}]}
  };
  const state={lang,user:null,reader:{book:savedBook,chapter:3},
    currentReader:{book:'JHN',chapter:3}};
  const location={pathname:'/reader'};
  const render=new Function('state','location','setActiveNav','getCatalog',
    'selectedEdition','readerChapterNumber','shell','t',
    entry+'\nreturn renderReader;')(
      state,location,()=>{},async()=>catalog,()=>({id:'local'}),
      (raw,max)=>Math.min(Math.max(Number(raw)||1,1),max),
      html=>notices.push(html),
      key=>({errorLoad:'Unable to load Bible source',reader:'Reader'})[key]
    );
  return {state,notices,async open(...parts) {
    location.pathname='/'+parts.join('/');
    return render(parts);
  }};
}

test('unknown explicit book never substitutes Genesis or preserves stale reader context',async()=>{
  for(const lang of ['uk','ru','en']){
    for(const code of ['ZZZ','CONSTRUCTOR','__proto__','JHNX','GEN%2FEXO','GEN.json','<svg>']){
      const h=readerHarness(lang);
      assert.equal(await h.open('reader',code,'5'),undefined,lang+': '+code);
      assert.equal(h.state.currentReader,null,lang+': '+code);
      assert.equal(h.notices.length,1,lang+': '+code);
      assert.match(h.notices[0],/role="alert"/);
      assert.match(h.notices[0],/href="\/reader"/);
      assert.doesNotMatch(h.notices[0],/href="\/reader\/GEN\/5"/);
      assert.equal(h.state.reader.book,'JHN','saved reading must not be rewritten');
    }
  }
});

test('known book deep links and lowercase aliases still select their real book',async()=>{
  for(const lang of ['uk','ru','en']){
    for(const code of ['JHN','jhn']){
      const h=readerHarness(lang);
      assert.deepEqual(await h.open('reader',code,'3'),{book:'JHN',chapter:3});
      assert.deepEqual(h.state.currentReader,{book:'JHN',chapter:3});
      assert.deepEqual(h.notices,[]);
    }
    const genesis=readerHarness(lang);
    assert.deepEqual(await genesis.open('reader','GEN','5'),{book:'GEN',chapter:5});
    assert.deepEqual(genesis.notices,[]);
  }
});

test('entry without explicit book resumes saved chapter or defaults to Genesis',async()=>{
  for(const lang of ['uk','ru','en']){
    const resume=readerHarness(lang);
    assert.deepEqual(await resume.open('reader'),{book:'JHN',chapter:3});
    assert.deepEqual(resume.notices,[]);
    const damaged=readerHarness(lang,'ZZZ');
    assert.deepEqual(await damaged.open('reader'),{book:'GEN',chapter:3});
    assert.deepEqual(damaged.notices,[]);
  }
});

test('invalid book admission precedes all chapter guards, requests and source rendering',()=>{
  const reject=source.indexOf('  if (!meta) {',start);
  const guard=source.indexOf('    const attemptState = await attemptRequest("chapter"',start);
  assert.ok(reject>start && guard>reject);
  assert.match(source.slice(reject,guard),/state\.currentReader = null/);
  assert.match(source.slice(reject,guard),/role="alert"/);
});
