# SA-EXT-01 / PRIMARY_READER_BOUNDED_CHAPTERS — ЗАКРИТО ДЛЯ ПОДАЛЬШОЇ РОЗРОБКИ (SCOPED)

**Дата:** 2026-10-31. **Статус саме цього підпункту:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`. **Батьківський SA-EXT-01 — OPEN.**

## Закритий реальний функціонал

Канонічний `public/app.js::getBook()`, який використовується справжньою читальнею і порівняльним читанням, валідовує до кешування та рендерингу HTTP-200 JSON книги: правильні book/locale/edition ID і каталог глав, не більш як 200 глав у книзі, 1–256 непорожніх текстових віршів на главу, не більш як 131072 UTF-16 одиниць тексту в главі. Індексовані цикли відхиляють sparse/missing елементи, які попередня `Array#some` пропускала. Некоректні відповіді не залишаються в кеші: наступний запит завантажує виправлений текст. Це не новий рушій або окрема непідключена функція; паралельний reader уже застосовує ті самі межі для глав.

## Точний доказ інтеграції та перевірок

- [Source PR #864](https://github.com/Oleksii-debug/scripture-archive/pull/864) **SQUASH MERGED** у `main@eb60a7d9a8f90f8287f039887606748c20838de3`.
- Прочитано після merge з живого `main`: `public/app.js` blob `8e40dc5fa16c3e8618767e3c22cdb9ff0a573d93`; `tests/reader-cache.test.mjs` blob `4d94fe75ca0dbac3bda2ca594b6d5efbe2c8b087`.
- Нові source-executed Node регресії перевіряють шість помилкових payload (257 віршів, занадто великий один вірш, надмірний сумарний текст, sparse глави/вірші, понад 200 глав) з відмовою та повторним завантаженням, а також чотири граничні й Psalm-подібні допустимі варіанти. Існуючий тест реально читає усі локальні книги доступних видань.
- [GitHub Actions #41171867181](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41171867181) **COMPLETED SUCCESS** на точному feature head `7d97b7c702b58d0e57a500bee16027dd46cf4bbf`: native Node **2668 PASS / 0 FAIL / 1 SKIP**, disposable Worker/D1 **22 PASS / 0 FAIL**, TypeScript, lint, build, Python pytest **2 PASS**. Після цього merge SHA зчитано повторно, не вигадано окремого postmerge CI.

**remaining_scoped_implementation=0; necessary_unmerged_PRs=0; CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL.** Не переписувати без нового відтвореного дефекту/вимоги.

## Не входить до цього закриття

Ширше права/ліцензоване покриття перекладів, затвердження source provenance та перекладацька QA — **SA-EXT-01 OPEN**. Жива публікація на Sites, точний installed SHA, реальний Chrome/Windows/фізичний NVDA та редакційні права **NOT_VERIFIED**; деплой і зміна мов не проводилися. Закриття цього підпункту не оголошує готовності всієї платформи.
