# SA-EXT-16 — приватний обліковий запис / BFCache: остаточне вузьке закриття

**Дата:** 2026-10-31. **Статус:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` лише для конкретного виправлення відновлення приватного інтерфейсу після `pagehide/pageshow`. **Повний SA-EXT-16 — OPEN**, як і всі інші незакриті батьківські розділи. Деплой, браузерна приймальна перевірка і фізичний NVDA не оголошені виконаними.

## Перевірена проблема
На чинному маршруті `/account` відображаються персональні поля профілю, адреса електронної пошти, налаштування згоди, парольні форми. Старий handler `pagehide` очищував приватні екрани редактора/груп/прогресу, але не реєстрував account DOM чи очікуваний account-маршрут. На BFCache-поверненні могла залишатися стара приватна розмітка або передчасно відновлюватися дія без завершення перевірки серверної сесії.

## Реально інтегрований функціонал
- Канонічний `public/app.js` синхронно очищує приватні форми/dashboard `/account` під час `pagehide`, включно з очікуваним, ще не змонтованим маршрутом.
- Існуючий `getSession()` / `pageshow` generation barrier не дозволяє показати старий account DOM та виконати старі mutation handlers до завершення актуальної авторизації.
- Заблоковано застарілий рендер account після повторного приховання сторінки; немає паралельного authentication backend, зміни бази або нового runtime.
- `tests/editorial-bfcache-privacy.test.mjs` містить шість нових source-executed Node перевірок: очищення профілю, немонтований вхід, форми пароля, delayed session, повторний вихід, захист безпосереднього `renderAccount`.

## GitHub provenance / acceptance
- Source PR [#826](https://github.com/Oleksii-debug/scripture-archive/pull/826), head `29da61acc7e02cddc837319dd717e6c34de1ec65`, **SQUASH MERGED**.
- **Точний інтегрований main SHA: `9457b5bb93f032b8deb455aa8964ffeb741d3f34`.**
- `public/app.js` blob `78c5901a988f9ee37e9eddb87b492fe21d2dddcf`; `tests/editorial-bfcache-privacy.test.mjs` blob `7cf563413074e36f925801c96c2a8ed173cff353`, verified against merged main.
- Exact PR-head [Actions #41165008578](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41165008578) **COMPLETED SUCCESS**. Readback of the executed job shows successful native Node regression suite, TypeScript, lint, source build, disposable local Worker/D1 integration and existing Python validators. This does **not** constitute a physical browser/NVDA or live Sites test.
- PR #826 is closed and merged; **`remaining_scoped_implementation=0`**, **`necessary_unmerged_PRs=0`** for this narrow defect only. Reopen this source work only with a reproduced regression or new approved requirement.

## Незалежні залишкові обов'язки
SA-EXT-16 parent: broader identity/privacy/security, consent/release checks, verified SMTP, production D1, published site exact SHA, live browser BFCache and Windows/NVDA remain separate acceptance work. Controlled release, any external communication and real user records were **not changed**. Coordination: [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297), [#295](https://github.com/Oleksii-debug/scripture-archive/issues/295).
