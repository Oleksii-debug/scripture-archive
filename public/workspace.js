import { reviewText, submissionForm, historyMarkup, queueMarkup, auditMarkup, attachReviewControls, renderPublicMaterials, renderReviewedLibrary, renderEditorialTakedownSearch, loadReviewData, editorRolesMarkup, attachEditorRoles } from './material-review.js';
import { dossierMarkup, dossierAtlasMarkup } from './scripture-dossiers.js';
import { academyMarkup, academyProgressKey, readAcademyProgress, attachAcademy } from './scripture-academy.js';
import { safeProvenanceHttpsUrl, validEditionRightsText } from './parallel-reader.js';

// The local reading cache is user/device-controlled JSON, not a trusted Bible
// chapter receipt. Never let a malformed item break the progress route or
// create a misleading chapter link; leave the stored bytes untouched for recovery.
// Only a validated canonical inventory may authorize user-visible reading
// history; approved editions can have different chapter divisions (JOL 4).
export function canonicalReadingChapterBounds(catalog) {
  const books = catalog?.books?.en;
  if (!Array.isArray(books) || books.length !== 66) return null;
  const bounds = new Map();
  for (const book of books) {
    if (!book || typeof book.code !== 'string' ||
        !/^[1-3]?[A-Z]{2,3}$/.test(book.code) ||
        !Number.isSafeInteger(book.chapters) || book.chapters < 1 ||
        book.chapters > 150 || bounds.has(book.code)) return null;
    bounds.set(book.code, book.chapters);
  }
  const editions = catalog?.editionBooks;
  if (editions !== undefined) {
    if (!editions || typeof editions !== 'object' || Array.isArray(editions)) return null;
    for (const rows of Object.values(editions)) {
      if (!Array.isArray(rows)) return null;
      for (const book of rows) {
        if (!book || typeof book.code !== 'string' || !bounds.has(book.code) ||
            !Number.isSafeInteger(book.chapters) || book.chapters < 1 ||
            book.chapters > 150) return null;
        bounds.set(book.code, Math.max(bounds.get(book.code), book.chapters));
      }
    }
  }
  return bounds;
}

