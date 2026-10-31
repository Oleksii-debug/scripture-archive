# SA-EXT-01 / READER_ROUTE_ASYNC_OWNERSHIP — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

Дата: 2026-10-31. Остаточне закриття **лише підфункції захисту асинхронної навігації** у канонічній читальні, не усього SA-EXT-01.

## Функціональність та виправлена помилка

Вихідний `public/app.js@9ba2cd1e6e06b6a4aab9af221f004da4e27789dd` після `await getCatalog()` дозволяв старому запиту `/reader/JHN/3` перезаписати завершений новий `/reader/GEN/5` того самого користувача. Source-executed V8: 9 із 12 негативних/контрольних асинхронних сценаріїв RED на baseline; 12/12 PASS на виправленні, а також 6/6 перевірок після chapter-attempt await. Це не доказ браузерної/production події.

Код `public/app.js` зберігає **один** renderReader і всі канонічні каталоги/права/глави/перевірки principal. Кожен виклик має новий нетривалий **неперелічуваний** токен, а pending continuation перевіряє точні `pathname + search + hash` та актуальність state context після асинхронних операцій. Немає додаткового сервера, дубльованої читальні, заглушок або нових мов.

Нові `tests/reader-route-staleness.test.mjs`: 18 нативних Node-subtests у uk/ru/en (старий та новий маршрут, два виклики того ж URL, query/hash, зміна principal, запізнілий chapter-attempt, позитивне відновлення). `tests/parallel-reader.test.mjs` і надалі вимагає principal/context guard та новий route guard.

## Точний GitHub-доказ

- PR [#1087](https://github.com/Oleksii-debug/scripture-archive/pull/1087) — SQUASH MERGED до `main@1ed62b0837c3bfb7ecf2f3d28770aa2de0e991be`.
- Source blob: `public/app.js@37e5bca73517ccba107666bbdd808932138955f4`.
- New test blob: `tests/reader-route-staleness.test.mjs@5919cf6a98a439dc0d8e9b8873d3fd00bf2f4cb8`.
- Existing principal test blob: `tests/parallel-reader.test.mjs@7dc4a8a79e444e3cf25cf06266fc71f5b9dce26b`.
- Перша Actions [#41246939757](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41246939757) реально FAILED на старому дослівному assertion (не приховувати). Після оновлення assertion із збереженням invariant точний PR-head `1815174ed3969c2bf92a4b66abe7e8a471d36ce1` [Actions #41247063880](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41247063880): COMPLETED SUCCESS, один реально виконаний `source-and-disposable-integration` job, 16 кроків, Node, TypeScript, lint/build, disposable Worker/D1, Python.
- `remaining_scoped_implementation=0`; `necessary_unmerged_scoped_PRs=0` лише для описаної вузької функції; функціональний код уже в main.

## Винятки

SA-EXT-01 parent, SA-EXT-02..20, весь реліз [#689](https://github.com/Oleksii-debug/scripture-archive/issues/689) — **OPEN**. Немає підтвердження installed Sites/D1, live browser E2E, Windows-пакета або фізичного NVDA; ці критерії не входять до закриття вузької source-функції. Production, міграції, платежі, email, нові мови не змінювалися. Координація: [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297).

**Остаточне рішення:** `SA-EXT-01 / READER_ROUTE_ASYNC_OWNERSHIP — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`. Повторне призначення без нової вимоги/підтвердженого дефекту заборонено.
