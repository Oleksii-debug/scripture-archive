# SA-EXT-01 — DECLARED_PRIMARY_EDITION_IDENTITY — scoped terminal (2026-10-31)

**РІШЕННЯ: `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` лише для помилкового переходу основного читача до ліцензії іншого видання. Батьківський розділ SA-EXT-01 залишається OPEN.**

## Канонічний сценарій і виправлення

- У `public/app.js::localEditionMetadata` до виправлення наявний запис `catalog.translations[local.id]` із неправильним `id` трактувався як відсутній запис, після чого замість відмови читач підставляв метадані регіонального видання. Користувач міг побачити вірші під помилковим походженням/ліцензією.
- Наявність власного ключа перекладу перевіряється через `Object.prototype.hasOwnProperty.call`. Якщо задекларовано неправильний ID, `null` або запис без ID — основний читач **відмовляє**, а не приписує чужі авторські права. Регіональний fallback діє **лише коли відповідного ключа немає**. Коректний переклад із точним ID має пріоритет. Цей контракт уже застосовувався в іншій канонічній частині `public/parallel-reader.js`.
- Читач уже доступний у штатному `public/app.js`; нової самостійної реалізації, сервера або недоступної функції немає.

## Підтвердження

- Вихідний `main@e52f125bc0a9c82755d1200078269fca08513ea4`; ізольований Node 22 RED свідок: явно неправильний `id:'OTHER'` призводив до неправомірного `UKRPAN` fallback (процес EXIT1 для потрібного fail-closed критерію).
- [Функціональний PR #842](https://github.com/Oleksii-debug/scripture-archive/pull/842) **SQUASH MERGED**, SHA фактичного інтегрованого `main@12abfeae78f132b5fe07a29abde15f5185d56233`. GitHub PR `merged=true`, main SHA і blob source/test незалежно перечитані.
- `public/app.js@ed905589402a95ab7146e72c3542040956a25b55`; `tests/reader-primary-provenance.test.mjs@51288cc66e88ffceb3947f40c88de171bcd9d679`.
- Два нові source-executing native Node-тести включають відмову на неправильний/відсутній задекларований ID та позитивні перевірки відсутнього ключа/правильного ID.
- [Exact-head GitHub Actions #41168210300](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41168210300): `COMPLETED SUCCESS` для PR head `6565352e0a6844cfa4d0a5f807f619c65b975a8a`: native Node, TypeScript, lint, build, disposable Worker/D1, Python.
- Для **цього конкретного дефекту**: `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. Повторне розроблення тільки на конкретний доведений дефект або нову затверджену вимогу.

## Що НЕ закрито

Повний SA-EXT-01, усі права на додаткові видання і міжнародний контент, поточний Cloudflare Sites installed SHA, браузерні інтеграційні подорожі, Windows/WebView2, фізичний NVDA та production-доступність не підтверджені. Не проводили деплой, зміну живої бази чи запуск фонових задач. Координація у [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297); попередній незалежний scoped fix [#839](https://github.com/Oleksii-debug/scripture-archive/pull/839).
