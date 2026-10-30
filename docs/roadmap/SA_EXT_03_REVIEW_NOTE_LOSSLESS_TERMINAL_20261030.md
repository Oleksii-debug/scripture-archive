# SA-EXT-03 — REVIEW_NOTE_LOSSLESS — ВУЗЬКИЙ ПІДПУНКТ ЗАКРИТО

2026-10-30. **CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL**; `remaining_scoped_implementation=0`; `necessary_unmerged_PRs=0`. **Батьківський SA-EXT-03 та всі SA-EXT-01…20 залишаються OPEN.**

## Реальний дефект і завершений функціонал
`POST /api/material-review` на дії редактора `review` мовчки відкидав текст після 2000 символів через `.trim().slice(0,2000)`, але записував скорочений `review_note`, змінював стан рішення і відповідав `ok:true`. Реальний редакторський інтерфейс уже мав `textarea maxlength=2000`, однак прямий JSON-запит обходив цю межу.

Тепер канонічний маршрут відхиляє нормалізовані нотатки довші за 2000 з HTTP `400 invalid_review` **до D1 batch**, а допустимі пояснення до межі 2000, Unicode й обрізання пробілів зберігаються без втрати змісту. Наявні редакторські права, independent-author review, source/rights approval, обов'язкова непорожня причина відхилення і атомарний D1 ACK залишилися незмінні. Жодного другого редактора, БД, розгортання немає.

## Доказовий GitHub-стан
- [PR #633](https://github.com/Oleksii-debug/scripture-archive/pull/633) **SQUASH MERGED**; source integration `main@16d27d8b2a148a3f1862d0ce098ee7f08c19662f`.
- Підтверджено читанням з merged main: `app/api/material-review/route.ts` blob `90fe7d143d039e5fefe4eb7fba813a174268bec3`; `tests/material-review.test.mjs` blob `cdb8088ee01882d4f413a010ec2afc639e726a52`.
- [Actions #41040325955](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41040325955), PR head `67cd5f31e393ac4b2186f91db7ccac02f48020dd`: `1492 Node PASS / 0 FAIL / 1 SKIP` (чотири нові route+SQLite тести), TypeScript, lint, build PASS, Python `2 PASS`; **повний CI FAIL** через незалежний disposable Worker/D1 `21/22` двічі, HTTP 503 з `Your worker restarted mid-request` ([#618](https://github.com/Oleksii-debug/scripture-archive/issues/618)). Це не повний E2E PASS.
- Production/browser/Windows/NVDA, живі акаунти й реліз **NOT_VERIFIED**; зміни на production не розгорталися.

Не повертатися до цього вузького підпункту без нового конкретного дефекту або нової вимоги. Продовжити інші відкриті підпункти у [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297) і залишити релізний блокер окремим.
