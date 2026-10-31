# SA-EXT-01 / SHARED_PRIMARY_PARALLEL_RIGHTS_BOUNDS — вузький підпункт закрито (2026-10-31)

**РІШЕННЯ: `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` лише для єдиного обмеження типів і розмірів ліцензійних метаданих в основній та паралельній читальнях. Повний SA-EXT-01 — OPEN.**

## Відтворена проблема

`public/parallel-reader.js` уже не допускав заголовків понад 512 символів, описів ліцензії/атрибуції понад 4096, надмірних provenance URI або атрибуції з некоректним типом. Канонічна основна читальня `public/app.js::localEditionMetadata` вимагала назву, ліцензію та безпечні URL, але **не обмежувала розміри цих значень** й пропускала об'єкти/масиви замість атрибуції до HTML та буфера цитування. Це могла бути втрата коректності авторства й надмірне виділення пам'яті на зіпсованому каталозі.

## Реалізація в основній платформі

- Єдиний `validEditionRightsMetadata` експортується з чинного `public/parallel-reader.js`, повторно використовується `public/app.js` і зберігає вже прийняті межі паралельного читача.
- Основна читальня відхиляє неправдиві типи й непомірні заголовки, назви ліцензій, attribution, source/license URI **до** створення DOM і citation data. Вже валідні тексти, URL-посилання, metadata attribution, uk/ru/en, identity mapping та provenance не змінені.
- Паралельна читальня зберегла власні guard перевірки й викликала той самий валідатор замість дублювання правил.
- Немає другого сховища прав, окремого API, прихованої функції, міграції бази, придуманих перекладів або зміни реальних авторських ліцензій.

## Незаперечні GitHub і тестові докази

- Функціональний [PR #855](https://github.com/Oleksii-debug/scripture-archive/pull/855) **SQUASH MERGED** у **`main@f8b3cdd029b0ff74f4975a898d57a9d92640e003`**; GitHub повернув `merged=true`, main/PR SHA і `compare(main,main)=identical`.
- Перечитані exact source/test blobs із merge SHA: `public/app.js@952a0dbf10464951d3509bf9d0acba3d71cf5c19`; `public/parallel-reader.js@6546ea3ef9da0e620fb897cbba81a8abc429cf61`; `tests/reader-primary-provenance.test.mjs@30d0c108db1e4bf58bea4f5ee697a1c41ae4cfb8`.
- Додатково незалежно виконано **39/39 source-executed V8** перевірок з обмеженим mock URL parser: 15 надмірних metadata field/locale комбінацій; 18 typed attribution; 3 граничні валідні; 3 канонічні видання. Попередній main приймав 33 проблемні варіанти, оновлений відмовляє. Це допоміжна перевірка, не замінник нативного Node.
- [Exact-head GitHub Actions #41170269116](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41170269116) `COMPLETED SUCCESS` для `5b74e59196b0d78cbd6e22308351131b67cd21d4`: **2528 native Node PASS, 0 FAIL, 1 SKIP**; **22/22 disposable Worker/D1 PASS**, TypeScript, lint, source build PASS, Python **2 PASS**.
- Саме для цього вузького approval scope: `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. Повторна доробка — тільки за новим конкретним дефектом чи вимогою.

## Не завершено й не заявлено

**Повний SA-EXT-01**: всі ліцензійні переклади/права, правовласницька і редакційна перевірка, решта функцій видань; live `scripture-archive.com`/Cloudflare Sites exact deployed SHA, браузерний E2E, фізичний Windows/NVDA і загальний реліз — **OPEN / NOT_VERIFIED**. Жодного production deploy, D1 міграції, синтетичних акаунтів, розсилок, нових мов чи платежів. Координація: [issue #297](https://github.com/Oleksii-debug/scripture-archive/issues/297).
