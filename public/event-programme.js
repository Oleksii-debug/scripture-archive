// Shared by the public form and Worker. Times are the organizer's local wall
// clock times in the named zone, not inferred from the visitor's browser zone.
const visible = (value, min, max) => typeof value === 'string' && value.trim() === value &&
  value.length >= min && value.length <= max &&
  !/[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}\u00a0\u034f\u115f\u1160\u2800\u3164\uffa0]/u.test(value);
const date = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + 'T00:00:00.000Z');
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
};
const time = value => typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);

export function validateProgramme(sessions, timeZone, startsOn, endsOn) {
  if (!Array.isArray(sessions) || sessions.length > 30 || !date(startsOn) || !date(endsOn) || endsOn < startsOn ||
      typeof timeZone !== 'string' || timeZone.length > 80) return null;
  if (!sessions.length) return timeZone === '' ? { sessions: [], timeZone: '' } : null;
  if (!visible(timeZone, 1, 80)) return null;
  try { new Intl.DateTimeFormat('en', { timeZone }).format(0); } catch { return null; }
  const result = [];
  for (const entry of sessions) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry) ||
        Object.keys(entry).some(key => !['date', 'startsAt', 'endsAt', 'title', 'details'].includes(key)) ||
        !date(entry.date) || entry.date < startsOn || entry.date > endsOn ||
        !time(entry.startsAt) || !time(entry.endsAt) || entry.endsAt <= entry.startsAt ||
        !visible(entry.title, 3, 160) || !visible(entry.details, 0, 500)) return null;
    result.push({ date: entry.date, startsAt: entry.startsAt, endsAt: entry.endsAt,
      title: entry.title, details: entry.details });
  }
  result.sort((a, b) => (a.date + a.startsAt).localeCompare(b.date + b.startsAt));
  return { sessions: result, timeZone };
}
