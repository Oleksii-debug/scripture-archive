const COPY = {
  uk: { title:'Порівняти видання', choose:'Друге видання', open:'Показати другу версію глави', loading:'Завантаження…', ready:'Другу версію глави завантажено нижче.', fail:'Не вдалося завантажити другу версію. Спробуйте ще раз.', changed:'Вибране видання змінилося. Натисніть кнопку ще раз, щоб порівняти його.', unavailable:'У цьому виданні такої глави немає.', note:'Нумерація віршів у виданнях може відрізнятися. Тексти наведено окремо.', source:'Джерело', license:'Умови використання', cite:'Цитувати вірш', cited:'Цитату з джерелом скопійовано.', citeFail:'Не вдалося скопіювати цитату.' },
  ru: { title:'Сравнить издания', choose:'Второе издание', open:'Показать вторую версию главы', loading:'Загрузка…', ready:'Вторая версия главы загружена ниже.', fail:'Не удалось загрузить вторую версию. Попробуйте ещё раз.', changed:'Выбранное издание изменилось. Нажмите кнопку ещё раз, чтобы сравнить его.', unavailable:'В этом издании такой главы нет.', note:'Нумерация стихов в изданиях может отличаться. Тексты приведены отдельно.', source:'Источник', license:'Условия использования', cite:'Цитировать стих', cited:'Цитата с источником скопирована.', citeFail:'Не удалось скопировать цитату.' },
  en: { title:'Compare editions', choose:'Second edition', open:'Show the second chapter text', loading:'Loading…', ready:'The second chapter text is available below.', fail:'Could not load the second text. Please try again.', changed:'The selected edition changed. Submit again to compare the current selection.', unavailable:'This chapter is not available in that edition.', note:'Verse numbering may differ between editions. The texts are presented separately.', source:'Source', license:'Terms of use', cite:'Cite verse', cited:'Verse and source copied.', citeFail:'Could not copy the citation.' },
};
// Provenance URL admission must inspect the *raw* string first: WHATWG URL
// silently strips tabs/newlines and empty user-info delimiters; it also
// percent-encodes raw Unicode controls, separators and lone surrogates in URI paths.
// Refuse them before parsing instead of silently changing source/licence links.
const https = value => {
  if (typeof value !== 'string' || !/^https:\/\//i.test(value) ||
      /[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}\s\\\u034f\u115f\u1160\u2800\u3164\uffa0]/u.test(value)) return '';
  const authority = value.slice(value.indexOf('://') + 3).split(/[/?#]/u, 1)[0];
  if (!authority || authority.includes('@')) return '';
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
};
// Single canonical source/licence URI admission for the reader and edition information.
export { https as safeProvenanceHttpsUrl };

// One verified Unicode admission predicate for all visible edition-rights text.
// Disallow invisible format/filler spoofs while keeping genuine multiline
// licence text (TAB/LF/CR), visible Cyrillic and Braille characters.
const unsafeRightsText=/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u00a0\u061c\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff\ud800-\udfff\u034f\u115f\u1160\u2800\u3164\uffa0\p{Cf}]/u;
export function validEditionRightsText(value,max) {
  return typeof value==='string' && value.length<=max && !unsafeRightsText.test(value);
}

