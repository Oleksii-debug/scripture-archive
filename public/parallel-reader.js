const COPY = {
  uk: { title:'Порівняти видання', choose:'Друге видання', open:'Показати другу версію глави', loading:'Завантаження…', ready:'Другу версію глави завантажено нижче.', fail:'Не вдалося завантажити другу версію. Спробуйте ще раз.', changed:'Вибране видання змінилося. Натисніть кнопку ще раз, щоб порівняти його.', unavailable:'У цьому виданні такої глави немає.', note:'Нумерація віршів у виданнях може відрізнятися. Тексти наведено окремо.', source:'Джерело', license:'Умови використання', cite:'Цитувати вірш', cited:'Цитату з джерелом скопійовано.', citeFail:'Не вдалося скопіювати цитату.' },
  ru: { title:'Сравнить издания', choose:'Второе издание', open:'Показать вторую версию главы', loading:'Загрузка…', ready:'Вторая версия главы загружена ниже.', fail:'Не удалось загрузить вторую версию. Попробуйте ещё раз.', changed:'Выбранное издание изменилось. Нажмите кнопку ещё раз, чтобы сравнить его.', unavailable:'В этом издании такой главы нет.', note:'Нумерация стихов в изданиях может отличаться. Тексты приведены отдельно.', source:'Источник', license:'Условия использования', cite:'Цитировать стих', cited:'Цитата с источником скопирована.', citeFail:'Не удалось скопировать цитату.' },
  en: { title:'Compare editions', choose:'Second edition', open:'Show the second chapter text', loading:'Loading…', ready:'The second chapter text is available below.', fail:'Could not load the second text. Please try again.', changed:'The selected edition changed. Submit again to compare the current selection.', unavailable:'This chapter is not available in that edition.', note:'Verse numbering may differ between editions. The texts are presented separately.', source:'Source', license:'Terms of use', cite:'Cite verse', cited:'Verse and source copied.', citeFail:'Could not copy the citation.' },
};
const https = value => { try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''; } catch { return ''; } };

export function parallelControls(editions, lang, esc) {
  const copy = COPY[lang] || COPY.uk;
  return `<details class="card parallel-reader"><summary>${copy.title}</summary><p>${copy.note}</p><form class="parallel-form"><label class="account-field"><span>${copy.choose}</span><select name="edition">${editions.map(edition=>`<option value="${esc(edition.id)}">${esc(edition.title)}</option>`).join('')}</select></label><button class="button" type="submit">${copy.open}</button><p class="parallel-status" role="status"></p></form><div class="parallel-result"></div></details>`;
}

