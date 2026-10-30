// SA-EXT-05: traceable, reader-linked biblical dossier graph.
// References are navigation pointers to the platform's existing edition catalog,
// not copied Bible text, external historical evidence, or licence assertions.
const LANGS = ['uk','ru','en'];
const COPY = {
  uk: {index:'Каталог досьє',sources:'Біблійні свідчення',relations:'Зв’язки з іншими досьє',questions:'Питання для дослідження',person:'Особа',place:'Місце',event:'Подія',read:'Відкрити джерело в читальні',narrative:'Зв’язок у біблійній оповіді',interpretive:'Тематичне зіставлення, не незалежний історичний доказ',scope:'Це навігаційне дослідження біблійних текстів, а не археологічний висновок. Порівнюйте переклади у читальні; права й походження конкретного видання наведені там.',selected:'Поточне досьє',invalid:'Дані джерел для цього досьє не перевірені. Перегляд тимчасово недоступний.',none:'Виберіть тему зі списку.',mission:'Перейти до місії Авраама'},
  ru: {index:'Каталог досье',sources:'Библейские свидетельства',relations:'Связи с другими досье',questions:'Вопросы для исследования',person:'Человек',place:'Место',event:'Событие',read:'Открыть источник в читальне',narrative:'Связь в библейском повествовании',interpretive:'Тематическое сопоставление, не независимое историческое доказательство',scope:'Это навигационное исследование библейских текстов, а не археологический вывод. Сравнивайте переводы в читальне; права и происхождение конкретного издания приведены там.',selected:'Текущее досье',invalid:'Данные источников этого досье не проверены. Просмотр временно недоступен.',none:'Выберите тему из списка.',mission:'Перейти к миссии Авраама'},
  en: {index:'Dossier catalogue',sources:'Scripture references',relations:'Connections to other dossiers',questions:'Study questions',person:'Person',place:'Place',event:'Event',read:'Open source in reader',narrative:'Connection in the biblical narrative',interpretive:'Thematic comparison, not independent historical proof',scope:'This navigates biblical texts; it does not assert independent archaeological proof. Compare editions in the reader, where individual source and licensing details are shown.',selected:'Current dossier',invalid:'The sources for this dossier could not be validated. Viewing is temporarily unavailable.',none:'Choose a topic from the list.',mission:'Open Abraham mission'},
};
const ref=(book,chapter,first,last,kind='narrative')=>({book,chapter,first,last,kind});
const nodes=[
 {id:'abraham',type:'person',names:{uk:'Авраам (Аврам)',ru:'Авраам (Аврам)',en:'Abraham (Abram)'},
  summaries:{uk:'Покликання Аврама та обітниці: зіставте оповідь книги Буття з пізнішими посиланнями.',ru:'Призвание Аврама и обещания: сопоставьте повествование Бытия с позднейшими упоминаниями.',en:'Abram’s call and promises: compare the Genesis narrative with later references.'},
  sources:[ref('GEN',12,1,3),ref('GEN',15,1,6),ref('ROM',4,1,3,'interpretive'),ref('HEB',11,8,12,'interpretive')],
  related:[{to:'sarah',via:ref('GEN',17,15,19)}],
  prompts:{uk:['Які обітниці наведено в Бутті 12?','Як Послання до євреїв переосмислює приклад Авраама?'],ru:['Какие обещания даны в Бытии 12?','Как Послание к Евреям осмысляет пример Авраама?'],en:['Which promises appear in Genesis 12?','How does Hebrews use Abraham as an example?']}},
 {id:'sarah',type:'person',names:{uk:'Сарра (Сара)',ru:'Сарра (Сара)',en:'Sarah (Sarai)'},
  summaries:{uk:'Оповіді про перейменування, обітницю та очікування народження сина.',ru:'Повествования о переименовании, обещании и ожидании рождения сына.',en:'Accounts of renaming, the promise, and the expectation of a son.'},
  sources:[ref('GEN',17,15,19),ref('GEN',18,10,15),ref('HEB',11,11,12,'interpretive')],
  related:[{to:'abraham',via:ref('GEN',17,15,19)}],
  prompts:{uk:['Які зміни імен названо в Бутті 17?','Як Буття 18 передає реакцію Сарри?'],ru:['Какие изменения имён названы в Бытии 17?','Как Бытие 18 описывает реакцию Сарры?'],en:['Which name changes occur in Genesis 17?','How does Genesis 18 portray Sarah’s reaction?']}},
 {id:'moses',type:'person',names:{uk:'Мойсей',ru:'Моисей',en:'Moses'},
  summaries:{uk:'Покликання Мойсея, розповідь про вихід і пізніші згадки про ці події.',ru:'Призвание Моисея, повествование об исходе и позднейшие упоминания.',en:'Moses’ call, the Exodus account, and later references to these events.'},
  sources:[ref('EXO',3,1,12),ref('DEU',34,1,11),ref('ACT',7,30,37,'interpretive'),ref('HEB',11,23,29,'interpretive')],
  related:[{to:'exodus',via:ref('EXO',12,29,42)}],
  prompts:{uk:['Що Мойсей запитує під час покликання?','Які події згадано в Посланні до євреїв 11?'],ru:['О чём спрашивает Моисей при призвании?','Какие события упомянуты в Евреям 11?'],en:['What does Moses ask at his calling?','Which events are recalled in Hebrews 11?']}},
 {id:'exodus',type:'event',names:{uk:'Вихід з Єгипту',ru:'Исход из Египта',en:'Exodus from Egypt'},
  summaries:{uk:'Тексти про вихід, перехід через море та їхні новозавітні зіставлення.',ru:'Тексты об исходе, переходе через море и их новозаветных сопоставлениях.',en:'Texts about the departure, crossing the sea, and later New Testament parallels.'},
  sources:[ref('EXO',12,29,42),ref('EXO',14,21,31),ref('1CO',10,1,4,'interpretive')],
  related:[{to:'moses',via:ref('EXO',14,21,31)}],
  prompts:{uk:['Чим відрізняються події у Виході 12 і 14?','Що порівнює Павло в 1 Коринтян 10?'],ru:['Чем отличаются события в Исходе 12 и 14?','Что сопоставляет Павел в 1 Коринфянам 10?'],en:['How do Exodus 12 and 14 differ?','What comparison does Paul make in 1 Corinthians 10?']}},
 {id:'jerusalem',type:'place',names:{uk:'Єрусалим',ru:'Иерусалим',en:'Jerusalem'},
  summaries:{uk:'Оповіді, пов’язані з містом у книгах Самуїла, Євангелії від Луки та Діяннях.',ru:'Повествования о городе в книгах Самуила, Евангелии от Луки и Деяниях.',en:'Narratives associated with the city in Samuel, Luke, and Acts.'},
  sources:[ref('2SA',5,6,10),ref('LUK',19,41,44),ref('ACT',1,12,14)],
  related:[{to:'david',via:ref('2SA',5,6,10)}],
  prompts:{uk:['Яку подію описує 2 Самуїла 5?','Як змінюється роль міста між цими уривками?'],ru:['Какое событие описывает 2 Царств 5?','Как меняется роль города между этими отрывками?'],en:['What does 2 Samuel 5 describe?','How does the city’s role differ between these passages?']}},
 {id:'david',type:'person',names:{uk:'Давид',ru:'Давид',en:'David'},
  summaries:{uk:'Покликання Давида й повідомлення про місто, пов’язане з його царюванням.',ru:'Призвание Давида и рассказы о городе, связанном с его царствованием.',en:'David’s calling and accounts of the city associated with his reign.'},
  sources:[ref('1SA',16,1,13),ref('2SA',5,1,10),ref('LUK',1,32,33,'interpretive')],
  related:[{to:'jerusalem',via:ref('2SA',5,6,10)}],
  prompts:{uk:['Що розповідає 1 Самуїла 16 про обрання Давида?','Як Лука 1 пов’язує своє повідомлення з Давидом?'],ru:['Что говорит 1 Царств 16 об избрании Давида?','Как Лука 1 связывает повествование с Давидом?'],en:['How does 1 Samuel 16 describe David’s selection?','How does Luke 1 reference David?']}},,

 {id:'joseph',type:'person',names:{uk:'Йосип (син Якова)',ru:'Иосиф (сын Иакова)',en:'Joseph (son of Jacob)'},
  summaries:{uk:'Оповідь про братів Йосипа, зустріч у Єгипті та пізніші згадки про його покоління.',ru:'Рассказ о братьях Иосифа, встрече в Египте и позднейших упоминаниях его поколения.',en:'The account of Joseph and his brothers, their meeting in Egypt, and later references to that generation.'},
  sources:[ref('GEN',37,3,11),ref('GEN',45,1,8),ref('GEN',50,19,21)],
  related:[{to:'exodus',via:ref('EXO',1,6,8)}],
  prompts:{uk:['Що розповідає Буття 37 про стосунки братів?','Якими словами Йосип пояснює події в Бутті 45?'],
    ru:['Что рассказывает Бытие 37 об отношениях братьев?','Какими словами Иосиф объясняет события в Бытии 45?'],
    en:['What does Genesis 37 show about the brothers?','How does Joseph explain the events in Genesis 45?']}},
 {id:'bethlehem',type:'place',names:{uk:'Вифлеєм',ru:'Вифлеем',en:'Bethlehem'},
  summaries:{uk:'Зіставлення згадок про Вифлеєм у книзі Михея та оповідях Євангелій.',ru:'Сопоставление упоминаний Вифлеема у Михея и в евангельских повествованиях.',en:'Compare references to Bethlehem in Micah and the Gospel narratives.'},
  sources:[ref('MIC',5,2,4,'interpretive'),ref('MAT',2,1,12),ref('LUK',2,1,7)],
  related:[{to:'jerusalem',via:ref('MAT',2,1,6)}],
  prompts:{uk:['Як у Михея 5 представлено Вифлеєм?','Що в Матвія 2 та Луки 2 сказано про це місце?'],
    ru:['Как в Михее 5 представлен Вифлеем?','Что о нём сказано в Матфея 2 и Луки 2?'],
    en:['How does Micah 5 describe Bethlehem?','What do Matthew 2 and Luke 2 say about this place?']}},
 {id:'nativity',type:'event',names:{uk:'Народження Ісуса',ru:'Рождение Иисуса',en:'Birth of Jesus'},
  summaries:{uk:'Порівняйте повідомлення Матвія та Луки про народження Ісуса та пов’язані події.',ru:'Сравните рассказы Матфея и Луки о рождении Иисуса и связанных событиях.',en:'Compare Matthew and Luke on the birth of Jesus and the events surrounding it.'},
  sources:[ref('MAT',1,18,25),ref('LUK',2,1,20),ref('MAT',2,1,12)],
  related:[{to:'bethlehem',via:ref('LUK',2,1,7)}],
  prompts:{uk:['Які події висвітлює Матвій 1?','Які подробиці додає Лука 2 та як вони відрізняються?'],
    ru:['Какие события описывает Матфей 1?','Что добавляет Лука 2 и чем его рассказ отличается?'],
    en:['Which events does Matthew 1 describe?','What details does Luke 2 add, and how do the accounts differ?']}},
];
export const scriptureDossiers=nodes;