export function verifiedLocalReadingHistory(raw, canonicalBounds) {
  // A missing or damaged catalog cannot authorize local source claims.
  // The optional parameter preserves older standalone helper clients; the
  // actual progress page always passes a validated Map or refuses display.
  if (canonicalBounds !== undefined &&
      (!(canonicalBounds instanceof Map) || canonicalBounds.size !== 66)) return [];
  if (!Array.isArray(raw)) return [];
  // Keep the newest entries. 1000 oldest entries could hide recent legitimate
  // chapters in a complete Bible-reading journey; 2048 bounds hostile caches.
  const admitted = raw.slice(-2048).filter(item =>
    item && typeof item === 'object' && !Array.isArray(item) &&
    typeof item.book === 'string' && /^[1-3]?[A-Z]{2,3}$/.test(item.book) &&
    Number.isSafeInteger(item.chapter) && item.chapter >= 1 && item.chapter <= 150 &&
    (canonicalBounds === undefined || item.chapter <= (canonicalBounds.get(item.book) || 0)) &&
    typeof item.title === 'string' && item.title.trim().length > 0 && item.title.length <= 200);
  // Imported/legacy caches may contain the same chapter more than once.
  // Display and count only distinct chapters, retaining the newest accepted
  // title. Operate on the bounded copy, never mutate the durable source data.
  const seen = new Set();
  return admitted.reverse().filter(item => {
    const key = item.book + ':' + item.chapter;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).reverse();
}


const LIBRARY_COPY = {
  uk: { title:'Бібліотека перевірених матеріалів', lead:'Тут доступні тільки навчальні матеріали, затверджені редактором. Відкрийте запитання та перевірте відповідь за джерелом.', scope:'Цей каталог не є повною електронною бібліотекою книг або аудіовидань. Нові матеріали з’являються після перевірки джерел і прав.' },
  ru: { title:'Библиотека проверенных материалов', lead:'Здесь доступны только учебные материалы, утверждённые редактором. Откройте вопросы и проверьте ответы по источнику.', scope:'Этот каталог не является полной электронной библиотекой книг или аудиоизданий. Новые материалы появляются после проверки источников и прав.' },
  en: { title:'Library of reviewed materials', lead:'Only editor-approved study materials appear here. Study the questions and check your answers against the cited source.', scope:'This is not a full ebook or audio library. Additional materials appear only after source and rights review.' },
};

const COPY = {
  uk: {
    home:'Головна', campaigns:'Кампанії', library:'Бібліотека', dossiers:'Дослідницькі досьє', builder:'Конструктор', progress:'Мій прогрес',
    campaignLead:'Оберіть історію або тему. У кожній кампанії матеріали зібрано в послідовні місії.',
    campaignNames:['Євангельські свідчення','Діяння та перші громади','Постаті Старого Завіту','Хронологія та послідовність','Майстерня дослідника','Люди й милосердя'],
    campaignDescriptions:['Події, притчі й образи чотирьох Євангелій.','Люди, подорожі та життя перших християнських громад.','Покликання, рішення й віра в оповідях Старого Завіту.','Події Писання в послідовності та історичному контексті.','Уважне читання, порівняння джерел і обґрунтовані висновки.','Біблійні розповіді про допомогу, відповідальність і турботу.'],
    dossierLead:'Уривки, питання й нотатки, зібрані навколо однієї історії.',dossierTitle:'Авраам: від покликання до обітниці',
    dossierText:'Прочитайте Буття 12:1–3, потім Буття 15:1–6. У першому уривку зверніть увагу на наказ вирушити та Божі обіцянки. У другому простежте розмову про спадкоємця й нащадків.',
    dossierQuestions:['Що Бог просить Аврама зробити?','Які обіцянки містить перший уривок?','Що запитує Аврам у другому уривку?','Які слова самого тексту підтримують ваш висновок?'],
    guiding:'Питання для розмови',read:'Читати уривок',mission:'Перейти до місії',builderLead:'Складіть власне запитання для особистого навчання або зустрічі групи.',
    myMaterials:'Мої матеріали',newMaterial:'Нове запитання',title:'Назва',prompt:'Запитання',reference:'Біблійне посилання',options:'Варіанти відповіді, кожен із нового рядка',answer:'Правильна відповідь',explanation:'Пояснення',save:'Зберегти',edit:'Редагувати',test:'Спробувати',publish:'Опублікувати для відвідувачів',private:'Особистий матеріал',public:'Опубліковано',empty:'Тут з’являться ваші матеріали.',saved:'Матеріал збережено.',error:'Не вдалося зберегти. Перевірте поля й спробуйте ще раз.',signIn:'Зареєструватися або увійти',accountNeeded:'Зареєструйтеся або увійдіть, щоб зберігати власні матеріали між пристроями.',
    progressLead:'Ваші відповіді, прочитані глави й наступний крок.',progressSyncUnavailable:'Не вдалося перевірити прогрес на сервері. Показані дані можуть бути застарілими. Спробуйте відкрити сторінку ще раз.',progressSyncPartial:'Частина збережених результатів пошкоджена. Показано тільки перевірені результати; загальний поступ може бути неповним.',tasks:'Правильних відповідей у місії',chapters:'Глав позначено прочитаними',status:'Стан маршруту',finished:'Завершено',inProgress:'У процесі',notStarted:'Ще не розпочато',continue:'Продовжити',readingHistory:'Історія читання',markRead:'Позначити прочитаним',readMarked:'Главу позначено прочитаною',nothingRead:'Позначайте прочитані глави в читальні, щоб повертатися до них.',liveTitle:'Домашні групи',liveLead:'Спільне читання Біблії у вашій церкві, вдома чи під час онлайн-зустрічі.',liveSteps:[['Оберіть уривок','Ведучий відкриває книгу та главу. Учасники читають на платформі або у власній Біблії.'],['Обговоріть запитання','Знайдіть слова, на яких тримається відповідь, і вислухайте думки учасників.'],['Збережіть поступ','Ведучий записує опрацьовану главу, відповіді й підсумок зустрічі.']],openGroups:'Відкрити домашні групи',marathons:'Марафони',marathonText:'За бажанням група долучається до спільного маршруту. Групи з однаковим тижневим планом і режимом надолуження бачать поступ одна одної.',normalText:'Звичайні групи читають у своєму темпі. Відкритий каталог показує їхній загальний поступ і точність відповідей.',check:'Перевірити',correct:'Правильно',retry:'Спробуйте ще раз',back:'Повернутися',export:'Завантажити матеріали',import:'Імпортувати матеріали',
  },
  ru: {
    home:'Главная',campaigns:'Кампании',library:'Библиотека',dossiers:'Исследовательские досье',builder:'Конструктор',progress:'Мой прогресс',campaignLead:'Выберите историю или тему. В каждой кампании материалы объединены в последовательные миссии.',campaignNames:['Евангельские свидетельства','Деяния и первые общины','Люди Ветхого Завета','Хронология и последовательность','Мастерская исследователя','Люди и милосердие'],campaignDescriptions:['События, притчи и образы четырёх Евангелий.','Люди, путешествия и жизнь первых христианских общин.','Призвание, решения и вера в рассказах Ветхого Завета.','События Писания в последовательности и историческом контексте.','Внимательное чтение, сравнение источников и обоснованные выводы.','Библейские рассказы о помощи, ответственности и заботе.'],dossierLead:'Отрывки, вопросы и заметки, собранные вокруг одной истории.',dossierTitle:'Авраам: от призвания к обещанию',dossierText:'Прочитайте Бытие 12:1–3, затем Бытие 15:1–6. В первом отрывке обратите внимание на повеление отправиться в путь и Божьи обещания. Во втором проследите разговор о наследнике и потомках.',dossierQuestions:['Что Бог просит Аврама сделать?','Какие обещания содержит первый отрывок?','О чём спрашивает Аврам во втором отрывке?','Какие слова самого текста подтверждают ваш вывод?'],guiding:'Вопросы для обсуждения',read:'Читать отрывок',mission:'Перейти к миссии',builderLead:'Подготовьте свой вопрос для личного изучения или встречи группы.',myMaterials:'Мои материалы',newMaterial:'Новый вопрос',title:'Название',prompt:'Вопрос',reference:'Библейская ссылка',options:'Варианты ответа, каждый с новой строки',answer:'Правильный ответ',explanation:'Объяснение',save:'Сохранить',edit:'Редактировать',test:'Попробовать',publish:'Опубликовать для посетителей',private:'Личный материал',public:'Опубликовано',empty:'Здесь появятся ваши материалы.',saved:'Материал сохранён.',error:'Не удалось сохранить. Проверьте поля и попробуйте снова.',signIn:'Зарегистрироваться или войти',accountNeeded:'Зарегистрируйтесь или войдите, чтобы сохранять свои материалы между устройствами.',progressLead:'Ваши ответы, прочитанные главы и следующий шаг.',progressSyncUnavailable:'Не удалось проверить прогресс на сервере. Показанные данные могут быть устаревшими. Откройте страницу повторно.',progressSyncPartial:'Часть сохранённых результатов повреждена. Показаны только проверенные результаты; общий прогресс может быть неполным.',tasks:'Правильных ответов в миссии',chapters:'Глав отмечено прочитанными',status:'Состояние маршрута',finished:'Завершён',inProgress:'В процессе',notStarted:'Ещё не начат',continue:'Продолжить',readingHistory:'История чтения',markRead:'Отметить прочитанным',readMarked:'Глава отмечена прочитанной',nothingRead:'Отмечайте прочитанные главы в читальне, чтобы возвращаться к ним.',liveTitle:'Домашние группы',liveLead:'Совместное чтение Библии в вашей церкви, дома или во время онлайн-встречи.',liveSteps:[['Выберите отрывок','Ведущий открывает книгу и главу. Участники читают на платформе или в своей Библии.'],['Обсудите вопросы','Найдите слова, на которых основан ответ, и выслушайте участников.'],['Сохраните прогресс','Ведущий записывает изученную главу, ответы и итог встречи.']],openGroups:'Открыть домашние группы',marathons:'Марафоны',marathonText:'По желанию группа присоединяется к общему маршруту. Группы с одинаковым недельным планом и правилом наверстывания видят прогресс друг друга.',normalText:'Обычные группы читают в своём темпе. Открытый каталог показывает их общий прогресс и точность ответов.',check:'Проверить',correct:'Правильно',retry:'Попробуйте ещё раз',back:'Вернуться',export:'Скачать материалы',import:'Импортировать материалы',
  },
  en: {
    home:'Home',campaigns:'Campaigns',library:'Library',dossiers:'Research dossiers',builder:'Builder',progress:'My progress',campaignLead:'Choose a story or theme. Each campaign brings its material together in connected missions.',campaignNames:['Gospel accounts','Acts and the first communities','People of the Old Testament','Chronology and sequence','Research workshop','People and mercy'],campaignDescriptions:['Events, parables, and imagery in the four Gospels.','People, journeys, and the life of the first Christian communities.','Calling, choices, and faith in Old Testament narratives.','Scripture events in sequence and historical context.','Attentive reading, source comparison, and supported conclusions.','Bible stories about help, responsibility, and care.'],dossierLead:'Passages, questions, and notes gathered around one story.',dossierTitle:'Abraham: from calling to promise',dossierText:'Read Genesis 12:1–3, then Genesis 15:1–6. In the first passage, notice the command to leave and God’s promises. In the second, follow the conversation about an heir and descendants.',dossierQuestions:['What does God ask Abram to do?','What promises appear in the first passage?','What does Abram ask in the second passage?','Which words in the text support your conclusion?'],guiding:'Questions for discussion',read:'Read passage',mission:'Open mission',builderLead:'Prepare a question for personal study or a group gathering.',myMaterials:'My materials',newMaterial:'New question',title:'Title',prompt:'Question',reference:'Bible reference',options:'Answer options, one per line',answer:'Correct answer',explanation:'Explanation',save:'Save',edit:'Edit',test:'Try it',publish:'Publish for visitors',private:'Personal material',public:'Published',empty:'Your materials will appear here.',saved:'Material saved.',error:'Could not save. Check the fields and try again.',signIn:'Register or sign in',accountNeeded:'Register or sign in to keep your materials across devices.',progressLead:'Your answers, completed chapters, and next step.',progressSyncUnavailable:'Could not verify progress with the server. These results may be out of date. Try opening the page again.',progressSyncPartial:'Some saved results are damaged. Only verified results are shown; your overall progress may be incomplete.',tasks:'Correct mission answers',chapters:'Chapters marked as read',status:'Study path status',finished:'Completed',inProgress:'In progress',notStarted:'Not started',continue:'Continue',readingHistory:'Reading history',markRead:'Mark as read',readMarked:'Chapter marked as read',nothingRead:'Mark completed chapters in the reader to return to them later.',liveTitle:'Home groups',liveLead:'Read the Bible together in your church, at home, or during an online gathering.',liveSteps:[['Choose a passage','The facilitator opens a book and chapter. Participants read on the platform or in their own Bible.'],['Discuss the questions','Find the words that support the answer and hear each participant’s thoughts.'],['Save your progress','The facilitator records the chapter, answers, and a short discussion summary.']],openGroups:'Open home groups',marathons:'Marathons',marathonText:'Groups may join a shared study route. Those following the same weekly plan and catch-up rule can see one another’s progress.',normalText:'Regular groups read at their own pace. The open directory shows their overall progress and answer accuracy.',check:'Check answer',correct:'Correct',retry:'Try again',back:'Back',export:'Download materials',import:'Import materials',
  }
};

// Locale inputs may be restored from navigation or legacy account state.
// Inherited Object.prototype members are not real translations.
function ownLocaleCopy(dictionary, lang) {
  return typeof lang === 'string' && Object.hasOwn(dictionary, lang) ? dictionary[lang] : dictionary.uk;
}
export function workspaceCopy(lang) { return ownLocaleCopy(COPY, lang); }

const GROUP_MANAGE={
  uk:{title:'Керування участю',leave:'Вийти з групи',leaveHelp:'Після виходу приватні обговорення групи будуть недоступні. Створені раніше записи зустрічей залишаться в групі.',leaveConfirm:'Вийти з групи?',left:'Ви вийшли з групи.',transferTitle:'Передати власність',transferHelp:'Оберіть учасника, який стане власником. Після передавання ви залишитесь учасником і зможете вийти.',transferLabel:'Новий власник',transfer:'Передати власність',transferConfirm:'Передати власність учаснику: ',transferred:'Власність передано.',noMembers:'Щоб передати власність, спочатку запросіть іншого учасника.',delete:'Видалити групу',deleteHelp:'Буде видалено групу, членство, зустрічі та марафон. Особисті завершені результати залишаться в акаунтах учасників.',deleteConfirm:'Видалити групу разом із зустрічами та марафоном? Цю дію не можна скасувати.',deleted:'Групу видалено.',error:'Не вдалося виконати дію. Перевірте права й повторіть спробу.'},
  ru:{title:'Управление участием',leave:'Выйти из группы',leaveHelp:'После выхода приватные обсуждения группы будут недоступны. Созданные ранее записи встреч останутся в группе.',leaveConfirm:'Выйти из группы?',left:'Вы вышли из группы.',transferTitle:'Передать владение',transferHelp:'Выберите участника, который станет владельцем. После передачи вы останетесь участником и сможете выйти.',transferLabel:'Новый владелец',transfer:'Передать владение',transferConfirm:'Передать владение участнику: ',transferred:'Владение передано.',noMembers:'Чтобы передать владение, сначала пригласите другого участника.',delete:'Удалить группу',deleteHelp:'Группа, участники, встречи и марафон будут удалены. Личные завершённые результаты останутся в аккаунтах участников.',deleteConfirm:'Удалить группу вместе со встречами и марафоном? Это действие нельзя отменить.',deleted:'Группа удалена.',error:'Не удалось выполнить действие. Проверьте права и повторите попытку.'},
  en:{title:'Manage membership',leave:'Leave group',leaveHelp:'After leaving, private group discussions will no longer be available. Meeting records already created stay with the group.',leaveConfirm:'Leave this group?',left:'You left the group.',transferTitle:'Transfer ownership',transferHelp:'Choose a member to become the owner. After the transfer you remain a member and can leave.',transferLabel:'New owner',transfer:'Transfer ownership',transferConfirm:'Transfer ownership to: ',transferred:'Ownership transferred.',noMembers:'Invite another member before transferring ownership.',delete:'Delete group',deleteHelp:'The group, memberships, meetings and marathon will be deleted. Members keep their completed personal results.',deleteConfirm:'Delete the group, its meetings and marathon? This cannot be undone.',deleted:'Group deleted.',error:'The action could not be completed. Check your permissions and try again.'},
};
const GROUP_ROLES={
  uk:{roles:'Ведучі групи',roleHelp:'Ведучий може зберігати зустрічі й проходити групові місії. Звичайний учасник зберігає доступ до обговорень.',promote:'Призначити ведучим',demote:'Зняти роль ведучого',roleConfirm:'Змінити роль учасника: ',roleSaved:'Роль оновлено.',rotate:'Замінити код запрошення',rotateHelp:'Старий код припинить діяти. Чинні учасники залишаться в групі; передайте новий код тим, кого запрошуєте.',rotateConfirm:'Замінити код запрошення? Старий код більше не дозволятиме вступити до групи.',rotated:'Код запрошення замінено. Новий код показано на сторінці.'},
  ru:{roles:'Ведущие группы',roleHelp:'Ведущий может сохранять встречи и проходить групповые миссии. Обычный участник сохраняет доступ к обсуждениям.',promote:'Назначить ведущим',demote:'Снять роль ведущего',roleConfirm:'Изменить роль участника: ',roleSaved:'Роль обновлена.',rotate:'Заменить код приглашения',rotateHelp:'Старый код перестанет действовать. Участники останутся в группе; передайте новый код тем, кого приглашаете.',rotateConfirm:'Заменить код приглашения? Старый код больше не позволит вступить в группу.',rotated:'Код приглашения заменён. Новый код показан на странице.'},
  en:{roles:'Group facilitators',roleHelp:'Facilitators can record meetings and take group missions. Ordinary members keep access to discussions.',promote:'Make facilitator',demote:'Remove facilitator role',roleConfirm:'Change the role for: ',roleSaved:'Role updated.',rotate:'Replace invitation code',rotateHelp:'The old code will stop working. Current members stay in the group; share the new code with people you invite.',rotateConfirm:'Replace the invitation code? The old code will no longer allow anyone to join.',rotated:'Invitation code replaced. The new code is shown on the page.'},
};
const GROUP_SETTINGS={
  uk:{settings:'Налаштування групи',name:'Назва',church:'Громада або церква',country:'Країна',city:'Місто',description:'Опис',visibility:'Видимість групи',public:'Публічна',private:'Приватна',roster:'Список учасників',count:'Лише кількість',names:'Імена учасників, які дали згоду',hidden:'Прихований',saveSettings:'Зберегти налаштування',settingsSaved:'Налаштування групи збережено.',settingsHelp:'У публічній групі назва, опис, місце й загальні підсумки доступні відвідувачам. Приватні обговорення бачать лише учасники.',publishConfirm:'Зробити групу публічною? Її опис, місце й загальні підсумки стануть доступні відвідувачам.',settingsConflict:'Налаштування вже змінилися або ваші права змінилися. Ваш текст залишився у формі. Скопіюйте потрібні зміни перед оновленням сторінки.',settingsUnconfirmed:'Не вдалося підтвердити збереження. Ваш текст залишився у формі. Оновіть дані перед повторною спробою.',reloadSettings:'Завантажити поточні дані',reloadConfirm:'Завантажити поточні дані групи? Незбережений текст цієї форми буде втрачено.'},
  ru:{settings:'Настройки группы',name:'Название',church:'Община или церковь',country:'Страна',city:'Город',description:'Описание',visibility:'Видимость группы',public:'Публичная',private:'Приватная',roster:'Список участников',count:'Только количество',names:'Имена участников, давших согласие',hidden:'Скрытый',saveSettings:'Сохранить настройки',settingsSaved:'Настройки группы сохранены.',settingsHelp:'В публичной группе название, описание, место и общие итоги доступны посетителям. Приватные обсуждения видны только участникам.',publishConfirm:'Сделать группу публичной? Её описание, место и общие итоги станут доступны посетителям.',settingsConflict:'Настройки или ваши права уже изменились. Ваш текст остался в форме. Скопируйте нужные изменения перед обновлением страницы.',settingsUnconfirmed:'Не удалось подтвердить сохранение. Ваш текст остался в форме. Обновите данные перед повторной попыткой.',reloadSettings:'Загрузить текущие данные',reloadConfirm:'Загрузить текущие данные группы? Несохранённый текст этой формы будет потерян.'},
  en:{settings:'Group settings',name:'Name',church:'Community or church',country:'Country',city:'City',description:'Description',visibility:'Group visibility',public:'Public',private:'Private',roster:'Member list',count:'Count only',names:'Names of members who consented',hidden:'Hidden',saveSettings:'Save settings',settingsSaved:'Group settings saved.',settingsHelp:'For public groups, the name, description, location and aggregate results are visible to visitors. Private discussions remain available only to members.',publishConfirm:'Make this group public? Its description, location and aggregate results will become visible to visitors.',settingsConflict:'The settings or your permissions have changed. Your text remains in the form. Copy any changes you want to keep before reloading.',settingsUnconfirmed:'Saving could not be confirmed. Your text remains in the form. Reload the current data before trying again.',reloadSettings:'Load current data',reloadConfirm:'Load current group data? Unsaved text in this form will be lost.'},
};
export function groupSettingsMarkup(group,w,esc){
  if(!group)return '';
  const input=(key,max,required=false)=>`<label class="account-field"><span>${w[key]}</span><input name="${key}" maxlength="${max}" value="${esc(group[key]??'')}" ${required?'required':''}></label>`;
  const select=(key,label,options)=>`<label class="account-field"><span>${label}</span><select name="${key}">${options.map(([value,text])=>`<option value="${value}"${group[key]===value?' selected':''}>${text}</option>`).join('')}</select></label>`;
  return `<details class="card"><summary id="group-settings-summary">${w.settings}</summary><p>${w.settingsHelp}</p><form id="group-settings-form" class="account-form account-form-grid">${input('name',100,true)}${input('church',160)}${input('country',80)}${input('city',80)}<label class="account-field full"><span>${w.description}</span><textarea name="description" maxlength="600" rows="4">${esc(group.description??'')}</textarea></label>${select('visibility',w.visibility,[['private',w.private],['public',w.public]])}${select('rosterVisibility',w.roster,[['private',w.hidden],['count',w.count],['names',w.names]])}<button class="button primary" type="submit">${w.saveSettings}</button><button class="button" type="button" id="reload-group-settings">${w.reloadSettings}</button><p id="group-settings-status" role="status" aria-live="polite"></p></form></details>`;
}
const GROUP_NAME_COPY={
  uk:{namePrivacy:'Моє ім’я у групі',namePrivacyHelp:'Показувати моє ім’я відвідувачам, якщо власник увімкне публічний список учасників. Власник групи бачить ваше ім’я для керування участю навіть без цієї згоди.',namePrivacyLabel:'Дозволяю показувати моє ім’я у публічному списку',namePrivacySave:'Зберегти вибір',namePrivacyLoading:'Завантаження поточного вибору…',namePrivacySaved:'Вибір збережено.',namePrivacyError:'Не вдалося підтвердити поточний вибір. Завантажте дані ще раз перед збереженням.',namePrivacyConflict:'Вибір або членство вже змінилися. Завантажте поточні дані.',namePrivacyReload:'Завантажити поточний вибір'},
  ru:{namePrivacy:'Моё имя в группе',namePrivacyHelp:'Показывать моё имя посетителям, если владелец включит публичный список участников. Владелец группы видит ваше имя для управления участием даже без этого согласия.',namePrivacyLabel:'Разрешаю показывать моё имя в публичном списке',namePrivacySave:'Сохранить выбор',namePrivacyLoading:'Загрузка текущего выбора…',namePrivacySaved:'Выбор сохранён.',namePrivacyError:'Не удалось подтвердить текущий выбор. Загрузите данные ещё раз перед сохранением.',namePrivacyConflict:'Выбор или членство уже изменились. Загрузите текущие данные.',namePrivacyReload:'Загрузить текущий выбор'},
  en:{namePrivacy:'My name in this group',namePrivacyHelp:'Show my name to visitors if the owner enables the public member list. The group owner can still see your name to manage membership without this permission.',namePrivacyLabel:'Allow my name in the public member list',namePrivacySave:'Save choice',namePrivacyLoading:'Loading your current choice…',namePrivacySaved:'Choice saved.',namePrivacyError:'Your current choice could not be confirmed. Reload it before saving.',namePrivacyConflict:'Your choice or membership has changed. Reload the current data.',namePrivacyReload:'Load current choice'},
};
function groupNamePrivacyMarkup(w){
  return `<section class="card"><h2>${w.namePrivacy}</h2><p>${w.namePrivacyHelp}</p><form id="group-name-privacy-form" class="account-form"><label class="account-check"><input name="publicName" type="checkbox" disabled><span>${w.namePrivacyLabel}</span></label><button class="button" type="submit" disabled>${w.namePrivacySave}</button><button class="button" type="button" data-reload-name>${w.namePrivacyReload}</button><p role="status" data-name-status>${w.namePrivacyLoading}</p></form></section>`;
}
export function mountGroupNamePrivacy(form,{request,groupId,copy,isCurrent,onSaved}){
  const checkbox=form.querySelector('[name="publicName"]'),save=form.querySelector('[type="submit"]'),reload=form.querySelector('[data-reload-name]'),status=form.querySelector('[data-name-status]');
  let expected=null,busy=false;
  const current=()=>form.isConnected!==false&&isCurrent();
  function controls(){if(!current())return;checkbox.disabled=busy||expected===null;save.disabled=busy||expected===null;reload.disabled=busy;}
  async function load(){
    if(busy||!current())return;
    const doc=form.ownerDocument,restore=doc?.activeElement===reload;
    busy=true;expected=null;controls();status.textContent=copy.namePrivacyLoading;
    try {
      const result=await request('name-visibility','GET',undefined,`groupId=${encodeURIComponent(groupId)}`);
      if(!current())return;
      if(typeof result?.publicName!=='boolean')throw Error('unconfirmed');
      expected=result.publicName;checkbox.checked=expected;status.textContent='';
    } catch {if(current())status.textContent=copy.namePrivacyError;}
    finally {
      busy=false;controls();
      if(restore&&current()&&(doc.activeElement===reload||doc.activeElement===doc.body))reload.focus({preventScroll:true});
    }
  }
  form.onsubmit=async event=>{
    event.preventDefault();
    if(busy||expected===null||!current())return;
    const chosen=checkbox.checked,doc=form.ownerDocument,restore=doc?.activeElement===save;
    busy=true;controls();status.textContent='';
    try {
      const result=await request('name-visibility','POST',{groupId,publicName:chosen,expectedPublicName:expected});
      if(!current())return;
      if(result?.ok!==true||result.publicName!==chosen)throw Error('unconfirmed');
      expected=chosen;
      await onSaved?.();
      if(current())status.textContent=copy.namePrivacySaved;
    } catch(error) {
      if(current()) {expected=null;status.textContent=error.message==='name_visibility_changed_or_membership_missing'?copy.namePrivacyConflict:copy.namePrivacyError;}
    } finally {
      busy=false;controls();
      if(restore&&current()&&(doc.activeElement===save||doc.activeElement===doc.body))(save.disabled?reload:save).focus({preventScroll:true});
    }
  };
  reload.onclick=load;
  return {ready:load()};
}
export function groupManagementCopy(lang){return {...ownLocaleCopy(GROUP_MANAGE,lang),...ownLocaleCopy(GROUP_ROLES,lang),...ownLocaleCopy(GROUP_SETTINGS,lang),...ownLocaleCopy(GROUP_NAME_COPY,lang)};}
export function groupManagementMarkup(data,lang,esc){
  const w=groupManagementCopy(lang);
  if(!data.membership)return '';
  if(data.membership!=='owner')return `${groupNamePrivacyMarkup(w)}<section class="card"><h2>${w.title}</h2><p>${w.leaveHelp}</p><button class="button" id="leave-group">${w.leave}</button><p id="group-manage-status" role="status"></p></section>`;
  const candidates=(data.managementMembers||[]).filter(member=>['member','facilitator'].includes(member.role));
  const transfer=candidates.length?`<form id="transfer-group" class="account-form"><label class="account-field"><span>${w.transferLabel}</span><select name="targetUserId" required>${candidates.map(member=>`<option value="${esc(member.user_id)}">${esc(member.display_name)}</option>`).join('')}</select></label><button class="button">${w.transfer}</button></form>`:`<p>${w.noMembers}</p>`;
  const roles=candidates.length?`<h3>${w.roles}</h3><p>${w.roleHelp}</p><ul>${candidates.map(member=>`<li><strong>${esc(member.display_name)}</strong> <button type="button" class="button group-role-button" data-user-id="${esc(member.user_id)}" data-role="${esc(member.role)}" aria-label="${esc((member.role==='facilitator'?w.demote:w.promote)+': '+member.display_name)}">${member.role==='facilitator'?w.demote:w.promote}</button></li>`).join('')}</ul>`:'';
  return `${groupNamePrivacyMarkup(w)}${groupSettingsMarkup(data.group,w,esc)}<section class="card"><h2>${w.title}</h2><h3>${w.transferTitle}</h3><p>${w.transferHelp}</p>${transfer}${roles}<h3>${w.rotate}</h3><p>${w.rotateHelp}</p><button type="button" class="button" id="rotate-group-invite">${w.rotate}</button><details class="danger-zone"><summary>${w.delete}</summary><p>${w.deleteHelp}</p><button class="button" id="delete-group">${w.delete}</button></details><p id="group-manage-status" role="status"></p></section>`;
}

const HISTORY = {
  uk: { title:'Історія спроб', login:'Увійдіть, щоб бачити збережену історію спроб на інших пристроях.', empty:'Завершених спроб поки немає.', locked:'Історія прихована під час активної спроби.', error:'Не вдалося завантажити історію спроб.', retry:'Спробувати ще раз', details:'Переглянути результат', reread:'Перечитати й повторити', limit:'Показано останні 100 завершених спроб.', score:'Правильних відповідей', pending:'Є відповідь, збереження результату якої потрібно завершити.', resume:'Завершити збереження результату', personal:'Особиста спроба', group:'Групова спроба' },
  ru: { title:'История попыток', login:'Войдите, чтобы видеть сохранённую историю попыток на других устройствах.', empty:'Завершённых попыток пока нет.', locked:'История скрыта во время активной попытки.', error:'Не удалось загрузить историю попыток.', retry:'Попробовать снова', details:'Посмотреть результат', reread:'Перечитать и повторить', limit:'Показаны последние 100 завершённых попыток.', score:'Правильных ответов', pending:'Для сохранённого ответа нужно завершить запись результата.', resume:'Завершить сохранение результата', personal:'Личная попытка', group:'Групповая попытка' },
  en: { title:'Attempt history', login:'Sign in to see saved attempt history on other devices.', empty:'There are no completed attempts yet.', locked:'History is hidden during an active attempt.', error:'Could not load attempt history.', retry:'Try again', details:'View result', reread:'Read and try again', limit:'Showing the latest 100 completed attempts.', score:'Correct answers', pending:'An answer was saved, but its result still needs to be finalized.', resume:'Finish saving the result', personal:'Personal attempt', group:'Group attempt' },
};

function canonicalHistoryUtcTimestamp(value) {
  // SQLite/D1 history timestamps are canonical UTC seconds, never a local
  // calendar guess. Date parsing alone normalizes impossible dates silently.
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) return false;
  const date = new Date(value.replace(' ', 'T') + 'Z');
  return Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 19).replace('T', ' ') === value;
}

