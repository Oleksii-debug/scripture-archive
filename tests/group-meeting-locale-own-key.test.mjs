import assert from 'node:assert/strict';
import test from 'node:test';
import { meetingNotesCopy, meetingNotesMarkup } from '../public/group-meeting-notes.js';
import { meetingHistoryCopy, meetingHistoryMarkup } from '../public/group-meeting-history.js';

const esc = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const session = { id: 'meeting-1', canEdit: true, reflection: 'Safe note', participant_count: 2 };

for (const lang of ['__proto__', 'constructor', 'toString', 'hasOwnProperty', 'valueOf', 'isPrototypeOf', null, undefined, 0, {}, [], 'fr']) {
  test('meeting history and notes refuse inherited locale aliases: ' + String(lang), () => {
    const notes = meetingNotesCopy(lang);
    assert.equal(notes.edit, 'Виправити підсумок зустрічі');
    assert.equal(notes.save, 'Зберегти виправлення');
    const history = meetingHistoryCopy(lang);
    assert.equal(history.title, 'Історія зустрічей');
    assert.equal(history.more, 'Показати попередні зустрічі');
    assert.equal(history.notes.edit, notes.edit);
    const renderedHistory = meetingHistoryMarkup(history);
    assert.match(renderedHistory, /Історія зустрічей/);
    assert.match(renderedHistory, /Завантаження зустрічей/);
    assert.doesNotMatch(renderedHistory, /undefined/);
    const renderedNotes = meetingNotesMarkup(session, notes, esc);
    assert.match(renderedNotes, /Зберегти виправлення/);
    assert.match(renderedNotes, /Кількість присутніх/);
    assert.doesNotMatch(renderedNotes, /undefined/);
  });
}

for (const [lang, historyTitle, notesTitle] of [
  ['uk', 'Історія зустрічей', 'Виправити підсумок зустрічі'],
  ['ru', 'История встреч', 'Исправить итог встречи'],
  ['en', 'Meeting history', 'Correct meeting notes'],
]) {
  test('meeting copy preserves the selected supported language: ' + lang, () => {
    const copy = meetingHistoryCopy(lang);
    assert.equal(copy.title, historyTitle);
    assert.equal(copy.notes.edit, notesTitle);
    assert.ok(meetingHistoryMarkup(copy).includes(historyTitle));
    assert.ok(meetingNotesMarkup(session, copy.notes, esc).includes(notesTitle));
  });
}
