import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

// Exercise the existing production URL helpers and actual search link template,
// with the repository's three licensed local John 3 corpora.
const source = (await readFile(process.env.SA_SOURCE || new URL('../public/app.js', import.meta.url), 'utf8')).replaceAll('\r\n', '\n');
const helperMatch = source.match(/(function readerVerseUrl\(code, chapter, verse\) \{[\s\S]*?\n\}\nfunction readerVerseFromUrl\(url, availableVerses\) \{[\s\S]*?\n\})\n\nasync function renderReader\(/);
const helpers = helperMatch ? vm.runInNewContext(helperMatch[1]+';({readerVerseUrl,readerVerseFromUrl})', {URL, Number, encodeURIComponent}) : null;
const templateMatch = source.match(/`<li><a href="[^"\n]*">\$\{esc\(bookTitle\(meta\)\)\} \$\{r.chapter\}:\$\{r.verse\}<\/a><p>\$\{esc\(r.text\)\}<\/p><\/li>`/);

test('search result opens a verse-specific reference rather than the top of chapter', () => {
  assert.ok(templateMatch, 'canonical search-result template missing');
  const actual = vm.runInNewContext(templateMatch[0], {
    meta: {code:'JHN'}, r:{chapter:3,verse:16,text:'sample'},
    esc: String, bookTitle:()=> 'John', readerVerseUrl: helpers?.readerVerseUrl,
  });
  assert.match(actual, /href="\/reader\/JHN\/3\?verse=16"/);
});

test('reader exposes keyboard-selectable book, chapter and verse, then focuses a permalink target', () => {
  assert.match(source, /<a class="verse-number" href="\$\{readerVerseUrl\(meta.code, chapter, i \+ 1\)\}" aria-label=/);
  assert.match(source, /data-selected-verse tabindex="-1"/);
  assert.match(source, /selected\.focus\(\{ preventScroll: true \}\)/);
  assert.match(source, /<select id="book-select">/);
  assert.match(source, /<select id="chapter-select">/);
  assert.match(source, /<label for="verse-select">\$\{t\("verse"\)\}<\/label><select id="verse-select">/);
  assert.match(source, /querySelector\("#verse-select"\)\.addEventListener\("change"/);
  assert.match(source, /navigateTo\(readerVerseUrl\(meta.code, chapter, e.target.value\)\)/);
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
