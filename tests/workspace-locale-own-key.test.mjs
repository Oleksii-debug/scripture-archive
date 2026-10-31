import assert from 'node:assert/strict';
import test from 'node:test';

import {
  editionAboutMarkup,
  groupManagementCopy,
  missionHistoryMarkup,
  reviewScheduleMarkup,
  workspaceCopy,
} from '../public/workspace.js';

// These are the actual canonical reading / study / group interfaces, not a
// reimplemented locale table. Inherited object properties must not be used as
// translation objects when the locale is invalid or restored from old state.
const esc = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const emptyHistory = () => ({ guest: false, error: false, locked: false, attempts: [], pending: [] });

for (const lang of ['__proto__', 'constructor', 'toString', 'hasOwnProperty', 'valueOf', 'isPrototypeOf', null, undefined, 37, {}, [], 'fr']) {
  test('canonical workspace surfaces do not inherit prototype-named locale: ' + String(lang), () => {
    const labels = workspaceCopy(lang);
    assert.equal(labels.home, 'Головна');
    assert.equal(labels.library, 'Бібліотека');
    assert.equal(labels.progress, 'Мій прогрес');
    const management = groupManagementCopy(lang);
    assert.equal(management.title, 'Керування участю');
    assert.equal(management.rotate, 'Замінити код запрошення');
    assert.equal(management.roles, 'Ведучі групи');
    const history = missionHistoryMarkup({ guest: true }, lang, esc);
    assert.match(history, /Історія спроб/);
    assert.match(history, /Увійдіть/);
    assert.doesNotMatch(history, /undefined/);
    const review = reviewScheduleMarkup(emptyHistory(), lang, esc);
    assert.match(review, /Пропозиції для повторення/);
    assert.doesNotMatch(review, /undefined/);
    const about = editionAboutMarkup({}, lang, esc);
    assert.match(about, /Біблійні видання/);
    assert.match(about, /Відомості про це видання недоступні/);
    assert.doesNotMatch(about, /undefined/);
  });
}

for (const [lang, home, group, history, editions] of [
  ['uk', 'Головна', 'Керування участю', 'Історія спроб', 'Біблійні видання'],
  ['ru', 'Главная', 'Управление участием', 'История попыток', 'Библейские издания'],
  ['en', 'Home', 'Manage membership', 'Attempt history', 'Bible editions'],
]) {
  test('supported workspace translations remain unchanged: ' + lang, () => {
    assert.equal(workspaceCopy(lang).home, home);
    assert.equal(groupManagementCopy(lang).title, group);
    assert.ok(missionHistoryMarkup({ guest: true }, lang, esc).includes(history));
    assert.ok(editionAboutMarkup({}, lang, esc).includes(editions));
  });
}
