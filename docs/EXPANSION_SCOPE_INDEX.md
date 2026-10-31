## 2026-10-31 — SA-EXT-01 / EXPLICIT_UNKNOWN_BOOK_DEEPLINK_FAILCLOSED — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**ЗАКРИТО ДЛЯ РОЗРОБКИ лише одну перевірену межу маршруту читальні; батьківський SA-EXT-01 OPEN.** Явне `/reader/ZZZ/5` більше не підмінюється книгою `GEN` з хибною ідентичністю джерела: канонічний `renderReader` зупиняється до API перевірки глави/завантаження тексту, скидає старий контекст і показує доступне `role=alert` з посиланням відновлення. Справжні книги, lowercase alias, `/reader` із попереднім читанням і fallback для пошкодженої збереженої книги збережено.

[Функціональний PR #1081](https://github.com/Oleksii-debug/scripture-archive/pull/1081) **SQUASH MERGED** `main@0dbf8979cff3a95a44760e1929a02e7fd9822549`; source blob `9ba2cd1e6e06b6a4aab9af221f004da4e27789dd`, regression blob `9dad4750b27c7229414fc32ecfed959b9a36ee51`. [Exact-head CI #41246461479](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41246461479) **COMPLETED SUCCESS**: 3791 Node PASS / 1 SKIP, 35 Worker/D1 PASS, 2 Python PASS, TS/lint/build SUCCESS. [Незмінний акт](roadmap/SA_EXT_01_UNKNOWN_READER_BOOK_DEEPLINK_SCOPED_TERMINAL_20261031.md). `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0` **лише для цієї підфункції**. SA-EXT-01/02/05/06/07 parent OPEN; 03/04 source-terminal; права видань, редакційне приймання, браузер/фізичний NVDA, live Sites/D1/backup та реліз #689 NOT_VERIFIED. Жодного деплою, production міграції, зміни даних користувачів, нових мов, платежів чи розсилок.

---

## 2026-10-31 — SA-EXT-01/16 / REGISTRATION_LOCALE_EXACT_TYPED — SCOPED TERMINAL

**Лише цей дефект ЗАКРИТО ДЛЯ РОЗРОБКИ**: канонічний registration API відхиляє явно нестроковий JSON locale і не перетворює `en-US`/`ru-RU` на `en`/`ru` через обрізання. Збережено `uk/ru/en`, missing/null/default та unknown-text→uk. [PR #879](https://github.com/Oleksii-debug/scripture-archive/pull/879) MERGED `main@fc4fd29774de1aa084d23e31c564dbf34e21996a`; [exact-head full Actions #41176279283](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41176279283) SUCCESS; [terminal receipt](roadmap/SA_EXT_01_REGISTRATION_LOCALE_EXACT_TYPED_SCOPED_TERMINAL_20261031.md). `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`, `remaining_scoped_implementation=0`, `necessary_unmerged_feature_PRs=0`. **Батьківські SA-EXT-01/16 OPEN; 03/04 TERMINAL.** Live Sites/Windows/NVDA/SMTP NOT_VERIFIED, не реліз.

---

## 2026-10-31 — SA-EXT-02 / PRIVATE_READING_BOOK_CODE_EXACT_IDENTITY — SCOPED TERMINAL

**ЗАКРИТО ДЛЯ РОЗРОБКИ лише один реальний дефект, НЕ батьківський SA-EXT-02.** Канонічний `PUT /api/account?action=reading` тепер не перетворює невалідний код книги з пробілами на чинний ідентифікатор збереженого читання. [PR #870](https://github.com/Oleksii-debug/scripture-archive/pull/870) **SQUASH MERGED** у `main@75e453a13beb27a2b89c3725b24feff46db52bc8`. [Exact-head Actions #41174459535](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41174459535) **SUCCESS** (2677 Node PASS, 0 FAIL, 1 SKIP; 22/22 Worker/D1; 2 Python PASS; TypeScript/lint/build PASS). [Остаточна вузька квитанція](docs/roadmap/SA_EXT_02_READING_BOOK_EXACT_IDENTITY_SCOPED_TERMINAL_20261031.md). `remaining_scoped_implementation=0` і `necessary_unmerged_feature_PRs=0` тільки тут. Повний SA-EXT-02 та решта 17 незакритих батьківських розділів залишаються OPEN; Sites SHA/Chrome/Windows/NVDA NOT_VERIFIED.

---

## 2026-10-31 — SA-EXT-01/02 / EXACT SOURCE GATES — TWO SCOPED TERMINAL REPAIRS

- **SA-EXT-01:** [#866](https://github.com/Oleksii-debug/scripture-archive/pull/866) **MERGED** main `91e59f5a6fe9810e2a9637eadff4238621f058e5`; safe canonical book codes and bounded chapters before HTML/fetch. Exact-head [CI #41172736372](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41172736372) SUCCESS.
- **SA-EXT-02/04:** [#867](https://github.com/Oleksii-debug/scripture-archive/pull/867) **MERGED** main `39108a68fa37bbf6020a33d0dc43ec8511cf0ea0`; exact group identifier instead of trimmed cross-key alias in canonical reading/assessment API. Exact-head [CI #41172834341](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41172834341) SUCCESS.
- [Canonical scoped terminal receipt](roadmap/SA_EXT_01_02_READER_AND_ATTEMPT_EXACT_SCOPED_TERMINAL_20261031.md). `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` for these 2 fixes only, no necessary unmerged feature PR. Full SA-EXT-01/02 OPEN, 03/04 remain parent TERMINAL, other 16 parents OPEN. No hosted Sites/NVDA/release verification.

---

# Scripture Archive — індекс затверджених майбутніх розширень (28.10.2026)

**Статус:** власник погодив включення до технічних планів і каталогу розділів; це не доказ реалізації й не дозвіл на автоматичний реліз. 
**Принцип:** пріоритет поточного продукту — завершити/перевірити нинішні можливості, а всі нові напрямки розвивати як доказові окремі модулі.

## Перевірені вузькі закриття (не закриття батьківського розділу)

- **SA-EXT-01 — безпечні обсяги основної біблійної читальні:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` лише для реальних `getBook()` chapter/verse bounds, sparse-відмови та HTTP retry. [Код #864](https://github.com/Oleksii-debug/scripture-archive/pull/864) злитий `main@eb60a7d9a8f90f8287f039887606748c20838de3`; [CI #41171867181](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41171867181) SUCCESS (2668 Node PASS, 22 Worker/D1, TypeScript/lint/build, 2 Python). [Остаточна квитанція](roadmap/SA_EXT_01_PRIMARY_READER_CHAPTER_BOUNDS_SCOPED_TERMINAL_20261031.md). **Батьківський SA-EXT-01 OPEN; live Sites/Windows/Chrome/NVDA NOT_VERIFIED.**



- **SA-EXT-02 — точна ідентичність збереженої навчальної спроби (`GET current`, `POST invalidate/finalize/answer`):** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` лише для неправильно обрізаних або нормалізованих attempt ID. [PR #860](https://github.com/Oleksii-debug/scripture-archive/pull/860) **MERGED** `main@e4d154632fe850516d9206d4e567a5940662fa32`; [повний CI #41170903151](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41170903151) **SUCCESS**, збережено чесний 503 під час збою авторизації. [Офіційна квитанція](roadmap/SA_EXT_02_EXACT_ATTEMPT_IDENTITY_SCOPED_TERMINAL_20261031.md). Повний SA-EXT-02 **OPEN**; продуктивний сайт, фізичний NVDA і реліз не підтверджено.



- **SA-EXT-02 — точна ідентичність книги під час читання/старту місії:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` лише для invalid/overlong book-code alias у канонічних `chapter/read/start` API. [PR #856](https://github.com/Oleksii-debug/scripture-archive/pull/856) **MERGED** `main@2718f85ffadc70437785a8833e1c49491950c90b`; [CI #41170422587](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41170422587) **SUCCESS**, 19×3 негативних плюс 9 позитивних API-контрактів; [термінальна квитанція](roadmap/SA_EXT_02_BOOK_CODE_EXACT_IDENTITY_SCOPED_TERMINAL_20261031.md). Повний SA-EXT-02 **OPEN**; реліз, реальний NVDA/Windows NOT_VERIFIED.

- **SA-EXT-16 / R0 — повний тест історичного оновлення від міграцій 0000–0008 до 0014:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` лише для розширення existing source-upgrade regression з consent-trigger guard і редакційними FK. [PR #854](https://github.com/Oleksii-debug/scripture-archive/pull/854) **MERGED** `main@cb3e5afcfb200235805818cdf0dc2e79cc7324fe`; [CI #41170147488](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41170147488) **SUCCESS**; [квитанція](roadmap/SA_EXT_16_HISTORICAL_V8_V14_UPGRADE_SCOPED_TERMINAL_20261031.md). Повний SA-EXT-16 і production cutover #689 **OPEN**, real D1/Sites/backup NOT_VERIFIED.


- **SA-EXT-01 — спільна обмежена атрибуція ліцензій основної й паралельної читальні:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` лише для canonical publisher rights metadata bounds (title<=512, licence/attribution/source<=4096). [PR #855](https://github.com/Oleksii-debug/scripture-archive/pull/855) **MERGED** `main@f8b3cdd029b0ff74f4975a898d57a9d92640e003`; exact [CI #41170269116](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41170269116) **SUCCESS**; [квитанція](roadmap/SA_EXT_01_SHARED_PRIMARY_PARALLEL_RIGHTS_BOUNDS_SCOPED_TERMINAL_20261031.md). Повний SA-EXT-01 **OPEN**, live/NVDA/Windows NOT_VERIFIED.


- **SA-EXT-02 / приватна історія читання (HTTP read projection і межі):** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` для видалення додаткових історичних JSON полів із API, захисту обсягу 2 000 записів та помилок D1. [PR #852](https://github.com/Oleksii-debug/scripture-archive/pull/852) **MERGED** `main@f0a827916bc105a64e29161e211d7c9ec9b91bd4`; [CI #41169869208](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41169869208) **SUCCESS**; [офіційна квитанція](roadmap/SA_EXT_02_READING_RECEIPT_GET_PROJECTION_BOUNDS_SCOPED_TERMINAL_20261031.md). **Батьківські SA-EXT-02 і SA-EXT-16 OPEN**, реліз/Chrome/Windows/NVDA не підтверджено.


- **SA-EXT-01 — ідентичність перекладу основної читальні:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` лише для відмови від підстановки чужого ліцензійного джерела за неправильного ID. [PR #842](https://github.com/Oleksii-debug/scripture-archive/pull/842) **MERGED** у `main@12abfeae78f132b5fe07a29abde15f5185d56233`, exact-head [CI #41168210300](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41168210300) **SUCCESS**; [доказ](roadmap/SA_EXT_01_PRIMARY_TRANSLATION_IDENTITY_SCOPED_TERMINAL_20261031.md). Повний SA-EXT-01 OPEN; live Sites/browser/NVDA/Windows NOT_VERIFIED, деплою немає.



- **SA-EXT-01 — сирі Unicode-контролі в джерелах/ліцензіях Біблії:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` лише для точної URI-цілісності канонічної читальні й сторінки видань. [PR #839](https://github.com/Oleksii-debug/scripture-archive/pull/839) **MERGED** у `main@d43111e214afdad45e6d35fadf9ebca9a88433eb`; exact-head [Actions #41167858860](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41167858860) **SUCCESS**; [термінальна квитанція](roadmap/SA_EXT_01_RAW_SOURCE_LICENSE_UNICODE_SCOPED_TERMINAL_20261031.md). **Батьківський SA-EXT-01 OPEN; live/Sites/Windows/NVDA NOT_VERIFIED**, деплою немає.



- **SA-EXT-16 — точний рахунок створених учасників спільноти:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` лише для `community_waves.created_count` після успішного member INSERT. [PR #838](https://github.com/Oleksii-debug/scripture-archive/pull/838) злито в `main@ed3b9daca87bb7a75e8f79fbabb3a646e61cc99a`, [CI #41167678710](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41167678710) SUCCESS. [Квитанція](roadmap/SA_EXT_16_COMMUNITY_WAVE_MEMBER_INSERT_SCOPED_TERMINAL_20261031.md). Батьківський SA-EXT-16 OPEN, реліз не виконано.

- **SA-EXT-16 — owner-керування спільнотою та D1-readback:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` для fail-closed START/PAUSE/RESUME/STOP та точного owner snapshot. [PR #835](https://github.com/Oleksii-debug/scripture-archive/pull/835) і [#836](https://github.com/Oleksii-debug/scripture-archive/pull/836) злиті в `main@0a84164bbad224a9cf85ff0726865371fa5ac660`; обидві native CI SUCCESS. [Квитанція](roadmap/SA_EXT_16_COMMUNITY_OWNER_D1_ACK_SCOPED_TERMINAL_20261031.md). Повний SA-EXT-16 і реліз OPEN.

- **SA-EXT-07/16 — приватна Academy та BFCache:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` тільки для неавторизованого збереження приватних позначок після `pagehide`. [PR #833](https://github.com/Oleksii-debug/scripture-archive/pull/833) злитий у `main@c3e02c5842f5ceafe8c4784daa1a0ef51ee2445f`, [exact-head CI #41166069032](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41166069032) **SUCCESS**. [Доказ](roadmap/SA_EXT_07_ACADEMY_BFCACHE_SCOPED_TERMINAL_20261031.md). Обидва батьківські розділи OPEN; реальний сайт, NVDA і реліз не підтверджені.

- **SA-EXT-16 — приватний account/BFCache:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` лише для захисту account DOM, форм та застарілих callbacks після `pagehide`. [PR #826](https://github.com/Oleksii-debug/scripture-archive/pull/826) злито у `main@9457b5bb93f032b8deb455aa8964ffeb741d3f34`; [exact-head CI #41165008578](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41165008578) **SUCCESS**. [Квитанція](roadmap/SA_EXT_16_ACCOUNT_BFCACHE_SCOPED_TERMINAL_20261031.md). Повний SA-EXT-16 і непідтверджені release/browser/NVDA етапи залишаються OPEN.

- **R0 / SA-EXT-16 — перевірка оголошеного HTTPS-домену:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` для непомітних керівних символів і порожнього userinfo. [PR #784](https://github.com/Oleksii-debug/scripture-archive/pull/784) злито в `main@0d9bf08f00794e75a6c91c0f5d6f95a21de63ef0`; [CI #41072585585](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41072585585) **SUCCESS**. [Квитанція](roadmap/R0_DECLARED_ORIGIN_CONTROLS_SCOPED_TERMINAL_20261030.md). Жодного деплою: батьківські SA-EXT-03/04 уже **TERMINAL для розробки**, інші 18 батьківських розділів **OPEN**.
- **R0 / SA-EXT-16 — офлайнова перевірка SQLite-копії, захист від символьного посилання:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`. Виправлення [PR #781](https://github.com/Oleksii-debug/scripture-archive/pull/781) злито в `main@bb8a0af98cdfca93464ebbc5fbe548460415dd97`; [нативна CI #41071493589](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41071493589) **SUCCESS**. [Постійна квитанція](roadmap/R0_CONSENT_SNAPSHOT_SYMLINK_SCOPED_TERMINAL_20261030.md). Повний SA-EXT-16 та інші незакриті батьківські розділи **OPEN**, SA-EXT-03/04 вже **TERMINAL**; робочий production-реліз не підтверджений.

## Канонічні документи
1. [Розширена кінцева концепція](product/SCRIPTURE_ARCHIVE_EXPANDED_PRODUCT_VISION_2026-10-28.md): біблійний дослідник, академія, громади, соціальна мережа, конференції, фонди, бібліотека, атлас, міжнародні партнерства і ШІ.
2. [План із 20 розділів та критеріїв готовності](roadmap/SCRIPTURE_ARCHIVE_EXPANSION_SECTION_PLAN_2026-10-28.md): ідентифікатори SA-EXT-01…20; готове/заплановане/незавершене; залежності, пріоритети, acceptance.
3. [Технічна специфікація окремих християнських знайомств](architecture/CHRISTIAN_COMMUNITY_AND_DATING_TECHNICAL_SPEC_2026-10-28.md): окремий opt-in 18+ продукт із власними даними і правилами, пілот серед суботніх християн, без автоматичної конфесійної класифікації.

## Проєктна дисципліна
- Поточна публічна платформа: https://scripture-archive.com (перевірений handoff 26.10: Sites v10, commit `3a04d12`; перед технічною роботою перевірити live стан).
- Базовий існуючий код: `public/app.js`, `public/home.js`, `public/data/catalog.json`, `app/api/groups/route.ts`, `app/api/attempts/route.ts`.
- Release/production blockers (email, owner control, cron, assessment patch, end-to-end/accessibility) **не вважаються завершеними** через додавання цих документів.
- Не редагувати вихідні архівні handoff/ZIP/завершені презентації заднім числом. Новий план — версійне розширення 28.10, не переписана історія.
- Не активувати розсилки, платежі, нові production jobs, конфесійне профілювання, синтетичну діяльність, соціальні або dating-функції лише тому, що вони внесені до плану.

Контрольні джерела: [Issue #78](https://github.com/Oleksii-debug/scripture-archive/issues/78) і [архів стану від 26.10](https://drive.google.com/file/d/1EX575ZzoImUDKbYhCwcXXupiooZK51sd/view).
