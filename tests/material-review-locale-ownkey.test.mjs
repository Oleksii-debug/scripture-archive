import assert from 'node:assert/strict';
import test from 'node:test';
import {
  reviewText,
  editorRolesMarkup,
  renderEditorialTakedownSearch,
} from '../public/material-review.js';

const esc = value => String(value);
const unexpectedLocales = [
  '__proto__', 'constructor', 'toString', 'valueOf', 'hasOwnProperty',
  'unknown', '', null, undefined, 42, true, {}, Object.create(null),
];

function searchHTML(language) {
  const root = {
    isConnected: true,
    innerHTML: '',
    querySelector: () => null,
  };
  renderEditorialTakedownSearch(
    root, { isConnected: true }, reviewText('uk'), language,
    esc, () => {}, () => {},
  );
  return root.innerHTML;
}

test('post-terminal editorial copy has one complete Ukrainian fallback for malformed and inherited language keys', () => {
  const expected = reviewText('uk');
  for (const locale of unexpectedLocales) {
    // A null-prototype object deliberately has no toString() method.
    const description = locale !== null && typeof locale === 'object' ? 'object' : String(locale);
    assert.deepEqual(reviewText(locale), expected, description);
    assert.equal(
      editorRolesMarkup([], locale, esc),
      editorRolesMarkup([], 'uk', esc),
      'editor management must use complete own-key copy for ' + description,
    );
    assert.equal(
      searchHTML(locale), searchHTML('uk'),
      'editorial public search must use complete own-key copy for ' + description,
    );
  }
});

test('the three approved locale dictionaries preserve their public/editor/search translations', () => {
  const samples = {
    uk: ['Перевірені матеріали', 'Редактори', 'Пошук опублікованих матеріалів'],
    ru: ['Проверенные материалы', 'Редакторы', 'Поиск опубликованных материалов'],
    en: ['Reviewed materials', 'Editors', 'Find published materials'],
  };
  for (const [lang, [review, editor, search]] of Object.entries(samples)) {
    assert.equal(reviewText(lang).publicTitle, review);
    assert.match(editorRolesMarkup([], lang, esc), new RegExp(editor));
    assert.match(searchHTML(lang), new RegExp(search));
    assert.equal(typeof reviewText(lang).selfReview, 'string');
  }
});
