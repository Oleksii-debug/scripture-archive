// SA-EXT-05: traceable, reader-linked biblical dossier graph.
// References are navigation pointers to the platform's existing edition catalog,
// not copied Bible text, external historical evidence, or licence assertions.
const LANGS = ['uk','ru','en'];
const COPY = {
  uk: {index:'Каталог досьє',sources:'Біблійні свідчення',relations:'Зв’язки з іншими досьє',questions:'Питання для дослідження',person:'Особа',place:'Місце',event:'Подія',read:'Відкрити джерело в читальні',narrative:'Зв’язок у біблійній оповіді',interpretive:'Тематичне зіставлення, не незалежний історичний доказ',scope:'Це навігаційне дослідження біблійних текстів, а не археологічний висновок. Порівнюйте переклади у читальні; права й походження конкретного видання наведені там.',selected:'Поточне досьє',invalid:'Дані джерел для цього досьє не перевірені. Перегляд тимчасово недоступний.',none:'Виберіть тему зі списку.',unknown:'Такого досьє не знайдено. Оберіть тему з каталогу.',filtered:'Це досьє не відповідає поточному пошуку. Очистьте пошук або виберіть тему з результатів.',mission:'Перейти до місії Авраама'},
  ru: {index:'Каталог досье',sources:'Библейские свидетельства',relations:'Связи с другими досье',questions:'Вопросы для исследования',person:'Человек',place:'Место',event:'Событие',read:'Открыть источник в читальне',narrative:'Связь в библейском повествовании',interpretive:'Тематическое сопоставление, не независимое историческое доказательство',scope:'Это навигационное исследование библейских текстов, а не археологический вывод. Сравнивайте переводы в читальне; права и происхождение конкретного издания приведены там.',selected:'Текущее досье',invalid:'Данные источников этого досье не проверены. Просмотр временно недоступен.',none:'Выберите тему из списка.',unknown:'Такое досье не найдено. Выберите тему в каталоге.',filtered:'Это досье не соответствует текущему поиску. Очистите поиск или выберите тему из результатов.',mission:'Перейти к миссии Авраама'},
  en: {index:'Dossier catalogue',sources:'Scripture references',relations:'Connections to other dossiers',questions:'Study questions',person:'Person',place:'Place',event:'Event',read:'Open source in reader',narrative:'Connection in the biblical narrative',interpretive:'Thematic comparison, not independent historical proof',scope:'This navigates biblical texts; it does not assert independent archaeological proof. Compare editions in the reader, where individual source and licensing details are shown.',selected:'Current dossier',invalid:'The sources for this dossier could not be validated. Viewing is temporarily unavailable.',none:'Choose a topic from the list.',unknown:'That dossier was not found. Choose a topic from the catalogue.',filtered:'This dossier does not match the current search. Clear the search or choose a matching topic.',mission:'Open Abraham mission'},
};
// Native GET discovery on the existing /dossiers route; no second data authority.
const SEARCH_COPY = {
  uk: { label:'Пошук досьє', submit:'Знайти', clear:'Очистити пошук', empty:'За запитом досьє не знайдено.', results:'Знайдено досьє', example:'Доступний також пошук за віршем, наприклад GEN 17:15.' },
  ru: { label:'Поиск досье', submit:'Найти', clear:'Очистить поиск', empty:'По запросу досье не найдены.', results:'Найдено досье', example:'Доступен также поиск по стиху, например GEN 17:15.' },
  en: { label:'Search dossiers', submit:'Find', clear:'Clear search', empty:'No dossiers match this search.', results:'Dossiers found', example:'You can also search cited verses, for example GEN 17:15.' },
};
const COMPARE_COPY = {
  uk:{choose:'Порівняти з іншим досьє',prompt:'Виберіть досьє',submit:'Порівняти джерела',heading:'Порівняння біблійних джерел',scope:'Це порівняння лише опублікованих уривків: перетин віршів не означає незалежного свідчення або історичної тотожності подій.',shared:'Спільні вірші',overlap:'Уривки з перетином віршів',none:'Опубліковані джерельні діапазони цих досьє не перетинаються.',unknown:'Другого досьє не знайдено або обрано те саме досьє.'},
  ru:{choose:'Сравнить с другим досье',prompt:'Выберите досье',submit:'Сравнить источники',heading:'Сравнение библейских источников',scope:'Сравниваются только опубликованные отрывки: пересечение стихов не означает независимого свидетельства или исторического тождества событий.',shared:'Общие стихи',overlap:'Пересекающиеся диапазоны стихов',none:'Опубликованные диапазоны источников этих досье не пересекаются.',unknown:'Второе досье не найдено или выбрано то же досье.'},
  en:{choose:'Compare with another dossier',prompt:'Choose a dossier',submit:'Compare sources',heading:'Scripture source comparison',scope:'Only published passage ranges are compared. Overlapping verses do not prove independent witnesses or identical historical events.',shared:'Shared verses',overlap:'Overlapping verse ranges',none:'The published source ranges of these dossiers do not overlap.',unknown:'The second dossier was not found or is the same dossier.'}
};
// GET search must not reinterpret invisible separators/bidi controls as a
// different visible Scripture citation, or echo them into form/link labels.
// Keep the exact raw input bound; do not normalize away unsafe characters.
const validDossierSearchQuery = value => typeof value === 'string' &&
  value.length <= 120 &&
  // Only ordinary space/TAB preserve the historical blank GET behavior.
  // Unicode separators, BOM, CR/LF, format controls and visually empty
  // script fillers and non-ASCII Unicode spaces fail closed, even alone.
  // JS trim() removes Zs spaces such as U+202F and U+3000; accepting them
  // would silently expose the unfiltered dossier/atlas source links.
  (/^[ \t]*$/u.test(value) ||
    !/[\u0000-\u001f\u007f-\u009f\u00a0\u034f\u1680\u2000-\u200a\u202f\u205f\u3000\u061c\u115f\u1160\u200b-\u200f\u2028-\u202e\u2060-\u206f\u2800\u3164\ufeff\ud800-\udfff\uffa0\p{Cf}]/u.test(value));
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
  prompts:{uk:['Що розповідає 1 Самуїла 16 про обрання Давида?','Як Лука 1 пов’язує своє повідомлення з Давидом?'],ru:['Что говорит 1 Царств 16 об избрании Давида?','Как Лука 1 связывает повествование с Давидом?'],en:['How does 1 Samuel 16 describe David’s selection?','How does Luke 1 reference David?']}},
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

 {id:'egypt',type:'place',names:{uk:'Єгипет',ru:'Египет',en:'Egypt'},
  summaries:{uk:'Порівняйте три окремі біблійні оповіді, дія яких відбувається в Єгипті: подорож Аврама, вихід ізраїльтян і перебування родини Ісуса.',ru:'Сравните три отдельные библейские истории, происходящие в Египте: путешествие Аврама, исход израильтян и пребывание семьи Иисуса.',en:'Compare three distinct biblical narratives set in Egypt: Abram’s journey, the Israelites’ departure, and Jesus’ family seeking refuge.'},
  sources:[ref('GEN',12,10,20),ref('EXO',12,29,42),ref('MAT',2,13,15)],
  related:[{to:'exodus',via:ref('EXO',12,29,42)}],
  prompts:{uk:['Чому Аврам вирушає до Єгипту в Бутті 12?','Чим відрізняються обставини виходу у Виході 12 і втечі родини Ісуса в Матвія 2?'],ru:['Почему Аврам отправляется в Египет в Бытии 12?','Чем различаются обстоятельства исхода в Исходе 12 и бегства семьи Иисуса в Матфея 2?'],en:['Why does Abram travel to Egypt in Genesis 12?','How do the departures in Exodus 12 and Matthew 2 differ?']}},
 {id:'nazareth',type:'place',names:{uk:'Назарет',ru:'Назарет',en:'Nazareth'},
  summaries:{uk:'Зіставте благовіщення в Назареті, повернення родини Ісуса та подальший виступ у місцевій синагозі.',ru:'Сопоставьте благовещение в Назарете, возвращение семьи Иисуса и последующее выступление в местной синагоге.',en:'Compare the annunciation in Nazareth, Jesus’ family settling there, and his later visit to the synagogue.'},
  sources:[ref('LUK',1,26,38),ref('MAT',2,19,23),ref('LUK',4,16,21)],
  related:[{to:'nativity',via:ref('MAT',2,19,23)}],
  prompts:{uk:['Що Лука 1 повідомляє про Назарет і Марію?','Що змінюється між Матвія 2 і Лукою 4?'],ru:['Что Лука 1 сообщает о Назарете и Марии?','Что меняется между Матфея 2 и Луки 4?'],en:['What does Luke 1 report about Nazareth and Mary?','How do Matthew 2 and Luke 4 portray different moments?']}},
 {id:'jericho',type:'place',names:{uk:'Єрихон',ru:'Иерихон',en:'Jericho'},
  summaries:{uk:'Зіставте оповідь Ісуса Навина про Єрихон із новозавітними розповідями про Закхея та Вартимея, не вважаючи їх однією подією.',ru:'Сопоставьте рассказ Иисуса Навина об Иерихоне с новозаветными историями о Закхее и Вартимее, не объединяя их в одно событие.',en:'Compare Joshua’s Jericho narrative with later accounts of Zacchaeus and Bartimaeus, without treating them as a single event.'},
  sources:[ref('JOS',6,1,5),ref('LUK',19,1,10),ref('MRK',10,46,52)],
  related:[{to:'exodus',via:ref('JOS',6,1,5,'interpretive')}],
  prompts:{uk:['Яку подію описує Ісус Навин 6?','Чим відрізняються зустрічі, описані в Луки 19 і Марка 10?'],ru:['Какое событие описывает Иисус Навин 6?','Чем различаются встречи в Луки 19 и Марка 10?'],en:['What event does Joshua 6 describe?','How do the encounters in Luke 19 and Mark 10 differ?']}},
 {id:'galilee',type:'place',names:{uk:'Галілея',ru:'Галилея',en:'Galilee'},
  summaries:{uk:'Порівняйте початок служіння Ісуса в Галілеї та згадку про Галілейське море в Євангелії від Івана.',ru:'Сравните начало служения Иисуса в Галилее и упоминание Галилейского моря в Евангелии от Иоанна.',en:'Compare the beginning of Jesus’ ministry in Galilee with John’s account at the Sea of Galilee.'},
  sources:[ref('MAT',4,12,17),ref('MRK',1,14,20),ref('JHN',6,1,14)],
  related:[{to:'peter',via:ref('MRK',1,16,18)}],
  prompts:{uk:['Як Матвій 4 описує початок проповіді в Галілеї?','Які події біля моря згадано в Марка 1 та Івана 6?'],ru:['Как Матфей 4 описывает начало проповеди в Галилее?','Какие события у моря упомянуты в Марка 1 и Иоанна 6?'],en:['How does Matthew 4 describe the ministry’s beginning in Galilee?','What happens beside the sea in Mark 1 and John 6?']}},
 {id:'ruth',type:'person',names:{uk:'Рут (Руф)',ru:'Руфь',en:'Ruth'},
  summaries:{uk:'Оповідь про родинну вірність, переселення до Вифлеєма та подальшу сімейну історію.',ru:'Повествование о верности семье, переезде в Вифлеем и дальнейшей семейной истории.',en:'A narrative of family loyalty, the move to Bethlehem, and Ruth’s later family story.'},
  sources:[ref('RUT',1,1,5),ref('RUT',1,16,22),ref('RUT',4,13,17)],
  related:[{to:'bethlehem',via:ref('RUT',1,19,22)}],
  prompts:{uk:['Як Рут відповідає Ноомі у першій главі?','Як четверта глава завершує сімейну оповідь?'],ru:['Как Руфь отвечает Ноемини в первой главе?','Как четвёртая глава завершает семейный рассказ?'],en:['How does Ruth answer Naomi in chapter 1?','How does chapter 4 conclude the family account?']}},
 {id:'paul',type:'person',names:{uk:'Павло (Савло)',ru:'Павел (Савл)',en:'Paul (Saul)'},
  summaries:{uk:'Зіставлення оповідей про навернення Савла та його власного опису покликання.',ru:'Сопоставление рассказов об обращении Савла и его собственного описания призвания.',en:'Compare narratives about Saul’s conversion with his own account of his calling.'},
  sources:[ref('ACT',9,1,9),ref('ACT',22,6,11),ref('GAL',1,11,17,'interpretive')],
  related:[{to:'exodus',via:ref('1CO',10,1,4,'interpretive')}],
  prompts:{uk:['Які подробиці подає Діяння 9?','Що Павло підкреслює в Галатів 1?'],ru:['Какие подробности приводит Деяния 9?','Что Павел подчёркивает в Галатам 1?'],en:['Which details appear in Acts 9?','What does Paul emphasize in Galatians 1?']}},
 {id:'mary-mother',type:'person',names:{uk:'Марія, мати Ісуса',ru:'Мария, мать Иисуса',en:'Mary, mother of Jesus'},
  summaries:{uk:'Повідомлення про благовіщення, народження Ісуса та згадку Марії серед учнів.',ru:'Рассказы о благовещении, рождении Иисуса и упоминании Марии среди учеников.',en:'The annunciation, Jesus’ birth, and a later reference to Mary among the disciples.'},
  sources:[ref('LUK',1,26,38),ref('LUK',2,1,20),ref('ACT',1,12,14)],
  related:[{to:'nativity',via:ref('LUK',2,1,7)}],
  prompts:{uk:['Що промовляє Марія в Луки 1?','Де Марія згадана в Діяннях 1?'],ru:['Что говорит Мария в Луки 1?','Где Мария упоминается в Деяниях 1?'],en:['What does Mary say in Luke 1?','Where is Mary named in Acts 1?']}},
 {id:'peter',type:'person',names:{uk:'Петро (Симон)',ru:'Пётр (Симон)',en:'Peter (Simon)'},
  summaries:{uk:'Зіставлення визнання Петра, подій його зречення та звернення до слухачів у Діяннях.',ru:'Сопоставление исповедания Петра, его отречения и обращения к слушателям в Деяниях.',en:'Compare Peter’s confession, his denial, and his address to the crowd in Acts.'},
  sources:[ref('MAT',16,13,20),ref('LUK',22,54,62),ref('ACT',2,14,21)],
  related:[{to:'jerusalem',via:ref('ACT',2,14,21)}],
  prompts:{uk:['Що Петро відповідає у Матвія 16?','Як Лука 22 і Діяння 2 показують різні моменти його історії?'],ru:['Что Пётр отвечает в Матфея 16?','Как Лука 22 и Деяния 2 показывают разные моменты его истории?'],en:['What does Peter say in Matthew 16?','How do Luke 22 and Acts 2 depict different moments in his story?']}},
];
export const scriptureDossiers=nodes;

