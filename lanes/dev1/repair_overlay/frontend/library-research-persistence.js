import {chooseTransport, unwrap} from './transport.js';
import {validateSearchResponse} from './library-ui.js';
import {
  buildResearchTarget,
  findCurrentRecord,
  hasTargetCollision,
  targetMatchesContext,
  validateResearchList,
  workspaceEnabled,
} from './research-persistence.js';

const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/;
const COMMANDS = new Set([
  'system.bootstrap',
  'library.search',
  'research.list_bookmarks',
  'research.upsert_bookmark',
  'research.delete_bookmark',
  'research.list_notes',
  'research.upsert_note',
  'research.delete_note',
]);
const byId = id => document.getElementById(id);
let transportPromise = null;
let current = null;
let generation = 0;
let capabilities = null;

function element(tag, text = '', attrs = {}) {
  const node = document.createElement(tag);
  if (text !== '') node.textContent = String(text);
  for (const [name, value] of Object.entries(attrs)) {
    if (name === 'className') node.className = String(value);
    else node.setAttribute(name, String(value));
  }
  return node;
}

async function invoke(command, payload = {}) {
  if (!COMMANDS.has(command)) throw new Error('Library research command is not allowlisted');
  if (!transportPromise) transportPromise = chooseTransport();
  return await unwrap(await transportPromise, command, payload);
}

export function parseTaskIdentity(text) {
  const prefix = 'Завдання: ';
  if (typeof text !== 'string' || !text.startsWith(prefix)) return null;
  const parts = text.slice(prefix.length).split(' / ');
  if (parts.length !== 3 || parts.some(part => !ID_RE.test(part))) return null;
  return {campaign_id: parts[0], mission_id: parts[1], node_id: parts[2]};
}

export function selectExactTask(data, identity) {
  if (!identity || !ID_RE.test(identity.campaign_id || '') || !ID_RE.test(identity.mission_id || '') || !ID_RE.test(identity.node_id || '')) {
    throw new Error('invalid Library task identity');
  }
  const validated = validateSearchResponse(data);
  const matches = validated.results.filter(row =>
    row.kind === 'task' &&
    row.id === identity.node_id &&
    row.campaign_id === identity.campaign_id &&
    row.mission_id === identity.mission_id
  );
  if (matches.length !== 1) throw new Error('Library task no longer resolves uniquely in canonical search');
  return matches[0];
}

function taskContext(row) {
  const mission = {campaign_id: row.campaign_id, mission_id: row.mission_id};
  const task = {
    node_id: row.id,
    mission_id: row.mission_id,
    source_references: [...row.source_references],
  };
  return {task, mission, target: buildResearchTarget(task, mission)};
}

function tags(value) {
  const out = [];
  for (const raw of String(value || '').split(',')) {
    const tag = raw.trim();
    if (tag && !out.includes(tag)) out.push(tag);
  }
  if (out.length > 20 || out.some(tag => tag.length > 50)) throw new Error('Теги: максимум 20 значень до 50 символів.');
  return out;
}

function status(message) {
  const node = byId('library-research-status');
  if (node) node.textContent = String(message || '');
}

function setPanelEnabled(enabled) {
  const panel = byId('library-research-panel');
  if (!panel) return;
  for (const control of panel.querySelectorAll('input,textarea,button')) control.disabled = !enabled;
}

function clearEditors() {
  for (const id of ['library-bookmark-title', 'library-bookmark-tags', 'library-note-title', 'library-note-tags', 'library-note-body']) {
    const node = byId(id);
    if (node) node.value = '';
  }
  for (const id of ['library-bookmark-delete', 'library-note-delete']) {
    const node = byId(id);
    if (node) node.disabled = true;
  }
}

export function invalidateLibraryResearchPersistence() {
  generation += 1;
  current = null;
  clearEditors();
  setPanelEnabled(false);
  status('Виберіть task у результатах пошуку.');
}

function loadEditors(bookmarks, notes, task, mission) {
  clearEditors();
  const bookmark = findCurrentRecord('bookmark', bookmarks, task, mission);
  const note = findCurrentRecord('note', notes, task, mission);
  if (bookmark) {
    byId('library-bookmark-title').value = bookmark.title;
    byId('library-bookmark-tags').value = bookmark.tags.join(', ');
    byId('library-bookmark-delete').disabled = false;
  }
  if (note) {
    byId('library-note-title').value = note.title;
    byId('library-note-tags').value = note.tags.join(', ');
    byId('library-note-body').value = note.body;
    byId('library-note-delete').disabled = false;
  }
}