function validAttemptHistoryPayload(history, chapterBounds) {
  // Source readback may include legacy/corrupt DB rows. With a real catalog,
  // refuse invented books and chapters rather than building false reader links.
  if (chapterBounds !== undefined &&
      (!(chapterBounds instanceof Map) || chapterBounds.size !== 66)) return false;
  if (!Array.isArray(history?.attempts) || history.attempts.length > 100 ||
      (history.pending !== undefined &&
       (!Array.isArray(history.pending) || history.pending.length > 20))) return false;
  // A fulfilled HTTP response is not evidence that its rows are valid.
  // Never turn malformed history into "no attempts" or broken navigation.
  const safeId = id => {
    if (typeof id !== 'string' || !id || id.length > 80) return false;
    try { encodeURIComponent(id); return true; } catch { return false; }
  };
  // A single historical attempt must never appear twice as two completions,
  // or be both finalized and pending in the same private API receipt.
  const allRows = history.attempts.concat(history.pending || []);
  if (new Set(allRows.map(row => row?.id)).size !== allRows.length) return false;
  const safeChapter = row =>
    row && typeof row === 'object' && !Array.isArray(row) &&
    typeof row.book === 'string' && /^([1-3])?[A-Z]{2,3}$/.test(row.book) &&
    Number.isInteger(row.chapter) && row.chapter >= 1 && row.chapter <= 151 &&
    safeId(row.id) &&
    (chapterBounds === undefined || row.chapter <= (chapterBounds.get(row.book) || 0));
  return history.attempts.every(row =>
    safeChapter(row) && Number.isInteger(row.score) && Number.isInteger(row.total) &&
    row.total >= 1 && row.score >= 0 && row.score <= row.total &&
    (row.mode === undefined || row.mode === 'personal' || row.mode === 'group') &&
    (row.completedAt === undefined || canonicalHistoryUtcTimestamp(row.completedAt))) &&
    (history.pending === undefined || history.pending.every(row =>
      safeChapter(row) && (row.startedAt === undefined || canonicalHistoryUtcTimestamp(row.startedAt))));
}

