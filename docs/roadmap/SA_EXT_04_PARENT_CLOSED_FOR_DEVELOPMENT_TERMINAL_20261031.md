# РОЗДІЛ SA-EXT-04 — ЗАКРИТО ДЛЯ ПОДАЛЬШОЇ РОЗРОБКИ

**Дата:** 2026-10-31. **Остаточний статус затвердженої розробки:** `CLOSED_FOR_DEVELOPMENT / TERMINAL` для **«Домашні групи та навчальні марафони»**. Живе встановлення, людські рольові випробування й production migration — окрема зона релізу, не новий розділ розробки.

**Звірений функціональний source-main:** `79a8e40cee2c3eb0e0901c5b8b260cb4b0a149c9`, не встановлений Sites SHA.

## Фактичний повний обсяг у канонічній платформі

1. **Каталог, створення, вступ і власник групи**: `/groups` і `/groups/<id>` реально підключені до канонічного `app/api/groups/route.ts` та D1. Створення забезпечує атомарну групу, owner membership і cohort; приєднання використовує запрошення з перевіркою поточного коду і прав.
2. **Приватність і згода**: публічні показники відокремлено від текстів розмов та приватного складу. Імена можна показувати лише за вибором учасника. Контролі, статус, відсутність витоків і server-side право доступу мають негативні тести.
3. **Справжні ролі/керування членством**: owner/facilitator/member із серверним обмеженням і перевіркою безпосередньо перед зміною. Підтримано owner settings, рольові зміни, rotation invite, вихід, атомарна передача власності, confirmed owner deletion, rollback при збоях.
4. **Зустрічі, відповіді, оцінювання, підсумки**: авторизоване збереження `session`, cohort-пов'язані спроби в канонічному `app/api/attempts/route.ts`, чесні counts і percentages; коректні приватні текстові нотатки, точні присутні. Формування зустрічі не створює дубльованого навчального рушія.
5. **Історія та редагування зустрічей**: сторінки `meetings` із server-side member access, cursor/keyset і контролем рендерингу; власник може виправити нотатки, facilitator лише власні зустрічі, snapshot-conflict захищає від застарілих змін.
6. **Марафони/cohort**: запуск із роллю facilitator/owner, атомарні межі cohort і групових спроб, історія та видимість результатів у канонічній оболонці.
7. **Справжній UX доступності**: підписані HTML-поля/кнопки, керування фокусом після оновлень, україномовні тексти, відсутність дубльованого сайту, перегляд через основний `public/app.js`.
8. **Вихід зі сторінки/відновлення браузера**: приватна історія зустрічей і весь group-detail (коди запрошень, roster) синхронно очищуються при `pagehide`; застарілі GET та старе `getSession()` не можуть перезаписати новий сеанс після `pageshow`. Source defects виправлено #811, #815, #818 із коректним збереженням паралельних змін.

## Код, інтеграція та завершені регресії

- Канонічні source blobs: `app/api/groups/route.ts@1f8bd79b2c3a8db2dd0f7e0ca4ac596a78d59616`; `app/api/attempts/route.ts@9560f683902086c3f310a902bf9cb704fb9b84a7`; `public/app.js@da1a0bffcccc3fe21669a8d8cf8c79c36b556904`; `public/group-meeting-history.js@04137ff02e618f95591de0472399e9fea3abc391`.
- D1 source migrations: `drizzle/0001_home_groups.sql@e176eb42d523e2bc00c8c9c39f1deec5cc2fd6df`, `0003_group_answers.sql@7dd9404695f221b36a579a127e7c1f31f3f30097`.
- `tests/group-membership.test.mjs@75b4a560780cb322b8ace1eaa5332c912e26805c`: справжній D1-хід груп, owner/member role separation, atomic ownership transfer, create/rotation/join/leave/role/deletion/session, pagination, notes, recovery та adversarial cases.
- `tests/group-reflection-privacy.test.mjs@bfe7f26f61e875cddb8660c0625c315b3b04b423` і `tests/groups-public-aggregate-integrity.test.mjs@9452c401b8cb92a3701a2387c23422d695cd906d`: відокремлення приватних нотаток від загальних показників.
- `tests/group-control-session-fence.test.mjs@8e91582b64975651aa7a19bf9e5478112c27a9f6`: перевірка чинного користувача/маршруту/повторного читання після дії.
- `tests/group-meeting-bfcache-privacy.test.mjs@d7ef8534e3a1bd4d4e2af9e4b3b7130fac3a4ac6` і `tests/group-detail-bfcache-privacy.test.mjs@240ee00a87c822b2a35aade50af7c5279844d834`: 8 і 12 критичних source-executed сценаріїв приватного BFCache.
- [Merged #811](https://github.com/Oleksii-debug/scripture-archive/pull/811), [merged #815](https://github.com/Oleksii-debug/scripture-archive/pull/815), [merged #818](https://github.com/Oleksii-debug/scripture-archive/pull/818); історія зустрічей/notes #814 — також merged, збережена під час інтеграції.
- [Full exact-head GitHub Actions #41164386403](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41164386403) — **SUCCESS** Node / TypeScript / lint / build / disposable Worker-D1 / Python на вже інтегрованих source fixtures. Проведено postmerge source, CI і SHA readback.
- Перевірено наявні відкриті PR: жоден не є необхідним для завершення саме цього затвердженого розділу. Не поглинали застарілі draft-PR чи чужі сервіси без узгодження.

## Остаточна межа

**`remaining_approved_development=0`; `necessary_unmerged_PRs=0`; `CLOSED_FOR_DEVELOPMENT / TERMINAL`.** Надалі не призначати повторну розробку цього розділу без відтвореного дефекту або нової затвердженої вимоги. Майбутні ширші community/chats/events/atlas функції належать до інших SA-EXT розділів.

**Окремий власник release/QA:** міграція та backup production D1, перевірка двома справжніми акаунтами різних ролей, реальний Chrome/NVDA на Windows, exact deployed Sites SHA, реальні групи й consent/withdrawal acceptance. Ці перевірки **NOT_VERIFIED**, тому «розділ закритий для розробки» **не означає**, що встановлений сайт уже експлуатаційно підтверджений.