async function refreshCurrent(expectedGeneration = generation) {
  if (!current || expectedGeneration !== generation) return;
  const context = current;
  const [bookmarkData, noteData] = await Promise.all([
    invoke('research.list_bookmarks', {query: context.target.node_id}),
    invoke('research.list_notes', {query: context.target.node_id}),
  ]);
  if (current !== context || expectedGeneration !== generation) return;
  const bookmarks = validateResearchList('bookmark', bookmarkData);
  const notes = validateResearchList('note', noteData);
  loadEditors(bookmarks, notes, context.task, context.mission);
  status(`Особисті записи для ${context.target.node_id} готові.`);
}

async function activate(identity, button) {
  const mine = ++generation;
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  status('Перевірка canonical task перед відкриттям особистих записів…');
  try {
    if (!capabilities) capabilities = (await invoke('system.bootstrap')).capabilities || {};
    if (!workspaceEnabled(capabilities)) throw new Error('Research persistence capability недоступна');
    const result = await invoke('library.search', {
      query: identity.node_id,
      campaign_id: identity.campaign_id,
      mission_id: identity.mission_id,
      limit: 50,
    });
    if (mine !== generation) return;
    current = taskContext(selectExactTask(result, identity));
    setPanelEnabled(true);
    await refreshCurrent(mine);
    if (mine === generation && !byId('library-view')?.classList.contains('hidden')) byId('library-research-heading')?.focus();
  } catch (error) {
    if (mine === generation) {
      current = null;
      clearEditors();
      setPanelEnabled(false);
      status(`Не вдалося відкрити особисті записи: ${error.message}`);
    }
  } finally {
    button.disabled = false;
    button.setAttribute('aria-busy', 'false');
  }
}

async function save(kind) {
  if (!current) return;
  const mine = generation;
  const context = current;
  try {
    const isBookmark = kind === 'bookmark';
    const listCommand = isBookmark ? 'research.list_bookmarks' : 'research.list_notes';
    const existing = validateResearchList(kind, await invoke(listCommand, {}));
    if (mine !== generation || current !== context) throw new Error('Research context changed; повторіть дію.');
    if (hasTargetCollision(kind, existing, context.task, context.mission)) {
      throw new Error('ID запису вже належить іншому canonical target; збереження заблоковано.');
    }
    const title = byId(isBookmark ? 'library-bookmark-title' : 'library-note-title').value.trim();
    if (!title) throw new Error('Назва обов’язкова.');
    const record = {
      title,
      target: context.target,
      tags: tags(byId(isBookmark ? 'library-bookmark-tags' : 'library-note-tags').value),
    };
    record[isBookmark ? 'bookmark_id' : 'note_id'] = context.target.node_id;
    if (!isBookmark) {
      record.body = byId('library-note-body').value.trim();
      if (!record.body) throw new Error('Текст нотатки обов’язковий.');
    }
    const command = isBookmark ? 'research.upsert_bookmark' : 'research.upsert_note';
    const response = await invoke(command, {[kind]: record});
    const returned = response[kind];
    validateResearchList(kind, {[isBookmark ? 'bookmarks' : 'notes']: [returned]});
    if (!targetMatchesContext(returned?.target, context.task, context.mission)) {
      throw new Error('Backend повернув запис для іншого canonical target.');
    }
    if (mine === generation && current === context) await refreshCurrent(mine);
  } catch (error) {
    if (mine === generation && current === context) status(`Не вдалося зберегти: ${error.message}`);
  }
}

async function remove(kind) {
  if (!current) return;
  const mine = generation;
  const context = current;
  try {
    const isBookmark = kind === 'bookmark';
    const listCommand = isBookmark ? 'research.list_bookmarks' : 'research.list_notes';
    const existing = validateResearchList(kind, await invoke(listCommand, {}));
    if (mine !== generation || current !== context) throw new Error('Research context changed; повторіть дію.');
    if (hasTargetCollision(kind, existing, context.task, context.mission)) {
      throw new Error('ID запису належить іншому canonical target; видалення заблоковано.');
    }
    if (!findCurrentRecord(kind, existing, context.task, context.mission)) {
      throw new Error('Запис для поточного canonical target уже відсутній.');
    }
    const idKey = isBookmark ? 'bookmark_id' : 'note_id';
    const command = isBookmark ? 'research.delete_bookmark' : 'research.delete_note';
    const response = await invoke(command, {[idKey]: context.target.node_id});
    if (!response || typeof response.deleted !== 'boolean') throw new Error('Некоректна delete-відповідь');
    if (mine === generation && current === context) await refreshCurrent(mine);
  } catch (error) {
    if (mine === generation && current === context) status(`Не вдалося видалити: ${error.message}`);
  }
}

