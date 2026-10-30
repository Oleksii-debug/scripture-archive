# Scripture Archive — canonical source convergence handoff, 2026-10-30

Це **підхоплюваний технічний звіт про фактичну роботу**, не декларація `PLATFORM_DONE` і не новий план. Повний затверджений обсяг — `docs/roadmap/SCRIPTURE_ARCHIVE_EXPANSION_SECTION_PLAN_2026-10-28.md`, issue #295; єдина координація #297, управління #78. Репозиторій: https://github.com/Oleksii-debug/scripture-archive. Не плутати з окремим репозиторієм Accessible-Chess.

## CURRENT first-five source convergence 2026-10-30 — підтверджений додаток

Цей додаток посилається на реальні **злиті** кодові зміни, без нового parallel board чи серверного контуру. Всі зміни в канонічних інтерфейсах, і всі п'ять батьківських **SA-EXT-01…05 залишаються OPEN**. Не трактувати 4 вузькі завершення дефектів як виконані 4 або 5 повних розділів.

| Перший OPEN parent | Код, precise original main integration | Source-executing tests і exact-head CI | Офіційне закриття вузького обсягу |
| --- | --- | --- | --- |
| 01 — приватний reading export, метадані прогресу | [#685](https://github.com/Oleksii-debug/scripture-archive/pull/685), `252e637a7993488cbc1be218d96cd8d2d15e93e2` | 11 negative progress identity/time scenarios, [CI 41055352814](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41055352814) SUCCESS | [#691](https://github.com/Oleksii-debug/scripture-archive/pull/691), terminal receipt `SA_EXT_01_PROGRESS_EXPORT_METADATA_TERMINAL_20261030.md` |
| 02 — історія оцінювання, score vs total | [#694](https://github.com/Oleksii-debug/scripture-archive/pull/694), `e9d14c5722c4206201ce81a28c6dd079d98a732d` | 10 corrupted score/total variants, isolation/recovery, [CI 41056643516](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41056643516) SUCCESS | [#697](https://github.com/Oleksii-debug/scripture-archive/pull/697), `SA_EXT_02_ATTEMPT_HISTORY_SCORE_TERMINAL_20261030.md` |
| 03 — справжній export авторських матеріалів | [#699](https://github.com/Oleksii-debug/scripture-archive/pull/699), `88720a96b84706038cdbc77cd1b9063a8c339a8b` | 30 negative malformed draft/snapshot examples plus valid Unicode roundtrip, [CI 41057584095](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41057584095) SUCCESS | [#703](https://github.com/Oleksii-debug/scripture-archive/pull/703), `SA_EXT_03_MATERIAL_EXPORT_RESTORABILITY_TERMINAL_20261030.md` |
| 04 — truthful public/private group aggregates | [#709](https://github.com/Oleksii-debug/scripture-archive/pull/709), `be9d32cf58fd671f7bb9920c69d89409f9ae1ed7` | 19 damaged counter variants × 2 GET views plus 2 real control checks, [CI 41058471195](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41058471195) SUCCESS | [#714](https://github.com/Oleksii-debug/scripture-archive/pull/714), `SA_EXT_04_GROUP_AGGREGATE_INTEGRITY_TERMINAL_20261030.md` |
| 05 — reusable work by another worker: filtered dossier result links | [#706](https://github.com/Oleksii-debug/scripture-archive/pull/706), `9696a0fb75b0d92678a5cb1a2add96387d4a4bdf` | roundtrip with UK/RU/EN, percent-encoded query, [CI 41058258952](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41058258952) SUCCESS | Already indexed as `DOSSIER_FILTERED_RESULT_LINK_ROUNDTRIP` in the canonical plan; **do not duplicate #706** |

**Машинна перевірка в цьому виконанні:** кожен із чотирьох нових source PR пройшов native Node, TypeScript, ESLint, source build, disposable HTTP Worker/D1 і Python CI на точному HEAD. Для всіх чотирьох код і тести повторно прочитані з main після merge, source blobs наведені в окремих terminal receipts; всі 4 документаційні PR потрапили до main. П'ятий source PR #706 від іншого воркера додатково перевірено на merge/CI та наявність активного посилання і відповідного запису roadmap; ніяких дублюючих правок не створювати.

**Що реально НЕ завершено:** підтримка і права видань (01), ширший каталог місій/перекладів (02), повний авторський/editorial цикл (03), реальні cross-account/browser/NVDA групи/марафони (04), наукове джерелознавство й незалежний review досьє (05). Всі R0.1–R0.5 нижче відкриті. З цієї сесії https://scripture-archive.com/ не вдалося прочитати інструментом перевірки вебсторінок: **це не доказ недоступності сайту**, лише відсутність verified production build SHA. Host deployment, external mail/DNS, real users і NVDA не змінювалися. `PLATFORM_DONE=false`, `SOURCE_SCOPED_FIXES_IN_MAIN=true`, `ALL_PARENT_SECTIONS_OPEN=true`.

### Послідовність підхоплення

Відкрий реальний HEAD main, root AGENTS.md і [issue #297](https://github.com/Oleksii-debug/scripture-archive/issues/297). Перевір активні PR та CI, не змінюй уже закриті вузькі функції без відтворюваного дефекту. **Перше завдання на критичному шляху:** отримати доказ installed live SHA та ownership/rights на первинні видання (R0.1 і SA-EXT-01), паралельно відділити невирішені source-вимоги від зовнішніх release blockers. Потім перевірити реальний Chrome/NVDA і дві ролі після deployment; не ставити `CLOSED_FOR_DEVELOPMENT` для повних parent без відповідних артефактів. Якщо production access не підтримується, рухайся до незавершених source-частин, а не створюй ще один roadmap.

---

## Перевірено реально, код уже в main

| Вузька підфункція | Функціональний PR / exact main merge SHA | Код/автотести й CI | Статус |
| --- | --- | --- | --- |
| SA-EXT-01 / READING_EXPORT_CANONICAL_TITLE_BOUNDARY | #670 / `4cb564da6b705b1296e552c20ca8e2b7ade4f78f` | 7 нових production-route cases; CI 41053249167: 1681 Node PASS + 1 SKIP, 22 Worker/D1 PASS, Python 2/2, TS/lint/build PASS | `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`; receipt #674 |
| SA-EXT-02 / STORED_ATTEMPT_LOCALE_FAILCLOSED | #676 / `f83954934c8b53f6664fa48a57b51c27600c3d9f` | 48 нових production-route cases; CI 41054194991: 1738 Node PASS + 1 SKIP, 22 Worker/D1 PASS, Python 2/2, TS/lint/build PASS | `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`; receipt #681 |
| SA-EXT-03 / ADMIN_CONTENT_READ_D1_ACK | #683 / `4eb14c499e11cf5521adf6b2b1088f53beb3b71c` | 10 нових production-route cases; CI 41055178927: 1749 Node PASS + 1 SKIP, 22 Worker/D1 PASS, Python 2/2, TS/lint/build PASS | `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`; receipt pending merge of this document |

Всі три source PR: MERGED, перевірено `get_pr_info`, exact `main` readback, вихідні/тестові blob SHA, `compare_commits`. CI логи реально перевірені; це **не** фізичне NVDA або live-prod acceptance. Усього додано **65 незалежних автоматизованих route-test cases**, але **жоден із 20 батьківських великих розділів не оголошено terminal**. Не перепризначати завершені вузькі дефекти без конкретної нової репродукції.

## Перша п'ятірка великих незавершених розділів — НЕ ЗАКРИТО

1. **SA-EXT-01** — розширення видань, реальні ліцензії та джерела, правильні багатомовні/паралельні тексти, цитування/пошук/клавіатура й NVDA. Reading-export title defect закритий; решта вимог не виконана автоматично.
2. **SA-EXT-02** — повні місії/каталог, повторення, рівні складності, захищена перевірка, збереження/відновлення результатів, переклади. Stored-locale defect закритий; решта — OPEN.
3. **SA-EXT-03** — конструктор, автор/редактор, незалежне затвердження, версіонування, відкликання, експорт/права і аудит. Owner CMS read ACK закритий; приймання всього редакційного циклу не підтверджене.
4. **SA-EXT-04** — групи/марафони, приватність, дві ролі, вихід/передача/видалення, реєстрація, повторний вхід, реальний end-to-end. Є окремо закриті scoped PR, але parent OPEN.
5. **SA-EXT-05** — досьє, граф першоджерел, контекст/джерела, source provenance, перевірені права й атрибуція; parent OPEN.

**Надалі:** вибирати першу реально відтворену відсутню вимогу першого OPEN parent із затвердженого плану, перевірити актуальний live main + відкриті PR і claims #297, повторно використовувати існуючу canonical реалізацію. Чітко відрізняти `SOURCE_READY`, `CLOSED_FOR_DEVELOPMENT_SCOPED`, `RELEASE_VERIFIED`. Не створювати конкуруючих board/server/db, не повторювати вже злитий source fix. Ставити лише підтверджений повний parent `CLOSED_FOR_DEVELOPMENT / TERMINAL`.

## Незалежні production/release блокери

- **R0.1:** live Cloudflare Pages/Sites installed SHA проти GitHub main — **не підтверджено**.
- **R0.2:** реальний email/DNS SPF/DKIM/DMARC та register→verify→recover→login — **не прийнято**.
- **R0.3:** attempts disclosure patch, release governance — **перевірити поточний актуальний стан**, не активувати самочинно.
- **R0.4:** власницький Stop/Continue, Cron actual state, failclosed контролі — **не прийнято**.
- **R0.5:** фізичний Chrome keyboard/NVDA, mobile, міжрольові сценарії читальня→місія→прогрес→повторний логін і група→зустріч→звіт — **не підтверджено**.
- **R0.6:** жодних нових автоматичних розсилок, payments, synthetic community/dating profiles, release без окремої авторизації; SA-EXT-20 **planning only**, separate 18+ product/data, не розміщено.

### Відновлення

Відкрий issues #295/#297/#78, онови main SHA, перечитай `AGENTS.md`, цей handoff і канонічний roadmap. Звір усі нові PR та CI за **точним HEAD**, не за минулим стабільним run. Якщо PR з кодом уже злитий конкурентним агентом — не повторюй його. Для кожного завершеного defect — окремий доказ (PR, merge SHA, original source/test blob, CI run, readback), roadmap receipt, тільки тоді scoped terminal. **Не підміняй повне завершення платформи десятками вузьких дефектів.**
