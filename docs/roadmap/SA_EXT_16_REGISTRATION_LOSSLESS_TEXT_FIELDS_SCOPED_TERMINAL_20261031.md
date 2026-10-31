# SA-EXT-16 / REGISTRATION_LOSSLESS_TEXT_FIELDS — ЗАКРИТО ДЛЯ ПОДАЛЬШОЇ РОЗРОБКИ (scoped)

**Дата:** 2026-10-31  
**Статус лише названої підфункції:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`  
**Батьківський SA-EXT-16:** **OPEN** (інші вимоги до безпеки, реального Windows/NVDA, релізу, backup і production acceptance залишаються).  
**Доказова основа:** реальний GitHub main, не встановлений Sites реліз.

## Що тепер справді реалізовано

Канонічний `POST /api/auth?action=register` більше не обрізає мовчки довгі імена або добровільні дані про громаду перед SQL-збереженням: `firstName` і `lastName` мають максимум 80, `denomination` і `church` максимум 160 символів UTF-16 після дозволеного обрізання зовнішніх пробілів. Запит понад цю межу отримує `HTTP 400 invalid_registration` **до будь-якого SQL-запиту, D1-запису або надсилання листа**. Значення точної довжини й наявний український Unicode-текст залишаються без втрат. Наявні правила пароля, віку, згоди, CSRF, D1-підтверджень, облікових записів і доставки верифікації не змінені. Окремого API, паралельного сервера або UI не створено; цей POST уже належить основній реєстрації.

## Exact GitHub authority

- Функціональний PR: [#872](https://github.com/Oleksii-debug/scripture-archive/pull/872) — **SQUASH MERGED** з перевіркою `expected_head_sha`.
- Exact feature head: `b5f0f0b9a498da1f21387e1d2644f86b234ad231`.
- Exact integration into `main`: `2c1b3e14677664a7b88d7360394bc433cd119783`.
- Production source: `app/api/auth/route.ts`, Git blob `00d3bb0115d74293a3a42388b5cc5d270d29b26a`.
- Regression suite: `tests/auth-registration-lossless-fields.test.mjs`, Git blob `83b1d98affb4da423d609f213eec3a26c0f5c3aa`.
- Exact PR-head GitHub Actions: [#41175126435](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41175126435) — **SUCCESS**, 2,686 Node PASS / 0 FAIL / 1 SKIP; disposable Worker/D1 **22/22 PASS**; TypeScript, ESLint, source build PASS; Python **2 PASS**.
- Nine source-executing registration cases included: overlength refusal ×4, exact-bound Unicode success ×4, normal registration with account/profile/token/email boundaries ×1.
- Post-merge readback: PR `merged=true`; current `main` equal to integration SHA when checked; source/test blobs present; merge SHA compared identical with `main`.

## Close-out contract

`remaining_scoped_implementation=0`  
`necessary_unmerged_feature_PRs=0`  
`source_scope_closed=true`  
`reopen_only_for_concrete_new_defect_or_requirement=true`

**Not claimed:** parent SA-EXT-16 closure; live production Sites SHA/rollout; real SMTP; physical Windows 11/NVDA, human review, end-to-end account registration in deployed Chrome; other 18 open SA-EXT parents. Release authority and the 2026-10-28 approved roadmap remain separate.
