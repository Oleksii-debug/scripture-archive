import {chooseTransport, unwrap} from './transport.js';

const BASE_VIEW_IDS = ['home-view', 'mission-view', 'player-view', 'authoring-view'];
const MAX_FILTER_OPTIONS = 1000;
const SEARCH_LIMIT = 50;
const MAX_RESULT_REFS = 25;
let transportPromise = null;
let catalog = null;
let searchLifecycle = null;

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

function status(message) {
  const node = byId('library-status');
  if (node) node.textContent = String(message || '');
}

function baseViews() {
  return BASE_VIEW_IDS.map(byId).filter(Boolean);
}

function hideBaseViews() {
  for (const view of baseViews()) view.classList.add('hidden');
}

async function api(command, payload = {}) {
  if (command !== 'library.catalog' && command !== 'library.search') {
    throw new Error('Library UI attempted a non-library transport command');
  }
  if (!transportPromise) transportPromise = chooseTransport();
  return await unwrap(await transportPromise, command, payload);
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function replaceOptions(select, placeholder, rows, valueKey, labelFor) {
  select.replaceChildren();
  const empty = element('option', placeholder);
  empty.value = '';
  select.append(empty);
  const safeRows = normalizeArray(rows).slice(0, MAX_FILTER_OPTIONS);
  for (const row of safeRows) {
    if (!row || typeof row !== 'object') continue;
    const rawValue = row[valueKey];
    if (typeof rawValue !== 'string' || !rawValue.trim()) continue;
    const option = element('option', labelFor(row));
    option.value = rawValue;
    select.append(option);
  }
}

function updateMissionFilter() {
  if (!catalog) return;
  const campaign = byId('library-campaign-filter').value;
  const missions = normalizeArray(catalog.missions).filter(row => !campaign || row?.campaign_id === campaign);
  replaceOptions(
    byId('library-mission-filter'),
    'Усі місії',
    missions,
    'mission_id',
    row => `${row.mission_id} — ${row.title || row.mission_id}`
  );
}

function renderCatalog(data) {
  const campaigns = normalizeArray(data.campaigns);
  const missions = normalizeArray(data.missions);
  const sourceReferences = normalizeArray(data.source_references);
  const summary = byId('library-summary');
  summary.replaceChildren();
  const rows = [
    ['Кампаній', campaigns.length],
    ['Місій', missions.length],
    ['Machine-readable вузлів', Number.isInteger(data.machine_node_count) ? data.machine_node_count : '—'],
    ['Видимих source references', sourceReferences.length],
    ['Джерело індексу', data.source_of_truth || '—']
  ];
  for (const [name, value] of rows) {
    const wrapper = element('div');
    wrapper.append(element('dt', name), element('dd', value));
    summary.append(wrapper);
  }

  const notice = byId('library-corpus-notice');
  if (data.bundled_full_bible_text === false || data.text_provider_available === false) {
    notice.textContent = 'Повний біблійний текст не входить до цього пакета і активний text provider не підтверджений. Пошук охоплює лише player-visible canonical metadata та source references, які вже надає CanonicalContentLoader; відсутній текст не вигадується.';
  } else {
    notice.textContent = 'Статус повного біблійного тексту або text provider не підтверджено цим catalog response.';
  }

  replaceOptions(
    byId('library-campaign-filter'),
    'Усі кампанії',
    campaigns,
    'campaign_id',
    row => `${row.campaign_id} — ${row.title || row.campaign_id}`
  );
  updateMissionFilter();
}

function renderResults(data) {
  const host = byId('library-results');
  host.replaceChildren();
  const results = normalizeArray(data.results).slice(0, SEARCH_LIMIT);
  if (!results.length) {
    host.append(element('p', 'Нічого не знайдено у видимому canonical індексі.'));
    return;
  }
  for (const row of results) {
    if (!row || typeof row !== 'object') continue;
    const article = element('article', '', {className: 'card', role: 'listitem'});
    const heading = element('h3', row.title || row.id || 'Результат');
    const kind = row.kind === 'task' ? 'Завдання' : row.kind === 'mission' ? 'Місія' : 'Запис';
    const identity = element('p', `${kind}: ${row.campaign_id || '—'} / ${row.mission_id || '—'} / ${row.id || '—'}`);
    const snippet = element('p', row.snippet || 'Без додаткового player-visible фрагмента.');
    const refs = normalizeArray(row.source_references).filter(value => typeof value === 'string' && value.trim()).slice(0, MAX_RESULT_REFS);
    const source = element('p', refs.length ? `Джерела: ${refs.join('; ')}` : 'Джерела: не вказано у видимому індексі.');
    article.append(heading, identity, snippet, source);
    host.append(article);
  }
}

export function createSearchLifecycle({button, execute, isVisible, onData, onError, onStatus, onFocus}) {
  if (!button || typeof execute !== 'function' || typeof isVisible !== 'function') {
    throw new TypeError('search lifecycle requires button, execute, and isVisible');
  }
  let generation = 0;

  function setBusy(busy) {
    button.disabled = Boolean(busy);
    if (typeof button.setAttribute === 'function') button.setAttribute('aria-busy', busy ? 'true' : 'false');
  }

  function invalidate() {
    generation += 1;
    setBusy(false);
  }

  async function run(payload) {
    const mine = ++generation;
    setBusy(true);
    onStatus?.('Пошук у видимому canonical індексі…');
    try {
      const data = await execute(payload);
      if (mine !== generation || !isVisible()) return {stale: true};
      onData?.(data);
      onFocus?.();
      return {stale: false, data};
    } catch (error) {
      if (mine !== generation || !isVisible()) return {stale: true};
      onError?.(error);
      return {stale: false, error};
    } finally {
      if (mine === generation) setBusy(false);
    }
  }

  return {run, invalidate};
}

async function loadCatalog() {
  status('Завантаження canonical каталогу…');
  try {
    const data = await api('library.catalog');
    if (!data || data.schema !== 'scripture.library.catalog.v1' || data.derived_index !== true) {
      throw new Error('Некоректний Library catalog contract');
    }
    catalog = data;
    renderCatalog(data);
    status('Canonical каталог готовий.');
  } catch (error) {
    catalog = null;
    status(`Не вдалося відкрити каталог: ${error.message}`);
  }
}

function validateSearchResponse(data) {
  if (!data || data.schema !== 'scripture.library.search.v1' || data.derived_index !== true) {
    throw new Error('Некоректний Library search contract');
  }
  return data;
}

function leaveLibrary() {
  searchLifecycle?.invalidate();
  const library = byId('library-view');
  if (library) library.classList.add('hidden');
}

function hideLibraryWhenBaseViewOpens() {
  const library = byId('library-view');
  if (!library || library.classList.contains('hidden')) return;
  if (baseViews().some(view => !view.classList.contains('hidden'))) leaveLibrary();
}

async function runSearch(event) {
  event?.preventDefault();
  const query = byId('library-query').value.trim();
  if (!query) {
    status('Введіть пошуковий запит.');
    byId('library-query').focus();
    return;
  }
  const payload = {query, limit: SEARCH_LIMIT};
  const campaign = byId('library-campaign-filter').value;
  const mission = byId('library-mission-filter').value;
  if (campaign) payload.campaign_id = campaign;
  if (mission) payload.mission_id = mission;
  await searchLifecycle.run(payload);
}

function buildSurface() {
  if (byId('nav-library') || byId('library-view')) return;
  const nav = document.querySelector('.top-nav');
  const main = document.querySelector('main');
  if (!nav || !main) return;

  const navButton = element('button', 'Бібліотека', {id: 'nav-library', type: 'button'});
  nav.append(navButton);

  const section = element('section', '', {id: 'library-view', className: 'hidden', 'aria-labelledby': 'library-heading'});
  const heading = element('h2', 'Бібліотека Писання', {id: 'library-heading', tabIndex: '-1'});
  const intro = element('p', 'Read-only каталог і пошук по player-visible canonical metadata та source references. Результати не додають нових source claims.');
  const notice = element('p', '', {id: 'library-corpus-notice', role: 'note'});
  const summaryHeading = element('h3', 'Каталог');
  const summary = element('dl', '', {id: 'library-summary'});

  const form = element('form', '', {id: 'library-search-form', role: 'search', 'aria-labelledby': 'library-search-heading'});
  const searchHeading = element('h3', 'Пошук', {id: 'library-search-heading'});
  const queryLabel = element('label', 'Запит');
  queryLabel.htmlFor = 'library-query';
  const query = element('input', '', {id: 'library-query', type: 'search', maxlength: '200', autocomplete: 'off'});
  const campaignLabel = element('label', 'Кампанія');
  campaignLabel.htmlFor = 'library-campaign-filter';
  const campaign = element('select', '', {id: 'library-campaign-filter'});
  const missionLabel = element('label', 'Місія');
  missionLabel.htmlFor = 'library-mission-filter';
  const mission = element('select', '', {id: 'library-mission-filter'});
  const submit = element('button', 'Шукати', {id: 'library-search-button', type: 'submit', 'aria-busy': 'false'});
  form.append(searchHeading, queryLabel, query, campaignLabel, campaign, missionLabel, mission, submit);

  const statusNode = element('p', '', {id: 'library-status', role: 'status', 'aria-live': 'polite'});
  const resultsHeading = element('h3', 'Результати', {id: 'library-results-heading', tabIndex: '-1'});
  const results = element('div', '', {id: 'library-results', role: 'list', 'aria-labelledby': 'library-results-heading'});
  const back = element('button', 'Повернутися на головну', {id: 'library-back', type: 'button'});
  section.append(heading, intro, notice, summaryHeading, summary, form, statusNode, resultsHeading, results, back);
  main.append(section);

  searchLifecycle = createSearchLifecycle({
    button: submit,
    execute: payload => api('library.search', payload),
    isVisible: () => !section.classList.contains('hidden'),
    onData: data => {
      renderResults(validateSearchResponse(data));
      status(`Знайдено ${Number.isInteger(data.total) ? data.total : normalizeArray(data.results).length} записів. Показано не більше ${SEARCH_LIMIT}.`);
    },
    onError: error => {
      results.replaceChildren();
      status(`Пошук не виконано: ${error.message}`);
    },
    onStatus: status,
    onFocus: () => resultsHeading.focus()
  });

  campaign.addEventListener('change', updateMissionFilter);
  form.addEventListener('submit', runSearch);
  navButton.addEventListener('click', async () => {
    searchLifecycle.invalidate();
    hideBaseViews();
    section.classList.remove('hidden');
    heading.focus();
    if (!catalog) await loadCatalog();
  });
  back.addEventListener('click', () => {
    leaveLibrary();
    byId('nav-home')?.click();
  });

  const observer = new MutationObserver(hideLibraryWhenBaseViewOpens);
  for (const view of baseViews()) observer.observe(view, {attributes: true, attributeFilter: ['class']});
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildSurface, {once: true});
  else buildSurface();
}
