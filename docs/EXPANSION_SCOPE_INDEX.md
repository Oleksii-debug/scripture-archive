# Scripture Archive — індекс затверджених майбутніх розширень (28.10.2026)

**Статус:** власник погодив включення до технічних планів і каталогу розділів; це не доказ реалізації й не дозвіл на автоматичний реліз. 
**Принцип:** пріоритет поточного продукту — завершити/перевірити нинішні можливості, а всі нові напрямки розвивати як доказові окремі модулі.

## Перевірені вузькі закриття (не закриття батьківського розділу)

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
