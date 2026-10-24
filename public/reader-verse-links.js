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