// Shared fail-closed publisher/rights metadata contract for the primary reader
// and the parallel reader. Do not silently truncate verified attribution.
// These conservative limits bound DOM and clipboard payloads.
export function validEditionRightsMetadata(metadata) {
  // Publisher/source/rights claims must belong to the edition record itself.
  // Inherited values (including optional fields) can silently attach another
  // edition's licence to real Scripture verses if a catalog object is polluted
  // or reconstructed with a nontrivial prototype. Parsed JSON remains valid.
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return false;
  const own = key => Object.hasOwn(metadata,key);
  const optionalOwn = key => !(key in metadata) || own(key);
  // An own accessor is not an authored publisher/rights record. A getter can
  // return an approved title during validation and a different title when the
  // reader renders or copies the citation. Never execute accessors for rights.
  for (const key of ['title','license','source','attribution','licenseUrl']) {
    const descriptor = Object.getOwnPropertyDescriptor(metadata,key);
    if (descriptor && !Object.hasOwn(descriptor,'value')) return false;
  }
  // Source URLs already reject bidi/control Unicode; do not let edition
  // titles, rights terms or attribution spoof the same authoritative citation.
  // Preserve normal multiline licences (TAB/LF/CR) and non-Latin letters.
  // Cover all Unicode format controls and visually blank script fillers,
  // not only bidi controls; keep normal TAB/LF/CR in licensed rights text.
  const boundedText=validEditionRightsText;
  return Boolean(own('title') && own('license') && own('source') &&
    optionalOwn('attribution') && optionalOwn('licenseUrl') &&
    boundedText(metadata.title,512) && metadata.title.trim() &&
    boundedText(metadata.license,4096) && metadata.license.trim() &&
    boundedText(metadata.source,4096) && https(metadata.source) &&
    (metadata.attribution==null || boundedText(metadata.attribution,4096)) &&
    (metadata.licenseUrl==null ||
      (boundedText(metadata.licenseUrl,4096) && https(metadata.licenseUrl))));
}

// Locale values can come from navigation, restored browser state and callers.
// Inherited object properties are not translation dictionaries; never emit
// \"undefined\" accessibility labels for a prototype-named locale.
function copyForLocale(lang) {
  return typeof lang === 'string' && Object.hasOwn(COPY, lang) ? COPY[lang] : COPY.uk;
}

// The canonical edition list is an authority for local file paths and
// publisher identity. Never execute inherited/accessor-backed edition fields
// while creating controls or admitting a comparison. A malformed imported
// record must not cause getBook to read a dynamic folder/contentId getter.
function ownEditionData(edition, key) {
  if (!edition || typeof edition !== 'object' || Array.isArray(edition)) return undefined;
  const descriptor=Object.getOwnPropertyDescriptor(edition,key);
  return descriptor && Object.hasOwn(descriptor,'value') ? descriptor.value : undefined;
}
// Imported edition lists are publisher/path authorities too. Array getters and
// inherited slots must not execute during selector rendering or file admission.
// Keep a bounded list so malformed sparse manifests cannot monopolize the UI.
function ownEditionItems(editions) {
  if (!Array.isArray(editions) || editions.length > 1024) return [];
  const items=[];
  for (let i=0; i<editions.length; i++) {
    const descriptor=Object.getOwnPropertyDescriptor(editions,String(i));
    if (descriptor && Object.hasOwn(descriptor,'value')) items.push(descriptor.value);
  }
  return items;
}
// Edition selector identities and visible labels are publisher authority too.
// Reject blank, invisible, bidi-controlled or unbounded imported identifiers
// before they can become ambiguous options or select a source/rights record.
function validEditionId(id) {
  return validEditionRightsText(id,128) && Boolean(id.trim()) &&
    !/\s/u.test(id) && id.trim()===id;
}
function validEditionOptionTitle(title) {
  return validEditionRightsText(title,512) && Boolean(title.trim());
}
// A select value is a publisher/file identity, not an array position. If two
// records declare the same ID, the visible option label cannot identify which
// local text and rights record would be used. Refuse both instead of picking
// whichever one happens to appear first in an imported manifest.
function editionIdCounts(items) {
  const counts=new Map();
  for (const edition of items) {
    const id=ownEditionData(edition,'id');
    if (validEditionId(id))
      counts.set(id,(counts.get(id) || 0)+1);
  }
  return counts;
}
function verifiedLocalEdition(edition, id) {
  if (!edition || typeof edition !== 'object' || Array.isArray(edition)) return false;
  for (const key of ['id','local','folder','contentId']) {
    const descriptor=Object.getOwnPropertyDescriptor(edition,key);
    if ((descriptor && !Object.hasOwn(descriptor,'value')) ||
        (!descriptor && key in edition)) return false;
  }
  return validEditionId(id) && ownEditionData(edition,'id')===id && ownEditionData(edition,'local')===true;
}

