# SA-EXT-05 — EXACT_BIBLE_BOOK_SOURCE_SEARCH — ЗАКРИТО ДЛЯ РОЗРОБКИ

**Дата:** 2026-10-31. **Функціональний статус:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` **лише для exact Bible book / edition title research lookup**. Батьківський SA-EXT-05 залишається `OPEN`; це не нова видавнича ліцензія та не готовий production release.

## Підтверджений початковий залишок

Канонічна сторінка `/dossiers?q=...` вже підтримувала пошук за назвами, описами, публічними запитаннями і точними посиланнями на глави/вірші, але введення **лише назви біблійної книги з вибраного видання або її коду** не давало всіх досьє з цієї книги. Користувач мав наперед знати конкретну главу. Це неповний source-backed lookup для вже наявного каталогу, а не підстава створювати паралельний індекс або вигадувати джерела.

## Інтегроване функціональне виправлення

- У справжньому `public/scripture-dossiers.js::searchScriptureDossiers` обробляється повний точний код `GEN`, `LUK`, `ACT`, `RUT` та інші вже процитовані в канонічному графі коди, а також точні локалізовані назви з чинного `catalog.books[lang]`.
- Відбір відбувається **тільки** за реально наявними `sources[]` та `related[].via`. Пошук не додає неіснуючі глави, не вгадує видавничий текст і не дозволяє префіксному фрагменту `GEN 1` видати джерело `GEN 12` за збіг.
- Запит вбудований у той самий маршрут і доступну форму `/dossiers`, чинні перевірені source citations / читальня / клавіатурна навігація залишилися. Жодної нової БД, редакторського обліку, web-сервера або дубльованого авторитету.
- Нова негативна та позитивна регресія включає **12 book×locale** комбінацій (4 коди × 3 мови), код і повну реальну назву видання, прямі й зв'язані свідчення, відсутність каталогу та хибні невідповідні коди.

## Остаточний exact-main та evidence

- [Функціональний PR #829](https://github.com/Oleksii-debug/scripture-archive/pull/829) **SQUASH MERGED** `main@3892251d94421d69cba1c7283aee198cbee0c9b2`. Після merge виконано GitHub readback `PR.merged=true` і обох робочих blob:
  - `public/scripture-dossiers.js@2c5d63acc48ac184c978ffc6e4665941de4eeba8`;
  - `tests/dossier-search.test.mjs@299bb17ad1683e726920efc1789563b808ec1a00`.
- Source-executed V8 на справжньому `public/data/catalog.json`: **46** scoped asserts PASS; committed new test callback — PASS у V8 з URLSearchParams shim. **Це не native Node.**
- [GitHub Actions #41165428310](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41165428310) на exact PR head `3fc4a0b83dd8269069fe0b6c1d937be336c9aa34`: **COMPLETED SUCCESS**. Незалежно `SUCCESS`: native Node regression suite, TypeScript, lint, production source build без деплою, disposable Worker/D1 E2E та Python validators.
- Для **лише цього** підпункту: `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`; повторно не призначати без конкретно відтвореного дефекту або затвердженої нової вимоги.

## Межі закриття

**Повний SA-EXT-05 — OPEN**: ширший джерельно перевірений каталог осіб, подій і місць, незалежний історичний контекст, наукові/конфесійні інтерпретації та provenance/rights QA ще потребують розробки й редакторського підтвердження. **SA-EXT-06 теж OPEN** попри раніше закриту вузьку функцію під PR #827. SA-EXT-03 і SA-EXT-04 вже TERMINAL за окремими батьківськими квитанціями.

`scripture-archive.com` live SHA, браузер/Windows/physical NVDA, production D1/SMTP та окремий реліз — **NOT_VERIFIED**. Сайт не оновлювався; дані користувачів/пошту не змінено. Координація: [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297), [#78](https://github.com/Oleksii-debug/scripture-archive/issues/78).
