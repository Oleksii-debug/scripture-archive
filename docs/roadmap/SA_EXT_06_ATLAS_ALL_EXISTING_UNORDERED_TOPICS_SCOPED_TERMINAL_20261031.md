# SA-EXT-06 — ALL_EXISTING_UNORDERED_DOSSIER_TOPICS — РОЗРОБКУ ПІДПУНКТУ ЗАКРИТО

**Дата:** 2026-10-31. **Статус:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`, **тільки цього підтвердженого source-підпункту**, не всього SA-EXT-06.

**Функціональний source-main:** `f7ff8049a9d6992da4d4290da54c3ef01c33d0e8`; [PR #827](https://github.com/Oleksii-debug/scripture-archive/pull/827) **SQUASH MERGED**. Перевірено `PR.merged=true`, actual `main` SHA і обидва нові production/test Git blob SHA. **Жодного релізу або публікації сайту не виконувалося.**

## Реальний виявлений залишок і реалізація

Канонічний текстовий атлас `/dossiers` уже показував сім досьє у редакційно впорядкованій таблиці й усі шість досьє місць в іншій таблиці, але чотири вже перевірені вузли `ruth`, `paul`, `mary-mother`, `peter` не були представлені в атласі, хоча їхні джерела існували в спільному `scriptureDossiers`. Усього **17/17 наявних** досьє зараз доступні в текстовій лабораторії: сім у початковій таблиці, шість місць у другій, чотири інші люди у новому окремому семантичному списку.

Новий розділ має текстовий заголовок українською, російською та англійською, **прямо забороняє сприймати порядок як історичне датування**. Усі чотири теми ведуть до канонічних досьє, усі їхні джерела — до канонічної читальні через наявні permalink-и `/reader/<book>/<chapter>?verse=<first>`, кожне свідчення має збережену позначку `narrative` / `interpretive`. Не додано жодного вигаданого маршруту, карти, археологічного факту, незалежного права на видання, API, іншої БД чи другого каталогу.

Точні source blobs після merge:
- `public/scripture-dossiers.js@68893b72ccb4a0a43113bff073ecbe7bdf2a7423`;
- `tests/atlas-history-sources.test.mjs@abf8f6b8b3ca2c3fcb99334eb5c31f8323a2702f`.

## Перевірки та розмежування доказів

- Оригінальна production-функція в ізольованому V8 на справжньому каталозі: **57/57** targeted render/source-link/language assertions **PASS**, синтаксис production JS пройдено. Справжні п'ять committed test bodies програно в V8 з Node API shims: **5/5 PASS** — **це не native Node**.
- [GitHub Actions #41165013842](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41165013842) на **точному PR head** `8aa0d34a3dcc91b9b0cf9e12b6d63ac7ca029e39`: job `source-and-disposable-integration` **COMPLETED SUCCESS**. Підтверджені окремі **SUCCESS** steps: native Node regression suite, TypeScript, lint, source build без публікації, disposable Worker/D1 integration, Python validators.
- GitHub merge [#827](https://github.com/Oleksii-debug/scripture-archive/pull/827): `merged=true`, `main@f7ff8049a9d6992da4d4290da54c3ef01c33d0e8`, exact source/test blob readback. Для **тільки цього** виправлення `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`.

## Незакритий затверджений батьківський обсяг

**SA-EXT-06 — OPEN.** Повний атлас із правдивою зовнішньою географією, перевіреними картографічними правами, маршрутами, ширшою історичною хронологією й незалежною оцінкою археологічних тверджень ще не завершено. Live Sites SHA, production D1, реальний браузер/клавіатура, Windows і фізичний NVDA **NOT_VERIFIED**. Вони не є підставою переписувати це вже інтегроване source-виправлення. SA-EXT-03/04 parent terminal лишаються незмінними, SA-EXT-01/02/05 та решта відкритих батьківських розділів залишаються OPEN.

Не призначати повторну розробку **саме цього вузького підпункту** без доведеного нового дефекту або нової затвердженої вимоги. Координація: [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297), [#78](https://github.com/Oleksii-debug/scripture-archive/issues/78).
