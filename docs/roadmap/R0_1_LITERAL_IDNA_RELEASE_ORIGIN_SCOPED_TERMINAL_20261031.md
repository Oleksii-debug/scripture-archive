# R0.1 — точний HTTPS-origin релізу: IDNA/literal authority — SCOPED TERMINAL

**Дата:** 2026-10-31. **Статус:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL` **лише для доведеного дефекту читальної перевірки declared origins**. Це не підтвердження production релізу, і не закриття всієї R0.1 чи SA-EXT-16.

## Підтверджений дефект

Раніше `URL()` міг перетворити Unicode compatibility hostname/Unicode розділювачі крапки або заповнені нулями порти на канонічний ASCII origin; `verifyDeclaredOrigins` тоді видавав `DECLARED_ORIGIN_MATCH_ONLY` для візуально іншого операторського оголошення. Виправлено тільки локальну перевірку release-target; це не означає існування атаки чи дефекту в розгорнутому сайті.

## Реалізація в одній платформі

- Канонічний `scripts/check-web-release-origin.mjs::normalizeSecureOrigin` спершу відхиляє не-ASCII literal, а потім порівнює точний ASCII authority після дозволеного case folding із `new URL(value).origin`; зберігає рівно написаний HTTPS домен, optional slash, явний `:443`, IPv6 та явно задані інші порти. Жодних нормалізованих IDNA/Unicode lookalikes або портів із зайвими нулями.
- Негативні й позитивні регресії розширено у чинному `tests/release-origin-hidden-controls.test.mjs`, а не у дубльованому сервісі чи макеті.
- [Реалізація PR #1020](https://github.com/Oleksii-debug/scripture-archive/pull/1020) **SQUASH MERGED** у канонічний `main@deb421d3bc43c3e60e151565113d937990ac1f01` (GitHub merged readback true). Production-preflight blob `376f732781d7762400074126cdf4e93fa6046381`; test blob `93593031d6a24d6db25e668bd9e061f9122d3a58`.

## Перевірка

[Exact PR-head GitHub Actions #41239163403](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41239163403), SHA `08f6d8a64d27cf17fed2d31d46b22a9017f55985`, **COMPLETED SUCCESS**: native Node regression suite, TypeScript, lint, build without deploy, disposable Worker/D1, canonical Python validators (всі кроки завершені success). Вихідні патчі двох файлів та exact main blob прочитані. Це CI-перевірка джерел, не запущений Sites/Windows/Chrome/NVDA.

## Замороження обсягу

`remaining_scoped_implementation=0`; `necessary_unmerged_scoped_prs=0`; **повторна розробка цього вузького дефекту заборонена без нового конкретного відтворення або затвердженої вимоги.** Ширший R0.1, SA-EXT-16 і всі незакриті батьківські розділи залишаються OPEN. Обов'язковий захищений release cutover [#689](https://github.com/Oleksii-debug/scripture-archive/issues/689), поточний deployed Sites SHA, D1 migration/backup, браузерний/Windows/NVDA приймальний прохід — **NOT_VERIFIED**. Новий реліз не активовано, production D1, пошту, мови, користувацькі дані, оплату й агенти не змінено.

Координація та точний handoff: [#297](https://github.com/Oleksii-debug/scripture-archive/issues/297#issuecomment-6548773602).
