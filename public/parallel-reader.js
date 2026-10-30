const COPY = {
  uk: { title:'Порівняти видання', choose:'Друге видання', open:'Показати другу версію глави', loading:'Завантаження…', ready:'Другу версію глави завантажено нижче.', fail:'Не вдалося завантажити другу версію. Спробуйте ще раз.', unavailable:'У цьому виданні такої глави немає.', note:'Нумерація віршів у виданнях може відрізнятися. Тексти наведено окремо.', source:'Джерело', license:'Умови використання' },
  ru: { title:'Сравнить издания', choose:'Второе издание', open:'Показать вторую версию главы', loading:'Загрузка…', ready:'Вторая версия главы загружена ниже.', fail:'Не удалось загрузить вторую версию. Попробуйте ещё раз.', unavailable:'В этом издании такой главы нет.', note:'Нумерация стихов в изданиях может отличаться. Тексты приведены отдельно.', source:'Источник', license:'Условия использования' },
  en: { title:'Compare editions', choose:'Second edition', open:'Show the second chapter text', loading:'Loading…', ready:'The second chapter text is available below.', fail:'Could not load the second text. Please try again.', unavailable:'This chapter is not available in that edition.', note:'Verse numbering may differ between editions. The texts are presented separately.', source:'Source', license:'Terms of use' },
};
const https = value => { try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''; } catch { return ''; } };

export function parallelControls(editions, lang, esc) {
  const copy = COPY[lang] || COPY.uk;
  return `<details class="card parallel-reader"><summary>${copy.title}</summary><p>${copy.note}</p><form class="parallel-form"><label class="account-field"><span>${copy.choose}</span><select name="edition">${editions.map(edition=>`<option value="${esc(edition.id)}">${esc(edition.title)}</option>`).join('')}</select></label><button class="button" type="submit">${copy.open}</button><p class="parallel-status" role="status"></p></form><div class="parallel-result"></div></details>`;
}

// The same chapter guard as the reader runs again before loading another text.
// Detached panels and a changed reader context cannot be repopulated by a late response.
export function mountParallelReader(panel, { editions, catalog, lang, book, bookTitle, chapter, getBook, check, current, lock, failClosed, esc }) {
  const copy = COPY[lang] || COPY.uk;
  const form=panel.querySelector('.parallel-form'), status=panel.querySelector('.parallel-status'), result=panel.querySelector('.parallel-result');
  form.onsubmit=async event=>{
    event.preventDefault();
    const button=form.querySelector('button'), id=String(new FormData(form).get('edition') || ''), edition=editions.find(item=>item.id===id && item.local);
    if (!edition || button.disabled || !current() || !panel.isConnected) return;
    button.disabled=true; status.textContent=copy.loading; result.replaceChildren();
    try {
      let guard;
      try { guard=await check(book,chapter); }
      catch { if(panel.isConnected && current()) failClosed(); return; }
      if (!panel.isConnected || !current()) return;
      if (!guard || typeof guard.invalidated !== 'boolean') { failClosed(); return; }
      if (guard.invalidated) { lock(); return; }
      const data=await getBook(book,edition);
      if (!panel.isConnected || !current()) return;
      // Another tab or device may start an attempt while the second text loads.
      // Revalidate after that await and before exposing the comparison text.
      let finalGuard;
      try { finalGuard=await check(book,chapter); }
      catch { if (panel.isConnected && current()) failClosed(); return; }
      if (!panel.isConnected || !current()) return;
      if (!finalGuard || typeof finalGuard.invalidated !== 'boolean') { failClosed(); return; }
      if (finalGuard.invalidated) { lock(); return; }
      const verses=data.chapters[chapter-1];
      if (!Array.isArray(verses)) { status.textContent=copy.unavailable; return; }
      // Never attribute a new/unrecognized local edition to the primary one.
      const fallback=catalog.editions?.[lang];
      const declared=Object.prototype.hasOwnProperty.call(catalog.translations || {}, edition.id);
      const translation=declared ? catalog.translations[edition.id] : null;
      // A declared but mismatched identity must not borrow another edition's
      // licence and attribute that edition's loaded verses to a false source.
      const metadata=declared ? (translation?.id === edition.id ? translation : null)
        : (edition.contentId && fallback?.id === edition.contentId ? fallback : null);
      // Keep a comparison inaccessible if its own source or terms are missing.
      // Never borrow rights metadata from another Bible edition.
      const source=typeof metadata?.source==='string'?https(metadata.source):'';
      const license=typeof metadata?.licenseUrl==='string'?https(metadata.licenseUrl):'';
      if (!metadata || typeof metadata.title!=='string' || !metadata.title.trim()
          || typeof metadata.license!=='string' || !metadata.license.trim()
          || !source || (metadata.licenseUrl!=null && !license)) {
        throw Error('missing or unsafe edition provenance');
      }
      result.innerHTML=`<section aria-labelledby="parallel-title"><h3 id="parallel-title">${esc(metadata.title)} — ${esc(bookTitle)} ${chapter}</h3><p>${copy.note}</p><p>${copy.license}: ${esc(metadata.license || '—')}</p>${metadata.attribution?`<p>${esc(metadata.attribution)}</p>`:''}${source?`<p><a href="${esc(source)}" target="_blank" rel="noreferrer">${copy.source}</a></p>`:''}${license?`<p><a href="${esc(license)}" target="_blank" rel="noreferrer">${copy.license}</a></p>`:''}<ol>${verses.map(verse=>`<li>${esc(verse)}</li>`).join('')}</ol></section>`;
      status.textContent=copy.ready;
    } catch { if (panel.isConnected && current()) status.textContent=copy.fail; }
    finally { button.disabled=false; }
  };
}
