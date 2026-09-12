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

function hideMastery() {
  $('mastery-view')?.classList.add('hidden');
}

function invalidateMastery() {
  masteryGeneration += 1;
  hideMastery();
}

function showMastery() {
  EXCLUSIVE_VIEWS.forEach(name => $(`${name}-view`)?.classList.add('hidden'));
  $('mastery-view')?.classList.remove('hidden');
  setTimeout(() => $('mastery-heading')?.focus(), 0);
}

function parseRows(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data) || !Array.isArray(data.mastery)) {
    throw new Error('Runtime повернув некоректний стан майстерності');
  }
  for (const item of data.mastery) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error('Runtime повернув некоректний запис майстерності');
    }
  }
  return data.mastery;
}

function renderMastery(rows) {
  const host = $('mastery-rows');
  const empty = $('mastery-empty');
  const count = $('mastery-count');
  if (!host || !empty || !count) throw new Error('Екран майстерності неповний');
  host.replaceChildren();
  empty.classList.toggle('hidden', rows.length !== 0);
  count.textContent = `Концептів у runtime: ${rows.length}`;
  for (const item of rows) {
    const tr = document.createElement('tr');
    const values = [
      item.concept_id,
      item.state,
      item.stability_days,
      item.difficulty,
      item.consecutive_independent_successes,
      item.guided_successes,
      item.failures,
      item.due_at || 'Не заплановано',
    ];
    for (const value of values) {
      if (value !== null && value !== undefined && !['string', 'number', 'boolean'].includes(typeof value)) {
        throw new Error('Runtime повернув некоректне поле майстерності');
      }
      const td = document.createElement('td');
      td.textContent = value ?? '—';
      tr.append(td);
    }
    host.append(tr);
  }
}

async function loadMastery() {
  const generation = ++masteryGeneration;
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
