# SA-EXT-02 — особистий поступ і BFCache (scoped terminal)

**Дата:** 2026-10-31. **РОЗРОБКУ ЛИШЕ ЦЬОГО ПІДПУНКТУ ЗАКРИТО / `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.** Батьківський SA-EXT-02 — **OPEN**: загального банку затверджених місій, рівнів і ширшого контенту не завершено.

## Функціонал

Канонічна сторінка `/progress` відображає приватну історію виконаних місій і читання. Після `pagehide` її DOM синхронно очищується, приватні запити отримують скасування за поточним epoch, новий прихований запит навіть не стартує. Після `pageshow` сторінка знову отримує `getSession()` з наявного сервера і лише потім відтворює `renderWorkspace('progress')`. Авторизація, сервер оцінювання та БД не дублюються.

## Інтеграція та перевірка

- [Source PR #822](https://github.com/Oleksii-debug/scripture-archive/pull/822) **SQUASH MERGED** у exact **`main@79a8e40cee2c3eb0e0901c5b8b260cb4b0a149c9`**.
- `public/app.js@da1a0bffcccc3fe21669a8d8cf8c79c36b556904`.
- `public/workspace.js@a6a5a8000f0b486c6da436603160af05e04bc971`.
- `tests/editorial-bfcache-privacy.test.mjs@7486750bcada0a2b963a28ac2d85d2b71de2488a`: 16 загальних native Node випадків, серед них **4 нових саме для progress**, без втрати перевірок builder/editor.
- [Exact-head GitHub Actions #41164386403](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41164386403) **completed SUCCESS**: Node, TypeScript, lint, build, disposable Worker/D1 HTTP і Python; усі шість головних кроків успішні.
- Після merge зроблено GitHub readback `main`, PR.merged, усіх source/test blob і фактичних guard/suspend змін.

**Для цієї підфункції**: `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`; повторна розробка тільки за відтвореним дефектом.

**Не доведено:** фізичний Chrome BFCache, Windows/NVDA, live Sites SHA, production D1, реліз. Ніякого деплою, email чи обробки справжніх персональних даних у цій зміні немає. Ширші SA-EXT-02/01/05–20 і release gates залишаються OPEN.
