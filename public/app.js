import {meetingHistoryCopy,meetingHistoryMarkup,meetingRowsMarkup,mountMeetingHistory} from './group-meeting-history.js';
import { parallelControls, mountParallelReader, safeProvenanceHttpsUrl, validEditionRightsMetadata } from './parallel-reader.js';
import {routeSourceFromLocation, legacyRouteHashChanged} from './route-location.js';
import {renderWorkspace, retirePrivateWorkspaceOnPageHide, resumePrivateWorkspaceAfterSession, workspaceCopy, groupManagementCopy, groupManagementMarkup, mountGroupNamePrivacy} from './workspace.js';
import {supportSection} from './support.js';
import {homePage} from './home.js';
import {EDITIONS, editionCopy, selectedEdition, editionUrl, editionSelect, setEditionForTab} from './editions.js';

const I18N = {
  uk: {
    brandSub: "Архів Писання",
    menu: "Меню",
    reader: "Читальня",
    missions: "Місії",
    community: "Спільнота",
    atlas: "Атлас розвитку",
    support: "Підтримати",
    help: "Служба підтримки",
    about: "Про проєкт",
    language: "Мова",
    skipContent: "Перейти до основного вмісту",
    footerLine: "Читання, доказ і відповідальний висновок.",
    sources: "Джерела й права",
    heroEye: "Міжнародна навчально-дослідницька платформа",
    heroTitle: "Читайте. Досліджуйте. Перевіряйте.",
    heroLead:
      "Читайте доступні біблійні тексти й спробуйте перше завдання без реєстрації. Вхід відкриває повний навчальний маршрут, домашні групи та збереження прогресу.",
    openReader: "Відкрити читальню",
    startMission: "Почати місію",
    readerMetric: "книг у спільному каноні",
    languageMetric: "мовні версії для читання",
    missionMetric: "опублікований пілотний маршрут",
    today: "Працює сьогодні",
    todayTitle: "Від читання до доказу",
    todayText:
      "Відкрийте Буття 12, прочитайте уривок і дайте відповідь, спираючись на текст.",
    featureReader: "Біблійна читальня",
    featureReaderText:
      "Старий і Новий Заповіти українською, російською та англійською з чітким зазначенням перекладу й джерела.",
    featureMission: "Канонічна місія",
    featureMissionText:
      "П’ять послідовних завдань без підказок із поясненнями після завершення перевірки.",
    featureRoadmap: "Чесний масштаб",
    featureRoadmapText:
      "Карта розвитку показує готові можливості й напрями, які ще готуються до публікації.",
    chapter: "Глава",
    verse: "Вірш",
    book: "Книга",
    testament: "Заповіт",
    oldTestament: "Старий Заповіт",
    newTestament: "Новий Заповіт",
    searchBook: "Пошук у книзі",
    searchPlaceholder: "Слово або фраза",
    search: "Знайти",
    noResults: "У цій книзі збігів не знайдено.",
    readerTitle: "Біблійна читальня",
    readerIntro:
      "Оберіть книгу й главу. Назву видання, джерело та умови використання зазначено поруч із текстом.",
    previous: "Попередня",
    next: "Наступна",
    edition: "Видання",
    license: "Права",
    sourceLink: "Відкрити джерело",
    missionTitle: "Дослідницькі місії",
    missionIntro:
      "Публікуємо тільки маршрут, для якого є канонічні вузли, джерела та локалізоване оцінювання.",
    available: "Доступно",
    preview: "Частково",
    comingSoon: "У розробці",
    continue: "Продовжити",
    open: "Відкрити",
    lastNight: "Остання ніч",
    lastNightText:
      "Матеріали про останні години перед розп’яттям проходять редакторську підготовку.",
    paulRoad: "Дорога Павла",
    paulRoadText:
      "Матеріали PA-01/PA-02 існують; публічний маршрут і переклади ще не завершені.",
    canonicalStatus: "Статус джерела",
    task: "Завдання",
    of: "з",
    readPassage: "Відкрити весь уривок",
    check: "Перевірити відповідь",
    selectOne: "Оберіть одну відповідь.",
    selectAll: "Оберіть усі правильні відповіді.",
    wrong:
      "Відповідь не відповідає канонічному ключу. Перечитайте уривок і спробуйте ще раз.",
    evidence: "Доказовий запис",
    confidence: "Клас упевненості",
    nextTask: "Наступне завдання",
    finish: "Завершити місію",
    completed: "Місію завершено",
    completedText:
      "Пройдено 5 опублікованих вузлів. Прогрес збережено в цьому браузері.",
    restart: "Пройти ще раз",
    progressSaved: "Прогрес збережено локально.",
    atlasTitle: "90 секцій майбутньої платформи",
    atlasIntro:
      "Карта показує доступні розділи й напрями подальшого розвитку. Кожен майбутній розділ має зрозумілий статус.",
    planA: "Писання й корпус",
    planB: "Навчання й місії",
    planC: "Дослідження й культура",
    planD: "Платформа й безпека",
    planE: "Досвід і випуск",
    supportEye: "Підтримати розвиток",
    supportTitle: "Допоможіть відкрити більше перевірених маршрутів.",
    supportLead:
      "Підтримка допомагає готувати біблійні матеріали, переклади, нові навчальні маршрути та зустрічі домашніх груп.",
    supportRule:
      "Для підтримки Scripture Archive використовується лише офіційна сторінка monobank, зазначена на платформі.",
    officialSupport: "Офіційна сторінка підтримки",
    contactProject: "Написати команді проєкту",
    whatSupport: "Що розвиваємо",
    supportItems: [
      "тримовне редакційне опрацювання місій",
      "зручні матеріали для різних способів читання",
      "джерельно перевірені дослідницькі матеріали",
      "стабільна робота публічної платформи",
    ],
    aboutTitle: "Про Scripture Archive",
    aboutLead:
      "Це християнська навчально-дослідницька платформа, де текст Писання є джерелом, а не декорацією.",
    aboutBody:
      "Scripture Archive поєднує біблійну читальню, дослідницькі завдання та роботу домашніх груп. Нові напрями відкриваються після підготовки й редакторської перевірки.",
    rightsTitle: "Тексти й права",
    rightsIntro:
      "У читальні рівно три видання. Текст не модернізовано й не подано як інший переклад.",
    projectStatus: "Стан контенту",
    statusBody:
      "Опубліковані завдання перевіряються за біблійним уривком і мають пояснення до відповіді.",
    accessTitle: "Доступність",
    accessBody:
      "Основні маршрути працюють із клавіатури, мають зрозумілі заголовки, помітний фокус і текстові повідомлення про результат дії.",
    errorLoad: "Не вдалося завантажити дані. Перевірте з’єднання та спробуйте ще раз.",
    retryLoad: "Повторити спробу",
    readingSyncPending: "Прочитане збережено на цьому пристрої, але сервер не підтвердив збереження. Повторіть спробу.",
    readingSyncRetry: "Повторити збереження",
    readerStorageUnavailable: "Браузер заборонив зберегти прогрес на пристрої. Читати можна, але завершення не зараховане. Дозвольте збереження й повторіть спробу.",
    readerHistoryNeedsRecovery: "Не вдалося перевірити збережену історію читання. Старі записи не змінено; відновіть історію перед новим збереженням.",
    readerMissionUnavailable: "Завдання тимчасово недоступні. Читання та пошук доступні.",
  },
  ru: {
    brandSub: "Архив Писания",
    menu: "Меню",
    reader: "Читальня",
    missions: "Миссии",
    community: "Сообщество",
    atlas: "Атлас развития",
    support: "Поддержать",
    help: "Служба поддержки",
    about: "О проекте",
    language: "Язык",
    skipContent: "Перейти к основному содержимому",
    footerLine: "Чтение, доказательство и ответственный вывод.",
    sources: "Источники и права",
    heroEye: "Международная учебно-исследовательская платформа",
    heroTitle: "Читайте. Исследуйте. Проверяйте.",
    heroLead:
      "Читайте доступные библейские тексты и попробуйте первое задание без регистрации. Вход открывает полный учебный маршрут, домашние группы и сохранение прогресса.",
    openReader: "Открыть читальню",
    startMission: "Начать миссию",
    readerMetric: "книг в общем каноне",
    languageMetric: "языковые версии для чтения",
    missionMetric: "опубликованный пилотный маршрут",
    today: "Работает сегодня",
    todayTitle: "От чтения к доказательству",
    todayText:
      "Откройте Бытие 12, прочитайте отрывок и ответьте, опираясь на текст.",
    featureReader: "Библейская читальня",
    featureReaderText:
      "Ветхий и Новый Заветы на украинском, русском и английском с точным указанием перевода и источника.",
    featureMission: "Каноническая миссия",
    featureMissionText:
      "Пять последовательных заданий без подсказок с объяснениями после завершения проверки.",
    featureRoadmap: "Честный масштаб",
    featureRoadmapText:
      "Карта развития показывает готовые возможности и направления, которые ещё готовятся к публикации.",
    chapter: "Глава",
    verse: "Стих",
    book: "Книга",
    testament: "Завет",
    oldTestament: "Ветхий Завет",
    newTestament: "Новый Завет",
    searchBook: "Поиск по книге",
    searchPlaceholder: "Слово или фраза",
    search: "Найти",
    noResults: "В этой книге совпадений не найдено.",
    readerTitle: "Библейская читальня",
    readerIntro:
      "Выберите книгу и главу. Название издания, источник и условия использования указаны рядом с текстом.",
    previous: "Предыдущая",
    next: "Следующая",
    edition: "Издание",
    license: "Права",
    sourceLink: "Открыть источник",
    missionTitle: "Исследовательские миссии",
    missionIntro:
      "Публикуем только маршрут, для которого есть канонические узлы, источники и локализованная проверка.",
    available: "Доступно",
    preview: "Частично",
    comingSoon: "В разработке",
    continue: "Продолжить",
    open: "Открыть",
    lastNight: "Последняя ночь",
    lastNightText:
      "Материалы о последних часах перед распятием проходят редакторскую подготовку.",
    paulRoad: "Дорога Павла",
    paulRoadText:
      "Материалы PA-01/PA-02 существуют; публичный маршрут и переводы ещё не завершены.",
    canonicalStatus: "Статус источника",
    task: "Задание",
    of: "из",
    readPassage: "Открыть весь отрывок",
    check: "Проверить ответ",
    selectOne: "Выберите один ответ.",
    selectAll: "Выберите все правильные ответы.",
    wrong:
      "Ответ не соответствует каноническому ключу. Перечитайте отрывок и попробуйте ещё раз.",
    evidence: "Доказательная запись",
    confidence: "Класс уверенности",
    nextTask: "Следующее задание",
    finish: "Завершить миссию",
    completed: "Миссия завершена",
    completedText:
      "Пройдено 5 опубликованных узлов. Прогресс сохранён в этом браузере.",
    restart: "Пройти ещё раз",
    progressSaved: "Прогресс сохранён локально.",
    atlasTitle: "90 секций будущей платформы",
    atlasIntro:
      "Карта показывает доступные разделы и направления дальнейшего развития. У каждого будущего раздела есть понятный статус.",
    planA: "Писание и корпус",
    planB: "Обучение и миссии",
    planC: "Исследование и культура",
    planD: "Платформа и безопасность",
    planE: "Опыт и выпуск",
    supportEye: "Поддержать развитие",
    supportTitle: "Помогите открыть больше проверенных маршрутов.",
    supportLead:
      "Поддержка помогает готовить библейские материалы, переводы, новые учебные маршруты и встречи домашних групп.",
    supportRule:
      "Для поддержки Scripture Archive используется только официальная страница monobank, указанная на платформе.",
    officialSupport: "Официальная страница поддержки",
    contactProject: "Написать команде проекта",
    whatSupport: "Что развиваем",
    supportItems: [
      "трёхъязычную редакционную подготовку миссий",
      "удобные материалы для разных способов чтения",
      "исследовательские материалы с проверенными источниками",
      "стабильная работа публичной платформы",
    ],
    aboutTitle: "О Scripture Archive",
    aboutLead:
      "Это христианская учебно-исследовательская платформа, где текст Писания служит источником, а не декорацией.",
    aboutBody:
      "Scripture Archive объединяет библейскую читальню, исследовательские задания и работу домашних групп. Новые направления открываются после подготовки и редакторской проверки.",
    rightsTitle: "Тексты и права",
    rightsIntro:
      "В читальне ровно три издания. Текст не модернизирован и не выдан за другой перевод.",
    projectStatus: "Состояние контента",
    statusBody:
      "Опубликованные задания проверяются по библейскому отрывку и содержат объяснение ответа.",
    accessTitle: "Доступность",
    accessBody:
      "Основные маршруты работают с клавиатуры, имеют понятные заголовки, заметный фокус и текстовые сообщения о результате действия.",
    errorLoad: "Не удалось загрузить данные. Проверьте соединение и попробуйте ещё раз.",
    retryLoad: "Повторить попытку",
    readingSyncPending: "Прочитанное сохранено на этом устройстве, но сервер не подтвердил сохранение. Повторите попытку.",
    readingSyncRetry: "Повторить сохранение",
    readerStorageUnavailable: "Браузер запретил сохранять прогресс на устройстве. Читать можно, но завершение не засчитано. Разрешите сохранение и повторите попытку.",
    readerHistoryNeedsRecovery: "Не удалось проверить сохранённую историю чтения. Старые записи не изменены; восстановите историю перед новым сохранением.",
    readerMissionUnavailable: "Задания временно недоступны. Чтение и поиск доступны.",
  },
  en: {
    brandSub: "Scripture Archive",
    menu: "Menu",
    reader: "Reader",
    missions: "Missions",
    community: "Community",
    atlas: "Development atlas",
    support: "Support",
    help: "Help centre",
    about: "About",
    language: "Language",
    skipContent: "Skip to main content",
    footerLine: "Reading, evidence, and responsible conclusions.",
    sources: "Sources and rights",
    heroEye: "An international learning and research platform",
    heroTitle: "Read. Investigate. Verify.",
    heroLead:
      "Read the available Bible texts and try the first task without an account. Sign-in opens the full learning route, home groups, and saved progress.",
    openReader: "Open the reader",
    startMission: "Start the mission",
    readerMetric: "books in the shared canon",
    languageMetric: "language editions for reading",
    missionMetric: "published pilot route",
    today: "Working today",
    todayTitle: "From reading to evidence",
    todayText:
      "Open Genesis 12, read the passage, and answer from the text itself.",
    featureReader: "Bible reader",
    featureReaderText:
      "Old and New Testaments in Ukrainian, Russian, and English, with every translation and source clearly identified.",
    featureMission: "Canonical mission",
    featureMissionText:
      "Five connected tasks without hints, followed by explanations after the completed assessment.",
    featureRoadmap: "An honest horizon",
    featureRoadmapText:
      "The development map distinguishes working capabilities from directions still being prepared for publication.",
    chapter: "Chapter",
    verse: "Verse",
    book: "Book",
    testament: "Testament",
    oldTestament: "Old Testament",
    newTestament: "New Testament",
    searchBook: "Search this book",
    searchPlaceholder: "Word or phrase",
    search: "Search",
    noResults: "No matches were found in this book.",
    readerTitle: "Bible reader",
    readerIntro:
      "Choose a book and chapter. The edition, source, and usage terms appear beside the text.",
    previous: "Previous",
    next: "Next",
    edition: "Edition",
    license: "Rights",
    sourceLink: "Open source record",
    missionTitle: "Research missions",
    missionIntro:
      "Only the route with canonical nodes, sources, and localized grading is published.",
    available: "Available",
    preview: "Partial",
    comingSoon: "Coming soon",
    continue: "Continue",
    open: "Open",
    lastNight: "The Last Night",
    lastNightText:
      "Material about the final hours before the crucifixion is being prepared for publication.",
    paulRoad: "Paul's Road",
    paulRoadText:
      "PA-01/PA-02 material exists; the public route and translations are not yet complete.",
    canonicalStatus: "Source status",
    task: "Task",
    of: "of",
    readPassage: "Open the full passage",
    check: "Check answer",
    selectOne: "Select one answer.",
    selectAll: "Select every correct answer.",
    wrong:
      "The answer does not match the canonical key. Reread the passage and try again.",
    evidence: "Evidence record",
    confidence: "Confidence class",
    nextTask: "Next task",
    finish: "Complete mission",
    completed: "Mission completed",
    completedText:
      "You completed the 5 published nodes. Progress is saved in this browser.",
    restart: "Start again",
    progressSaved: "Progress saved locally.",
    atlasTitle: "90 sections of the future platform",
    atlasIntro:
      "The map shows available sections and future directions. Every planned section has a clear status.",
    planA: "Scripture and corpus",
    planB: "Learning and missions",
    planC: "Research and culture",
    planD: "Platform and security",
    planE: "Experience and release",
    supportEye: "Support development",
    supportTitle: "Help open more verified study routes.",
    supportLead:
      "Support funds Bible text preparation, translation, accessibility, editorial review, new learning courses, and sustainable web infrastructure.",
    supportRule:
      "Scripture Archive uses only the official monobank support page listed on the platform.",
    officialSupport: "Official support page",
    contactProject: "Contact the project team",
    whatSupport: "What support develops",
    supportItems: [
      "trilingual editorial preparation of missions",
      "material suited to different ways of reading",
      "source-audited research material",
      "a stable public platform",
    ],
    aboutTitle: "About Scripture Archive",
    aboutLead:
      "A Christian learning and research platform where Scripture is evidence, not decoration.",
    aboutBody:
      "Scripture Archive brings together a Bible reader, research activities, and home-group study. New areas open after preparation and editorial review.",
    rightsTitle: "Texts and rights",
    rightsIntro:
      "The reader contains exactly three editions. Their text is not modernized or presented as another translation.",
    projectStatus: "Content status",
    statusBody:
      "Published activities are checked against their Bible passage and include an explanation of the answer.",
    accessTitle: "Accessibility",
    accessBody:
      "Core routes work from the keyboard and provide clear headings, visible focus, and textual feedback for every important action.",
    errorLoad: "The data could not be loaded. Check your connection and try again.",
    retryLoad: "Try again",
    readingSyncPending: "Your reading is saved on this device, but the server did not confirm the save. Please retry.",
    readingSyncRetry: "Retry saving",
    readerStorageUnavailable: "Browser storage is unavailable. Reading remains available, but completion has not been saved. Enable storage and retry.",
    readerHistoryNeedsRecovery: "Saved reading history could not be verified. Earlier records were left unchanged; recover the history before saving again.",
    readerMissionUnavailable: "Exercises are temporarily unavailable. Reading and search are still available.",
  },
};

const ACCOUNT_I18N = {
  uk: {
    account: "Обліковий запис",
    signIn: "Зареєструватися або увійти",
    signUp: "Зареєструватися та зберігати прогрес",
    signOut: "Вийти",
    heroLead:
      "Біблійна читальня трьома мовами й канонічні дослідницькі місії. Демонстрація відкрита для всіх, а повний маршрут і синхронізація прогресу — після безкоштовної реєстрації.",
    gateTitle: "Продовжуйте з власним прогресом",
    gateText:
      "Відкрита частина маршруту завершена. Увійдіть, щоб продовжити місію, приєднуватися до домашніх груп і зберігати результати між пристроями.",
    email: "Електронна пошта",
    password: "Пароль",
    firstName: "Ім’я",
    lastName: "Прізвище",
    ageRange: "Вікова група",
    religion: "Християнська традиція",
    church: "Конкретна деномінація або церква",
    marital: "Сімейний стан",
    gender: "Стать",
    optional: "необов’язково",
    privacyAgree:
      "Я прочитав(-ла) повідомлення про приватність і погоджуюся на обробку даних для роботи облікового запису.",
    sensitiveAgree:
      "Я явно погоджуюся на обробку вказаних мною даних про конфесію або церкву. Це поле необов’язкове.",
    verifyMessage:
      "Перевірте пошту й відкрийте посилання для підтвердження адреси.",
    loginError: "Не вдалося увійти. Перевірте дані та підтвердження пошти.",
    registerError: "Не вдалося створити обліковий запис. Перевірте поля.",
    forgot: "Забули пароль?",
    sendReset: "Надіслати посилання",
    resetSent: "Якщо обліковий запис існує, лист уже надіслано.",
    newPassword: "Новий пароль",
    savePassword: "Зберегти пароль",
    verified: "Пошту підтверджено. Тепер увійдіть.",
    verificationInvalid: "Посилання недійсне або прострочене.",
    privacy: "Приватність",
  },
  ru: {
    account: "Учётная запись",
    signIn: "Зарегистрироваться или войти",
    signUp: "Зарегистрироваться и сохранять прогресс",
    signOut: "Выйти",
    heroLead:
      "Библейская читальня на трёх языках и канонические исследовательские миссии. Демонстрация открыта всем, а полный маршрут и синхронизация прогресса — после бесплатной регистрации.",
    gateTitle: "Продолжайте со своим прогрессом",
    gateText:
      "Открытая часть маршрута завершена. Войдите, чтобы продолжить миссию, участвовать в домашних группах и сохранять результаты между устройствами.",
    email: "Электронная почта",
    password: "Пароль",
    firstName: "Имя",
    lastName: "Фамилия",
    ageRange: "Возрастная группа",
    religion: "Христианская традиция",
    church: "Конкретная деноминация или церковь",
    marital: "Семейное положение",
    gender: "Пол",
    optional: "необязательно",
    privacyAgree:
      "Я прочитал(а) уведомление о приватности и согласен(на) на обработку данных для работы учётной записи.",
    sensitiveAgree:
      "Я явно согласен(на) на обработку указанных мной данных о конфессии или церкви. Это поле необязательно.",
    verifyMessage:
      "Проверьте почту и откройте ссылку для подтверждения адреса.",
    loginError: "Не удалось войти. Проверьте данные и подтверждение почты.",
    registerError: "Не удалось создать учётную запись. Проверьте поля.",
    forgot: "Забыли пароль?",
    sendReset: "Отправить ссылку",
    resetSent: "Если учётная запись существует, письмо уже отправлено.",
    newPassword: "Новый пароль",
    savePassword: "Сохранить пароль",
    verified: "Почта подтверждена. Теперь войдите.",
    verificationInvalid: "Ссылка недействительна или устарела.",
    privacy: "Приватность",
  },
  en: {
    account: "Account",
    signIn: "Register or sign in",
    signUp: "Register and save progress",
    signOut: "Sign out",
    heroLead:
      "A trilingual Bible reader and canonical research missions. The demonstration is open to everyone; the complete route and cross-device progress require a free account.",
    gateTitle: "Continue with your own progress",
    gateText:
      "You have completed the open part of the route. Sign in to continue the mission, join home groups, and keep results across devices.",
    email: "Email",
    password: "Password",
    firstName: "First name",
    lastName: "Last name",
    ageRange: "Age range",
    religion: "Christian tradition",
    church: "Specific denomination or church",
    marital: "Marital status",
    gender: "Gender",
    optional: "optional",
    privacyAgree:
      "I have read the privacy notice and agree to data processing needed to operate my account.",
    sensitiveAgree:
      "I explicitly consent to processing the religion or church information I choose to provide. This field is optional.",
    verifyMessage: "Check your email and open the link to verify your address.",
    loginError: "Sign-in failed. Check your details and email verification.",
    registerError: "The account could not be created. Check the fields.",
    forgot: "Forgot password?",
    sendReset: "Send reset link",
    resetSent: "If the account exists, the message has been sent.",
    newPassword: "New password",
    savePassword: "Save password",
    verified: "Your email is verified. You can now sign in.",
    verificationInvalid: "The link is invalid or has expired.",
    privacy: "Privacy",
  },
};

const PUBLIC_COPY = {
  uk: {
    heroLead:
      "Біблійна читальня трьома мовами й перша дослідницька місія. Читання та перше завдання відкриті всім; повний маршрут і синхронізація прогресу — після безкоштовного входу.",
    todayText:
      "Відкрийте Буття 12, уважно прочитайте уривок і дайте відповідь, спираючись на сам текст.",
    featureMissionText:
      "П’ять послідовних завдань без підказок із поясненнями після завершення перевірки.",
    missionIntro:
      "Кожне завдання пов’язане з біблійним уривком: прочитайте, перевірте деталі й зробіть обґрунтований висновок.",
    aboutBody:
      "Платформа поєднує біблійну читальню з завершеним навчальним маршрутом. Наступні можливості відкриватимуться після підготовки матеріалів.",
  },
  ru: {
    heroLead:
      "Библейская читальня на трёх языках и первая исследовательская миссия. Чтение и первое задание открыты всем; полный маршрут и синхронизация прогресса — после бесплатного входа.",
    todayText:
      "Откройте Бытие 12, внимательно прочитайте отрывок и ответьте, опираясь на сам текст.",
    featureMissionText:
      "Пять последовательных заданий без подсказок с объяснениями после завершения проверки.",
    missionIntro:
      "Каждое задание связано с библейским отрывком: прочитайте, проверьте детали и сделайте обоснованный вывод.",
    aboutBody:
      "Платформа объединяет библейскую читальню с завершённым учебным маршрутом. Следующие возможности откроются после подготовки материалов.",
  },
  en: {
    heroLead:
      "A Bible reader in three languages and the first research mission. Reading and the first task are open to everyone; the full route and synced progress follow a free sign-in.",
    todayText:
      "Open Genesis 12, read the passage closely, and answer from the text itself.",
    featureMissionText:
      "Five connected tasks without hints, followed by explanations after the assessment.",
    missionIntro:
      "Every task is tied to a Bible passage: read closely, check the details, and reach a supported conclusion.",
    aboutBody:
      "The platform combines a Bible reader with a complete learning route. Further capabilities will open as their material is prepared.",
  },
};

const LIVE_LAB_COPY = {
  uk: {
    liveLab: "Наживо",
    labEye: "Виїзна програма",
    labTitle: "Архів Писання наживо",
    labLead:
      "Доступні біблійні дослідницькі зустрічі для церков, молодіжних груп, таборів і центрів допомоги. Платформа дає текст і маршрут, а люди читають, шукають докази й розмовляють разом за одним столом.",
    labTagline: "Текст на столі. Люди поруч. Висновок, який можна перевірити.",
    labTry: "Спробуйте формат за 10 хвилин",
    labHow: "Як проходить жива місія",
    labSteps: [
      [
        "1",
        "Отримайте уривок",
        "Оберіть друковану картку, великий шрифт або текст на телефоні.",
      ],
      [
        "2",
        "Знайдіть доказ",
        "Прочитайте уривок і позначте слова, на яких тримається відповідь.",
      ],
      ["3", "Обговоріть", "Порівняйте висновок із сусідом або малою групою."],
      [
        "4",
        "Продовжуйте",
        "Відкрийте повну місію на платформі й збережіть картку для наступної зустрічі.",
      ],
    ],
    labTiming: "Сценарій для стенду",
    labTimes: [
      "1 хв — обрати друковану картку з уривком",
      "3 хв — прочитати Буття 12:1–3",
      "3 хв — відповісти на перше запитання",
      "2 хв — звірити доказ з іншою людиною",
      "1 хв — забрати картку й обрати наступний крок",
    ],
    labPlaces: "Де це працює",
    labPlaceItems: [
      "церкви й домашні групи",
      "молодіжні зустрічі та біблійні школи",
      "дитячі й підліткові табори",
      "центри допомоги та реабілітації",
      "невеликі зустрічі для людей різного віку",
    ],
    labKit: "Комплект ведучого",
    labKitItems: [
      "картки з уривками й завданнями",
      "короткий сценарій зустрічі",
      "версія великим шрифтом",
      "посилання для продовження роботи на платформі",
      "матеріали для особистої та командної роботи",
    ],
    labSupportTitle: "На що потрібна підтримка",
    labSupportText:
      "На друк комплектів, доступні формати, підготовку ведучих, поїздки та проведення зустрічей. Для переказів використовується офіційна сторінка monobank.",
    labMission: "Почати живу місію",
    labInvite: "Запросити зустріч",
    labSupport: "Підтримати програму",
    labPrint: "Роздрукувати опис",
  },
  ru: {
    liveLab: "Вживую",
    labEye: "Выездная программа",
    labTitle: "Архив Писания вживую",
    labLead:
      "Доступные библейские исследовательские встречи для церквей, молодёжных групп, лагерей и центров помощи. Платформа даёт текст и маршрут, а люди читают, ищут доказательства и разговаривают вместе за одним столом.",
    labTagline: "Текст на столе. Люди рядом. Вывод, который можно проверить.",
    labTry: "Попробуйте формат за 10 минут",
    labHow: "Как проходит живая миссия",
    labSteps: [
      [
        "1",
        "Получите отрывок",
        "Выберите печатную карточку, крупный шрифт или текст на телефоне.",
      ],
      [
        "2",
        "Найдите доказательство",
        "Прочитайте отрывок и отметьте слова, на которых держится ответ.",
      ],
      ["3", "Обсудите", "Сравните вывод с соседом или небольшой группой."],
      [
        "4",
        "Продолжайте",
        "Откройте полную миссию на платформе и сохраните карточку для следующей встречи.",
      ],
    ],
    labTiming: "Сценарий для стенда",
    labTimes: [
      "1 мин — выбрать печатную карточку с отрывком",
      "3 мин — прочитать Бытие 12:1–3",
      "3 мин — ответить на первый вопрос",
      "2 мин — сверить доказательство с другим человеком",
      "1 мин — забрать карточку и выбрать следующий шаг",
    ],
    labPlaces: "Где это работает",
    labPlaceItems: [
      "церкви и домашние группы",
      "молодёжные встречи и библейские школы",
      "детские и подростковые лагеря",
      "центры помощи и реабилитации",
      "небольшие встречи для людей разного возраста",
    ],
    labKit: "Комплект ведущего",
    labKitItems: [
      "карточки с отрывками и заданиями",
      "короткий сценарий встречи",
      "версия крупным шрифтом",
      "ссылка для продолжения работы на платформе",
      "материалы для личной и командной работы",
    ],
    labSupportTitle: "На что нужна поддержка",
    labSupportText:
      "На печать комплектов, доступные форматы, подготовку ведущих, поездки и проведение встреч. Для переводов используется официальная страница monobank.",
    labMission: "Начать живую миссию",
    labInvite: "Пригласить встречу",
    labSupport: "Поддержать программу",
    labPrint: "Распечатать описание",
  },
  en: {
    liveLab: "In person",
    labEye: "Travelling programme",
    labTitle: "Scripture Archive in person",
    labLead:
      "Accessible Bible study gatherings for churches, youth groups, camps, and community centres. The platform provides the text and route; people read, find evidence, and talk together around one table.",
    labTagline:
      "The text on the table. People together. A conclusion you can verify.",
    labTry: "Try the format in 10 minutes",
    labHow: "How a live mission works",
    labSteps: [
      [
        "1",
        "Receive a passage",
        "Choose a printed card, large print, or the text on your phone.",
      ],
      [
        "2",
        "Find the evidence",
        "Read the passage and mark the words that support the answer.",
      ],
      [
        "3",
        "Discuss",
        "Compare your conclusion with a partner or small group.",
      ],
      [
        "4",
        "Continue",
        "Open the full mission on the platform and keep the card for the next gathering.",
      ],
    ],
    labTiming: "A ten-minute booth session",
    labTimes: [
      "1 min — choose a printed passage card",
      "3 min — read Genesis 12:1–3",
      "3 min — answer the first question",
      "2 min — compare the evidence with another person",
      "1 min — take the card and choose the next step",
    ],
    labPlaces: "Where it works",
    labPlaceItems: [
      "churches and home groups",
      "youth meetings and Bible schools",
      "children’s and youth camps",
      "community and rehabilitation centres",
      "small gatherings for people of different ages",
    ],
    labKit: "Facilitator kit",
    labKitItems: [
      "passage and task cards",
      "a short session guide",
      "a large-print edition",
      "a link for continuing on the platform",
      "materials for individual and team work",
    ],
    labSupportTitle: "What support makes possible",
    labSupportText:
      "Support covers printed kits, accessible formats, facilitator preparation, travel, and hosted gatherings. Donations use the official monobank page.",
    labMission: "Start the live mission",
    labInvite: "Invite a gathering",
    labSupport: "Support the programme",
    labPrint: "Print this outline",
  },
};

