## 2026-10-31 — SA-EXT-01 / EDITION_RIGHTS_INVISIBLE_FILLERS — SCOPED TERMINAL

**ЗАКРИТО ДЛЯ РОЗРОБКИ ЛИШЕ КОНКРЕТНИЙ ДЕФЕКТ:** форматні й візуально порожні Unicode U+00AD/U+034F/U+115F/U+1160/U+180E/U+2800/U+3164/U+FFA0 більше не проходять у назви видань, ліцензії та атрибуцію справжньої читальні. [PR #952](https://github.com/Oleksii-debug/scripture-archive/pull/952) **SQUASH MERGED** у `main@1b8524f44c876e3ca1471b5785426d3a523b26ba`; source `93d100e8eb2182728fbdedfd2257e2ec14cddcac`, test `923fc033ee368bf38ee11459ca816faf38c7ce44`. [Exact-head GitHub Actions #41200462083](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41200462083): **SUCCESS**, Node 3292 PASS/0 FAIL, disposable Worker/D1 24 PASS, Python 2 PASS, TS/lint/build PASS. [Повний scoped-акт](SA_EXT_01_INVISIBLE_RIGHTS_FILLERS_SCOPED_TERMINAL_20261031.md), `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_feature_PRs=0`. **Батьківський SA-EXT-01 залишається OPEN**, реальний сайт/NVDA/Windows/видавничі права не перевірено; реліз не оновлювався.

---

## 2026-10-31 — SA-EXT-01 / EDITION_RIGHTS_TEXT_UNICODE — SCOPED TERMINAL

**ОСТАТОЧНО ЗАКРИТО ДЛЯ РОЗРОБКИ ЛИШЕ КОНКРЕТНИЙ ДЕФЕКТ** контролю невидимого/bidi Unicode в авторитетних назвах/умовах прав на видання. [PR #947](https://github.com/Oleksii-debug/scripture-archive/pull/947) SQUASH MERGED у `main@d7fb423ab545ed2fc4b770e03e3e34ab9c22157f`; 15/15 старих неправильних випадків RED, 15/15 corrected V8 валідатор GREEN, 6/6 UI-flow GREEN; [native CI #41194310571](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41194310571) COMPLETED SUCCESS (Node 3207 PASS/0 FAIL/1 SKIP, Worker/D1 22 PASS, TypeScript/lint/build/Python PASS). [Квитанція](SA_EXT_01_EDITION_RIGHTS_TEXT_UNICODE_SCOPED_TERMINAL_20261031.md), `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_feature_PRs=0` лише тут. **Батьківський SA-EXT-01 OPEN, інші незавершені батьківські відкриті; 03/04 parent TERMINAL.** Користувацький сайт, продакшн-права й NVDA/Windows НЕ ПЕРЕВІРЕНІ, релізу немає.

---

## 2026-10-31 — SA-EXT-05 / DOSSIER_VISIBLE_SOURCE_UNICODE — CLOSED_FOR_DEVELOPMENT_SCOPED

**Закрито виключно вузьку помилку** приймання невидимих, bidi та невалідних UTF-16 символів у локалізованих назвах Bible/dossier джерел до HTML/ARIA/читальні. Канонічна `validateDossierGraph` збережена. [PR #943](https://github.com/Oleksii-debug/scripture-archive/pull/943) SQUASH MERGED у `main@52b8d69d8cea0b689ea2808bcb2cddc211cf7e9a`; 30 source-red випадків → 60/60 patched V8 негативних PASS; [native CI #41193714352](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41193714352) COMPLETED SUCCESS: Node 3183 PASS/0 FAIL/1 SKIP, Worker/D1 22 PASS, TypeScript/lint/build/Python PASS. [Повний доказовий акт](SA_EXT_05_DOSSIER_VISIBLE_SOURCE_UNICODE_SCOPED_TERMINAL_20261031.md), `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_feature_PRs=0` **тільки для цього вузького дефекту**. **Батьківський SA-EXT-05 OPEN; SA-EXT-03/04 залишаються parent TERMINAL; решта розділів OPEN.** Немає нового релізу, перевіреного Sites SHA, Windows/NVDA або production-даних.

---

## 2026-10-31 — SA-EXT-05 / FILTERED_DOSSIER_COMPARISON_GET_CONTINUITY — ЗАКРИТО ЛИШЕ ПІДФУНКЦІЮ

`CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` для втрати GET-пошуку `q` під час порівняння двох наявних джерельно верифікованих досьє у штатному `/dossiers`. [PR #933](https://github.com/Oleksii-debug/scripture-archive/pull/933) **SQUASH MERGED** у `main@88d630663097e939673103cc3ada4c498503d22f`. [Exact-head Actions #41190160528](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41190160528) **SUCCESS**: Node 3073 PASS/0 FAIL/1 SKIP; Worker/D1 22 PASS; Python 2 PASS; TS/lint/build PASS. [Термінальний акт і точні blobs](SA_EXT_05_FILTERED_DOSSIER_COMPARISON_SCOPED_TERMINAL_20261031.md). `remaining_scoped_implementation=0`; `necessary_unmerged_scoped_feature_PRs=0`. **Повний SA-EXT-05 і решта незакритих батьківських розділів залишаються OPEN; SA-EXT-03/04 parent TERMINAL.** Production Sites, Windows/NVDA та реліз не перевірено; деплою немає.

---

## 2026-10-31 — SA-EXT-16 / ANALYTICS_CONSENT_OWN_LOCALE — ВУЗЬКИЙ ТЕРМІНАЛЬНИЙ ДЕФЕКТ

Канонічний consent dialog (`public/analytics.js`) не приймає успадковані JavaScript-ключі за мови; коректні українські/російські/англійські написи та явний вибір аналітики збережено. [PR #901](https://github.com/Oleksii-debug/scripture-archive/pull/901) MERGED `main@a55849fcaac59623b33df9f1f247d6a0bb948cd5`, [CI #41179127156](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41179127156) SUCCESS (2894 Node PASS / 0 FAIL / 1 SKIP, 22 D1 PASS, 2 Python PASS). [Scoped receipt](SA_EXT_16_ANALYTICS_CONSENT_OWN_LOCALE_SCOPED_TERMINAL_20261031.md); `remaining_scoped_implementation=0` лише тут, **батьківський SA-EXT-16 OPEN**. Production/NVDA/Windows не перевірено, реліз не публікувався.

---

## 2026-10-31 — SA-EXT-01/16 / HOME_SUPPORT_OWN_LOCALE — ВУЗЬКИЙ ТЕРМІНАЛЬНИЙ ДЕФЕКТ

Головна і блок пожертв у чинних `public/home.js`, `public/support.js` тепер перевіряють власні строкові ключі мови та не використовують `Object.prototype` як переклад. [PR #899](https://github.com/Oleksii-debug/scripture-archive/pull/899) SQUASH MERGED `main@54759a89d79f5b8f2f216c50309810a7643e39fe`, [CI #41178889927](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41178889927) SUCCESS (2879 Node PASS, 22 D1 PASS, 2 Python PASS, TS/build). [Термінальна квитанція](SA_EXT_01_16_HOME_SUPPORT_OWN_LOCALE_SCOPED_TERMINAL_20261031.md). `remaining_scoped_implementation=0` лише для дефекту; **SA-EXT-01/16 OPEN**. Production/NVDA/Windows і реліз не перевірено.

---

## 2026-10-31 — SA-EXT-04 / MEETING_OWN_LOCALE_COPY — ЗАКРИТО ЛИШЕ ВУЗЬКИЙ ДЕФЕКТ

Реальні модулі `public/group-meeting-history.js` і `public/group-meeting-notes.js` захищені від успадкованих мовних ключів Object.prototype та нестрокових значень; канонічний fallback `uk` і `ru/en` збережено. [PR #894](https://github.com/Oleksii-debug/scripture-archive/pull/894) **SQUASH MERGED** `main@6824ce20d476db1226dd44e8d2bac2ecfe9ee21d`, [Actions #41178417038](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41178417038) SUCCESS (2847 Node PASS, 0 FAIL, 1 SKIP; D1 22/22; Python 2/2; build). [Точний terminal receipt](SA_EXT_04_MEETING_LOCALE_OWN_KEY_SCOPED_TERMINAL_20261031.md), `remaining_scoped_implementation=0` **лише для дефекту**. Батьківський SA-EXT-04 зберігає вже прийнятий TERMINAL; жодної переатестації всього продукту чи релізу немає.

---

## 2026-10-31 — SA-EXT-01/02 / WORKSPACE_OWN_LOCALE_COPY — ЗАКРИТО ЛИШЕ ПІДПУНКТ

**`CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`, НЕ цілі SA-EXT-01/02.** Канонічний `public/workspace.js` використовує один helper із перевіркою власних мовних ключів для головних розділів, керування групою, історії місій/повторення та прав на видання. Некоректні `__proto__`/`constructor`/інші успадковані значення не видають `undefined`, підтримувані `uk/ru/en` незмінні. [PR #891](https://github.com/Oleksii-debug/scripture-archive/pull/891) **SQUASH MERGED** `main@0309db1bbcb6226d359cfb6f85e0467c01c4e142`; [CI #41178305059](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41178305059) SUCCESS: Node 2831 PASS/0 FAIL/1 SKIP, Worker/D1 22 PASS, TypeScript/lint/build/Python. [Остаточна квитанція](SA_EXT_01_02_WORKSPACE_OWN_LOCALE_COPY_SCOPED_TERMINAL_20261031.md), `remaining_scoped_implementation=0`, `necessary_unmerged_feature_PRs=0`. **SA-EXT-01/02 OPEN** (ліцензії й повний корпус місій), 03/04 TERMINAL; live реліз/NVDA NOT_VERIFIED.

---

## 2026-10-31 — SA-EXT-01 / PARALLEL_READER_LOCALE_OWN_KEY — ЗАКРИТО ЛИШЕ ПІДПУНКТ

**`CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`, не батьківський SA-EXT-01.** На реальному паралельному читачі UI/статус підтримують лише власні `uk/ru/en` ключі; успадковані чи нетипізовані імена локалей безпечно повертають українські написи. [PR #890](https://github.com/Oleksii-debug/scripture-archive/pull/890) злитий у `main@f1da62ad911d00fd72f93b8e27060888e4c22044`, exact-head [Actions #41178190377](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41178190377) SUCCESS (Node 2832 PASS/0 FAIL/1 SKIP; Worker/D1 22 PASS; Python 2 PASS; build). [Термінальна scoped-квитанція](SA_EXT_01_PARALLEL_READER_LOCALE_OWN_KEY_SCOPED_TERMINAL_20261031.md), `remaining_scoped_implementation=0` тільки для цього дефекту. **SA-EXT-01 залишається OPEN**, release/Sites/NVDA NOT_VERIFIED.

---

## 2026-10-31 — SA-EXT-01 / EDITION_LANGUAGE_PROTOTYPE_ALIAS — ЗАКРИТО ЛИШЕ ПІДПУНКТ

**Підфункція `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`, НЕ батьківський SA-EXT-01.** Канонічний `public/editions.js` відхиляє назви локалі, що збігаються із `Object.prototype` (`__proto__`, `constructor`, `toString`, `hasOwnProperty`), без падіння `find` або підміни збереженого перекладу; правильний `uk/ru/en` збережено. [PR #887](https://github.com/Oleksii-debug/scripture-archive/pull/887) **SQUASH MERGED** `main@f8d20af9433de5a8e90ec47208ffe14f0e0d88c9`, [CI #41177845597](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41177845597) SUCCESS, 2781 Node PASS/0 FAIL/1 SKIP, Worker/D1 22 PASS, TS/lint/build/Python. [Квитанція](SA_EXT_01_EDITION_LANGUAGE_PROTOTYPE_ALIAS_SCOPED_TERMINAL_20261031.md): `remaining_scoped_implementation=0`, `necessary_unmerged_feature_PRs=0`. **SA-EXT-01 OPEN** через ліцензоване покриття та provenance; SA-EXT-03/04 TERMINAL, решта OPEN. Live Sites/Windows/NVDA NOT_VERIFIED, релізу не було.

---

## 2026-10-31 — SA-EXT-16 / TRUSTED_RATE_LIMIT_IP + LOGIN_PASSWORD_BOUND — ДВА SCOPED TERMINAL

**ЛИШЕ ДВІ ВУЗЬКІ ФУНКЦІЇ ОСТАТОЧНО ЗАКРИТО ДЛЯ РОЗРОБКИ / `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.** Canonical `lib/auth.ts::requestAddress` не довіряє `X-Forwarded-For` для rate bucket, використовує перевірену адресу Cloudflare або загальний `unknown`: [#885](https://github.com/Oleksii-debug/scripture-archive/pull/885), main `313a15bf092dbb913e25af8deba821e1dfdadeb0`, [Actions #41177621085](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41177621085) SUCCESS, 46 нових тестових сценаріїв. Canonical `POST /api/auth?action=login` до PBKDF2 відхиляє пароль понад 128 символів: [#886](https://github.com/Oleksii-debug/scripture-archive/pull/886), main `a68a5f8b03ed51e993bec58cdeee6e7e90042acf`, [Actions #41177763897](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41177763897) SUCCESS, 35 сценаріїв. **Обидва PR злиті, реалізація в чинному main прочитана повторно; `remaining_scoped_implementation=0`, `necessary_unmerged_feature_PRs=0` для цих двох підпунктів.** [Остаточний доказовий реєстр](SA_EXT_16_AUTH_ABUSE_BOUNDS_SCOPED_TERMINAL_20261031.md). **Батьківський SA-EXT-16 і всі інші не закриті секції залишаються OPEN; SA-EXT-03/04 — TERMINAL.** Публічний Sites/Windows/NVDA/Chrome/SMTP/реліз НЕ ПЕРЕВІРЯЛИСЯ; деплою немає.

---

## 2026-10-31 — SA-EXT-01/16 / REGISTRATION_LOCALE_EXACT_TYPED — ЗАКРИТО ЛИШЕ ПІДПУНКТ

**Статус підфункції:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`. Єдиний `POST /api/auth?action=register` не приймає нестрокові locale й не стирає суфікс `en-US`/`ru-RU` так, щоб змінити вибір на іншу підтримувану мову; відсутній/null/unknown-text fallback UK та коректні `uk/ru/en` збережено. [Функціональний PR #879](https://github.com/Oleksii-debug/scripture-archive/pull/879) SQUASH MERGED `main@fc4fd29774de1aa084d23e31c564dbf34e21996a`; [GitHub Actions #41176279283](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41176279283) COMPLETED SUCCESS (Node/TS/lint/build/disposable D1/Python); 16 додаткових production-route тестів. [Постійна квитанція](SA_EXT_01_REGISTRATION_LOCALE_EXACT_TYPED_SCOPED_TERMINAL_20261031.md). `remaining_scoped_implementation=0`, `necessary_unmerged_feature_PRs=0` лише для цього коду. **Батьківські SA-EXT-01 та 16 OPEN**, SA-EXT-03 та 04 вже повністю TERMINAL. Інші 16 батьківських OPEN, live Sites SHA, фізичний NVDA/Windows, права й реліз NOT_VERIFIED.

---

## 2026-10-31 — SA-EXT-02 / PRIVATE_READING_BOOK_CODE_EXACT_IDENTITY — SCOPED TERMINAL

**ЗАКРИТО ДЛЯ РОЗРОБКИ лише один реальний дефект, НЕ батьківський SA-EXT-02.** Канонічний `PUT /api/account?action=reading` тепер не перетворює невалідний код книги з пробілами на чинний ідентифікатор збереженого читання. [PR #870](https://github.com/Oleksii-debug/scripture-archive/pull/870) **SQUASH MERGED** у `main@75e453a13beb27a2b89c3725b24feff46db52bc8`. [Exact-head Actions #41174459535](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41174459535) **SUCCESS** (2677 Node PASS, 0 FAIL, 1 SKIP; 22/22 Worker/D1; 2 Python PASS; TypeScript/lint/build PASS). [Остаточна вузька квитанція](SA_EXT_02_READING_BOOK_EXACT_IDENTITY_SCOPED_TERMINAL_20261031.md). `remaining_scoped_implementation=0` і `necessary_unmerged_feature_PRs=0` тільки тут. Повний SA-EXT-02 та решта 17 незакритих батьківських розділів залишаються OPEN; Sites SHA/Chrome/Windows/NVDA NOT_VERIFIED.

---

## 2026-10-31 — SA-EXT-01/02 / READER CATALOG + GROUP ID — TWO SCOPED TERMINAL FIXES

**Тільки два чітко обмежені підтверджені дефекти закрито для розробки — `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`, НЕ батьківські SA-EXT-01/02.** Перший: unsafe canonical Bible book codes і невалідні кількості глав відхиляються до HTML/fetch ([#866](https://github.com/Oleksii-debug/scripture-archive/pull/866), main `91e59f5a6fe9810e2a9637eadff4238621f058e5`, exact-head CI #41172736372 SUCCESS). Другий: `app/api/attempts` відмовляє group ID з початковими/кінцевими пробілами, не прив'язує до чужого справжнього ID ([#867](https://github.com/Oleksii-debug/scripture-archive/pull/867), main `39108a68fa37bbf6020a33d0dc43ec8511cf0ea0`, exact-head CI #41172834341 SUCCESS). Обидва production/test blobs підтверджені повторним читанням фінального main. [Точна квитанція та обмеження](SA_EXT_01_02_READER_AND_ATTEMPT_EXACT_SCOPED_TERMINAL_20261031.md), `remaining_scoped_implementation=0` / `necessary_unmerged_PRs=0` **тільки для цих дефектів**. **SA-EXT-01/02 OPEN; SA-EXT-03/04 parent TERMINAL; інші 16 parent OPEN**. Нового релізу, фізичної NVDA, verified Sites SHA — немає.

---

## 2026-10-31 — SA-EXT-01 / PRIMARY_READER_BOUNDED_CHAPTERS — SCOPED TERMINAL

**ЗАКРИТО ДЛЯ ПОДАЛЬШОЇ РОЗРОБКИ саме захист основної біблійної читальні, не батьківський розділ.** Канонічний `public/app.js::getBook()` відхиляє HTTP-200 глави понад 256 віршів чи 131072 UTF-16 символів, понад 200 глав у книзі і пошкоджені/sparse масиви до кешу/рендерингу; відмова не отруює retry. [PR #864](https://github.com/Oleksii-debug/scripture-archive/pull/864) **SQUASH MERGED** `main@eb60a7d9a8f90f8287f039887606748c20838de3`. [Exact-head CI #41171867181](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41171867181) **SUCCESS** (2668 Node PASS, 22/22 Worker/D1, TypeScript/lint/build/Python PASS). [Постійна квитанція](SA_EXT_01_PRIMARY_READER_CHAPTER_BOUNDS_SCOPED_TERMINAL_20261031.md), `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0` лише тут. **SA-EXT-01 parent OPEN**, реальний Sites/Windows/NVDA/правовласники NOT_VERIFIED; без деплою.

---

## 2026-10-31 — SA-EXT-16 / SAME_SITE_CSRF_ORIGIN_GUARD — SCOPED TERMINAL

**ЗАКРИТО ДЛЯ РОЗРОБКИ лише вузький захист**, не батьківський SA-EXT-16. Канонічний `lib/auth.ts::sameOrigin` більше не приймає `Sec-Fetch-Site: same-site` як `same-origin`; фактичний `POST /api/auth` відхиляє піддоменний запит до D1. [PR #861](https://github.com/Oleksii-debug/scripture-archive/pull/861) **SQUASH MERGED** `main@c5069df34fc0d54774a9920b7b650fa3fc53c338`, [exact-head CI #41170898839](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41170898839) **SUCCESS** (2599 Node PASS, 22/22 Worker/D1, TS/lint/build/Python PASS); [повний terminal receipt](SA_EXT_16_SAME_SITE_CSRF_GUARD_SCOPED_TERMINAL_20261031.md). `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. **SA-EXT-16 parent OPEN**, Sites release і фізичний NVDA не підтверджено.

---

## 2026-10-31 — SA-EXT-16 / ACCOUNT_AUTH_AND_VISIBILITY — ТРИ SCOPED TERMINAL

**ЗАКРИТО ДЛЯ ПОДАЛЬШОЇ РОЗРОБКИ РІВНО ТРИ ПІДФУНКЦІЇ, НЕ УВЕСЬ РОЗДІЛ:** зміна пароля (PR [#846](https://github.com/Oleksii-debug/scripture-archive/pull/846), `main@fdb061ab76b577f20874b13c556ff888b7d652c2`), delete-account preflight (PR [#848](https://github.com/Oleksii-debug/scripture-archive/pull/848), `main@ba7e84cb96d232cde98c25e45026b4c139f44d68`) та цілісність чотирьох boolean visibility flags (PR [#849](https://github.com/Oleksii-debug/scripture-archive/pull/849), `main@f4bd52c74a38fc88e14005cf645fb8f42f34a935`). Усі source-flow, fail-closed та права доступу залишаються на канонічних `app/api/auth/route.ts` / `app/api/account/route.ts` із реальним UI; ізольованих endpoint не створено. CI #41168891011, #41169117627, #41169541268 — SUCCESS, останній **2478 Node PASS / 0 FAIL / 1 SKIP, 22/22 disposable Worker/D1, 2 Python PASS**. [Формальний scoped-terminal реєстр і відтворювані перевірки](SA_EXT_16_AUTH_AND_VISIBILITY_SCOPED_TERMINAL_20261031.md). `remaining_scoped_implementation=0`; `necessary_unmerged_PRs=0`; `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`. **Батьківський SA-EXT-16 OPEN** (production release/privacy migration/NVDA/backup), як і решта 17 незакритих parent-секцій. Жодного deployment, випуску чи 82 мов не підтверджено.

## 2026-10-31 — SA-EXT-01 / PARALLEL_RIGHTS_METADATA_BOUNDS — SCOPED TERMINAL

**ЗАКРИТО ЛИШЕ ЦЕЙ ПІДПУНКТ:** канонічна порівняльна читальня відхиляє надмірно довгі назви, ліцензії, атрибуцію, source/license HTTPS URL та некоректний тип атрибуції перед створенням HTML або цитування. [Source PR #845](https://github.com/Oleksii-debug/scripture-archive/pull/845) **MERGED** у main@f719f999c1cc8ab9051066eb5bf658808f8c6742, [exact-head CI #41168876527](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41168876527) **SUCCESS** (native Node, TS, lint, build, disposable Worker/D1, Python); V8 before 2/9, after 9/9. [Постійна квитанція](SA_EXT_01_PARALLEL_RIGHTS_METADATA_BOUNDS_SCOPED_TERMINAL_20261031.md). remaining_scoped_implementation=0; necessary_unmerged_PRs=0. **Батьківський SA-EXT-01 OPEN** через незакрите ліцензоване покриття та provenance. Live Sites/Windows/Chrome/NVDA NOT_VERIFIED, без деплою.

---

## 2026-10-31 — SA-EXT-01 / PRIMARY_TRANSLATION_IDENTITY — SCOPED TERMINAL

**ЗАКРИТО ДЛЯ РОЗРОБКИ ТІЛЬКИ ЦЕЙ ДЕФЕКТ:** основний біблійний читач не використовує метадані/ліцензію регіонального видання, якщо трансляцію явно задано з неправильним або відсутнім власним ID. Єдиний канонічний public/app.js::localEditionMetadata, збережено коректний fallback лише за відсутнього ключа. [PR #842](https://github.com/Oleksii-debug/scripture-archive/pull/842) **MERGED** main@12abfeae78f132b5fe07a29abde15f5185d56233, [exact-head CI #41168210300](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41168210300) **SUCCESS**. [Завершальна квитанція](SA_EXT_01_PRIMARY_TRANSLATION_IDENTITY_SCOPED_TERMINAL_20261031.md), remaining_scoped_implementation=0, necessary_unmerged_PRs=0 тільки тут. **Батьківський SA-EXT-01 OPEN**, live Sites/NVDA/Windows/release не перевірені.

---

## 2026-10-31 — SA-EXT-01 / RAW_SOURCE_LICENSE_UNICODE_CONTROLS — SCOPED TERMINAL

**ЗАКРИТО ДЛЯ РОЗРОБКИ ТІЛЬКИ ЦЕЙ ДЕФЕКТ:** джерела/ліцензії видань із сирими Unicode керівними, невидимими, напрямними символами чи пошкодженими surrogate не приймаються до перетворення URL. Використано спільну перевірку для основного/паралельного читання та відомостей про видання; збережено коректні HTTPS. [PR #839](https://github.com/Oleksii-debug/scripture-archive/pull/839) **MERGED** main@d43111e214afdad45e6d35fadf9ebca9a88433eb, [exact-head CI #41167858860](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41167858860) **SUCCESS**. [Завершальна квитанція](SA_EXT_01_RAW_SOURCE_LICENSE_UNICODE_SCOPED_TERMINAL_20261031.md), remaining_scoped_implementation=0, necessary_unmerged_PRs=0 тільки тут. **Батьківський SA-EXT-01 OPEN**, live Sites/NVDA/Windows/release не перевірені.

---

## 2026-10-31 — SA-EXT-16 / COMMUNITY_WAVE_MEMBER_INSERT_INTEGRITY — SCOPED TERMINAL

**ЛИШЕ ЦЕЙ ПІДПУНКТ — `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`**: канонічна хвиля не зараховує невставленого учасника (SQL `INSERT OR IGNORE` / залежний `UPDATE changes()=1`), контролює обидва підтвердження D1 та всі CAS/lease/paused межі. [PR #838](https://github.com/Oleksii-debug/scripture-archive/pull/838) **SQUASH MERGED** в `main@ed3b9daca87bb7a75e8f79fbabb3a646e61cc99a`; [exact-head CI #41167678710](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41167678710) **SUCCESS** (Node 2412 PASS, 22/22 Worker/D1, 2/2 Python, TS/lint/build). [Формальна квитанція](SA_EXT_16_COMMUNITY_WAVE_MEMBER_INSERT_SCOPED_TERMINAL_20261031.md); `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0` лише для цього дефекту. **Батьківський SA-EXT-16 OPEN; live Sites/NVDA/release NOT_VERIFIED, деплою не було.**

---

## 2026-10-31 — SA-EXT-16 / COMMUNITY_OWNER_D1_ACK — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**ЗАКРИТО ДЛЯ РОЗРОБКИ ТІЛЬКИ ДВА ПІДПУНКТИ** підтверджень власницьких START/PAUSE/RESUME/STOP і owner snapshot. Канонічні PR [#835](https://github.com/Oleksii-debug/scripture-archive/pull/835) та [#836](https://github.com/Oleksii-debug/scripture-archive/pull/836) **MERGED** до `main@0a84164bbad224a9cf85ff0726865371fa5ac660`; exact-head Actions [#41167149955](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41167149955), [#41167332377](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41167332377) обидва **SUCCESS**. Повний [доказ](SA_EXT_16_COMMUNITY_OWNER_D1_ACK_SCOPED_TERMINAL_20261031.md), `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0` лише тут. **Батьківський SA-EXT-16 та інші незакриті SA-EXT залишаються OPEN**, повний реліз/Sites/NVDA NOT_VERIFIED; без публікації.

---

## 2026-10-31 — SA-EXT-07 / ACADEMY_PRIVATE_BFCACHE_FENCE — SCOPED TERMINAL

**ЗАКРИТО ДЛЯ РОЗРОБКИ ЛИШЕ ЦЕЙ ПІДПУНКТ / `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.** Канонічний курс `/campaigns` очищує приватні локальні позначки до BFCache, затримує відновлення до нової серверної сесії та скасовує запізнілі render/reads без другого API. [PR #833](https://github.com/Oleksii-debug/scripture-archive/pull/833) **SQUASH MERGED** в `main@c3e02c5842f5ceafe8c4784daa1a0ef51ee2445f`; [exact-head Actions #41166069032](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41166069032) **SUCCESS**: Node, TS, lint, build, Worker/D1, Python. [Точний запис](SA_EXT_07_ACADEMY_BFCACHE_SCOPED_TERMINAL_20261031.md). `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0` **лише для BFCache-дефекту**. Батьківські SA-EXT-07 і SA-EXT-16 **OPEN**; live Sites/Chrome/NVDA NOT_VERIFIED, публікації не було.

---

## 2026-10-31 — SA-EXT-05 / EXACT_BIBLE_BOOK_SOURCE_SEARCH — SCOPED TERMINAL

**Закрито лише цю source-backed підфункцію** (`CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`): канонічна сторінка досьє знаходить усі реально процитовані теми за **точним кодом книги** або **точною назвою чинного видання** `uk/ru/en`, включно зі зв'язками `related[].via`. Без другого каталогу, вигаданих цитат, префіксних помилок і деплою. [PR #829](https://github.com/Oleksii-debug/scripture-archive/pull/829) **SQUASH MERGED** у `main@3892251d94421d69cba1c7283aee198cbee0c9b2`; [exact-head Actions #41165428310](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41165428310) **SUCCESS** (native Node, TS, lint, build, disposable Worker/D1, Python). [Квитанція](SA_EXT_05_BOOK_SOURCE_EXACT_SEARCH_SCOPED_TERMINAL_20261031.md). `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0` **тільки тут**. **SA-EXT-05 parent залишається OPEN**, так само SA-EXT-06 і решта ще не закритих батьківських розділів. SA-EXT-03/04 залишаються TERMINAL. Live Sites SHA, всі зовнішні права, повна наукова бібліотека, браузер/NVDA — NOT_VERIFIED.

---

## 2026-10-31 — SA-EXT-06 / ALL_EXISTING_UNORDERED_DOSSIER_TOPICS — SCOPED TERMINAL

**ЗАКРИТО ДЛЯ РОЗРОБКИ лише цей функціональний підпункт** — `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`. Канонічний текстовий атлас показує **17/17 уже прийнятих досьє**: сім редакційних оповідей, шість місць, чотири інші source-linked теми (Рут, Павло, Марія, Петро) в окремому недатованому списку з усіма біблійними посиланнями й позначками `narrative/interpretive` українською, російською та англійською. **[PR #827](https://github.com/Oleksii-debug/scripture-archive/pull/827) SQUASH MERGED** `main@f7ff8049a9d6992da4d4290da54c3ef01c33d0e8`; [точний PR-head CI #41165013842](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41165013842) **SUCCESS**, окремо пройдені Node/TS/lint/build/Worker-D1/Python. [Квитанція](SA_EXT_06_ATLAS_ALL_EXISTING_UNORDERED_TOPICS_SCOPED_TERMINAL_20261031.md). Для підпункту `remaining_scoped_implementation=0` та `necessary_unmerged_PRs=0`. **Повний SA-EXT-06 і всі інші незакриті батьківські розділи залишаються OPEN**; SA-EXT-03/04 уже TERMINAL. Немає proof живого Sites SHA, незалежних картографічних прав, повної географії/археології або фізичного NVDA; **без деплою**.

---

## 2026-10-31 — остаточні source-development стани перших 5 SA-EXT батьківських розділів

Це **канонічні стани розробки**, а не підтвердження встановленого релізу. Постійний список номерів зберігається саме в цьому плані; попередні часткові квитанції залишаються історією.

- **SA-EXT-01 — OPEN:** неповне ліцензоване покриття видань і provenance/QA перекладів; не називати готовим.
- **SA-EXT-02 — OPEN:** наявна реальна пілотна місія та прогрес, але ширший затверджений каталог місій/повторень не завершений; [закрита тільки приватна BFCache підфункція](SA_EXT_02_PROGRESS_BFCACHE_SCOPED_TERMINAL_20261031.md).
- **SA-EXT-03 — ЗАКРИТО ДЛЯ ПОДАЛЬШОЇ РОЗРОБКИ / `CLOSED_FOR_DEVELOPMENT / TERMINAL`:** повна авторська й редакційна workflow, права, версії, withdraw, export, audit, real UI; [доказ](SA_EXT_03_PARENT_CLOSED_FOR_DEVELOPMENT_TERMINAL_20261031.md).
- **SA-EXT-04 — ЗАКРИТО ДЛЯ ПОДАЛЬШОЇ РОЗРОБКИ / `CLOSED_FOR_DEVELOPMENT / TERMINAL`:** повні групи, invitations, приватність, membership, sessions, group attempts і marathon/cohort, real UI; [доказ](SA_EXT_04_PARENT_CLOSED_FOR_DEVELOPMENT_TERMINAL_20261031.md).
- **SA-EXT-05 — OPEN:** ширший джерельно верифікований каталог досьє/графів, місця, події, розрізнення наукових та конфесійних інтерпретацій не повністю готові.

**Обидва terminal-записи прив'язані до exact вихідного `main@79a8e40cee2c3eb0e0901c5b8b260cb4b0a149c9`, CI [#41164386403](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41164386403) SUCCESS.** Повторне призначення SA-EXT-03/04 без нового конкретного дефекту або затвердженого розширення — заборонено. Новий реальний контент/медіа/мови, правовласники й publication acceptance залишаються за своїми відповідними роботами. Загальне розгортання не блокує source-development terminal.

---

## 2026-10-31 — SA-EXT-03 / EDITORIAL_PRIVATE_BFCACHE_FENCE — SCOPED TERMINAL

**РОЗРОБКУ ВУЗЬКОГО ПІДПУНКТУ ЗАКРИТО / `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`**, але **повний SA-EXT-03 та всі інші SA-EXT-01…20 OPEN**. Канонічні `/builder` (приватні чернетки/рецензії) і `/editor` (власник, користувачі/аналітика) синхронно очищують приватний DOM на `pagehide`; блокують запізнілі ролі/чернетки/аналітику; нові дані показуються лише після `getSession()` на `pageshow` з generation-fence. [Функціональний PR #819](https://github.com/Oleksii-debug/scripture-archive/pull/819) **SQUASH MERGED** `main@e17f7cf9d7d69140f3eda098f699beb86a2a56d4`; [exact-head CI #41164044787](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41164044787) **SUCCESS** (Node, TS, lint, build, Worker/D1, Python); 12 нових Node регресій, два існуючі source-extract fixtures знову валідні. [Формальна квитанція](SA_EXT_03_EDITORIAL_BFCACHE_SCOPED_TERMINAL_20261031.md). `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0` тільки тут; реліз/Chrome/Windows/NVDA/реальний reviewer не перевірені.

---

## 2026-10-31 — SA-EXT-04 / LATE_BFCACHE_IDENTITY_REENTRY_FENCE — SOURCE SCOPED TERMINAL

**ЗАКРИТО ДЛЯ РОЗРОБКИ лише підтверджений приватний BFCache-дефект / `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.** На попередньому `main@35a9e1cea94bdd3b04275b53dbbdb0ff3997f138` exact-source V8 відтворив запізнілий `route()` після другого `pagehide`, поки сторінка прихована (1 виклик). [PR #818](https://github.com/Oleksii-debug/scripture-archive/pull/818) **SQUASH MERGED** у `main@a544e0caa862453ae51499cc4573ccb5ee1b8b3a`; source `public/app.js@e7c1cfc672a87996338a618874396a19b49f958a`, regression `tests/group-detail-bfcache-privacy.test.mjs@b9138b027a903aa022924e6d5cd24366d589ff3a` (3 нові випадки). Виправлення запобігає повторному входу в приватний маршрут і запитам на прихованій сторінці до завершення повторної авторизації. Після зміни V8: 0 запізнілих `route()`; [exact-head CI #41163569190](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41163569190) **SUCCESS**: Node/TS/lint/build/disposable Worker-D1/Python. [Остаточна квитанція](SA_EXT_04_BFCACHE_LATE_AUTH_REENTRY_SCOPED_TERMINAL_20261031.md). `remaining_scoped_implementation=0`, `necessary_unmerged_prs=0` **тільки цього дефекту**. **Батьківський SA-EXT-04 і всі 20 батьківських SA-EXT розділів — OPEN**, живий Sites SHA/Chrome/фізичний NVDA/SMTP не підтверджені, деплою не було.

---

## 2026-10-31 — SA-EXT-04 / FULL_GROUP_DETAIL_BFCACHE_PRIVATE_FENCE — SCOPED TERMINAL

**РОЗРОБКУ ЦЬОГО ВУЗЬКОГО ПІДПУНКТУ ЗАКРИТО / `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.** Справжній UI `public/app.js::renderGroup` очищує приватну інформацію `.group-detail` на `pagehide`, захищає три асинхронні read-boundaries epoch і перед `pageshow`-відновленням повторно перевіряє чинну серверну сесію; збережено #814 meeting corrections. [Source PR #815](https://github.com/Oleksii-debug/scripture-archive/pull/815) **SQUASH MERGED** у точний `main@2579ff852efb365453e930b678654a69f40efa01`; [GitHub Actions #41163208855](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41163208855) **SUCCESS** (2330+ Node, TypeScript, lint, build, disposable Worker/D1, Python). [Формальна квитанція](SA_EXT_04_GROUP_DETAIL_BFCACHE_SCOPED_TERMINAL_20261031.md). `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`; повторна розробка лише за відтвореним дефектом. **Повний SA-EXT-04 і всі інші батьківські SA-EXT OPEN**; live Chrome BFCache, deployed Sites SHA, фізичний NVDA NOT_VERIFIED. Без деплою.

---

## 2026-10-31 — SA-EXT-04 / MEETING_HISTORY_BFCACHE_PRIVATE_FENCE — SOURCE SCOPED TERMINAL

**ЗАКРИТО ДЛЯ РОЗРОБКИ ЛИШЕ ЦЕЙ ПІДПУНКТ / `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.** [PR #811](https://github.com/Oleksii-debug/scripture-archive/pull/811) **SQUASH MERGED** у exact `main@4b8dd337c73f012ef559214f3a71aa82d2d49607`. Збережені учасницькі нотатки та застарілі відповіді історії зустрічей більше не переживають `pagehide` у канонічному модулі; `pageshow` запитує дані повторно з поточною авторизацією. Вісім native Node поведінкових тестів і увесь exact-head CI [#41162441723](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41162441723) **SUCCESS** (Node/TS/lint/build/disposable Worker-D1/Python). [Остаточна квитанція](SA_EXT_04_MEETING_BFCACHE_PRIVACY_SCOPED_TERMINAL_20261031.md). `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0` саме тут. **Усі 20 повних SA-EXT батьківських розділів залишаються OPEN**; live browser BFCache/physical NVDA/Sites SHA NOT_VERIFIED; без деплою.

---

## 2026-10-30 — SA-EXT-02 / PRIVATE_ATTEMPT_HISTORY_DUPLICATE_ID_FAILCLOSED — SOURCE SCOPED TERMINAL

**ЗАКРИТО ДЛЯ РОЗРОБКИ ЛИШЕ ЦЕЙ ПІДПУНКТ / `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.** [PR #795](https://github.com/Oleksii-debug/scripture-archive/pull/795) **SQUASH MERGED** у exact `main@588f2da45f46691026edd532d6c251a434f0c370`. Канонічна історія навчання відхиляє повторювані ID завершених/незавершених спроб замість вигаданого повторення та прогресу. Перевірено дублікати, колізії, перестановку, доступний retry UK/RU/EN і коректні окремі спроби. Exact-head [CI #41077317717](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41077317717) **SUCCESS** (native Node, TypeScript, lint, build, disposable Worker/D1, Python). [Фінальна квитанція](SA_EXT_02_PRIVATE_HISTORY_DUPLICATE_ATTEMPT_ID_TERMINAL_20261030.md). `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0` саме тут. **Повний SA-EXT-02 і всі 20 батьківських розділів OPEN**; production/Sites/Windows/NVDA/D1 NOT_VERIFIED. Без деплою.

---

## 2026-10-30 — SA-EXT-01…05 / 40 EXACT SOURCE READBACKS — AUDIT ONLY, NOT A PARENT CLOSURE

40/40 канонічних файлів коду, тестів і міграцій відчитано з фіксованого `main@a2a0e0a7c95a85fd3cd4a801bc5e1fbbe1151be7` із SHA й перевіркою основних маркерів. [Перелік і залишкові критерії](SA_EXT_01_05_40_LIVE_MAIN_SOURCE_READBACKS_20261030.md). **Жоден батьківський SA-EXT-01…20 автоматично не закрито**: source presence ≠ повний затверджений функціонал чи production/NVDA acceptance.

---

## 2026-10-30 — SA-EXT-01 / PRIMARY_READER_PROVENANCE_URL_RAW_AUTHORITY — SOURCE SCOPED TERMINAL

**ЗАКРИТО ДЛЯ РОЗРОБКИ лише цей підтверджений підпункт / `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.** [PR #792](https://github.com/Oleksii-debug/scripture-archive/pull/792) **SQUASH MERGED** у `main@970d66db7b295bfd57155aa3ab96943619abddd6`. Основна читальня в `public/app.js` тепер використовує єдину перевірку сирих HTTPS URL джерела/ліцензії, уже наявну в паралельній читальні. 48 негативних UK/RU/EN сценаріїв і позитивний HTTPS-контроль; exact-head [CI #41075816618](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41075816618) **SUCCESS** (Node/TS/lint/build/Worker-D1/Python). [Квитанція](SA_EXT_01_PRIMARY_SOURCE_URL_INTEGRITY_TERMINAL_20261030.md); `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0` саме тут. **Повний SA-EXT-01 і всі 20 батьківських SA-EXT залишаються OPEN**, Sites/NVDA/SMTP/D1 NOT_VERIFIED, без деплою.

---

## 2026-10-30 — SA-EXT-01 / ABOUT_EDITION_PROVENANCE_URL_RAW_AUTHORITY — SOURCE SCOPED TERMINAL

**ЗАКРИТО ДЛЯ РОЗРОБКИ тільки цей окремий дефект / `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.** [PR #790](https://github.com/Oleksii-debug/scripture-archive/pull/790) **SQUASH MERGED** у `main@e2ae19ee2e2f77b2bc34a0ac062d3007bf3ac546`. Сторінка про біблійні видання використовує той самий канонічний валідатор URLs, що й паралельна читальня, без дублювання реалізації. 48 негативних source/license×3 мови та позитивний контроль; exact-head [CI #41075153406](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41075153406) **SUCCESS** (Node/TS/lint/build/Worker-D1/Python). [Квитанція](SA_EXT_01_ABOUT_SOURCE_URL_INTEGRITY_TERMINAL_20261030.md); `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0` саме тут. **SA-EXT-01…20 батьківські розділи OPEN**; live release/Sites/NVDA/SMTP/D1 NOT_VERIFIED. Деплою немає.

---

## 2026-10-30 — SA-EXT-04 / GROUP_IDENTIFIER_NO_WHITESPACE_ALIAS — SOURCE SCOPED TERMINAL

**ЗАКРИТО ДЛЯ РОЗРОБКИ ТІЛЬКИ ЦЕЙ ПІДПУНКТ / `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.** Канонічний `GET/POST /api/groups` відхиляє неканонічні ключі груп, учасників і попередні коди запрошення з крайніми пробілами, замість непомітного перенаправлення на інший чинний D1-запис. Реальні route/SQLite регресії перевіряють заборону читання/запису і збереження правильних ключів. [Функціональний PR #791](https://github.com/Oleksii-debug/scripture-archive/pull/791) **SQUASH MERGED** у exact `main@3a09d787f0730b7abc6aa45600310a3e06b5307c`. [Exact-head CI #41075642458](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41075642458): **SUCCESS**, Node/TypeScript/lint/build/disposable Worker-D1/Python. [Постійна квитанція](SA_EXT_04_GROUP_IDENTIFIER_EXACT_WHITESPACE_SCOPED_TERMINAL_20261030.md). `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0` **лише для цього виправлення**. **Повний SA-EXT-04 та всі 20 батьківських SA-EXT-01…20 залишаються OPEN.** Опублікований Sites SHA, браузер/Windows/NVDA/пошта — NOT_VERIFIED; деплою не було.

---

## 2026-10-30 — SA-EXT-01 / PARALLEL_EDITION_PROVENANCE_URL_RAW_AUTHORITY — SOURCE SCOPED TERMINAL

**Лише цей доведений дефект ЗАКРИТО ДЛЯ РОЗРОБКИ / `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.** [PR #788](https://github.com/Oleksii-debug/scripture-archive/pull/788) **SQUASH MERGED** у `main@92e6859602dc0a0247abb8ef091e4ecab248f897`. Канонічний паралельний читач відхиляє сирі HTTPS URL джерела/ліцензії з прихованими ASCII-керівними символами або порожнім userinfo до нормалізації браузером; дійсні посилання зберігаються. [Exact-head CI #41073854181](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41073854181) **SUCCESS** (Node, TypeScript, lint, збірка, disposable Worker/D1, Python), 16 нових негативних source/license сценаріїв. [Остаточна квитанція](SA_EXT_01_PARALLEL_SOURCE_URL_INTEGRITY_TERMINAL_20261030.md). `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0` лише для цього дефекту; повторна розробка без нового факту заборонена. **Батьківський SA-EXT-01 і всі SA-EXT-01…20 залишаються OPEN**; живий сайт/Windows/NVDA/SMTP/D1 і реліз NOT_VERIFIED, деплою немає.

---

## 2026-10-30 — SA-EXT-05 / RELATION_CHAPTER_SOURCE_SEARCH — SCOPED TERMINAL

**ЗАКРИТО ДЛЯ РОЗРОБКИ ТІЛЬКИ ЦЕЙ ПІДПУНКТ**: canonical dossier chapter lookup у `public/scripture-dossiers.js` тепер враховує публічні свідчення зі зв'язків `related[].via`, а не тільки `sources[]`. Точні запити за кодом і локалізованою назвою книги працюють у UK/RU/EN, сусідні непов'язані глави не додаються. Реальний вебмаршрут і старий граф джерел збережені. [PR #780](https://github.com/Oleksii-debug/scripture-archive/pull/780) **SQUASH MERGED** у `main@8e57e95017c159b7de2d78af0acbbc6d7cf91a04`; [PR-head full CI #41071444546](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41071444546) **SUCCESS**. [Квитанція](SA_EXT_05_RELATION_CHAPTER_SEARCH_TERMINAL_20261030.md). `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`, `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0` **тільки для цієї функції**. **Повний SA-EXT-05 та всі SA-EXT-01…20 OPEN**; live Sites/physical NVDA/production NOT_VERIFIED, деплою немає.

---

## 2026-10-30 — SA-EXT-05/06 / SAFE_CANONICAL_BOOK_CODE_SOURCE_AND_LINKS — SOURCE SCOPED TERMINAL

**Лише цей конкретний дефект ЗАКРИТО / `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.** Реальний канонічний граф досьє більше не приймає небезпечні коди книг у каталогах трьох мов і пов'язаних посиланнях; відтворений HTML-атрибут у URL виправлено без зміни біблійного тексту або окремої реалізації. [PR #783](https://github.com/Oleksii-debug/scripture-archive/pull/783) **SQUASH MERGED** у точний `main@5cc884cd015b4784a20d803101e94fdfbe598830`. [Exact-head CI #41072051344](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41072051344) **SUCCESS** (Node, TS, ESLint, build, disposable Worker/D1, Python). [Термінальна квитанція](SA_EXT_05_06_BOOK_CODE_URL_INTEGRITY_TERMINAL_20261030.md); `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0` лише для цього source-дефекту. **Усі 20 батьківських SA-EXT розділів OPEN, live Sites/browser/Windows/NVDA NOT_VERIFIED; деплою немає.**

---

## 2026-10-30 — SA-EXT-16 / RELEASE_ORIGIN_AND_ROUTE_PREFLIGHT — SOURCE SCOPED TERMINAL

**Лише цей вузький підпункт ЗАКРИТО / `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.** Три точні source blobs із ранішого draft #288 включено в канонічний `npm test`, а незмінений наявний release-guide доповнено безпечним запуском preflight, що перевіряє декларації HTTPS-адреси та маршрути/SEO/NVDA skip-link. Функціональний [PR #777](https://github.com/Oleksii-debug/scripture-archive/pull/777) **SQUASH MERGED** у `main@c6e3c12be1efeb58239f17697e4c433e315f8b1f`; exact-head [GitHub Actions #41070132012](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41070132012) **COMPLETED SUCCESS** (2226 Node, 22/22 Worker/D1, 2 Python, TypeScript/lint/build). [Постійна квитанція](SA_EXT_16_RELEASE_ORIGIN_AND_ROUTES_TERMINAL_20261030.md); `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0` тільки для preflight source. **Батьківський SA-EXT-16 і всі SA-EXT-01…20 OPEN; LIVE/Sites SHA/SMTP/Chrome/Windows/physical NVDA NOT_VERIFIED; деплою немає.**

---

## 2026-10-30 — R0.2 / SA-EXT-16 / AUTH_EMAIL_NO_PREFIX_ALIAS — SCOPED TERMINAL

**ЗАКРИТО ДЛЯ РОЗРОБКИ лише цей дефект, `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.** У канонічному `/api/auth` наддовга адреса більше не обрізається до чужого ідентифікатора для реєстрації, входу, повторного підтвердження або відновлення пароля. [PR #774](https://github.com/Oleksii-debug/scripture-archive/pull/774) **SQUASH MERGED** у `main@5050cb7f9816f1cdd6f0adbc8e58c941188daf84`, [exact-head CI #41069364724](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41069364724) **SUCCESS**: Node **2213 PASS/0 FAIL/1 SKIP**, Worker/D1 **22/22**, TypeScript/lint/build/Python **2/2 PASS**. [Квитанція](SA_EXT_16_AUTH_EXACT_EMAIL_IDENTITY_TERMINAL_20261030.md). `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0` тільки для цього виправлення. **R0.2 production mail, усі 20 батьківських SA-EXT-01…20, Sites/NVDA/release залишаються OPEN/NOT_VERIFIED**. Без деплою.

---

## 2026-10-30 — SA-EXT-04 / INVITE_ROTATION_EXPECTED_TOKEN_EXACT — SCOPED TERMINAL

**Лише цей підпункт — `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.** [PR #768](https://github.com/Oleksii-debug/scripture-archive/pull/768) **MERGED** до `main@dcad693792dae4b2fa38bde692e1d0dc3c3b065b`. Owner-only API більше не обрізає хибний наддовгий `expectedInviteCode` до чинного коду запрошення; SQL-умова точного попереднього значення і перевірки прав збережені. Три реальні SQLite route-тести (відмова без запису й законна ротація), [exact-head Actions #41067830702](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41067830702) **SUCCESS** (Node/TS/lint/build/Worker-D1/Python). [Квитанція](SA_EXT_04_INVITE_ROTATION_EXPECTED_TOKEN_TERMINAL_20261030.md). `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0` лише для цього дефекту; **всі 20 SA-EXT батьківських розділів OPEN**, Sites/Windows/NVDA не підтверджено, жодного деплою.

---

## 2026-10-30 — SA-EXT-01/02 / SHARED_BOOKMARK_EXPORT_DATE_INTEGRITY — SOURCE SCOPED TERMINAL

**ЛИШЕ ЦЕЙ ПІДПУНКТ ЗАКРИТО / `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.** Реальні маршрути `GET /api/bookmarks` і приватний `GET /api/reading-export` використовують той самий `lib/bookmark-timestamp.js`: неіснуючі календарні дати не видаються за коректну закладку чи відновлювану резервну копію. Коректні старі й UTC-часові записи зберігаються; дані користувача не видаляються. [Функціональний PR #760](https://github.com/Oleksii-debug/scripture-archive/pull/760) **SQUASH MERGED** у `main@cee442ed79d08b7913be0c555eb74e8168c92c68`; [exact-head Actions #41067071110](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41067071110) **SUCCESS** (Node/TS/lint/build/disposable Worker-D1/Python). [Точна квитанція](SA_EXT_01_02_SHARED_BOOKMARK_EXPORT_DATE_TERMINAL_20261030.md); `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0` лише для цього дефекту. **Усі 20 повних розділів SA-EXT-01…20 залишаються OPEN; Sites/browser/Windows/NVDA/SMTP NOT_VERIFIED; деплою не виконували.**

---

## 2026-10-30 — SA-EXT-04 / GROUP_IDENTIFIER_EXACT_TARGET — ЗАКРИТО ВУЗЬКИЙ ДЕФЕКТ

**Лише підпункт `GROUP_IDENTIFIER_EXACT_TARGET` — `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.** [PR #758](https://github.com/Oleksii-debug/scripture-archive/pull/758) **SQUASH MERGED** у точний `main@a394c0506bb7da7ccf8ab34c33be4b1758d3d294`. Виправлено непомітне обрізання наддовгих ідентифікаторів домашніх груп, яке могло спрямувати дозволену операцію на інший запис; реальний API зберігає права й D1. [Exact-head Actions #41066922814](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41066922814) **SUCCESS**: Node 2162 PASS/0 FAIL/1 SKIP, Worker/D1 22/22, TS/lint/build та Python 2/2 PASS. `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0` лише тут; [офіційна квитанція](SA_EXT_04_GROUP_IDENTIFIER_BOUNDARY_TERMINAL_20261030.md). **Батьківський SA-EXT-04 і всі 20 SA-EXT-01…20 залишаються OPEN**, Sites/Windows/NVDA/production NOT_VERIFIED, деплою немає.

---

## 2026-10-30 — SA-EXT-10 / PUBLIC_READING_CANONICAL_CHAPTER_LIMITS — SCOPED TERMINAL

**CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL лише цей конкретний source-дефект.** Канонічний `GET /api/community` більше не зараховує неіснуючі книги/глави (зокрема `GEN:51`), використовуючи один спільний `public/data/catalog.json` із приватною читальнею. [PR #744](https://github.com/Oleksii-debug/scripture-archive/pull/744) **SQUASH MERGED** точний feature `main@68d63d956d63ca0f25f595fb7cda7264476387e7`; exact-head [Actions #41064822640](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41064822640) **SUCCESS** (Node, TS, lint, build, disposable Worker/D1, Python). Єдиний справжній маршрут, без нового сховища, деплою чи дублювання реалізації. [Постійна квитанція](SA_EXT_10_PUBLIC_READING_CANONICAL_CHAPTER_LIMITS_TERMINAL_20261030.md). `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0` **лише для цього вузького підпункту**. **Повний SA-EXT-10 та всі SA-EXT-01…20 OPEN**, production/Sites/Windows/NVDA/SMTP NOT_VERIFIED.

---

## 2026-10-30 — SA-EXT-02 / ATTEMPT_DEADLINE_CANONICAL_UTC — SCOPED TERMINAL

**РОЗДІЛ SA-EXT-02 / підпункт attempt deadline integrity — ЗАКРИТО ДЛЯ ПОДАЛЬШОЇ РОЗРОБКИ / `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.** Чинний `GET/POST /api/attempts` не показує захищені завдання і не приймає відповіді за пошкодженим D1 дедлайном: неможливі числа місяців/днів/годин, неоднозначні дати та timezone-рядки відхиляються до викриття завдання; коректні D1 UTC, date-only та ISO-Z збережено. [Функціональний PR #746](https://github.com/Oleksii-debug/scripture-archive/pull/746) **SQUASH MERGED** в `main@16926cca4bd81e6d267f635c597be110fada3823`, [exact-head Actions #41064837337](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41064837337) **SUCCESS**: 2147 Node PASS, 1 SKIP, 22/22 Worker/D1 PASS, TypeScript/lint/build/Python PASS. `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0` саме для цього дефекту. [Постійний proof receipt](SA_EXT_02_ATTEMPT_DEADLINE_CANONICAL_UTC_TERMINAL_20261030.md). **Усі 20 повних SA-EXT-01…20 залишаються OPEN**; Sites/Windows/NVDA/SMTP/production NOT_VERIFIED, деплой не виконувався.

---

## 2026-10-30 — SA-EXT-02 / CANONICAL_ASSESSMENT_DEADLINE_CALENDAR_INTEGRITY — SOURCE SCOPED TERMINAL

**ТІЛЬКИ ПІДПУНКТ ЗАКРИТО ДЛЯ РОЗРОБКИ / `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`**. Чинний API навчальних спроб відхиляє неможливі дати/час дедлайну, замість розкриття завдання або прийняття відповіді; збережено коректні D1 UTC, дату без часу та ISO-Z. [PR #746](https://github.com/Oleksii-debug/scripture-archive/pull/746) **squash MERGED** у `main@16926cca4bd81e6d267f635c597be110fada3823`; [exact-head CI #41064837337](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41064837337) **SUCCESS**. [Термінальна квитанція](SA_EXT_02_ATTEMPT_DEADLINE_CALENDAR_TERMINAL_20261030.md). `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0` тільки для цієї перевірки. **Усі 20 повних батьківських розділів OPEN**, production/browser/NVDA/SMTP NOT_VERIFIED. Без деплою.

---

## 2026-10-30 — SA-EXT-16 / HISTORICAL_PUBLIC_CHURCH_CONSENT_WRITE_GUARD — SOURCE SCOPED TERMINAL

**Лише цей підпункт ЗАКРИТО ДЛЯ РОЗРОБКИ / `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`**. [PR #743](https://github.com/Oleksii-debug/scripture-archive/pull/743) squash MERGED у `main@0847c2089ffbb5b20cbfe6e08245f0b32f401e56`; exact-head [Actions #41064432625](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41064432625) **SUCCESS**. Міграція `0013_public_church_consent_guard.sql` не дозволяє старому writer повторно відкрити публічність церковних даних без актуальної явної згоди, не скасовує законну згоду версії 1; native SQL migration tests додані. `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0` лише для source-guard. [Квитанція](SA_EXT_16_LEGACY_PUBLIC_CHURCH_CONSENT_GUARD_TERMINAL_20261030.md). **Повні SA-EXT-01…20 OPEN; production migration/backup/cutover #689, deployed SHA, браузер/NVDA/SMTP NOT_VERIFIED**; деплою не було.

---

## 2026-10-30 — SA-EXT-01 / BOOKMARK_CREATED_AT_CANONICAL_INTEGRITY — SCOPED TERMINAL

**РОЗДІЛ SA-EXT-01 / підпункт bookmark date integrity — ЗАКРИТО ДЛЯ ПОДАЛЬШОЇ РОЗРОБКИ / `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`**. Чинний приватний `GET /api/bookmarks` зберігає коректні дати і D1/ISO UTC, відхиляє неможливі календарні дати як пошкоджені дані, не робить DELETE при читанні. [Функціональний PR #737](https://github.com/Oleksii-debug/scripture-archive/pull/737) **SQUASH MERGED** в `main@dce3ef081f4e3fd7a8e8cf30a77d3f19c842d054`. [Exact-head CI #41063500627](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41063500627): **2092 Node PASS, 22/22 Worker/D1 PASS, TypeScript/lint/build/Python PASS** після виправлення першого регресійного RED. `remaining_scoped_implementation=0`, `necessary_unmerged_prs=0` тільки для цього вузького дефекту. [Точна квитанція](SA_EXT_01_BOOKMARK_TIMESTAMP_INTEGRITY_TERMINAL_20261030.md). **Усі 20 повних SA-EXT-01…20 залишаються OPEN**, Sites/browser/Windows/NVDA/SMTP NOT_VERIFIED, деплой не виконувався.

---

## 2026-10-30 — SA-EXT-05 / CANONICAL_SOURCE_BOOK_CHAPTER_DISCOVERY — SCOPED TERMINAL

**CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** тільки для пошуку наявних досьє за реально підтвердженими біблійними посиланнями книги + глави. До ремонту код не знаходив `GEN 12` і назву тієї самої книги з каталогу UK/RU/EN. [PR #738](https://github.com/Oleksii-debug/scripture-archive/pull/738) **SQUASH MERGED** у `main@691539a186a99339c4bf58a7d462b363c3719ecf`; exact-head [Actions #41063455864](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41063455864) **SUCCESS** (Node/TS/lint/build/Worker-D1/Python). Використано чинні `item.sources` і канонічні назви книг, два негативні та позитивні native-тести; відсутня помилкова відповідність `GEN 1` → `GEN 12`, збережено доступні GET-посилання. [Доказова квитанція](SA_EXT_05_SOURCE_CHAPTER_LOOKUP_TERMINAL_20261030.md). `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0` тільки для цього зрізу. **Усі 20 повних SA-EXT-01…20 залишаються OPEN; production/NVDA NOT_VERIFIED.** Без деплою.

---

## 2026-10-30 — SA-EXT-10 / COMMUNITY_PUBLIC_PROGRESS_COUNT_INTEGRITY — SCOPED TERMINAL

**ЗАКРИТО ДЛЯ РОЗРОБКИ ЛИШЕ ПІДПУНКТ / `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.** [PR #739](https://github.com/Oleksii-debug/scripture-archive/pull/739) **SQUASH MERGED** у canonical `main@557262fd51a25bcff46830f711a066de35e7e08c`; [exact-head CI #41063578969](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41063578969) **SUCCESS** (Node/TypeScript/lint/build/Worker-D1/Python). Реальний `GET /api/community` відхиляє зіпсовані дані про прочитані глави й неправдиві SQL-лічильники місій, без нових сховищ чи мутацій. [Постійна квитанція](SA_EXT_10_PUBLIC_PROGRESS_COUNTERS_TERMINAL_20261030.md). `remaining_scoped_implementation=0`; `necessary_unmerged_PRs=0` тільки для цього дефекту. **Усі 20 повних батьківських SA-EXT-01…20, включно з SA-EXT-10, OPEN**; Sites/Windows/NVDA/production NOT_VERIFIED, реліз не виконувався.

---

## 2026-10-30 — SA-EXT-16 / LATE_AUTH_RESPONSE_COOKIE_CLOBBER — SCOPED SOURCE TERMINAL

**CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** only for the delayed old-auth response clearing a newer login session cookie. [Functional PR #731](https://github.com/Oleksii-debug/scripture-archive/pull/731) **SQUASH MERGED** into `main@4668cd6cb594ecdd532b455fa5cf3682e0aab1a4`; exact-head [CI #41061728225](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41061728225) **SUCCESS** (Node/TS/lint/build/Worker-D1/Python) after test-only SQL regex correction. Four old-session response actions no longer clear the shared cookie; server-side D1 revocation remains enforced. `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0` **only** for this source defect. [Permanent scoped receipt](SA_EXT_16_LATE_AUTH_COOKIE_SOURCE_TERMINAL_20261030.md). Real Chrome cookie-jar acceptance [issue #705](https://github.com/Oleksii-debug/scripture-archive/issues/705), deployed site SHA, SMTP, Windows/NVDA and **all 20 SA-EXT parents remain OPEN**. No deployment.

---

## 2026-10-30 — SA-EXT-05 / DOSSIER_RESEARCH_QUESTION_DISCOVERY — SCOPED TERMINAL

**CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** для пошуку наявних біблійних досьє за вже оприлюдненими дослідницькими запитаннями. Реальне відтворення до ремонту: `Які зміни імен` / `Какие изменения имён` / `Which name changes` не знаходили Сарру в UK/RU/EN. [PR #732](https://github.com/Oleksii-debug/scripture-archive/pull/732) **SQUASH MERGED** у `main@8c97e5ae83607ed6407382f8e14ad282c6a052a7`; [exact-head CI #41061839502](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41061839502) **SUCCESS** (Node/TS/lint/build/Worker-D1/Python). Збережено фільтр у GET, валідовані джерела, приватність і відмову від відкриття сторонніх досьє. [Офіційна квитанція](SA_EXT_05_DOSSIER_RESEARCH_QUESTION_SEARCH_TERMINAL_20261030.md). `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0` лише для цієї підфункції. **Повні SA-EXT-01…20 залишаються OPEN; LIVE/NVDA/production НЕ ПІДТВЕРДЖЕНІ.** Деплою немає.

---

## 2026-10-30 — SA-EXT-03 / OWNER_CMS_MANAGED_ITEM_OBJECT_ROOT — SCOPED TERMINAL

**РОЗДІЛ SA-EXT-03 / OWNER_CMS_MANAGED_ITEM_OBJECT_ROOT — ЗАКРИТО ЛИШЕ ЦЕЙ ПІДПУНКТ / CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL.** Канонічний owner-only `GET /api/content?admin=1` більше не показує пошкоджене збережене JSON `managed_content.data` (null/string/array/boolean/number) як успішні редакційні матеріали 200. [Source PR #733](https://github.com/Oleksii-debug/scripture-archive/pull/733) **SQUASH MERGED** у `main@fc0e7c69944b861402adc0310cd2f70a8734e97d`; [exact-head CI #41061929405](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41061929405) **SUCCESS**: Node 2077 PASS / 0 FAIL / 1 SKIP; Worker/D1 22/22; TS/lint/build; Python 2/2. Додано 56 source-executing позитивних/негативних сценаріїв; `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0` тільки для цього дефекту. [Точна квитанція](SA_EXT_03_OWNER_CMS_ITEM_ROOT_INTEGRITY_TERMINAL_20261030.md). **Повний SA-EXT-03 і всі 20 батьківських розділів OPEN**, live Sites/browser/Windows/NVDA/SMTP не підтверджено; деплой не виконувався.

---

## 2026-10-30 — SA-EXT-03 / PUBLIC_CONTENT_ROW_OBJECT_INTEGRITY — SCOPED TERMINAL

**РОЗДІЛ SA-EXT-03 / PUBLIC_CONTENT_ROW_OBJECT_INTEGRITY — ЗАКРИТО ЛИШЕ ЦЕЙ ПІДПУНКТ / CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL.** [Source PR #729](https://github.com/Oleksii-debug/scripture-archive/pull/729) **SQUASH MERGED** у `main@aaee52099946714f51eecd507f60fd737827f4cf`. Exact PR-head [GitHub Actions #41061096456](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41061096456) **SUCCESS**: 2021 Node PASS / 0 FAIL / 1 SKIP, 22/22 disposable Worker/D1, TypeScript/lint/build і 2/2 Python. Canonical public `GET /api/content` відхиляє не-JSON-object root і некоректні D1 metadata з приватним 503 замість фальшивого публічного 200; легальні поточні/старі object-публікації і відсутній рядок збережені. `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0` саме для вузького дефекту. [Постійний доказовий запис](SA_EXT_03_PUBLIC_CONTENT_ROW_INTEGRITY_TERMINAL_20261030.md). **Повний SA-EXT-03 та всі 20 батьківських SA-EXT-01…20 залишаються OPEN**; deployed Sites SHA, реальний браузер/Windows/NVDA/SMTP NOT_VERIFIED; деплой не виконано.

---

## 2026-10-30 — SA-EXT-04 / GROUP_PUBLIC_COUNT_INTEGRITY — SCOPED TERMINAL

**Тільки підпункт `GROUP_PUBLIC_COUNT_INTEGRITY`: ЗАКРИТО ДЛЯ РОЗРОБКИ / `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.** Канонічний `app/api/groups/route.ts` відмовляє у недостовірних кількостях учасників, зустрічей та когорт (D1 COUNT), замість HTTP 200 з вигаданими показниками. [PR #724](https://github.com/Oleksii-debug/scripture-archive/pull/724) **SQUASH MERGED** у `main@9d3e8b2aa856384324228682cd4043f7726e9bff`, source/test/fixture blobs readback виконано. [Exact-head CI #41060270624](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41060270624) **SUCCESS**: Node 1998 PASS/1 SKIP, Worker/D1 22/22, TypeScript/lint/build/Python PASS. `remaining_scoped_implementation=0`; `necessary_unmerged_PRs=0`. [Постійний запис](SA_EXT_04_GROUP_COUNT_READ_INTEGRITY_TERMINAL_20261030.md). **Повний SA-EXT-04 та всі 20 батьківських розділів OPEN**; production/Sites/Windows/NVDA/SMTP не підтверджені, деплою немає.

---

## 2026-10-30 — SA-EXT-02 / API_HISTORY_CANONICAL_UTC — вузький TERMINAL

**CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** лише для коректних UTC timestamp у приватному API історії місій: [PR #722](https://github.com/Oleksii-debug/scripture-archive/pull/722) **SQUASH MERGED** `main@2e648177e91d0606cc001f2a79a7ee8a16c3b33a`; exact-head [CI #41059922244](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41059922244) **SUCCESS** (Node/TS/lint/build/Worker-D1/Python). У реальному `GET /api/attempts?action=history` недійсні дати `1`, 31 лютого й неканонічні SQL timestamps тепер дають приватний 503, не фальшивий 200, без запису до D1; узгоджено з UI #716. [Повна квитанція](SA_EXT_02_API_HISTORY_CANONICAL_UTC_TERMINAL_20261030.md). `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0` тільки для цього дефекту. **Усі 20 SA-EXT батьківських розділів залишаються OPEN**, production/Windows/NVDA NOT_VERIFIED. Без деплою.

---

## 2026-10-30 — SA-EXT-03 / PUBLIC_MATERIAL_LATEST_RENDER_WINS — SCOPED TERMINAL

**Вузьку підфункцію SA-EXT-03 ЗАКРИТО / `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`**, батьківський SA-EXT-03 та інші 19 розділів **залишаються OPEN**. [Функціональний PR #720](https://github.com/Oleksii-debug/scripture-archive/pull/720) **SQUASH MERGED** у canonical `main@411fbf41984a89b9e4b9cb9386ab3ff76750ac7b`; перевірено exact merged source `public/material-review.js@a5da2871509bc26e889e0a67a1c76ad92bf5f851` та 5 нових тестів `tests/public-material-latest-request-wins.test.mjs@af11f939557932fa82db0077bba82a2269c158fc`. [Точний Actions #41059721965](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41059721965) **SUCCESS**, реальні Node/TS/lint/build/Worker-D1/Python steps виконані. Два асинхронні запити матеріалів більше не можуть зіпсувати черговість оновлення одного й того самого компонента; старі форми не надсилають оцінювання після нового refresh. `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0` тільки для цього дефекту. [Повна квитанція](SA_EXT_03_PUBLIC_MATERIAL_LATEST_RENDER_TERMINAL_20261030.md). Публічний Sites SHA, браузерний E2E, Windows та фізичний NVDA **NOT_VERIFIED**, деплой не виконувався.

---

## 2026-10-30 — SA-EXT-02 / HISTORY_RENDER_UTC_TIMESTAMP_FAILCLOSED — SCOPED TERMINAL

**CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** лише для реального дефекту історії місій: зіпсовані `completedAt` та `startedAt` більше не відображаються як дійсний час UTC і не породжують хибні посилання. [PR #716](https://github.com/Oleksii-debug/scripture-archive/pull/716) **SQUASH MERGED** `main@99ac8af0f5e7fa6cb9bcf154d26b5c64e45602dc`; [exact-head CI #41059402059](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41059402059) **SUCCESS**: Node 1956 PASS / 0 FAIL / 1 SKIP, disposable Worker/D1 22/22, TypeScript/lint/build, Python 2/2. 62 негативні й сім позитивних/сумісних сценаріїв. [Офіційний доказовий запис](SA_EXT_02_HISTORY_RENDER_UTC_TIMESTAMPS_TERMINAL_20261030.md). `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. **Повний SA-EXT-02 та всі 20 батьківських розділів SA-EXT-01…20 залишаються OPEN; deployment/live SHA/Windows/NVDA/SMTP не перевірені.**

---

## 2026-10-30 — SA-EXT-02 / COMPLETED_RESULT_RECEIPT_CONSISTENCY — вузький TERMINAL

**CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** тільки для перевірки відповідності збереженого JSON-результату та D1 балів завершеної місії. [PR #710](https://github.com/Oleksii-debug/scripture-archive/pull/710) **SQUASH MERGED** `main@8ff4618473d25551a6839ecd3a1bfaf7942fbf4e`; final exact-head [CI #41058847951](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41058847951) **SUCCESS** (Node, TS, lint, build, Worker/D1, Python), після виправлення старої тестової фікстури. Пошкоджені `result_json` / `score` / `total` більше не видаються за `completed:true`; приватний 503 і жодних D1 змін. [Офіційна квитанція](SA_EXT_02_COMPLETED_RESULT_CONSISTENCY_TERMINAL_20261030.md). `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0` лише для цього дефекту. **Усі 20 повних SA-EXT-01…20 залишаються OPEN**; Sites/Windows/NVDA/production NOT_VERIFIED, деплою немає.

---

## 2026-10-30 — SA-EXT-04 / GROUP_STUDY_AGGREGATE_FAILCLOSED — SCOPED TERMINAL

**CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** тільки для коректних числових показників публічних і особистих груп. [Code PR #709](https://github.com/Oleksii-debug/scripture-archive/pull/709) **SQUASH MERGED** до `main@be9d32cf58fd671f7bb9920c69d89409f9ae1ed7`; [CI #41058471195](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41058471195) **SUCCESS** (Node/TS/lint/build/Worker-D1/Python); 40 API response-path сценаріїв, серед них 19 класів пошкодженого D1 агрегату. У разі невірних балів/підсумків/глав існуючий GET повертає private `503 groups_unavailable`, не вигадані відсотки. [Permanent receipt](SA_EXT_04_GROUP_AGGREGATE_INTEGRITY_TERMINAL_20261030.md). `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0` для вузького дефекту. **SA-EXT-04 та всі батьківські SA-EXT-01…20 OPEN**; live/NVDA/SMTP/реліз не перевірені; без деплою.

---

## 2026-10-30 — SA-EXT-05 / DOSSIER_FILTERED_RESULT_LINK_ROUNDTRIP — SCOPED TERMINAL

**Розділ SA-EXT-05, тільки `DOSSIER_FILTERED_RESULT_LINK_ROUNDTRIP`: `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.** Реальний канонічний `/dossiers` тепер зберігає активний пошук `q` при виборі відфільтрованого досьє (UK/RU/EN, Unicode, native GET, HTML-safe URL). [Functional PR #706](https://github.com/Oleksii-debug/scripture-archive/pull/706) **SQUASH MERGED** у exact `main@9696a0fb75b0d92678a5cb1a2add96387d4a4bdf`, main source/test readback підтверджений; [exact-head Actions #41058258952](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41058258952) **SUCCESS**, 1830 Node PASS/0 FAIL/1 SKIP, 22/22 Worker/D1, TS/lint/build, Python 2 PASS. `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0` лише для цієї функції. [Доказова квитанція](SA_EXT_05_DOSSIER_FILTERED_LINK_ROUNDTRIP_TERMINAL_20261030.md). **Усі 20 батьківських розділів SA-EXT-01…20 залишаються OPEN**; Sites SHA, actual Chrome/Windows/NVDA, production реліз не підтверджені; deploy не виконувався.

---

## 2026-10-30 — SA-EXT-01 / PARALLEL_READER_HUNG_REQUEST_SELECTION_RECOVERY — SCOPED TERMINAL

**CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** тільки для доведеного зависання паралельного читача після зміни видання. [PR #698](https://github.com/Oleksii-debug/scripture-archive/pull/698) **SQUASH MERGED**, exact source `main@ae57e4d0f8a56e0fc3cedb8ee8827309a235b98c`; [exact-head CI #41057817607](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41057817607) **SUCCESS**: 1824 native Node PASS / 0 FAIL / 1 SKIP, 22/22 disposable Worker/D1, TS/lint/build, Python 2/2. Справжня зміна видання відпускає заблоковану кнопку та відсікає запізнілі результати, а нове цитування віршів збережено. `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. [Доказовий запис](SA_EXT_01_PARALLEL_READER_HUNG_SELECTION_TERMINAL_20261030.md). **Повний SA-EXT-01 та решта 20 батьківських розділів OPEN; live Sites SHA, Windows/NVDA і production acceptance не перевірені.** Деплою не було.

---

## 2026-10-30 — SA-EXT-02 / HISTORY_CONTEXT_METADATA_FAILCLOSED — вузький terminal

**CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** тільки для приватної цілісності метаданих історії завершених та ще оцінюваних місій; не весь SA-EXT-02. [PR #701](https://github.com/Oleksii-debug/scripture-archive/pull/701) **MERGED** `main@6fbacff116ecede96cd4b38c21a2f70aea1d7b98`; [exact-head CI #41057639789](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41057639789) **SUCCESS** (Node, TS, lint, build, disposable Worker/D1, Python). Реальний `GET /api/attempts?action=history` перевіряє ID, книгу, главу, дату, груповий контекст і вже затверджений score/total; пошкоджене повертає приватний 503 без зміни D1 або витоку іншого облікового запису. [Офіційна квитанція](SA_EXT_02_HISTORY_CONTEXT_METADATA_TERMINAL_20261030.md). `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0` **лише для цього виправлення**. **Всі 20 повних батьківських розділів SA-EXT-01…20 OPEN**; Sites, Windows, фізичний NVDA, доступність і права окремо NOT_VERIFIED. Без деплою.

---

## 2026-10-30 — SA-EXT-03 / PRIVATE_MATERIAL_EXPORT_RESTORABILITY — SCOPED TERMINAL

**CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** тільки для цілісності приватного експорту авторських чернеток і затверджуваних редакційних snapshots. [PR #699](https://github.com/Oleksii-debug/scripture-archive/pull/699) **SQUASH MERGED** `main@88720a96b84706038cdbc77cd1b9063a8c339a8b`; [exact-head CI #41057584095](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41057584095) **SUCCESS**: Node/TS/lint/build/disposable Worker-D1/Python. Пошкоджені навчальні дані не експортуються зі статусом 200; коректні українські тексти й історичні метадані збережені. [Permanent receipt](SA_EXT_03_MATERIAL_EXPORT_RESTORABILITY_TERMINAL_20261030.md). `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. **Батьківський SA-EXT-03 та всі 20 повних SA-EXT-01…20 — OPEN**, production/browser/NVDA не підтверджені; без деплою.

---

## 2026-10-30 — SA-EXT-01 / PARALLEL_READER_VERSE_CITATION — SCOPED TERMINAL

**РОЗДІЛ SA-EXT-01, тільки `PARALLEL_READER_VERSE_CITATION`: ЗАКРИТО ДЛЯ ПОВТОРНОЇ РОЗРОБКИ / `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.** Existing reader UI, verified second-edition rights and author-attributed clipboard citations merged as [PR #695](https://github.com/Oleksii-debug/scripture-archive/pull/695) → exact `main@50cef1bd98d25f34bc204b6d4c8bb43903ac05d5`. Exact-head [Actions #41057070238](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41057070238) **SUCCESS**: Node **1806 PASS/0 FAIL/1 SKIP**, Worker/D1 **22/22 PASS**, TS/lint/build, Python **2 PASS**. Readback of exact merged source/test blobs completed; `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0` **only for this feature**. [Canonical terminal receipt](SA_EXT_01_PARALLEL_VERSE_CITATION_TERMINAL_20261030.md). **All 20 SA-EXT-01…20 parent sections stay OPEN**; live Sites SHA, production/privacy cutover, Chrome/Windows/NVDA and delivery are NOT_VERIFIED. No deploy.

---

## 2026-10-30 — SA-EXT-02 / ATTEMPT_HISTORY_SCORE_FAILCLOSED — ВУЗЬКИЙ TERMINAL

**CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** тільки для гарантії правдивих балів у приватній історії завершених місій. [PR #694](https://github.com/Oleksii-debug/scripture-archive/pull/694) **MERGED** `main@e9d14c5722c4206201ce81a28c6dd079d98a732d`; [exact-head CI #41056643516](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41056643516) **SUCCESS** (Node, TS, lint, build, disposable Worker/D1, Python). Реальний `GET /api/attempts?action=history` тепер відхиляє 10 класів пошкоджених score/total без фальшивого успіху, модифікації D1 або витоку іншого користувача. [Офіційний receipt](SA_EXT_02_ATTEMPT_HISTORY_SCORE_TERMINAL_20261030.md). `remaining_scoped_implementation=0`; `necessary_unmerged_PRs=0` для підфункції. **Весь SA-EXT-02 та всі 20 SA-EXT батьківських розділів OPEN**; фактичний сайт/NVDA та реліз окремі й не підтверджені. Жодного деплою.

---

## 2026-10-30 — SA-EXT-16 / CONSENT_CUTOVER_READONLY_PREFLIGHT — SCOPED TERMINAL

**РОЗДІЛ SA-EXT-16, тільки підпункт `CONSENT_CUTOVER_READONLY_PREFLIGHT`: ЗАКРИТО / `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.** `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. [PR #692](https://github.com/Oleksii-debug/scripture-archive/pull/692) **SQUASH MERGED** у `main@35dd1e7a252bb8345bb93faf05be355a79b3e0d8`. Exact-head [Actions #41056322891](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41056322891) **SUCCESS** (Node 1769 PASS/0 FAIL/1 SKIP, Worker/D1 22/22, TS/lint/build, Python 2 PASS). Збережено єдиний існуючий SQL consent authority; локальний SQLite snapshot читається тільки read-only, детектуються застарілі `public_church` після 0010, не друкується приватна інформація. [Повна машинно-відтворювана квитанція](SA_EXT_16_CONSENT_CUTOVER_READONLY_PREFLIGHT_SCOPED_TERMINAL_20261030.md). **Усі 20 повних батьківських SA-EXT-01…20 залишаються OPEN**; production cutover [#689](https://github.com/Oleksii-debug/scripture-archive/issues/689), Sites SHA/SMTP/browser/NVDA не підтверджено, жодного deployment не виконано.

---

## 2026-10-30 — SA-EXT-01 / PROGRESS_EXPORT_METADATA_FAILCLOSED — SCOPED TERMINAL

**CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** only for rejecting missing, typed-invalid or blank saved-progress mission IDs and update times in the canonical private export route. [PR #685](https://github.com/Oleksii-debug/scripture-archive/pull/685) **SQUASH MERGED** to exact `main@252e637a7993488cbc1be218d96cd8d2d15e93e2`. [Exact-head CI #41055352814](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41055352814) **SUCCESS**: native Node, TS, lint, build, disposable Worker/D1, Python. The repaired route and tests were read back from merged main; no necessary unmerged PR or remaining implementation for this narrow defect. [Full terminal receipt](SA_EXT_01_PROGRESS_EXPORT_METADATA_TERMINAL_20261030.md). **Parent SA-EXT-01 and all 20 complete SA-EXT sections remain OPEN**; production, browser/NVDA and translation rights not qualified. No deploy.

---

## 2026-10-30 — SA-EXT-16 / ANALYTICS HEARTBEAT + CROSS-TAB PRIVACY — ДВА ВУЗЬКІ ПІДПУНКТИ ЗАКРИТО

**CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** для двох існуючих аналітичних підфункцій: типізовані секунди heartbeat до D1 (PR #682, main `0a435927dea7d775f9dbbc83d37845dba7e8245c`) та припинення аналітики при відмові/очищенні згоди в іншій вкладці разом зі строгим UUIDv4 (PR #684, main `4f421d55733317240fd6852b8ae57e7fe41242c4`). Обидва exact-head GitHub Actions **SUCCESS** ([#41054897534](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41054897534), [#41055186846](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41055186846)); canonical source/test readback з `main` PASS. Для цих двох scoped-дефектів `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`; нову роботу лише за доведеного дефекту. **Всі 20 батьківських SA-EXT-01…20, включно з SA-EXT-16, залишаються OPEN; live Sites/SMTP/браузерний/фізичний NVDA реліз не перевірений.** [Повний terminal receipt](SA_EXT_16_ANALYTICS_SCOPED_TERMINAL_20261030.md).

---

## 2026-10-30 — SA-EXT-03 / ADMIN_CONTENT_READ_D1_ACK — ВУЗЬКЕ ЗАКРИТТЯ

**CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** лише для owner CMS GET read receipt. [PR #683](https://github.com/Oleksii-debug/scripture-archive/pull/683) SQUASH MERGED у exact `main@4eb14c499e11cf5521adf6b2b1088f53beb3b71c`. [CI #41055178927](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41055178927) **SUCCESS**: Node 1749 PASS / 0 FAIL / 1 SKIP; Worker/D1 22/22; TypeScript/lint/build, Python 2/2. Тепер admin GET не маскує failed/malformed D1 SELECT під 200 із порожньою редакторською історією; 10 нових route-testing сценаріїв. [Terminal receipt](SA_EXT_03_ADMIN_CONTENT_READ_ACK_TERMINAL_20261030.md); [handoff першої п'ятірки відкритих parent](SA_EXT_CONVERGENCE_HANDOFF_20261030_3_TERMINALS.md). **Весь SA-EXT-03 і решта 20 великих SA-EXT-01…20 OPEN; live Sites, SMTP, Chrome/NVDA НЕ підтверджено.** Деплой не запускався.

---

## 2026-10-30 — SA-EXT-02 / STORED_ATTEMPT_LOCALE_FAILCLOSED — ВУЗЬКЕ ЗАКРИТТЯ

**CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** тільки для захисту GET/POST/finalize від пошкодженого persisted locale у D1. [PR #676](https://github.com/Oleksii-debug/scripture-archive/pull/676) SQUASH MERGED, exact `main@f83954934c8b53f6664fa48a57b51c27600c3d9f`. [CI #41054194991](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41054194991) **SUCCESS**: Node 1738 PASS / 0 FAIL / 1 SKIP, Worker/D1 22/22, TS/lint/build, Python 2/2. **48** real-route locale integrity cases: 15 bad stored locale variants × GET/answer/finalize та 3 valid. Результат: HTTP 409 без частково локалізованого task або grading write, valid uk/ru/en збережені. [Остаточний terminal receipt](SA_EXT_02_STORED_ATTEMPT_LOCALE_TERMINAL_20261030.md). **Батьківський SA-EXT-02 і всі 20 повних SA-EXT-01…20 OPEN**, live Sites SMTP browser/NVDA НЕ ВЕРИФІКОВАНІ; жодного деплою.

---

## 2026-10-30 — SA-EXT-03 / MATERIAL_DRAFT_UPSERT_ACK_BOUND — ВУЗЬКЕ ЗАКРИТТЯ

**CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** лише для точного D1 підтвердження чернеткового UPSERT, `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. [PR #671](https://github.com/Oleksii-debug/scripture-archive/pull/671) SQUASH MERGED `main@b0b2fbcd04e04461f84846d13b8992d13b64ce4d`, exact-head [Actions #41053959435](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41053959435) **SUCCESS**. Повторний Worker/D1 виявив, що `ON DELETE CASCADE` законно збільшує `total_changes`; кандидат виправлено до merge, strict `changes<=1` діє тільки для UPSERT. **Повний SA-EXT-03 та решта 20 батьківських SA-EXT-01…20 залишаються OPEN**. [Остаточний запис](SA_EXT_03_MATERIAL_UPSERT_ACK_TERMINAL_20261030.md). Сайт/NVDA/продукційна БД не прийняті.

---

## 2026-10-30 — SA-EXT-16 / RESET_MAIL_DELIVERY_COPY — SCOPED TERMINAL

**ЗАКРИТО ДЛЯ ПОВТОРНОЇ РОЗРОБКИ лише вузький дефект повідомлення відновлення пароля**, `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`: після `forgot-password` реальний `renderAccount` у UK/RU/EN більше не обіцяє доставку без підтвердження провайдера. [Feature PR #675](https://github.com/Oleksii-debug/scripture-archive/pull/675) **MERGED** в `main@6ecbf2260d5463a585e77ec8b3b58aa6aa57d3c7`. [Exact-head Actions #41053883269](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41053883269) **SUCCESS**: 1681 Node PASS/0 FAIL/1 SKIP, Worker/D1 22/22, TS/lint/build PASS, pytest 2/2 PASS. [Термінальний запис](SA_EXT_16_PASSWORD_RESET_MAIL_COPY_TERMINAL_20261030.md). **Усі батьківські 20 розділів SA-EXT-01…20 залишаються OPEN**; production, live browser, NVDA і реальна доставка пошти не перевірені. Немає незлитих PR для цієї підфункції.

---

## 2026-10-30 — SA-EXT-01 / READING_EXPORT_CANONICAL_TITLE_BOUNDARY — ВУЗЬКИЙ ДЕФЕКТ ЗАКРИТО

**CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** лише для експорту збереженої READING-історії: назва понад 100 символів більше не стає фальшивим restorable JSON-архівом. [PR #670](https://github.com/Oleksii-debug/scripture-archive/pull/670) SQUASH MERGED у точний `main@4cb564da6b705b1296e552c20ca8e2b7ade4f78f`. [CI #41053249167](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41053249167) **SUCCESS**: Node 1681 PASS/0 FAIL/1 SKIP, disposable Worker/D1 22/22, TypeScript/lint/build, Python 2/2. Реальна кодова інтеграція та exact-main readback підтверджені. [Повний термінальний запис](SA_EXT_01_READING_EXPORT_TITLE_BOUNDARY_TERMINAL_20261030.md). **Увесь батьківський SA-EXT-01 та всі SA-EXT-01…20 залишаються OPEN**; production Sites/SMTP/браузер/Windows/NVDA — NOT_VERIFIED. Ця документальна позначка не санкціонує деплой.

---

## 2026-10-30 — SA-EXT-04 / GROUP_SETTINGS_EDIT — ВУЗЬКА ПІДФУНКЦІЯ ЗАКРИТА

**CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** — тільки власницьке редагування налаштувань наявної домашньої групи; `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. [PR #668](https://github.com/Oleksii-debug/scripture-archive/pull/668) **SQUASH MERGED** у `main@ceffa24ff8b4fcbc3cd6ff17aa6810d02b986a3e`; exact-head [Actions #41052811616](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41052811616) **SUCCESS**: Node 1656 PASS / 1 SKIP, TS/lint/build, Worker/D1 22/22, Python 2/2. Існуючі UI та API підтримують повне редагування метаданих, CAS/owner право, підтвердження публікації, збереження чернетки, consent-фільтр і focus/readback. **Повний SA-EXT-04 та решта 20 SA-EXT-01…20 — OPEN**; Sites SHA/SMTP/браузер/NVDA НЕ ПІДТВЕРДЖЕНО. [Остаточний доказовий запис](SA_EXT_04_GROUP_SETTINGS_TERMINAL_20261030.md).

---

## 2026-10-30 — SA-EXT-02 / ATTEMPT_LOCALE_TYPED_INPUT — ВУЗЬКИЙ ДЕФЕКТ ЗАКРИТО

**CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** лише для типізованої мови POST створення навчальної спроби. [PR #666](https://github.com/Oleksii-debug/scripture-archive/pull/666) SQUASH MERGED у `main@cec6d59302e1a5bac1857591589986c3dff48e5f`; exact-head [Actions #41052618856](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41052618856) **SUCCESS**: Node 1662 PASS/0 FAIL/1 SKIP, Worker/D1 22/22, TypeScript/lint/build, Python 2/2. Модуль місій більше не підміняє нестроковий JSON `locale` на українську, а відхиляє 400 до D1; збережено default UK і діючі uk/ru/en. `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`; **усі 20 батьківських розділів SA-EXT-01…20 залишаються OPEN**, site SHA/фізичний NVDA не перевірено. [Термінальний запис](SA_EXT_02_ATTEMPT_LOCALE_TYPED_TERMINAL_20261030.md), центральна координація #297.

---

## 2026-10-30 — SA-EXT-01 / DAMAGED_BOOKMARK_RECOVERY — ВУЗЬКЕ ЗАКРИТТЯ

**Статус лише цієї підтвердженої функції:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`, `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. [PR #661](https://github.com/Oleksii-debug/scripture-archive/pull/661) **MERGED**, exact feature `main@f7e13981f7529e57e9c96cd89dfe8ac3dce221f5`; приватне відновлення пошкоджених закладок читача має обмежений текстовий список, індивідуальне підтвердження, owner- і row-bound DELETE та перевірки D1 ACK/конкурентних змін. Exact-head [Actions #41051249744](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41051249744) **SUCCESS**: 1644 Node PASS/1 SKIP, Worker/D1 22/22 PASS, TypeScript/lint/build PASS, Python 2/2 PASS. **Жоден із 20 повних батьківських SA-EXT-01…20 розділів цим не закрито**; live Sites SHA, браузер, Windows/NVDA NOT_VERIFIED. [Термінальний запис](SA_EXT_01_DAMAGED_BOOKMARK_RECOVERY_TERMINAL_20261030.md), issue [#658](https://github.com/Oleksii-debug/scripture-archive/issues/658), координація #297.

---

## 2026-10-30 — SA-EXT-16 / LOCAL_WRANGLER_REJECTED_ORIGIN_BODY_FENCE — ВУЗЬКИЙ CI-ДЕФЕКТ ЗАКРИТО

**CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** тільки для доведеної тестової послідовності раннього cross-origin 403 з непрочитаним JSON body і наступного локального Wrangler 503; `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. [PR #654](https://github.com/Oleksii-debug/scripture-archive/pull/654), [#657](https://github.com/Oleksii-debug/scripture-archive/pull/657), [#659](https://github.com/Oleksii-debug/scripture-archive/pull/659) **усі SQUASH MERGED**; кінцевий інтеграційний `main@22c3adeeeadb751ade9987c78d31251758645bf8`. На exact #659 HEAD [Actions #41048793211](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41048793211): **3 незалежні успішні повні cold runs**, кожен Node **1610 PASS / 0 FAIL / 1 SKIP**, реальний локальний Worker/D1 **22/22 PASS**, TS/lint/build та Python 2/2 PASS. Додані real-route регресії з повним cross-origin JSON і незмінним 403 до auth/D1; жодного POST/PUT retry. **Загальний розділ SA-EXT-16 та всі 20 батьківських SA-EXT-01…20 залишаються OPEN; production Sites SHA/SMTP/Windows/NVDA не підтверджено.** [Повний технічний термінальний запис](SA_EXT_16_LOCAL_WRANGLER_REJECTED_ORIGIN_BODY_FENCE_TERMINAL_20261030.md), [CI-завдання #618](https://github.com/Oleksii-debug/scripture-archive/issues/618), [координація #297](https://github.com/Oleksii-debug/scripture-archive/issues/297).

---

## 2026-10-30 — SA-EXT-16 / SOURCE_QUALITY_CONFIG_ONLY_COVERAGE — ВУЗЬКИЙ CI-ЗАПОБІЖНИК ЗАКРИТО

**CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** лише для запуску source-quality при змінах кореневих build/security/test-конфігурацій. [PR #655](https://github.com/Oleksii-debug/scripture-archive/pull/655) SQUASH MERGED `main@84359d113a8d9c6183f74d5eb366bcb209980131`; native **1608 Node PASS**, TS/lint/build і Python PASS; **overall CI FAIL** у незалежному Wrangler/D1 HTTP 503 21/22 ([#618](https://github.com/Oleksii-debug/scripture-archive/issues/618)). Усі 20 повних батьківських SA-EXT-01–20 **OPEN**; site SHA/browser/NVDA NOT_VERIFIED. [Повний термінальний запис](SA_EXT_16_SOURCE_QUALITY_CONFIG_ONLY_COVERAGE_TERMINAL_20261030.md).

---

## 2026-10-30 — SA-EXT-16 / CONSENT_WITHDRAWAL_WITH_STALE_METADATA та SA-EXT-01 / PROFILE_LOCALE_TYPED_BOUNDARY — ДВА ВУЗЬКІ ПІДПУНКТИ ЗАКРИТО

**Лише ці два перевірені source-виправлення:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`, `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. **Повні батьківські SA-EXT-01…20 залишаються OPEN.**

- **SA-EXT-16:** [PR #647](https://github.com/Oleksii-debug/scripture-archive/pull/647) SQUASH MERGED `main@a947ac31b40e937fca73d9c602a9d4707010731f`, збережено право відкликати sensitive-consent, навіть коли застарілі metadata мають некоректний тип/довжину. Нова перевірка typed/oversized полів лише при accept=true; **19 native route-executing tests** `tests/account-write-receipts.test.mjs@51d828c4f231e50a223e4947142969fe859ce501`. [CI #41044241339](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41044241339): Node 1569 PASS/0 FAIL/1 SKIP, TS/lint/build/Python PASS; overall FAIL через незалежний Wrangler/D1 HTTP 503 21/22.
- **SA-EXT-01:** [PR #651](https://github.com/Oleksii-debug/scripture-archive/pull/651) SQUASH MERGED `main@eddd3b0ccb9e4d79720f846e69f72e3567365ba3`, явні JSON-array/object/number/boolean locale відхиляються приватним 400 до D1, **не змінюючи** канонічний SA10 fallback невідомого *текстового* `de/fr/sk` на UK. `app/api/account/route.ts@4ad13a82b95c2f52b9bcaff24174174a3a1ad360`; 22 real-route tests `tests/account-profile-locale-strict.test.mjs@b9d74c045049d18c98037179347da05502618e1d`. [CI #41044921126](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41044921126): Node 1600 PASS/0 FAIL/1 SKIP, TS/lint/build/Python PASS; overall FAIL через незалежний Wrangler/D1 HTTP 503 21/22.

**Відомий release blocker** [#618](https://github.com/Oleksii-debug/scripture-archive/issues/618), фактичний site SHA, повний E2E, браузер, Windows/NVDA, production D1, пошта/DNS та всі батьківські розділи **OPEN / NOT_VERIFIED**. [Повний доказовий запис](SA_EXT_01_16_CONSENT_LOCALE_FOLLOWUP_TERMINAL_20261030.md), координація [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297#issuecomment-6521107672).

---

## 2026-10-30 — SA-EXT-04 / GROUP_CREATE_EDITION_TYPED_INPUT — ЗАКРИТО ВУЗЬКИЙ ДЕФЕКТ

**CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL**, `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0` лише для відхилення хибно типізованих явно обраних видань Біблії під час створення домашньої групи. [PR #646](https://github.com/Oleksii-debug/scripture-archive/pull/646) SQUASH MERGED `main@b163f5e637d71b0908ca05459127c982e37016da`; існуючий `app/api/groups/route.ts@d99dd08ddf02d037e9d1b53aa900cba8e1baac35` відхиляє типи `array/boolean/number/object` (400 до D1), не підміняє вибір на `uk-ohiienko`, а пропущене/null/порожнє зберігає законний default. Дев'ять regression cases у `tests/groups-numeric-input-boundary.test.mjs@28ff59fc81c67311d7ea93ce6119bb0bc3c454fc`. Exact-head [CI #41044060725](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41044060725): Node **1559 PASS/0 FAIL/1 SKIP**, TS/lint/build/Python PASS; overall CI **FAIL** лише в окремому Wrangler Worker/D1 `POST /api/material-review` 503, 21/22, [#618](https://github.com/Oleksii-debug/scripture-archive/issues/618). **Повний SA-EXT-04 і всі 20 батьківських розділів залишаються OPEN**; site SHA/browser/Windows/NVDA NOT_VERIFIED. [Термінальний запис](SA_EXT_04_GROUP_CREATE_EDITION_TYPED_INPUT_TERMINAL_20261030.md).

---

## 2026-10-30 — SA-EXT-01/16 / ACCOUNT_PROFILE_AND_CONSENT_LOSSLESS — ВУЗЬКИЙ ПІДПУНКТ ЗАКРИТО

**Тільки цей встановлений source-дефект**: `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`, `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`; **усі повні SA-EXT-01…20 залишаються OPEN**. [PR #644](https://github.com/Oleksii-debug/scripture-archive/pull/644) **SQUASH MERGED** `main@829852b7ab4fb15f7b8fa8900fc1f27b64359354`; canonical `app/api/account/route.ts` blob `0fa931d594cfceac70153ef036a457fcc413fbc8`, новий 13-case route test `tests/account-profile-lossless.test.mjs` blob `c2b4d17175609af837baddede926a4a8afb7104e`. Збережено точні імена/локалі/чутливі поля профілю без тихого обрізання перед D1, помилки довжини -> приватний 400 без запису; valid Unicode/trim/boundary -> звичайний D1.

[Actions #41043710457](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41043710457): **Node 1548 PASS / 0 FAIL / 1 SKIP**, TS/lint/build і Python 2 PASS. **Overall CI FAIL**: відомий окремий Wrangler/D1 `POST /api/material-review` 503 restart, disposable **21/22** ([#618](https://github.com/Oleksii-debug/scripture-archive/issues/618)). Реальний Cloudflare Sites SHA, браузер, Windows/NVDA, продакшн D1 та повні батьківські розділи **NOT_VERIFIED / OPEN**. [Доказовий термінальний запис](SA_EXT_01_16_ACCOUNT_PROFILE_LOSSLESS_TERMINAL_20261030.md). Не повторювати цю вузьку реалізацію без нової відтвореної регресії.

---

## 2026-10-30 — SA-EXT-04 / GROUP_CREATE_AUTHORED_TEXT_LOSSLESS — ВУЗЬКИЙ ДЕФЕКТ ЗАКРИТО

**CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL**, `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0` лише для втрати введених користувачем полів під час створення домашньої групи. [PR #641](https://github.com/Oleksii-debug/scripture-archive/pull/641) **SQUASH MERGED** `main@1542ed737a39ad2710021ae380af18ad00f39bb1`; `app/api/groups/route.ts` (blob `d8c653cfb2f25c0cc775716305755177506951ce`) перевіряє name/church/country/city/description до D1, замість тихого обрізання, із регресіями `tests/groups-numeric-input-boundary.test.mjs@eb1c59386e0190db53e0c6fa2e98fde20d32b1f6`. Exact PR-head [CI #41042546145](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41042546145) **SUCCESS**: native Node 1517 PASS/0 FAIL/1 SKIP, Worker/D1 22/22 PASS, Python 2 PASS, TS/lint/build PASS. **Повні всі 20 SA-EXT parent sections залишаються OPEN**; deployed Sites SHA, браузер, Windows/NVDA не підтверджено. [Доказовий запис](SA_EXT_04_GROUP_CREATE_AUTHORED_TEXT_LOSSLESS_TERMINAL_20261030.md).

---

## 2026-10-30 — SA-EXT-03 / CMS_ITEM_TITLE_EXACT_BOUNDARY — ЗАКРИТО ВУЗЬКИЙ ДЕФЕКТ

**CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL**, `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0` лише для точного редакційного заголовка; **батьківський SA-EXT-03 та всі SA-EXT-01…20 залишаються OPEN**. Реальний owner CMS раніше обрізав `title` на 200 UTF-16 одиницях із хибним HTTP 200; тепер понад 200 відхиляється до D1, правильний текст на межі записується точно. [PR #635](https://github.com/Oleksii-debug/scripture-archive/pull/635) squash merged `main@21bac597223107bf1fd153c5745e309a5f6f2816`; actual source/test blobs `58041c2ce0070c1b5bc9326a07864e26583b41fb` / `3c718b6708c80da89b557cd759da2826666f761a`. CI #41040738618: Node 1498 PASS, 1 SKIP, TS/lint/build, Python 2 PASS; повний E2E FAIL 21/22 двічі — відомий незалежний Wrangler/D1 restart HTTP 503, #618. Production/browser/Windows/NVDA NOT_VERIFIED. [Повний terminal receipt](SA_EXT_03_CMS_ITEM_TITLE_EXACT_TERMINAL_20261030.md). Реліз/інші розділи не закрито.

---

## 2026-10-30 — SA-EXT-01/02 / READING_RECEIPT_TITLE_LOSSLESS — ВУЗЬКИЙ ПІДПУНКТ ЗАКРИТО

**CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** для цього дефекту, `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`; **усі 20 повних SA-EXT-01…20 залишаються OPEN**.

- Реальний дефект: account `PUT?action=reading` мовчки обрізав 101+ символів приватної назви прочитаної глави до 100 і віддавав успішний D1 ACK.
- [PR #634](https://github.com/Oleksii-debug/scripture-archive/pull/634) **MERGED**, source `main@9155350dabb4811a0a3d58ebdf0b7e5b461f50bb`; source blob `dfff30fbe4d93a802e8b1e633fa91c1e781f010a`, tests blob `560897725df121cbeda298c929cec0b1ff5b0103`. Нормалізована довга назва → `400 invalid_reading`, 0 D1 writes; рівно 100 і законний trim зберігаються повністю.
- [Actions #41040586805](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41040586805), exact HEAD `33c6a7b0ecfb251fc40193714072bf118c567a12`: **SUCCESS**, `1490 Node PASS/0 FAIL/1 SKIP`, TypeScript/lint/build PASS, disposable Worker/D1 `22/22 PASS`, Python `2 PASS`. Це не live browser/NVDA/production Sites acceptance; загальна флейковість #618 не оголошена вирішеною.
- [Детальний термінальний запис](SA_EXT_01_READING_TITLE_LOSSLESS_TERMINAL_20261030.md). Не повторювати без нового фактичного дефекту; parent SA-EXT-01/02 OPEN.

---

## 2026-10-30 — SA-EXT-03 / REVIEW_NOTE_LOSSLESS — ВУЗЬКИЙ ПІДПУНКТ ЗАКРИТО

**CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** лише цього дефекту, `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`; **повний SA-EXT-03 та всі SA-EXT-01…20 залишаються OPEN**.

- Реальний дефект: `POST /api/material-review` на review мовчки обрізав рішення редактора понад 2000 символів, записував часткову причину та повертав `ok:true`.
- [PR #633](https://github.com/Oleksii-debug/scripture-archive/pull/633) **MERGED**, source `main@16d27d8b2a148a3f1862d0ce098ee7f08c19662f`; canonical source blob `90fe7d143d039e5fefe4eb7fba813a174268bec3`, real-route SQLite test blob `cdb8088ee01882d4f413a010ec2afc639e726a52`. Довга причина → HTTP 400 до D1, точна межа/Unicode/trim зберігаються.
- [Actions #41040325955](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41040325955): `1492 Node PASS/0 FAIL/1 SKIP`, TS/lint/build, Python `2 PASS`; загалом CI **FAIL** лише через окремий disposable Worker/D1 21/22 двічі (HTTP 503; #618). Ні full E2E, ні production, ні NVDA не оголошені PASS.
- [Детальний термінальний запис](SA_EXT_03_REVIEW_NOTE_LOSSLESS_TERMINAL_20261030.md). Parent SA-EXT-03 OPEN; не повторювати вузький дефект без нової регресії.

---

## 2026-10-30 — SA-EXT-03 / CMS_PUBLIC_NOTE_LOSSLESS — ВУЗЬКИЙ ПІДПУНКТ ЗАКРИТО

**CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** для перевіреного дефекту, `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. **Батьківський SA-EXT-03 і всі SA-EXT-01…20 залишаються OPEN**.

- Реальний дефект: `PUT /api/content` після власницької перевірки мовчки обрізав поле `liveNote.uk/ru/en` довше за 600 символів, записував інше повідомлення у D1 і повертав `ok:true`.
- Виправлення: [PR #628](https://github.com/Oleksii-debug/scripture-archive/pull/628) **MERGED**, точний feature `main@22bab7c4530699be2bc37b5f51fffc571138657f`; перевірено source blob `989f9a058876101f77d05f8b2eb3d5fe05533174`, тест blob `63f325af981e121880ee069773adc613bdcfe6ee`. Тепер три рядки перевіряються по повній нормалізованій довжині, завеликий текст → 400 без D1 write, точна межа 600 та три порожні поля збережені.
- Native [Actions #41039537700](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41039537700): `1486 Node PASS / 0 FAIL / 1 SKIP`, TypeScript/lint/build PASS, Python `2 PASS`; загалом CI **FAIL**, disposable Worker/D1 `21/22` двічі через відомий Wrangler 503 на незалежному редакторському POST, релізний блокер [#618](https://github.com/Oleksii-debug/scripture-archive/issues/618). Це **не** повна E2E/production/NVDA приймання.
- [Остаточний доказовий запис](SA_EXT_03_CMS_PUBLIC_NOTE_LOSSLESS_TERMINAL_20261030.md). Не відкривати цю вузьку функцію без нового дефекту; не вважати весь SA-EXT-03 або сайт завершеним.

---

## 2026-10-30 — SA-EXT-01/16 / BOOKMARK_GET_INVALID_ROW_FAILCLOSED — ЗАКРИТО ДЛЯ РОЗРОБКИ ВУЗЬКИЙ ДЕФЕКТ

**Лише цей встановлений дефект:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`, `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. **Повні батьківські SA-EXT-01…20 залишаються OPEN**; статус не є фактичним production / браузерним / NVDA прийманням.

- **Відтворений дефект у канонічному інтерфейсі закладок:** `GET /api/bookmarks` на `D1 all().success===true` без перевірки рядків повертав HTTP 200 із неіснуючим виданням, книгами, неможливими главами, відсутньою датою. Це не відповідало вже завершеним перевіркам `PUT /api/bookmarks` і створювало оманливу збережену навігацію.
- **Реалізація та інтеграція:** [PR #627](https://github.com/Oleksii-debug/scripture-archive/pull/627) SQUASH MERGED в exact `main@222abe74418f737c6e792f99ab431692eb6975fe`. Перевірено поточні main blobs `app/api/bookmarks/route.ts@25f4989275b5f94ef6dc6229ace8fc22f8f007af`, `tests/bookmarks-read-errors.test.mjs@971efbf385a156352a7eb76bf0d0fd6deee6a36a`, `tests/bookmark-auth-availability.test.mjs@faf9c622042f92a0c084e6324eda9219cb8e887a`. Повторно використано існуючі валідатори `valid`, `LOCAL_EDITION_IDS`, `bookChapterLimit` (включно з Ohiienko `JOL:4`), без дублювання БД чи API; пошкоджений D1 рядок -> private GET 503 без ілюзії наявних закладок. Legacy `DELETE` очищення збережено.
- **Фактична CI:** перша [Actions #41039000252](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41039000252) виявила застарілу позитивну fixture `edition=en` без timestamp (1 Node fail). Оновлена test fixture без послаблення валідатора. Наступна [Actions #41039141197](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41039141197): **1482 Node PASS / 0 FAIL / 1 SKIP**, але TypeScript виявив unsafe cast (TS2352); виправлено narrowed local `createdAt`. Фінальна exact PR head `a74721468f27d51f676099afd2267cb6995e2731`, [Actions #41039303238](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41039303238): **1482 Node PASS / 0 FAIL / 1 SKIP**, TypeScript/lint/source build/Python 2/2 PASS. Загальний CI **FAIL** на старому disposable Worker/D1 restart `tests/api-flow.test.mjs` `Your worker restarted mid-request` HTTP503 двічі. Повний E2E **NOT VERIFIED**.
- **Залишок:** для цього вузького source-дефекту 0 реалізаційних завдань і необхідних незлитих PR; release, реальний Sites SHA/браузер/NVDA та всі 20 повних parent sections не прийняті. Повторна розробка тільки при новому конкретному дефекті. Координація [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297).

---

## 2026-10-30 — SA-EXT-04 / GROUP_MEETING_EXACT_DATE_REFLECTION — РОЗРОБКУ ВУЗЬКОГО ДЕФЕКТУ ЗАКРИТО

**Лише цей вузький компонент:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`, `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. Повний SA-EXT-04 та решта **SA-EXT-01…20 OPEN**.

- **Доведена помилка:** `POST /api/groups?action=session` раніше виконував `clean(body.meetingDate,10)` та `clean(body.reflection,1200)`, перетворюючи некоректну дату із суфіксом/новим рядком на іншу календарну дату та обрізаючи приватний підсумок зустрічі перед записом у D1.
- **Функціональна інтеграція:** [PR #624](https://github.com/Oleksii-debug/scripture-archive/pull/624) **SQUASH MERGED** `main@0046f5a1b5f1f3073d8b1ee7627be077094235eb`; `app/api/groups/route.ts@78e28d50e7b07bf75ae0a837b815174e148931f2`, `tests/groups-numeric-input-boundary.test.mjs@1444f5f910f124a33b18a5239af8fdcc817988bc`. Валідується повна дата, рядки підсумку понад 1200 відхиляються до SQL, законний 1200-символьний приватний текст зберігається точно; права власника/ведучого, марафон і канонічні таблиці незмінні.
- **Native tests:** [Actions #41038440157](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41038440157) на exact HEAD `a3cc73fd22d95008871d9b5e246c4a9f6a10f1d2`: **1480 Node PASS, 0 FAIL / 1 SKIP**, TS/lint/build PASS; **цілий workflow FAIL** через інший disposable Wrangler Worker/D1 `Your worker restarted mid-request`, 503, **21/22 двічі**. Python SKIPPED. Production і фізичний NVDA НЕ ПЕРЕВІРЕНО.
- **Receipt:** [SA_EXT_04_GROUP_MEETING_EXACT_DATE_REFLECTION_TERMINAL_2026-10-30.md](SA_EXT_04_GROUP_MEETING_EXACT_DATE_REFLECTION_TERMINAL_2026-10-30.md). [Координація #297](https://github.com/Oleksii-debug/scripture-archive/issues/297). Нового релізу, мов, окремих сервісів не створювали.

---

## 2026-10-30 — SA-EXT-01/16 / PRIVATE_BOOKMARK_EXPORT_EDITION_INTEGRITY — ЗАКРИТО ВУЗЬКИЙ ПІДПУНКТ

**`CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`**, `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. Тільки ця верифікована функція, **не всі SA-EXT-01…20**; усі батьківські розділи залишаються **OPEN**.

- **Справжній дефект:** приватний `GET /api/reading-export` після позитивного D1 batch ACK віддавав недійсні bookmark rows як успішний download: вигадані/нелокальні видання, неіснуючі книги, некоректні глави, зокрема `en-web:JOL:4`, а також зіпсовану дату. Це не відповідало канонічному `PUT /api/bookmarks`.
- **Функціонал у канонічному main:** [PR #623](https://github.com/Oleksii-debug/scripture-archive/pull/623) SQUASH MERGED `main@7a1e1fbd48858131d8bb0c1a110dd11114613452`. `app/api/reading-export/route.ts` blob `174562ec66e74030dace7cfc9dda4e64c7adfb09`, existing `tests/reading-export-batch-ack.test.mjs` blob `44b3109efae2fc5f8d04a4889bb94ba33d68e9d6` read back from main. Спільний `public/editions.js` та `catalog.json` обмежують тільки локальні видання і глави *свого* видання; коректний `uk-ohiienko:JOL:4` зберігається, `en-web:JOL:4` відхиляється. На некоректну відповідь D1 повертається приватний 503 без фальшивого downloadable backup; жодних міграцій/другого сервера/зміни прав/деплою.
- **Тестування:** [Actions #41038187087](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41038187087), exact source PR head `dfbf63efa9c003ed6370f937f31f54f7be442b1a`: **1434 native Node PASS, 0 FAIL, 1 SKIP**, включно з новими 14 malformed bookmark scenarios та позитивним багатовиданням. TypeScript, lint, source build, Python 2/2 PASS. **Загальний workflow FAIL** виключно через незалежний disposable Worker/D1 `tests/api-flow.test.mjs:100/120`, двічі HTTP 503 `Your worker restarted mid-request` замість 403/400. Повний браузерний E2E, фактичний Sites SHA, фізичний NVDA й production D1 **NOT VERIFIED**.
- **Остаточне рішення лише для дефекту:** розробка цього scoped підпункту завершена, нові джерельні задачі = 0. Суміжні #619/#621 completed-attempt export already separately closed. Повні розділи, release і операційні acceptance-гейти лишаються OPEN; без конкретного нового дефекту цей scoped код не розробляти повторно. Зв'язок [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297).

---

## 2026-10-30 — SA-EXT-03/14 / MATERIAL_LOCALE_TYPED_BOUNDARY — РОЗРОБКУ ВУЗЬКОЇ ФУНКЦІЇ ЗАКРИТО

**Лише цей конкретний integrity-fix:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`; `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. **Повні SA-EXT-03/14 та інші SA-EXT-01…20 залишаються OPEN.**

- **Помилка:** канонічний `POST /api/materials` з `String(body.locale)` перетворював JSON-масив `["en"]` на англійську локаль, а будь-яку явно вказану, проте непідтримувану мову `sk`, `en-US` тощо мовчки записував як `uk`. Це змінювало мовну атрибуцію авторського уроку, який надалі проходить редакторську перевірку.
- **Інтеграція:** [PR #622](https://github.com/Oleksii-debug/scripture-archive/pull/622) **SQUASH MERGED** у `main@dd20becc0f6ce970ebf533bdcc44c3d25469bb20`, `app/api/materials/route.ts` blob `04c3f03660452819ce200c4a6ede28f1a51d5eca`. Введена локаль приймається лише як точний рядок `uk/ru/en`; явно помилкові об'єкти/масиви/невідомі мовні коди дають HTTP 400 **до** D1 UPSERT. Відсутнє/`null`/порожнє стандартне HTML-поле лишається `uk`, приватність і editorial approval не змінюються. Це **не** запуск 82 перекладів і **не** створення недозволеного корпусу.
- **Перевірки:** `tests/materials-d1-ack.test.mjs` blob `bce642f1914d76f91642dbed86b876371ca8d2d3`, справжній transpiled TS material POST + SQLite: **30 некоректних + 6 чинних/дефолтних сценаріїв** з перевіркою, що невірні локалі не створюють урок і дозволені зберігають точний `locale` та `private`. Exact-head [Actions #41038056499](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41038056499): native Node, TypeScript, lint, source build, Python **PASS**; загальний CI **FAIL** у незалежному disposable Wrangler Worker/D1 restart (див. центральний #297), тому не називати E2E green.
- **Не завершено:** весь multi-language corpus/rights, повна редакторська функціональність SA-EXT-03/14, live site SHA, фізичний NVDA, owner approval, деплой. Немає неприйнятого релізу або нових сервісів. Координація [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297).

---

## 2026-10-30 — SA-EXT-16 / HELP_RAW_FIELD_TRUNCATION — РОЗРОБКУ ВУЗЬКОГО ДЕФЕКТУ ЗАКРИТО

**Лише цей дефект:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`; `remaining_scoped_implementation=0`; `necessary_unmerged_PRs=0`. Повний **SA-EXT-16 та всі SA-EXT-01…20 залишаються OPEN**.

- **Реальна проблема:** `POST /api/help` обрізав анонімну електронну адресу, тему та повідомлення через `.trim().slice(0,max)` ще до валідації; адреса з допустимим 254-символьним префіксом і хвостом записувалася й могла бути надіслана як *інша* адреса; повідомлення користувача скорочувалося без попередження.
- **Виправлення:** [PR #616](https://github.com/Oleksii-debug/scripture-archive/pull/616) **SQUASH MERGED**, точний `main@e6889d77e832f3f2c6fb3ba9ebbcb4ac63ed880b`, маршрут `app/api/help/route.ts@dbb4b6bc1b8b56a3817902d81d89253a33fa03bd`; невідповідні email (254), subject (160), message (6000) відхиляються до D1 і пошти; законні граничні дані зберігаються повністю. Без нового API, БД, розсилки чи релізу.
- **Native tests:** [Actions #41037040019](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41037040019) на head `165bd8587235dda83484ce71fae1b80883979511`: **1419 Node PASS, 0 FAIL** з 6 новими route-executing перевірками, TS/lint/build PASS. **Загальний CI FAIL**: disposable Worker/D1 **21/22** двічі через `Your worker restarted mid-request`, HTTP 503 на незалежному `tests/api-flow.test.mjs`; Python **SKIPPED**. Це не повний E2E PASS.
- **Реєстр:** [SA_EXT_16_HELP_EXACT_FIELDS_TERMINAL_2026-10-30.md](SA_EXT_16_HELP_EXACT_FIELDS_TERMINAL_2026-10-30.md). Production Sites SHA/D1, фізичний NVDA/Windows, усі 20 розділів **NOT VERIFIED**. [Координація #297](https://github.com/Oleksii-debug/scripture-archive/issues/297). Повторно не розробляти цей підпункт без нового фактичного дефекту.

---

## 2026-10-30 — SA-EXT-02/16 / COMPLETED_ATTEMPT_EXPORT_METADATA_INTEGRITY — РОЗРОБКУ ВУЗЬКОГО ПІДПУНКТУ ЗАКРИТО

**Виключно цей підпункт:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`, `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. **Повні SA-EXT-01…20 залишаються OPEN.** Відсутність поточного production SHA, реального браузерного й NVDA-приймання не перетворюється на повторну розробку цієї вже злитої функції.

- **Доведений source-дефект:** `GET /api/reading-export` визнавав сформований приватний архів успішним, навіть якщо завершена спроба навчання містила недійсні назву книги, главу, ідентифікатор, мову або дату. Перевірка була лише для `result_json`, не для метаданих відновлюваної історії.
- **Злито в канонічну платформу:** [PR #619](https://github.com/Oleksii-debug/scripture-archive/pull/619) SQUASH MERGED, exact feature `main@a4b6748307946b735ab97273ee4732ec799437f5`; `app/api/reading-export/route.ts` blob `dcb47df874bd311c0207bc3703353cda3b38d463`, `tests/reading-export-batch-ack.test.mjs` blob `825643dfa5b479602a47acef3482e2f8317d07ff`. Повторно використано чинну 66-книжну главну мапу та особливість `JOL:4` для локальних видань; некоректна завершена спроба призводить до приватного 503 без фальшивого downloadable backup. Жодної міграції, другого API, зміни прав, розгортання чи додаткової мови.
- **Перевірка на exact PR source SHA `d29d27fd484ab5e1f6a8639405e8619380ed52c2`:** [Actions #41037398225](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41037398225) — native Node `1426 PASS / 0 FAIL / 1 SKIP`, включно з 14 негативними новими варіантами та позитивним `JOL:4`; TypeScript, lint, build і Python 2/2 PASS. **Загальний workflow FAIL**: Worker/D1 disposable E2E двічі `21/22` через незалежний `tests/api-flow.test.mjs:100` `Your worker restarted mid-request`, 503 замість 403. Source і тестові blobs прочитані з merged main; production, actual Cloudflare D1/browser/NVDA та повний E2E **NOT_VERIFIED**.
- **Залишок:** для цього конкретного scoped дефекту немає незлитого коду; ширший план, release і 20 батьківських розділів ще не закриті. Координація [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297). Повторно відкривати цю вузьку функцію тільки за новою конкретною регресією або затвердженою вимогою.

---

## 2026-10-30 — SA-EXT-02/04 / ATTEMPT_MARATHON_COUNT_READ_FAILCLOSED — РОЗРОБКУ ПІДФУНКЦІЇ ЗАКРИТО

**Виключно цей bounded authorization defect:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`; `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. **Повні SA-EXT-02, SA-EXT-04 та всі батьківські SA-EXT-01…20 залишаються OPEN.**

- **Відтворена проблема:** `POST /api/attempts?action=start` авторизував старт місії в активному груповому марафоні за `Number(used?.count || 0)`: `NULL`, відсутнє або пошкоджене значення SQL `COUNT(DISTINCT ...)` перетворювалося на нуль і могло помилково дозволити нову спробу.
- **Реальна інтеграція:** [PR #615](https://github.com/Oleksii-debug/scripture-archive/pull/615) **SQUASH MERGED** у `main@333668ba34788a3bf443bddbec535bc062a8017b`. `app/api/attempts/route.ts` blob `8944f7baacb838fccb8481f3365c9dff44810dc6` вимагає існуючого D1 рядка з додатним або нульовим safe integer count; інакше приватний HTTP 503 до читання/споживання chapter receipt й запису mission attempt. Канонічний actor/auth, DB, редакція `#608` і route залишились без альтернативних реалізацій.
- **Перевірки:** `tests/attempt-recovery-history.test.mjs` blob `99f48e4ddd04cdaa90ee9b81074da0e6d5099503` — реальний transpiled POST, канонічний `0001/0004` SQLite DDL, активний марафон, **10 відхилених malformed/missing count кейсів + 4 успішні/межові 201/409 кейси**. Перший exact-head Actions #41036963594 виявив неправильний тестовий regex для extraction DDL; виправлено з виділенням реальних SQL bytes за явними межами. Повторний [Actions #41037114122](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41037114122): native Node, TypeScript, lint, source build, Python **PASS**. Загальний workflow **FAIL**, disposable Wrangler/D1 дві спроби **21/22** і `Your worker restarted mid-request`, 503 замість 403/200 у `tests/api-flow.test.mjs:100/103`; незалежний CI-blocker [draft PR #361](https://github.com/Oleksii-debug/scripture-archive/pull/361).
- **Поза завершеним підпунктом:** поточний Cloudflare Sites deployment, production DB, інші групові й редакційні приймальні сценарії, фізичний NVDA, live email і всі батьківські секції. Немає нового release authorization. Центральна координація [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297).

---

## 2026-10-30 — SA-EXT-04 / GROUP_MARATHON_COUNT_READ_FAILCLOSED — РОЗРОБКУ ПІДПУНКТУ ЗАКРИТО

**Лише встановлений вузький дефект:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`, `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. **Повний SA-EXT-04 і всі батьківські SA-EXT-01…20 залишаються OPEN.**

- **Дефект у справжньому маршруті:** `POST /api/groups?action=session` при чинному марафоні читав `COUNT(DISTINCT ...)`, але `Number(used?.count||0)` помилково перетворював відсутній, `NULL`, рядковий чи пошкоджений D1 count на 0. Це дозволяло створювати зустріч, хоча кількість уже використаних глав не була достовірно встановлена.
- **Інтеграція:** [PR #614](https://github.com/Oleksii-debug/scripture-archive/pull/614) **SQUASH MERGED** у `main@e45f6287551f123d619579261a65140dba2650fd`; канонічний `app/api/groups/route.ts` blob `4ad7564b12ad849e0f0de8f4d283c7687642a019`. Не підтверджений safe nonnegative integer count — приватний HTTP 503 без створення зустрічі; справжній 0 і точна межа 3 збережені. Немає нової БД, паралельного групового сервера або розгортання.
- **Регресії:** `tests/groups-numeric-input-boundary.test.mjs` blob `06afb39fdf696df6a884f5a2d69aeb27d91111e1`. В існуючій SQLite fixture з реальними міграціями, активним `group_marathon_registrations` та транспільованим production POST: **10 негативних + 4 позитивні/межові сценарії**; перевірені status/error, кількість записаних зустрічей і відсутність незапланованих D1 writes. Перша exact-head Actions #41036209267: native Node успішний, TypeScript виявив nullable `used` — виправлено в наступному commit без зміни політики. Повторний [Actions #41036390455](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41036390455): native Node, TypeScript, lint, source build і Python **PASS**; **загальний workflow FAIL** лише на окремому disposable Worker/D1, дві спроби **21/22**, перевірені `Your worker restarted mid-request` HTTP 503 на `tests/api-flow.test.mjs:103,100` — [PR #361](https://github.com/Oleksii-debug/scripture-archive/pull/361). Повний E2E не визнано PASS.
- **Невирішене за межами функції:** deployed Cloudflare Sites SHA, production-D1, email/owner controls, real browser, NVDA, повний SA-EXT-04 і решта секцій не прийняті. Інші пов'язані маршрути не переписувалися; нова розробка цього точного дефекту — лише за новим доказовим відтворенням. Центральна координація [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297).

---

## 2026-10-30 — SA-EXT-03 / MATERIAL_DRAFT_EXPLICIT_ID_TRUNCATION_ALIAS — РОЗРОБКУ ПІДФУНКЦІЇ ЗАКРИТО

**РІВНО ЦЕЙ ПІДПУНКТ:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`; `remaining_scoped_implementation=0`; `necessary_unmerged_PRs=0`. Повний SA-EXT-03 та всі батьківські SA-EXT-01…20 залишаються **OPEN**.

- **Доведений дефект:** реальний `POST /api/materials` перед власницькою перевіркою та атомарним UPSERT застосовував `clean(body.id, 80)`: користувацький явно заданий ID довший за 80 символів обрізався, міг збігтися із наявним приватним матеріалом того самого автора і непомітно його перезаписати із HTTP 200.
- **Завершено в канонічній платформі:** [PR #612](https://github.com/Oleksii-debug/scripture-archive/pull/612) **SQUASH MERGED** у `main@6d6e66d7ba5597bc42ca3173b9a2d23ec32a9fb7`. Основний маршрут `app/api/materials/route.ts` blob `9b62b1209e0454a399c8065862d66fd23811d304` перед D1 preflight відмовляє 400 `invalid_material` для явного ID недопустимого типу або довшого за 80 символів. Порожній/відсутній ID як і раніше створює UUID; дійсний ID оновлюється за чинним owner-conditional UPSERT. Немає другого редактора, БД, міграції, зміни прав, автоматичної публікації або релізу.
- **Негативні/позитивні регресії:** справжній Node/SQLite route harness у `tests/materials-d1-ack.test.mjs` blob `1518b5012427baa2c56b22608c4b584ad113dc2f` підтверджує, що 81+ символів, нестрокові ID/масиви не змінюють вихідний матеріал/лічильник; дійсний 80-символьний ID оновлюється, порожній ID створює запис, пробіли нормалізуються.
- **CI фактично:** [Actions #41035507711](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41035507711), exact source head `c3c1cc2c43027f51c796ed927a5d58fb0a98aa1c`: **1397 Node PASS / 0 FAIL / 1 SKIP**, TypeScript/lint/build PASS, Python **2/2 PASS**. **Загальний CI FAIL:** disposable Wrangler Worker/D1 двічі **21/22** із незалежним `Your worker restarted mid-request`, HTTP 503 на іншому API flow, відома задача [#361](https://github.com/Oleksii-debug/scripture-archive/pull/361). Це не доказ повного E2E чи production acceptance.
- **Не верифіковано:** Cloudflare Sites SHA, реальну браузерну сесію/NVDA, повний editorial review та джерельні права, всі 20 повних розділів. Повторне розроблення цього вузького дефекту — лише за конкретною регресією чи новою вимогою. Центральна координація [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297).

---

## 2026-10-30 — SA-EXT-16 / REGISTER_AGE_TYPED_INPUT — РОЗРОБКУ ВУЗЬКОГО ДЕФЕКТУ ЗАКРИТО

**Лише верифікований підпункт:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`; `remaining_scoped_implementation=0`; `necessary_unmerged_PRs=0`. **Повний SA-EXT-16 і всі батьківські SA-EXT-01…20 залишаються OPEN.**

- **Доведена проблема:** `POST /api/auth?action=register` перетворював недовірений вік через `Number(data.age)`: `[18]`, `"0x12"`, `"1.8e1"`, рядки з пробілами тощо могли створити справжній акаунт і профіль з нібито коректним віком, викликати створення verification-токена і надсилання листа.
- **Основна реалізація:** [PR #611](https://github.com/Oleksii-debug/scripture-archive/pull/611) **SQUASH MERGED** у точний `main@ddf0d37afc93f6d5b99c60e699c8b79bb9d856c2`; файл `app/api/auth/route.ts`, blob `8727cf43018fbb36e47741d876ab86bcb0e79715`. `registrationAge` допускає лише цілі JSON-числа та звичайні десяткові рядки HTML-form у межах 13–120 і відхиляє всі інші типи/формати **до** будь-якого D1 write. Жодного нового маршруту, сховища, мови, бекенду або deployment.
- **Реальні перевірки:** `tests/auth-token-atomicity.test.mjs`, blob `65ac2729b65b1fe93723110af50fea0526fb1893`: чинний транспільований auth-маршрут та SQLite, **44 негативні + 4 позитивні варіанти віку у двох native Node regression tests**; перевірено відсутність account/token/email побічних ефектів і точний age/age_range для дозволених запитів. Exact-head [Actions #41035362340](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41035362340): **native Node, TypeScript, lint, build, Python — PASS**; **повний workflow FAIL**, disposable Wrangler Worker/D1 повторно **21/22** з `Your worker restarted mid-request`, HTTP 503 на незалежному `tests/api-flow.test.mjs` (рядки 120 і 103), контроль [draft PR #361](https://github.com/Oleksii-debug/scripture-archive/pull/361). Не приписувати цьому source-fix повний E2E PASS.
- **Окремо не верифіковано:** installed Sites SHA/HTTPS, production D1, browser/physical NVDA, остаточні 20 батьківських секцій, email/DNS та публічний реліз. Повторно не розробляти цей точний дефект без нової доведеної регресії. Центральна координація [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297).

---

## 2026-10-30 — SA-EXT-02 / MISSION_CHAPTER_TYPED_INPUT_BOUNDARY — РОЗРОБКУ ПІДФУНКЦІЇ ЗАКРИТО

**РІВНО ЦЕЙ ПІДПУНКТ:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`; `remaining_scoped_implementation=0`; `necessary_unmerged_PRs=0`. Повні батьківські **SA-EXT-01…20 залишаються OPEN**; це не завершення місій, не реліз, не приймання NVDA.

- **Дефект:** три справжні дії `POST /api/attempts?action=chapter/read/start` використовували `Number(body.chapter)`. Значення JSON `true`, `0xc`, `12e0`, неправильні рядкові/дробові числа могли перетворюватися на існуючу главу та небезпечно інвалідувати активну спробу, створити хибний read receipt або дозволити неправильний запуск. Це незалежно від уже виправленої перевірки індексів варіантів відповідей.
- **Канонічна реалізація:** [PR #608](https://github.com/Oleksii-debug/scripture-archive/pull/608) **SQUASH MERGED** у `main@1f91550db7c6b98705c7480f3b0d7708e19fa51f`. Справжній `app/api/attempts/route.ts` blob `0cb9c3e9930f94fa8374571756698f7df7d5289e` додає один спільний parser додатного безпечного цілого з точним десятковим HTML-рядком; усі три шляхи перед D1 мутаціями повертають 400 `invalid_chapter` на некоректних значеннях. Збережено обробку звичайних `12` і `"12"`, автентифікацію, чинні місії й ті самі D1-таблиці.
- **Тести:** існуючий `tests/attempt-recovery-history.test.mjs` blob `54b13e0e593f56b53987cbae3588f996fb7a66bf` доповнено source-executing Node/SQLite регресією: 12 неправильних типів/форм × 3 mutating actions, незмінений статус і `total_changes()`, легітимна `"12"` інвалідує тільки відповідну спробу. Для позитивної перевірки використовується реальна `drizzle/0004_accounts_attempts.sql` міграція.
- **Exact-head CI:** [Actions #41034841579](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41034841579), source head `762352b707e3a8a42d493b7f755df6438b0978aa`: Node **1396 PASS / 0 FAIL / 1 SKIP**, TypeScript/lint/build PASS, Python **2/2 PASS**. **Повний CI FAIL**: disposable Wrangler Worker/D1 двічі **21/22** з явно відтвореним `Your worker restarted mid-request` / HTTP 503 у нерелевантному інтеграційному POST; виправлення CI окремо у [PR #361](https://github.com/Oleksii-debug/scripture-archive/pull/361). Перші дві перевірки виявили тільки неповний тестовий SQLite fixture; їх виправлено без послаблення product guard.
- **Межі:** production SHA, реальний веббраузер і NVDA, усі джерела/переклади, повна місійна система, всі 20 повних розділів та release НЕ ВЕРИФІКОВАНО. Повторення цієї конкретної розробки — лише за новим відтвореним дефектом або вимогою; центральна координація [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297).

---

## 2026-10-30 — SA-EXT-01/16 / BOOKMARK_SINGLE_ROW_TYPED_D1_ACK — ЗАКРИТО ДЛЯ РОЗРОБКИ (вузька підфункція)

**РОЗДІЛ № SA-EXT-01/16 — лише підпункт BOOKMARK_SINGLE_ROW_TYPED_D1_ACK: `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.** `remaining_scoped_implementation=0`; `necessary_unmerged_PRs=0`. **Обидва повні батьківські SA-EXT-01 і SA-EXT-16, а також усі SA-EXT-01…20 залишаються OPEN**. Повторно переробляти підпункт лише за новим конкретним дефектом або затвердженою вимогою.

- **Виявлена вада:** канонічні `PUT` і `DELETE /api/bookmarks` безпідставно повертали `{ok:true}`, якщо D1 для одного первинного ключа повертав `meta.changes=2` чи небезпечне ціле число. PK у `drizzle/0009_reader_bookmarks.sql` гарантує максимум один змінений рядок для цих запитів.
- **Дійсна реалізація та інтеграція:** [PR #607](https://github.com/Oleksii-debug/scripture-archive/pull/607) **SQUASH MERGED** у точний `main@8d3e632b6150e7b751083a18e4227bf12b60f709`. Прочитано після merge: `app/api/bookmarks/route.ts` blob `438a32b26e45ff000693106eaa4ed027d1b9296c`; `tests/bookmarks-write-errors.test.mjs` blob `6780edd5788d323b0b270f01708fce32656c47b7`. Тепер підтвердження D1 має бути safe integer 0 або 1, інакше приватний 503. Збережено справжні PUT=1, DELETE=1, ідемпотентний DELETE=0 і перевірку дубля PUT=0; другий сервер чи база не створені.
- **Фактично виконані перевірки:** [GitHub Actions #41034307029](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41034307029), точний PR head `6536df261dded012360cc613077aa64e052af263`: native Node **1395 PASS / 0 FAIL** (додано 10 сценаріїв помилкового D1 ACK і 2 позитивні сценарії у справжньому маршруті); TypeScript, lint (0 errors), source build і Python **2 PASS**. Загальний CI **FAIL**: незалежний disposable Wrangler/D1 restart на `POST /api/editor-roles` двічі дав `503` замість `403`, **21/22** в кожній спробі, [спільний blocker #361](https://github.com/Oleksii-debug/scripture-archive/pull/361). Це не проходження повного E2E.
- **Поза цим закриттям:** живий Sites deployed SHA, реальний Cloudflare D1, браузер/NVDA, email/DNS, права всіх перекладів, повний SA-EXT-01/16 і реліз **NOT VERIFIED**. Жодних production-змін/cron/розсилок/нових мов. Координація [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297).

---

## 2026-10-30 — SA-EXT-01 / READING_LEGACY_CANONICAL_CHAPTER_SQL_GUARD — РОЗРОБКУ ПІДФУНКЦІЇ ЗАКРИТО

**РІВНО ЦЕЙ ПІДПУНКТ:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`; `remaining_scoped_implementation=0`; `necessary_unmerged_PRs=0`. **Усі повні SA-EXT-01…20 залишаються OPEN**; це не завершення продукту, публічного сайту чи фізичне NVDA-приймання.

- **Реальний дефект:** вхідні `PUT /api/account?action=reading` дані перевірялися за канонічними межами 66 книг, але атомарний SQL `ON CONFLICT` зливав стару приватну `READING`-історію, перевіряючи тільки шаблон назви книги та главу 1–151. Пошкоджені записи `FAK:2`, `GEN:51`, `JOL:5` і порожні за змістом заголовки могли отримати успішне ACK і залишитися в історії.
- **Інтеграція:** [PR #604](https://github.com/Oleksii-debug/scripture-archive/pull/604) **SQUASH MERGED** у точний `main@c1ef9b2eeeba221dffbac4afdba7f20dc5996f18`. Канонічний маршрут `app/api/account/route.ts` blob `24d3998c32484ff47df4fc2912aceb3922b0647a` використовує ту саму `READING_CHAPTERS` з `public/data/catalog.json` у двох захисних SQL JSON1 підзапитах; невідповідна попередня історія призводить до приватної 503 без її знищення/помилкового 200. Немає нової DB, іншого маршруту, нового серверу, зовнішнього запиту або розгортання.
- **Регресії:** фактичний транспільований маршрут та SQLite JSON1 в `tests/account-reading-legacy-merge.test.mjs` blob `c0804b65c60f4fdb41be0c3ea6943ae99d564c45`: недійсні книги й глави, пробільні старі записи, атомарна відмова, чинна локальна `JOL:4`, успішне злиття та дедуплікація. Після merge обидва blob і `main` перевірено.
- **Exact-head CI:** [Actions #41033421494](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41033421494) на `36ac69de7cfeaa3384d7b22610d9e1c94f805c11`: native Node **1394 PASS / 0 FAIL / 1 SKIP**, TypeScript/lint/build PASS, Python **2/2 PASS**. **Загальний CI FAIL:** disposable Wrangler/D1 на двох запусках **21/22**, явний незалежний `Your worker restarted mid-request` / HTTP 503 у `tests/api-flow.test.mjs:100,103` — існуючий власник [#361](https://github.com/Oleksii-debug/scripture-archive/pull/361). Немає підстав називати повний E2E зеленим.
- **Окремо НЕ ВЕРИФІКОВАНО:** актуальний deployed Sites SHA/HTTPS, production D1, всі тексти та права, повні SA-EXT-01…20, фізичний Chrome/NVDA, розсилки та реліз. Повторний source-development **лише** після нової конкретної регресії або вимоги. Центральна дошка [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297).

---

## 2026-10-30 — SA-EXT-01/16 / READING_ACCOUNT_TITLE_NONBLANK_ACK — ЗАКРИТО ДЛЯ РОЗРОБКИ (вузький дефект)

**Виключно цей підпункт:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`; `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. Усі батьківські SA-EXT-01…20, повний реліз і приймання залишаються **OPEN**.

- **Доведений дефект:** справжній `PUT /api/account?action=reading` визнавав пробільні заголовки глав за валідну історію (`title.length<=100`), повертав успішне підтвердження запису, але сторінка `/progress` та канонічний приватний експорт такі записи відкидали як нечитабельні.
- **Готова реалізація:** [PR #600](https://github.com/Oleksii-debug/scripture-archive/pull/600) **SQUASH MERGED** у `main@d325fb397c35960001f6f90b2a0a790afb1ce8bc`. Реальний маршрут `app/api/account/route.ts@3364cf32e3c1a19b86db540aa927ff54a7831462` додає `row.title.trim().length>0` у канонічний `validReadingReceipt` перед D1 записом, без нової бази/моделі/сервера; зберігає вже чинне обрізання пробілів і ліміт 100 символів.
- **Тести і readback:** `tests/account-reading-canonical-chapters.test.mjs@fd50ca2ecaf24dd15019abfbed2f25938d2407d0` перевіряє три нечитабельні заголовки без D1 write та коректне збереження нормальної назви після штатного trim. Перший точний CI запуск [#41032178248](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41032178248) виявив помилкове очікування **тестової fixture**, ніби сервер зберігає пробіли; тест виправлено без змін production-коду. Повторний [Actions #41032348161](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41032348161) exact head `c64f80a1c7554300925daf9c556f17a4f2a166d9` — **workflow SUCCESS**: native Node, TS, ESLint, build, disposable Worker/D1, Python — усі SUCCESS. Merge SHA та production/test blobs прочитано з main.
- **Поза підпунктом:** live Cloudflare Sites SHA, фізичний NVDA, production D1, email/DNS, повний SA-EXT-01/16 та інші SA-EXT залишаються неперевірені. Повторна розробка цієї функції лише за новим відтвореним дефектом або вимогою. Координація [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297).

---

## 2026-10-30 — SA-EXT-03 / PUBLIC_REVIEW_ANSWER_SELECTION_RACE — ЗАКРИТО ДЛЯ РОЗРОБКИ (вузький дефект)

**Статус цього конкретного дефекту:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`, `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. Батьківський SA-EXT-03 і решта SA-EXT-01…20 **залишаються OPEN**.

- **Відтворення на реальному попередньому `main`:** під час незавершеного POST перевірки опублікованого завдання вибір варіанта A змінювався на B, але асинхронна відповідь для A відображала «Правильно» та пояснення A під уже вибраним B. Стандартна клавіатурна доступність залишалась, проте голосове статус-повідомлення могло вводити в оману.
- **Реалізовано:** [PR #601](https://github.com/Oleksii-debug/scripture-archive/pull/601) **SQUASH MERGED** у `main@59b55e241309ddb2963c22e266ce91eb294ccc6a`. Справжній `public/material-review.js@91c1f0752978fddd216c1d0ab4add06adf7f3bb1` повторно читає вибір після запиту й не показує стару оцінку/пояснення, якщо радіовибір змінився; дає чіткий статус `uk/ru/en`, лишає дію доступною, не краде фокус, не змінює права і серверне оцінювання.
- **Підтвердження:** `tests/public-review-answer-focus.test.mjs@82ad413aa0d0c3c8a8d08426df8d50087a861dc6` містить нові негативні та позитивні перевірки реального асинхронного сценарію. V8 source-executed 6/6 PASS. [Exact head CI #41032398721](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41032398721) — **Node 1389 PASS / 0 FAIL / 1 SKIP**, TypeScript/lint/build/Python PASS; **Worker/D1 двічі 21/22** з незалежним `Your worker restarted mid-request` / 503 для інших POST/PUT, розслідування [#361](https://github.com/Oleksii-debug/scripture-archive/pull/361). Отже повний CI **НЕ зелений** на цьому SHA.
- **Межі:** жодної нової системи зберігання, API, редакційного статусу, змін прав або Sites deployment. Застосування на реальному сайті й фізичний NVDA не підтверджено; батьківський розділ не закривати.

---

## 2026-10-30 — SA-EXT-02 / ATTEMPT_HISTORY_CANONICAL_CHAPTER_TRUST — ЗАКРИТО ДЛЯ РОЗРОБКИ (вузький дефект)

**Термінальний статус лише цього підпункту:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`; `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. Повний розділ SA-EXT-02 і всі двадцять батьківських розділів **залишаються OPEN**.

- **Факт дефекту:** на справжньому попередньому `main` `missionHistoryMarkup` та персональні пропозиції повторення приймали синтаксично правдоподібні, але неіснуючі `FAK:2` та `GEN:51` із історії старих спроб; створювали фальшиві посилання. Це окремий дефект після перевірки лише форми коду (#576).
- **Готовий код:** [PR #597](https://github.com/Oleksii-debug/scripture-archive/pull/597) **SQUASH MERGED** у `main@d8eae649a762e9020419685ad6418da67063dfb6`. Реальний `public/workspace.js@ddaf4b2ad995122d78791d943349f57c16349007` тепер на фактичній сторінці `/progress` звіряє завершені та незавершені спроби, посилання й календар повторень із канонічними 66 книгами та дозволеними варіантами глав (зокрема `JOL:4`). Недовірений запис показує існуюче повідомлення повторної спроби, не приховується як вигадана «порожня» історія.
- **Регресії й тести:** `tests/history-render-failclosed.test.mjs@c134fe431ecfb8051eb51ee88fe9b812b1b1d2d9`, `tests/review-suggestions.test.mjs@a4e2dabc4ce103ce74c4cb1b8009ae7c7f2dd60b`. Точний source-executed V8: **25/25** PASS. [Exact-PR-head Actions #41031571821](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41031571821): Node **1385 PASS / 0 FAIL / 1 SKIP**, TypeScript/lint/build/Python PASS. **Загальний CI НЕ зелений:** тимчасовий Worker/D1 двічі **21/22**, обидва з незалежно відтвореним `Your worker restarted mid-request` / HTTP 503 на інших POST/PUT шляхах; власник цього спільного CI-блокера — [PR #361](https://github.com/Oleksii-debug/scripture-archive/pull/361). Не повідомляти «22/22 PASS» для цього SHA.
- **Межі:** змін у production Worker, D1-схемі, реальному сайті, текстах видань і ліцензіях немає. Не підтверджено live Sites SHA, фізичний NVDA, браузерний E2E чи завершення всього SA-EXT-02. Повторна розробка цього вузького дефекту — лише після нового конкретного доказу регресії.

---

## 2026-10-30 — SA-EXT-01/16 / READING_EXPORT_CANONICAL_BOOK_BOUNDS — ЗАКРИТО ДЛЯ РОЗРОБКИ (вузький дефект)

**Остаточний стан лише підфункції приватного експорту читання:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`; `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. **Повні батьківські розділи SA-EXT-01, SA-EXT-16 та інші SA-EXT-01…20 залишаються OPEN.** Це не реліз, не 82-мовна готовність і не фізичне NVDA-приймання.

- **Відтворена невідповідність:** чинний `GET /api/reading-export` пропускав вигадані `FAK:2`, `GEN:51`, `3JN:2` як «успішно експортовану» історію читання, бо перевіряв лише шаблон назви книги та главу до 150. Канонічний `/api/account?action=reading` і справжній `/progress` уже перевіряли відповідність текстовому каталогу.
- **Реалізація в основній платформі:** [PR #596](https://github.com/Oleksii-debug/scripture-archive/pull/596) **SQUASH MERGED** у точний `main@1f4289f6dada96799341bbbc520a5ae56ae9939b`. Реальний маршрут `app/api/reading-export/route.ts@f507ee28f4dde2ed9a0d6c1193db895aff2bd2ea` тепер використовує **існуючий** `public/data/catalog.json` (66 канонічних книг і різні допустимі межі за виданням). Некоректний рядок призводить до приватного HTTP 503 без `Content-Disposition`; валідні `GEN:50`, `PSA:150`, особливий `JOL:4` та не-READING історичні знімки зберігаються. Немає другого каталогу, сервера, сховища або змін user data.
- **Регресії:** `tests/reading-export-batch-ack.test.mjs@19c849f7336f73c345801a882efbb71e7618b3da` виконує справжній transpiled route з чинним JSON-каталогом. [GitHub Actions #41031422174](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41031422174), точний PR head `2a36ae2858449c20ec0dbdc9604fffc4542d8ca0`: **workflow SUCCESS**; native Node regression, TypeScript, lint, source build, disposable Worker/D1, existing Python validators — кожен етап SUCCESS. Після merge перевірено `main` SHA й обидва source/test blobs.
- **Не доведено:** live deployed Cloudflare Sites SHA, реальна production D1, DNS/email, повний браузерний сценарій, Windows/NVDA, весь SA-EXT-01/16 чи весь продукт. Повторна реалізація лише за конкретного нового відтвореного дефекту або затвердженої вимоги. Координація: [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297).

---

## 2026-10-30 — SA-EXT-01 / LOCAL_READING_CANONICAL_BOOK_CHAPTER_BOUNDS — ЗАКРИТО ДЛЯ РОЗРОБКИ (вузький дефект)

**Остаточний статус лише цього дефекту:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`, `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. **Повний SA-EXT-01 і всі двадцять батьківських SA-EXT-01…20 залишаються OPEN.** Повторна реалізація цього дефекту — лише за новою затвердженою вимогою або конкретною регресією.

- **Відтворено на справжньому коді:** колишній `public/workspace.js::verifiedLocalReadingHistory` відображав вигаданий `FAK:2` і неіснуючий `GEN:51` як прочитані глави, бо перевіряв форму коду та загальну межу 150, а не дійсний біблійний каталог. Це спотворювало лічильник і створювало неправильні `/reader/...`-посилання.
- **Виправлено та інтегровано:** [PR #594](https://github.com/Oleksii-debug/scripture-archive/pull/594) **SQUASH MERGED** у `main@99e39397447dc432ba2a062fddf349add8142077`; канонічний `public/workspace.js@9ae2fc248a6ad8e84a46cfecaf1564fdb7229842`. Історія користується наявними 66 книгами та підтвердженими editionBooks (збережено чинну четверту главу `JOL` в `uk-ohiienko`), відмовляється від неперевірених кодів/глав і при відсутньому каталозі показує зрозуміле повідомлення трьома мовами, а не помилковий нуль.
- **Тести на чинній інтеграції:** `tests/reading-history-dedup.test.mjs@4de08a882942146fa1cdc7092f3e4e689c6c36c1`; оновлена реальна фікстура `tests/workspace-async-principal-fence.test.mjs`. [Exact-head CI #41030716017](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41030716017) — **SUCCESS**, Node **1381 PASS / 0 FAIL / 1 SKIP**, TypeScript/lint/build/Python PASS, disposable Worker/D1 **22/22 PASS**. Додатковий точний V8 source-executed preflight: **152/152**.
- **Межі приймання:** жодної нової бази даних, перекладу, прав на тексти чи альтернативного читача; змінювалася справжня сторінка `/progress`. **Не підтверджено** сьогоднішній live Sites SHA, production D1, фізичний NVDA/браузер і завершення батьківського розділу.

---

## 2026-10-30 — SA-EXT-07 / ACADEMY_CROSS_TAB_ATOMICITY — ЗАКРИТО ДЛЯ РОЗРОБКИ (вузький дефект)

**РОЗДІЛ SA-EXT-07, тільки підфункція одночасного збереження позначок у вкладках — ЗАКРИТО / CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL**; `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. **Батьківський SA-EXT-07 і всі двадцять SA-EXT-01…20 залишаються OPEN**, жодного загального приймання не приписано.

- **Функція:** одне Web Locks exclusive origin/account key охоплює справжні read/modify/write/verified-readback у `public/scripture-academy.js`; не допускає втрати прогресу між двома вкладками, перевіряє principal та route після очікування, зберігає v1-позначки, відмовляє без безпечного lock із доступним повідомленням UK/RU/EN.
- **Головна інтеграція:** [PR #592](https://github.com/Oleksii-debug/scripture-archive/pull/592) SQUASH MERGED; функціональний `main@124dca2ac80599b82ebd2709546342b29d48d8d5`; source blob `c40af0959ff69968bd54781c41c9f8b661f695b8`, тест `512c470a5670d62f97e914f3d750bf55930ccddb`; Issue #591 закрито. Той самий канонічний Academy UI, локальний v1-store та account gate; друга платформа/сховище відсутні.
- **Фактична кваліфікація:** 10/10 V8 source-executing fake-DOM; [GitHub Actions #41029627675](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41029627675) native Node **1377 PASS / 0 FAIL / 1 SKIP**, TypeScript/lint/source-build PASS, Python **2 PASS**. **Весь CI workflow FAIL** через незалежний disposable Wrangler/D1 restart HTTP 503 на обох спробах (21/22); чинний [#361](https://github.com/Oleksii-debug/scripture-archive/pull/361). Це НЕ E2E PASS.
- **Не доведено:** поточний deployed Sites SHA, справжній браузер, Windows/NVDA, повний Academy/SA-EXT-07 або весь продукт. Повторна source-розробка цієї підфункції заборонена без відтвореного дефекту або нової вимоги. Координація #297; #591 — terminal issue receipt.

---

## 2026-10-30 — SA-EXT-03 / DRAFT_CHOICE_ARRAY_REFUSAL — ЗАКРИТО ДЛЯ РОЗРОБКИ (вузький дефект)

**Статус:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` лише для канонічного збереження варіантів відповіді авторської вправи, `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. **Увесь SA-EXT-03 та всі двадцять батьківських розділів OPEN**: це не закриття конструктора/редакційного процесу, не реліз і не браузерне/NVDA-приймання.

- **Відтворена невідповідність:** `POST /api/materials` застосовував `body.options.slice(0,8).map(clean).filter(Boolean)`. Некоректне `['first','second',null]` або дев'ятий варіант тихо відкидалися, надмірно довгий текст обрізався. Сервер повертав успіх, хоча зберігав змінений без відома автора набір відповідей.
- **Реальна інтеграція:** [PR #587](https://github.com/Oleksii-debug/scripture-archive/pull/587) SQUASH MERGED у точний `main@bd1a062c65a57f01e96ae877578b12a6fb1e2eef`; production blob `app/api/materials/route.ts@ca27f930fa5558ec1c9480198adfb915def1f093`, test blob `tests/materials-d1-ack.test.mjs@c3b3be1ef7e00a5aa7a2ab9973349ecc76fe7d54`. Обидва файли прочитані з main після злиття. Крок відхиляє неправильні/надмірні масиви 400 до SQLite/D1 save, дозволений набір 2–8 зберігає порядок, той самий account/private owner UPSERT і ACK без нової authority.
- **CI:** [exact-head Actions #41027470937](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41027470937): Node **1315 PASS / 0 FAIL / 1 SKIP**, TypeScript/lint/build/Python PASS; **загальний CI FAIL** через відому незалежну disposable Worker/D1 503 (21/22 двічі), [#361](https://github.com/Oleksii-debug/scripture-archive/pull/361). Немає production/Chrome/NVDA чи повного SA-EXT-03 acceptance. Повторна розробка лише за нової затвердженої вимоги або відтвореного дефекту.

---

## 2026-10-30 — SA-EXT-16 / RATE_LIMIT_D1_ACK_AND_COUNTER_TRUTH — ЗАКРИТО ДЛЯ РОЗРОБКИ (вузький дефект)

**Остаточний статус тільки цього підпункту:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`; `remaining_scoped_implementation=0`, `necessary_unmerged_feature_PRs=0`. **Батьківський SA-EXT-16 і всі 20 батьківських SA-EXT-01…20 залишаються OPEN.** Не повторювати виправлений підпункт без конкретної відтвореної регресії або нової затвердженої вимоги.

- **Доведений дефект:** єдина спільна `lib/auth.ts::rateLimit` раніше ігнорувала результат `INSERT ... ON CONFLICT DO UPDATE` для лічильника D1, а відсутній/пошкоджений `SELECT count` трактувала як `0`, дозволяючи запит без підтвердженого rate-limit. Через цю функцію проходять реєстрація, вхід, підтримка, аналітика й читання каталогу спільноти.
- **Канонічна реалізація:** [PR #583](https://github.com/Oleksii-debug/scripture-archive/pull/583) **SQUASH MERGED** у точний `main@d5d55ec9fdee6e38e40e70e2bd4ec5422f2c081f`. Реальний код `lib/auth.ts@5860291bace4b57a58f94af44201bf716846884d`; реальні тести `tests/rate-limit-d1-failclosed.test.mjs@1510af12785ced60667030570afed58227002fe6`. SQL, відбиток ключа, вікно D1, маршрути й межі квот збережені. Лише `success===true` та `meta.changes===1` підтверджують запис; `SELECT count` має містити додатне безпечне ціле число. Інакше обробка відмовляє закрито — не повертає хибне `allowed=true`. Нового сервера, DB, розгортання чи акаунтів немає.
- **Exact-head перевірки:** [GitHub Actions #41027280733](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41027280733) на `82ce76e95b181dea3e6c910eed728fcf8e88bdfc`: нативний Node **1345 PASS / 0 FAIL** (зокрема 32 source-executing edge cases), TypeScript PASS, ESLint **0 errors / 12 warnings**, build source PASS, Python **2 PASS**. Перша перевірка виявила й виправила 2 помилки лише в тестовій fixture (`undefined` переозначалося default), повторний точний HEAD native suite зелений.
- **Відокремлений блокер:** disposable Worker/D1 **21/22** в обох спробах, реальний `Your worker restarted mid-request`: HTTP 503 замість очікуваного cross-origin 403 у `tests/api-flow.test.mjs`; відомий окремий [#361](https://github.com/Oleksii-debug/scripture-archive/pull/361). **Весь workflow FAIL, не 22/22 PASS**. Живий Sites SHA, production release, справжній browser, фізичний NVDA, решта privacy/abuse acceptance **не перевірені**.
- **Координація:** [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297), claim comment 6518529052. Наявний загальний release-шлюз не послаблено.

---

## 2026-10-30 — SA-EXT-01/16 / LOCAL_READING_HISTORY_BOOK_CODE_SHAPE — ЗАКРИТО ДЛЯ РОЗРОБКИ (вузький дефект)

**Остаточний стан конкретної підфункції:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`, `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. Повні батьківські SA-EXT-01, SA-EXT-16 та всі SA-EXT-01…20 залишаються **OPEN**.

- **До виправлення:** `verifiedLocalReadingHistory` у справжньому `public/workspace.js` приймала псевдокоди `ABCD` і `1ABCD` за надто широким шаблоном `/^[1-3]?[A-Z]{2,4}$/`. Сторінка `/progress` помилково включала такі записи до підрахунку прочитаних глав і робила посилання `/reader/ABCD/1`. Усі 66 реальних кодів у канонічному каталозі задовольняють уже використовуваний в інших перевірках формат з 2–3 великих латинських букв і необов'язковим цифровим префіксом 1–3; другого довідника кодів не створено.
- **Дійсна інтеграція:** [PR #582](https://github.com/Oleksii-debug/scripture-archive/pull/582) **SQUASH MERGED** до `main@314706f128fa6e2be8fb9cd2b078dabc8c26143b`. Перевірено blobs у main: `public/workspace.js@c1e555f03aa6cbfda540614c5925b0e4ea2faa84` та `tests/reading-history-dedup.test.mjs@c52dcd5ab4f62739f467d0d355b10c68daa0fe09`. Збережено нормальні `GEN`, `1CO`, `3JN`, обмеження історії 2048, дедуплікацію і головну сторінку. Доступ до пам'яті пристрою не змінено, збережені записи не стираються.
- **Exact-HEAD CI:** [Actions #41026965760](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41026965760) на `head@269f4f74e318ad9205bbb98d03091e279593a98a`: Node native PASS, TypeScript PASS, lint PASS (0 errors), source build PASS, Python validators PASS. **Повний workflow FAIL:** на обох спробах окремий disposable Wrangler restart, `POST /api/editor-roles` повернув `503` замість `403` (21/22 інтеграційних сценаріїв). Цей самостійний блокер ведеться у [#361](https://github.com/Oleksii-debug/scripture-archive/pull/361); `E2E 22/22` не заявлено.
- **Поза terminal scope:** не доведені deployed Cloudflare Sites SHA, фізичний NVDA, браузерне продакшн-приймання, повний план з 20 розділів або глобальний реліз. Повернути підпункт у роботу тільки за новим відтвореним дефектом чи новою вимогою.

## 2026-10-30 — SA-EXT-02/16 / READING_EXPORT_STRUCTURED_PROGRESS — ЗАКРИТО ДЛЯ РОЗРОБКИ (вузький дефект)

**Статус:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` лише для відмови експорту особистого прогресу зі збереженими JSON scalar/null/non-string records. `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. **Повні SA-EXT-02, SA-EXT-16 та інші SA-EXT-01…20 залишаються OPEN.**

- **Доведений дефект:** канонічний `GET /api/reading-export` використовував `JSON.parse(row.data)`, але JSON `null`, `false`, числа та рядки давали HTTP 200 і файл хибно повної резервної копії. Раніше було відхилено лише синтаксично неправильний JSON.
- **Виправлення й інтеграція:** [PR #578](https://github.com/Oleksii-debug/scripture-archive/pull/578) SQUASH MERGED у `main@f99b9c336a7380a0a038fc2c7d457bed2a2b6c4f`; source blob `app/api/reading-export/route.ts@cb15ce7eb69e7430d7ff54a6359a9ac3e69ae7ad`; реальні regression tests `tests/reading-export-batch-ack.test.mjs@6050780d61a66dee2ad3333d363c99fcace200d3`, readback у main підтверджений. Об'єкти й масиви прогресу зберігають свій зміст, пошкоджене повертає приватне 503 без вкладення, приватність/D1 не змінені.
- **Перевірки:** [Actions #41026466829](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41026466829): Node **1294 PASS / 0 FAIL / 1 SKIP**, TypeScript/lint/build/Python **PASS**; загальний CI **FAIL** через відомий несуміжний disposable Worker/D1 restart HTTP 503, дві спроби **21/22**, власник [PR #361](https://github.com/Oleksii-debug/scripture-archive/pull/361). Немає підтвердженого production/NVDA/browser PASS. Цей конкретний підпункт не розробляти повторно без нового реального дефекту.

## 2026-10-30 — SA-EXT-03 / MATERIALS_EXPORT_STRUCTURED_RECORDS — ЗАКРИТО ДЛЯ РОЗРОБКИ (вузький дефект)

**Статус:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` лише для перевірки форми чернетки й редакційного snapshot при експорті. `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. **Увесь SA-EXT-03 та інші 19 батьківських розділів залишаються OPEN**. Це структурна перевірка, не повна перевірка змісту/прав на матеріали.

- **Доведений дефект:** приватний `GET /api/materials?mine=1&export=1` приймав `JSON.parse(String(...))` для історичних `data`/`snapshot`: `null`, `[]`, числа і рядки видавалися за відновлювані авторські вправи/редакційні версії та повноцінну резервну копію.
- **Реальна інтеграція:** [PR #581](https://github.com/Oleksii-debug/scripture-archive/pull/581) SQUASH MERGED у `main@b3ebbd52665fe99d868e04bea3c0d95ee8c586df`; source blob `app/api/materials/route.ts@76cc53c02951d3a3391c286a334c34841b759a29`; `tests/materials-export-structured-records.test.mjs@c0429edb99d07e036422fdc7a52dbde471fb2f84`; main readback підтверджений. Збережені об'єкти видаються без змін, пошкоджені записи — приватне 503, без вкладення; той самий endpoint/DB/роль.
- **Перевірки:** [Actions #41026781283](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41026781283): Node **1303 PASS / 0 FAIL / 1 SKIP**, TypeScript/lint/build/Python **PASS**. Загальний CI **FAIL** через окреме Worker/D1 503 замість 403, дві спроби **21/22**, #361. Жодного Cloudflare production release, browser/NVDA чи повного SA-EXT-03 acceptance не підтверджено; scoped implementation terminal.

---

## 2026-10-30 — SA-EXT-02/16 / HISTORY_BOOK_CODE_READER_LINK_FAILCLOSED — ЗАКРИТО ДЛЯ РОЗРОБКИ (вузький дефект)

**Статус:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` лише для відмови від навігаційних посилань з неправильно сформованим кодом біблійної книги в історії завершених або відновлюваних спроб. `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. **Батьківські SA-EXT-02, SA-EXT-16 та всі SA-EXT-01…20 залишаються OPEN.**

- **Відтворено:** попередній `public/workspace.js::validAttemptHistoryPayload` дозволяв будь-який непорожній `book` до 32 символів. Запис `book='NOT/A/BOOK'` проходив перевірку і потрапляв у `missionHistoryMarkup` як помилковий читальний маршрут. Усі 66 канонічних кодів каталогу відповідають уже наявній у `reviewSuggestions` формі `/^([1-3])?[A-Z]{2,3}$/`; дублюючих переліків книг не додано.
- **Реалізація:** [PR #576](https://github.com/Oleksii-debug/scripture-archive/pull/576) **SQUASH MERGED** у точний `main@b3f6cd20ef341d2c417de3957511da25d1769bef`. Канонічний production blob `public/workspace.js@a2eaffcfd02c563a393588f6958647aef06333dd`; тести `tests/history-render-failclosed.test.mjs@3f2906233bf156da438960863e9a2fc63249dc2b`, `tests/attempt-recovery-history.test.mjs@43d0c899b74d98f2e1eb3503e92f346f3088a211`. GitHub PR і всі три blob прочитані після злиття. Історію у сховищі не змінено, сервер, базу, URL маршрути й політику прав не продубльовано.
- **Перевірка:** [Actions #41026375115](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41026375115), точний feature HEAD `ba1d27809d84a7a53b49428c961b82c1de153869`: нативний Node **PASS**, TypeScript **PASS**, lint **PASS** (0 помилок, попередження окремо), source build **PASS**, Python **2 PASS**. Перша перевірка #41026157660 показала конфлікт зі старим тестом, його виправлено до merge, без послаблення fail-closed. **Повний workflow FAIL** через окремий disposable Wrangler Worker/D1 restart: HTTP 503 замість 200 для `POST /api/editor-roles`, двічі на нових тимчасових БД, [існуючий #361](https://github.com/Oleksii-debug/scripture-archive/pull/361). Worker/D1 E2E не оголошено PASS.
- **Не підтверджено:** actual installed Cloudflare Sites SHA, live/browser/фізичний NVDA, завершення батьківських розділів та реліз. Повторне відкриття вузької реалізації — тільки за новою відтвореною регресією чи зміненою вимогою.

## 2026-10-30 — SA-EXT-16 / R0.4 / AGENT_LEASE_FINISH_ATOMICITY — ЗАКРИТО ДЛЯ РОЗРОБКИ (вузький дефект)

**Статус тільки конкретної операційної підфункції:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`, `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. **Повний SA-EXT-16 і release-шлюз R0.4 залишаються OPEN, як і всі 20 SA-EXT-01…20.** Це не реалізація планованої соціальної мережі SA-EXT-10 і не запуск жодної кампанії/воркера. Жодних прав/секретів/release не додано.

- **Справжня проблема:** агент `POST /api/community?action=finish` раніше гасив усі активні сесії одного користувача й незалежно виконував наступні D1 read/update/insert, завжди відповідаючи `ok:true` без перевірки підтверджених мутацій. Збій між записами міг відкликати lease без наступної дії та створити хибний дубльований журнал. Auth D1 exception виходив за межі `try/catch`, перетворюючись на HTML/500.
- **Завершена реалізація:** [PR #575](https://github.com/Oleksii-debug/scripture-archive/pull/575) **squash MERGED** в `main@2ce9672f3a1397d7c13f52baf4d10e552105dd67`. Канонічний `app/api/community/route.ts` застосовує лише дійсний hash поточного `sa_agent` токена, наявний `COMMUNITY_RUN_ID`, active lease/run/control_version; виконує **один** D1 transactional `batch` з відкликання токена, планування і детермінованого idempotent audit log, де кожна наступна SQL-мутація залежить від реального `changes()=1` попередньої. Усі 3 D1 `meta.changes` мають типізоване підтвердження; stale/duplicate 409, store/auth outage або невизначений ACK 503, пошкоджене seed 409. Інші чинні lease одного учасника не відкликаються. Не змінено схему Д1, scheduler authority, реальних користувачів чи deployed campaign.
- **GitHub readback:** `merged=true`; підтверджений `main` дорівнював вказаному merge SHA. Real source blob `app/api/community/route.ts@afde332c59852c3595c674ec404bc6b2298c64a7` та full-migration SQLite real-route regression `tests/community-agent-finish-atomic.test.mjs@e959b1ae7241ecd39df4c92da56f6818f106778f`.
- **Тести exact feature-head:** [Actions #41026234812](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41026234812) на `8a328d7185cc19571ecd7575c6d2751d9888dab6`: **1284 native Node PASS / 0 FAIL / 1 SKIP**, реальне виконання D1 SQL з усіма чинними міграціями, підтверджений finish, idempotent replay, sibling-token isolation, три аварійні rollback, unknown ACK після commit, paused/stale контроль, seed-corruption, auth та cross-origin відмови. TypeScript, lint (0 errors), source build, Python validators PASS. Попередні два RED head-runs знайшли й виправили тільки помилки new test fixture (regex міграцій, SQLite null-prototype і одноразовість симуляції ACK), не пропущені.
- **Зовнішній інтеграційний блокер окремо:** disposable Worker/D1 21/22 два ізольовані запуски з незалежним `Your worker restarted mid-request` (503 замість 400/200) — [#361](https://github.com/Oleksii-debug/scripture-archive/pull/361). Загальний workflow **FAIL**, 22/22 не підтверджено. Production exact SHA, справжня leased-agent інтеграція в Cloudflare, live site, ручне Windows/NVDA, а також весь scope R0.4/SA-EXT-16 **не перевірені**. Нову розробку цього scoped дефекту розпочинати лише за конкретного дефекту або нової вимоги.

## 2026-10-30 — SA-EXT-01 / BOOKMARK_ZERO_CHANGE_TYPED_D1_PROBE — ЗАКРИТО ДЛЯ РОЗРОБКИ (вузький дефект)

**Статус:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` **тільки** для неоднозначного D1-підтвердження повторного PUT закладки: `remaining_scoped_implementation=0`; `necessary_unmerged_PRs=0`. **Усі 20 батьківських SA-EXT-01…20 залишаються OPEN**, зокрема повний SA-EXT-01. Жодного claim про розгорнутий сайт, повний E2E чи NVDA.

- **Реальна проблема:** після `INSERT ... ON CONFLICT DO NOTHING` з `meta.changes=0` сервер робив `SELECT 1`, але трактував будь-яке truthy `first()`, включно з пошкодженим `{}`, як доказ наявності закладки цього користувача. Це могло повернути неправдиве `200 {ok:true}`.
- **Канонічне виправлення:** [PR #574](https://github.com/Oleksii-debug/scripture-archive/pull/574) **SQUASH MERGED** у точний `main@a8f49377c5973028c04feeac8a415416c61dfbe3`. У `app/api/bookmarks/route.ts` запит тепер `SELECT 1 AS present` із незмінним own-user/edition/book/chapter bound predicate; лише `{present:1}` підтверджує дубль. Немає рядка — зберігається `409 bookmark_limit`; malformed non-null evidence — приватне `503 bookmark_save_failed`. Авторизація, same-origin, право на локальне видання, межі глав та ідемпотентне DELETE без змін. Другого сервера, D1-міграції, публікації немає.
- **GitHub readback:** PR `merged=true`, exact merge SHA збігається з `main` (compare identical 0/0 на час перевірки). Source blob `cf65de96f87f323d82e7e03f4daf85c1210a5f42`; регресії `tests/bookmark-legacy-delete.test.mjs@fbb0dbd18d25f50459031f209baf9056ea9bc4a1` і `tests/bookmarks-write-errors.test.mjs@ecf34634570767788bc1d45b11425503e57d49b3`. Чотири нові source-executing cases та узгодження раніше застарілого test fixture. Перший CI виявив 1 FAIL старої fixture; виправлено й повторно виконано повний native suite.
- **Фактичний CI:** exact feature head `700b3b41b94c04aaa2afa0da359653d9c437484a`, [Actions #41025988914](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41025988914): **1273 Node PASS / 0 FAIL**, TypeScript PASS, ESLint PASS, source build PASS, Python **2 PASS**. **Whole workflow FAILURE:** disposable Worker/D1 **21/22** двічі на нових тестових базах, реальний `Your worker restarted mid-request` HTTP 503 замість 200; окрема відома [#361](https://github.com/Oleksii-debug/scripture-archive/pull/361). Це не blocker для вже виправленого scoped D1 proof, але blocker повного production/e2e acceptance.
- **Поза цим закриттям:** повний SA-EXT-01, ліцензії всіх перекладів, реальна Cloudflare Sites інсталяція, браузер, клавіатура/NVDA й решта SA-EXT залишаються OPEN. Повторне переписування цього вузького фіксу — лише за конкретного відтвореного дефекту чи нової вимоги. Координація [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297).

## 2026-10-30 — SA-EXT-03 / PUBLIC_REVIEWED_ANSWER_RECEIPT_BOOLEAN — ЗАКРИТО ДЛЯ РОЗРОБКИ (вузький дефект)

**РОЗДІЛ № SA-EXT-03 — підпункт PUBLIC_REVIEWED_ANSWER_RECEIPT_BOOLEAN: CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL**, `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. **Увесь SA-EXT-03 та всі SA-EXT-01…20 залишаються OPEN**, це не завершення конструктора/редакційного процесу чи production.

- **Відтворена несправність:** публічна вправа в канонічному `public/material-review.js` приймала JSON `{"correct":"false","explanation":"FORGED CORRECT ANSWER"}` як позитивну відповідь, показувала «Правильно» й стороннє пояснення. Exact-source blob до виправлення `ac6f29177a53f8d6c082595d44c0fae27786f142`, V8 FakeDOM RED.
- **Виправлення:** [PR #572](https://github.com/Oleksii-debug/scripture-archive/pull/572) SQUASH MERGED у точний `main@c94485fc3e647c8918b131e25e8abf52a3e69ba4`. Production-модуль blob `c163ce5404e5b44b0ba471d3a37eba7d5751aca4`; Node-regression tests blob `74a81de0d4552c35f6fbad58f274d29a75158822` у тому самому main; суворий boolean-result, reject malformed explanation, збережені маршрут, статус, keyboard focus та повторна спроба. Додано 8 real Node regression cases; ізольовано виконано 10/10 V8 source checks PASS.
- **CI:** [Run 41025203758](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41025203758) — native Node PASS, TypeScript PASS, ESLint PASS, build PASS, canonical Python validators PASS; загальний workflow FAIL: disposable Worker/D1 21/22, `tests/api-flow.test.mjs:394` через `POST /api/attempts 503`, окремий existing #361. Не було дозволеного автоматичного повтору без точного restart-signature. Не видавати за повне E2E/PASS.
- **Межі:** Cloudflare Sites deployed SHA, browser, Windows, фізичний NVDA, редакторська QA всіх матеріалів і всі повні SA-EXT залишаються NOT_VERIFIED/OPEN. Вузький код не переписувати без конкретного нового дефекту чи зміненої вимоги; production не оновлювали.

---

## 2026-10-30 — SA-EXT-01 / LEGACY_BOOKMARK_OUT_OF_RANGE_DELETE — ЗАКРИТО ДЛЯ РОЗРОБКИ (вузький дефект)

**Статус:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` **лише** для безпечного видалення історичних некоректних закладок з номером глави понад 151; `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. **Увесь батьківський SA-EXT-01 та SA-EXT-02…20 залишаються OPEN.** Нові вимоги/конкретні регресії окремі.

- **Підтверджена до виправлення помилка:** у канонічному `app/api/bookmarks/route.ts` спільна функція `valid(body)` обмежувала `chapter <= 151` одночасно для PUT і DELETE. Старі зіпсовані записи з номером 152+ можна було приховати в інтерфейсі, але не вилучити через справжній API.
- **Реальна інтеграція:** [PR #564](https://github.com/Oleksii-debug/scripture-archive/pull/564) **SQUASH MERGED** в `main@9e32555a6f1ac4845d7203e8757a9eae64fdb12c`. Канонічний source blob `app/api/bookmarks/route.ts@511d2621bf025041eb04a829a9b13ecba8a024ac`, regression `tests/bookmark-legacy-delete.test.mjs@3f6835ee2d490eaed6248be6d30209a45e8ea70e`. GitHub PR=merged, source і test blobs в актуальному main; compare merge→main при readback: 1 commit ahead, 0 behind. Не створено другого сервера, маршруту, D1-міграції чи UI.
- **Поведінка:** PUT і далі приймає тільки додатні безпечні цілі числа 1–151 та перевірені межі книги/локального видання; DELETE приймає додатні **safe-integer** історичні номери, без послаблення same-origin, перевірки облікового запису, prepared `user_id` predicate або D1 ACK. Недопустимі дробові, від'ємні, нечислові та unsafe величини відхиляються; відсутній запис видаляється ідемпотентно.
- **Фактично виконані перевірки:** [Actions #41024491791](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41024491791), точний feature HEAD `2cf577e3c225dbecc965bd19904e5bc1006ce1c5`: native Node **1239 PASS, 0 FAIL, 1 SKIP** (у т.ч. всі 4 нові actual-route тести); TypeScript, lint, source build, Python **2 PASS**. **Повний CI FAIL:** disposable Wrangler Worker/D1 двічі **21/22** через `Your worker restarted mid-request` та HTTP 503; незалежний від цього scoped fix блокер [#361](https://github.com/Oleksii-debug/scripture-archive/pull/361). Не називати E2E green.
- **Не заявляємо:** батьківський SA-EXT-01 завершений, підтверджений інстальований Cloudflare Sites SHA, production release, реальна перевірка браузера/клавіатури/фізичний NVDA або повні права на видання. Це не причина повторно розробляти цю вузьку вже злиту функцію.

## 2026-10-30 — SA-EXT-16 / COMMUNITY_RATE_LIMIT_AND_INTEGER_PAGING — ЗАКРИТО ДЛЯ РОЗРОБКИ (вузькі дефекти)

**Рішення:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` **лише** для конкретної невірної обробки помилок читання каталогу спільнот та нецілих параметрів сторінок. `remaining_scoped_implementation=0`; `necessary_unmerged_feature_PRs=0`. **Повний SA-EXT-16 і всі SA-EXT-01…20 залишаються OPEN**. Це не реліз і не перевірка живого сайту/Windows/NVDA.

- **Дійсні дефекти:** публічний `GET /api/community` чекав `rateLimit()` перед будь-яким `try/catch`; аварія сховища обмеження запитів ставала винятком і HTML/500, замість правдивого приватного JSON 503. У власницькому `GET?action=owner` зламаний `authenticateRequest` або `communityOwnerState` теж падав незахищеним винятком. `page=1.9` чи `pageSize=12.5` повертав дробові курсори, хоча `Array.slice` округлював, створюючи розбіжність між API й реальною пагінацією.
- **Реалізація:** [source PR #567](https://github.com/Oleksii-debug/scripture-archive/pull/567) **SQUASH MERGED** до `main@e9003b46cbd0ace1e424e48e5df25ce7357fa4e3`. Збережено єдиний канонічний `app/api/community/route.ts`: `rateLimit` та owner authority тепер fail-closed `503 community_unavailable` з JSON/no-store, реальні перевищення ліміту лишаються `429`, нецифрові/дробові/занадто довгі курсори мають безпечні стандартні цілі значення, коректні цілі десяткові — чинні мінімум/максимум. Жодного нового API/кешу/D1-схеми/облікового запису/розсилки.
- **GitHub readback:** після злиття перевірені `merged=true`, source blob `app/api/community/route.ts@5c92d2b9ab2c15323e69bf7e88023954efc84d00`, production-route tests blob `tests/community-read-availability.test.mjs@a3c26216b24245d16f8cddb292603bfe1fbeabaa`.
- **Exact-head tests:** [Actions #41024781806](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41024781806) для `7a65db07bef602a7e5c91d2c2480ec89fccf6253`: **1245 native Node PASS / 0 FAIL / 1 SKIP**, у тому числі нові real-route tests rate-limit outage/429, owner auth/state outage, цілі/дробові й надмірні курсори; TypeScript, ESLint (0 errors), source build, Python validators PASS. До цього перший exact-head CI #41024615650 виявив невідповідність верхнього тесту й regex, виправлену до злиття; початковий RED не приховано.
- **Загальне CI все ще RED:** disposable Worker/D1 21/22 на двох ізольованих запусках із `Your worker restarted mid-request`, HTTP 503 замість 200 на сторонній state-changing операції; відомий [#361](https://github.com/Oleksii-debug/scripture-archive/pull/361). **Немає** 22/22 E2E PASS, доведеного production SHA, браузерного/NVDA приймання, закриття всієї приватності або SA-EXT-16. Scope цього виправлення terminal і не відкривати без реальної регресії чи нової вимоги.

## 2026-10-30 — SA-EXT-01/16 / READER_RAW_JSON_HISTORY_FALLBACK — ЗАКРИТО ДЛЯ РОЗРОБКИ (вузький дефект)

**Статус:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` тільки для захисту від перезаписування **раніше збережених сирих некоректних JSON-байтів** `sa.readingHistory` під час натискання `#mark-read`; `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. **Усі батьківські SA-EXT-01…20 OPEN**, зокрема SA-EXT-01 і SA-EXT-16.

- **Реальна невідповідність:** `public/app.js::loadJSON(key,fallback)` раніше для існуючого, але некоректного `sa.readingHistory` безумовно повертав `[]`. Обробник `#mark-read` записував новий масив замість збережених байтів, стираючи доказ для відновлення. Попередній scoped PR #561/#563 захищає **вже декодовані** неправильні рядки, але не міг відрізнити існуючий некоректний JSON від відсутнього ключа.
- **Виправлено в канонічному UI:** [PR #568](https://github.com/Oleksii-debug/scripture-archive/pull/568) **SQUASH MERGED** `main@200ffa857d97f1e733989766ab0f77cb066891da`. Опціональна сувора семантика `loadJSON(key,fallback,true)` застосована **лише** для реального запису історії читача; старі виклики за замовчуванням залишаються сумісними. Відсутній ключ = законна порожня історія; існуючі пошкоджені JSON-байти або помилка читання повертають `null` до вже інтегрованої перевірки #561, яка не запускає write, account PUT, attempt unlock та повідомляє UK/RU/EN про потребу відновлення. Жодних серверів/сторінок-дублікатів.
- **Докази GitHub readback:** головна гілка і merged source PR підтверджені; `public/app.js@2aa789f94a43322dde2903a75e8c356101b081b5`; `tests/reader-raw-json-preservation.test.mjs@4ebc2a2a6c8f25d1bdd2c3495ae0a547dc2870cc`. Раніше інтегроване виправлення decoded history #561 збережено.
- **Exact-head CI:** [Actions #41024632586](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41024632586) на `head@2a2cb387429f60d7cd24c81e80a510d09a65cf24`: **1247 native Node PASS / 0 FAIL / 1 SKIP**, TypeScript PASS, lint PASS, production build PASS, Python **2 PASS**. Власні regression cases виконують **справжній loader і справжній reader handler** для сирого некоректного JSON, валідного JSON, відсутнього ключа, відмови device storage, старого principal і UK/RU/EN.
- **Загальний CI RED:** disposable локальний Wrangler Worker/D1 **21/22 двічі** повернув `Your worker restarted mid-request` HTTP 503 (необхідні 403/200) — вже існуючий незалежний [PR #361](https://github.com/Oleksii-debug/scripture-archive/pull/361). Не називати workflow green чи доведеним повне e2e.
- **Межі:** не підтверджено фактично встановлений Cloudflare Sites SHA, справжній Chrome/NVDA; жодного deployment. Повні 20 батьківських розділів ще не закриті; інші підтримувані формати/мови не розроблялися.

## 2026-10-30 — SA-EXT-01 / PARALLEL_EDITION_SELECTION_ASYNC_LEASE — ЗАКРИТО ДЛЯ РОЗРОБКИ (вузький дефект)

**РОЗДІЛ № SA-EXT-01 — лише підпункт PARALLEL_EDITION_SELECTION_ASYNC_LEASE: CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL.** `remaining_scoped_implementation=0`; `necessary_unmerged_PRs=0` для цього відтвореного дефекту. **Увесь батьківський SA-EXT-01 та інші 19 повних SA-EXT залишаються OPEN.**

- **Реальна помилка:** у штатному паралельному читачі вибір видання B під час асинхронного завантаження A міг показати застарілий текст A під вибраним B і помилковий успішний статус. Actual-source V8 із вихідним blob `c9030e086a0ee4d8d93fe8cb4478dbc424d50047`: RED підтверджено.
- **Інтеграція:** [PR #562](https://github.com/Oleksii-debug/scripture-archive/pull/562) SQUASH MERGED у точний `main@4bf3cd86a620c0561de798ff5c57a94c2340d486`. Канонічний `public/parallel-reader.js` blob `8b8a7f7cbc069d823e7195f66c0df5d34218c4ac`, `tests/parallel-reader.test.mjs` blob `be6a36131f6417d90c0ace11aad3a82d8ad4e076` перевірено в main. Захист після першого та останнього server check відкидає старий selection; статус повтору перекладено uk/ru/en; права/джерела, читальна сесія, коректне блокування глав, фокус збережено; три нові регресійні тести.
- **Фактично перевірено:** V8 exact-source 11/11 focused PASS; [GitHub Actions #41024254433](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41024254433): native Node suite PASS, TypeScript PASS, ESLint PASS, source build PASS, canonical Python validators PASS. **Повний workflow FAIL:** disposable Worker/D1 `tests/api-flow.test.mjs` двічі отримав окремий Wrangler restart / HTTP 503 замість 200/403, існуючий infra [#361](https://github.com/Oleksii-debug/scripture-archive/pull/361). НЕ заявлено E2E 22/22 PASS.
- **Поза закриттям:** весь SA-EXT-01, права на всі переклади, deployed Sites SHA, дійсний браузер/Windows/NVDA, DNS/email та випуск. Немає нового production deploy. Вузький підпункт не призначати на повторну реалізацію без відтвореної нової регресії або нової затвердженої вимоги.

---

## 2026-10-30 — SA-EXT-01/16 / READER_MARK_READ_INVALID_DECODED_HISTORY — ЗАКРИТО ДЛЯ РОЗРОБКИ (вузький дефект)

**Статус:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` тільки для безпечної відмови від позначення глави прочитаною, якщо **вже декодована** локальна історія містить неправильний тип записів, наприклад `[null]`, `false`, `{book:'GEN',chapter:'1'}`, чи замість масиву є об'єкт. Для цього конкретного дефекту `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. **Батьківські SA-EXT-01, SA-EXT-16 і всі 20 SA-EXT-01…20 залишаються OPEN.**

- **Відтворений дефект:** канонічний `public/app.js` читач `#mark-read` виконував `readingHistory.some(r=>r.book...)` без перевірки елементів: `null` спричиняв TypeError і не підтверджену дію. Декодований не-масив перетворювався на `[]` та міг бути записаний замість збережених записів; це порушувало збереження доказів для відновлення.
- **Виправлення без паралельної реалізації:** [PR #561](https://github.com/Oleksii-debug/scripture-archive/pull/561) **SQUASH MERGED** у `main@6d7a643a654c607792b4cb8ac5b1f932f5093fe2`. Під час натискання реальна читальня перевіряє допустимість кожного **декодованого** локального елемента перед `.some`, `.push`, локальним `setItem`, серверним `PUT` і розблокуванням завдань; якщо елемент неправильний, у UK/RU/EN звучить повідомлення про збережені без змін дані та необхідність відновлення, а кнопка лишається доступною. Не змінено поточний API, D1, principal guards, прогрес і значення вже записаних байтів.
- **GitHub readback:** source `public/app.js@2cddff56d536d6770ac32cd9fed724f841e3ae9e`; source-executing handler regressions `tests/reader-invalid-decoded-history.test.mjs@d6c89dd1dcb1ffeaae125b0a78234cd41a935a37`; PR #561 `merged=true`, exact main підтверджено.
- **Тести:** [GitHub Actions #41023963048](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41023963048) на точному `head@31424679bf4fd89c6865f353bd26659a2baaf415`: **1232 native Node PASS / 0 FAIL / 1 SKIP**, TypeScript PASS, lint PASS, build PASS, Python **2 PASS**. Тести виконують справжній `#mark-read` handler, перевіряють пошкоджені/змішані decoded rows, гостьову і підтверджену особу, дійсні збереження, три мови, контроль прав і недопущення перезапису; не лише текстовий grep.
- **Загальний CI:** **FAIL** через окремий disposable Wrangler Worker/D1 21/22 двічі, `Your worker restarted mid-request` HTTP 503 замість очікуваного 200; окремий [PR #361](https://github.com/Oleksii-debug/scripture-archive/pull/361) усе ще OPEN. Не позначати повний CI зеленим.
- **Чіткі межі:** сирі **невалідні JSON-байти**, які вже були перетворені `loadJSON` на fallback `[]`, не входять у цей вузький дефект; це окремий потенційний recovery case, а не підстава приписувати цей сценарій виконаним. Живий Cloudflare Sites, фізичний NVDA і браузерне acceptance **NOT VERIFIED**. Жодного релізу, публікації, зміни акаунтів чи платних сервісів.

## 2026-10-30 — SA-EXT-04 / MARATHON_REGISTRATION_INTEGRITY — ЗАКРИТО ДЛЯ РОЗРОБКИ (вузький дефект)

**Статус:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` тільки для зіпсованих полів активної реєстрації марафону. `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. **Батьківський SA-EXT-04 та решта SA-EXT-01…20 залишаються OPEN**. Це не новий продукт, не реліз і не підтверджене Windows/NVDA-приймання.

- **Відтворений дефект:** SQLite/D1 `group_marathon_registrations` використовує типи колонок без доменних `CHECK`. Збережений `weekly_goal='garbage'`, парні/нульові/надмірні цілі, невідомий `catchup_mode` або невалідний `start_date` могли давати `NaN` у перевірці тижня/розблокування чи помилковий fallback. Це відкривало обхід установлених правил групового марафону або маскувало пошкоджений запис як загальний збій бази.
- **Справжня інтеграція:** [PR #559](https://github.com/Oleksii-debug/scripture-archive/pull/559) **SQUASH MERGED** у `main@4f73f63fd5ab0b36c7e5de719917e104d99fdc1c`. Канонічні `app/api/groups/route.ts::POST?action=session` та `app/api/attempts/route.ts::POST?action=start` відмовляють з `409 marathon_state_invalid` до будь-якої нової сесії, спроби або споживання прочитаної глави, якщо збережений weekly goal не є непарним цілим 1–31, режим не `steady|flexible`, або початкова дата не справжня канонічна ISO-календарна дата. Звичайні активні марафони продовжують працювати. Не створено нового API, БД, migration чи дубльованого двигуна.
- **GitHub exact-main readback:** `merged=true`, `main` дорівнював SHA злиття. Production blobs `app/api/attempts/route.ts@17742336a80ef4710651c8f278efde9b4eb8152a` та `app/api/groups/route.ts@a76387547628e798fec9da74816ab3c962ab0752`; regression blob `tests/group-membership.test.mjs@6080ad753d0764ec2b57a287683de5cda6f99e92`.
- **Нативні тести точного feature head `867d869a9f6ed945939f371864b15cbbfd3cb0d0`:** [Actions #41023415243](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41023415243): **1221 Node PASS / 0 FAIL / 1 SKIP**, включно з дев'ятьма новими SQLite + справжніми TypeScript-роутами (8 негативних обох API, одна нормальна успішна сесія/старт); TypeScript, lint (0 errors), production source build, Python validators **PASS**. **Загальне CI FAIL**: disposable Worker/D1 **21/22** двічі з відомим `Your worker restarted mid-request`, 503 замість очікуваних 200/403; [PR #361](https://github.com/Oleksii-debug/scripture-archive/pull/361) залишається окремою проблемою інфраструктури. Не називати його 22/22 PASS.
- **Не підтверджено:** live Sites deployed SHA, справжній browser/NVDA/Windows, повний SA-EXT-04 та загальний реліз. Вужчий дефект terminal: повторне відкриття тільки за відтвореної регресії або нової затвердженої вимоги.

## 2026-10-30 — SA-EXT-03 / PUBLIC_REVIEWED_ANSWER_KEYBOARD_FOCUS — ЗАКРИТО ДЛЯ РОЗРОБКИ (вузька функція)

**Статус:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` **лише** для повернення клавіатурного фокуса після асинхронної перевірки відповіді у реальному публічному списку перевірених навчальних матеріалів `/library` і `/builder`. `remaining_scoped_implementation=0`; `necessary_unmerged_PRs=0`. Весь батьківський SA-EXT-03 і всі SA-EXT-01…20 — **OPEN**.

- **Відтворений дефект:** канонічний `public/material-review.js::renderPublicMaterials` вимикав сфокусовану кнопку перевірки відповіді під час `POST /api/material-review`. Chromium переводить клавіатурний фокус на `BODY`; після відповіді/помилки кнопку лише знову вмикали без відновлення фокуса, що блокувало наступну послідовну NVDA/keyboard дію.
- **Інтеграція в головну платформу:** [source PR #557](https://github.com/Oleksii-debug/scripture-archive/pull/557) **SQUASH MERGED**, exact `main@b9f85a402399d01b7a110c9fffb9649259fe09d4`; production blob `public/material-review.js@ac6f29177a53f8d6c082595d44c0fae27786f142`; regression blob `tests/public-review-answer-focus.test.mjs@f1abc99ef79d5f5442b36a475a877a1c6f0804b4`. Відновлення фокуса дозволене тільки при початковому фокусі на submit, незмінному поточному principal/route, підключеній формі/панелі й відсутності переміщення фокуса користувачем. Реальна API-логіка, права, оцінка, збереження, дані й UK/RU/EN лишилися канонічними. GitHub реальний main, merge і blob повторно прочитані.
- **Доказ точного HEAD:** [GitHub Actions #41023073077](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41023073077), `head@a47297c7a2843e92d6c7871fdf247e2498b9728d`: native Node **1212 PASS / 0 FAIL / 1 SKIP** (в тому числі 13 доданих сценаріїв), TypeScript PASS, lint PASS, source build PASS, Python **2 PASS**. Негативні та recovery сценарії перевіряють помилку мережі, неправильну відповідь, зміну акаунта/маршруту, від'єднану форму/панель, сторонній фокус, програмну подію, повторну дію, українське й російське озвучення.
- **Загальний CI RED:** disposable локальний Worker/D1 **21/22** на двох свіжих спробах, `Your worker restarted mid-request`, HTTP 503 замість очікуваного 403 на cross-origin mutation `tests/api-flow.test.mjs`; окремий незалежний [#361](https://github.com/Oleksii-debug/scripture-archive/pull/361). Не називати повний workflow green і не ослаблювати захисні перевірки.
- **Поза цим закриттям:** загальні авторські/редакційні вимоги SA-EXT-03, увесь план із 20 розділів, live Cloudflare Sites installed SHA, фізичний NVDA, реальний браузерний acceptance, розгортання — не перевірені. Не виконано production rollout, змін прав користувачів, платних сервісів чи додавання мов.

## 2026-10-30 — SA-EXT-02 / ATTEMPT_INVALID_EXPIRATION_FAILCLOSED — ЗАКРИТО ДЛЯ РОЗРОБКИ (вузький дефект)

**Остаточне рішення:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` **тільки** для пошкодженого терміну дії активної навчальної спроби. `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. **Повний батьківський SA-EXT-02 та всі SA-EXT-01…20 залишаються OPEN**; цей запис не є загальним завершенням чи production-релізом.

- **Відтворений дефект:** у канонічному `app/api/attempts/route.ts` перевірка `Date.parse(attempt.expires_at) <= Date.now()` пропускала рядки з `NaN` (вона обчислювалася як `false`), тому зіпсований `expires_at` міг обійти строкову перевірку читання завдання та запису відповіді.
- **Завершена реалізація:** [PR #554](https://github.com/Oleksii-debug/scripture-archive/pull/554) **SQUASH MERGED** у точний `main@cc75a807ddec047306e6bc419d2d73e36b6b9edf`. Єдина канонічна функція `attemptDeadline` тепер вимагає рядкового, непорожнього, необрізаного й скінченного значення; `GET current` і `POST answer` обидва повертають `409 attempt_state_invalid` до показу завдання/мутації. Чинний строк повертає завдання, справді прострочений — колишній `410 attempt_expired`. Жодних змін D1-схеми, обходів авторизації чи окремого сервісу.
- **GitHub readback:** `merged=true`; `main` дорівнював merge SHA, `compare merge→main = identical` у момент перевірки. Source blob `app/api/attempts/route.ts@c111d5d0d814cee5ca75478c152ea1ddf26d2771`, тест `tests/attempt-expiry-failclosed.test.mjs@5cafdc014efdf446c25c039731484dcbe0aa3c9e`.
- **Реальне тестування exact PR head:** [Actions #41022360951](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41022360951): native Node **1199 PASS / 0 FAIL / 1 SKIP** (1200 загалом), включно з 11 новими actual-route сценаріями; TypeScript, ESLint (0 errors, 12 warnings), source build і два Python validators **PASS**. Загальне CI **FAIL**, а не PASS: disposable Worker/D1 **21/22**, старий Wrangler `Your worker restarted mid-request`, HTTP 503 на `POST /api/editor-roles` або `POST /api/material-review`; один rerun цього workflow також FAIL. Це незалежний CI/Worker blocker, який уже координується в [#361](https://github.com/Oleksii-debug/scripture-archive/pull/361), не виправлений цим вузьким PR.
- **Не заявляємо:** 22/22 E2E, реальний production-деплой, живий браузер, Windows/NVDA, закриття батьківського SA-EXT-02 чи всіх 20 розділів. Повторне відкриття цього scoped дефекту — лише при новій вимозі або конкретній регресії.

## 2026-10-30 — SA-EXT-02 / READING_HISTORY_DUPLICATE_COUNT — ЗАКРИТО ДЛЯ РОЗРОБКИ (вузький дефект)

**Рішення:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` тільки для повторів однакової глави в локальній історії читання на канонічній сторінці `/progress`. `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. **Батьківський SA-EXT-02 і всі SA-EXT-01…20 залишаються OPEN.** Перероблення цього завершеного дефекту — лише за новою вимогою або відтвореною регресією.

- **Проблема:** раніше `verifiedLocalReadingHistory` перевіряв структуру та останні 2048 локальних записів, але повторні правильні `book:chapter` помилково збільшували показник «глав прочитано» і дублювали посилання на ту саму главу. Це не повторні роботи #529 та #535.
- **Реальний GitHub main:** [source PR #551](https://github.com/Oleksii-debug/scripture-archive/pull/551) SQUASH MERGED у `main@7b03505d3b242641f6d4547c961d613f169c2449`. Канонічний `public/workspace.js` залишає тільки найновіший валідний запис на главу в рамках того самого обмеженого вікна, зберігає порядок і назви, **не** змінює самі storage-байти, principal guards, сервер або маршрути. GitHub merged/ref/source readback підтверджено: source blob `9bf41460b5e715328f1db72cad4547a60b0159c9`; 15 нових tests blob `3db06dbe18e91e60a25a3ee04ba163a75cf64d46`; коригування старих тестів blob `635eed6e4ace27af3ff915cfd91fb6e377705958`.
- **Exact-head CI:** [Actions #41022161817](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41022161817) на `0d0aecf1c3b90b3b7fa5c1b3d79bc8dc12f0c77d`: native Node **1188 PASS / 0 FAIL / 1 SKIP**, включно з 15 новими regression cases та рендером справжнього `/progress`; TS, lint 0 errors, production build, Python **2 PASS**. Існуючі тести 1189 глав використовують **1189 реальних різних** глав із канонічного біблійного каталогу, а не повтори 150 псалмів.
- **Загальний workflow RED:** незалежний disposable Worker/D1 **21/22** на двох свіжих спробах: `Your worker restarted mid-request`, HTTP 503 замість 403 у `tests/api-flow.test.mjs:100`; відомий окремий [PR #361](https://github.com/Oleksii-debug/scripture-archive/pull/361). Не записувати повний CI SUCCESS.
- **Не підтверджено:** актуальний встановлений Sites SHA, браузер/клавіатура/фізичний NVDA, весь SA-EXT-02, production release. Жодних змін хостингу, пошти, платних сервісів або додаткових мов.

## 2026-10-30 — SA-EXT-03 / LEGACY_APPROVED_SNAPSHOT_BOUNDS — ЗАКРИТО ДЛЯ РОЗРОБКИ (вузька функція)

**Офіційний статус:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` тільки для перевірки історичних затверджених навчальних матеріалів за поточним контрактом конструктора; `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. **Батьківський SA-EXT-03 залишається OPEN.** Це не підтвердження повної готовності конструктора або production.

- **Реалізація:** [PR #550](https://github.com/Oleksii-debug/scripture-archive/pull/550) **SQUASH MERGED**, точний інтеграційний `main@b1048e8b7a69ac5226ff17ae95dde271748f50fc`. Канонічний `app/api/material-review/route.ts` тепер відхиляє некоректні застарілі затверджені знімки, які перевищують наявні межі автора: заголовок 160, запитання 3000, посилання 200, відповідь/варіант 500, пояснення 2000; порожні варіанти й невідомі мови поза uk/ru/en не приймаються. Публічний список, відповідь і приватний редакційний перегляд користуються тією самою перевіркою без другої БД, зміни збережених даних або автоматичної публікації.
- **Readback вихідного коду:** GitHub source blob `5adc368e9672ef1238394042f8b014216137fede`; тестовий blob `tests/material-review.test.mjs@e52a1411c233be147b1f528f2752ed5dbbe51a70`; `main` дорівнював merge SHA при перевірці, `behind_by=0`.
- **Виконані тести:** [Actions #41021747995](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41021747995), exact feature head `f294b56b8a471f329a297cc83b50283f41b279d2`: **1159 Node PASS / 0 FAIL / 1 SKIP** з 1160; регресія восьми типів пошкодження × три реальні маршрути плюс відновлення правильного знімка; TypeScript, lint, source build, Python 2 PASS. **Повний CI FAIL:** disposable Wrangler Worker/D1 **21/22**, дві спроби, перезапуск Worker і HTTP 503 на `POST /api/editor-roles`; окремий відкритий PR #361. Не називати CI повністю GREEN.
- **Залишок:** у межах цієї вузької функції реалізаційних задач немає. Браузер, фізичний NVDA, deployed Sites SHA, права/редакційне приймання всієї платформи, надійність Worker/D1 та решта батьківського SA-EXT-03 залишаються окремо OPEN. Повторна розробка саме цієї перевірки — лише за новим відтвореним дефектом чи затвердженою вимогою.

# SCRIPTURE ARCHIVE — каталог розділів і план реалізації розширень

## 2026-10-30 — SA-EXT-02 / UNKNOWN_ASSESSMENT_LIFECYCLE_DENIAL — ЗАКРИТО ДЛЯ РОЗРОБКИ (вузький дефект)

**Статус:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` **лише** для недопущення видачі поточного навчального завдання зі зіпсованим/невідомим статусом спроби. `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. Батьківський **SA-EXT-02 та всі 20 батьківських розділів залишаються OPEN**.

- **Відтворений ризик у коді:** `GET /api/attempts?action=current` раніше обробляв `invalidated`, `grading`, `completed`, після чого без явного `status === 'active'` видавав наступне питання також для будь-якого невідомого значення `mission_attempts.status`. Схема `drizzle/0004_accounts_attempts.sql` має поле `TEXT NOT NULL DEFAULT 'active'`, але не гарантує enum CHECK. Пошкоджений чи майбутній статус не повинен відкривати завдання.
- **Інтегровано:** [PR #549](https://github.com/Oleksii-debug/scripture-archive/pull/549) **SQUASH MERGED** у підтверджений `main@5fcbe43f2b0badb30297f054d8ce8c0e43fc9afc`. Канонічний `app/api/attempts/route.ts@772175e639cf92ef2fe0cb91ebe1970d89a87bd5`; regression `tests/attempt-status-failclosed.test.mjs@baff89f63a21cb2ceeef18b5461297c77fcc7a8b`. Невідомі статуси отримують 409 `attempt_state_invalid` і жодного `task`; авторизований активний сценарій, `grading`, `invalidated`, `completed`, expiry та відсутня/чужа спроба зберегли власні контрактні відповіді. Нового API/БД/копії рушія немає.
- **Тестування точного PR HEAD `98f85d7da4dcd1a8e3591a47f5643cc90c6a1cb1`:** [GitHub Actions #41021606846](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41021606846) нативна Node-регресія **1172 PASS / 0 FAIL / 1 SKIP**; TypeScript, lint, source build, Python **2 PASS**. **Повна CI FAILURE**, і це не приховано: disposable Wrangler Worker/D1 двічі в першому запуску та двічі під час rerun отримав `Your worker restarted mid-request`, HTTP503 замість очікуваного 400/403/200 на сторонніх HTTP запитах, **21/22 PASS**. Це спільний відомий інфраструктурний блокер [PR #361](https://github.com/Oleksii-debug/scripture-archive/pull/361), а не PASS цього E2E.
- **Поза межами:** нові місії/педагогічна якість, browser/physical NVDA, production Sites SHA, реліз, source rights і весь SA-EXT-02 **НЕ ЗАКРИТО**. Немає deploy. Вузький код не віддавати знову в розробку без відтвореного дефекту чи нової затвердженої вимоги.

## 2026-10-30 — SA-EXT-01 / BOOKMARK_CANONICAL_EDITION_CHAPTER_BOUNDS — ЗАКРИТО ДЛЯ РОЗРОБКИ (вузький дефект)

**Статус:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` виключно для відображення недопустимих записів закладок на сторінці читання. `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0` лише тут. **Повний SA-EXT-01 і всі інші 19 батьківських розділів залишаються OPEN**; це не production/NVDA та не загальний реліз.

- **Дефект:** `public/app.js::mountReaderBookmarks` приймав будь-яке `Number.isInteger(chapter)>0` для відомої книги, навіть коли в обраному виданні глави не існує; посилання на `GEN/51` і `uk-ohiienko/JOL/5` порушували справжню навігацію, великі числа створювали оманливі URL. `null` серед давніх рядків зривав усі придатні закладки.
- **Справжня реалізація:** [PR #546](https://github.com/Oleksii-debug/scripture-archive/pull/546) **squash MERGED** `main@d0785d1d7fb26c8ad7cfa2883e69c1cca6965c91`. Перевірка використовує **вже наявний** каталог глав `books` конкретного локального видання, перевірку безпечного цілого та необов'язковість пошкодженого рядка; без нової бази, паралельної навігації чи видалення коректних закладок. Попередня захисна прив'язка до поточної глави [#542](https://github.com/Oleksii-debug/scripture-archive/pull/542) збережена.
- **Readback GitHub:** merged=true, останній перевірений exact source `public/app.js@8d512bb5e7157417c0da6ce25c0ef114e7cf75da`, регресія `tests/bookmark-ui.test.mjs@699246195c8f9eec890dab66d1489c4183dcfcc2`, перевірений `main` дорівнює SHA злиття. Два нові тести запускають **справжню** функцію UI: суміш пошкоджених та валідних закладок не прибирає доступні `GEN/12`, `GEN/50`; локальна глава `uk-ohiienko/JOL/4` доступна, `JOL/5` заблокована.
- **Тестування:** [GitHub Actions #41021110735](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41021110735) exact feature head `94f194e4050e0ead74d3281a8edf1efa908594e8`: весь workflow **SUCCESS**, native Node **1158 PASS / 0 FAIL / 1 SKIP** (усього 1159); disposable Worker/D1 **22/22 PASS**, TypeScript, ESLint (0 errors, попередження), production source build та 2 Python validators **PASS**. Це source/ізольований E2E і **НЕ** фізичний NVDA, браузерне production-приймання або встановлення Sites SHA.
- **Незавершені вимоги батьківського розділу:** ліцензії повних видань, паралельні порівняння, ширший корпус/експорт, реальне browser+NVDA, опублікований SHA і перевірка live-сайту. Ця вузька функція не підлягає повторній розробці без нової вимоги чи відтвореного дефекту. Не запускали додаткові мови, синтетичні акаунти, деплой, платежі чи розсилку.

## 2026-10-30 — SA-EXT-01 / PARALLEL_READER_KEYBOARD_SUBMIT_FOCUS — ЗАКРИТО ДЛЯ РОЗРОБКИ (вузький дефект)

**Статус:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` лише для відновлення фокуса клавіатурної кнопки порівняння видань; `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. **Увесь батьківський SA-EXT-01 та решта 20 розділів залишаються OPEN.** Нові переклади, редакційні права, фізичний NVDA й deployed Sites SHA не вважаються прийнятими.

- **Відтворений дефект:** у наявній канонічній читальні `public/parallel-reader.js` кнопка порівняння тимчасово вимикається на час подвійної перевірки доступу до глави та завантаження тексту. Chromium при вимкненні сфокусованої кнопки переносить фокус до BODY, а старий код не повертав його після відповіді. Це порушує клавіатурний сценарій без створення нового рідера.
- **Інтегровано:** [PR #543](https://github.com/Oleksii-debug/scripture-archive/pull/543) **SQUASH MERGED** у підтверджений `main@517fc83057a078755c94c3e3d7bfd8bd3b5b141c`. JS production blob `c9030e086a0ee4d8d93fe8cb4478dbc424d50047`; regression blob `0ee7a70b89ab9f0fe741a40695ba6c96de5441bd`. Після операції лише для того самого підключеного principal/reader повертається фокус на кнопку, якщо він не перемістився на інший елемент; перехід зі сторінки, новий principal та заблокована глава не отримують старого фокуса. Всі наявні pre/post chapter guards, переклади UK/RU/EN і provenance збережено.
- **Реальні тести точного PR HEAD `0ecf0caabbb67138d321653c34ba067ad4e19b06`:** [Actions #41020851542](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41020851542) **SUCCESS**; нативний Node 1156 PASS / 0 FAIL / 1 SKIP (1157 tests), disposable Worker/D1 **22/22 PASS**, TypeScript/lint/source build PASS, Python validators **2/2 PASS**. Власні 8 кейсів також 8/8 PASS у незалежній ізольованій V8 перевірці. Це не тест фізичного NVDA чи реального production.
- **Відомі межі:** активний сайт/Sites deployed SHA, Windows/WebView2, реальна клавіатурна сесія NVDA, редакційні права й повний SA-EXT-01 лишаються `NOT_VERIFIED`. Публікацію не виконували. Не починати повторну розробку цього scoped дефекту без конкретного відтворення чи нової вимоги.

## 2026-10-30 — SA-EXT-01 / BOOKMARK_SAME_PRINCIPAL_CHAPTER_LEASE — ЗАКРИТО ДЛЯ РОЗРОБКИ (вузький дефект)

**Рішення:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` **лише** для випадку, коли відповідь закладок попередньої глави того самого користувача помилково з'являється в новій главі. `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. Батьківський **SA-EXT-01** і всі 20 повних батьківських розділів **залишаються OPEN**: вичерпний паралельний читач, ліцензійно перевірені переклади, зовнішні джерела, повноцінне NVDA/browser та production приймання ще не підтверджені.

- **Фактичний дефект:** canonical `public/app.js::mountReaderBookmarks` перевіряв тільки `panel.isConnected` та `state.user`. Перехід між главами під тим самим обліковим записом не змінює цих умов; запізнілий `GET /api/bookmarks` міг відмалювати застарілий список і кнопку закладки в новій главі. Неправильно активний старий обробник міг зберегти/видалити закладку попередньої глави; запізнілий збій міг затерти актуальний стан.
- **Реалізація:** [PR #542](https://github.com/Oleksii-debug/scripture-archive/pull/542) **squash MERGED** у `main@b564811921e7a1b5ddbd0dc7afaaf57852d1cbc9`. Успадкований principal guard збережено; додано перевірку незмінного посилання на **наявний канонічний** `state.currentReader`, який `renderReader` оновлює при переході між главами. Жодних окремих баз/маршрутів/копій біблійних текстів, обхідних прав або fake save немає.
- **Readback:** PR merged=true, на точному source-main source blob `public/app.js@359d0283e732ae8da5875b21a8045a61f091c4d6`, regression blob `tests/bookmark-ui.test.mjs@87338ac8a7ccd2edee95029c94b0c28d9325ed66`; `main` на контрольному readback дорівнював SHA злиття. Три нові перевірки проходять шлях фактично виділеної функції UI: запізнілий успішний GET при переході глава→глава, запізніла невдала відповідь, стара кнопка без права виконати запис у новій главі.
- **Фактично виконані тести:** [Actions #41020548290](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41020548290) на точному PR HEAD `07cf5d8504c8502924822421d69161c3bf680e64`: native Node **1148 PASS, 0 FAIL, 1 SKIP**; TypeScript PASS, ESLint 0 errors / 12 warnings, production source build PASS, Python validators PASS. **Увесь workflow FAIL**: unrelated disposable Wrangler Worker/D1 **21/22**, HTTP503 на `POST /api/attempts`, відомий окремий чернетковий [PR #361](https://github.com/Oleksii-debug/scripture-archive/pull/361). Цей помилковий E2E не приховано; не прирівнювати до повного PASS.
- **Поза цим підтвердженням:** реальний сайт `scripture-archive.com`/розгорнутий SHA, фізичний Windows/NVDA, браузерна клавіатурна сесія, всі 20 батьківських розділів. Ні деплой, ні нові мови, ні нові сповіщення/платежі не виконувалися. Повторна розробка цієї вузької логіки — лише за нової вимоги або відтвореного регресійного дефекту.

## 2026-10-30 — SA-EXT-03 / LEGACY_PUBLIC_MATERIAL_FIELD_ALLOWLIST — ЗАКРИТО ДЛЯ РОЗРОБКИ (вузька функція)

**Статус:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`, `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`, тільки для захисту історичного публічного `GET /api/materials` від надлишкових полів. **Батьківський SA-EXT-03 залишається OPEN**: це не фінальне приймання конструктора/редакційного конвеєра.

- **Відтворений ризик:** старий публічний список виключав із довільного JSON тільки два ключі (`answer`, `explanation`), тому інші невідомі поля попередніх публічних записів могли передаватися анонімним читачам. Внутрішнє сховище та збережені чернетки не змінювалися.
- **Реалізовано:** [PR #540](https://github.com/Oleksii-debug/scripture-archive/pull/540) squash MERGED у `main@1a5db3f41d24ac47f3aa23fcc396b78e7123cf66`. Канонічний `app/api/materials/route.ts` тепер повертає з історичного публічного JSON лише `prompt`, `reference`, перевірений масив рядкових `options`; зіпсовані публічні поля закривають усю відповідь як контрольовану помилку без часткового витоку. Для справжнього автора його приватні чернетки повертаються без втрати `answer` та `explanation`. Жодного нового API/сховища або розгортання.
- **Точний readback GitHub:** PR `merged=true`, source blob `app/api/materials/route.ts@98c2b0b9c013f91c8fae563f4d7e8723e5f49b5a`, tests blob `tests/materials-d1-ack.test.mjs@f7a16b420f999512752dbd6c172d81c5e68688a6`.
- **Тести:** [Actions #41019810193](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41019810193), PR head `8640ec0f9f40b5d76eeafcb18ad6b18cb2f8a321`: **1145 Node PASS / 0 FAIL / 1 SKIP із 1146**, включно з 3 новими реальними TypeScript-route/SQLite перевірками; **22/22** disposable Worker/D1 PASS; TypeScript, lint, production source build PASS; Python 2 PASS. **CI SUCCESS для цього точного HEAD**; це не підтвердження релізу або стабільного усунення попередніх 503 на інших комітах.
- **Не засвідчено:** повний SA-EXT-03, браузер/клавіатура/реальний NVDA, незалежне редакторське приймання всіх матеріалів і deployed SHA. Повторне розроблення вже злитої вузької функції — лише за конкретного дефекту чи нової затвердженої вимоги.


## 2026-10-30 — SA-EXT-07 / ACADEMY_UNCONFIRMED_LOCAL_SAVE_COPY — ЗАКРИТО ДЛЯ РОЗРОБКИ (вузький дефект)

**Рішення:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` тільки для неправдивого повідомлення про незмінність прогресу після непідтвердженого запису Академії. **Батьківський SA-EXT-07 та всі SA-EXT-01…20 залишаються OPEN.** Повторне розроблення цієї конкретної поведінки — лише за нової вимоги або відтвореного дефекту.

- **Проблема:** `public/scripture-academy.js` повідомляв, що прогрес точно «не змінено», навіть якщо `localStorage.setItem` змінив дані, а наступний контрольний `getItem` повернув інший запис або помилку. Відсутність підтвердження не доводить відсутність фактичного запису.
- **Реальна інтеграція:** [PR #534](https://github.com/Oleksii-debug/scripture-archive/pull/534) **squash MERGED**, exact `main@5ed91a9a0831f64c76eeae7b5a509e2b18fc4968`, source blob `public/scripture-academy.js@cd0c2a11770c624e9cd34aabcbc28c05791035e6`; new regression `tests/academy-save-uncertainty.test.mjs@b7ddfe3c62a3185a7acd79e9b4c4fb9e4454b15d`, existing `tests/scripture-academy-course.test.mjs@95ec0f874dfdf6ca6d131011934a33b1032c6af2`. Повідомлення uk/ru/en тепер чесно каже «не вдалося підтвердити збереження» й пропонує повторно відкрити сторінку; ніякого скидання/запису/повторної небезпечної мутації не додано.
- **Тести:** вихідний JS із exact PR source blob виконано в ізольованому V8 mock-DOM: 4/4 поведінкових випадки PASS. [Actions #41019274047](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41019274047) для exact feature head `16a6cd814932b197560cc757ee7ecc37c0cc3780`: **1134 Node PASS, 0 FAIL, 1 SKIP**, TypeScript PASS, ESLint PASS (попередження без errors), production source build PASS, Python validators **2 PASS**.
- **Окреме обмеження:** повний CI **FAIL**, disposable local Worker/D1 обидві свіжі спроби **21/22**, зовнішній restart HTTP 503 в `tests/api-flow.test.mjs:103` і відома задача [#361](https://github.com/Oleksii-debug/scripture-archive/pull/361). Це не збій виконання нового UI тесту й не дозвіл маскувати security assertions. Cloudflare Sites installed SHA, browser, Windows/NVDA та повний SA-EXT-07 **не перевірено**.
- **Залишок саме цього дефекту:** `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. Джерело `main` readback перевірено після merge; ніяких deployment, облікових даних, прав, реальних користувачів або додаткових мов не змінено.


## 2026-10-30 — SA-EXT-08 / REVIEWED_STUDY_LIBRARY_ROUTE — ЗАКРИТО ДЛЯ РОЗРОБКИ (вузька функція)

**Статус:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` для **окремого** опублікованого каталогу вже затверджених редактором навчальних матеріалів; `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. Увесь батьківський **SA-EXT-08 залишається OPEN**, як і всі інші незакриті батьківські розділи. Не називати це завершеною електронною бібліотекою, платним каталогом чи production-релізом.

- **Справжня інтеграція:** [PR #533](https://github.com/Oleksii-debug/scripture-archive/pull/533) squash MERGED у `main@8d383a5b4dd5e10f63e3184ae938c847746e6e40`. Доступна публічна Next-сторінка `/library`, навігація у справжньому шапковому меню (UK/RU/EN), SEO-метадані й sitemap. Вона викликає **наявний** `renderPublicMaterials()` і тільки перевірену публічну відповідь `GET /api/material-review?view=public`; форма перевіряє відповідь через той самий `POST /api/material-review`. Немає нового сервера, власної копії редакторської бази, фіктивної книги чи обхідного шляху до незатверджених матеріалів. Показує порожній стан і відновлювану помилку при недоступній базі. Відкладені відповіді не виводяться після зміни облікового запису, маршруту або невизначеного сеансу.
- **Точний readback:** source `public/workspace.js@a458fe2853300678b8d5390908ca809881f5c260`, Next route `app/[...slug]/page.tsx@8a251f29bd8dfb4b473bb8c6d8a3e7414d7478b2`, головна навігація `app/page.tsx@b403176e7f7033f4da38aaf43dbcf90744565954`, тести `tests/library-reviewed-route.test.mjs@2df3a62234cda3fb060d2f2e9dccf052600c12e5`. Перевірено PR `merged=true`, source main ref і наявність маршруту та викликів у головному коді.
- **Тести:** [Actions #41019231369](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41019231369), точний PR HEAD `9562da0153ef5aac1c00340b199a62a643b9b91a`, 1137 Node PASS, 0 FAIL, 1 SKIP із 1138; 6 нових source-executing перевірок навігації, трьох мов, пустого каталогу, XSS escaping, відмови API, race-guard та реального POST оцінювання. TypeScript, ESLint (0 errors), production source build, Python 2 PASS. **Повна CI FAIL**: окрема disposable Worker/D1 HTTP503 restart, 21/22; це чинний загальний блокер, [PR #361](https://github.com/Oleksii-debug/scripture-archive/pull/361), а не доказ успішного E2E.
- **Що НЕ закрито:** повні книжкові/аудіокорпуси, права на тексти, тематичний пошук і фільтри, імпорт/експорт, browser/keyboard/physical NVDA, перевірений live Sites SHA та випуск. Ці загальні завдання залишаються у відкритому батьківському SA-EXT-08. Без нової вимоги чи конкретного дефекту цю вузьку реалізацію повторно не створювати.


## 2026-10-30 — SA-EXT-02 / PROGRESS_LOCAL_READING_RECORDS — ЗАКРИТО ДЛЯ РОЗРОБКИ (вузька функція)

**РІШЕННЯ:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` тільки для захисту канонічної сторінки `/progress` від пошкоджених записів локальної історії читання. `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. **Повний батьківський SA-EXT-02 і SA-EXT-01…20 залишаються OPEN**: цей запис не означає готовність місій, навчальної пам'яті, продакшену чи NVDA.

- **Відтворений дефект:** до виправлення `c.loadJSON('sa.readingHistory',[])` використовувався без перевірки як масив записів. Зіпсований JSON-тип (наприклад, рядок) або `[null]` у локальному кеші зривав відображення `/progress` через `.reverse().map`/`r.book`; некоректні глави формували хибні посилання. Нової бази або другого маршруту не створено.
- **Завершена реалізація:** `public/workspace.js` перевіряє структуру кожного локального запису, довжину назви, допустимий формат і цілочисловий діапазон глави до формування доступних посилань і кількості. Некоректні елементи не виводяться, придатні не втрачаються, вихідне сховище не перезаписується; відмова браузерного storage не зриває сторінку. Раніше злиті перевірки довіри до principal/власника кешу залишено без послаблення.
- **GitHub:** [PR #529](https://github.com/Oleksii-debug/scripture-archive/pull/529) **squash MERGED**, точний source `main@c06006781e5d340132da14c43b59de873082c28e`, source blob `public/workspace.js@0fdeb3bb96e90024febda96ddb33740fc45548e7`, regression blob `tests/workspace-async-principal-fence.test.mjs@2826d465ffc6c00bdf34857ae45c8b727ebb3a28`; незалежно перевірено стан merged, `main` ref і обидва blobs.
- **Справжні тести:** [GitHub Actions #41017922308](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41017922308) на точному PR head `b7103805fa88f9cee3c802273b39fa61c5b7f9bb`: **1131 Node PASS, 0 FAIL, 1 SKIP** із 1132, включно з 3 новими source-executing regression тестами; TypeScript PASS, ESLint 0 errors / 12 warnings, production source build PASS, Python validators **2 PASS**. **Повна CI FAIL:** disposable Wrangler Worker/D1 `21/22` на двох незалежних спробах, відомий окремий restart `Your worker restarted mid-request`, HTTP 503; див. [PR #361](https://github.com/Oleksii-debug/scripture-archive/pull/361). Не оголошувати цей E2E PASS.
- **Неперевірено окремо:** browser/keyboard/NVDA, встановлений Sites SHA, реальна production інтеграція, повний батьківський розділ. Повторне розроблення цієї вузької функції — лише за новою вимогою або відтвореним дефектом.


## 2026-10-30 — SA-EXT-16 / PROGRESS_UNTRUSTED_READING_HISTORY — ЗАКРИТО ДЛЯ РОЗРОБКИ (вузький дефект)

**Розділ №16: лише цей конкретний підпункт — `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.** `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0` саме для описаного дефекту. **Батьківський SA-EXT-16 та інші SA-EXT-01…20 залишаються OPEN.**

- **Виправлена функція:** канонічний `public/workspace.js` на сторінці прогресу не читає і не показує локальну історію попереднього користувача, якщо `localReadingStorageUntrusted` або `unownedReadingPendingRecovery` вказують на недоведене володіння даними. Перевірка виконується після асинхронного завантаження історії спроб і охоронного `stillCurrent()`. Для підтвердженого власника історія продовжує відображатися. Кеш не стирається, авторитет облікових записів не дублюється.
- **GitHub:** [PR #527](https://github.com/Oleksii-debug/scripture-archive/pull/527) **SQUASH MERGED**, перевірений feature `main@2be427f6748b11d6b8312bbf9b36d05fe0e6aaa7`. Після merge GitHub API підтвердив PR `merged=true`, `main` з тим самим SHA та поточні source/test blobs: `public/workspace.js@f8d580545dcafd09103d7c9506e630c7462c1342`; `tests/workspace-async-principal-fence.test.mjs@4b6ffa9057317789e1928f1393f86850c91a2080`.
- **Фактична перевірка:** [Actions #41016627675](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41016627675), exact PR head `4a68304073de0bdf78b17113dc02320d4613889a`: **1128 Node PASS, 0 FAIL, 1 SKIP**, TypeScript PASS, ESLint PASS, production source build PASS, **2 Python validators PASS**. Disposable Worker/D1 інтеграція **FAIL 21/22** з реальним HTTP 503 / `Your worker restarted mid-request`; повний CI **НЕ GREEN**, відомий незалежний блокер #361. Під час цього запису не запускали окремого native/browser/Windows/NVDA тесту.
- **Не підтверджено:** повний SA-EXT-16, усі політики приватності, live deployment/Sites SHA, реальна браузерна сесія та фізичний NVDA. Це не заважає термінальному **source closure тільки цього вузького дефекту**, але не дозволяє оголосити весь розділ/продукт готовим. Перероблення цього підпункту — лише за новим відтвореним дефектом чи вимогою.

## 2026-10-30 — SA-EXT-05 / DOSSIER_SEARCH — ЗАКРИТО ДЛЯ РОЗРОБКИ (вузька функція)

**Статус:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`, `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0` для пошуку по *наявному каталогу досьє*. **Батьківський SA-EXT-05 і всі SA-EXT-01…20 лишаються OPEN; це НЕ повний реліз чи приймання фізичним NVDA.**

- **Готова функція:** канонічний маршрут `/dossiers?q=...` шукає людей, місця й події за локалізованими назвами, описами, типами й ідентифікаторами українською, російською та англійською; форма `method=get`/підписаний `type=search`, клавіатурний submit, очищення фільтра, статус кількості результатів, помилка без підставленого досьє за відсутності збігів. Межі 120 символів і HTML-екранування; справжні посилання на читальню та source-graph authority збережені, іншого API/БД/серверу немає.
- **GitHub:** [PR #518](https://github.com/Oleksii-debug/scripture-archive/pull/518) **squash MERGED** до `main@4fff3bd6f88ae6628642d8fce3eccd2a7057307b` (GitHub merged+ref+tree readback). Рівно 4 змінені шляхи: `public/scripture-dossiers.js`, `public/workspace.js`, `tests/dossier-search.test.mjs`, `tests/source-dossier-graph.test.mjs`. Зміни чужих concurrent main гілок збережені.
- **Фактична перевірка:** 37/37 ізольованих V8 source/catalog assertions PASS; [GitHub Actions #41014274024](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41014274024) exact head `bb40936812d91560c7454b0490e282567b7a42bf`: **1118 Node PASS, 0 FAIL, 1 SKIP** (нові 8 тестів), TypeScript PASS, lint PASS (12 warnings, 0 errors), production source build PASS, Python validators **2 PASS**. Повний CI — **FAIL** виключно на відомому окремому disposable Worker/D1 restart HTTP503: **21/22** на двох свіжих спробах. Розслідування у [PR #361](https://github.com/Oleksii-debug/scripture-archive/pull/361), не приховувати цю недоведеність.
- **Окремо не підтверджено:** реальний browser/keyboard E2E, фізичний NVDA, production deploy/version SHA, незалежні біблійні/видавничі права для всього SA-EXT-05. Вони не входять у статус закритої вузької функції та не змінюються цим записом.
- **Governance:** повторне розроблення саме цього пошуку лише за новою вимогою або відтвореним дефектом, без перезапуску S/SA-EXT батьківського розділу.

## 2026-10-30 — SA-EXT-06 / NARRATIVE_ATLAS_ALL_SOURCES — ЗАКРИТО ДЛЯ РОЗРОБКИ (вузька функція)

**Статус:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`, `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0` для повного виведення наявних перевірених джерел у таблиці орієнтовної послідовності оповідей. **Батьківський SA-EXT-06 залишається OPEN; археологічні карти, реальні маршрути, ширша хронологія та live/NVDA не визнані завершеними.**

- **Готова функція:** у канонічному `/dossiers` таблиця `dossierAtlasMarkup` для 7 наявних історій більше не приховує другу й наступні вже схвалені біблійні цитати; для кожної оповіді відображає всі `item.sources` як доступний нумерований список з реальними посиланнями на читальню та чесною локалізованою позначкою `narrative/interpretive` (uk/ru/en). Слова про непідтверджену історичну датировку збережені. Жодної вигаданої археології, географічних координат, другого каталогу чи API.
- **GitHub:** [PR #524](https://github.com/Oleksii-debug/scripture-archive/pull/524) **SQUASH MERGED**, перевірений `main@75a44e5bf461e94ed2791017c11cec2962b0f404`; змінено лише `public/scripture-dossiers.js` та `tests/atlas-history-sources.test.mjs`. Перевірено GitHub PR.merged, main SHA і обидва blob-contents. Попередній пошук досьє [#518](https://github.com/Oleksii-debug/scripture-archive/pull/518) збережений.
- **Фактичні тести:** 162/162 ізольованих V8 graph/citation assertions PASS; [Actions #41014982903](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41014982903) exact-head `b9904d460125f0608f4a8c37fdcfb3c54c7039a9`: **1124 native Node PASS / 0 FAIL / 1 SKIP**, TypeScript PASS, lint 0 errors / 12 warnings, source build PASS, Python validators 2 PASS. Загальний CI **FAIL**: відомий незалежний disposable Worker/D1 restart HTTP503, 21/22 двічі; окремий [#361](https://github.com/Oleksii-debug/scripture-archive/pull/361).
- **Не доведено:** реальний Chrome/NVDA, production реліз/SHA, фактичні зовнішні географічні права/археологічні джерела, весь SA-EXT-06. Повторна доробка саме цієї вузької функції — лише за новим дефектом або вимогою.

**Дата:** 2026-10-28 | **Статус:** OWNER_APPROVED_PLANNING_SCOPE
**Мета:** не зупинити випуск чинного продукту, а зареєструвати повний майбутній зміст і критерії готовності.
**Обов'язкова класифікація:** EXISTING_SOURCE / INCOMPLETE_RELEASE / PLANNED_NEW / SEPARATE_PRODUCT. Це НЕ відсоток готовності.

## 2026-10-30 — SA-EXT-04 / GROUP_NUMERIC_COERCION — ЗАКРИТО ДЛЯ РОЗРОБКИ (вузький дефект)

**Стан:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`, `remaining_scoped_implementation=0`; **батьківський SA-EXT-04 залишається OPEN**, а `RELEASE_VERIFIED` та NVDA/production acceptance не підтверджені.

- **Інтеграція:** [PR #507](https://github.com/Oleksii-debug/scripture-archive/pull/507), squash-merged у канонічний `main@000b7cc481f94dc887d1a3a9ec03b57c0c2f5a2c`. Лише `app/api/groups/route.ts` і `tests/groups-numeric-input-boundary.test.mjs`; `necessary_unmerged_PRs=0` для цього дефекту.
- **Функція:** канонічний API більше не трактує JSON `true`, `false`, масиви, `null`, об'єкти, порожній текст, hex/binary/octal/exponent/decimal-string expressions як допустимі цілі числа глав, відповідей, відвідуваності чи тижневої цілі. Числа JSON та десяткові числові рядки з доступних HTML-форм збережено.
- **Фактично виконані тести:** [GitHub Actions #41012581184](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41012581184), exact PR head `f12c8ad0cb5ddfd3eecd70c3fd2a67e43bd6e24f`: native Node **1069 PASS / 0 FAIL / 1 SKIP**, з них **54 нові route-executing сценарії**; TypeScript, ESLint, production source build, **22/22 disposable Worker/D1** і наявні Python-валідатори — **PASS**; ці тести не є фізичним NVDA або live-production перевіркою.
- **Не повторювати:** первісна доробка цього дефекту остаточна, новий PR допустимий тільки за новим відтвореним дефектом. Загальні SA-EXT-01…20, видання, права, DNS/email, браузерний E2E, деплой і фізична доступність залишаються окремими задачами.

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
**Статус РОЗРОБКИ:** **ЗАКРИТО / `CLOSED_FOR_DEVELOPMENT / TERMINAL`** — source `main@79a8e40cee2c3eb0e0901c5b8b260cb4b0a149c9`. Автор створює/переглядає/тестує справжню вправу, редактор затверджує, версії/відкликання, експорт, permissions, audit та source-leakage guards повністю реалізовані в канонічному UI/API і перевірені CI. [Остаточне закриття SA-EXT-03](SA_EXT_03_PARENT_CLOSED_FOR_DEVELOPMENT_TERMINAL_20261031.md). `remaining_approved_development=0`, `necessary_unmerged_PRs=0`. **Окремі завдання для release/QA:** human rights review фактичних матеріалів, реальний браузер/NVDA, live D1/backup та exact Sites SHA — **NOT_VERIFIED**, не повторна розробка.

### SA-EXT-04. Домашні групи та навчальні марафони
**Статус РОЗРОБКИ:** **ЗАКРИТО / `CLOSED_FOR_DEVELOPMENT / TERMINAL`** — source `main@79a8e40cee2c3eb0e0901c5b8b260cb4b0a149c9`. Канонічні групи, запрошення, приватні ролі, згода на імена, історія й виправлення зустрічей, результати, cohort і марафони підключені до реального UI/API/D1, повні тести пройшли. [Остаточне закриття SA-EXT-04](SA_EXT_04_PARENT_CLOSED_FOR_DEVELOPMENT_TERMINAL_20261031.md). `remaining_approved_development=0`, `necessary_unmerged_PRs=0`. **Окремі завдання для release/QA:** дві реальні тестові ролі/групи, live Sites SHA, D1 міграція/backup, Windows/NVDA і production consent acceptance — **NOT_VERIFIED**, не повторна розробка.

Реалізовано у вихідному коді: вихід учасника, атомарне передавання власності та підтверджене видалення групи; перевірки й межі — `SA_EXT_04_GROUP_MEMBERSHIP.md`. Це не статус production acceptance.

Додаткові готові функції вихідного коду: власні дозволи на показ імені (`SA_EXT_04_GROUP_NAME_PRIVACY.md`), доступ до попередніх зустрічей через сторінки історії (`SA_EXT_04_MEETING_HISTORY.md`), виправлення підсумків і кількості присутніх із перевіркою прав та конфліктів (`SA_EXT_04_MEETING_CORRECTIONS.md`). Фактичні реліз і NVDA-приймання залишаються окремими незавершеними перевірками.

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


---

### SA-EXT-16 / ANALYTICS_SESSION_PRINCIPAL_ISOLATION — scoped terminal, 2026-10-30

**РОЗДІЛ SA-EXT-16 / підфункція ANALYTICS_SESSION_PRINCIPAL_ISOLATION — ЗАКРИТО ДЛЯ ПОДАЛЬШОЇ РОЗРОБКИ** (`CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`). Для **цієї вузької виправленої межі** `remaining_implementation=0`, `necessary_unmerged_PRs=0`; повторне призначення без нового відтвореного дефекту не потрібне. **Повний батьківський SA-EXT-16 і всі двадцять SA-EXT-01…20 залишаються OPEN.**

- **Встановлена помилка:** канонічний `POST /api/analytics` на конфлікті `session_id` використовував `user_id=COALESCE(excluded.user_id,usage_sessions.user_id)`. Після зміни облікового запису це переносило попередні лічильники іншій особі. Анонімні запити після виходу продовжували збільшувати дані попереднього користувача. Окремий `usage_events` INSERT міг записати подію стороннього користувача навіть після нульового оновлення сесії.
- **Завершено:** у тому самому наявному `app/api/analytics/route.ts` конфліктний `usage_sessions` UPDATE дозволено тільки для відповідного поточного власника або переходу `anonymous → authenticated`; `usage_events` вставляється лише за наявності фактично збереженої сесії з тим самим `user_id` (SQLite null-safe `IS`). Конфлікт не переписує чужі лічильники, не додає «осиротілу» подію, не підтверджується `202`. Збережено згоду на аналітику та вже чинні авторизацію/приватність/API.
- **Доказ GitHub main:** [PR #500](https://github.com/Oleksii-debug/scripture-archive/pull/500) `squash MERGED` у точний `main@bf63a5b98e962a212bb760d0a4efd22f550708dc`; PR `merged=true`; незалежно перечитано source blob `app/api/analytics/route.ts@f5c404d7ae7491844db85cb89bc51332bb79b413` і regression blob `tests/analytics-session-principal-isolation.test.mjs@382e12b8667959e52871d45a3bc535a74d49501e`. Два необхідні шляхи реально наявні в `main`, без іншого сервера чи демонстраційної заглушки.
- **Тести і межі доказу:** п'ять нових source-exact тестів виконують справжні два production SQL statement через `node:sqlite`: cross-account, sign-out, повторне оновлення того самого користувача, анонімний→підписаний стан, незалежні сесії та недопущення сторонніх подій. [GitHub Actions #41009716222](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41009716222) на точному PR HEAD: **965 Node PASS / 1 SKIP / 0 FAIL**, TypeScript, lint (0 errors), build і **2 Python validators PASS**. **Весь workflow FAIL**: disposable Worker/D1 у незалежному `tests/api-flow.test.mjs` — **21/22** двічі, відомий Wrangler restart `503` під час `POST /api/editor-roles` (наявний власник [draft #361](https://github.com/Oleksii-debug/scripture-archive/pull/361)). Жодного хибного загального CI PASS.
- **Не перевірено й не зроблено:** фактичний deployed Sites SHA, живе E2E, фізичний NVDA, весь privacy/backup/account-deletion scope SA-EXT-16 та решта дев'ятнадцяти розділів; реліз/платежі/нові мови/користувацькі дані/cron не змінювалися. Інші роботи #295/#297 не блокуються і не замінюються цим вузьким закриттям.

---

### SA-EXT-03 / CONTENT_COMMAND_FAILCLOSED — scoped terminal, 2026-10-30

**РОЗДІЛ SA-EXT-03 / саме підфункція захисту команд керування CMS — ЗАКРИТО ДЛЯ ПОДАЛЬШОЇ РОЗРОБКИ.** Статус: `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`; `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. **Повний SA-EXT-03 та всі двадцять SA-EXT-01…20 залишаються OPEN**, оскільки повний редакційний і live/browser/права обсяг не прийнято.

- **Реальний дефект:** у канонічному `PUT /api/content` невідоме `action`, порожній об'єкт, JSON-масив або скаляр могли потрапити в fallback запису публічних нотаток, створюючи `liveNote.uk/ru/en = ""` і повертаючи помилковий HTTP 200. Це дозволяло адміністративній помилці стерти опублікований вміст, замість відмови без мутацій.
- **Реалізація, інтегрована у справжню платформу:** чинний `app/api/content/route.ts` тепер відхиляє не-об'єкт JSON; явно розрізняє `action:"upsert-item"` і власний три-мовний `liveNote`; відхиляє невідомі дії, неправильну структуру, відсутні й нестрокові `uk/ru/en` до будь-якого запису D1. Свідоме очищення трьома порожніми рядками, звичайне редагування елементів, перевірки власника/Origin і обов'язкове підтвердження двох D1 записів збережено. Другого редактора/сервера або нової схеми БД немає.
- **Завершене GitHub-злиття:** [PR #502](https://github.com/Oleksii-debug/scripture-archive/pull/502) **SQUASH MERGED** у точний `main@41dbf501340d2eb847480d9b82923312f595155e`; `PR.merged=true`, `compare(merge SHA, main)=identical` при післязлиттєвому readback. Канонічний production blob `app/api/content/route.ts@39ce05c0cd117b2b58f15f624bd42056c7ae0b0c`; тести `tests/content-batch-ack.test.mjs@bcd0eaa4bf970df05245b11d1306a2c5a130f2d2` та `tests/content-route-failclosed.test.mjs@3752c0bc3cb40088e5a36ff652cf3ec04bda3d0d` після злиття підтверджені. Це рівно три змінені файли.
- **Перевірка:** [exact-PR-head GitHub Actions #41010754125](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41010754125) — **997 native Node PASS / 1 SKIP / 0 FAIL**, у тому числі 30 негативних випадків некоректних команд та 2 позитивні випадки три-мовних нотаток; TypeScript, lint, source build і Python validators **PASS**. **Whole CI FAIL:** незалежний disposable Wrangler/Worker/D1 HTTP 503 із `POST /api/editor-roles`, 21/22 двічі, після автоматичного повного повтору в новій тимчасовій D1 — інфраструктурна проблема [draft PR #361](https://github.com/Oleksii-debug/scripture-archive/pull/361). Не оголошувати загальне E2E PASS і не повторювати окремий state-changing POST.
- **Залишені незалежні зобов'язання:** повне SA-EXT-03 (права/редакційний approval та browser acceptance), installed Sites SHA, email, реальне D1, безпека всього сайту, фізичний Windows/NVDA, реліз. Жодного production deployment, змін приватних даних, нових мов, cron або synthetic users не виконано. Цю **конкретну виправлену підфункцію** повторно не відкривати без нового відтвореного дефекту; подальше за центральною [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297).

---

### SA-EXT-03 / CONTENT_ID_TRUNCATION_ALIAS — scoped terminal, 2026-10-30

**ОФІЦІЙНО ЗАКРИТО ДЛЯ ПОДАЛЬШОЇ РОЗРОБКИ саме цю підфункцію:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`; `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. **Цілий розділ SA-EXT-03 і всі 20 SA-EXT-01…20 залишаються OPEN.**

- **Дійсний дефект:** канонічний серверний `PUT /api/content` і `DELETE /api/content?id=...` перед SQL викликали `clean(id,100)`, що обрізало будь-який довший ідентифікатор. Внаслідок цього запит на 101-символьний запис міг перезаписати чи приховати *інший* наявний запис зі 100-символьним префіксом, без будь-якого доказу тотожності ключів.
- **Реальна канонічна реалізація:** `app/api/content/route.ts` перевіряє довжину і тип явно наданого ID до першого SQL-запиту; небезпечний або порожній ключ для DELETE повертає 400 без читання/мутацій D1. Відсутній/порожній ID для створення як і раніше викликає UUID; рівно 100-символьний ключ валідний. Дозволи owner, Origin, редагування матеріалів, підтвердження D1 batch і поточна платформа без змін.
- **Злиття з перевіркою:** код і регресії [PR #504](https://github.com/Oleksii-debug/scripture-archive/pull/504) **SQUASH MERGED** у точний `main@938d9400764d7379e4bc6da477e3e6f0daa5dec5`. Незалежний GitHub readback: `PR.merged=true`, `compare(merge SHA, main)=identical`; source blob `app/api/content/route.ts@8a52ce6dee52cd9f85910639fddba84a698175d4`; test blob `tests/content-batch-ack.test.mjs@29de34d83cb3b66cbfd3a491aa78ebed5b88c962`. Два файли, без інших гілок/демонстрацій.
- **Повний реальний GitHub Actions SUCCESS:** [run #41011311237](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41011311237) на точному PR HEAD: **1010 нативних Node PASS / 1 SKIP / 0 FAIL** (зокрема 13 додаткових регресій ID), реальна disposable Worker/D1 HTTP інтеграція **22/22 PASS**; TypeScript, lint, build, Python validators — **PASS**. Це підтвердження source/integration для конкретного зрізу, але не physical NVDA, реальний production D1, сторінка користувача чи installed Sites SHA.
- **Жодного деплою:** не змінювалися production сайт, облікові записи/приватні дані, релізи, cron, платежі, мови або сервіси знайомств. Решта повного SA-EXT-03, джерела/редакторська політика, права й людська доступність залишаються окремими задачами #295/#297. Повторно не призначати цей готовий вузький захист без незалежно відтвореного нового дефекту.


---

### SA-EXT-16 / ACCOUNT_GET_ACTION_FAILCLOSED — scoped terminal, 2026-10-30

**Остаточно ЗАКРИТО ДЛЯ РОЗРОБКИ лише цей конкретний дефект маршрутизації особистого профілю:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`, `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. **Повний SA-EXT-16 та решта каталогу SA-EXT-01…20 залишаються OPEN** до незалежних критеріїв приймання, перевірки видалення даних, backup/retention, браузера й сайту.

- **Дефект і справжнє виправлення:** раніше автентифікований `GET /api/account?action=unrecognized` успішно повертав 200 із приватним `user` профілем, оскільки невідомі дії без перевірки потрапляли в профільний fallback. Тепер чинний `app/api/account/route.ts` повертає `400 unknown_action` до будь-якого D1 читання профілю, із `no-store, private`. Збережено `me`, сумісний `profile`, реальні `reading/progress/users`, 401 анонімного запиту, 403 не-власника, 503 недоступної D1. Не створено другого авторитету акаунтів.
- **Факт GitHub-інтеграції:** [PR #506](https://github.com/Oleksii-debug/scripture-archive/pull/506) **SQUASH MERGED**, `main@09c1170f9b463eadce073849e8e170f8f0154b6d`. Після злиття перечитано `refs/heads/main`, `PR.merged=true`, `compare(merge SHA,main)=identical`. Канонічний source blob `c350f7ab196ad104281378ddc22217b30035b8bb`, регресії `tests/account-get-action-failclosed.test.mjs` blob `a1af2e178a478233b52c66aa1631de46952b21c6`. Жоден необхідний для цього зрізу PR не залишився незлитим.
- **Реальні тести:** [exact-PR-head run #41012338857](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41012338857): **1015 Node PASS / 1 SKIP / 0 FAIL**; усі **5 нових route-executing regression tests PASS**. TypeScript, lint, source build та Python validators PASS (2 Python). **Whole CI FAIL**: disposable Wrangler/Worker HTTP `POST /api/editor-roles` двічі спричинив restart 503, 21/22 D1 checks, уже відомий окремий блокер [draft #361](https://github.com/Oleksii-debug/scripture-archive/pull/361). Це не green e2e і не причина повторювати невідомий side-effecting POST.
- **Реліз не виконано:** LIVE Sites SHA, production D1/browser, NVDA і повний privacy/account-deletion scope **NOT_VERIFIED**. Не змінено жодної реальної користувацької інформації, email, cron, платежів, нових мов чи сервіса знайомств. Розробку цього вузького виправлення повторювати тільки за нової вимоги/конкретного дефекту; координувати через [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297).


---

### SA-EXT-16 / COMMUNITY_PUBLIC_READ_AVAILABILITY — scoped terminal, 2026-10-30

**РОЗРОБКУ САМЕ ЦІЄЇ ПІДФУНКЦІЇ ЗАВЕРШЕНО:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`; `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. Повний SA-EXT-16, решта SA-EXT-01…20, реальний Sites deployment, backup/retention, фізичний NVDA та owner-acceptance **залишаються відкритими**.

- **Реальний збій до виправлення:** публічний `GET /api/community` не перевіряв успішність трьох результатів `D1.batch`, внаслідок чого зламані підрахунки могли повертати фальшиві 200 із нульовою активністю, а відсутні колекції або D1 exceptions — неузгоджений 500. 
- **Справжнє виправлення:** канонічний `app/api/community/route.ts` тепер вимагає для всіх трьох read receipts `success===true`, дійсні масиви `results`, а для обох `COUNT` запитів рівно один запис зі скінченним невід'ємним цілим числом. Помилки транзакцій/lease/snapshot повертають стабільний `503 community_unavailable`. Збережено справжній каталог, owner status/Stop/Continue, автентифікацію, scheduler і поточний endpoint; нових генерацій синтетичних акаунтів/запусків не виконано.
- **Злиття GitHub:** [PR #511](https://github.com/Oleksii-debug/scripture-archive/pull/511) — `SQUASH MERGED` у точний `main@7e32bace27a2904894047ba7e9aa2a2fd35bc1e4`; GitHub `PR.merged=true`, `compare(merge SHA,main)=identical` одразу після злиття. Source blob `c5e36ccf35b977fb37d288d0752b9472567e9de5`, actual-route test blob `c0f666678e6c862f44442b0b5f0c650ac187de7f`. Лише 2 файли; необхідних незлитих PR для цього зрізу немає.
- **Реальна перевірка:** [PR exact-head Actions #41013418287](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41013418287) **SUCCESS**: **1085 Node PASS, 1 SKIP, 0 FAIL**, зокрема **14 нових тестових випадків реального маршруту** (success, failed receipt, empty/null/invalid COUNT, missing results, thrown D1/lease, owner and absence DB); TypeScript, lint, source build, Python 2/2 PASS. Два disposable D1 повних запуски: перший 21/22 через знайомий Worker restart, дозволений повний повтор на **новій тимчасовій D1 22/22 PASS**. Це реальна CI-інтеграція, але не приймання live/віконного продукту.
- **Чіткі межі:** без зміни production Sites/D1, без розсилок, cron triggers, штучних профілів, платежів, нових мов або приватних даних. Повна безпека R0.4, #303 backup/retention і SA-EXT-16 не оголошені готовими. Координація — [issue #297](https://github.com/Oleksii-debug/scripture-archive/issues/297). Цю конкретну read-availability підфункцію повторно не розробляти без нового відтвореного дефекту.

---

### SA-EXT-16 / SENSITIVE_CONSENT_D1_TYPED_ACK — scoped source terminal (2026-10-30)

**РОЗРОБКУ ЦІЄЇ КОНКРЕТНОЇ ПІДФУНКЦІЇ ЗАКРИТО — `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.** `remaining_scoped_implementation=0`; `required_unmerged_prs=0`; увесь батьківський **SA-EXT-16 OPEN**, так само як повні SA-EXT-01…20.

- **Затверджена поведінка:** збереження чутливої згоди через чинний приватний `POST/PUT /api/account?action=sensitive-consent` не вважає успішним записом D1 відповідь із `meta.changes` рядкового, логічного або `null` типу. Використовує вже наявний строгий `confirmedD1Changes` і повертає контрольований приватний 503 при неавторитетному підтвердженні; справжній числовий ACK зберігає 200, нуль змін — 409. Жодного паралельного акаунт-сервера або розширення прав.
- **Джерело у `main`:** [PR #513](https://github.com/Oleksii-debug/scripture-archive/pull/513) `SQUASH MERGED`, точний інтеграційний SHA `834f2a3a5b70ef84718cf96b7543fdd0f8c616ae`; source blob `6c1ff85faefab38e28e30b04c42f715ad1f6f87d` (`app/api/account/route.ts`); test blob `6617c01b4ef93a75771d400959144f66c30a62eb` (`tests/account-write-receipts.test.mjs`). Гілка feature не містить інших потрібних для підфункції незлитих змін. Якщо `main` пізніше рухається, перевірити ancestry окремо.
- **Справжні тести:** [exact-head GitHub Actions #41013566388](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41013566388): **Node 1087 PASS, 1 SKIP, 0 FAIL** із новими виконаними тестами `sensitive-consent` (нормальний запис, відсутній/хибний/від'ємний/рядковий/`null`/boolean/exception/zero receipt, post-write read failure). TypeScript, lint, source build і Python 2/2 **PASS**. **Загальний workflow — FAILURE**, тому що окремий disposable Worker/D1 E2E двічі завершився 21/22 через вже відтворену помилку локального Wrangler proxy `Your worker restarted mid-request` з 503 замість 403. Це реальний негативний CI-доказ; root cause продовжує [#361](https://github.com/Oleksii-debug/scripture-archive/pull/361). НЕ стверджувати `FULL_CI_PASS`, `D1_PRODUCTION_PASS`, `NVDA_PASS`.
- **Незавершене ПОЗА цим scope:** live Cloudflare/Sites exact SHA, реальний авторизований браузерний сценарій, email/DNS, Windows, фізичний NVDA, загальна готовність всього SA-EXT-16 та 20 розділів. Жодного деплою/cron, нових мов, приватних матеріалів чи плати цим ремонтом не виконано. Координація: [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297).


---

## 2026-10-30 — три послідовні scoped terminal closure: SA-EXT-01, SA-EXT-02, SA-EXT-03

**Обсяг закриття: рівно три названі підфункції.** Усі повні батьківські SA-EXT-01…20 залишаються OPEN. Ці source-level receipts не дорівнюють RELЕASE_VERIFIED, production acceptance, Chrome/NVDA чи повній платформі. Канонічна координація: [issue #297](https://github.com/Oleksii-debug/scripture-archive/issues/297).

| Розділ / підфункція | Підключена функція | Точний merge в main та receipt | CI exact-head | Статус |
| --- | --- | --- | --- | --- |
| SA-EXT-01 / PARALLEL_READER_PRINCIPAL_CONTEXT | Порівняння біблійних видань використовує існуючу перевірку контексту читача **і** поточного власника сеансу; відповідь старого користувача не перемальовує активну панель | [PR #508](https://github.com/Oleksii-debug/scripture-archive/pull/508), main SHA db5dc0ec3b6822ea2bd374c84200cc3f2126a17a, [#297 receipt](https://github.com/Oleksii-debug/scripture-archive/issues/297#issuecomment-6516325590) | [41012698124](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41012698124): 1017 Node PASS, TS/lint/build/Python PASS; whole CI FAIL через Worker 503 | CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL; remaining_scoped_implementation=0; necessary_unmerged_PRs=0; повний SA-EXT-01 OPEN |
| SA-EXT-02 / ATTEMPT_HISTORY_SHAPE_AND_RECOVERY | Несправні/відсутні масиви завершених і pending спроб не видаються за порожню історію; UI показує локалізовану доступну помилку й справжній retry, поради не домислюють результатів | [PR #512](https://github.com/Oleksii-debug/scripture-archive/pull/512), main SHA ee342067f31178072d24135ef7ad4ac09fb38778, [#297 receipt](https://github.com/Oleksii-debug/scripture-archive/issues/297#issuecomment-6516453060) | [41013562875](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41013562875): 1077 Node PASS, TS/lint/build/Python PASS; whole CI FAIL через Worker 503 | CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL; remaining_scoped_implementation=0; necessary_unmerged_PRs=0; повний SA-EXT-02 OPEN |
| SA-EXT-03 / PUBLIC_REVIEWED_MATERIAL_RETRY | Редакційні матеріали у канонічному інтерфейсі після помилки завантаження мають робочий повтор GET у трьох мовах, single-flight і guard користувача/маршруту, з підтримкою фокусу | [PR #515](https://github.com/Oleksii-debug/scripture-archive/pull/515), main SHA e8674841b20595ed1847afb6afae39d832a7495a, [#297 receipt](https://github.com/Oleksii-debug/scripture-archive/issues/297#issuecomment-6516469151) | [41013793028](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41013793028): 1104 Node PASS, TS/lint/build/Python PASS; whole CI FAIL через Worker 503 | CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL; remaining_scoped_implementation=0; necessary_unmerged_PRs=0; повний SA-EXT-03 OPEN |

**Окремий незакритий CI-блокер:** [draft #361](https://github.com/Oleksii-debug/scripture-archive/pull/361) — відтворений локальний Wrangler disposable Worker/D1 restart під час mutating HTTP-запиту повертає 503 замість очікуваних 200/400/403; дві fresh-state спроби по 21/22 у кожній із трьох exact-head перевірок. Не видавати FAIL за green CI. Інші попередні запуски могли пройти повний D1, тож потрібне окреме усунення нестабільності, а не переписування вже закритих підфункцій.

**Не перевірено/не виконано:** production site SHA, реальне D1, email/DNS, автоматичні розсилки, Cron, ліцензії нових видань, HOSTiQ, фізичне NVDA, production Chrome, випуск 82 мов або зміна приватних користувацьких даних. Повторно відкривати ці вузькі підфункції лише за новим відтвореним дефектом. Усі непокриті вимоги батьківських розділів залишаються OPEN.

---

### SA-EXT-03 / MATERIAL_SUBMISSION_AND_DRAFT_TYPED_D1_ACK — two scoped source terminals (2026-10-30)

**ЗАКРИТО ДЛЯ РОЗРОБКИ лише дві зазначені підфункції** — `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`, `remaining_scoped_implementation=0`, `required_unmerged_feature_prs=0`. Повний батьківський **SA-EXT-03 OPEN**, як і решта 20 розділів плану.

1. **Редакційне подання матеріалу:** існуючий `POST /api/material-review` з `action=submit` більше не перетворює рядкові, boolean чи null `meta.changes` через `Number()` на хибний успішний 201; неавторитетний D1 receipt -> 503, умовний INSERT із нульовою кількістю змін -> 409, справжній один запис -> 201. Ідемпотентність, історія автора й захист від дублювання збережені. [PR #520](https://github.com/Oleksii-debug/scripture-archive/pull/520), feature `main@4c8b79f31b5a096e31fa09eefc546128d62867a9`; `app/api/material-review/route.ts` blob `c7f28448aafdb7096f7c7a5b33d63d918b9c1f15`, `tests/material-review.test.mjs` blob `18541bcbaffeb8fdeffa6bda8046c17a869994fb`. [CI #41014406298](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41014406298) **SUCCESS**: Node **1111 PASS / 1 SKIP / 0 FAIL**, TypeScript/lint/build PASS, Worker/D1 **22/22 PASS**, Python **2/2 PASS**.
2. **Чернетки редактора — збереження/видалення:** існуючі `POST`/`DELETE /api/materials` перевіряють фактично числові D1 acknowledgments замість `Number(meta?.changes)`, відхиляють рядкові, boolean, null і відсутні receipts з 503, не повідомляють фальшивого 200/201; коректні атомарний ownership-UPSERT, ідемпотентне видалення і відновлення після втраченої відповіді залишаються. [PR #521](https://github.com/Oleksii-debug/scripture-archive/pull/521), feature `main@6e8e1afbcd70ca187791313218dab7635b5b813e`; `app/api/materials/route.ts` blob `533b330df4434742a548976c2534c5d8fad36941`, `tests/materials-d1-ack.test.mjs` blob `8512b676f5e4ed320534719d0f0b359d410535a4`. [CI #41014519756](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41014519756), **run_attempt=2, overall FAILURE**: Node **1111 PASS / 1 SKIP / 0 FAIL**, TypeScript/lint/build PASS, Python 2/2 PASS, але disposable Worker/D1 **21/22** на двох окремих запусках нової тимчасової D1 через відому помилку локального proxy `Your worker restarted mid-request` (503 замість 403/200). Незалежний blocker [#361](https://github.com/Oleksii-debug/scripture-archive/pull/361) не закрито й не приховано.

**Точний readback до додавання цього запису:** feature SHA обох PR належать `main@b1f70040f6b4dae32fa6525bbb215a2432b95016` (`compare behind_by=0`). Жоден новий редакційний сервер, користувач, секрет, розсилка, тригер, мова чи live deployment не створені. Повний функціонал SA-EXT-03 (авторування, редакційний процес, рольова безпека, аудит, версії, експорт), реальний браузер, live SHA, e2e та NVDA **не заявлені готовими**. Координація: [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297).


---

## 2026-10-30 — додаткові послідовні scoped terminal closure: SA-EXT-04 і SA-EXT-05

**Ці записи закривають лише названі дефекти підфункцій, не весь батьківський розділ.** Усі повні SA-EXT-01…20 залишаються OPEN; всі решта production/NVDA/release вимог лишаються незадоволеними без окремого доказу. Основна координаційна дошка: [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297).

### SA-EXT-04 / PUBLIC_GROUP_DISCOVERY_AUTH_INDEPENDENCE — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL
- Раніше публічний GET /api/groups помилково перевіряв приватну сесію й повертав 503 при збої сховища сесій, хоча загальнодоступні групи в D1 залишалися доступними. Канонічний API тепер пропускає identity lookup для **публічного каталогу** і зберігає сувору перевірку для персональних ?mine=1 і групових ?groupId=... запитів. Сховані roster/memberCount/invite, публічні та приватні маршрути перевірено фактичним route-executing тестом.
- [PR #522](https://github.com/Oleksii-debug/scripture-archive/pull/522) SQUASH MERGED, main SHA b1f70040f6b4dae32fa6525bbb215a2432b95016. Readback: app/api/groups/route.ts blob 8b9d5dd26df3e5e7faa50fe93f6d6a06095d8056, tests/group-membership.test.mjs blob a40c7346ce3446d929c3a417028e9c831d39639a. [Receipt #297](https://github.com/Oleksii-debug/scripture-archive/issues/297#issuecomment-6516593209).
- [Exact-head Actions 41014656225](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41014656225): **overall SUCCESS**; **1120 native Node PASS / 1 SKIP / 0 FAIL**, TypeScript/lint/source build PASS, **22/22 disposable Worker/D1 PASS**, Python 2/2 PASS. Це source+disposable-інтеграція, не живий сайт чи фізичний NVDA.
- remaining_scoped_implementation=0, necessary_unmerged_PRs=0. Повний SA-EXT-04 OPEN.

### SA-EXT-05 / DOSSIER_SEARCH_FILTERED_SELECTION — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL
- Пошук досьє фільтрував лівий каталог за q, але показував статтю за явно заданим id навіть коли досьє відсутнє у результатах, тобто користувач бачив біблійні свідчення іншого об'єкта. Канонічний source-validated граф тепер дозволяє явний вибір тільки серед знайдених nodes за активного фільтра; коли відомий id не збігається, показує справжнє доступне повідомлення UK/RU/EN і посилання на очищення пошуку, **без сторонніх біблійних посилань**. Прямі deep links без фільтра та невідомі id залишилися коректними.
- [PR #525](https://github.com/Oleksii-debug/scripture-archive/pull/525) MERGED через звичайний merge із збереженням конкурентної зміни іншого автора, інтеграційний SHA a02d64e88b9142d1bd29970f08002850d8e935be. Readback newest main: public/scripture-dossiers.js blob 5e3cd1c84e9749d7a8b363f1181b3157581b88af, tests/dossier-search.test.mjs blob 08164fa1be963999c9d3e745fe5aae6977f06bf8. [Receipt #297](https://github.com/Oleksii-debug/scripture-archive/issues/297#issuecomment-6516650624).
- [Exact-head Actions 41015051027](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41015051027): **1122 native Node PASS / 1 SKIP / 0 FAIL**, TS/lint/build/Python 2/2 PASS. **Whole workflow FAILURE**: відома незалежна помилка disposable Wrangler Worker/D1 з HTTP 503 restart і двома результатами 21/22. Її не приховувати; [draft #361](https://github.com/Oleksii-debug/scripture-archive/pull/361).
- remaining_scoped_implementation=0, necessary_unmerged_PRs=0. Повний SA-EXT-05 OPEN.

Жодна з двох підфункцій не змінювала реальні production Cloudflare/Sites/D1, розсилки, Cron, користувацькі дані, HOSTiQ, права на нові біблійні тексти, розширення мови чи фізичний NVDA. Без нового відтвореного дефекту ці два вузькі slices не переписувати.
