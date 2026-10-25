// Verse navigation stays attached to the reader's existing chapter and verse IDs.
export function readerVerseHref(code, chapter, verse) {
  if (typeof code !== 'string' || !/^[A-Z0-9]{3}$/.test(code) ||
      !Number.isSafeInteger(chapter) || chapter < 1 ||
      !Number.isSafeInteger(verse) || verse < 1) return null;
  return `/reader/${code}/${chapter}?verse=${verse}`;
}

export function focusRequestedVerse(search, root) {
  const values = new URLSearchParams(search).getAll('verse');
  if (values.length !== 1 || !/^[1-9][0-9]*$/.test(values[0])) return false;
  const verse = Number(values[0]);
  if (!Number.isSafeInteger(verse)) return false;
  const target = root?.querySelector?.(`.reading-pane .verses p.verse#v${verse}`);
  if (!target) return false;
  target.tabIndex = -1;
  target.focus({ preventScroll: true });
  target.scrollIntoView({ block: 'center' });
  return true;
}

// Keep malformed route chapter values out of book.chapters[chapter - 1].
// Existing positive overflow behavior (last chapter) is intentionally preserved.
export function readerChapterNumber(value, maxChapters) {
  if (!Number.isSafeInteger(maxChapters) || maxChapters < 1) return 1;
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string' && /^[1-9][0-9]*$/.test(value)
      ? Number(value)
      : NaN;
  if (!Number.isSafeInteger(parsed) || parsed < 1) return 1;
  return Math.min(parsed, maxChapters);
}

// Never focus an unrelated verse after a route falls back to a different chapter.
// The existing reader state is authoritative for the text on screen.
export function focusReaderRouteVerse(search, root, routeParts, activeReader) {
  if (!Array.isArray(routeParts) || !activeReader ||
      !Number.isSafeInteger(activeReader.chapter) || activeReader.chapter < 1 ||
      routeParts[1] !== activeReader.book ||
      routeParts[2] !== String(activeReader.chapter)) return false;
  return focusRequestedVerse(search, root);
}

// A clamped or malformed route must not keep advertising a different chapter.
// Drop a stale ?verse query when the displayed coordinate differs, while
// leaving valid deep links (and their queries) untouched.
export function readerCanonicalPath(routeParts, activeReader, groupId = '') {
  if (!Array.isArray(routeParts) || routeParts[0] !== 'reader' || !routeParts[1] ||
      !activeReader || typeof activeReader.book !== 'string' ||
      !/^[A-Z0-9]{3}$/.test(activeReader.book) ||
      !Number.isSafeInteger(activeReader.chapter) || activeReader.chapter < 1) return null;
  if (routeParts[1] === activeReader.book &&
      routeParts[2] === String(activeReader.chapter)) return null;
  const group = routeParts[3] === 'group' && groupId && !/[/?#]/.test(groupId)
    ? `/group/${groupId}` : '';
  return `/reader/${activeReader.book}/${activeReader.chapter}${group}`;
}

// Refuse an HTTP 200 payload whose book/edition differs from the catalog that
// selected this chapter. Catalog metadata remains the single source of truth;
// this is a render boundary check, not an alternate corpus parser.
export function readerBookMatchesCatalog(book, meta, locale, editionId) {
  if (!book || !meta ||
      typeof meta.code !== 'string' || !/^[A-Z0-9]{3}$/.test(meta.code) ||
      (meta.testament !== 'OT' && meta.testament !== 'NT') ||
      typeof locale !== 'string' || !locale ||
      typeof editionId !== 'string' || !editionId ||
      book.bookCode !== meta.code || book.locale !== locale ||
      book.editionId !== editionId || book.testament !== meta.testament ||
      !Number.isSafeInteger(meta.chapters) || meta.chapters < 1 ||
      !Array.isArray(book.chapters) || book.chapters.length !== meta.chapters) return false;
  return book.chapters.every(chapter =>
    Array.isArray(chapter) && chapter.length > 0 &&
    chapter.every(verse => typeof verse === 'string' && verse.trim().length > 0));
}
