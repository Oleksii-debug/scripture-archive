import {chooseTransport, unwrap} from './transport.js';

const COMMAND = 'research.get_cross_testament';
const MAX_LINKS = 512;
const MAX_EVIDENCE = 1024;
const MAX_LINEAR = 4096;
const MAX_TEXT = 512;
let transportPromise = null;
let busy = false;

const byId = id => document.getElementById(id);
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);

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

function boundedText(value, field, {nullable = false} = {}) {
  if (value === null && nullable) return null;
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_TEXT) throw new Error(`${field} must be bounded text`);
  if (/[\p{Cc}\p{Cf}\p{Cs}\p{Co}\p{Cn}\u2028\u2029]/u.test(value)) throw new Error(`${field} contains unsafe Unicode`);
  return value;
}

function positiveInt(value, field) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${field} must be a positive integer`);
  return value;
}

function validateEvidence(item, field) {
  if (!record(item)) throw new Error(`${field} is invalid`);
  boundedText(item.evidence_id, `${field}.evidence_id`);
  boundedText(item.confidence, `${field}.confidence`);
  if (typeof item.tx1 !== 'boolean') throw new Error(`${field}.tx1 must be boolean`);
  boundedText(item.witness, `${field}.witness`, {nullable: true});
}

function validateEndpoint(endpoint, testament, field) {
  if (!record(endpoint) || endpoint.testament !== testament) throw new Error(`${field} has invalid testament`);
  boundedText(endpoint.passage_id, `${field}.passage_id`);
  boundedText(endpoint.book, `${field}.book`);
  positiveInt(endpoint.chapter, `${field}.chapter`);
  positiveInt(endpoint.verse_start, `${field}.verse_start`);
  if (endpoint.verse_end !== null) positiveInt(endpoint.verse_end, `${field}.verse_end`);
  boundedText(endpoint.witness, `${field}.witness`, {nullable: true});
  if (!Array.isArray(endpoint.evidence) || endpoint.evidence.length > MAX_EVIDENCE) throw new Error(`${field}.evidence is invalid`);
  endpoint.evidence.forEach((item, index) => validateEvidence(item, `${field}.evidence[${index}]`));
}

export function validateCrossTestamentResponse(data) {
  if (!record(data) || data.schema !== 'scripture.research.cross-testament.v1') throw new Error('Некоректний OT↔NT contract');
  if (data.projection_schema !== 'CROSS_TESTAMENT_v1') throw new Error('Некоректна canonical OT↔NT projection');
  if (data.evidence_scope !== 'unlocked_only' || data.read_only !== true || data.truth_owner !== 'D5/runtime') throw new Error('OT↔NT must remain read-only and unlocked-only');
  if (!['LINKS', 'NOT_STATED_IN_CITED_TEXT'].includes(data.status)) throw new Error('Некоректний OT↔NT status');
  if (!Array.isArray(data.links) || data.links.length > MAX_LINKS) throw new Error('Некоректний список OT↔NT зв’язків');
  if (!Array.isArray(data.linear) || data.linear.length === 0 || data.linear.length > MAX_LINEAR) throw new Error('Некоректний лінійний OT↔NT view');
  const ids = new Set();
  data.links.forEach((link, index) => {
    const field = `links[${index}]`;
    if (!record(link)) throw new Error(`${field} is invalid`);
    const relationId = boundedText(link.relation_id, `${field}.relation_id`);
    if (ids.has(relationId)) throw new Error(`Duplicate relation ${relationId}`);
    ids.add(relationId);
    boundedText(link.relation_type, `${field}.relation_type`);
    boundedText(link.relation_witness, `${field}.relation_witness`, {nullable: true});
    validateEndpoint(link.ot, 'OT', `${field}.ot`);
    validateEndpoint(link.nt, 'NT', `${field}.nt`);
  });
  data.linear.forEach((line, index) => boundedText(line, `linear[${index}]`));
  if (data.status === 'NOT_STATED_IN_CITED_TEXT' && data.links.length !== 0) throw new Error('Empty-state status conflicts with links');
  if (data.status === 'LINKS' && data.links.length === 0) throw new Error('Link status requires links');
  return data;
}

async function api() {
  if (!transportPromise) transportPromise = chooseTransport();
  return validateCrossTestamentResponse(await unwrap(await transportPromise, COMMAND, {}));
}

function passage(endpoint) {
  const end = endpoint.verse_end === null || endpoint.verse_end === endpoint.verse_start ? '' : `-${endpoint.verse_end}`;
  return `${endpoint.book} ${endpoint.chapter}:${endpoint.verse_start}${end} (${endpoint.passage_id})`;
}

function evidenceText(endpoint) {
  if (!endpoint.evidence.length) return 'not stated';
  return endpoint.evidence.map(item => `${item.evidence_id} · ${item.confidence}${item.tx1 ? ' · TX1' : ''} · witness ${item.witness || 'not stated'}`).join(' | ');
}

function render(data) {
  const rows = byId('cross-testament-rows');
  rows.replaceChildren();
  if (!data.links.length) {
    const tr = document.createElement('tr');
    const td = element('td', 'Not stated in cited text. Немає unlocked explicit source-backed OT↔NT relation у поточному canonical runtime.');
    td.colSpan = 6;
    tr.append(td);
    rows.append(tr);
  } else {
    for (const link of data.links) {
      const tr = document.createElement('tr');
      const cells = [
        link.relation_id,
        link.relation_type,
        passage(link.ot),
        passage(link.nt),
        link.relation_witness || 'not stated',
        `OT: ${evidenceText(link.ot)}; NT: ${evidenceText(link.nt)}`,
      ];
      cells.forEach(value => tr.append(element('td', value)));
      rows.append(tr);
    }
  }
  const linear = byId('cross-testament-linear');
  linear.replaceChildren();
  data.linear.forEach(line => linear.append(element('li', line)));
  byId('cross-testament-summary').textContent = `Scope: unlocked_only · explicit links ${data.links.length} · truth owner D5/runtime. Similarity, chronology and consensus are not inferred.`;
  byId('cross-testament-status').textContent = data.links.length ? `OT↔NT оновлено: ${data.links.length} source-backed зв’язків.` : 'OT↔NT оновлено: Not stated in cited text.';
}

async function refresh() {
  if (busy) return;
  busy = true;
  const button = byId('cross-testament-refresh');
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  byId('cross-testament-status').textContent = 'Завантаження canonical OT↔NT evidence…';
  try {
    render(await api());
  } catch (error) {
    byId('cross-testament-status').textContent = `OT↔NT недоступний: ${error.message}`;
  } finally {
    busy = false;
    button.disabled = false;
    button.setAttribute('aria-busy', 'false');
  }
}

function makeTable() {
  const wrapper = element('div', '', {className: 'table-scroll', tabIndex: '0', 'aria-label': 'Source-backed OT↔NT links'});
  const table = document.createElement('table');
  table.append(element('caption', 'Explicit source-backed Cross-Testament relations'));
  const thead = document.createElement('thead');
  const tr = document.createElement('tr');
  ['Relation ID', 'Type', 'OT passage', 'NT passage', 'Relation witness', 'Evidence provenance'].forEach(label => tr.append(element('th', label, {scope: 'col'})));
  thead.append(tr);
  table.append(thead, element('tbody', '', {id: 'cross-testament-rows'}));
  wrapper.append(table);
  return wrapper;
}

export function installCrossTestamentSurface() {
  if (byId('cross-testament-surface')) return;
  const research = byId('research-view');
  if (!research) return;
  const section = element('section', '', {id: 'cross-testament-surface', className: 'surface', 'aria-labelledby': 'cross-testament-heading'});
  section.append(
    element('h3', 'OT↔NT — Cross-Testament', {id: 'cross-testament-heading'}),
    element('p', 'Read-only проєкція тільки explicit source-backed relation з canonical unlocked evidence. Відсутність зв’язку показується як “Not stated in cited text”; подібність, chronology, history або consensus не домислюються.'),
    element('button', 'Оновити OT↔NT', {id: 'cross-testament-refresh', type: 'button'}),
    element('p', 'OT↔NT ще не завантажено.', {id: 'cross-testament-status', className: 'notice info', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true'}),
    element('p', 'Scope: unlocked_only.', {id: 'cross-testament-summary'}),
    element('h4', 'Структуроване представлення'),
    makeTable(),
    element('h4', 'Повний лінійний еквівалент'),
    element('p', 'Лінійний список формується з тієї самої canonical projection, що й таблиця, для keyboard/NVDA review.'),
  );
  const linear = element('ol', '', {id: 'cross-testament-linear'});
  linear.append(element('li', 'Завантажте OT↔NT, щоб отримати лінійне представлення.'));
  section.append(linear);
  byId('cross-testament-refresh').addEventListener('click', refresh);
  research.append(section);
}