const GROUP_COPY = {
  uk: {
    groups: "Домашні групи",
    groupsEye: "Спільнота навколо Писання",
    groupsTitle: "Читайте разом. Обговорюйте текст. Поглиблюйте розуміння.",
    groupsLead:
      "Домашня група поєднує зустріч за одним столом із чітким маршрутом у платформі: спільний уривок, складніші запитання, зафіксований висновок і видимий поступ.",
    groupsPrinciple:
      "Відкритий каталог показує загальний поступ усіх публічних груп. Усередині марафону зіставляються результати груп з однаковим маршрутом, темпом і правилами.",
    directory: "Відкриті домашні групи",
    directoryIntro:
      "Тут з’являються лише реальні групи, які самі обрали публічність.",
    noGroups: "Публічних груп поки немає. Можна створити першу після входу.",
    myGroups: "Мої групи",
    createGroup: "Створити домашню групу",
    joinGroup: "Приєднатися за кодом",
    inviteCode: "Код запрошення",
    groupName: "Назва групи",
    churchName: "Церква або спільнота",
    country: "Країна",
    city: "Місто",
    description: "Коротко про групу",
    visibility: "Видимість групи",
    publicGroup: "Відкрита — є у каталозі",
    privateGroup: "Приватна — лише за запрошенням",
    roster: "Як показувати учасників",
    countOnly: "Лише кількість",
    publicNames: "Імена тих, хто погодився",
    hiddenRoster: "Не показувати склад",
    weeklyGoal: "Глав на тиждень",
    oddPace: "Оберіть непарний темп: 1, 3, 5, 7 або більше глав.",
    catchup: "Як надолужувати",
    flexible: "Гнучко — пропущене можна надолужити пізніше",
    steady: "Рівний ритм — тижневий ліміт не переноситься",
    publicOwner: "Показувати моє ім’я у складі групи",
    privacyNote:
      "Імена та особиста активність відкриваються тільки за окремою згодою.",
    saveGroup: "Створити групу й подати заявку",
    profileNeeded:
      "Спочатку завершіть профіль. Так платформа зможе зберегти роль організатора.",
    signInGroups: "Увійдіть, щоб створити групу або приєднатися до неї.",
    forming: "Набір триває",
    ready: "Потік готовий до старту",
    cohortNeed:
      "Для старту потрібні щонайменше дві групи з однаковим темпом і режимом.",
    cohort: "Потік спільного шляху",
    members: "учасників",
    meetings: "зустрічей",
    chaptersDone: "глав опрацьовано",
    depth: "точність відповідей",
    noDepth: "ще без перевірених відповідей",
    openGroup: "Відкрити групу",
    recordMeeting: "Записати зустріч",
    meetingDate: "Дата зустрічі",
    participants: "Скільки людей було",
    correctAnswers: "Правильних відповідей",
    totalAnswers: "Усього перевірених відповідей",
    reflection: "Короткий підсумок обговорення",
    saveMeeting: "Зберегти зустріч",
    facilitatorOnly: "Запис зустрічі доступний організатору або ведучому.",
    readingTarget: "Уривок для спільного читання",
    openChapter: "Відкрити главу",
    discussionRoute:
      "Після читання перейдіть до опублікованої місії: група обговорює питання, а ведучий фіксує перевірений результат.",
    startDiscussion: "Відкрити дослідницьку місію",
    recentMeetings: "Останні зустрічі",
    noMeetings: "Зустрічей ще не записано.",
    cohortPeers: "Групи в тому самому потоці",
    cohortExplain:
      "Однаковий темп і режим дають змістовний контекст для зіставлення результатів. Місця й нагороди не присвоюються.",
    groupSaved: "Групу створено.",
    meetingSaved: "Зустріч збережено.",
    joined: "Ви приєдналися до групи.",
    groupError: "Не вдалося зберегти. Перевірте поля й спробуйте ще раз.",
    timerTitle: "Час особистого читання",
    timerIntro:
      "Встановіть будь-яку тривалість від 1 хвилини до 168 годин. Значення 0 означає читання без ліміту.",
    minutes: "Хвилини",
    noLimit: "Без ліміту",
    timerStart: "Почати",
    timerPause: "Пауза",
    timerReset: "Скинути",
    timerActive: "Сесія триває без обмеження часу.",
    timerDone:
      "Час завершився. Зробіть паузу або продовжуйте читати у власному ритмі.",
  },
  ru: {
    groups: "Домашние группы",
    groupsEye: "Сообщество вокруг Писания",
    groupsTitle:
      "Читайте вместе. Обсуждайте текст. Углубляйте понимание.",
    groupsLead:
      "Домашняя группа соединяет встречу за одним столом с понятным маршрутом на платформе: общий отрывок, более глубокие вопросы, зафиксированный вывод и видимый прогресс.",
    groupsPrinciple:
      "Открытый каталог показывает общий прогресс всех публичных групп. Внутри марафона сопоставляются результаты групп с одинаковым маршрутом, темпом и правилами.",
    directory: "Открытые домашние группы",
    directoryIntro:
      "Здесь появляются только реальные группы, которые сами выбрали публичность.",
    noGroups: "Публичных групп пока нет. Первую можно создать после входа.",
    myGroups: "Мои группы",
    createGroup: "Создать домашнюю группу",
    joinGroup: "Присоединиться по коду",
    inviteCode: "Код приглашения",
    groupName: "Название группы",
    churchName: "Церковь или сообщество",
    country: "Страна",
    city: "Город",
    description: "Коротко о группе",
    visibility: "Видимость группы",
    publicGroup: "Открытая — видна в каталоге",
    privateGroup: "Приватная — только по приглашению",
    roster: "Как показывать участников",
    countOnly: "Только количество",
    publicNames: "Имена тех, кто согласился",
    hiddenRoster: "Не показывать состав",
    weeklyGoal: "Глав в неделю",
    oddPace: "Выберите нечётный темп: 1, 3, 5, 7 или больше глав.",
    catchup: "Как наверстывать",
    flexible: "Гибко — пропущенное можно наверстать позже",
    steady: "Ровный ритм — недельный лимит не переносится",
    publicOwner: "Показывать моё имя в составе группы",
    privacyNote:
      "Имена и личная активность открываются только с отдельного согласия.",
    saveGroup: "Создать группу и подать заявку",
    profileNeeded:
      "Сначала завершите профиль. Так платформа сможет сохранить роль организатора.",
    signInGroups: "Войдите, чтобы создать группу или присоединиться к ней.",
    forming: "Набор продолжается",
    ready: "Поток готов к старту",
    cohortNeed:
      "Для старта нужны минимум две группы с одинаковым темпом и режимом.",
    cohort: "Поток совместного пути",
    members: "участников",
    meetings: "встреч",
    chaptersDone: "глав изучено",
    depth: "точность ответов",
    noDepth: "пока без проверенных ответов",
    openGroup: "Открыть группу",
    recordMeeting: "Записать встречу",
    meetingDate: "Дата встречи",
    participants: "Сколько человек было",
    correctAnswers: "Правильных ответов",
    totalAnswers: "Всего проверенных ответов",
    reflection: "Краткий итог обсуждения",
    saveMeeting: "Сохранить встречу",
    facilitatorOnly: "Запись встречи доступна организатору или ведущему.",
    readingTarget: "Отрывок для совместного чтения",
    openChapter: "Открыть главу",
    discussionRoute:
      "После чтения перейдите к опубликованной миссии: группа обсуждает вопросы, а ведущий фиксирует проверенный результат.",
    startDiscussion: "Открыть исследовательскую миссию",
    recentMeetings: "Последние встречи",
    noMeetings: "Встреч пока не записано.",
    cohortPeers: "Группы в том же потоке",
    cohortExplain:
      "Одинаковый темп и режим дают честный контекст. Места и награды не присваиваются.",
    groupSaved: "Группа создана.",
    meetingSaved: "Встреча сохранена.",
    joined: "Вы присоединились к группе.",
    groupError: "Не удалось сохранить. Проверьте поля и попробуйте снова.",
    timerTitle: "Время личного чтения",
    timerIntro:
      "Установите любую длительность от 1 минуты до 168 часов. Значение 0 означает чтение без лимита.",
    minutes: "Минуты",
    noLimit: "Без лимита",
    timerStart: "Начать",
    timerPause: "Пауза",
    timerReset: "Сбросить",
    timerActive: "Сессия идёт без ограничения времени.",
    timerDone:
      "Время закончилось. Сделайте паузу или продолжайте читать в своём ритме.",
  },
  en: {
    groups: "Home groups",
    groupsEye: "Community around Scripture",
    groupsTitle: "Read together. Discuss the text. Deepen understanding.",
    groupsLead:
      "A home group connects a real gathering around one table with a clear platform route: one passage, deeper questions, a recorded conclusion, and visible progress.",
    groupsPrinciple:
      "The open directory shows the overall progress of every public group. Within a marathon, results are compared among groups following the same route, pace, and rules.",
    directory: "Open home groups",
    directoryIntro:
      "Only real groups that chose public visibility appear here.",
    noGroups:
      "There are no public groups yet. You can create the first one after signing in.",
    myGroups: "My groups",
    createGroup: "Create a home group",
    joinGroup: "Join with a code",
    inviteCode: "Invitation code",
    groupName: "Group name",
    churchName: "Church or community",
    country: "Country",
    city: "City",
    description: "About the group",
    visibility: "Group visibility",
    publicGroup: "Open — listed in the directory",
    privateGroup: "Private — invitation only",
    roster: "How members are shown",
    countOnly: "Count only",
    publicNames: "Names of people who consented",
    hiddenRoster: "Hide the member list",
    weeklyGoal: "Chapters per week",
    oddPace: "Choose an odd pace: 1, 3, 5, 7, or more chapters.",
    catchup: "Catch-up policy",
    flexible: "Flexible — missed work may be completed later",
    steady: "Steady — the weekly allowance does not carry over",
    publicOwner: "Show my name in the group roster",
    privacyNote:
      "Names and individual activity are public only with separate consent.",
    saveGroup: "Create group and register",
    profileNeeded:
      "Complete your profile first so the platform can save your organizer role.",
    signInGroups: "Sign in to create or join a group.",
    forming: "Forming",
    ready: "Cohort ready to start",
    cohortNeed:
      "At least two groups with the same pace and policy are required to start.",
    cohort: "Shared journey cohort",
    members: "members",
    meetings: "meetings",
    chaptersDone: "chapters studied",
    depth: "answer accuracy",
    noDepth: "no verified answers yet",
    openGroup: "Open group",
    recordMeeting: "Record a gathering",
    meetingDate: "Meeting date",
    participants: "People present",
    correctAnswers: "Correct answers",
    totalAnswers: "Verified answers total",
    reflection: "Short discussion summary",
    saveMeeting: "Save gathering",
    facilitatorOnly: "Only an organizer or facilitator can record a gathering.",
    readingTarget: "Passage for shared reading",
    openChapter: "Open chapter",
    discussionRoute:
      "After reading, continue to the published mission: the group discusses each question and the facilitator records the verified result.",
    startDiscussion: "Open the research mission",
    recentMeetings: "Recent gatherings",
    noMeetings: "No gatherings have been recorded yet.",
    cohortPeers: "Groups in the same cohort",
    cohortExplain:
      "A shared pace and policy provide a fair context. The platform awards no places or trophies.",
    groupSaved: "Group created.",
    meetingSaved: "Gathering saved.",
    joined: "You joined the group.",
    groupError: "Could not save. Check the fields and try again.",
    timerTitle: "Personal reading time",
    timerIntro:
      "Choose any duration from 1 minute to 168 hours. Set 0 for no time limit.",
    minutes: "Minutes",
    noLimit: "No limit",
    timerStart: "Start",
    timerPause: "Pause",
    timerReset: "Reset",
    timerActive: "This session has no time limit.",
    timerDone: "Time is up. Pause or keep reading at your own pace.",
  },
};
Object.assign(GROUP_COPY.uk, {
  groupsPrinciple:
    "У відкритому каталозі видно загальний поступ усіх груп незалежно від обраного темпу. Окреме порівняння груп з однаковим планом працює лише всередині марафону.",
  directoryIntro:
    "Відкриті групи показано разом. Для кожної видно кількість опрацьованих глав, перевірених відповідей і середню точність.",
  groupMode: "Формат групи",
  regularGroup: "Звичайна домашня група",
  regularGroupNote:
    "Працює у власному темпі й показує загальний поступ у відкритому каталозі.",
  marathonGroup: "Приєднати групу до марафону",
  marathonGroupNote:
    "Марафон порівнює лише групи з тим самим маршрутом, темпом і правилом надолуження.",
  answers: "правильних відповідей",
  accuracy: "середня точність",
  correctPerChapter: "правильних на главу",
  editionChoice: "Переклад для читання",
  licensedLater: "буде доступний після офіційного ліцензування",
  globalDirectory: "Загальний поступ груп",
  marathonOnly: "Порівняння в марафоні",
  notInMarathon:
    "Ця група працює у власному темпі й не бере участі в марафоні.",
});
Object.assign(GROUP_COPY.ru, {
  groupsPrinciple:
    "В открытом каталоге виден общий прогресс всех групп независимо от выбранного темпа. Отдельное сравнение групп с одинаковым планом работает только внутри марафона.",
  directoryIntro:
    "Открытые группы показаны вместе. Для каждой видны изученные главы, проверенные ответы и средняя точность.",
  groupMode: "Формат группы",
  regularGroup: "Обычная домашняя группа",
  regularGroupNote:
    "Работает в своём темпе и показывает общий прогресс в открытом каталоге.",
  marathonGroup: "Присоединить группу к марафону",
  marathonGroupNote:
    "Марафон сравнивает только группы с тем же маршрутом, темпом и правилом наверстывания.",
  answers: "правильных ответов",
  accuracy: "средняя точность",
  correctPerChapter: "правильных на главу",
  editionChoice: "Перевод для чтения",
  licensedLater: "будет доступен после официального лицензирования",
  globalDirectory: "Общий прогресс групп",
  marathonOnly: "Сравнение в марафоне",
  notInMarathon: "Эта группа работает в своём темпе и не участвует в марафоне.",
});
Object.assign(GROUP_COPY.en, {
  groupsPrinciple:
    "The open directory shows the overall progress of every group, whatever pace it chose. Like-for-like comparison belongs only inside a marathon with the same route, pace, and catch-up rule.",
  directoryIntro:
    "Open groups appear together. Each card shows chapters studied, checked answers, and average accuracy.",
  groupMode: "Group format",
  regularGroup: "Regular home group",
  regularGroupNote:
    "Works at its own pace and shares overall progress in the open directory.",
  marathonGroup: "Join a group marathon",
  marathonGroupNote:
    "A marathon compares only groups with the same route, pace, and catch-up rule.",
  answers: "correct answers",
  accuracy: "average accuracy",
  correctPerChapter: "correct per chapter",
  editionChoice: "Bible edition",
  licensedLater: "available after official licensing",
  globalDirectory: "Overall group progress",
  marathonOnly: "Marathon comparison",
  notInMarathon:
    "This group follows its own pace and is not enrolled in a marathon.",
});

const EDITORIAL_COPY = {
  uk: {
    heroEye: "Писання для уважного читання",
    heroTitle: "Читайте не поспішаючи. Бачте більше.",
    heroLead:
      "Відкрийте главу, простежте думку тексту й перевірте власний висновок. Тут особисте читання природно переходить у дослідження та живу розмову.",
    today: "Почніть із тексту",
    todayTitle: "Буття 12: покликання Аврама",
    todayText:
      "Прочитайте перші три вірші. Зверніть увагу, що саме Бог наказує, що обіцяє і чого цей уривок не говорить.",
    featureReader: "Писання поруч",
    featureReaderText:
      "Книги, глави й пошук зібрані в спокійній читальні, де ніщо не відволікає від тексту.",
    featureMission: "Питання, що повертають до тексту",
    featureMissionText:
      "П’ять послідовних кроків допомагають помічати деталі, перевіряти відповідь і пояснювати власний висновок.",
    featureRoadmap: "Шлях, який росте",
    featureRoadmapText:
      "Нові теми відкриватимуться поступово — після редакторської перевірки й підготовки матеріалів.",
    readerTitle: "Читальня",
    readerIntro:
      "Оберіть книгу і главу. Українське історичне видання подано із сучасним написанням букв; слова й зміст перекладу не переписуються.",
    missionTitle: "Шляхи дослідження",
    missionIntro:
      "Кожне питання веде назад до біблійного уривка. Читайте уважно, відділяйте сказане прямо від припущень і пояснюйте відповідь.",
    lastNightText:
      "Розмова про останні години перед розп’яттям готується до публікації.",
    paulRoadText:
      "Подорожі Павла стануть окремим маршрутом із текстами, мапою та питаннями для груп.",
    atlas: "Майбутнє",
    atlasTitle: "Карта майбутніх напрямів",
    atlasIntro:
      "Це теми, які команда планує відкривати поступово. Доступні розділи працюють уже зараз; решта позначені як наступні кроки.",
    aboutBody:
      "Scripture Archive допомагає читати Біблію уважно, ставити змістовні запитання й будувати висновок на самому тексті. Платформа розрахована і на особисте читання, і на зустрічі в церквах та домашніх групах.",
    rightsIntro:
      "Кожне біблійне видання має вказане джерело та умови використання. Осучаснене написання українського історичного тексту не подається як новий переклад.",
    supportLead:
      "Підтримка допомагає готувати нові маршрути, редагувати й перекладати матеріали та проводити зустрічі домашніх груп.",
    supportItems: [
      "підготовка нових біблійних маршрутів",
      "зручні формати для різних способів читання",
      "переклад та редакторська перевірка",
      "друк наборів для домашніх груп і живих зустрічей",
    ],
    ukEditionTitle: "Переклад Куліша, Пулюя та Нечуя-Левицького",
    ukEditionNote:
      "Написання букв осучаснено для читання. Слова перекладу збережено.",
    sourceLink: "Про видання",
  },
  ru: {
    heroEye: "Писание для внимательного чтения",
    heroTitle: "Читайте не спеша. Замечайте больше.",
    heroLead:
      "Откройте главу, проследите мысль текста и проверьте собственный вывод. Здесь личное чтение естественно продолжается исследованием и живым разговором.",
    today: "Начните с текста",
    todayTitle: "Бытие 12: призвание Аврама",
    todayText:
      "Прочитайте первые три стиха. Обратите внимание, что именно Бог повелевает, что обещает и чего этот отрывок не говорит.",
    featureReader: "Писание рядом",
    featureReaderText:
      "Книги, главы и поиск собраны в спокойной читальне, где ничто не отвлекает от текста.",
    featureMission: "Вопросы, возвращающие к тексту",
    featureMissionText:
      "Пять последовательных шагов помогают замечать детали, проверять ответ и объяснять собственный вывод.",
    featureRoadmap: "Путь, который растёт",
    featureRoadmapText:
      "Новые темы будут открываться постепенно — после редакторской проверки и подготовки материалов.",
    readerTitle: "Читальня",
    readerIntro:
      "Выберите книгу и главу. Текст каждого издания сохранён, а сведения об источнике доступны рядом с чтением.",
    missionTitle: "Пути исследования",
    missionIntro:
      "Каждый вопрос ведёт обратно к библейскому отрывку. Читайте внимательно, отделяйте сказанное прямо от предположений и объясняйте ответ.",
    lastNightText:
      "Разговор о последних часах перед распятием готовится к публикации.",
    paulRoadText:
      "Путешествия Павла станут отдельным маршрутом с текстами, картой и вопросами для групп.",
    atlas: "Будущее",
    atlasTitle: "Карта будущих направлений",
    atlasIntro:
      "Эти темы команда будет открывать постепенно. Доступные разделы работают уже сейчас; остальные отмечены как следующие шаги.",
    aboutBody:
      "Scripture Archive помогает внимательно читать Библию, задавать содержательные вопросы и строить вывод на самом тексте. Платформа подходит и для личного чтения, и для встреч в церквях и домашних группах.",
    rightsIntro:
      "У каждого библейского издания указаны источник и условия использования.",
    supportLead:
      "Поддержка помогает готовить новые маршруты, редактировать и переводить материалы и проводить встречи домашних групп.",
    supportItems: [
      "подготовка новых библейских маршрутов",
      "удобные форматы для разных способов чтения",
      "перевод и редакторская проверка",
      "печать наборов для домашних групп и живых встреч",
    ],
    sourceLink: "Об издании",
  },
  en: {
    heroEye: "Scripture for attentive reading",
    heroTitle: "Read slowly. Notice more.",
    heroLead:
      "Open a chapter, follow the movement of the text, and test your conclusion. Personal reading naturally continues into study and conversation.",
    today: "Begin with the text",
    todayTitle: "Genesis 12: Abram is called",
    todayText:
      "Read the first three verses. Notice what God commands, what God promises, and what the passage does not say.",
    featureReader: "Scripture close at hand",
    featureReaderText:
      "Books, chapters, and search come together in a calm reading room that keeps the text at the centre.",
    featureMission: "Questions that return to the text",
    featureMissionText:
      "Five connected steps help you notice details, check an answer, and explain your conclusion.",
    featureRoadmap: "A path that keeps growing",
    featureRoadmapText:
      "New themes will open gradually after editorial review and careful preparation.",
    readerTitle: "Reading room",
    readerIntro:
      "Choose a book and chapter. Each edition is presented with its source and usage terms beside the text.",
    missionTitle: "Study paths",
    missionIntro:
      "Every question leads back to a Bible passage. Read closely, separate direct statements from assumptions, and explain your answer.",
    lastNightText:
      "A guided conversation about the final hours before the crucifixion is being prepared.",
    paulRoadText:
      "Paul’s journeys will become a separate route with texts, a map, and questions for groups.",
    atlas: "What’s next",
    atlasTitle: "A map of future directions",
    atlasIntro:
      "These themes will open gradually. Available sections work today; the rest are shown as the next steps.",
    aboutBody:
      "Scripture Archive helps people read the Bible attentively, ask meaningful questions, and ground conclusions in the text itself. It is designed for personal reading as well as gatherings in churches and home groups.",
    rightsIntro: "Every Bible edition includes its source and usage terms.",
    supportLead:
      "Support helps prepare new study paths, edit and translate material, and equip home-group gatherings.",
    supportItems: [
      "preparing new Bible study paths",
      "formats suited to different ways of reading",
      "translation and editorial review",
      "printed kits for home groups and in-person gatherings",
    ],
    sourceLink: "About this edition",
  },
};
Object.assign(EDITORIAL_COPY.uk, {
  footerLine: "Читайте Писання. Перевіряйте розуміння. Продовжуйте дослідження.",
  todayTitle: "Івана 3: любов, дар і відповідь",
  todayText:
    "Прочитайте вірші 16–18. Зверніть увагу, що текст говорить про Божу любов, віру та відповідь людини.",
  readerIntro:
    "Оберіть книгу і главу. Назву видання, джерело та умови використання зазначено поруч із текстом.",
  supportRule:
    "Для підтримки Scripture Archive використовується офіційна сторінка monobank, зазначена на платформі.",
  supportLead:
    "Підтримка допомагає готувати нові навчальні маршрути, редагувати тексти, перекладати матеріали та забезпечувати зустрічі домашніх груп.",
  supportItems: [
    "нові біблійні маршрути й запитання",
    "редакторська перевірка та переклад",
    "друк матеріалів для домашніх груп",
    "розвиток читальні та дослідницьких інструментів",
  ],
  accessTitle: "Зручність користування",
  accessBody:
    "Основні розділи працюють із клавіатури, мають зрозумілі заголовки, помітний фокус і текстові повідомлення про результат дії.",
  wrong:
    "Перечитайте уривок: обрана відповідь не спирається на всі важливі деталі тексту.",
  completedText:
    "Ви завершили цей шлях дослідження. До нього можна повернутися ще раз або продовжити читання.",
  originalSpelling: "Показати написання видання 1905 року",
  modernSpelling: "Повернути сучасне написання",
  ukModernEdition: "Бібліка® Відкрита Новий Переклад Українською",
  ukModernNote:
    "Сучасний український текст Нового Завіту та Псалмів. Подано без змін.",
  ukHistoricalNote:
    "Історичний переклад Старого Завіту. Написання букв осучаснено; слова перекладу збережено.",
});
Object.assign(EDITORIAL_COPY.ru, {
  footerLine: "Читайте Писание. Проверяйте понимание. Продолжайте исследование.",
  todayTitle: "Иоанна 3: любовь, дар и ответ",
  todayText:
    "Прочитайте стихи 16–18. Обратите внимание, что текст говорит о Божьей любви, вере и ответе человека.",
  supportRule:
    "Для поддержки Scripture Archive используется официальная страница monobank, указанная на платформе.",
  supportLead:
    "Поддержка помогает готовить новые учебные маршруты, редактировать тексты, переводить материалы и проводить встречи домашних групп.",
  supportItems: [
    "новые библейские маршруты и вопросы",
    "редакторская проверка и перевод",
    "печатные материалы для домашних групп",
    "развитие читальни и исследовательских инструментов",
  ],
  accessTitle: "Удобство использования",
  accessBody:
    "Основные разделы работают с клавиатуры, имеют понятные заголовки, заметный фокус и текстовые сообщения о результате действия.",
  wrong:
    "Перечитайте отрывок: выбранный ответ не учитывает все важные детали текста.",
  completedText:
    "Вы завершили этот путь исследования. К нему можно вернуться ещё раз или продолжить чтение.",
});
Object.assign(EDITORIAL_COPY.en, {
  footerLine: "Read Scripture. Test your understanding. Continue the study.",
  todayTitle: "John 3: love, gift, and response",
  todayText:
    "Read verses 16–18. Notice what the text says about God’s love, belief, and the human response.",
  supportRule:
    "Scripture Archive uses the official monobank support page listed on the platform.",
  supportLead:
    "Support helps prepare new study routes, edit and translate materials, and equip home-group gatherings.",
  supportItems: [
    "new Bible study routes and questions",
    "editorial review and translation",
    "printed material for home groups",
    "development of the reader and research tools",
  ],
  accessTitle: "Ease of use",
  accessBody:
    "Core sections work from the keyboard and provide clear headings, visible focus, and textual feedback for every important action.",
  wrong:
    "Read the passage again: the selected answer does not account for every important detail in the text.",
  completedText:
    "You completed this study path. Return to it at any time or continue reading.",
});

