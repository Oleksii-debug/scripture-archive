import {chooseTransport, unwrap} from './transport.js';

const $ = id => document.getElementById(id);
const BASE_VIEWS = ['home', 'mission', 'player', 'authoring'];
let transport = null;

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

async function loadMastery() {
  try {
    const data = await api('player.get_mastery');
    const rows = Array.isArray(data.mastery) ? data.mastery : [];
    renderMastery(rows);
    showMastery();
    announce(rows.length ? `Показано стан майстерності для ${rows.length} концептів` : 'Даних майстерності ще немає');
  } catch (error) {
    announce(`Помилка: ${error.message}`);
  }
}

function bindMastery() {
  const button = $('nav-mastery');
  if (!button) return;
  button.addEventListener('click', loadMastery);
  for (const id of ['nav-home', 'nav-authoring', 'mission-back']) {
    $(id)?.addEventListener('click', hideMastery, {capture: true});
  }
  const masteryView = $('mastery-view');
  const observer = new MutationObserver(() => {
    if (masteryView.classList.contains('hidden')) return;
    if (BASE_VIEWS.some(name => !$(`${name}-view`)?.classList.contains('hidden'))) hideMastery();
  });
  for (const name of BASE_VIEWS) {
    const view = $(`${name}-view`);
    if (view) observer.observe(view, {attributes: true, attributeFilter: ['class']});
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindMastery, {once: true});
else bindMastery();