export function missionHistoryMarkup(history, lang, esc, chapterBounds) {
  const w=ownLocaleCopy(HISTORY,lang);
  let content;
  if(history.guest) content=`<p>${w.login}</p>`;
  else if(history.error) content=`<p role="status">${w.error}</p><button class="button" id="retry-mission-history">${w.retry}</button>`;
  else if(history.locked) content=`<p>${w.locked}</p>`;
  else if(!validAttemptHistoryPayload(history,chapterBounds)) content=`<p role="status">${w.error}</p><button class="button" id="retry-mission-history">${w.retry}</button>`;
  else if(!history.attempts.length) content=`<p>${w.empty}</p>`;
  else content=`<p>${w.limit}</p><ol>${history.attempts.map(item=>`<li><p>${esc(item.book)} ${Number(item.chapter)} — ${item.mode==='group'?w.group:w.personal}; ${w.score}: ${Number(item.score)} / ${Number(item.total)}; ${esc(item.completedAt || '')} UTC</p><div class="action-row"><a class="button" href="/mission/attempt/${encodeURIComponent(item.id)}">${w.details}: ${esc(item.book)} ${Number(item.chapter)} — ${esc(item.completedAt || '')} UTC</a>${Number(item.score)<Number(item.total)?`<a class="button" href="/reader/${encodeURIComponent(item.book)}/${Number(item.chapter)}">${w.reread}: ${esc(item.book)} ${Number(item.chapter)}</a>`:''}</div></li>`).join('')}</ol>`;
  const pending=!history.guest&&!history.error&&!history.locked&&validAttemptHistoryPayload(history,chapterBounds)&&history.pending?.length?`<p>${w.pending}</p><ul>${history.pending.map(item=>`<li><a class="button" href="/mission/attempt/${encodeURIComponent(item.id)}">${w.resume}: ${esc(item.book)} ${Number(item.chapter)} — ${esc(item.startedAt || '')} UTC</a></li>`).join('')}</ul>`:'';
  return `<section class="card resume-card"><h2>${w.title}</h2>${pending}${content}</section>`;
}

