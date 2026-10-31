# SA-EXT-02 — persisted active assessment cursor: scoped terminal closure

**Дата:** 2026-10-31  
**Стан:** **CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL** лише для цього вузького дефекту.  
**Батьківський SA-EXT-02:** **OPEN**; це не загальний реліз Scripture Archive.

## Реальна проблема й канонічне виправлення
У `app/api/attempts/route.ts` TypeScript-тип `Attempt` не гарантував цілісності вже збережених рядків D1: дробовий `task_limit` неявно усікався через `Array.slice`, а строковий `current_index="0"` індексував масив як число. За пошкоджених даних читання могло показати завдання або відповідь могла дійти до мутації для неможливого курсора. Це змодельований дефект цілісності збереженого рядка, **не доведена атака чи production-інцидент**.

Використано єдину канонічну `tasksFor()` і додано `activeTasks()` для точної ідентичності місії, safe-integer меж завдань/курсора та фактичної наявності tasks; гейти підключені до реальних GET current і POST answer **перед** видачею завдання або D1-записом. Не додано іншого сервера, рушія чи дубльованої моделі.

## Інтеграція та перевірки
- Feature+regression: [PR #1049](https://github.com/Oleksii-debug/scripture-archive/pull/1049) — **SQUASH MERGED**.
- Exact source integration SHA: `f8d05f1d6c58f927b0b670d17d1680be2b16c04b`.
- Production blob `app/api/attempts/route.ts@cc13cef83df190421a3d9c53a45a53a71cc06d18`.
- Regression blob `tests/attempt-persisted-active-cursor.test.mjs@603cb21d3c0ce05ad4d53883e409d95f9873424a`.
- 17 route-executed JS test cases committed: 8 invalid persisted variants through GET and POST, plus intact positive GET; private no-store, no mutation when invalid.
- [Exact PR-head CI #41242945949](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41242945949) **COMPLETED SUCCESS**, job `source-and-disposable-integration`: native Node regression, TypeScript contracts, lint, build, disposable Worker+D1 end-to-end, Python validators and dependency setup all **SUCCESS**.
- Readback on GitHub main after merge confirms both production and regression blobs and the live merged PR state.

**remaining_scoped_implementation=0; necessary_unmerged_scoped_PRs=0.** Повторна розробка цього самого scope заборонена без нової конкретної вимоги чи відтвореного дефекту.

## Не є прийманням усієї платформи
SA-EXT-02 parent, решта SA-EXT, R0 production cutover [#689](https://github.com/Oleksii-debug/scripture-archive/issues/689), справжній Sites/D1 deployed SHA, backup/restore, Chrome/Windows/фізичний NVDA, ліцензії/правомірний контент — **OPEN/NOT_VERIFIED**. Жодного релізу, DNS/email/cron, платіжних функцій, мов, synthetic users, змін production DB чи автоматичного листування.
