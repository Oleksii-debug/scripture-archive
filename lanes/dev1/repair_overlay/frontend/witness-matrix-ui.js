import {chooseTransport, unwrap} from './transport.js';

const WRAPPER_SCHEMA = 'scripture.research.witness-matrix.v1';
const MATRIX_SCHEMA = 'witness-matrix.v1';
let transport = null;
let trigger = null;
let dialog = null;
let status = null;
let tableHost = null;
let linearHost = null;
let requestGeneration = 0;

async function api(command, payload = {}) {
  if (!transport) transport = chooseTransport();
  return await unwrap(transport, command, payload);
}

function invalidateRequests() {
  requestGeneration += 1;
}

function text(value, fallback = '—') {
  return typeof value === 'string' && value ? value : fallback;
}

function requirePayload(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.schema !== WRAPPER_SCHEMA || data.read_only !== true || data.truth_owner !== 'D5/runtime') {
    throw new Error('Witness Matrix response failed packaged truth validation');
  }
  if (!Array.isArray(data.available_witnesses) || !data.available_witnesses.every(item => typeof item === 'string' && item && item === item.trim())) {
    throw new Error('Witness Matrix returned invalid witness identities');
  }
  if (!Array.isArray(data.linear) || !data.linear.every(item => typeof item === 'string')) {
    throw new Error('Witness Matrix linear equivalent is invalid');
  }
  if (data.matrix !== null) {
    const matrix = data.matrix;
    if (!matrix || typeof matrix !== 'object' || Array.isArray(matrix) || matrix.schema !== MATRIX_SCHEMA || matrix.evidence_scope !== 'unlocked_only' || matrix.contradiction_semantics !== 'not_inferred') {
      throw new Error('Witness Matrix canonical projection is invalid');
    }
    if (!Array.isArray(matrix.witnesses) || matrix.witnesses.length < 2 || !Array.isArray(matrix.rows)) {
      throw new Error('Witness Matrix canonical projection is incomplete');
    }
  }
  return data;
}

function make(tag, content) {
  const node = document.createElement(tag);
  if (content !== undefined) node.textContent = content;
  return node;
}

function evidenceSummary(cell) {
  if (!cell || typeof cell !== 'object' || !Array.isArray(cell.evidence)) return 'Некоректна комірка';
  if (cell.status === 'not_stated_in_visible_scope') return 'Не зазначено у видимому source-local scope';
  if (cell.status !== 'stated') return 'Невідомий статус';
  const items = cell.evidence.map(item => {
    if (!item || typeof item !== 'object') return 'Некоректний доказ';
    const proposition = text(item.proposition, 'Твердження не вказано');
    const evidenceId = text(item.evidence_id, 'без ID');
    return `${evidenceId}: ${proposition}`;
  });
  return items.length ? items.join(' · ') : 'Зазначено; видимий доказ відсутній у projection';
}

function render(data) {
  tableHost.replaceChildren();
  linearHost.replaceChildren();

  const intro = make('p', data.matrix ? data.matrix.absence_semantics : 'Для матриці потрібні щонайменше два source-safe розблоковані свідки. Відсутність даних не трактується як заперечення або суперечність.');
  tableHost.append(intro);

  if (data.matrix) {
    const scroll = make('div');
    scroll.className = 'table-scroll';
    scroll.tabIndex = 0;
    scroll.setAttribute('aria-label', 'Таблиця Witness Matrix');
    const table = make('table');
    const caption = make('caption', 'Witness Matrix — source-local порівняння лише розблокованих доказів');
    const thead = make('thead');
    const headerRow = make('tr');
    const rowHead = make('th', 'Comparison');
    rowHead.scope = 'col';
    headerRow.append(rowHead);
    for (const witness of data.matrix.witnesses) {
      const th = make('th', witness);
      th.scope = 'col';
      headerRow.append(th);
    }
    thead.append(headerRow);
    const tbody = make('tbody');
    for (const row of data.matrix.rows) {
      if (!row || typeof row !== 'object' || !Array.isArray(row.cells)) throw new Error('Witness Matrix row is invalid');
      const tr = make('tr');
      const th = make('th', Array.isArray(row.evidence_ids) && row.evidence_ids.length ? row.evidence_ids.join(', ') : text(row.row_id));
      th.scope = 'row';
      tr.append(th);
      for (const witness of data.matrix.witnesses) {
        const cell = row.cells.find(item => item && item.witness === witness);
        const td = make('td', evidenceSummary(cell));
        tr.append(td);
      }
      tbody.append(tr);
    }
    table.append(caption, thead, tbody);
    scroll.append(table);
    tableHost.append(scroll);
  } else {
    tableHost.append(make('p', `Доступні source-safe свідки: ${data.available_witnesses.length ? data.available_witnesses.join(', ') : 'немає'}.`));
  }

  const heading = make('h3', 'Повний лінійний еквівалент');
  const list = make('ol');
  for (const line of data.linear) list.append(make('li', line));
  linearHost.append(heading, list);
  status.textContent = data.matrix ? `Матрицю оновлено: ${data.matrix.rows.length} comparison rows.` : 'Матриця поки недоступна: недостатньо source-safe розблокованих свідків.';
}

