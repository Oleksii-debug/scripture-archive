# SA-EXT-01 / PARALLEL_CITATION_STALE_GUARD — 2026-10-30

**РОЗДІЛ SA-EXT-01, виключно підфункція `PARALLEL_CITATION_STALE_GUARD`: ЗАКРИТО ДЛЯ ПОВТОРНОЇ РОЗРОБКИ / `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.**

Це НЕ термінальне закриття повного батьківського SA-EXT-01. **Усі 20 батьківських SA-EXT-01…20 залишаються OPEN.** Не відкривати цю вузьку підфункцію знову без нової вимоги або відтвореного дефекту.

## Підтверджений дефект і штатна поведінка

- Код `public/parallel-reader.js` виконував `await check(book,chapter)` під час цитування вже завантаженого другого видання.
- Якщо після початку цього запиту користувач змінював видання A на B, успішно відкривав B, а застарілий `check` для A відхилявся, виклик `failClosed()` помилково поширював **стару** несправність на **чинну** читальню B.
- Після виправлення `failClosed()` за відхиленою перевіркою цитати допускається лише за збереження обох меж: `citation === record` та `selected()`, крім існуючих `panel.isConnected` і `current()`.
- Актуальна перевірка, що завершилася помилкою, **як і раніше fail-closed**. Не послаблено заборону цитування, chapter/assessment authorization, license/source metadata, principal boundary або clipboard permission.

## Інтеграція і тестові докази

- Source/test PR: [#713](https://github.com/Oleksii-debug/scripture-archive/pull/713), **SQUASH MERGED**.
- Exact source integration `main@5b0313ae6c5ca4eb9b26d62e300475ec88b5c036`.
- Source blob `public/parallel-reader.js@6e212ce217593e4b23bbc6f86de236fc8321f679`.
- Regression blob `tests/parallel-reader-stale-citation-guard.test.mjs@781d88dee81afbb084ff30c8bb4523d3ca9e6910`.
- Five focused native `node:test` cases: old A guard rejection after B, old A invalidation after B, A→B→A stale rejection, current rejection fail-closed, current success citation copy.
- [Exact feature HEAD Actions #41058860655](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41058860655): **SUCCESS**, single `source-and-disposable-integration` job complete; native Node regression suite, TypeScript contracts, ESLint, build, disposable local Worker/D1 E2E, canonical Python validators all passed.
- Independently reread merged `main`, exact source and new regression blobs; `PR.merged=true`, main matched merge SHA immediately after merging.

`remaining_scoped_implementation=0`; `necessary_unmerged_scoped_PRs=0`.

## Не входить до цього завершення

Full SA-EXT-01 Bible-edition licensing/content coverage, end-to-end authenticated browser, installed Cloudflare Sites SHA, release cutover, real SMTP, physical keyboard/NVDA, Windows binary, and remaining SA-EXT-01…20 acceptance are **OPEN / NOT_VERIFIED**. GitHub Actions local Worker/D1 does not certify production D1 or the live website. No deployment, data mutation, mailing, cron or additional language was performed.

Coordination: [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297), [#78](https://github.com/Oleksii-debug/scripture-archive/issues/78), [owner plan #295](https://github.com/Oleksii-debug/scripture-archive/issues/295).