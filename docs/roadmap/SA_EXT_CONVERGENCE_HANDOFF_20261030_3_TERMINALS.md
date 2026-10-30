# Scripture Archive — canonical source convergence handoff, 2026-10-30

Це **підхоплюваний технічний звіт про фактичну роботу**, не декларація `PLATFORM_DONE` і не новий план. Повний затверджений обсяг — `docs/roadmap/SCRIPTURE_ARCHIVE_EXPANSION_SECTION_PLAN_2026-10-28.md`, issue #295; єдина координація #297, управління #78. Репозиторій: https://github.com/Oleksii-debug/scripture-archive. Не плутати з окремим репозиторієм Accessible-Chess.

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
