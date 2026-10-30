# SCRIPTURE ARCHIVE — каталог розділів і план реалізації розширень
**Дата:** 2026-10-28 | **Статус:** OWNER_APPROVED_PLANNING_SCOPE
**Мета:** не зупинити випуск чинного продукту, а зареєструвати повний майбутній зміст і критерії готовності.
**Обов'язкова класифікація:** EXISTING_SOURCE / INCOMPLETE_RELEASE / PLANNED_NEW / SEPARATE_PRODUCT. Це НЕ відсоток готовності.

## Поточні передумови й критичний шлях (поза каталогом розширень)
- R0.1: перевірити live site / точний SHA; поточна історично підтверджена publication v10 `3a04d12`, source main не прирівнювати до live.
- R0.2: email sender/DNS SPF DKIM DMARC; реєстрація -> підтвердження -> відновлення пароля -> повторний вхід. Статус: INCOMPLETE_RELEASE.
- R0.3: опрацювати pending source patch `dd30b82` до attempts chapter disclosure лише після перевірки поточного deployment та дозволу на випуск. Статус: INCOMPLETE_RELEASE.
- R0.4: owner Stop/Continue, реально активні або неактивні Cron/scheduler, безпека, trust boundary. Статус: INCOMPLETE_RELEASE.
- R0.5: наскрізний user journey читальня -> місія -> прогрес -> повторний вхід; домашня група -> зустріч -> звіт/марафон; мобільний UX, клавіатура, NVDA, відповідність текстів і прав. Статус: INCOMPLETE_RELEASE.
- R0.6: не запускати автоматичні розсилки, релізи, синтетичну community-активність, платежі або сервіс знайомств цією зміною документації.

## Майбутні розділи (кожен — окрема група вимог)
### SA-EXT-01. Біблійні видання й паралельний читач
**Статус:** EXISTING_SOURCE + PLANNED_EXPANSION. Біблійні книги/глави, пошук, вибір видань; розширення до різних перекладів за ліцензією, порівняння, цитування, закладки. **Приймання:** перевірені тексти й права, правильна навігація, пошук, provenance, клавіатура/NVDA.

### SA-EXT-02. Навчальні місії, пам'ять і рівні складності
**Статус:** EXISTING_SOURCE + PLANNED_EXPANSION. Наявна місія Авраама та захищене оцінювання; ширший навчальний каталог, повторення, індивідуальні прогрес і пояснення. **Приймання:** тестова й реальна історія, нуль прихованих правильних відповідей, коректні переклади й джерела.

### SA-EXT-03. Конструктор і редакційний процес
**Статус:** EXISTING_SOURCE/INCOMPLETE_INTEGRATION. Автор створює/переглядає/тестує вправу, редактор затверджує, версії/відкликання, експорт. **Приймання:** editor/non-editor permissions, audit log, зміни перевірені без source leakage.

### SA-EXT-04. Домашні групи та навчальні марафони
**Статус:** EXISTING_SOURCE / INCOMPLETE_PRODUCTION_ACCEPTANCE. Групи, запрошення, приватність, зустрічі, відповіді, cohort і марафони. **Приймання:** дві реальні тестові ролі/групи, приватні дані не витікають, повторний вхід/відновлення, правильні підсумки.

Реалізовано у вихідному коді: вихід учасника, атомарне передавання власності та підтверджене видалення групи; перевірки й межі — `SA_EXT_04_GROUP_MEMBERSHIP.md`. Це не статус production acceptance.

### SA-EXT-05. Досьє, граф джерел, історичний контекст
**Статус:** PLANNED_EXPANSION. Постаті, місця, події, свідчення, зв'язки OT/NT, тематичні досьє, порівняння перекладів. **Приймання:** traceable source refs, disambiguation, наукові/конфесійні трактування явно позначені.

### SA-EXT-06. Біблійний атлас і хронологічна лабораторія
**Статус:** PLANNED_NEW. Географія, карти, маршрути, хронології, археологічні контексти. **Приймання:** усі графічні дані доступні як структуровані текстові списки/таблиці, права на карти перевірені, географічна невизначеність показана.

### SA-EXT-07. Християнська академія
**Статус:** PLANNED_NEW. Курси Писання, історії церкви, сімейного життя, служіння, музики; аудіо/відео/транскрипт/тести. **Приймання:** author-review, прогрес і completion badges без хибної акредитації, доступність для незрячих.

### SA-EXT-08. Цифрова християнська бібліотека
**Статус:** PLANNED_NEW. Книги, дослідження, проповіді, записи конференцій, музичні матеріали та аудіокниги. **Приймання:** каталог прав/джерел, пошук і видалення на вимогу правовласника, доступні медіа.

### SA-EXT-09. Каталог церков і місцевих громад
**Статус:** PLANNED_NEW із reuse від Home Groups. Верифіковані сторінки громади, мова/місто/традиція/контакти за згодою, заходи. **Приймання:** підтвердження прав представника, community ownership, права на виправлення/видалення.

### SA-EXT-10. Християнська соціальна спільнота
**Статус:** PLANNED_NEW. Дискусії, тематичні канали, повідомлення, коментарі, добровільні профілі. **Приймання:** consent, доступні controls, приватні чати, антиспам, модерація, блокування/скарги. Відсутня автоматична dating-видимість.