const PLAN_TITLES = {
  A: {
    uk: [
      "Корпус канонів і традицій",
      "Реєстр видань і ліцензій",
      "Додавання текстів із перевірених джерел",
      "Підтримка різних форматів видань",
      "Картографія нумерації віршів",
      "Книга—глава—вірш",
      "Типографіка давніх жанрів",
      "Незмінні джерела й версії",
      "Українські переклади",
      "Міжнародні мови й різні системи письма",
      "Міжтекстові посилання",
      "Лексикон і граматика",
      "Синопсис чотирьох Євангелій",
      "Цифрове дослідження рукописів",
      "Біблійний атлас",
      "Шари читання глави",
      "Експорт і офлайн-видача",
      "Редакційний випуск",
    ],
    ru: [
      "Корпус канонов и традиций",
      "Реестр изданий и лицензий",
      "Добавление текстов из проверенных источников",
      "Поддержка разных форматов изданий",
      "Карта нумерации стихов",
      "Книга—глава—стих",
      "Типографика древних жанров",
      "Неизменяемые источники и версии",
      "Украинские переводы",
      "Международные языки и разные системы письма",
      "Межтекстовые ссылки",
      "Лексикон и грамматика",
      "Синопсис четырёх Евангелий",
      "Цифровое исследование рукописей",
      "Библейский атлас",
      "Слои чтения главы",
      "Экспорт и офлайн-издания",
      "Редакционный выпуск",
    ],
    en: [
      "Canon and tradition corpus",
      "Edition and rights registry",
      "Adding texts from verified sources",
      "Support for different edition formats",
      "Verse numbering maps",
      "Book—chapter—verse",
      "Ancient-genre typography",
      "Immutable sources and versions",
      "Ukrainian translations",
      "International languages and writing systems",
      "Intertextual links",
      "Lexicon and grammar",
      "Four-Gospel synopsis",
      "Digital manuscript research",
      "Bible atlas",
      "Chapter reading layers",
      "Export and offline editions",
      "Editorial release",
    ],
  },
  B: {
    uk: [
      "Граф кампаній",
      "Структура дослідницьких місій",
      "Різні формати навчальних дій",
      "Завдання з вибором відповіді",
      "Доказове виділення вірша",
      "Історична хронологія",
      "Персонажі і діалоги",
      "Тріангуляція джерел",
      "Переклади й значення",
      "Географія як доказ",
      "Рукописні джерела в дослідженні",
      "Вільні письмові дослідження",
      "Контраргумент і межі висновку",
      "Карта набутих знань",
      "Адаптивний маршрут",
      "Альтернативні способи взаємодії",
      "Послідовне оцінювання",
      "Редакційна перевірка запитань",
    ],
    ru: [
      "Граф кампаний",
      "Структура исследовательских миссий",
      "Разные форматы учебных действий",
      "Задания с выбором ответа",
      "Доказательное выделение стиха",
      "Историческая хронология",
      "Персонажи и диалоги",
      "Триангуляция источников",
      "Переводы и значение",
      "География как доказательство",
      "Рукописные источники в исследовании",
      "Свободные письменные исследования",
      "Контраргумент и границы вывода",
      "Карта полученных знаний",
      "Адаптивный маршрут",
      "Альтернативные способы взаимодействия",
      "Последовательное оценивание",
      "Редакционная проверка вопросов",
    ],
    en: [
      "Connected campaign routes",
      "Research mission structure",
      "Varied learning activities",
      "Multiple-choice tasks",
      "Verse evidence selection",
      "Historical chronology",
      "People and dialogue",
      "Source triangulation",
      "Translations and meaning",
      "Geography as evidence",
      "Manuscript sources in research",
      "Open written research",
      "Counterargument and claim limits",
      "Learning progress map",
      "Adaptive route",
      "Alternative interaction modes",
      "Consistent assessment",
      "Editorial question review",
    ],
  },
  C: {
    uk: [
      "Єдиний цифровий об’єкт",
      "Історія цивілізацій",
      "Порівняльне релігієзнавство",
      "Археологія та об’єкти",
      "Палеографія і критичні видання",
      "Література і фольклор",
      "Логіка і критичне мислення",
      "Мовознавство",
      "Історія науки",
      "Музейні цифрові колекції",
      "Етика спірних наративів",
      "Геочасові індекси",
      "Зв’язки між темами й джерелами",
      "Шкала якості джерел",
      "Міждисциплінарні курси",
      "Спільна редактура",
      "Семантичний пошук",
      "Партнерські колекції",
    ],
    ru: [
      "Единый цифровой объект",
      "История цивилизаций",
      "Сравнительное религиоведение",
      "Археология и объекты",
      "Палеография и критические издания",
      "Литература и фольклор",
      "Логика и критическое мышление",
      "Языкознание",
      "История науки",
      "Музейные цифровые коллекции",
      "Этика спорных нарративов",
      "Геовременные индексы",
      "Связи между темами и источниками",
      "Шкала качества источников",
      "Междисциплинарные курсы",
      "Совместная редактура",
      "Семантический поиск",
      "Партнёрские коллекции",
    ],
    en: [
      "Unified digital object",
      "History of civilizations",
      "Comparative religion",
      "Archaeology and objects",
      "Palaeography and critical editions",
      "Literature and folklore",
      "Logic and critical thinking",
      "Linguistics",
      "History of science",
      "Digital museum collections",
      "Ethics of disputed narratives",
      "Spatiotemporal indexes",
      "Connections between themes and sources",
      "Source quality scale",
      "Interdisciplinary courses",
      "Collaborative editing",
      "Semantic search",
      "Partner collections",
    ],
  },
  D: {
    uk: [
      "Системна перевірка платформи",
      "Узгоджена робота всіх розділів",
      "Безпечне керування доступом",
      "Надійне збереження даних",
      "Додавання нових текстових колекцій",
      "Відкритий доступ до дозволених матеріалів",
      "Історія дій і відновлення прогресу",
      "Ідентичність і ролі",
      "Робота без постійного з’єднання",
      "Гібридний пошук",
      "Пошук за зв’язками між матеріалами",
      "Інтелектуальний помічник для дослідження",
      "Захист даних за замовчуванням",
      "Конфіденційність та неповнолітні",
      "Безвідмовність та відновлення",
      "Контроль стабільності",
      "Автоматична перевірка якості",
      "Правила публікації матеріалів",
    ],
    ru: [
      "Системная проверка платформы",
      "Согласованная работа всех разделов",
      "Безопасное управление доступом",
      "Надёжное хранение данных",
      "Добавление новых текстовых коллекций",
      "Открытый доступ к разрешённым материалам",
      "История действий и восстановление прогресса",
      "Идентичность и роли",
      "Работа без постоянного подключения",
      "Гибридный поиск",
      "Поиск по связям между материалами",
      "Интеллектуальный помощник для исследования",
      "Защита данных по умолчанию",
      "Конфиденциальность и несовершеннолетние",
      "Надёжность и восстановление",
      "Контроль стабильности",
      "Автоматическая проверка качества",
      "Правила публикации материалов",
    ],
    en: [
      "Platform-wide verification",
      "Consistent behaviour across sections",
      "Secure access management",
      "Reliable data storage",
      "Adding new text collections",
      "Open access to licensed material",
      "Activity history and progress recovery",
      "Identity and roles",
      "Use without a constant connection",
      "Hybrid search",
      "Search through connected material",
      "Intelligent research assistance",
      "Data protection by default",
      "Privacy and minors",
      "Reliability and recovery",
      "Stability monitoring",
      "Automated quality checks",
      "Editorial publishing rules",
    ],
  },
  E: {
    uk: [
      "Візуальна ідентичність",
      "Адаптивна інформаційна архітектура",
      "Єдина система оформлення",
      "Читальня як головний продукт",
      "Візуальний граф знань",
      "Динамічні переходи",
      "Ілюстрації та іконографія",
      "Режими руху та контрасту",
      "Світла й темна теми",
      "Зручність для різних способів користування",
      "Переклад усього інтерфейсу",
      "Аудіо, субтитри й синхронізація",
      "Конструктор для редакторів",
      "Прозорий прогрес",
      "Музейна/донорська презентація",
      "Викладачі, групи, бібліотеки",
      "Дані ефективності навчання",
      "Міжнародний публічний випуск",
    ],
    ru: [
      "Визуальная идентичность",
      "Адаптивная информационная архитектура",
      "Единая система оформления",
      "Читальня как главный продукт",
      "Визуальный граф знаний",
      "Динамические переходы",
      "Иллюстрации и иконография",
      "Режимы движения и контраста",
      "Светлая и тёмная темы",
      "Удобство для разных способов использования",
      "Перевод всего интерфейса",
      "Аудио, субтитры и синхронизация",
      "Конструктор для редакторов",
      "Прозрачный прогресс",
      "Музейная и донорская презентация",
      "Преподаватели, группы, библиотеки",
      "Данные эффективности обучения",
      "Международный публичный выпуск",
    ],
    en: [
      "Visual identity",
      "Responsive information architecture",
      "Unified visual system",
      "Reader as the primary product",
      "Visual knowledge graph",
      "Dynamic transitions",
      "Illustration and iconography",
      "Motion and contrast modes",
      "Light and dark themes",
      "Flexible ways to use the platform",
      "Complete interface translation",
      "Audio, captions, and synchronization",
      "Editorial constructor",
      "Transparent progress",
      "Museum and donor presentation",
      "Teachers, groups, and libraries",
      "Learning effectiveness data",
      "International public release",
    ],
  },
};
PLAN_TITLES.D = {
  uk: [
    "Надійне збереження даних",
    "Узгоджена робота розділів",
    "Ролі та права доступу",
    "Безпечне оновлення матеріалів",
    "Перенесення й резервні копії",
    "Обмін матеріалами",
    "Історія змін",
    "Облікові записи й ролі",
    "Читання без мережі",
    "Розширений пошук",
    "Зв’язки між матеріалами",
    "Помічник для дослідження",
    "Захист облікових записів",
    "Приватність дітей і дорослих",
    "Відновлення після збоїв",
    "Контроль стабільності",
    "Перевірка перед публікацією",
    "Відповідальний випуск",
  ],
  ru: [
    "Надёжное хранение данных",
    "Согласованная работа разделов",
    "Роли и права доступа",
    "Безопасное обновление материалов",
    "Перенос и резервные копии",
    "Обмен материалами",
    "История изменений",
    "Учётные записи и роли",
    "Чтение без сети",
    "Расширенный поиск",
    "Связи между материалами",
    "Помощник для исследования",
    "Защита учётных записей",
    "Приватность детей и взрослых",
    "Восстановление после сбоев",
    "Контроль стабильности",
    "Проверка перед публикацией",
    "Ответственный выпуск",
  ],
  en: [
    "Reliable data storage",
    "Connected sections",
    "Roles and access",
    "Safe content updates",
    "Migration and backups",
    "Material exchange",
    "Change history",
    "Accounts and roles",
    "Offline reading",
    "Advanced search",
    "Connections between resources",
    "A study assistant",
    "Account protection",
    "Privacy for children and adults",
    "Recovery after failures",
    "Stability monitoring",
    "Checks before publication",
    "Responsible release",
  ],
};
PLAN_TITLES.A = {
  uk: [
    "Канон і біблійні традиції",
    "Видання та права",
    "Підготовка текстів",
    "Перевірка структури книг",
    "Нумерація віршів",
    "Книга, глава і вірш",
    "Оформлення поезії та прози",
    "Збереження джерел",
    "Українські переклади",
    "Мови світу",
    "Паралельні місця",
    "Слова та їхнє значення",
    "Чотири Євангелія поруч",
    "Давні рукописи",
    "Біблійний атлас",
    "Режими читання",
    "Матеріали без мережі",
    "Редакторська перевірка",
  ],
  ru: [
    "Канон и библейские традиции",
    "Издания и права",
    "Подготовка текстов",
    "Проверка структуры книг",
    "Нумерация стихов",
    "Книга, глава и стих",
    "Оформление поэзии и прозы",
    "Хранение источников",
    "Украинские переводы",
    "Языки мира",
    "Параллельные места",
    "Слова и их значение",
    "Четыре Евангелия рядом",
    "Древние рукописи",
    "Библейский атлас",
    "Режимы чтения",
    "Материалы без сети",
    "Редакторская проверка",
  ],
  en: [
    "Canon and Bible traditions",
    "Editions and rights",
    "Preparing texts",
    "Checking book structure",
    "Verse numbering",
    "Book, chapter, and verse",
    "Poetry and prose",
    "Preserving sources",
    "Ukrainian translations",
    "Languages of the world",
    "Parallel passages",
    "Words and their meaning",
    "Four Gospels side by side",
    "Ancient manuscripts",
    "Bible atlas",
    "Reading modes",
    "Offline material",
    "Editorial review",
  ],
};
PLAN_TITLES.B = {
  uk: [
    "Тематичні кампанії",
    "Послідовні місії",
    "Навчання через дію",
    "Запитання з вибором",
    "Доказ у вірші",
    "Хронологія подій",
    "Персонажі й діалоги",
    "Порівняння джерел",
    "Переклади й значення",
    "Географія подій",
    "Свідчення рукописів",
    "Письмові дослідження",
    "Межі висновку",
    "Навички дослідника",
    "Особистий маршрут",
    "Різні способи взаємодії",
    "Зрозуміла перевірка",
    "Якість запитань",
  ],
  ru: [
    "Тематические кампании",
    "Последовательные миссии",
    "Обучение через действие",
    "Вопросы с выбором",
    "Доказательство в стихе",
    "Хронология событий",
    "Персонажи и диалоги",
    "Сравнение источников",
    "Переводы и значение",
    "География событий",
    "Свидетельства рукописей",
    "Письменные исследования",
    "Границы вывода",
    "Навыки исследователя",
    "Личный маршрут",
    "Разные способы взаимодействия",
    "Понятная проверка",
    "Качество вопросов",
  ],
  en: [
    "Themed campaigns",
    "Connected missions",
    "Learning through action",
    "Choice questions",
    "Evidence in a verse",
    "Timeline of events",
    "People and dialogue",
    "Comparing sources",
    "Translations and meaning",
    "Geography of events",
    "Manuscript evidence",
    "Written studies",
    "Limits of a conclusion",
    "Research skills",
    "A personal route",
    "Different ways to participate",
    "Clear answer checking",
    "Question quality",
  ],
};
PLAN_TITLES.C = {
  uk: [
    "Єдина картка матеріалу",
    "Історія цивілізацій",
    "Релігії в історичному контексті",
    "Археологія та знахідки",
    "Давнє письмо й видання",
    "Література та усна традиція",
    "Логіка й критичне мислення",
    "Мовознавство",
    "Історія науки",
    "Музейні колекції",
    "Відповідальна розмова про складне",
    "Місце і час подій",
    "Карта знань",
    "Оцінка надійності джерел",
    "Міждисциплінарні курси",
    "Спільна редактура",
    "Пошук за змістом",
    "Партнерські колекції",
  ],
  ru: [
    "Единая карточка материала",
    "История цивилизаций",
    "Религии в историческом контексте",
    "Археология и находки",
    "Древнее письмо и издания",
    "Литература и устная традиция",
    "Логика и критическое мышление",
    "Языкознание",
    "История науки",
    "Музейные коллекции",
    "Ответственный разговор о сложном",
    "Место и время событий",
    "Карта знаний",
    "Оценка надёжности источников",
    "Междисциплинарные курсы",
    "Совместная редактура",
    "Поиск по смыслу",
    "Партнёрские коллекции",
  ],
  en: [
    "A unified resource record",
    "History of civilizations",
    "Religion in historical context",
    "Archaeology and discoveries",
    "Ancient writing and editions",
    "Literature and oral tradition",
    "Logic and critical thinking",
    "Linguistics",
    "History of science",
    "Museum collections",
    "Responsible discussion of difficult subjects",
    "Place and time of events",
    "Knowledge map",
    "Assessing source reliability",
    "Interdisciplinary courses",
    "Collaborative editing",
    "Search by meaning",
    "Partner collections",
  ],
};
PLAN_TITLES.E = {
  uk: [
    "Візуальний стиль",
    "Зручність на різних екранах",
    "Послідовне оформлення",
    "Читальня в центрі платформи",
    "Візуальна карта знань",
    "Плавні переходи",
    "Ілюстрації та символи",
    "Рух і контраст",
    "Світла й темна теми",
    "Зручність для різних способів користування",
    "Природні переклади інтерфейсу",
    "Аудіо й субтитри",
    "Редактор матеріалів",
    "Зрозумілий прогрес",
    "Презентація для відвідувачів і партнерів",
    "Викладачі, групи й бібліотеки",
    "Оцінка користі навчання",
    "Міжнародний публічний запуск",
  ],
  ru: [
    "Визуальный стиль",
    "Удобство на разных экранах",
    "Последовательное оформление",
    "Читальня в центре платформы",
    "Визуальная карта знаний",
    "Плавные переходы",
    "Иллюстрации и символы",
    "Движение и контраст",
    "Светлая и тёмная темы",
    "Удобство для разных способов использования",
    "Естественные переводы интерфейса",
    "Аудио и субтитры",
    "Редактор материалов",
    "Понятный прогресс",
    "Презентация для посетителей и партнёров",
    "Преподаватели, группы и библиотеки",
    "Оценка пользы обучения",
    "Международный публичный запуск",
  ],
  en: [
    "Visual style",
    "Comfort on every screen",
    "Consistent presentation",
    "The reader at the centre",
    "A visual knowledge map",
    "Smooth transitions",
    "Illustrations and symbols",
    "Motion and contrast",
    "Light and dark themes",
    "Flexible ways to use the platform",
    "Natural interface translations",
    "Audio and captions",
    "Material editor",
    "Clear progress",
    "Presentation for visitors and partners",
    "Teachers, groups, and libraries",
    "Measuring learning value",
    "International public launch",
  ],
};
const PARTIAL = new Set([
  "A02",
  "A06",
  "A09",
  "A16",
  "B01",
  "B03",
  "B04",
  "B05",
  "B14",
  "B16",
  "B18",
  "D01",
  "D02",
  "D04",
  "D13",
  "D17",
  "E01",
  "E02",
  "E03",
  "E04",
  "E08",
  "E10",
  "E11",
  "E12",
  "E14",
  "E15",
  "E18",
]);
const LIVE = new Set([
  "A06",
  "A09",
  "B04",
  "B16",
  "E01",
  "E02",
  "E03",
  "E04",
  "E10",
  "E11",
  "E14",
  "E15",
  "E18",
]);
function storedPreference(key) {
  try { return localStorage.getItem(key); }
  catch { return null; }
}
function storeReaderPreference(key, value) {
  try { localStorage.setItem(key, value); return true; }
  catch { return false; }
}
const transientEditionStorageDenied = new Set();
const EDITION_TRANSIENT_MESSAGES = {
  uk: "Браузер заборонив збереження: вибір перекладу діє лише в цій вкладці.",
  ru: "Браузер запретил сохранение: выбор перевода действует только в этой вкладке.",
  en: "Browser storage is unavailable: your edition selection lasts only in this tab.",
};
const SPELLING_TRANSIENT_MESSAGES = Object.freeze({
  uk: "Правопис змінено лише в цій вкладці: браузер заборонив збереження налаштувань.",
  ru: "Правописание изменено только в этой вкладке: браузер запретил сохранение настроек.",
  en: "Spelling changed only in this tab because browser storage is unavailable.",
});
const LANGUAGE_TRANSIENT_MESSAGES = {
  uk: "Мову змінено лише в цій вкладці: браузер заборонив збереження налаштувань.",
  ru: "Язык изменён только в этой вкладке: браузер запретил сохранение настроек.",
  en: "Language changed only for this tab because browser storage is unavailable.",
};
const requestedLang = new URLSearchParams(location.search).get("lang");
const savedLang = storedPreference("sa.lang");
const state = {
  lang: ["uk", "ru", "en"].includes(requestedLang)
    ? requestedLang
    : ["uk", "ru", "en"].includes(savedLang) ? savedLang : "uk",
  ukOriginal: storedPreference("sa.ukSpelling") === "original",
  catalog: null,
  cms: null,
  user: null,
  bookCache: new Map(),
  mission: null,
  currentReader: null,
  activeAttempt: null,
  activeAttemptStorageUntrusted: false,
  reader: loadJSON("sa.reader", { book: "GEN", chapter: 12 }),
  missionProgress: loadJSON("sa.mission.OTAB01", {
    index: 0,
    correct: [],
    complete: false,
  }),
  progressSyncStatus: null,
  // A failed cache clear makes browser reading history untrusted for this principal.
  localReadingStorageUntrusted: false,
  studyTimer: loadJSON("sa.studyTimer", {
    durationMinutes: 0,
    remainingSeconds: 0,
    running: false,
    endsAt: null,
  }),
};
const main = document.querySelector("#main");
const announcer = document.querySelector("#announcer");
const langSelect = document.querySelector("#language");
const nav = document.querySelector("#primary-nav");
let timerInterval;
let communityRefreshInterval;
let communityOwnerRefreshInterval;

const PAGE_TITLES = {
  uk: { home:"Архів Писання", reader:"Біблійна читальня", campaigns:"Навчальні кампанії", missions:"Місії", groups:"Домашні групи", community:"Спільнота", support:"Підтримати", help:"Служба підтримки", about:"Про проєкт", privacy:"Приватність", atlas:"Атлас розвитку", dossiers:"Дослідницькі досьє", builder:"Конструктор", account:"Обліковий запис", progress:"Мій прогрес", mission:"Завдання", editor:"Редактор" },
  ru: { home:"Архив Писания", reader:"Библейская читальня", campaigns:"Учебные кампании", missions:"Миссии", groups:"Домашние группы", community:"Сообщество", support:"Поддержать", help:"Служба поддержки", about:"О проекте", privacy:"Приватность", atlas:"Атлас развития", dossiers:"Исследовательские досье", builder:"Конструктор", account:"Учётная запись", progress:"Мой прогресс", mission:"Задания", editor:"Редактор" },
  en: { home:"Scripture Archive", reader:"Bible reader", campaigns:"Learning campaigns", missions:"Missions", groups:"Home groups", community:"Community", support:"Support", help:"Help centre", about:"About", privacy:"Privacy", atlas:"Learning atlas", dossiers:"Research dossiers", builder:"Builder", account:"Account", progress:"My progress", mission:"Assessment", editor:"Editor" },
};
const PRIVATE_ROUTES = new Set(["account", "mission", "progress", "editor"]);

function navigateTo(path, replace = false) {
  window.history[replace ? "replaceState" : "pushState"](null, "", path);
  route();
}

function updatePageMetadata(name) {
  const title = PAGE_TITLES[state.lang]?.[name] || PAGE_TITLES[state.lang]?.home || "Scripture Archive";
  document.title = title === "Scripture Archive" ? title : `${title} · Scripture Archive`;
  const canonicalPath = PRIVATE_ROUTES.has(name) || name === "home" ? "/" : `/${name}`;
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = `${location.origin}${canonicalPath}`;
  let robots = document.querySelector('meta[name="robots"]');
  if (!robots) {
    robots = document.createElement("meta");
    robots.name = "robots";
    document.head.appendChild(robots);
  }
  robots.content = PRIVATE_ROUTES.has(name) ? "noindex, nofollow" : "index, follow";
}

function loadJSON(key, fallback, preserveInvalid = false) {
  try {
    const raw=localStorage.getItem(key);
    // Readers must distinguish an absent device key (new history) from a
    // damaged existing JSON payload before any write. All ordinary callers
    // retain the original forgiving preference-cache semantics.
    if(preserveInvalid && raw!==null)return JSON.parse(raw);
    return JSON.parse(raw) || fallback;
  } catch {
    return preserveInvalid ? null : fallback;
  }
}
function t(key) {
  return (
    state.cms?.text?.[state.lang]?.[key] ||
    (EDITORIAL_COPY[state.lang]?.[key] ??
      GROUP_COPY[state.lang]?.[key] ??
      LIVE_LAB_COPY[state.lang]?.[key] ??
      PUBLIC_COPY[state.lang]?.[key] ??
      ACCOUNT_I18N[state.lang]?.[key] ??
      I18N[state.lang][key] ??
      EDITORIAL_COPY.en[key] ??
      GROUP_COPY.en[key] ??
      LIVE_LAB_COPY.en[key] ??
      PUBLIC_COPY.en[key] ??
      ACCOUNT_I18N.en[key] ??
      I18N.en[key] ??
      key)
  );
}
function esc(value) {
  return String(value).replace(
    /[&<>'"]/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        c
      ],
  );
}
function bibleText(value) {
  return String(value);
}
const MODERN_UK_BOOKS = new Set([
  "PSA",
  "MAT",
  "MRK",
  "LUK",
  "JHN",
  "ACT",
  "ROM",
  "1CO",
  "2CO",
  "GAL",
  "EPH",
  "PHP",
  "COL",
  "1TH",
  "2TH",
  "1TI",
  "2TI",
  "TIT",
  "PHM",
  "HEB",
  "JAS",
  "1PE",
  "2PE",
  "1JN",
  "2JN",
  "3JN",
  "JUD",
  "REV",
]);
function editionDetails(edition, bookCode) {
  return {
    title: edition.title,
    note: edition.note || "",
    license: edition.license,
    source: edition.source,
    licenseUrl: edition.licenseUrl,
    attribution: edition.attribution,
    modern: false,
  };
}
function editionTitle(edition, bookCode) {
  return editionDetails(edition, bookCode).title;
}
function editionToggle(bookCode) {
  return "";
}
const UK_BOOK_TITLES = [
  "Буття",
  "Вихід",
  "Левит",
  "Числа",
  "Повторення Закону",
  "Ісус Навин",
  "Судді",
  "Рут",
  "1 Самуїлова",
  "2 Самуїлова",
  "1 Царів",
  "2 Царів",
  "1 Хронік",
  "2 Хронік",
  "Ездра",
  "Неемія",
  "Естер",
  "Йов",
  "Псалми",
  "Приповісті",
  "Екклезіаст",
  "Пісня над піснями",
  "Ісая",
  "Єремія",
  "Плач Єремії",
  "Єзекіїль",
  "Даниїл",
  "Осія",
  "Йоїл",
  "Амос",
  "Овдій",
  "Йона",
  "Михей",
  "Наум",
  "Авакум",
  "Софонія",
  "Агей",
  "Захарія",
  "Малахія",
  "Матвія",
  "Марка",
  "Луки",
  "Івана",
  "Дії апостолів",
  "Римлян",
  "1 Коринтян",
  "2 Коринтян",
  "Галатів",
  "Ефесян",
  "Филип’ян",
  "Колосян",
  "1 Солунян",
  "2 Солунян",
  "1 Тимофія",
  "2 Тимофія",
  "Тита",
  "Филимона",
  "Євреїв",
  "Якова",
  "1 Петра",
  "2 Петра",
  "1 Івана",
  "2 Івана",
  "3 Івана",
  "Юди",
  "Об’явлення",
];
function bookTitle(book) {
  if (state.lang !== "uk") return book.title;
  const index =
    state.catalog?.books?.uk?.findIndex((item) => item.code === book.code) ??
    -1;
  return UK_BOOK_TITLES[index] || bibleText(book.title);
}
function announce(message) {
  announcer.textContent = "";
  requestAnimationFrame(() => (announcer.textContent = message));
}
function setStaticI18n() {
  document.documentElement.lang = state.lang;
  document
    .querySelectorAll("[data-i18n]")
    .forEach((el) => (el.textContent = t(el.dataset.i18n)));
  langSelect.value = state.lang;
  document.querySelectorAll('[data-workspace]').forEach(el=>el.textContent=workspaceCopy(state.lang)[el.dataset.workspace]);
}
function play(kind) {
  const file={ok:'confirmation_001',bad:'error_003',done:'confirmation_004'}[kind];
  if(!file || !navigator.userActivation?.hasBeenActive) return;
  const audio=new Audio(`/audio/${file}.ogg`);
  audio.volume=0.15;
  audio.play().catch(()=>{});
}
function validBibleCatalog(catalog) {
  // The received uk catalogue cannot certify its own identity after
  // coordinated source damage across all locales/editions. This fixed
  // 66-code sequence is an admission guard, not a second Bible text source.
  const expectedBookCodes = "GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO ECC SNG ISA JER LAM EZK DAN HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV".split(" ");
  if (!catalog || catalog.schemaVersion !== 1 ||
      !Object.hasOwn(catalog, "books") || !Object.hasOwn(catalog, "editions") ||
      !catalog.books || typeof catalog.books !== "object" || Array.isArray(catalog.books) ||
      !catalog.editions || typeof catalog.editions !== "object" || Array.isArray(catalog.editions)) return false;
  const validBooks = (books) => Array.isArray(books) && books.length === 66 &&
    // Array#every and Array#map skip holes: 65 real codes plus an undefined
    // hole can satisfy Set.size === 66. Require 66 own book records first.
    Array.from(books.keys()).every((index) => Object.hasOwn(books, index)) &&
    books.every((book, index) => book && typeof book === "object" &&
      ["code", "title", "testament", "chapters"].every(field => Object.hasOwn(book, field)) &&
      book.code === expectedBookCodes[index] &&
      typeof book.code === "string" && /^[A-Z0-9]{3}$/.test(book.code) &&
      typeof book.title === "string" && !!book.title.trim() &&
      book.testament === (index < 39 ? "OT" : "NT") &&
      Number.isSafeInteger(book.chapters) && book.chapters > 0 && book.chapters <= 200) &&
    new Set(books.map((book) => book.code)).size === 66;
  if (!validBooks(catalog.books.uk)) return false;
  const canonicalCodes = new Set(catalog.books.uk.map((book) => book.code));
  for (const locale of ["uk", "ru", "en"]) {
    if (!Object.hasOwn(catalog.books, locale) || !Object.hasOwn(catalog.editions, locale))
      return false;
    const edition = catalog.editions[locale];
    const books = catalog.books[locale];
    if (!edition || typeof edition !== "object" || !Object.hasOwn(edition, "id") ||
        typeof edition.id !== "string" || !edition.id.trim() ||
        !validBooks(books) || books.some((book, index) =>
          !canonicalCodes.has(book.code) || book.code !== catalog.books.uk[index].code)) return false;
  }
  if (catalog.editionBooks !== undefined) {
    // Object.values() checks only own inventories, whereas bracket lookup
    // can otherwise select an inherited, unverified alternate edition.
    if (!Object.hasOwn(catalog, "editionBooks") || !catalog.editionBooks ||
        typeof catalog.editionBooks !== "object" || Array.isArray(catalog.editionBooks))
      return false;
    // Cross-realm plain JSON objects are valid; inherited enumerable entries
    // are not, because Object.values() never validated their source claims.
    for (const key in catalog.editionBooks)
      if (!Object.hasOwn(catalog.editionBooks, key)) return false;
    for (const books of Object.values(catalog.editionBooks))
      if (!validBooks(books) || books.some((book, index) =>
        !canonicalCodes.has(book.code) || book.code !== catalog.books.uk[index].code)) return false;
  }
  return true;
}
async function getCatalog() {
  if (state.catalog) return state.catalog;
  const response = await fetch("/data/catalog.json");
  if (!response.ok) throw Error(response.status);
  const catalog = await response.json();
  if (!validBibleCatalog(catalog)) throw Error("Invalid Bible catalog data");
  state.catalog ??= catalog;
  return state.catalog;
}
async function getCMS() {
  try {
    const response = await fetch("/api/content", { cache: "no-store" });
    state.cms = response.ok ? await response.json() : {};
  } catch {
    state.cms = {};
  }
  return state.cms;
}
function rememberActiveAttempt(attempt) {
  // A server-accepted assessment must still open if the browser refuses
  // sessionStorage. The actual attemptId remains in the canonical route.
  state.activeAttempt = attempt;
  try {
    sessionStorage.setItem("sa.activeAttempt", attempt.attemptId);
    state.activeAttemptStorageUntrusted = false;
  } catch {
    state.activeAttemptStorageUntrusted = true;
    // Keep the accepted attempt in this tab; never re-POST start.
  }
}
function activeAttemptId() {
  if (state.activeAttempt?.attemptId) return state.activeAttempt.attemptId;
  // Browser progress from another/unknown principal must not authorize a
  // cached assessment link; the server always rechecks the real identity.
  if (state.localReadingStorageUntrusted || state.activeAttemptStorageUntrusted) return null;
  try { return sessionStorage.getItem("sa.activeAttempt"); }
  catch { state.activeAttemptStorageUntrusted = true; return null; }
}
function forgetActiveAttempt() {
  state.activeAttempt = null;
  try {
    sessionStorage.removeItem("sa.activeAttempt");
    state.activeAttemptStorageUntrusted = false;
  } catch {
    // Do not revive an old principal's attempt from a readable-but-undeletable
    // sessionStorage entry on the next missions route.
    state.activeAttemptStorageUntrusted = true;
  }
}
function forgetActiveAttemptIf(attemptId) {
  if (activeAttemptId() === attemptId) forgetActiveAttempt();
}

async function getSession() {
  // A startup read may finish after login or another session refresh. Only
  // the newest request for the still-current in-tab principal may publish.
  const requestEpoch=(getSession._epoch=(getSession._epoch||0)+1);
  const initialPrincipal=state.user,initialSessionEpoch=state.sessionEpoch||0;
  const current=()=>getSession._epoch===requestEpoch&&state.user===initialPrincipal&&(state.sessionEpoch||0)===initialSessionEpoch;
  let authenticatedUser;
  try {
    const response = await fetch("/api/account?action=me", { cache: "no-store" });
    // Only a validated 200 user:null is evidence that the account signed out.
    // A D1 outage, bad JSON or incomplete envelope must not erase local work.
    if (!response.ok) throw Error("account_unavailable");
    const data = await response.json();
    if (!data || typeof data !== "object" ||
        !Object.prototype.hasOwnProperty.call(data, "user") ||
        (data.user !== null && (typeof data.user !== "object" ||
          typeof data.user.id !== "string" || !data.user.id))) throw Error("account_unavailable");
    authenticatedUser = data.user;
  } catch {
    if(!current())return state.user;
    // Prevent uncertain server identity from granting access to private UI;
    // retain the device cache and ownership marker for a later verified retry.
    state.user = null;
    state.sessionUnavailable = true;
    state.progressSyncStatus = "unavailable";
    throw Error("account_unavailable");
  }
  if(!current())return state.user;
  // The server response, not browser storage availability, decides identity.
  // If the old owner's local progress cannot be safely read/cleared, discard
  // in-tab personal state and prohibit sending stale local reading to the server.
  const priorPrincipal = state.user?.id || null;
  state.user = authenticatedUser;
  state.sessionUnavailable = false;
  let previousOwner = null, markerReadable = true;
  try { previousOwner = localStorage.getItem('sa.progressOwner'); }
  catch { markerReadable = false; }
  // A logged-out tab cannot erase an unresolved orphan simply because its
  // authenticated principal disappeared. Retry preservation on a verified login.
  if (!state.user && state.unownedReadingPendingRecovery) return state.user;
  // An absent marker cannot establish that cached reading belongs to the
  // newly authenticated account. Retain exact unowned bytes for a separate,
  // explicit recovery/import decision before replacing the active cache.
  let unownedReading = false, unownedMission = false, preservedUnownedReading = true;
  // An unreadable owner marker is as ambiguous as an absent one: preserve
  // readable cached history before clearing or assigning a new principal.
  if (state.user && (!markerReadable || !previousOwner)) {
    try {
      const legacyReading = localStorage.getItem('sa.readingHistory');
      const legacyMission = localStorage.getItem('sa.mission.OTAB01');
      if (legacyReading !== null && legacyReading !== '[]' && legacyReading !== '') {
        unownedReading = true;
        const archiveKey = 'sa.unownedReadingHistory.v1';
        const priorArchive = localStorage.getItem(archiveKey);
        if (priorArchive === null) localStorage.setItem(archiveKey, legacyReading);
        preservedUnownedReading = localStorage.getItem(archiveKey) === legacyReading;
      }
      // Progress is private even when the reading list happens to be empty.
      // Do not misattribute guest/legacy mission bytes to the first login.
      const emptyMission = JSON.stringify({ index: 0, correct: [], complete: false });
      if (legacyMission !== null && legacyMission !== '' && legacyMission !== emptyMission) {
        unownedMission = true;
        const archiveKey = 'sa.unownedMissionProgress.v1';
        const priorArchive = localStorage.getItem(archiveKey);
        if (priorArchive === null) localStorage.setItem(archiveKey, legacyMission);
        preservedUnownedReading = preservedUnownedReading &&
          localStorage.getItem(archiveKey) === legacyMission;
      }
    } catch { preservedUnownedReading = false; }
  }
  if (!preservedUnownedReading) {
    // Unknown ownerless history after a failed read, denied archival write, or
    // conflicting archive: no wipe, ownership claim,
    // account upload or misleading in-memory progress for this account.
    state.localReadingStorageUntrusted = true;
    state.unownedReadingPendingRecovery = true;
    state.progressSyncStatus = 'unavailable';
    state.missionProgress = { index: 0, correct: [], complete: false };
    forgetActiveAttempt();
    return state.user;
  }
  state.unownedReadingPendingRecovery = false;
  const mustClear = unownedReading || unownedMission || (state.user && !previousOwner) ||
    !markerReadable || state.localReadingStorageUntrusted ||
    (priorPrincipal && priorPrincipal !== state.user?.id) ||
    (previousOwner && previousOwner !== state.user?.id);
  const cleared = mustClear ? clearPersonalProgress() : true;
  // Do not trust a storage shim that silently ignored a write. An orphan must
  // be absent from the active reading key before any new owner is certified.
  let verifiedClear = cleared;
  if (verifiedClear && (unownedReading || unownedMission)) {
    try {
      if (unownedReading) verifiedClear = localStorage.getItem('sa.readingHistory') === '[]';
      if (verifiedClear && unownedMission) verifiedClear =
        localStorage.getItem('sa.mission.OTAB01') ===
          JSON.stringify({ index: 0, correct: [], complete: false });
    } catch { verifiedClear = false; }
  }
  // An incomplete wipe must NEVER be certified by assigning the old browser
  // reading history to the newly authenticated principal.
  if (verifiedClear) {
    try {
      if (state.user) localStorage.setItem('sa.progressOwner', state.user.id);
      else localStorage.removeItem('sa.progressOwner');
    } catch {
      state.localReadingStorageUntrusted = true;
    }
  } else {
    state.localReadingStorageUntrusted = true;
    if (unownedReading || unownedMission) state.unownedReadingPendingRecovery = true;
  }
  return state.user;
}
async function getBook(code, explicitEdition = null) {
  const requestLocale = state.lang;
  const selected = explicitEdition || selectedEdition(requestLocale);
  if (explicitEdition && (!explicitEdition.local || !EDITIONS[requestLocale].includes(explicitEdition))) throw Error("Invalid local edition");
  const edition = selected.local ? selected : EDITIONS[requestLocale].find(e => e.local);
  const folder = edition.folder || requestLocale;
  const key = `${folder}:${code}`;
  if (!state.bookCache.has(key)) {
    const request = fetch(`/data/bible/${folder}/${code}.json`)
      .then(async (r) => {
        if (!r.ok) throw Error(r.status);
        const book = await r.json();
        const entries = state.catalog?.editionBooks &&
          Object.hasOwn(state.catalog.editionBooks, edition.id)
          ? state.catalog.editionBooks[edition.id] : state.catalog?.books?.[requestLocale];
        const expectedChapters = entries?.find((entry) => entry.code === code)?.chapters;
        if (!book || book.bookCode !== code || book.locale !== requestLocale ||
            book.editionId !== (edition.contentId || edition.id) || !Array.isArray(book.chapters) ||
            !book.chapters.length || book.chapters.length > 200 ||
            (expectedChapters && book.chapters.length !== expectedChapters)) {
          throw Error("Invalid Bible book data");
        }
        // Primary reading and parallel reading must enforce the same chapter
        // resource bounds before rendering Scripture or creating citations.
        // Index-based checks reject sparse arrays skipped by Array#some.
        for (let chapterIndex = 0; chapterIndex < book.chapters.length; chapterIndex += 1) {
          const chapter = book.chapters[chapterIndex];
          if (!Array.isArray(chapter) || !chapter.length || chapter.length > 256)
            throw Error("Invalid Bible book data");
          let characters = 0;
          for (let verseIndex = 0; verseIndex < chapter.length; verseIndex += 1) {
            const verse = chapter[verseIndex];
            if (typeof verse !== "string" || !verse.trim())
              throw Error("Invalid Bible book data");
            characters += verse.length;
            if (characters > 131072)
              throw Error("Invalid Bible book data");
          }
        }
        return book;
      })
      .catch((error) => {
        if (state.bookCache.get(key) === request) state.bookCache.delete(key);
        throw error;
      });
    state.bookCache.set(key, request);
  }
  return state.bookCache.get(key);
}
function localEditionMetadata(catalog) {
  const chosen = selectedEdition(state.lang);
  const local = chosen.local ? chosen : EDITIONS[state.lang]?.find(e => e.local);
  if (!local) throw Error("local_edition_unavailable");
  // Locale defaults must not be used as attribution for a distinct edition.
  const translated = catalog.translations?.[local.id];
  const regional = catalog.editions?.[state.lang];
  // A declared translation with a different embedded ID is corrupt; do not
  // fall back to the regional edition and misattribute its licensed verses.
  // The fallback is only legal when no translation entry was declared at all.
  const declared = Object.prototype.hasOwnProperty.call(catalog.translations || {}, local.id);
  const metadata = declared ? (translated?.id === local.id ? translated : null)
    : (local.contentId && regional?.id === local.contentId ? regional : null);
  if (!metadata || typeof metadata.title !== "string" || !metadata.title.trim() ||
      typeof metadata.license !== "string" || !metadata.license.trim() ||
      typeof metadata.source !== "string") throw Error("local_edition_provenance_unavailable");
  // Reuse the parallel-reader's exact publisher/rights length and type
  // contract. Reject a malformed attribution, giant license/title or URI
  // before any primary-reader DOM or private clipboard citation is created.
  if (!validEditionRightsMetadata(metadata)) {
    // Retain the existing distinct URL failure for unsafe source authorities.
    if (!safeProvenanceHttpsUrl(metadata.source) ||
        (metadata.licenseUrl!=null && !safeProvenanceHttpsUrl(metadata.licenseUrl)))
      throw Error("unsafe_edition_source");
    throw Error("local_edition_provenance_unavailable");
  }
  return metadata;
}
async function getMission() {
  state.mission ??= await fetch("/api/attempts?action=manifest", { cache: "no-store" }).then((r) => {
    if (!r.ok) throw Error(r.status);
    return r.json();
  });
  return state.mission;
}

