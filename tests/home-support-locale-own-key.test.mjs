import assert from 'node:assert/strict';
import test from 'node:test';
import { homePage } from '../public/home.js';
import { supportSection } from '../public/support.js';

const invalid = ['__proto__', 'constructor', 'toString', 'hasOwnProperty',
  'valueOf', 'isPrototypeOf', null, undefined, 0, true, {}, [], 'fr'];

for (const lang of invalid) {
  test('home and donation retain genuine Ukrainian copy for unowned locale: ' + String(lang), () => {
    const home = homePage(lang, null);
    const donation = supportSection(lang, true);
    assert.equal(home, homePage('uk', null));
    assert.equal(donation, supportSection('uk', true));
    assert.match(home, /Міжнародна біблійна платформа/);
    assert.match(home, /<h1>Писання\.<br>Дослідження\.<br>Спільнота\.<\/h1>/);
    assert.match(home, /aria-live="polite"/);
    assert.match(donation, /<h1 id="donation-title">Підтримка розвитку платформи<\/h1>/);
    assert.doesNotMatch(home + donation, /undefined/);
  });
}

for (const [lang,eye,donation] of [
  ['uk','Міжнародна біблійна платформа','Підтримка розвитку платформи'],
  ['ru','Международная библейская платформа','Поддержка развития платформы'],
  ['en','An international Bible study platform','Support the platform’s development'],
]) {
  test('home and donor copy preserve supported language: '+lang, () => {
    assert.match(homePage(lang, null), new RegExp(eye));
    assert.ok(supportSection(lang).includes(donation));
    assert.ok(supportSection(lang, true).includes('<h1 id="donation-title">'));
    assert.ok(supportSection(lang, false).includes('<h2 id="donation-title">'));
  });
}

test('valid authenticated home retains profile entry and donation safety', () => {
  const html=homePage('uk',{id:'account-1'});
  assert.match(html, /Мій профіль/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.match(html, /https:\/\/send\.monobank\.ua\//);
});
