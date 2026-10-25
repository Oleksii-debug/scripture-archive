import {renderWorkspace, workspaceCopy} from './workspace.js';
import {supportSection} from './support.js';
import {homePage} from './home.js';
import {EDITIONS, editionCopy, selectedEdition, editionUrl, editionSelect} from './editions.js';

const I18N = {
  uk: {
    brandSub: "Архів Писання",
    menu: "Меню",
    reader: "Читальня",
    missions: "Місії",
    atlas: "Атлас розвитку",
    support: "Підтримати",
    about: "Про проєкт",
    language: "Мова",
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
    errorLoad: "Не вдалося завантажити дані. Спробуйте оновити сторінку.",
  },
  ru: {
    brandSub: "Архив Писания",
    menu: "Меню",
    reader: "Читальня",
    missions: "Миссии",
    atlas: "Атлас развития",
    support: "Поддержать",
    about: "О проекте",
    language: "Язык",
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
    errorLoad: "Не удалось загрузить данные. Обновите страницу.",
  },
  en: {
    brandSub: "Scripture Archive",
    menu: "Menu",
    reader: "Reader",
    missions: "Missions",
    atlas: "Development atlas",
    support: "Support",
    about: "About",
    language: "Language",
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
    errorLoad: "The data could not be loaded. Please refresh the page.",
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
const requestedLang = new URLSearchParams(location.search).get("lang");
const state = {
  lang: ["uk", "ru", "en"].includes(requestedLang)
    ? requestedLang
    : localStorage.getItem("sa.lang") || "uk",
  ukOriginal: localStorage.getItem("sa.ukSpelling") === "original",
  catalog: null,
  cms: null,
  user: null,
  bookCache: new Map(),
  mission: null,
  currentReader: null,
  activeAttempt: null,
  reader: loadJSON("sa.reader", { book: "GEN", chapter: 12 }),
  missionProgress: loadJSON("sa.mission.OTAB01", {
    index: 0,
    correct: [],
    complete: false,
  }),
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

const PAGE_TITLES = {
  uk: { home:"Архів Писання", reader:"Біблійна читальня", campaigns:"Навчальні кампанії", missions:"Місії", groups:"Домашні групи", support:"Підтримати", about:"Про проєкт", privacy:"Приватність", atlas:"Атлас розвитку", dossiers:"Дослідницькі досьє", builder:"Конструктор", account:"Обліковий запис", progress:"Мій прогрес", mission:"Завдання", editor:"Редактор" },
  ru: { home:"Архив Писания", reader:"Библейская читальня", campaigns:"Учебные кампании", missions:"Миссии", groups:"Домашние группы", support:"Поддержать", about:"О проекте", privacy:"Приватность", atlas:"Атлас развития", dossiers:"Исследовательские досье", builder:"Конструктор", account:"Учётная запись", progress:"Мой прогресс", mission:"Задания", editor:"Редактор" },
  en: { home:"Scripture Archive", reader:"Bible reader", campaigns:"Learning campaigns", missions:"Missions", groups:"Home groups", support:"Support", about:"About", privacy:"Privacy", atlas:"Learning atlas", dossiers:"Research dossiers", builder:"Builder", account:"Account", progress:"My progress", mission:"Assessment", editor:"Editor" },
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

function loadJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
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
async function getCatalog() {
  state.catalog ??= await fetch("/data/catalog.json").then((r) => {
    if (!r.ok) throw Error(r.status);
    return r.json();
  });
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
async function getSession() {
  try {
    const response = await fetch("/api/account?action=me", {
        cache: "no-store",
      }),
      data = await response.json();
    state.user = response.ok ? data.user : null;
  } catch {
    state.user = null;
  }
  const previousOwner=localStorage.getItem('sa.progressOwner');
  if(previousOwner&&previousOwner!==state.user?.id){state.missionProgress={index:0,correct:[],complete:false};localStorage.setItem('sa.mission.OTAB01',JSON.stringify(state.missionProgress));localStorage.setItem('sa.readingHistory','[]')}
  if(state.user)localStorage.setItem('sa.progressOwner',state.user.id);else localStorage.removeItem('sa.progressOwner');
  return state.user;
}
async function getBook(code) {
  const selected = selectedEdition(state.lang);
  const edition = selected.local ? selected : EDITIONS[state.lang].find(e => e.local);
  const folder = edition.folder || state.lang;
  const key = `${folder}:${code}`;
  if (!state.bookCache.has(key))
    state.bookCache.set(
      key,
      fetch(`/data/bible/${folder}/${code}.json`).then((r) => {
        if (!r.ok) throw Error(r.status);
        return r.json();
      }),
    );
  return state.bookCache.get(key);
}
function localEditionMetadata(catalog) {
  const chosen = selectedEdition(state.lang);
  const local = chosen.local ? chosen : EDITIONS[state.lang].find(e => e.local);
  return catalog.translations?.[local.id] || catalog.editions[state.lang];
}
async function getMission() {
  state.mission ??= await fetch("/api/attempts?action=manifest", { cache: "no-store" }).then((r) => {
    if (!r.ok) throw Error(r.status);
    return r.json();
  });
  return state.mission;
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
function saveTimer() {
  localStorage.setItem("sa.studyTimer", JSON.stringify(state.studyTimer));
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
    saveTimer();
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
    const timer = normalizeTimer();
    if (timer.running && timer.durationMinutes > 0) {
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

attemptChannel?.addEventListener("message", event => {
  const message = event.data;
  if (message?.type === "attempt-started" && state.currentReader?.book === message.book && state.currentReader?.chapter === message.chapter) {
    state.currentReader = null;
    renderLockedChapter(message.book, message.chapter);
  }
});

function readerVerseUrl(code, chapter, verse) {
  return `/reader/${encodeURIComponent(code)}/${chapter}?verse=${verse}`;
}
function readerVerseFromUrl(url, availableVerses) {
  const raw = new URL(url).searchParams.get("verse");
  if (!raw || !/^[1-9][0-9]*$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value <= availableVerses ? value : null;
}

async function renderReader(parts) {
  setActiveNav("reader");
  const catalog = await getCatalog();
  const chosenEdition = selectedEdition(state.lang);
  const books = catalog.editionBooks?.[chosenEdition.id] || catalog.books[state.lang];
  const code = (parts[1] || state.reader.book || "GEN").toUpperCase();
  const meta = books.find((b) => b.code === code) || books[0];
  const chapter = Math.min(
    Math.max(Number(parts[2] || state.reader.chapter || 1) || 1, 1),
    meta.chapters,
  );
  const groupId = parts[3] === "group" ? parts[4] || "" : "";
  state.reader = { book: meta.code, chapter };
  state.currentReader = { book: meta.code, chapter };
  localStorage.setItem("sa.reader", JSON.stringify(state.reader));
  try {
    const attemptState = await attemptRequest("chapter", "GET", undefined, `book=${encodeURIComponent(meta.code)}&chapter=${chapter}&groupId=${encodeURIComponent(groupId)}`);
    if (attemptState.active) {
      await attemptRequest("invalidate", "POST", { attemptId: attemptState.active.id, reason: "chapter_opened" });
      sessionStorage.removeItem("sa.activeAttempt");
      renderLockedChapter(meta.code, chapter);
      return;
    }
  } catch (error) {
    console.warn("Attempt state could not be checked", error);
  }
  const book = await getBook(meta.code);
  const verses = book.chapters[chapter - 1];
  const selectedVerse = readerVerseFromUrl(location.href, verses.length);
  const edition = localEditionMetadata(catalog),
    editionInfo = editionDetails(edition, meta.code);
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
    `<div class="section-head reader-heading"><div><p class="eyebrow">${t("reader")}</p><h1>${t("readerTitle")}</h1></div><p>${t("readerIntro")}</p></div><div class="toolbar"><div class="field grow"><label for="book-select">${t("book")}</label><select id="book-select">${options}</select></div><div class="field"><label for="chapter-select">${t("chapter")}</label><select id="chapter-select">${chapters}</select></div><div class="field"><label for="verse-select">${t("verse")}</label><select id="verse-select"><option value="" ${selectedVerse === null ? "selected" : ""}>—</option>${verses.map((_, i) => `<option value="${i + 1}" ${selectedVerse === i + 1 ? "selected" : ""}>${i + 1}</option>`).join("")}</select></div><form id="book-search" class="field grow"><label for="search-input">${t("searchBook")}</label><div style="display:flex;gap:.4rem"><input id="search-input" type="search" placeholder="${t("searchPlaceholder")}"><button class="button" type="submit">${t("search")}</button></div></form></div><div class="reader-layout"><article class="reading-pane"><p class="eyebrow">${meta.testament === "OT" ? t("oldTestament") : t("newTestament")}</p><h1>${esc(bookTitle(meta))} ${chapter}</h1><p class="chapter-meta">${esc(editionInfo.title)}</p><div class="verses">${verses.map((v, i) => `<p class="verse" id="v${i + 1}" ${selectedVerse === i + 1 ? 'data-selected-verse tabindex="-1"' : ''}><a class="verse-number" href="${readerVerseUrl(meta.code, chapter, i + 1)}" aria-label="${esc(bookTitle(meta))} ${chapter}:${i + 1}">${i + 1}</a> ${esc(bibleText(v))}</p>`).join("")}</div><div class="chapter-nav">${chapter > 1 ? `<a class="button" href="/reader/${meta.code}/${chapter - 1}">← ${t("previous")}</a>` : "<span></span>"}${chapter < meta.chapters ? `<a class="button" href="/reader/${meta.code}/${chapter + 1}">${t("next")} →</a>` : "<span></span>"}</div></article><aside class="reader-aside"><div class="card edition-card"><h2>${t("edition")}</h2><p><strong>${esc(editionInfo.title)}</strong></p>${editionInfo.note ? `<p>${esc(editionInfo.note)}</p>` : ""}<p>${t("license")}: ${esc(editionInfo.license)}</p><a href="${editionInfo.source}" target="_blank" rel="noreferrer">${t("sourceLink")} ↗</a></div>${editionToggle(meta.code)}${timerCard()}<div class="card" id="search-panel" hidden><h2>${t("search")}</h2><ol class="search-results" id="search-results" tabindex="-1"></ol></div></aside></div>`,
  );
  activateTimer();
  const editionText=editionCopy[state.lang];
  if(editionInfo.attribution) document.querySelector('.edition-card').insertAdjacentHTML('beforeend', `<p class="edition-attribution">${esc(editionInfo.attribution)}</p>`);
  if(editionInfo.licenseUrl) document.querySelector('.edition-card').insertAdjacentHTML('beforeend', `<a href="${esc(editionInfo.licenseUrl)}" target="_blank" rel="noreferrer">${esc(editionInfo.license)} ↗</a>`);
  document.querySelector('.toolbar').insertAdjacentHTML('afterbegin',editionSelect(state.lang,esc));
  document.querySelector('#bible-edition').onchange=e=>{localStorage.setItem(`sa.edition.${state.lang}`,e.target.value);renderReader(parts)};
  if(!chosenEdition.local){document.querySelector('.verses').innerHTML=`<section class="publisher-reading"><p class="lead">${editionText.externalNote}</p><a class="button primary" target="_blank" rel="noreferrer" href="${editionUrl(chosenEdition,meta.code,chapter)}">${editionText.external} ↗</a></section>`;document.querySelector('.chapter-meta').textContent=chosenEdition.title;document.querySelector('.edition-card').innerHTML=`<h2>${t('edition')}</h2><p><strong>${esc(chosenEdition.title)}</strong></p><p>${editionText.whole}</p><a href="${chosenEdition.source}" target="_blank" rel="noreferrer">${t('sourceLink')} ↗</a>`;document.querySelector('#uk-spelling')?.remove();document.querySelector('#book-search').hidden=true;}
  const w=workspaceCopy(state.lang),history=loadJSON('sa.readingHistory',[]),attemptCopy=ATTEMPT_COPY[state.lang],missionManifest=await getMission();
  const alreadyRead=history.some(r=>r.book===meta.code&&r.chapter===chapter);
  const hasTasks=missionManifest.chapters?.some(item=>item.book===meta.code&&Number(item.chapter)===chapter);
  document.querySelector('.chapter-nav').insertAdjacentHTML('beforebegin',`<div class="read-completion"><button class="button primary" id="mark-read">${attemptCopy.finishReading}</button>${hasTasks?`<button class="button" id="start-questions" disabled>${attemptCopy.transition}</button>`:""}<a href="/progress">${w.progress}</a></div>${hasTasks?`<dialog id="attempt-dialog" class="attempt-dialog" aria-labelledby="attempt-dialog-title"><form method="dialog"><h2 id="attempt-dialog-title">${attemptCopy.prepareTitle}</h2><p>${attemptCopy.prepareText}</p><ul>${attemptCopy.prepareRules.map(rule=>`<li>${rule}</li>`).join("")}</ul><div class="action-row"><button class="button" value="cancel">${attemptCopy.cancel}</button><button class="button primary" id="confirm-attempt" value="default">${attemptCopy.begin}</button></div><p id="attempt-state" role="status"></p></form></dialog>`:""}`);
  document.querySelector('#mark-read').onclick=async()=>{if(!alreadyRead)history.push({book:meta.code,chapter,title:bookTitle(meta)});localStorage.setItem('sa.readingHistory',JSON.stringify(history));if(state.user)try{await accountRequest('reading','PUT',{reading:history})}catch{}try{if(hasTasks)await attemptRequest('read','POST',{book:meta.code,chapter,groupId:groupId||undefined});document.querySelector('#start-questions')?.removeAttribute('disabled');document.querySelector('#mark-read').disabled=true;document.querySelector('#mark-read').textContent=w.readMarked;announce(w.readMarked)}catch{announce(t('errorLoad'))}};
  document.querySelector('#start-questions')?.addEventListener('click',()=>document.querySelector('#attempt-dialog').showModal());
  document.querySelector('#confirm-attempt')?.addEventListener('click',async event=>{event.preventDefault();const status=document.querySelector('#attempt-state');try{const attempt=await attemptRequest('start','POST',{missionId:'OT-AB-01',book:meta.code,chapter,locale:state.lang,groupId:groupId||undefined});sessionStorage.setItem('sa.activeAttempt',attempt.attemptId);state.activeAttempt=attempt;state.mission=null;window.saAnalytics?.track("quiz_start",{language:state.lang,mode:groupId?"group":"personal"});attemptChannel?.postMessage({type:'attempt-started',attemptId:attempt.attemptId,book:meta.code,chapter});document.querySelector('#attempt-dialog').close();state.currentReader=null;navigateTo(`/mission/attempt/${attempt.attemptId}`,true)}catch(error){window.saAnalytics?.track("quiz_start_error",{error:String(error.message).slice(0,60)});status.textContent=error.message==='chapter_must_be_read'?attemptCopy.readRequired:t('errorLoad')}});
  document.querySelector("#uk-spelling")?.addEventListener("click", () => {
    state.ukOriginal = !state.ukOriginal;
    localStorage.setItem(
      "sa.ukSpelling",
      state.ukOriginal ? "original" : "modern",
    );
    route();
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
  const mission = await getMission();
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
async function renderGroups() {
  setActiveNav("groups");
  const publicData = await groupRequest("", "GET"),
    groups = publicData.groups || [];
  let mine = [];
  if (state.user?.profileComplete)
    try {
      mine = (await groupRequest("", "GET", undefined, "mine=1")).groups || [];
    } catch {}
  const paceOptions = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21]
    .map((value) => `<option value="${value}">${value}</option>`)
    .join("");
  const createPanel = !state.user
    ? `<section class="groups-cta"><h2>${t("createGroup")}</h2><p>${t("signInGroups")}</p><a class="button primary" href="/account">${t("signIn")}</a></section>`
    : !state.user.profileComplete
      ? `<section class="groups-cta"><h2>${t("createGroup")}</h2><p>${t("profileNeeded")}</p><a class="button primary" href="/account">${t("account")}</a></section>`
      : `<div class="groups-actions"><section class="card group-form-card"><h2>${t("createGroup")}</h2><form id="group-form" class="account-form account-form-grid">${field("name", t("groupName"), "text", 'required maxlength="100"')}${field("church", `${t("churchName")} · ${t("optional")}`)}${field("country", `${t("country")} · ${t("optional")}`)}${field("city", `${t("city")} · ${t("optional")}`)}<label class="account-field full"><span>${t("description")} · ${t("optional")}</span><textarea name="description" rows="3" maxlength="600"></textarea></label><label class="account-field"><span>${t("visibility")}</span><select name="visibility"><option value="public">${t("publicGroup")}</option><option value="private">${t("privateGroup")}</option></select></label><label class="account-field"><span>${t("roster")}</span><select name="rosterVisibility"><option value="count">${t("countOnly")}</option><option value="names">${t("publicNames")}</option><option value="private">${t("hiddenRoster")}</option></select></label><label class="account-field"><span>${t("weeklyGoal")}</span><select name="weeklyGoal">${paceOptions}</select><small>${t("oddPace")}</small></label><label class="account-field"><span>${t("catchup")}</span><select name="catchupMode"><option value="flexible">${t("flexible")}</option><option value="steady">${t("steady")}</option></select></label><label class="account-check"><input name="publicOwnerName" type="checkbox"><span>${t("publicOwner")}</span></label><p class="privacy-hint">${t("privacyNote")}</p><button class="button primary">${t("saveGroup")}</button><p id="group-form-state" role="status"></p></form></section><section class="card join-card"><h2>${t("joinGroup")}</h2><form id="join-form" class="account-form"><label class="account-field"><span>${t("inviteCode")}</span><input name="inviteCode" required maxlength="12" autocomplete="off"></label><label class="account-check"><input name="publicName" type="checkbox"><span>${t("publicOwner")}</span></label><button class="button">${t("joinGroup")}</button><p id="join-state" role="status"></p></form></section></div>`;
  shell(
    `<section class="groups-hero"><p class="eyebrow">${t("groupsEye")}</p><h1>${t("groupsTitle")}</h1><p class="lead">${t("groupsLead")}</p><div class="principle-card">${t("groupsPrinciple")}</div></section>${mine.length ? `<section class="groups-section"><div class="section-head"><div><p class="eyebrow">Scripture Archive</p><h2>${t("myGroups")}</h2></div></div><div class="group-grid">${mine.map(groupCard).join("")}</div></section>` : ""}${createPanel}<section class="groups-section"><div class="section-head"><div><p class="eyebrow">${t("cohort")}</p><h2>${t("directory")}</h2></div><p>${t("directoryIntro")}</p></div>${groups.length ? `<div class="group-grid">${groups.map(groupCard).join("")}</div>` : `<div class="notice info">${t("noGroups")}</div>`}</section>`,
  );
  if (document.querySelector("#group-form"))
    document.querySelector("#group-form").onsubmit = async (e) => {
      e.preventDefault();
      const form = new FormData(e.currentTarget),
        data = Object.fromEntries(form);
      data.weeklyGoal = Number(data.weeklyGoal);
      data.publicOwnerName = form.has("publicOwnerName");
      try {
        const result = await groupRequest("create", "POST", data);
        announce(t("groupSaved"));
        navigateTo(`/groups/${result.groupId}`);
      } catch {
        document.querySelector("#group-form-state").textContent =
          t("groupError");
      }
    };
  if (document.querySelector("#join-form"))
    document.querySelector("#join-form").onsubmit = async (e) => {
      e.preventDefault();
      const form = new FormData(e.currentTarget),
        data = Object.fromEntries(form);
      data.publicName = form.has("publicName");
      try {
        const result = await groupRequest("join", "POST", data);
        announce(t("joined"));
        navigateTo(`/groups/${result.groupId}`);
      } catch {
        document.querySelector("#join-state").textContent = t("groupError");
      }
    };
}

async function renderGroup(groupId) {
  setActiveNav("groups");
  const data = await groupRequest(
      "",
      "GET",
      undefined,
      `groupId=${encodeURIComponent(groupId)}`,
    ),
    group = data.group,
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
  const names = (data.members || [])
      .map(
        (member) =>
          `<li>${esc(member.display_name)} <span>· ${esc(member.role)}</span></li>`,
      )
      .join(""),
    sessions = (data.sessions || [])
      .map(
        (session) =>
          `<article class="session-row"><div><strong>${esc(titleFor(session.book_id))} ${session.chapter}</strong><span>${esc(session.meeting_date)}</span></div><p>${session.participant_count ? `${session.participant_count} ${t("members")} · ` : ""}${session.answers_total ? `${session.answers_correct}/${session.answers_total} · ${Math.round((session.answers_correct * 100) / session.answers_total)}%` : t("noDepth")}</p>${session.reflection ? `<blockquote>${esc(session.reflection)}</blockquote>` : ""}</article>`,
      )
      .join(""),
    canRecord = ["owner", "facilitator"].includes(data.membership),
    today = new Date().toISOString().slice(0, 10);
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
    `<article class="group-detail"><header class="group-detail-head">${groupStatus(group)}<p class="eyebrow">${t("groups")}</p><h1>${esc(group.name)}</h1><p class="lead">${esc(group.description || group.church || "")}</p><p>${[group.church, group.city, group.country].filter(Boolean).map(esc).join(" · ")}</p>${group.inviteCode ? `<div class="invite-code"><span>${t("inviteCode")}</span><strong>${esc(group.inviteCode)}</strong></div>` : ""}</header>${groupMetrics(group)}<div class="group-detail-grid"><section class="card reading-target"><p class="eyebrow">${t("readingTarget")}</p><h2 id="reading-preview">${esc(bookTitle(books[0]))} 12</h2><p>${t("discussionRoute")}</p><div class="target-controls"><select id="target-book">${bookOptions}</select><input id="target-chapter" aria-label="${t("chapter")}" type="number" min="1" max="200" value="12"></div><div class="action-row"><a class="button primary" id="chapter-link" href="/reader/${books[0].code}/12/group/${encodeURIComponent(group.id)}">${t("openChapter")}</a></div></section><section class="card cohort-card"><p class="eyebrow">${t("cohort")}</p><h2>${group.weeklyGoal} · ${t("weeklyGoal").toLocaleLowerCase(state.lang)}</h2><p>${group.catchupMode === "steady" ? t("steady") : t("flexible")}</p><p>${t("cohortNeed")}</p></section></div>${names ? `<section class="card member-list"><h2>${t("members")}</h2><ul>${names}</ul></section>` : ""}${record}<section class="groups-section"><div class="section-head"><div><p class="eyebrow">${t("meetings")}</p><h2>${t("recentMeetings")}</h2></div></div>${sessions || `<div class="notice info">${t("noMeetings")}</div>`}</section><section class="groups-section"><div class="section-head"><div><p class="eyebrow">${t("cohort")}</p><h2>${t("cohortPeers")}</h2></div><p>${t("cohortExplain")}</p></div><div class="peer-table">${peers}</div></section></article>`,
  );
  const targetBook = document.querySelector("#target-book"),
    targetChapter = document.querySelector("#target-chapter"),
    updateTarget = () => {
      const code = targetBook.value,
        chapter = Math.max(1, Number(targetChapter.value) || 1);
      document.querySelector("#reading-preview").textContent =
        `${titleFor(code)} ${chapter}`;
      document.querySelector("#chapter-link").href =
        `/reader/${code}/${chapter}/group/${encodeURIComponent(group.id)}`;
    };
  targetBook.onchange = updateTarget;
  targetChapter.oninput = updateTarget;
  document.querySelector('#chapter-link').addEventListener('click',()=>{const lang=String(group.bibleEdition||state.lang).slice(0,2);if(EDITIONS[lang]){localStorage.setItem(`sa.edition.${lang}`,group.bibleEdition);state.lang=lang;localStorage.setItem('sa.lang',lang);setStaticI18n()}});
  if(group.marathonEnabled&&group.cohortStatus==='ready'&&data.membership==='owner'){document.querySelector('.cohort-card').insertAdjacentHTML('beforeend',`<button class="button primary" id="start-marathon">${state.lang==='uk'?'Почати марафон':state.lang==='ru'?'Начать марафон':'Start marathon'}</button>`);document.querySelector('#start-marathon').onclick=async()=>{try{await groupRequest('start','POST',{groupId:group.id});await renderGroup(group.id)}catch{announce(t('groupError'))}};}
  if (document.querySelector("#session-form"))
    document.querySelector("#session-form").onsubmit = async (e) => {
      e.preventDefault();
      const form = new FormData(e.currentTarget),
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
        announce(t("meetingSaved"));
        await renderGroup(group.id);
      } catch {
        document.querySelector("#session-state").textContent = t("groupError");
      }
    };
}

function renderAttemptResult(result, book, chapter, groupId = "") {
  const copy = ATTEMPT_COPY[state.lang];
  const mastered = result.mastered?.length ? `<ul>${result.mastered.map(item => `<li>${esc(item)}</li>`).join("")}</ul>` : `<p>—</p>`;
  const mistakes = result.mistakes?.length
    ? result.mistakes.map(item => `<article class="result-review"><h3>${esc(item.reference)}</h3><p>${esc(item.explanation)}</p><p><strong>${state.lang === "uk" ? "Правильна відповідь" : state.lang === "ru" ? "Правильный ответ" : "Correct answer"}:</strong> ${item.correctAnswers.map(esc).join("; ")}</p></article>`).join("")
    : `<div class="notice success">${copy.noMistakes}</div>`;
  shell(`<article class="prose attempt-results"><p class="eyebrow">Scripture Archive</p><h1>${copy.completed}</h1><p class="score-line"><strong>${result.score}</strong> ${copy.score} ${result.total}</p><h2>${copy.mastered}</h2>${mastered}<h2>${copy.mistakes}</h2>${mistakes}<div class="action-row"><a class="button primary" href="/reader/${book}/${chapter}">${copy.reopen}</a>${groupId?`<a class="button" href="/groups/${encodeURIComponent(groupId)}">${t("groups")}</a>`:""}</div></article>`);
  window.saAnalytics?.track("quiz_complete",{score:Number(result.score),total:Number(result.total),language:state.lang,mode:groupId?"group":"personal"});
  play("done");
}

async function renderMission(parts = []) {
  setActiveNav("missions");
  state.currentReader = null;
  const copy = ATTEMPT_COPY[state.lang], attemptId = parts[2] || sessionStorage.getItem("sa.activeAttempt");
  if (!attemptId) {
    shell(`<section class="gate-panel"><p class="eyebrow">${t("missionTitle")}</p><h1>${copy.prepareTitle}</h1><p class="lead">${copy.readRequired}</p><a class="button primary" href="/reader/GEN/12">${copy.reread}</a></section>`);
    return;
  }
  let data;
  try { data = await attemptRequest("current", "GET", undefined, `attemptId=${encodeURIComponent(attemptId)}`); }
  catch (error) {
    sessionStorage.removeItem("sa.activeAttempt");
    if (["attempt_invalidated", "attempt_expired", "attempt_closed"].includes(error.message)) { renderLockedChapter("GEN", 12); return; }
    throw error;
  }
  if (data.completed) {
    renderAttemptResult(data.result, data.book, data.chapter, data.groupId);
    return;
  }
  const task = data.task, type = task.type === "multi" ? "checkbox" : "radio";
  const options = task.options.map((option, index) => `<label class="option"><input type="${type}" name="answer" value="${index}"><span>${esc(option)}</span></label>`).join("");
  shell(`<div class="section-head"><div><p class="eyebrow">${t("missionTitle")}</p><h1>${copy.prepareTitle}</h1></div><p>${copy.memory}</p></div><div class="mission-shell public"><article class="mission-main"><div class="mission-progress"><span style="width:${Math.round((task.index - 1) * 100 / task.total)}%"></span></div><p><strong>${t("task")} ${task.index} ${t("of")} ${task.total}</strong></p><form id="answer-form"><fieldset class="options"><legend class="question">${esc(task.question)}</legend><p>${task.type === "multi" ? t("selectAll") : t("selectOne")}</p>${options}</fieldset><div class="action-row"><button class="button primary" type="submit">${copy.submit}</button></div><p id="answer-state" role="status"></p></form></article></div>`);
  document.querySelector("#answer-form").onsubmit = async event => {
    event.preventDefault();
    const selected = [...document.querySelectorAll('input[name="answer"]:checked')].map(input => Number(input.value)).sort((a, b) => a - b);
    if (!selected.length) { announce(t("selectOne")); return; }
    const button = event.currentTarget.querySelector("button[type=submit]"), status = document.querySelector("#answer-state");
    button.disabled = true;
    try {
      const response = await attemptRequest("answer", "POST", { attemptId, taskIndex: task.index, selected });
      if (response.completed) {
        sessionStorage.removeItem("sa.activeAttempt");
        attemptChannel?.postMessage({ type: "attempt-completed", attemptId });
        renderAttemptResult(response.result, response.book, response.chapter, response.groupId);
      } else await renderMission(["mission", "attempt", attemptId]);
    } catch (error) {
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
  main.innerHTML=supportSection(state.lang);
  main.focus({preventScroll:true});
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
  if (!state.user) return;
  try {
    const readingData=await accountRequest('reading');
    const localReading=loadJSON('sa.readingHistory',[]),mergedReading=[...new Map([...(readingData.reading||[]),...localReading].map(r=>[r.book+':'+r.chapter,r])).values()];
    localStorage.setItem('sa.readingHistory',JSON.stringify(mergedReading));
    if(mergedReading.length)await accountRequest('reading','PUT',{reading:mergedReading});
    const data = await accountRequest("progress");
    if (
      data.progress &&
      (data.progress.correct?.length || 0) >
        (state.missionProgress.correct?.length || 0)
    ) {
      state.missionProgress = data.progress;
      localStorage.setItem("sa.mission.OTAB01", JSON.stringify(data.progress));
    } else
      await accountRequest("progress", "PUT", {
        progress: state.missionProgress,
      });
  } catch {}
}
function field(name, label, type = "text", extra = "") {
  return `<label class="account-field"><span>${label}</span><input name="${name}" type="${type}" ${extra}></label>`;
}
function renderAccount() {
  setActiveNav("account");
  const copy = {
    uk: { title:"Обліковий запис",intro:"Підтверджена пошта захищає доступ, а серверне збереження повертає ваш прогрес на іншому пристрої.",login:"Увійти",register:"Створити обліковий запис",forgot:"Забули пароль?",reset:"Встановити новий пароль",change:"Змінити пароль",currentPassword:"Поточний пароль",newPassword:"Новий пароль",email:"Електронна пошта",password:"Пароль",passwordRule:"Щонайменше 12 символів",age:"Вік",denomination:"Деномінація або назва церкви",children:"Чи є діти",yes:"Так",no:"Ні",send:"Надіслати посилання",verification:"Перевірте пошту та відкрийте одноразове посилання підтвердження.",verified:"Електронну адресу підтверджено. Тепер увійдіть.",resetSent:"Якщо обліковий запис існує, лист уже надіслано.",resetDone:"Пароль змінено. Інші активні сесії завершено. Увійдіть з новим паролем.",saved:"Профіль і прогрес синхронізуються між пристроями.",edit:"Редагувати сайт",visibility:"Публічна видимість",visibilityHelp:"Усі чутливі поля залишаються приватними. Окремо можна дозволити лише наведені поля.",publicFirst:"Показувати ім’я",publicLast:"Показувати прізвище",publicChurch:"Показувати назву церкви",save:"Зберегти",delete:"Видалити обліковий запис",deleteHelp:"Ця дія видалить профіль, особистий прогрес і ваші групи.",confirmDelete:"Я розумію, що дані буде видалено",logout:"Вийти",error:"Не вдалося виконати дію. Перевірте дані та спробуйте ще раз." },
    ru: { title:"Учётная запись",intro:"Подтверждённая почта защищает доступ, а серверное сохранение возвращает прогресс на другом устройстве.",login:"Войти",register:"Создать учётную запись",forgot:"Забыли пароль?",reset:"Установить новый пароль",change:"Изменить пароль",currentPassword:"Текущий пароль",newPassword:"Новый пароль",email:"Электронная почта",password:"Пароль",passwordRule:"Не менее 12 символов",age:"Возраст",denomination:"Деноминация или название церкви",children:"Есть ли дети",yes:"Да",no:"Нет",send:"Отправить ссылку",verification:"Проверьте почту и откройте одноразовую ссылку подтверждения.",verified:"Электронный адрес подтверждён. Теперь войдите.",resetSent:"Если учётная запись существует, письмо уже отправлено.",resetDone:"Пароль изменён. Другие активные сессии завершены. Войдите с новым паролем.",saved:"Профиль и прогресс синхронизируются между устройствами.",edit:"Редактировать сайт",visibility:"Публичная видимость",visibilityHelp:"Все чувствительные поля остаются приватными. Отдельно можно разрешить только перечисленные поля.",publicFirst:"Показывать имя",publicLast:"Показывать фамилию",publicChurch:"Показывать название церкви",save:"Сохранить",delete:"Удалить учётную запись",deleteHelp:"Будут удалены профиль, личный прогресс и ваши группы.",confirmDelete:"Я понимаю, что данные будут удалены",logout:"Выйти",error:"Не удалось выполнить действие. Проверьте данные и попробуйте снова." },
    en: { title:"Account",intro:"Verified email protects access, and server-side storage restores your progress on another device.",login:"Sign in",register:"Create account",forgot:"Forgot your password?",reset:"Create a new password",change:"Change password",currentPassword:"Current password",newPassword:"New password",email:"Email",password:"Password",passwordRule:"At least 12 characters",age:"Age",denomination:"Denomination or church name",children:"Do you have children?",yes:"Yes",no:"No",send:"Send one-time link",verification:"Check your inbox and open the one-time verification link.",verified:"Your email is verified. You can now sign in.",resetSent:"If the account exists, the message has been sent.",resetDone:"Password changed. Other active sessions have been ended. Sign in with the new password.",saved:"Your profile and progress synchronize across devices.",edit:"Edit site",visibility:"Public visibility",visibilityHelp:"Sensitive fields remain private. You may separately allow only the fields listed below.",publicFirst:"Show first name",publicLast:"Show last name",publicChurch:"Show church name",save:"Save",delete:"Delete account",deleteHelp:"This removes your profile, personal progress, and groups you own.",confirmDelete:"I understand that the data will be deleted",logout:"Sign out",error:"The action could not be completed. Check the details and try again." },
  }[state.lang];
  const sets = ACCOUNT_OPTIONS[state.lang], resetToken = new URLSearchParams(location.search).get("reset"), verified = new URLSearchParams(location.search).get("verified") === "1";
  if (!state.user) {
    if (resetToken) {
      shell(`<section class="card auth-card"><p class="eyebrow">Scripture Archive</p><h1>${copy.reset}</h1><form id="reset-form" class="account-form">${field("password", copy.password, "password", `autocomplete="new-password" minlength="12" maxlength="128" required aria-describedby="password-rule"`)}<small id="password-rule">${copy.passwordRule}</small><button class="button primary">${copy.reset}</button><p id="auth-state" role="status"></p></form></section>`);
      document.querySelector("#reset-form").onsubmit=async event=>{event.preventDefault();const status=document.querySelector("#auth-state");try{await authRequest("reset-password",{token:resetToken,password:new FormData(event.currentTarget).get("password")});status.textContent=copy.resetDone;window.history.replaceState(null,"","/account")}catch{status.textContent=copy.error}};
      return;
    }
    shell(`<div class="section-head"><div><p class="eyebrow">Scripture Archive</p><h1>${copy.title}</h1></div><p>${copy.intro}</p></div>${verified?`<div class="notice success" role="status">${copy.verified}</div>`:""}<div class="auth-grid"><section class="card auth-card"><h2>${copy.login}</h2><form id="login-form" class="account-form">${field("email",copy.email,"email",'autocomplete="email" required')}${field("password",copy.password,"password",'autocomplete="current-password" required')}<button class="button primary">${copy.login}</button><p id="login-state" role="status"></p></form><details><summary>${copy.forgot}</summary><form id="forgot-form" class="account-form">${field("email",copy.email,"email",'autocomplete="email" required')}<button class="button">${copy.send}</button><p id="forgot-state" role="status"></p></form></details></section><section class="card auth-card"><h2>${copy.register}</h2><form id="register-form" class="account-form account-form-grid">${field("firstName",t("firstName"),"text",'autocomplete="given-name" required maxlength="80"')}${field("lastName",t("lastName"),"text",'autocomplete="family-name" required maxlength="80"')}${field("age",copy.age,"number",'min="13" max="120" inputmode="numeric" required')}<label class="account-field"><span>${t("gender")}</span><select name="gender" required>${options(sets.gender)}</select></label><label class="account-field"><span>${t("religion")}</span><select name="tradition" required>${options(sets.religion)}</select></label>${field("denomination",`${copy.denomination} · ${t("optional")}`)}<label class="account-field"><span>${t("marital")}</span><select name="maritalStatus" required>${options(sets.marital)}</select></label><label class="account-field"><span>${copy.children} · ${t("optional")}</span><select name="hasChildren"><option value=""></option><option value="yes">${copy.yes}</option><option value="no">${copy.no}</option></select></label>${field("email",copy.email,"email",'autocomplete="email" required')}${field("password",copy.password,"password",'autocomplete="new-password" minlength="12" maxlength="128" required aria-describedby="register-password-rule"')}<small id="register-password-rule" class="full">${copy.passwordRule}</small><label class="account-check full"><input name="acceptPrivacy" type="checkbox" required><span>${t("privacyAgree")} <a href="/privacy">${t("privacy")}</a></span></label><button class="button primary">${copy.register}</button><p id="register-state" role="status"></p></form></section></div>`);
    document.querySelector("#login-form").onsubmit=async event=>{event.preventDefault();const status=document.querySelector("#login-state"),data=Object.fromEntries(new FormData(event.currentTarget));try{await authRequest("login",data);await getSession();window.saAnalytics?.track("login",{method:"password"});if(state.user?.profileComplete)await syncProgress();window.history.replaceState(null,"","/account");renderAccount()}catch(error){if(error.message==="email_not_verified")await authRequest("resend-verification",{email:data.email}).catch(()=>{});window.saAnalytics?.track("login_error",{error:String(error.message).slice(0,60)});status.textContent=error.message==="email_not_verified"?copy.verification:copy.error}};
    document.querySelector("#forgot-form").onsubmit=async event=>{event.preventDefault();const status=document.querySelector("#forgot-state");try{await authRequest("forgot-password",Object.fromEntries(new FormData(event.currentTarget)));status.textContent=copy.resetSent}catch{status.textContent=copy.error}};
    document.querySelector("#register-form").onsubmit=async event=>{event.preventDefault();const status=document.querySelector("#register-state"),form=new FormData(event.currentTarget),data=Object.fromEntries(form);data.age=Number(data.age);data.acceptPrivacy=form.has("acceptPrivacy");data.hasChildren=data.hasChildren==="yes"?true:data.hasChildren==="no"?false:null;data.locale=state.lang;try{const result=await authRequest("register",data);window.saAnalytics?.track("sign_up",{method:"password",language:state.lang});status.textContent=result.emailDelivered?copy.verification:`${copy.verification} ${copy.error}`;event.currentTarget.querySelector("button").disabled=true}catch(error){window.saAnalytics?.track("sign_up_error",{error:String(error.message).slice(0,60)});status.textContent=copy.error}};
    return;
  }
  if (state.user.profileComplete) {
    const visibility=state.user.visibility||{};
    shell(`<article class="prose account-dashboard"><p class="eyebrow">${t("account")}</p><h1>${esc(state.user.firstName)} ${esc(state.user.lastName)}</h1><p>${esc(state.user.email)}</p><div class="notice success">${copy.saved}</div><div class="action-row"><a class="button primary" href="/missions">${t("continue")}</a><a class="button" href="/groups">${t("myGroups")}</a>${state.user.isOwner?`<a class="button" href="/editor">${copy.edit}</a>`:""}<button class="button" id="logout-button">${copy.logout}</button></div><section class="profile-controls"><h2>${copy.visibility}</h2><p>${copy.visibilityHelp}</p><form id="visibility-form" class="account-form"><label class="account-check"><input name="firstName" type="checkbox" ${visibility.firstName?"checked":""}><span>${copy.publicFirst}</span></label><label class="account-check"><input name="lastName" type="checkbox" ${visibility.lastName?"checked":""}><span>${copy.publicLast}</span></label><label class="account-check"><input name="church" type="checkbox" ${visibility.church?"checked":""}><span>${copy.publicChurch}</span></label><button class="button">${copy.save}</button><p id="visibility-state" role="status"></p></form></section>${state.user.authProvider==="password"?`<details class="profile-controls"><summary>${copy.change}</summary><form id="password-form" class="account-form">${field("currentPassword",copy.currentPassword,"password",'autocomplete="current-password" required')}${field("newPassword",copy.newPassword,"password",'autocomplete="new-password" minlength="12" maxlength="128" required')}<small>${copy.passwordRule}</small><button class="button">${copy.change}</button><p id="password-state" role="status"></p></form></details><details class="danger-zone"><summary>${copy.delete}</summary><p>${copy.deleteHelp}</p><form id="delete-form" class="account-form">${field("password",copy.password,"password",'autocomplete="current-password" required')}<label class="account-check"><input name="confirm" type="checkbox" required><span>${copy.confirmDelete}</span></label><button class="button">${copy.delete}</button><p id="delete-state" role="status"></p></form></details>`:""}</article>`);
    document.querySelector("#logout-button").onclick=async()=>{await authRequest("logout");state.user=null;localStorage.removeItem("sa.progressOwner");renderAccount()};
    document.querySelector("#visibility-form").onsubmit=async event=>{event.preventDefault();const form=new FormData(event.currentTarget),status=document.querySelector("#visibility-state");try{state.user=(await accountRequest("visibility","PUT",{firstName:form.has("firstName"),lastName:form.has("lastName"),church:form.has("church")})).user;status.textContent=copy.saved}catch{status.textContent=copy.error}};
    if(document.querySelector("#password-form"))document.querySelector("#password-form").onsubmit=async event=>{event.preventDefault();const status=document.querySelector("#password-state"),data=Object.fromEntries(new FormData(event.currentTarget));try{await authRequest("change-password",data);state.user=null;localStorage.removeItem("sa.progressOwner");renderAccount()}catch{status.textContent=copy.error}};
    if(document.querySelector("#delete-form"))document.querySelector("#delete-form").onsubmit=async event=>{event.preventDefault();const status=document.querySelector("#delete-state"),form=new FormData(event.currentTarget);if(!form.has("confirm"))return;try{await authRequest("delete-account",{password:form.get("password")});state.user=null;localStorage.removeItem("sa.progressOwner");renderAccount()}catch{status.textContent=copy.error}};
    return;
  }
  const ageOptions=["13-17","18-24","25-34","35-44","45-54","55-64","65+"].map(value=>`<option>${value}</option>`).join("");
  shell(`<div class="section-head"><div><p class="eyebrow">${esc(state.user.email)}</p><h1>${copy.title}</h1></div><p>${copy.intro}</p></div><section class="card profile-card"><form id="profile-form" class="account-form account-form-grid">${field("firstName",t("firstName"),"text",'autocomplete="given-name" required')}${field("lastName",t("lastName"),"text",'autocomplete="family-name" required')}<label class="account-field"><span>${t("ageRange")}</span><select name="ageRange" required><option value=""></option>${ageOptions}</select></label><label class="account-field"><span>${t("religion")} · ${t("optional")}</span><select name="tradition">${options(sets.religion)}</select></label>${field("church",`${t("church")} · ${t("optional")}`)}<label class="account-field"><span>${t("marital")} · ${t("optional")}</span><select name="maritalStatus">${options(sets.marital)}</select></label><label class="account-field"><span>${t("gender")} · ${t("optional")}</span><select name="gender">${options(sets.gender)}</select></label><label class="account-check"><input name="acceptSensitive" type="checkbox"><span>${t("sensitiveAgree")}</span></label><label class="account-check"><input name="acceptPrivacy" type="checkbox" required><span>${t("privacyAgree")} <a href="/privacy">${t("privacy")}</a></span></label><button class="button primary">${copy.save}</button><p id="profile-state" role="status"></p></form></section>`);
  document.querySelector("#profile-form").onsubmit=async event=>{event.preventDefault();const form=new FormData(event.currentTarget),data=Object.fromEntries(form);data.acceptSensitive=form.has("acceptSensitive");data.acceptPrivacy=form.has("acceptPrivacy");data.locale=state.lang;try{state.user=(await accountRequest("profile","POST",data)).user;await syncProgress();renderAccount()}catch{document.querySelector("#profile-state").textContent=copy.error}};
}

async function renderEditor() {
  setActiveNav("account");
  if (!state.user?.isOwner) {
    renderAccount();
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
  let analytics = { days:30, accounts:{}, summary:{}, daily:[], countries:[], devices:[], browsers:[], pages:[], events:[], recentUsers:[] };
  try {
    users = (await accountRequest("users")).users || [];
  } catch {}
  try {
    const response = await fetch("/api/content?admin=1", { cache: "no-store" });
    if (response.ok) managed = await response.json();
  } catch {}
  try {
    const response = await fetch("/api/analytics?days=30", { cache: "no-store" });
    if (response.ok) analytics = await response.json();
  } catch {}
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
  document.querySelector(".editor-grid").insertAdjacentHTML("beforeend", `<section class="card full"><h2>${adminLabels.heading}</h2><p>${adminLabels.lead}</p><form id="managed-content-form" class="account-form account-form-grid"><label class="account-field"><span>ID</span><input name="id" maxlength="100"></label><label class="account-field"><span>${adminLabels.kind}</span><select name="kind"><option value="book">book</option><option value="chapter">chapter</option><option value="translation">translation</option><option value="mission">mission</option><option value="question">question</option><option value="route">route</option><option value="marathon">marathon</option><option value="ui_text">ui_text</option></select></label><label class="account-field"><span>${adminLabels.locale}</span><select name="locale"><option>uk</option><option>ru</option><option>en</option><option>all</option></select></label><label class="account-field"><span>${adminLabels.status}</span><select name="status"><option value="draft">${adminLabels.draft}</option><option value="published">${adminLabels.published}</option><option value="hidden">${adminLabels.hidden}</option></select></label>${field("title",adminLabels.title,"text",'required maxlength="200"')}<label class="account-field full"><span>${adminLabels.data}</span><textarea name="data" rows="8" required>{}</textarea></label><button class="button primary">${adminLabels.save}</button><p id="managed-content-state" role="status"></p></form><div class="managed-list">${managed.items.length?managed.items.map(item=>`<article><strong>${esc(item.title)}</strong><span>${esc(item.kind)} · ${esc(item.locale)} · ${esc(item.status)}</span></article>`).join(""):`<p>—</p>`}</div><details><summary>${adminLabels.history} · ${managed.revisions.length}</summary><ol>${managed.revisions.slice(0,30).map(revision=>`<li>${esc(revision.content_key)} · ${esc(revision.created_at)}</li>`).join("")}</ol></details></section>`);
  document.querySelector("#content-form").onsubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const response = await fetch("/api/content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ liveNote: data }),
    });
    if (response.ok) {
      state.cms = await response.json();
      document.querySelector("#content-state").textContent = t("progressSaved");
    } else
      document.querySelector("#content-state").textContent = t("registerError");
  };
  document.querySelector("#managed-content-form").onsubmit = async event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget), status = document.querySelector("#managed-content-state");
    let data;
    try { data = JSON.parse(String(form.get("data"))); }
    catch { status.textContent = "JSON"; return; }
    try {
      const response = await fetch("/api/content", { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ action:"upsert-item", id:form.get("id"), kind:form.get("kind"), locale:form.get("locale"), status:form.get("status"), title:form.get("title"), data }) });
      if (!response.ok) throw Error(String(response.status));
      status.textContent = t("progressSaved");
      await renderEditor();
    } catch { status.textContent = t("registerError"); }
  };
}

function renderPrivacy() {
  setActiveNav("");
  const copy = {
    uk: [
      "Приватність і облікові записи",
      "Scripture Archive підтверджує електронну адресу одноразовим посиланням і зберігає пароль лише як стійкий криптографічний хеш. Захищені серверні сесії дають змогу синхронізувати профіль і прогрес між пристроями.",
      "Конфесія, конкретна церква, сімейний стан і стать є необов’язковими приватними даними. Вони не впливають на оцінювання. У домашніх групах ім’я учасника може бути показане лише після його окремої згоди; електронна адреса не публікується.",
      "Аналітика вмикається лише після згоди на аналітичні cookie. Вона фіксує переглянуті розділи, тип пристрою, приблизну країну, виконані дії та активний час. Паролі, відповіді, назви груп і вміст профілю до аналітики не передаються; згоду можна скасувати очищенням налаштувань сайту у браузері.",
      "Дані профілю можна виправити в обліковому записі, а обліковий запис і пов’язані особисті дані — видалити там само. Для додаткового звернення: dordiaioleksii1@gmail.com.",
    ],
    ru: [
      "Приватность и учётные записи",
      "Scripture Archive подтверждает электронный адрес одноразовой ссылкой и хранит пароль только как стойкий криптографический хеш. Защищённые серверные сессии синхронизируют профиль и прогресс между устройствами.",
      "Конфессия, конкретная церковь, семейное положение и пол — необязательные приватные данные. Они не влияют на оценивание. В домашних группах имя участника может отображаться только после его отдельного согласия; электронная почта не публикуется.",
      "Аналитика включается только после согласия на аналитические cookie. Она фиксирует просмотренные разделы, тип устройства, примерную страну, выполненные действия и активное время. Пароли, ответы, названия групп и содержимое профиля в аналитику не передаются; согласие можно отменить, очистив настройки сайта в браузере.",
      "Данные профиля можно исправить в учётной записи, а учётную запись и связанные личные данные — удалить там же. Для дополнительного обращения: dordiaioleksii1@gmail.com.",
    ],
    en: [
      "Privacy and accounts",
      "Scripture Archive verifies an email address with a one-time link and stores the password only as a strong cryptographic hash. Secure server sessions synchronize the profile and progress across devices.",
      "Christian tradition, specific church, marital status, and gender are optional private data and never affect grading. In home groups, a member’s name may be displayed only after their separate consent; email addresses are never published.",
      "Analytics runs only after consent to analytics cookies. It records sections viewed, device type, approximate country, actions, and active time. Passwords, answers, group names, and profile content are never sent; consent can be withdrawn by clearing this site’s browser settings.",
      "You can correct profile data in your account and delete the account and its associated personal data there. For an additional request, email dordiaioleksii1@gmail.com.",
    ],
  }[state.lang];
  shell(
    `<article class="prose"><p class="eyebrow">Scripture Archive</p><h1>${copy[0]}</h1>${copy
      .slice(1)
      .map((p) => `<p>${p}</p>`)
      .join("")}</article>`,
  );
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
  try {
    const sourceRoute = location.hash.startsWith("#/") ? location.hash.replace(/^#\/?/, "") : location.pathname.replace(/^\/?/, "");
    const parts = sourceRoute.split("/").filter(Boolean);
    const name = parts[0] || "home";
    if (name !== "reader") state.currentReader = null;
    if (name === "reader")
      await renderReader(parts);
    else if (name === "missions") await renderMissions();
    else if (name === "mission") await renderMission(parts);
    else if (name === "groups" && parts[1]) await renderGroup(parts[1]);
    else if (name === "groups") await renderGroups();
    else if (["home-groups", "live", "campaigns", "dossiers", "builder", "progress", "about"].includes(name)) await renderWorkspace(name==='home-groups'?'live':name,{state,t,esc,shell,getMission,setActiveNav,loadJSON,announce,play});
    else if (name === "atlas") renderAtlas();
    else if (name === "support") renderSupport();
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
    shell(`<div class="notice error">${t("errorLoad")}</div>`);
  }
}

langSelect.addEventListener("change", () => {
  state.lang = langSelect.value;
  localStorage.setItem("sa.lang", state.lang);
  state.mission = null;
  setStaticI18n();
  play("nav");
  route();
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
window.addEventListener("hashchange", () => {
  if (location.hash && !location.hash.startsWith("#/")) return;
  route();
});
window.addEventListener("popstate", route);
Promise.all([getCMS(), getSession()]).finally(async () => {
  if (state.user?.profileComplete) await syncProgress();
  setStaticI18n();
  route();
});