export function validateDossierGraph(catalog) {
  const known = new Map(nodes.map(item=>[item.id,item]));
  if(known.size !== nodes.length) return false;
  if(!catalog?.books || LANGS.some(lang=>!Array.isArray(catalog.books[lang]))) return false;
  // A malformed or ambiguous edition catalogue must show the accessible
  // source-unavailable state, not throw while assembling the dossier.
  const catalogs = LANGS.map(lang=>catalog.books[lang]);
  if(catalogs.some(books=>books.some(book=>!book || typeof book.code!=='string' || !book.code ||
      typeof book.title!=='string' || !book.title.trim() ||
      !Number.isSafeInteger(book.chapters) || book.chapters<1) ||
      new Set(books.map(book=>book.code)).size!==books.length)) return false;
  const bookMaps = catalogs.map(books=>new Map(books.map(book=>[book.code,book.chapters])));
  const validRef = source => source && Number.isInteger(source.first) && source.first>0 &&
    Number.isInteger(source.last) && source.last>=source.first &&
    Number.isInteger(source.chapter) && source.chapter>0 &&
    ['narrative','interpretive'].includes(source.kind) &&
    bookMaps.every(books=>books.has(source.book) && source.chapter<=books.get(source.book));
  return nodes.every(item=>item.sources.length>0 && ['person','place','event'].includes(item.type) &&
    LANGS.every(lang=>typeof item.names[lang]==='string'&&typeof item.summaries[lang]==='string'&&Array.isArray(item.prompts[lang])) &&
    item.sources.every(validRef) && item.related.every(link=>known.has(link.to)&&link.to!==item.id&&validRef(link.via)));
}

