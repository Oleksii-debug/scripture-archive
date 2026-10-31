# SA-EXT-08 / REVIEWED_LIBRARY_CURSOR_CYCLE — scoped source closure

**Дата:** 2026-10-31. **Статус тільки цієї конкретної підфункції:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`. **Повний SA-EXT-08: OPEN.** Це не підтвердження встановленого сайту, усієї цифрової бібліотеки чи готового релізу.

## Підтверджений дефект

Канонічний інтерфейс `/library` використовує `renderReviewedLibrary()` з `public/material-review.js`, `POST /api/material-review` з `action=librarySearch` і курсор `{id,submittedAt}`. Клієнт перевіряв форму та довжину наступного курсора, але приймав повтор попереднього ключа. Повторюваний або циклічний keyset курсор міг нескінченно пропонувати «Продовжити пошук» і дублювати видимі партії, хоча сервер не засвідчив просування. Це доведений дефект клієнтського контракту, а не твердження про атаку на production.

## Завершене виправлення й інтеграція

- [PR #1012](https://github.com/Oleksii-debug/scripture-archive/pull/1012) **SQUASH MERGED**, точний source integration `main@71455c48732e31c3d5dd6476467b1bc93a6d6160`.
- `public/material-review.js@b1b3441979d23c445b283b62fb6ffaae9f087413`: на кожен пошук ведеться локальна множина вже прийнятих курсорів `[id,submittedAt]`. Відхиляються безпосередні повороти та цикли A→B→A. Новий пошук очищає множину. Помилкова сторінка не потрапляє в HTML; попередньо схвалені матеріали залишаються видимими, доступна повторна спроба без другого API.
- `tests/library-reviewed-route.test.mjs@7da7bd0d211fdb8aa551fc97eedfc0bdd3c50727`: два реальні клієнтські сценарії з `renderWorkspace('library')`, повторений курсор і A→B→A, збереження старої відповіді, повідомлення про збій і успішне відновлення.
- Сервер `app/api/material-review/route.ts`, D1-схема, джерела й права, каталог авторизованих матеріалів, production дані та публікація не змінювалися.

## Незалежний readback і межі

- У GitHub перевірено `PR #1012 merged=true`, що поточний після злиття `main` має feature SHA `71455c48732e31c3d5dd6476467b1bc93a6d6160`, та обидва наведені blob SHA.
- [Exact feature PR-head Actions #41238291123](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41238291123), head `b287a5fe26df4fe12ca8ea90b253f15e9edec212`, **COMPLETED SUCCESS**: фактично виконано 3548 native Node PASS / 0 FAIL, 24 disposable Worker/D1 PASS / 0 FAIL, 2 Python PASS, TypeScript/lint/source build SUCCESS. Це runner source/disposable evidence, не реальний Chrome/NVDA чи production Sites.
- Для `REVIEWED_LIBRARY_CURSOR_CYCLE`: `remaining_scoped_implementation=0`, `required_unmerged_scoped_PRs=0`, `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`. Повторна реалізація без конкретного нового дефекту чи затвердженої вимоги не потрібна.

**Окремо OPEN:** повний SA-EXT-08 (книги, медіа, ліцензійне наповнення, експертне приймання), browser/physical NVDA, установлене Sites/D1, відновлення/backup і реліз. Жодних production міграцій, розсилок, платежів, нових мов чи активації знайомств.