export function validateDossierGraph(catalog) {
  // Dossier IDs become internal links; authoring damage must never turn them
  // into markup/URL attributes or present blank text as validated Scripture.
  const safeId = value => typeof value === 'string' && /^[a-z][a-z0-9-]*$/.test(value);
  // HTML escaping does not remove invisible/bidi text or lone surrogates;
  // reject ambiguous source metadata before emitting reader links/ARIA names.
  // Include Unicode format controls and visually empty script fillers;
  // canonical dossier labels and reader links must not conceal source claims.
  const safeVisibleText = value => typeof value === 'string' && value.trim().length > 0 &&
    !/[\u0000-\u001f\u007f-\u009f\u00a0\u061c\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff\ud800-\udfff\u034f\u115f\u1160\u2800\u3164\uffa0\p{Cf}]/u.test(value);
  const nonblank = safeVisibleText;
  // Book codes become internal reader URL segments. Reject unsafe catalogue
  // or dossier provenance before rendering any href (including atlas links).
  const safeBookCode = value => typeof value === 'string' && /^(?:[1-3])?[A-Z]{2,4}$/.test(value);
  if (!nodes.every(item => item && safeId(item.id) &&
      ['person','place','event'].includes(item.type) &&
      Array.isArray(item.sources) && item.sources.length > 0 &&
      Array.isArray(item.related) &&
      LANGS.every(lang => nonblank(item.names?.[lang]) &&
        nonblank(item.summaries?.[lang]) &&
        Array.isArray(item.prompts?.[lang]) && item.prompts[lang].length > 0 &&
        item.prompts[lang].every(nonblank)))) return false;
  const known = new Map(nodes.map(item=>[item.id,item]));
  if (known.size !== nodes.length) return false;
  // Only own, published catalogue records may authorize reader source labels.
  // Prototype-inherited language lists or book fields can otherwise spoof a
  // source name in the dossier, atlas and accessible citation links.
  if(!catalog || typeof catalog!=='object' || !Object.hasOwn(catalog,'books') ||
      !catalog.books || typeof catalog.books!=='object' || Array.isArray(catalog.books) ||
      LANGS.some(lang=>!Object.hasOwn(catalog.books,lang) || !Array.isArray(catalog.books[lang]))) return false;
  // A malformed or ambiguous edition catalogue must show the accessible
  // source-unavailable state, not throw while assembling the dossier.
  // Match the canonical Bible reader's published chapter/verse size gates.
  // Otherwise a dossier can link to a source the actual reader rejects.
  const catalogs = LANGS.map(lang=>catalog.books[lang]);
  // Sparse or oversized arrays must fail closed before Map construction;
  // Array#some skips holes and Map(books.map(...)) otherwise throws.
  if(catalogs.some(books=>books.length===0 || books.length>200 ||
      Array.from(books.keys()).some(index=>!Object.hasOwn(books,index)) ||
      books.some(book=>!book || typeof book!=='object' || Array.isArray(book) ||
      !['code','title','chapters'].every(key=>Object.hasOwn(book,key)) || !safeBookCode(book.code) ||
      !safeVisibleText(book.title) ||
      !Number.isSafeInteger(book.chapters) || book.chapters<1 || book.chapters>200) ||
      new Set(books.map(book=>book.code)).size!==books.length)) return false;
  const bookMaps = catalogs.map(books=>new Map(books.map(book=>[book.code,book.chapters])));
  const validRef = source => source && safeBookCode(source.book) && Number.isSafeInteger(source.first) && source.first>0 && source.first<=256 &&
    Number.isSafeInteger(source.last) && source.last>=source.first && source.last<=256 &&
    Number.isSafeInteger(source.chapter) && source.chapter>0 && source.chapter<=200 &&
    ['narrative','interpretive'].includes(source.kind) &&
    bookMaps.every(books=>books.has(source.book) && source.chapter<=books.get(source.book));
  return nodes.every(item=>item.sources.every(validRef) &&
    item.related.every(link=>link && known.has(link.to) && link.to!==item.id && validRef(link.via)));
}