function field(parent, tag, id, labelText, attrs = {}) {
  const label = element('label', labelText);
  label.htmlFor = id;
  const control = element(tag, '', {id, ...attrs});
  parent.append(label, control);
  return control;
}

function buildPanel(library) {
  if (byId('library-research-panel')) return;
  const panel = element('section', '', {id: 'library-research-panel', 'aria-labelledby': 'library-research-heading'});
  const heading = element('h3', 'Закладки й нотатки', {id: 'library-research-heading', tabindex: '-1'});
  const notice = element('p', 'Особисті записи. Вони не є source claims і не змінюють canonical corpus; target та source references повторно перевіряє backend.', {role: 'note'});
  const state = element('p', 'Виберіть task у результатах пошуку.', {id: 'library-research-status', role: 'status', 'aria-live': 'polite'});

  const bookmark = element('form', '', {id: 'library-bookmark-form'});
  bookmark.append(element('h4', 'Закладка для вибраного task'));
  field(bookmark, 'input', 'library-bookmark-title', 'Назва', {maxlength: '200', required: 'required'});
  field(bookmark, 'input', 'library-bookmark-tags', 'Теги через кому', {maxlength: '1000'});
  const saveBookmark = element('button', 'Зберегти / оновити закладку', {type: 'submit'});
  const deleteBookmark = element('button', 'Видалити закладку', {id: 'library-bookmark-delete', type: 'button'});
  bookmark.append(saveBookmark, deleteBookmark);

  const note = element('form', '', {id: 'library-note-form'});
  note.append(element('h4', 'Нотатка для вибраного task'));
  field(note, 'input', 'library-note-title', 'Назва нотатки', {maxlength: '200', required: 'required'});
  field(note, 'input', 'library-note-tags', 'Теги через кому', {maxlength: '1000'});
  field(note, 'textarea', 'library-note-body', 'Текст нотатки', {maxlength: '20000', required: 'required'});
  const saveNote = element('button', 'Зберегти / оновити нотатку', {type: 'submit'});
  const deleteNote = element('button', 'Видалити нотатку', {id: 'library-note-delete', type: 'button'});
  note.append(saveNote, deleteNote);

  panel.append(heading, notice, state, bookmark, note);
  const back = byId('library-back');
  if (back?.parentElement === library) library.insertBefore(panel, back);
  else library.append(panel);
  bookmark.addEventListener('submit', event => { event.preventDefault(); void save('bookmark'); });
  note.addEventListener('submit', event => { event.preventDefault(); void save('note'); });
  deleteBookmark.addEventListener('click', () => void remove('bookmark'));
  deleteNote.addEventListener('click', () => void remove('note'));
  clearEditors();
  setPanelEnabled(false);
}

function bindResult(article) {
  if (article.dataset.libraryResearchBound === 'true') return;
  article.dataset.libraryResearchBound = 'true';
  const identityNode = Array.from(article.children).find(node => node.tagName === 'P' && String(node.textContent || '').startsWith('Завдання: '));
  const identity = parseTaskIdentity(identityNode?.textContent || '');
  if (!identity) return;
  const button = element('button', 'Закладка / нотатка', {
    type: 'button',
    'aria-busy': 'false',
    'aria-controls': 'library-research-panel',
    'aria-label': `Закладка / нотатка для ${identity.node_id}`,
  });
  button.addEventListener('click', () => void activate(identity, button));
  article.append(button);
}

function bindResults(results) {
  for (const article of results.querySelectorAll(':scope > article')) bindResult(article);
}

function install() {
  const library = byId('library-view');
  const results = byId('library-results');
  if (!library || !results || library.dataset.researchPersistenceInstalled === 'true') return Boolean(library && results);
  library.dataset.researchPersistenceInstalled = 'true';
  buildPanel(library);
  bindResults(results);
  const resultsObserver = new MutationObserver(() => bindResults(results));
  resultsObserver.observe(results, {childList: true});
  const visibilityObserver = new MutationObserver(() => {
    if (library.classList.contains('hidden')) invalidateLibraryResearchPersistence();
  });
  visibilityObserver.observe(library, {attributes: true, attributeFilter: ['class']});
  return true;
}

function installWhenReady() {
  if (install()) return;
  const observer = new MutationObserver(() => {
    if (install()) observer.disconnect();
  });
  observer.observe(document.documentElement, {childList: true, subtree: true});
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installWhenReady, {once: true});
  else installWhenReady();
}
