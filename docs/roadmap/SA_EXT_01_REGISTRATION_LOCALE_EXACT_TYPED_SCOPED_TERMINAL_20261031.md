# SA-EXT-01/16 — REGISTRATION_LOCALE_EXACT_TYPED — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**Дата:** 2026-10-31. **Закрито лише** типізацію й точну ідентичність поля `locale` у чинному `POST /api/auth?action=register`; **НЕ** розділи SA-EXT-01 чи SA-EXT-16 повністю.

## Доведений вихідний дефект
Попередня `locale(value)` у `app/api/auth/route.ts` використовувала `clean(value,2)`: текстові `en-US` та `ru-RU` непомітно ставали `en` і `ru`, а явно передані JSON-масиви/об'єкти/числа/boolean — `uk` без відмови. Це могло зберегти інший мовний вибір, ніж введений користувачем.

## Справжній код / main
- Канонічний `app/api/auth/route.ts`: явно нетекстове `locale` → HTTP `400 invalid_registration` ще до D1/email; для відсутнього/null/порожнього значення збережено `uk`. Точні `uk`, `ru`, `en` проходять; історичні невідомі **текстові** мови все ще мають documented fallback `uk`, без обрізання чи зміни на чужий дійсний код.
- У тому самому наявному `tests/auth-registration-lossless-fields.test.mjs` додано 16 автоматичних source-executing тестів (6 типізованих негативних, 9 позитивних/legacy textual і один двоваріантний null/missing). Усі тести викликають саме production TypeScript route після транспіляції.
- [PR #879](https://github.com/Oleksii-debug/scripture-archive/pull/879) **SQUASH MERGED** у `main@fc4fd29774de1aa084d23e31c564dbf34e21996a`; перевірені в main blob: `app/api/auth/route.ts@0c74ed1420f352d4daa70ad25485291329c3bdea`, `tests/auth-registration-lossless-fields.test.mjs@df408908fc18a6dc7ecdbb9eabdc34eff13df187`.
- [Exact PR-head Actions #41176279283](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41176279283), HEAD `80d510cb41f81b88ca0455aac8470c6b43f092b8`: **COMPLETED SUCCESS** (native Node, TypeScript, ESLint, build, disposable local Worker/D1 integration, Python validators). Окремий native Node тест вихідної локальної умови після виправлення: 17/17.

**ОСТАТОЧНИЙ СТАН:** `SA-EXT-01/16 / REGISTRATION_LOCALE_EXACT_TYPED — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`; `remaining_scoped_implementation=0`; `necessary_unmerged_feature_PRs=0`. Не розробляти знову без нової конкретної регресії.

**Незакриті межі:** батьківські SA-EXT-01 і SA-EXT-16 залишаються OPEN, а інші відкриті батьківські — 02,05–15,17–20. Ліцензії/переклади/контент, справжній опублікований Sites SHA, фізичний NVDA/Windows, SMTP, backup/міграція та користувацький браузер не перевірені і не можуть бути позначені як PASS. Релізу не було. Координація: [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297).
