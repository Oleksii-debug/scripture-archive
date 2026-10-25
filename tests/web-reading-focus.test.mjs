import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('mark-read keeps keyboard workflow reachable without stealing focus', async () => {
  const source = await read('public/app.js');
  const start = source.indexOf("document.querySelector('#mark-read').onclick=async");
  const end = source.indexOf("\n  document.querySelector('#start-questions')?.addEventListener", start);
  assert.ok(start !== -1 && end > start, 'execute canonical chapter-completion handler');
  const listener = source.slice(start, end);
  for (const locale of ['uk', 'ru', 'en']) {
    for (const [hasTasks, movingAway] of [[true, false], [false, false], [true, true]]) {
      let isDisabled = false, announcement = '', focusCount = 0, nextDisabled = hasTasks;
      const body = { id: 'body' }, other = { id: 'other' };
      const doc = { activeElement: body, querySelector(selector) {
        return ({ '#mark-read': markRead, '#start-questions': hasTasks ? questions : null,
          '.read-completion a': progress })[selector] ?? null;
      }};
      const markRead = { textContent: '', get disabled() { return isDisabled; }, set disabled(v) {
        isDisabled = v;
        if (v && doc.activeElement === markRead) doc.activeElement = body;
      }};
      const questions = { id: 'questions', removeAttribute(attr) {
        assert.equal(attr, 'disabled'); nextDisabled = false;
      }, focus(options) { assert.equal(options.preventScroll, true); doc.activeElement = questions; focusCount++; }};
      const progress = { id: 'progress', focus(options) {
        assert.equal(options.preventScroll, true); doc.activeElement = progress; focusCount++;
      }};
      const message = `${locale}-marked`;
      runInNewContext(listener, {
        document: doc, state: { user: null }, alreadyRead: false, history: [],
        meta: { code: 'JHN' }, chapter: 3, groupId: '', hasTasks,
        bookTitle: () => 'John',
        localStorage: { setItem() {} },
        async attemptRequest() { if (movingAway) doc.activeElement = other; },
        w: { readMarked: message }, announce(value) { announcement = value; },
        t: () => 'load-error',
      });
      doc.activeElement = markRead;
      await markRead.onclick();
      assert.equal(isDisabled, true);
      assert.equal(announcement, message);
      assert.equal(markRead.textContent, message);
      assert.equal(doc.activeElement, movingAway ? other : hasTasks ? questions : progress,
        `${locale}: focus the next available action unless the user moved elsewhere`);
      assert.equal(focusCount, movingAway ? 0 : 1);
      if (hasTasks) assert.equal(nextDisabled, false);
    }
  }
});
