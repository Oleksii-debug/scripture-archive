const COPY = {
  uk: { title: 'Програма занять', help: 'До 30 занять. Указуйте місцевий час у часовому поясі організатора. Для заняття після опівночі додайте окремий запис наступної дати.', zone: 'Часовий пояс програми', zoneHelp: 'Наприклад: Europe/Kyiv, Europe/Bratislava або UTC. Усі години нижче належать цьому поясу.', session: 'Заняття', date: 'Дата', start: 'Початок', end: 'Завершення', name: 'Назва заняття', details: 'Опис і доступність (необов’язково)', add: 'Додати заняття', remove: 'Видалити заняття', count: n => `Занять у програмі: ${n}.`, limit: 'Досягнуто межі 30 занять.', local: 'Місцевий час організатора' },
  ru: { title: 'Программа занятий', help: 'До 30 занятий. Указывайте местное время в часовом поясе организатора. Для занятия после полуночи добавьте отдельную запись следующей даты.', zone: 'Часовой пояс программы', zoneHelp: 'Например: Europe/Kyiv, Europe/Bratislava или UTC. Все часы ниже относятся к этому поясу.', session: 'Занятие', date: 'Дата', start: 'Начало', end: 'Окончание', name: 'Название занятия', details: 'Описание и доступность (необязательно)', add: 'Добавить занятие', remove: 'Удалить занятие', count: n => `Занятий в программе: ${n}.`, limit: 'Достигнут предел 30 занятий.', local: 'Местное время организатора' },
  en: { title: 'Session programme', help: 'Up to 30 sessions. Enter local times in the organizer’s time zone. For a session after midnight, add a separate entry on the next date.', zone: 'Programme time zone', zoneHelp: 'For example: Europe/Kyiv, Europe/Bratislava or UTC. All times below use this zone.', session: 'Session', date: 'Date', start: 'Start', end: 'End', name: 'Session title', details: 'Description and accessibility (optional)', add: 'Add session', remove: 'Remove session', count: n => `Sessions in the programme: ${n}.`, limit: 'The limit of 30 sessions has been reached.', local: 'Organizer’s local time' },
};
const copy = lang => Object.hasOwn(COPY, lang) ? COPY[lang] : COPY.uk;
const fields = ['date', 'startsAt', 'endsAt', 'title', 'details'];

export function programmeMarkup(item, lang, esc) {
  if (!item.programme?.length) return '';
  const w = copy(lang);
  return `<section class="event-programme"><h4>${esc(w.title)}</h4><p>${esc(w.local)}: ${esc(item.timeZone)}</p><ol>${item.programme.map(entry => `<li><h5 lang="${esc(item.locale)}">${esc(entry.title)}</h5><p><time datetime="${esc(entry.date)}">${esc(entry.date)}</time> · <time>${esc(entry.startsAt)}</time>–<time>${esc(entry.endsAt)}</time></p>${entry.details ? `<p lang="${esc(item.locale)}">${esc(entry.details)}</p>` : ''}</li>`).join('')}</ol></section>`;
}

export function programmeEditorMarkup(lang, esc) {
  const w = copy(lang);
  return `<fieldset class="event-programme-editor"><legend>${esc(w.title)}</legend><p>${esc(w.help)}</p><label class="account-field"><span>${esc(w.zone)}</span><input name="timeZone" maxlength="80" aria-describedby="event-programme-zone-help" placeholder="Europe/Kyiv"></label><p id="event-programme-zone-help">${esc(w.zoneHelp)}</p><div class="event-programme-rows"></div><button class="button event-programme-add" type="button">${esc(w.add)}</button><p class="event-programme-status" role="status"></p></fieldset>`;
}

export function mountProgrammeEditor(form, lang, esc, active) {
  const w = copy(lang), container = form.querySelector('.event-programme-rows'),
    add = form.querySelector('.event-programme-add'), status = form.querySelector('.event-programme-status'),
    zone = form.querySelector('[name="timeZone"]');
  const read = () => ({
    programme: Array.from(container?.querySelectorAll('.event-programme-row') || [], row =>
      Object.fromEntries(fields.map(field => [field, row.querySelector(`[data-field="${field}"]`).value]))),
    timeZone: zone?.value || '',
  });
  function render(entries) {
    if (!container || !active()) return;
    container.innerHTML = entries.map((entry, index) => {
      const input = (field, title, type, attributes = '') => `<label class="account-field"><span>${esc(title)}</span><input data-field="${field}" type="${type}" value="${esc(entry[field] || '')}" ${attributes} required></label>`;
      return `<fieldset class="event-programme-row"><legend>${esc(w.session)} ${index + 1}</legend>${input('date',w.date,'date')}${input('startsAt',w.start,'time')}${input('endsAt',w.end,'time')}${input('title',w.name,'text','minlength="3" maxlength="160"')}<label class="account-field"><span>${esc(w.details)}</span><textarea data-field="details" maxlength="500">${esc(entry.details || '')}</textarea></label><button class="button event-programme-remove" type="button" data-index="${index}">${esc(w.remove)} ${index + 1}</button></fieldset>`;
    }).join('');
    if (zone) zone.required = entries.length > 0;
    container.querySelectorAll('.event-programme-remove').forEach(button => {
      button.onclick = () => {
        if (!active()) return;
        const current = read().programme, index = Number(button.dataset.index);
        current.splice(index, 1);
        render(current);
        if (!current.length && zone) zone.value = '';
        const next = container.querySelectorAll('.event-programme-row')[Math.min(index, current.length - 1)];
        (next?.querySelector('input') || add)?.focus();
        if (status) status.textContent = w.count(current.length);
      };
    });
  }
  if (add) add.onclick = () => {
    if (!active()) return;
    const current = read().programme;
    if (current.length >= 30) { if (status) status.textContent = w.limit; return; }
    current.push({date: form.elements.startsOn?.value || '', startsAt:'', endsAt:'', title:'', details:''});
    render(current);
    container.querySelectorAll('.event-programme-row')[current.length - 1]?.querySelector('input')?.focus();
    if (status) status.textContent = w.count(current.length);
  };
  return { read, fill(item) {
    if (!active()) return;
    render(item.programme || []);
    if (zone) zone.value = item.timeZone || '';
    if (status) status.textContent = '';
  } };
}