// A small, deterministic reading suggestion, not an estimate of mastery.
// History is supplied newest-started-first by the server and capped at 100.
export function reviewSuggestions(attempts, now=new Date(), chapterBounds) {
  if(!Array.isArray(attempts)||!(now instanceof Date)||!Number.isFinite(now.getTime()) ||
     (chapterBounds !== undefined && (!(chapterBounds instanceof Map) || chapterBounds.size !== 66)))return [];
  const passages=new Map(),invalid=new Set(),attemptIdOwners=new Map(),intervals=[1,3,7,14];
  for(const item of [...attempts].reverse()) {
    if(item?.mode!=='personal'||typeof item.book!=='string'||!/^([1-3])?[A-Z]{2,3}$/.test(item.book)||!Number.isInteger(item.chapter)||item.chapter<1||item.chapter>151||
       (chapterBounds !== undefined && item.chapter > (chapterBounds.get(item.book) || 0)))continue;
    const key=`${item.book}:${item.chapter}`;
    // Do not count a duplicated completion as a new spaced-repetition step.
    // Mark both passages untrusted if a stored ID conflicts across passages.
    if(typeof item.id!=='string'||!item.id||item.id.length>80){invalid.add(key);continue;}
    const earlier=attemptIdOwners.get(item.id);
    if(earlier!==undefined){invalid.add(earlier);invalid.add(key);continue;}
    attemptIdOwners.set(item.id,key);
    if(!Number.isInteger(item.score)||!Number.isInteger(item.total)||item.total<1||item.score<0||item.score>item.total||typeof item.completedAt!=='string'||!/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(item.completedAt)) {invalid.add(key);continue;}
    const completed=new Date(item.completedAt.replace(' ','T')+'Z');
    if(!Number.isFinite(completed.getTime())||completed.toISOString().slice(0,10)!==item.completedAt.slice(0,10)){invalid.add(key);continue;}
    const previous=passages.get(key),streak=item.score===item.total?(previous?.streak||0)+1:0;
    const interval=intervals[Math.max(0,Math.min(streak-1,intervals.length-1))];
    const dueAt=new Date(Date.parse(item.completedAt.slice(0,10)+'T00:00:00Z')+interval*86400000).toISOString().slice(0,10);
    passages.set(key,{book:item.book,chapter:item.chapter,streak,dueAt});
  }
  const today=now.toISOString().slice(0,10);
  return [...passages.entries()].filter(([key])=>!invalid.has(key)).map(([,item])=>({...item,due:item.dueAt<=today})).sort((a,b)=>a.dueAt<b.dueAt?-1:a.dueAt>b.dueAt?1:a.book<b.book?-1:a.book>b.book?1:a.chapter-b.chapter);
}

