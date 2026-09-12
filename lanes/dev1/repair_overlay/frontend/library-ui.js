import {chooseTransport, unwrap} from './transport.js';

const BASE_VIEW_IDS = ['home-view', 'mission-view', 'player-view', 'authoring-view'];
const MAX_FILTER_OPTIONS = 1000;
const SEARCH_LIMIT = 50;
const MAX_RESULT_REFS = 25;
const MAX_ID_LENGTH = 200;
const MAX_TEXT_LENGTH = 10000;
const MAX_SOURCE_REF_LENGTH = 2000;
let transportPromise = null;
let catalog = null;
let searchLifecycle = null;
let catalogLifecycle = null;

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

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireText(value, name, {maxLength = MAX_TEXT_LENGTH, allowEmpty = false} = {}) {
  if (typeof value !== 'string') throw new Error(`${name} must be string`);
  if (value.length > maxLength || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(value)) {
    throw new Error(`${name} is invalid`);
  }
  if (!allowEmpty && !value.trim()) throw new Error(`${name} must be non-empty`);
  return value;
}

function requireOptionalText(value, name, options = {}) {
  if (value === null) return null;
  return requireText(value, name, options);
}

function requireNonNegativeInteger(value, name) {
  if (!Number.isInteger(value) || value < 0) throw new Error(`${name} must be a non-negative integer`);
  return value;
}

function requireBoolean(value, name) {
  if (typeof value !== 'boolean') throw new Error(`${name} must be boolean`);
  return value;
}

function requireStringArray(value, name, {maxLength = MAX_TEXT_LENGTH} = {}) {
  if (!Array.isArray(value)) throw new Error(`${name} must be array`);
  for (let index = 0; index < value.length; index += 1) {
    requireText(value[index], `${name}[${index}]`, {maxLength});
  }
  return value;
}

function validateCampaign(row, index) {
  if (!isRecord(row)) throw new Error(`campaigns[${index}] must be object`);
  requireText(row.campaign_id, `campaigns[${index}].campaign_id`, {maxLength: MAX_ID_LENGTH});
  requireText(row.title, `campaigns[${index}].title`);
  requireNonNegativeInteger(row.mission_count, `campaigns[${index}].mission_count`);
  requireNonNegativeInteger(row.machine_node_count, `campaigns[${index}].machine_node_count`);
  return row;
}

function validateMission(row, index) {
  if (!isRecord(row)) throw new Error(`missions[${index}] must be object`);
  requireText(row.campaign_id, `missions[${index}].campaign_id`, {maxLength: MAX_ID_LENGTH});
  requireText(row.mission_id, `missions[${index}].mission_id`, {maxLength: MAX_ID_LENGTH});
  requireText(row.title, `missions[${index}].title`);
  return row;
}

function validateResult(row, index) {
  if (!isRecord(row)) throw new Error(`results[${index}] must be object`);
  if (row.kind !== 'mission' && row.kind !== 'task') throw new Error(`results[${index}].kind is invalid`);
  requireText(row.id, `results[${index}].id`, {maxLength: MAX_ID_LENGTH});
  requireText(row.campaign_id, `results[${index}].campaign_id`, {maxLength: MAX_ID_LENGTH});
  requireText(row.mission_id, `results[${index}].mission_id`, {maxLength: MAX_ID_LENGTH});
  requireText(row.title, `results[${index}].title`);
  requireText(row.snippet, `results[${index}].snippet`, {allowEmpty: true});
  requireStringArray(row.source_references, `results[${index}].source_references`, {maxLength: MAX_SOURCE_REF_LENGTH});
  return row;
}

export function validateCatalogResponse(data) {
  if (!isRecord(data) || data.schema !== 'scripture.library.catalog.v1' || data.derived_index !== true) {
    throw new Error('Некоректний Library catalog contract');
  }
  if (data.source_of_truth !== 'CanonicalContentLoader') throw new Error('Некоректне джерело Library catalog');
  requireBoolean(data.bundled_full_bible_text, 'bundled_full_bible_text');
  requireBoolean(data.text_provider_available, 'text_provider_available');
  requireNonNegativeInteger(data.machine_node_count, 'machine_node_count');
  if (!Array.isArray(data.campaigns)) throw new Error('campaigns must be array');
  if (!Array.isArray(data.missions)) throw new Error('missions must be array');
  requireStringArray(data.source_references, 'source_references', {maxLength: MAX_SOURCE_REF_LENGTH});
  data.campaigns.forEach(validateCampaign);
  data.missions.forEach(validateMission);
  return data;
}

