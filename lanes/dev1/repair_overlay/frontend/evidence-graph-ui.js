import {chooseTransport, unwrap} from './transport.js';

const COMMAND = 'research.get_evidence_graph';
const MAX_NODES = 5000;
const MAX_EDGES = 10000;
const MAX_LINEAR_LINES = 30000;
const MAX_TEXT = 12000;
const NODE_TYPES = new Set(['evidence', 'claim', 'passage', 'entity_ref']);
let transportPromise = null;
let busy = false;

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

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function text(value, name, {allowEmpty = false} = {}) {
  if (typeof value !== 'string' || value.length > MAX_TEXT) throw new Error(`${name} must be bounded text`);
  if (!allowEmpty && !value) throw new Error(`${name} must be non-empty`);
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(value)) throw new Error(`${name} contains control text`);
  return value;
}

function validateNode(row, index) {
  if (!isRecord(row) || !isRecord(row.payload)) throw new Error(`nodes[${index}] is invalid`);
  text(row.graph_id, `nodes[${index}].graph_id`);
  text(row.raw_id, `nodes[${index}].raw_id`);
  text(row.node_type, `nodes[${index}].node_type`);
  if (!NODE_TYPES.has(row.node_type)) throw new Error(`nodes[${index}].node_type is unsupported`);
  return row;
}

function validateEdge(row, index) {
  if (!isRecord(row) || !isRecord(row.payload)) throw new Error(`edges[${index}] is invalid`);
  text(row.edge_id, `edges[${index}].edge_id`);
  text(row.edge_type, `edges[${index}].edge_type`);
  text(row.source_id, `edges[${index}].source_id`);
  text(row.target_id, `edges[${index}].target_id`);
  return row;
}

export function validateEvidenceGraphResponse(data) {
  if (!isRecord(data) || data.schema !== 'evidence-graph.v1') throw new Error('Некоректний Evidence Graph contract');
  if (data.evidence_scope !== 'unlocked_only') throw new Error('Evidence Graph must remain unlocked-only');
  if (data.truth_owner !== 'D5/runtime') throw new Error('Evidence Graph must be runtime-owned');
  if (!Array.isArray(data.nodes) || data.nodes.length > MAX_NODES) throw new Error('Некоректний список вузлів Evidence Graph');
  if (!Array.isArray(data.edges) || data.edges.length > MAX_EDGES) throw new Error('Некоректний список зв’язків Evidence Graph');
  if (!Array.isArray(data.linear) || data.linear.length > MAX_LINEAR_LINES) throw new Error('Некоректний лінійний Evidence Graph');

  const nodeIds = new Set();
  data.nodes.forEach((row, index) => {
    validateNode(row, index);
    if (nodeIds.has(row.graph_id)) throw new Error(`Duplicate graph node ${row.graph_id}`);
    nodeIds.add(row.graph_id);
  });
  const edgeIds = new Set();
  data.edges.forEach((row, index) => {
    validateEdge(row, index);
    if (edgeIds.has(row.edge_id)) throw new Error(`Duplicate graph edge ${row.edge_id}`);
    edgeIds.add(row.edge_id);
    if (!nodeIds.has(row.source_id) || !nodeIds.has(row.target_id)) throw new Error(`Edge ${row.edge_id} has an invisible endpoint`);
  });
  data.linear.forEach((line, index) => text(line, `linear[${index}]`, {allowEmpty: true}));
  return data;
}

async function api() {
  if (!transportPromise) transportPromise = chooseTransport();
  return validateEvidenceGraphResponse(await unwrap(await transportPromise, COMMAND, {}));
}

function payloadText(row) {
  const p = row.payload || {};
  if (row.node_type === 'evidence') {
    const tx1 = p.tx1 === true ? ' · TX1' : '';
    return `${p.proposition || 'Без proposition'} · confidence ${p.confidence || '—'} · witness ${p.witness || 'not specified'}${tx1}`;
  }
  if (row.node_type === 'claim') {
    const required = Array.isArray(p.required_evidence_ids) ? p.required_evidence_ids.join(', ') : '';
    const uncertainty = p.uncertainty ? ` · uncertainty ${p.uncertainty}` : '';
    return `${p.proposition || 'Без proposition'} · confidence ${p.confidence || '—'} · witness ${p.witness || 'not specified'} · required ${required || 'none'}${uncertainty}`;
  }
  if (row.node_type === 'passage') {
    const end = p.verse_end === null || p.verse_end === undefined ? '' : `-${p.verse_end}`;
    return `${p.book || '—'} ${p.chapter ?? '—'}:${p.verse_start ?? '—'}${end} · witness ${p.witness || 'not specified'}`;
  }
  if (row.node_type === 'entity_ref') return `canonical_id ${p.canonical_id || row.raw_id}`;
  return '';
}

