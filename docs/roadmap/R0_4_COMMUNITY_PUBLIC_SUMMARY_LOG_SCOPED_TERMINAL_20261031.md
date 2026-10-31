# Scripture Archive — R0.4 / COMMUNITY_PUBLIC_SUMMARY_LOG — scoped terminal receipt

**Дата:** 2026-10-31. **Стан:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`, виключно для проєкції лічильників у журналі локального запуску спільноти.

## Завершена функція

Канонічний `scripts/run-community.mjs` відтепер логуватиме лише валідовані числові `registered`, `online` і, якщо допустиме, `visible`. Додаткові поля upstream `summary` (у тому числі випадково включені приватні ідентифікатори/токени) не потрапляють до stdout. Некоректні обов'язкові лічильники, як і раніше, блокують owner-lease POST; допустимі значення і локальний сценарій `--agents --once` збережені.

Це запобігання можливому надлишковому логуванню під час некоректної відповіді upstream, **не доказ фактичного витоку в production**.

## Аудит і інтеграція

- Функціональний [PR #1074](https://github.com/Oleksii-debug/scripture-archive/pull/1074) **SQUASH MERGED** до exact `main@1b6d560c13581dd5232aa44f3ee63972b5eb5810`.
- Source `scripts/run-community.mjs`, blob `252f0fcc6479bfdf78851eca8e7c5777dab05740`.
- Native CLI/loopback regression `tests/community-runner-summary-boundary.test.mjs`, blob `7dbd1451c989027f2264fb48b586a4a146581ae3`: негативна перевірка невідомих полів, позитивна проєкція публічних лічильників, некоректне необов'язкове `visible`, без публічних мережевих запитів.
- Exact PR-head `bef051577cbba2282c99ff0118d59eeac097c76e`: [Actions #41245932212](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41245932212) **COMPLETED SUCCESS**, із фактично виконаними кроками Node regression suite, TypeScript, ESLint, source build, disposable Worker/D1 і Python; усі завершились success. Кількості індивідуальних тестів не заявляємо без окремого підрахунку.
- Після злиття повторно прочитані blobs на live `main`, обидва збігаються із зафіксованими; додаткових незлитих PR, необхідних саме для цього вузького виправлення, немає.

**`remaining_scoped_implementation=0`; `necessary_unmerged_scoped_PRs=0`.** Жодне перезаписування іншого реалізованого модуля чи окремого сервера.

## Точна межа закриття

Батьківський R0.4, загальні SA-EXT розділи, реліз #689, реальний сайт, D1 production, права, Chrome/Windows/NVDA й production acceptance **не позначаються завершеними**. Сайт не розгортали, жодних реальних email, платежів, агентів або міграцій D1 не запускали. Повторне відкриття цього scoped item — тільки за новою вимогою або новим конкретним дефектом.

Координація: [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297), [#78](https://github.com/Oleksii-debug/scripture-archive/issues/78).
