import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {routeSourceFromLocation, legacyRouteHashChanged} from '../public/route-location.js';

// Exercise the existing production URL helpers and actual search link template,
// with the repository's three licensed local John 3 corpora.
const source = (await readFile(process.env.SA_SOURCE || new URL('../public/app.js', import.meta.url), 'utf8')).replaceAll('\r\n', '\n');
const helperStart = source.indexOf('function readerChapterUrl(');
const helperEnd = source.indexOf('\nasync function renderReader(', helperStart);
const helpers = helperStart >= 0 && helperEnd > helperStart
  ? vm.runInNewContext(source.slice(helperStart, helperEnd) + ';({readerChapterUrl,readerVerseUrl,readerVerseFromUrl,readerChapterNumber})', {URL, Number, encodeURIComponent})
  : null;
const templateMatch = source.match(/`<li><a href="[^"\n]*">\$\{esc\(bookTitle\(meta\)\)\} \$\{r.chapter\}:\$\{r.verse\}<\/a><p>\$\{esc\(r.text\)\}<\/p><\/li>`/);

test('search result opens a verse-specific reference rather than the top of chapter', () => {
  assert.ok(templateMatch, 'canonical search-result template missing');
  const actual = vm.runInNewContext(templateMatch[0], {
    meta: {code:'JHN'}, r:{chapter:3,verse:16,text:'sample'},
    esc: String, bookTitle:()=> 'John', readerVerseUrl: helpers?.readerVerseUrl, groupId: '',
  });
  assert.match(actual, /href="\/reader\/JHN\/3\?verse=16"/);
});

test('reader exposes keyboard-selectable book, chapter and verse, then focuses a permalink target', () => {
  assert.match(source, /<a class="verse-number" href="\$\{readerVerseUrl\(meta.code, chapter, i \+ 1, groupId\)\}" aria-label=/);
  assert.match(source, /data-selected-verse tabindex="-1"/);
  assert.match(source, /selected\.focus\(\{ preventScroll: true \}\)/);
  assert.match(source, /<select id="book-select">/);
  assert.match(source, /<select id="chapter-select">/);
  assert.match(source, /<label for="verse-select">\$\{t\("verse"\)\}<\/label><select id="verse-select">/);
  assert.match(source, /querySelector\("#verse-select"\)\.addEventListener\("change"/);
  assert.match(source, /e\.target\.value \? readerVerseUrl\(meta.code, chapter, e.target.value, groupId\)/);
  for (const translation of ['Вірш','Стих','Verse']) assert.ok(source.includes(`verse: "${translation}"`));
});

for (const lang of ['uk','ru','en']) {
  test(`${lang}: existing John chapter 3 verse 16 resolves from its reloadable URL`, async () => {
    assert.ok(helpers, 'reader URL helpers missing from production source');
    const editionFolder = {uk:'uk-ohiienko',ru:'ru',en:'en'}[lang];
    const book = JSON.parse(await readFile(new URL(`../public/data/bible/${editionFolder}/JHN.json`,import.meta.url), 'utf8'));
    const verses = book.chapters[2];
    assert.ok(verses[15] && verses[15].length > 40);
    const link = helpers.readerVerseUrl('JHN',3,16);
    assert.equal(link, '/reader/JHN/3?verse=16');
    assert.equal(helpers.readerVerseFromUrl('https://scripture-archive.test'+link, verses.length),16);
    assert.equal(helpers.readerVerseFromUrl('https://scripture-archive.test/reader/JHN/3', verses.length),null);
  });
}

test('invalid or out-of-range coordinates never mark a verse selected', () => {
  assert.ok(helpers, 'reader URL helpers missing from production source');
  for (const value of ['0','37','-1','16x','016','1e2','Infinity','99999999999999999999']) {
    assert.equal(helpers.readerVerseFromUrl(`https://scripture-archive.test/reader/JHN/3?verse=${value}`,36),null,value);
  }
});

test('verse selector can return from an exact verse to the chapter-only permalink', () => {
  const match = source.match(/document\.querySelector\("#verse-select"\)\.addEventListener\("change", \(e\) => \{([\s\S]*?)\n  \}\);/);
  assert.ok(match, 'canonical verse select change handler missing');
  const opened = [];
  const onChange = vm.runInNewContext(`(e) => {${match[1]}
  }`, {
    meta: {code: 'JHN'},
    chapter: 3,
    readerVerseUrl: helpers?.readerVerseUrl,
    readerChapterUrl: helpers?.readerChapterUrl,
    groupId: '',
    navigateTo: path => opened.push(path),
  });
  onChange({target:{value:'16'}});
  onChange({target:{value:''}});
  assert.deepEqual(opened, ['/reader/JHN/3?verse=16', '/reader/JHN/3']);
});

const i18nDefinition = source.match(/const I18N = (\{[\s\S]*?\n\});\n/);
const i18n = i18nDefinition ? vm.runInNewContext('(' + i18nDefinition[1] + ')') : null;
const searchHandler = source.match(/document\.querySelector\("#book-search"\)\.addEventListener\("submit", \(e\) => \{([\s\S]*?)\n  \}\);\n\}/);

