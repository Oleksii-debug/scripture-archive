# SA-EXT-07 / SA-EXT-16 — приватні позначки Академії та BFCache: остаточний вузький запис

**Дата:** 2026-10-31. **РОЗРОБКУ ВУЗЬКОГО ПІДПУНКТУ ЗАКРИТО** — `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.

Цей запис стосується **лише захисту приватних позначок Academy `/campaigns` під час BFCache pagehide/pageshow**. **SA-EXT-07 і SA-EXT-16 як батьківські розділи залишаються OPEN**, так само як незавершені вимоги до розширення курсів/локалізацій/релізу. SA-EXT-03/04 source-terminal не змінюються.

## Відтворювана область дефекту

Персональні локальні позначки навчального маршруту Academy (прогрес, завершення, import/export/reset controls) були доступні в `/campaigns`, але цей маршрут і змонтований елемент `.academy-reading` не входили до канонічного синхронного звільнення приватних сторінок на `pagehide`. Старий DOM та незавершені запити курсу могли переживати BFCache-перехід між авторизованими сесіями.

## Фінальний інтегрований функціонал

1. `public/app.js`: існуючий (не дубльований) захист приватних маршрутів очищує Academy DOM до BFCache, враховує ще не змонтований `campaigns`, забороняє повторне відкриття до `getSession()`.
2. `public/workspace.js`: `renderWorkspace('campaigns')` користується тим самим epoch/suspension, що `builder` і `progress`: пізні відповіді та нові запити прихованої сторінки відхиляються.
3. `tests/academy-bfcache-privacy.test.mjs`: чотири поведінкові сценарії канонічного source/V8 (змонтована сторінка, очікуваний маршрут, застарілі відповіді, відсутність hidden network reads), плюс оновлена shared editorial fixture.
4. Авторитетні облікові записи, D1, сторінка Academy, права на контент та вже прийняте `/account` виправлення #826 збережено; другого сервера, незавершеної кнопки чи stand-alone demo не додано.

## Факти GitHub

- [PR #833](https://github.com/Oleksii-debug/scripture-archive/pull/833), точний PR-head `d195a5c51a5fcea8f34d5c1ddd262bb7589337fb`, **SQUASH MERGED** у канонічний `main@c3e02c5842f5ceafe8c4784daa1a0ef51ee2445f`.
- Exact source blobs, read from integrated `main`: `public/app.js@0b07b763d4041be7673b33f247b29caa9f6ac184`, `public/workspace.js@88dcdb732668dd605ddefc3b8d294cbdd95c6991`, `tests/academy-bfcache-privacy.test.mjs@b78e5ee58700815d518c0113079355eb7461a889`, `tests/editorial-bfcache-privacy.test.mjs@14ea36b4319e3e53e92a90d21001db751f53f9a3`.
- [Exact PR-head GitHub Actions #41166069032](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41166069032) **COMPLETED SUCCESS**, job readback: native Node tests, TypeScript, lint, source build, disposable local Worker/D1 and Python validators all actually completed successfully. PR documents isolated 38 BFCache tests and whole Node 2373 PASS / 1 SKIP; those counts are from the PR author, full-job outcome independently verified through Actions.
- GitHub readback confirms #833 `state=closed`, `merged=true`. **`remaining_scoped_implementation=0`** and **`necessary_unmerged_PRs=0`** for this **one** private BFCache defect, not for parent Academy or full product.

## Окремо не доведено

Installed `https://scripture-archive.com` current SHA, real Chrome BFCache journey, actual keyboard/NVDA physical acceptance, production D1, all course material licences or expanded curriculum are **NOT_VERIFIED**. Цей scoped source closure не є deployment approval. Повторна розробка вузького виправлення — лише за новою конкретною регресією або затвердженою вимогою. Основна координація: [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297).
