# Scripture Archive — R0.4 / SCHEDULER_OIDC_NUMERICDATE_INTEGRITY — scoped terminal

Дата: 2026-10-31. Статус: **CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** — тільки точна межа часових перевірок підписаного OIDC JWT.

## Фактична функція

Канонічний `lib/community-runner-identity.mjs` приймає лише правильні цілочислові безпечні часові претензії `iat`, `exp` і необов'язковий `nbf`. Відхиляються нечислові, `null`, дробові, перевернуті та недопустимо майбутні timestamps. Наявні перевірки RS256, GitHub JWKS, точного workflow, repository, subject, branch, audience і часу дії лишилися на місці. Це захист від пошкоджених або неправильно зібраних токенів; не твердження про продукційне зловживання чи можливість підробити криптографічний підпис.

## Злиття і тести

- Функціональний PR [#1079](https://github.com/Oleksii-debug/scripture-archive/pull/1079) SQUASH MERGED; exact feature main `6268f055b19f50c981637c3456d4ba6dbb91a90c`.
- Git blobs: production `lib/community-runner-identity.mjs@84543c0448342e8d54c97a11157973a88cc01163`, regression `tests/community-runner-identity.test.mjs@668eebaa0d90ff72528309c39e39b22086db0f83`. Обидва повторно прочитані в main після merge.
- Exact PR head `9392569ca5c1b6ef54bd08b4a1e2af419ec49252` — [CI #41246321314](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41246321314) completed success: реально виконані native Node, TypeScript, ESLint, source build, disposable Worker/D1, Python. 13 нових негативних підписаних RSA-випадків + 2 позитивних; базові issuer/signature перевірки збережені. Загальну кількість suite tests тут не вигадуємо.
- `remaining_scoped_implementation=0`; `necessary_unmerged_scoped_PRs=0`.

## Межі

R0.4 загалом, SA-EXT-01–20 і реліз #689 не завершені цим патчем. Live Sites/D1, фактичний scheduler, фізичний Windows/NVDA та авторизація оператора релізу не перевірені. Немає змін production, real email, migration, payments, agents або запуску розсилки. Повторно розробляти цей scoped блок лише за новим конкретним дефектом чи затвердженою вимогою.

Координація: [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297), [#78](https://github.com/Oleksii-debug/scripture-archive/issues/78).
