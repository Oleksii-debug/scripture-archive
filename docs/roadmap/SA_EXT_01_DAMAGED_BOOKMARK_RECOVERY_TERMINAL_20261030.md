# SA-EXT-01 — пошкоджені закладки: вузька функція остаточно закрита

**Дата:** 2026-10-30. **Статус:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.
**Важливо:** це закриття конкретного дефекту #658, а НЕ повного батьківського розділу SA-EXT-01. Усі SA-EXT-01…20 залишаються OPEN. Не перезапускати цей фікс без нової відтвореної регресії.

## Що тепер реально реалізовано

- Авторизований `GET /api/bookmarks` зберігає дійсні навігаційні закладки, відокремлює зіпсовані записи, повідомляє `partial_bookmarks` та віддає тільки обмежений текстовий опис і прив'язаний до власника/rowid/стану запису reference.
- В існуючому читачі `public/app.js` у UK/RU/EN є семантичний список відновлення, екранно-читабельний підпис, явно підтверджувана дія видалення одного запису; пошкоджені рядки не перетворюються на HTML чи посилання читача.
- `DELETE /api/bookmarks` перевіряє same-origin і авторизовану особу, звіряє reference з живим рядком; конкурентні зміни, чужий власник, пошкоджений/непевний D1 ACK і помилки бази блокують позитивне підтвердження.
- Існуючі збережені валідні закладки, старі DELETE/PUT, джерела текстів Писання, навчання та базові повноваження не переписані.

## Точна інтеграція

- Feature PR: https://github.com/Oleksii-debug/scripture-archive/pull/661 — `MERGED`.
- Exact feature main SHA: `f7e13981f7529e57e9c96cd89dfe8ac3dce221f5` (після merge підтверджено main == цей SHA; подальші commits не скасовують ancestry).
- Exact approved PR head: `f652c5407913c90d119b2911465fa0930ecbded9`.
- Змінено рівно чотири канонічні файли: `app/api/bookmarks/route.ts`, `public/app.js`, `tests/bookmark-recovery-route.test.mjs`, `tests/bookmark-recovery-ui.test.mjs`. Додані SQLite regression cases містяться у `tests/bookmark-recovery-sqlite.test.mjs`, що входить до того ж PR; разом п'ять шляхів у фактичній source історії.
- Залишкових завдань **реалізації саме цієї вузької функції немає**: `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`.

## Виконані перевірки (GitHub Actions, а не симуляція)

- Workflow https://github.com/Oleksii-debug/scripture-archive/actions/runs/41051249744, exact HEAD `f652c5407913c90d119b2911465fa0930ecbded9`: conclusion `SUCCESS`.
- Native Node: **1644 PASS, 0 FAIL, 1 SKIP** (1645 total); disposable Worker/D1: **22 PASS, 0 FAIL**; TypeScript: PASS; lint: PASS; build: PASS; Python pytest: **2 PASS**.
- На рівні інтеграції GitHub main SHA перевірено після merge; це не замінює фактичного production запуску.

## Окремі незавершені приймальні гейти

- Поточний встановлений Sites SHA, живі браузерні дії, фізичний NVDA/Windows та production D1: **NOT_VERIFIED**, не вигадувати PASS.
- Батьківські SA-EXT-01…20: **OPEN**, окремий release-прохід і кожен ширший функціонал залишаються в #297/#78 та затвердженому 20-section plan.
- Нові необов'язкові ідеї не повертають цю завершену підфункцію у розробку.
