import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import test from 'node:test';

// Integrity receipt for the *exact published-source catalog bytes*, not a
// reserialized JSON or an unverified historical archive snapshot.
const catalogBytes=readFileSync(new URL('../public/data/catalog.json',import.meta.url));
const catalog=JSON.parse(catalogBytes.toString('utf8'));
const manifest=JSON.parse(readFileSync(new URL(
  '../public/data/bible-build-manifest.json',import.meta.url),'utf8'));

test('Bible build manifest digest matches exact canonical catalog UTF-8 bytes',()=>{
  assert.match(manifest.catalogSha256,/^[a-f0-9]{64}$/);
  const actual=createHash('sha256').update(catalogBytes).digest('hex');
  assert.equal(manifest.catalogSha256,actual,
    'do not publish a manifest for an older or differently serialized catalog');
});

test('manifest default-edition coverage reconciles to the real catalog, not a guessed count',()=>{
  assert.deepEqual(manifest.locales,['uk','ru','en']);
  assert.equal(manifest.commonCanonBooks,66);
  const count=manifest.locales.reduce((sum,lang)=>{
    const books=catalog.books?.[lang];
    assert.ok(Array.isArray(books),lang+' catalog is present');
    assert.equal(books.length,manifest.commonCanonBooks,lang+' book count');
    assert.equal(new Set(books.map(book=>book.code)).size,books.length,lang+' unique codes');
    assert.ok(books.every(book=>/^[A-Z0-9]{3}$/.test(book.code) &&
      Number.isSafeInteger(book.chapters) && book.chapters>0),lang+' valid book metadata');
    return sum+books.length;
  },0);
  assert.equal(manifest.bookFiles,count);
  assert.equal(count,198);
});

test('the declared default corpus actually consists of 198 readable book files',()=>{
  let verified=0;
  for(const lang of manifest.locales){
    for(const meta of catalog.books[lang]){
      const book=JSON.parse(readFileSync(new URL(
        '../public/data/bible/'+lang+'/'+meta.code+'.json',import.meta.url),'utf8'));
      assert.equal(book.bookCode,meta.code,lang+' '+meta.code);
      assert.equal(book.locale,lang,lang+' '+meta.code);
      assert.equal(book.chapters.length,meta.chapters,lang+' '+meta.code);
      assert.ok(book.chapters.every(chapter=>
        Array.isArray(chapter) && chapter.length>0 &&
        chapter.every(verse=>typeof verse==='string' && verse.trim()!=='')
      ),lang+' '+meta.code+' must have readable text');
      verified++;
    }
  }
  assert.equal(verified,manifest.bookFiles);
});