const REVIEW_COPY={
  uk:{title:'Пропозиції для повторення',description:'На основі останніх 100 завершених спроб. Враховуються лише особисті спроби; це нагадування, а не оцінка засвоєння.',empty:'Завершіть особисту спробу, щоб отримати пропозиції.',due:'Можна повторити зараз',later:'Заплановано з',open:'Перечитати главу'},
  ru:{title:'Предложения для повторения',description:'На основе последних 100 завершённых попыток. Учитываются только личные попытки; это напоминание, а не оценка усвоения.',empty:'Завершите личную попытку, чтобы получить предложения.',due:'Можно повторить сейчас',later:'Запланировано с',open:'Перечитать главу'},
  en:{title:'Suggested review',description:'Based on the latest 100 completed attempts. Only personal attempts count; these are reminders, not a measure of mastery.',empty:'Complete a personal attempt to receive suggestions.',due:'Ready to review',later:'Suggested from',open:'Read the chapter again'},
};
export function reviewScheduleMarkup(history,lang,esc,now=new Date(),chapterBounds) {
  if(history.guest||history.error||history.locked||!validAttemptHistoryPayload(history,chapterBounds))return '';
  const w=ownLocaleCopy(REVIEW_COPY,lang),suggestions=reviewSuggestions(history.attempts,now,chapterBounds);
  return `<section class="card resume-card"><h2>${w.title}</h2><p>${w.description}</p>${suggestions.length?`<ol>${suggestions.map(item=>`<li><p>${esc(item.book)} ${item.chapter} — ${item.due?w.due:w.later} <time datetime="${item.dueAt}">${item.dueAt}</time> UTC</p><a class="button" href="/reader/${encodeURIComponent(item.book)}/${item.chapter}">${w.open}: ${esc(item.book)} ${item.chapter}</a></li>`).join('')}</ol>`:`<p>${w.empty}</p>`}</section>`;
}

const EDITION_ABOUT = {
  uk: {title:'Біблійні видання',intro:'Видання збережено окремо. Назва перекладу залишається поруч із текстом.',local:'Видання для читання на платформі',external:'Інші видання',externalText:'Хоменка, Турконяка та інші видання можна відкрити на сайтах їхніх видавців із читальні.',source:'Джерело',license:'Умови використання',missing:'Відомості про це видання недоступні.'},
  ru: {title:'Библейские издания',intro:'Издания хранятся отдельно. Название перевода остаётся рядом с текстом.',local:'Издания для чтения на платформе',external:'Другие издания',externalText:'Переводы Хоменко, Турконяка и другие издания можно открыть на сайтах их издателей из читальни.',source:'Источник',license:'Условия использования',missing:'Сведения об этом издании недоступны.'},
  en: {title:'Bible editions',intro:'Editions are stored separately. The translation name stays beside the text.',local:'Editions available on the platform',external:'Other editions',externalText:'Khomenko, Turkoniak and other editions can be opened on their publishers’ websites from the reader.',source:'Source',license:'Terms of use',missing:'Details for this edition are unavailable.'},
};
// Reuse the identical raw-URL provenance authority as the live parallel reader.

export function editionAboutMarkup(catalog,lang,esc) {
  const w=ownLocaleCopy(EDITION_ABOUT,lang);
  const editions=[catalog?.translations?.['uk-ohiienko'],catalog?.editions?.uk,catalog?.editions?.ru,catalog?.editions?.en];
  const entries=editions.map(edition=>{
    // An about-page rights claim must pass the same visibility predicate as
    // the Bible reader; each independently safe source URL remains available.
    if(!edition||!validEditionRightsText(edition.title,512)||!edition.title.trim())return `<li>${w.missing}</li>`;
    const source=safeProvenanceHttpsUrl(edition.source),license=safeProvenanceHttpsUrl(edition.licenseUrl);
    const rights=validEditionRightsText(edition.license,4096)&&edition.license.trim()?edition.license:w.missing;
    const attribution=validEditionRightsText(edition.attribution,4096)?edition.attribution:'';
    const formatting=validEditionRightsText(edition.formatting,4096)?edition.formatting:'';
    return `<li><strong>${esc(edition.title)}</strong> — ${esc(rights)}${source?` · <a href="${esc(source)}" rel="noreferrer">${w.source}</a>`:''}${license?` · <a href="${esc(license)}" rel="noreferrer">${w.license}</a>`:''}${attribution?`<p>${esc(attribution)}</p>`:''}${formatting?`<p>${esc(formatting)}</p>`:''}</li>`;
  }).join('');
  return `<h2>${w.title}</h2><p>${w.intro}</p><h3>${w.local}</h3><ul>${entries}</ul><h3>${w.external}</h3><p>${w.externalText}</p>`;
}

async function request(path, options) {
  const response=await fetch(path,options), data=await response.json();
  if(!response.ok) throw Error(data.error || response.status);
  return data;
}

let workspaceRenderEpoch = 0;
let privateWorkspaceSuspended=false;

// Private builder/progress content and principal-scoped Academy markers may
// re-enter only after the authoritative account session is re-read. Invalidate
// active and newly initiated hidden-page calls.
export function retirePrivateWorkspaceOnPageHide() {
  workspaceRenderEpoch++;
  privateWorkspaceSuspended=true;
}
export function resumePrivateWorkspaceAfterSession() {
  privateWorkspaceSuspended=false;
}

