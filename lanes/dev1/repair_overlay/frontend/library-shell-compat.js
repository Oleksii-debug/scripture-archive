import './chronology-lab-ui.js';

const LIBRARY_VIEW_ID = 'library-view';

export function shellViews(main = document.querySelector('main')) {
  if (!main) return [];
  return Array.from(main.children).filter(node =>
    node?.tagName === 'SECTION' && node.id && node.id !== LIBRARY_VIEW_ID
  );
}

export function hideShellViews(main = document.querySelector('main')) {
  for (const view of shellViews(main)) view.classList.add('hidden');
}

export function enforceLibraryExclusivity(main = document.querySelector('main')) {
  const library = document.getElementById(LIBRARY_VIEW_ID);
  if (!main || !library || library.classList.contains('hidden')) return false;
  if (!shellViews(main).some(view => !view.classList.contains('hidden'))) return false;
  library.classList.add('hidden');
  return true;
}

function install() {
  const main = document.querySelector('main');
  if (!main) return;

  document.addEventListener('click', event => {
    const target = event.target?.closest?.('#nav-library');
    if (target) hideShellViews(main);
  }, true);

  const observer = new MutationObserver(() => enforceLibraryExclusivity(main));
  observer.observe(main, {
    attributes: true,
    attributeFilter: ['class'],
    childList: true,
    subtree: true,
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once: true});
  else install();
}
