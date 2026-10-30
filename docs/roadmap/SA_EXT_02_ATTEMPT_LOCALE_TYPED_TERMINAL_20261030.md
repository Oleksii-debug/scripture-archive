# SA-EXT-02 — ATTEMPT_LOCALE_TYPED_INPUT — 2026-10-30

**Закриття лише перевіреної підфункції:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`; `remaining_scoped_implementation=0`; `necessary_unmerged_PRs=0`. **Усі 20 повних батьківських розділів SA-EXT-01…20 залишаються OPEN.**

**Функція.** У канонічному `app/api/attempts/route.ts` POST `/api/attempts?action=start` явно відхиляє JSON array/object/boolean/number у полі `locale` як `400 invalid_locale` **до** читання/споживання receipt та нової D1 місії. Не змінено історичний default UK для відсутнього, null, порожнього й невідомого текстового коду; чинні `uk/ru/en` працюють; початкова авторизація/Origin, правила оцінювання й D1 залишилися канонічними. `tests/attempt-locale-typed-boundary.test.mjs` реально виконує транспільований TS-маршрут: 8 невалідних типів, 7 дозволених/default мов, cross-Origin та неіснуюча глава.

**GitHub.** [PR #666](https://github.com/Oleksii-debug/scripture-archive/pull/666) SQUASH MERGED; exact source/main merge `cec6d59302e1a5bac1857591589986c3dff48e5f`; candidate tested `23d92be88808e875abaf256881800c9561cb595c`; source blob `32145ec2ea1dee9915a0e3e6b886a6d04a27ad1e`; new test blob `9ca2d8f80600339828e0fc5c0b71800701fd0633`. Весь scope у `main`, жодних обов'язкових незлитих змін цього фіксу.

**Фактична перевірка.** [GitHub Actions #41052618856](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41052618856), job `124052155651`: `SUCCESS`, **1662 Node PASS / 0 FAIL / 1 SKIP**, TypeScript PASS, ESLint 0 errors/13 warnings, build PASS, disposable Worker/D1 **22/22 PASS**, Python **2 PASS**. Перший PR-head run #41052345806 мав 7 RED **через помилкову fixture-кількість prepared statements** (очікували 1 замість фактичних 4), не source-defect; тест виправлено на перевірку всіх 4 фактичних SQL statements, повторний exact-head run успішний. Не прикривати це як перший PASS.

**Межі.** `LIVE_SITES_SHA=NOT_VERIFIED`; браузерний E2E, Windows/NVDA, зовнішні видання і повні місії SA-EXT-02 `NOT_VERIFIED/OPEN`. Жодного production deploy, секретів, листів чи нових мов. Уже зареєстрована координаційна дошка [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297); інша паралельна SA-EXT-02/04 розробка PR #667 має окремий scope й не скасовується цим закриттям.

**Повторне призначення саме цього вузького дефекту заборонене** без нової вимоги чи підтвердженого відтворюваного дефекту.
