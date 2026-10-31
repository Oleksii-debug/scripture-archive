# РОЗДІЛ SA-EXT-03 — ЗАКРИТО ДЛЯ ПОДАЛЬШОЇ РОЗРОБКИ

**Дата:** 2026-10-31. **Остаточний статус:** `CLOSED_FOR_DEVELOPMENT / TERMINAL` для **затвердженого технічного обсягу «Конструктор і редакційний процес»**. Нові ідеї не розширюють заднім числом цей розділ; конкретний дефект або затверджена зміна — окрема задача.

**Контрольний source-main:** `79a8e40cee2c3eb0e0901c5b8b260cb4b0a149c9`. Це SHA інтегрованого коду, а не поточного деплою. [Головний репозиторій](https://github.com/Oleksii-debug/scripture-archive).

## Звірка всього затвердженого функціоналу

1. **Автор створює й редагує справжню вправу**: `/builder` через канонічний `public/workspace.js`, текст, варіанти, відповідь, посилання, пояснення та мову; `app/api/materials/route.ts` зберігає приватні матеріали у D1 з авторизацією. Не демо, не окремий недоступний файл.
2. **Автор переглядає і тестує вправу**: реальна форма локального самоконтролю з радіокнопками, перевіркою вибору і фідбеком; відповідь приватної чернетки не потрапляє в публічний список.
3. **Надсилання редакторові**: `app/api/material-review/route.ts` зберігає незмінний snapshot із джерелом, декларацією прав автора, версією й точними межами даних; повторне чи конкурентне надсилання захищене D1 транзакцією.
4. **Редактор і власник**: `app/api/editor-roles/route.ts` підтримує verified-owner grant/revoke, редакторську чергу, заборону саморецензування; аудит ролей і рішень зберігається. `public/material-review.js` доступний через справжній `/builder` і owner `/editor`.
5. **Source/rights review і рішення**: редактор позначає окрему перевірку джерела й права, затверджує або відхиляє з причиною. Публікація створює approved snapshot і атомарно відсуває попередню версію; клієнт не може обійти серверну роль. Людське судження про справжню ліцензію не підмінюється галочкою і належить до користування вже готовою функцією.
6. **Версії, відкликання і зняття правовласником**: історія редакційних snapshots, обмеження однієї pending версії, owner/author withdraw, редакторський rights takedown з журналом та rollback на помилці.
7. **Приватний export**: `/api/materials?mine=1&export=1` повертає власні чернетки й історію редакцій у JSON для збереження/відновлення; анонім не читає чужих даних.
8. **Публічний пошук і практика без витоку відповідей**: публічні лише схвалені записи, пошук і keyset pagination, приховані правильна відповідь та пояснення до POST answer, формати й межі перевірені.
9. **Клавіатура, стани й захист від старих сесій у коді**: реальні підписані input/fieldset, статус і фокус, відновлення після дій, stale-principal guards, приватні `/builder` і `/editor` BFCache-сесії очищаються до повторної серверної авторизації.

## Конкретний main і перевірки

- Канонічні production blobs: `app/api/materials/route.ts@3c4e3a76f582898915e090a010c8cbee1426aa83`; `app/api/material-review/route.ts@3bd9c2d388cd4c31760e7875aca885d0f9d34f11`; `app/api/editor-roles/route.ts@6ce12d8ab2865c5f4a8ccb4dbc3e143884b5672c`; `app/api/content/route.ts@ecae548f58908b5e0089aeb6f405dee08398632a`.
- Реальна UI інтеграція: `public/app.js@da1a0bffcccc3fe21669a8d8cf8c79c36b556904`; `public/workspace.js@a6a5a8000f0b486c6da436603160af05e04bc971`; `public/material-review.js@60f06d9595b661feb17088963c49923f4e4e536d`.
- D1 структурна основа: `drizzle/0011_material_review.sql@65fe938fe205a568b93248327e0bd9be09fa9b56` і `0012_editor_roles.sql@bb37a861abed3b19c6b033b3a76599ac987de791`.
- Незалежні позитивні та негативні перевірки: `tests/material-review.test.mjs@1db5d2ebf8917706289cf91186b32a7fa57bd2b9` (26 тестів: авторство, self-review denial, verified редактор, права, immutability, rollback, answer secrecy, pagination, takedown); `tests/editor-role-audit.test.mjs@0689efa05c0c78d0a60bb3dab0a66f5460cef4b8`; `tests/materials-auth-availability.test.mjs@6ee0e7505ff8ab481029d5c9b5fddf568b2f36bd`; `tests/editorial-bfcache-privacy.test.mjs@7486750bcada0a2b963a28ac2d85d2b71de2488a`.
- [Functional PR #819](https://github.com/Oleksii-debug/scripture-archive/pull/819) і [#822](https://github.com/Oleksii-debug/scripture-archive/pull/822) **MERGED**. [Exact-head full CI #41164386403](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41164386403) **SUCCESS**: Node/TS/lint/build/disposable Worker-D1/Python. Після останнього code-merge звірені actual main/blob/status.
- Старий draft [PR #325](https://github.com/Oleksii-debug/scripture-archive/pull/325) має head, що на 498 commit позаду main і стосується вже наявних актуальніших production routes та tests. Він **не є необхідною незлитою функцією SA-EXT-03**; його не зливали безпідставно.

## Остаточна межа

Для затвердженого SA-EXT-03: **`remaining_approved_development=0`; `necessary_unmerged_PRs=0`; `CLOSED_FOR_DEVELOPMENT / TERMINAL`**. Не призначати цей розділ на повторну розробку без конкретного дефекту або нової письмової вимоги. Додаткові медіакурси/конференції/зовнішні партнерські ліцензії належать до інших розділів.

**Окремий production/release acceptance (не причина знову розробляти SA-EXT-03):** жива міграція D1 й backup, реальна редакторська/правовласницька перевірка конкретних матеріалів, browser/Windows/NVDA, Sites SHA, власник релізу. Ці результати **NOT_VERIFIED**. Функціональність зараз **в main**, а не підтверджено встановлена на `scripture-archive.com`.
