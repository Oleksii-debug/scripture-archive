# SA-EXT-03 — перевірка підтвердження запису матеріалу (30.10.2026)

**Підфункція:** SA-EXT-03 / MATERIAL_DRAFT_UPSERT_ACK_BOUND.
**Статус:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`; `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`.
**Батьківський SA-EXT-03 і всі 20 повних SA-EXT-01…20:** залишаються `OPEN`.

## Реалізовано в наявному канонічному маршруті

- `app/api/materials/route.ts`: SQL UPSERT чернетки з первинним ключем повертає успіх лише за цілочисельного, невід'ємного, безпечного D1 `meta.changes` не більш як 1. Неможливі або непідтверджені квитанції повертають 503 замість помилкового повідомлення про успіх.
- Та сама приватна API-реалізація зберігає власницьку перевірку й умову `changes===0` (403). Немає нової редакційної БД, endpoint чи дозволів.
- Вилучення матеріалу принципово **не** обмежується одним `total_changes`: реальна SQLite/D1 може зарахувати `ON DELETE CASCADE` для редакційних заявок. Помилкова попередня гіпотеза такого обмеження була відхилена за негативним інтеграційним тестом і виправлена до злиття.
- `tests/materials-d1-ack.test.mjs`: позитивний сценарій з каскадом та негативні/межові квитанції UPSERT і DELETE виконують production handler із реальними SQLite-мутаторами.

## Точні свідчення

- [PR #671](https://github.com/Oleksii-debug/scripture-archive/pull/671) **SQUASH MERGED** у `main@b0b2fbcd04e04461f84846d13b8992d13b64ce4d`, exact qualified feature HEAD `5548ca1bb25a45fc0b539746430d0e61ac19d8ae`.
- [Actions #41053959435](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41053959435): **SUCCESS** на exact feature HEAD, включно з Node, TypeScript, lint, build, disposable Worker/D1 і Python. Раніше невдалий [Actions #41053383291](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41053383291) не приховано: непридатна перевірка DELETE була виправлена до успішного HEAD.
- Не претендує на повне приймання редактора, production D1/Sites, email/DNS, фізичну Windows/NVDA перевірку або термінальне закриття SA-EXT-03.

Не розробляти цю саму підфункцію повторно без нової вимоги або конкретного відтвореного регресійного дефекту.
