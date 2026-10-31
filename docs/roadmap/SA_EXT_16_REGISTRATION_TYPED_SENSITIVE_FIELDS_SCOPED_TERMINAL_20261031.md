# SA-EXT-16 — REGISTRATION_TYPED_SENSITIVE_FIELDS — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**Дата:** 2026-10-31. **Обсяг:** лише дві добровільні чутливі текстові властивості `denomination` і `church` під час реєстрації, не весь SA-EXT-16 і не весь продукт.

## Реалізація та інтеграція
- Канонічний API `POST /api/auth?action=register` (`app/api/auth/route.ts`) тепер повертає `400 invalid_registration` для явно переданих JSON `number`, `boolean`, `array` і `object` замість мовчазного скидання добровільних текстових даних. Перевірка до будь-якого запиту D1/листа. Збережено null/відсутність поля, дозволені рядки, Unicode й існуючу згоду на чутливі відомості.
- Канонічний `tests/auth-registration-lossless-fields.test.mjs` доповнено 10 негативними і одним позитивним регресійним сценарієм для справжнього імпортованого TypeScript route (не створено альтернативного API/UI).
- Функціональний [PR #874](https://github.com/Oleksii-debug/scripture-archive/pull/874) **MERGED** (squash) у `main@7b39e8eff6e02b1fef12b882a7a82107f7b81272`. Exact merged production blob `3cbdcf4793fba38069ea1690e4f4a89a6bf4eecb`; tests blob `57c7c7c9401734cb60609534bb9143799fa0ce4c`. Readback з поточного main після concurrent merge #875 підтвердив ці ж blob.

## Перевірка
- Першопричину відтворено на вихідному виразі з точного main у Node: вісім неправильно типізованих значень не відхилялися і перетворювалися на порожній текст. Нова умова: 14/14 вузьких JS перевірок.
- [GitHub Actions #41175964213](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41175964213) для exact PR HEAD `0e55e759df389d4fd5957a57362ba1b04558e20e` — `COMPLETED SUCCESS`. Native Node regression suite, TypeScript, ESLint, build, disposable Worker/D1 integration та Python validators — усі reported success (реальні job steps).
- Не проводилися незалежний production D1, поточний Sites SHA, фізичний NVDA, локальний браузер, SMTP або Windows-збирання; жодних заяв про їх PASS чи новий реліз.

**ЗАКРИТО ДЛЯ ПОДАЛЬШОЇ РОЗРОБКИ:** `SA-EXT-16 / REGISTRATION_TYPED_SENSITIVE_FIELDS`, `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`; `remaining_scoped_implementation=0`; `necessary_unmerged_feature_PRs=0`. Нове призначення цього самого підпункту лише за конкретним відтвореним дефектом або новою вимогою.

**Незакриті батьківські вимоги:** SA-EXT-16 OPEN, інші 17 відкритих батьківських SA-EXT також OPEN. Цей акт не стосується типізації інших полів, ліцензій видань, реальних поставок пошти, міграції 0010 або повернення зовнішніх даних. [Координація #297](https://github.com/Oleksii-debug/scripture-archive/issues/297).
