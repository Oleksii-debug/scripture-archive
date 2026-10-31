# SA-EXT-03 — редакторський пошук: завершено виправлення циклічних курсорів

Дата: 2026-10-31.
Статус конкретного дефекту: CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL.
Батьківський розділ SA-EXT-03 уже є CLOSED_FOR_DEVELOPMENT / TERMINAL.

Виявлено, що у чинному редакторському пошуку опублікованих матеріалів курсор A→B→A проходив перевірку, яка порівнювала лише поточний і наступний курсори. Виправлено в канонічному public/material-review.js. Повторне відображення записів та інструментів редактора тепер відхиляється, попередній результат залишається доступним, є повторна спроба. Нового сервера чи схеми не створено.

Функціональний PR #1016: https://github.com/Oleksii-debug/scripture-archive/pull/1016
MERGED в main@1b919c55bfd259872da0e481727ef4434da25ee7
Production blob: public/material-review.js@f5b6117aaca7b6dc000c10f259f997fc71bb2944
Regression blob: tests/editor-public-takedown-search.test.mjs@0b2c35bc8c23d626c1bfb465ed9896e60b399ecc
CI: https://github.com/Oleksii-debug/scripture-archive/actions/runs/41238685466
Exact feature head: df75e816afef4ab0f4377f26f26a5e21d15eb160
CI COMPLETED SUCCESS: 3575 Node tests PASS / 0 FAIL, 24 disposable Worker/D1 PASS, TypeScript/lint/build and Python validators SUCCESS.

remaining_scoped_implementation=0
required_unmerged_scoped_PRs=0
CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

Це не доказ production deployment, браузера, фізичного NVDA чи готовності всього сайту. Потрібен окремий релізний контроль.
