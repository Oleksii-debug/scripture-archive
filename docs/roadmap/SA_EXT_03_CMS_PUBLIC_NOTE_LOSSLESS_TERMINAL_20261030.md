# SA-EXT-03 — CMS_PUBLIC_NOTE_LOSSLESS — вузький дефект остаточно закрито
Дата: 2026-10-30
Статус: **CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL**
Повний батьківський розділ SA-EXT-03: **OPEN**. Всі 20 розділів SA-EXT-01…20: **OPEN**.

## Що саме завершено
Власник редагував публічну тримовну нотатку через наявний `PUT /api/content`. Сервер непомітно обрізав кожне значення `uk`, `ru`, `en` після 600 UTF-16 одиниць (`.trim().slice(0,600)`), записував змінений текст у D1 і повертав `ok:true`. Це суперечило авторизованому змісту редактора.

Канонічний шлях `app/api/content/route.ts` тепер перевіряє кожен нормалізований рядок ДО будь-якого D1-запису. Більше ніж 600 — `400 invalid_content_note`, без мутації. Допустимі тексти на точній межі, включно з Unicode, коректно зберігаються повністю; дозволене обрізання лише навколишніх пробілів, і навмисно порожні три поля залишаються дозволеними. Авторизація власника, Origin, D1 atomic batch/ACK, редакційні ревізії та публічний GET залишилися канонічними. Нових API, БД, релізів чи перекладів немає.

## GitHub-інтеграція
- Код і регресійні тести: [PR #628](https://github.com/Oleksii-debug/scripture-archive/pull/628), **squash MERGED**.
- Точний SHA інтеграції source у `main`: `22bab7c4530699be2bc37b5f51fffc571138657f`.
- Підтверджені git blob SHA: `app/api/content/route.ts` — `989f9a058876101f77d05f8b2eb3d5fe05533174`; `tests/content-batch-ack.test.mjs` — `63f325af981e121880ee069773adc613bdcfe6ee`.
- Обидва blob прочитані з merged `main`; порівняння feature commit із тодішнім `main` = `identical`; PR `merged=true`.
- `remaining_scoped_implementation=0`; `necessary_unmerged_PRs=0`. Не розробляти повторно без нового дефекту/вимоги.

## Фактична перевірка і межі доказів
GitHub Actions [run #41039537700](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41039537700) на PR HEAD `1eb738faa589c887ff3bf392590fc2176e145bb6`:
- Native Node `1486 PASS / 0 FAIL / 1 SKIP` із шістьма новими перевірками реального transpiled CMS route, TypeScript, ESLint, build — PASS.
- Python існуючі валідатори — `2 PASS`.
- Disposable Worker/D1 E2E — **FAIL 21/22, двічі на незалежних тимчасових D1**. На `POST /api/editor-roles` повернуто `503` замість `200`; явний текст `Your worker restarted mid-request`. Це відомий окремий CI release blocker [#618](https://github.com/Oleksii-debug/scripture-archive/issues/618). Повний workflow — **FAIL**, не PASS.
- Production Sites SHA, реальний browser/WebView2, Windows/NVDA, фізичний тест, email та реліз — **NOT_VERIFIED**. Жодного production deploy, Cron, стороннього контакту або запису у реальну D1 не виконував.

## Продовження
Надалі працювати над наступними неповними підпунктами SA-EXT-01…20 та окремо усувати CI #618/реальні release blockers; цей bounded CMS дефект викреслити з розробки. Контрольний реєстр: [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297), затверджений план: `docs/roadmap/SCRIPTURE_ARCHIVE_EXPANSION_SECTION_PLAN_2026-10-28.md`.
