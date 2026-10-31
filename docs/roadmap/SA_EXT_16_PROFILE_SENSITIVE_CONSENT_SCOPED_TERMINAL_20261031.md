# SA-EXT-16 — PROFILE_SENSITIVE_CONSENT_PRESERVATION — FINAL SCOPED CLOSURE

**Дата:** 2026-10-31  
**Статус:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`  
**Батьківський SA-EXT-16:** `OPEN` (це не закриття повного розділу).  
**Канонічний source-merge main:** `1198f6d6b7a89cb671644718d5180e8811546f4f`  
**Source PR:** [#977](https://github.com/Oleksii-debug/scripture-archive/pull/977), `merged=true`.  
**Кваліфікований PR-head:** `f6e0a9cb2961ebd14eb0140785861453294161ec`.  
**GitHub Actions:** [#41218379475](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41218379475) на exact PR head, `completed / success`.

## Реалізація, наявна у справжній платформі

У канонічному `POST/PUT /api/account?action=profile` (файл `app/api/account/route.ts`) виправлено втрату приватної згоди при оновленні профілю старими клієнтами. Раніше відсутнє поле `acceptSensitive` непомітно прирівнювалося до `false` і стирало раніше прийняту згоду та чутливі значення. Тепер у тій самій атомарній SQLite/D1 UPSERT-транзакції за **відсутнього** поля зберігаються попередні `sensitive_consent`, версія згоди, традиція, громада, конфесійна належність і прапорець `public_church`. Для нового профілю без згоди зберігається `false`. Явні `true/false` зберігають семантику прийняття/відкликання. Некоректні явні `null`, рядки, числа, масиви й об'єкти відхиляються до запису.

Використано наявну канонічну базу профілів, справжній Web UI `public/app.js`, наявну авторизацію і вже чинний `action=sensitive-consent`. Другого backend, маршруту, міграції чи тимчасової демонстрації не створено.

## Реальні перевірки

- Нові `tests/account-profile-explicit-consent.test.mjs`: production-TS route через VM, 31 некоректний тип, 2 допустимі булеві значення, PUT-негативний сценарій, два перевірені `node:sqlite` тести реального UPSERT (збереження старої згоди, явне відкликання, новий користувач).
- Сумісність існуючих `tests/sa10-durable-reading.test.mjs` збережено; їхні профільні fixture явно передають `false`, а нові SQLite-контракти перевіряють відсутнє поле окремо.
- Exact-head CI #41218379475: **Node 3471 PASS / 0 FAIL / 1 SKIP**; disposable Worker/D1 **24 PASS**; Python **2 PASS**; TypeScript, lint та production build **PASS**.
- Післязлиттєвий GitHub readback: `main` був точно `1198f6d6b7a89cb671644718d5180e8811546f4f`, PR #977 `state=closed, merged=true`; source і тест присутні у цьому commit. Майбутні commit змінюють head, не цей верифікований merge.

## Остаточна межа закриття

`remaining_scoped_implementation=0`; `required_unmerged_scoped_PRs=0`; `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`. Без нового конкретного відтвореного дефекту цей підпункт повторно не призначати.

**НЕ підтверджено:** повне SA-EXT-16, installed production Sites SHA, реальний D1, браузерний E2E, реальна фізична NVDA/Windows, DNS/SMTP та реліз. Продакшн не змінювався, секрети не використовувалися. Плани SA-EXT-01/02/05–20 залишаються відкритими; SA-EXT-03/04 були закриті раніше.