// The Bible text is public content; a temporary quiz-manifest outage must not hide it.
async function readerMissionManifest() {
  try {
    const manifest = await getMission();
    if (manifest?.locked === true) {
      // A cached active-attempt snapshot must not hide tasks on later routes.
      state.mission = null;
      return manifest;
    }
    if (!Array.isArray(manifest?.chapters)) {
      // A malformed successful response must not crash reading or stay cached.
      state.mission = null;
      console.warn("Reader mission manifest is invalid");
      return null;
    }
    return manifest;
  } catch (error) {
    console.warn("Reader missions unavailable", error);
    return null;
  }
}
function setActiveNav(route) {
  document
    .querySelectorAll("[data-route]")
    .forEach((a) => {if(a.dataset.route===route)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
  nav.classList.remove("open");
  document.querySelector("#menu-toggle").setAttribute("aria-expanded", "false");
}
function shell(content) {
  main.innerHTML = `<div class="shell">${content}</div>`;
  main.querySelector('#target-book')?.setAttribute('aria-label',t('book'));
  const progress=main.querySelector('.mission-progress');
  if(progress){progress.setAttribute('aria-label',t('missionTitle'));progress.setAttribute('role','progressbar');progress.setAttribute('aria-valuemin','0');progress.setAttribute('aria-valuemax','100');progress.setAttribute('aria-valuenow',String(Math.round(parseFloat(progress.firstElementChild?.style.width)||0)))}
  main.focus({ preventScroll: true });
  requestAnimationFrame(() => {
    enhanceGroupForm();
    enhanceGroupsPage();
    enhanceGroupDetail();
  });
}
function statusBadge(kind) {
  return `<span class="status ${kind}">${esc(t(kind === "live" ? "available" : kind === "preview" ? "preview" : "comingSoon"))}</span>`;
}

async function renderHome() {
  setActiveNav("");
  main.innerHTML=homePage(state.lang,state.user);
  main.focus({preventScroll:true});
  if(!main.querySelector("[data-community-summary]")){
    const copy={uk:["користувачів платформи","у мережі"],ru:["пользователей платформы","в сети"],en:["platform members","online"]}[state.lang];
    main.querySelector(".hero-copy .lead")?.insertAdjacentHTML("afterend",`<div class="community-counter" data-community-summary><span><strong>—</strong>${copy[0]}</span><span><strong>—</strong>${copy[1]}</span></div>`);
  }
  main.querySelector("[data-community-summary]")?.setAttribute("aria-live","off");
  const refresh=async()=>{
    if(document.hidden)return;
    try{
      const response=await fetch("/api/community?public=summary",{cache:"no-store"});
      if(response.ok){const data=await response.json(),values=main.querySelectorAll("[data-community-summary] strong");if(values[0])values[0].textContent=new Intl.NumberFormat(state.lang).format(data.summary.registered);if(values[1])values[1].textContent=new Intl.NumberFormat(state.lang).format(data.summary.online)}
    }catch{}
  };
  await refresh();communityRefreshInterval=setInterval(refresh,30000);
}

const COMMUNITY_COPY={
  uk:{eye:"Люди Scripture Archive",title:"Спільнота навколо Писання",lead:"Відкритий огляд учасників, які дозволили показувати своє ім’я, та їхнього доступного навчального поступу.",members:"Користувачів платформи",online:"У мережі",visible:"Відкритих профілів",search:"Знайти учасника",placeholder:"Ім’я або прізвище",sort:"Упорядкувати",recent:"Нещодавно долучилися",active:"Спочатку активні",progress:"За поступом",name:"За іменем",reading:"Читає Писання",mission:"Виконує завдання",groups:"Працює з домашньою групою",exploring:"Переглядає платформу",away:"Не в мережі",onlineNow:"У мережі",chapters:"прочитано глав",missions:"завершено місій",joined:"Долучився",previous:"Попередня сторінка",next:"Наступна сторінка",empty:"Учасників за цим запитом не знайдено.",page:"Сторінка"},
  ru:{eye:"Люди Scripture Archive",title:"Сообщество вокруг Писания",lead:"Открытый обзор участников, разрешивших показывать имя, и доступного учебного прогресса.",members:"Пользователей платформы",online:"В сети",visible:"Открытых профилей",search:"Найти участника",placeholder:"Имя или фамилия",sort:"Упорядочить",recent:"Недавно присоединились",active:"Сначала активные",progress:"По прогрессу",name:"По имени",reading:"Читает Писание",mission:"Выполняет задание",groups:"Работает с домашней группой",exploring:"Просматривает платформу",away:"Не в сети",onlineNow:"В сети",chapters:"прочитано глав",missions:"завершено миссий",joined:"Присоединился",previous:"Предыдущая страница",next:"Следующая страница",empty:"Участников по этому запросу не найдено.",page:"Страница"},
  en:{eye:"People of Scripture Archive",title:"A community around Scripture",lead:"A public view of members who chose to share their name and their available learning progress.",members:"Platform members",online:"Online",visible:"Public profiles",search:"Find a member",placeholder:"First or last name",sort:"Sort",recent:"Recently joined",active:"Active first",progress:"By progress",name:"By name",reading:"Reading Scripture",mission:"Working on an assessment",groups:"Studying with a home group",exploring:"Exploring the platform",away:"Offline",onlineNow:"Online",chapters:"chapters read",missions:"missions completed",joined:"Joined",previous:"Previous page",next:"Next page",empty:"No members match this search.",page:"Page"}
};

async function renderCommunity(page=1,query="",sort="recent"){
  setActiveNav("community");
  const copy=COMMUNITY_COPY[state.lang]||COMMUNITY_COPY.uk,params=new URLSearchParams({page:String(page),pageSize:innerWidth<=760?"12":"24",sort});
  if(query)params.set("q",query);
  const response=await fetch(`/api/community?${params}`,{cache:"no-store"});
  if(!response.ok)throw Error(String(response.status));
  const data=await response.json(),number=value=>new Intl.NumberFormat(state.lang).format(Number(value)||0);
  const activity=member=>copy[member.activity]||copy.away;
  shell(`<section class="community-hero"><p class="eyebrow">${copy.eye}</p><h1>${copy.title}</h1><p class="lead">${copy.lead}</p><div class="community-metrics" aria-label="${copy.title}"><article><strong>${number(data.summary.registered)}</strong><span>${copy.members}</span></article><article><strong>${number(data.summary.online)}</strong><span>${copy.online}</span></article><article><strong>${number(data.summary.visible)}</strong><span>${copy.visible}</span></article></div></section><form id="community-filter" class="community-filter" role="search"><label><span>${copy.search}</span><input name="q" type="search" value="${esc(query)}" placeholder="${copy.placeholder}" maxlength="60"></label><label><span>${copy.sort}</span><select name="sort"><option value="recent" ${sort==="recent"?"selected":""}>${copy.recent}</option><option value="active" ${sort==="active"?"selected":""}>${copy.active}</option><option value="progress" ${sort==="progress"?"selected":""}>${copy.progress}</option><option value="name" ${sort==="name"?"selected":""}>${copy.name}</option></select></label><button class="button" type="submit">${copy.search}</button></form><div class="community-list">${data.members.length?data.members.map(member=>`<article class="community-member"><div class="member-heading"><div class="member-monogram" aria-hidden="true">${esc(member.displayName.trim().slice(0,1))}</div><div><h2>${esc(member.displayName)}</h2><p class="member-status ${member.online?"online":""}"><span aria-hidden="true"></span>${member.online?copy.onlineNow:activity(member)}</p></div></div><p>${activity(member)}</p><dl><div><dt>${copy.chapters}</dt><dd>${number(member.chaptersRead)}</dd></div><div><dt>${copy.missions}</dt><dd>${number(member.missionsCompleted)}</dd></div></dl><small>${copy.joined}: ${new Intl.DateTimeFormat(state.lang,{dateStyle:"medium"}).format(new Date(`${member.joinedAt.replace(" ","T")}Z`))}</small></article>`).join(""):`<p class="notice">${copy.empty}</p>`}</div><nav class="community-pagination" aria-label="${copy.page}"><button class="button" data-community-page="${data.page-1}" ${data.page<=1?"disabled":""}>← ${copy.previous}</button><span>${copy.page} ${data.page} / ${data.totalPages}</span><button class="button" data-community-page="${data.page+1}" ${data.page>=data.totalPages?"disabled":""}>${copy.next} →</button></nav>`);
  document.querySelector("#community-filter").onsubmit=event=>{event.preventDefault();const form=new FormData(event.currentTarget);renderCommunity(1,String(form.get("q")||""),String(form.get("sort")||"recent"))};
  document.querySelectorAll("[data-community-page]").forEach(button=>button.onclick=()=>renderCommunity(Number(button.dataset.communityPage),query,sort));
}

function normalizeTimer() {
  const timer = state.studyTimer || {};
  timer.durationMinutes = Math.min(
    10080,
    Math.max(0, Number(timer.durationMinutes) || 0),
  );
  timer.remainingSeconds = Math.max(
    0,
    Number.isFinite(Number(timer.remainingSeconds)) ? Number(timer.remainingSeconds) : timer.durationMinutes * 60,
  );
  if (timer.running && timer.durationMinutes > 0 && timer.endsAt)
    timer.remainingSeconds = Math.max(
      0,
      Math.ceil((Number(timer.endsAt) - Date.now()) / 1000),
    );
  if (timer.running && timer.durationMinutes > 0 && !timer.remainingSeconds) {
    timer.running = false;
    timer.endsAt = null;
  }
  state.studyTimer = timer;
  return timer;
}
const TIMER_EPHEMERAL_COPY = {
  uk: "Таймер працює лише в цій вкладці: браузер не дозволяє зберегти його стан.",
  ru: "Таймер работает только в этой вкладке: браузер не разрешает сохранить его состояние.",
  en: "Timer works only in this tab: the browser could not save its state.",
};
function saveTimer() {
  // Browser storage may be disabled or full. Retain the live timer in memory;
  // never claim that its state will survive a reload when persistence failed.
  try {
    localStorage.setItem("sa.studyTimer", JSON.stringify(state.studyTimer));
    return true;
  } catch {
    return false;
  }
}
function timerText(timer) {
  if (timer.durationMinutes === 0)
    return timer.running ? t("timerActive") : t("noLimit");
  const seconds = Math.max(0, Math.ceil(timer.remainingSeconds));
  const hours = Math.floor(seconds / 3600),
    minutes = Math.floor((seconds % 3600) / 60),
    rest = seconds % 60;
  return `${hours ? String(hours).padStart(2, "0") + ":" : ""}${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}
function timerCard() {
  const timer = normalizeTimer();
  return `<div class="card study-timer"><p class="eyebrow">${t("timerTitle")}</p><p>${t("timerIntro")}</p><label class="account-field"><span>${t("minutes")}</span><input id="timer-minutes" type="number" min="0" max="10080" step="1" value="${timer.durationMinutes}"></label><div class="timer-display" id="timer-display" role="timer" aria-live="off">${timerText(timer)}</div><div class="timer-actions"><button class="button primary" id="timer-start" type="button">${timer.running ? t("timerPause") : t("timerStart")}</button><button class="button" id="timer-reset" type="button">${t("timerReset")}</button></div><p class="timer-status" id="timer-status" role="status"></p></div>`;
}
function activateTimer() {
  clearInterval(timerInterval);
  const input = document.querySelector("#timer-minutes"),
    display = document.querySelector("#timer-display"),
    start = document.querySelector("#timer-start"),
    reset = document.querySelector("#timer-reset"),
    status = document.querySelector("#timer-status");
  if (!input) return;
  const paint = () => {
    const timer = normalizeTimer();
    display.textContent = timerText(timer);
    start.textContent = timer.running ? t("timerPause") : t("timerStart");
    input.disabled = timer.running;
    if (
      !timer.running &&
      timer.durationMinutes > 0 &&
      timer.remainingSeconds === 0
    ) {
      status.textContent = t("timerDone");
      play("done");
    }
    // A successful retry must retract the old temporary-only notice; no
    // other status (including a completion announcement) is overwritten.
    const saved = saveTimer();
    if (saved && Object.values(TIMER_EPHEMERAL_COPY).includes(status.textContent))
      status.textContent = "";
    else if (!saved && !status.textContent)
      status.textContent = TIMER_EPHEMERAL_COPY[state.lang] || TIMER_EPHEMERAL_COPY.uk;
  };
  input.onchange = () => {
    const value = Math.min(
      10080,
      Math.max(0, Math.floor(Number(input.value) || 0)),
    );
    state.studyTimer = {
      durationMinutes: value,
      remainingSeconds: value * 60,
      running: false,
      endsAt: null,
    };
    status.textContent = "";
    paint();
  };
  start.onclick = () => {
    const timer = normalizeTimer();
    status.textContent = "";
    if (timer.running) {
      if (timer.durationMinutes > 0 && timer.endsAt)
        timer.remainingSeconds = Math.max(
          0,
          Math.ceil((timer.endsAt - Date.now()) / 1000),
        );
      timer.running = false;
      timer.endsAt = null;
    } else {
      timer.running = true;
      if (timer.durationMinutes > 0) {
        if (!timer.remainingSeconds)
          timer.remainingSeconds = timer.durationMinutes * 60;
        timer.endsAt = Date.now() + timer.remainingSeconds * 1000;
      }
    }
    paint();
  };
  reset.onclick = () => {
    const minutes = Math.min(
      10080,
      Math.max(0, Math.floor(Number(input.value) || 0)),
    );
    state.studyTimer = {
      durationMinutes: minutes,
      remainingSeconds: minutes * 60,
      running: false,
      endsAt: null,
    };
    status.textContent = "";
    paint();
  };
  paint();
  timerInterval = setInterval(() => {
    // normalizeTimer() changes running to false at the deadline. Remember
    // whether this tick crossed that boundary so completion is announced.
    const wasRunning = Boolean(state.studyTimer?.running);
    const timer = normalizeTimer();
    if (timer.durationMinutes > 0 &&
        (timer.running || (wasRunning && timer.remainingSeconds === 0))) {
      paint();
      if (!timer.running) clearInterval(timerInterval);
    }
  }, 1000);
}

const ATTEMPT_COPY = {
  uk: {
    finishReading: "Я завершив читання",
    transition: "Перейти до завдань",
    prepareTitle: "Перевірка з пам’яті",
    prepareText: "Після початку текст цієї глави буде закрито. Відповідайте з пам’яті.",
    prepareRules: ["Відкриття цієї глави в читальні анулює незавершену спробу.", "Для нової спроби потрібно знову прочитати главу.", "Правильні відповіді та пояснення з’являться тільки після завершення."],
    cancel: "Залишитися в читальні",
    begin: "Почати завдання",
    lockedTitle: "Незавершену спробу анульовано",
    lockedText: "Під час активної перевірки було відкрито ту саму главу. Щоб почати нову спробу, уважно прочитайте її ще раз.",
    reread: "Перечитати главу",
    memory: "Текст глави закрито. Дайте відповідь із пам’яті.",
    submit: "Зберегти відповідь",
    completed: "Спробу завершено",
    score: "Правильних відповідей",
    mastered: "Засвоєні уривки",
    mistakes: "Що варто переглянути",
    noMistakes: "Усі відповіді правильні.",
    reopen: "Знову відкрити текст",
    readRequired: "Спочатку завершіть читання цієї глави.",
    retryLoad: "Повторити завантаження",
    groupNotRecorded: "Результат збережено особисто, але не збережено для групи. Перевірте членство або наявність групи.",
  },
  ru: {
    finishReading: "Я завершил чтение",
    transition: "Перейти к заданиям",
    prepareTitle: "Проверка по памяти",
    prepareText: "После начала текст этой главы будет закрыт. Отвечайте по памяти.",
    prepareRules: ["Открытие этой главы в читальне аннулирует незавершённую попытку.", "Для новой попытки нужно снова прочитать главу.", "Правильные ответы и пояснения появятся только после завершения."],
    cancel: "Остаться в читальне",
    begin: "Начать задания",
    lockedTitle: "Незавершённая попытка аннулирована",
    lockedText: "Во время активной проверки была открыта та же глава. Чтобы начать новую попытку, внимательно прочитайте её снова.",
    reread: "Перечитать главу",
    memory: "Текст главы закрыт. Ответьте по памяти.",
    submit: "Сохранить ответ",
    completed: "Попытка завершена",
    score: "Правильных ответов",
    mastered: "Освоенные отрывки",
    mistakes: "Что стоит повторить",
    noMistakes: "Все ответы правильные.",
    reopen: "Снова открыть текст",
    readRequired: "Сначала завершите чтение этой главы.",
    retryLoad: "Повторить загрузку",
    groupNotRecorded: "Результат сохранён лично, но не сохранён для группы. Проверьте членство или наличие группы.",
  },
  en: {
    finishReading: "I have finished reading",
    transition: "Continue to the questions",
    prepareTitle: "Answer from memory",
    prepareText: "Once you begin, this chapter will close. Answer from memory.",
    prepareRules: ["Opening this chapter in the reader invalidates an unfinished attempt.", "You must read the chapter again before a new attempt.", "Correct answers and explanations appear only after the attempt is complete."],
    cancel: "Stay in the reader",
    begin: "Begin questions",
    lockedTitle: "The unfinished attempt was invalidated",
    lockedText: "The same chapter was opened during an active attempt. Read it carefully again before starting a new attempt.",
    reread: "Read the chapter again",
    memory: "The chapter text is closed. Answer from memory.",
    submit: "Save answer",
    completed: "Attempt complete",
    score: "Correct answers",
    mastered: "Passages understood",
    mistakes: "Review these points",
    noMistakes: "Every answer was correct.",
    reopen: "Open the text again",
    readRequired: "Finish reading this chapter first.",
    retryLoad: "Retry loading",
    groupNotRecorded: "The result was saved personally, but not for the group. Check your membership and whether the group still exists.",
  },
};

const attemptChannel = "BroadcastChannel" in window ? new BroadcastChannel("scripture-archive-attempts") : null;

async function attemptRequest(action, method = "GET", body, params = "") {
  const query = [action && `action=${encodeURIComponent(action)}`, params].filter(Boolean).join("&");
  const response = await fetch(`/api/attempts${query ? `?${query}` : ""}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Error(data.error || response.status);
  return data;
}

function renderLockedChapter(book, chapter) {
  const copy = ATTEMPT_COPY[state.lang];
  shell(`<section class="gate-panel attempt-locked" role="alert"><p class="eyebrow">Scripture Archive</p><h1>${copy.lockedTitle}</h1><p class="lead">${copy.lockedText}</p><a class="button primary" href="/reader/${book}/${chapter}">${copy.reread}</a></section>`);
}

const bookmarkCopy = {
  uk: { title: "Закладки", save: "Додати цю главу", remove: "Прибрати цю главу", empty: "У цьому виданні закладок ще немає.", login: "Увійдіть, щоб зберігати закладки в обліковому записі.", error: "Не вдалося завантажити або зберегти закладки. Спробуйте ще раз.", partial: "Деякі збережені закладки пошкоджені й не показані. Список неповний; записи не видалено.", recoveryTitle: "Пошкоджені записи для відновлення", recoveryAction: "Перевірити та видалити", recoveryConfirm: "Безповоротно видалити лише цей пошкоджений запис?", recoveryError: "Не вдалося підтвердити видалення. Оновіть список; інші закладки залишилися без змін." },
  ru: { title: "Закладки", save: "Добавить эту главу", remove: "Убрать эту главу", empty: "В этом издании пока нет закладок.", login: "Войдите, чтобы сохранять закладки в учётной записи.", error: "Не удалось загрузить или сохранить закладки. Попробуйте ещё раз.", partial: "Некоторые сохранённые закладки повреждены и не показаны. Список неполный; записи не удалены.", recoveryTitle: "Повреждённые записи для восстановления", recoveryAction: "Проверить и удалить", recoveryConfirm: "Безвозвратно удалить только эту повреждённую запись?", recoveryError: "Удаление не подтверждено. Обновите список; остальные закладки не изменены." },
  en: { title: "Bookmarks", save: "Bookmark this chapter", remove: "Remove this bookmark", empty: "No bookmarks in this edition yet.", login: "Sign in to save bookmarks to your account.", error: "Could not load or save bookmarks. Please try again.", partial: "Some saved bookmarks are damaged and are not shown. This list is incomplete; the records have not been deleted.", recoveryTitle: "Damaged entries to recover", recoveryAction: "Review and remove", recoveryConfirm: "Permanently remove only this damaged entry?", recoveryError: "Deletion was not confirmed. Refresh the list; other bookmarks were not changed." },
};

async function mountReaderBookmarks(meta, chapter, edition, books) {
  const panel = document.querySelector("#reader-bookmarks");
  if (!panel) return;
  const copy = bookmarkCopy[state.lang] || bookmarkCopy.uk;
  // A response started under one principal must never paint into another
  // principal's reader, even if the panel node has not been detached yet.
  // Reader navigation may replace the chapter without replacing this panel or user.
  // Bind delayed bookmark reads and click handlers to the actual chapter lease.
  const principal = state.user;
  const readerContext = state.currentReader;
  const isCurrent = () => panel.isConnected && state.user === principal && state.currentReader === readerContext;
  if (!state.user) { panel.innerHTML = `<h2>${copy.title}</h2><p>${copy.login}</p>`; return; }
  const current = { edition: edition.id, book: meta.code, chapter };
  async function load() {
    const response = await fetch("/api/bookmarks", { cache: "no-store" });
    if (!response.ok) throw Error("bookmark_load_failed");
    const data = await response.json();
    if (!Array.isArray(data.bookmarks)) throw Error("bookmark_load_failed");
    if (!isCurrent()) return;
    // Historical or corrupt bookmarks must never generate links to chapters that
    // do not exist in the selected edition, or hide otherwise valid entries.
    const items = data.bookmarks.filter(item => {
      if (item?.edition !== edition.id) return false;
      const sourceBook = books.find(book => book.code === item.book);
      return Number.isSafeInteger(item.chapter) && item.chapter > 0 &&
        Number.isSafeInteger(sourceBook?.chapters) && item.chapter <= sourceBook.chapters;
    });
    const saved = items.some(item => item.book === meta.code && item.chapter === chapter);
    // Server-issued recovery references never become navigation links or HTML
    // attributes. Descriptions are untrusted legacy database text.
    const recoverable = Array.isArray(data.invalid_bookmarks)
      ? data.invalid_bookmarks.filter(entry => typeof entry?.reference === "string"
        && /^[1-9][0-9]{0,15}\.[0-9a-f]{64}$/.test(entry.reference)
        && typeof entry.description === "string" && entry.description.length <= 256) : [];
    const recoveryMarkup = recoverable.length ? `<section aria-label="${copy.recoveryTitle}"><h3>${copy.recoveryTitle}</h3><ul>${recoverable.map((entry, index) => `<li><span>${esc(entry.description)}</span> <button class="button" type="button" data-recovery-index="${index}">${copy.recoveryAction}</button></li>`).join("")}</ul></section>` : "";
    panel.innerHTML = `<h2>${copy.title}</h2>${data.warning === "partial_bookmarks" ? `<p role="alert">${copy.partial}</p>` : ""}<button class="button" type="button" id="toggle-bookmark" aria-pressed="${saved}">${saved ? copy.remove : copy.save}</button><p role="status" id="bookmark-status" aria-live="polite"></p>${items.length ? `<ul>${items.map(item => { const book = books.find(value => value.code === item.book); return `<li><a href="/reader/${encodeURIComponent(item.book)}/${item.chapter}">${esc(bookTitle(book))} ${item.chapter}</a></li>`; }).join("")}</ul>` : `<p>${data.warning === "partial_bookmarks" ? "" : copy.empty}</p>`}${recoveryMarkup}`;
    panel.querySelectorAll?.("[data-recovery-index]").forEach(button => {
      const index = Number(button.dataset.recoveryIndex);
      const entry = recoverable[index];
      if (!entry) return;
      button.addEventListener("click", async () => {
        if (!isCurrent() || globalThis.confirm?.(copy.recoveryConfirm + "\n" + entry.description) !== true || !isCurrent()) return;
        button.disabled = true;
        try {
          const response = await fetch("/api/bookmarks", {
            method: "DELETE", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ recovery_ref: entry.reference }),
          });
          const receipt = await response.json();
          if (!response.ok || receipt?.ok !== true) throw Error("bookmark_recovery_failed");
          if (!isCurrent()) return;
          await load();
          if (isCurrent()) panel.querySelector("#toggle-bookmark")?.focus();
        } catch {
          if (!isCurrent()) return;
          const status = panel.querySelector("#bookmark-status");
          if (status) status.textContent = copy.recoveryError;
          button.disabled = false;
        }
      });
    });
    panel.querySelector("#toggle-bookmark").addEventListener("click", async event => {
      if (!isCurrent()) return;
      const button = event.currentTarget;
      button.disabled = true;
      try {
        const response = await fetch("/api/bookmarks", { method: saved ? "DELETE" : "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(current) });
        if (!response.ok) throw Error("bookmark_save_failed");
        await load();
        if (isCurrent()) panel.querySelector("#toggle-bookmark")?.focus();
      } catch {
        if (!isCurrent()) return;
        const status = panel.querySelector("#bookmark-status");
        if (status) status.textContent = copy.error;
        button.disabled = false;
      }
    });
  }
  try { await load(); } catch { if (isCurrent()) panel.innerHTML = `<h2>${copy.title}</h2><p role="alert">${copy.error}</p>`; }
}

attemptChannel?.addEventListener("message", event => {
  const message = event.data;
  if (message?.type === "attempt-started" && state.currentReader?.book === message.book && state.currentReader?.chapter === message.chapter) {
    state.currentReader = null;
    renderLockedChapter(message.book, message.chapter);
  }
});

// A copied excerpt preserves its exact edition, licensing and primary source.
function readerCitationText(reference, verseText, edition, permalink) {
  return [
    `${reference} ${verseText}`,
    `${edition.title} · ${edition.license}`,
    edition.attribution || "",
    edition.source,
    permalink,
  ].filter(Boolean).join("\n");
}

function readerVerseUrl(code, chapter, verse) {
  return `/reader/${encodeURIComponent(code)}/${chapter}?verse=${verse}`;
}
function readerVerseFromUrl(url, availableVerses) {
  if (!Number.isSafeInteger(availableVerses) || availableVerses < 1) return null;
  const values = new URL(url).searchParams.getAll("verse");
  if (values.length !== 1 || !/^[1-9][0-9]*$/.test(values[0])) return null;
  const value = Number(values[0]);
  return Number.isSafeInteger(value) && value <= availableVerses ? value : null;
}

// Reject fractional, scientific, hexadecimal and unsafe chapter coordinates;
// leave valid numbers above the edition-specific limit clamped to its last chapter.
function readerChapterNumber(value, maxChapters) {
  if (!Number.isSafeInteger(maxChapters) || maxChapters < 1) return 1;
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string" && /^[1-9][0-9]*$/.test(value) ? Number(value) : NaN;
  if (!Number.isSafeInteger(parsed) || parsed < 1) return 1;
  return Math.min(parsed, maxChapters);
}

async function onReaderEditionChange(event, parts) {
  // Only trusted catalogue entries can be remembered or used for the current tab.
  const lang = state.lang;
  const nextEdition = EDITIONS[lang]?.find(item => item.id === event.target?.value);
  if (!nextEdition) { announce(t("errorLoad")); return; }
  const restoreFocus = document.activeElement === event.currentTarget;
  const readerUrl = location.pathname + location.search + location.hash;
  const saved = storeReaderPreference(`sa.edition.${lang}`, nextEdition.id);
  setEditionForTab(lang, nextEdition.id);
  if (saved) transientEditionStorageDenied.delete(lang);
  else transientEditionStorageDenied.add(lang);
  await renderReader(parts);
  if (!saved && state.lang === lang && location.pathname + location.search + location.hash === readerUrl)
    announce(EDITION_TRANSIENT_MESSAGES[lang]);
  if (restoreFocus && document.activeElement === main &&
      location.pathname + location.search + location.hash === readerUrl)
    document.querySelector("#bible-edition")?.focus({preventScroll: true});
}

async function renderReader(parts) {
  // A later same-account navigation owns every pending reader continuation.
  // The token is transient and non-enumerable, so it is not saved as account data.
  const readerRenderToken = {};
  Object.defineProperty(state, "__readerRenderToken", {
    value: readerRenderToken, writable: true, configurable: true,
  });
  const readerPrincipal = state.user;
  const readerRoute = typeof location === "undefined" ? null :
    `${location.pathname || ""}${location.search || ""}${location.hash || ""}`;
  const readerInvocationCurrent = () =>
    state.__readerRenderToken === readerRenderToken &&
    (readerRoute === null || (typeof location !== "undefined" &&
      `${location.pathname || ""}${location.search || ""}${location.hash || ""}` === readerRoute));
  setActiveNav("reader");
  const catalog = await getCatalog();
  if (state.user !== readerPrincipal || !readerInvocationCurrent() || (typeof location !== "undefined" && location.pathname && !location.pathname.startsWith("/reader"))) return;
  const chosenEdition = selectedEdition(state.lang);
  const books = catalog.editionBooks && Object.hasOwn(catalog.editionBooks, chosenEdition.id)
    ? catalog.editionBooks[chosenEdition.id] : catalog.books[state.lang];
  // A damaged saved reader record must not make the real Bible route permanently unusable.
  const savedBook = typeof state.reader?.book === "string" ? state.reader.book : "GEN";
  const code = (parts[1] || savedBook || "GEN").toUpperCase();
  // A missing path segment may resume the saved reader (or default to GEN),
  // but an explicit unknown book must never silently show GEN as if it were
  // the requested source. Reject it before chapter/attempt requests or DOM.
  const meta = books.find((b) => b.code === code) || (parts[1] ? null : books[0]);
  if (!meta) {
    // Retire an earlier reader context so pending private callbacks cannot
    // populate this invalid deep link after navigation.
    state.currentReader = null;
    shell(`<section class="gate-panel" role="alert"><h1>${t("errorLoad")}</h1><p><a href="/reader">${t("reader")}</a></p></section>`);
    return;
  }
  const chapter = readerChapterNumber(parts[2] || state.reader?.chapter || 1, meta.chapters);
  const groupId = parts[3] === "group" ? parts[4] || "" : "";
  state.currentReader = { book: meta.code, chapter };
  const readerContext = state.currentReader;
  const readerStillCurrent = () => readerInvocationCurrent() && state.currentReader === readerContext && state.user === readerPrincipal;
  try {
    const attemptState = await attemptRequest("chapter", "POST", { book: meta.code, chapter });
    if (!readerStillCurrent()) return;
    if (!attemptState || typeof attemptState.invalidated !== "boolean") {
      throw new Error("invalid_attempt_guard_response");
    }
    if (attemptState.invalidated) {
      forgetActiveAttempt();
      state.mission = null;
      state.currentReader = null;
      renderLockedChapter(meta.code, chapter);
      return;
    }
  } catch {
    if (!readerStillCurrent()) return;
    state.currentReader = null;
    shell(`<section class="gate-panel" role="alert"><h1>${t("errorLoad")}</h1></section>`);
    return;
  }
  let book;
  try {
    book = await getBook(meta.code);
  } catch (error) {
    // A cancelled chapter must never let the route-level error handler
    // replace a newer account or page with an obsolete failure.
    if (!readerStillCurrent()) return;
    throw error;
  }
  // A different device may start a new attempt while the Bible JSON loads.
  // Prevent the async reader from undoing an invalidation in another tab.
  if (!readerStillCurrent()) return;
  try {
    const finalState = await attemptRequest("chapter", "POST", { book: meta.code, chapter });
    if (!readerStillCurrent()) return;
    if (!finalState || typeof finalState.invalidated !== "boolean") throw Error("invalid_attempt_guard_response");
    if (finalState.invalidated) {
      forgetActiveAttempt();
      state.mission = null;
      state.currentReader = null;
      renderLockedChapter(meta.code, chapter);
      return;
    }
  } catch {
    if (!readerStillCurrent()) return;
    state.currentReader = null;
    shell(`<section class="gate-panel" role="alert"><h1>${t("errorLoad")}</h1></section>`);
    return;
  }
  const verses = book.chapters[chapter - 1];
  // Never focus a verse in a different book/chapter from the URL.
  const verseCoordinateMatches = parts[1] === meta.code && parts[2] === String(chapter);
  const selectedVerse = verseCoordinateMatches ? readerVerseFromUrl(location.href, verses.length) : null;
  // Do not replace the last readable bookmark when book loading fails.
  state.reader = { book: meta.code, chapter };
  // Browser preference storage is optional; never block an authorized chapter.
  try { localStorage.setItem("sa.reader", JSON.stringify(state.reader)); }
  catch { /* Keep the current chapter in memory without claiming durable persistence. */ }
  const edition = localEditionMetadata(catalog),
    editionInfo = editionDetails(edition, meta.code);
  const citationCopy = {
    uk: { button: "Цитувати", label: "Копіювати вірш із джерелом", done: "Цитату з джерелом скопійовано", error: "Не вдалося скопіювати цитату" },
    ru: { button: "Цитировать", label: "Копировать стих с источником", done: "Цитата с источником скопирована", error: "Не удалось скопировать цитату" },
    en: { button: "Cite", label: "Copy verse with source", done: "Verse and source copied", error: "Could not copy the verse" },
  }[state.lang];
  const options = books
    .map(
      (b) =>
        `<option value="${b.code}" ${b.code === meta.code ? "selected" : ""}>${esc(bookTitle(b))}</option>`,
    )
    .join("");
  const chapters = Array.from(
    { length: meta.chapters },
    (_, i) =>
      `<option value="${i + 1}" ${i + 1 === chapter ? "selected" : ""}>${i + 1}</option>`,
  ).join("");
  shell(
    `<div class="section-head reader-heading"><div><p class="eyebrow">${t("reader")}</p><h1>${t("readerTitle")}</h1></div><p>${t("readerIntro")}</p></div><div class="toolbar"><div class="field grow"><label for="book-select">${t("book")}</label><select id="book-select">${options}</select></div><div class="field"><label for="chapter-select">${t("chapter")}</label><select id="chapter-select">${chapters}</select></div><div class="field"><label for="verse-select">${t("verse")}</label><select id="verse-select"><option value="" ${selectedVerse === null ? "selected" : ""}>—</option>${verses.map((_, i) => `<option value="${i + 1}" ${selectedVerse === i + 1 ? "selected" : ""}>${i + 1}</option>`).join("")}</select></div><form id="book-search" class="field grow"><label for="search-input">${t("searchBook")}</label><div style="display:flex;gap:.4rem"><input id="search-input" type="search" placeholder="${t("searchPlaceholder")}"><button class="button" type="submit">${t("search")}</button></div></form></div><div class="reader-layout"><article class="reading-pane"><p class="eyebrow">${meta.testament === "OT" ? t("oldTestament") : t("newTestament")}</p><h1>${esc(bookTitle(meta))} ${chapter}</h1><p class="chapter-meta">${esc(editionInfo.title)}</p><div class="verses">${verses.map((v, i) => `<p class="verse" id="v${i + 1}" ${selectedVerse === i + 1 ? 'data-selected-verse tabindex="-1"' : ''}><a class="verse-number" href="${readerVerseUrl(meta.code, chapter, i + 1)}" aria-label="${esc(bookTitle(meta))} ${chapter}:${i + 1}">${i + 1}</a> ${esc(bibleText(v))} <button type="button" class="verse-cite" data-verse-cite="${i + 1}" aria-label="${esc(citationCopy.label)}: ${esc(bookTitle(meta))} ${chapter}:${i + 1}">${esc(citationCopy.button)}</button></p>`).join("")}</div><p id="reader-cite-status" role="status" aria-live="polite"></p><div class="chapter-nav">${chapter > 1 ? `<a class="button" href="/reader/${meta.code}/${chapter - 1}">← ${t("previous")}</a>` : "<span></span>"}${chapter < meta.chapters ? `<a class="button" href="/reader/${meta.code}/${chapter + 1}">${t("next")} →</a>` : "<span></span>"}</div></article><aside class="reader-aside"><div class="card edition-card"><h2>${t("edition")}</h2><p><strong>${esc(editionInfo.title)}</strong></p>${editionInfo.note ? `<p>${esc(editionInfo.note)}</p>` : ""}<p>${t("license")}: ${esc(editionInfo.license)}</p><a href="${esc(editionInfo.source)}" target="_blank" rel="noreferrer">${t("sourceLink")} ↗</a></div>${editionToggle(meta.code)}${timerCard()}<div class="card" id="search-panel" hidden><h2>${t("search")}</h2><ol class="search-results" id="search-results" tabindex="-1"></ol></div></aside></div>`,
  );
  activateTimer();
  document.querySelector(".verses")?.addEventListener("click", async event => {
    const button = event.target?.closest?.("button[data-verse-cite]");
    if (!button || !readerStillCurrent()) return;
    const rawVerse = button.dataset.verseCite;
    if (!/^[1-9][0-9]*$/.test(rawVerse || "")) return;
    const number = Number(rawVerse);
    if (!Number.isSafeInteger(number) || number > verses.length) return;
    const status = document.querySelector("#reader-cite-status");
    if (!status) return;
    status.textContent = "";
    // A chapter may become assessment-locked after the reader was rendered.
    // The parallel reader already rechecks before copying; the primary reader
    // must enforce the same server authority before exposing its citation.
    const citationStillCurrent = () => readerStillCurrent() && button.isConnected &&
      document.querySelector("#reader-cite-status") === status;
    let chapterGuard;
    try {
      chapterGuard = await attemptRequest("chapter", "POST", { book: meta.code, chapter });
    } catch {
      if (citationStillCurrent()) {
        state.currentReader = null;
        shell(`<section class="gate-panel" role="alert"><h1>${t("errorLoad")}</h1></section>`);
      }
      return;
    }
    if (!citationStillCurrent()) return;
    if (!chapterGuard || typeof chapterGuard.invalidated !== "boolean") {
      state.currentReader = null;
      shell(`<section class="gate-panel" role="alert"><h1>${t("errorLoad")}</h1></section>`);
      return;
    }
    if (chapterGuard.invalidated) {
      forgetActiveAttempt();
      state.mission = null;
      state.currentReader = null;
      renderLockedChapter(meta.code, chapter);
      return;
    }
    try {
      if (!navigator.clipboard?.writeText) throw Error("clipboard_unavailable");
      const citation = readerCitationText(
        `${bookTitle(meta)} ${chapter}:${number}.`,
        bibleText(verses[number - 1]),
        editionInfo,
        new URL(readerVerseUrl(meta.code, chapter, number), location.origin).href,
      );
      await navigator.clipboard.writeText(citation);
      if (readerStillCurrent() && button.isConnected && document.querySelector("#reader-cite-status") === status)
        status.textContent = citationCopy.done;
    } catch {
      if (readerStillCurrent() && button.isConnected && document.querySelector("#reader-cite-status") === status)
        status.textContent = citationCopy.error;
    }
  });
  document.querySelector(".reader-aside")?.insertAdjacentHTML("beforeend", '<section class="card" id="reader-bookmarks" aria-live="polite"></section>');
  void mountReaderBookmarks(meta, chapter, chosenEdition, books);
  const parallelEditions = chosenEdition.local ? EDITIONS[state.lang].filter(item => item.local && item.id !== chosenEdition.id) : [];
  if (parallelEditions.length) {
    const aside = document.querySelector('.reader-aside');
    aside.insertAdjacentHTML('beforeend', parallelControls(parallelEditions, state.lang, esc));
    const panel = aside.querySelector('.parallel-reader');
    mountParallelReader(panel, { editions: parallelEditions, catalog, lang: state.lang, book: meta.code, bookTitle: bookTitle(meta), chapter, getBook, esc,
      check: (code, number) => attemptRequest('chapter', 'POST', { book: code, chapter: number }),
      current: readerStillCurrent,
      lock: () => { forgetActiveAttempt(); state.mission=null; state.currentReader=null; renderLockedChapter(meta.code,chapter); },
      failClosed: () => { state.currentReader=null; shell(`<section class="gate-panel" role="alert"><h1>${t("errorLoad")}</h1></section>`); },
    });
  }
  const editionText = transientEditionStorageDenied.has(state.lang)
    ? {...editionCopy[state.lang], externalNote: EDITION_TRANSIENT_MESSAGES[state.lang]}
    : editionCopy[state.lang];
  if(editionInfo.attribution) document.querySelector('.edition-card').insertAdjacentHTML('beforeend', `<p class="edition-attribution">${esc(editionInfo.attribution)}</p>`);
  if(editionInfo.licenseUrl) document.querySelector('.edition-card').insertAdjacentHTML('beforeend', `<a href="${esc(editionInfo.licenseUrl)}" target="_blank" rel="noreferrer">${esc(editionInfo.license)} ↗</a>`);
  document.querySelector('.toolbar').insertAdjacentHTML('afterbegin',editionSelect(state.lang,esc,chosenEdition));
  document.querySelector('#bible-edition').onchange = event => onReaderEditionChange(event, parts);
  if(!chosenEdition.local){document.querySelector('.verses').innerHTML=`<section class="publisher-reading"><p class="lead">${editionText.externalNote}</p><a class="button primary" target="_blank" rel="noreferrer" href="${editionUrl(chosenEdition,meta.code,chapter)}">${editionText.external} ↗</a></section>`;document.querySelector('.chapter-meta').textContent=chosenEdition.title;document.querySelector('.edition-card').innerHTML=`<h2>${t('edition')}</h2><p><strong>${esc(chosenEdition.title)}</strong></p><p>${editionText.whole}</p><a href="${chosenEdition.source}" target="_blank" rel="noreferrer">${t('sourceLink')} ↗</a>`;document.querySelector('#uk-spelling')?.remove();document.querySelector('#book-search').hidden=true;}
  const w=workspaceCopy(state.lang),attemptCopy=ATTEMPT_COPY[state.lang],missionManifest=await readerMissionManifest();
  if (!readerStillCurrent()) return;
  const hasTasks=Array.isArray(missionManifest?.chapters)&&missionManifest.chapters.some(item=>item?.book===meta.code&&Number(item.chapter)===chapter);
  document.querySelector('.chapter-nav').insertAdjacentHTML('beforebegin',`<div class="read-completion"><button class="button primary" id="mark-read">${attemptCopy.finishReading}</button>${hasTasks?`<button class="button" id="start-questions" disabled>${attemptCopy.transition}</button>`:""}<a href="/progress">${w.progress}</a></div>${hasTasks?`<dialog id="attempt-dialog" class="attempt-dialog" aria-labelledby="attempt-dialog-title"><form method="dialog"><h2 id="attempt-dialog-title">${attemptCopy.prepareTitle}</h2><p>${attemptCopy.prepareText}</p><ul>${attemptCopy.prepareRules.map(rule=>`<li>${rule}</li>`).join("")}</ul><div class="action-row"><button class="button" value="cancel">${attemptCopy.cancel}</button><button class="button primary" id="confirm-attempt" value="default">${attemptCopy.begin}</button></div><p id="attempt-state" role="status"></p></form></dialog>`:""}`);
  if (!missionManifest) {
    document.querySelector('.read-completion').insertAdjacentHTML(
      'afterend',
      `<p class="notice" role="status">${t("readerMissionUnavailable")}</p>`,
    );
  }
  document.querySelector('#mark-read').onclick=async()=>{
    const readButton=document.querySelector('#mark-read');
    if(!readButton||!readerStillCurrent()||readButton.dataset.saSaving==='1')return;
    readButton.dataset.saSaving='1';
    readButton.setAttribute('aria-busy','true');
    try {
      if (state.unownedReadingPendingRecovery) {
        announce(t('readerStorageUnavailable'));
        return;
      }
      const latestHistory=state.localReadingStorageUntrusted ? [] : loadJSON('sa.readingHistory',[],true);
      // A decoded legacy row can be null, a primitive, or have forged chapter
      // coordinates. Never dereference it or overwrite the original cache with
      // an apparent fresh history; preserve it for explicit recovery instead.
      const validReadingRow=r=>r && typeof r==='object' && !Array.isArray(r) &&
        typeof r.book==='string' && /^[1-3]?[A-Z]{2,4}$/.test(r.book) &&
        Number.isSafeInteger(r.chapter) && r.chapter>=1 && r.chapter<=150 &&
        typeof r.title==='string' && r.title.trim().length>0 && r.title.length<=200;
      if(!Array.isArray(latestHistory) || !latestHistory.every(validReadingRow)) {
        if(readerStillCurrent()&&document.querySelector('#mark-read')===readButton){
          readButton.textContent=t('readingSyncRetry');
          announce(t('readerHistoryNeedsRecovery'));
        }
        return;
      }
      const readingHistory=latestHistory;
      if(!readingHistory.some(r=>r.book===meta.code&&r.chapter===chapter))
        readingHistory.push({book:meta.code,chapter,title:bookTitle(meta)});
      const storedLocally=storeReaderPreference('sa.readingHistory',JSON.stringify(readingHistory));
      // A guest has no server account: do not claim completion or unlock tasks
      // when their only durable store refused the history write.
      if(!storedLocally&&!state.user){
        if(readerStillCurrent()&&document.querySelector('#mark-read')===readButton){
          readButton.textContent=t('readingSyncRetry');
          announce(t('readerStorageUnavailable'));
        }
        return;
      }
      if(state.user){
        try { await accountRequest('reading','PUT',{reading:readingHistory}); }
        catch {
          if(readerStillCurrent()&&document.querySelector('#mark-read')===readButton){
            readButton.textContent=t('readingSyncRetry');
            announce(t(storedLocally?'readingSyncPending':'readerStorageUnavailable'));
          }
          return;
        }
      }
      if(!readerStillCurrent()||document.querySelector('#mark-read')!==readButton)return;
      try {
        if(hasTasks)await attemptRequest('read','POST',{book:meta.code,chapter,groupId:groupId||undefined});
        if(!readerStillCurrent()||document.querySelector('#mark-read')!==readButton)return;
        document.querySelector('#start-questions')?.removeAttribute('disabled');
        const restoreFocus=document.activeElement===readButton;
        readButton.disabled=true;
        readButton.textContent=w.readMarked;
        if(restoreFocus)(document.querySelector('#start-questions')||document.querySelector('.read-completion a'))?.focus({preventScroll:true});
        announce(w.readMarked);
      } catch {
        if(readerStillCurrent()&&document.querySelector('#mark-read')===readButton)
          announce(t('errorLoad'));
      }
    } finally {
      delete readButton.dataset.saSaving;
      readButton.removeAttribute('aria-busy');
    }
  };
  document.querySelector('#start-questions')?.addEventListener('click', () => {
    if (readerStillCurrent()) document.querySelector('#attempt-dialog')?.showModal();
  });
  document.querySelector('#confirm-attempt')?.addEventListener('click', async event => {
    event.preventDefault();
    const trigger = event.currentTarget;
    if (!readerStillCurrent() || document.querySelector('#confirm-attempt') !== trigger) return;
    const status = document.querySelector('#attempt-state');
    try {
      const attempt = await attemptRequest('start', 'POST', {
        missionId: 'OT-AB-01', book: meta.code, chapter, locale: state.lang, groupId: groupId || undefined
      });
      // The server may have started the attempt for the original principal.
      // Never publish its ID, broadcast or navigate a subsequently switched account.
      if (!readerStillCurrent() || document.querySelector('#confirm-attempt') !== trigger) return;
      rememberActiveAttempt(attempt);
      state.mission = null;
      window.saAnalytics?.track("quiz_start", { language: state.lang, mode: groupId ? "group" : "personal" });
      attemptChannel?.postMessage({ type: 'attempt-started', attemptId: attempt.attemptId, book: meta.code, chapter });
      document.querySelector('#attempt-dialog').close();
      state.currentReader = null;
      navigateTo(`/mission/attempt/${attempt.attemptId}`, true);
    } catch (error) {
      if (!readerStillCurrent() || document.querySelector('#confirm-attempt') !== trigger) return;
      window.saAnalytics?.track("quiz_start_error", { error: String(error.message).slice(0, 60) });
      status.textContent = error.message === 'chapter_must_be_read' ? attemptCopy.readRequired : t('errorLoad');
    }
  });
  document.querySelector("#uk-spelling")?.addEventListener("click", () => {
    state.ukOriginal = !state.ukOriginal;
    const language = state.lang;
    const saved = storeReaderPreference(
      "sa.ukSpelling", state.ukOriginal ? "original" : "modern",
    );
    void route().then(() => {
      if (!saved && state.lang === language)
        announce(SPELLING_TRANSIENT_MESSAGES[language]);
    });
  });
  document
    .querySelector("#book-select")
    .addEventListener(
      "change",
      (e) => navigateTo(`/reader/${e.target.value}/1`),
    );
  document
    .querySelector("#chapter-select")
    .addEventListener(
      "change",
      (e) => navigateTo(`/reader/${meta.code}/${e.target.value}`),
    );
  document.querySelector("#verse-select").addEventListener("change", (e) => {
    navigateTo(e.target.value ? readerVerseUrl(meta.code, chapter, e.target.value) : `/reader/${meta.code}/${chapter}`);
  });
  document.querySelector("#book-search").addEventListener("submit", (e) => {
    e.preventDefault();
    const q = document
      .querySelector("#search-input")
      .value.trim()
      .toLocaleLowerCase(state.lang);
    const results = [];
    if (q)
      book.chapters.forEach((ch, ci) =>
        ch.forEach((v, vi) => {
          const shown = bibleText(v);
          if (
            shown.toLocaleLowerCase(state.lang).includes(q) &&
            results.length < 40
          )
            results.push({ chapter: ci + 1, verse: vi + 1, text: shown });
        }),
      );
    const panel = document.querySelector("#search-panel"),
      list = document.querySelector("#search-results");
    panel.hidden = false;
    list.innerHTML = results.length
      ? results
          .map(
            (r) =>
              `<li><a href="${readerVerseUrl(meta.code, r.chapter, r.verse)}">${esc(bookTitle(meta))} ${r.chapter}:${r.verse}</a><p>${esc(r.text)}</p></li>`,
          )
          .join("")
      : `<li>${t("noResults")}</li>`;
    announce(results.length ? `${t("search")}: ${results.length}` : t("noResults"));
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
    list.focus({ preventScroll: true });
  });
}

async function renderMissions() {
  setActiveNav("missions");
  const principal = state.user, locale = state.lang;
  const pathname = typeof location === "undefined" ? "" : location.pathname + location.hash;
  const current = () => state.user === principal && state.lang === locale &&
    (typeof location === "undefined" || location.pathname + location.hash === pathname);
  let mission;
  try {
    mission = await getMission();
    if (!current()) return;
    if (!mission || typeof mission !== "object" || Array.isArray(mission) ||
        (mission.locked !== undefined && typeof mission.locked !== "boolean"))
      throw Error("invalid_mission_manifest");
    if (!mission.locked &&
        (!mission.title || typeof mission.title !== "object" ||
         !Object.hasOwn(mission.title, locale) ||
         typeof mission.title[locale] !== "string" || !mission.title[locale].trim() ||
         mission.title[locale].length > 512 ||
         !mission.intro || typeof mission.intro !== "object" ||
         !Object.hasOwn(mission.intro, locale) ||
         typeof mission.intro[locale] !== "string" || !mission.intro[locale].trim() ||
         mission.intro[locale].length > 8192 ||
         !Number.isSafeInteger(mission.taskCount) || mission.taskCount < 1 ||
         !Array.isArray(mission.chapters)))
      throw Error("invalid_mission_manifest");
  } catch {
    if (!current()) return;
    // A malformed HTTP 200 must not stay cached or strand the missions page.
    state.mission = null;
    shell(`<section class="gate-panel" role="alert"><h1>${t("errorLoad")}</h1><button class="button primary" type="button" id="retry-missions">${t("retryLoad")}</button></section>`);
    document.querySelector("#retry-missions")?.addEventListener("click", () => {
      if (current()) void renderMissions();
    });
    return;
  }
  if (mission.locked) {
    const attemptId = activeAttemptId();
    shell(`<section class="gate-panel"><h1>${ATTEMPT_COPY[state.lang].prepareTitle}</h1><p>${ATTEMPT_COPY[state.lang].memory}</p>${attemptId ? `<a class="button primary" href="/mission/attempt/${encodeURIComponent(attemptId)}">${ATTEMPT_COPY[state.lang].transition}</a>` : ""}</section>`);
    return;
  }
  const pilotAction = ATTEMPT_COPY[state.lang].reread;
  shell(
    `<div class="section-head"><div><p class="eyebrow">${t("today")}</p><h1>${t("missionTitle")}</h1></div><p>${t("missionIntro")}</p></div><div class="card-grid"><article class="card featured">${statusBadge("live")}<h2>${esc(mission.title[state.lang])}</h2><p>${esc(mission.intro[state.lang])}</p><a class="button" href="/reader/GEN/12">${pilotAction}</a></article><article class="card">${statusBadge("soon")}<h2>${t("lastNight")}</h2><p>${t("lastNightText")}</p></article><article class="card">${statusBadge("soon")}<h2>${t("paulRoad")}</h2><p>${t("paulRoadText")}</p></article></div>`,
  );
}

async function groupRequest(action = "", method = "GET", body, params = "") {
  const query = [action && `action=${encodeURIComponent(action)}`, params]
      .filter(Boolean)
      .join("&"),
    response = await fetch(`/api/groups${query ? "?" + query : ""}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    }),
    data = await response.json().catch(() => ({}));
  if (!response.ok) throw Error(data.error || response.status);
  return data;
}
const BIBLE_EDITION_LABELS = {
  "uk-kulish": "Куліш, Пулюй і Нечуй-Левицький",
  "uk-ohiienko": "Іван Огієнко",
  "uk-khomenko": "Іван Хоменко",
  "uk-turkoniak": "Рафаїл Турконяк",
  "ru-synodal": "Синодальный перевод",
  "en-web": "World English Bible",
};
function editionOptions() {
  return Object.entries(EDITIONS).map(([lang,editions])=>`<optgroup label="${lang==='uk'?'Українська':lang==='ru'?'Русский':'English'}">${editions.map(e=>`<option value="${e.id}">${esc(e.title)}</option>`).join('')}</optgroup>`).join('');
}
function enhanceGroupForm() {
  const form = document.querySelector("#group-form");
  if (!form || form.dataset.enhanced) return;
  form.dataset.enhanced = "true";
  const goal = form
      .querySelector('[name="weeklyGoal"]')
      ?.closest(".account-field"),
    catchup = form
      .querySelector('[name="catchupMode"]')
      ?.closest(".account-field");
  goal?.insertAdjacentHTML(
    "beforebegin",
    `<label class="account-field"><span>${t("editionChoice")}</span><select name="bibleEdition">${editionOptions()}</select></label>`,
  );
  goal?.insertAdjacentHTML(
    "beforebegin",
    `<label class="account-check"><input name="marathonEnabled" type="checkbox"><span><strong>${t("marathonGroup")}</strong><br>${t("marathonGroupNote")}</span></label>`,
  );
  const marathon = form.querySelector('[name="marathonEnabled"]');
  const updateMarathonFields = () => {
    const enabled = Boolean(marathon?.checked);
    if (goal) goal.hidden = !enabled;
    if (catchup) catchup.hidden = !enabled;
  };
  marathon?.addEventListener("change", updateMarathonFields);
  updateMarathonFields();
}
function enhanceGroupsPage() {
  if (
    !document.querySelector(".groups-hero") ||
    document.querySelector(".group-detail")
  )
    return;
  const sections = document.querySelectorAll(".groups-section"),
    directory = sections[sections.length - 1];
  if (directory?.querySelector(".eyebrow"))
    directory.querySelector(".eyebrow").textContent = t("globalDirectory");
}
function enhanceGroupDetail() {
  const detail = document.querySelector(".group-detail");
  if (!detail || detail.querySelector(".group-detail-head .status")) return;
  const cohort = detail.querySelector(".cohort-card");
  if (cohort)
    cohort.innerHTML = `<p class="eyebrow">${t("regularGroup")}</p><h2>${t("globalDirectory")}</h2><p>${t("notInMarathon")}</p>`;
  detail.querySelector(".peer-table")?.closest(".groups-section")?.remove();
}
function groupStatus(group) {
  if (!group.marathonEnabled) return "";
  if(group.cohortStatus==='active')return `<span class="status live">${state.lang==='uk'?'Марафон триває':state.lang==='ru'?'Марафон идёт':'Marathon in progress'}</span>`;
  return group.cohortStatus === "ready"
    ? `<span class="status live">${t("ready")}</span>`
    : `<span class="status preview">${t("forming")} · ${group.cohortSize}/2</span>`;
}
function groupMetrics(group) {
  return `<div class="group-metrics"><div><strong>${group.memberCount ?? "—"}</strong><span>${state.lang==='uk'?'склад групи':state.lang==='ru'?'состав группы':'group members'}</span></div><div><strong>${group.chaptersCompleted}</strong><span>${t("chaptersDone")}</span></div><div><strong>${group.answersCorrect} / ${group.answersTotal}</strong><span>${t("answers")}</span></div><div><strong>${group.qualityPercent == null ? "—" : group.qualityPercent + "%"}</strong><span>${group.qualityPercent == null ? t("noDepth") : t("accuracy")}</span></div></div>`;
}
function groupCard(group) {
  const place = [group.city, group.country].filter(Boolean).join(", "),
    edition = BIBLE_EDITION_LABELS[group.bibleEdition] || group.bibleEdition,
    pace = group.marathonEnabled
      ? `<strong>${group.weeklyGoal}</strong> ${t("weeklyGoal").toLocaleLowerCase(state.lang)} · ${group.catchupMode === "steady" ? t("steady") : t("flexible")}`
      : t("regularGroup");
  return `<article class="group-card">${groupStatus(group)}<h3>${esc(group.name)}</h3>${group.church ? `<p class="group-church">${esc(group.church)}</p>` : ""}${place ? `<p>${esc(place)}</p>` : ""}<p>${esc(group.description || "")}</p><p class="pace">${pace}</p><p>${esc(edition || "")}</p>${groupMetrics(group)}<a class="button" href="/groups/${esc(group.id)}">${t("openGroup")}</a></article>`;
}
// Do not render a departed account's private group membership or invite code
// after an asynchronous request or a navigation to a different route.
function groupPageCurrent(expected, principal) {
  const active = location.hash.startsWith("#/")
    ? location.hash.slice(2) : location.pathname.replace(/^\/+/, "");
  return state.user === principal && !state.sessionUnavailable && active.replace(/\/+$/, "") === expected;
}

async function renderGroups() {
  setActiveNav("groups");
  const principal = state.user;
  const publicData = await groupRequest("", "GET"),
    groups = publicData.groups || [];
  let mine = [];
  if (state.user?.profileComplete)
    try {
      mine = (await groupRequest("", "GET", undefined, "mine=1")).groups || [];
    } catch {}
  if (!groupPageCurrent("groups", principal)) return;
  const paceOptions = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21]
    .map((value) => `<option value="${value}">${value}</option>`)
    .join("");
  const createPanel = !state.user
    ? `<section class="groups-cta"><h2>${t("createGroup")}</h2><p>${t("signInGroups")}</p><a class="button primary" href="/account">${t("signIn")}</a></section>`
    : !state.user.profileComplete
      ? `<section class="groups-cta"><h2>${t("createGroup")}</h2><p>${t("profileNeeded")}</p><a class="button primary" href="/account">${t("account")}</a></section>`
      : `<div class="groups-actions"><section class="card group-form-card"><h2>${t("createGroup")}</h2><form id="group-form" class="account-form account-form-grid">${field("name", t("groupName"), "text", 'required maxlength="100"')}${field("church", `${t("churchName")} · ${t("optional")}`)}${field("country", `${t("country")} · ${t("optional")}`)}${field("city", `${t("city")} · ${t("optional")}`)}<label class="account-field full"><span>${t("description")} · ${t("optional")}</span><textarea name="description" rows="3" maxlength="600"></textarea></label><label class="account-field"><span>${t("visibility")}</span><select name="visibility"><option value="public">${t("publicGroup")}</option><option value="private">${t("privateGroup")}</option></select></label><label class="account-field"><span>${t("roster")}</span><select name="rosterVisibility"><option value="count">${t("countOnly")}</option><option value="names">${t("publicNames")}</option><option value="private">${t("hiddenRoster")}</option></select></label><label class="account-field"><span>${t("weeklyGoal")}</span><select name="weeklyGoal">${paceOptions}</select><small>${t("oddPace")}</small></label><label class="account-field"><span>${t("catchup")}</span><select name="catchupMode"><option value="flexible">${t("flexible")}</option><option value="steady">${t("steady")}</option></select></label><label class="account-check"><input name="publicOwnerName" type="checkbox"><span>${t("publicOwner")}</span></label><p class="privacy-hint">${t("privacyNote")}</p><button class="button primary">${t("saveGroup")}</button><p id="group-form-state" role="status"></p></form></section><section class="card join-card"><h2>${t("joinGroup")}</h2><form id="join-form" class="account-form"><label class="account-field"><span>${t("inviteCode")}</span><input name="inviteCode" required maxlength="32" autocomplete="off"></label><label class="account-check"><input name="publicName" type="checkbox"><span>${t("publicOwner")}</span></label><button class="button">${t("joinGroup")}</button><p id="join-state" role="status"></p></form></section></div>`;
  shell(
    `<section class="groups-hero"><p class="eyebrow">${t("groupsEye")}</p><h1>${t("groupsTitle")}</h1><p class="lead">${t("groupsLead")}</p><div class="principle-card">${t("groupsPrinciple")}</div></section>${mine.length ? `<section class="groups-section"><div class="section-head"><div><p class="eyebrow">Scripture Archive</p><h2>${t("myGroups")}</h2></div></div><div class="group-grid">${mine.map(groupCard).join("")}</div></section>` : ""}${createPanel}<section class="groups-section"><div class="section-head"><div><p class="eyebrow">${t("cohort")}</p><h2>${t("directory")}</h2></div><p>${t("directoryIntro")}</p></div>${groups.length ? `<div class="group-grid">${groups.map(groupCard).join("")}</div>` : `<div class="notice info">${t("noGroups")}</div>`}</section>`,
  );
  if (document.querySelector("#group-form"))
    document.querySelector("#group-form").onsubmit = async (e) => {
      e.preventDefault();
      const control=e.currentTarget;
      if(control?.isConnected===false||!groupPageCurrent("groups",principal))return;
      const form = new FormData(control),
        data = Object.fromEntries(form);
      data.weeklyGoal = Number(data.weeklyGoal);
      data.publicOwnerName = form.has("publicOwnerName");
      try {
        const result = await groupRequest("create", "POST", data);
        if(control?.isConnected===false||!groupPageCurrent("groups",principal))return;
        announce(t("groupSaved"));
        navigateTo(`/groups/${result.groupId}`);
      } catch {
        if(control?.isConnected!==false&&groupPageCurrent("groups",principal)){
          const status=document.querySelector("#group-form-state");
          if(status)status.textContent=t("groupError");
        }
      }
    };
  if (document.querySelector("#join-form"))
    document.querySelector("#join-form").onsubmit = async (e) => {
      e.preventDefault();
      const control=e.currentTarget;
      if(control?.isConnected===false||!groupPageCurrent("groups",principal))return;
      const form = new FormData(control),
        data = Object.fromEntries(form);
      data.publicName = form.has("publicName");
      try {
        const result = await groupRequest("join", "POST", data);
        if(control?.isConnected===false||!groupPageCurrent("groups",principal))return;
        announce(t("joined"));
        navigateTo(`/groups/${result.groupId}`);
      } catch {
        if(control?.isConnected!==false&&groupPageCurrent("groups",principal)){
          const status=document.querySelector("#join-state");
          if(status)status.textContent=t("groupError");
        }
      }
    };
}

// A BFCache page exit retires private group invitations and management details.
let groupDetailViewEpoch=0,groupDetailNeedsReauthorization=false;
let groupDetailRestoreEpoch=0,groupDetailPageHidden=false,groupDetailAwaitingSession=false;
async function renderGroup(groupId) {
  if(groupDetailPageHidden || groupDetailAwaitingSession)return;
  setActiveNav("groups");
  const principal = state.user,viewEpoch=groupDetailViewEpoch;
  const data = await groupRequest(
      "",
      "GET",
      undefined,
      `groupId=${encodeURIComponent(groupId)}`,
    );
  if (groupDetailPageHidden || groupDetailAwaitingSession || viewEpoch!==groupDetailViewEpoch || !groupPageCurrent(`groups/${groupId}`, principal)) return;
  const group = data.group,
    catalog = await getCatalog(),
    books = catalog.books[state.lang],
    bookOptions = books
      .map(
        (book) =>
          `<option value="${book.code}">${esc(bookTitle(book))}</option>`,
      )
      .join(""),
    titleFor = (code) => {
      const found = books.find((book) => book.code === code);
      return found ? bookTitle(found) : code;
    };
  if (groupDetailPageHidden || groupDetailAwaitingSession || viewEpoch!==groupDetailViewEpoch || !groupPageCurrent(`groups/${groupId}`, principal)) return;
  const names = (data.members || [])
      .map(
        (member) =>
          `<li>${esc(member.display_name)} <span>· ${esc(member.role)}</span></li>`,
      )
      .join(""),
    canRecord = ["owner", "facilitator"].includes(data.membership),
    today = new Date().toISOString().slice(0, 10);
  const meetingCopy=meetingHistoryCopy(state.lang);
  const record = canRecord
    ? `<section class="card record-card"><h2>${t("recordMeeting")}</h2><form id="session-form" class="account-form account-form-grid"><label class="account-field"><span>${t("book")}</span><select name="bookId" id="group-book">${bookOptions}</select></label><label class="account-field"><span>${t("chapter")}</span><input name="chapter" id="group-chapter" type="number" min="1" max="200" value="12" required></label><label class="account-field"><span>${t("meetingDate")}</span><input name="meetingDate" type="date" value="${today}" required></label><label class="account-field"><span>${t("participants")}</span><input name="participantCount" type="number" min="1" max="500"></label><label class="account-field full"><span>${t("reflection")} · ${t("optional")}</span><textarea name="reflection" rows="4" maxlength="1200"></textarea></label><button class="button primary">${t("saveMeeting")}</button><p class="privacy-hint">${t("discussionRoute")}</p><p id="session-state" role="status"></p></form></section>`
    : `<div class="notice info">${t("facilitatorOnly")}</div>`;
  const peers = (data.peers || [])
    .map(
      (peer) =>
        `<article class="peer-row"><div><strong>${esc(peer.name)}</strong><span>${peer.city ? esc(peer.city) : ""}</span></div><div><strong>${peer.chaptersCompleted}</strong><span>${t("chaptersDone")}</span></div><div><strong>${peer.qualityPercent == null ? "—" : peer.qualityPercent + "%"}</strong><span>${t("depth")}</span></div></article>`,
    )
    .join("");
  shell(
    `<article class="group-detail"><header class="group-detail-head">${groupStatus(group)}<p class="eyebrow">${t("groups")}</p><h1>${esc(group.name)}</h1><p class="lead">${esc(group.description || group.church || "")}</p><p>${[group.church, group.city, group.country].filter(Boolean).map(esc).join(" · ")}</p>${group.inviteCode ? `<div class="invite-code"><span>${t("inviteCode")}</span><strong>${esc(group.inviteCode)}</strong></div>` : ""}</header>${groupMetrics(group)}<div class="group-detail-grid"><section class="card reading-target"><p class="eyebrow">${t("readingTarget")}</p><h2 id="reading-preview">${esc(bookTitle(books[0]))} 12</h2><p>${t("discussionRoute")}</p><div class="target-controls"><select id="target-book">${bookOptions}</select><input id="target-chapter" aria-label="${t("chapter")}" type="number" min="1" max="200" value="12"></div><div class="action-row"><a class="button primary" id="chapter-link" href="/reader/${books[0].code}/12/group/${encodeURIComponent(group.id)}">${t("openChapter")}</a></div></section><section class="card cohort-card"><p class="eyebrow">${t("cohort")}</p><h2>${group.weeklyGoal} · ${t("weeklyGoal").toLocaleLowerCase(state.lang)}</h2><p>${group.catchupMode === "steady" ? t("steady") : t("flexible")}</p><p>${t("cohortNeed")}</p></section></div><section id="group-public-names" class="card member-list"${names?'':' hidden'}><h2>${t("members")}</h2><ul>${names}</ul></section>${record}${groupManagementMarkup(data,state.lang,esc)}${meetingHistoryMarkup(meetingCopy)}<section class="groups-section"><div class="section-head"><div><p class="eyebrow">${t("cohort")}</p><h2>${t("cohortPeers")}</h2></div><p>${t("cohortExplain")}</p></div><div class="peer-table">${peers}</div></section></article>`,
  );
  const meetingRoot=document.querySelector('#group-meeting-history');
  if(meetingRoot)mountMeetingHistory(meetingRoot,{request:groupRequest,groupId:group.id,copy:meetingCopy,confirm:message=>window.confirm(message),isCurrent:()=>groupPageCurrent(`groups/${groupId}`,principal),renderRows:rows=>meetingRowsMarkup(rows,{copy:meetingCopy,esc,titleFor})});
  const manageCopy = groupManagementCopy(state.lang);
  const manageStatus = document.querySelector('#group-manage-status');
  const namePrivacyForm=document.querySelector('#group-name-privacy-form');
  if(namePrivacyForm)mountGroupNamePrivacy(namePrivacyForm,{request:groupRequest,groupId:group.id,copy:manageCopy,isCurrent:()=>groupPageCurrent(`groups/${groupId}`,principal),onSaved:async()=>{
    const refreshed=await groupRequest('', 'GET', undefined, `groupId=${encodeURIComponent(group.id)}`);
    if(namePrivacyForm.isConnected===false||!groupPageCurrent(`groups/${groupId}`,principal))return;
    if(!Array.isArray(refreshed?.members))throw Error('unconfirmed_roster');
    const roster=document.querySelector('#group-public-names');
    if(roster){roster.hidden=refreshed.members.length===0;roster.querySelector('ul').innerHTML=refreshed.members.map(member=>`<li>${esc(member.display_name)} <span>· ${esc(member.role)}</span></li>`).join('');}
  }});

  async function manageGroup(action, payload, button, successText) {
    if(button?.isConnected===false||!groupPageCurrent(`groups/${groupId}`,principal))return;
    button.disabled = true;
    if (manageStatus) manageStatus.textContent = '';
    try {
      await groupRequest(action, 'POST', {groupId:group.id, ...payload});
      // A completed request must not navigate away from a page opened meanwhile.
      if (!button.isConnected || !groupPageCurrent(`groups/${groupId}`, principal)) return;
      if (['leave','delete'].includes(action)) {
        navigateTo('/groups');
        if (state.user !== principal || state.sessionUnavailable) return;
      } else {
        await renderGroup(group.id);
        // The readback can be delayed independently of the successful POST.
        // A departed principal must not hear a former owner's success message.
        if (groupDetailPageHidden || groupDetailAwaitingSession || viewEpoch!==groupDetailViewEpoch || !groupPageCurrent(`groups/${groupId}`, principal)) return;
      }
      announce(successText);
    } catch {
      if (manageStatus?.isConnected && groupPageCurrent(`groups/${groupId}`,principal)) manageStatus.textContent = manageCopy.error;
    } finally {
      if (button.isConnected) button.disabled = false;
    }
  }
  const settingsForm = document.querySelector('#group-settings-form');
  if (settingsForm) {
    const keys=['name','church','country','city','description','visibility','rosterVisibility'];
    const expected=Object.fromEntries(keys.map(key=>[key,group[key]]));
    const settingsStatus=document.querySelector('#group-settings-status');
    const save=settingsForm.querySelector('button[type="submit"]');
    let busy=false;
    const current=()=>settingsForm.isConnected!==false&&groupPageCurrent(`groups/${groupId}`,principal);
    settingsForm.onsubmit=async event=>{
      event.preventDefault();
      if(busy||!current())return;
      const form=new FormData(settingsForm),settings=Object.fromEntries(form);
      for(const key of ['church','country','city','description'])if(settings[key]==='')settings[key]=null;
      if(expected.visibility!=='public'&&settings.visibility==='public'&&!window.confirm(manageCopy.publishConfirm))return;
      if(!current())return;
      busy=true;save.disabled=true;settingsStatus.textContent='';
      try {
        const result=await groupRequest('settings','POST',{groupId:group.id,expected,settings});
        if(!current())return;
        if(result?.ok!==true)throw Error('unconfirmed');
        await renderGroup(group.id);
        if(!groupPageCurrent(`groups/${groupId}`,principal))return;
        document.querySelector('#group-settings-summary')?.focus({preventScroll:true});
        announce(manageCopy.settingsSaved);
      } catch(error) {
        if(current())settingsStatus.textContent=error.message==='group_settings_changed_or_forbidden'?manageCopy.settingsConflict:manageCopy.settingsUnconfirmed;
      } finally {
        busy=false;if(save.isConnected!==false)save.disabled=false;
      }
    };
    document.querySelector('#reload-group-settings').onclick=async()=>{
      if(busy||!current()||!window.confirm(manageCopy.reloadConfirm)||!current())return;
      busy=true;
      try {
        await renderGroup(group.id);
        if(groupPageCurrent(`groups/${groupId}`,principal))document.querySelector('#group-settings-summary')?.focus({preventScroll:true});
      } catch {if(current())settingsStatus.textContent=manageCopy.settingsUnconfirmed;}
      finally {busy=false;}
    };
  }
  const leaveButton = document.querySelector('#leave-group');
  if (leaveButton) leaveButton.onclick = () => {
    if (leaveButton.isConnected!==false && groupPageCurrent(`groups/${groupId}`,principal) && window.confirm(manageCopy.leaveConfirm)) void manageGroup('leave', {}, leaveButton, manageCopy.left);
  };
  const transferForm = document.querySelector('#transfer-group');
  if (transferForm) transferForm.onsubmit = event => {
    event.preventDefault();
    if(transferForm.isConnected===false||!groupPageCurrent(`groups/${groupId}`,principal))return;
    const select = transferForm.elements.namedItem('targetUserId');
    if (window.confirm(manageCopy.transferConfirm + select.selectedOptions[0].textContent))
      void manageGroup('transfer', {targetUserId:select.value}, transferForm.querySelector('button'), manageCopy.transferred);
  };
  const rotateButton = document.querySelector('#rotate-group-invite');
  if (rotateButton) rotateButton.onclick = () => {
    if (rotateButton.isConnected!==false && groupPageCurrent(`groups/${groupId}`,principal) && window.confirm(manageCopy.rotateConfirm)) void manageGroup('rotate-invite', {expectedInviteCode:group.inviteCode,confirm:true}, rotateButton, manageCopy.rotated);
  };
  document.querySelectorAll('.group-role-button').forEach(button => {
    button.onclick = () => {
      if(button.isConnected===false||!groupPageCurrent(`groups/${groupId}`,principal))return;
      const member = data.managementMembers.find(item => item.user_id === button.dataset.userId);
      if (member && window.confirm(manageCopy.roleConfirm + member.display_name))
        void manageGroup('role', {targetUserId:member.user_id,expectedRole:member.role,role:member.role==='facilitator'?'member':'facilitator'}, button, manageCopy.roleSaved);
    };
  });
  const deleteButton = document.querySelector('#delete-group');
  if (deleteButton) deleteButton.onclick = () => {
    if (deleteButton.isConnected!==false && groupPageCurrent(`groups/${groupId}`,principal) && window.confirm(manageCopy.deleteConfirm)) void manageGroup('delete', {confirm:true}, deleteButton, manageCopy.deleted);
  };
  const targetBook = document.querySelector("#target-book"),
    targetChapter = document.querySelector("#target-chapter"),
    updateTarget = () => {
      if(targetBook?.isConnected===false||targetChapter?.isConnected===false||!groupPageCurrent(`groups/${groupId}`,principal))return;
      const code = targetBook.value,
        chapter = Math.max(1, Number(targetChapter.value) || 1);
      document.querySelector("#reading-preview").textContent =
        `${titleFor(code)} ${chapter}`;
      document.querySelector("#chapter-link").href =
        `/reader/${code}/${chapter}/group/${encodeURIComponent(group.id)}`;
    };
  targetBook.onchange = updateTarget;
  targetChapter.oninput = updateTarget;
  document.querySelector('#chapter-link').addEventListener('click',event=>{if(event.currentTarget?.isConnected===false||!groupPageCurrent(`groups/${groupId}`,principal))return;const lang=String(group.bibleEdition||state.lang).slice(0,2);if(["uk","ru","en"].includes(lang)){const edition=EDITIONS[lang].find(item=>item.id===group.bibleEdition);if(edition){const saved=storeReaderPreference(`sa.edition.${lang}`,edition.id);setEditionForTab(lang,edition.id);if(saved)transientEditionStorageDenied.delete(lang);else transientEditionStorageDenied.add(lang)}state.lang=lang;const savedLang=storeReaderPreference('sa.lang',lang);setStaticI18n();if(!savedLang)announce(LANGUAGE_TRANSIENT_MESSAGES[lang])}});
  if(group.marathonEnabled&&group.cohortStatus==='ready'&&data.membership==='owner'){document.querySelector('.cohort-card').insertAdjacentHTML('beforeend',`<button class="button primary" id="start-marathon">${state.lang==='uk'?'Почати марафон':state.lang==='ru'?'Начать марафон':'Start marathon'}</button>`);document.querySelector('#start-marathon').onclick=async event=>{const button=event?.currentTarget;if(button?.isConnected===false||!groupPageCurrent(`groups/${groupId}`,principal))return;try{await groupRequest('start','POST',{groupId:group.id});if(button?.isConnected===false||!groupPageCurrent(`groups/${groupId}`,principal))return;await renderGroup(group.id)}catch{if(groupPageCurrent(`groups/${groupId}`,principal))announce(t('groupError'))}};}
  if (document.querySelector("#session-form"))
    document.querySelector("#session-form").onsubmit = async (e) => {
      e.preventDefault();
      const control=e.currentTarget;
      if(control?.isConnected===false||!groupPageCurrent(`groups/${groupId}`,principal))return;
      const form = new FormData(control),
        payload = Object.fromEntries(form);
      payload.groupId = group.id;
      payload.chapter = Number(payload.chapter);
      payload.participantCount = payload.participantCount
        ? Number(payload.participantCount)
        : "";
      payload.answersCorrect = 0;
      payload.answersTotal = 0;
      try {
        await groupRequest("session", "POST", payload);
        if(control?.isConnected===false||!groupPageCurrent(`groups/${groupId}`,principal))return;
        announce(t("meetingSaved"));
        await renderGroup(group.id);
      } catch {
        if(control?.isConnected!==false&&groupPageCurrent(`groups/${groupId}`,principal)){
          const status=document.querySelector("#session-state");
          if(status)status.textContent=t("groupError");
        }
      }
    };
}

function renderAttemptResult(result, book, chapter, groupId = "", groupRecorded) {
  if(state.user)void syncProgress();
  const copy = ATTEMPT_COPY[state.lang];
  const mastered = result.mastered?.length ? `<ul>${result.mastered.map(item => `<li>${esc(item)}</li>`).join("")}</ul>` : `<p>—</p>`;
  const mistakes = result.mistakes?.length
    ? result.mistakes.map(item => `<article class="result-review"><h3>${esc(item.reference)}</h3><p>${esc(item.explanation)}</p><p><strong>${state.lang === "uk" ? "Правильна відповідь" : state.lang === "ru" ? "Правильный ответ" : "Correct answer"}:</strong> ${item.correctAnswers.map(esc).join("; ")}</p></article>`).join("")
    : `<div class="notice success">${copy.noMistakes}</div>`;
  shell(`<article class="prose attempt-results"><p class="eyebrow">Scripture Archive</p><h1>${copy.completed}</h1><p class="score-line"><strong>${result.score}</strong> ${copy.score} ${result.total}</p>${groupRecorded===false?`<p class="notice info">${copy.groupNotRecorded}</p>`:''}<h2>${copy.mastered}</h2>${mastered}<h2>${copy.mistakes}</h2>${mistakes}<div class="action-row"><a class="button primary" href="/reader/${book}/${chapter}">${copy.reopen}</a>${groupId&&groupRecorded!==false?`<a class="button" href="/groups/${encodeURIComponent(groupId)}">${t("groups")}</a>`:""}</div></article>`);
  window.saAnalytics?.track("quiz_complete",{score:Number(result.score),total:Number(result.total),language:state.lang,mode:groupId?"group":"personal"});
  play("done");
}

let missionViewEpoch = 0;
function activeMissionPath() {
  const active = location.hash.startsWith("#/")
    ? location.hash.slice(2) : location.pathname.replace(/^\/+/, "");
  return active.replace(/\/+$/, "");
}
async function renderMission(parts = []) {
  // A prior account's late grading/result response may never render into the
  // current account, a newer mission load, or a different browser route.
  const principal = state.user, path = activeMissionPath(), epoch = ++missionViewEpoch;
  const isCurrent = () => state.user === principal && missionViewEpoch === epoch && activeMissionPath() === path;
  setActiveNav("missions");
  state.currentReader = null;
  const copy = ATTEMPT_COPY[state.lang], attemptId = parts[2] || activeAttemptId();
  if (!attemptId) {
    shell(`<section class="gate-panel"><p class="eyebrow">${t("missionTitle")}</p><h1>${copy.prepareTitle}</h1><p class="lead">${copy.readRequired}</p><a class="button primary" href="/reader/GEN/12">${copy.reread}</a></section>`);
    return;
  }
  let data;
  try {
    data = await attemptRequest("current", "GET", undefined, `attemptId=${encodeURIComponent(attemptId)}`);
    if (!isCurrent()) return;
    // Never treat an HTTP 200 malformed task DTO as a playable mission. Keep
    // this guard inside the existing retry path rather than throwing during render.
    if (!data || typeof data !== "object" || Array.isArray(data) ||
        (data.grading !== undefined && typeof data.grading !== "boolean"))
      throw Error("attempt_response_invalid");
    if (data.grading) data = await attemptRequest("finalize", "POST", { attemptId });
    if (!isCurrent()) return;
    if (!data || typeof data !== "object" || Array.isArray(data) ||
        (data.completed !== undefined && typeof data.completed !== "boolean"))
      throw Error("attempt_response_invalid");
    if (!data.completed) {
      const candidate = data.task;
      if (!candidate || typeof candidate !== "object" || Array.isArray(candidate) ||
          !["single", "multi"].includes(candidate.type) ||
          !Number.isSafeInteger(candidate.index) || !Number.isSafeInteger(candidate.total) ||
          candidate.index < 1 || candidate.total < 1 ||
          candidate.index > candidate.total || candidate.total > 1000 ||
          typeof candidate.question !== "string" || !candidate.question.trim() ||
          candidate.question.length > 8192 ||
          !Array.isArray(candidate.options) ||
          candidate.options.length < 2 || candidate.options.length > 32 ||
          !Array.from(candidate.options.keys()).every(index => Object.hasOwn(candidate.options, index)) ||
          candidate.options.some(option =>
            typeof option !== "string" || !option.trim() || option.length > 2048))
        throw Error("attempt_response_invalid");
    }
  }
  catch (error) {
    if (!isCurrent()) return;
    if (["attempt_invalidated", "attempt_expired", "attempt_closed"].includes(error.message)) {
      forgetActiveAttemptIf(attemptId);
      renderLockedChapter("GEN", 12); return;
    }
    shell(`<section class="gate-panel"><h1>${copy.prepareTitle}</h1><p role="status">${t("errorLoad")}</p><button class="button primary" id="retry-attempt">${copy.retryLoad}</button></section>`);
    document.querySelector("#retry-attempt").onclick=()=>renderMission(["mission","attempt",attemptId]);
    return;
  }
  if (data.completed) {
    forgetActiveAttemptIf(attemptId);
    renderAttemptResult(data.result, data.book, data.chapter, data.groupId, data.groupRecorded);
    return;
  }
  const task = data.task, type = task.type === "multi" ? "checkbox" : "radio";
  const options = task.options.map((option, index) => `<label class="option"><input type="${type}" name="answer" value="${index}"><span>${esc(option)}</span></label>`).join("");
  shell(`<div class="section-head"><div><p class="eyebrow">${t("missionTitle")}</p><h1>${copy.prepareTitle}</h1></div><p>${copy.memory}</p></div><div class="mission-shell public"><article class="mission-main"><div class="mission-progress"><span style="width:${Math.round((task.index - 1) * 100 / task.total)}%"></span></div><p><strong>${t("task")} ${task.index} ${t("of")} ${task.total}</strong></p><form id="answer-form"><fieldset class="options"><legend class="question">${esc(task.question)}</legend><p>${task.type === "multi" ? t("selectAll") : t("selectOne")}</p>${options}</fieldset><div class="action-row"><button class="button primary" type="submit">${copy.submit}</button></div><p id="answer-state" role="status"></p></form></article></div>`);
  document.querySelector("#answer-form").onsubmit = async event => {
    event.preventDefault();
    if (!isCurrent()) return;
    const selected = [...document.querySelectorAll('input[name="answer"]:checked')].map(input => Number(input.value)).sort((a, b) => a - b);
    if (!selected.length) { announce(t("selectOne")); return; }
    const button = event.currentTarget.querySelector("button[type=submit]"), status = document.querySelector("#answer-state");
    button.disabled = true;
    try {
      const response = await attemptRequest("answer", "POST", { attemptId, taskIndex: task.index, selected });
      if (!isCurrent()) return;
      if (response.completed) {
        forgetActiveAttempt();
        attemptChannel?.postMessage({ type: "attempt-completed", attemptId });
        renderAttemptResult(response.result, response.book, response.chapter, response.groupId, response.groupRecorded);
      } else await renderMission(["mission", "attempt", attemptId]);
    } catch (error) {
      if (!isCurrent()) return;
      if (["attempt_changed", "answer_already_submitted", "attempt_closed"].includes(error.message)) { await renderMission(["mission", "attempt", attemptId]); return; }
      status.textContent = error.message === "attempt_invalidated" ? copy.lockedText : t("errorLoad");
      button.disabled = false;
    }
  };
}

function renderAtlas() {
  setActiveNav("atlas");
  const plans = ["A", "B", "C", "D", "E"];
  shell(
    `<div class="section-head"><div><p class="eyebrow">5 × 18</p><h1>${t("atlasTitle")}</h1></div><p>${t("atlasIntro")}</p></div><div class="atlas-grid">${plans
      .map(
        (letter) =>
          `<section class="plan"><header><span class="plan-code">PLAN ${letter}</span><h2>${t("plan" + letter)}</h2></header><ol>${PLAN_TITLES[
            letter
          ][state.lang]
            .map((title, i) => {
              const id = `${letter}${String(i + 1).padStart(2, "0")}`,
                kind =
                  state.cms?.roadmap?.[id] ||
                  (LIVE.has(id)
                    ? "live"
                    : PARTIAL.has(id)
                      ? "preview"
                      : "soon");
              return `<li><strong>${id} · ${esc(title)}</strong>${statusBadge(kind)}</li>`;
            })
            .join("")}</ol></section>`,
      )
      .join("")}</div>`,
  );
}
function renderLiveLab() {
  setActiveNav("live");
  const steps = t("labSteps"),
    inviteSubject = encodeURIComponent(t("labInvite")),
    note = state.cms?.liveNote?.[state.lang];
  shell(
    `<article class="live-lab"><section class="lab-hero"><p class="eyebrow">${t("labEye")}</p><h1>${t("labTitle")}</h1><p class="lead">${t("labLead")}</p><p class="lab-tagline">${t("labTagline")}</p>${note ? `<div class="notice live-note">${esc(note)}</div>` : ""}<div class="action-row"><a class="button primary" href="/mission/abraham">${t("labMission")}</a><a class="button light" href="mailto:dordiaioleksii1@gmail.com?subject=${inviteSubject}">${t("labInvite")}</a><button class="button light" id="print-lab" type="button">${t("labPrint")}</button></div></section><section aria-labelledby="lab-how"><div class="section-head"><div><p class="eyebrow">${t("labTry")}</p><h2 id="lab-how">${t("labHow")}</h2></div></div><div class="lab-flow">${steps.map(([number, title, text]) => `<article class="lab-step"><span class="lab-step-number">${esc(number)}</span><h3>${esc(title)}</h3><p>${esc(text)}</p></article>`).join("")}</div></section><div class="lab-columns"><section class="lab-card lab-timing"><h2>${t("labTiming")}</h2><ol>${t(
      "labTimes",
    )
      .map((item) => `<li>${esc(item)}</li>`)
      .join(
        "",
      )}</ol></section><section class="lab-card"><h2>${t("labPlaces")}</h2><ul>${t(
      "labPlaceItems",
    )
      .map((item) => `<li>${esc(item)}</li>`)
      .join(
        "",
      )}</ul></section><section class="lab-card"><h2>${t("labKit")}</h2><ul>${t(
      "labKitItems",
    )
      .map((item) => `<li>${esc(item)}</li>`)
      .join(
        "",
      )}</ul></section><section class="lab-card lab-support"><h2>${t("labSupportTitle")}</h2><p>${t("labSupportText")}</p><div class="action-row"><a class="button primary" href="https://send.monobank.ua/9DfMWmErXF" target="_blank" rel="noreferrer">${t("labSupport")} ↗</a><a class="button light" href="mailto:dordiaioleksii1@gmail.com?subject=${inviteSubject}">${t("labInvite")}</a></div></section></div><p class="lab-print-mark">Scripture Archive · dordiaioleksii1@gmail.com</p></article>`,
  );
  document.querySelector("#print-lab").onclick = () => window.print();
}
function renderSupport() {
  setActiveNav("support");
  main.innerHTML=supportSection(state.lang,true);
  main.focus({preventScroll:true});
}
function renderHelp() {
  setActiveNav("help");
  const copy = {
    uk: {eye:"Зв’язок із командою",title:"Служба підтримки",lead:"Опишіть питання, повідомте про помилку або запропонуйте покращення. Ми відповімо на електронну адресу, пов’язану з вашим зверненням.",email:"Електронна адреса",subject:"Тема звернення",message:"Повідомлення",placeholder:"Опишіть ситуацію, очікуваний результат і кроки, після яких виникла проблема.",files:"Додати файли",fileHelp:"До трьох файлів: PDF, DOCX, JPG, PNG, WEBP або TXT. Один файл — до 1,5 МБ, разом — до 4 МБ.",privacy:"Я погоджуюся на обробку наданих даних для відповіді на звернення.",send:"Надіслати звернення",sent:"Звернення збережено. Номер звернення:",mailUnknown:"Стан доставки сповіщення команді не підтверджений.",receiptUnknown:"Не вдалося підтвердити номер звернення. Не надсилайте повторно відразу; уточніть стан через підтримку.",error:"Не вдалося надіслати звернення. Перевірте поля й файли та спробуйте ще раз.",signed:"Відповідь надійде на адресу вашого облікового запису:",rightsContext:"Звернення щодо прав на опублікований матеріал",rightsSubject:"Права на матеріал",rightsPrefill:(title,id)=>`Опублікований матеріал: ${title}\nІдентифікатор публікації: ${id}\n\nОпишіть ваш зв’язок із правами на матеріал, потрібне виправлення або зняття з публікації та докази, які можете надати. Звернення не знімає матеріал автоматично: його перевірить редактор.`},
    ru: {eye:"Связь с командой",title:"Служба поддержки",lead:"Опишите вопрос, сообщите об ошибке или предложите улучшение. Мы ответим на электронный адрес, связанный с обращением.",email:"Электронный адрес",subject:"Тема обращения",message:"Сообщение",placeholder:"Опишите ситуацию, ожидаемый результат и действия, после которых возникла проблема.",files:"Добавить файлы",fileHelp:"До трёх файлов: PDF, DOCX, JPG, PNG, WEBP или TXT. Один файл — до 1,5 МБ, вместе — до 4 МБ.",privacy:"Я согласен на обработку предоставленных данных для ответа на обращение.",send:"Отправить обращение",sent:"Обращение сохранено. Номер обращения:",mailUnknown:"Доставка уведомления команде пока не подтверждена.",receiptUnknown:"Не удалось подтвердить номер обращения. Не отправляйте повторно сразу; уточните состояние через поддержку.",error:"Не удалось отправить обращение. Проверьте поля и файлы и повторите попытку.",signed:"Ответ придёт на адрес вашей учётной записи:",rightsContext:"Обращение о правах на опубликованный материал",rightsSubject:"Права на материал",rightsPrefill:(title,id)=>`Опубликованный материал: ${title}\nИдентификатор публикации: ${id}\n\nОпишите вашу связь с правами на материал, требуемое исправление или снятие с публикации и доказательства, которые можете предоставить. Обращение не снимает материал автоматически: его проверит редактор.`},
    en: {eye:"Contact the team",title:"Help centre",lead:"Ask a question, report a problem, or suggest an improvement. We will reply to the email address connected with your request.",email:"Email address",subject:"Subject",message:"Message",placeholder:"Describe what happened, what you expected, and the steps that led to the problem.",files:"Attach files",fileHelp:"Up to three PDF, DOCX, JPG, PNG, WEBP, or TXT files. Maximum 1.5 MB per file and 4 MB in total.",privacy:"I agree that the information provided may be processed to answer this request.",send:"Send request",sent:"Your request was saved. Reference:",mailUnknown:"Delivery of the notification to the team has not been confirmed.",receiptUnknown:"The request reference could not be confirmed. Do not resubmit immediately; check its status with support.",error:"The request could not be sent. Check the fields and files, then try again.",signed:"We will reply to your account email:",rightsContext:"Request about rights to a published material",rightsSubject:"Rights to material",rightsPrefill:(title,id)=>`Published material: ${title}\nPublication reference: ${id}\n\nDescribe your relationship to the rights in this material, the correction or removal requested, and the evidence you can provide. A request does not remove material automatically: an editor will verify it.`},
  }[state.lang];
  let rightsContext=null;
  try {
    const params=new URLSearchParams(typeof window.location?.search==="string"?window.location.search:"");
    const material=params.get("material"),title=params.get("title");
    if(params.get("topic")==="rights"&&params.getAll("topic").length===1&&params.getAll("material").length===1&&params.getAll("title").length===1&&
       typeof material==="string"&&material.length>0&&material.length<=100&&material.trim()===material&&!/[\u0000-\u001f\u007f]/.test(material)&&
       typeof title==="string"&&title.length>0&&title.length<=160&&title.trim()===title&&!/[\u0000-\u001f\u007f]/.test(title))rightsContext={material,title};
  } catch {}
  const subjectValue=rightsContext?`${copy.rightsSubject} — ${rightsContext.material}`:"";
  const messageValue=rightsContext?copy.rightsPrefill(rightsContext.title,rightsContext.material):"";
  shell(`<section class="help-centre"><div class="section-head"><div><p class="eyebrow">${copy.eye}</p><h1>${copy.title}</h1></div><p>${copy.lead}</p></div><div class="help-grid"><form id="help-form" class="account-form card" enctype="multipart/form-data">${rightsContext?`<p class="help-rights-context" id="help-rights-context">${copy.rightsContext}: <strong>${esc(rightsContext.title)}</strong></p>`:""}${state.user?`<p class="help-account"><span>${copy.signed}</span><strong>${esc(state.user.email)}</strong></p>`:`<label class="account-field"><span>${copy.email}</span><input name="email" type="email" autocomplete="email" maxlength="254" required></label>`}<label class="account-field"><span>${copy.subject}</span><input name="subject" maxlength="160" value="${esc(subjectValue)}"${rightsContext?' aria-describedby="help-rights-context"':""} required></label><label class="account-field"><span>${copy.message}</span><textarea name="message" rows="11" maxlength="6000" placeholder="${copy.placeholder}"${rightsContext?' aria-describedby="help-rights-context"':""} required>${esc(messageValue)}</textarea></label><label class="account-field file-editor"><span>${copy.files}</span><input name="files" type="file" multiple accept=".pdf,.docx,.jpg,.jpeg,.png,.webp,.txt"><small>${copy.fileHelp}</small></label><label class="account-check"><input name="acceptPrivacy" type="checkbox" value="yes" required><span>${copy.privacy} <a href="/privacy">${t("privacy")}</a></span></label><button class="button primary" type="submit">${copy.send}</button><p id="help-state" role="status" aria-live="polite"></p></form><aside class="help-aside" aria-hidden="true"><span class="help-line"></span><p>Scripture Archive</p></aside></div></section>`);
  document.querySelector("#help-form").onsubmit=async event=>{
    event.preventDefault();
    const form=event.currentTarget,status=document.querySelector("#help-state"),button=form.querySelector("button[type=submit]");
    const data=new FormData(form); data.set("locale",state.lang);
    button.disabled=true; status.textContent="";
    try{
      const response=await fetch("/api/help",{method:"POST",body:data});
      if(!response.ok)throw Error(String(response.status));
      // Support requests may be durably stored even when mail delivery is
      // unknown. A bare HTTP 2xx without a real receipt must not prompt the
      // user to resubmit or falsely claim a successful notification.
      const receipt=await response.json().catch(()=>null);
      if(!receipt||receipt.ok!==true||typeof receipt.requestId!=="string"||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(receipt.requestId)){
        status.textContent=copy.receiptUnknown;
        return;
      }
      form.reset();
      status.textContent=copy.sent+" "+receipt.requestId+
        (receipt.mailStatus==="delivery_unknown"||receipt.mailStatus==="delivery_record_pending"?" "+copy.mailUnknown:"");
      window.saAnalytics?.track("support_click",{destination:"help_request"});
    }
    catch{status.textContent=copy.error}finally{button.disabled=false}
  };
}
async function renderAbout() {
  setActiveNav("about");
  const catalog = await getCatalog(),
    labels = {
      uk: {
        uk: "Українська",
        ru: "Російська",
        en: "Англійська",
        scope: "Частина Біблії",
        modernScope: "Новий Завіт і Псалми",
        oldScope: "Старий Завіт",
        whole: "Повна Біблія",
        notice: "Відомості про українське сучасне видання",
      },
      ru: {
        uk: "Украинский",
        ru: "Русский",
        en: "Английский",
        scope: "Часть Библии",
        modernScope: "Новый Завет и Псалмы",
        oldScope: "Ветхий Завет",
        whole: "Полная Библия",
        notice: "Сведения о современном украинском издании",
      },
      en: {
        uk: "Ukrainian",
        ru: "Russian",
        en: "English",
        scope: "Coverage",
        modernScope: "New Testament and Psalms",
        oldScope: "Old Testament",
        whole: "Complete Bible",
        notice: "Modern Ukrainian edition notice",
      },
    }[state.lang],
    rows = [
      `<tr><th scope="row">${labels.uk}</th><td>${esc(catalog.translations['uk-ohiienko'].title)}</td><td>${labels.whole}</td><td>CC BY-SA 4.0 · <a href="https://github.com/onlydotbible/ohienko" target="_blank" rel="noreferrer">only.bible ↗</a></td></tr>`,
      `<tr><th scope="row">${labels.uk}</th><td>${t("ukEditionTitle")}</td><td>${labels.whole}</td><td>Public Domain · <a href="${catalog.editions.uk.source}" target="_blank" rel="noreferrer">eBible.org ↗</a></td></tr>`,
      `<tr><th scope="row">${labels.ru}</th><td>${esc(catalog.editions.ru.title)}</td><td>${labels.whole}</td><td>${esc(catalog.editions.ru.license)} · <a href="${catalog.editions.ru.source}" target="_blank" rel="noreferrer">eBible.org ↗</a></td></tr>`,
      `<tr><th scope="row">${labels.en}</th><td>${esc(catalog.editions.en.title)}</td><td>${labels.whole}</td><td>${esc(catalog.editions.en.license)} · <a href="${catalog.editions.en.source}" target="_blank" rel="noreferrer">eBible.org ↗</a></td></tr>`,
    ].join("");
  shell(
    `<article class="prose"><p class="eyebrow">Scripture Archive</p><h1>${t("aboutTitle")}</h1><p class="lead">${t("aboutLead")}</p><p>${t("aboutBody")}</p><h2>${t("rightsTitle")}</h2><p>${t("rightsIntro")}</p><table class="license-table"><thead><tr><th>${t("language")}</th><th>${t("edition")}</th><th>${labels.scope}</th><th>${t("license")}</th></tr></thead><tbody>${rows}</tbody></table><section class="rights-notice"><p>${esc(catalog.translations['uk-ohiienko'].attribution)}</p><a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">Creative Commons Attribution-ShareAlike 4.0</a></section><h2>${t("accessTitle")}</h2><p>${t("accessBody")}</p></article>`,
  );
}
function renderGate() {
  setActiveNav("account");
  shell(
    `<section class="gate-panel"><p class="eyebrow">Scripture Archive</p><h1>${t("gateTitle")}</h1><p class="lead">${t("gateText")}</p><div class="action-row"><a class="button primary" href="/account">${t("signUp")}</a><a class="button" href="/reader">${t("reader")}</a></div></section>`,
  );
}

const ACCOUNT_OPTIONS = {
  uk: {
    religion: [
      ["", "Не вказувати"],
      ["orthodox", "Православна"],
      ["catholic", "Католицька"],
      ["protestant", "Протестантська"],
      ["other", "Інша"],
      ["prefer_not", "Не хочу відповідати"],
    ],
    marital: [
      ["", "Не вказувати"],
      ["married", "Одружений / заміжня"],
      ["single", "Не одружений / не заміжня"],
      ["separated", "Розлучений / розлучена"],
      ["widowed", "Вдівець / вдова"],
      ["prefer_not", "Не хочу відповідати"],
    ],
    gender: [
      ["", "Не вказувати"],
      ["man", "Чоловік"],
      ["woman", "Жінка"],
      ["prefer_not", "Не хочу відповідати"],
    ],
  },
  ru: {
    religion: [
      ["", "Не указывать"],
      ["orthodox", "Православная"],
      ["catholic", "Католическая"],
      ["protestant", "Протестантская"],
      ["other", "Другая"],
      ["prefer_not", "Не хочу отвечать"],
    ],
    marital: [
      ["", "Не указывать"],
      ["married", "Женат / замужем"],
      ["single", "Не женат / не замужем"],
      ["separated", "Разведён / разведена"],
      ["widowed", "Вдовец / вдова"],
      ["prefer_not", "Не хочу отвечать"],
    ],
    gender: [
      ["", "Не указывать"],
      ["man", "Мужчина"],
      ["woman", "Женщина"],
      ["prefer_not", "Не хочу отвечать"],
    ],
  },
  en: {
    religion: [
      ["", "Do not provide"],
      ["orthodox", "Orthodox"],
      ["catholic", "Catholic"],
      ["protestant", "Protestant"],
      ["other", "Other"],
      ["prefer_not", "Prefer not to say"],
    ],
    marital: [
      ["", "Do not provide"],
      ["married", "Married"],
      ["single", "Not married"],
      ["separated", "Separated or divorced"],
      ["widowed", "Widowed"],
      ["prefer_not", "Prefer not to say"],
    ],
    gender: [
      ["", "Do not provide"],
      ["man", "Man"],
      ["woman", "Woman"],
      ["prefer_not", "Prefer not to say"],
    ],
  },
};
function options(values) {
  return values
    .map(([value, label]) => `<option value="${value}">${label}</option>`)
    .join("");
}
async function accountRequest(action, method = "GET", body) {
  const response = await fetch(
      `/api/account?action=${encodeURIComponent(action)}`,
      {
        method,
        headers: body ? { "Content-Type": "application/json" } : {},
        body: body ? JSON.stringify(body) : undefined,
        cache: "no-store",
      },
    ),
    data = await response.json().catch(() => ({}));
  if (!response.ok) throw Error(data.error || response.status);
  return data;
}
async function authRequest(action, body = {}) {
  const response = await fetch(`/api/auth?action=${encodeURIComponent(action)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Error(data.error || response.status);
  return data;
}
async function syncProgress() {
  const principal=state.user;
  if (!principal) return;
  if (state.unownedReadingPendingRecovery) {
    state.progressSyncStatus = 'unavailable';
    return;
  }
  const requestEpoch=(syncProgress._epoch=(syncProgress._epoch||0)+1);
  // A previous login or superseded refresh must never publish private data
  // into a later account's cache or UI.
  const current=()=>syncProgress._epoch===requestEpoch&&state.user===principal;
  state.progressSyncStatus = "unavailable";
  try {
    const readingData=await accountRequest('reading');
    if(!current())return;
    // A successful-looking HTTP reply with no reading array is not evidence
    // of empty reading history; never overwrite the local cache on that basis.
    if(!Array.isArray(readingData.reading))throw Error("missing_reading_history");
    // Never migrate another account's uncancellable browser cache to this user.
    const localReading=state.localReadingStorageUntrusted ? [] : loadJSON('sa.readingHistory',[]);
    if(!Array.isArray(localReading))throw Error("invalid_local_reading_history");
    const mergedReading=[...new Map([...readingData.reading,...localReading].map(r=>[r.book+':'+r.chapter,r])).values()];
    if(!current())return;
    if(mergedReading.length){
      await accountRequest('reading','PUT',{reading:mergedReading});
      if(!current())return;
    }
    const data = await accountRequest("progress");
    if(!current())return;
    if (!data.progress || !Number.isSafeInteger(data.progress.index) ||
      data.progress.index<0 || !Array.isArray(data.progress.correct) ||
      typeof data.progress.complete!=="boolean")throw Error("invalid_progress_receipt");
    // Persist only after complete server acknowledgement; a failed refresh
    // leaves the user's last local snapshot intact and triggers the existing
    // localized unavailable warning.
    localStorage.setItem('sa.readingHistory',JSON.stringify(mergedReading));
    state.missionProgress = data.progress;
    localStorage.setItem("sa.mission.OTAB01", JSON.stringify(data.progress));
    // The server may have recovered some valid results alongside a damaged
    // legacy row; never quietly present those totals as definitive.
    state.progressSyncStatus = data.warning === "partial_progress_history" ? "partial" : null;
  } catch {
    if(!current())return;
    // Preserve cached evidence and show a localized nonvisual warning on the
    // canonical progress page instead of silently claiming it is current.
    state.progressSyncStatus = "unavailable";
  }
}
function clearPersonalProgress() {
  state.progressSyncStatus=null;
  // Also retire in-flight identity reads, even for null→null transitions
  // such as a password reset while a startup session request is pending.
  state.sessionEpoch=(state.sessionEpoch||0)+1;
  syncProgress._epoch=(syncProgress._epoch||0)+1;
  forgetActiveAttempt();
  state.missionProgress={index:0,correct:[],complete:false};
  // All three cleanup operations must be attempted, even when one storage
  // provider call throws. In-memory private state is always invalidated.
  let cacheCleared = true;
  for (const [key, value] of [
    ["sa.mission.OTAB01", JSON.stringify(state.missionProgress)],
    ["sa.readingHistory", "[]"],
  ]) {
    try { localStorage.setItem(key, value); }
    catch { cacheCleared = false; }
  }
  // If any private key survived, preserve the OLD owner marker. Deleting it
  // would allow a later login to misclassify the old history as guest data.
  if (cacheCleared) {
    try { localStorage.removeItem("sa.progressOwner"); }
    catch { cacheCleared = false; }
  }
  state.localReadingStorageUntrusted = !cacheCleared;
  return cacheCleared;
}
function field(name, label, type = "text", extra = "") {
  return `<label class="account-field"><span>${label}</span><input name="${name}" type="${type}" ${extra}></label>`;
}
function renderAccount() {
  // A private account view may re-enter only after the browser's restored
  // session has been rechecked. Also protects pending sign-in callbacks.
  if (typeof editorialPageHidden !== "undefined" &&
      (editorialPageHidden || editorialAwaitingSession)) return;
  setActiveNav("account");
  const copy = {
    uk: { title:"Обліковий запис",intro:"Підтверджена пошта захищає доступ, а серверне збереження повертає ваш прогрес на іншому пристрої.",login:"Увійти",register:"Створити обліковий запис",forgot:"Забули пароль?",reset:"Встановити новий пароль",change:"Змінити пароль",currentPassword:"Поточний пароль",newPassword:"Новий пароль",email:"Електронна пошта",password:"Пароль",passwordRule:"Щонайменше 12 символів",age:"Вік",denomination:"Деномінація або назва церкви",children:"Чи є діти",yes:"Так",no:"Ні",send:"Надіслати посилання",verification:"Перевірте пошту та відкрийте одноразове посилання підтвердження.",verified:"Електронну адресу підтверджено. Тепер увійдіть.",resetSent:"Якщо обліковий запис існує, запит на відновлення пароля прийнято. Перевірте пошту і папку «Спам». Це повідомлення не підтверджує доставку листа.",resetDone:"Пароль змінено. Інші активні сесії завершено. Увійдіть з новим паролем.",saved:"Профіль і прогрес синхронізуються між пристроями.",edit:"Редагувати сайт",visibility:"Публічна видимість",visibilityHelp:"Усі чутливі поля залишаються приватними. Окремо можна дозволити лише наведені поля.",publicFirst:"Показувати ім’я",publicLast:"Показувати прізвище",publicChurch:"Показувати назву церкви",publicProgress:"Показувати навчальний поступ",publicCommunity:"Добровільно показувати мій профіль у спільноті",communityVisibilityHelp:"У спільноті буде видно дозволену частину імені, дату долучення, стан «у мережі» та дозволений навчальний поступ. Потрібно дозволити ім’я або прізвище.",save:"Зберегти",delete:"Видалити обліковий запис",deleteHelp:"Буде видалено профіль, особистий прогрес і групи, якими ви володієте. У чужих групах залишаться лише знеособлені підсумкові числа й дата зустрічі, без вашого ідентифікатора та написаного вами підсумку. Локальні позначки Академії в браузерах не видаляються автоматично: очистіть їх на сторінці курсів у кожному браузері до видалення акаунта. Анонімні звернення до підтримки, не прив’язані до цього облікового запису, також не видаляються автоматично; для запиту на видалення зверніться до підтримки. Надіслані листи й резервні копії не видаляються цією дією.",confirmDelete:"Я розумію, що дані буде видалено",logout:"Вийти",error:"Не вдалося виконати дію. Перевірте дані та спробуйте ще раз." },
    ru: { title:"Учётная запись",intro:"Подтверждённая почта защищает доступ, а серверное сохранение возвращает прогресс на другом устройстве.",login:"Войти",register:"Создать учётную запись",forgot:"Забыли пароль?",reset:"Установить новый пароль",change:"Изменить пароль",currentPassword:"Текущий пароль",newPassword:"Новый пароль",email:"Электронная почта",password:"Пароль",passwordRule:"Не менее 12 символов",age:"Возраст",denomination:"Деноминация или название церкви",children:"Есть ли дети",yes:"Да",no:"Нет",send:"Отправить ссылку",verification:"Проверьте почту и откройте одноразовую ссылку подтверждения.",verified:"Электронный адрес подтверждён. Теперь войдите.",resetSent:"Если учётная запись существует, запрос на восстановление пароля принят. Проверьте почту и папку «Спам». Это сообщение не подтверждает доставку письма.",resetDone:"Пароль изменён. Другие активные сессии завершены. Войдите с новым паролем.",saved:"Профиль и прогресс синхронизируются между устройствами.",edit:"Редактировать сайт",visibility:"Публичная видимость",visibilityHelp:"Все чувствительные поля остаются приватными. Отдельно можно разрешить только перечисленные поля.",publicFirst:"Показывать имя",publicLast:"Показывать фамилию",publicChurch:"Показывать название церкви",publicProgress:"Показывать учебный прогресс",publicCommunity:"Добровольно показывать мой профиль в сообществе",communityVisibilityHelp:"В сообществе будут видны разрешённая часть имени, дата присоединения, состояние «в сети» и разрешённый учебный прогресс. Нужно разрешить имя или фамилию.",save:"Сохранить",delete:"Удалить учётную запись",deleteHelp:"Будут удалены профиль, личный прогресс и группы, которыми вы владеете. В чужих группах сохранятся только обезличенные результаты и дата встречи, без вашего идентификатора и написанного вами итога. Локальные отметки Академии в браузерах не удаляются автоматически: очистите их на странице курсов в каждом браузере до удаления аккаунта. Анонимные обращения в поддержку, не привязанные к этой учётной записи, также не удаляются автоматически; чтобы запросить их удаление, обратитесь в поддержку. Отправленные письма и резервные копии этой операцией не удаляются.",confirmDelete:"Я понимаю, что данные будут удалены",logout:"Выйти",error:"Не удалось выполнить действие. Проверьте данные и попробуйте снова." },
    en: { title:"Account",intro:"Verified email protects access, and server-side storage restores your progress on another device.",login:"Sign in",register:"Create account",forgot:"Forgot your password?",reset:"Create a new password",change:"Change password",currentPassword:"Current password",newPassword:"New password",email:"Email",password:"Password",passwordRule:"At least 12 characters",age:"Age",denomination:"Denomination or church name",children:"Do you have children?",yes:"Yes",no:"No",send:"Send one-time link",verification:"Check your inbox and open the one-time verification link.",verified:"Your email is verified. You can now sign in.",resetSent:"If the account exists, a password reset was requested. Check your inbox and spam folder. This message does not confirm email delivery.",resetDone:"Password changed. Other active sessions have been ended. Sign in with the new password.",saved:"Your profile and progress synchronize across devices.",edit:"Edit site",visibility:"Public visibility",visibilityHelp:"Sensitive fields remain private. You may separately allow only the fields listed below.",publicFirst:"Show first name",publicLast:"Show last name",publicChurch:"Show church name",publicProgress:"Show learning progress",publicCommunity:"Voluntarily show my profile in the community",communityVisibilityHelp:"The community will show the permitted part of your name, join date, online status, and permitted learning progress. You must allow a first or last name.",save:"Save",delete:"Delete account",deleteHelp:"This removes your profile, personal progress and groups you own. Meetings you authored in other groups retain only de-identified totals and dates, without your account ID or written reflection. Local Academy markers in browsers are not removed automatically: clear them on the courses page in each browser before deleting the account. Anonymous support requests not linked to this account are also not automatically deleted; contact support to request their removal. Previously sent emails and backups are not erased by this action.",confirmDelete:"I understand that the data will be deleted",logout:"Sign out",error:"The action could not be completed. Check the details and try again." },
  }[state.lang];
  Object.assign(copy, {
    uk: {mailDelayed:"Обліковий запис створено, але лист підтвердження поки не вдалося надіслати. Спробуйте надіслати його повторно.",resend:"Надіслати лист повторно",requested:"Запит прийнято. Перевірте пошту.",emailInUse:"Цю адресу вже зареєстровано. Увійдіть або скористайтеся відновленням пароля.",rateLimited:"Забагато спроб. Зачекайте й повторіть пізніше."},
    ru: {mailDelayed:"Учётная запись создана, но письмо подтверждения пока не удалось отправить. Попробуйте отправить его повторно.",resend:"Отправить письмо повторно",requested:"Запрос принят. Проверьте почту.",emailInUse:"Этот адрес уже зарегистрирован. Войдите или воспользуйтесь восстановлением пароля.",rateLimited:"Слишком много попыток. Подождите и попробуйте позже."},
    en: {mailDelayed:"Your account was created, but the verification email could not be sent yet. Try sending it again.",resend:"Resend verification email",requested:"Request accepted. Check your email.",emailInUse:"This email is already registered. Sign in or reset your password.",rateLimited:"Too many attempts. Please wait and try again later."}
  }[state.lang]);
  copy.sessionUnavailable = {
    uk: "Сервер не підтвердив стан входу. Ваш локальний прогрес збережено; повторіть перевірку з'єднання.",
    ru: "Сервер не подтвердил состояние входа. Ваш локальный прогресс сохранён; повторите проверку соединения.",
    en: "The server could not confirm your sign-in state. Local progress is retained; retry when the connection returns.",
  }[state.lang];
  copy.sensitiveRequired = {
    uk: "Щоб зберегти ці релігійні відомості, позначте окрему згоду або залиште ці поля порожніми.",
    ru: "Чтобы сохранить эти религиозные сведения, отметьте отдельное согласие или оставьте эти поля пустыми.",
    en: "To save religious information, give separate consent or leave those fields empty.",
  }[state.lang];
  const sessionAlert = state.sessionUnavailable ? `<p role="alert">${esc(copy.sessionUnavailable)}</p>` : "";
  const sets = ACCOUNT_OPTIONS[state.lang], resetToken = new URLSearchParams(location.search).get("reset"), verified = new URLSearchParams(location.search).get("verified") === "1", passwordChanged = new URLSearchParams(location.search).get("passwordChanged") === "1";
  if (!state.user) {
    if (resetToken) {
      shell(`<section class="card auth-card"><p class="eyebrow">Scripture Archive</p><h1>${copy.reset}</h1><form id="reset-form" class="account-form">${field("password", copy.password, "password", `autocomplete="new-password" minlength="12" maxlength="128" required aria-describedby="password-rule"`)}<small id="password-rule">${copy.passwordRule}</small><button class="button primary">${copy.reset}</button><p id="auth-state" role="status"></p></form></section>`);
      document.querySelector("#reset-form").onsubmit=async event=>{
        event.preventDefault();
        const form=event.currentTarget,status=document.querySelector("#auth-state"),button=form.querySelector("button");
        button.disabled=true;
        try{
          await authRequest("reset-password",{token:resetToken,password:new FormData(form).get("password")});
          state.user=null;clearPersonalProgress();navigateTo("/account?passwordChanged=1",true);
        }catch{status.textContent=copy.error;button.disabled=false}
      };
      return;
    }
    shell(`${sessionAlert}<div class="section-head"><div><p class="eyebrow">Scripture Archive</p><h1>${copy.title}</h1></div><p>${copy.intro}</p></div>${verified?`<div class="notice success" role="status">${copy.verified}</div>`:""}${passwordChanged?`<div class="notice success" role="status">${copy.resetDone}</div>`:""}<div class="auth-grid"><section class="card auth-card"><h2>${copy.login}</h2><form id="login-form" class="account-form">${field("email",copy.email,"email",'autocomplete="email" required')}${field("password",copy.password,"password",'autocomplete="current-password" required')}<button class="button primary">${copy.login}</button><p id="login-state" role="status"></p></form><details><summary>${copy.forgot}</summary><form id="forgot-form" class="account-form">${field("email",copy.email,"email",'autocomplete="email" required')}<button class="button">${copy.send}</button><p id="forgot-state" role="status"></p></form></details></section><section class="card auth-card"><h2>${copy.register}</h2><form id="register-form" class="account-form account-form-grid">${field("firstName",t("firstName"),"text",'autocomplete="given-name" required maxlength="80"')}${field("lastName",t("lastName"),"text",'autocomplete="family-name" required maxlength="80"')}${field("age",copy.age,"number",'min="13" max="120" inputmode="numeric" required')}<label class="account-field"><span>${t("gender")}</span><select name="gender" required>${options(sets.gender)}</select></label><label class="account-field"><span>${t("religion")} · ${t("optional")}</span><select name="tradition">${options(sets.religion)}</select></label>${field("denomination",`${copy.denomination} · ${t("optional")}`)}<label class="account-field"><span>${t("marital")}</span><select name="maritalStatus" required>${options(sets.marital)}</select></label><label class="account-field"><span>${copy.children} · ${t("optional")}</span><select name="hasChildren"><option value=""></option><option value="yes">${copy.yes}</option><option value="no">${copy.no}</option></select></label>${field("email",copy.email,"email",'autocomplete="email" required')}${field("password",copy.password,"password",'autocomplete="new-password" minlength="12" maxlength="128" required aria-describedby="register-password-rule"')}<small id="register-password-rule" class="full">${copy.passwordRule}</small><label class="account-check full"><input name="acceptSensitive" type="checkbox"><span>${t("sensitiveAgree")}</span></label><label class="account-check full"><input name="acceptPrivacy" type="checkbox" required><span>${t("privacyAgree")} <a href="/privacy">${t("privacy")}</a></span></label><button class="button primary">${copy.register}</button><p id="register-state" role="status"></p></form></section></div>`);
    document.querySelector("#login-form").onsubmit=async event=>{event.preventDefault();const status=document.querySelector("#login-state"),data=Object.fromEntries(new FormData(event.currentTarget));try{await authRequest("login",data);await getSession();window.saAnalytics?.track("login",{method:"password"});if(state.user?.profileComplete)await syncProgress();window.history.replaceState(null,"","/account");renderAccount()}catch(error){if(error.message==="email_not_verified")await authRequest("resend-verification",{email:data.email}).catch(()=>{});window.saAnalytics?.track("login_error",{error:String(error.message).slice(0,60)});status.textContent=error.message==="email_not_verified"?copy.verification:copy.error}};
    document.querySelector("#forgot-form").onsubmit=async event=>{event.preventDefault();const status=document.querySelector("#forgot-state");try{await authRequest("forgot-password",Object.fromEntries(new FormData(event.currentTarget)));status.textContent=copy.resetSent}catch{status.textContent=copy.error}};
    document.querySelector("#register-form").onsubmit=async event=>{
      event.preventDefault();
      const registerForm=event.currentTarget,status=document.querySelector("#register-state"),button=registerForm.querySelector("button[type=submit],button:not([type])"),form=new FormData(registerForm),data=Object.fromEntries(form);
      data.age=Number(data.age);data.acceptPrivacy=form.has("acceptPrivacy");data.acceptSensitive=form.has("acceptSensitive");data.hasChildren=data.hasChildren==="yes"?true:data.hasChildren==="no"?false:null;data.locale=state.lang;
      button.disabled=true;
      try{
        const result=await authRequest("register",data);
        window.saAnalytics?.track("sign_up",{method:"password",language:state.lang});
        status.textContent=result.emailDelivered?copy.verification:copy.mailDelayed;
        registerForm.querySelector('[name="password"]').value="";
        status.insertAdjacentHTML("afterend",`<button class="button" type="button" id="resend-verification">${copy.resend}</button>`);
        document.querySelector("#resend-verification").onclick=async event=>{
          const resendButton=event.currentTarget;resendButton.disabled=true;
          try{await authRequest("resend-verification",{email:data.email});status.textContent=copy.requested}
          catch(error){status.textContent=error.message==="too_many_requests"?copy.rateLimited:copy.error}
          finally{resendButton.disabled=false}
        };
      }catch(error){
        window.saAnalytics?.track("sign_up_error",{error:String(error.message).slice(0,60)});
        status.textContent=error.message==="email_in_use"?copy.emailInUse:error.message==="too_many_requests"?copy.rateLimited:error.message==="sensitive_consent_required"?copy.sensitiveRequired:copy.error;
        button.disabled=false;
      }
    };
    return;
  }
  if (state.user.profileComplete) {
    let accountPrincipal=state.user;
    const accountCurrent=()=>state.user===accountPrincipal&&!state.sessionUnavailable &&
      !(typeof editorialPageHidden !== "undefined" && (editorialPageHidden || editorialAwaitingSession));
    const visibility=state.user.visibility||{};
    shell(`<article class="prose account-dashboard"><p class="eyebrow">${t("account")}</p><h1>${esc(state.user.firstName)} ${esc(state.user.lastName)}</h1><p>${esc(state.user.email)}</p><div class="notice success">${copy.saved}</div><div class="action-row"><a class="button primary" href="/missions">${t("continue")}</a><a class="button" href="/groups">${t("myGroups")}</a>${state.user.isOwner?`<a class="button" href="/editor">${copy.edit}</a>`:""}<button class="button" id="logout-button">${copy.logout}</button></div><p id="account-logout-state" role="alert"></p><section class="profile-controls"><h2>${copy.visibility}</h2><p>${copy.visibilityHelp}</p><form id="visibility-form" class="account-form"><label class="account-check"><input name="firstName" type="checkbox" ${visibility.firstName?"checked":""}><span>${copy.publicFirst}</span></label><label class="account-check"><input name="lastName" type="checkbox" ${visibility.lastName?"checked":""}><span>${copy.publicLast}</span></label><label class="account-check"><input name="church" type="checkbox" ${visibility.church?"checked":""}><span>${copy.publicChurch}</span></label><label class="account-check"><input name="progress" type="checkbox" ${visibility.progress?"checked":""}><span>${copy.publicProgress}</span></label><label class="account-check"><input name="community" type="checkbox" aria-describedby="community-visibility-help" ${visibility.community?"checked":""}><span>${copy.publicCommunity}</span></label><small id="community-visibility-help">${copy.communityVisibilityHelp}</small><button class="button">${copy.save}</button><p id="visibility-state" role="status"></p></form></section>${state.user.authProvider==="password"?`<details class="profile-controls"><summary>${copy.change}</summary><form id="password-form" class="account-form">${field("currentPassword",copy.currentPassword,"password",'autocomplete="current-password" required')}${field("newPassword",copy.newPassword,"password",'autocomplete="new-password" minlength="12" maxlength="128" required')}<small>${copy.passwordRule}</small><button class="button">${copy.change}</button><p id="password-state" role="status"></p></form></details><details class="danger-zone"><summary>${copy.delete}</summary><p>${copy.deleteHelp}</p><form id="delete-form" class="account-form">${field("password",copy.password,"password",'autocomplete="current-password" required')}<label class="account-check"><input name="confirm" type="checkbox" required><span>${copy.confirmDelete}</span></label><button class="button">${copy.delete}</button><p id="delete-state" role="status"></p></form></details>`:""}</article>`);
    const exportCopy = {
      uk: ["Експорт даних", "Завантажити профіль, історію навчання та закладки", "Файл не містить інших даних акаунта або вкладень звернень."],
      ru: ["Экспорт данных", "Скачать профиль, историю обучения и закладки", "Файл не содержит другие данные аккаунта или вложения обращений."],
      en: ["Export data", "Download profile, learning history and bookmarks", "The file does not include other account data or support attachments."],
    }[state.lang] || ["Export data", "Download profile, learning history and bookmarks", "The file does not include other account data or support attachments."];
    document.querySelector(".profile-controls")?.insertAdjacentHTML("beforebegin", `<section class="profile-controls"><h2>${exportCopy[0]}</h2><p>${exportCopy[2]}</p><a class="button" href="/api/reading-export" download="scripture-archive-reading-data.json">${exportCopy[1]}</a></section>`);
    const sensitiveCopy = {
      uk: ["Релігійні відомості", "Якщо зняти згоду та зберегти, традицію, деномінацію і церкву буде видалено з профілю.", "Деномінація", "Церква", "Збережено.", "Для раніше збережених відомостей потрібне нове підтвердження згоди. Назва церкви не публікується до повторного вибору видимості."],
      ru: ["Религиозные сведения", "Если снять согласие и сохранить, традиция, деноминация и церковь будут удалены из профиля.", "Деноминация", "Церковь", "Сохранено.", "Для ранее сохранённых сведений требуется новое подтверждение согласия. Название церкви не публикуется до повторного выбора видимости."],
      en: ["Religious information", "If you withdraw consent and save, your tradition, denomination and church are removed from your profile.", "Denomination", "Church", "Saved.", "Previously saved information requires renewed consent. Your church is not public until you choose visibility again."],
    }[state.lang];
    const traditionOptions=sets.religion.map(([value,label])=>`<option value="${esc(value)}" ${value===(state.user.tradition||"")?"selected":""}>${esc(label)}</option>`).join("");
    const needsReaffirmation=!state.user.sensitiveConsent&&Boolean(state.user.tradition||state.user.denomination||state.user.church);
    document.querySelector(".profile-controls")?.insertAdjacentHTML("beforebegin", `<section class="profile-controls"><h2>${sensitiveCopy[0]}</h2><p>${sensitiveCopy[1]}</p>${needsReaffirmation?`<p role="status">${sensitiveCopy[5]}</p>`:""}<form id="sensitive-form" class="account-form"><label class="account-field"><span>${t("religion")} · ${t("optional")}</span><select name="tradition">${traditionOptions}</select></label><label class="account-field"><span>${sensitiveCopy[2]} · ${t("optional")}</span><input name="denomination" maxlength="160" value="${esc(state.user.denomination||"")}"></label><label class="account-field"><span>${sensitiveCopy[3]} · ${t("optional")}</span><input name="church" maxlength="160" value="${esc(state.user.church||"")}"></label><label class="account-check"><input name="acceptSensitive" type="checkbox"><span>${t("sensitiveAgree")}</span></label><button class="button" type="submit">${copy.save}</button><p id="sensitive-state" role="status"></p></form></section>`);
    const sensitiveForm=document.querySelector("#sensitive-form");
    sensitiveForm.onsubmit=async event=>{
      event.preventDefault();if(!accountCurrent()||document.querySelector("#sensitive-form")!==sensitiveForm)return;
      const form=event.currentTarget,data=new FormData(form),status=document.querySelector("#sensitive-state"),accepted=data.has("acceptSensitive"),requestedPrincipal=accountPrincipal;
      try{
        const result=await accountRequest("sensitive-consent","PUT",{acceptSensitive:accepted,tradition:data.get("tradition"),denomination:data.get("denomination"),church:data.get("church")});
        if(!accountCurrent()||accountPrincipal!==requestedPrincipal||document.querySelector("#sensitive-form")!==sensitiveForm)return;
        if(!result?.user||result.user.id!==requestedPrincipal.id)throw Error("invalid_account_response");
        state.user=result.user;accountPrincipal=result.user;
        if(!accepted){form.elements.tradition.value="";form.elements.denomination.value="";form.elements.church.value="";const publicChurch=document.querySelector('#visibility-form [name="church"]');if(publicChurch)publicChurch.checked=false;}
        if(status)status.textContent=sensitiveCopy[4];
      }catch{if(accountCurrent()&&accountPrincipal===requestedPrincipal&&document.querySelector("#sensitive-form")===sensitiveForm&&status)status.textContent=copy.error}
    };
    // A response belongs to the account and dashboard that issued it. It
    // cannot clear a later account's progress or redraw a replaced route.
    const logoutButton=document.querySelector("#logout-button");
    const finishAccountExit=()=>{
      if(!accountCurrent())return;
      state.user=null;clearPersonalProgress();
      if(document.querySelector("#logout-button")===logoutButton)renderAccount();
      else void route();
    };
    logoutButton.onclick=async()=>{
      if(!accountCurrent()||document.querySelector("#logout-button")!==logoutButton)return;
      try { const result=await authRequest("logout");if(result?.ok!==true)throw Error("unconfirmed_logout");finishAccountExit(); }
      catch {
        if(accountCurrent()&&document.querySelector("#logout-button")===logoutButton){
          const status=document.querySelector("#account-logout-state");if(status)status.textContent=copy.error;
        }
      }
    };
    const visibilityForm=document.querySelector("#visibility-form");
    const communityVisibility=visibilityForm.querySelector?.('[name="community"]');
    if(communityVisibility&&visibilityForm.elements?.firstName&&visibilityForm.elements?.lastName){
      const syncCommunityVisibility=()=>{const hasName=visibilityForm.elements.firstName.checked||visibilityForm.elements.lastName.checked;communityVisibility.disabled=!hasName;if(!hasName)communityVisibility.checked=false};
      visibilityForm.elements.firstName.addEventListener("change",syncCommunityVisibility);
      visibilityForm.elements.lastName.addEventListener("change",syncCommunityVisibility);
      syncCommunityVisibility();
    }
    visibilityForm.onsubmit=async event=>{
      event.preventDefault();if(!accountCurrent()||document.querySelector("#visibility-form")!==visibilityForm)return;
      const form=new FormData(event.currentTarget),status=document.querySelector("#visibility-state"),requestedPrincipal=accountPrincipal;
      try{
        const result=await accountRequest("visibility","PUT",{firstName:form.has("firstName"),lastName:form.has("lastName"),church:form.has("church"),progress:form.has("progress"),community:form.has("community")});
        if(!accountCurrent()||accountPrincipal!==requestedPrincipal||document.querySelector("#visibility-form")!==visibilityForm)return;
        if(!result?.user||result.user.id!==requestedPrincipal.id)throw Error("invalid_account_response");
        state.user=result.user;accountPrincipal=result.user;if(status)status.textContent=copy.saved;
      }catch{if(accountCurrent()&&accountPrincipal===requestedPrincipal&&document.querySelector("#visibility-form")===visibilityForm&&status)status.textContent=copy.error}
    };
    const passwordForm=document.querySelector("#password-form");
    if(passwordForm)passwordForm.onsubmit=async event=>{
      event.preventDefault();if(!accountCurrent()||document.querySelector("#password-form")!==passwordForm)return;
      const status=document.querySelector("#password-state"),data=Object.fromEntries(new FormData(event.currentTarget));
      try{const result=await authRequest("change-password",data);if(result?.ok!==true)throw Error("unconfirmed_password_change");finishAccountExit()}
      catch{if(accountCurrent()&&document.querySelector("#password-form")===passwordForm&&status)status.textContent=copy.error}
    };
    const deleteForm=document.querySelector("#delete-form");
    if(deleteForm)deleteForm.onsubmit=async event=>{
      event.preventDefault();if(!accountCurrent()||document.querySelector("#delete-form")!==deleteForm)return;
      const status=document.querySelector("#delete-state"),form=new FormData(event.currentTarget);if(!form.has("confirm"))return;
      try{const result=await authRequest("delete-account",{password:form.get("password")});if(result?.ok!==true)throw Error("unconfirmed_account_deletion");finishAccountExit()}
      catch{if(accountCurrent()&&document.querySelector("#delete-form")===deleteForm&&status)status.textContent=copy.error}
    };
    return;
  }
  const ageOptions=["13-17","18-24","25-34","35-44","45-54","55-64","65+"].map(value=>`<option>${value}</option>`).join("");
  shell(`<div class="section-head"><div><p class="eyebrow">${esc(state.user.email)}</p><h1>${copy.title}</h1></div><p>${copy.intro}</p></div><section class="card profile-card"><form id="profile-form" class="account-form account-form-grid">${field("firstName",t("firstName"),"text",'autocomplete="given-name" required')}${field("lastName",t("lastName"),"text",'autocomplete="family-name" required')}<label class="account-field"><span>${t("ageRange")}</span><select name="ageRange" required><option value=""></option>${ageOptions}</select></label><label class="account-field"><span>${t("religion")} · ${t("optional")}</span><select name="tradition">${options(sets.religion)}</select></label>${field("church",`${t("church")} · ${t("optional")}`)}<label class="account-field"><span>${t("marital")} · ${t("optional")}</span><select name="maritalStatus">${options(sets.marital)}</select></label><label class="account-field"><span>${t("gender")} · ${t("optional")}</span><select name="gender">${options(sets.gender)}</select></label><label class="account-check"><input name="acceptSensitive" type="checkbox"><span>${t("sensitiveAgree")}</span></label><label class="account-check"><input name="acceptPrivacy" type="checkbox" required><span>${t("privacyAgree")} <a href="/privacy">${t("privacy")}</a></span></label><button class="button primary">${copy.save}</button><p id="profile-state" role="status"></p></form></section>`);
  document.querySelector("#profile-form").onsubmit=async event=>{event.preventDefault();const form=new FormData(event.currentTarget),data=Object.fromEntries(form);data.acceptSensitive=form.has("acceptSensitive");data.acceptPrivacy=form.has("acceptPrivacy");data.locale=state.lang;try{state.user=(await accountRequest("profile","POST",data)).user;await syncProgress();renderAccount()}catch{document.querySelector("#profile-state").textContent=copy.error}};
}

let editorViewEpoch = 0;
async function renderEditor() {
  if(editorialPageHidden || editorialAwaitingSession)return;
  const principal = state.user, epoch = ++editorViewEpoch;
  const isCurrent = () => {
    const path = location.hash.startsWith("#/")
      ? location.hash.slice(2) : location.pathname.replace(/^\/+/, "");
    return !editorialPageHidden && !editorialAwaitingSession &&
      state.user === principal && Boolean(principal?.isOwner) &&
      editorViewEpoch === epoch && path.replace(/\/+$/, "") === "editor";
  };
  clearInterval(communityOwnerRefreshInterval);
  setActiveNav("account");
  if (!state.user?.isOwner) {
    renderAccount();
    const ownerSignIn={uk:"Увійти до панелі власника через ChatGPT",ru:"Войти в панель владельца через ChatGPT",en:"Sign in to the owner panel with ChatGPT"}[state.lang];
    main.querySelector(".shell")?.insertAdjacentHTML("afterbegin",`<p><a class="button" href="/signin-with-chatgpt?return_to=%2Feditor" target="_self">${ownerSignIn}</a></p>`);
    return;
  }
  const copy = {
    uk: [
      "Редактор сайту",
      "Оголошення для сторінки «Наживо»",
      "Зберегти",
      "Зареєстровані користувачі",
    ],
    ru: [
      "Редактор сайта",
      "Объявление для страницы «Вживую»",
      "Сохранить",
      "Зарегистрированные пользователи",
    ],
    en: [
      "Site editor",
      "Announcement for the In person page",
      "Save",
      "Registered users",
    ],
  }[state.lang];
  let users = [];
  let managed = { items: [], revisions: [] };
  let analytics = { days:30, accounts:{}, summary:{}, daily:[], countries:[], devices:[], browsers:[], pages:[], events:[], recentUsers:[], community:{run:null,waves:[],synthetic:{total:0}} };
  try {
    users = (await accountRequest("users")).users || [];
  } catch {}
  if (!isCurrent()) return;
  try {
    const response = await fetch("/api/content?admin=1", { cache: "no-store" });
    if (response.ok) managed = await response.json();
  } catch {}
  if (!isCurrent()) return;
  try {
    const response = await fetch("/api/analytics?days=30", { cache: "no-store" });
    if (response.ok) analytics = await response.json();
  } catch {}
  if (!isCurrent()) return;
  const note = state.cms?.liveNote || {};
  shell(
    `<div class="section-head"><div><p class="eyebrow">Scripture Archive</p><h1>${copy[0]}</h1></div><p>${esc(state.user.email)}</p></div><div class="editor-grid"><section class="card"><h2>${copy[1]}</h2><form id="content-form" class="account-form"><label class="account-field"><span>Українська</span><textarea name="uk" rows="4">${esc(note.uk || "")}</textarea></label><label class="account-field"><span>Русский</span><textarea name="ru" rows="4">${esc(note.ru || "")}</textarea></label><label class="account-field"><span>English</span><textarea name="en" rows="4">${esc(note.en || "")}</textarea></label><button class="button primary">${copy[2]}</button><p id="content-state" role="status"></p></form></section><section class="card"><h2>${copy[3]} · ${users.length}</h2><div class="user-list">${users.length ? users.map((u) => `<p><strong>${esc(u.first_name)} ${esc(u.last_name)}</strong><br><span>${esc(u.email)} · ${esc(u.locale)} · ${esc(u.age_range)}</span></p>`).join("") : "<p>—</p>"}</div></section></div>`,
  );
  const adminLabels = state.lang === "uk"
    ? { heading:"Навчальний контент",lead:"Книги, глави, переклади, місії, запитання, маршрути, марафони й тексти інтерфейсу.",kind:"Тип",locale:"Мова",title:"Назва",status:"Стан",data:"Дані JSON",draft:"Чернетка",published:"Опубліковано",hidden:"Приховано",history:"Історія змін",save:"Зберегти матеріал" }
    : state.lang === "ru"
      ? { heading:"Учебный контент",lead:"Книги, главы, переводы, миссии, вопросы, маршруты, марафоны и тексты интерфейса.",kind:"Тип",locale:"Язык",title:"Название",status:"Состояние",data:"Данные JSON",draft:"Черновик",published:"Опубликовано",hidden:"Скрыто",history:"История изменений",save:"Сохранить материал" }
      : { heading:"Learning content",lead:"Books, chapters, translations, missions, questions, routes, marathons, and interface text.",kind:"Type",locale:"Language",title:"Title",status:"Status",data:"JSON data",draft:"Draft",published:"Published",hidden:"Hidden",history:"Revision history",save:"Save material" };
  const analyticsLabels = state.lang === "uk"
    ? { heading:"Аналітика платформи",lead:"Власна статистика за останні 30 днів. Активний час рахується лише тоді, коли сторінка відкрита й користувач погодився на аналітику.",accounts:"Облікові записи",verified:"Підтверджені",sessions:"Сеанси",views:"Перегляди",time:"Активний час",users:"Активні користувачі",countries:"Країни",devices:"Пристрої",pages:"Сторінки",actions:"Дії",recent:"Останні реєстрації",never:"Ще не користувався" }
    : state.lang === "ru"
      ? { heading:"Аналитика платформы",lead:"Собственная статистика за последние 30 дней. Активное время учитывается только при открытой странице и после согласия пользователя.",accounts:"Учётные записи",verified:"Подтверждённые",sessions:"Сеансы",views:"Просмотры",time:"Активное время",users:"Активные пользователи",countries:"Страны",devices:"Устройства",pages:"Страницы",actions:"Действия",recent:"Последние регистрации",never:"Ещё не пользовался" }
      : { heading:"Platform analytics",lead:"First-party statistics for the last 30 days. Active time is measured only while the page is open and after consent.",accounts:"Accounts",verified:"Verified",sessions:"Sessions",views:"Views",time:"Active time",users:"Active users",countries:"Countries",devices:"Devices",pages:"Pages",actions:"Actions",recent:"Recent registrations",never:"No activity yet" };
  const formatNumber = value => new Intl.NumberFormat(state.lang === "uk" ? "uk-UA" : state.lang === "ru" ? "ru-RU" : "en-GB").format(Number(value) || 0);
  const formatDuration = value => { const seconds=Number(value)||0; if(seconds>=86400)return `${(seconds/86400).toFixed(1)} d`; if(seconds>=3600)return `${(seconds/3600).toFixed(1)} h`; return `${Math.round(seconds/60)} min`; };
  const ranking = (title, rows, valueKey="sessions") => `<section class="analytics-list"><h3>${title}</h3>${rows.length?`<ol>${rows.map(row=>`<li><span>${esc(row.label)}</span><strong>${formatNumber(row[valueKey])}</strong></li>`).join("")}</ol>`:"<p>—</p>"}</section>`;
  document.querySelector(".editor-grid").insertAdjacentHTML("afterbegin", `<section class="card full analytics-dashboard"><div class="section-head compact"><div><p class="eyebrow">Scripture Archive</p><h2>${analyticsLabels.heading}</h2></div><p>${analyticsLabels.lead}</p></div><div class="analytics-metrics"><article><strong>${formatNumber(analytics.accounts.total)}</strong><span>${analyticsLabels.accounts}</span></article><article><strong>${formatNumber(analytics.accounts.verified)}</strong><span>${analyticsLabels.verified}</span></article><article><strong>${formatNumber(analytics.summary.sessions)}</strong><span>${analyticsLabels.sessions}</span></article><article><strong>${formatNumber(analytics.summary.page_views)}</strong><span>${analyticsLabels.views}</span></article><article><strong>${formatDuration(analytics.summary.active_seconds)}</strong><span>${analyticsLabels.time}</span></article><article><strong>${formatNumber(analytics.summary.signed_in_users)}</strong><span>${analyticsLabels.users}</span></article></div><div class="analytics-rankings">${ranking(analyticsLabels.countries,analytics.countries)}${ranking(analyticsLabels.devices,analytics.devices)}${ranking(analyticsLabels.pages,analytics.pages,"views")}${ranking(analyticsLabels.actions,analytics.events,"total")}</div><details class="analytics-users"><summary>${analyticsLabels.recent} · ${analytics.recentUsers.length}</summary><div class="table-scroll"><table><thead><tr><th>Email</th><th>${analyticsLabels.verified}</th><th>${analyticsLabels.time}</th><th>${analyticsLabels.views}</th><th>${analyticsLabels.countries}</th><th>Last activity</th></tr></thead><tbody>${analytics.recentUsers.map(user=>`<tr><td><strong>${esc(user.first_name)} ${esc(user.last_name)}</strong><br><span>${esc(user.email)}</span></td><td>${user.email_verified_at?"✓":"—"}</td><td>${formatDuration(user.active_seconds)}</td><td>${formatNumber(user.page_views)}</td><td>${esc(user.country||"—")}</td><td>${esc(user.last_seen_at||analyticsLabels.never)}</td></tr>`).join("")}</tbody></table></div></details></section>`);
  const communityAdmin=state.lang==="uk"?{title:"Керування спільнотою",real:"Реальні облікові записи",automatic:"Автоматичні учасники",status:"Стан",schedule:"Хвилі реєстрацій",start:"Запустити",refresh:"Оновити",log:"Журнал керування",pause:"Стоп",resume:"Продовжити",stop:"Зупинити",created:"створено",of:"з",next:"наступна"}:state.lang==="ru"?{title:"Управление сообществом",real:"Реальные учётные записи",automatic:"Автоматические участники",status:"Состояние",schedule:"Волны регистраций",start:"Запустить",refresh:"Обновить",log:"Журнал управления",pause:"Стоп",resume:"Продолжить",stop:"Остановить",created:"создано",of:"из",next:"следующая"}:{title:"Community controls",real:"Real accounts",automatic:"Automated participants",status:"Status",schedule:"Registration waves",start:"Start",refresh:"Refresh",log:"Control history",pause:"Stop",resume:"Resume",stop:"Stop",created:"created",of:"of",next:"next"};
  const communityState=analytics.community||{run:null,waves:[],synthetic:{total:0}};
  const runStatus=communityState.run?.status||"waiting";
  const stateNames={uk:{waiting:"Очікує запуску",running:"Працює",paused:"Призупинено",stopped:"Зупинено"},ru:{waiting:"Ожидает запуска",running:"Работает",paused:"Приостановлено",stopped:"Остановлено"},en:{waiting:"Ready to start",running:"Running",paused:"Paused",stopped:"Stopped"}}[state.lang];
  const localTime=value=>value?new Intl.DateTimeFormat(state.lang,{timeZone:"Europe/Warsaw",dateStyle:"short",timeStyle:"short"}).format(new Date(value.replace(" ","T")+"Z")):"—";
  document.querySelector(".analytics-dashboard").insertAdjacentHTML("afterend",`<section class="card full community-admin"><div class="section-head compact"><div><p class="eyebrow">Scripture Archive</p><h2>${communityAdmin.title}</h2></div><p>${communityAdmin.status}: <strong data-community-run-status>${esc(stateNames[runStatus]||runStatus)}</strong></p></div><div class="analytics-metrics"><article><strong>${formatNumber(analytics.accounts.total)}</strong><span>${communityAdmin.real}</span></article><article><strong>${formatNumber(communityState.synthetic?.total)}</strong><span>${communityAdmin.automatic}</span></article></div><h3>${communityAdmin.schedule}</h3><div class="community-wave-list">${(communityState.waves||[]).map(wave=>`<p><strong>${esc(wave.label)}</strong><span>${formatNumber(wave.created_count)} ${communityAdmin.of} ${formatNumber(wave.target_count)} ${communityAdmin.created} · ${communityAdmin.next}: ${esc(localTime(wave.next_at))} · ${esc(wave.status)}</span></p>`).join("")||"<p>—</p>"}</div><div class="action-row"><button class="button" data-community-control="pause" ${!["waiting","running"].includes(runStatus)?"disabled":""}>${communityAdmin.pause}</button><button class="button" data-community-control="resume" ${runStatus!=="paused"?"disabled":""}>${communityAdmin.resume}</button></div><p id="community-control-state" role="status"></p><details><summary>${communityAdmin.log}</summary><ol>${(communityState.log||[]).map(event=>`<li>${esc(localTime(event.created_at))} · ${esc(event.event_type)}</li>`).join("")}</ol></details></section>`);
  document.querySelectorAll("[data-community-control]").forEach(button => button.onclick = async () => {
    if (!isCurrent()) return;
    button.disabled = true;
    const status = document.querySelector("#community-control-state");
    try {
      const response = await fetch("/api/community", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({action:button.dataset.communityControl})});
      if (!isCurrent()) return;
      if (!response.ok) throw Error(String(response.status));
      const result = await response.json();
      if (!isCurrent()) return;
      await renderEditor();
      if (state.user === principal && (location.pathname === "/editor" || location.hash.startsWith("#/editor")))
        announce(stateNames[result.status] || result.status);
    } catch { if (isCurrent()) status.textContent = t("registerError"); }
  });
  communityOwnerRefreshInterval=setInterval(async()=>{
    if(document.hidden || !isCurrent())return;
    try{
      const response=await fetch("/api/community?action=owner",{cache:"no-store"});if(!response.ok || !isCurrent())return;
      const current=await response.json(),panel=main.querySelector(".community-admin");if(!panel || !isCurrent())return;
      const status=current.run?.status||"waiting";
      panel.querySelector("[data-community-run-status]").textContent=stateNames[status]||status;
      panel.querySelector('[data-community-control="pause"]').disabled=!["waiting","running"].includes(status);
      panel.querySelector('[data-community-control="resume"]').disabled=status!=="paused";
      panel.querySelector(".analytics-metrics article:last-child strong").textContent=formatNumber(current.synthetic?.total);
      panel.querySelectorAll(".community-wave-list p span").forEach((element,index)=>{const wave=current.waves[index];if(wave)element.textContent=`${formatNumber(wave.created_count)} ${communityAdmin.of} ${formatNumber(wave.target_count)} ${communityAdmin.created} · ${communityAdmin.next}: ${localTime(wave.next_at)} · ${wave.status}`});
    }catch{}
  },15000);

  document.querySelector(".editor-grid").insertAdjacentHTML("beforeend", `<section class="card full"><h2>${adminLabels.heading}</h2><p>${adminLabels.lead}</p><form id="managed-content-form" class="account-form account-form-grid"><label class="account-field"><span>ID</span><input name="id" maxlength="100"></label><label class="account-field"><span>${adminLabels.kind}</span><select name="kind"><option value="book">book</option><option value="chapter">chapter</option><option value="translation">translation</option><option value="mission">mission</option><option value="question">question</option><option value="route">route</option><option value="marathon">marathon</option><option value="ui_text">ui_text</option></select></label><label class="account-field"><span>${adminLabels.locale}</span><select name="locale"><option>uk</option><option>ru</option><option>en</option><option>all</option></select></label><label class="account-field"><span>${adminLabels.status}</span><select name="status"><option value="draft">${adminLabels.draft}</option><option value="published">${adminLabels.published}</option><option value="hidden">${adminLabels.hidden}</option></select></label>${field("title",adminLabels.title,"text",'required maxlength="200"')}<label class="account-field full"><span>${adminLabels.data}</span><textarea name="data" rows="8" required>{}</textarea></label><button class="button primary">${adminLabels.save}</button><p id="managed-content-state" role="status"></p></form><div class="managed-list">${managed.items.length?managed.items.map(item=>`<article><strong>${esc(item.title)}</strong><span>${esc(item.kind)} · ${esc(item.locale)} · ${esc(item.status)}</span></article>`).join(""):`<p>—</p>`}</div><details><summary>${adminLabels.history} · ${managed.revisions.length}</summary><ol>${managed.revisions.slice(0,30).map(revision=>`<li>${esc(revision.content_key)} · ${esc(revision.created_at)}</li>`).join("")}</ol></details></section>`);
  document.querySelector("#content-form").onsubmit = async (e) => {
    e.preventDefault();
    if (!isCurrent()) return;
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const response = await fetch("/api/content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ liveNote: data }),
    });
    if (!isCurrent()) return;
    if (response.ok) {
      const savedCMS = await response.json();
      if (!isCurrent()) return;
      state.cms = savedCMS;
      document.querySelector("#content-state").textContent = t("progressSaved");
    } else
      document.querySelector("#content-state").textContent = t("registerError");
  };
  document.querySelector("#managed-content-form").onsubmit = async event => {
    event.preventDefault();
    if (!isCurrent()) return;
    const form = new FormData(event.currentTarget), status = document.querySelector("#managed-content-state");
    let data;
    try { data = JSON.parse(String(form.get("data"))); }
    catch { status.textContent = "JSON"; return; }
    try {
      const response = await fetch("/api/content", { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ action:"upsert-item", id:form.get("id"), kind:form.get("kind"), locale:form.get("locale"), status:form.get("status"), title:form.get("title"), data }) });
      if (!isCurrent()) return;
      if (!response.ok) throw Error(String(response.status));
      status.textContent = t("progressSaved");
      await renderEditor();
    } catch { if (isCurrent()) status.textContent = t("registerError"); }
  };
}

function renderPrivacy() {
  setActiveNav("");
  const copy = {
    uk: [
      "Приватність і облікові записи",
      "Scripture Archive підтверджує електронну адресу одноразовим посиланням і зберігає пароль лише як стійкий криптографічний хеш. Захищені серверні сесії дають змогу синхронізувати профіль і прогрес між пристроями.",
      "Конфесія, конкретна церква, сімейний стан і стать є необов’язковими приватними даними. Вони не впливають на оцінювання. У спільноті ім’я, прізвище та навчальний поступ реального користувача показуються лише після окремої згоди; електронна адреса не публікується.",
      "Аналітика вмикається лише після згоди на аналітичні cookie. Вона фіксує переглянуті розділи, тип пристрою, приблизну країну, виконані дії та активний час. Паролі, відповіді, назви груп і вміст профілю до аналітики не передаються; згоду можна скасувати нижче.",
      "Дані профілю можна виправити в обліковому записі, а обліковий запис і пов’язані особисті дані — видалити там само. Для додаткового звернення: dordiaioleksii1@gmail.com.",
    ],
    ru: [
      "Приватность и учётные записи",
      "Scripture Archive подтверждает электронный адрес одноразовой ссылкой и хранит пароль только как стойкий криптографический хеш. Защищённые серверные сессии синхронизируют профиль и прогресс между устройствами.",
      "Конфессия, конкретная церковь, семейное положение и пол — необязательные приватные данные. Они не влияют на оценивание. В сообществе имя, фамилия и учебный прогресс реального пользователя показываются только после отдельного согласия; электронная почта не публикуется.",
      "Аналитика включается только после согласия на аналитические cookie. Она фиксирует просмотренные разделы, тип устройства, примерную страну, выполненные действия и активное время. Пароли, ответы, названия групп и содержимое профиля в аналитику не передаются; согласие можно отменить ниже.",
      "Данные профиля можно исправить в учётной записи, а учётную запись и связанные личные данные — удалить там же. Для дополнительного обращения: dordiaioleksii1@gmail.com.",
    ],
    en: [
      "Privacy and accounts",
      "Scripture Archive verifies an email address with a one-time link and stores the password only as a strong cryptographic hash. Secure server sessions synchronize the profile and progress across devices.",
      "Christian tradition, specific church, marital status, and gender are optional private data and never affect grading. A real member’s first name, last name, and learning progress appear in the community only after separate consent; email addresses are never published.",
      "Analytics runs only after consent to analytics cookies. It records sections viewed, device type, approximate country, actions, and active time. Passwords, answers, group names, and profile content are never sent; consent can be withdrawn below.",
      "You can correct profile data in your account and delete the account and its associated personal data there. For an additional request, email dordiaioleksii1@gmail.com.",
    ],
  }[state.lang];
  shell(
    `<article class="prose"><p class="eyebrow">Scripture Archive</p><h1>${copy[0]}</h1>${copy
      .slice(1)
      .map((p) => `<p>${p}</p>`)
      .join("")}<button class="button" id="withdraw-analytics-consent" type="button">${({uk:"Відкликати згоду на аналітику",ru:"Отозвать согласие на аналитику",en:"Withdraw analytics consent"})[state.lang]}</button> <button class="button" id="grant-analytics-consent" type="button">${({uk:"Дозволити аналітику",ru:"Разрешить аналитику",en:"Allow analytics"})[state.lang]}</button><p id="analytics-consent-status" role="status" aria-live="polite"></p></article>`,
  );
  document.querySelector("#grant-analytics-consent").onclick = () => {
    const messages = {
      uk: ["Згоду збережено, аналітику ввімкнено в цій вкладці.", "Не вдалося зберегти згоду. Аналітику вимкнено в цій вкладці. Щоб заборонити її в інших вкладках і під час наступних відвідувань, очистьте налаштування сайту у браузері.", "Налаштування аналітики недоступні. Спробуйте оновити сторінку."],
      ru: ["Согласие сохранено, аналитика включена в этой вкладке.", "Не удалось сохранить согласие. Аналитика отключена в этой вкладке. Чтобы запретить её в других вкладках и при следующих посещениях, очистите настройки сайта в браузере.", "Настройки аналитики недоступны. Попробуйте обновить страницу."],
      en: ["Consent is saved and analytics is enabled in this tab.", "Consent could not be saved. Analytics is disabled in this tab. Clear the site settings in your browser to disable it in other tabs and future visits.", "Analytics settings are unavailable. Try refreshing the page."],
    };
    const grant = window.saAnalytics?.grantConsent;
    const result = typeof grant === "function" ? (grant() ? 0 : 1) : 2;
    document.querySelector("#analytics-consent-status").textContent = messages[state.lang][result];
  };
  document.querySelector("#withdraw-analytics-consent").onclick = () => {
    if (typeof window.saAnalytics?.withdrawConsent !== "function") {
      document.querySelector("#analytics-consent-status").textContent = ({uk:"Налаштування аналітики недоступні. Очистьте налаштування сайту у браузері, щоб відкликати згоду.",ru:"Настройки аналитики недоступны. Очистите настройки сайта в браузере, чтобы отозвать согласие.",en:"Analytics settings are unavailable. Clear the site settings in your browser to withdraw consent."})[state.lang];
      return;
    }
    const saved = window.saAnalytics.withdrawConsent();
    const messages = {
      uk: ["Аналітику вимкнено, вибір збережено в цьому браузері.", "Не вдалося зберегти вибір. Аналітику вимкнено на цій вкладці; очистьте налаштування сайту у браузері, щоб відкликати згоду для інших вкладок і наступних відвідувань."],
      ru: ["Аналитика отключена, выбор сохранён в этом браузере.", "Не удалось сохранить выбор. Аналитика отключена в этой вкладке; очистите настройки сайта в браузере, чтобы отозвать согласие для других вкладок и следующих посещений."],
      en: ["Analytics is disabled and your choice is saved in this browser.", "Your choice could not be saved. Analytics is disabled in this tab; clear the site settings in your browser to withdraw consent for other tabs and future visits."],
    };
    document.querySelector("#analytics-consent-status").textContent = messages[state.lang][saved ? 0 : 1];
  };
}

function cleanPublicCopy() {
  document.querySelectorAll(".plan-code").forEach((node) => node.remove());
  document
    .querySelectorAll(".plan li strong")
    .forEach(
      (node) =>
        (node.textContent = node.textContent.replace(/^[A-E]\d{2} · /, "")),
    );
  document.querySelectorAll(".card.featured p").forEach((node) => {
    if (node.textContent.includes("public web nodes")) node.remove();
  });
  document.querySelector(".mission-aside")?.remove();
  document.querySelector(".mission-shell")?.classList.add("public");
  const taskMeta = document.querySelector(".mission-main>p");
  if (taskMeta)
    taskMeta.textContent = taskMeta.textContent.replace(/ · OTAB\S+$/, "");
  document.querySelectorAll(".prose h2").forEach((heading) => {
    if (heading.textContent === t("projectStatus")) {
      heading.nextElementSibling?.remove();
      heading.remove();
    }
  });
}

async function route() {
  clearInterval(timerInterval);
  clearInterval(communityRefreshInterval);
  clearInterval(communityOwnerRefreshInterval);
  try {
    const sourceRoute = routeSourceFromLocation(location);
    const parts = sourceRoute.split("/").filter(Boolean);
    const name = parts[0] || "home";
    if (name !== "reader") state.currentReader = null;
    if (name === "reader")
      await renderReader(parts);
    else if (name === "missions") await renderMissions();
    else if (name === "mission") await renderMission(parts);
    else if (name === "groups" && parts[1]) await renderGroup(parts[1]);
    else if (name === "groups") await renderGroups();
    else if (name === "community") await renderCommunity(Number(new URLSearchParams(location.search).get("page"))||1,new URLSearchParams(location.search).get("q")||"",new URLSearchParams(location.search).get("sort")||"recent");
    else if (["home-groups", "live", "campaigns", "dossiers", "library", "builder", "progress", "about"].includes(name)) {
      if(name==="progress"&&state.user)await syncProgress();
      await renderWorkspace(name==='home-groups'?'live':name,{state,t,esc,shell,getMission,getCatalog,setActiveNav,loadJSON,announce,play});
    }
    else if (name === "atlas") renderAtlas();
    else if (name === "support") renderSupport();
    else if (name === "help") renderHelp();
    else if (name === "about") await renderAbout();
    else if (name === "privacy") renderPrivacy();
    else if (name === "account") renderAccount();
    else if (name === "editor") await renderEditor();
    else await renderHome();
    cleanPublicCopy();
    setStaticI18n();
    updatePageMetadata(name);
    window.saAnalytics?.track("page_view",{language:state.lang});
    const selected = name === "reader" ? main.querySelector(".verse[data-selected-verse]") : null;
    if (selected) {
      selected.focus({ preventScroll: true });
      selected.scrollIntoView({ block: "center", behavior: "instant" });
    } else {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  } catch (error) {
    console.error(error);
    shell(`<div class="notice error" role="alert"><p>${t("errorLoad")}</p><button class="button primary" type="button" id="retry-load">${t("retryLoad")}</button></div>`);
    document.querySelector("#retry-load")?.addEventListener("click", () => route());
  }
}

langSelect.addEventListener("change", () => {
  // Unsupported browser-supplied values cannot select a missing translation UI.
  if (!["uk", "ru", "en"].includes(langSelect.value)) {
    langSelect.value = state.lang;
    return;
  }
  const restorePickerFocus = document.activeElement === langSelect;
  state.lang = langSelect.value;
  const currentLanguage = state.lang;
  const saved = storeReaderPreference("sa.lang", currentLanguage);
  state.mission = null;
  setStaticI18n();
  play("nav");
  void route().then(() => {
    // A delayed old render cannot change focus or report the wrong language.
    if (state.lang !== currentLanguage) return;
    if (!saved) announce(LANGUAGE_TRANSIENT_MESSAGES[currentLanguage]);
    if (restorePickerFocus && document.activeElement === main && document.contains(langSelect)) {
      langSelect.focus({ preventScroll: true });
    }
  });
});
document.querySelector("#menu-toggle").addEventListener("click", (e) => {
  const open = nav.classList.toggle("open");
  e.currentTarget.setAttribute("aria-expanded", String(open));
});
document.addEventListener("click", event => {
  const link = event.target.closest?.("a[href]");
  if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target || link.hasAttribute("download")) return;
  const url = new URL(link.href, location.href);
  if (url.origin !== location.origin) {
    if (url.hostname === "send.monobank.ua") window.saAnalytics?.track("support_click", { destination: "monobank" });
    return;
  }
  if (url.hash && !url.hash.startsWith("#/")) return;
  event.preventDefault();
  const destination = (url.hash.startsWith("#/")
    ? url.hash.slice(2).split("/")[0]
    : url.pathname.split("/").filter(Boolean)[0]) || "home";
  window.saAnalytics?.track("navigation_click", { destination });
  navigateTo(`${url.pathname}${url.search}${url.hash.startsWith("#/") ? url.hash : ""}`);
}, true);
window.addEventListener("hashchange", (event) => {
  if (!legacyRouteHashChanged(event.oldURL, event.newURL)) return;
  route();
});
window.addEventListener("popstate", route);

// Group owners can see invite codes and a private management roster. Do not
// restore that pre-exit DOM from browser back/forward cache for another session.
// Also fence a group render that was awaiting API/catalog data on page exit.
window.addEventListener("pagehide", () => {
  // Even an exit from a different route invalidates a pending private restore.
  groupDetailPageHidden=true;
  groupDetailRestoreEpoch++;
  const detail=main.querySelector(".group-detail");
  const currentRoute=routeSourceFromLocation(location).replace(/^\/+|\/+$/g,"");
  const wasReauthorizing=groupDetailAwaitingSession;
  groupDetailAwaitingSession=false;
  if(!detail && !/^groups\/[^/]+$/.test(currentRoute) && !wasReauthorizing)return;
  groupDetailViewEpoch++;
  groupDetailNeedsReauthorization=true;
  detail?.replaceChildren();
});
window.addEventListener("pageshow", () => {
  groupDetailPageHidden=false;
  if(!groupDetailNeedsReauthorization)return;
  groupDetailNeedsReauthorization=false;
  groupDetailAwaitingSession=true;
  const restoringEpoch=groupDetailRestoreEpoch;
  // Only the visible, current page generation may reenter the private route.
  // A second pagehide invalidates this callback even if getSession settles later.
  void getSession().catch(()=>null).finally(()=>{
    if(groupDetailPageHidden || restoringEpoch!==groupDetailRestoreEpoch)return;
    groupDetailAwaitingSession=false;
    void route();
  });
});
// Editorial drafts, reviewer queues and owner-only account listings cannot
// outlive a BFCache exit or a switch of the authenticated browser session.
// The same barrier also protects personal progress and principal-scoped
// Academy markers.
let editorialPrivateNeedsReauthorization=false;
let editorialRestoreEpoch=0,editorialPageHidden=false,editorialAwaitingSession=false;
window.addEventListener("pagehide", () => {
  editorialPageHidden=true;
  editorialRestoreEpoch++;
  const currentRoute=routeSourceFromLocation(location).replace(/^\/+|\/+$/g,"");
  // Profile, progress, Academy, owner and author pages all hold
  // principal-sensitive data. Clear even an unmounted private route (e.g.
  // pending sign-in or course source request) before BFCache can preserve it.
  const mounted=main.querySelector(".builder-layout, .editor-grid, .progress-stat, .resume-card, .account-dashboard, .profile-card, .auth-grid, .auth-card, .academy-reading");
  const wasReauthorizing=editorialAwaitingSession;
  editorialAwaitingSession=false;
  if(!mounted && !["builder","editor","progress","account","campaigns"].includes(currentRoute) && !wasReauthorizing)return;
  editorialPrivateNeedsReauthorization=true;
  editorViewEpoch++;
  retirePrivateWorkspaceOnPageHide();
  main.replaceChildren();
});
window.addEventListener("pageshow", () => {
  editorialPageHidden=false;
  if(!editorialPrivateNeedsReauthorization)return;
  editorialPrivateNeedsReauthorization=false;
  editorialAwaitingSession=true;
  const restoringEpoch=editorialRestoreEpoch;
  // Read the current cookie before allowing the existing protected route to
  // rebuild anything; an abandoned old restore must not resurrect private DOM.
  void getSession().catch(()=>null).finally(()=>{
    if(editorialPageHidden || restoringEpoch!==editorialRestoreEpoch)return;
    editorialAwaitingSession=false;
    resumePrivateWorkspaceAfterSession();
    void route();
  });
});
Promise.all([getCMS(), getSession().catch(() => null)]).finally(async () => {
  if (state.user?.profileComplete) await syncProgress();
  setStaticI18n();
  route();
});