for (const [lang, edition] of Object.entries({uk:'uk-ohiienko', ru:'ru', en:'en'})) {
  test(`${lang}: real John 3:16 search returns focus, announcement and a reloadable link`, async () => {
    assert.ok(searchHandler, 'production search submit handler must be available');
    assert.ok(i18n?.[lang], 'permanent language copy is missing');
    assert.match(source, /<ol class="search-results" id="search-results" tabindex="-1">/);
    const book = JSON.parse(await readFile(new URL(`../public/data/bible/${edition}/JHN.json`, import.meta.url), 'utf8'));
    const searchInput = {value: String(book.chapters[2][15]).slice(0,24).trim()};
    const focusEvents = [], announcements = [];
    const panel = {hidden:true, scrollIntoView() {}};
    const list = {innerHTML:'', focus(options) {focusEvents.push(options?.preventScroll === true);}};
    const elements = {'#search-input':searchInput,'#search-panel':panel,'#search-results':list};
    const submit = vm.runInNewContext(`(e) => {${searchHandler[1]}\n  }`, {
      document:{querySelector:key=>elements[key]}, state:{lang}, book,
      bibleText:String, meta:{code:'JHN'}, readerVerseUrl:helpers.readerVerseUrl, groupId: '',
      esc:String, bookTitle:()=> 'John', t:key=>i18n[lang][key],
      announce:message=>announcements.push(message),
    });
    submit({preventDefault() {}});
    assert.equal(panel.hidden, false);
    assert.match(list.innerHTML, /href="\/reader\/JHN\/3\?verse=16"/);
    assert.deepEqual(focusEvents,[true]);
    assert.deepEqual(announcements,[`${i18n[lang].search}: 1`]);
    searchInput.value = 'xyz-unmatched-Bible-000000000';
    submit({preventDefault() {}});
    assert.deepEqual(focusEvents,[true,true]);
    assert.equal(announcements.at(-1), i18n[lang].noResults);
  });
}