export function parallelControls(editions, lang, esc) {
  const copy = copyForLocale(lang);
  const items=ownEditionItems(editions);
  const idCounts=editionIdCounts(items);
  return `<details class="card parallel-reader"><summary>${copy.title}</summary><p>${copy.note}</p><form class="parallel-form"><label class="account-field"><span>${copy.choose}</span><select name="edition">${items.map(edition=>{
    const id=ownEditionData(edition,'id'), title=ownEditionData(edition,'title');
    return validEditionId(id) && idCounts.get(id)===1 && validEditionOptionTitle(title)
      ? `<option value="${esc(id)}">${esc(title)}</option>` : '';
  }).join('')}</select></label><button class="button" type="submit">${copy.open}</button><p class="parallel-status" role="status"></p></form><div class="parallel-result"></div></details>`;
}

// The same chapter guard as the reader runs again before loading another text.
// Detached panels and a changed reader context cannot be repopulated by a late response.
export function mountParallelReader(panel, { editions, catalog, lang, book, bookTitle, chapter, getBook, check, current, lock, failClosed, esc, copyText = text => navigator.clipboard.writeText(text) }) {
  const copy = copyForLocale(lang);
  const form=panel.querySelector('.parallel-form'), status=panel.querySelector('.parallel-status'), result=panel.querySelector('.parallel-result');
  let selectionRevision = 0;
  let requestRevision = 0;
  const submitButton = form.querySelector('button');
  // The licensed text must not remain visible under a different selected edition.
  // Also retire an in-flight A -> B -> A request, which an ID-only check misses.
  form.onchange = event => {
    if (event?.target?.name !== 'edition') return;
    selectionRevision += 1;
    // A stale network read may never settle; release its UI lease at selection time.
    requestRevision += 1;
    submitButton.disabled = false;
    citation = null;
    result.replaceChildren();
    status.textContent = copy.changed;
  };
  let citation = null;
  form.onsubmit=async event=>{
    event.preventDefault();
    const button=submitButton, id=String(new FormData(form).get('edition') || '');
    let edition=null;
    try {
      const items=ownEditionItems(editions);
      if (validEditionId(id) && editionIdCounts(items).get(id)===1)
        edition=items.find(item=>verifiedLocalEdition(item,id)) || null;
    } catch { /* Malformed edition descriptors are never selection authority. */ }
    // A manifest can change without firing a native select event while the
    // chapter and assessment checks are pending. Keep the exact source/path
    // identity that was admitted, not just the select's unchanged string ID.
    const editionSnapshot=edition ? ['folder','contentId','title'].map(key=>ownEditionData(edition,key)) : null;
    const editionStillCurrent=()=>{
      if (!editionSnapshot) return false;
      try {
        const items=ownEditionItems(editions);
        return items.includes(edition) && editionIdCounts(items).get(id)===1 &&
          verifiedLocalEdition(edition,id) &&
          ['folder','contentId','title'].every((key,index)=>
            ownEditionData(edition,key)===editionSnapshot[index]);
      } catch { return false; }
    };
    const submittedRevision = selectionRevision;
    const selectionCurrent = () => selectionRevision === submittedRevision &&
      String(new FormData(form).get('edition') || '') === id;
    if (button.disabled || !current() || !panel.isConnected) return;
    if (!edition) {
      // A malformed programmatic selection may not fire onchange. Retire
      // previously licensed text rather than leaving it under a bad edition.
      requestRevision += 1;
      citation=null;
      result.replaceChildren();
      status.textContent=copy.fail;
      return;
    }
    const requestId = ++requestRevision;
    const requestCurrent = () => requestRevision === requestId && selectionCurrent();
    // A programmatic selection change need not emit onchange; preserve retry text.
    const announceUnsignalledChange = () => {
      if (requestRevision === requestId && !selectionCurrent() && panel.isConnected && current())
        status.textContent = copy.changed;
    };
    // Disabling a focused submit button moves keyboard focus to BODY in
    // Chromium. Restore only after this same reader finishes and only when
    // nobody has focused another control in the meantime.
    const hadSubmitFocus = typeof document !== 'undefined' &&
      document.activeElement === button;
    button.disabled=true; status.textContent=copy.loading; citation=null; result.replaceChildren();
    try {
      let guard;
      try { guard=await check(book,chapter); }
      catch {
        if (panel.isConnected && current() && requestCurrent()) failClosed();
        else announceUnsignalledChange();
        return;
      }
      if (!panel.isConnected || !current() || !requestCurrent()) { announceUnsignalledChange(); return; }
      if (!guard || typeof guard.invalidated !== 'boolean') { failClosed(); return; }
      if (guard.invalidated) { lock(); return; }
      // A changed native select must retire this request, even for the same reader/principal.
      if (!requestCurrent()) { announceUnsignalledChange(); return; }
      if (!editionStillCurrent()) throw Error('edition identity changed before chapter fetch');
      const data=await getBook(book,edition);
      // A change signalled by onchange fully retires the request. An
      // unannounced programmatic selection change preserves the historical
      // final chapter authorization check before suppressing the old text.
      if (!panel.isConnected || !current() || requestRevision !== requestId) return;
      // Another tab or device may start an attempt while the second text loads.
      // Revalidate after that await and before exposing the comparison text.
      let finalGuard;
      try { finalGuard=await check(book,chapter); }
      catch {
        if (panel.isConnected && current() && requestCurrent()) failClosed();
        else announceUnsignalledChange();
        return;
      }
      if (!panel.isConnected || !current() || !requestCurrent()) { announceUnsignalledChange(); return; }
      if (!finalGuard || typeof finalGuard.invalidated !== 'boolean') { failClosed(); return; }
      if (finalGuard.invalidated) { lock(); return; }
      if (!editionStillCurrent()) throw Error('edition identity changed during chapter fetch');
      // Never show edition A's licensed verses under edition B's selected label.
      if (!requestCurrent()) { announceUnsignalledChange(); return; }
      // Imported chapter containers and slots are publisher content too.
      // Do not execute a getter or inherit another edition's chapter.
      const chaptersDescriptor=data && typeof data==='object' && !Array.isArray(data)
        ? Object.getOwnPropertyDescriptor(data,'chapters') : null;
      if (!chaptersDescriptor || !Object.hasOwn(chaptersDescriptor,'value') ||
          !Array.isArray(chaptersDescriptor.value))
        throw Error('invalid edition chapters record');
      const chapterDescriptor=Object.getOwnPropertyDescriptor(chaptersDescriptor.value,String(chapter-1));
      if (chapterDescriptor && !Object.hasOwn(chapterDescriptor,'value'))
        throw Error('invalid edition chapter accessor');
      const verses=chapterDescriptor?.value;
      if (!Array.isArray(verses)) { status.textContent=copy.unavailable; return; }
      // A corrupt or empty chapter must never be presented as verified Scripture.
      // An indexed loop also rejects sparse arrays (Array#every skips their holes).
      // A damaged imported chapter must not materialize an unbounded number
      // of buttons/text nodes or huge private clipboard-ready strings. Psalm
      // 119 has 176 verses; these bounds leave room for edition differences.
      // Validate before creating ANY verse DOM or citation snapshot.
      if (verses.length===0 || verses.length>256) throw Error('invalid edition chapter size');
      // Imported chapter arrays are untrusted source records. An inherited
      // verse slot or getter can pass validation and later return a different
      // string to the DOM/citation. Read each own data descriptor exactly once,
      // then render and cite only the validated immutable string snapshot.
      let chapterCharacters=0;
      const verifiedVerses=[];
      for (let i=0; i<verses.length; i++) {
        const descriptor=Object.getOwnPropertyDescriptor(verses,String(i));
        if (!descriptor || !Object.hasOwn(descriptor,'value') ||
            typeof descriptor.value!=='string' || !descriptor.value.trim())
          throw Error('invalid edition verse record');
        const verse=descriptor.value;
        chapterCharacters+=verse.length;
        if (chapterCharacters>131072) throw Error('oversized edition chapter');
        verifiedVerses.push(verse);
      }
      // Never attribute a new/unrecognized local edition to the primary one.
      // Source claims are authoritative only when owned by the catalog and
      // its named edition/translation map. An inherited locale or map could
      // silently attach another publisher's rights to genuine loaded verses.
      // Catalog dictionaries and their slots are also publisher authorities.
      // An own getter at either level is not immutable authored provenance;
      // reading it could execute code or substitute another edition's rights.
      // Inspect descriptors without invoking accessors, as for edition IDs.
      const ownData = (record,key) => {
        if (!record || typeof record !== 'object' || Array.isArray(record)) return null;
        const descriptor=Object.getOwnPropertyDescriptor(record,key);
        return descriptor && Object.hasOwn(descriptor,'value') ? descriptor.value : null;
      };
      const ownMap = key => {
        const descriptor=catalog && typeof catalog === 'object' && !Array.isArray(catalog)
          ? Object.getOwnPropertyDescriptor(catalog,key) : null;
        // A declared but accessor-backed translation map cannot silently
        // downgrade to the fallback edition's licence.
        if (descriptor && !Object.hasOwn(descriptor,'value'))
          throw Error('unsafe edition provenance map');
        const value=descriptor?.value;
        return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
      };
      const editionMap=ownMap('editions');
      const translationMap=ownMap('translations');
      const fallback=ownData(editionMap,lang);
      const declared=Boolean(translationMap && Object.hasOwn(translationMap,id));
      const translation=declared ? ownData(translationMap,id) : null;
      // A declared but mismatched identity must not borrow another edition's
      // licence and attribute that edition's loaded verses to a false source.
      // A matching edition ID is part of publisher provenance, not a mere
      // lookup convenience. Inherited IDs and getters can make another
      // edition's otherwise well-formed rights record authorize these verses.
      // Inspect the own data descriptor without executing identity accessors.
      const ownsVerifiedId = (record, expected) => {
        if (!record || typeof record !== 'object' || Array.isArray(record)) return false;
        const descriptor=Object.getOwnPropertyDescriptor(record,'id');
        return Boolean(descriptor && Object.hasOwn(descriptor,'value') &&
          descriptor.value === expected);
      };
      const metadata=declared ? (ownsVerifiedId(translation,id) ? translation : null)
        : (ownEditionData(edition,'contentId') && ownsVerifiedId(fallback,ownEditionData(edition,'contentId')) ? fallback : null);
      // Keep a comparison inaccessible if its own source or terms are missing.
      // Never borrow rights metadata from another Bible edition.
      // Damaged or hostile manifests must not turn one comparison into an
      // unbounded DOM/clipboard payload. Keep the real edition's own rights;
      // never truncate authored provenance into a misleading citation.
      if (!validEditionRightsMetadata(metadata))
        throw Error('missing or unsafe edition provenance');
      // Publisher rights can change after a comparison is rendered without a
      // select change. A citation must still be authorized by the exact same
      // catalog map, edition record and own-data rights fields after its guard.
      const rightsKeys=['id','title','license','source','attribution','licenseUrl'];
      const rightsSnapshot=rightsKeys.map(key=>ownData(metadata,key));
      const rightsStillCurrent=()=>{
        try {
          const latestEditions=ownMap('editions');
          const latestTranslations=ownMap('translations');
          if (latestEditions!==editionMap || latestTranslations!==translationMap ||
              Boolean(latestTranslations && Object.hasOwn(latestTranslations,id))!==declared)
            return false;
          const latest=declared ? ownData(latestTranslations,id) : ownData(latestEditions,lang);
          return latest===metadata &&
            ownsVerifiedId(metadata,declared ? id : ownEditionData(edition,'contentId')) &&
            validEditionRightsMetadata(metadata) &&
            rightsKeys.every((key,index)=>ownData(metadata,key)===rightsSnapshot[index]);
        } catch { return false; }
      };
      const source=https(metadata.source);
      const license=metadata.licenseUrl==null?'':https(metadata.licenseUrl);
      result.innerHTML=`<section aria-labelledby="parallel-title"><h3 id="parallel-title">${esc(metadata.title)} — ${esc(bookTitle)} ${chapter}</h3><p>${copy.note}</p><p>${copy.license}: ${esc(metadata.license || '—')}</p>${metadata.attribution?`<p>${esc(metadata.attribution)}</p>`:''}${source?`<p><a href="${esc(source)}" target="_blank" rel="noreferrer">${copy.source}</a></p>`:''}${license?`<p><a href="${esc(license)}" target="_blank" rel="noreferrer">${copy.license}</a></p>`:''}<ol>${verifiedVerses.map((verse,index)=>`<li><span>${esc(verse)}</span> <button type="button" class="parallel-cite" data-parallel-cite="${index+1}" aria-label="${esc(copy.cite)}: ${esc(bookTitle)} ${chapter}:${index+1}">${esc(copy.cite)}</button></li>`).join('')}</ol></section>`;
      citation={ editionId:id, editionStillCurrent, rightsStillCurrent, title:metadata.title, license:metadata.license, attribution:typeof metadata.attribution==='string'?metadata.attribution:'', source, licenseUrl:license, verses:verifiedVerses.slice() };
      status.textContent=copy.ready;
    } catch {
      if (panel.isConnected && current() && requestCurrent()) status.textContent=copy.fail;
      else announceUnsignalledChange();
    }
    finally {
      if (requestRevision === requestId) button.disabled=false;
      if (requestRevision === requestId && hadSubmitFocus && panel.isConnected && typeof document !== 'undefined' &&
          document.activeElement === document.body && typeof button.focus === 'function') {
        try { if (current()) button.focus({preventScroll:true}); }
        catch { /* A torn-down reader must never steal focus on recovery. */ }
      }
    }
  };
  // Copy only the validated *second* edition's verses and their own rights
  // metadata; never borrow the primary edition's license or source.
  result.onclick=async event => {
    const button=event.target?.closest?.('button[data-parallel-cite]');
    if (!button || !citation || button.disabled || !panel.isConnected || !current()) return;
    const record=citation, raw=button.dataset.parallelCite;
    if (!/^[1-9][0-9]*$/.test(raw || '')) return;
    const verseNumber=Number(raw);
    if (!Number.isSafeInteger(verseNumber) || verseNumber>record.verses.length) return;
    const selected=()=>String(new FormData(form).get('edition') || '')===record.editionId;
    // Programmatic changes to a native select do not dispatch change events.
    // A stale citation must not remain visible or clipboard-ready under a
    // different selected publisher, even when the user only clicks Cite.
    const retireUnsignalledSelection = () => {
      if (panel.isConnected && current() && citation===record && !selected()) {
        citation=null;
        result.replaceChildren();
        status.textContent=copy.changed;
      }
    };
    if (!selected()) { retireUnsignalledSelection(); return; }
    if (!record.editionStillCurrent() || !record.rightsStillCurrent()) {
      citation=null; result.replaceChildren(); status.textContent=copy.changed; return;
    }
    // Recheck active assessments immediately before a clipboard disclosure.
    let guard;
    try { guard=await check(book,chapter); }
    catch {
      if (panel.isConnected && current() && citation===record) {
        // A rejected guard must also retire an unannounced publisher change.
        // Otherwise the old chapter remains visible after the failed check.
        if (!selected()) retireUnsignalledSelection();
        else failClosed();
      }
      return;
    }
    if (!panel.isConnected || !current() || citation!==record || !selected()) {
      retireUnsignalledSelection();
      return;
    }
    if (!guard || typeof guard.invalidated!=='boolean') { failClosed(); return; }
    if (guard.invalidated) { lock(); return; }
    if (!record.editionStillCurrent() || !record.rightsStillCurrent()) {
      citation=null; result.replaceChildren(); status.textContent=copy.changed; return;
    }
    const citationText=[
      `${bookTitle} ${chapter}:${verseNumber}. ${record.verses[verseNumber-1]}`,
      `${record.title} · ${record.license}`,
      record.attribution, record.source, record.licenseUrl,
    ].filter(Boolean).join('\n');
    try {
      await copyText(citationText);
      if (panel.isConnected && current() && citation===record && selected())
        status.textContent=copy.cited;
    } catch {
      if (panel.isConnected && current() && citation===record && selected())
        status.textContent=copy.citeFail;
    }
  };
}
