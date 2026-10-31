# R0.4 / COMMUNITY_RUNNER_SUMMARY_BOUNDS — scoped terminal closure, 2026-10-31

**РОЗДІЛ №R0.4 / ПІДФУНКЦІЯ COMMUNITY_RUNNER_SUMMARY_BOUNDS — ЗАКРИТО ДЛЯ ПОДАЛЬШОЇ РОЗРОБКИ / CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL.**

Це закриття **лише вказаного вузького дефекту** у скрипті запуску агентів, **не всього R0.4, SA-EXT-10/16, не повного технічного плану SA-EXT-01–20 і не релізу**.

## Функціональність та факти

- Канонічний CLI `scripts/run-community.mjs` читає публічний `/api/community?public=summary` і перед `--agents` lease-POST вимагає два скінченні невід'ємні безпечні цілі значення `registered` та `online` з `online <= registered`.
- Негативні, дробові, рядкові, відсутні, завеликі або логічно неможливі значення відхиляються **до** публікації підсумку та **до** POST-запиту оренди. Валідний локальний сценарій залишається працездатним.
- Оригінальний source Git blob: `c1931ca5b2746d76e808529215f7177a62f63e26`; після виправлення: `49158423c68d4515d32a05b732d30b6007e5e251`.
- Новий тест реального процесу CLI: `tests/community-runner-summary-boundary.test.mjs`, blob `188931b98ffff6d994ba9bee81360fce9e8b671a`; без паралельного сервера, без реальної cookie, без мережі поза `127.0.0.1`.
- [Функціональний PR #1055](https://github.com/Oleksii-debug/scripture-archive/pull/1055) **SQUASH MERGED**. Точний feature `main@44894fbc18fea7e6e7ab7da6f38ff789fb43f3b8`.

## Виконані перевірки

- Native Linux Node **v22.16.0**; вихідний CLI відновлено з GitHub byte-for-byte, `git hash-object` збігається з оригінальним Git blob. Реальний `--agents --once` + disposable loopback HTTP server: **перед ремонтом 4/9 PASS, 5/9 RED** (неможливі counters дозволяли lease-POST); **після ремонту 9/9 PASS**, exit 0, позитивний сценарій виконав рівно один локальний lease.
- `node --check scripts/run-community.mjs` — **exit 0**. Git blob зміненого CLI локально підтверджений `49158423c68d4515d32a05b732d30b6007e5e251`.
- Окрема точна реконструкція `lib/community-smoke.mjs@0c2e5f2f47a40abdd52574b2b1e0ae2d483aab2e`, native **41/41 PASS** із позитивними/негативними read-only сценаріями; це не заміна повного CI.
- [Exact PR-head GitHub Actions #41244058854](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41244058854) для `9328eef825e2d16c1bf8b099a4e7742e8c4d92cd`: **COMPLETED SUCCESS**, job `source-and-disposable-integration`, кроки native Node, TypeScript, lint, build, disposable local Worker/D1 і Python виконані з `success`.
- Після merge незалежно прочитані з live GitHub `main`, обидва production/test blobs та PR merged=true.

## Окрема релізна правда

`remaining_scoped_implementation=0`; `necessary_unmerged_scoped_feature_PRs=0` для **цього дефекту**. Кнопок-заглушок або альтернативного сервера не додано. **R0.4, усі батьківські SA-EXT-01–20 та реліз #689 залишаються відкритими там, де відсутнє приймання.** Live Sites/D1, production migration, браузер, реальні користувачі, Windows, фізичний NVDA та остаточний реліз **NOT_VERIFIED**. Немає реального надсилання листів, виплат, запуску ботів, операцій із production-даними, оновлення сайту чи деплою.

**NO_REIMPLEMENT:** не переписувати цю підфункцію без нової конкретної відтвореної помилки або нової вимоги. Наступний пріоритет — чинна релізна задача [#689](https://github.com/Oleksii-debug/scripture-archive/issues/689) та незакриті батьківські функції плану; координація [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297).