test('reader entry route resumes the last book and chapter for uk/ru/en', async () => {
  const routeStart = source.indexOf('async function route() {');
  const routeEnd = source.indexOf('\n}\n\nlangSelect.addEventListener("change"', routeStart);
  const readerStart = source.indexOf('async function renderReader(parts) {');
  const selection = '  state.reader = { book: meta.code, chapter };';
  const readerEnd = source.indexOf(selection, readerStart);
  assert.ok(routeStart >= 0 && routeEnd > routeStart && readerEnd > readerStart, 'real route and reader selection missing');

  // Evaluate actual route() and the original renderReader() book/chapter selection
  // against the repository catalog, without simulating unrelated mission/UI effects.
  const routeSource = source.slice(routeStart, routeEnd + 2);
  const readerSource = source.slice(readerStart, readerEnd + selection.length) + '\n}';
  const catalog = JSON.parse(await readFile(new URL('../public/data/catalog.json', import.meta.url), 'utf8'));
  for (const lang of ['uk', 'ru', 'en']) {
    const context = {
      routeSourceFromLocation,
      state: {lang, reader: {book:'GEN', chapter:12}, currentReader:null},
      location: {hash:'', pathname:'/reader/GEN/12', href:'https://sa.test/reader/GEN/12'},
      setActiveNav() {},
      async getCatalog() {return catalog;},
      selectedEdition() {return {id:'not-a-local-edition'};},
      // The real bookmark stage now validates publisher rights before saving.
      localEditionMetadata() {return {title:'Verified test edition'};},
      editionDetails(edition) {return {title:edition.title};},
      clearInterval() {},
      timerInterval: null,
      communityRefreshInterval: null, communityOwnerRefreshInterval: null,
      attemptRequest: async () => ({invalidated:false}),
      getBook: async () => ({chapters:Array.from({length:150}, () => ['fixture'])}),
      readerVerseFromUrl:helpers.readerVerseFromUrl,
      readerChapterNumber:helpers.readerChapterNumber,
      cleanPublicCopy() {},
      setStaticI18n() {},
      updatePageMetadata() {},
      main: {querySelector() {return null;}},
      window: {scrollTo() {}, saAnalytics:null},
      shell() {},
      t() {return '';},
      console: {error(error) {throw error;}},
    };
    const {route} = vm.runInNewContext(readerSource + '\n' + routeSource + '\n({route})', context);
    for (const [path, expectedBook, expectedChapter] of [
      ['/reader/GEN/12', 'GEN', 12],
      ['/reader', 'GEN', 12],
      ['/reader/JHN/3', 'JHN', 3],
      ['/reader', 'JHN', 3],
    ]) {
      context.location.pathname = path;
      await route();
      assert.equal(context.state.reader.book, expectedBook, lang + ' ' + path + ': book must not jump');
      assert.equal(context.state.reader.chapter, expectedChapter, lang + ' ' + path + ': chapter must not jump');
      // Simulate existing sa.reader JSON readback on a later page load.
      context.state.reader = JSON.parse(JSON.stringify(context.state.reader));
    }
  }
});

test('native fragment anchors remain inside the reader instead of navigating home', async () => {
  const start = source.indexOf('async function route() {');
  const end = source.indexOf('\n}\n\nlangSelect.addEventListener("change"', start);
  assert.ok(start >= 0 && end > start, 'canonical route must be available');
  const actualRoute = source.slice(start, end + 2);
  const visited = [];
  const location = {pathname:'/reader/JHN/3', hash:'#v16'};
  const {route} = vm.runInNewContext(actualRoute + '\n({route})', {
    routeSourceFromLocation,
    location, state:{lang:'uk'}, timerInterval:null, communityRefreshInterval:null, communityOwnerRefreshInterval:null,
    clearInterval() {},
    async renderReader(parts) {visited.push('reader:' + parts.join('/'));},
    async renderHome() {visited.push('home');},
    cleanPublicCopy() {}, setStaticI18n() {}, updatePageMetadata() {},
    window:{scrollTo() {}, saAnalytics:null},
    main:{querySelector() {return null;}},
    shell() {}, t() {return 'error';},
    console:{error(error) {throw error;}},
  });
  await route();
  assert.deepEqual(visited, ['reader:reader/JHN/3']);

  const listenerStart = source.indexOf('window.addEventListener("hashchange",');
  const listenerEnd = source.indexOf('window.addEventListener("popstate",', listenerStart);
  assert.ok(listenerStart >= 0 && listenerEnd > listenerStart, 'real hashchange handler missing');
  const handlerSource = source.slice(listenerStart, listenerEnd);
  for (const [fragment, expectedCount] of [['#v16',0], ['#reading',0], ['#/reader/JHN/3',1]]) {
    let callback, invocations = 0;
    vm.runInNewContext(handlerSource, {
      legacyRouteHashChanged,
      location:{hash:fragment},
      route() {invocations++;},
      window:{addEventListener(name, handler) {
        assert.equal(name,'hashchange');
        callback = handler;
      }},
    });
    assert.equal(typeof callback, 'function', fragment);
    callback({oldURL:'https://sa.test/reader/JHN/3',newURL:'https://sa.test/reader/JHN/3'+fragment});
    assert.equal(invocations, expectedCount, fragment);
  }
});


