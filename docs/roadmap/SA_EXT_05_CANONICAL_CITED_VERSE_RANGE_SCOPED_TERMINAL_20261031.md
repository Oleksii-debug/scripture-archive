# SA-EXT-05 — біблійні діапазони у справжньому пошуку досьє: ЗАКРИТО ДЛЯ ПОДАЛЬШОЇ РОЗРОБКИ (SCOPED)

**Дата:** 2026-10-31. **Статус:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`. Це остаточне закриття **однієї конкретної реалізованої підфункції** source-backed dossier search, а **не** повного SA-EXT-05. Повний батьківський розділ залишається **OPEN** через інші погоджені історико-дослідницькі, бібліографічні, ліцензійні й приймальні вимоги.

## Що саме реалізовано у головній платформі

- Канонічний `public/scripture-dossiers.js::searchScriptureDossiers` приймає точні посилання `GEN 17:15-19` і `GEN 17:15–19` разом із книгою/главою, знаходить перетин лише з уже оприлюдненими `sources` або `related[].via`; шукати можна без вигадування біблійних текстів чи нового каталогу.
- Діапазон зі зворотним порядком відхиляється без результату, а невідповідні книга, глава або вірші не підміняються іншим досьє. Збережено звичайний пошук за окремим віршем і за назвою/кодом біблійної книги.
- Реальний `/dossiers` та `public/workspace.js` вже використовують цю функцію; чинний GET-`q`, індекс досьє, aria/current, посилання на канонічну читальню `/reader/...`, екранні повідомлення про помилку і клавіатурні елементи залишилися підключеними. Немає другого сервера чи окремого демонстраційного UI.

## Точна інтеграція і виконане тестування

- [Кодовий PR #905](https://github.com/Oleksii-debug/scripture-archive/pull/905) — **SQUASH MERGED**; exact source integration `main@c81d50e5fe84050e7ecbb29b79a2e7e5519b4f07`.
- Production source: `public/scripture-dossiers.js` Git blob `1b98d50fce67cc8fb2267446d9a6c43ff19abe7a`.
- Actual checked-in regression: `tests/dossier-cited-range-search.test.mjs` Git blob `66505cd9f331ba7eb603c8668239b970b76927a5`; **42 нові незалежні Node тести** (3 мови, дійсні і недійсні діапазони, коректний source match, UI/GET/reader route, HTML escaping, відхилення чужого досьє, збереження старого verse lookup).
- [GitHub Actions exact-PR-head #41179768016](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41179768016) на `cbb091306d78d8ed6460f3e923781269a3367d29` — **COMPLETED SUCCESS**: Native Node **2938 PASS / 0 FAIL / 1 SKIP**; одночасно 22/22 disposable Worker/D1 PASS, Python 2/2 PASS, TypeScript, lint та production-source build PASS. На job `124474588642` 12 робочих кроків завершилися без помилок. Це виконані тести GitHub, не синтетичні заяви PASS.
- Перевірений після merge поточний GitHub `main` дорівнює наведеному SHA, а два нові файли/зміни присутні на зазначених Git blobs. Без незлитих необхідних PR для цієї підфункції.

## Завершення та заборона повторного розроблення

**РОЗДІЛ SA-EXT-05 / ПІДФУНКЦІЯ CANONICAL_CITED_VERSE_RANGE_SEARCH — ЗАКРИТО.** `remaining_scoped_implementation=0`; `necessary_unmerged_feature_PRs=0`; `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`. Не переписувати знову без нової вимоги або конкретного відтворюваного дефекту.

**Не оголошено завершеними:** весь SA-EXT-05, усі SA-EXT-01…20, website release, справжній Sites installed SHA, live D1/Chrome/NVDA/Windows та права на зовнішні історичні матеріали. Ця зміна не встановлювала реліз, не надсилала листів, не створювала користувачів чи платежів, не запускала 82 мови. Координація: [#78](https://github.com/Oleksii-debug/scripture-archive/issues/78), [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297).
