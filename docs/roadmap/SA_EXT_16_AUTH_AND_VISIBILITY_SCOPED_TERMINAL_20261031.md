# SA-EXT-16 — ТРИ КОНКРЕТНІ ПІДФУНКЦІЇ ОСТАТОЧНО ЗАКРИТО ДЛЯ РОЗРОБКИ

**Дата:** 2026-10-31. **Статус тільки трьох описаних підфункцій:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`. Для них `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. **Повний SA-EXT-16 залишається OPEN**, як і інші 17 незавершених батьківських розділів; SA-EXT-03/04 уже закриті окремо.

**Точний інтегрований source-main:** `f4bd52c74a38fc88e14005cf645fb8f42f34a935` після послідовного злиття всіх трьох PR. Цей SHA позначає код GitHub, **НЕ опубліковану версію** `scripture-archive.com`.

## 1. SA-EXT-16 / PASSWORD_CHANGE_AVAILABILITY_FENCE — РОЗРОБКУ ЗАКРИТО

- [PR #846](https://github.com/Oleksii-debug/scripture-archive/pull/846), **SQUASH MERGED** в `main@fdb061ab76b577f20874b13c556ff888b7d652c2`.
- Канонічний `app/api/auth/route.ts`: усі відмови identity lookup, rate-limit storage, password verification/hash і D1 transaction під час зміни пароля повертають контрольований `503 password_change_unavailable`; 400, 401, 429, успішна атомарна зміна і server-side session revocation збережені; HTTP response не скидає cookie іншого входу.
- Новий `tests/auth-password-change-availability.test.mjs`: **14 source-executed негативних/позитивних сценаріїв**; відповідь без cookie; невпевнені D1 ACK не дають 200.
- [PR-head CI #41168891011](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41168891011) **SUCCESS**: Node 2432 PASS / 0 FAIL / 1 SKIP, TypeScript/lint/build PASS, disposable Worker/D1 22/22 PASS, Python 2 PASS.

## 2. SA-EXT-16 / ACCOUNT_DELETE_PREFLIGHT_AVAILABILITY_FENCE — РОЗРОБКУ ЗАКРИТО

- [PR #848](https://github.com/Oleksii-debug/scripture-archive/pull/848), **SQUASH MERGED** в `main@ba7e84cb96d232cde98c25e45026b4c139f44d68`.
- Той самий канонічний `app/api/auth/route.ts`: відмова identity, account query, password verifier до видалення більше не створює необробленого handler exception; `503 deletion_failed` fail-closed, неправильний пароль 401; повна раніше наявна D1 атомарна транзакція з 20 statements, очищення спільних meeting reflections і збереження чужих записів незмінні.
- Новий `tests/auth-deletion-preflight-availability.test.mjs`: **10 source-executed тестів** preflight, success, 401, D1 refusal/unknown ACK; раніше наявні справжні SQLite rollback і cross-user тести залишаються.
- [PR-head CI #41169117627](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41169117627) **SUCCESS**: Node 2445 PASS / 0 FAIL / 1 SKIP, TypeScript/lint/build PASS, disposable Worker/D1 22/22 PASS, Python 2 PASS.

## 3. SA-EXT-16 / COMPLETE_BOOLEAN_VISIBILITY_SNAPSHOT — РОЗРОБКУ ЗАКРИТО

- [PR #849](https://github.com/Oleksii-debug/scripture-archive/pull/849), **SQUASH MERGED** в `main@f4bd52c74a38fc88e14005cf645fb8f42f34a935`.
- Канонічний `app/api/account/route.ts`: повний snapshot прапорців `firstName,lastName,church,progress` обов'язково містить **рівно чотири boolean**. Неповні, типізовані неправильно або зайві поля отримують приватний 400 до будь-якого D1 mutation; відсутня небезпечна тиха конверсія в false із втратою попередньої видимості.
- Справжній UI `public/app.js` уже подає саме чотири booleans і не переписувався. `tests/account-visibility-complete-booleans.test.mjs` містить **33 source-executed сценарії**. Сумісно оновлено існуючі disposable smoke `tests/sa10-durable-reading.test.mjs`, `tests/api-flow.test.mjs`, `scripts/test-learning-agent.mjs` для цієї канонічної форми. Не було другого API або нового сервера.
- Перші два запуски #41169204676 і #41169299238 та наступний #41169418349 чесно виявили **старі неповні fixtures**, були RED, не вважалися PASS. Виправлено лише fixtures, а не послаблено захист.
- [Остаточний PR-head CI #41169541268](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41169541268) **SUCCESS**: Node **2478 PASS / 0 FAIL / 1 SKIP**, TypeScript/lint/build PASS, disposable Worker/D1 **22/22 PASS** із learning-agent smoke, Python **2 PASS**.

## Умови остаточного scoped closure

- Відсутніх або незлитих необхідних PR **немає** саме для трьох описаних виправлень; усі production paths і regression fixtures в `main`, без mock-only endpoint і без паралельного server authority.
- Ці підфункції не перепризначати на повторне виконання без конкретного відтвореного дефекту або нової власницької вимоги.
- **Повний SA-EXT-16 — OPEN**: перевірки фізичної роботи Windows/NVDA, live Sites SHA, справжнього D1 migration ledger, backup/recovery, privacy consent cutover й production acceptance не доведені. Issue [#689](https://github.com/Oleksii-debug/scripture-archive/issues/689) щодо історичного production privacy guard та [#303](https://github.com/Oleksii-debug/scripture-archive/issues/303) щодо законного retention продовжують існувати. Цей документ не санкціонує деплой, зовнішні листи, створення акаунтів, платежі або публікацію окремого dating-продукту.
- Останній центральний облік і наступна робота: [координаційна задача #297](https://github.com/Oleksii-debug/scripture-archive/issues/297), затверджені повні вимоги [20-section roadmap](SCRIPTURE_ARCHIVE_EXPANSION_SECTION_PLAN_2026-10-28.md).
