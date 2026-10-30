# SA-EXT-01/02 — READING_RECEIPT_TITLE_LOSSLESS — ВУЗЬКИЙ ПІДПУНКТ ЗАКРИТО

2026-10-30. **CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL**; `remaining_scoped_implementation=0`; `necessary_unmerged_PRs=0`. **Повні SA-EXT-01, SA-EXT-02 та всі SA-EXT-01…20 залишаються OPEN.**

## Дефект
Канонічний `PUT /api/account?action=reading` зберігав приватну історію читання. Його `clean(r.title,100)` мовчки перетворював введений текст назви 101+ символів на інший, 100-символьний, після чого D1 повертав `ok:true`. UI, private reader, backup уже використовують 100-символьну межу, тому це була втрата авторського тексту до збереження, а не нова вимога.

## Функціонал
Канонічний `app/api/account/route.ts` відхиляє нормалізовану назву понад 100 символів із `400 invalid_reading` **до atomic D1 READING merge**, не підтверджуючи змішаний batch із помилкою. Точно 100 символів Unicode зберігаються повністю; пробіли навколо обрізаються за старим договором. Без додаткових SQL міграцій, API, альтернативних читачів, UI чи production запуску.

## Exact integration / verification
- [PR #634](https://github.com/Oleksii-debug/scripture-archive/pull/634) **SQUASH MERGED** з GitHub integration `main@9155350dabb4811a0a3d58ebdf0b7e5b461f50bb`. Джерельний `app/api/account/route.ts` blob `dfff30fbe4d93a802e8b1e633fa91c1e781f010a`, існуючий розширений тест `tests/account-reading-canonical-chapters.test.mjs` blob `560897725df121cbeda298c929cec0b1ff5b0103`, обидва перевірені в merged main.
- [GitHub Actions #41040586805](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41040586805), exact PR head `33c6a7b0ecfb251fc40193714072bf118c567a12`: **overall SUCCESS**; `1490 Node PASS / 0 FAIL / 1 SKIP`, TypeScript, lint, build PASS, повний disposable Worker/D1 `22/22 PASS`, Python `2 PASS`. Це доказ source+local disposable test на тому HEAD, **не** production Sites/browsers/NVDA.
- Попередні флейки #618 на інших heads залишаються CI reliability blocker до повторної стабільної кваліфікації. Фактичний Sites deployment SHA і production тестування тут **NOT_VERIFIED**.

Вузький `READING_RECEIPT_TITLE_LOSSLESS` дефект закритий для подальшої розробки, але батьківські розділи лишаються відкриті. Реєстр/інші завдання: [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297).
