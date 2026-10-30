# SA-EXT-01/16 — DAMAGED_BOOKMARK_RECOVERY — РОЗРОБКУ ВУЗЬКОГО ПІДПУНКТУ ЗАКРИТО

Дата: 2026-10-30. **CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** тільки для відновлення пошкоджених приватних закладок, описаного в [issue #658](https://github.com/Oleksii-debug/scripture-archive/issues/658). `remaining_scoped_implementation=0`; `necessary_unmerged_PRs=0` для саме цього підтвердженого функціоналу після source merge. **Повні SA-EXT-01, SA-EXT-16 і всі SA-EXT-01…20 залишаються OPEN.**

## Що реально підключено до продукту

У чинному `app/api/bookmarks/route.ts` авторизований GET повертає здорові закладки як звичайні перевірені reader-посилання, зберігає `partial_bookmarks` для пошкоджених даних і додає тільки власникові опис некоректного запису та непридатний до навігації recovery reference. Посилання прив'язане до власника, точного SQLite rowid та перевірених значень рядка; GET нічого не видаляє.

Відновлення здійснюється тільки через наявний авторизований `DELETE /api/bookmarks`: перевіряються same-origin, власник, формат посилання, збережена ревізія рядка, непридатність запису як нормальної закладки, і точний SQL-предикат за rowid та всіма початковими полями. Застарілий, підмінений, чужий або вже виправлений запис не видаляється; нуль змін не вважається успіхом, невизначений/багаторядковий D1 ACK не стає `ok:true`. Нормальний PUT/DELETE закладок не замінений альтернативною реалізацією.

Канонічний `public/app.js` показує текстові описи лише як екранований контент, кнопку для кожного пошкодженого запису й окреме підтвердження перед його видаленням; відмова від підтвердження не виконує write. Є три вже чинні мови UI: українська, російська, англійська. Дотримано обмеження старого account/chapter lease для асинхронних відповідей. Помилка чи непідтверджений ACK оголошується через живий текстовий статус. Немає другої БД, нового сервера або production-деплою.

## Доказ інтеграції / exact source

- Функціональний [PR #661](https://github.com/Oleksii-debug/scripture-archive/pull/661) **MERGED**. Офіційний feature integration `main@f7e13981f7529e57e9c96cd89dfe8ac3dce221f5`; GitHub перевірив `compare(feature main...main)=identical` після злиття.
- Основні перевірені Git blobs: `app/api/bookmarks/route.ts@b26d1c88e53ffdd37499f9a7504e37613ebb3056`; `public/app.js@238a2520d197ac3688b61934bd1d75044e3e1225`.
- Тести source-executing: `tests/bookmark-recovery-route.test.mjs@f7707d92181c66156da44a48cc02890e6ba6610e` (14 кейсів); `tests/bookmark-recovery-ui.test.mjs@a1bb111aa5fc2a964d9bb4da32e030dd49ea0f08` (10); `tests/bookmark-recovery-sqlite.test.mjs@5aa88eea4ee4c6d2fcf18b0b10a07edea0ef016a` (10 справжніх SQLite сценаріїв з оригінальною міграцією). Разом 34 нові адресні регресійні сценарії.
- [Exact-HEAD GitHub Actions #41051249744](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41051249744) на PR head `f652c5407913c90d119b2911465fa0930ecbded9`: **overall SUCCESS**, native Node 1644 PASS / 0 FAIL / 1 SKIP, TypeScript PASS, lint PASS, build PASS, disposable real HTTP Worker/D1 22/22 PASS, existing Python validators PASS. Перша і проміжні перевірки виявили тестову fixture/старий API-формат/TS narrowing; всі виправлено до цього зеленого exact-head запуску.
- [Owner coordination #297](https://github.com/Oleksii-debug/scripture-archive/issues/297), [defect issue #658](https://github.com/Oleksii-debug/scripture-archive/issues/658).

## Відмежування

**Лише DAMAGED_BOOKMARK_RECOVERY — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL.** Інші вимоги повних батьківських розділів не позначені DONE. Production `scripture-archive.com` deployed SHA, фізичне NVDA, browser keyboard acceptance та Windows-пакет **NOT_VERIFIED** цими CI тестами й залишаються окремими релізними/QA умовами. Новий обсяг або конкретна відтворена регресія можуть відкрити нове вузьке виправлення; без цього повторно розробляти вже злиту функцію не потрібно.