### SA-EXT-11. Конференції та заходи
**Статус:** PLANNED_NEW. Каталог, програми, реєстрація, вкладені матеріали, зустрічі й табори, волонтерські команди. **Приймання:** реальні власники заходів, згода, обробка списків відвідувачів, доступність.

### SA-EXT-12. Благодійність і волонтерські проєкти
**Статус:** PLANNED_NEW. Перевірені збори, прозорі витрати, статуси, історії допомоги з дозволу. **Приймання:** перевірка організацій і платіжного провайдера, звіти, запобігання шахрайству, юридичний та фінансовий контроль.

### SA-EXT-13. ШІ-дослідник і навчальні помічники
**Статус:** PLANNED_NEW. Пошук джерел, пояснення з посиланнями, підготовка чернеток занять, багатомовність. **Приймання:** provenance, hallucination/denominational QA, людина затверджує публікацію, жодного автоматичного переписування текстів Біблії.

### SA-EXT-14. Міжнародність і локалізація
**Статус:** EXISTING_SOURCE (uk/ru/en) + PLANNED_EXPANSION. Ціль — до 82 мов, видавничі угоди, native speaker QA, редакційні глосарії й доступні клавіатурні мови. **Приймання:** language coverage matrix, перевірка текстів/прав, без хибного claim «82 мови вже готові».

### SA-EXT-15. Партнерства й редакційна мережа
**Статус:** PLANNED_NEW. Пілотні громади, навчальні куратори, перекладачі, історики, дизайнери, консультанти з доступності; запити на функції. **Приймання:** реальні партнерські угоди/згоди, виправні редакційні завдання, attribution, результат пілоту.

### SA-EXT-16. Доступність, приватність, безпека й операційна надійність
**Статус:** INCOMPLETE_RELEASE + CONTINUOUS. NVDA, повна клавіатура, мобільні екрани, права, видалення/експорт даних, backup/rollback/incident response. **Приймання:** e2e і physical acceptance, не лише автоматичні asserts.

### SA-EXT-17. Дитяче/сімейне навчання
**Статус:** PLANNED_NEW. Сімейні уроки й вікторини, ролі батьків/наставників. **Приймання:** мінімізація даних, окремий захист неповнолітніх, жодної доступності до знайомств 18+.

### SA-EXT-18. Волонтерський дослідницький й історико-архівний внесок
**Статус:** PLANNED_NEW. Подання джерел, перевірка транскриптів, свідчень, фотоматеріалів і прав, документування місцевої історії громад. **Приймання:** згода осіб, дати/авторство, редагування та видалення, human moderation.

### SA-EXT-19. Організація зустрічей і міжгромадська співпраця
**Статус:** PLANNED_NEW. Пошук спільних заходів, груп, навчальних ініціатив, волонтерів. **Приймання:** чітке членство й дозволи, приватність локацій, безпечні запрошення, opt-out.

### SA-EXT-20. Окремий Christian Dating & Fellowship
**Статус:** SEPARATE_PRODUCT / APPROVED_FOR_PLANNING_ONLY. Не залежить від навчальних облікових записів Scripture Archive, не публікується за замовчуванням. Пілот із добровільних дорослих учасників, що самі називають себе суботніми християнами, з можливістю розширення. **Приймання:** 18+, explicit opt-in, sensitive-faith-data consent, anti-fraud/moderation, mutual consent, data separation, no synthetic profiles. Докладно: окрема технічна специфікація.

## Орієнтовні етапи, не окремі продукти
**Етап А — привести чинний сайт до перевіреної готовності:** R0.1–R0.6. Новий масштаб не скасовує цього пріоритету.
**Етап Б — завершити навчальний фундамент і пілоти громад:** SA-EXT-01–04, 14, 16; почати обмежено SA-EXT-15.
**Етап В — контент і співпраця:** SA-EXT-05–09, 11, 13, 15, 17–19; кожен розділ за реальним попитом та верифікацією.
**Етап Г — соціальні й благодійні сервіси:** SA-EXT-10, 12 після готової moderation/privacy/security base.
**ОКРЕМО:** SA-EXT-20, власна команда/домен/DB й alpha після окремого risk review. Жоден етап не є підставою автоматично деплоїти.

## Ролі й контроль доказів
Кожен запис у подальших Issue/PR повинен мати: `section_id`, `owner`, `dependencies`, `source branch/SHA`, `status` (PLANNED/IN_PROGRESS/SOURCE_READY/RELEASE_VERIFIED), `evidence`, `acceptance`, `privacy/accessibility`, `rights`. Жоден статус SOURCE_READY не конвертувати в LIVE без реальних end-to-end доказів.
Зв'язки: `docs/product/SCRIPTURE_ARCHIVE_EXPANDED_PRODUCT_VISION_2026-10-28.md`; `docs/architecture/CHRISTIAN_COMMUNITY_AND_DATING_TECHNICAL_SPEC_2026-10-28.md`; GitHub #78; handoff 26.10.2026.

---

## Verified source convergence 2026-10-30 — evidence, not product acceptance

**Операційний статус:** цей додаток лише підтверджує конкретні перевірені підфункції у живому GitHub `main`; він не змінює затвердженого обсягу SA-EXT-01…20, не перетворює `PLANNED_NEW` на готовий продукт і не санкціонує випуск. Початкова версія плану 28.10 залишається джерелом повних вимог.

