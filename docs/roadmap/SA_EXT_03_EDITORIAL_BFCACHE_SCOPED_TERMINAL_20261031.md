# SA-EXT-03 — редакторські приватні сторінки і BFCache (scoped terminal)

**Дата:** 2026-10-31. **РОЗРОБКУ ЛИШЕ ЦЬОГО ПІДПУНКТУ ЗАКРИТО / `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.** Повний SA-EXT-03 та всі SA-EXT-01…20 **OPEN**.

## Виявлений дефект

Канонічний `/editor` показує власникові приватну базу email-адрес та аналітику, а `/builder` — авторські чернетки, редакторську чергу і історію рішень. На відміну від окремої сторінки домашніх груп, у цих двох маршрутах не було синхронного очищення приватного DOM під час `pagehide` і повторного підтвердження серверного облікового запису після `pageshow`. Повернення через BFCache могло відобразити попередні дані. Запізнілі GET для ролей, чернеток, матеріалів або власника також не були прив'язані до виходу зі сторінки.

## Завершена реальна інтеграція

- `public/app.js`: загальний lifecycle для власника й редактора, приватний DOM видаляється синхронно через `main.replaceChildren()`; guard `editorViewEpoch` із прапорцями прихованої/ще не авторизованої сторінки.
- `public/workspace.js`: існуючий `renderWorkspace('builder', ...)` одержує cancellation/suspension barrier; pending відповіді після `pagehide` відкидаються, а новий builder render дозволяється лише після повторної `getSession()`. Єдині чинні API акаунтів і редакційних дозволів; нової ролі, сервера, БД або зовнішньої копії даних немає.
- Повторний `pageshow` не створює дубльовану переавторизацію; повторний `pagehide` анулює стару незавершену відповідь; маршрут перерендерюється тільки після актуального серверного сеансу.
- П'ять шляхів зміни: два справжні production JS, 12 нових source-executing native Node тестів у `tests/editorial-bfcache-privacy.test.mjs`, адаптація двох старих source-extracted fixtures для сумісної перевірки **тих самих** group/owner race guarantees. Під час інтеграції збережено паралельний захист груп #818.

## Незмінний доказ

- [Source PR #819](https://github.com/Oleksii-debug/scripture-archive/pull/819): **SQUASH MERGED**, перевірений exact **`main@e17f7cf9d7d69140f3eda098f699beb86a2a56d4`**.
- Production blobs: `public/app.js@b47ce8533f1737f058f1b0baba100cc25e6e7c2e`, `public/workspace.js@4c874fb261d65fc93963751abe172b4c26b7780d`.
- Regressions: `tests/editorial-bfcache-privacy.test.mjs@caea1395c8ec3068fa78b07bf63e06db3542c9ed` (12 нових випадків), `tests/group-detail-bfcache-privacy.test.mjs@240ee00a87c822b2a35aade50af7c5279844d834`, `tests/owner-dashboard-principal-race.test.mjs@262687a046e8f91de605c5b635e3988c96dcf19a`.
- Exact-head [GitHub Actions #41164044787](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41164044787) **completed SUCCESS**: native Node, TypeScript, lint, Next build, disposable Worker/D1 HTTP і існуючі Python validators — **усі шість кроків success**. Початковий збій #41163869845 виник через несумісність двох ізольованих тестових фікстур після розширення lifecycle; відновлено повне виконання, не послаблюючи asserts.
- Після merge зроблено незалежний readback `main`, `PR.merged=true`, source/test SHA і наявності guard/cancel/resume у справжніх файлах.

## Межі закриття

Для **цієї конкретної приватної BFCache підфункції**: `remaining_scoped_implementation=0` та `necessary_unmerged_PRs=0`; повторна розробка лише за новим відтвореним дефектом.

Для **повного SA-EXT-03** ще потрібні: незалежне приймання реальним автором/редактором, перевірка фактичних дозволів/ліцензій на опубліковані матеріали, production schema/cutover, браузер/Windows/NVDA та встановлений Sites SHA. Не створювали реальних користувачів, не змінювали production D1, не надсилали листів і не розгортали. Усі 20 батьківських розділів залишаються **OPEN**.
