# SA-EXT-02 / READ_HISTORY_GET_PROJECTION_AND_BOUNDS — закрито вузький підпункт, 2026-10-31

**РІШЕННЯ: `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` тільки для захисту читання збережених D1 receipts у канонічному `GET /api/account?action=reading`.**

Це не повне закриття SA-EXT-02 або SA-EXT-16. Батьківські розділи **OPEN**. Живий сайт, Cloudflare Sites installed SHA, фізичний NVDA/Windows, нові місії, реальні видавничі права і реліз — **NOT_VERIFIED**.

## Початковий підтверджений ризик

Канонічний API перевіряв `book/chapter/title` старих записів, проте віддавав браузеру весь JSON-масив без проєкції. Непередбачені приватні історичні поля після імпорту чи міграції могли виходити у відповіді користувача. Для читання не було обмеження 2 000 записів, уже встановленого в чинному POST.

## Остаточна реалізація

- У штатному `app/api/account/route.ts` після D1-read і повної валідації кожен запис проєктується **тільки** на `book`, `chapter`, `title`; зайві поля ніколи не серіалізуються в HTTP.
- Схвалена історія до **2 000** записів зберігає порядок, тексти й кількість без обрізання або перезапису D1. Більша історія, пошкоджений JSON, невідома книга/глава/заголовок і збій D1 завершуються `503 reading_state_unavailable`, а не помилковим порожнім успіхом.
- Незмінні principal authentication, `Cache-Control: no-store, private`, канонічний reader, БД, schema та URL; без нових серверів, міграції чи автоматичного релізу.

## Перевірка й інтеграція

- Функціональний [PR #852](https://github.com/Oleksii-debug/scripture-archive/pull/852), `SQUASH MERGED` до **`main@f0a827916bc105a64e29161e211d7c9ec9b91bd4`**; після злиття PR.merged=true, `compare(main,main)=identical`.
- Blob source `app/api/account/route.ts@c4c2028692a3bf2e39353d578282c89907c3cf53`.
- Blob regression `tests/reading-receipt-get-projection-bounds.test.mjs@3f985dcc7d567b9df47915b0529c5ad468d63548`.
- **41 source-executed native Node route cases** added, valid boundaries, extra-field removal, malformed books/chapters/titles, corrupted D1, empty state, auth/session/DB failures.
- Точний [GitHub Actions #41169869208](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41169869208) на PR head `bcc294aaa02bf07c407f99ac319c813f8e9516c9`: **COMPLETED SUCCESS**; native Node **2524 PASS / 0 FAIL / 1 SKIP** з 2525; disposable Worker/D1 **22/22 PASS**; TypeScript, lint і production build пройдено; Python `pytest` **2 PASS**.
- Після злиття source/test перечитані з точного merge SHA; `main` тоді мав саме цей SHA.

## Закриття тільки підпункту

`remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`, `status=CLOSED_FOR_DEVELOPMENT_SCOPED/TERMINAL`.

**Не відкривати повторно без нового відтвореного дефекту.** Повний SA-EXT-02: навчальні місії/оцінювання/повторення; SA-EXT-16: увесь release, безпека, приватність, реальний NVDA і доступність — залишаються OPEN. Загальне розгортання — окрема відповідальність. Координація [issue #297](https://github.com/Oleksii-debug/scripture-archive/issues/297).