export function dossierMarkup(catalog,language,requestedId,esc) {
  const lang=LANGS.includes(language)?language:'uk',w=COPY[lang];
  if(!validateDossierGraph(catalog)) return `<p role="alert">${esc(w.invalid)}</p>`;
  const selected=nodes.find(item=>item.id===requestedId)||nodes[0];
  const bookNames=new Map(catalog.books[lang].map(book=>[book.code,book.title]));
  const cite=source=>{
    const label=`${bookNames.get(source.book)} ${source.chapter}:${source.first}–${source.last}`;
    return `<a href="/reader/${source.book}/${source.chapter}?verse=${source.first}" aria-label="${esc(w.read)}: ${esc(label)}">${esc(label)}</a>`;
  };
  const index=`<nav aria-label="${esc(w.index)}"><h2>${esc(w.index)}</h2><ol>${nodes.map(item=>`<li><a href="/dossiers?id=${item.id}"${item.id===selected.id?' aria-current="page"':''}>${esc(item.names[lang])}</a> — ${esc(w[item.type])}</li>`).join('')}</ol></nav>`;
  const references=`<ol>${selected.sources.map(source=>`<li>${cite(source)} — ${esc(w[source.kind])}</li>`).join('')}</ol>`;
  const relations=`<ul>${selected.related.map(link=>`<li><a href="/dossiers?id=${link.to}">${esc(nodes.find(item=>item.id===link.to).names[lang])}</a> — ${cite(link.via)} — ${esc(w[link.via.kind])}</li>`).join('')}</ul>`;
  const questions=`<ol>${selected.prompts[lang].map(prompt=>`<li>${esc(prompt)}</li>`).join('')}</ol>`;
  const mission=selected.id==='abraham'? `<p><a class="button primary" href="/mission/abraham">${esc(w.mission)}</a></p>` : '';
  return `<div class="dossier-layout"><aside class="card dossier-index">${index}</aside><article class="card dossier-article" aria-labelledby="dossier-heading"><p class="eyebrow">${esc(w.selected)} · ${esc(w[selected.type])}</p><h2 id="dossier-heading" tabindex="-1">${esc(selected.names[lang])}</h2><p class="lead">${esc(selected.summaries[lang])}</p><p>${esc(w.scope)}</p><h3>${esc(w.sources)}</h3>${references}<h3>${esc(w.relations)}</h3>${relations}<h3>${esc(w.questions)}</h3>${questions}${mission}</article></div>`;
}
