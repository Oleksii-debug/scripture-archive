export const EDITIONS = {
  uk:[
    {id:'uk-ohiienko',title:'Іван Огієнко',local:true,folder:'uk-ohiienko',source:'https://uk.wikisource.org/wiki/Біблія_(Огієнко)'},
    {id:'uk-kulish',contentId:'UKRPAN',title:'Пантелеймон Куліш, Іван Пулюй, Іван Нечуй-Левицький — історичний правопис',note:'Оригінальний текст видання збережено без осучаснення правопису.',local:true,folder:'uk',source:'https://ebible.org/find/details.php?id=ukr1871'},
    {id:'uk-khomenko',title:'Іван Хоменко',source:'https://pdf.ugcc.ua/library/bible/'},
    {id:'uk-turkoniak',title:'Рафаїл Турконяк',version:1755,source:'https://www.bible.com/uk/versions/1755'},
  ],
  ru:[
    {id:'ru-synodal',contentId:'RUSSYN',title:'Синодальный перевод',local:true,source:'https://ebible.org/find/details.php?id=russyn'},
    {id:'ru-nrt',title:'Новый русский перевод',version:143,source:'https://www.bible.com/ru/versions/143'},
    {id:'ru-rsp',title:'Святая Библия: Современный перевод',version:201,source:'https://www.bible.com/ru/versions/201'},
    {id:'ru-kulakov',title:'Перевод под редакцией М. П. и М. М. Кулаковых',version:313,source:'https://www.bible.com/ru/versions/313'},
  ],
  en:[
    {id:'en-web',contentId:'ENGWEBU',title:'World English Bible Updated',local:true,source:'https://ebible.org/find/details.php?id=engwebu'},
    {id:'en-kjv',title:'King James Version',gateway:'KJV',source:'https://www.biblegateway.com/versions/King-James-Version-KJV-Bible/'},
    {id:'en-niv',title:'New International Version',version:111,source:'https://www.bible.com/en-GB/versions/111'},
    {id:'en-esv',title:'English Standard Version',esv:true,source:'https://www.esv.org/'},
  ]
};
export const editionCopy={uk:{choose:'Переклад Біблії',external:'Читати у видавця',externalNote:'Це видання відкривається на сайті видавця. Ваш вибір зберігається для наступного читання.',current:'Читати на платформі',whole:'Старий і Новий Завіти'},ru:{choose:'Перевод Библии',external:'Читать у издателя',externalNote:'Это издание открывается на сайте издателя. Ваш выбор сохранится для следующего чтения.',current:'Читать на платформе',whole:'Ветхий и Новый Заветы'},en:{choose:'Bible translation',external:'Read with the publisher',externalNote:'This edition opens on the publisher’s website. Your choice is saved for your next reading session.',current:'Read on the platform',whole:'Old and New Testaments'}};
// Only real edition keys may select a language. Inherited Object.prototype
// names (for example "__proto__" or "constructor") are not locale lists.
function editionList(lang) {
  return typeof lang === 'string' && Object.hasOwn(EDITIONS, lang) ? EDITIONS[lang] : EDITIONS.uk;
}

// A browser can deny preference persistence while the local Bible stays readable.
// Keep the selected *canonical* edition in this tab, without pretending it was saved.
const currentTabEditions = new Map();
export function setEditionForTab(lang, id) {
  const found = typeof lang === 'string' && Object.hasOwn(EDITIONS, lang)
    ? EDITIONS[lang].find(edition => edition.id === id) : null;
  if (!found) return null;
  currentTabEditions.set(lang, id);
  return found;
}
export function selectedEdition(lang){
  const list = editionList(lang);
  // A malformed locale must not inherit an unrelated stored preference.
  // Treat it as a fresh read-only Ukrainian fallback, never as an edition key.
  if (typeof lang !== 'string' || !Object.hasOwn(EDITIONS, lang)) return list[0];
  const current = currentTabEditions.get(lang);
  if (current) return list.find(edition => edition.id === current) || list[0];
  // Blocked browser storage must never prevent reading local Bible content.
  let chosen = null;
  try { chosen = localStorage.getItem(`sa.edition.${lang}`); }
  catch { return list[0]; }
  return list.find(edition => edition.id === chosen) || list[0];
}
export function editionUrl(edition,code,chapter){if(edition.version)return `https://www.bible.com/bible/${edition.version}/${code}.${chapter}`;if(edition.esv)return `https://www.esv.org/${code}+${chapter}/`;if(edition.gateway)return `https://www.biblegateway.com/passage/?search=${encodeURIComponent(code+' '+chapter)}&version=${edition.gateway}`;return edition.source}
export function editionSelect(lang,esc,selected=selectedEdition(lang)){
  const list = editionList(lang);
  const copy = typeof lang === 'string' && Object.hasOwn(editionCopy, lang)
    ? editionCopy[lang] : editionCopy.uk;
  return `<label class="field grow"><span>${copy.choose}</span><select id="bible-edition">${list.map(e => `<option value="${e.id}" ${e.id===selected.id?'selected':''}>${esc(e.title)}</option>`).join('')}</select></label>`;
}
