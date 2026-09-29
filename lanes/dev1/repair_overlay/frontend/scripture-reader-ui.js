import {chooseTransport, unwrap} from './transport.js';

let transportPromise = null;
const MAX_BOOKS = 128;
const MAX_CHAPTERS = 200;
const MAX_VERSES = 200;
const MAX_SEARCH_RESULTS = 50;
const MAX_VERSE_TEXT = 10000;
const EXPECTED_TRANSLATION_NAME = 'World English Bible Updated';
const EXPECTED_LICENSE = 'Public Domain';
const EXPECTED_SOURCE_URL = 'https://ebible.org/Scriptures/engwebu_vpl.zip';
const EXPECTED_SOURCE_SITE = 'https://ebible.org/engwebu/';
const EXPECTED_ARCHIVE_SHA256 = '1007fb45782a4abd9444d4225fd768fb00a150466b9fb9fcf6f6ad175b73feb6';
const EXPECTED_VPL_SHA256 = '8cac735abda379045fa2c5f43217410ad47a45ac592f3801116ab0da41a810d8';
const LATEST_UPSTREAM_ARCHIVE_SHA256 = 'cbed8914abff11ff715242ae06351ef7cc77931b89968c6c57142bb8616ddb82';
const LATEST_UPSTREAM_VPL_SHA256 = '5507aa8b7dc4cde0cc385e4b61c76a33223769aba7b8a9c708de81a40403d4ae';
const LATEST_UPSTREAM_CHANGED_REFERENCE = 'WIS 18:1';
const LATEST_UPSTREAM_PINNED_LINE_SHA256 = '48259c1b7540ba6589c9a24a2ba54289503d747cadfaab333273076c180f5759';
const LATEST_UPSTREAM_CURRENT_LINE_SHA256 = '92b8897d7e1a3fb2d34fcbeed5e17bdb72eeb2feffcb7eb698c9a40922b05850';
const LATEST_UPSTREAM_PINNED_LINE = 'WIS 18:1 But for your holy ones there was great light. Their enemies, hearing their voice but not seeing their form, counted it a happy thing that they too had suffered,';
const LATEST_UPSTREAM_CURRENT_LINE = 'WIS 18:1 But for your holy ones there was great light. Their enemies, hearing their voice but not seeing their form, counted it a happy thing that they had not suffered,';
const EXPECTED_VERSE_ROWS = 38058;
const EXPECTED_SOURCE_EMPTY_ROWS = 29;
const EXPECTED_BOOK_COUNT = 81;
const SHA256_HEX = /^[0-9a-f]{64}$/u;
const byId = id => document.getElementById(id);

function element(tag, text = '', attrs = {}) {
  const node = document.createElement(tag);
  if (text !== '') node.textContent = String(text);
  for (const [name, value] of Object.entries(attrs)) {
    if (name === 'className') node.className = String(value);
    else node.setAttribute(name, String(value));
  }
  return node;
}

async function api(command, payload = {}) {
  if (!['library.text_catalog', 'library.read_chapter', 'library.text_search'].includes(command)) {
    throw new Error('Scripture reader attempted a non-reader command');
  }
  if (!transportPromise) transportPromise = chooseTransport();
  return await unwrap(await transportPromise, command, payload);
}

function status(message) {
  const node = byId('scripture-reader-status');
  if (node) node.textContent = String(message || '');
}

