import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

// Synthetic metadata only. No Bible passage or copyrighted text is used.
test('about rights table reads titles, rights, source links and attribution from the canonical catalog in UK/RU/EN', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const source = app.match(/async function renderAbout\(\) \{[\s\S]*?\n\}\n(?=function renderGate\(\))/);
  assert.ok(source, 'canonical about renderer not found');
  const catalog = {
    translations: { 'uk-ohiienko': {
      title: 'TEST OHIENKO TITLE', license: 'TEST SHARE-ALike',
      source: 'https://source.example/ohienko?a=1&b=2',
      licenseUrl: 'https://license.example/by-sa?a=1&b=2',
      attribution: 'TEST OHIENKO CREDIT',
    } },
    editions: Object.fromEntries(['uk','ru','en'].map(lang => [lang, {
      title: `TEST ${lang.toUpperCase()} TITLE`,
      license: `TEST ${lang.toUpperCase()} RIGHTS`,
      source: `https://source.example/${lang}?a=1&b=2`,
    }])),
  };
  const escapeHtml = value => String(value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  for (const lang of ['uk','ru','en']) {
    let html = '';
    const renderAbout = Function('setActiveNav','getCatalog','state','esc','t','shell',
      source[0] + '\nreturn renderAbout;')(
        () => {}, async () => catalog, { lang }, escapeHtml,
        key => key, rendered => { html = rendered; },
      );
    await renderAbout();
    for (const [group, edition] of [
      ['uk-ohiienko', catalog.translations['uk-ohiienko']],
      ...Object.entries(catalog.editions),
    ]) {
      for (const field of group === 'uk-ohiienko'
        ? ['title','license','source','licenseUrl','attribution']
        : ['title','license','source']) {
        assert.ok(html.includes(escapeHtml(edition[field])),
          `${lang}: ${group} ${field} must be derived from catalog`);
      }
    }
    assert.ok(!html.includes('https://github.com/onlydotbible/ohienko'),
      lang + ': rights view must not retain a hard-coded source when catalog changes');
  }
});
