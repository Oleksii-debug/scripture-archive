import {chooseTransport, unwrap} from './transport.js';

const MAX_VISIBLE_ITEMS = 500;
const MAX_QUEUE_ITEMS = 5000;
const MAX_ID_LENGTH = 200;
const MAX_REASON_LENGTH = 1000;
const REVIEW_RELATIONS = new Set(['EXACT', 'VARIANT', 'PASSAGE_REVISIT', 'CROSS_CONTEXT', 'SYNTHESIS', 'NONE']);
const CONTROL_OR_LINE_SEPARATOR = /[\u0000-\u001F\u007F\u2028\u2029]/u;
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/u;
let transportPromise = null;
let loadedOnce = false;

const byId = id => document.getElementById(id);

function element(tag, text = '', attrs = {}) {
  const node = document.createElement(tag);
  if (text !== '') node.textContent = String(text);
  for (const [name, value] of Object.entries(attrs)) {
    if (name === 'className') node.className = String(value);
    else if (name === 'tabIndex') node.tabIndex = Number(value);
    else node.setAttribute(name, String(value));
  }
  return node;
}

function setStatus(message) {
  const node = byId('review-queue-status');
  if (node) node.textContent = String(message || '');
}

async function api(command, payload = {}) {
  if (command !== 'system.bootstrap' && command !== 'player.get_review_queue') {
    throw new Error('Review Queue UI attempted a non-read-only review command');
  }
  if (!transportPromise) transportPromise = chooseTransport();
  return await unwrap(await transportPromise, command, payload);
}

function mainSections() {
  const main = document.querySelector('main');
  if (!main) return [];
  return [...main.children].filter(node => node.tagName === 'SECTION');
}

function hideOtherViews() {
  for (const view of mainSections()) {
    if (view.id !== 'review-queue-view') view.classList.add('hidden');
  }
}

function keepViewExclusive() {
  const review = byId('review-queue-view');
  if (!review || review.classList.contains('hidden')) return;
  if (mainSections().some(view => view.id !== 'review-queue-view' && !view.classList.contains('hidden'))) {
    review.classList.add('hidden');
  }
}

function requireSafeText(raw, name, index, {allowEmpty = false, maxLength = MAX_ID_LENGTH} = {}) {
  if (!Object.prototype.hasOwnProperty.call(raw, name)) {
    throw new Error(`Відсутнє поле ${name} у review item #${index + 1}`);
  }
  const value = raw[name];
  if (typeof value !== 'string' || (!allowEmpty && !value) || value.length > maxLength || CONTROL_OR_LINE_SEPARATOR.test(value)) {
    throw new Error(`Некоректне поле ${name} у review item #${index + 1}`);
  }
  return value;
}

function validateQueueItem(raw, index) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error(`Некоректний review item #${index + 1}`);
  const queueId = requireSafeText(raw, 'queue_id', index);
  const conceptId = requireSafeText(raw, 'concept_id', index);
  const dueAt = requireSafeText(raw, 'due_at', index, {maxLength: 64});
  const relation = requireSafeText(raw, 'relation', index, {maxLength: 32});
  const reason = requireSafeText(raw, 'reason', index, {allowEmpty: true, maxLength: MAX_REASON_LENGTH});

  if (!Object.prototype.hasOwnProperty.call(raw, 'node_id')) {
    throw new Error(`Відсутнє поле node_id у review item #${index + 1}`);
  }
  const nodeId = raw.node_id;
  if (nodeId !== null && (typeof nodeId !== 'string' || !nodeId || nodeId.length > MAX_ID_LENGTH || CONTROL_OR_LINE_SEPARATOR.test(nodeId))) {
    throw new Error(`Некоректне поле node_id у review item #${index + 1}`);
  }
  if (!Object.prototype.hasOwnProperty.call(raw, 'priority') || !Number.isInteger(raw.priority)) {
    throw new Error(`Некоректне поле priority у review item #${index + 1}`);
  }
  if (!REVIEW_RELATIONS.has(relation)) {
    throw new Error(`Невідоме поле relation у review item #${index + 1}`);
  }
  if (!ISO_TIMESTAMP.test(dueAt) || Number.isNaN(Date.parse(dueAt))) {
    throw new Error(`Некоректне поле due_at у review item #${index + 1}`);
  }
  return {queueId, conceptId, nodeId, dueAt, priority: raw.priority, relation, reason};
}