function relationText(row) {
  const p = row.payload || {};
  if (String(row.edge_type).startsWith('canonical:')) {
    const passages = Array.isArray(p.passage_ids) && p.passage_ids.length ? p.passage_ids.join(', ') : 'none stated';
    return `relation ${p.relation_id || '—'} · witness ${p.witness || 'not specified'} · passages ${passages}`;
  }
  return 'Derived structural edge from the canonical graph projection.';
}

function replaceRows(host, rows, cellsFor) {
  host.replaceChildren();
  if (!rows.length) {
    const tr = document.createElement('tr');
    const td = element('td', 'Немає видимих записів у поточному unlocked scope.');
    td.colSpan = cellsFor.columnCount;
    tr.append(td);
    host.append(tr);
    return;
  }
  for (const row of rows) {
    const tr = document.createElement('tr');
    for (const cell of cellsFor(row)) tr.append(element('td', cell));
    host.append(tr);
  }
}

function render(data) {
  byId('evidence-graph-summary').textContent = `Scope: unlocked_only · вузлів ${data.nodes.length} · зв’язків ${data.edges.length}. Дані є read-only похідною від canonical runtime evidence; locked evidence не запитується і не показується.`;
  const nodeCells = row => [row.node_type, row.raw_id, payloadText(row)];
  nodeCells.columnCount = 3;
  replaceRows(byId('evidence-graph-node-rows'), data.nodes, nodeCells);
  const edgeCells = row => [row.edge_type, row.source_id, row.target_id, relationText(row)];
  edgeCells.columnCount = 4;
  replaceRows(byId('evidence-graph-edge-rows'), data.edges, edgeCells);

  const linear = byId('evidence-graph-linear');
  linear.replaceChildren();
  for (const line of data.linear) linear.append(element('li', line));
  if (!data.linear.length) linear.append(element('li', 'Немає unlocked evidence для лінійного представлення.'));
  byId('evidence-graph-status').textContent = `Evidence Graph оновлено: ${data.nodes.length} вузлів, ${data.edges.length} зв’язків.`;
}

async function refresh() {
  if (busy) return;
  busy = true;
  const button = byId('evidence-graph-refresh');
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  byId('evidence-graph-status').textContent = 'Завантаження canonical unlocked Evidence Graph…';
  try {
    render(await api());
  } catch (error) {
    byId('evidence-graph-status').textContent = `Evidence Graph недоступний: ${error.message}`;
  } finally {
    busy = false;
    button.disabled = false;
    button.setAttribute('aria-busy', 'false');
  }
}

function table(captionText, headings, bodyId, label) {
  const wrapper = element('div', '', {className: 'table-scroll', tabIndex: '0', 'aria-label': label});
  const tableNode = document.createElement('table');
  tableNode.append(element('caption', captionText));
  const thead = document.createElement('thead');
  const tr = document.createElement('tr');
  for (const heading of headings) tr.append(element('th', heading, {scope: 'col'}));
  thead.append(tr);
  const tbody = element('tbody', '', {id: bodyId});
  tableNode.append(thead, tbody);
  wrapper.append(tableNode);
  return wrapper;
}

export function installEvidenceGraphSurface() {
  if (byId('evidence-graph-surface')) return;
  const research = byId('research-view');
  if (!research) return;

  const section = element('section', '', {id: 'evidence-graph-surface', className: 'surface', 'aria-labelledby': 'evidence-graph-heading'});
  const heading = element('h3', 'Evidence Graph', {id: 'evidence-graph-heading'});
  const intro = element('p', 'Read-only дослідницька проєкція вже відкритих canonical evidence. Жодних висновків про consensus, chronology чи witness identity тут не додається.');
  const button = element('button', 'Оновити Evidence Graph', {id: 'evidence-graph-refresh', type: 'button'});
  const status = element('p', 'Evidence Graph ще не завантажено.', {id: 'evidence-graph-status', className: 'notice info', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true'});
  const summary = element('p', 'Scope: unlocked_only.', {id: 'evidence-graph-summary'});
  const structuredHeading = element('h4', 'Структуроване представлення');
  const nodesHeading = element('h5', 'Вузли');
  const nodes = table('Canonical visible nodes', ['Тип', 'ID', 'Деталі'], 'evidence-graph-node-rows', 'Вузли Evidence Graph');
  const edgesHeading = element('h5', 'Зв’язки');
  const edges = table('Canonical visible edges', ['Тип', 'Від', 'До', 'Provenance'], 'evidence-graph-edge-rows', 'Зв’язки Evidence Graph');
  const linearHeading = element('h4', 'Повний лінійний еквівалент');
  const linearHelp = element('p', 'Це послідовне текстове представлення сформоване тим самим canonical graph object, що й таблиці вище.');
  const linear = element('ol', '', {id: 'evidence-graph-linear'});
  linear.append(element('li', 'Завантажте Evidence Graph, щоб отримати лінійне представлення.'));

  button.addEventListener('click', refresh);
  section.append(heading, intro, button, status, summary, structuredHeading, nodesHeading, nodes, edgesHeading, edges, linearHeading, linearHelp, linear);
  research.append(section);
}
