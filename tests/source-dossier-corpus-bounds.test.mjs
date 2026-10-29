import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { scriptureDossiers } from '../public/scripture-dossiers.js';

// Verify the existing dossier's exact-verse links against the same three
// locally shipped corpora used by the canonical reader. A valid chapter count
// alone does not guarantee that an individually cited verse is present.
const editions = { uk:'uk-ohiienko', ru:'ru', en:'en' };
const references = scriptureDossiers.flatMap(dossier => [
  ...dossier.sources.map(ref => ({ dossier:dossier.id, ref })),
  ...dossier.related.map(link => ({ dossier:dossier.id, ref:link.via })),
]);

test('every dossier source and relation resolves to real verses in each local edition', async () => {
  assert.ok(references.length > 0);
  for (const [language, directory] of Object.entries(editions)) {
    const books = new Map();
    for (const { dossier, ref } of references) {
      if (!books.has(ref.book)) {
        const contents = await readFile(new URL(
          `../public/data/bible/${directory}/${ref.book}.json`, import.meta.url), 'utf8');
        const record = JSON.parse(contents);
        assert.equal(record.bookCode, ref.book, `${language} ${ref.book} source identity`);
        assert.ok(Array.isArray(record.chapters), `${language} ${ref.book} has chapters`);
        books.set(ref.book, record);
      }
      const verses = books.get(ref.book).chapters[ref.chapter-1];
      const context = `${language} dossier=${dossier} ${ref.book} ${ref.chapter}:${ref.first}-${ref.last}`;
      assert.ok(Array.isArray(verses), context + ' chapter is present');
      assert.ok(Number.isSafeInteger(ref.first) && Number.isSafeInteger(ref.last) &&
        ref.first > 0 && ref.last >= ref.first && ref.last <= verses.length,
        context + ' cited verse range is present');
      for (let index=ref.first-1; index < ref.last; index++) {
        assert.equal(typeof verses[index], 'string', context + ' verse is readable text');
        assert.ok(verses[index].trim().length > 0, context + ' verse is nonblank');
      }
    }
  }
});
