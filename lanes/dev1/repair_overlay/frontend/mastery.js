import {chooseTransport, unwrap} from './transport.js';

const $ = id => document.getElementById(id);
const EXCLUSIVE_VIEWS = ['home', 'mission', 'player', 'research', 'application-update', 'authoring'];
const LEAVE_CONTROLS = ['nav-home', 'nav-research', 'nav-authoring', 'nav-application-update', 'mission-back', 'research-return'];
let transport = null;
let masteryGeneration = 0;

async function api(command, payload = {}) {
  if (!transport) transport = await chooseTransport();
  return await unwrap(transport, command, payload);
}

function announce(text) {
  const status = $('global-status');
  if (!status) return;
  status.textContent = '';
  requestAnimationFrame(() => { status.textContent = text; });
}

function clearMastery() {
  $('mastery-rows')?.replaceChildren();
  $('mastery-empty')?.classList.add('hidden');
  const count = $('mastery-count');
  if (count) count.textContent = 'Концептів у runtime: 0';
}

function hideMastery() {
  $('mastery-view')?.classList.add('hidden');
}

function failClosedMastery() {
  hideMastery();
  clearMastery();
}

function invalidateMastery() {
  masteryGeneration += 1;
  failClosedMastery();
}

function showMastery() {
  EXCLUSIVE_VIEWS.forEach(name => $(`${name}-view`)?.classList.add('hidden'));
  $('mastery-view')?.classList.remove('hidden');
  setTimeout(() => $('mastery-heading')?.focus(), 0);
}

function requireText(value, field) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Runtime повернув некоректне поле майстерності: ${field}`);
  }
  return value;
}

function requireNumber(value, field) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`Runtime повернув некоректне поле майстерності: ${field}`);
  }
  return value;
}

function requireCount(value, field) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Runtime повернув некоректне поле майстерності: ${field}`);
  }
  return value;
}

function normalizeDueAt(value) {
  if (value === null || value === undefined) return 'Не заплановано';
  return requireText(value, 'due_at');
}

function parseRows(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data) || !Array.isArray(data.mastery)) {
    throw new Error('Runtime повернув некоректний стан майстерності');
  }
  return data.mastery.map(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error('Runtime повернув некоректний запис майстерності');
    }
    return [
      requireText(item.concept_id, 'concept_id'),
      requireText(item.state, 'state'),
      requireNumber(item.stability_days, 'stability_days'),
      requireNumber(item.difficulty, 'difficulty'),
      requireCount(item.consecutive_independent_successes, 'consecutive_independent_successes'),
      requireCount(item.guided_successes, 'guided_successes'),
      requireCount(item.failures, 'failures'),
      normalizeDueAt(item.due_at),
    ];
  });
}

function renderMastery(rows) {
  const host = $('mastery-rows');
  const empty = $('mastery-empty');
  const count = $('mastery-count');
  if (!host || !empty || !count) throw new Error('Екран майстерності неповний');

  // Build every row off-DOM. The live surface changes only after the complete
  // runtime response has already passed parseRows() validation.
  const renderedRows = rows.map(values => {
    const tr = document.createElement('tr');
    for (const value of values) {
      const td = document.createElement('td');
      td.textContent = value ?? '—';
      tr.append(td);
    }
    return tr;
  });

  host.replaceChildren(...renderedRows);
  empty.classList.toggle('hidden', rows.length !== 0);
  count.textContent = `Концептів у runtime: ${rows.length}`;
}

async function loadMastery() {
  const generation = ++masteryGeneration;
  // Never present an old snapshot as current while a refresh is unresolved.
  failClosedMastery();
  try {
    const data = await api('player.get_mastery', {});
    if (generation !== masteryGeneration) return;
    const rows = parseRows(data);
    renderMastery(rows);
    if (generation !== masteryGeneration) return;
    showMastery();
    announce(rows.length ? `Показано стан майстерності для ${rows.length} концептів` : 'Даних майстерності ще немає');
  } catch (error) {
    if (generation !== masteryGeneration) return;
    failClosedMastery();
    announce(`Помилка: ${error.message}`);
  }
}

function bindMastery() {
  const button = $('nav-mastery');
  if (!button) return;
  button.addEventListener('click', loadMastery);
  for (const id of LEAVE_CONTROLS) {
    $(id)?.addEventListener('click', invalidateMastery, {capture: true});
  }
  const masteryView = $('mastery-view');
  if (!masteryView) return;
  const observer = new MutationObserver(() => {
    if (masteryView.classList.contains('hidden')) return;
    if (EXCLUSIVE_VIEWS.some(name => !$(`${name}-view`)?.classList.contains('hidden'))) invalidateMastery();
  });
  for (const name of EXCLUSIVE_VIEWS) {
    const view = $(`${name}-view`);
    if (view) observer.observe(view, {attributes: true, attributeFilter: ['class']});
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindMastery, {once: true});
else bindMastery();
