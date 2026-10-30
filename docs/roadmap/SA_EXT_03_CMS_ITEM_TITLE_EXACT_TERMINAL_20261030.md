# SA-EXT-03 / CMS_ITEM_TITLE_EXACT_BOUNDARY — остаточно закрито вузький дефект

**Дата:** 2026-10-30  
**Статус вузького дефекту:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`  
**Повний батьківський SA-EXT-03 та SA-EXT-01…20:** `OPEN`, не позначати повністю завершеними.

## Прийнятий функціонал

В існуючому owner-only `PUT /api/content`, дія `upsert-item`, раніше `clean(body.title, 200)` непомітно обрізав довгий авторський заголовок і повертав успішний результат після запису іншого тексту в D1 та редакційну ревізію. Після виправлення сервер перед будь-яким D1 prepare/batch перевіряє повну нормалізовану назву; понад 200 UTF-16 одиниць → HTTP 400 `invalid_content_item`, **жодного запису**. Допустимі рівно 200 одиниць, кирилиця, емодзі й пробіли навколо збережені за чинним контрактом. Права власника, CSRF/same-origin, атомарне D1 збереження та revisions не змінені.

## GitHub evidence

- Функціональний PR [#635](https://github.com/Oleksii-debug/scripture-archive/pull/635) **SQUASH MERGED**, точний `main@21bac597223107bf1fd153c5745e309a5f6f2816` (незалежний readback: PR merged=true, HEAD main той самий).
- Канонічний source: `app/api/content/route.ts` Git blob `58041c2ce0070c1b5bc9326a07864e26583b41fb`.
- Канонічні regression tests: `tests/content-batch-ack.test.mjs` Git blob `3c718b6708c80da89b557cd759da2826666f761a`.
- Six new source-executed regression scenarios: three oversized/Unicode/emoji/trim negative (no SQL) and three exact-boundary positive.
- **Native CI:** [GitHub Actions #41040738618](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41040738618), exact tested PR head `f73ab666b7c8903aa2194bde7171459060b0ed0e`: Node **1498 PASS / 0 FAIL / 1 SKIP**; TypeScript, ESLint, source build **PASS**; Python validators **2 PASS**.
- **Full CI not green:** disposable Worker/D1 E2E **21/22**, twice `Your worker restarted mid-request`, HTTP 503 instead of expected 403 on unrelated `tests/api-flow.test.mjs:100`; existing blocker [#618](https://github.com/Oleksii-debug/scripture-archive/issues/618). Це не PASS E2E і не доказ провалу title guard.
- Live Sites deployed SHA, браузер, Windows/WebView2, фізичний NVDA та production D1 **NOT_VERIFIED**. Не було deploy, Cron, реальних персональних даних або змін прав.

`remaining_scoped_implementation=0`  
`necessary_unmerged_PRs=0`  

**SA-EXT-03 / CMS_ITEM_TITLE_EXACT_BOUNDARY — РОЗРОБКУ ВУЗЬКОГО ДЕФЕКТУ ЗАКРИТО.** Не переписувати без нової перевіреної регресії або нової затвердженої вимоги. Далі — інші відкриті підпункти SA-EXT-01…20 та незалежний CI/release blocker #618. Центральний контроль: #297.
