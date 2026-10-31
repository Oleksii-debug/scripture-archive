## 2026-10-31 — SA-EXT-05 / DOSSIER_SOURCE_COMPARISON — SCOPED TERMINAL

**CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** лише для справжнього порівняння двох оприлюднених досьє у канонічному /dossiers: клавіатурна GET-форма, повні списки джерел, посилання на /reader, точний перетин book/chapter/verse, класифікація narrative/interpretive, uk/ru/en, чесні відмови для невалідних ідентифікаторів. [PR #921](https://github.com/Oleksii-debug/scripture-archive/pull/921) MERGED `main@1fc1fbaf0254d11241f4b31863e24b063d0177e3`; [full PR-head CI #41188827090](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41188827090) SUCCESS; [точний термінальний акт](docs/roadmap/SA_EXT_05_DOSSIER_SOURCE_COMPARE_SCOPED_TERMINAL_20261031.md). `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0`; **весь SA-EXT-05 OPEN** — потрібно значно більше незалежно перевіреного матеріалу/прав. Live Sites/NVDA/реліз НЕ ПЕРЕВІРЕНІ.

---

## 2026-10-31 — SA-EXT-16 / PROVIDER_CONFLICTING_2XX_ACK — SCOPED TERMINAL

**CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** лише для fail-closed квитанції приймання пошти: навіть HTTP 2xx з id не доводить доставки, якщо провайдер одночасно повернув `error` або `errors`. [PR #920](https://github.com/Oleksii-debug/scripture-archive/pull/920) MERGED `main@9bb549ede51d006fdd112aba9d012f6db46bb4c0`; [CI #41188413599](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41188413599) SUCCESS, [main push CI #41188656780](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41188656780) SUCCESS; [термінальний акт](docs/roadmap/SA_EXT_16_PROVIDER_RECEIPT_CONFLICT_SCOPED_TERMINAL_20261031.md). `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0` лише тут. **Увесь SA-EXT-16 OPEN** (email/DNS production, права, NVDA і операційні перевірки). Реальних email не надсилали; реліз НЕ ОНОВЛЮВАЛИ.

---

## 2026-10-31 — SA-EXT-08 / LIBRARY_STRUCTURED_RIGHTS_DISCLOSURE — ВУЗЬКУ ФУНКЦІЮ ЗАКРИТО

**CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** тільки для відомостей про права на матеріали справжньої бібліотеки. Автор указує правовласника/статус, підставу публікації та HTTPS-ліцензію для `open_license`; єдина редакторська черга та публічний `/library` показують права, мову й дату перевірки. Міграція D1 `0015` не вигадує ліцензії старих матеріалів. [PR #922](https://github.com/Oleksii-debug/scripture-archive/pull/922) **SQUASH MERGED** у `main@c7f423df9bfc5eefd00bf8aa0970dcdb054225c6`. [Exact-head Actions #41188738369](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41188738369) **SUCCESS**, Node 2989 PASS/0 FAIL/1 SKIP, Worker/D1 22 PASS, TypeScript/lint/build/Python PASS. [Остаточний scoped-акт](docs/roadmap/SA_EXT_08_STRUCTURED_LIBRARY_RIGHTS_SCOPED_TERMINAL_20261031.md): `remaining_scoped_implementation=0`; `necessary_unmerged_scoped_feature_PRs=0`. **Увесь SA-EXT-08 лишається OPEN** (повний каталог, права, медіа, live acceptance); Sites SHA/Windows/NVDA/deployment **NOT_VERIFIED**, реліз не змінювався.

---

## 2026-10-31 — SA-EXT-01 / READ_HISTORY_ATOMIC_CAP — ВУЗЬКИЙ ДЕФЕКТ ЗАКРИТО

**CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** виключно для атомарної межі 2 000 збережених записів читання: canonical `PUT /api/account?action=reading` не дозволяє переповнити історію, яку `GET` не зміг би прочитати; старі дані не пошкоджуються, повторення глав залишається безпечним. [PR #918](https://github.com/Oleksii-debug/scripture-archive/pull/918) **SQUASH MERGED** у `main@2445708dc8351f0a75dfcd581beeeffc8e469fcc`; [CI #41187278995](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41187278995) **SUCCESS**: Node 2985 PASS / 0 FAIL / 1 SKIP, Worker/D1 22 PASS, Python 2 PASS, TypeScript/lint/build PASS. [Термінальний scoped-акт](docs/roadmap/SA_EXT_01_READING_ATOMIC_CAP_SCOPED_TERMINAL_20261031.md). `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0`; **увесь SA-EXT-01 залишається OPEN** (права, покриття видань, provenance/QA). Production Sites, Windows/NVDA та поточний реліз — NOT_VERIFIED; деплою не було.

---

## 2026-10-31 — SA-EXT-05/06/07 — WITNESS_LINK_ACCESSIBLE_NAMES — ДВА ВУЗЬКІ ВИПРАВЛЕННЯ ЗАКРИТО

**CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** тільки для доступних назв біблійних посилань. NVDA-користувач, що читає список посилань, тепер отримує класифікацію narrative чи interpretive всередині назви, а не лише після посилання.
[Academy PR #915](https://github.com/Oleksii-debug/scripture-archive/pull/915) **SQUASH MERGED** main SHA c1e52bdf104b145eb54973f6f19d2a79e6667f46; [Actions #41185252266](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41185252266) SUCCESS (Node 2978 PASS /0 FAIL/1 SKIP, Worker/D1 22 PASS, Python 2 PASS, TypeScript/lint/build PASS).
[Dossiers/Atlas PR #916](https://github.com/Oleksii-debug/scripture-archive/pull/916) **SQUASH MERGED** main SHA f6e521b8007bcb77d7cd72a47d6308ad1c4f6489; [Actions #41185337198](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41185337198) SUCCESS (Node 2981 PASS /0 FAIL/1 SKIP, Worker/D1 22 PASS, Python 2 PASS, TypeScript/lint/build PASS).
**Для двох виправлень:** remaining_scoped_implementation=0; necessary_unmerged_feature_PRs=0. [Термінальний акт](docs/roadmap/SA_EXT_05_06_07_WITNESS_LINK_NAMES_SCOPED_TERMINAL_20261031.md). **Батьківські SA-EXT-05, SA-EXT-06, SA-EXT-07 OPEN**; SA-EXT-03/04 вже повністю TERMINAL. Реальний NVDA/Windows, installed Sites SHA, ліцензії, production D1 та реліз НЕ ПЕРЕВІРЕНІ. Деплою не було.

---
## 2026-10-31 — SA-EXT-07 / ACADEMY_SOURCE_KIND_LABELS — ВУЗЬКА ФУНКЦІЯ ЗАКРИТО

**CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** лише для наявної Академії: усі 13 занять у штатному /academy тепер чітко відрізняють канонічні `narrative` та `interpretive` посилання на біблійні джерела українською, російською й англійською. [PR #913](https://github.com/Oleksii-debug/scripture-archive/pull/913) **SQUASH MERGED** в `main@49969688fe575d4aefcedfbb5669511436b90285`. [Exact-head GitHub Actions #41184940966](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41184940966) **SUCCESS**: Node 2978 PASS / 0 FAIL / 1 SKIP, disposable Worker/D1 22/22, Python 2/2, TypeScript/lint/build PASS. [Термінальний технічний запис](docs/roadmap/SA_EXT_07_ACADEMY_SOURCE_KIND_LABELS_SCOPED_TERMINAL_20261031.md); `remaining_scoped_implementation=0`, `necessary_unmerged_feature_PRs=0` **лише цієї підфункції**. **SA-EXT-07 батьківський OPEN** (повні курси, аудіовізуальні матеріали, незалежне приймання і права). SA-EXT-03/04 батьківські TERMINAL; інші розділи ще OPEN. Live Sites SHA, D1 production, фізичний NVDA/Windows і реліз НЕ ПЕРЕВІРЕНІ.

---

## 2026-10-31 — SA-EXT-06 / ATLAS_RELATION_WITNESSES — ВУЗЬКА ФУНКЦІЯ ЗАКРИТО

**CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** лише для відображення всіх уже перевірених зв'язкових біблійних джерел на канонічному /atlas: 17 ребер графа, назви двох досьє, справжні посилання /reader, класифікація джерела, доступний DL uk/ru/en. [Функціональний PR #911](https://github.com/Oleksii-debug/scripture-archive/pull/911) **SQUASH MERGED** в `main@74b72f143d7472d1edf2f46d07a114ba0a88d6ac`; [exact-head Actions #41184641131](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41184641131) **SUCCESS**: 2976 Node PASS / 0 FAIL / 1 SKIP, disposable Worker/D1 22 PASS, Python 2 PASS, TypeScript/lint/build PASS. [Точний приймальний запис](docs/roadmap/SA_EXT_06_ATLAS_RELATION_WITNESSES_SCOPED_TERMINAL_20261031.md). `remaining_scoped_implementation=0`, `necessary_unmerged_feature_PRs=0` **тільки тут**. **Батьківський SA-EXT-06 OPEN** (карти, хронологія, географічна доказовість, права); SA-EXT-03/04 раніше повністю TERMINAL, решта незакритих батьківських OPEN. Sites/D1 production, Windows/NVDA/SMTP/deploy — НЕ ПЕРЕВІРЕНО. Реліз не оновлювався.

---

## 2026-10-31 — SA-EXT-16 / LITERAL_RELEASE_ORIGIN — ЗАКРИТО ВУЗЬКУ ВАДУ ПЕРЕВІРКИ РЕЛІЗУ

**CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** тільки для fail-closed перевірки буквально записаного `https://` origin. Раніше 34 некоректні адреси проходили через WHATWG-нормалізацію до дозволеного домену; чинний канонічний `scripts/check-web-release-origin.mjs` їх відхиляє, а дві публічні функції покриті 34 негативними сценаріями. [Реалізація PR #909](https://github.com/Oleksii-debug/scripture-archive/pull/909) **SQUASH MERGED** `main@2d6063d241ecb9fed837c15911727f0fcbef72b5`. [Точний CI #41181832916](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41181832916) **SUCCESS**: Node **2974 PASS / 0 FAIL / 1 SKIP**, disposable Worker/D1 **22 PASS**, Python **2 PASS**, TS/lint/build PASS. [Квитанція з blob/SHA](docs/roadmap/SA_EXT_16_LITERAL_RELEASE_ORIGIN_SCOPED_TERMINAL_20261031.md); `remaining_scoped_implementation=0`, `necessary_unmerged_feature_PRs=0`. **SA-EXT-16 ПОВНІСТЮ OPEN**, SA-EXT-01/02/05–20 OPEN; SA-EXT-03/04 раніше повністю TERMINAL. Sites/deployed SHA/D1 production/Windows/NVDA/SMTP **NOT_VERIFIED**, реліз не виконувався.

---

## 2026-10-31 — SA-EXT-01 / OWN_EDITION_RIGHTS_METADATA — ЗАКРИТО ВУЗЬКИЙ ДЕФЕКТ

**CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** лише для захисту ліцензійних даних канонічного біблійного видання від успадкованих JavaScript-полів. Спільний `public/parallel-reader.js::validEditionRightsMetadata` тепер перевіряє власні `title/license/source` і optional `attribution/licenseUrl`, не допускає підміни походження чи публікації віршів під чужою ліцензією в наявному порівняльному UI. [Функціональний PR #907](https://github.com/Oleksii-debug/scripture-archive/pull/907) **SQUASH MERGED** до `main@be0703585175c4165f5d2841cfd625839d6e870f`. [Exact-head GitHub Actions #41180611036](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41180611036) **SUCCESS**: **35 нових тестів**, native Node **2973 PASS / 0 FAIL / 1 SKIP**, disposable Worker/D1 **22 PASS**, Python **2 PASS**, TS/lint/build PASS. [Точна scoped-квитанція](docs/roadmap/SA_EXT_01_OWN_EDITION_RIGHTS_METADATA_SCOPED_TERMINAL_20261031.md), `remaining_scoped_implementation=0`, `necessary_unmerged_feature_PRs=0`. **Увесь SA-EXT-01 і інші незавершені батьківські розділи залишаються OPEN; SA-EXT-03/04 TERMINAL.** Sites/Chrome/NVDA/Windows/SMTP/реліз не перевірено, деплою не було.

---

## 2026-10-31 — SA-EXT-05 / CANONICAL_CITED_VERSE_RANGE_SEARCH — ЗАКРИТО ВУЗЬКУ ПІДФУНКЦІЮ

**CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL**: реальний `/dossiers` тепер шукає оприлюднені джерельні діапазони `GEN 17:15-19` і `GEN 17:15–19` (uk/ru/en) у канонічних `sources` та `related[].via`, не підміняє їх чужими досьє, не створює другого пошуку. [Функціональний PR #905](https://github.com/Oleksii-debug/scripture-archive/pull/905) **SQUASH MERGED** у `main@c81d50e5fe84050e7ecbb29b79a2e7e5519b4f07`. [Exact-head Actions #41179768016](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41179768016) **SUCCESS**: **42 нові тести; загалом Node 2938 PASS / 0 FAIL / 1 SKIP**, Worker/D1 22/22, Python 2/2, TS/lint/build PASS. [Точний запис із SHA і blob](docs/roadmap/SA_EXT_05_CANONICAL_CITED_VERSE_RANGE_SCOPED_TERMINAL_20261031.md): `remaining_scoped_implementation=0`, `necessary_unmerged_feature_PRs=0` **лише для цієї підфункції**. **Повний SA-EXT-05 і решта 17 відкритих батьківських розділів залишаються OPEN; SA-EXT-03/04 — TERMINAL.** Реальний Sites SHA/NVDA/Windows/додаткові права NOT_VERIFIED; релізу не було.

---

## 2026-10-31 — SA-EXT-03 / MATERIAL_EDITOR_OWN_LOCALE_COPY — ЗАКРИТО ВУЗЬКИЙ ДЕФЕКТ

**CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** для нового підтвердженого дефекту словників редакторського інтерфейсу. Канонічний `public/material-review.js` відхиляє успадковані та нестрокові мовні ключі в огляді матеріалів, пошуку та керуванні редакторами; `uk/ru/en` працюють. [PR #902](https://github.com/Oleksii-debug/scripture-archive/pull/902) **SQUASH MERGED** у `main@38730af787c8622cbeae0efa51e4b030a1d48d59`; [Actions #41179283533](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41179283533) **SUCCESS**: Node 2896 PASS/0 FAIL/1 SKIP; Worker/D1 22/22, Python 2/2, TypeScript/lint/build PASS. [Доказовий реєстр](docs/roadmap/SA_EXT_03_MATERIAL_EDITOR_OWN_LOCALE_SCOPED_TERMINAL_20261031.md): `remaining_scoped_implementation=0`, `necessary_unmerged_feature_PRs=0` тільки для цього виправлення. **Батьківський SA-EXT-03 зберігає попередній TERMINAL; SA-EXT-01/02/05..20 OPEN.** Живий сайт, NVDA/Windows/SMTP, права та реліз NOT_VERIFIED; публікації не було.

---

## 2026-10-31 — SA-EXT-16 / ANALYTICS_CONSENT_OWN_LOCALE — ЗАКРИТО ВУЗЬКИЙ ДЕФЕКТ

**CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** тільки для вибору мови в реальному вікні згоди на аналітичні cookie: `Object.prototype`/нестрокові локалі більше не показують `undefined`, українська запасна локаль і `ru/en` збережені. [PR #901](https://github.com/Oleksii-debug/scripture-archive/pull/901) SQUASH MERGED `main@a55849fcaac59623b33df9f1f247d6a0bb948cd5`; [Actions #41179127156](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41179127156) SUCCESS: 2894 Node PASS / 0 FAIL / 1 SKIP, D1/Worker 22/22, Python 2/2, TypeScript/lint/build PASS. [Квитанція](docs/roadmap/SA_EXT_16_ANALYTICS_CONSENT_OWN_LOCALE_SCOPED_TERMINAL_20261031.md) з exact source/test blobs. `remaining_scoped_implementation=0` тільки для цього дефекту, батьківський SA-EXT-16 OPEN; Sites/Chrome/Windows/NVDA/SMTP/реліз NOT_VERIFIED.

---

## 2026-10-31 — SA-EXT-01/16 / HOME_SUPPORT_OWN_LOCALE — ЗАКРИТО ВУЗЬКИЙ ДЕФЕКТ

**CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** лише для вже злитого виправлення головної сторінки та підтримки проєкту: невідомі, нестрокові й успадковані назви локалі більше не руйнують вміст і заголовки, `uk/ru/en` збережено. [PR #899](https://github.com/Oleksii-debug/scripture-archive/pull/899) SQUASH MERGED `main@54759a89d79f5b8f2f216c50309810a7643e39fe`; [Actions #41178889927](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41178889927) SUCCESS: 2879 Node PASS / 0 FAIL / 1 SKIP, Worker/D1 22/22, Python 2/2, TypeScript/lint/build PASS. [Квитанція](docs/roadmap/SA_EXT_01_16_HOME_SUPPORT_OWN_LOCALE_SCOPED_TERMINAL_20261031.md) містить exact blobs. `remaining_scoped_implementation=0`, `necessary_unmerged_feature_PRs=0` **лише тут**. Батьківські SA-EXT-01 і SA-EXT-16 OPEN; Sites/Windows/Chrome/NVDA/SMTP та реліз NOT_VERIFIED, деплою не було.

---

## 2026-10-31 — SA-EXT-04 / MEETING_OWN_LOCALE_COPY — ЗАКРИТО ВУЗЬКИЙ ДЕФЕКТ

**CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** — реальні модулі історії зустрічей і виправлення підсумків тепер приймають лише власні строкові мовні ключі `uk/ru/en`. `__proto__`, `constructor`, `toString`, невідомі й нестрокові локалі безпечно використовують українські написи. [PR #894](https://github.com/Oleksii-debug/scripture-archive/pull/894) **SQUASH MERGED** в `main@6824ce20d476db1226dd44e8d2bac2ecfe9ee21d`; exact-head [Actions #41178417038](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41178417038) **SUCCESS** (2847 Node PASS / 0 FAIL / 1 SKIP; Worker/D1 22/22; Python 2/2; TypeScript/lint/build PASS). [Scoped-квитанція](docs/roadmap/SA_EXT_04_MEETING_LOCALE_OWN_KEY_SCOPED_TERMINAL_20261031.md): `remaining_scoped_implementation=0`, `necessary_unmerged_feature_PRs=0` тільки для цього післятермінального дефекту. **SA-EXT-04 уже був батьківським TERMINAL**, інші відкриті батьківські секції залишаються OPEN. Сайт/Sites, Windows/Chrome/NVDA/SMTP та реліз NOT_VERIFIED; публікації не виконували.

---

## 2026-10-31 — SA-EXT-01/02 / WORKSPACE_OWN_LOCALE_COPY — SCOPED TERMINAL

**ЗАКРИТО ДЛЯ РОЗРОБКИ лише цей дефект `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.** Єдиний `public/workspace.js` тепер відхиляє успадковані імена локалі для робочого простору, групових налаштувань, історії місій, повторення і відомостей про видання, зберігаючи `uk/ru/en` і безпечний український fallback. [Код PR #891](https://github.com/Oleksii-debug/scripture-archive/pull/891) **SQUASH MERGED** `main@0309db1bbcb6226d359cfb6f85e0467c01c4e142`. [Exact-head Actions #41178305059](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41178305059) **SUCCESS** (Node 2831 PASS/0 FAIL/1 SKIP, Worker/D1 22 PASS, TS/lint/build/Python PASS); дубль [#892](https://github.com/Oleksii-debug/scripture-archive/pull/892) після власного зеленого CI закритий без merge, щоби зберегти єдину реалізацію. [Остаточна scoped-квитанція](docs/roadmap/SA_EXT_01_02_WORKSPACE_OWN_LOCALE_COPY_SCOPED_TERMINAL_20261031.md), `remaining_scoped_implementation=0`, `necessary_unmerged_feature_PRs=0` лише тут. **Батьківські SA-EXT-01/02 OPEN**, SA-EXT-03/04 TERMINAL, решта OPEN. Sites/Windows/NVDA/SMTP NOT_VERIFIED, без релізу.

---

## 2026-10-31 — SA-EXT-01 / PARALLEL_READER_LOCALE_OWN_KEY — SCOPED TERMINAL

**ЗАКРИТО ДЛЯ РОЗРОБКИ лише цю підтверджену підфункцію** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`. Канонічний `public/parallel-reader.js` тепер на обох реальних UI-шляхах перевіряє, що локаль є власним ключем таблиці перекладів, і для `__proto__`/`constructor`/`toString`, невідомих чи нестрокових мов показує повний український текст замість `undefined`. [PR #890](https://github.com/Oleksii-debug/scripture-archive/pull/890) **SQUASH MERGED** у `main@f1da62ad911d00fd72f93b8e27060888e4c22044`; [Actions #41178190377](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41178190377) **SUCCESS**: 2832 Node PASS / 0 FAIL / 1 SKIP, Worker/D1 22/22, pytest 2/2, TS/lint/build завершені. [Офіційна scoped-квитанція](docs/roadmap/SA_EXT_01_PARALLEL_READER_LOCALE_OWN_KEY_SCOPED_TERMINAL_20261031.md). `remaining_scoped_implementation=0`, `necessary_unmerged_feature_PRs=0` лише для цього виправлення. **Батьківський SA-EXT-01 OPEN** (права на видання й provenance); встановлений Sites SHA, Windows, браузер/NVDA, SMTP NOT_VERIFIED; реліз не оновлювався.

---

## 2026-10-31 — SA-EXT-01 / EDITION_LANGUAGE_PROTOTYPE_ALIAS — SCOPED TERMINAL

**ЗАКРИТО ДЛЯ ПОДАЛЬШОЇ РОЗРОБКИ лише цю підтверджену помилку `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.** Канонічний вибір біблійного видання `public/editions.js` тепер відхиляє назви мови, успадковані з `Object.prototype` (`__proto__`, `constructor`, `toString`, `hasOwnProperty`): замість `TypeError` і помилкового локального вибору відображає українське видання за замовчуванням. [Код PR #887](https://github.com/Oleksii-debug/scripture-archive/pull/887) **SQUASH MERGED** у `main@f8d20af9433de5a8e90ec47208ffe14f0e0d88c9`; [exact-head GitHub Actions #41177845597](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41177845597) **SUCCESS**: Node 2781 PASS/0 FAIL/1 SKIP, Worker/D1 22/22, TS/lint/build/Python PASS. [Точна scoped-квитанція](docs/roadmap/SA_EXT_01_EDITION_LANGUAGE_PROTOTYPE_ALIAS_SCOPED_TERMINAL_20261031.md). `remaining_scoped_implementation=0`, `necessary_unmerged_feature_PRs=0` **лише тут**. **Батьківський SA-EXT-01 OPEN**, SA-EXT-03/04 terminal, інші 17 батьківських OPEN. Sites/Windows/Chrome/NVDA/SMTP NOT_VERIFIED; деплою не було.

---

## 2026-10-31 — SA-EXT-16 / TWO AUTHENTICATION ABUSE REPAIRS — SCOPED TERMINAL

**Лише два підтверджені підпункти ЗАКРИТО ДЛЯ ПОДАЛЬШОЇ РОЗРОБКИ / `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`:** (1) надійна IP-ідентичність rate limiter без довіри до клієнтського `X-Forwarded-For` — [PR #885](https://github.com/Oleksii-debug/scripture-archive/pull/885), `main@313a15bf092dbb913e25af8deba821e1dfdadeb0`, [повне CI #41177621085](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41177621085) **SUCCESS**, 46 тестових сценаріїв; (2) відмова від паролів понад 128 символів до дорогого PBKDF2 під час входу — [PR #886](https://github.com/Oleksii-debug/scripture-archive/pull/886), `main@a68a5f8b03ed51e993bec58cdeee6e7e90042acf`, [повне CI #41177763897](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41177763897) **SUCCESS**, 35 сценаріїв. Обидва PR SQUASH MERGED і звірені з головною гілкою. [Повна термінальна квитанція](docs/roadmap/SA_EXT_16_AUTH_ABUSE_BOUNDS_SCOPED_TERMINAL_20261031.md), `remaining_scoped_implementation=0`, `necessary_unmerged_feature_PRs=0` **тільки для цих двох дефектів**. **Повний SA-EXT-16 та інші незавершені батьківські секції залишаються OPEN; SA-EXT-03/04 — TERMINAL.** Живий сайт, реліз, Windows/Chrome/NVDA, email і production D1 NOT_VERIFIED; без публікації.

---

## 2026-10-31 — SA-EXT-16 / AUTH_RATE_LIMITER_UNAVAILABLE — SCOPED TERMINAL

**Лише цей підтверджений дефект ЗАКРИТО ДЛЯ ПОДАЛЬШОЇ РОЗРОБКИ / `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.** Чотири реальні дії `POST /api/auth` (реєстрація, повторне підтвердження, запит відновлення й скидання пароля) тепер повертають контрольований HTTP 503 при недоступному D1 rate limiter, залишаючи 429 для реального перевищення ліміту. [Код PR #882](https://github.com/Oleksii-debug/scripture-archive/pull/882) **SQUASH MERGED** в точний `main@07e070639d5f6f14b25bc34d2bd0559888f20f28`; [реальна exact-head Actions #41176856521](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41176856521) **SUCCESS** (Node, TypeScript, lint, build, Worker/D1, Python). [Остаточна scoped-квитанція](docs/roadmap/SA_EXT_16_AUTH_RATE_LIMITER_503_SCOPED_TERMINAL_20261031.md), 11 доданих регресій, `remaining_scoped_implementation=0`, `necessary_unmerged_feature_PRs=0` **лише для цього дефекту**. **Повний SA-EXT-16 і решта незакритих батьківських SA-EXT залишаються OPEN**; SA-EXT-03/04 уже TERMINAL. Живий Sites SHA, SMTP, Windows, Chrome й фізичне NVDA NOT_VERIFIED; реліз НЕ ОНОВЛЮВАВСЯ.

---

## 2026-10-31 — SA-EXT-01/16 / REGISTRATION_LOCALE_EXACT_TYPED — SCOPED TERMINAL

**ЗАКРИТО ДЛЯ РОЗРОБКИ ЛИШЕ ЦЕЙ ПІДПУНКТ / `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`:** `POST /api/auth?action=register` відхиляє явно нестрокові `locale` до D1/пошти, не обрізає `en-US`/ `ru-RU` до іншого дійсного коду; чинні `uk/ru/en`, null/missing default і текстовий legacy fallback збережені. [Функціональний PR #879](https://github.com/Oleksii-debug/scripture-archive/pull/879) **SQUASH MERGED** у `main@fc4fd29774de1aa084d23e31c564dbf34e21996a`; [точна Actions #41176279283](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41176279283) **COMPLETED SUCCESS** (Node/TS/lint/build/Worker-D1/Python); [квитанція](docs/roadmap/SA_EXT_01_REGISTRATION_LOCALE_EXACT_TYPED_SCOPED_TERMINAL_20261031.md). `remaining_scoped_implementation=0`, `necessary_unmerged_feature_PRs=0` тільки тут. Батьківські SA-EXT-01 та 16 OPEN, SA-EXT-03/04 TERMINAL; live Sites/Windows/NVDA/SMTP NOT_VERIFIED, без релізу.

---

## 2026-10-31 — SA-EXT-16 / AMBIGUOUS_SESSION_COOKIE_AUTHORITY — SCOPED TERMINAL

**ЗАКРИТО ДЛЯ РОЗРОБКИ ТІЛЬКИ ЦЕЙ ПІДПУНКТ / `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.** Канонічний `lib/auth.ts` відхиляє дубльовані cookie `sa_session`/`sa_agent`/`sa_guest` замість небезпечного вибору останнього значення; неоднозначний вихід не повідомляє хибно про відкликання сесії. [Функціональний PR #875](https://github.com/Oleksii-debug/scripture-archive/pull/875) **SQUASH MERGED** у `main@61085c99289ed056a9021887fe1b00154588ef63`; exact-head [GitHub Actions #41175980190](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41175980190) **SUCCESS** (16 виконаних кроків, Node, TypeScript, lint, build, disposable Worker/D1, Python). [Незмінна квитанція з SHA та межами](docs/roadmap/SA_EXT_16_AMBIGUOUS_SESSION_COOKIE_SCOPED_TERMINAL_20261031.md) додана [PR #878](https://github.com/Oleksii-debug/scripture-archive/pull/878) **MERGED** в `main@50e2164c566296e4099dc68b2be6d011e6a6f137`. `remaining_scoped_implementation=0`, `necessary_unmerged_feature_PRs=0` **лише тут**. Повний SA-EXT-16 та 17 інших батьківських розділів залишаються OPEN; реальний Sites SHA/Chrome/Windows/NVDA/SMTP NOT_VERIFIED. Деплою немає.

---

## 2026-10-31 — SA-EXT-16 / REGISTRATION_TYPED_SENSITIVE_FIELDS — SCOPED TERMINAL

**ЗАКРИТО ДЛЯ РОЗРОБКИ ЛИШЕ ЦЕЙ ПІДПУНКТ:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`. Канонічна реєстрація тепер відмовляє у JSON-масивах, об'єктах, boolean і числах для добровільних `denomination`/`church` до D1/пошти, не стираючи мовчки чутливі дані. [Реальний код PR #874](https://github.com/Oleksii-debug/scripture-archive/pull/874) **SQUASH MERGED** у `main@7b39e8eff6e02b1fef12b882a7a82107f7b81272`; [повна exact-head CI #41175964213](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41175964213) **SUCCESS** (Node, TS, lint, build, disposable Worker/D1, Python). [Остаточна квитанція](docs/roadmap/SA_EXT_16_REGISTRATION_TYPED_SENSITIVE_FIELDS_SCOPED_TERMINAL_20261031.md). `remaining_scoped_implementation=0`; `necessary_unmerged_feature_PRs=0` лише тут. Повний SA-EXT-16 і решта 17 незакритих батьківських розділів OPEN; deployed Sites/Windows/NVDA/SMTP NOT_VERIFIED, релізу не було.

---

## 2026-10-31 — SA-EXT-16 / REGISTRATION_LOSSLESS_TEXT_FIELDS — SCOPED TERMINAL

**РОЗДІЛ SA-EXT-16 / підфункція REGISTRATION_LOSSLESS_TEXT_FIELDS — ЗАКРИТО ДЛЯ ПОДАЛЬШОЇ РОЗРОБКИ**, `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`, НЕ весь батьківський розділ. Реальний `POST /api/auth?action=register` відмовляє надмірно довгі імена/добровільні деталі громади до D1 і пошти та зберігає граничні коректні Unicode-значення без скорочення. [PR #872](https://github.com/Oleksii-debug/scripture-archive/pull/872) **SQUASH MERGED** у `main@2c1b3e14677664a7b88d7360394bc433cd119783`; exact-head [Actions #41175126435](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41175126435) **SUCCESS**: Node 2,686 PASS/0 FAIL/1 SKIP, Worker/D1 22/22, TS/lint/build, Python 2 PASS. [Постійна квитанція](docs/roadmap/SA_EXT_16_REGISTRATION_LOSSLESS_TEXT_FIELDS_SCOPED_TERMINAL_20261031.md). `remaining_scoped_implementation=0`, `necessary_unmerged_feature_PRs=0` лише тут. **SA-EXT-16 і решта 17 незакритих батьківських розділів OPEN**; встановлений Sites SHA/Windows/NVDA/SMTP NOT_VERIFIED.

---

## 2026-10-31 — SA-EXT-02 / PRIVATE_READING_BOOK_CODE_EXACT_IDENTITY — SCOPED TERMINAL

**ЗАКРИТО ДЛЯ РОЗРОБКИ лише один реальний дефект, НЕ батьківський SA-EXT-02.** Канонічний `PUT /api/account?action=reading` тепер не перетворює невалідний код книги з пробілами на чинний ідентифікатор збереженого читання. [PR #870](https://github.com/Oleksii-debug/scripture-archive/pull/870) **SQUASH MERGED** у `main@75e453a13beb27a2b89c3725b24feff46db52bc8`. [Exact-head Actions #41174459535](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41174459535) **SUCCESS** (2677 Node PASS, 0 FAIL, 1 SKIP; 22/22 Worker/D1; 2 Python PASS; TypeScript/lint/build PASS). [Остаточна вузька квитанція](docs/roadmap/SA_EXT_02_READING_BOOK_EXACT_IDENTITY_SCOPED_TERMINAL_20261031.md). `remaining_scoped_implementation=0` і `necessary_unmerged_feature_PRs=0` тільки тут. Повний SA-EXT-02 та решта 17 незакритих батьківських розділів залишаються OPEN; Sites SHA/Chrome/Windows/NVDA NOT_VERIFIED.

---

## 2026-10-31 — SA-EXT-01/02 — ДВА ВУЗЬКІ ВИПРАВЛЕННЯ ОСТАТОЧНО ЗАКРИТО ДЛЯ РОЗРОБКИ

**Тільки окремі підфункції `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`, не батьківські розділи.** Після exact-head GitHub Actions SUCCESS [#866](https://github.com/Oleksii-debug/scripture-archive/pull/866) злитий у `main@91e59f5a6fe9810e2a9637eadff4238621f058e5`: канонічна читальня відхиляє небезпечні book codes/неможливі chapter counts. [#867](https://github.com/Oleksii-debug/scripture-archive/pull/867) злитий у `main@39108a68fa37bbf6020a33d0dc43ec8511cf0ea0`: канонічний API не перетворює груповий ID з пробілами на інший справжній ID. **Обидві production-функції і тести повторно прочитані в main.** [Повний доказ](docs/roadmap/SA_EXT_01_02_READER_AND_ATTEMPT_EXACT_SCOPED_TERMINAL_20261031.md). `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0` **лише для двох дефектів**. SA-EXT-01/02 OPEN; SA-EXT-03/04 зберігають parent TERMINAL, ще 16 parent OPEN; deployed Sites SHA/Chrome/Windows/NVDA NOT_VERIFIED.

---

## 2026-10-31 — SA-EXT-01 / PRIMARY_READER_BOUNDED_CHAPTERS — SCOPED TERMINAL

**Лише канонічний захист основної читальні ЗАКРИТО ДЛЯ РОЗРОБКИ / `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.** `public/app.js::getBook` відхиляє великі й розріджені глави до кешу/DOM: до 200 глав, до 256 віршів і 131072 UTF-16 символів на главу; коректні дані й повторний запит збережено. [#864 MERGED](https://github.com/Oleksii-debug/scripture-archive/pull/864) як `main@eb60a7d9a8f90f8287f039887606748c20838de3`; [exact-feature-head Actions #41171867181](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41171867181) **SUCCESS**: 2668 Node PASS/0 FAIL/1 SKIP, 22/22 Worker/D1, TS/lint/build і 2 Python PASS. [Доказ](docs/roadmap/SA_EXT_01_PRIMARY_READER_CHAPTER_BOUNDS_SCOPED_TERMINAL_20261031.md); `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. **SA-EXT-01 повністю OPEN** (ліцензії/редакційні джерела); Sites SHA/Chrome/NVDA/Windows NOT_VERIFIED, деплою не було.

---

## 2026-10-31 — SA-EXT-16 / SAME_SITE_CSRF_ORIGIN_GUARD — SCOPED TERMINAL

**Тільки вузький CSRF-дефект ЗАКРИТО / CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL.** Злитий у main [PR #861](https://github.com/Oleksii-debug/scripture-archive/pull/861), точний `main@c5069df34fc0d54774a9920b7b650fa3fc53c338`. Спільний `sameOrigin` відхиляє піддомени з `Sec-Fetch-Site: same-site`, а справжній auth POST не доходить до D1. [Actual exact-head Actions #41170898839](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41170898839) **SUCCESS**, 2599 Node PASS/0 FAIL/1 SKIP, 22/22 Worker/D1, TS/lint/build/Python SUCCESS. [Постійна квитанція](docs/roadmap/SA_EXT_16_SAME_SITE_CSRF_GUARD_SCOPED_TERMINAL_20261031.md). `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. **SA-EXT-16 parent OPEN**, загальне впровадження/браузер/NVDA/SMTP не перевірені.

## Підтверджені остаточно закриті підфункції SA-EXT-16 (2026-10-31)

**ТІЛЬКИ scoped terminal, не parent closure:** три справжні захищені production mutations змінено, перевірено і злитo в `main`: [#846](https://github.com/Oleksii-debug/scripture-archive/pull/846) `fdb061ab76b577f20874b13c556ff888b7d652c2` (зміна пароля), [#848](https://github.com/Oleksii-debug/scripture-archive/pull/848) `ba7e84cb96d232cde98c25e45026b4c139f44d68` (видалення облікового запису) і [#849](https://github.com/Oleksii-debug/scripture-archive/pull/849) `f4bd52c74a38fc88e14005cf645fb8f42f34a935` (цілісність повного boolean visibility snapshot). **Exact-head CI кожного PR SUCCESS**, третій: 2478 Node PASS / 0 FAIL / 1 SKIP, 22/22 disposable Worker/D1, Python 2 PASS. Канонічний [scoped-terminal receipt](docs/roadmap/SA_EXT_16_AUTH_AND_VISIBILITY_SCOPED_TERMINAL_20261031.md) містить вихідні файли, регресії, SHA та межі. **SA-EXT-16 повністю OPEN**, production/NVDA не підтверджено. Всі 18 parent секцій, окрім 03 і 04, залишаються OPEN, і жодна нова ідея не стає вимогою до вже завершеної підфункції.

## Current-source correction (2026-10-31)

> **Important:** the August 20, 2026 R05 `TEXTUAL_PREPRODUCTION_ACTIVE` snapshot retained **below** is historical. It must not override the later owner-approved product plan, GitHub main, or root `AGENTS.md`. This banner is a dated snapshot, not a floating claim that the live site matches the repository.

**Authoritative current documents:** `AGENTS.md`; [approved 20-section plan](docs/roadmap/SCRIPTURE_ARCHIVE_EXPANSION_SECTION_PLAN_2026-10-28.md); [scope index](docs/EXPANSION_SCOPE_INDEX.md); [central issue #297](https://github.com/Oleksii-debug/scripture-archive/issues/297) and [owner scope #295](https://github.com/Oleksii-debug/scripture-archive/issues/295). Live GitHub cross-check on 2026-10-31: scoped account BFCache fix [#826](https://github.com/Oleksii-debug/scripture-archive/pull/826) merged at `9457b5bb93f032b8deb455aa8964ffeb741d3f34`, and terminal receipt [#831](https://github.com/Oleksii-debug/scripture-archive/pull/831) at `4a5bbecb47c69fbb1260708e3131ae5274a02914`; later workers must refresh live main.

- There is now a real source app: `app/api/*`, `public/app.js`, `public/workspace.js`, reader, mission, community, course and editorial modules, plus CI tests. Do **not** repeat the August assertion that no app/platform source exists.
- **SA-EXT-03 and SA-EXT-04 are already CLOSED_FOR_DEVELOPMENT / TERMINAL for their approved source scope.** Formal parent receipts: [`SA-EXT-03`](docs/roadmap/SA_EXT_03_PARENT_CLOSED_FOR_DEVELOPMENT_TERMINAL_20261031.md), [`SA-EXT-04`](docs/roadmap/SA_EXT_04_PARENT_CLOSED_FOR_DEVELOPMENT_TERMINAL_20261031.md), with accepted source `main@79a8e40cee2c3eb0e0901c5b8b260cb4b0a149c9` and subsequent narrow privacy repairs retained. **The other 18 parent sections SA-EXT-01…20 remain OPEN**, including 01, 02, 05 and 16. A `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` receipt is never a complete parent closure, website release, physical NVDA acceptance, or 82-language coverage. Do not reassign 03/04 wholesale absent a concrete new defect or requirement.
- Two newly merged source improvements: [#518](https://github.com/Oleksii-debug/scripture-archive/pull/518) dossier search `main@4fff3bd6f88ae6628642d8fce3eccd2a7057307b`; [#524](https://github.com/Oleksii-debug/scripture-archive/pull/524) fully sourced narrative atlas `main@75a44e5bf461e94ed2791017c11cec2962b0f404`. Both have test evidence and scoped terminal entries in the approved plan; full sections 05/06 are not terminal. Other worker follow-up [#525](https://github.com/Oleksii-debug/scripture-archive/pull/525) also reconciles filtered dossier selections.
- **CI truth:** exact-head Node/TS/lint/build/Python can pass while the overall workflow remains RED because the disposable Wrangler Worker/D1 tests intermittently return HTTP 503. Investigate existing [draft PR #361](https://github.com/Oleksii-debug/scripture-archive/pull/361); never reinterpret a 21/22 Worker pass as full E2E PASS.
- **Unresolved release controls:** confirm actual Sites deployment SHA and access, DNS/email sender/verification/reset, safe owner Stop/Continue and scheduler, and true browser + Windows/NVDA and privacy/security acceptance before declaring production ready. Historically verified Sites v10/`3a04d12` (26 Oct) is a handoff, not proof of today's live site.
- **New scope is NOT an automatic publish authorization.** The 18+ dating project is separate, opt-in, privacy-sensitive and approved **for planning only**; never mix its user records or release it from the education site by default.

---

# Архів Писання — PROJECT STATUS

**Repository:** `Oleksii-debug/scripture-archive`  
**Date:** 2026-08-20  
**Project phase:** `TEXTUAL_PREPRODUCTION_ACTIVE`  
**Production authorized:** `NO`  
**Canonical content schema:** v1.2  
**Developer round:** `DEV R05 CORRECTIVE RESUBMISSION / INDEPENDENT AUDIT PENDING`  
**Latest independent state consumed:** `AUDIT R05 PRECHECK = BLOCKED / PRE-R05-005 HIGH`  
**Pilot editorial status:** `PILOT_AUDIT_IN_PROGRESS`

## R05 result
R05 closes the developer side of all five AUDIT R04 defects, then consumes the R05 GitHub precheck findings PRE-R05-001..005 before package resubmission.

### AUD-R04-001 — pedagogy/H7
- All 29 LN-02/LN-03 target nodes have node-specific success/partial/failure feedback.
- H1–H7 are progressive and H7 presents an actual answer/evidence explanation before guided progression.
- `mastery_mode` records guided completion after answer reveal.

### AUD-R04-002 — validator depth
- Validator rejects placeholder H7, known generic feedback, bulk-identical effective feedback, invalid retrieval/confidence/TX1 data and overlay errors.
- Effective-node validation applies correction/overlay layers before semantic-shape checks.
- Executable fixtures cover GOOD, BAD-placeholder rejection, overlay-repair PASS and PRE-R05 correction-consumption regressions.
- Static validation is explicitly not treated as semantic audit.

### AUD-R04-003 — TX1 traceability
- Named textual-critical note traceability exists for Luke 22:19–20 and covenant wording in Matthew 26:28 / Mark 14:24.
- Existing Mark rooster and Luke 22:43–44 TX1 chains are retained.
- No originality verdict is required for gameplay.

### AUD-R04-004 — retrieval terminals
- Ambiguous pseudo-campaign destinations from R04 are replaced with named `REVIEW_QUEUE` destinations.
- Whole-pilot retrieval register v0.8 uses explicit terminal classes.

### AUD-R04-005 — throughput
Source-safe useful-unit count before proactive legacy overlays: **170**:
- 29 audited-target node repairs;
- 48 newly canonicalized LN nodes;
- 93 deterministic evidence provenance records (77 LN + 16 accepted PA-02).

Additionally, stricter R05 validation exposed latent weak/generic pedagogy in 63 older JSON canonical nodes. R05 preserves their historical base records and applies an explicit allowed-field pedagogy overlay with canonical precedence.

## R05 GitHub precheck closure
PRE-R05-001..004 are corrected by explicit semantic/evidence sidecars:
- LN11-N01 / EVR-R05-0061: project-defined campaign sequence = C1, not T1;
- LN11-N02/N03/N07 + EVR-R05-0062/0063/0067: John 18:10 and Luke 22:50 both preserve right-ear provenance; Luke 22:51 is healing-specific in the assigned comparison;
- LN11-N04 / EVR-R05-0064: Mark rooster wording is TX1-qualified before grading;
- LN11-N09 / EVR-R05-0069: Luke 22:66 remains a direct witness-local anchor, while merged cross-Gospel chronology is D1/not established.

PRE-R05-005 developer closure:
- `tools/validate_canonical_missions_and_nodes.py` now consumes semantic corrections inside the primary effective-node path **before** pedagogy overlays;
- it also consumes the evidence correction layer and validates effective evidence records;
- deterministic PRE-R05 contracts cover the six named LN-11 nodes and six matching EVR records;
- `tools/test_r05_effective_canonical_state.py` proves positive consumption and rejects broken TX1/D1 sidecar states.

Effective precedence is explicit:
1. base canonical node;
2. semantic correction;
3. pedagogy overlay.

Evidence precedence is base evidence record → evidence correction.

PRE-R05-005 is **developer-closed / independent audit pending**; this file does not self-issue audit PASS.

## LN normalization milestone
Developer-normalized total: **185/185 = 100%**.

Format split is explicit:
- 154 nodes are machine-readable JSON canonical records under 10 mission indexes;
- 31 nodes are the independently accepted normalized Markdown v1.1 layer for LN-07/LN-08.

This project does **not** claim 185 JSON nodes. Independent accepted baseline remains **108/185** until the corrected R05 package passes independent audit.

New R05 canonical missions:
- LN-06 — 16/16;
- LN-10 — 15/15;
- LN-11 — 17/17.

## Whole-pilot developer QA target for corrected R05
- 10 mission indexes;
- 154 JSON canonical nodes;
- 6 semantic corrections;
- 63 pedagogy overlays;
- 1 evidence index / 93 evidence records / 6 evidence corrections;
- PRE-R05 node targets 6/6;
- PRE-R05 evidence targets 6/6;
- main validator errors = 0;
- legacy validator fixtures PASS/REJECT/PASS as designed;
- PRE-R05 effective-state positive/negative regression PASS;
- no production website/app/platform code created.

## Evidence / PA lane
`R05_EVIDENCE_PROVENANCE_REGISTRY_v0.1` contains **93** deterministic records:
- 77 LN;
- 16 PA-02.

PA authored/source-audited developer baseline remains PA-01 + PA-02 = **30 canonical nodes**. PA-03 is not claimed authored in R05.

## Accessibility state
All R05 canonical mechanics retain labelled linear/nonvisual equivalents. Ordering uses numeric or move-up/move-down alternatives. TX1/uncertainty/result state is textual. Final runtime focus behavior remains untested because production implementation is not authorized.

## Next role after package delivery
`AUDITOR` — independently verify corrected DEV R05, including PRE-R05-001..005, exact effective-state validator behavior, 185/185 normalization split, evidence registry, package↔GitHub fidelity and Drive readback. Until that package is delivered and handoff is updated, the workflow remains in R05 and must not start R06.