**Перевірений інтеграційний SHA після трьох ремонтів:** `19b53d0cde0318d2e8e4079bef190efe47892cda`; усі три merge SHA належать історії пізнішого `main` (перевірено `compare_commits`). Координація та продовження: [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297#issuecomment-6513640327).

| Підфункція плану | Вихідний стан, який реально відтворено | Виправлення у `main` | Точний стан |
| --- | --- | --- | --- |
| SA-EXT-06 / ATLAS_ALL_PLACE_SOURCES | Атлас приховував 11 інших посилань із шести досьє місць; показував по одному джерелу | [PR #447](https://github.com/Oleksii-debug/scripture-archive/pull/447), SHA `0353c85c0c36db8a00776bf7fcb192fbc21d5317`: усі три першоджерела на місце з клавіатурними посиланнями | **Підфункція SOURCE_CLOSED / SCOPED_TERMINAL**; увесь розділ SA-EXT-06 — **OPEN** |
| SA-EXT-07 / ACADEMY_ALL_AUTHORED_QUESTIONS | Сім уроків ховали друге затверджене запитання (21 локалізований пропуск у uk/ru/en) | [PR #452](https://github.com/Oleksii-debug/scripture-archive/pull/452), SHA `4f10d944ef59d519d91edaa0fd9e61555271d57e`: усі питання у семантичних списках; одночасний fix #449 збережено | **Підфункція SOURCE_CLOSED / SCOPED_TERMINAL**; увесь SA-EXT-07 — **OPEN** |
| SA-EXT-05/06 / ATLAS_SOURCE_KIND_PROVENANCE | Посилання на Михея 5:2 як тематичне тлумачення в атласі не мало застереження, яке вже було в досьє | [PR #453](https://github.com/Oleksii-debug/scripture-archive/pull/453), SHA `19b53d0cde0318d2e8e4079bef190efe47892cda`: тип джерела позначено для кожного уривка усіма трьома мовами | **Підфункція SOURCE_CLOSED / SCOPED_TERMINAL**; увесь SA-EXT-05/06 — **OPEN** |
| SA-EXT-16 / ANALYTICS_PRIVATE_ROUTE_PARAMETER_MINIMIZATION | Аналітика могла передати довільні параметри, приватні шляхи груп і динамічні заголовки до first-party/GA4 після згоди | [PR #472](https://github.com/Oleksii-debug/scripture-archive/pull/472), merge SHA `9b3bc78a9e0ce3f01b743adab8566df9bc9c2375`: точні 2 файли `public/analytics.js` та `tests/analytics-private-error-redaction.test.mjs`, обмежені значення подій та категорії маршрутів | **CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** для цієї конкретної підфункції, remaining_implementation=0; увесь **SA-EXT-16 OPEN**, live deployment/NVDA НЕ ПІДТВЕРДЖЕНО |

### Верифіковані перевірки та обмеження

- Власноруч виконані source-executed V8-контракти: **95/95 + 88/88 + 66/66 PASS** на відповідних версіях реального JavaScript та каталогу.
- GitHub Actions [#40991814980](https://github.com/Oleksii-debug/scripture-archive/actions/runs/40991814980): 765 Node PASS / 1 SKIP; [#40992473695](https://github.com/Oleksii-debug/scripture-archive/actions/runs/40992473695) і [#40992745009](https://github.com/Oleksii-debug/scripture-archive/actions/runs/40992745009): кожен по 779 Node PASS / 1 SKIP. Нові цільові тести PASS; TypeScript, lint, source build та Python-валідатори PASS.
- **Кожен цілий workflow — RED**: disposable Worker/D1 двічі 21/22; раніше відтворена помилка `Your worker restarted mid-request` на `tests/api-flow.test.mjs:103`. Відкрита ділянка [#361](https://github.com/Oleksii-debug/scripture-archive/pull/361) залишається DRAFT/NOT_READY. Не називати ці перевірки загальним CI PASS.
- Досі **НЕ ПІДТВЕРДЖЕНО** сайт/production SHA, реальне D1, email/DNS, owner scheduler, фізичний NVDA, Windows-пакет, дозволи на майбутні видання та незалежне editorial acceptance. Усі **повні розділи SA-EXT-01…20 залишаються відкритими**, аж поки не буде всього раніше затвердженого функціоналу. Ці дрібні source fixes не слід повторно призначати без конкретного регресійного дефекту.
- **Не зроблено і не дозволено цим записом:** деплой, нові 82 мови, розсилки/Cron, платежі, синтетичні профілі, сервіс знайомств або міграція виробничих персональних даних. Вимоги до окремого 18+ продукту SA-EXT-20 залишаються окремими.

### Додаткова незалежно перевірена інтеграція, 2026-10-30

- [PR #472](https://github.com/Oleksii-debug/scripture-archive/pull/472) завершено в `main` комітом `9b3bc78a9e0ce3f01b743adab8566df9bc9c2375`. Його включення до пізнішого `main` перевірено через compare (`behind_by=0`); це не SHA виробничого сайту.
- Exact PR-head workflow [40999167648](https://github.com/Oleksii-debug/scripture-archive/actions/runs/40999167648): **SUCCESS**; Node **859 PASS / 1 SKIP / 0 FAIL**, TypeScript/lint/build та Python валідатори PASS. Disposable Worker/D1 перший цикл **21/22** через відомий `worker restarted mid-request`, дозволений повторний запуск у новій тимчасовій БД **22/22 PASS**. Це тест ізольованої CI-системи, а не підтвердження production або остаточного виправлення нестабільності #361.
- Receipt на [координації #297](https://github.com/Oleksii-debug/scripture-archive/issues/297#issuecomment-6514481243). Всі 20 повних батьківських розділів далі відкриті; без хибного `RELEASE_VERIFIED` чи `TERMINAL` для батьків.

### Дві незалежно перевірені підфункції SOURCE_CLOSED — 30.10.2026

| Підфункція затвердженого розділу | Завершена користувацька поведінка | Точне підтвердження у GitHub main | Остаточний статус підфункції |
| --- | --- | --- | --- |
| SA-EXT-07 / ACADEMY_READONLY_SOURCE_ACCESS | Сім існуючих україно-, російсько- та англомовних занять і справжні посилання на Писання залишаються доступними при забороненому/пошкодженому браузерному сховищі; не показуються фальшиві позначки, сертифікати чи кнопки збереження. Каталог першоджерел далі проходить валідацію | [PR #465](https://github.com/Oleksii-debug/scripture-archive/pull/465), merge SHA `d172f6f316527162b3b06384329bf7c6671c2e8b`; [main CI 40997819315](https://github.com/Oleksii-debug/scripture-archive/actions/runs/40997819315): Node 846 PASS/1 SKIP, Worker/D1 22/22, TS/lint/build/Python PASS | **CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL**, `remaining_implementation_for_this_subfeature=0`; повний SA-EXT-07 **OPEN** |
| SA-EXT-02/16 / PRIVATE_CACHE_OWNER_MARKER_INTEGRITY | Коли не вдалося повністю стерти приватну історію попереднього облікового запису, її старий маркер власності не втрачається й історія не стає власністю наступного користувача. Після відновлення сховища недовірений кеш повторно перевіряється та очищується. Інші виправлення сесій, уже злиті в #470, збережено | [PR #468](https://github.com/Oleksii-debug/scripture-archive/pull/468), merge SHA `d23a1a7346c39f800de8918f4392ad824813b0c3`; [CI 40999615203](https://github.com/Oleksii-debug/scripture-archive/actions/runs/40999615203): Node 873 PASS/1 SKIP, Worker/D1 22/22, TS/lint/build/Python PASS | **CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL**, `remaining_implementation_for_this_subfeature=0`; повні SA-EXT-02/16 **OPEN** |

- Перед записом повторно прочитано зміни **саме з main@d23a1a7346c39f800de8918f4392ad824813b0c3** та підтверджено злиття обох PR. Докази, блоби, невирішені перевірки та порядок роботи: [issue #297, receipt](https://github.com/Oleksii-debug/scripture-archive/issues/297#issuecomment-6514539428).
- **Уточнення історичної примітки вище:** твердження «кожен цілий workflow RED» стосується *лише названих там старіших запусків*. Пізніші конкретні запуски **40997819315** і **40999615203** завершилися SUCCESS разом із локальним Worker/D1; в інших перевірках ця ж тимчасова інфраструктура давала HTTP 503. Незавершена чернетка [#361](https://github.com/Oleksii-debug/scripture-archive/pull/361) не злита й не доводить постійного усунення нестабільності.
- **Не заявлено:** весь SA-EXT-01…20 як закритий; нову production-версію, реальний production SHA, HOSTiQ/Cloudflare deploy, перевірену пошту/DNS, права на всі майбутні видання, живий браузер або фізичне NVDA-приймання. Жодної зміни на сайт цим документом не внесено.


---

### SA-EXT-16 / SUPPORT_SELECTED_EMPTY_FILE_LOSS — scoped terminal, 2026-10-30

**Статус конкретної підфункції:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`; залишок реалізації цього дефекту — **0**; потрібних незлитих PR для нього — **0**. **Статус повного розділу SA-EXT-16: OPEN**, як і всіх 20 розділів загалом.

- **Дефект:** вибраний користувачем і названий порожній файл (`File.size=0`) раніше тихо відкидався до фіксації запиту підтримки; API підтверджував приймання звернення без вибраного вкладення. Неправильно сформоване текстове поле `files` могло так само не викликати помилки.
- **Функція:** канонічний `app/api/help/route.ts` тепер відхиляє такі вхідні файли/поля з `400 invalid_attachment` до будь-якого D1-запису або надсилання листа; нормальний порожній placeholder браузерного file-input і запити без вкладень працюють далі. Жодного окремого сервера, альтернативного support-store або фіктивного UI не додано.
- **Інтеграція:** [PR #478](https://github.com/Oleksii-debug/scripture-archive/pull/478) **squash MERGED**; точний перевірений `main` SHA `4b79da7a29aa1843e8e057ae379e692e1019ce6b`. GitHub commit/readback: **рівно два шляхи**, `app/api/help/route.ts` blob `f8341b24030e4630b306e604dd504b9a3f5ed35d` і `tests/help-empty-attachment.test.mjs` blob `7a0bab06094b2bcd4433ab8b46d6d34e56240c59`; PR closed/merged.
- **Тести:** [exact-head GitHub Actions #41001780118](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41001780118): **897 native Node PASS / 1 SKIP / 0 FAIL**, 9 доданих source-executing позитивних/негативних кейсів; TypeScript, lint (0 errors), build, Python-валідатори PASS. **Загальний CI — RED**: окремий давно відомий Worker/D1 restart HTTP 503 у disposable E2E (21/22 двічі), відкритий [PR #361](https://github.com/Oleksii-debug/scripture-archive/pull/361). Не називати це повним E2E PASS.
- **Реліз:** не розгорталося; live-SHA, реальна доставка підтримки та фізичне NVDA-приймання не встановлені. Цей scoped дефект не слід заново розробляти без нового конкретного регресійного доказу.


---

### SA-EXT-16 / SUPPORT_RECEIPT_TRUTHFUL_UI — scoped terminal, 2026-10-30

**Статус підфункції:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`; залишкових задач реалізації цієї вузької функції — **0**; потрібних незлитих PR — **0**. **Повний SA-EXT-16 і всі SA-EXT-01–20 — OPEN.**

- **Дефект:** після успішного `POST /api/help` вебформа в усіх трьох мовах обіцяла відповідь електронною поштою, ігнорувала підтверджений сервером `requestId` та `mailStatus=delivery_unknown` / `delivery_record_pending`. Збереження звернення не засвідчує фактичної доставки листа.
- **Функція:** чинний `public/app.js` показує реальний номер збереженого звернення в наявному `role=status` / `aria-live`, повідомляє про невизначену доставку українською, російською та англійською; не оголошує успіх або не очищає форму, коли HTTP 2xx не містить достовірного UUID; виводить номер лише через `textContent`. Звичайний випадок та помилки зберігають наявний маршрут інтерфейсу.
- **GitHub main:** [PR #480](https://github.com/Oleksii-debug/scripture-archive/pull/480) **squash MERGED** у `main@4a639cc81e377a5aa4429d877b8643cdcbaf920d`, рівно два шляхи: `public/app.js` (blob `14fb5c0e4470f7cc5a6e302412cafb32d7a0f780`), `tests/help-receipt-ui.test.mjs` (blob `545a7f8763c73b00a8880fa19dd8bbfd505b6e5a`); окремо перевірено `main`, `PR.merged` та обидва файли.
- **Тести:** [точний PR-head GitHub Actions #41002420320](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41002420320): **917 native Node PASS, 1 SKIP, 0 FAIL**, включно з 20 тестами живого рендера трьома мовами; TypeScript, lint (0 errors), source build, Python-валідатори PASS. **Загальний CI — RED** через відомий нестабільний Worker/D1 HTTP503 restart (21/22 двічі), окрема чинна [#361](https://github.com/Oleksii-debug/scripture-archive/pull/361). Це не E2E PASS.
- **Межі:** реальна доставка пошти, production-реліз/SHA, Windows/NVDA не підтверджені. Повторна розробка цього конкретного коду допускається лише за новим дефектом; відкриті майбутні функції батьківського розділу не терміналізовано.


---

### SA-EXT-01 / PARALLEL_TRANSLATION_ID_BINDING — scoped terminal, 2026-10-30

**Статус конкретної підфункції:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`; залишок реалізації — **0**, необхідних незлитих PR для цього дефекту — **0**. **Увесь розділ SA-EXT-01 та інші SA-EXT-01–20 залишаються OPEN** за погодженим обсягом; цей запис не підтверджує повного випуску.

- **Відтворений дефект:** канонічний порівняльний читач `public/parallel-reader.js` раніше приймав метадані `catalog.translations[edition.id]` без перевірки внутрішнього `id`: неправильно позначений переклад міг показувати фактичний текст під чужою назвою та ліцензією. На оригінальному джерелі ізольоване V8-виконання показало `Mislabelled` і `Wrong license` поряд із текстом.
- **Реальна функція:** оголошені переклади тепер відображають текст лише за точного збігу ідентичності; оголошені записи з іншим/відсутнім `id` або `null` відхиляються, залишаючи текст прихованим і показуючи чинне локалізоване повідомлення. За відсутності окремого запису зберігається раніше дозволений fallback до точно ідентифікованого канонічного місцевого видання. Немає нової БД, другого читача або змін самих біблійних текстів.
- **GitHub:** [PR #481](https://github.com/Oleksii-debug/scripture-archive/pull/481) squash MERGED в `main@d60a3df68c8bfb308334a37304206498d0faede7`, реальний GitHub readback після merge; рівно **2 шляхи**: `public/parallel-reader.js` blob `fa95634b4b7bf0682593b081e6338bc61323e5d9`, `tests/parallel-reader.test.mjs` blob `c19b2e838226adcdbee3989ba21611211ef1d156`.
- **Перевірка:** 36/36 source-executed V8 case matrix PASS (ізольовані DOM/URL/FormData test doubles, не повноцінний браузер); [Actions exact-head #41002762651](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41002762651): **918 Node PASS / 0 FAIL / 1 SKIP**, включно з новими негативними й позитивними сценаріями; TS/lint/build/2 Python-валідатори PASS. **Повний workflow FAIL** через окремий вже відомий Wrangler Worker/D1 restart 503 у `tests/api-flow.test.mjs`: 21/22 двічі; баг [#361](https://github.com/Oleksii-debug/scripture-archive/pull/361) відкритий. Не представляти цей факт як зелений E2E.
- **Межі приймання:** production deployment, license audit інших видань, реальний браузер/клавіатура та фізичний NVDA не виконані цим вузьким виправленням. Переробка цієї підфункції без нового відтворюваного дефекту не потрібна; загальний release gate R0.1–R0.5 і ширший SA-EXT-01 залишаються відкритими.


---

### R0.2 / RESET_MAIL_DELIVERY_CLAIM — scoped terminal, 2026-10-30

**Конкретна підфункція `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`**; залишкова реалізація саме цього дефекту — **0**, необхідних незлитих PR — **0**. **Повний R0.2 (SMTP/DNS і реальне підтвердження адреси) — OPEN; SA-EXT-01…20 усі OPEN.**

- **Дефект:** API `forgot-password` умисно повертає неідентифікаційну `{ok:true}` без підтвердження доставки листа (для відсутнього облікового запису та для існуючого, де mail-provider може не підтвердити доставку); стара форма `/account` усіма трьома мовами неправдиво говорила «лист уже надіслано».
- **Виправлено:** канонічний `public/app.js` тепер розрізняє прийнятий запит і непідтверджену email-доставку; текст для uk/ru/en пояснює перевірку пошти та папки «Спам». Захист від перебирання облікових записів, серверна авторизація і відновлення пароля не змінені. Жодного другого API та неперевіреної email-обіцянки.
- **GitHub:** [PR #484](https://github.com/Oleksii-debug/scripture-archive/pull/484) **SQUASH MERGED**, точний SHA `main@3b95c816cd4660b57a09387ee945cb993929336a`; GitHub commit/readback — рівно `public/app.js` (blob `beb01f296d01d72fad8331b178a3fdebf0c62531`) та `tests/password-reset-delivery-copy.test.mjs` (blob `c9fd74ddd5b8541080e16dc17d7b5c79a4387f52`).
- **Перевірки:** [точний PR-head run #41003011421](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41003011421): **924 native Node PASS, 1 SKIP, 0 FAIL**, шість нових вихідно-залежних перевірок; TypeScript, lint 0 errors, build, Python 2/2 PASS. **Увесь CI RED** тільки через відомий нестабільний disposable Worker/D1 503 restart (21/22 двічі), власник виправлення [#361](https://github.com/Oleksii-debug/scripture-archive/pull/361). Не вважати E2E/production доставку перевіреною.
- **Обмеження:** production SHA, реальна email-доставка/SPF/DKIM/DMARC, фізичний Windows/NVDA, доступ до Sites та реліз лишаються відкритими. Повторне призначення цього конкретного виправлення — лише за регресійним дефектом.


---

### SA-EXT-02/16 / UNOWNED_READING_OWNER_MARKER — scoped final source closure (2026-10-30)

**Status of this exact approved privacy defect: `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.**
`remaining_implementation_for_this_subfeature=0`; `necessary_unmerged_PRs=0`.
**Full parent sections SA-EXT-02 and SA-EXT-16 remain OPEN**, as do all SA-EXT-01…20; neither production deployment nor independent acceptance is implied.

- **User-visible protection:** a browser cache containing unowned reading history with a missing/unreadable owner marker cannot be claimed by a freshly authenticated account. Before resetting active cache, the exact historic bytes are kept in the separate `sa.unownedReadingHistory.v1` quarantine for an *explicit* safe later recovery/import decision; they are **never** auto-merged into another account or silently overwritten. A conflicting pre-existing quarantine, inaccessible storage, failed or silently ignored active-cache wipe prevents owner certification and private progress writes. Unsigned guest reload still preserves the guest's normal local history; logout while quarantine is blocked cannot erase the orphan. Canonical frontend and established account/reading authority are reused, with no parallel server or new rights.
- **Source integration:** [PR #487](https://github.com/Oleksii-debug/scripture-archive/pull/487) **squash-merged** into `main@aef1838284c2ee18092f0bcbe0e94af23cdb6fb0`, exactly two source/test paths: `public/app.js` blob `bf47838b91a57a16145ebdfdc198445023190db2`, `tests/account-session-storage-failure.test.mjs` blob `06bc481c6ca2302cd9f083ee242de156a90f9f54`. These exact blobs and the merge SHA were re-read from GitHub `main`.
- **Proof:** [PR-head GitHub Actions #41004727516](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41004727516) **SUCCESS** on exact PR head `a4abf8db4c934cf76c87a17ebcd1f0d98d2ee56f`: **938 native Node PASS / 1 SKIP / 0 FAIL**, disposable Worker/D1 **22/22 PASS**, TypeScript, lint, source build and canonical Python validators PASS. The exact merged source plus new and existing browser-session test definitions were also executed with isolated V8 mocks: **25/25 PASS**.
- **Release boundary:** no `scripture-archive.com` production SHA, authenticated live journey, email sender/DNS, live Cloudflare D1, real cross-device acceptance, or physical NVDA verification was established by this source repair. No deployment, account-data transfer, automatic orphan import or new languages were performed. Future recovery UX and other planned features must have their own approved acceptance; do **not** re-open this completed owner-marker boundary absent a specific regression.
- **Tracker and ownership:** concrete defect [#482](https://github.com/Oleksii-debug/scripture-archive/issues/482); central technical coordination [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297). Source closure is not a claim of full SA-EXT-02/16 release acceptance.

---

### SA-EXT-02/16 / UNOWNED_MISSION_OWNER_MARKER — scoped source closure (2026-10-30)

**Статус тільки конкретної підфункції:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`, `remaining_implementation=0`, `necessary_unmerged_PRs=0`. Усі повні батьківські розділи **SA-EXT-01…20 OPEN**; source closure не означає готовність сайту, релізу чи підтвердження NVDA.

- **Реальна проблема:** навіть після виправлення історії читання #487 нова авторизована особа могла отримати старий приватний прогрес місії `sa.mission.OTAB01`, коли маркер власника відсутній, а `sa.readingHistory=[]`. Залежність від непорожнього списку прочитаних глав не є доказом володіння прогресом.
- **Канонічне виправлення:** `public/app.js::getSession` перевіряє старий прогрес місії незалежно від читальні; точні байти недовіреного прогресу зберігаються в `sa.unownedMissionProgress.v1` перед очищенням активного стану. Конфлікт уже збереженого архіву, відмова читати/писати або мовчазно проігнороване очищення забороняють присвоєння нового власника та серверне синхронізування. Звичайне анонімне перечитування сторінки не стирає даних гостя; не відбувається автоматичного імпорту анонімного прогресу в чужий акаунт.
- **GitHub:** [PR #489](https://github.com/Oleksii-debug/scripture-archive/pull/489) **SQUASH MERGED**, exact `main@8d7dfcd084f082c13e10b127940d4bd6b12dc4c1`; у перевіреному `main` `public/app.js` blob `f27ed0e39a3b547e0fa2d106396956ce965f7801`, `tests/account-session-storage-failure.test.mjs` blob `6115e1817c448c86a30c0f0b730a1b9398e2f7d3`. У PR змінено рівно два чинних шляхи, жодного другого сервера/окремого UI.
- **Тести:** [exact-head Actions #41005087444](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41005087444), SHA `ae7231f429a831918d78f7149882015ca75463ed`: **942 native Node PASS / 1 SKIP / 0 FAIL** (у т. ч. 4 нові source-dependent негативні та позитивні перевірки), TypeScript, lint, source build, Python validators PASS. **Повний workflow FAIL:** disposable Worker/D1 HTTP 503 `Your worker restarted mid-request`, **21/22 двічі**; окрема незакрита [#361](https://github.com/Oleksii-debug/scripture-archive/pull/361), не E2E PASS.
- **Приймання/реліз окремо:** live `scripture-archive.com` SHA, реальне D1, фізичний NVDA/Windows, законний UX явного відновлення архівованого гостевого прогресу й повне завершення SA-EXT-02/16 **NOT_VERIFIED/OPEN**. Реліз, розсилки, нові мови, synthetic users не запускалися. Додаткове source-переписування цього точного кейсу — лише з новим відтворюваним дефектом. Координаційний receipt: [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297#issuecomment-6515279633).


---

### SA-EXT-01 / PARALLEL_VERSE_RECORD_INTEGRITY — scoped terminal, 2026-10-30

**Остаточний стан саме цієї підфункції:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`; `remaining_scoped_implementation=0`; необхідних незлитих PR для цього дефекту — **0**. **Повний SA-EXT-01 та всі 20 розділів SA-EXT-01…20 — OPEN.**

- **Конкретний дефект:** наявний канонічний паралельний читач перевіряв тільки `Array.isArray(verses)`: порожній список помилково оголошувався готовою главою, `[null]` і `[{}]` відображалися як «null» та «[object Object]», розріджені масиви мовчки пропускали позиції. Це спотворює зміст першоджерела навіть за правильних ліцензійних метаданих.
- **Завершений функціонал:** `public/parallel-reader.js` відхиляє порожні, нестрокові, порожньо-текстові та sparse списки віршів до HTML-відображення; зберігає два послідовні захисні chapter-check, перевірку прав/походження, попередню главу та можливість повторної спроби. Уже працює через той самий канонічний UI.
- **Реально інтегровано:** [PR #494](https://github.com/Oleksii-debug/scripture-archive/pull/494) **squash MERGED** у `main@b8a6792eb96e4dc741e13a5b85dbc297d0ac2d9d`. Незалежно підтверджено `PR.merged=true`, `compare(main SHA, main)=identical` і два exact GitHub blobs: `public/parallel-reader.js@a82b20c5e0c73883d86ffd2c58e499d9e6bba728`; `tests/parallel-reader.test.mjs@b425aacb861fe658896aae23a050c4617ace91c4`.
- **Виконані перевірки:** ізольоване source-executed V8 — **10/10** сценаріїв порожніх/некоректних/валідних глав; весь exact test module у V8 із Node assert shim — **13/13**. Реальна [GitHub Actions #41006778749](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41006778749) на PR head: **956 native Node PASS / 1 SKIP / 0 FAIL** (зокрема новий тест), TypeScript, lint, source-build, Python validators **PASS**. **Whole CI FAIL:** одноразовий повний повтор на новій disposable D1 не усунув відомий Wrangler restart `503 !== 200`; Worker/D1 **21/22** двічі. Це окремий наявний дефект інтеграційної інфраструктури [PR #361](https://github.com/Oleksii-debug/scripture-archive/pull/361), не доказ успішного E2E.
- **Не засвідчено:** production deployed SHA, авторизований реальний браузер, повне Windows/NVDA приймання, нові мовні видання/права; жодного деплою, міграції користувацьких даних або публікації не виконано. Не перевідкривати вже готову вузьку підфункцію без нового відтворюваного дефекту. Продовжувати інші відкриті вимоги повного SA-EXT-01 за #295/#297.


---

### SA-EXT-07 / ACADEMY_SAVE_READBACK_TRUTH — scoped terminal, 2026-10-30

**Вузька підфункція остаточно `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`; `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. Повний батьківський SA-EXT-07, як і всі 20 SA-EXT-01…20, **OPEN**.

- **Відтворений дефект:** канонічна Академія раніше відмічала урок як виконаний після `storage.setItem()` без підтвердження. У режимі мовчазного ігнорування, переписування значення або помилки повторного читання UI неправдиво змінював `aria-pressed`, лічильник та бейдж; незбережений прогрес видавався за збережений.
- **Справжня реалізація:** наявний `public/scripture-academy.js` після запису виконує точне читання того самого ключа поточного підтвердженого користувача; тільки перевірені байти змінюють UI й позначку. У решті випадків працює існуюче локалізоване повідомлення про помилку без фальшивого успіху. Реальна канонічна читальня й сім раніше опублікованих занять не замінені демонстрацією.
- **GitHub інтеграція:** [source PR #496](https://github.com/Oleksii-debug/scripture-archive/pull/496) squash **MERGED** у `main@1fa2148be6162c0a6b29df227c7af60b465a534b`. Postmerge SHA/PR readback і перевірка `compare=identical` виконані. Exact main blobs: `public/scripture-academy.js@c7a81b4653110e2b5f07b6e27db6562fe6d8c40f`, `tests/scripture-academy-course.test.mjs@3bb3453deac886d88b9bd87dcdfd160444591a56`.
- **Докази:** source-exact V8 old/new RED/GREEN: старий код **3/3 негативні кейси FAIL** (помилковий успіх), виправлений **4/4 PASS** (три негативні й позитивний). [Exact-head CI run #41007403331](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41007403331): **959 нативних Node PASS / 1 SKIP / 0 FAIL**, включно із трьома новими перевірками; TypeScript, lint, build, Python validators **PASS**. **Весь CI FAIL**: disposable Worker/D1 відтворив відомий Wrangler HTTP503 на редагуванні ролей, 21/22 двічі; чинний власник інтеграційної інфраструктури — draft [PR #361](https://github.com/Oleksii-debug/scripture-archive/pull/361). Це не повний E2E PASS.
- **Незавершені окремі межі:** повний SA-EXT-07 (курси, медіа/транскрипти, редакторська перевірка й інші затверджені можливості), жива публікація й точний deployed SHA, фізичний Windows/NVDA, зовнішні редакторські/контентні ліцензії. Жодного деплою, нової мови чи міграції користувацьких даних не виконано. Повторна доробка саме цієї вузької функції допускається лише за конкретним новим дефектом.


---

### SA-EXT-05/06 / DOSSIER_AUTHORED_METADATA_FAILCLOSED — scoped terminal, 2026-10-30

**Остаточно закрита лише підфункція перевірки метаданих у чинному графі досьє:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`, `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. **Повні розділи SA-EXT-05, SA-EXT-06 та всі 20 SA-EXT-01…20 залишаються OPEN.**

- **Відтворювана прогалина в оригінальному коді:** `validateDossierGraph` дозволяв порожні назви/описи та некоректні чи порожні навчальні питання; за `null` у списках біблійних джерел/зв'язків міг аварійно завершуватися замість показу вбудованого повідомлення. Ідентифікатор досьє входить у внутрішнє `href`, тому до використання обов'язково має відповідати дозволеному формату.
- **Реальна реалізація в канонічній платформі:** існуючий `public/scripture-dossiers.js` тепер спочатку перевіряє формат ID, повноту тексту `uk/ru/en`, принаймні одне непорожнє навчальне питання кожною мовою й цілісність масивів джерел та зв'язків; пошкоджені записи відхиляються до HTML-render, в обох уже підключених маршрутах досьє й текстового атласу. Незмінними залишилися граф, першоджерела, дозволені посилання, перевірка каталогу й localized `role="alert"`. Другого сховища, маршрутизатора чи сервера немає.
- **GitHub і точний source SHA:** [PR #498](https://github.com/Oleksii-debug/scripture-archive/pull/498) squash **MERGED**, інтеграційний `main@9227497ced6255cff9d0fb3013d2f2632e9e5190`, прочитаний після злиття. Змінені тільки `public/scripture-dossiers.js` (blob `26d920c31389b2c23dc698a3d77b1bd862302052`) та новий `tests/dossier-authored-metadata-failclosed.test.mjs` (blob `00c027dd35ba77e5e172bc96cc3b8ab613e17e29`).
- **Виконана перевірка:** [GitHub Actions exact PR-head #41007860715](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41007860715): **960 native Node PASS / 1 SKIP / 0 FAIL** із новим тестом 13 окремих видів пошкодження, додатковим `null` записом і перевіркою обох UI-маршрутів у трьох мовах; TypeScript, lint, build, Python validators PASS. **Повний CI RED:** disposable Worker/D1 — **21/22 двічі**, уже відомий restart HTTP 503 у незалежному `tests/api-flow.test.mjs`; окремий залишковий integration-gate [#361](https://github.com/Oleksii-debug/scripture-archive/pull/361), без послаблення security asserts або повторів окремих мутацій.
- **Межі:** не підтверджено фактичного production SHA, майбутніх досьє, фізичного Chrome/Windows/NVDA, археологічних прав, deploy або повного SA-EXT-05/06 acceptance. Цей scoped дефект **не призначати на повторну розробку** без нового конкретного відтворення. Незавершені інші підпункти виконувати за затвердженим планом і координацією [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297).