function renderQueue(rawQueue) {
  if (!Array.isArray(rawQueue) || rawQueue.length > MAX_QUEUE_ITEMS) throw new Error('Некоректний review_queue contract');
  const validated = rawQueue.map(validateQueueItem);
  const host = byId('review-queue-results');
  host.replaceChildren();
  if (!validated.length) {
    host.append(element('p', 'Canonical review queue порожня.'));
    return {total: 0, shown: 0};
  }

  const table = element('table', '', {'aria-describedby': 'review-queue-contract-note'});
  const caption = element('caption', 'Canonical review queue у порядку, повернутому runtime');
  const head = element('thead');
  const headerRow = element('tr');
  for (const label of ['Queue ID', 'Concept', 'Node', 'Due at', 'Priority', 'Relation', 'Reason']) {
    headerRow.append(element('th', label, {scope: 'col'}));
  }
  head.append(headerRow);
  const body = element('tbody');
  for (const item of validated.slice(0, MAX_VISIBLE_ITEMS)) {
    const row = element('tr');
    for (const value of [item.queueId, item.conceptId, item.nodeId || '—', item.dueAt, item.priority, item.relation, item.reason || '—']) {
      row.append(element('td', value));
    }
    body.append(row);
  }
  table.append(caption, head, body);
  host.append(table);
  return {total: validated.length, shown: Math.min(validated.length, MAX_VISIBLE_ITEMS)};
}

async function loadReviewQueue() {
  setStatus('Перевірка canonical review capability…');
  try {
    const bootstrap = await api('system.bootstrap');
    if (bootstrap?.capabilities?.review_queue !== true) {
      throw new Error('Canonical runtime review queue недоступна в цьому запуску');
    }
    const data = await api('player.get_review_queue');
    if (data?.truth_owner !== 'D5/runtime') {
      throw new Error('Review queue response не підтверджує D5/runtime truth ownership');
    }
    const rendered = renderQueue(data.review_queue);
    loadedOnce = true;
    if (rendered.total > rendered.shown) {
      setStatus(`Canonical queue містить ${rendered.total} записів; показано перші ${rendered.shown} у runtime order без локального re-ranking.`);
    } else {
      setStatus(`Canonical queue: ${rendered.total} записів. Порядок і поля відображені без локальної scheduling policy.`);
    }
    byId('review-queue-heading')?.focus();
  } catch (error) {
    loadedOnce = false;
    byId('review-queue-results')?.replaceChildren();
    setStatus(`Review queue недоступна: ${error.message}`);
  }
}

function buildSurface() {
  if (byId('nav-review-queue') || byId('review-queue-view')) return;
  const nav = document.querySelector('.top-nav');
  const main = document.querySelector('main');
  if (!nav || !main) return;

  const navButton = element('button', 'Повторення', {id: 'nav-review-queue', type: 'button'});
  nav.append(navButton);

  const section = element('section', '', {id: 'review-queue-view', className: 'hidden', 'aria-labelledby': 'review-queue-heading'});
  const heading = element('h2', 'Черга повторення', {id: 'review-queue-heading', tabIndex: '-1'});
  const note = element('p', 'Read-only проєкція persisted canonical review queue. Цей екран не визначає due/priority policy, не пересортовує чергу і не обирає наступне завдання.', {id: 'review-queue-contract-note', role: 'note'});
  const status = element('p', '', {id: 'review-queue-status', role: 'status', 'aria-live': 'polite'});
  const actions = element('div', '', {className: 'actions'});
  const refresh = element('button', 'Оновити чергу', {id: 'review-queue-refresh', type: 'button'});
  const back = element('button', 'Повернутися на головну', {id: 'review-queue-back', type: 'button'});
  actions.append(refresh, back);
  const results = element('div', '', {id: 'review-queue-results'});
  section.append(heading, note, status, actions, results);
  main.append(section);

  navButton.addEventListener('click', async () => {
    hideOtherViews();
    section.classList.remove('hidden');
    heading.focus();
    if (!loadedOnce) await loadReviewQueue();
  });
  refresh.addEventListener('click', loadReviewQueue);
  back.addEventListener('click', () => byId('nav-home')?.click());

  const observer = new MutationObserver(keepViewExclusive);
  observer.observe(main, {subtree: true, childList: true, attributes: true, attributeFilter: ['class']});
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildSurface, {once: true});
else buildSurface();