// The same chapter guard as the reader runs again before loading another text.
// Detached panels and a changed reader context cannot be repopulated by a late response.
export function mountParallelReader(panel, { editions, catalog, lang, book, bookTitle, chapter, getBook, check, current, lock, failClosed, esc, copyText = text => navigator.clipboard.writeText(text) }) {
  const copy = COPY[lang] || COPY.uk;
  const form=panel.querySelector('.parallel-form'), status=panel.querySelector('.parallel-status'), result=panel.querySelector('.parallel-result');
  let selectionRevision = 0;
  // The licensed text must not remain visible under a different selected edition.
  // Also retire an in-flight A -> B -> A request, which an ID-only check misses.
  form.onchange = event => {
    if (event?.target?.name !== 'edition') return;
    selectionRevision += 1;
    result.replaceChildren();
    status.textContent = copy.changed;
  };
  let citation = null;
  form.onsubmit=async event=>{
    event.preventDefault();
    const button=form.querySelector('button'), id=String(new FormData(form).get('edition') || ''), edition=editions.find(item=>item.id===id && item.local);
    const submittedRevision = selectionRevision;
    const selectionCurrent = () => selectionRevision === submittedRevision &&
      String(new FormData(form).get('edition') || '') === id;
    if (!edition || button.disabled || !current() || !panel.isConnected) return;
    // Disabling a focused submit button moves keyboard focus to BODY in
    // Chromium. Restore only after this same reader finishes and only when
    // nobody has focused another control in the meantime.
    const hadSubmitFocus = typeof document !== 'undefined' &&
      document.activeElement === button;
    button.disabled=true; status.textContent=copy.loading; citation=null; result.replaceChildren();
    try {
      let guard;
      try { guard=await check(book,chapter); }
      catch { if(panel.isConnected && current()) failClosed(); return; }
      if (!panel.isConnected || !current()) return;
      if (!guard || typeof guard.invalidated !== 'boolean') { failClosed(); return; }
      if (guard.invalidated) { lock(); return; }
      // A changed native select must retire this request, even for the same reader/principal.
      if (!selectionCurrent()) { status.textContent=copy.changed; return; }
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
      // Never show edition A's licensed verses under edition B's selected label.
      if (!selectionCurrent()) { status.textContent=copy.changed; return; }
      const verses=data.chapters[chapter-1];
      if (!Array.isArray(verses)) { status.textContent=copy.unavailable; return; }
      // A corrupt or empty chapter must never be presented as verified Scripture.
      // An indexed loop also rejects sparse arrays (Array#every skips their holes).
      if (verses.length===0) throw Error('empty edition chapter');
      for (let i=0; i<verses.length; i++) {
        if (typeof verses[i]!=='string' || !verses[i].trim())
          throw Error('invalid edition verse record');
      }
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
      result.innerHTML=`<section aria-labelledby="parallel-title"><h3 id="parallel-title">${esc(metadata.title)} — ${esc(bookTitle)} ${chapter}</h3><p>${copy.note}</p><p>${copy.license}: ${esc(metadata.license || '—')}</p>${metadata.attribution?`<p>${esc(metadata.attribution)}</p>`:''}${source?`<p><a href="${esc(source)}" target="_blank" rel="noreferrer">${copy.source}</a></p>`:''}${license?`<p><a href="${esc(license)}" target="_blank" rel="noreferrer">${copy.license}</a></p>`:''}<ol>${verses.map((verse,index)=>`<li><span>${esc(verse)}</span> <button type="button" class="parallel-cite" data-parallel-cite="${index+1}" aria-label="${esc(copy.cite)}: ${esc(bookTitle)} ${chapter}:${index+1}">${esc(copy.cite)}</button></li>`).join('')}</ol></section>`;
      citation={ editionId:id, title:metadata.title, license:metadata.license, attribution:typeof metadata.attribution==='string'?metadata.attribution:'', source, licenseUrl:license, verses };
      status.textContent=copy.ready;
    } catch { if (panel.isConnected && current()) status.textContent=selectionCurrent() ? copy.fail : copy.changed; }
    finally {
      button.disabled=false;
      if (hadSubmitFocus && panel.isConnected && typeof document !== 'undefined' &&
          document.activeElement === document.body && typeof button.focus === 'function') {
        try { if (current()) button.focus({preventScroll:true}); }
        catch { /* A torn-down reader must never steal focus on recovery. */ }
      }
    }
  };
  // Copy only the validated *second* edition's verses and their own rights
  // metadata; never borrow the primary edition's license or source.
  result.addEventListener('click', async event => {
    const button=event.target?.closest?.('button[data-parallel-cite]');
    if (!button || !citation || button.disabled || !panel.isConnected || !current()) return;
    const record=citation, raw=button.dataset.parallelCite;
    if (!/^[1-9][0-9]*$/.test(raw || '')) return;
    const verseNumber=Number(raw);
    if (!Number.isSafeInteger(verseNumber) || verseNumber>record.verses.length) return;
    const selected=()=>String(new FormData(form).get('edition') || '')===record.editionId;
    if (!selected()) { status.textContent=copy.changed; return; }
    // Recheck active assessments immediately before a clipboard disclosure.
    let guard;
    try { guard=await check(book,chapter); }
    catch { if (panel.isConnected && current()) failClosed(); return; }
    if (!panel.isConnected || !current() || citation!==record || !selected()) return;
    if (!guard || typeof guard.invalidated!=='boolean') { failClosed(); return; }
    if (guard.invalidated) { lock(); return; }
    const citationText=[
      `${bookTitle} ${chapter}:${verseNumber}. ${record.verses[verseNumber-1]}`,
      `${record.title} · ${record.license}`,
      record.attribution, record.source, record.licenseUrl,
    ].filter(Boolean).join('\\n');
    try {
      await copyText(citationText);
      if (panel.isConnected && current() && citation===record && selected())
        status.textContent=copy.cited;
    } catch {
      if (panel.isConnected && current() && citation===record && selected())
        status.textContent=copy.citeFail;
    }
  });
}
