# SA-EXT-01 / CANONICAL_BOOK_ORDER — ОСТАТОЧНО ЗАКРИТО ДЛЯ РОЗРОБКИ (SCOPED)

**Дата:** 2026-10-31. **Висновок:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` **лише для перевірки порядку книг у біблійному каталозі.** Батьківський SA-EXT-01 залишається `OPEN`; це не release acceptance.

## Раніше незакрита реалізація

Канонічна читальня `public/app.js::getCatalog() → validBibleCatalog()` приймала коректні 66 унікальних кодів із неправильним порядком у російському/англійському списку або виданні. Це могло пов'язати індекс навігації з іншою книгою попри формально правильний набір кодів. Тепер кожна позиція усіх трьох основних локалей і додаткових видань повинна містити **той самий код** книги, що й відповідна позиція канонічного `catalog.books.uk`. Назви та кількість глав у різних виданнях можуть законно відрізнятися; вони не підміняються загальними значеннями. Некоректний HTTP 200 catalog не кешується, після усунення пошкодження повторне завантаження працює у справжньому інтерфейсі.

## Підтверджені докази

- [Реальний code+regression PR #1024](https://github.com/Oleksii-debug/scripture-archive/pull/1024) **SQUASH MERGED**, точний source-merge `main@a564f9eb804fdf5d0ebfa54af9b2f1414232b015`; вихідний PR-head `780347525012357611033fc60d4c312b49ca3cc0`.
- Після merge перечитано `public/app.js` blob `c2d6bdb7b80948cbe54e8d2aec8f36c2cf72efaa`, `tests/reader-cache.test.mjs` blob `4d3938a8f12131992996b42478facbbc69ae3f11`. У source є фактичне зіставлення `book.code !== catalog.books.uk[index].code`, в існуючому native Node suite — дві corrupted/recovery fixtures (swap у RU та `uk-ohiienko`) і справжній позитивний trilingual+edition catalog.
- [Exact-head GitHub Actions #41239949088](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41239949088) **COMPLETED SUCCESS**, HEAD `780347525012357611033fc60d4c312b49ca3cc0`. У job успішні native Node regression suite, TypeScript, lint, build без розгортання, disposable Worker/D1 end-to-end і canonical Python validators. Окремого локального тесту й фізичного browser/NVDA приймання цим актом не заявлено.

**remaining_scoped_implementation=0; necessary_unmerged_scoped_PRs=0; CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL.** Повторна розробка цієї конкретної перевірки заборонена без нової вимоги або відтворюваного дефекту.

## Що залишається відкритим

Повний SA-EXT-01 (включно з погодженими перекладами, правами/ліцензіями і редакційним прийманням) **OPEN**. Достовірний deployed Sites SHA, production D1/backup, real browser/keyboard/Windows/NVDA та release cutover [#689](https://github.com/Oleksii-debug/scripture-archive/issues/689) **NOT_VERIFIED**. Жодного деплою, міграції, email, імпорту персональних даних, додаткових мов або платежів цим source-закриттям не виконано.