test('legacy hash reader references survive delegated clicks while local verse anchors stay native', () => {
  const start = source.indexOf('document.addEventListener("click", event => {');
  const closing = '\n}, true);';
  const end = source.indexOf(closing, start);
  assert.ok(start >= 0 && end > start, 'existing global link handler missing');
  let clickHandler;
  const visits = [], analytics = [];
  vm.runInNewContext(source.slice(start, end + closing.length), {
    document: {addEventListener(type, handler, capture) {
      if (type === 'click' && capture) clickHandler = handler;
    }},
    window: {saAnalytics: {track(name, info) {analytics.push([name, info.destination]);}}},
    location: {origin: 'https://scripture-archive.test', href: 'https://scripture-archive.test/'},
    URL,
    navigateTo: path => visits.push(path),
  });
  assert.equal(typeof clickHandler, 'function');

  const openLink = (href) => {
    let prevented = false;
    const anchor = {href, target: '', hasAttribute() {return false;}};
    clickHandler({
      target: {closest() {return anchor;}},
      defaultPrevented: false, button: 0,
      metaKey: false, ctrlKey: false, shiftKey: false, altKey: false,
      preventDefault() {prevented = true;},
    });
    return prevented;
  };
  assert.equal(openLink('https://scripture-archive.test/#/reader/JHN/3'), true);
  assert.equal(visits.at(-1), '/#/reader/JHN/3', 'the old #/reader link must not open home');
  assert.deepEqual(analytics.at(-1), ['navigation_click', 'reader']);
  assert.equal(openLink('https://scripture-archive.test/reader/JHN/3?verse=16'), true);
  assert.equal(visits.at(-1), '/reader/JHN/3?verse=16', 'canonical verse reference stays intact');
  const count = visits.length;
  assert.equal(openLink('https://scripture-archive.test/reader/JHN/3#v16'), false);
  assert.equal(visits.length, count, 'native in-chapter fragment must not be intercepted');
});

test('book fetch failure keeps the last chapter until a successful retry (uk/ru/en)', async () => {
  const start = source.indexOf('async function renderReader(parts) {');
  const stop = source.indexOf('  const citationCopy = ', start);
  assert.ok(start >= 0 && stop > start, 'canonical reader fetch stage must exist');
  const entry = source.slice(start, stop) + '\n}';
  for (const [lang,edition] of Object.entries({uk:'uk-ohiienko',ru:'ru',en:'en'})) {
    const book = JSON.parse(await readFile(new URL('../public/data/bible/'+edition+'/JHN.json',import.meta.url),'utf8'));
    let fail = true;
    const writes = [];
    const saved = new Map([['sa.reader',JSON.stringify({book:'GEN',chapter:12})]]);
    const state = {lang,reader:{book:'GEN',chapter:12}};
    const ctx = {
      state,location:{href:'https://scripture-archive.test/reader/JHN/3?verse=16'},
      setActiveNav(){},getCatalog:async()=>({editionBooks:{local:[{code:'JHN',chapters:21}]}}),
      selectedEdition:()=>({id:'local'}),attemptRequest:async()=>({invalidated:false}),
      getBook:async()=>{if(fail)throw Error('temporary_outage');return book;},
      readerVerseFromUrl:helpers.readerVerseFromUrl,
      readerChapterNumber:helpers.readerChapterNumber,
      localEditionMetadata() {return {title:'Verified test edition'};},
      editionDetails(edition) {return {title:edition.title};},
      localStorage:{setItem(k,v){writes.push([k,v]);saved.set(k,v)}},
      sessionStorage:{removeItem(){}},console:{warn(){}}
    };
    const {renderReader} = vm.runInNewContext(entry+'\n({renderReader})',ctx);
    await assert.rejects(renderReader(['reader','JHN','3']),/temporary_outage/);
    assert.equal(state.reader.book,'GEN',lang);
    assert.equal(state.reader.chapter,12,lang);
    assert.equal(saved.get('sa.reader'),JSON.stringify({book:'GEN',chapter:12}),lang);
    assert.equal(writes.length,0,lang);
    fail = false;
    await renderReader(['reader','JHN','3']);
    assert.equal(state.reader.book,'JHN',lang);
    assert.equal(state.reader.chapter,3,lang);
    assert.equal(saved.get('sa.reader'),JSON.stringify({book:'JHN',chapter:3}),lang);
    assert.equal(writes.length,1,lang);
  }
});
