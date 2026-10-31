# SA-EXT-06 — DOSSIER_ATLAS_FILTER_CONTINUITY — остаточне вузьке закриття (31.10.2026)

**РОЗДІЛ №SA-EXT-06 / лише підфункція DOSSIER_ATLAS_FILTER_CONTINUITY — ЗАКРИТО ДЛЯ ПОДАЛЬШОЇ РОЗРОБКИ.**

Статус: `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`; `remaining_scoped_implementation=0`; `necessary_unmerged_scoped_feature_PRs=0`. **Батьківський SA-EXT-06 — OPEN**, оскільки затверджені ліцензована картографія, точні маршрути, незалежна історико-географічна перевірка, редакційні джерела і реальне приймання не завершені.

## Підтверджений дефект і виробнича інтеграція

- Канонічна сторінка `/dossiers?q=Мойсей` коректно фільтрувала індекс досьє, але розташований поряд текстовий атлас продовжував показувати всі непов’язані теми, вірші та свідчення. `public/workspace.js` не передавав активний GET-пошук у `dossierAtlasMarkup()`.
- Існуючий `public/scripture-dossiers.js` тепер використовує ту саму перевірену `searchScriptureDossiers` для видимих рядків історії читання, таблиці біблійних місць, додаткових тем і двосторонньо підтверджених зв'язків. Перевірені локальні посилання на читальню, keyboard-native HTML і UK/RU/EN залишаються. Фільтр із нульовими результатами надає доступний status без сторонніх посилань; неприпустимі або надмірні запити відхиляються; відсутній чи порожній фільтр не змінює HTML.
- Реально підключений робочий маршрут — `public/workspace.js` + `public/scripture-dossiers.js`; нового незалежного каталогу, сервера чи археологічних припущень немає.
- Реальні регресійні тести — `tests/atlas-history-sources.test.mjs`, `tests/source-dossier-atlas.test.mjs`, `tests/dossier-search.test.mjs`.

## Гіт, виконані перевірки й SHA

- [Feature PR #985](https://github.com/Oleksii-debug/scripture-archive/pull/985): **SQUASH MERGED**, остаточний інтегрований `main@c0d24070f4d87b41e0d4bb988ee6d3f1cdbc907e`; попередній qualified PR HEAD `431d0da70d680fb66ccb70474bec020f54fe9280`.
- Exact-main blobs: `public/scripture-dossiers.js@fb417444d4f95f0d5f36ba7726476af65eb7431f`; `public/workspace.js@488276dc75f8fafac9577e5ef99b7599cca7287d`; `tests/atlas-history-sources.test.mjs@055042160594f42f413b38604e2efc54610ec822`; `tests/source-dossier-atlas.test.mjs@ca6daa3dab1f93f6a1484eee1f6f853b1cd963bb`; `tests/dossier-search.test.mjs@5d7e0d0fb376fc05b486df1afffeac05d5d63b15`.
- Ізольований execution точних байтів виробничого модуля у V8 на справжньому каталозі: **93/93 assertions PASS** (не native checkout).
- [Exact-head GitHub Actions #41219381401](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41219381401): **COMPLETED SUCCESS**, native Node **3484 PASS / 0 FAIL / 1 SKIP**; disposable Worker/D1 **24 PASS / 0 FAIL**; TypeScript, lint, build, Python validators також завершилися успішно. Run head точно `431d0da70d680fb66ccb70474bec020f54fe9280`.
- Після squash: PR `merged=true`, `main` exact SHA прочитаний, compare `feature-main...main=identical`; усі п'ять blob SHA перечитані з live main. Немає необхідних незлитих PR для цього дефекту.

## Суворі межі

**ЦЕ НЕ ЗАКРИТТЯ ВСЬОГО SA-EXT-06.** Так само SA-EXT-01/02/05/07 та інші незавершені батьківські розділи лишаються OPEN; SA-EXT-03/04 залишаються parent TERMINAL. Чинне джерело не підтверджує географічних координат, карту, історичну дату чи археологічну атестацію. Live `scripture-archive.com`, Cloudflare production/D1, реальний браузер, фізичні Windows/NVDA, права на карти, фінальне розгортання і реліз **NOT_VERIFIED / NOT_EXECUTED**. Публікацій, змін D1, листів, платежів, розширення мов і правок іншого шахового репозиторію не було. Повторна розробка саме цього виправлення дозволяється лише за новою вимогою або конкретним відтвореним дефектом.
