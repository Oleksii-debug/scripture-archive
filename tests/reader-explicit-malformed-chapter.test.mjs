import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// Execute the actual canonical reader entry and its actual chapter parser.
// This is not a copied implementation or a browser/NVDA acceptance claim.
const source = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const start = source.indexOf('async function renderReader(parts) {');
const end = source.indexOf('  const readerContext = state.currentReader;', start);
const helperStart = source.indexOf('function readerChapterNumber(');
const helperEnd = source.indexOf('\nasync function onReaderEditionChange(', helperStart);
assert.ok(start >= 0 && end > start && helperStart >= 0 && helperEnd > helperStart);
const entry = source.slice(helperStart, helperEnd) + '\n' +
  source.slice(start, end) + '\n  return {book:meta.code,chapter};\n}';

function harness(lang = 'uk', saved = {book:'JHN',chapter:3}) {
  const notices = [], calls = [];
  const state = {lang, user:null, reader:saved, currentReader:{book:'JHN',chapter:3}};
  const location = {pathname:'/reader', search:'', hash:''};
  const reader = new Function('state','location','setActiveNav','getCatalog',
    'selectedEdition','shell','t',entry + '\nreturn renderReader;')(
      state,location,()=>{},async()=>({books:{[lang]:[
        {code:'GEN',chapters:50},{code:'JHN',chapters:21}
      ]}}),()=>({id:'local'}),html=>notices.push(html),key=>key);
  return {
    state, notices, calls,
    async open(book, chapter) {
      const parts = ['reader'];
      if (book !== undefined) parts.push(book);
      if (chapter !== undefined) parts.push(chapter);
      location.pathname = '/' + parts.join('/');
      return reader(parts);
    },
  };
}

test('malformed explicit chapter never silently displays Genesis 1 or changes saved reading', async () => {
  for (const lang of ['uk','ru','en']) {
    for (const bad of ['abc','0','01','-2','1e2','NaN','1.5',
      '9999999999999999999999999999','0x10','%20','1%2F2']) {
      const h = harness(lang);
      assert.equal(await h.open('GEN',bad),undefined,lang + ':' + bad);
      assert.equal(h.state.currentReader,null,lang + ':' + bad);
      assert.deepEqual(h.state.reader,{book:'JHN',chapter:3});
      assert.equal(h.notices.length,1);
      assert.match(h.notices[0],/role="alert"/);
      assert.match(h.notices[0],/href="\/reader"/);
      assert.doesNotMatch(h.notices[0],/GEN\/1/);
    }
  }
});

test('valid exact chapters and legacy high-chapter clamping remain usable', async () => {
  for (const lang of ['uk','ru','en']) {
    for (const [raw, expected] of [['1',1],['3',3],['50',50],['51',50],['999',50]]) {
      const h = harness(lang);
      assert.deepEqual(await h.open('GEN',raw),{book:'GEN',chapter:expected});
      assert.deepEqual(h.state.currentReader,{book:'GEN',chapter:expected});
      assert.deepEqual(h.notices,[]);
    }
  }
});

test('missing chapter resumes saved chapter and empty trailing slash retains legacy fallback', async () => {
  for (const lang of ['uk','ru','en']) {
    for (const raw of [undefined,'']) {
      const h = harness(lang);
      assert.deepEqual(await h.open('JHN',raw),{book:'JHN',chapter:3});
      assert.deepEqual(h.notices,[]);
    }
    const h = harness(lang);
    assert.deepEqual(await h.open(),{book:'JHN',chapter:3});
  }
});

test('invalid explicit chapter rejection precedes attempt API, book fetch and persistence', () => {
  const guard = source.indexOf('  if (parts[2] && (',start);
  const attempt = source.indexOf('    const attemptState = await attemptRequest("chapter"',start);
  const save = source.indexOf('localStorage.setItem("sa.reader"',start);
  assert.ok(guard > start && guard < end && attempt > guard && save > attempt);
  assert.match(source.slice(guard,end),/state\.currentReader = null/);
  assert.match(source.slice(guard,end),/role="alert"/);
});
