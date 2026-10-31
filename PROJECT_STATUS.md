## 2026-10-31 — R0.4 / HTML_NONVOID_SLASH_AND_BOUND_READINESS — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**ОСТАТОЧНО ЗАКРИТО ДЛЯ РОЗРОБКИ ТІЛЬКИ ЦЮ ПІДФУНКЦІЮ, НЕ ВЕСЬ R0.4 ЧИ SA-EXT РОЗДІЛИ.** Після прийнятого конкурентного виправлення прихованих HTML-предків (#1071) канонічна перевірка `lib/community-smoke.mjs` помилково вважала теги `<div hidden/>` та `<script/>` самозакритими (у `text/html` це не так), і не обмежувала глибину вкладення. Старий exact `main` помилково повертав READY у **9/9** негативних source-V8 сценаріїв. [PR #1080](https://github.com/Oleksii-debug/scripture-archive/pull/1080) **SQUASH MERGED** у feature `main@78cf3572a47dfdc5bc9cf8099c87ffb8c0f6bc76`; production `lib/community-smoke.mjs@ac03448ad5377a045e2fda42517a36d64f9ebc50`, тест `tests/community-shell-html-nonvoid.test.mjs@3883f2303b9a562c9d717e135c2ac432241ec9be`. Нові 16 нативних регресій: 9 негативних, 6 позитивних і відновлення; старі перевірки HTML hidden/inline-style/ARIA/void/шести GET збережено. [Exact-head CI #41246380151](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41246380151) **COMPLETED SUCCESS**, Node **3803 PASS / 0 FAIL / 1 SKIP**, disposable Worker/D1 **35 PASS**, Python **2 PASS**, TypeScript/lint/build SUCCESS (lint попередження не є помилками). Інтеграцію і Git SHA readback підтверджено. [Формальний акт](docs/roadmap/R0_4_HTML_NONVOID_READINESS_SCOPED_TERMINAL_20261031.md): `remaining_scoped_implementation=0`, `required_unmerged_scoped_PRs=0`, **CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** тільки для non-void slash і ліміту глибини. Паралельний PR #1076 правильно **CLOSED WITHOUT MERGE** як дубль функцій #1071; жодного перезаписування чужої canonical реалізації. **R0.4 parent, SA-EXT-10/16 і реліз #689 OPEN**, реальний Sites/D1/Windows/Chrome/NVDA та права — **NOT_VERIFIED**. Деплой, міграції, акаунти, листи, розсилка, community scheduler не змінені.

---

## 2026-10-31 — R0.4 / COMMUNITY_PUBLIC_SUMMARY_LOG — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**ОСТАТОЧНО ЗАКРИТО ДЛЯ РОЗРОБКИ ЛИШЕ ВУЗЬКУ ПІДФУНКЦІЮ журналювання R0.4.** Канонічний `scripts/run-community.mjs` друкує тільки перевірені публічні `registered`, `online` й допустимий `visible`, а не всі поля `summary`; некоректні обов'язкові counters, як і раніше, не дозволяють owner-lease. Це захист від можливого надлишкового stdout у разі некоректного upstream payload, не доказ production-витоку. [PR #1074](https://github.com/Oleksii-debug/scripture-archive/pull/1074) **SQUASH MERGED** `main@1b6d560c13581dd5232aa44f3ee63972b5eb5810`; blobs `scripts/run-community.mjs@252f0fcc6479bfdf78851eca8e7c5777dab05740`, `tests/community-runner-summary-boundary.test.mjs@7dbd1451c989027f2264fb48b586a4a146581ae3`. [Exact-head CI #41245932212](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41245932212) **COMPLETED SUCCESS**: native Node, TypeScript, lint, build, disposable Worker/D1 і Python; усі кроки виконані. `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0`; [акт](docs/roadmap/R0_4_COMMUNITY_PUBLIC_SUMMARY_LOG_SCOPED_TERMINAL_20261031.md). R0.4 parent, SA-EXT батьківські та #689 OPEN; реальний Sites/Windows/physical NVDA NOT_VERIFIED. Без деплою, реальних агентів, платежів, email або production DB writes.

---

### 2026-10-31 — SA-EXT-01 / OWN_PARALLEL_EDITION_MAP_PROVENANCE — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**ЗАКРИТО ДЛЯ РОЗРОБКИ лише одну реальну межу атрибуції прав паралельної читальні; SA-EXT-01 parent OPEN.** `mountParallelReader` відхиляє успадковані карти видань/перекладів і locale-ключі, які раніше могли підмінити source/license під дійсними рядками біблійного тексту. Власні авторитетні записи видання, коректний fallback, справжня локалізована невдача й повтор працюють без другого сервера. Це доказ виправлення пошкодженого *in-memory* каталогу, а не твердження про production злам.