export async function renderWorkspace(name,c) {
  if((name==='builder' || name==='progress' || name==='campaigns') && privateWorkspaceSuspended)return;
  const {state,t,esc,shell,getMission,setActiveNav}=c, w=workspaceCopy(state.lang);
  const epoch=++workspaceRenderEpoch, principal=state.user;
  const path=globalThis.location?.pathname, search=globalThis.location?.search, hash=globalThis.location?.hash;
  // Unlike the render epoch, the principal/route identity survives a legitimate
  // builder redraw. Late messages must still be suppressed after navigation.
  const samePrincipalRoute=()=>state.user===principal && !state.sessionUnavailable &&
    globalThis.location?.pathname===path && globalThis.location?.search===search &&
    globalThis.location?.hash===hash;
  const stillCurrent=()=>epoch===workspaceRenderEpoch && samePrincipalRoute() &&
    !((name==='builder' || name==='progress' || name==='campaigns') && privateWorkspaceSuspended);
  setActiveNav(name);
  if(name==='about') {
    const catalog=await c.getCatalog();
    if(!stillCurrent())return;
    shell(`<article class="prose"><p class="eyebrow">Scripture Archive</p><h1>${t('aboutTitle')}</h1><p class="lead">${t('aboutBody')}</p>${editionAboutMarkup(catalog,state.lang,esc)}<h2>${t('accessTitle')}</h2><p>${t('accessBody')}</p></article>`);
    return;
  }
  if(name==='library') {
    const copy=LIBRARY_COPY[state.lang] || LIBRARY_COPY.uk;
    shell(`<section class="reviewed-library" aria-labelledby="reviewed-library-title"><div class="section-head"><div><p class="eyebrow">Scripture Archive</p><h1 id="reviewed-library-title">${esc(copy.title)}</h1></div></div><p class="lead">${esc(copy.lead)}</p><p>${esc(copy.scope)}</p><div id="public-materials"></div><p><a href="/builder">${esc(reviewText(state.lang).builder)}</a></p></section>`);
    // Reuse the canonical reviewed-material list and answer-check API: no
    // shadow library database or second publication/identity authority.
    const list=globalThis.document?.querySelector('#public-materials');
    if(list)await renderReviewedLibrary(list,reviewText(state.lang),state.lang,esc,stillCurrent);
    return;
  }
  if(name==='campaigns') {
    const [mission,catalog]=await Promise.all([getMission(),c.getCatalog()]);
    if(!stillCurrent())return;
    // Self-reported course markers must remain explicitly device-local and
    // principal-scoped; never present them as server-confirmed credentials.
    let storage=null;
    try { storage=globalThis.localStorage; } catch {}
    const courseProgress=readAcademyProgress(storage,academyProgressKey(state.user));
    shell(`<div class="section-head"><div><p class="eyebrow">Scripture Archive</p><h1>${w.campaigns}</h1></div><p>${w.campaignLead}</p></div><div class="card-grid campaign-grid">${w.campaignNames.map((title,i)=>`<article class="card campaign-card ${i===2?'featured':''}"><span class="path-number">${String(i+1).padStart(2,'0')}</span><h2>${title}</h2><p>${w.campaignDescriptions[i]}</p>${i===2?`<p>${esc((mission.title?.[state.lang]||t("missionTitle")))}</p><a class="button primary" href="/missions">${t('open')}</a>`:`<span class="status soon">${t('comingSoon')}</span>`}</article>`).join('')}</div>${academyMarkup(catalog,state.lang,esc,courseProgress)}`);
    const coursePrincipal=state.user?.id??null;
    attachAcademy(globalThis.document,storage,state.lang,state.user,courseProgress,
      ()=>!state.sessionUnavailable&&(state.user?.id??null)===coursePrincipal);
    return;
  }
  if(name==='dossiers') {
    const catalog=await c.getCatalog();
    if(!stillCurrent())return;
    const selectedId=new URLSearchParams(globalThis.location?.search || '').get('id');
    const searchQuery=new URLSearchParams(globalThis.location?.search || '').get('q') || '';
    const compareId=new URLSearchParams(globalThis.location?.search || '').get('compare');
    shell(`<div class="section-head"><div><p class="eyebrow">Scripture Archive</p><h1>${esc(w.dossiers)}</h1></div><p>${esc(w.dossierLead)}</p></div>${dossierMarkup(catalog,state.lang,selectedId,esc,searchQuery,compareId)}${dossierAtlasMarkup(catalog,state.lang,esc)}`);
    return;
  }
  if(name==='live') {
    shell(`<article class="live-lab"><section class="lab-hero"><p class="eyebrow">Scripture Archive</p><h1>${w.liveTitle}</h1><p class="lead">${w.liveLead}</p><a class="button primary" href="/groups">${w.openGroups}</a></section><div class="lab-flow">${w.liveSteps.map(([title,text],i)=>`<article class="lab-step"><span class="lab-step-number">${i+1}</span><h2>${title}</h2><p>${text}</p></article>`).join('')}</div><div class="lab-columns"><section class="lab-card"><h2>${t('groups')}</h2><p>${w.normalText}</p></section><section class="lab-card"><h2>${w.marathons}</h2><p>${w.marathonText}</p></section></div></article>`);
    return;
  }
  if(name==='progress') {
    // An unresolved ownership or failed cache wipe must not expose another
    // principal's local reading on the current account's progress page.
    const mission=await getMission();
    const taskCount=Number(mission.taskCount||0);
    const syncWarning=state.progressSyncStatus==='partial'?w.progressSyncPartial:state.progressSyncStatus==='unavailable'?w.progressSyncUnavailable:'';
    let history={guest:true};
    if(state.user) try { history=await request('/api/attempts?action=history'); } catch { history={error:true}; }
    // A late history read belongs to its original route and account only.
    if(!stillCurrent())return;
    // The account API validates chapters against the existing canonical Bible
    // catalog and its approved edition-specific divisions. Local cache rows
    // cannot authorize fabricated book links or impossible chapter counts.
    let chapterBounds=null;
    try { chapterBounds=canonicalReadingChapterBounds(await c.getCatalog()); }
    catch { /* source unavailable: no fake progress; warn the reader */ }
    if(!stillCurrent())return;
    const p=state.missionProgress;
    let read=[];
    if (chapterBounds && !state.localReadingStorageUntrusted && !state.unownedReadingPendingRecovery) {
      try { read=verifiedLocalReadingHistory(c.loadJSON('sa.readingHistory',[]),chapterBounds); }
      catch { /* restricted storage must not block the progress page */ }
    }
    const readingCatalogWarning={
      uk:'Не вдалося перевірити біблійний каталог. Локальну історію читання тимчасово не показано.',
      ru:'Не удалось проверить библейский каталог. Локальная история чтения временно скрыта.',
      en:'The Bible catalog could not be verified. Local reading history is temporarily hidden.',
    }[state.lang] || 'The Bible catalog could not be verified.';
    shell(`<div class="section-head"><div><p class="eyebrow">Scripture Archive</p><h1>${w.progress}</h1></div><p>${w.progressLead}</p></div>${syncWarning?`<p role="alert">${esc(syncWarning)}</p>`:''}<div class="card-grid"><article class="card progress-stat"><strong>${p.correct.length} / ${taskCount}</strong><p>${w.tasks}</p></article><article class="card progress-stat"><strong>${chapterBounds ? read.length : '—'}</strong><p>${w.chapters}</p></article><article class="card progress-stat"><strong>${p.complete?w.finished:p.index?w.inProgress:w.notStarted}</strong><p>${w.status}</p></article></div><section class="card resume-card"><h2>${esc((mission.title?.[state.lang]||t("missionTitle")))}</h2><progress aria-label="${w.tasks}" max="${taskCount||1}" value="${p.correct.length}"></progress><div class="action-row"><a class="button primary" href="/mission/abraham">${w.continue}</a><a class="button" href="/groups">${t('myGroups')}</a></div></section>${reviewScheduleMarkup(history,state.lang,esc,new Date(),chapterBounds)}${missionHistoryMarkup(history,state.lang,esc,chapterBounds)}<section class="card resume-card"><h2>${w.readingHistory}</h2>${read.length?`<div class="reading-links">${read.slice().reverse().map(r=>`<a class="button" href="/reader/${encodeURIComponent(r.book)}/${Number(r.chapter)}">${esc(r.title)} ${Number(r.chapter)}</a>`).join('')}</div>`:`<p>${chapterBounds ? w.nothingRead : esc(readingCatalogWarning)}</p>`}</section>`);
    document.querySelector('#retry-mission-history')?.addEventListener('click',()=>renderWorkspace('progress',c));
    return;
  }
  if(name==='builder') {
    const review = reviewText(state.lang);
    if(!state.user) { shell(`<section class="gate-panel"><h1>${w.builder}</h1><p class="lead">${w.accountNeeded}</p><a class="button primary" href="/account">${w.signIn}</a></section><section class="card" id="public-materials" aria-live="polite"></section>`); await renderPublicMaterials(document.querySelector('#public-materials'),review,esc,stillCurrent); return; }
    const role=await request('/api/editor-roles?view=me');
    if(!stillCurrent())return;
    const [data,reviews,roles,roleAudit]=await Promise.all([request('/api/materials?mine=1'),loadReviewData(role.editor),role.owner?request('/api/editor-roles'):Promise.resolve({editors:[]}),role.owner?request('/api/editor-roles?view=audit'):Promise.resolve({events:[]})]);
    if(!stillCurrent())return;
    let editing=null;
    const refreshBuilder=()=>stillCurrent()?renderWorkspace('builder',c):Promise.resolve();
    const announceBuilder=message=>{if(samePrincipalRoute())c.announce(message);};
    // The next builder render invalidates this one's epoch. Save the new epoch
    // and do not announce after a newer view has superseded that refresh.
    const refreshMutation=async message=>{
      if(!stillCurrent())return;
      const refresh=renderWorkspace('builder',c);
      const refreshedEpoch=workspaceRenderEpoch;
      await refresh;
      if(refreshedEpoch===workspaceRenderEpoch)announceBuilder(message);
    };
    function draw() {
      if(!stillCurrent())return;
      const d=editing?.data||{},form=(key,label,rows)=>`<label class="account-field"><span>${label}</span>${rows?`<textarea name="${key}" rows="${rows}" required>${esc(d[key]||'')}</textarea>`:`<input name="${key}" value="${esc(key==='title'?editing?.title||'':d[key]||'')}" required>`}</label>`;
      shell(`<div class="section-head"><div><p class="eyebrow">Scripture Archive</p><h1>${w.builder}</h1></div><p>${w.builderLead}</p></div><div class="builder-layout"><section class="card"><h2>${editing?w.edit:w.newMaterial}</h2><form id="material-form" class="account-form">${form('title',w.title)}${form('prompt',w.prompt,3)}${form('reference',w.reference)}<label class="account-field"><span>${w.options}</span><textarea name="options" rows="4" required>${esc((d.options||[]).join('\n'))}</textarea></label>${form('answer',w.answer)}${form('explanation',w.explanation,3)}<button class="button primary">${w.save}</button><p id="material-status" role="status"></p></form></section><aside class="card"><h2>${w.myMaterials}</h2><div class="material-list">${data.materials.length?data.materials.map(m=>`<article><span class="status">${m.visibility==='public'?w.public:w.private}</span><h3>${esc(m.title)}</h3><p>${esc(m.data.reference)}</p><div class="action-row"><button class="button" data-edit="${esc(m.id)}">${w.edit}</button><button class="button" data-test="${esc(m.id)}">${w.test}</button><button class="button" data-delete="${esc(m.id)}">${review.remove}</button></div>${submissionForm(m,review,esc)}</article>`).join(''):`<p>${w.empty}</p>`}</div><button class="button" id="new-material">${w.newMaterial}</button> <a class="button" href="/api/materials?mine=1&amp;export=1" download>${w.export}</a></aside></div>${historyMarkup(reviews.mine,review,esc)}${role.editor?queueMarkup(reviews.queue,review,esc)+auditMarkup(reviews.history,review,esc)+'<section class="card" id="editor-public-search"></section>':''}${role.owner?editorRolesMarkup(roles.editors,state.lang,esc,roleAudit.events):''}<section class="card" id="public-materials" aria-live="polite"></section>`);
      attachReviewControls(document.querySelector('main'),review,refreshBuilder,announceBuilder,stillCurrent,samePrincipalRoute);
      if(role.editor) renderEditorialTakedownSearch(document.querySelector('#editor-public-search'),document.querySelector('main'),review,state.lang,esc,refreshBuilder,announceBuilder,stillCurrent,samePrincipalRoute);
      if(role.owner) attachEditorRoles(document.querySelector('main'),state.lang,refreshBuilder,announceBuilder,stillCurrent,samePrincipalRoute);
      void renderPublicMaterials(document.querySelector('#public-materials'),review,esc,stillCurrent);
      document.querySelector('#new-material').onclick=()=>{if(!stillCurrent())return;editing=null;draw()};
      document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{if(!stillCurrent())return;editing=data.materials.find(m=>m.id===b.dataset.edit);draw()});
      document.querySelectorAll('[data-test]').forEach(b=>b.onclick=()=>{if(stillCurrent())test(data.materials.find(m=>m.id===b.dataset.test));});
      document.querySelectorAll('[data-delete]').forEach(button=>button.onclick=async()=>{
        if(!stillCurrent()||button.isConnected===false||!window.confirm(review.confirm))return; button.disabled=true;
        try{await request(`/api/materials?id=${encodeURIComponent(button.dataset.delete)}`,{method:'DELETE'});if(!stillCurrent())return;await refreshMutation(review.removed)}
        catch{if(!stillCurrent())return;document.querySelector('#material-status').textContent=review.error;button.disabled=false}
      });
      document.querySelector('#material-form').onsubmit=async e=>{
        e.preventDefault();if(!stillCurrent()||e.currentTarget?.isConnected===false)return;const f=new FormData(e.currentTarget),payload=Object.fromEntries(f);
        payload.options=payload.options.split(/\r?\n/).map(v=>v.trim()).filter(Boolean);payload.locale=state.lang;if(editing)payload.id=editing.id;
        try{await request('/api/materials',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});if(!stillCurrent())return;await refreshMutation(w.saved)}catch{if(!stillCurrent())return;document.querySelector('#material-status').textContent=w.error}
      };
    }
    function test(m) {
      if(!stillCurrent())return;
      shell(`<article class="card practice-card"><p class="eyebrow">${esc(m.data.reference)}</p><h1>${esc(m.title)}</h1><form id="practice-form"><fieldset class="options"><legend class="question">${esc(m.data.prompt)}</legend>${m.data.options.map((v,i)=>`<label class="option"><input type="radio" name="answer" value="${i}" required><span>${esc(v)}</span></label>`).join('')}</fieldset><button class="button primary">${w.check}</button></form><div id="practice-feedback" role="status"></div><button class="button" id="practice-back">${w.back}</button></article>`);
      document.querySelector('#practice-back').onclick=draw;
      document.querySelector('#practice-form').onsubmit=e=>{e.preventDefault();if(!stillCurrent())return;const index=Number(new FormData(e.currentTarget).get('answer')),ok=m.data.options[index]===m.data.answer;document.querySelector('#practice-feedback').innerHTML=`<div class="notice ${ok?'success':'info'}"><h2>${ok?w.correct:w.retry}</h2>${ok?`<p>${esc(m.data.explanation)}</p>`:''}</div>`;c.play(ok?'ok':'bad')};
    }
    draw();
  }
}
