# SA-EXT-01 — пошкоджені закладки: остаточне закриття вузької реалізації (2026-10-30)

**Рішення:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` лише для підтвердженого відновлення пошкоджених записів закладок у приватному читачі. `remaining_scoped_implementation=0`, `necessary_unmerged_scoped_PRs=0`. **Повний батьківський SA-EXT-01 і всі 20 SA-EXT-01…20 залишаються OPEN.** Не підміняти source-closure заявою про розгорнутий продукт.

## Затверджений обсяг, фактично реалізований
- `GET /api/bookmarks` відокремлює коректні закладки від пошкоджених історичних рядків; коректні залишаються навігаційними, пошкоджені — ні; показується `partial_bookmarks` і обмежений текстовий опис пошкодження.
- Для кожного пошкодженого рядка сервер створює непрозоре посилання на конкретний `user_id`, SQLite `rowid` та всю початкову ідентичність рядка. `DELETE` авторизований і same-origin, вимагає явного підтвердження в доступному інтерфейсі та порівняння всіх стовпців безпосередньо в SQL.
- Після зміни рядка/власника, відсутності або ремонту запису, неоднозначного D1 підтвердження `changes`, помилки БД чи невдалого підтвердження немає фальшивого `ok:true`. GET нічого не видаляє. Валідні записи, інші користувачі та звичайний PUT/DELETE лишаються незмінними.
- У `public/app.js` — UK/RU/EN підписи, опис як екранований текст, кнопка без небезпечних посилань, окреме підтвердження, `role=alert`/`aria-live`, перевірка поточного користувача/глави і оновлення після успіху.

## GitHub інтеграція
- Issue [#658](https://github.com/Oleksii-debug/scripture-archive/issues/658); PR [#661](https://github.com/Oleksii-debug/scripture-archive/pull/661) **SQUASH MERGED**.
- Merge/source `main@f7e13981f7529e57e9c96cd89dfe8ac3dce221f5`; PR exact head `f652c5407913c90d119b2911465fa0930ecbded9`; final `main` readback збігся з merge SHA.
- Інтегровані production paths: `app/api/bookmarks/route.ts` (blob `b26d1c88e53ffdd37499f9a7504e37613ebb3056`), `public/app.js` і три тести `tests/bookmark-recovery-{route,sqlite,ui}.test.mjs`. Нових сервісів, API authority, D1 схем, секретів чи deployment не створено.

## Незалежне автоматизоване виконання
- [Actions #41051249744](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41051249744), exact PR head: **SUCCESS**, executed job `124047600954`, steps were executed rather than queued.
- Native `npm test` (Node): **1644 PASS / 0 FAIL / 1 SKIP** (1645 tests); `npx tsc --noEmit`: PASS; `npm run lint`: exit 0 (13 попереджень, 0 помилок); `npm run build`: PASS.
- Disposable local Worker/D1 `npm run test:integration`: **22 PASS / 0 FAIL**; `python -m pytest -q tests`: **2 PASS**.
- Negative tests include: compromised description/XSS, malformed/reference spoofing, another principal, stale/concurrently edited row, missing D1, failed/multiple ACK, unauthorized Origin, disabled confirmation, late user switch, keyboard-accessible labels/controls. Це automated source/UI test evidence, не фізичний NVDA acceptance.

## Межі, наступний крок
- `WEB_DEPLOYED=NOT_VERIFIED`, `LIVE_SITES_SHA=NOT_VERIFIED`, `HUMAN_NVDA_PASS=NOT_VERIFIED`. Не публікували сайт та не запускали листи/міграції.
- Відкриті питання решти SA-EXT-01: повна інтеграція й браузерне приймання, права/джерела видань, production Sites readback, інші підфункції плану. #297 — вже наявна координаційна дошка; дубль не створювати.
- **Повторна розробка саме цього scope заборонена** без нової вимоги або конкретного відтвореного дефекту. Нові ідеї чи вдосконалення не блокують це scoped-closure.