// Search only the existing source-validated dossier graph, with no private IO.
export function searchScriptureDossiers(language,value,catalog=null) {
  const lang=LANGS.includes(language)?language:'uk';
  // The public GET form and atlas cap the *raw* q at 120 UTF-16 units.
  // Whitespace-only padding must not bypass that bound via trim/normalize,
  // which would otherwise process arbitrarily large untrusted input first.
  if(!validDossierSearchQuery(value))return [];
  const query=value.normalize('NFC').trim().toLocaleLowerCase(lang);
  if(query.length>120)return [];
  if(!query)return [...nodes];
  // Use the already-validated book catalogue supplied by the native dossier
  // route. A standalone lookup without it still supports canonical book codes.
  const books=catalog && typeof catalog==='object' && Object.hasOwn(catalog,'books') &&
    catalog.books && typeof catalog.books==='object' && Object.hasOwn(catalog.books,lang) &&
    Array.isArray(catalog.books[lang]) ? catalog.books[lang] : [];
  const bookNames=new Map(books.filter(book=>book && typeof book==='object' &&
    Object.hasOwn(book,'code') && Object.hasOwn(book,'title') &&
    typeof book.code==='string' && typeof book.title==='string').map(book=>[book.code,book.title]));
  const normalize=text=>text.normalize('NFC').toLocaleLowerCase(lang);
  // An exact book-name/code search must discover every dossier whose
  // published sources or relation witnesses cite that book. Do not perform
  // prefix/substring matching on book identifiers: GEN must never include
  // GEN 1 merely because it shares the spelling of GEN 12.
  const citedBookCodes=new Set(nodes.flatMap(item=>[
    ...item.sources.map(source=>source.book),
    ...item.related.map(edge=>edge.via.book)
  ]));
  const requestedBooks=new Set([...citedBookCodes].filter(code=>normalize(code)===query ||
    (bookNames.has(code) && normalize(bookNames.get(code))===query)));
  if(requestedBooks.size)return nodes.filter(item=>item.sources.some(source=>requestedBooks.has(source.book)) ||
    item.related.some(edge=>requestedBooks.has(edge.via.book)));
  // Reuse the existing verified book-name/code index, but treat a verse
  // request as an exact chapter-and-range lookup, not a substring match.
  // Include a dossier's published relation witnesses: the reader can inspect
  // those citations in the same public dossier, with no private grading data.
  // The reader and dossier citations display closed verse ranges. Resolve the
  // same user-entered range against *published* source and relationship refs,
  // without fabricating a verse, expanding the source graph or interpreting a
  // reversed/invalid interval as a free-text lookup.
  // Pasted source citations can use an em dash or spaces around the verse separator.
  // Preserve the existing exact chapter, bounded verse and reversed-range gates.
  const rangeQuery=/^(.+?)\s+([1-9][0-9]{0,2}):([1-9][0-9]{0,2})\s*[-–—]\s*([1-9][0-9]{0,2})$/u.exec(query);
  if(rangeQuery){
    const requestedBook=rangeQuery[1],chapter=Number(rangeQuery[2]);
    const first=Number(rangeQuery[3]),last=Number(rangeQuery[4]);
    // A pasted range is a reader citation, not a broad textual match.
    // Do not return unrelated-looking sources for verses the canonical
    // Bible reader cannot display (max 256 verses per chapter).
    if(chapter>200 || first>256 || last>256 || last<first)return [];
    const cited=source=>(normalize(source.book)===requestedBook ||
      (bookNames.has(source.book) && normalize(bookNames.get(source.book))===requestedBook)) &&
      source.chapter===chapter && source.first<=last && first<=source.last;
    return nodes.filter(item=>item.sources.some(cited) ||
      item.related.some(edge=>cited(edge.via)));
  }
  const verseQuery=/^(.+?)\s+([1-9][0-9]{0,2}):([1-9][0-9]{0,2})$/u.exec(query);
  if(verseQuery){
    const requestedBook=verseQuery[1],chapter=Number(verseQuery[2]),verse=Number(verseQuery[3]);
    const cited=source=>(normalize(source.book)===requestedBook ||
      (bookNames.has(source.book) && normalize(bookNames.get(source.book))===requestedBook)) &&
      source.chapter===chapter && source.first<=verse && verse<=source.last;
    return nodes.filter(item=>item.sources.some(cited) ||
      item.related.some(edge=>cited(edge.via)));
  }
  return nodes.filter(item=>{
    // Study prompts are public material shown within the same dossier.
    const authored=[item.id,item.names[lang],item.summaries[lang],COPY[lang][item.type],
      ...item.prompts[lang]];
    if(authored.some(text=>normalize(text).includes(query)))return true;
    // Match exact book+chapter labels from published sources AND their
    // reader-linked relation witnesses, just as exact verse searches already
    // do. Prefix matching would misreport GEN 12 for a query of GEN 1.
    const cited=source=>{
      const title=bookNames.get(source.book);
      const references=[source.book+' '+source.chapter,
        ...(title?[title+' '+source.chapter]:[])];
      return references.some(label=>normalize(label)===query);
    };
    return item.sources.some(cited) || item.related.some(edge=>cited(edge.via));
  });
}

