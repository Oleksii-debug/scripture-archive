# SA-EXT-04 — meeting-history BFCache private lifecycle (scoped terminal)

**Дата:** 2026-10-31  
**Статус:** **РОЗРОБКУ ЦЬОГО ПІДПУНКТУ ЗАКРИТО / CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL**.  
**Повний батьківський розділ SA-EXT-04 і всі SA-EXT-01…20: OPEN**, доки весь затверджений обсяг незалежно не виконано.

## Вихідна прогалина

Після злиття #810 канонічний `public/group-meeting-history.js` відображав приватні нотатки зареєстрованих учасників, але не обробляв `pagehide` / `pageshow`. Back-forward cache міг зберігати ці текстові DOM-вузли, а вже запущений запит — повернути нотатки після виходу зі сторінки. Виправлення не стосується всіх інших приватних елементів сайту; потрібне окреме browser/production приймання.

## Реальне виправлення

- На `pagehide` синхронно видаляються приватні meeting-history вузли; відкидаються cursor, ID seen, статус і права поточного асинхронного запиту.
- Після `pageshow` дані перечитуються лише для поточного маршруту й користувача через наявний авторизований `GET /api/groups?action=meetings`; старі приватні результати не відновлюються з DOM.
- Epoch fence захищає відповідь, обробку помилок і `finally`, зокрема ситуацію, коли старий запит завершується після початку нового.
- `destroy()` від'єднує події та очищає приватну історію; існуючий UI/сервер/БД збережені.

## Точна інтеграція

- [PR #811](https://github.com/Oleksii-debug/scripture-archive/pull/811) **squash MERGED**.
- Перевірений source-integration **`main@4b8dd337c73f012ef559214f3a71aa82d2d49607`**.
- `public/group-meeting-history.js` blob **`625e43c0ae80219f09bc2484703499001d8ce0dc`**.
- `tests/group-meeting-bfcache-privacy.test.mjs` blob **`fc6e2c8c0174229bf128e7f4f0dede1af4699222`**.
- Вісім нових поведінкових тестів є частиною чинного native Node suite: синхронне очищення; нове читання; stale fulfilled/rejected reply; old finally; відмова авторизації; інший principal/route; destroy.
- [GitHub Actions #41162441723](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41162441723): **completed SUCCESS** на PR head `75535d8f06da7bd293011f5c471c268bafd1403c`, з реальними кроками Node, TypeScript, lint, build, disposable Worker/D1 і Python, кожен SUCCESS.
- Проведено повторне GitHub-readback source/test blob, `PR.merged=true` і exact SHA `main`.

## Незалежні межі

**Не виконували:** живий браузер із BFCache, фізичний NVDA, перевірку встановленого Sites SHA/Cloudflare D1, email або публікацію. Інші можливі приватні DOM-ділянки не охоплено. Release/Cutover #689, #297 й інші приймальні задачі залишаються чинними. Для цього точного підпункту **`remaining_scoped_implementation=0`**, **`necessary_unmerged_PRs=0`**; повторно реалізовувати без нового відтвореного дефекту не потрібно.

