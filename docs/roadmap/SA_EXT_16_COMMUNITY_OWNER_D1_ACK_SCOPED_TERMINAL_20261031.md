# SA-EXT-16 / COMMUNITY_OWNER_D1_ACK — scoped terminal receipt, 2026-10-31

**ФОРМАЛЬНИЙ СТАН: `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.** Ця квитанція закриває **дві конкретні реалізовані підфункції** збереження надійного стану власника спільноти. **Повний батьківський SA-EXT-16 залишається OPEN**; цей документ не означає повного завершення безпеки/доступності/продукту, не авторизує деплой, розсилки, запуск спільноти чи зміну production-даних.

## Прийнятий функціонал

1. **OWNER_CONTROL_D1_ACK**: існуючі власницькі команди `start/pause/resume/stop` через канонічні `POST /api/community` та `lib/community-engine.ts::controlCommunity` приймають тільки повний пакет підтверджень D1, з точним CAS `changes=1`, успішним журналом події та звільненням control lease. Невдалий/короткий/непідтверджений пакет повертає JSON `503 community_unavailable`, а stale CAS залишається `409 run_changed`. Немає окремої реалізації або обходу захисту.
2. **OWNER_SNAPSHOT_D1_ACK**: справжня owner-панель `GET /api/community?action=owner` не показує вигадані `run:null`, `synthetic.total=0` або відсутню історію на пошкодженому/непідтвердженому D1 snapshot. Перевіряються всі чотири read receipts, існування та тип стану run, цілісність невід'ємного `COUNT`. Невизначена відповідь => `503 community_unavailable`.

## Незмінні авторитети і GitHub інтеграція

- Репозиторій `Oleksii-debug/scripture-archive`; канонічний код `lib/community-engine.ts`, маршрут `app/api/community/route.ts`.
- [Функціональний PR #835](https://github.com/Oleksii-debug/scripture-archive/pull/835) **SQUASH MERGED**: `main@9d5842187e092d07cdb3f01963c76911238db02f`; [CI #41167149955](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41167149955) **SUCCESS**, 2386 Node PASS / 0 FAIL / 1 SKIP, 22/22 disposable Worker/D1, 2/2 Python, TS/lint/build PASS.
- [Функціональний PR #836](https://github.com/Oleksii-debug/scripture-archive/pull/836) **SQUASH MERGED**: точний інтегрований `main@0a84164bbad224a9cf85ff0726865371fa5ac660`; [CI #41167332377](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41167332377) **SUCCESS**, 2404 Node PASS / 0 FAIL / 1 SKIP, 22/22 disposable Worker/D1, 2/2 Python, TS/lint/build PASS.
- Після merge здійснено незалежний readback source `lib/community-engine.ts` Git blob `f7c5156917967ab05d8a11c1932ac39e7ab3467e`, test blob `tests/community-owner-snapshot-read-ack.test.mjs@e2c8d91eb9c9b54684f68002bfcefff7326e1574`. Нові тести виконують **фактичні** TypeScript маршрути/engine в Node VM, без другого продуктового handler.
- Стан цих двох підпунктів: `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`; повторна розробка без конкретного нового дефекту або нової затвердженої вимоги не потрібна.

## Залишок поза цим закритим scope

Батьківський `SA-EXT-16` **OPEN**: незалежна production-privacy/release-кваліфікація, поточний Sites worker SHA, live authenticated Chrome/Sites, реальні DNS/SMTP, фізичний Windows/NVDA, інші неповні технічні вимоги і відкриті #297/#303/#689/#705. Це не release PASS і не засвідчення всього продукту. У цій роботі **не було** деплою, рестарту, керування живою спільнотою або вимкнення релізних обмежень.
