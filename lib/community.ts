export const COMMUNITY_RUN_ID = "scripture-community-2026";
export const COMMUNITY_TARGET = 2700;

export function communityWavePlan(activatedAt: Date) {
  // Preserve the gaps from the original 02:55 / 08:00 / 15:00 plan, but anchor
  // them to actual activation. Nothing is dated before that activation.
  return [
    { key: "initial", count: 100, offsetMinutes: 0, pattern: "[180]" },
    { key: "morning", count: 200, offsetMinutes: 305, pattern: "[120,240,360]" },
    { key: "afternoon", count: 300, offsetMinutes: 725, pattern: "[120,180,240]" },
    { key: "continuous", count: 2100, offsetMinutes: 1268, pattern: "adaptive" },
  ].map(wave => ({ ...wave, startsAt: sqlDate(new Date(activatedAt.getTime() + wave.offsetMinutes * 60_000)) }));
}

type NameSet = { first: readonly string[]; last: readonly string[]; locale: "uk" | "sk" | "en"; country: string };

const UK_FIRST = [
  "Олександр", "Олена", "Андрій", "Марія", "Іван", "Наталія", "Михайло", "Ірина", "Тарас", "Катерина",
  "Василь", "Софія", "Богдан", "Христина", "Дмитро", "Анна", "Роман", "Юлія", "Петро", "Тетяна",
  "Максим", "Оксана", "Володимир", "Людмила", "Юрій", "Вікторія", "Степан", "Дарина", "Микола", "Надія",
  "Любомир", "Соломія", "Святослав", "Зоряна", "Остап", "Марта", "Ярослав", "Леся", "Маркіян", "Уляна",
  "Северин", "Квітослава", "Яромир", "Зореслава", "Орися", "Лук’ян", "Меланія", "Тихон", "Агата", "Зеновій",
] as const;
const UK_LAST = [
  "Шевченко", "Коваль", "Бондаренко", "Мельник", "Ткаченко", "Кравченко", "Олійник", "Бойко", "Савчук", "Поліщук",
  "Козак", "Мороз", "Левченко", "Романюк", "Петренко", "Клименко", "Гриценко", "Павлюк", "Марченко", "Кучер",
  "Данилюк", "Сидоренко", "Яремчук", "Василенко", "Литвин", "Дорошенко", "Гнатюк", "Захарченко", "Костюк", "Черненко",
  "Федорук", "Нечипоренко", "Мазур", "Кириленко", "Гаврилюк", "Демчук", "Руденко", "Семенюк", "Ковальчук", "Остапенко",
] as const;
const SK_FIRST = [
  "Martin", "Zuzana", "Peter", "Lucia", "Tomáš", "Katarína", "Ján", "Mária", "Marek", "Veronika",
  "Michal", "Barbora", "Štefan", "Jana", "Juraj", "Alžbeta", "Matúš", "Dominika", "Rastislav", "Ľubica",
  "Bohuš", "Želmíra", "Ctibor", "Dobromila", "Svätopluk", "Kvetoslava",
] as const;
const SK_LAST = [
  "Novák", "Kováč", "Horváth", "Varga", "Tóth", "Nagy", "Baláž", "Molnár", "Szabó", "Hudák",
  "Kollár", "Polák", "Kučera", "Šimko", "Urban", "Bartoš", "Kováčik", "Benko", "Majerník", "Černák",
] as const;
const EN_FIRST = [
  "James", "Mary", "John", "Sarah", "Daniel", "Rachel", "Samuel", "Grace", "Thomas", "Emily",
  "George", "Hannah", "David", "Rebecca", "Oliver", "Charlotte", "Nathan", "Alice", "Edmund", "Dorothy",
] as const;
const EN_LAST = [
  "Smith", "Taylor", "Brown", "Wilson", "Davies", "Evans", "Thomas", "Roberts", "Johnson", "Walker",
  "Wright", "Thompson", "White", "Hughes", "Edwards", "Green", "Lewis", "Baker", "Hall", "Wood",
] as const;

const SETS: readonly NameSet[] = [
  { first: UK_FIRST, last: UK_LAST, locale: "uk", country: "UA" },
  { first: SK_FIRST, last: SK_LAST, locale: "sk", country: "SK" },
  { first: EN_FIRST, last: EN_LAST, locale: "en", country: "GB" },
];

export function stableNumber(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function identityFor(sequence: number) {
  const seed = stableNumber(`${COMMUNITY_RUN_ID}:${sequence}`);
  const languageRoll = seed % 100;
  const set = languageRoll < 72 ? SETS[0] : languageRoll < 88 ? SETS[1] : SETS[2];
  // Intentional repeats mirror real communities; every 47th entry reuses an earlier combination.
  const nameSeed = sequence > 47 && sequence % 47 === 0 ? stableNumber(`${COMMUNITY_RUN_ID}:${sequence - 47}`) : seed;
  const firstName = set.first[nameSeed % set.first.length];
  const lastName = set.last[Math.floor(nameSeed / 97) % set.last.length];
  const personaRoll = Math.floor(seed / 17) % 100;
  const persona = personaRoll < 30 ? "rare" : personaRoll < 70 ? "moderate" : personaRoll < 95 ? "regular" : "active";
  return { firstName, lastName, locale: set.locale, countryCode: set.country, persona, seed };
}

export function intervalSeconds(pattern: string, patternIndex: number, nextAt: string) {
  if (pattern === "adaptive") {
    const date = new Date(`${nextAt.replace(" ", "T")}Z`);
    const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Warsaw", hour: "2-digit", hour12: false }).format(date));
    const choices = hour >= 1 && hour < 9 ? [480, 720, 900] : [120, 180, 240, 360];
    return choices[patternIndex % choices.length];
  }
  const choices = JSON.parse(pattern) as number[];
  return choices[patternIndex % choices.length] || 180;
}

export function warsawMoment(reference: Date, hour: number, minute = 0, dayOffset = 0) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(reference).filter(part => part.type !== "literal").map(part => [part.type, part.value]));
  const tentative = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) + dayOffset, hour, minute));
  const zoneName = new Intl.DateTimeFormat("en", { timeZone: "Europe/Warsaw", timeZoneName: "longOffset" })
    .formatToParts(tentative).find(part => part.type === "timeZoneName")?.value || "GMT+01:00";
  const match = zoneName.match(/GMT([+-])(\d{2}):(\d{2})/);
  const offset = match ? (match[1] === "+" ? 1 : -1) * (Number(match[2]) * 60 + Number(match[3])) : 60;
  return new Date(tentative.getTime() - offset * 60_000);
}

export function sqlDate(date: Date) { return date.toISOString().slice(0, 19).replace("T", " "); }
