# SA-EXT-16 — SAME_SITE_CSRF_ORIGIN_GUARD — закритий підпункт

**Дата:** 2026-10-31. **Рішення:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`, `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0`. **Повний батьківський SA-EXT-16 залишається OPEN.**

## Фактичний дефект і функція

Спільний серверний `lib/auth.ts::sameOrigin` до виправлення пропускав `Sec-Fetch-Site: same-site` як еквівалент `same-origin`. Для спільних cookie та авторизованих POST це ненадійне припущення: інший піддомен має ту саму site-ознаку, але не є довіреним origin. Якщо Origin відсутній, запит міг подолати ранню CSRF-перевірку.

Після виправлення справжня функція `sameOrigin` відхиляє `same-site` незалежно від наявності Origin; приймає наявні сумісні `same-origin`, `none` і запити без браузерної метаінформації, доки інші перевірки виконані. Власне cross-origin Origin і невідомі значення `Sec-Fetch-Site` залишаються забороненими. Реальний `app/api/auth/route.ts::POST` викликає цю ж функцію **до** роботи з D1.

## Джерело та інтеграція

- Продуктовий source: `lib/auth.ts`, інтегрований blob `6f29b89fe330d9a072747e800cd96974285e2593`.
- Новий виконуваний регресійний контракт: `tests/auth-same-site-csrf.test.mjs`, інтегрований blob `eb06ded08c3e5746b77b62ed2fbae4b89c349b4d`; тестує справжню функцію і canonical auth route, відсутність зайвого доступу до D1 й відсутність `Set-Cookie` на відмові.
- [Функціональний PR #861](https://github.com/Oleksii-debug/scripture-archive/pull/861) **SQUASH MERGED** у `main@c5069df34fc0d54774a9920b7b650fa3fc53c338`; після злиття HEAD, кодовий blob і новий тест перечитані.
- [Exact-head GitHub Actions #41170898839](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41170898839) на `0c1d6608d7e67992712321d099c06d31d6f78076` — **COMPLETED SUCCESS**. У фактичному job log: native Node `2599 PASS / 0 FAIL / 1 SKIP` (2600), disposable Worker/D1 `22 PASS / 0 FAIL`; TypeScript, ESLint, збірка та Python validators — окремі кроки **SUCCESS**.
- Результат не заміняє тест у реальному Chrome, перевірку deploy на Sites, SMTP/DNS, production D1 або фізичний NVDA.

**Остаточний запис:** **SA-EXT-16 / SAME_SITE_CSRF_ORIGIN_GUARD — ЗАКРИТО ДЛЯ ПОДАЛЬШОЇ РОЗРОБКИ лише цю підтверджену підфункцію.** Повторна feature-робота без конкретного відтвореного регресу не потрібна. Батьківський SA-EXT-16, увесь проектний план SA-EXT-01…20 і реліз мають окремі незавершені критерії.
