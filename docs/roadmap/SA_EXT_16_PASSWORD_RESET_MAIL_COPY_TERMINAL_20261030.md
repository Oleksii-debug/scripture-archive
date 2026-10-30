# SA-EXT-16 / RESET_MAIL_DELIVERY_COPY — термінальна підфункція, 2026-10-30

**Статус саме цієї підфункції:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`. **Повний SA-EXT-16 та всі інші SA-EXT-01–20: OPEN.**

## Фактичний дефект і остаточне рішення

Після `POST /api/auth?action=forgot-password` сервер свідомо повертає узагальнену, захищену від перевірки існування адреси відповідь. Вона не підтверджує доставку листа. В канонічному `public/app.js` базові тексти UK/RU/EN були правильні, але **другий** словник у `Object.assign(copy,...)` затирав їх фразами про гарантоване отримання листа. Це був дефект фактичного інтерфейсу, а не API.

- З наявного словника прибрано три повторні неправдиві `resetSent` override. Показуються первинні точні UK/RU/EN повідомлення: запит прийнято, перевірте пошту/спам, доставка **не підтверджена**.
- Наявний `tests/password-reset-delivery-copy.test.mjs` тепер виконує **ефективний** `renderAccount`-словник після `Object.assign`, а не лише попередній ніколи не використаний `copy`. Він звіряє три локалізації з правилом сервера `forgot-password` і реальним `status.textContent=copy.resetSent`.
- Жодних змін до API, mail provider, account/token storage, auth, секретів, production або HOST/DNS. Повторна реалізація цього вузького дефекту не потрібна без конкретної регресії.

## Exact main і перевірки

- Feature PR: https://github.com/Oleksii-debug/scripture-archive/pull/675 — **MERGED**.
- Source `main@6ecbf2260d5463a585e77ec8b3b58aa6aa57d3c7`, підтверджено після squash merge; PR HEAD `02f016399e66a7d186c15d5bf304229f73b18a95`.
- CI: https://github.com/Oleksii-debug/scripture-archive/actions/runs/41053883269 — exact PR HEAD `SUCCESS`: Node **1681 PASS / 0 FAIL / 1 SKIP**; disposable Worker/D1 **22 PASS / 0 FAIL**; TS/lint/build PASS; Python pytest **2 PASS**.
- Scопe: `remaining_implementation=0`, `necessary_unmerged_PRs=0`; після мерджу цього запису він також міститься в центральному плані.
- Live Sites release SHA, browser, physical NVDA Windows і реальна доставка пошти: **NOT_VERIFIED**. Це не claim повного SA-EXT-16 або production release; відкритий батьківський план та #297 залишаються активними.
