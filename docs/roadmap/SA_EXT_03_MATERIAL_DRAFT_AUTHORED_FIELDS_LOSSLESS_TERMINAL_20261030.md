# SA-EXT-03 — MATERIAL_DRAFT_AUTHORED_FIELDS_LOSSLESS — ВУЗЬКИЙ ПІДПУНКТ ЗАКРИТО

Дата: 2026-10-30. Статус: **CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL**. `remaining_scoped_implementation=0`; `necessary_unmerged_PRs=0`. **Повний батьківський розділ SA-EXT-03 і всі SA-EXT-01…20 залишаються OPEN.**

## Реальний дефект і завершена реалізація
Канонічний авторський `POST /api/materials` використовував `clean(value,max)=trim().slice(0,max)` для назви, завдання, посилання, пояснення та правильної відповіді, а перевіряв вимоги лише після обрізання. Довгі авторські тексти зберігалися з іншим змістом, але клієнт одержував підтвердження. Зокрема відповідь 501 символ могла після обрізання збігтися з наданим 500-символьним варіантом.

Тепер *до будь-яких читань/записів D1* перевіряється, що кожне із п'яти полів є рядком і його нормалізована довжина не перевищує затверджені межі: `title=160`, `prompt=3000`, `reference=200`, `explanation=2000`, `answer=500`. Надлишковий текст → `400 invalid_material`; жодної беззвучної зміни матеріалу. Всі п'ять значень на точних межах зберігаються повністю, дозволене лише обрізання пробілів. Збережено чинні обмеження варіантів, незалежне редакційне затвердження, права власника, авторизацію, локалі й owner-conditional атомарний UPSERT без жодного дубльованого конструктора чи нової БД.

## Інтеграція та докази
- [Source PR #639](https://github.com/Oleksii-debug/scripture-archive/pull/639) **SQUASH MERGED** у `main@324603a3e6244afd817d4e83e1af61d019f96a8e`.
- Перевірені на `main` blob: `app/api/materials/route.ts@2a61c24c48e9f4cd32b769f55f11f67ca0cef6f1`, `tests/materials-d1-ack.test.mjs@ab2d597a3516c8b5d3b02190d4684cc16424001c`.
- Сім нових перевірок запускають **реальний транспільований route + нативну тимчасову SQLite** (5 негативних порушень, позитивне повне збереження п'яти меж, перевірка дозволеного trim).
- [GitHub Actions #41041667648](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41041667648), exact PR head `f62bf1bad64073bb5a4978535ee9807f3f53bc12`: **overall SUCCESS**, Node `1507 PASS / 0 FAIL / 1 SKIP`, TS/lint/build і Python `2 PASS`; disposable Worker/D1 з першої спроби 21/22 (відомий restart HTTP503), на **другій незалежній тимчасовій D1 — 22/22 PASS**. Цей успішний повтор не доводить усунення нестабільності [#618](https://github.com/Oleksii-debug/scripture-archive/issues/618).
- Production Site, real browser, Windows/NVDA, email, реальний оператор і deployment SHA — **NOT VERIFIED**. Ці докази стосуються лише source + локальної одноразової інтеграції; повний SA-EXT-03 залишається OPEN.

Цей дефект **не розробляти повторно** без нової чіткої вимоги або відтвореної регресії. Подальші задачі та інші SA-EXT вести у [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297).
