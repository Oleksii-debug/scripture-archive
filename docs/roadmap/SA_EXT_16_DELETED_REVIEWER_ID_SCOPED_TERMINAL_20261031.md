# SA-EXT-16 / ACCOUNT_DELETE_REVIEWED_BY_ID — остаточне вузьке закриття

**Дата:** 2026-10-31. **Статус лише доведеного дефекту:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`. **Батьківські #303 і SA-EXT-16: OPEN.** Цей документ не є актом повної готовності сайту чи його розгортання.

## Що було відтворено на існуючому коді

За початковим перевіреним `main@d88c1f56c89499357a88fd1ce24103d84570cc75` транзакція `POST /api/auth?action=delete-account` видаляла персональні записи та анонімізувала автора групової зустрічі, але не очищувала `material_submissions.reviewed_by` видаленого редактора для матеріалів іншого автора. Реальний канонічний `GET /api/material-review?view=history` містить це поле як `reviewerId`. `drizzle/0011_material_review.sql` зберігає його у таблиці без FK на accounts; затверджений запис вимагає непорожнє `reviewed_by`. Нативна ізольована SQLite 3.46.1 перевірка засвідчила, що заміна на неідентифікуючий sentinel не порушує `approved` CHECK.

## Злита функція, не тимчасова демонстрація

- **Функціональний [PR #1008](https://github.com/Oleksii-debug/scripture-archive/pull/1008) — SQUASH MERGED.** Точний інтегрований `main@311bdd5ce08dfd02521c0710c9165d46d491a97b`.
- У канонічному `app/api/auth/route.ts`, без нового API/сервера/схеми, транзакційний D1 delete-account batch тепер виконує `UPDATE material_submissions SET reviewed_by='deleted-account' WHERE reviewed_by=?` для видаленого principal. Збережено матеріал іншого автора, статус схвалення, timestamp, rights/source checks і особи інших редакторів. Це той самий чесний неідентифікуючий sentinel, що й для shared group sessions.
- Перевірку підтверджень транзакції узгоджено з **21** SQL-операцією; кінцеве `accounts` UPDATE мусить мати `receipts[19].meta.changes === 1`. Відмова чи невідомий результат залишаються fail-closed, без обіцянки успішного видалення.
- Розширено чинний `tests/account-deletion-privacy.test.mjs`, а не створено дубль функціональної влади. Тести охоплюють незалежний схвалений матеріал Bob, видаленого reviewer Alice, незалежного reviewer Bob, збереження status/rights/timestamp, та відкат анонімізації при падінні наступного SQL-кроку.

## Докази приймання коду

- GitHub source review і exact main readback: `app/api/auth/route.ts@3cb9db3c314f657df431605f263639d8104818fe`, `tests/account-deletion-privacy.test.mjs@df8917410409ff433a57b3c5546273f4dcfcc1b5`.
- Actual GitHub Actions [run #41237669312](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41237669312), **exact PR head `560b273aa6938759fc5d16a0178feae9a118d017`**, `COMPLETED / SUCCESS`; виконані native Node regression suite, TS contracts, lint, source build, disposable Worker/D1 end-to-end, existing Python validators. Ізольована SQLite schema/control перевірка окрема і не рахується як повна D1/браузерна інсталяція.
- [Центральна privacy issue #303](https://github.com/Oleksii-debug/scripture-archive/issues/303) і [координація #297](https://github.com/Oleksii-debug/scripture-archive/issues/297) зберігають наступні залежності.

**Остаточно для цього дефекту:** `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_feature_PRs=0`, `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`. Повторна реалізація без конкретного дефекту або нової затвердженої вимоги не потрібна.

**Незавершено окремо:** policy/retention анонімних запитів Help; історично доставлені зовнішні emails; backup/recovery, редакторська/юридична оцінка законного утримання історії, поточний production Sites SHA/D1, браузер/NVDA, публікація. **#303 та цілий SA-EXT-16 OPEN; FULL_PLATFORM_READY=NO; PRODUCTION_DEPLOYMENT_NOT_VERIFIED.** Нічого не видаляли й не мігрували на бойовому сайті.
