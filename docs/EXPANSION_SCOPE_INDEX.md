## 2026-11-03 — SA-EXT-07 / ACADEMY_RESET_STALE_WEBLOCK_RECORD — scoped source terminal

**Завершено лише захист від застарілого підтвердження очищення Академії під час очікування Web Lock, НЕ батьківський SA-EXT-07.** Якщо інша вкладка зберегла нові позначки після натискання «очистити», старий запланований reset раніше міг їх видалити. Тепер наявний обробник зчитує точні байти запису під час підтвердження і звіряє їх **під тим самим ексклюзивним Web Lock** безпосередньо перед видаленням. За розбіжності або неможливості початкового читання — відмова без видалення й без неправдивого успіху; підтвердження залишається, щоб користувач міг повторити дію свідомо.

[PR #1245](https://github.com/Oleksii-debug/scripture-archive/pull/1245) **SQUASH MERGED** `main@01a24dbc51ac9e9ecd73a8075da7e13d09fd9c26`, exact qualified head `8b9861f6197e03f126081bd9b375ccc5aa1b5448`; [exact-head CI #41548270079](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41548270079) **SUCCESS**: 4553 native Node PASS / 1 SKIP / 0 FAIL; 37/37 disposable Worker/D1 PASS; 2/2 Python PASS; TypeScript, lint, build PASS (13 lint warnings, 0 errors). [Акт](roadmap/SA_EXT_07_ACADEMY_RESET_STALE_WEBLOCK_RECORD_SCOPED_TERMINAL_20261103.md).

`remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0` **тільки для цього race**. **SA-EXT-01/02/05/06/07 parent OPEN; 03/04 source-terminal.** Повний локальний checkout, незалежні права/редакція, фізичний Windows/Chrome/NVDA, live Sites/D1/backup/release **NOT_VERIFIED**. Без production, 82 мов, платежів, synthetic users, масової пошти, dating чи секретів.

---

## 2026-11-02 — SA-EXT-07 / ACADEMY_RESET_WEBLOCK_SINGLE_FLIGHT — scoped terminal

**Завершено лише одноразовість підтвердженого reset локальних позначок Академії під час очікування Web Lock, не весь SA-EXT-07.** Повторні активації більше не ставлять друге видалення в чергу; після відмови Web Lock можна повторити дію. [PR #1242](https://github.com/Oleksii-debug/scripture-archive/pull/1242) SQUASH MERGED `main@6e010d8db2c388126ef8e60621d745cbc483c1d9`; [CI #41539838856](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41539838856) SUCCESS: 4539 Node PASS/1 SKIP, 37/37 Worker/D1, 2/2 Python, TS/lint/build. [Акт](roadmap/SA_EXT_07_ACADEMY_RESET_WEBLOCK_SINGLE_FLIGHT_SCOPED_TERMINAL_20261102.md). `remaining_scoped_implementation=0` тільки для цієї межі; SA-EXT-01/02/05/06/07 OPEN, 03/04 source-terminal. Права, NVDA, production Sites/D1 і реліз NOT_VERIFIED; заборонених запусків немає.

---

## 2026-11-02 — SA-EXT-06 / ATLAS_EMPTY_SEARCH_RECOVERY — scoped terminal

**Підфункція порожнього GET-пошуку текстового атласу закрита в source, не весь SA-EXT-06.** [PR #1239](https://github.com/Oleksii-debug/scripture-archive/pull/1239) SQUASH MERGED `main@5ef2e8c65c5a1f82bbaf1fa51878891829514ac6`; [exact-head CI #41531517417](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41531517417) SUCCESS (4531 Node PASS/1 SKIP, 37/37 Worker/D1, 2/2 Python, TS/lint/build). Порожній атлас має правильний заголовок і локалізоване очищення GET-фільтра uk/ru/en, без чужих джерел. [Акт](roadmap/SA_EXT_06_ATLAS_EMPTY_SEARCH_RECOVERY_SCOPED_TERMINAL_20261102.md). **Батьківські SA-EXT-01/02/05/06/07 OPEN; 03/04 source-terminal**. Live/physical/editorial/rights/release NOT_VERIFIED; production/deploy/82 мов/платежі/розсилки/dating не запускалися.

---

## 2026-11-02 — SA-EXT-07 / ACADEMY_LESSON_WEBLOCK_SINGLE_FLIGHT — scoped source terminal

**Завершено лише захист від повторного натискання кнопки заняття Академії під час очікування Web Lock, НЕ весь SA-EXT-07.** Подвійна активація могла поставити дві операції в чергу й одразу скасувати першу позначку. Тепер чинний обробник має per-button single-flight, тимчасово вимикає кнопку, відновлює її після успіху/відмови, повертає клавіатурний фокус лише для актуального екрана без перехоплення фокусу. [RED CI #41522496510](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41522496510): 4522 Node PASS / 1 очікуваний FAIL / 1 SKIP. [PR #1236](https://github.com/Oleksii-debug/scripture-archive/pull/1236) **SQUASH MERGED** `main@533a17a19120c9e2802cd426d94f7e481fe21738`; [exact-head green CI #41522807785](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41522807785): 4523 Node PASS / 1 SKIP / 0 FAIL, 37/37 disposable Worker/D1 PASS, 2/2 Python PASS, TS/lint/build PASS (13 warnings, 0 errors). [Акт](roadmap/SA_EXT_07_ACADEMY_LESSON_WEBLOCK_SINGLE_FLIGHT_SCOPED_TERMINAL_20261102.md).

`remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0` **лише для цієї підфункції**. **SA-EXT-01/02/05/06/07 parent OPEN; 03/04 source-terminal.** Ширші курси/медіа/редакція, незалежні права, фізичний Windows/Chrome/NVDA, live Sites/D1/backup/release **NOT_VERIFIED**. Без повного локального checkout, без production, 82 мов, платежів, synthetic users, масової пошти, dating чи секретів.

---

## 2026-11-02 — SA-EXT-07 / ACADEMY_CATALOG_ARRAY_METHOD_ACCESSORS — scoped source terminal

**Завершено лише відмову від виклику publisher-controlled `map` getter у читальному каталозі Академії, НЕ SA-EXT-07 parent.** У чинному `academyMarkup` замінено виклик методу масиву на native `Array.prototype.map.call`, узгоджений із допуском досьє. [RED CI #41513854753](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41513854753): 4508 Node PASS / 1 очікуваний FAIL / 1 SKIP, підтверджений виклик getter. [PR #1233](https://github.com/Oleksii-debug/scripture-archive/pull/1233) **SQUASH MERGED** `main@ff85eba2b6f7795b3d8c467bf118f40e3c7739e1`; [exact-head green CI #41514089177](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41514089177): 4509 Node PASS / 1 SKIP / 0 FAIL, 37/37 disposable Worker/D1 PASS, 2/2 Python PASS, TS/lint/build PASS. [Акт](roadmap/SA_EXT_07_ACADEMY_CATALOG_ARRAY_METHOD_ACCESSORS_SCOPED_TERMINAL_20261102.md). `remaining_scoped_implementation=0` тільки тут; **SA-EXT-01/02/05/06/07 OPEN**, 03/04 source-terminal. Права/редакція, повні курси/медіа, фізичний NVDA, live Sites/D1/backup/release NOT_VERIFIED; без production, 82 мов, платежів, synthetic users, масової пошти, dating чи секретів.

---

## 2026-11-02 — SA-EXT-07 / ACADEMY_PERSISTED_ENVELOPE_INTEGRITY — scoped source terminal

**Завершено лише точний локальний v1 JSON envelope Академії, НЕ SA-EXT-07 parent.** Відхилення зайвих полів `accountId/accessToken/updatedAt/__proto__/format` до показу приватного прогресу, без перезапису локальних байтів. Існуючий доступний read-only стан, uk/ru/en alert, публічні reader links і коректні guest/account записи збережено. [PR #1230](https://github.com/Oleksii-debug/scripture-archive/pull/1230) **MERGED** `main@97180ce88535800cae36870a74bbdbe36a7ff8c3`; [exact-head CI #41503945400](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41503945400) **SUCCESS**: 4506 Node PASS / 1 SKIP, 37 Worker/D1 PASS, 2 Python PASS, TS/lint/build PASS. [Акт](roadmap/SA_EXT_07_ACADEMY_PERSISTED_ENVELOPE_SCOPED_TERMINAL_20261102.md). `remaining_scoped_implementation=0` лише тут; **SA-EXT-01/02/05/06/07 OPEN**, 03/04 source-terminal. Курси/медіа/права/редакція, реальний NVDA, live Sites/D1/backup/release NOT_VERIFIED; без заборонених запусків.

---

## 2026-11-02 — SA-EXT-05 / BMP_VARIATION_SELECTOR_GET_ADMISSION — scoped source terminal

**Закрито тільки відмову для невидимих BMP variation selectors U+FE00–U+FE0F у GET-пошуку досьє/атласу, НЕ батьківський розділ.** Раніше `validDossierSearchQuery` відхиляв supplementary U+E0100–U+E01EF, але пропускав BMP; прихований символ у `q` міг бути прийнятий і відображений у формі. Тепер чинний валідатор відхиляє обидва діапазони до HTML; локалізоване `role="alert"` без form/reader/dossier links. Негативні перевірки: 16 символів × uk/ru/en, обидва UI; позитивні `GEN 12` і порожній GET збережено.

[PR #1227](https://github.com/Oleksii-debug/scripture-archive/pull/1227) **SQUASH MERGED** `main@aa585400ce42b5cfbc8ecccbb3b154c3fead006c`, qualified head `161124a9dbd0710ded555990e7de26d8e75b99d7`; [exact-head CI #41494540928](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41494540928) **SUCCESS**: 4499 native Node PASS / 1 SKIP / 0 FAIL; 37/37 disposable Worker/D1 PASS; 2/2 Python PASS; TypeScript/lint/build PASS (13 warnings, 0 errors). Test-only CI #41494387921 **CANCELLED**, не RED PASS/FAIL. [Акт](roadmap/SA_EXT_05_BMP_VARIATION_SELECTOR_GET_ADMISSION_SCOPED_TERMINAL_20261102.md).

`remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0` **лише для цієї підфункції**. **SA-EXT-01/02/05/06/07 parent OPEN; 03/04 source-terminal.** Незалежні видавничі права/редакція, фізичний Windows/Chrome/NVDA, live Sites/D1/backup/release **NOT_VERIFIED**. Жодного production, 82 мов, платежів, synthetic users, масової пошти, dating чи секретів.

---

## 2026-11-02 — SA-EXT-01/05 / DOSSIER_PUBLISHER_RIGHTS_ADMISSION_PARITY — scoped source terminal

**Закрито тільки узгодження видавничих прав досьє/атласу з чинним допуском основної читальні, НЕ батьківські розділи.** Раніше досьє могло створити джерельне посилання для edition з відсутньою/порожньою ліцензією, небезпечним source URL, невидимим/надмірним title або accessor-backed rights, які читальня відхиляє. Тепер спільний `validateDossierGraph` повторно використовує канонічні `validEditionRightsMetadata` і `validEditionRightsText`; ID обмежений, без пробілів. Негативні перевірки: 3 мови × 8 дефектів, обидва UI `role="alert"` без reader links, throwing getter не виконується; чинні джерела збережено.

[Код і тести PR #1224](https://github.com/Oleksii-debug/scripture-archive/pull/1224) **SQUASH MERGED** `main@3d6358a7bbaeadd98c9264ea35cf13c963e0821e`, exact head `884dd3a666bdc3d14701fb1a94b4be5ff05fd0cf`; [exact-head CI #41485528737](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41485528737) **SUCCESS**: 4488 Node PASS / 1 SKIP / 0 FAIL; 37/37 disposable Worker/D1 PASS; 2/2 Python PASS; TS/lint/build PASS (13 lint warnings, 0 errors). [Акт](roadmap/SA_EXT_01_05_DOSSIER_PUBLISHER_RIGHTS_PARITY_SCOPED_TERMINAL_20261102.md).

`remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0` **лише для цього дефекту**. **SA-EXT-01/02/05/06/07 parent OPEN; 03/04 source-terminal.** Незалежні права/редакція, фізичний Windows/Chrome/NVDA, live Sites/D1/backup/release **NOT_VERIFIED**. Без production, 82 мов, платежів, synthetic users, масової пошти, dating чи секретів.

---

## 2026-11-02 — SA-EXT-05 / SUPPLEMENTARY_VARIATION_SELECTOR_SOURCE_LABELS — scoped source terminal

**Лише невидимі Unicode variation selectors U+E0100–U+E01EF у досьє, атласі та GET-пошуку виправлено; батьківський розділ НЕ закрито.** Чинний валідатор відхиляв U+FE00–U+FE0F, але пропускав supplementary Mn у видавничих назвах книг, досьє й ARIA-цитатах. Обидва наявні допуски `safeVisibleText` та `validDossierSearchQuery` тепер відхиляють цей діапазон до створення джерельних посилань, з локалізованим `role="alert"` та без reader links. [PR #1222](https://github.com/Oleksii-debug/scripture-archive/pull/1222) **SQUASH MERGED** `main@77f0be6903fbd5e723e688fe559cbcc5c8bb84f0` (exact head `42352eeb824012910e8b73f04f9cbbb17331d9c2`); [CI #41475148169](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41475148169) **SUCCESS**: 4487 Node PASS / 1 SKIP / 0 FAIL; 37/37 disposable Worker/D1 PASS; 2/2 Python PASS; TS/lint/build PASS (13 warnings, 0 errors). [Акт](roadmap/SA_EXT_05_SUPPLEMENTARY_VARIATION_SELECTORS_SCOPED_TERMINAL_20261102.md).

`remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0` **тільки для цього дефекту**. **SA-EXT-01/02/05/06/07 parent OPEN; 03/04 source-terminal.** Незалежні права/редакція, фізичний Windows/Chrome/NVDA, live Sites/D1/backup/release **NOT_VERIFIED**. Без production, 82 мов, платежів, synthetic users, масової пошти, dating чи секретів.

---

## 2026-11-02 — SA-EXT-05 / VARIATION_SELECTOR_SOURCE_LABELS — scoped source terminal

**Закрито лише захист джерельних назв і досьє від невидимих Unicode variation selectors U+FE00–U+FE0F, НЕ батьківський розділ.** Наявний `safeVisibleText` пропускав ці `Mn` символи (не `Cf`), тому назви книг та ARIA-цитати могли бути візуально неоднозначними. Спільний валідатор досьє/атласу тепер відмовляє до створення посилань, з локалізованим `role="alert"`; 24 нові негативні регресії для uk/ru/en, чинний каталог збережено. [PR #1219](https://github.com/Oleksii-debug/scripture-archive/pull/1219) **SQUASH MERGED** `main@394113d62473104033c2574d17bcc43f6f44916e`, exact head `0e7ab56b2df2cf7814bf1a883fd731c97aaa79c7`; [exact-head CI #41465782558](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41465782558) **SUCCESS**: 4461 Node PASS / 1 SKIP / 0 FAIL, 37/37 disposable Worker/D1 PASS, 2/2 Python PASS, TS/lint/build PASS. Test-only CI #41465632637 був **CANCELLED**, не RED PASS/FAIL. [Акт](roadmap/SA_EXT_05_VARIATION_SELECTOR_SOURCE_LABELS_SCOPED_TERMINAL_20261102.md).

`remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0` **лише тут**. **SA-EXT-01/02/05/06/07 parent OPEN, 03/04 source-terminal.** Права/редакція, фізичний Windows/Chrome/NVDA, live Sites/D1/backup/release **NOT_VERIFIED**. Без production, 82 мов, платежів, synthetic users, масової пошти, dating і секретів.

---

## 2026-11-02 — SA-EXT-01/05 / DOSSIER_READER_CATALOG_ADMISSION_PARITY — scoped source terminal

**Закрито тільки невідповідність допуску каталогу між чинними досьє/атласом і основною читальнею, НЕ батьківські розділи.** Досьє раніше могло створювати посилання й ARIA-цитати за пошкодженого schema/edition ID, неповного або переставленого 66-книжного каталогу, хибного OT/NT чи пошкодженого альтернативного видання, хоча читальня відхиляла такий каталог. Спільний `validateDossierGraph` тепер відмовляє до HTML із локалізованим `role="alert"`, без `/reader/` посилань; власні null-prototype дані й нормальні каталоги збережено. Статичний канонічний список кодів залишається лише в читальні; **повної еквівалентності не заявлено**.

[Код і чотири тестовані файли PR #1215](https://github.com/Oleksii-debug/scripture-archive/pull/1215) **SQUASH MERGED** `main@8961f7a1f04dda6859c5b061897d6b7f9fcda803`, exact head `bd8221ff083a3fef6485282f5d9ab4ff748a342b`; [exact-head CI #41447503899](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41447503899) **SUCCESS**: 4435 Node PASS / 1 SKIP / 0 FAIL, 37/37 disposable Worker/D1 PASS, 2/2 Python PASS, TS/lint/build PASS (13 lint warnings, 0 errors). Початковий CI #41447345336 FAIL на двох позитивних null-prototype fixtures без потрібного envelope; їх виправлено без послаблення захисту. [Акт](roadmap/SA_EXT_01_05_DOSSIER_READER_CATALOG_PARITY_SCOPED_TERMINAL_20261102.md).

`remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0` **тільки для цієї межі**. **SA-EXT-01/02/05/06/07 parent OPEN; 03/04 source-terminal.** Права/редакція, фізичний Windows/Chrome/NVDA, live Sites/D1/backup/release **NOT_VERIFIED**. Без production, 82 мов, платежів, synthetic users, масової пошти, dating чи секретів.

---

## 2026-11-02 — SA-EXT-05/06 / BOUNDED_PUBLISHER_BOOK_TITLES — scoped source terminal

**Закрито тільки межу довжини видавничих назв біблійних книг у чинних досьє й атласі, НЕ батьківські розділи.** `validateDossierGraph` раніше приймав необмежено довгі непорожні назви, які повторювалися в видимих посиланнях та ARIA-мітках. Тепер назви понад 120 UTF-16 одиниць відхиляються до сканування й відображення; обидва UI показують `role="alert"` без оманливих reader links. Негативні 121/4096 для uk/ru/en, позитивна межа 120 та незмінний справжній каталог. [Код і тести PR #1212](https://github.com/Oleksii-debug/scripture-archive/pull/1212) **SQUASH MERGED** `main@54dc8c8429fb28ac1814a3065c49dcf86a8acde5`, exact head `691a11bc4ffc66412ba84b563e119d3687411cd7`; [exact-head CI #41439301249](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41439301249) **SUCCESS**: 4431 Node PASS / 1 SKIP / 0 FAIL, 37/37 disposable Worker/D1 PASS, 2/2 Python PASS, TS/lint/build PASS (13 warnings, 0 errors). Початковий CI #41438978978 FAIL через синтаксис нового тесту; виправлено до green CI. [Акт](roadmap/SA_EXT_05_06_BOUNDED_PUBLISHER_BOOK_TITLES_SCOPED_TERMINAL_20261102.md).

`remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0` **лише для цієї межі**. SA-EXT-01/02/05/06/07 parent **OPEN**, 03/04 source-terminal. Rights/editorial, фізичний Windows/Chrome/NVDA, live Sites/D1/backup/release **NOT_VERIFIED**. Без production, 82 мов, платежів, synthetic users, масової пошти чи dating.

---

## 2026-11-02 — SA-EXT-05/06 / VISIBLE_BOOK_TITLE_IDENTITY — scoped terminal

**Закрито тільки захист видимих назв біблійних книг від колізій у досьє/атласі, НЕ батьківські розділи.** [Код і тести PR #1209](https://github.com/Oleksii-debug/scripture-archive/pull/1209) **MERGED** `main@677d7b554b14963219a0db73a35d0d080b6b65f7`; [exact-head CI #41431911488](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41431911488) **SUCCESS**: 4429 Node PASS / 1 SKIP / 0 FAIL, 37 Worker/D1 PASS, 2 Python PASS, TS/lint/build PASS. Дев'ять негативних exact/case/NFC колізій uk/ru/en, `role="alert"`, без оманливих reader links, позитивне відновлення. [Акт](roadmap/SA_EXT_05_06_VISIBLE_BOOK_TITLE_IDENTITY_SCOPED_TERMINAL_20261102.md). `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0` лише тут; **SA-EXT-01/02/05/06/07 parent OPEN, 03/04 source-terminal**. Rights/editorial, фізичний Windows/Chrome/NVDA, Sites/D1/backup/release NOT_VERIFIED. Без production, 82 мов, платежів, synthetic users, масової пошти чи dating.

---

## 2026-11-02 — SA-EXT-05/06 / DOSSIER_ARRAY_METHOD_ACCESSORS — scoped source terminal

**Лише захист від getter-backed `keys/some/map` масивів каталогу, НЕ батьківські SA-EXT-05/06.** [Код/18 регресій PR #1206](https://github.com/Oleksii-debug/scripture-archive/pull/1206) **SQUASH MERGED** `main@14d4f3ae2e4a929d5fd93989292aae678168b57b`; [CI #41423525121](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41423525121) **SUCCESS**: 4427 Node PASS, 1 SKIP, 37 Worker/D1, 2 Python, TS/lint/build. [Акт](roadmap/SA_EXT_05_06_DOSSIER_ARRAY_METHOD_ACCESSORS_SCOPED_TERMINAL_20261102.md). `remaining_scoped_implementation=0` тільки тут; SA-EXT-01/02/05/06/07 OPEN, 03/04 source-terminal. Права/редакція, реальний браузер/NVDA, live Sites/D1/release NOT_VERIFIED; без заборонених запусків.

---

## 2026-11-02 — SA-EXT-05/06 / DOSSIER_SOURCE_LABEL_UNICODE_ZS — scoped source terminal

**Закрито тільки захист видавничих назв книг від неоднозначних Unicode Zs пробілів у спільному досьє/атласі, НЕ батьківські SA-EXT-05/06.** Раніше канонічний GET-пошук відхиляв 15 non-ASCII Zs separators, але `validateDossierGraph` допускав їх у назвах біблійних книг, які потрапляють до видимих посилань і доступних ARIA-підписів. Тепер ті самі 15 символів відхиляються до формування джерельних посилань, без нової бази чи сервісу. Регресія: 15 Unicode кодів × uk/ru/en, обидва чинні UI (досьє й текстовий атлас), `role="alert"`, жодного `/reader/` посилання при пошкодженому каталозі; нормальний каталог збережено.

[Код і тести PR #1203](https://github.com/Oleksii-debug/scripture-archive/pull/1203) **SQUASH MERGED** `main@e503cff684e63db204b57a9f1387b6ebd9d16c6c` (exact PR head `ec7fc9c0c7cbb967f8c52608effc9299c2f4e1e5`); [exact-head CI #41416028380](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41416028380) **SUCCESS**: 4425 Node PASS / 1 SKIP / 0 FAIL, 37/37 disposable Worker/D1 PASS, 2/2 Python PASS, TypeScript/lint/build PASS (13 warnings, 0 errors). Source blob `b5e4de3fcb953111cad03c5a28c652fceb8a593e`, test blob `ed2e63cfe7e720f51d0d8fb3777bf2ae5540e96d`. [Акт](roadmap/SA_EXT_05_06_DOSSIER_SOURCE_LABEL_UNICODE_ZS_SCOPED_TERMINAL_20261102.md)

`remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0` **лише для цього Unicode source-label boundary**. SA-EXT-01/02/05/06/07 parent **OPEN**, 03/04 source-terminal. Видавничі права/редакція, фізичний Windows/Chrome/NVDA, production Sites/D1/backup/release **NOT_VERIFIED**. Без 82-мовного запуску, production міграції, нового релізу, платежів, synthetic users, масової пошти чи dating.

---

## 2026-11-02 — SA-EXT-01 / PARALLEL_NO_LOCAL_OPTIONS — scoped source closure

**Лише доступний порожній стан паралельної читальні закрито, НЕ батьківський SA-EXT-01.** Коли всі записи другого видання відхилено чинними правилами local/ID/getter, інтерфейс більше не показує активні порожній список і кнопку: native select/submit disabled, видиме `role="status"` українською, російською й англійською пояснює відсутність доступного локального видання. Для чинних локальних видань клавіатурне порівняння збережено. [Код+регресії PR #1201](https://github.com/Oleksii-debug/scripture-archive/pull/1201) **SQUASH MERGED** `main@7dbe033245727bbc8b776d8aa37ec73c52bd1c9e`, exact head `db1ea31f4264097f0e929667740adf67624860b7`. Початковий [CI #41409669695](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41409669695) **FAIL** на трьох застарілих assertions для порожнього select; тести узгоджено без послаблення відмови. [Фінальний exact-head CI #41409817655](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41409817655) **SUCCESS**: 4424 Node PASS / 1 SKIP / 0 FAIL, 37/37 disposable Worker/D1 PASS, 2/2 Python PASS, TS/lint/build PASS (13 lint warnings, 0 errors). [Post-merge CI #41410054896](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41410054896) **SUCCESS** на `main@7dbe033245727bbc8b776d8aa37ec73c52bd1c9e` з тими самими 4424/37/2 PASS і TS/lint/build. [Акт](roadmap/SA_EXT_01_PARALLEL_NO_LOCAL_OPTIONS_SCOPED_TERMINAL_20261102.md). `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0` **лише для цієї підфункції**. SA-EXT-01/02/05/06/07 parent OPEN, 03/04 source-terminal. Права/редакція, реальний Chrome/Windows/NVDA, live Sites/D1/backup/release NOT_VERIFIED; draft #325 не змінено, заборонених запусків немає.

---

## 2026-11-02 — SA-EXT-01 / PARALLEL_LOCAL_OPTION_ADMISSION — scoped source terminal

**Тільки узгодження видимих опцій паралельного читача з наявним локальним допуском закрито.** [PR #1197](https://github.com/Oleksii-debug/scripture-archive/pull/1197) **SQUASH MERGED** `main@a3cb39de917635a3aa38a562648baf861864de22`; [CI #41402124309](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41402124309) **SUCCESS**: 4419 Node PASS, 1 SKIP, 37 Worker/D1, 2 Python, TS/lint/build. [Акт](roadmap/SA_EXT_01_PARALLEL_LOCAL_OPTION_ADMISSION_SCOPED_TERMINAL_20261102.md). Non-local/unsafe edition choices hidden, submit unchanged. **SA-EXT-01/02/05/06/07 parent OPEN**, 03/04 source-terminal. Real rights/editorial, browser/NVDA, Sites/D1 and release NOT_VERIFIED; no production/82 languages/payments/synthetic users/mass mail/dating.

---

## 2026-11-02 — SA-EXT-01 / PARALLEL_SILENT_SUBMIT_REJECTION_ANNOUNCEMENT — scoped terminal

**Закрито лише доступне повідомлення про програмну зміну видання після відмови асинхронного порівняння, НЕ батьківський SA-EXT-01.** У чинній паралельній читальні відмова першого chapter guard, `getBook` або фінального guard після зміни вибору без native `change` більше не залишає в `role="status"` нескінченне «Завантаження»: користувач отримує локалізоване повідомлення, кнопка повторної спроби доступна, старі вірші не показуються; незмінний вибір зберігає fail-closed. [Код і 5 груп регресій — PR #1194](https://github.com/Oleksii-debug/scripture-archive/pull/1194) **SQUASH MERGED** `main@b59ba95e8f10755da99c6d4015657fa6e51c236e`; [exact-head CI #41395754824](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41395754824) **SUCCESS**: 4414 Node PASS / 1 SKIP / 0 FAIL, 37/37 disposable Worker/D1 PASS, 2/2 Python PASS, TypeScript/lint/build PASS (13 warnings, 0 errors). [Акт](roadmap/SA_EXT_01_PARALLEL_SILENT_SUBMIT_REJECTION_SCOPED_TERMINAL_20261102.md). `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0` **лише для цієї підфункції**. SA-EXT-01/02/05/06/07 OPEN; 03/04 source-terminal. Видавничі права/редакція, фізичний Windows/Chrome/NVDA, live Sites/D1/backup/release NOT_VERIFIED. Draft #325 не змінено; без production, 82 мов, платежів, synthetic users, масової пошти або dating.

---

## 2026-11-02 — SA-EXT-01 / PARALLEL_SILENT_CITATION_SELECTION — scoped terminal

**Завершено лише відмову від застарілої цитати після програмної зміни другого видання без native `change`, НЕ весь SA-EXT-01.** Чинна паралельна читальня очищає старі вірші/цитату й доступно повідомляє про зміну до або після асинхронної перевірки глави; копіювання старої цитати заблоковано, звичайне цитування збережено. [Код і тести PR #1189](https://github.com/Oleksii-debug/scripture-archive/pull/1189) **SQUASH MERGED** `main@5d915578fda82f869eb22b411fbb4ed8f2eb3254`; [exact-head CI #41390127054](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41390127054) **SUCCESS**: 4402 native Node PASS / 1 SKIP / 0 FAIL, 37/37 disposable Worker/D1 PASS, 2/2 Python PASS, TypeScript/lint/build PASS (13 lint warnings, 0 errors). [Акт](roadmap/SA_EXT_01_PARALLEL_SILENT_CITATION_SELECTION_SCOPED_TERMINAL_20261102.md). `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0` **тільки тут**; SA-EXT-01/02/05/06/07 OPEN, 03/04 source-terminal. Видавничі права/редакція, фізичний Windows/Chrome/NVDA, live Sites/D1/backup/release NOT_VERIFIED; заборонених запусків немає.

**Додаткова негативна гілка:** відхилення асинхронного citation guard після програмної зміни видання тепер також очищає старий текст; при незмінному виборі збережено fail-closed. [PR #1191](https://github.com/Oleksii-debug/scripture-archive/pull/1191) **SQUASH MERGED** `main@603b186c2ead1231343fd30dfc8c57fa3115ca36`; [exact-head CI #41390591726](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41390591726) **SUCCESS**: 4404 Node PASS / 1 SKIP / 0 FAIL, 37/37 disposable Worker/D1 PASS, 2/2 Python PASS, TypeScript/lint/build PASS (13 lint warnings, 0 errors). Батьківські розділи залишаються OPEN.

---

## 2026-11-02 — SA-EXT-01 / PARALLEL_RIGHTS_CITATION_LEASE — scoped terminal

**Лише перевірку актуальності ліцензії й джерела перед цитуванням завершено, не весь SA-EXT-01.** Чинна паралельна читальня не копіює застарілу атрибуцію після зміни map/record/rights, відмовляє getter без виконання та повідомляє про зміну; стабільні видання збережені. [Код+6 тестів PR #1186](https://github.com/Oleksii-debug/scripture-archive/pull/1186) **SQUASH MERGED** `main@d73bfa5f1095ab1b933713a1346c7f4e8fbea406`; [CI #41384826383](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41384826383) **SUCCESS**: 4395 Node PASS/1 SKIP, 37 Worker/D1 PASS, 2 Python PASS, TS/lint/build PASS. [Акт](roadmap/SA_EXT_01_PARALLEL_RIGHTS_CITATION_LEASE_SCOPED_TERMINAL_20261102.md). `remaining_scoped_implementation=0` тільки тут; SA-EXT-01/02/05/06/07 parent OPEN, 03/04 source-terminal. Rights/editorial, real browser/NVDA, live Sites/D1/backup/release NOT_VERIFIED; без production, 82 мов, платежів, synthetic users, масової пошти чи dating.

---

## 2026-11-02 — SA-EXT-01 / PARALLEL_EDITION_INFLIGHT_IDENTITY_LEASE — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**Закрито тільки перевірку незмінності видавничої ідентичності під час асинхронного завантаження/цитування, НЕ весь SA-EXT-01.** Зміна `folder/contentId/title` або підміна запису видання під час `check/getBook` більше не публікує старі вірші під іншою видавничою ідентичністю; цитата перевіряє той самий власний запис до й після guard, очищає застарілий текст і повідомляє про зміну. [Код і 6 регресійних тестів — PR #1183](https://github.com/Oleksii-debug/scripture-archive/pull/1183) **SQUASH MERGED** `main@d7013d1936aa52275e0d6de0488cf16842860e20`; [exact-head CI #41379339135](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41379339135) **SUCCESS**: 4380 native Node PASS / 1 SKIP / 0 FAIL, 37/37 disposable Worker/D1 PASS, 2/2 Python PASS, TypeScript/lint/build PASS (13 lint warnings, 0 errors). [Акт](roadmap/SA_EXT_01_PARALLEL_EDITION_INFLIGHT_LEASE_SCOPED_TERMINAL_20261102.md). `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0` **лише для цієї підфункції**. SA-EXT-01/02/05/06/07 parent OPEN, 03/04 source-terminal. Права/редакція, фізичний Chrome/Windows/NVDA, live Sites/D1/backup/release NOT_VERIFIED. Без production, 82 мов, платежів, synthetic users, масової пошти чи dating.

---

## 2026-11-02 — SA-EXT-01 / PARALLEL_VISIBLE_EDITION_IDENTITY — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**Закрито лише видимість та обмеження ідентичності видань у чинній паралельній читальні, НЕ весь SA-EXT-01.** Порожні, пробільні, Unicode bidi/zero-width та надмірно довгі ID більше не стають вибором видавничого джерела; небезпечні/порожні назви не показуються як оманливі опції. Недійсний програмний вибір до guard/getBook скидає попередній текст, а нормальні кириличні та null-prototype записи працюють. [Код і 5 груп тестів — PR #1180](https://github.com/Oleksii-debug/scripture-archive/pull/1180) **SQUASH MERGED** `main@49b5f822a75e0a8bd548478f47c5c3ad5e8cbfe2`; [exact-head CI #41373880047](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41373880047) **SUCCESS**: 4365 native Node PASS / 1 SKIP / 0 FAIL, 37/37 disposable Worker/D1 PASS, 2/2 Python PASS, TypeScript/lint/build PASS. [Акт](roadmap/SA_EXT_01_VISIBLE_EDITION_IDENTITY_SCOPED_TERMINAL_20261102.md). `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0` **лише для цієї підфункції**. Батьківські SA-EXT-01/02/05/06/07 OPEN, 03/04 source-terminal. Видавничі права/редакційне приймання, фізичний Windows/Chrome/NVDA, live Sites/D1/backup/release NOT_VERIFIED. Без production, 82 мов, платежів, synthetic users, масових розсилок чи dating.

---

## 2026-11-02 — SA-EXT-01 / PARALLEL_DUPLICATE_EDITION_IDENTITY — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**Закрито лише неоднозначність повторних ID видань у чинній паралельній читальні, НЕ весь SA-EXT-01.** Різні видання з однаковим `id` більше не утворюють оманливі опції та не вибирають перший випадковий файл/видавничі права; недійсний вибір очищає старий текст і цитату, а звичайні/null-prototype видання зберігаються. [Код і 6 груп тестів — PR #1177](https://github.com/Oleksii-debug/scripture-archive/pull/1177) **SQUASH MERGED** `main@854b3b2f78f5a2d23a152b31352ff59975966c81`; [exact-head CI #41369127756](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41369127756) **SUCCESS**: 4349 Node PASS / 1 SKIP / 0 FAIL, 37/37 disposable Worker/D1 PASS, 2/2 Python PASS, TypeScript/lint/build PASS. [Точний акт](roadmap/SA_EXT_01_PARALLEL_DUPLICATE_EDITION_ID_SCOPED_TERMINAL_20261102.md). `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0` **тільки для цієї підфункції**. Батьківські SA-EXT-01/02/05/06/07 OPEN, 03/04 source-terminal. Rights/editorial, real Chrome/Windows/NVDA, live Sites/D1/backup/release NOT_VERIFIED. Production, 82 мови, платежі, synthetic users, масова пошта, dating не запускалися.

---

## 2026-11-02 — SA-EXT-01 / EDITION_ARRAY_OWN_DATA_SLOTS — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**Закрито тільки власні data-descriptor слоти масиву видань у чинній паралельній читальні, НЕ весь SA-EXT-01.** Власні та успадковані getter-індекси масиву більше не виконуються під час формування списку видань або вибору локального файлу; попередній текст/цитата очищаються після невалідного програмного вибору, збережено звичайні/null-prototype записи та доступну повторну спробу. [Функціональний PR #1174](https://github.com/Oleksii-debug/scripture-archive/pull/1174) **SQUASH MERGED** `main@c6e590175aeb4d4cce4be3300ef216166a247b91`; [exact-head CI #41363808105](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41363808105) **COMPLETED SUCCESS**: 4333 Node PASS / 1 SKIP / 0 FAIL, 37/37 disposable Worker/D1 PASS, 2/2 Python PASS, TypeScript/lint/build PASS (13 lint warnings, 0 errors). [Акт](roadmap/SA_EXT_01_EDITION_ARRAY_OWN_DATA_SLOTS_SCOPED_TERMINAL_20261102.md). `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0` **лише тут**; SA-EXT-01/02/05/06/07 parent OPEN, 03/04 source-terminal. Rights/editorial, фізичний Windows/Chrome/NVDA, live Sites/D1/backup/release NOT_VERIFIED. Без production, 82 мов, платежів, synthetic users, масових розсилок чи dating.

---

## 2026-11-01 — SA-EXT-01 / PARALLEL_EDITION_OWN_DATA_SELECTION — scoped terminal

**Лише захист own-data локального edition selector завершено, НЕ SA-EXT-01.** Getter/inherited edition ID/local/folder/contentId більше не вибирають другий текст або права, getter option ID/title не виконуються; недійсний програмний вибір очищає старий текст і цитату з доступним retry. [PR #1171](https://github.com/Oleksii-debug/scripture-archive/pull/1171) **SQUASH MERGED** `main@6eacee08c591f8dbb26239db8e3d9c53380a15e0`; [CI #41358670256](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41358670256) **SUCCESS**: 4324 Node PASS/1 SKIP, 37 disposable Worker/D1 PASS, 2 Python PASS, TS/lint/build PASS. [Акт](roadmap/SA_EXT_01_PARALLEL_EDITION_OWN_DATA_SELECTION_SCOPED_TERMINAL_20261101.md). `remaining_scoped_implementation=0` лише тут; SA-EXT-01/02/05/06/07 OPEN, 03/04 source-terminal. Rights/editorial, physical NVDA, live Sites/D1/backup/release NOT_VERIFIED. Заборонених запусків немає.

---

## 2026-11-01 — SA-EXT-01 / PARALLEL_CHAPTER_CONTAINER_OWN_DATA — scoped terminal

**Закрито лише власні data descriptors `chapters` і chapter index у паралельній читальні, НЕ SA-EXT-01.** Getter/inherited chapter metadata не виконуються та не видаються за Scripture; uk/ru/en, права, два chapter guards і retry збережені. [PR #1167](https://github.com/Oleksii-debug/scripture-archive/pull/1167) **SQUASH MERGED** `main@940caf93bb4c243fc2eb6523ea020f21bd767e3d`; [exact-head CI #41348461287](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41348461287) **SUCCESS**: 4308 Node PASS/1 SKIP, 37 disposable Worker/D1 PASS, 2 Python PASS, TS/lint/build PASS. [Акт](roadmap/SA_EXT_01_PARALLEL_CHAPTER_CONTAINER_OWN_DATA_SCOPED_TERMINAL_20261101.md). `remaining_scoped_implementation=0` лише тут; SA-EXT-01/02/05/06/07 OPEN, 03/04 source-terminal. Rights/editorial, real NVDA, Sites/D1/backup/release NOT_VERIFIED. Без заборонених запусків.

---

## 2026-11-01 — SA-EXT-05/06 / DOSSIER_CATALOG_OWN_DATA_PROVENANCE — scoped terminal

**Закрито лише захист видавничого каталогу для чинних досьє та атласу, НЕ батьківські SA-EXT-05/06.** Getter-backed own metadata більше не авторизують source labels/reader links; збережено 3 мови, доступну відмову та справжній null-prototype каталог. [PR #1164](https://github.com/Oleksii-debug/scripture-archive/pull/1164) **SQUASH MERGED** `main@3e46e626f5ac81a71bf3760049f9148c935c3078`; [CI #41343483190](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41343483190) **SUCCESS**: 4298 Node PASS/1 SKIP, 37 disposable Worker/D1 PASS, 2 Python PASS, TS/lint/build PASS. [Акт](roadmap/SA_EXT_05_06_DOSSIER_CATALOG_ACCESSOR_SCOPED_TERMINAL_20261101.md). `remaining_scoped_implementation=0` лише тут; SA-EXT-01/02/05/06/07 OPEN, 03/04 source-terminal; права/редакція, real NVDA, live Sites/D1/backup/release NOT_VERIFIED. Без production, 82 мов, платежів, synthetic users, розсилок або dating.

---

## 2026-11-01 — SA-EXT-01 / PARALLEL_PROVENANCE_MAP_OWN_DATA — scoped terminal

**Закрито лише getter-backed права на рівні catalog map/entry, НЕ батьківський SA-EXT-01.** [PR #1161](https://github.com/Oleksii-debug/scripture-archive/pull/1161) **SQUASH MERGED** `main@dd7b6c8246f48793cce6c6e298eb124017d8b030`; [CI #41338544895](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41338544895) **SUCCESS**: 4293 Node PASS, 37 Worker/D1 PASS, 2 Python PASS, TS/lint/build PASS. [Акт](roadmap/SA_EXT_01_PARALLEL_PROVENANCE_MAP_DESCRIPTOR_SCOPED_TERMINAL_20261101.md). `remaining_scoped_implementation=0` лише тут; SA-EXT-01/02/05/06/07 OPEN, 03/04 source-terminal. Rights/editorial, physical NVDA, live Sites/D1/backup/release NOT_VERIFIED. Без production/82 мов/платежів/synthetic users/масової пошти/dating.

---

## 2026-11-01 — SA-EXT-01 / PARALLEL_EDITION_IDENTITY_OWN_DATA — scoped terminal

**Закрито тільки перевірку власного data-ID видавничого запису, НЕ SA-EXT-01.** Успадковані/accessor-backed ідентичності explicit translation і fallback більше не авторизують показ/цитування біблійного тексту. [PR #1158](https://github.com/Oleksii-debug/scripture-archive/pull/1158) **SQUASH MERGED** `main@d698c65e234c46a3537f74b1ee11b1c15d04055f`; [exact-head CI #41333342171](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41333342171) **SUCCESS**: 4285 Node PASS/1 SKIP, 37 Worker/D1 PASS, 2 Python PASS, TS/lint/build PASS. [Акт](roadmap/SA_EXT_01_PARALLEL_EDITION_IDENTITY_OWN_DATA_SCOPED_TERMINAL_20261101.md). `remaining_scoped_implementation=0` лише тут; SA-EXT-01/02/05/06/07 OPEN, 03/04 source-terminal; rights/editorial, physical NVDA, live Sites/D1/backup/release NOT_VERIFIED. Заборонених запусків немає.

---

## 2026-11-01 — SA-EXT-01 / PARALLEL_VERSE_OWN_DATA_SNAPSHOT — scoped terminal

**Закрито тільки перевірку власних незмінних рядків віршів для паралельного читача, НЕ SA-EXT-01.** Динамічні getter/inherited/sparse записи відхиляються до DOM/clipboard; звичайні видання, дві перевірки глави, доступне повідомлення й повторна спроба збережені. [PR #1155](https://github.com/Oleksii-debug/scripture-archive/pull/1155) **SQUASH MERGED** `main@f9909f664a72f88505896c517b2a46b00ca51062`; [CI #41327911606](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41327911606) **SUCCESS**: 4274 Node PASS/1 SKIP, 37 disposable Worker/D1 PASS, 2 Python PASS, TypeScript/lint/build PASS (13 warnings/0 errors). [Акт](roadmap/SA_EXT_01_PARALLEL_VERSE_DESCRIPTOR_SCOPED_TERMINAL_20261101.md). `remaining_scoped_implementation=0` лише тут; SA-EXT-01/02/05/06/07 OPEN, 03/04 source-terminal. Rights/editorial, physical NVDA, live Sites/D1/backup/release NOT_VERIFIED. Без production/82 мов/платежів/synthetic users/масової пошти/dating.

---

## 2026-11-01 — SA-EXT-01 / PARALLEL_RIGHTS_ACCESSOR_ADMISSION — scoped terminal

**Лише accessor-backed видавничі метадані закрито, НЕ SA-EXT-01.** Канонічний shared validator не викликає й не приймає own getter title/license/source/attribution/licenseUrl, тому неперевірена назва/ліцензія не змінює цитату після admission. [PR #1152](https://github.com/Oleksii-debug/scripture-archive/pull/1152) **SQUASH MERGED** `main@fdbe0c8943ac92e2bad87881fbf0d07034b040f1`; [CI #41323272614](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41323272614) **SUCCESS**: 4268 Node PASS/1 SKIP, 37 Worker/D1 PASS, 2 Python PASS, TS/lint/build. [Акт](roadmap/SA_EXT_01_PARALLEL_RIGHTS_ACCESSOR_SCOPED_TERMINAL_20261101.md). `remaining_scoped_implementation=0` тільки тут; SA-EXT-01/02/05/06/07 OPEN, 03/04 source-terminal. Права, редакція, real browser/NVDA, installed Sites/D1/backup/release NOT_VERIFIED. Без production/82 мов/платежів/synthetic users/масової пошти/dating.

---

## 2026-11-01 — SA-EXT-01 / CATALOG_PENDING_TRANSIENT_READER_LEASE — scoped terminal

**Лише цей дефект закрито.** Чинний primary reader скидає попередній transient `state.currentReader` до `getCatalog()` без втрати останньої закладки. [PR #1149](https://github.com/Oleksii-debug/scripture-archive/pull/1149) **SQUASH MERGED** `main@313eed6faaead2e728797e7e14280de207474071`; [CI #41318145607](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41318145607) **SUCCESS**: 4262 Node PASS/1 SKIP, 37 Worker/D1 PASS, 2 Python PASS, TS/lint/build. [Акт](roadmap/SA_EXT_01_READER_CATALOG_TRANSIENT_CONTEXT_SCOPED_TERMINAL_20261101.md). `remaining_scoped_implementation=0` тільки тут; SA-EXT-01/02/05/06/07 OPEN, 03/04 source-terminal; rights/editorial, Chrome/Windows/NVDA, installed Sites/D1/backup/release NOT_VERIFIED. Жодних production/82 мов/платежів/synthetic users/масової пошти/dating.

---

## 2026-11-01 — SA-EXT-01 / BOOK_FETCH_TRANSIENT_READER_CONTEXT — scoped terminal

**Лише цей дефект невдалого завантаження глави закрито.** [PR #1146](https://github.com/Oleksii-debug/scripture-archive/pull/1146) **MERGED** `main@143d63e29fcff9b1b4f235c0c1d1dda6be494c3a`; [CI #41313441739](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41313441739) **SUCCESS**: 4229 Node PASS/1 SKIP, 37 Worker/D1 PASS, 2 Python PASS, TS/lint/build. [Акт](roadmap/SA_EXT_01_BOOK_FETCH_TRANSIENT_READER_SCOPED_TERMINAL_20261101.md). `remaining_scoped_implementation=0` тільки тут; SA-EXT-01/02/05/06/07 OPEN, 03/04 source-terminal. Rights/editorial, browser/NVDA, installed Sites/D1/backup/release NOT_VERIFIED; без заборонених запусків.

---

## 2026-11-01 — SA-EXT-01 / PROVENANCE_TRANSIENT_READER_CONTEXT — scoped terminal

**Лише скидання transient reader при відмові видавничих прав закрито.** [PR #1144](https://github.com/Oleksii-debug/scripture-archive/pull/1144) **MERGED** `main@8f5ce7b8c482d6fe2509d6c6eaae6ce00fc343be`; [exact-head CI #41313075912](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41313075912) **SUCCESS**: 4229 Node PASS/1 SKIP, 37 Worker/D1 PASS, 2 Python PASS, TS/lint/build. [Акт](roadmap/SA_EXT_01_PROVENANCE_TRANSIENT_READER_SCOPED_TERMINAL_20261101.md). `remaining_scoped_implementation=0` тільки тут; SA-EXT-01/02/05/06/07 OPEN, 03/04 source-terminal. Rights/editorial, real browser/NVDA, installed Sites/D1/backup/release NOT_VERIFIED; без заборонених запусків.

---

## 2026-11-01 — SA-EXT-01 / READER_BOOKMARK_AFTER_PROVENANCE — scoped terminal

**Лише цей дефект закладки закрито.** Невалідна назва/ліцензія видання більше не перезаписує останню читабельну главу до показу помилки. [PR #1141](https://github.com/Oleksii-debug/scripture-archive/pull/1141) **MERGED** `main@06783acdcf663cc96e68ccd38bba50c031b5b4f3`; [CI #41308355856](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41308355856) **SUCCESS**: 4221 Node PASS/1 SKIP, 37 Worker/D1 PASS, 2 Python PASS, TS/lint/build. [Акт](roadmap/SA_EXT_01_READER_BOOKMARK_AFTER_PROVENANCE_SCOPED_TERMINAL_20261101.md). `remaining_scoped_implementation=0` тільки тут; SA-EXT-01/02/05/06/07 OPEN, 03/04 source-terminal; права/редакція, браузер/NVDA, live Sites/D1/backup/release NOT_VERIFIED. Без заборонених запусків.

---

## 2026-11-01 — SA-EXT-01 / PRIMARY_RIGHTS_MAP_OWNERSHIP — scoped terminal

**Лише захист успадкованих видавничих metadata закрито.** Первинна читальня тепер вимагає власні мапи та ключі видань/перекладів; підроблена через прототип назва/ліцензія не авторизує біблійний текст. [PR #1139](https://github.com/Oleksii-debug/scripture-archive/pull/1139) **MERGED** `main@91178972ad9c97a8453fca017c3737548859d53c`; [exact-head CI #41307851019](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41307851019) **SUCCESS**: 4211 Node PASS/1 SKIP, 37 Worker/D1 PASS, 2 Python PASS, TS/lint/build. [Акт](roadmap/SA_EXT_01_PRIMARY_RIGHTS_MAP_OWNERSHIP_SCOPED_TERMINAL_20261101.md). `remaining_scoped_implementation=0` тільки тут; SA-EXT-01/02/05/06/07 OPEN, 03/04 source-terminal; права/редакція, browser/NVDA, live Sites/D1/backup/release NOT_VERIFIED. Без заборонених запусків.

---

## 2026-11-01 — SA-EXT-01 / MALFORMED_CHAPTER_PRE_CATALOG — scoped terminal

**Лише цей дефект завершено, не весь SA-EXT-01.** Неправильні явні номери глав тепер відхиляються до `getCatalog()` з доступним `role=alert` навіть під час збою каталогу, без зміни збереженого читання. [PR #1136](https://github.com/Oleksii-debug/scripture-archive/pull/1136) **MERGED** `main@c4626a8cc247ba5a61e04c83bda78c7428ea1978`; [exact-head CI #41303325090](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41303325090) **SUCCESS**: 4206 Node PASS/1 SKIP, 37 Worker/D1 PASS, 2 Python PASS, TS/lint/build. [Акт](roadmap/SA_EXT_01_MALFORMED_CHAPTER_PRE_CATALOG_SCOPED_TERMINAL_20261101.md). `remaining_scoped_implementation=0` тільки тут; SA-EXT-01/02/05/06/07 OPEN, 03/04 source-terminal. Права/редакція, browser/NVDA, live Sites/D1/backup/release NOT_VERIFIED. Без заборонених запусків.

---

## 2026-11-01 — SA-EXT-01 / GROUP_READER_PRE_CATALOG_FAILCLOSED — scoped terminal

**Лише цей дефект ранньої валідації групового URL закрито, НЕ батьківський SA-EXT-01.** Некоректні групові посилання відхиляються до `getCatalog()`, навіть якщо каталог недоступний; transient reader очищається, доступне повідомлення й відновлення показуються без зміни збереженого читання. [PR #1133](https://github.com/Oleksii-debug/scripture-archive/pull/1133) **MERGED** `main@d31eed5acd992f7b06cbd2fa5f36bfdebd565e74`; [CI #41299335426](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41299335426) **SUCCESS**: 4185 Node PASS/1 SKIP, 37 Worker/D1 PASS, 2 Python PASS, TS/lint/build. [Акт](roadmap/SA_EXT_01_GROUP_READER_PRE_CATALOG_SCOPED_TERMINAL_20261101.md). `remaining_scoped_implementation=0` тільки тут; SA-EXT-01/02/05/06/07 OPEN, 03/04 source-terminal. Rights/editorial, Chrome/Windows/NVDA, live Sites/D1/backup/release NOT_VERIFIED; заборонених запусків немає.

---

## 2026-11-01 — SA-EXT-01 / READER_LEADING_EMPTY_SEGMENT_FAILCLOSED — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**Лише цей дефект закрито, НЕ батьківський SA-EXT-01.** Подвійний початковий роздільник `//reader/GEN/3` або `#//reader/GEN/3` раніше оминав перевірку внутрішніх `//` та міг без повідомлення залишати попередній екран після запиту каталогу. Чинний reader тепер відхиляє адресу до API з `role=alert`, не змінює збережений прогрес. [PR #1129](https://github.com/Oleksii-debug/scripture-archive/pull/1129) **SQUASH MERGED** `main@3147abae55f304d0a113b7fef3eb2c119109ce1f`; [exact-head CI #41294627496](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41294627496) **SUCCESS**: 4160 Node PASS/1 SKIP, 37 disposable Worker/D1 PASS, 2 Python PASS, TypeScript/lint/build PASS. [Акт](roadmap/SA_EXT_01_READER_LEADING_EMPTY_SEGMENT_SCOPED_TERMINAL_20261101.md). `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0` тільки тут. SA-EXT-01/02/05/06/07 parent OPEN; 03/04 source-terminal. Rights/editorial, Chrome/Windows/NVDA, live Sites/D1/backup/release NOT_VERIFIED. Без production, 82 мов, платежів, synthetic users, розсилок чи dating.

---

## 2026-11-01 — SA-EXT-01 / LEGACY_HASH_QUERY_READER_PATH — scoped terminal

**Лише відокремлення query від legacy hash-координат завершено.** [PR #1126](https://github.com/Oleksii-debug/scripture-archive/pull/1126) **MERGED** `main@c140f064c032b8ffb126ef0bd476df9a6423f765`; [exact-head CI #41290663525](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41290663525) **SUCCESS** (Node/TS/lint/build, Worker/D1, Python). [Акт](roadmap/SA_EXT_01_LEGACY_HASH_QUERY_ROUTE_BOUNDARY_SCOPED_TERMINAL_20261101.md). `remaining_scoped_implementation=0` тільки тут. SA-EXT-01/02/05/06/07 parent OPEN, 03/04 source-terminal; rights, real browser/NVDA, live Sites/D1 and release NOT_VERIFIED. Жодного забороненого запуску.

---

## 2026-11-01 — SA-EXT-01 / LEGACY_HASH_READER_VERSE_FOCUS — scoped terminal

Лише hash-verse deep-link compatibility закрито: [PR #1123](https://github.com/Oleksii-debug/scripture-archive/pull/1123) **MERGED** `main@364c4283ea3817499f4aa3b6ec06f681a45033e7`; [exact-head CI #41286095922](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41286095922) **SUCCESS** (Node/TS/lint/build, Worker/D1, Python). [Акт](roadmap/SA_EXT_01_LEGACY_HASH_VERSE_FOCUS_SCOPED_TERMINAL_20261101.md). `remaining_scoped_implementation=0` тільки тут. SA-EXT-01/02/05/06/07 parent OPEN; 03/04 source-terminal. Real browser/NVDA, rights, editorial, live Sites/D1 and release NOT_VERIFIED; no prohibited launch.

---

## 2026-11-01 — SA-EXT-01 / STALE_OUTER_ROUTE_CONTINUATION — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**Закрито тільки захист асинхронного продовження канонічного `route()`, НЕ батьківський SA-EXT-01.** Старий запит читальні більше не замінює метадані, фокус/прокручування або доступний екран помилки новішої сторінки після пізньої відповіді чи відмови. Збережено `role=alert` та retry для поточної помилки. [PR #1120](https://github.com/Oleksii-debug/scripture-archive/pull/1120) **SQUASH MERGED** `main@58e4c1675bfae09949b5b842ed014dfe26494718`; [exact-head CI #41282589015](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41282589015) **SUCCESS**: 4110 Node PASS / 1 SKIP, 37 disposable Worker/D1 PASS, 2 Python PASS, TypeScript/lint/build PASS. [Точний акт](roadmap/SA_EXT_01_STALE_OUTER_ROUTE_CONTINUATION_SCOPED_TERMINAL_20261101.md). `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0` **лише тут**. SA-EXT-01/02/05/06/07 parent OPEN; 03/04 source-terminal. Права, редакція, Chrome/Windows/NVDA, Sites/D1/backup, release #689 NOT_VERIFIED. Без production/deploy/міграцій/82 мов/платежів/synthetic users/розсилок/dating.

---

## 2026-11-01 — SA-EXT-01 / READER_EMPTY_SEGMENTS_AND_LEGACY_HASH — scoped terminal

**Закрито тільки malformed-path/legacy-hash boundary, НЕ батьківський розділ.** Порожні внутрішні сегменти `/reader/GEN//3` або `/reader/GEN/3/group//g_123` більше не стають валідною главою/групою; чинний legacy `/#/reader/GEN/3` читається через канонічний UI. [PR #1117](https://github.com/Oleksii-debug/scripture-archive/pull/1117) **MERGED** `main@ec7e9a2b21e49d6dab2c6e4ab4c09dffb0c4de47`; [CI #41278079344](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41278079344) **SUCCESS** (4087 Node PASS/1 SKIP, 37 Worker/D1, 2 Python, TS/lint/build). [Акт](roadmap/SA_EXT_01_READER_EMPTY_SEGMENTS_LEGACY_HASH_SCOPED_TERMINAL_20261101.md). `remaining_scoped_implementation=0` лише тут. SA-EXT-01/02/05/06/07 OPEN, 03/04 source-terminal; права, редакція, live browser/NVDA/Sites/D1/backup/release NOT_VERIFIED. Без production чи заборонених запусків.

---

## 2026-11-01 — SA-EXT-01 / GROUP_READER_NAVIGATION_CONTEXT — scoped terminal

**Закрито тільки дефект втрати group ID у навігації чинної читальні.** [PR #1114](https://github.com/Oleksii-debug/scripture-archive/pull/1114) **MERGED** `main@61dca5ec11436d532180a7f1ef59ebbf33a639a9`; [native CI #41274563834](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41274563834) **SUCCESS** (4071 Node PASS / 1 SKIP, 37 Worker/D1, 2 Python, TS/lint/build). Копійовані цитати не розкривають приватний group ID. [Акт](roadmap/SA_EXT_01_GROUP_READER_NAVIGATION_CONTEXT_SCOPED_TERMINAL_20261101.md). `remaining_scoped_implementation=0` тільки тут; батьківські 01/02/05/06/07 OPEN, 03/04 source-terminal; live browser/NVDA/Sites/D1/rights/release NOT_VERIFIED.

---

## 2026-11-01 — SA-EXT-01 / GROUP_READER_ROUTE_SHAPE — SCOPED TERMINAL

**Лише цей дефект маршруту закрито:** неповні/помилкові групові посилання читальні більше не підміняються особистими. [PR #1111](https://github.com/Oleksii-debug/scripture-archive/pull/1111) **SQUASH MERGED** `main@90c9ca621d4ce08776eda6fb524e7ec08e3ac26e`; [CI #41270514276](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41270514276) **SUCCESS**: 4052 Node PASS/1 SKIP, 37 Worker/D1 PASS, 2 Python PASS, TS/lint/build. [Акт](roadmap/SA_EXT_01_GROUP_READER_ROUTE_SHAPE_SCOPED_TERMINAL_20261101.md). `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0` лише тут. **SA-EXT-01/02/05/06/07 parent OPEN, 03/04 source-terminal**; реальні права/редакція/Chrome/NVDA/Sites/D1/release NOT_VERIFIED. Без production або заборонених запусків.

---

## 2026-11-01 — SA-EXT-01 / READER_CASE_INSENSITIVE_ALIAS_VERSE_FOCUS — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**Закрито лише цю підфункцію, НЕ батьківський SA-EXT-01.** Читальня приймала `/reader/jhn/3` і `/reader/JhN/3` як Івана 3, але не фокусувала `?verse=16`, оскільки порівнювала код книги з URL тільки в uppercase. Тепер канонічний guard звіряє case-insensitive alias лише з уже підтвердженим кодом книги та точним номером глави; неправильні книги/глави/типи не отримують фокус. [PR #1108](https://github.com/Oleksii-debug/scripture-archive/pull/1108) **SQUASH MERGED** `main@950b3d3152a338105acd0c36e3eb274be8a470cd`, source blob `684f6d10131532ed6b1fc86b03bbfc3a2c81fc87`, regression blob `f5cbff26d875027aa27fc2d42a6aae61aab6146e`. [Exact-head CI #41266838341](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41266838341) **COMPLETED SUCCESS**: 4033 Node PASS / 1 SKIP / 0 FAIL, 37 disposable Worker/D1 PASS, 2 Python PASS, TypeScript/lint/build PASS (13 lint warnings, 0 errors). Ізольовані source-V8 3 позитивні + 11 негативних PASS, **не** фізичний NVDA. [Акт](roadmap/SA_EXT_01_ALIAS_VERSE_FOCUS_SCOPED_TERMINAL_20261101.md). `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0` лише тут. Батьківські 01/02/05/06/07 OPEN; 03/04 source-terminal. Права, редакційне приймання, реальний Chrome/Windows/NVDA, Sites/D1/backup і реліз #689 NOT_VERIFIED. Без production/deploy/міграцій/82 мов/платежів/synthetic users/масової пошти/dating.

---

## 2026-11-01 — SA-EXT-01 / EXPLICIT_MALFORMED_CHAPTER_ROUTE_FAILCLOSED — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**Закрито тільки цей дефект, НЕ батьківський SA-EXT-01.** Явний некоректний URL глави (`/reader/GEN/abc`, `0`, `01`, `1e2`, небезпечне ціле) більше не підмінюється главою 1: канонічна читальня відмовляє до attempt API/завантаження тексту, очищає застарілий контекст і показує доступний `role=alert` із посиланням `/reader`. Валідні глави, обмеження зверху та відновлення збереженої глави збережені. Source baseline 21/21 відтворень; кандидат 21/21 негативних + 12/12 позитивних ізольованих перевірок. [PR #1106](https://github.com/Oleksii-debug/scripture-archive/pull/1106) **SQUASH MERGED** `main@e9dd07151d570b660199a9aa3c44d02dfed2e811`; source blob `2e8ad9bcf19332c979c389a3831b033d3b4550a0`, regression blob `e4c743a20f09f405a906165c1a914152146b40b5`. [Exact-head CI #41266545819](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41266545819) **COMPLETED SUCCESS**: 4032 Node PASS / 1 SKIP / 0 FAIL, 37 disposable Worker/D1 PASS, 2 Python PASS, TypeScript/lint/build PASS (13 lint warnings, 0 errors). [Незмінний акт](roadmap/SA_EXT_01_EXPLICIT_MALFORMED_CHAPTER_ROUTE_SCOPED_TERMINAL_20261101.md). `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0` **лише тут**. Батьківські SA-EXT-01/02/05/06/07 OPEN; 03/04 source-terminal. Права, редакційне приймання, браузер/Windows/фізичний NVDA, live Sites/D1/backup та реліз #689 NOT_VERIFIED. Без production/deploy/міграцій/82 мов/платежів/synthetic users/розсилок/dating.

---

## 2026-11-01 — SA-EXT-05/06 / DOSSIER_UNICODE_ZS_SEARCH_FAILCLOSED — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**ЗАКРИТО ЛИШЕ ЦЕЙ ДЕФЕКТ, НЕ БАТЬКІВСЬКІ SA-EXT-05/06.** Спільний пошук досьє й текстового атласу тепер відхиляє 15 не-ASCII Unicode Zs пробілів (U+1680, U+2000–U+200A, U+202F, U+205F, U+3000) до `trim()`, щоб невидимий GET `q` не перетворювався на нефільтрований каталог із сторонніми біблійними посиланнями. Збережено порожній/звичайний SPACE/TAB, реальні біблійні запити, три мови та доступне `role=alert`. Це дефект source input-integrity, не доведений production-інцидент.

**Інтеграція:** [PR #1103](https://github.com/Oleksii-debug/scripture-archive/pull/1103) **SQUASH MERGED** у `main@bbfb189b1798484723560bc2933f4a481f975624`; source blob `public/scripture-dossiers.js@51ca7935742ebaba8f377d0253770ed41ff932b1`, regression blob `tests/dossier-search-invisible-query.test.mjs@74bc685fbfafa6e46c608f55c9b473fd67002bc8`. [Exact-head GitHub CI #41262334005](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41262334005) **COMPLETED SUCCESS**: 4027 native Node PASS / 1 SKIP / 0 FAIL, 37 disposable Worker/D1 PASS, 2 Python PASS; TypeScript, lint (13 warnings / 0 errors), build PASS. Окремі 78 ізольованих regex-only Node assertions PASS, **не** повний локальний checkout.

`remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0` **лише для Unicode Zs search boundary**. SA-EXT-01/02/05/06/07 parent **OPEN**, 03/04 source-terminal. Права, редакційне приймання, реальний Chrome/Windows/NVDA, deployed Sites/D1/backup і release #689 **NOT_VERIFIED**. Без production/deploy/міграцій/82 мов/платежів/synthetic users/масової пошти/dating.

---

## 2026-11-01 — SA-EXT-05/06 / DOSSIER_INVISIBLE_UNICODE_FILLER_QUERY — SCOPED TERMINAL

**Лише цей дефект закрито:** NBSP-only та інші невидимі Unicode fillers більше не відкривають нефільтровані досьє/атлас або хибні результати. [PR #1100](https://github.com/Oleksii-debug/scripture-archive/pull/1100) **MERGED** `main@b8ff1751b52f76f5948ca59e21756c569ef420dc`, [exact-head CI #41258414929](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41258414929) **SUCCESS** (3987 Node PASS/1 SKIP, 37 Worker/D1 PASS, 2 Python PASS, TS/lint/build). `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0` тільки для цього input gate. **SA-EXT-01/02/05/06/07 parent OPEN, 03/04 source-terminal**. Реальні браузер/NVDA, права, редакційне приймання, Sites/D1/backup та реліз NOT_VERIFIED; жодного production deploy або заборонених запусків.

---

## 2026-10-31 — SA-EXT-01 / EXPLICIT_UNKNOWN_BOOK_DEEPLINK_FAILCLOSED — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**ЗАКРИТО ДЛЯ РОЗРОБКИ лише одну перевірену межу маршруту читальні; батьківський SA-EXT-01 OPEN.** Явне `/reader/ZZZ/5` більше не підмінюється книгою `GEN` з хибною ідентичністю джерела: канонічний `renderReader` зупиняється до API перевірки глави/завантаження тексту, скидає старий контекст і показує доступне `role=alert` з посиланням відновлення. Справжні книги, lowercase alias, `/reader` із попереднім читанням і fallback для пошкодженої збереженої книги збережено.

[Функціональний PR #1081](https://github.com/Oleksii-debug/scripture-archive/pull/1081) **SQUASH MERGED** `main@0dbf8979cff3a95a44760e1929a02e7fd9822549`; source blob `9ba2cd1e6e06b6a4aab9af221f004da4e27789dd`, regression blob `9dad4750b27c7229414fc32ecfed959b9a36ee51`. [Exact-head CI #41246461479](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41246461479) **COMPLETED SUCCESS**: 3791 Node PASS / 1 SKIP, 35 Worker/D1 PASS, 2 Python PASS, TS/lint/build SUCCESS. [Незмінний акт](roadmap/SA_EXT_01_UNKNOWN_READER_BOOK_DEEPLINK_SCOPED_TERMINAL_20261031.md). `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0` **лише для цієї підфункції**. SA-EXT-01/02/05/06/07 parent OPEN; 03/04 source-terminal; права видань, редакційне приймання, браузер/фізичний NVDA, live Sites/D1/backup та реліз #689 NOT_VERIFIED. Жодного деплою, production міграції, зміни даних користувачів, нових мов, платежів чи розсилок.

---

## 2026-10-31 — SA-EXT-01/16 / REGISTRATION_LOCALE_EXACT_TYPED — SCOPED TERMINAL

**Лише цей дефект ЗАКРИТО ДЛЯ РОЗРОБКИ**: канонічний registration API відхиляє явно нестроковий JSON locale і не перетворює `en-US`/`ru-RU` на `en`/`ru` через обрізання. Збережено `uk/ru/en`, missing/null/default та unknown-text→uk. [PR #879](https://github.com/Oleksii-debug/scripture-archive/pull/879) MERGED `main@fc4fd29774de1aa084d23e31c564dbf34e21996a`; [exact-head full Actions #41176279283](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41176279283) SUCCESS; [terminal receipt](roadmap/SA_EXT_01_REGISTRATION_LOCALE_EXACT_TYPED_SCOPED_TERMINAL_20261031.md). `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`, `remaining_scoped_implementation=0`, `necessary_unmerged_feature_PRs=0`. **Батьківські SA-EXT-01/16 OPEN; 03/04 TERMINAL.** Live Sites/Windows/NVDA/SMTP NOT_VERIFIED, не реліз.

---

## 2026-10-31 — SA-EXT-02 / PRIVATE_READING_BOOK_CODE_EXACT_IDENTITY — SCOPED TERMINAL

**ЗАКРИТО ДЛЯ РОЗРОБКИ лише один реальний дефект, НЕ батьківський SA-EXT-02.** Канонічний `PUT /api/account?action=reading` тепер не перетворює невалідний код книги з пробілами на чинний ідентифікатор збереженого читання. [PR #870](https://github.com/Oleksii-debug/scripture-archive/pull/870) **SQUASH MERGED** у `main@75e453a13beb27a2b89c3725b24feff46db52bc8`. [Exact-head Actions #41174459535](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41174459535) **SUCCESS** (2677 Node PASS, 0 FAIL, 1 SKIP; 22/22 Worker/D1; 2 Python PASS; TypeScript/lint/build PASS). [Остаточна вузька квитанція](docs/roadmap/SA_EXT_02_READING_BOOK_EXACT_IDENTITY_SCOPED_TERMINAL_20261031.md). `remaining_scoped_implementation=0` і `necessary_unmerged_feature_PRs=0` тільки тут. Повний SA-EXT-02 та решта 17 незакритих батьківських розділів залишаються OPEN; Sites SHA/Chrome/Windows/NVDA NOT_VERIFIED.

---

## 2026-10-31 — SA-EXT-01/02 / EXACT SOURCE GATES — TWO SCOPED TERMINAL REPAIRS

- **SA-EXT-01:** [#866](https://github.com/Oleksii-debug/scripture-archive/pull/866) **MERGED** main `91e59f5a6fe9810e2a9637eadff4238621f058e5`; safe canonical book codes and bounded chapters before HTML/fetch. Exact-head [CI #41172736372](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41172736372) SUCCESS.
- **SA-EXT-02/04:** [#867](https://github.com/Oleksii-debug/scripture-archive/pull/867) **MERGED** main `39108a68fa37bbf6020a33d0dc43ec8511cf0ea0`; exact group identifier instead of trimmed cross-key alias in canonical reading/assessment API. Exact-head [CI #41172834341](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41172834341) SUCCESS.
- [Canonical scoped terminal receipt](roadmap/SA_EXT_01_02_READER_AND_ATTEMPT_EXACT_SCOPED_TERMINAL_20261031.md). `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` for these 2 fixes only, no necessary unmerged feature PR. Full SA-EXT-01/02 OPEN, 03/04 remain parent TERMINAL, other 16 parents OPEN. No hosted Sites/NVDA/release verification.

---

# Scripture Archive — індекс затверджених майбутніх розширень (28.10.2026)

**Статус:** власник погодив включення до технічних планів і каталогу розділів; це не доказ реалізації й не дозвіл на автоматичний реліз. 
**Принцип:** пріоритет поточного продукту — завершити/перевірити нинішні можливості, а всі нові напрямки розвивати як доказові окремі модулі.

## Перевірені вузькі закриття (не закриття батьківського розділу)

- **SA-EXT-01 — безпечні обсяги основної біблійної читальні:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` лише для реальних `getBook()` chapter/verse bounds, sparse-відмови та HTTP retry. [Код #864](https://github.com/Oleksii-debug/scripture-archive/pull/864) злитий `main@eb60a7d9a8f90f8287f039887606748c20838de3`; [CI #41171867181](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41171867181) SUCCESS (2668 Node PASS, 22 Worker/D1, TypeScript/lint/build, 2 Python). [Остаточна квитанція](roadmap/SA_EXT_01_PRIMARY_READER_CHAPTER_BOUNDS_SCOPED_TERMINAL_20261031.md). **Батьківський SA-EXT-01 OPEN; live Sites/Windows/Chrome/NVDA NOT_VERIFIED.**



- **SA-EXT-02 — точна ідентичність збереженої навчальної спроби (`GET current`, `POST invalidate/finalize/answer`):** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` лише для неправильно обрізаних або нормалізованих attempt ID. [PR #860](https://github.com/Oleksii-debug/scripture-archive/pull/860) **MERGED** `main@e4d154632fe850516d9206d4e567a5940662fa32`; [повний CI #41170903151](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41170903151) **SUCCESS**, збережено чесний 503 під час збою авторизації. [Офіційна квитанція](roadmap/SA_EXT_02_EXACT_ATTEMPT_IDENTITY_SCOPED_TERMINAL_20261031.md). Повний SA-EXT-02 **OPEN**; продуктивний сайт, фізичний NVDA і реліз не підтверджено.



- **SA-EXT-02 — точна ідентичність книги під час читання/старту місії:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` лише для invalid/overlong book-code alias у канонічних `chapter/read/start` API. [PR #856](https://github.com/Oleksii-debug/scripture-archive/pull/856) **MERGED** `main@2718f85ffadc70437785a8833e1c49491950c90b`; [CI #41170422587](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41170422587) **SUCCESS**, 19×3 негативних плюс 9 позитивних API-контрактів; [термінальна квитанція](roadmap/SA_EXT_02_BOOK_CODE_EXACT_IDENTITY_SCOPED_TERMINAL_20261031.md). Повний SA-EXT-02 **OPEN**; реліз, реальний NVDA/Windows NOT_VERIFIED.

- **SA-EXT-16 / R0 — повний тест історичного оновлення від міграцій 0000–0008 до 0014:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` лише для розширення existing source-upgrade regression з consent-trigger guard і редакційними FK. [PR #854](https://github.com/Oleksii-debug/scripture-archive/pull/854) **MERGED** `main@cb3e5afcfb200235805818cdf0dc2e79cc7324fe`; [CI #41170147488](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41170147488) **SUCCESS**; [квитанція](roadmap/SA_EXT_16_HISTORICAL_V8_V14_UPGRADE_SCOPED_TERMINAL_20261031.md). Повний SA-EXT-16 і production cutover #689 **OPEN**, real D1/Sites/backup NOT_VERIFIED.


- **SA-EXT-01 — спільна обмежена атрибуція ліцензій основної й паралельної читальні:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` лише для canonical publisher rights metadata bounds (title<=512, licence/attribution/source<=4096). [PR #855](https://github.com/Oleksii-debug/scripture-archive/pull/855) **MERGED** `main@f8b3cdd029b0ff74f4975a898d57a9d92640e003`; exact [CI #41170269116](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41170269116) **SUCCESS**; [квитанція](roadmap/SA_EXT_01_SHARED_PRIMARY_PARALLEL_RIGHTS_BOUNDS_SCOPED_TERMINAL_20261031.md). Повний SA-EXT-01 **OPEN**, live/NVDA/Windows NOT_VERIFIED.


- **SA-EXT-02 / приватна історія читання (HTTP read projection і межі):** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` для видалення додаткових історичних JSON полів із API, захисту обсягу 2 000 записів та помилок D1. [PR #852](https://github.com/Oleksii-debug/scripture-archive/pull/852) **MERGED** `main@f0a827916bc105a64e29161e211d7c9ec9b91bd4`; [CI #41169869208](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41169869208) **SUCCESS**; [офіційна квитанція](roadmap/SA_EXT_02_READING_RECEIPT_GET_PROJECTION_BOUNDS_SCOPED_TERMINAL_20261031.md). **Батьківські SA-EXT-02 і SA-EXT-16 OPEN**, реліз/Chrome/Windows/NVDA не підтверджено.


- **SA-EXT-01 — ідентичність перекладу основної читальні:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` лише для відмови від підстановки чужого ліцензійного джерела за неправильного ID. [PR #842](https://github.com/Oleksii-debug/scripture-archive/pull/842) **MERGED** у `main@12abfeae78f132b5fe07a29abde15f5185d56233`, exact-head [CI #41168210300](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41168210300) **SUCCESS**; [доказ](roadmap/SA_EXT_01_PRIMARY_TRANSLATION_IDENTITY_SCOPED_TERMINAL_20261031.md). Повний SA-EXT-01 OPEN; live Sites/browser/NVDA/Windows NOT_VERIFIED, деплою немає.



- **SA-EXT-01 — сирі Unicode-контролі в джерелах/ліцензіях Біблії:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` лише для точної URI-цілісності канонічної читальні й сторінки видань. [PR #839](https://github.com/Oleksii-debug/scripture-archive/pull/839) **MERGED** у `main@d43111e214afdad45e6d35fadf9ebca9a88433eb`; exact-head [Actions #41167858860](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41167858860) **SUCCESS**; [термінальна квитанція](roadmap/SA_EXT_01_RAW_SOURCE_LICENSE_UNICODE_SCOPED_TERMINAL_20261031.md). **Батьківський SA-EXT-01 OPEN; live/Sites/Windows/NVDA NOT_VERIFIED**, деплою немає.



- **SA-EXT-16 — точний рахунок створених учасників спільноти:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` лише для `community_waves.created_count` після успішного member INSERT. [PR #838](https://github.com/Oleksii-debug/scripture-archive/pull/838) злито в `main@ed3b9daca87bb7a75e8f79fbabb3a646e61cc99a`, [CI #41167678710](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41167678710) SUCCESS. [Квитанція](roadmap/SA_EXT_16_COMMUNITY_WAVE_MEMBER_INSERT_SCOPED_TERMINAL_20261031.md). Батьківський SA-EXT-16 OPEN, реліз не виконано.

- **SA-EXT-16 — owner-керування спільнотою та D1-readback:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` для fail-closed START/PAUSE/RESUME/STOP та точного owner snapshot. [PR #835](https://github.com/Oleksii-debug/scripture-archive/pull/835) і [#836](https://github.com/Oleksii-debug/scripture-archive/pull/836) злиті в `main@0a84164bbad224a9cf85ff0726865371fa5ac660`; обидві native CI SUCCESS. [Квитанція](roadmap/SA_EXT_16_COMMUNITY_OWNER_D1_ACK_SCOPED_TERMINAL_20261031.md). Повний SA-EXT-16 і реліз OPEN.

- **SA-EXT-07/16 — приватна Academy та BFCache:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` тільки для неавторизованого збереження приватних позначок після `pagehide`. [PR #833](https://github.com/Oleksii-debug/scripture-archive/pull/833) злитий у `main@c3e02c5842f5ceafe8c4784daa1a0ef51ee2445f`, [exact-head CI #41166069032](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41166069032) **SUCCESS**. [Доказ](roadmap/SA_EXT_07_ACADEMY_BFCACHE_SCOPED_TERMINAL_20261031.md). Обидва батьківські розділи OPEN; реальний сайт, NVDA і реліз не підтверджені.

- **SA-EXT-16 — приватний account/BFCache:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` лише для захисту account DOM, форм та застарілих callbacks після `pagehide`. [PR #826](https://github.com/Oleksii-debug/scripture-archive/pull/826) злито у `main@9457b5bb93f032b8deb455aa8964ffeb741d3f34`; [exact-head CI #41165008578](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41165008578) **SUCCESS**. [Квитанція](roadmap/SA_EXT_16_ACCOUNT_BFCACHE_SCOPED_TERMINAL_20261031.md). Повний SA-EXT-16 і непідтверджені release/browser/NVDA етапи залишаються OPEN.

- **R0 / SA-EXT-16 — перевірка оголошеного HTTPS-домену:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` для непомітних керівних символів і порожнього userinfo. [PR #784](https://github.com/Oleksii-debug/scripture-archive/pull/784) злито в `main@0d9bf08f00794e75a6c91c0f5d6f95a21de63ef0`; [CI #41072585585](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41072585585) **SUCCESS**. [Квитанція](roadmap/R0_DECLARED_ORIGIN_CONTROLS_SCOPED_TERMINAL_20261030.md). Жодного деплою: батьківські SA-EXT-03/04 уже **TERMINAL для розробки**, інші 18 батьківських розділів **OPEN**.
- **R0 / SA-EXT-16 — офлайнова перевірка SQLite-копії, захист від символьного посилання:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`. Виправлення [PR #781](https://github.com/Oleksii-debug/scripture-archive/pull/781) злито в `main@bb8a0af98cdfca93464ebbc5fbe548460415dd97`; [нативна CI #41071493589](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41071493589) **SUCCESS**. [Постійна квитанція](roadmap/R0_CONSENT_SNAPSHOT_SYMLINK_SCOPED_TERMINAL_20261030.md). Повний SA-EXT-16 та інші незакриті батьківські розділи **OPEN**, SA-EXT-03/04 вже **TERMINAL**; робочий production-реліз не підтверджений.

## Канонічні документи
1. [Розширена кінцева концепція](product/SCRIPTURE_ARCHIVE_EXPANDED_PRODUCT_VISION_2026-10-28.md): біблійний дослідник, академія, громади, соціальна мережа, конференції, фонди, бібліотека, атлас, міжнародні партнерства і ШІ.
2. [План із 20 розділів та критеріїв готовності](roadmap/SCRIPTURE_ARCHIVE_EXPANSION_SECTION_PLAN_2026-10-28.md): ідентифікатори SA-EXT-01…20; готове/заплановане/незавершене; залежності, пріоритети, acceptance.
3. [Технічна специфікація окремих християнських знайомств](architecture/CHRISTIAN_COMMUNITY_AND_DATING_TECHNICAL_SPEC_2026-10-28.md): окремий opt-in 18+ продукт із власними даними і правилами, пілот серед суботніх християн, без автоматичної конфесійної класифікації.

## Проєктна дисципліна
- Поточна публічна платформа: https://scripture-archive.com (перевірений handoff 26.10: Sites v10, commit `3a04d12`; перед технічною роботою перевірити live стан).
- Базовий існуючий код: `public/app.js`, `public/home.js`, `public/data/catalog.json`, `app/api/groups/route.ts`, `app/api/attempts/route.ts`.
- Release/production blockers (email, owner control, cron, assessment patch, end-to-end/accessibility) **не вважаються завершеними** через додавання цих документів.
- Не редагувати вихідні архівні handoff/ZIP/завершені презентації заднім числом. Новий план — версійне розширення 28.10, не переписана історія.
- Не активувати розсилки, платежі, нові production jobs, конфесійне профілювання, синтетичну діяльність, соціальні або dating-функції лише тому, що вони внесені до плану.

Контрольні джерела: [Issue #78](https://github.com/Oleksii-debug/scripture-archive/issues/78) і [архів стану від 26.10](https://drive.google.com/file/d/1EX575ZzoImUDKbYhCwcXXupiooZK51sd/view).