async function refresh() {
  const generation = ++requestGeneration;
  if (!dialog?.open) return;
  status.textContent = 'Оновлення Witness Matrix…';
  tableHost.replaceChildren();
  linearHost.replaceChildren();
  try {
    const data = requirePayload(await api('research.get_witness_matrix', {}));
    if (generation !== requestGeneration || !dialog?.open) return;
    render(data);
  } catch (error) {
    if (generation !== requestGeneration || !dialog?.open) return;
    status.textContent = `Помилка Witness Matrix: ${error.message}`;
  }
}

function buildSurface() {
  const nav = document.querySelector('.top-nav');
  if (!nav || document.getElementById('nav-witness-matrix')) return false;

  trigger = make('button', 'Свідки');
  trigger.type = 'button';
  trigger.id = 'nav-witness-matrix';
  trigger.setAttribute('aria-haspopup', 'dialog');
  const research = document.getElementById('nav-research');
  if (research?.nextSibling) nav.insertBefore(trigger, research.nextSibling);
  else nav.append(trigger);

  dialog = make('dialog');
  dialog.id = 'witness-matrix-dialog';
  dialog.setAttribute('aria-labelledby', 'witness-matrix-heading');
  const shell = make('div');
  shell.className = 'dialog-shell';
  const heading = make('h2', 'Witness Matrix');
  heading.id = 'witness-matrix-heading';
  const scope = make('p', 'Read-only source-local projection з canonical runtime evidence. Locked evidence не показується; contradiction не виводиться автоматично.');
  status = make('p', 'Witness Matrix ще не завантажено.');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.className = 'notice info';
  tableHost = make('section');
  tableHost.setAttribute('aria-label', 'Witness Matrix table');
  linearHost = make('section');
  linearHost.setAttribute('aria-label', 'Witness Matrix linear equivalent');
  const actions = make('div');
  actions.className = 'action-row';
  const reload = make('button', 'Оновити');
  reload.type = 'button';
  const close = make('button', 'Закрити');
  close.type = 'button';
  actions.append(reload, close);
  shell.append(heading, scope, status, tableHost, linearHost, actions);
  dialog.append(shell);
  document.body.append(dialog);

  trigger.addEventListener('click', async () => {
    dialog.showModal();
    await refresh();
  });
  reload.addEventListener('click', refresh);
  close.addEventListener('click', () => {
    invalidateRequests();
    dialog.close();
  });
  dialog.addEventListener('cancel', invalidateRequests);
  dialog.addEventListener('close', () => {
    invalidateRequests();
    trigger?.focus();
  });
  return true;
}

export async function installWitnessMatrixSurface() {
  try {
    const bootstrap = await api('system.bootstrap', {});
    if (bootstrap?.capabilities?.witness_matrix !== true) return;
    buildSurface();
  } catch (_) {
    // Capability discovery fails closed; the existing packaged app remains usable.
  }
}