export function validateSearchResponse(data) {
  if (!isRecord(data) || data.schema !== 'scripture.library.search.v1' || data.derived_index !== true) {
    throw new Error('Некоректний Library search contract');
  }
  if (data.source_of_truth !== 'CanonicalContentLoader') throw new Error('Некоректне джерело Library search');
  requireBoolean(data.bundled_full_bible_text, 'bundled_full_bible_text');
  requireText(data.query, 'query', {maxLength: 200});
  if (!isRecord(data.filters)) throw new Error('filters must be object');
  requireOptionalText(data.filters.campaign_id, 'filters.campaign_id', {maxLength: MAX_ID_LENGTH});
  requireOptionalText(data.filters.mission_id, 'filters.mission_id', {maxLength: MAX_ID_LENGTH});
  requireNonNegativeInteger(data.total, 'total');
  if (!Array.isArray(data.results)) throw new Error('results must be array');
  data.results.forEach(validateResult);
  if (data.total < data.results.length) throw new Error('total cannot be smaller than results length');
  return data;
}

function replaceOptions(select, placeholder, rows, valueKey, labelFor) {
  select.replaceChildren();
  const empty = element('option', placeholder);
  empty.value = '';
  select.append(empty);
  for (const row of rows.slice(0, MAX_FILTER_OPTIONS)) {
    const option = element('option', labelFor(row));
    option.value = row[valueKey];
    select.append(option);
  }
}

function updateMissionFilter() {
  if (!catalog) return;
  const campaign = byId('library-campaign-filter').value;
  const missions = catalog.missions.filter(row => !campaign || row.campaign_id === campaign);
  replaceOptions(
    byId('library-mission-filter'),
    'Усі місії',
    missions,
    'mission_id',
    row => `${row.mission_id} — ${row.title || row.mission_id}`
  );
}

function renderCatalog(data) {
  const campaigns = data.campaigns;
  const missions = data.missions;
  const sourceReferences = data.source_references;
  const summary = byId('library-summary');
  summary.replaceChildren();
  const rows = [
    ['Кампаній', campaigns.length],
    ['Місій', missions.length],
    ['Machine-readable вузлів', data.machine_node_count],
    ['Видимих source references', sourceReferences.length],
    ['Джерело індексу', data.source_of_truth]
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
  const results = data.results.slice(0, SEARCH_LIMIT);
  if (!results.length) {
    host.append(element('p', 'Нічого не знайдено у видимому canonical індексі.'));
    return;
  }
  for (const row of results) {
    const article = element('article', '', {className: 'card', role: 'listitem'});
    const heading = element('h3', row.title || row.id || 'Результат');
    const kind = row.kind === 'task' ? 'Завдання' : 'Місія';
    const identity = element('p', `${kind}: ${row.campaign_id} / ${row.mission_id} / ${row.id}`);
    const snippet = element('p', row.snippet || 'Без додаткового player-visible фрагмента.');
    const refs = row.source_references.slice(0, MAX_RESULT_REFS);
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

export function createCatalogLifecycle({execute, isVisible, onData, onError, onStatus}) {
  if (typeof execute !== 'function' || typeof isVisible !== 'function') {
    throw new TypeError('catalog lifecycle requires execute and isVisible');
  }
  let generation = 0;

  function invalidate() {
    generation += 1;
  }

  async function run() {
    const mine = ++generation;
    onStatus?.('Завантаження canonical каталогу…');
    try {
      const data = await execute();
      if (mine !== generation || !isVisible()) return {stale: true};
      onData?.(data);
      return {stale: false, data};
    } catch (error) {
      if (mine !== generation || !isVisible()) return {stale: true};
      onError?.(error);
      return {stale: false, error};
    }
  }

  return {run, invalidate};
}

async function loadCatalog() {
  await catalogLifecycle.run();
}

function leaveLibrary() {
  searchLifecycle?.invalidate();
  catalogLifecycle?.invalidate();
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

  catalogLifecycle = createCatalogLifecycle({
    execute: () => api('library.catalog'),
    isVisible: () => !section.classList.contains('hidden'),
    onData: data => {
      catalog = validateCatalogResponse(data);
      renderCatalog(catalog);
      status('Canonical каталог готовий.');
    },
    onError: error => {
      catalog = null;
      status(`Не вдалося відкрити каталог: ${error.message}`);
    },
    onStatus: status
  });

  searchLifecycle = createSearchLifecycle({
    button: submit,
    execute: payload => api('library.search', payload),
    isVisible: () => !section.classList.contains('hidden'),
    onData: data => {
      const validated = validateSearchResponse(data);
      renderResults(validated);
      status(`Знайдено ${validated.total} записів. Показано не більше ${SEARCH_LIMIT}.`);
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
