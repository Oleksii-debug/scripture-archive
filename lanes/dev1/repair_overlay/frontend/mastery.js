import {chooseTransport, unwrap} from './transport.js';
import {MasteryRequestGuard, validateMasteryPayload} from './mastery-state.mjs';

const $ = id => document.getElementById(id);
const BASE_VIEWS = ['home', 'mission', 'player', 'authoring'];
let transport = null;
const masteryGuard = new MasteryRequestGuard();

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

function hideMasterySurface() {
  $('mastery-view')?.classList.add('hidden');
}

function leaveMastery() {
  masteryGuard.invalidate();
  hideMasterySurface();
}

function showMastery() {
  BASE_VIEWS.forEach(name => $(`${name}-view`)?.classList.add('hidden'));
  $('mastery-view')?.classList.remove('hidden');
  setTimeout(() => $('mastery-heading')?.focus(), 0);
}

function renderMastery(rows) {
  const host = $('mastery-rows');
  host.replaceChildren();
  $('mastery-empty').classList.toggle('hidden', rows.length !== 0);
  $('mastery-count').textContent = `Концептів у runtime: ${rows.length}`;
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
      const td = document.createElement('td');
      td.textContent = value ?? '—';
      tr.append(td);
    }
    host.append(tr);
  }
}

function renderMasteryError() {
  const host = $('mastery-rows');
  host.replaceChildren();
  $('mastery-empty').classList.add('hidden');
  $('mastery-count').textContent = 'Дані майстерності runtime недоступні через помилку.';
}

async function loadMastery() {
  const token = masteryGuard.begin();
  try {
    const data = await api('player.get_mastery');
    if (!masteryGuard.owns(token)) return;
    const rows = validateMasteryPayload(data);
    if (!masteryGuard.owns(token)) return;
    renderMastery(rows);
    showMastery();
    if (!masteryGuard.owns(token)) return;
    announce(rows.length ? `Показано стан майстерності для ${rows.length} концептів` : 'Даних майстерності ще немає');
  } catch (error) {
    if (!masteryGuard.owns(token)) return;
    renderMasteryError();
    showMastery();
    announce(`Помилка даних майстерності: ${error.message}`);
  }
}

function bindMastery() {
  const button = $('nav-mastery');
  if (!button) return;
  button.addEventListener('click', loadMastery);
  for (const id of ['nav-home', 'nav-authoring', 'mission-back']) {
    $(id)?.addEventListener('click', leaveMastery, {capture: true});
  }
  const masteryView = $('mastery-view');
  const observer = new MutationObserver(() => {
    const baseViewVisible = BASE_VIEWS.some(name => {
      const view = $(`${name}-view`);
      return view && !view.classList.contains('hidden');
    });
    if (baseViewVisible && (masteryGuard.isActive() || !masteryView.classList.contains('hidden'))) {
      leaveMastery();
    }
  });
  for (const name of BASE_VIEWS) {
    const view = $(`${name}-view`);
    if (view) observer.observe(view, {attributes: true, attributeFilter: ['class']});
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindMastery, {once: true});
else bindMastery();