export function dossierMarkup(catalog,language,requestedId,esc,searchQuery='',compareId=null) {
  const lang=LANGS.includes(language)?language:'uk',w=COPY[lang];
  if(!validateDossierGraph(catalog)) return `<p role="alert">${esc(w.invalid)}</p>`;
  // A direct GET can bypass HTML maxlength. Match the atlas' raw-query gate
  // instead of re-rendering a truncated, falsely selectable search result.
  // A malformed programmatic q must not be treated as an absent filter:
  // otherwise the default dossier's unrelated Scripture links are exposed.
  if(!validDossierSearchQuery(searchQuery))
    return `<p role="alert">${esc(w.invalid)}</p>`;
  // An absent query selects the introduction. An invalid explicit ID must
  // never be silently presented as a different person's source dossier.
  const matches=searchScriptureDossiers(lang,searchQuery,catalog);
  const activeSearch=typeof searchQuery==='string' && searchQuery.trim().length>0;
  const noMatch=activeSearch && matches.length===0;
  // An explicit ID outside the active result set cannot be presented as if
  // it matched the filter (and should not inherit another dossier's evidence).
  const selected=noMatch?null:((requestedId===null || requestedId===undefined)
    ? (activeSearch?matches[0]:nodes[0])
    : (activeSearch?matches:nodes).find(item=>item.id===requestedId));
  const filteredId=activeSearch && !noMatch && !selected &&
    nodes.some(item=>item.id===requestedId);
  const bookNames=new Map(catalog.books[lang].map(book=>[book.code,book.title]));
  const cite=source=>{
    const label=`${bookNames.get(source.book)} ${source.chapter}:${source.first}–${source.last}`;
    return `<a href="/reader/${source.book}/${source.chapter}?verse=${source.first}" aria-label="${esc(w.read)}: ${esc(label)} — ${esc(w[source.kind])}">${esc(label)}</a>`;
  };
  const matching=searchScriptureDossiers(lang,searchQuery,catalog);
  const hasQuery=typeof searchQuery==='string' && searchQuery.trim().length>0;
  const searchLabel=SEARCH_COPY[lang];
  const shownQuery=typeof searchQuery==='string'?searchQuery.trim().slice(0,120):'';
  const searchForm=`<form action="/dossiers" method="get" role="search"><label for="dossier-search">${esc(searchLabel.label)}</label><input id="dossier-search" name="q" type="search" maxlength="120" value="${esc(shownQuery)}" aria-describedby="dossier-search-example"><p id="dossier-search-example">${esc(searchLabel.example)}</p><button type="submit">${esc(searchLabel.submit)}</button></form>`;
  const clearSearch=hasQuery?`<p><a href="/dossiers">${esc(searchLabel.clear)}</a></p><p role="status">${esc(searchLabel.results)}: ${matching.length}</p>`:'';
  // Keep the active GET filter when following a result. URLSearchParams
  // handles Unicode and malformed UTF-16 safely; escape its '&' for HTML.
  // Without q, preserve the original stable /dossiers?id=... deep link.
  const resultHref=item=>{
    const params=new URLSearchParams({id:item.id});
    if(hasQuery) params.set('q',shownQuery);
    return '/dossiers?'+params.toString();
  };
  const index=`<nav aria-label="${esc(w.index)}"><h2>${esc(w.index)}</h2>${searchForm}${clearSearch}<ol>${matching.map(item=>`<li><a href="${esc(resultHref(item))}"${selected && item.id===selected.id?' aria-current="page"':''}>${esc(item.names[lang])}</a> — ${esc(w[item.type])}</li>`).join('')}</ol></nav>`;
  if(!selected) return `<div class="dossier-layout"><aside class="card dossier-index">${index}</aside><p role="alert">${esc(noMatch?SEARCH_COPY[lang].empty:filteredId?w.filtered:w.unknown)}</p></div>`;
  const references=`<ol>${selected.sources.map(source=>`<li>${cite(source)} — ${esc(w[source.kind])}</li>`).join('')}</ol>`;
  // Preserve the filter only if the related dossier is in the current result set.
  // Otherwise retain the unfiltered route so a real relation is still reachable.
  const relationHref=target=>hasQuery && matching.some(item=>item.id===target.id)
    ? resultHref(target) : '/dossiers?id='+target.id;
  const relations=`<ul>${selected.related.map(link=>{
    const target=nodes.find(item=>item.id===link.to);
    return `<li><a href="${esc(relationHref(target))}">${esc(target.names[lang])}</a> — ${cite(link.via)} — ${esc(w[link.via.kind])}</li>`;
  }).join('')}</ul>`;
  // Compare any two approved public dossiers through this existing GET route.
  // All source data is already checked by validateDossierGraph above; no
  // generated Scripture text, date, geography or independent-proof claim.
  const comparisonCopy=COMPARE_COPY[lang];
  const compared=typeof compareId==='string' && compareId!==''
    ? nodes.find(item=>item.id===compareId) : null;
  const compareOptions=nodes.filter(item=>item.id!==selected.id).map(item=>
    `<option value="${item.id}"${compared?.id===item.id?' selected':''}>${esc(item.names[lang])}</option>`).join('');
  // The comparison is a continuation of the currently filtered dossier view.
  // Preserve the exact bounded visible query through its native GET form, just
  // as the catalogue links do. Otherwise the first comparison silently drops
  // the user's filter and may present an unrelated unfiltered result on reload.
  const compareFilter=hasQuery?`<input type="hidden" name="q" value="${esc(shownQuery)}">`:'';
  const compareForm=`<form action="/dossiers" method="get">${compareFilter}<input type="hidden" name="id" value="${selected.id}"><label for="dossier-compare">${esc(comparisonCopy.choose)}</label><select id="dossier-compare" name="compare"><option value="">${esc(comparisonCopy.prompt)}</option>${compareOptions}</select><button type="submit">${esc(comparisonCopy.submit)}</button></form>`;
  let comparison='';
  if(typeof compareId==='string' && compareId!==''){
    if(!compared || compared.id===selected.id){
      comparison=`<p role="alert">${esc(comparisonCopy.unknown)}</p>`;
    }else{
      const list=item=>`<ol>${item.sources.map(source=>`<li>${cite(source)} — ${esc(w[source.kind])}</li>`).join('')}</ol>`;
      const overlaps=selected.sources.flatMap(left=>compared.sources.filter(right=>
        left.book===right.book && left.chapter===right.chapter &&
        left.first<=right.last && right.first<=left.last).map(right=>({left,right})));
      // A matching source pair is not the intersection itself: link only the
      // verses that both published source ranges actually cite.
      const sharedPassage=(left,right)=>{
        const first=Math.max(left.first,right.first),last=Math.min(left.last,right.last);
        const label=`${bookNames.get(left.book)} ${left.chapter}:${first}–${last}`;
        return `<a href="/reader/${left.book}/${left.chapter}?verse=${first}">${esc(label)}</a>`;
      };
      const overlapsHtml=overlaps.length
        ? `<ol>${overlaps.map(({left,right})=>`<li><strong>${esc(comparisonCopy.shared)}:</strong> ${sharedPassage(left,right)}; ${cite(left)} — ${esc(w[left.kind])}; ${cite(right)} — ${esc(w[right.kind])}</li>`).join('')}</ol>`
        : `<p>${esc(comparisonCopy.none)}</p>`;
      comparison=`<section aria-labelledby="dossier-comparison-heading"><h3 id="dossier-comparison-heading">${esc(comparisonCopy.heading)}</h3><p>${esc(comparisonCopy.scope)}</p><dl><dt>${esc(selected.names[lang])}</dt><dd>${list(selected)}</dd><dt>${esc(compared.names[lang])}</dt><dd>${list(compared)}</dd></dl><h4>${esc(comparisonCopy.overlap)}</h4>${overlapsHtml}</section>`;
    }
  }
  const comparisonUI=compareForm+comparison;
  const questions=`<ol>${selected.prompts[lang].map(prompt=>`<li>${esc(prompt)}</li>`).join('')}</ol>`;
  const mission=selected.id==='abraham'? `<p><a class="button primary" href="/mission/abraham">${esc(w.mission)}</a></p>` : '';
  return `<div class="dossier-layout"><aside class="card dossier-index">${index}</aside><article class="card dossier-article" aria-labelledby="dossier-heading"><p class="eyebrow">${esc(w.selected)} · ${esc(w[selected.type])}</p><h2 id="dossier-heading" tabindex="-1">${esc(selected.names[lang])}</h2><p class="lead">${esc(selected.summaries[lang])}</p><p>${esc(w.scope)}</p><h3>${esc(w.sources)}</h3>${references}<h3>${esc(w.relations)}</h3>${relations}${comparisonUI}<h3>${esc(w.questions)}</h3>${questions}${mission}</article></div>`;
}


