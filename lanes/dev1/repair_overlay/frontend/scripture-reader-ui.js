import {chooseTransport, unwrap} from './transport.js';

let transportPromise = null;
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
  if (!data.results?.length) {
    host.append(element('p', 'No matching text found in the bundled WEBU source.'));
    return;
  }
  const list = element('ol');
  for (const row of data.results) {
    list.append(element('li', `${row.reference} — ${row.text}`));
  }
  host.append(list);
}

export async function installScriptureReaderSurface() {
  const library = byId('library-view');
  if (!library || byId('scripture-reader')) return;

  const section = element('section', '', {id: 'scripture-reader', 'aria-labelledby': 'scripture-reader-heading'});
  const heading = element('h3', 'Full Scripture text — WEBU', {id: 'scripture-reader-heading'});
  const source = element('p', 'Bundled offline World English Bible Updated (engwebu), source tier TX1, public-domain source. Empty source rows are reported as empty and are never filled from another witness.', {role: 'note'});

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

  const live = element('p', '', {id: 'scripture-reader-status', role: 'status', 'aria-live': 'polite'});
  const verses = element('div', '', {id: 'scripture-reader-verses', 'aria-live': 'polite'});
  const results = element('div', '', {id: 'scripture-reader-search-results', 'aria-live': 'polite'});
  section.append(heading, source, readForm, searchForm, live, verses, results);
  library.append(section);

  try {
    const catalog = await api('library.text_catalog');
    for (const item of catalog.books || []) {
      const option = element('option', item.code);
      option.value = item.code;
      book.append(option);
    }
    status(`Offline WEBU ready: ${catalog.verse_rows} source rows across ${catalog.books?.length || 0} book codes.`);
  } catch (error) {
    status(`Full-text provider unavailable: ${error.message}`);
    readButton.disabled = true; searchButton.disabled = true;
    return;
  }

  readForm.addEventListener('submit', async event => {
    event.preventDefault(); readButton.disabled = true; status('Loading chapter…');
    try {
      const data = await api('library.read_chapter', {book: book.value, chapter: Number(chapter.value)});
      renderVerses(data); status(`${data.book} ${data.chapter}: ${data.verses.length} source rows.`);
    } catch (error) { status(`Cannot read chapter: ${error.message}`); }
    finally { readButton.disabled = false; }
  });

  searchForm.addEventListener('submit', async event => {
    event.preventDefault(); const value = query.value.trim();
    if (!value) { status('Enter words to search in the bundled WEBU text.'); query.focus(); return; }
    searchButton.disabled = true; status('Searching bundled WEBU text…');
    try {
      const data = await api('library.text_search', {query: value, limit: 50});
      renderSearch(data); status(`${data.total} matching source rows; showing up to 50.`);
    } catch (error) { status(`Cannot search Scripture text: ${error.message}`); }
    finally { searchButton.disabled = false; }
  });
}
