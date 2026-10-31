# SA-EXT-04 — full group-detail BFCache private view (scoped terminal)

**Дата:** 2026-10-31. **СТАТУС: РОЗРОБКУ ТІЛЬКИ ЦЬОГО ПІДПУНКТУ ЗАКРИТО / CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL.**

Це **не закриття** батьківського розділу SA-EXT-04 чи всього архіву. Усі повні SA-EXT-01…20 залишаються OPEN до окремого доведення всього затвердженого обсягу.

## Відтворений залишок

У `public/app.js::renderGroup` канонічний інтерфейс показував приватний код запрошення власнику, керування складом групи та персональні дані. Хоча компонент зустрічей уже мав окреме очищення BFCache (#811), вміст усього `.group-detail` не очищувався на `pagehide`; асинхронний GET чи catalog міг домалювати старі групові дані після виходу зі сторінки.

## Завершена канонічна реалізація

1. Синхронне видалення всіх дочірніх вузлів `.group-detail` на `pagehide`, незалежно від того, чи відкрито груповий шлях, чи ще відбувається перехід з нього.
2. Інкремент epoch навіть коли приватна детальна сторінка ще завантажувалася і її DOM відсутній.
3. Три існуючі контрольні межі `renderGroup` не дозволяють старому GET/catalog формувати приватну сторінку після epoch-зміни.
4. `pageshow` відновлює детальну сторінку лише після повторного `getSession()` із чинного `/api/account?action=me` та через наявний `route()`. Не використовуються старий BFCache DOM або припущення про старий обліковий запис.
5. Наявна інтеграція виправлень нотаток/зустрічей з [PR #814](https://github.com/Oleksii-debug/scripture-archive/pull/814) збережена; жодного другого сервера, схеми, нового endpoint або публікації.

## Незмінні докази

- [Source PR #815](https://github.com/Oleksii-debug/scripture-archive/pull/815) **squash MERGED**; exact **`main@2579ff852efb365453e930b678654a69f40efa01`**.
- `public/app.js` blob **`7c6b0d7915b385c390d82f6e1ba70e41c6017ed0`**.
- `tests/group-detail-bfcache-privacy.test.mjs` blob **`b5bf945ce1995f13e6180d0f27a574350ab21d6e`**, 9 new native Node source-executed cases.
- Початкова тестова фікстура виявила помилку (відсутній `esc` у тестовому оточенні) — усунено. Після одночасної роботи іншого агента #814 гілку зведено з останнім main через перевірений двобатьківський Git commit, конфігурацію редагування зустрічей збережено.
- [GitHub Actions #41163208855](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41163208855): на exact qualified PR head `0028d5b25ea34ad8f7692c6b211a45df48f7cbef` **SUCCESS**: native Node, TS, lint, build, disposable Worker/D1 та Python.
- Postmerge прочитано GitHub main/PR/source/test, підтверджено source і test blob, source guards і збережений callback correction.

**Для цього підпункту:** `remaining_scoped_implementation=0`; `necessary_unmerged_PRs=0`. Повторне призначення без конкретного нового дефекту не потрібне.

## За межами цієї квитанції

Фактичний live Sites SHA, браузерний BFCache Chrome/Windows, фізичний NVDA, production Cloudflare D1, акаунти з реальними ролями й доведений продакшн-реліз **NOT_VERIFIED**; не розгортали й не торкались реальних даних. Інші частини повного SA-EXT-04, SA-EXT-01–20 і release tasks залишаються OPEN.