// SA-EXT-06: accessible text-first passage/place index. Editorial reading
// order is NOT absolute historical dating or archaeological confirmation.
export function dossierAtlasMarkup(catalog,language,esc,query='') {
  const lang=LANGS.includes(language)?language:'uk',w=COPY[lang];
  if(!validateDossierGraph(catalog))return '<p role="alert">'+esc(w.invalid)+'</p>';
  // Reuse the dossier GET search rather than displaying unrelated atlas witnesses
  // beside a filtered dossier result. Default (no query) is unchanged.
  if(!validDossierSearchQuery(query))return '<p role="alert">'+esc(w.invalid)+'</p>';
  const filtered=query.trim().length>0;
  const visibleIds=filtered?new Set(searchScriptureDossiers(lang,query,catalog).map(item=>item.id)):null;
  const visible=item=>Boolean(item)&&(!visibleIds||visibleIds.has(item.id));
  const resultCount=filtered?visibleIds.size:0;
  if(filtered&&resultCount===0)return '<section class="card dossier-atlas" aria-labelledby="dossier-atlas-heading"><h2 id="dossier-atlas-heading">'+esc(COPY[lang].index)+'</h2><p role="status">'+esc(SEARCH_COPY[lang].empty)+'</p></section>';
  const filterStatus=filtered?'<p role="status">'+esc(SEARCH_COPY[lang].results)+': '+resultCount+'</p>':'';
  const terms={
    uk:{title:'Біблійний атлас: текстова лабораторія',intro:'Орієнтовна послідовність оповідей для читання. Це не датування історичних подій і не незалежне археологічне підтвердження.',order:'Порядок читання',subject:'Тема',passage:'Біблійний уривок',places:'Згадані місця',extra:'Інші теми дослідження (не хронологічний порядок)',uncertainty:'Сучасні координати, маршрути й археологічні локалізації тут не встановлені; використовуйте першоджерела, а не припущення на карті.'},
    ru:{title:'Библейский атлас: текстовая лаборатория',intro:'Ориентировочная последовательность повествований для чтения. Это не датировка исторических событий и не независимое археологическое подтверждение.',order:'Порядок чтения',subject:'Тема',passage:'Библейский отрывок',places:'Упомянутые места',extra:'Другие темы исследования (без хронологического порядка)',uncertainty:'Современные координаты, маршруты и археологические локализации здесь не установлены; используйте первоисточники, а не предположения на карте.'},
    en:{title:'Scripture atlas: text-first research',intro:'An approximate narrative reading sequence, not a historical date assignment or independent archaeological verification.',order:'Reading order',subject:'Subject',passage:'Scripture passage',places:'Places mentioned',extra:'Other research subjects (not chronologically ordered)',uncertainty:'Modern coordinates, routes and archaeological identifications are not established here; use source passages rather than guessed map locations.'}
  }[lang];
  const order=['abraham','sarah','joseph','moses','exodus','david','nativity'];
  const byId=new Map(nodes.map(item=>[item.id,item]));
  if(order.some(id=>!byId.has(id)))return '<p role="alert">'+esc(w.invalid)+'</p>';
  const bookNames=new Map(catalog.books[lang].map(book=>[book.code,book.title]));
  const passage=source=>{
    const label=bookNames.get(source.book)+' '+source.chapter+':'+source.first+'–'+source.last;
    return '<a href="/reader/'+source.book+'/'+source.chapter+'?verse='+source.first+'" aria-label="'+esc(w.read)+': '+esc(label)+' — '+esc(w[source.kind])+'">'+esc(label)+'</a>';
  };
  // Atlas links must keep the active native GET search, like dossier index links.
  // Otherwise opening a filtered atlas subject silently resets the dossier view.
  // URLSearchParams encodes the query; esc() protects the HTML attribute.
  const subject=item=>{
    // Do not link a nonmatching target into a filtered result set; its
    // published relation citation remains visible and independently readable.
    if(filtered && !visible(item))return esc(item.names[lang]);
    const params=new URLSearchParams({id:item.id});
    if(filtered)params.set('q',query.trim());
    return '<a href="'+esc('/dossiers?'+params.toString())+'">'+esc(item.names[lang])+'</a>';
  };
  // A filtered result retains its position in the approved narrative reading order.
  const history=order.filter(id=>visible(byId.get(id))).map(id=>{
    const item=byId.get(id);
    // Each narrative row must expose all its canonical witness passages, not
    // only the first reference. Keep interpretive sources explicitly labelled.
    const witnesses='<ol>'+item.sources.map(source=>'<li>'+passage(source)+' — '+esc(w[source.kind])+'</li>').join('')+'</ol>';
    return '<tr><th scope="row">'+(order.indexOf(id)+1)+'</th><td>'+subject(item)+'</td><td>'+witnesses+'</td></tr>';
  }).join('');
  // Display every source-backed passage for each place. Selecting only the
  // first source silently hid independently cited chapters from the atlas.
  const places=nodes.filter(item=>item.type==='place'&&visible(item)).map(item=>
    '<tr><th scope="row">'+subject(item)+'</th><td><ol>'+
    item.sources.map(source=>'<li>'+passage(source)+' — '+esc(w[source.kind])+'</li>').join('')+
    '</ol></td></tr>').join('');
  // The dated-reading sample above is deliberately bounded. Do not hide
  // other approved person/event dossiers from the text atlas or falsely place
  // them in a historical chronology without independent dated evidence.
  const additionalTopics=nodes.filter(item=>item.type!=='place'&&!order.includes(item.id)&&visible(item));
  const additional=additionalTopics.length?'<section aria-labelledby="dossier-atlas-additional-heading"><h3 id="dossier-atlas-additional-heading">'+esc(terms.extra)+'</h3><ol>'+
    additionalTopics.map(item=>'<li>'+subject(item)+'<ol>'+
      item.sources.map(source=>'<li>'+passage(source)+' — '+esc(w[source.kind])+'</li>').join('')+
      '</ol></li>').join('')+'</ol></section>':'';

  // Expose the graph's relationship-only witnesses in the canonical atlas.
  // The main tables intentionally keep their approved narrative reading order;
  // a separate semantic definition list avoids mistaking relation edges for
  // additional dates, locations or independent historical proof.
  // A visible dossier can match solely through a relation witness; do not
  // erase that witness merely because its related target is outside the filter.
  const relationEntries=nodes.filter(visible).flatMap(item=>item.related.map(link=>({item,link})));
  const relatedWitnesses=relationEntries.length?
    '<section aria-labelledby="dossier-atlas-relations-heading"><h3 id="dossier-atlas-relations-heading">'+esc(w.relations)+'</h3><dl>'+
      relationEntries.map(({item,link})=>
        '<dt>'+subject(item)+' → '+subject(byId.get(link.to))+'</dt><dd>'+
        passage(link.via)+' — '+esc(w[link.via.kind])+'</dd>').join('')+
    '</dl></section>':'';
  return '<section class="card dossier-atlas" aria-labelledby="dossier-atlas-heading"><h2 id="dossier-atlas-heading">'+esc(terms.title)+'</h2><p>'+esc(terms.intro)+'</p>'+filterStatus+'<table><caption>'+esc(terms.order)+'</caption><thead><tr><th scope="col">№</th><th scope="col">'+esc(terms.subject)+'</th><th scope="col">'+esc(terms.passage)+'</th></tr></thead><tbody>'+history+'</tbody></table><table><caption>'+esc(terms.places)+'</caption><thead><tr><th scope="col">'+esc(terms.subject)+'</th><th scope="col">'+esc(terms.passage)+'</th></tr></thead><tbody>'+places+'</tbody></table>'+additional+relatedWitnesses+'<p>'+esc(terms.uncertainty)+'</p></section>';
}
