// Shared canonical Gregorian timestamp validator for bookmark navigation and owner exports.
// Preserve accepted legacy date-only, D1 UTC and ISO UTC forms; fail closed damaged rows.
/** @param {unknown} value @returns {value is string} */
export function validBookmarkTimestamp(value) {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z)?)?$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  if (year < 1000 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const canonical = new Date(Date.UTC(year, month - 1, day));
  if (canonical.getUTCFullYear() !== year || canonical.getUTCMonth() + 1 !== month || canonical.getUTCDate() !== day) return false;
  return match[4] === undefined || (Number(match[4]) < 24 && Number(match[5]) < 60 && Number(match[6]) < 60);
}
