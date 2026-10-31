import test from 'node:test';
import assert from 'node:assert/strict';
import {
  workspaceCopy, groupManagementCopy, missionHistoryMarkup,
  reviewScheduleMarkup, editionAboutMarkup,
} from '../public/workspace.js';

const esc = value => String(value);
const badLocales = ['__proto__', 'constructor', 'toString', 'hasOwnProperty'];

test('all five canonical workspace copy surfaces reject inherited locale names', () => {
  const guestHistory = { guest: true };
  const emptyHistory = { attempts: [] };
  const catalog = { translations: {}, editions: {} };
  const now = new Date('2026-10-31T12:00:00.000Z');

  for (const lang of badLocales) {
    assert.deepEqual(workspaceCopy(lang), workspaceCopy('uk'), lang + ' workspace');
    assert.deepEqual(groupManagementCopy(lang), groupManagementCopy('uk'), lang + ' groups');
    assert.equal(missionHistoryMarkup(guestHistory, lang, esc),
      missionHistoryMarkup(guestHistory, 'uk', esc), lang + ' history');
    assert.equal(reviewScheduleMarkup(emptyHistory, lang, esc, now),
      reviewScheduleMarkup(emptyHistory, 'uk', esc, now), lang + ' review');
    assert.equal(editionAboutMarkup(catalog, lang, esc),
      editionAboutMarkup(catalog, 'uk', esc), lang + ' edition provenance');
  }
});

test('invalid typed locale values also fail closed without breaking legitimate locale copies', () => {
  const emptyHistory = { attempts: [] };
  const now = new Date('2026-10-31T12:00:00.000Z');
  for (const lang of [null, undefined, {}, [], 123, true]) {
    assert.deepEqual(workspaceCopy(lang), workspaceCopy('uk'));
    assert.deepEqual(groupManagementCopy(lang), groupManagementCopy('uk'));
    assert.equal(reviewScheduleMarkup(emptyHistory, lang, esc, now),
      reviewScheduleMarkup(emptyHistory, 'uk', esc, now));
  }
  assert.equal(workspaceCopy('uk').home, 'Головна');
  assert.equal(workspaceCopy('ru').home, 'Главная');
  assert.equal(workspaceCopy('en').home, 'Home');
  assert.equal(groupManagementCopy('uk').title, 'Керування участю');
  assert.equal(groupManagementCopy('en').title, 'Manage membership');
});
