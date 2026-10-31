# SA-EXT-02 — FOREIGN_INVALIDATED_MISSION_STATUS — вузьке остаточне закриття

**РОЗДІЛ SA-EXT-02 / підфункція FOREIGN_INVALIDATED_MISSION_STATUS — ЗАКРИТО ДЛЯ ПОДАЛЬШОЇ РОЗРОБКИ / `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.**

Дата: 2026-10-31. Це **лише вказана підфункція**, а не весь батьківський SA-EXT-02, не готовність сайту й не загальний реліз.

## Підтверджена проблема

У канонічному `app/api/attempts/route.ts` уже існували перевірки власності спроби, належності завершеної/оцінюваної спроби до місії та ізоляції активного курсора. Але для пошкодженого або історичного, хоча й належного автентифікованому актору, запису D1 іншої `mission_id` зі статусом `invalidated` два шляхи повертали `attempt_invalidated`, наче анульовано саме поточну місію Авраама: `GET?action=current` та `POST?action=answer` під час відновлення. Це доведений **контрактний дефект вихідного коду**, а не твердження про атаку на production.

## Реалізований функціонал і підключення

- Справжній канонічний API `GET?action=current` відмовляє для чужого `mission_id` у стані `invalidated`: HTTP 409 `attempt_state_invalid`.
- Справжній канонічний API `POST?action=answer` має той самий захист у шляху відновлення.
- Власна анульована спроба зберігає існуючий HTTP 409 `attempt_invalidated`. Інші стани, права, приватна D1 та UI-контракт не переписувалися.
- Немає нового сервера, другої БД, заглушок чи паралельного API: змінено вже підключений `app/api/attempts/route.ts`.

## Точні GitHub та перевірки

- Початковий feature base: `main@d9b3a1464e8f33af6549ff2ea32fae03235ef1a0`.
- Реалізація і тести: [PR #1056](https://github.com/Oleksii-debug/scripture-archive/pull/1056), голова `21989128c4b02cff6cd960fc2dbf1e3c242fc1d0`.
- **SQUASH MERGED у canonical main**: `1bc97d581fd2bf2546b8421ee2d409bf4b0b82ce`.
- Canonical source blob: `361fec23b01e3264e51ee5e2cf6edc8916e3e6fb`.
- Canonical regression blob: `4f5ae2bdf5154356767c6fa3c0cd2785aca806cf`.
- Чотири нові справжні route-executing випадки у `tests/attempt-foreign-mission-provenance.test.mjs`: чужа анульована GET, чужа анульована POST answer, власна анульована GET, власна анульована POST answer. Перевірено статус, помилку, `Cache-Control: no-store` та відсутність записів D1 у тестовій моделі.
- [Exact-head GitHub Actions #41244218163](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41244218163): `COMPLETED / SUCCESS` на `21989128c4b02cff6cd960fc2dbf1e3c242fc1d0`. Джоб `source-and-disposable-integration`: нативні Node регресії, TypeScript, lint, source build, disposable Worker/D1 та наявні Python валідатори — **SUCCESS**. Не рахувати тести як фізичний NVDA чи реальний production.

## Висновок, межі та незавершене

`remaining_scoped_implementation=0`; `required_unmerged_scoped_PRs=0`; `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.

**Батьківський SA-EXT-02 залишається OPEN**, як і release cutover #689 та загальне приймання. Live Sites / production D1 / email / backup / Windows / browser / фізичний NVDA / видавничі права: `NOT_VERIFIED`. Не було деплою, міграцій, розсилок, зміни live даних або зняття захисту. Ці release-перевірки не є приводом знову реалізовувати вже завершену вузьку підфункцію.

Повторна розробка цієї підфункції заборонена без нової вимоги або нового відтвореного дефекту.