[Функціональний PR #1073](https://github.com/Oleksii-debug/scripture-archive/pull/1073) **SQUASH MERGED** у точний feature `main@454067a80e0af17d14fddb4a61c927611fc7f5b8`; source blob `0c9b35c22f1506c01e916602043d15d67d031f07`, test blob `6e39340f9289eac79cc484df89bad22da5374cc7`. [Exact-head GitHub Actions #41245903139](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41245903139) **COMPLETED SUCCESS**: native Node, TypeScript/lint/source build, disposable Worker/D1, Python PASS. [Термінальний акт](docs/roadmap/SA_EXT_01_OWN_PARALLEL_EDITION_MAP_PROVENANCE_SCOPED_TERMINAL_20261031.md), `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0`, **CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** лише підфункція. Батьківський SA-EXT-01 та загальний реліз #689 OPEN; чинні права видань, живий Sites/D1, backup, браузер, Windows/фізичний NVDA **NOT_VERIFIED**. Жодного деплою, розсилки, міграцій, зміни production-даних чи нових мов.

---

## 2026-10-31 — R0.4 / DIRECT_HIDDEN_SHELL_READINESS — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**ЗАКРИТО ДЛЯ ПОДАЛЬШОЇ РОЗРОБКИ ЛИШЕ ЦЕ ВУЗЬКЕ ВИПРАВЛЕННЯ, НЕ R0.4, SA-EXT-10/16 АБО РЕЛІЗ.** Канонічна read-only перевірка `lib/community-smoke.mjs` після #1068 усе ще приймала `<main id="main" hidden>` чи схований навігаційний лінк як видиму сторінку. [PR #1072](https://github.com/Oleksii-debug/scripture-archive/pull/1072) **SQUASH MERGED** у точний feature `main@30f2b7c14d55fa96a8eed8f2ba13748bb050b83b`; production blob `c38891682ddf423d62b05238175506f7154dfa6b`, regression blob `74d916dc367f984405d9d2d6fac3c85de7aada99`. Перевірка відхиляє власні `hidden`, `inert`, `aria-hidden=true` у html/body/main/посиланні, зберігає канонічні позитивні сценарії та не плутає `data-*` з атрибутами доступності. На незміненій baseline 52/52 негативні випадки помилково давали READY; виправлено 52/52, збережено 24/24 позитивні, додано 1 recovery. [Точний CI #41245745253](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41245745253) **COMPLETED SUCCESS**: Node **3778 PASS / 1 SKIP / 0 FAIL**, disposable Worker/D1 **35 PASS**, Python **2 PASS**, TypeScript, lint, build SUCCESS. [Scoped-акт](docs/roadmap/R0_4_DIRECT_HIDDEN_SHELL_SCOPED_TERMINAL_20261031.md). `remaining_scoped_implementation=0`, `required_unmerged_scoped_PRs=0` лише щодо **прямих** атрибутів; приховані предки та інші source/browser перевірки — окремий вузький scope, не приховуються. **R0.4 parent, SA-EXT-10/16 і #689 залишаються OPEN**, installed Sites/D1, браузер, Windows/NVDA не підтверджені. Деплой, пошта, scheduler, платіжні й production-дані не змінені.

---

## 2026-10-31 — R0.4 / VISIBLE_SSR_ANCHORS — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**ЗАКРИТО ДЛЯ ПОВТОРНОЇ РОЗРОБКИ ЛИШЕ ВУЗЬКУ ПІДФУНКЦІЮ R0.4 / VISIBLE_SSR_ANCHORS.** Реальна read-only перевірка готовності спільноти більше не приймає за HTML-інтерфейс неактивні розмітки у `script`, `style`, `template`, `noscript`, `textarea`, атрибутах і підмінені `data-id` / `data-data-route`. Перевіряються справжні елементи у `body`, точний `main#main` та посилання `a[href="/community"][data-route="community"]`; попереднє виправлення HTML-коментарів #1065 збережене. Наявний `lib/community-smoke.mjs`, без другого сервера.

**Код:** [PR #1068](https://github.com/Oleksii-debug/scripture-archive/pull/1068) **SQUASH MERGED**: `main@85fc3735ba838ecdd3643658a080d3d8179f9de2`. Source blob `94ffe189eb3796d8117a0428aa4c8dd4be9cd0ae`; regression blob `7206dd4c6b532171f33b8b33f0f8393db91c101e`. Тести: [exact PR-head Actions #41245426232](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41245426232) **COMPLETED SUCCESS**: native Node, TypeScript, lint, source build, disposable Worker/D1, Python. Локальний ізольований Node 22.16 на початковому parser source: 10 test cases, 9 failing; після виправлення 10/10 PASS; на відтвореній post-#1065 comment-filter логіці ще 7/10 RED, але це не окреме source-hash-verified CI приймання. Придатність реального SSR підтверджена позитивним регресійним сценарієм.

`remaining_scoped_implementation=0`; `necessary_unmerged_scoped_PRs=0`; **CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** лише цієї межі перевірки. Батьківський R0.4, SA-EXT-01/02/05–20 і реліз #689 залишаються OPEN; SA-EXT-03/04 source-terminal, live Sites/D1/Chrome/Windows/physical NVDA, production upgrade/backup та owner signoff **NOT_VERIFIED**. Ця PR не виконувала деплой, міграцію, запуск спільноти, відправлення листів чи зміну особистих даних. Без нової конкретної регресії не відкривати цей scoped slice знову.

[Незмінний акт](docs/roadmap/R0_4_VISIBLE_SSR_ANCHORS_SCOPED_TERMINAL_20261031.md) · [Координація #297](https://github.com/Oleksii-debug/scripture-archive/issues/297).

---

## 2026-10-31 — SA-EXT-05 / DOSSIER_TYPED_QUERY_FAIL_CLOSED — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**Закрито для розробки лише конкретну підфункцію, НЕ весь SA-EXT-05.** Канонічний `dossierMarkup` більше не трактує явно нестроковий пошуковий фільтр як відсутній: замість автоматичного показу стороннього досьє та його біблійних посилань повертає локалізований `role="alert"`. Звичайний GET браузера передає строку; це дефект прямого контракту рендерера, **не доведений production-витік**. [PR #1066](https://github.com/Oleksii-debug/scripture-archive/pull/1066) **SQUASH MERGED** `main@b5d66aebcbc8aaf5f64081c51762756773576d1e`, source blob `1fa5afc35deca37be043d134f0a98ef793a92dcf`; 30/30 фактичних V8 RED до виправлення, 30/30 GREEN після, 12/12 позитивних без змін на реальному каталозі. Перший CI #41245227935 **FAIL** через помилку нового тестового assertion, виправлено; [остаточний exact-head CI #41245341526](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41245341526) **COMPLETED SUCCESS**: 3687 Node PASS/1 SKIP, 35 Worker/D1 PASS, 2 Python PASS, TS/lint/build SUCCESS. [Незмінний акт](docs/roadmap/SA_EXT_05_DOSSIER_TYPED_QUERY_SCOPED_TERMINAL_20261031.md). `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0` **лише для цієї підфункції**. **SA-EXT-01/02/05/06/07 батьківські OPEN; 03/04 source-terminal.** Видавничі права, редакційне приймання, реальний браузер/NVDA, Sites/D1, backup та реліз #689 **NOT_VERIFIED**. Production, 82 мови, платежі, розсилки й dating не змінювалися.

---

## 2026-10-31 — R0.4 / COMMUNITY_COMMENT_ONLY_SHELL_READINESS — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**ЗАКРИТО ДЛЯ ПОДАЛЬШОЇ РОЗРОБКИ ЛИШЕ ЦЮ ПІДФУНКЦІЮ, НЕ ВЕСЬ R0.4 ЧИ РЕЛІЗ.** Раніше канонічний `communityDeploymentReady()` помилково визнавав робочим інтерфейсом `/community` HTML-сторінку, в якій потрібні `main` і `data-route` були лише у невидимому HTML-коментарі. [PR #1065](https://github.com/Oleksii-debug/scripture-archive/pull/1065) **SQUASH MERGED** в exact `main@fb2ed6689a358b19c29aeb1f80140b17a4d536c7`; source `lib/community-smoke.mjs@a22ef7ffb85dc277fc4ecf0d8790f6f95f9d61a5`, committed regression `tests/community-smoke-comment-markup.test.mjs@d2a57d73248845eb608ce2a4648544fc261d14e3`. [Exact-head CI #41245134293](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41245134293) **COMPLETED SUCCESS**: native Node, TypeScript, lint, build, disposable Worker/D1, Python. [Остаточний scoped акт](docs/roadmap/R0_4_COMMUNITY_COMMENT_ONLY_SHELL_SCOPED_TERMINAL_20261031.md). `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_feature_PRs=0`, **CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL**. Батьківські R0.4/SA-EXT та release #689 OPEN; live Sites SHA/D1, backup, browser, Windows/NVDA **NOT_VERIFIED**. Жодного розгортання, запуску агентів або production mutation.

---

## 2026-10-31 — SA-EXT-02 / CHAPTER_FOREIGN_MISSION_ISOLATION — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**ЗАКРИТО ЛИШЕ ЦЮ ВУЗЬКУ ПІДФУНКЦІЮ, НЕ SA-EXT-02 PARENT.** Відкриття глави у канонічній місії `OT-AB-01` більше не анулює активні спроби іншої місії того самого користувача та глави. `POST /api/attempts?action=chapter` використовує перевірений серверний `MISSION_ID`, зберігає всі власні personal/group контексти, atomic D1 receipts та інші обмеження. Доведено на SQLite; після першого CI FAIL виправлено старий concurrency fixture. [PR #1058](https://github.com/Oleksii-debug/scripture-archive/pull/1058) **SQUASH MERGED** у exact feature `main@8488c748a5ec9d6fdc89489721466fc7dab093f1`; [exact-head CI #41244571866](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41244571866) **COMPLETED SUCCESS**: native Node 3680 PASS / 0 FAIL / 1 SKIP; Worker/D1 32/32 PASS; Python 2/2 PASS; TypeScript/lint/source build SUCCESS. [Immutable scoped terminal receipt](docs/roadmap/SA_EXT_02_CHAPTER_FOREIGN_MISSION_SCOPED_TERMINAL_20261031.md). `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_feature_PRs=0`; **CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL**. **SA-EXT-02 PARENT OPEN / release #689 OPEN**; real Sites SHA/D1/Windows/NVDA NOT_VERIFIED; production/deploy unchanged.

---

## 2026-10-31 — SA-EXT-02 / FOREIGN_INVALIDATED_MISSION_STATUS — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**РОЗДІЛ SA-EXT-02 / підфункцію FOREIGN_INVALIDATED_MISSION_STATUS — ЗАКРИТО ДЛЯ ПОДАЛЬШОЇ РОЗРОБКИ, НЕ ВЕСЬ БАТЬКІВСЬКИЙ SA-EXT-02.** `GET?action=current` і `POST?action=answer` у канонічному `app/api/attempts/route.ts` більше не позначають чужу анульовану місію як анульовану власну; `409 attempt_state_invalid` для іншої `mission_id`, `409 attempt_invalidated` для правильної місії. [PR #1056](https://github.com/Oleksii-debug/scripture-archive/pull/1056) **SQUASH MERGED** в `main@1bc97d581fd2bf2546b8421ee2d409bf4b0b82ce`; source blob `361fec23b01e3264e51ee5e2cf6edc8916e3e6fb`, test blob `4f5ae2bdf5154356767c6fa3c0cd2785aca806cf`; 4 нові route-executing сценарії. [Exact-head CI #41244218163](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41244218163) **COMPLETED SUCCESS**: native Node, TS, lint/build, disposable Worker/D1, Python. [Офіційний scoped акт](docs/roadmap/SA_EXT_02_FOREIGN_INVALIDATED_STATUS_SCOPED_TERMINAL_20261031.md). `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0`; **CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** лише ця частина. SA-EXT-02 parent, release #689 OPEN; live Sites, production D1, browser, Windows/NVDA, backup, source rights **NOT_VERIFIED**. Немає розгортання чи зміни live даних.

---

## 2026-10-31 — R0.4 / COMMUNITY_RUNNER_SUMMARY_BOUNDS — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**ЗАКРИТО ЛИШЕ ЦЕЙ ВУЗЬКИЙ РЕЛІЗНИЙ ДЕФЕКТ, НЕ ВЕСЬ R0.4 АБО SA-EXT-01–20.** У справжньому `scripts/run-community.mjs` неможливі публічні counts (від'ємні, >MAX_SAFE_INTEGER, `online>registered`) раніше дозволяли `--agents` відправити owner lease-POST; native loopback CLI RED **5/9**, після виправлення **9/9 PASS**, `node --check` 0, окремий read-only smoke 41/41 PASS. [PR #1055](https://github.com/Oleksii-debug/scripture-archive/pull/1055) **SQUASH MERGED** у точний feature `main@44894fbc18fea7e6e7ab7da6f38ff789fb43f3b8`; source blob `49158423c68d4515d32a05b732d30b6007e5e251`, regression `188931b98ffff6d994ba9bee81360fce9e8b671a`; [exact PR-head CI #41244058854](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41244058854) **COMPLETED SUCCESS**: Node, TypeScript, lint, build, disposable Worker/D1, Python. [Акт](docs/roadmap/R0_4_COMMUNITY_RUNNER_SUMMARY_BOUNDS_SCOPED_TERMINAL_20261031.md). `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0`, **CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** тільки тут. **Батьківські R0.4/SA-EXT-01–20 і реліз #689 OPEN**; installed Sites/D1, Windows/Chrome/фізичний NVDA NOT_VERIFIED. Жодного деплою, запуску агентів чи дій із production-даними.

---

## 2026-10-31 — SA-EXT-02 / FOREIGN_MISSION_GRADING_AND_INVALIDATION — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**ЗАКРИТО ЛИШЕ НОВУ ВУЗЬКУ ПІДФУНКЦІЮ, НЕ ВЕСЬ SA-EXT-02.** Після завершеного ремонту #1051 залишалися два окремі переходи: `GET current` показував `grading:true` для чужої збереженої `mission_id`, а `POST invalidate` міг змінити статус активної спроби іншої місії. Тепер канонічний `app/api/attempts/route.ts` повертає `409 attempt_state_invalid` до цих дій. [PR #1053](https://github.com/Oleksii-debug/scripture-archive/pull/1053) **SQUASH MERGED** до exact feature `main@1f26af1ad9f85e6e109a83e7021c1443a2c7323d`, source blob `209b3d90324d5e8dedee0486f5b0257845692801`, test blob `e64f05987b6bbec754817c85110851c182d59faf`; три додаткові route-executing регресії. [Exact-head CI #41243828129](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41243828129) **COMPLETED SUCCESS**: native Node, TypeScript, lint, build, disposable Worker/D1, Python. [Офіційний акт](docs/roadmap/SA_EXT_02_FOREIGN_MISSION_GRADING_INVALIDATION_SCOPED_TERMINAL_20261031.md). `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_feature_PRs=0`, **CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL**; попередній scoped #1051 залишається завершеним. **SA-EXT-02 parent OPEN, release #689 OPEN.** Installed Sites/D1, browser/Windows/фізичний NVDA NOT_VERIFIED; без деплою чи зміни production-даних.

---

## 2026-10-31 — SA-EXT-02 / FOREIGN_COMPLETED_MISSION_PROVENANCE — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**ЗАКРИТО ЛИШЕ ЦЮ ПІДФУНКЦІЮ, НЕ ВЕСЬ SA-EXT-02.** Канонічний `app/api/attempts/route.ts` більше не видає за успішно завершену місію Авраама пошкоджений/історичний D1-запис іншої `mission_id` з правдоподібними оцінками й не допускає його до фінального оцінювання. Реалізація [PR #1051](https://github.com/Oleksii-debug/scripture-archive/pull/1051) **SQUASH MERGED** в `main@7cb9d98984742dc5e5a19bc7dfb91b560b135d2a`, source blob `24e7a0a38d6914b030032d907c9d0d0bd71406fb`; 7 нових route-executed регресій, test blob `c6468547a3218f7d6b91062a2afb3b26c7ff2dad`. Exact-head [CI #41243412489](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41243412489) **COMPLETED SUCCESS**: нативний Node, TypeScript, lint, source build, disposable Worker/D1, Python. [Офіційний вузький акт](docs/roadmap/SA_EXT_02_FOREIGN_COMPLETED_MISSION_PROVENANCE_SCOPED_TERMINAL_20261031.md). `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_feature_PRs=0`, **CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL**. Це контроль цілісності пошкодженого запису, не твердження про production-атаку. **SA-EXT-02 батьківський OPEN; реліз #689 OPEN.** Sites/production D1/Chrome/Windows/фізичний NVDA **NOT_VERIFIED**. Немає деплою, міграцій, листів чи зміни приватних даних.

---

## 2026-10-31 — SA-EXT-02 / PERSISTED_ACTIVE_CURSOR_BOUNDARY — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**ЗАКРИТО ЛИШЕ ВУЗЬКИЙ ДЕФЕКТ АКТИВНОГО КУРСОРА, НЕ БАТЬКІВСЬКИЙ SA-EXT-02.** Канонічні GET current і POST answer відмовляють за дробового/строкового/завищеного збереженого `task_limit`, нецілого/некоректного `current_index` або чужої `mission_id` до приватного показу завдання чи запису D1. Немає альтернативної реалізації. [PR #1049](https://github.com/Oleksii-debug/scripture-archive/pull/1049) **SQUASH MERGED** у exact `main@f8d05f1d6c58f927b0b670d17d1680be2b16c04b`, production blob `cc13cef83df190421a3d9c53a45a53a71cc06d18`, new regression blob `603cb21d3c0ce05ad4d53883e409d95f9873424a`; 17 committed route-executing checks. [Exact-head CI #41242945949](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41242945949) **COMPLETED SUCCESS**: native Node, TS, lint, build, disposable Worker/D1 та Python. [Формальний scoped акт](docs/roadmap/SA_EXT_02_PERSISTED_ACTIVE_CURSOR_SCOPED_TERMINAL_20261031.md). `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0`, **CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** тільки для цієї підфункції. SA-EXT-02 parent і реліз #689 OPEN; live Sites/D1/Chrome/Windows/NVDA NOT_VERIFIED. Деплой, production дані, cron/email/платежі не змінено.

---

## 2026-10-31 — SA-EXT-01 / CANONICAL_TESTAMENT_IDENTITY — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**ЗАКРИТО ДЛЯ РОЗРОБКИ ЛИШЕ ПЕРЕВІРКУ OT/NT ІДЕНТИЧНОСТІ, НЕ ВЕСЬ SA-EXT-01.** Чинний `validBibleCatalog` уже перевіряв канонічні 66 кодів, але приймав помилкове позначення `GEN` як `NT` або `MAT` як `OT`, якщо всі локалі й видання були узгоджено пошкоджені: `testament` перевірявся лише на допустимі значення, не на відповідність книзі. Тепер перші 39 канонічних книг мають `OT`, останні 27 — `NT`; перевірені тексти, переклади, ліцензії та законні відмінності числа глав залишилися незмінними. Це контроль пошкодженого in-memory каталогу, **не твердження про реальну production-атаку**.

[Функціональний PR #1043](https://github.com/Oleksii-debug/scripture-archive/pull/1043) **SQUASH MERGED** у exact `main@1e5dd16121b014682a748d0d36a4034f1b864c1a`, production blob `public/app.js@39d85ed7411a9a21d09c47d4303542e4b4df7dcd`, regression blob `tests/reader-catalog-runtime-boundary.test.mjs@fd54b91e712cae4bbdb4a866c97d331d1cde57a2`. Exact previous-source V8 accepted globally false OT/NT labels (RED); patched V8 **68/68 PASS** (66 негативних позицій, canonical positive, JOL chapter variation). Це ізольовані source-executed перевірки, не native браузер. [Exact PR-head GitHub Actions #41242659531](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41242659531) `COMPLETED SUCCESS` на `7da3367cd3319ab47e4d2bf85d35875a4e1d4509`: native Node, TypeScript, lint, build, disposable Worker/D1 і Python — всі кроки SUCCESS.

`remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0` і **CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** лише для цієї перевірки. **SA-EXT-01/02/05/06/07 батьківські OPEN; SA-EXT-03/04 source TERMINAL.** Права на переклади, редакційне приймання, реальний Chrome/Windows/фізичний NVDA, Sites/D1/backup та release #689 **NOT_VERIFIED**. Без деплою, міграцій, 82 мов, платежів, synthetic users, розсилок або dating.

---

## 2026-10-31 — SA-EXT-16 / SUPPORT_DOCX_LOCAL_HEADER_INTEGRITY — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**ЗАКРИТО ЛИШЕ ЦЮ ПІДФУНКЦІЮ; SA-EXT-16 parent OPEN.** Канонічний `POST /api/help` тепер звіряє центральні та локальні ZIP-заголовки DOCX: сигнатуру, буквальні байти імені, flags, method, offset і розміри. Підроблені центральні назви вже не достатні для приймання вкладення. [PR #1042](https://github.com/Oleksii-debug/scripture-archive/pull/1042) **SQUASH MERGED**, feature `main@8cc20ce895dcf68f3863e44e270da0f6d667ea69`; [exact-head CI #41242568090](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41242568090) **SUCCESS**: Node/TS/lint/build/disposable Worker-D1/Python; 11 нових реальних source-helper регресій. `remaining_scoped_implementation=0`, `required_unmerged_scoped_PRs=0`. Live Sites/D1/backup, email, Windows/browser/NVDA, release #689 **NOT_VERIFIED**. Жодного деплою, міграції чи відправлення листів.

[Scoped terminal receipt](docs/roadmap/SA_EXT_16_SUPPORT_DOCX_LOCAL_HEADER_INTEGRITY_SCOPED_TERMINAL_20261031.md).

---

## 2026-10-31 — R0.4 / PUBLIC_SUMMARY_CACHE_AND_ANON_EXACT_SHAPE — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**ЗАКРИТО ДЛЯ ПОВТОРНОЇ РОЗРОБКИ ЛИШЕ ЦЕ P0-ВИПРАВЛЕННЯ, НЕ ВЕСЬ R0.4, SA-EXT-10/16 ЧИ РЕЛІЗ.** Read-only `lib/community-smoke.mjs::communityDeploymentReady` тепер не визнає готовим кешований `/api/community?public=summary` без окремого `Cache-Control: no-store`, а також анонімний `/api/account?action=me` з будь-яким зайвим полем поряд із `user:null`. Канонічні GET уже забезпечують `no-store` та `{user:null}`. Це доведена локальна хибнопозитивна перевірка готовності, **не** доказ реального витоку чи злому production.

[Source PR #1040](https://github.com/Oleksii-debug/scripture-archive/pull/1040) **SQUASH MERGED** у `main@afb33edac75af68395fe8b9ac8c52b64e5dea26f`. Production blob `4db3745fc538ad67c17b9a4e6e4e2134b0eea522`, 34 нові Node негативні/recovery сценарії `c1417bdaaa65611ca0a6fe27f80311413d23644a`. [Exact PR-head CI #41242395430](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41242395430) **COMPLETED SUCCESS**: **3625 native Node PASS / 1 SKIP**, **30 Worker/D1 PASS**, **2 Python PASS**, TypeScript/lint/build SUCCESS. [Офіційний scoped акт](docs/roadmap/R0_4_SUMMARY_CACHE_AND_ANON_EXACT_SHAPE_SCOPED_TERMINAL_20261031.md). `remaining_scoped_implementation=0`; `necessary_unmerged_scoped_PRs=0`; **CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** лише цей дефект.

**Батьківські R0.4, SA-EXT-10/16 і release #689 OPEN.** Sites deployed SHA/D1, backup, email, live scheduler, Windows/Chrome/NVDA і фінальний реліз NOT_VERIFIED. Жодних deployment, міграцій, змін користувацьких даних чи автоматичного старту спільноти.

---

## 2026-10-31 — SA-EXT-01 / CANONICAL_66_BOOK_CODE_ANCHOR — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**ЗАКРИТО ЛИШЕ ОДНУ ВУЗЬКУ ПІДФУНКЦІЮ, НЕ ВЕСЬ SA-EXT-01.** У чинному `public/app.js::validBibleCatalog` український список із 66 книг раніше слугував сам собі еталоном. Узгоджена перестановка GEN/EXO або GEN/REV в усіх локалях і виданнях, або підміна GEN на вигаданий код `ZZZ`, проходила перевірку та могла приписувати текстам неправильну канонічну ідентичність. Тепер перевірка вимагає точний затверджений порядок 66 кодів перед reader/fetch/citation; окремі легальні числа глав різних видань збережені. Це перевірка **пошкодженого in-memory каталогу**, не твердження про production-атаку; окремого джерела текстів чи сервера не створено.

[Функціональний PR #1039](https://github.com/Oleksii-debug/scripture-archive/pull/1039) **SQUASH MERGED** в exact `main@8c3d2b19183174e017ac59150e40b2aeeaf58117`; production blob `public/app.js@ced82943e3962f886d51e74c09515fe0151cee9a`, regression blob `tests/reader-catalog-runtime-boundary.test.mjs@81c1ef5e10c30269bf4f7427c36e5acabfedbbb9`. Exact old-source V8: **3/3 негативних RED**; fixed-source V8 **200/200 PASS** (66 замін, 65 перестановок, 66 одно-локальних замін, валідний каталог, JOL chapter variation, inherited-getter fail-closed). Це не браузерний тест. [Exact-head GitHub Actions #41242325589](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41242325589) `COMPLETED SUCCESS` на head `8be1582de213bac427a2fd7c9732055b27e8b254`: **native Node, TypeScript, lint, build, disposable Worker/D1, Python** усі кроки SUCCESS.

Для цієї підфункції `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0`, **CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL**. **Батьківські SA-EXT-01/02/05/06/07 OPEN; 03/04 source TERMINAL.** Права видань/перекладів, редакційне приймання, живий Sites/D1, Chrome/Windows/фізичний NVDA, backup/recovery і release #689 **NOT_VERIFIED**. Production, міграції, користувацькі дані, 82 мови, платежі, розсилки, synthetic users і dating не змінено.

---

## 2026-10-31 — R0.4 / SIGNED_DISPATCH_CACHE_READINESS — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**ЗАКРИТО ЛИШЕ ВУЗЬКЕ ВИПРАВЛЕННЯ КЕШОВАНОЇ ВІДПОВІДІ ПЛАНУВАЛЬНИКА.** Канонічний read-only `communityDeploymentReady` тепер перевіряє, що HTTP-204 `/api/community/dispatch` із правильним протоколом має справжній `Cache-Control: no-store`, і відмовляє за відсутнього, кешованого або удаваного значення. [PR #1037](https://github.com/Oleksii-debug/scripture-archive/pull/1037) **SQUASH MERGED** `main@0f6edac2e2067de1285b6466680111ea5d14a714`; production blob `f098b30ff0e8807f22f296e390ac717df4db05b2`, native test blob `ebf9146dd234cd1ac91106116805d74573a37797`. [Exact-head Actions #41241876304](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41241876304) **COMPLETED SUCCESS**: Node, TypeScript, lint/build, disposable Worker/D1, Python. [Scoped акт](docs/roadmap/R0_4_SIGNED_DISPATCH_CACHE_READINESS_SCOPED_TERMINAL_20261031.md), `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0` лише тут. **R0.4, SA-EXT-10/16, реліз #689 OPEN**; live Sites/D1, owner controls, backup/restore, email, Chrome/Windows/NVDA — NOT_VERIFIED. Немає розгортання чи старту спільноти.

---

## 2026-10-31 — R0.4 / ANONYMOUS_ACCOUNT_READINESS_PRIVACY — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**ЗАКРИТО ЛИШЕ ЦЕ ВИПРАВЛЕННЯ, НЕ ВЕСЬ R0.4 ЧИ SA-EXT-16.** Канонічна read-only перевірка `lib/community-smoke.mjs` тепер відхиляє анонімний `/api/account?action=me` з приватним `user`, неправильною JSON-структурою або кешованою відповіддю без окремої директиви `Cache-Control: no-store`. [PR #1035](https://github.com/Oleksii-debug/scripture-archive/pull/1035) **SQUASH MERGED** `main@fdb0cda2bc6a72256ff4303e9108f205e1491a65`; source blob `69078e48a48f3077af2006611563ffe56d822829`, regression blob `8147790cc4361473084d95b9cf4aa96e9e23b18f`. [Exact-head GitHub Actions #41241377501](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41241377501) **COMPLETED SUCCESS** (native Node, TypeScript, lint/build, disposable Worker/D1, Python). [Повний scoped акт](docs/roadmap/R0_4_ANONYMOUS_ACCOUNT_READINESS_PRIVACY_SCOPED_TERMINAL_20261031.md). `remaining_scoped_implementation=0`, `required_unmerged_scoped_PRs=0` лише тут. **R0.4, SA-EXT-10/16 і release #689 OPEN**; живий Sites/D1, backup, email, Chrome/Windows/NVDA та production реліз NOT_VERIFIED, розгортання не виконувалося.

---

## 2026-10-31 — SA-EXT-01 / PRIMARY_READER_OWN_SOURCE_AUTHORITY — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**ЗАКРИТО ЛИШЕ ВУЗЬКИЙ ДЕФЕКТ, НЕ БАТЬКІВСЬКИЙ SA-EXT-01.** Чинний `public/app.js::validBibleCatalog` відхиляє успадковані через прототип поля біблійного каталогу, локалі, коди/назви книг і ID видань. `getBook` та `renderReader` беруть локальний список видання лише за власним ключем, а не з неперевіреного прототипу. [PR #1030](https://github.com/Oleksii-debug/scripture-archive/pull/1030) **SQUASH MERGED** `main@cf88f93a5f2714e1de0808500fd4e937232bbf71`; source blob `120155b0e2e5b0aeae4225ae4edb57c68fbc3905`, regression blob `25c3ba6d703fe6e896cb21dcbc833dab7d382459`. Старий source з реальним каталогом 9/9 негативних випадків помилково приймав; виправлений V8 11/11 PASS. Початковий CI #41240900178 FAIL через тестовий harness/cross-realm; виправлено й [final exact-head CI #41241026959](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41241026959) **SUCCESS**: **3584 native Node PASS / 1 SKIP, 26 Worker/D1 PASS, 2 Python PASS, TypeScript/lint/build PASS**. [Канонічний scoped акт](docs/roadmap/SA_EXT_01_PRIMARY_READER_OWN_SOURCE_AUTHORITY_SCOPED_TERMINAL_20261031.md). `remaining_scoped_implementation=0`, `required_unmerged_scoped_PRs=0` лише для цієї функції. **SA-EXT-01/02/05/06/07 parent OPEN; 03/04 source TERMINAL.** Ліцензії, реальний браузер/NVDA, Sites/D1, backup і реліз НЕ ПІДТВЕРДЖЕНО; деплою/міграцій не було.

---

## 2026-10-31 — SA-EXT-02 / MISSION_INDEX_MANIFEST_RETRY — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**Лише дефект перегляду індексу навчальних місій ЗАКРИТО ДЛЯ РОЗРОБКИ, НЕ весь SA-EXT-02.** Канонічна сторінка `public/app.js::renderMissions()` тепер перевіряє HTTP-200 manifest до використання мови/назви/опису/кількості/глав; пошкоджені дані не зберігаються в кеші й не зривають маршрут, а повертають локалізовану кнопку повторного запиту. Асинхронна відповідь чужого акаунта/сторінки не перезаписує поточний UI. Реальний блокувальний `locked:true` та коректний `uk/ru/en` залишаються робочими. [PR #1031](https://github.com/Oleksii-debug/scripture-archive/pull/1031) **SQUASH MERGED** `main@81ea0493da460aa219941ca8c0e5972ca1347159`; production blob `7b11ffb6684c6df6ebfcd99f753c4676de198a90`; regression blob `056f9fe578c547e4e88382836975ad0a09c1b0c6`. [Exact-head Actions #41240988790](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41240988790) **SUCCESS**: Node, TypeScript, lint/build, disposable Worker/D1, Python. [Термінальний акт](docs/roadmap/SA_EXT_02_MISSION_MANIFEST_RETRY_SCOPED_TERMINAL_20261031.md): `remaining_scoped_implementation=0`, `required_unmerged_scoped_PRs=0`, `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` тільки для цього виправлення. **SA-EXT-02 parent OPEN; SA-EXT-03/04 parent TERMINAL**, реальний Sites/D1, Chrome/Windows/NVDA та загальний реліз не перевірено, деплою немає.

---

## 2026-10-31 — SA-EXT-02 / MALFORMED_MISSION_TASK_RETRY — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**ЗАКРИТО ДЛЯ РОЗРОБКИ ЛИШЕ ВІДТВОРЕНИЙ ДЕФЕКТ ВІДПОВІДІ НАВЧАЛЬНОЇ МІСІЇ, НЕ БАТЬКІВСЬКИЙ SA-EXT-02.** Канонічна `public/app.js::renderMission` тепер до рендерингу перевіряє тип завдання, індекс, загальну кількість, питання й щільні масиви відповідей в успішному HTTP-200 `current/finalize`. Несправжній DTO не створює кнопок відповідей, не відображає невірний прогрес або оцінку, а переходить до локалізованого retry у чинному інтерфейсі. [PR #1027](https://github.com/Oleksii-debug/scripture-archive/pull/1027) **SQUASH MERGED** `main@ce0127de8140af8a7a3647b0c431eeb74ce26c10`. Production blob `9ee9e1a4f56ffeebd261a673d7f835ac69b6e079`, regression `ae9d8431339a39751ecd383376449dcaa789d7c7`. [Exact-head GitHub Actions #41240578088](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41240578088) **SUCCESS**: native Node, TypeScript, lint, build, disposable Worker/D1, Python. [Незмінний акт](docs/roadmap/SA_EXT_02_MALFORMED_TASK_RETRY_SCOPED_TERMINAL_20261031.md): `remaining_scoped_implementation=0`, `required_unmerged_scoped_PRs=0`, **CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** лише для дефекту. Батьківський **SA-EXT-02 OPEN**, SA-EXT-03/04 parent TERMINAL. Реальний Sites/D1, Windows/NVDA, ширші навчальні матеріали й release #689 **NOT_VERIFIED**; деплою та міграцій немає.

---

## 2026-10-31 — SA-EXT-01 / CANONICAL_BIBLE_BOOK_ORDER — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**Закрито для розробки лише перевірку канонічного порядку 66 книг, НЕ весь батьківський SA-EXT-01.** Наявний `public/app.js::validBibleCatalog` не приймає переставлені позиції книг у RU/EN та інших локальних виданнях навіть коли набір кодів залишається тим самим. Збережено легальні відмінності в кількості глав різних перекладів (Огієнко JOL 4 vs базове видання 3) та чинні кеш/retry/reader маршрути. [PR #1024](https://github.com/Oleksii-debug/scripture-archive/pull/1024) **SQUASH MERGED** у `main@a564f9eb804fdf5d0ebfa54af9b2f1414232b015`; production blob `c2d6bdb7b80948cbe54e8d2aec8f36c2cf72efaa`, test blob `4d3938a8f12131992996b42478facbbc69ae3f11`. [Exact-head Actions #41239949088](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41239949088) **SUCCESS**: native Node, TypeScript, lint, build, disposable Worker/D1 та Python. [Канонічний вузький акт](docs/roadmap/SA_EXT_01_CANONICAL_BOOK_ORDER_SCOPED_TERMINAL_20261031.md): `remaining_scoped_implementation=0`, `required_unmerged_scoped_PRs=0`, **CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL**. **SA-EXT-01 parent OPEN**, SA-EXT-03/04 parent TERMINAL. Права/видання, live Sites/D1, браузер, Windows/NVDA та release #689 **NOT_VERIFIED**; деплой/міграції не здійснювалися.

---

## 2026-10-31 — R0.1 / LITERAL_IDNA_RELEASE_ORIGIN — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**Лише локальний release-origin preflight дефект ЗАКРИТО ДЛЯ РОЗРОБКИ.** Наявний канонічний `scripts/check-web-release-origin.mjs` відхиляє Unicode/IDNA-схожі HTTPS authority і неканонічні записи портів до результату `DECLARED_ORIGIN_MATCH_ONLY`; справжні ASCII origins, `:443`, IPv6 і вибрані нестандартні порти збережені. [PR #1020](https://github.com/Oleksii-debug/scripture-archive/pull/1020) **SQUASH MERGED** `main@deb421d3bc43c3e60e151565113d937990ac1f01`; source `376f732781d7762400074126cdf4e93fa6046381`; regression `93593031d6a24d6db25e668bd9e061f9122d3a58`. [Exact PR-head Actions #41239163403](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41239163403) **COMPLETED SUCCESS**: native Node, TS, lint, build, disposable Worker/D1, Python. [Повний scoped-акт](docs/roadmap/R0_1_LITERAL_IDNA_RELEASE_ORIGIN_SCOPED_TERMINAL_20261031.md). `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_prs=0`, `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` **тільки для цього захисту**. Повний R0.1, SA-EXT-16, live cutover #689, Sites SHA, D1/backup, browser/Windows/NVDA та реліз **OPEN / NOT_VERIFIED**; нічого не розгортали.

---

## 2026-10-31 — SA-EXT-01 / PRIMARY_READER_SPARSE_CATALOG_FAILCLOSED — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**ЗАКРИТО ДЛЯ РОЗРОБКИ ЛИШЕ ПЕРЕВІРКУ РОЗРІДЖЕНИХ МАСИВІВ КАТАЛОГУ, НЕ БАТЬКІВСЬКИЙ SA-EXT-01.** Канонічний `public/app.js::validBibleCatalog` тепер вимагає власні записи для всіх 66 позицій кожного основного та додаткового списку книг до перевірок кодів, джерел, розділів і посилань. Раніше `Array.every/map` пропускали відсутній індекс, а `Set.size` рахував `undefined` як 66-ту книгу. Це відтворено на пошкодженому **in-memory** каталозі, не як production-атака чи безпосередній JSON payload.

**Реалізація:** [PR #1021](https://github.com/Oleksii-debug/scripture-archive/pull/1021) **SQUASH MERGED** у `main@5c928fc0c0042a00ca13b210890bf730843ffc2a`; exact source blob `4cca5c09a24658ed2798b81146d36d3cb7868c3a`, regression blob `3d2f5f782f26c932f998c6f2b0f30cfac66c6b68`. Старий код із чинним `catalog.json`: sparse edition та all-locale primary holes **2/2 RED**; виправлений код **132/132** source-executed V8 negative PASS на всіх позиціях плюс canonical positive. Ізольований native Node focused 4/4 PASS (ручна реконструкція функції, не повний checkout). [Exact PR-head GitHub Actions #41239126942](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41239126942) `COMPLETED SUCCESS`: **3577 Node PASS / 0 FAIL / 1 SKIP**, **24 disposable Worker/D1 PASS**, **2 Python PASS**, TypeScript, lint, build — SUCCESS. Main і blob SHA перечитані після merge.

Для **цього вузького захисту** `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_feature_PRs=0`, **CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL**. Повні **SA-EXT-01/02/05/06/07 OPEN**, SA-EXT-03/04 source TERMINAL. Rights/licensing, authored content, live Sites/D1, browser/keyboard/physical NVDA, backup і release gate **NOT_VERIFIED**. Жодного production deploy, міграцій, змін користувацьких даних, 82 мов, платежів, синтетичних користувачів, масових листів чи знайомств.

---

## 2026-10-31 — SA-EXT-03 / EDITOR_PUBLIC_SEARCH_CURSOR_CYCLE — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**Вузький доведений дефект у вже source-TERMINAL батьківському SA-EXT-03 ЗАКРИТО для повторної розробки.** Наявний канонічний редакторський пошук тепер відхиляє повторені та циклічні keyset курсори, не показує дубльовані форми зняття публікацій, зберігає попередні результати й дозволяє retry. [PR #1016](https://github.com/Oleksii-debug/scripture-archive/pull/1016) **SQUASH MERGED** у `main@1b919c55bfd259872da0e481727ef4434da25ee7`. Production `public/material-review.js@f5b6117aaca7b6dc000c10f259f997fc71bb2944`; regression `tests/editor-public-takedown-search.test.mjs@0b2c35bc8c23d626c1bfb465ed9896e60b399ecc`. [Exact-head Actions #41238685466](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41238685466) COMPLETED SUCCESS: 3575 Node PASS, 24 Worker/D1 PASS, Python/TypeScript/lint/build SUCCESS. [Scoped акт](docs/roadmap/SA_EXT_03_EDITOR_PUBLIC_SEARCH_CURSOR_CYCLE_SCOPED_TERMINAL_20261031.md). `remaining_scoped_implementation=0`, `required_unmerged_scoped_PRs=0`. Це не новий акт для всього батьківського розділу; реальний сайт, NVDA та реліз NOT_VERIFIED.

---

## 2026-10-31 — SA-EXT-16 / R0.4 COMMUNITY_INITIALIZATION_D1_ACK — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**РОЗДІЛ SA-EXT-16 / підтвердження ініціалізації спільноти — ЗАКРИТО ЛИШЕ ЦЮ ПІДФУНКЦІЮ ДЛЯ ПОДАЛЬШОЇ РОЗРОБКИ, НЕ ВЕСЬ РОЗДІЛ.** Канонічний `lib/community-engine.ts::ensureCommunityRun` тепер відмовляє у старті після непідтверджених D1 `batch`-відповідей під час створення запуску та хвиль спільноти; ідемпотентні нульові `INSERT OR IGNORE` збережено. Код і regression [PR #1013](https://github.com/Oleksii-debug/scripture-archive/pull/1013) **SQUASH MERGED** в точний `main@8e44430bb8e2fc3f955cd0dda79db8bdefbc8116`; [CI #41238477585](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41238477585) **SUCCESS**: нативні Node-тести, TypeScript, lint, build, disposable Worker/D1, Python. [Офіційний вузький акт](docs/roadmap/SA_EXT_16_COMMUNITY_INITIALIZATION_D1_ACK_SCOPED_TERMINAL_20261031.md). `remaining_scoped_implementation=0`; `necessary_unmerged_scoped_feature_PRs=0`; **CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL**. Повні SA-EXT-10 та SA-EXT-16 **OPEN**, production/міграції/backup/browser/NVDA та реліз **NOT_VERIFIED**; запуск агентів, листи, платформа й дані користувачів не змінювалися.

---

## 2026-10-31 — SA-EXT-08 / REVIEWED_LIBRARY_CURSOR_CYCLE — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**ЗАКРИТО ДЛЯ РОЗРОБКИ ЛИШЕ ПІДФУНКЦІЮ ПАГІНАЦІЇ, НЕ УВЕСЬ SA-EXT-08.** Канонічний `/library` відхиляє неавторитетні повторені курсори, включно з A→B→A, зберігає вже підтверджені результати та дозволяє retry. [PR #1012](https://github.com/Oleksii-debug/scripture-archive/pull/1012) **SQUASH MERGED** у точний `main@71455c48732e31c3d5dd6476467b1bc93a6d6160`: `public/material-review.js@b1b3441979d23c445b283b62fb6ffaae9f087413`, `tests/library-reviewed-route.test.mjs@7da7bd0d211fdb8aa551fc97eedfc0bdd3c50727`. [Exact-head Actions #41238291123](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41238291123) **COMPLETED SUCCESS**: 3548 native Node PASS, 24 disposable Worker/D1 PASS, 2 Python PASS, TypeScript/lint/build PASS. [Акт scoped-терміналу](docs/roadmap/SA_EXT_08_LIBRARY_CURSOR_CYCLE_SCOPED_TERMINAL_20261031.md). Для цієї підфункції `remaining_scoped_implementation=0`, `required_unmerged_scoped_PRs=0`. **Увесь SA-EXT-08 OPEN**, інші батьківські розділи без нових підтверджень не змінені. Реальні Sites/D1, Chrome/Windows/NVDA і production release NOT_VERIFIED; деплой не виконувався.

---

## 2026-10-31 — SA-EXT-05 / DOSSIER_SEARCH_RAW_INPUT_BOUNDS — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**РОЗДІЛ №SA-EXT-05 — ЗАКРИТО ДЛЯ РОЗРОБКИ ЛИШЕ ВУЗЬКИЙ ДЕФЕКТ RAW GET ПОШУКУ, НЕ БАТЬКІВСЬКИЙ SA-EXT-05.** Канонічний `public/scripture-dossiers.js` тепер відхиляє сирий `q` понад 120 UTF-16 одиниць до `trim()` і нормалізації, і синхронно захищає пошук досьє та текстовий атлас; локалізований `role="alert"` без підміни результатів. Старий source blob `fa1c62fac9255286907cd9e3d3c4e0e5f2be1974` у V8 приймав 156–157-символьні доповнені пробілами запити; новий production код з [PR #1009](https://github.com/Oleksii-debug/scripture-archive/pull/1009) **SQUASH MERGED** в точний feature `main@1062114cf5b0d6c7d28211e8d00599aed0c370e7`. [Exact-head Actions #41237877271](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41237877271) **COMPLETED SUCCESS**: 3546/3546 native Node PASS, Worker/D1 24/24 PASS, Python 2/2 PASS, TypeScript/lint/build completed (lint warnings only); окремо patched exact-blob V8 **97/97 PASS**. [Незмінний scoped акт](docs/roadmap/SA_EXT_05_DOSSIER_SEARCH_RAW_INPUT_BOUNDS_SCOPED_TERMINAL_20261031.md), `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_feature_PRs=0`. Це **не** закриває повні SA-EXT-01/02/05/06/07; SA-EXT-03/04 source TERMINAL. Cloudflare Sites, production D1, browser/NVDA, видавничі права та реліз **NOT_VERIFIED**; deployment/production data/міграції не змінено.

---

## 2026-10-31 — SA-EXT-16 / ACCOUNT_DELETE_REVIEWED_BY_ID — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**ЗАКРИТО ЛИШЕ ОДИН ПІДТВЕРДЖЕНИЙ ДЕФЕКТ ПРИВАТНОСТІ, НЕ БАТЬКІВСЬКИЙ РОЗДІЛ.** Видалення облікового запису тепер у тій самій атомарній D1 транзакції замінює `material_submissions.reviewed_by` видаленого редактора в чужих редакційних записах на `deleted-account`, не стираючи матеріали інших авторів, схвалення, права, час і рішення іншого редактора. [PR #1008](https://github.com/Oleksii-debug/scripture-archive/pull/1008) **SQUASH MERGED** у прочитаний `main@311bdd5ce08dfd02521c0710c9165d46d491a97b`. Source `app/api/auth/route.ts@3cb9db3c314f657df431605f263639d8104818fe`; test `tests/account-deletion-privacy.test.mjs@df8917410409ff433a57b3c5546273f4dcfcc1b5`. Exact PR-head [CI #41237669312](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41237669312) **COMPLETED SUCCESS**: native Node, TypeScript, lint, build, disposable Worker/D1 і Python. Нативна ізольована SQLite перевірка підтвердила збереження approval CHECK, не підміняючи CI. [Канонічний акт](docs/roadmap/SA_EXT_16_DELETED_REVIEWER_ID_SCOPED_TERMINAL_20261031.md).

Для **цієї** підфункції `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_feature_PRs=0`, `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`. **#303, SA-EXT-16 parent OPEN**: anonymous Help requests, external mail/backups, rights/retention, live Sites/D1 і browser/NVDA не прийняті. Production не змінювався; не оголошувати платформу готовою.

---

## 2026-10-31 — SA-EXT-06 / FILTERED_ATLAS_RELATION_ONLY_WITNESSES — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**Лише вузький дефект завершено; SA-EXT-06 parent OPEN.** Канонічний пошук правильно знаходив досьє за джерелом у зв'язку, але фільтрований текстовий атлас приховував цей зв'язок, якщо пов'язана тема не збігалася з пошуком. Тепер видиме досьє зберігає всі свої перевірені біблійні свідчення зв'язків; тема поза фільтром показана текстом, без переходу поза множину результатів. [PR #1005](https://github.com/Oleksii-debug/scripture-archive/pull/1005) **SQUASH MERGED** `main@acf25561d2eb72c821fc94e4a3ca6c07a1313934`; production blob `fa1c62fac9255286907cd9e3d3c4e0e5f2be1974`, test blob `98e5c70e51678cd4ed10844756340983b67d3710`. Old source V8 9/9 RED → patched 9/9 GREEN, 3/3 unfiltered byte-identical, 3/3 filtered-link checks; [exact PR-head native CI #41236089156](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41236089156) **COMPLETED SUCCESS** (Node/TS/lint/build/disposable Worker-D1/Python). [Канонічний акт](docs/roadmap/SA_EXT_06_FILTERED_ATLAS_RELATION_WITNESS_SCOPED_TERMINAL_20261031.md). `remaining_scoped_implementation=0` лише тут. **SA-EXT-01/02/05/06/07 OPEN; 03/04 source TERMINAL**. Карти/права/редакція, browser/NVDA, live Sites/D1 і реліз NOT_VERIFIED; деплою/міграцій/зміни даних не було.

---

## 2026-10-31 — SA-EXT-06 / FILTERED_ATLAS_CANONICAL_READING_RANK — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**ЗАКРИТО ЛИШЕ ЦЕЙ ДОВЕДЕНИЙ ДЕФЕКТ ПОРЯДКУ ЧИТАННЯ, НЕ БАТЬКІВСЬКИЙ SA-EXT-06.** Текстовий атлас мав затверджений порядок тем `abraham → sarah → joseph → moses → exodus → david → nativity`, але після звичайного GET-фільтра `q` перший видимий рядок нумерувався `1` незалежно від його справжнього місця у підписаній таблиці «Порядок читання». Так Йосип/Мойсей/Давид/Різдво отримували неправдивий порядковий номер замість 3/4/6/7. Виправлено тільки номер рядка на основі наявного канонічного `order`; жодних дат, археологічних тверджень, нових джерел чи маршрутів не додано.

**Реалізація й тести:** [PR #1002](https://github.com/Oleksii-debug/scripture-archive/pull/1002) **SQUASH MERGED** у `main@910834fdad5566c2403f4433b884d96e79c29684`. Source blob `public/scripture-dossiers.js@b561d469286473d0772a44355792e8affcce3caf`, regression blob `tests/atlas-history-sources.test.mjs@4010daee9920b949394fa2f3c9c79b6cde25daf5`. Старий точний source + валідний обмежений каталог: **12/12 RED** у V8 для чотирьох тем × uk/ru/en; виправлений source **12/12 GREEN**, нефільтрований HTML **3/3 byte-identical** (V8 із URLSearchParams shim — не native браузер). [Exact PR-head GitHub Actions #41231247119](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41231247119) на `2fafe5abe6c51446cca97cfab95fd8661f75dd6f` — **COMPLETED SUCCESS**: native Node regression, TypeScript, lint, source build, disposable Worker/D1 та Python validators усі завершилися успішно. Це source/disposable acceptance, не deployed Sites/NVDA.

`remaining_scoped_implementation=0`, `necessary_unmerged_scoped_feature_PRs=0` **тільки для FILTERED_ATLAS_CANONICAL_READING_RANK**. **SA-EXT-01/02/05/06/07 батьківські OPEN; SA-EXT-03/04 source TERMINAL.** Для повного SA-EXT-06 потрібні перевірені права на карти/геодані, наукове й редакційне приймання, справжній браузер/клавіатура/фізичний NVDA, live Sites SHA/D1 та незалежний release gate. Жодного деплою, production-міграції, змін користувацьких даних, 82 мов, платежів чи розсилок.

---

## 2026-10-31 — SA-EXT-05/06 / DOSSIER_CATALOG_OWN_SOURCE_AUTHORITY — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**Закрито лише доведений дефект цілісності джерельного каталогу; батьківські SA-EXT-05 та SA-EXT-06 залишаються OPEN.** У чинних `public/scripture-dossiers.js` та `searchScriptureDossiers()` раніше успадковані через прототип `books`, мовні масиви `uk/ru/en` і поля книги `code/title/chapters` могли видаватися за власні перевірені джерела, виводити підроблену назву в біблійному досьє/атласі/пошуку. Розріджений масив книг призводив до `TypeError` при побудові `Map` замість доступного повідомлення про недійсні джерела. Це source-executed моделювання пошкодженого каталогу, **не підтвердження production-атаки**.

**Функціональний код + негативні/recovery регресії:** [PR #1000](https://github.com/Oleksii-debug/scripture-archive/pull/1000) SQUASH MERGED, exact `main@4818cdd539e00746c827463154f4d30484e0aad4`; production blob `public/scripture-dossiers.js@725375691f876a013ced98f9e9114c27ee676598`, test blob `tests/dossier-catalog-own-authority.test.mjs@bc66966fd1ce347383d1fad459f65392a00839c2`. Перевіряються лише власні джерельні поля та щільні обмежені масиви; збережені всі наявні справжні біблійні назви, текстовий атлас, native GET-пошук, доступні посилання й UK/RU/EN. Жодного другого каталогу/сервера/міграції немає.

**Докази:** точний старий source + справжній `public/data/catalog.json` у V8: 5/6 RED на успадкованих source-claims, окремо 4/4 розріджені масиви спричиняли виняток; виправлений source V8 17/17 негативних/позитивних та 60/60 канонічних досьє/атлас/пошук PASS (це не native Node). [Exact PR-head GitHub Actions #41226632609](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41226632609) `COMPLETED SUCCESS`: **3502 native Node PASS, 0 FAIL, 1 SKIP; 24/24 disposable Worker/D1 PASS; 2/2 Python PASS; TypeScript, lint, source build SUCCESS**. Source PR merged=true, main readback і обидва blob SHA перевірені. `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_feature_PRs=0` **лише для цього виправлення**.

**Залишок:** SA-EXT-01/02/05/06/07 parent OPEN; SA-EXT-03/04 source TERMINAL. Потрібні реальні ліцензії/джерела/редакційне приймання, ширший атлас і курси, browser/keyboard/physical NVDA, installed Sites SHA/D1, незалежний release gate. **Жодного production deployment, міграції, користувацьких даних, 82 мов, платежів, масової пошти чи сервісу знайомств не змінено.**

---

## 2026-10-31 — SA-EXT-07 / ACADEMY_CROSS_TAB_UNREADABLE_PROGRESS_REDACTION — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**Лише вузьку підфункцію остаточно закрито, батьківський SA-EXT-07 — OPEN.** Реальна Академія в `public/scripture-academy.js` більше не зберігає на екрані попередні приватні позначки, прогрес і бейдж завершення після пошкодженого/нечитабельного storage-event іншої вкладки. Маркери блокуються до нового коректного readback поточного principal; обидва навчальні треки відновлюються без втрати або переписування даних. [PR #997](https://github.com/Oleksii-debug/scripture-archive/pull/997) SQUASH MERGED `main@0fed52491a1da282e70d6af22559ffbb315bef6f`, production blob `cffbe651c72159b9413e6782df44f4d246319969`, regression blob `ac9e22e23b6de3d7b13bb9380d711149ae18e4d9`. [Exact-head CI #41225768705](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41225768705) COMPLETED SUCCESS: Node 3495 PASS/0 FAIL/1 SKIP, disposable Worker/D1 24 PASS, Python 2 PASS, TS/lint/build SUCCESS. [Офіційний scoped акт](docs/roadmap/SA_EXT_07_ACADEMY_CROSS_TAB_STORAGE_REDACTION_SCOPED_TERMINAL_20261031.md), `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_feature_PRs=0`. **Повний SA-EXT-07, інші відкриті батьківські розділи, live Sites/D1, фізичний NVDA/Windows та реліз залишаються OPEN/NOT_VERIFIED.** Жодного деплою.

---

## 2026-10-31 — SA-EXT-06 / ATLAS_FILTER_LINK_ROUNDTRIP — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**ЗАКРИТО ЛИШЕ РЕАЛЬНИЙ ДЕФЕКТ ПЕРЕХОДУ З ФІЛЬТРОВАНОГО АТЛАСУ, НЕ БАТЬКІВСЬКИЙ SA-EXT-06.** Після інтегрованого пошуку атласу (#985) посилання на видиме досьє губило активний GET `q`: вибір джерельно перевіреної теми скидав фільтр. Чинний `public/scripture-dossiers.js` тепер зберігає обмежений `q` у власних нативних посиланнях атласу через `URLSearchParams` та HTML-escaping. Без пошуку старі URL залишаються байт-ідентичними; усі біблійні джерела, локалізації uk/ru/en, клавіатурні посилання й попередження про історичну невизначеність збережено.

[PR #992](https://github.com/Oleksii-debug/scripture-archive/pull/992) **SQUASH MERGED** у перевірений `main@c4adb856cc5cc17ea3ae59ee35195194ab6cf4a5`; production blob `public/scripture-dossiers.js@50a3982ad2a2a155bc6be29417848c70ad865e74`, regression blob `tests/atlas-history-sources.test.mjs@04265fed89170ffaae949cbf185b8a8c128fda0a`. Source-executed V8 із контрольованим URLSearchParams: **8/8 RED** на старому коді → **8/8 GREEN** після правки, 3/3 unfiltered локалі byte-identical; негативні query cases без витоку посилань. [Exact PR-head Actions #41221280461](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41221280461) **COMPLETED SUCCESS**: native Node, TypeScript, lint, build, disposable Worker/D1, Python — усі кроки SUCCESS. [Exact merged-main push Actions #41221437548](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41221437548) **COMPLETED SUCCESS** на `c4adb856cc5cc17ea3ae59ee35195194ab6cf4a5`, ті самі набори перевірок. Ізольований V8 не називається Chromium/NVDA.

`remaining_scoped_implementation=0`, `necessary_unmerged_scoped_feature_PRs=0` **лише для ATLAS_FILTER_LINK_ROUNDTRIP**. **SA-EXT-06 parent OPEN**: перевірені картографічні права, наукові геодані/хронологія, незалежне редакційне приймання, реальний браузер/NVDA та live release відсутні. SA-EXT-01/02/05/07 теж OPEN; SA-EXT-03/04 parent TERMINAL. Жодного деплою, production D1, нових мов, платежів чи розсилок.

---

## 2026-10-31 — SA-EXT-08 / REVIEWED_LIBRARY_LOCALE_OWNKEY — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**ОСТАТОЧНО ЗАКРИТО ЛИШЕ ЦЕЙ ДЕФЕКТ БІБЛІОТЕКИ.** Реальна сторінка `/library` і її підключений пошук більше не приймають успадковані JS-ключі мови `__proto__`/`constructor`/`toString` чи нетипізовані локалі за правдиві переклади: використані спільні own-key fallback `uk` без дублювання модуля. [Функціональний PR #989](https://github.com/Oleksii-debug/scripture-archive/pull/989) **SQUASH MERGED** у точний `main@2efd12811f6dfb8740788dba9e6b3d94b9bd5d6c`, перевірені production blobs `public/material-review.js@33e142efa1d28dabf4c41c572c4f5e7f827590f1`, `public/workspace.js@bf195b61243d95cbd1c55167010f80e834ecf4d6`, 3 source-executing regressions. [Exact-head GitHub Actions #41220737865](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41220737865) **SUCCESS**: 3488 Node PASS / 0 FAIL / 1 SKIP, 24 disposable Worker/D1 PASS, TS/lint/build/Python PASS. [Офіційний акт](docs/roadmap/SA_EXT_08_LIBRARY_LOCALE_OWNKEY_SCOPED_TERMINAL_20261031.md): `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`, `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_feature_PRs=0` **виключно для цього дефекту**. **Батьківський SA-EXT-08 і незавершені розділи залишаються OPEN**; production Sites, фізичні Windows/NVDA, права на книги та повний реліз **NOT_VERIFIED**, деплой не виконувався.

---

## 2026-10-31 — R0.1 / PUBLIC_APP_JS_MIME_GATE — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**ЗАКРИТО ТІЛЬКИ ПЕРЕВІРКУ MIME/UTF-8, НЕ ПОВНИЙ РОЗДІЛ.** PR [#987](https://github.com/Oleksii-debug/scripture-archive/pull/987) SQUASH MERGED `main@171bbcb7b7ffe78e59ec8d3ab8897ffe86ccc0de`; [native CI #41220160624](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41220160624) COMPLETED SUCCESS (Node, TypeScript, lint, source build, disposable Worker/D1, Python). [Офіційний scoped-акт](docs/roadmap/R0_1_PUBLIC_JS_MIME_GATE_SCOPED_TERMINAL_20261031.md). `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_feature_PRs=0`. **R0.1, решта батьківських SA-EXT і live release залишаються OPEN/NOT_VERIFIED; жодного деплою.**

---

## 2026-10-31 — SA-EXT-06 / DOSSIER_ATLAS_FILTER_CONTINUITY — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**РОЗДІЛ №SA-EXT-06 — ЗАКРИТО ДЛЯ РОЗРОБКИ ЛИШЕ ЦЕЙ ДЕФЕКТ ПОШУКУ В АТЛАСІ.** Канонічна сторінка `/dossiers?q=...` тепер фільтрує обидва пов'язані подання: індекс досьє та текстовий атлас, включно з перевіреними біблійними джерелами, місцями, додатковими темами та зв'язками; збережено нативну клавіатурну навігацію, UK/RU/EN, повний не фільтрований режим і fail-closed невірні запити. Це чинний `public/workspace.js` + `public/scripture-dossiers.js`, не відокремлений модуль.

[Feature PR #985](https://github.com/Oleksii-debug/scripture-archive/pull/985) **SQUASH MERGED** у точний `main@c0d24070f4d87b41e0d4bb988ee6d3f1cdbc907e`; production blobs `public/scripture-dossiers.js@fb417444d4f95f0d5f36ba7726476af65eb7431f`, `public/workspace.js@488276dc75f8fafac9577e5ef99b7599cca7287d`. Фокусні перевірки exact source **93/93 V8 PASS**; [exact-head native CI #41219381401](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41219381401) **COMPLETED SUCCESS**: 3484 Node PASS / 0 FAIL / 1 SKIP, 24 disposable Worker/D1 PASS, TS/lint/build/Python PASS. [Остаточний окремий акт](docs/roadmap/SA_EXT_06_ATLAS_FILTER_CONTINUITY_SCOPED_TERMINAL_20261031.md): `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_feature_PRs=0`, `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.

**Повний SA-EXT-06 OPEN**: затверджені ліцензії карт, географічні та хронологічні дані, незалежний review, реальний браузер і доступність не прийняті; SA-EXT-01/02/05/07 теж OPEN, SA-EXT-03/04 parent TERMINAL. Production/Sites/D1, Windows/NVDA й реліз **NOT_VERIFIED**, деплой не виконувався.

---

## 2026-10-31 — SA-EXT-07 / ACADEMY_PROGRESS_PROJECTION_FAILCLOSED — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**ЗАКРИТО ДЛЯ РОЗРОБКИ ЛИШЕ ОДИН ВІДТВОРЕНИЙ ДЕФЕКТ, НЕ БАТЬКІВСЬКИЙ SA-EXT-07.** Канонічна `academyMarkup()` більше не приймає пошкоджену/підроблену проєкцію локального прогресу `{available:true,completed:...}` як доказ проходження занять: неправильний тип, відсутній масив, невідомий/повторний ID чи надлишок позначок залишають перевірені біблійні джерела доступними **лише для читання** з оголошеною помилкою, без активних кнопок і хибного badge. Коректні 13 занять, особисті позначки й відновлення після нового валідного readback збережені.

[PR #982](https://github.com/Oleksii-debug/scripture-archive/pull/982) **SQUASH MERGED** у точний `main@22de6aee63b9daa5778052fca7924944cc7f75a2`; production blob `public/scripture-academy.js@3e1dfe95b9256211968c10a7bbbb98c3ece1760d`, regression blob `tests/academy-progress-projection.test.mjs@b3b064048b62ab3deebaafed740a8ee06f50fe97`. На старому source blob `5f409933fcfac05f902463bc30fd72818c94316b` ізольовані V8 перевірки дали 21/24 RED, після ремонту 24/24 GREEN; нові 3 тестові сценарії також виконано в V8. [Exact-head GitHub Actions #41218881710](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41218881710) **COMPLETED SUCCESS**: native Node regression, TypeScript, lint, source build, disposable Worker/D1 та Python validators — усі кроки SUCCESS. Це source/disposable CI, не installed Sites, production D1, фізичний NVDA/Windows або реліз.

`remaining_scoped_implementation=0`, `necessary_unmerged_scoped_feature_PRs=0` **лише для ACADEMY_PROGRESS_PROJECTION_FAILCLOSED**. **Повний SA-EXT-07 OPEN**: курси/авторський review, медіа/транскрипти, реальний браузер/NVDA, право на джерела й перевірений реліз залишаються; SA-EXT-01/02/05/06 OPEN, SA-EXT-03/04 parent TERMINAL. Жодних нових мов, деплою, production-міграцій, платежів, розсилок чи змін користувацьких даних.

---

## 2026-10-31 — SA-EXT-16 / PROFILE_SENSITIVE_CONSENT_PRESERVATION — ВУЗЬКИЙ ДЕФЕКТ ЗАКРИТО

Канонічний `app/api/account/route.ts` більше не відкликає вже надану чутливу згоду через старий запит профілю без `acceptSensitive`: атомарний SQLite/D1 UPSERT зберігає згоду, версію, конфесійну належність, громаду й попередню видимість. Новий користувач за умовчанням не дає згоди; явне `false` її відкликає; неправильно типізовані дані відхиляються без D1 запису. [PR #977](https://github.com/Oleksii-debug/scripture-archive/pull/977) **SQUASH MERGED** у `main@1198f6d6b7a89cb671644718d5180e8811546f4f`; [CI #41218379475](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41218379475) **SUCCESS** (3471 Node PASS; 24 disposable Worker/D1 PASS; 2 Python PASS; TypeScript/lint/build PASS). [Акт](docs/roadmap/SA_EXT_16_PROFILE_SENSITIVE_CONSENT_SCOPED_TERMINAL_20261031.md): `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`, `remaining_scoped_implementation=0`, `required_unmerged_scoped_PRs=0`. **Повний батьківський SA-EXT-16 і решта 17 відкритих батьківських розділів далі OPEN; SA-EXT-03/04 раніше TERMINAL.** Немає підтвердження фізичного NVDA/Windows, live Sites SHA/D1 та релізу; деплой не виконувався.

---

## 2026-10-31 — SA-EXT-01 / EXACT_SOURCE_URL_VISUAL_ALIASES — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**РОЗДІЛ SA-EXT-01 — ЗАКРИТО ДЛЯ РОЗРОБКИ ЛИШЕ КОНКРЕТНИЙ ДЕФЕКТ ПОСИЛАНЬ.** Canonical primary/parallel reader and edition information now reject raw visually blank Unicode U+034F, U+115F, U+1160, U+2800, U+3164, U+FFA0 and backslash-altered publisher/license URLs before WHATWG URL normalization. Legitimate percent-encoded HTTPS and independent source/licence fields remain available. [Production+regression PR #978](https://github.com/Oleksii-debug/scripture-archive/pull/978) **SQUASH MERGED** into main `0406009e72f6e59da55be9007de0a18fea6529a8`; source blob `811c22189c106c5380abd9bc12dd0dce421ab5ac`, committed regression blob `273ff668074bd8491cd4b7974e7cdd4343559109`. [Exact PR-head native Actions #41218202105](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41218202105) **COMPLETED SUCCESS** (Node, TypeScript, lint, build, disposable Worker/D1, Python). [Остаточний scoped-акт](docs/roadmap/SA_EXT_01_PROVENANCE_URL_EXACT_SCOPED_TERMINAL_20261031.md). `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_feature_PRs=0`, status `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`. **Батьківський SA-EXT-01 залишається OPEN**: реальні ліцензії, інші видання, редакційне приймання та зовнішній реліз. SA-EXT-03/04 залишаються parent TERMINAL. Live Sites, D1, Windows/NVDA та production release **NOT_VERIFIED**; розгортання не виконувалося.

---

## 2026-10-31 — SA-EXT-03 / EXACT_CMS_CONTENT_ID — ВУЗЬКИЙ ДЕФЕКТ ОСТАТОЧНО ЗАКРИТО

У чинному власницькому CMS `app/api/content/route.ts` раніше явний ключ на кшталт `" record "` обрізався до іншого `"record"` під час редагування або приховування, що створювало ризик зміни чужого запису. [PR #971](https://github.com/Oleksii-debug/scripture-archive/pull/971) **SQUASH MERGED** у `main@e05ef94ac3f49a105c5aba71564ba9cfe53a3ef2`: перед D1-записом/читанням відхиляються padded nonblank upsert IDs і padded DELETE keys. Чинні точні IDs, UUID для відсутнього/порожнього ID, редакційні ревізії та атомарні receipts збережено; 10 нових негативних тестових випадків. [Exact-head CI #41207030795](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41207030795): **COMPLETED SUCCESS** — Node, TypeScript, lint, build, disposable Worker/D1, Python. [Остаточний scoped-акт](docs/roadmap/SA_EXT_03_CONTENT_ID_EXACT_ALIAS_SCOPED_TERMINAL_20261031.md): `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`, `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_feature_PRs=0`. **Вихідний батьківський SA-EXT-03 зберігає свій TERMINAL; інші 18 запланованих батьківських розділів залишаються OPEN.** Поточний live Sites SHA, фізичні Windows/NVDA та реліз НЕ ПЕРЕВІРЕНІ; розгортання не виконували.

---

## 2026-10-31 — SA-EXT-03 / MATERIAL_RIGHTS_HOLDER_VISIBLE_PROVENANCE — ВУЗЬКИЙ ДЕФЕКТ ЗАКРИТО

Виправлено приймання невидимих, bidi, Unicode format/filler і пошкоджених UTF-16 символів як публічного імені правовласника в чинному сервері, SQL-прочитуванні та HTML/ARIA-каталозі. [PR #969](https://github.com/Oleksii-debug/scripture-archive/pull/969) **SQUASH MERGED** `main@9039d85ed24f1c9346cc0b44aa1db26f357b9ff6`; [CI #41204855117](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41204855117) **SUCCESS**, Node 3407 PASS, Worker/D1 24 PASS, Python 2 PASS, TS/lint/build PASS. [Точний акт](docs/roadmap/SA_EXT_03_RIGHTS_HOLDER_VISIBLE_SOURCE_SCOPED_TERMINAL_20261031.md): `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`, `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_feature_PRs=0` тільки для цього дефекту. SA-EXT-03/04 раніше parent TERMINAL, SA-EXT-01/16 та решта 18 відкритих батьківських розділів залишаються OPEN; новий реліз, фізичний NVDA/Windows, live Sites/D1 НЕ ПЕРЕВІРЕНІ.

---

## 2026-10-31 — SA-EXT-03 / PUBLIC_MATERIAL_LICENSE_URL — ВУЗЬКИЙ ДЕФЕКТ ЗАКРИТО

Канонічний браузерний компонент публічних перевірених матеріалів захищений від прихованого/bidi Unicode та неоднозначних authority у посиланнях на права. [PR #967](https://github.com/Oleksii-debug/scripture-archive/pull/967) SQUASH MERGED `main@420b5e9f2dcb708ef81944d568efbd54af194970`; [CI #41204439232](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41204439232) SUCCESS — Node 3405 PASS, D1 24 PASS, Python 2 PASS, TS/lint/build PASS. [Вузька квитанція](docs/roadmap/SA_EXT_03_CLIENT_LICENSE_URL_SCOPED_TERMINAL_20261031.md) — `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`. Батьківські SA-EXT-01/16 OPEN, SA-EXT-03/04 раніше TERMINAL; реальний Sites/NVDA/Windows/реліз НЕ ПЕРЕВІРЕНІ.

---

## 2026-10-31 — SA-EXT-03 / MATERIAL_RIGHTS_RAW_UNICODE — ВУЗЬКИЙ ДЕФЕКТ ЗАКРИТО

Захист посилань на права редакційних матеріалів від прихованого Unicode, bidi і фальшивих credential authorities підключено до чинного API; це не новий модуль. [PR #965](https://github.com/Oleksii-debug/scripture-archive/pull/965) **SQUASH MERGED** `main@15d6f1be205a6f8832c806041d737b5fd8fc740c`; [CI #41203870246](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41203870246) **SUCCESS**, 3403 Node PASS, 24 disposable Worker/D1 PASS, 2 Python PASS, TS/lint/build PASS. [Офіційна вузька квитанція](docs/roadmap/SA_EXT_03_MATERIAL_RIGHTS_RAW_UNICODE_SCOPED_TERMINAL_20261031.md) — `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`, `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_feature_PRs=0`. Батьківські SA-EXT-01 і 16 OPEN, 03/04 раніше TERMINAL; production Sites, Windows/NVDA й увесь 20-роздільний план НЕ ЗАКРИТО. Деплою не було.

---

## 2026-10-31 — R0.1 / MANUAL_PUBLIC_ASSET_ACTION — ВУЗЬКИЙ ІНСТРУМЕНТ ЗАКРИТО

**Лише source-scope:** GitHub Actions workflow manual-only для безпечної read-only перевірки публічного `/app.js` проти exact-head Git; checkout `github.sha`, `persist-credentials:false`, права `contents:read`, нуль auto-trigger, деплою й D1. [Feature PR #963](https://github.com/Oleksii-debug/scripture-archive/pull/963) **SQUASH MERGED** `main@14c5e421668f1fee487d3404f7adb3e26482b008`, workflow blob `14e7614c82ea854ee58d55c1fef50d71f151f0c8`, test blob `f0d71f66ca3bfb933601249e660715ca5a3dd3c7`; **локально 3/3 нові тести PASS**, разом із попереднім R0.1 11/11. [Exact-head CI #41203374221](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41203374221) **SUCCESS**: Node/TS/lint/build/disposable D1+Worker/Python. [Офіційний акт](docs/roadmap/R0_1_MANUAL_PUBLIC_ASSET_ACTION_SCOPED_TERMINAL_20261031.md): `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`, `remaining_scoped_source_implementation=0`, `necessary_unmerged_scoped_prs=0`. **Жодного workflow_dispatch тут не виконано, live Sites SHA/D1, повний R0.1 та SA-EXT-16 parent OPEN; релізу НЕ БУЛО.**

---

## 2026-10-31 — R0.1 / PUBLIC_APP_JS_BYTE_PARITY — ВУЗЬКИЙ РЕЛІЗНИЙ ІНСТРУМЕНТ ЗАКРИТО

**Лише цей source-scope:** read-only перевірка SHA-256 публічного `/app.js` проти `public/app.js` з чистого exact-head Git checkout; HTTPS, без cookies/redirect, обмеження тіла й негативні сценарії. [Функція PR #961](https://github.com/Oleksii-debug/scripture-archive/pull/961) **SQUASH MERGED** `main@3f3623def47bc6cf62f0d8edd7f893efd0d61f6a`, production blob `2466e8ff133528bf14b77c2fb9c8eae4fd051e42`, test blob `c271ba644732e297b17aaa5c3f680c3e1f4234ef`. **Локально 8/8 native Node PASS**. [Exact-head Actions #41202827639](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41202827639) **COMPLETED SUCCESS**: Node/TS/lint/build/disposable Worker+D1/Python. [Постійний акт](docs/roadmap/R0_1_PUBLIC_APP_JS_PARITY_SCOPED_TERMINAL_20261031.md). `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`, `remaining_scoped_source_implementation=0`, `necessary_unmerged_scoped_feature_prs=0`. **Повний R0.1, SA-EXT-16, Sites/D1/production, браузер і NVDA залишаються OPEN / NOT_VERIFIED; релізу не було.**

---

## 2026-10-31 — SA-EXT-05 / DOSSIER_VISIBLE_PROVENANCE — ЗАКРИТО ВУЗЬКИЙ ДЕФЕКТ

У чинному біблійному атласі й досьє канонічний валідатор тепер відкидає всі Unicode format controls і порожні символи письма до показу назв джерел, навчальних запитань та посилань на Писання. [PR #957](https://github.com/Oleksii-debug/scripture-archive/pull/957) **SQUASH MERGED** у `main@cbbd1a4d38b2b6a2a1ea64abd3a34412d401b764`, source `1113bba060a8dc81b7a4828b99147e5cccc0cf08`, tests `b30b13363a52726415fd924fce9bb46929ea8ec2`. [GitHub Actions #41201960188](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41201960188): Node 3390 PASS, Worker/D1 24 PASS, Python 2 PASS, TS/lint/build PASS. [Точний акт](SA_EXT_05_DOSSIER_UNICODE_PROVENANCE_SCOPED_TERMINAL_20261031.md), `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`, `remaining_scoped_implementation=0`. **Батьківський SA-EXT-05 OPEN**; правдивість усієї бази, сайт, NVDA та реліз не оголошені готовими.

---

## 2026-10-31 — SA-EXT-02 / ASSIGNED_TASK_TOTALS — ВУЗЬКИЙ ФУНКЦІОНАЛ ЗАКРИТО

У канонічному API історії спроб відхиляються вигадані/пошкоджені результати, де `total` не збігається з D1 `task_limit` або перевищує справжню кількість завдань місії для відповідної глави. [PR #956](https://github.com/Oleksii-debug/scripture-archive/pull/956) **SQUASH MERGED** `main@c0eb0407ab6eadaf891bba6e2bb2cf2f47fdf401`, route `09213464684c82744c648742c6f51d1ed4891abf`, SQLite route tests `d568bae9a57c443dd168a6a324acd00e2a9e024f`. [GitHub Actions #41201794542](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41201794542): Node 3295 PASS, Worker/D1 24 PASS, Python 2 PASS, TS/lint/build PASS. [Акт закриття](SA_EXT_02_ASSIGNED_TASK_TOTALS_SCOPED_TERMINAL_20261031.md); `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`, `remaining_scoped_implementation=0`. **Весь SA-EXT-02 OPEN**, production/NVDA не підтверджено, деплой не виконано.

---

## 2026-10-31 — SA-EXT-01 / ABOUT_VISIBLE_RIGHTS — ЗАКРИТО ДЛЯ РОЗРОБКИ (вузька функція)

На справжній сторінці відомостей про видання тепер спільний валідатор не дозволяє невидимим Unicode спотворювати підписи ліцензій, назв, атрибуції та правопису, при цьому незалежні перевірені URI видавців збережено. [PR #954](https://github.com/Oleksii-debug/scripture-archive/pull/954) **SQUASH MERGED** у `main@a5e283300b1a972f08ac4bce104ef128a18115b7`; source `2c5a59860eaeb4b584db975a6e6fa241386c5206`, UI `aecb30c00e078565f9fe14b301f483b7093435ec`, tests `a680965ed29f9136a63bb0f33ad236cf76c4e7ab`. [GitHub Actions #41201267889](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41201267889) exact final head: Node 3294 PASS, Worker/D1 24 PASS, Python 2 PASS, TypeScript/lint/build PASS. [Фінальний scoped-акт](SA_EXT_01_ABOUT_VISIBLE_RIGHTS_SCOPED_TERMINAL_20261031.md), `remaining_scoped_implementation=0`, `necessary_unmerged_feature_PRs=0`, `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`. **Батьківський SA-EXT-01 лишається OPEN**, live, права видань, Windows/NVDA не перевірено, жодного деплою.

---

## 2026-10-31 — SA-EXT-01 / EDITION_RIGHTS_INVISIBLE_FILLERS — SCOPED TERMINAL

**ЗАКРИТО ДЛЯ РОЗРОБКИ ЛИШЕ КОНКРЕТНИЙ ДЕФЕКТ:** форматні й візуально порожні Unicode U+00AD/U+034F/U+115F/U+1160/U+180E/U+2800/U+3164/U+FFA0 більше не проходять у назви видань, ліцензії та атрибуцію справжньої читальні. [PR #952](https://github.com/Oleksii-debug/scripture-archive/pull/952) **SQUASH MERGED** у `main@1b8524f44c876e3ca1471b5785426d3a523b26ba`; source `93d100e8eb2182728fbdedfd2257e2ec14cddcac`, test `923fc033ee368bf38ee11459ca816faf38c7ce44`. [Exact-head GitHub Actions #41200462083](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41200462083): **SUCCESS**, Node 3292 PASS/0 FAIL, disposable Worker/D1 24 PASS, Python 2 PASS, TS/lint/build PASS. [Повний scoped-акт](SA_EXT_01_INVISIBLE_RIGHTS_FILLERS_SCOPED_TERMINAL_20261031.md), `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_feature_PRs=0`. **Батьківський SA-EXT-01 залишається OPEN**, реальний сайт/NVDA/Windows/видавничі права не перевірено; реліз не оновлювався.

---

## 2026-10-31 — SA-EXT-05 / PUBLISHED_RANGE_READER_BOUNDARY — SCOPED TERMINAL

**ЗАКРИТО ДЛЯ РОЗРОБКИ ЛИШЕ ВУЗЬКУ ПІДФУНКЦІЮ:** пошук `/dossiers` більше не представляє цитату `GEN 12:1-257` або `GEN 17:15-999` як підтримуваний діапазон читальні (максимум 256 віршів, 200 глав). Збережено коректні діапазони, усі 3 локалі, канонічні посилання й пошук. [PR #948](https://github.com/Oleksii-debug/scripture-archive/pull/948) **SQUASH MERGED**, feature `main@6f4d07d6e8f6538591b5c70f9462b2b4c1c16245`; production blob `f826679962599b9bd7b1eafa016066f5eb6e16e0`, 50 нових регресій у тестовому blob `d1eec9d6be0806f9fb60020d3d26a5974f5147bc`. [Exact-head CI #41194389898](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41194389898): **COMPLETED SUCCESS**, native Node **3236 PASS / 0 FAIL / 1 SKIP**, disposable Worker/D1 **22 PASS**, TypeScript, lint, build і Python PASS. [Акт](docs/roadmap/SA_EXT_05_PUBLISHED_RANGE_READER_BOUNDARY_SCOPED_TERMINAL_20261031.md): `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_feature_PRs=0`. **Батьківський SA-EXT-05 OPEN**; SA-EXT-03/04 parent TERMINAL. Жодного production Sites/Windows/NVDA приймання чи релізу не виконували.

---

## 2026-10-31 — SA-EXT-01 / EDITION_RIGHTS_TEXT_UNICODE — SCOPED TERMINAL

**ЗАКРИТО ЛИШЕ ПІСЛЯТЕРМІНАЛЬНИЙ ДЕФЕКТ ПРОВЕНАНСУ ПРАВ / CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL.** Канонічна перевірка `public/parallel-reader.js::validEditionRightsMetadata` більше не приймає невидимі, bidi та непарні Unicode символи в назві видання, ліцензійному тексті та атрибуції. Через той самий захист читальня не показує ліцензовані вірші під оманливими підписами; нормальний український текст і багаторядкові умови збереглися. [Функціональний PR #947](https://github.com/Oleksii-debug/scripture-archive/pull/947) **SQUASH MERGED** в `main@d7fb423ab545ed2fc4b770e03e3e34ab9c22157f`; source blob `2846e4faf782d625e19b043deb2531fe706ec643`, regression `1e0080c550f8d715184cfd8068ce45642361b28f`. Раніше **15/15** неправильних варіантів приймалися, тепер **15/15** відхиляються, **6/6** V8 реальних UI-flow пройшли. [Exact-head native CI #41194310571](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41194310571) **SUCCESS**: Node 3207 PASS /0 FAIL /1 SKIP, disposable Worker/D1 22 PASS, TS/lint/build/Python PASS. [Остаточна квитанція](docs/roadmap/SA_EXT_01_EDITION_RIGHTS_TEXT_UNICODE_SCOPED_TERMINAL_20261031.md), `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_feature_PRs=0`. **Батьківський SA-EXT-01 залишається OPEN; SA-EXT-03/04 TERMINAL.** Live Sites/права видань/NVDA/Windows не перевірені, без деплою.

---

## 2026-10-31 — SA-EXT-05 / DOSSIER_READER_BOUNDARY — SCOPED TERMINAL

**ЗАКРИТО ДЛЯ РОЗРОБКИ лише один дефект: CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL.** Обидва канонічні маршрути досьє й атласу перевіряють максимум 200 глав на книгу та 256 віршів на главу, як основна біблійна читальня; пошкоджені каталожні записи й свідчення дають доступне повідомлення про недоступність, а не некоректне посилання. [PR #944](https://github.com/Oleksii-debug/scripture-archive/pull/944) SQUASH MERGED до main@2873ca8adfc93f708a9141fefb4a04e2dcf47896, source blob b63e539e43367031f6cdbd08c0df649ac78d564a, test blob 6b3f5bf801310ef396da6879e2e180bc15d0e545. [Exact-head CI #41193874475](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41193874475) SUCCESS: Node 3185 PASS / 0 FAIL / 1 SKIP, Worker/D1 22 PASS, Python 2 PASS, TypeScript/lint/build PASS. Додатково V8 57/64 → 64/64. [Остаточний акт](docs/roadmap/SA_EXT_05_DOSSIER_READER_BOUNDARY_SCOPED_TERMINAL_20261031.md). remaining_scoped_implementation=0; necessary_unmerged_scoped_feature_PRs=0. **SA-EXT-05 батьківський OPEN; SA-EXT-03/04 parent TERMINAL.** Live Sites, D1, Windows/NVDA, реліз НЕ перевірені.

---
## 2026-10-31 — SA-EXT-05 / DOSSIER_VISIBLE_SOURCE_UNICODE — SCOPED TERMINAL

**ОСТАТОЧНО ЗАКРИТО ДЛЯ РОЗРОБКИ ЛИШЕ КОНКРЕТНИЙ ДЕФЕКТ** Unicode-підміни підписів біблійних джерел і назв досьє. Канонічні `/dossiers`, `/atlas` і Академія використовують спільну `validateDossierGraph`: невидимі/двонапрямлені символи, NUL і непарні сурогати більше не проходять до доступних назв або посилань читальні. [PR #943](https://github.com/Oleksii-debug/scripture-archive/pull/943) **SQUASH MERGED** у `main@52b8d69d8cea0b689ea2808bcb2cddc211cf7e9a`; джерельний blob `3449825ad740a206e07714409734ddb10de61ebb`, тести `ee1da0d29c9405e27c2f27120bcf91319d01d3d5`. Оригінальний код приймав 30/30 шкідливих fixtures; виправлений — 60/60 відхилено в source-executed V8. [Exact-head CI #41193714352](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41193714352) **SUCCESS**: native Node 3183 PASS / 0 FAIL / 1 SKIP, disposable Worker/D1 22 PASS, TypeScript/lint/build/Python PASS. [Точний акт](docs/roadmap/SA_EXT_05_DOSSIER_VISIBLE_SOURCE_UNICODE_SCOPED_TERMINAL_20261031.md). `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_feature_PRs=0`, `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` **лише для цього дефекту**. **Батьківський SA-EXT-05 залишається OPEN**; SA-EXT-03/04 залишаються parent TERMINAL; усе інше незакрите, Sites/production/Windows/NVDA НЕ ПЕРЕВІРЕНО. Деплой не виконували.

---

## 2026-10-31 — SA-EXT-05 / PASTED_CITATION_RANGE + FILTERED_RELATION_GET — TWO SCOPED TERMINAL

**Лише два конкретні дефекти ЗАКРИТО ДЛЯ ПОДАЛЬШОЇ РОЗРОБКИ / CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL.** Скопійовані біблійні цитати з довгим тире та пробілами приймає канонічний /dossiers (злитий [PR #940](https://github.com/Oleksii-debug/scripture-archive/pull/940), main@ba329072d1e325a5f419f956c69b3b2aa9245d8b, [CI #41192139022](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41192139022) SUCCESS). Переходи між пов'язаними досьє зберігають q тільки для цілей, які відповідають цьому пошуку ([PR #941](https://github.com/Oleksii-debug/scripture-archive/pull/941), main@6d1f48c9ed8b13ffb26fddf6ea6cdf43e7edaf3c, [CI #41192425545](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41192425545) SUCCESS). Повні native Node/TypeScript/lint/build/Worker-D1/Python workflow пройдені. [Постійний акт](docs/roadmap/SA_EXT_05_DOSSIER_QUERY_RELATION_SCOPED_TERMINAL_20261031.md) із точними source/test SHA. Для цих двох scope: remaining_scoped_implementation=0, necessary_unmerged_scoped_feature_PRs=0. **Повний SA-EXT-05 OPEN; SA-EXT-03/04 TERMINAL.** Site/Windows/NVDA/release НЕ ПЕРЕВІРЕНІ; деплою не було.

---

## 2026-10-31 — SA-EXT-04 / MEETING_NOTES_CONFIRMED_RECEIPT_PRESENTATION — SCOPED TERMINAL

**ЗАКРИТО ДЛЯ РОЗРОБКИ ЛИШЕ ПОСТТЕРМІНАЛЬНИЙ ДЕФЕКТ:** успішне збереження або GET-оновлення виправленого підсумку зустрічі більше не видає хибну помилку мережевого запису, якщо необов'язковий рендер рядка зустрічі завершується винятком. Канонічний `public/group-meeting-notes.js` залишає підтверджений snapshot доступним для наступної CAS-правки, а uk/ru/en повідомляють, що список не оновився і групу потрібно відкрити повторно. [PR #938](https://github.com/Oleksii-debug/scripture-archive/pull/938) **SQUASH MERGED** `main@415b5fbba0d2eff30a87851042c6ef0beccfdb3f`. [Exact-head GitHub Actions #41191031865](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41191031865) **SUCCESS**: native Node **3078 PASS / 0 FAIL / 1 SKIP**, disposable Worker/D1 **22 PASS**, Python **2 PASS**, TypeScript/lint/build PASS (наявні lint-попередження не блокували). Окрема V8-репродукція та regressions: первісна версія **9/12**, виправлена **12/12**. [Точна scoped-квитанція](docs/roadmap/SA_EXT_04_MEETING_NOTES_RECEIPT_SCOPED_TERMINAL_20261031.md). `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_feature_PRs=0` лише для цього дефекту. **Батьківський SA-EXT-04 уже TERMINAL і не відкривається знову**, решта незавершених SA-EXT лишається OPEN. Live Sites SHA, фізичні Windows/NVDA та реліз НЕ ПЕРЕВІРЯЛИСЯ; деплою не було.

---

## 2026-10-31 — SA-EXT-05 / FILTERED_DOSSIER_COMPARISON_GET_CONTINUITY — SCOPED TERMINAL

**ЗАКРИТО ДЛЯ ПОДАЛЬШОЇ РОЗРОБКИ ЛИШЕ ЦЕЙ ПІДПУНКТ / CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL**: канонічний `/dossiers` зберігає активний параметр пошуку `q` у GET-формі порівняння двох досьє; незфільтрований перегляд не отримує зайвого `q`. [PR #933](https://github.com/Oleksii-debug/scripture-archive/pull/933) **SQUASH MERGED** в `main@88d630663097e939673103cc3ada4c498503d22f`; [точна CI #41190160528](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41190160528) **SUCCESS**: Node 3073 PASS / 0 FAIL / 1 SKIP, Worker/D1 22 PASS, Python 2 PASS, TypeScript/lint/build PASS. [Остаточний акт](docs/roadmap/SA_EXT_05_FILTERED_DOSSIER_COMPARISON_SCOPED_TERMINAL_20261031.md): `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_feature_PRs=0` для підфункції. **Повний SA-EXT-05 OPEN; SA-EXT-03/04 зберігають попередній TERMINAL**, інші батьківські неповні розділи OPEN. Release/Sites/Windows/NVDA NOT_VERIFIED; деплою не було.

---

## 2026-10-31 — SA-EXT-04 / MEETING_HISTORY_UNTRUSTED_ROW_BOUNDS — SCOPED TERMINAL

**Розділ SA-EXT-04, вузький післятермінальний дефект — ЗАКРИТО ДЛЯ РОЗРОБКИ.** Справжня групова історія `public/group-meeting-history.js` відкидає неможливі календарні дати, надмірні `book_id` та понад 1200 символів приватного підсумку до HTML. [PR #932](https://github.com/Oleksii-debug/scripture-archive/pull/932) **SQUASH MERGED** в `main@dabbeeab1369fd239a05c21892147451fc02827e`. [Exact PR-head Actions #41190026599](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41190026599) **SUCCESS**: Node, TypeScript, lint, build, disposable Worker/D1 та Python. 34/34 відтворених неправильних випадки RED→GREEN; 4 коректні дати не заблоковані. [Термінальний scoped-акт](docs/roadmap/SA_EXT_04_MEETING_HISTORY_ROW_BOUNDS_SCOPED_TERMINAL_20261031.md). `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_prs=0` **лише цього дефекту**; original SA-EXT-04 parent terminal збережено. Увесь продукт/інші SA-EXT секції/встановлений Sites SHA/Windows/NVDA NOT_VERIFIED; релізу не було.

---

## 2026-10-31 — SA-EXT-16 / LOGOUT_RECEIPT_TRUTH + PASSWORD_CHANGE_RECEIPT_TRUTH — ДВА SCOPED TERMINAL

**ОСТАТОЧНО ЗАКРИТО ДЛЯ РОЗРОБКИ ЛИШЕ ДВІ ПІДФУНКЦІЇ:** канонічний `/account` не заявляє про завершення виходу чи зміни пароля за порожнім/неправильним HTTP 2xx: перед очищенням стану користувача вимагає явного `{ok:true}` від єдиного `/api/auth`, що підтверджує відкликання сесії або успішну D1-зміну пароля. [Реалізація й 16 регресій PR #931](https://github.com/Oleksii-debug/scripture-archive/pull/931) **SQUASH MERGED** у `main@752dc18d008e877dc54b16fdc0b22115054c9735`, [exact-head CI #41189968502](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41189968502) **SUCCESS** (Node 3030 PASS / 0 FAIL / 1 SKIP; Worker/D1 22 PASS; Python 2 PASS; TS/lint/build PASS); [остаточний акт](docs/roadmap/SA_EXT_16_AUTH_EXIT_ACK_TRUTH_SCOPED_TERMINAL_20261031.md). Обидві підфункції: `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_feature_PRs=0`; `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`. **Батьківський SA-EXT-16 залишається OPEN**, як і повний продукт до Sites/D1/NVDA/Windows/правового та release-приймання. Деплою не було.

---

## 2026-10-31 — SA-EXT-16 / DELETE_RECEIPT_TRUTH — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**Лише цю підфункцію ЗАКРИТО ДЛЯ ПОДАЛЬШОЇ РОЗРОБКИ:** канонічний `/account` очищає стан користувача після видалення акаунта лише якщо `POST /api/auth?action=delete-account` повернув `{ok:true}`. Порожній/неправильний HTTP 2xx більше не створює хибного повідомлення про видалення або знищення локального прогресу. Реалізація і 8 нових регресій [PR #929](https://github.com/Oleksii-debug/scripture-archive/pull/929) **SQUASH MERGED** в `main@83883a5e7c6ac21c7db45acad4054012c5212c83`; [exact-head Actions #41189568243](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41189568243) **SUCCESS** (Node 3014 PASS / 0 FAIL / 1 SKIP; Worker/D1 22 PASS; Python 2 PASS; TypeScript/lint/build PASS). [Точний terminal receipt](docs/roadmap/SA_EXT_16_DELETE_RECEIPT_TRUTH_SCOPED_TERMINAL_20261031.md) з blob SHA. `remaining_scoped_implementation=0` і `necessary_unmerged_scoped_feature_PRs=0` тільки тут. **Батьківський SA-EXT-16 залишається OPEN**, production Sites/D1, Windows/NVDA, політика зберігання та реальний реліз НЕ ПЕРЕВІРЕНІ; деплою не було.

---

## 2026-10-31 — SA-EXT-05 / EXACT_SHARED_VERSE_INTERSECTION — ПІСЛЯТЕРМІНАЛЬНИЙ ДЕФЕКТ ЗАКРИТО

**CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** лише для точного перетину віршів у вже інтегрованому порівнянні досьє. Замість лише двох повних біблійних діапазонів тепер показано посилання на їхню математичну спільну частину (Авраам/Сарра HEB 11:11–12; Давид/Єрусалим 2SA 5:6–10) зі збереженням обох оригінальних джерел, класифікації та uk/ru/en. [PR #927](https://github.com/Oleksii-debug/scripture-archive/pull/927) **SQUASH MERGED** в `main@490f71c38e5c5855a2de5dad39c67da10d764538`. [Exact-head CI #41189373527](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41189373527) **SUCCESS** (Node/TypeScript/lint/build/Worker-D1/Python); окремо V8 19/19 PASS (не браузерний/NVDA тест). [Термінальний scoped-акт](docs/roadmap/SA_EXT_05_EXACT_COMMON_VERSE_SPAN_SCOPED_TERMINAL_20261031.md). `remaining_scoped_implementation=0`, але **батьківський SA-EXT-05 OPEN**, deployed Sites/NVDA/Windows не підтверджені, релізу не було.

---

## 2026-10-31 — SA-EXT-16 / PROVIDER_CONFLICTING_2XX_ACK — SCOPED TERMINAL

**CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** лише для fail-closed квитанції приймання пошти: HTTP 2xx з id не доводить доставки, якщо провайдер одночасно повернув `error` або `errors`. [PR #920](https://github.com/Oleksii-debug/scripture-archive/pull/920) SQUASH MERGED `main@9bb549ede51d006fdd112aba9d012f6db46bb4c0`; [точний PR-head CI #41188413599](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41188413599) SUCCESS, [main push CI #41188656780](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41188656780) SUCCESS; [термінальний акт](docs/roadmap/SA_EXT_16_PROVIDER_RECEIPT_CONFLICT_SCOPED_TERMINAL_20261031.md). `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0` лише тут. **SA-EXT-16 загалом OPEN** (production email/DNS, приватність, NVDA/Windows та операційні перевірки). Реальних листів не надсилали; реліз НЕ ОНОВЛЮВАЛИ.

---

## 2026-10-31 — SA-EXT-05 / DOSSIER_CANONICAL_SOURCE_COMPARISON — ВУЗЬКУ ФУНКЦІЮ ЗАКРИТО

**CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL**: на чинному `/dossiers` працює вибір двох досьє, порівняння усіх опублікованих біблійних уривків, точних перетинів діапазонів і розмежування оповіді/інтерпретації з посиланнями `/reader`. Одна canonical база, семантичні форми та uk/ru/en. [PR #921](https://github.com/Oleksii-debug/scripture-archive/pull/921) **SQUASH MERGED** до `main@1fc1fbaf0254d11241f4b31863e24b063d0177e3`. [Exact-head Actions #41188827090](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41188827090) **SUCCESS**: native Node, TS/lint/build, disposable Worker/D1, Python; окремо exact-source V8 **49/49 PASS** (не Chrome/NVDA). [Формальний scoped-акт](docs/roadmap/SA_EXT_05_DOSSIER_COMPARISON_SCOPED_TERMINAL_20261031.md), `remaining_scoped_implementation=0` тільки тут. **Увесь SA-EXT-05 залишається OPEN** (джерела, права, повний дослідницький обсяг), Sites SHA/Windows/NVDA/deployment не перевірялися.

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