function record(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function boundedText(value, name, maxLength, {allowEmpty = false} = {}) {
  if (typeof value !== 'string' || value.length > maxLength || /[\u0000-\u001F\u007F]/u.test(value)) {
    throw new Error(`${name} is invalid`);
  }
  if (!allowEmpty && !value) throw new Error(`${name} must be non-empty`);
  return value;
}

function boundedInteger(value, name, minimum, maximum) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} is invalid`);
  }
  return value;
}

function validateVerse(row, field, {expectedBook = null, expectedChapter = null, requireText = false} = {}) {
  if (!record(row)) throw new Error(`${field} must be an object`);
  const book = boundedText(row.book, `${field}.book`, 4);
  if (!/^[A-Z0-9]{3,4}$/u.test(book)) throw new Error(`${field}.book is invalid`);
  const chapter = boundedInteger(row.chapter, `${field}.chapter`, 1, MAX_CHAPTERS);
  const verse = boundedInteger(row.verse, `${field}.verse`, 1, MAX_VERSES);
  if (expectedBook !== null && book !== expectedBook) throw new Error(`${field}.book does not match chapter`);
  if (expectedChapter !== null && chapter !== expectedChapter) throw new Error(`${field}.chapter does not match chapter`);
  if (row.translation_id !== 'engwebu' || row.source_tier !== 'TX1') throw new Error(`${field} has invalid source identity`);
  if (row.reference !== `${book} ${chapter}:${verse}`) throw new Error(`${field}.reference is inconsistent`);
  const text = boundedText(row.text, `${field}.text`, MAX_VERSE_TEXT, {allowEmpty: true});
  if (row.text_state !== 'present' && row.text_state !== 'source_empty') throw new Error(`${field}.text_state is invalid`);
  if (row.text_state === 'source_empty' && text !== '') throw new Error(`${field} source-empty row contains text`);
  if ((row.text_state === 'present' || requireText) && text === '') throw new Error(`${field} expected source text`);
  return row;
}

export function validateTextCatalog(data) {
  if (!record(data) || data.schema !== 'scripture.library.text-catalog.v1') throw new Error('Invalid WEBU catalog schema');
  if (
    data.translation_id !== 'engwebu'
    || data.translation_name !== EXPECTED_TRANSLATION_NAME
    || data.source_tier !== 'TX1'
    || data.license !== EXPECTED_LICENSE
    || data.source_url !== EXPECTED_SOURCE_URL
    || data.source_site !== EXPECTED_SOURCE_SITE
    || data.archive_sha256 !== EXPECTED_ARCHIVE_SHA256
    || data.vpl_sha256 !== EXPECTED_VPL_SHA256
    || data.runtime_network_required !== false
  ) {
    throw new Error('Invalid WEBU catalog source identity');
  }
  if (data.source_snapshot_status !== 'AUDITED_PINNED_SNAPSHOT') throw new Error('Invalid WEBU source snapshot status');
  const reaudit = data.source_reaudit;
  if (!record(reaudit) || reaudit.status !== 'SOURCE_IDENTITY_RECONCILED' || reaudit.independent_audit_claimed !== false) {
    throw new Error('Invalid WEBU source re-audit status');
  }
  for (const key of ['changed_reference_count', 'added_reference_count', 'removed_reference_count']) {
    boundedInteger(reaudit[key], `source_reaudit.${key}`, 0, 100000);
  }
  boundedInteger(data.verse_rows, 'verse_rows', 1, 100000);
  boundedInteger(data.source_empty_rows, 'source_empty_rows', 0, data.verse_rows);
  if (data.verse_rows !== EXPECTED_VERSE_ROWS || data.source_empty_rows !== EXPECTED_SOURCE_EMPTY_ROWS) {
    throw new Error('WEBU catalog corpus counts do not match pinned authority');
  }
  if (!Array.isArray(data.books) || data.books.length !== EXPECTED_BOOK_COUNT) throw new Error('Invalid WEBU book catalog');
  const seen = new Set();
  for (let index = 0; index < data.books.length; index += 1) {
    const item = data.books[index];
    if (!record(item)) throw new Error(`books[${index}] must be an object`);
    const code = boundedText(item.code, `books[${index}].code`, 4);
    if (!/^[A-Z0-9]{3,4}$/u.test(code) || seen.has(code)) throw new Error(`books[${index}].code is invalid`);
    seen.add(code);
    if (!Array.isArray(item.chapters) || item.chapters.length > MAX_CHAPTERS) throw new Error(`books[${index}].chapters is invalid`);
    item.chapters.forEach((chapter, chapterIndex) => boundedInteger(chapter, `books[${index}].chapters[${chapterIndex}]`, 1, MAX_CHAPTERS));
    if (new Set(item.chapters).size !== item.chapters.length || item.chapters.some((chapter, chapterIndex) => chapterIndex > 0 && chapter <= item.chapters[chapterIndex - 1])) {
      throw new Error(`books[${index}].chapters must be unique and ascending`);
    }
    if (item.chapter_count !== item.chapters.length) throw new Error(`books[${index}].chapter_count is inconsistent`);
  }
  if (!record(data.upstream_monitoring) || !['MATCH_PINNED_AUTHORITY', 'SOURCE_REAUDIT_REQUIRED'].includes(data.upstream_monitoring.status)) {
    throw new Error('Invalid WEBU upstream monitoring status');
  }
  const monitoring = data.upstream_monitoring;
  if (
    typeof monitoring.observed_archive_sha256 !== 'string'
    || !SHA256_HEX.test(monitoring.observed_archive_sha256)
    || typeof monitoring.observed_vpl_sha256 !== 'string'
    || !SHA256_HEX.test(monitoring.observed_vpl_sha256)
  ) {
    throw new Error('Invalid WEBU upstream monitoring hashes');
  }
  for (const key of ['changed_reference_count', 'added_reference_count', 'removed_reference_count']) {
    boundedInteger(monitoring[key], `upstream_monitoring.${key}`, 0, 100000);
  }
  if (!Array.isArray(monitoring.changed_references) || monitoring.changed_references.length > 100000) {
    throw new Error('Invalid WEBU changed-reference inventory');
  }
  monitoring.changed_references.forEach((reference, index) => {
    boundedText(reference, `upstream_monitoring.changed_references[${index}]`, 32);
  });
  if (
    monitoring.status === 'MATCH_PINNED_AUTHORITY'
    && (
      monitoring.observed_archive_sha256 !== EXPECTED_ARCHIVE_SHA256
      || monitoring.observed_vpl_sha256 !== EXPECTED_VPL_SHA256
      || monitoring.changed_reference_count !== 0
      || monitoring.added_reference_count !== 0
      || monitoring.removed_reference_count !== 0
      || monitoring.changed_references.length !== 0
    )
  ) {
    throw new Error('WEBU MATCH_PINNED_AUTHORITY conflicts with drift evidence');
  }
  if (monitoring.status === 'SOURCE_REAUDIT_REQUIRED') {
    if (
      monitoring.observed_archive_sha256 !== LATEST_UPSTREAM_ARCHIVE_SHA256
      || monitoring.observed_vpl_sha256 !== LATEST_UPSTREAM_VPL_SHA256
      || monitoring.changed_reference_count !== 1
      || monitoring.added_reference_count !== 0
      || monitoring.removed_reference_count !== 0
      || monitoring.changed_references.length !== 1
      || monitoring.changed_references[0] !== LATEST_UPSTREAM_CHANGED_REFERENCE
      || monitoring.observed_archive_sha256 === EXPECTED_ARCHIVE_SHA256
      || monitoring.observed_vpl_sha256 === EXPECTED_VPL_SHA256
    ) {
      throw new Error('WEBU SOURCE_REAUDIT_REQUIRED does not match current drift evidence');
    }
    if (!Array.isArray(monitoring.changed_reference_details) || monitoring.changed_reference_details.length !== 1) {
      throw new Error('WEBU source drift detail is missing');
    }
    const detail = monitoring.changed_reference_details[0];
    if (
      !record(detail)
      || detail.reference !== LATEST_UPSTREAM_CHANGED_REFERENCE
      || detail.pinned_line_sha256 !== LATEST_UPSTREAM_PINNED_LINE_SHA256
      || detail.current_line_sha256 !== LATEST_UPSTREAM_CURRENT_LINE_SHA256
      || detail.pinned_line !== LATEST_UPSTREAM_PINNED_LINE
      || detail.current_line !== LATEST_UPSTREAM_CURRENT_LINE
    ) {
      throw new Error('WEBU source drift detail identity is invalid');
    }
    boundedText(detail.pinned_line, 'upstream_monitoring.changed_reference_details[0].pinned_line', MAX_VERSE_TEXT);
    boundedText(detail.current_line, 'upstream_monitoring.changed_reference_details[0].current_line', MAX_VERSE_TEXT);
  }
  return data;
}

export function validateChapter(data) {
  if (!record(data) || data.schema !== 'scripture.library.chapter.v1') throw new Error('Invalid WEBU chapter schema');
  if (data.translation_id !== 'engwebu' || data.source_tier !== 'TX1') throw new Error('Invalid WEBU chapter source identity');
  const book = boundedText(data.book, 'book', 4);
  const chapter = boundedInteger(data.chapter, 'chapter', 1, MAX_CHAPTERS);
  if (!Array.isArray(data.verses) || data.verses.length === 0 || data.verses.length > MAX_VERSES) throw new Error('Invalid WEBU chapter verses');
  let previousVerse = 0;
  const seenVerses = new Set();
  data.verses.forEach((row, index) => {
    validateVerse(row, `verses[${index}]`, {expectedBook: book, expectedChapter: chapter});
    if (seenVerses.has(row.verse) || row.verse <= previousVerse) throw new Error('WEBU chapter verses must be unique and ascending');
    seenVerses.add(row.verse);
    previousVerse = row.verse;
  });
  const sourceEmpty = data.verses.filter(row => row.text_state === 'source_empty').length;
  if (data.source_empty_rows !== sourceEmpty) throw new Error('WEBU chapter source-empty count is inconsistent');
  return data;
}

export function validateTextSearch(data) {
  if (!record(data) || data.schema !== 'scripture.library.text-search.v1') throw new Error('Invalid WEBU search schema');
  if (data.translation_id !== 'engwebu' || data.source_tier !== 'TX1') throw new Error('Invalid WEBU search source identity');
  boundedText(data.query, 'query', 128);
  boundedInteger(data.total, 'total', 0, 100000);
  if (!Array.isArray(data.results) || data.results.length > MAX_SEARCH_RESULTS || data.total < data.results.length) {
    throw new Error('Invalid WEBU search results');
  }
  const references = new Set();
  data.results.forEach((row, index) => {
    validateVerse(row, `results[${index}]`, {requireText: true});
    if (references.has(row.reference)) throw new Error('WEBU search returned a duplicate source reference');
    references.add(row.reference);
  });
  return data;
}

function renderVerses(data) {
  const host = byId('scripture-reader-verses');
  host.replaceChildren();
  const heading = element('h4', `${data.book} ${data.chapter}`);
  const list = element('ol', '', {'aria-label': `${data.book} ${data.chapter}, World English Bible Updated`});
  for (const row of data.verses || []) {
    const text = row.text_state === 'source_empty'
      ? `Verse ${row.verse}. Not stated in the cited WEBU source row.`
      : `Verse ${row.verse}. ${row.text}`;
    list.append(element('li', text, {'data-reference': row.reference}));
  }
  host.append(heading, list);
  heading.tabIndex = -1;
  heading.focus();
}

function renderSearch(data) {
  const host = byId('scripture-reader-search-results');
  host.replaceChildren();
  const heading = element('h4', 'Search results', {id: 'scripture-reader-search-results-heading'});
  heading.tabIndex = -1;
  if (!data.results?.length) {
    host.append(heading, element('p', 'No matching text found in the bundled WEBU source.'));
    heading.focus();
    return;
  }
  const list = element('ol', '', {'aria-labelledby': 'scripture-reader-search-results-heading'});
  for (const row of data.results) {
    list.append(element('li', `${row.reference} — ${row.text}`));
  }
  host.append(heading, list);
  heading.focus();
}

export async function installScriptureReaderSurface() {
  const library = byId('library-view');
  if (!library || byId('scripture-reader')) return;

  const section = element('section', '', {id: 'scripture-reader', 'aria-labelledby': 'scripture-reader-heading'});
  const heading = element('h3', 'Full Scripture text — WEBU', {id: 'scripture-reader-heading'});
  const source = element('p', 'Bundled offline World English Bible Updated (engwebu), source tier TX1, public-domain source. Empty source rows are reported as empty and are never filled from another witness.', {id: 'scripture-reader-source', role: 'note'});

  const readForm = element('form', '', {id: 'scripture-reader-form', 'aria-labelledby': 'scripture-reader-read-heading'});
  readForm.append(element('h4', 'Read a chapter', {id: 'scripture-reader-read-heading'}));
  const bookLabel = element('label', 'Book code'); bookLabel.htmlFor = 'scripture-reader-book';
  const book = element('select', '', {id: 'scripture-reader-book'});
  const chapterLabel = element('label', 'Chapter'); chapterLabel.htmlFor = 'scripture-reader-chapter';
  const chapter = element('input', '', {id: 'scripture-reader-chapter', type: 'number', min: '1', max: '200', value: '1', inputmode: 'numeric'});
  const readButton = element('button', 'Read chapter', {type: 'submit'});
  readForm.append(bookLabel, book, chapterLabel, chapter, readButton);

  const searchForm = element('form', '', {id: 'scripture-reader-text-search', role: 'search', 'aria-labelledby': 'scripture-reader-search-heading'});
  searchForm.append(element('h4', 'Search full text', {id: 'scripture-reader-search-heading'}));
  const queryLabel = element('label', 'Words in Scripture text'); queryLabel.htmlFor = 'scripture-reader-query';
  const query = element('input', '', {id: 'scripture-reader-query', type: 'search', maxlength: '128', autocomplete: 'off'});
  const searchButton = element('button', 'Search WEBU', {type: 'submit'});
  searchForm.append(queryLabel, query, searchButton);

  const live = element('p', '', {id: 'scripture-reader-status', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true'});
  // Keep only the compact status as a live region. Chapter/search results may contain
  // dozens of source rows; announcing those containers live would duplicate or flood NVDA.
  // User-triggered result changes use explicit heading focus instead.
  const verses = element('div', '', {id: 'scripture-reader-verses'});
  const results = element('div', '', {id: 'scripture-reader-search-results'});
  section.append(heading, source, readForm, searchForm, live, verses, results);
  library.append(section);

  try {
    const catalog = validateTextCatalog(await api('library.text_catalog'));
    for (const item of catalog.books) {
      const option = element('option', item.code);
      option.value = item.code;
      book.append(option);
    }
    const monitoring = catalog.upstream_monitoring || {};
    const driftPending = catalog.source_snapshot_status === 'AUDITED_PINNED_SNAPSHOT'
      && monitoring.status === 'SOURCE_REAUDIT_REQUIRED';
    if (driftPending) {
      const changedRefs = monitoring.changed_references.join(', ');
      source.textContent = `Bundled offline World English Bible Updated (engwebu), source tier TX1, public-domain source. This is an audited pinned snapshot. The official upstream has changed at ${monitoring.changed_reference_count || 0} known references and is pending source re-audit; known changed references: ${changedRefs}. This reader continues to use the audited bundled snapshot. Empty source rows are reported as empty and are never filled from another witness.`;
    }
    status(`Offline WEBU ready: ${catalog.verse_rows} source rows across ${catalog.books?.length || 0} book codes.${driftPending ? ' Audited pinned snapshot; upstream source re-audit is pending.' : ''}`);
  } catch (error) {
    status(`Full-text provider unavailable: ${error.message}`);
    readButton.disabled = true; searchButton.disabled = true;
    return;
  }

  readForm.addEventListener('submit', async event => {
    event.preventDefault(); readButton.disabled = true; status('Loading chapter…');
    try {
      const data = validateChapter(await api('library.read_chapter', {book: book.value, chapter: Number(chapter.value)}));
      renderVerses(data); status(`${data.book} ${data.chapter}: ${data.verses.length} source rows.`);
    } catch (error) { status(`Cannot read chapter: ${error.message}`); }
    finally { readButton.disabled = false; }
  });

  searchForm.addEventListener('submit', async event => {
    event.preventDefault(); const value = query.value.trim();
    if (!value) { status('Enter words to search in the bundled WEBU text.'); query.focus(); return; }
    searchButton.disabled = true; status('Searching bundled WEBU text…');
    try {
      const data = validateTextSearch(await api('library.text_search', {query: value, limit: MAX_SEARCH_RESULTS}));
      renderSearch(data); status(`${data.total} matching source rows; showing up to 50.`);
    } catch (error) { status(`Cannot search Scripture text: ${error.message}`); }
    finally { searchButton.disabled = false; }
  });
}
