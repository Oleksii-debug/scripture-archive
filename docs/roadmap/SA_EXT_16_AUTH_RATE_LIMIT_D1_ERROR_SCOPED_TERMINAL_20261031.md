# SA-EXT-16 — rate-limit D1 infrastructure error boundary — CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**Дата:** 2026-10-31  
**Статус:** **РОЗДІЛ SA-EXT-16 / підфункція AUTH_RATE_LIMIT_D1_ERROR — ЗАКРИТО ДЛЯ ПОДАЛЬШОЇ РОЗРОБКИ**, `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`  
**Не означає:** повний SA-EXT-16 TERMINAL; production release, physical NVDA, SMTP, реальна D1 база або 82 мови.

## Затверджена й перевірена вузька функція

Канонічний `POST /api/auth` не видає необроблений 500, коли D1 лічильник rate-limit недоступний. Чотири дії повертають контрольований приватний HTTP 503, не читаючи після збою акаунти, не створюючи токени, не здійснюючи записів і не надсилаючи листів:
- `register` → `registration_unavailable`;
- `resend-verification` → `verification_unavailable`;
- `forgot-password` та `reset-password` → `password_reset_unavailable`.

Підтверджене `rateLimit=false` залишається HTTP 429 `too_many_requests`; відповіді без розкриття існування чужої пошти й перевірка невалідного reset-token збережені. Наявні `lib/auth.ts`, `app/api/auth/route.ts` і робочий UI не дубльовано.

## Повний GitHub-ланцюжок

1. Baseline source `main@621401eebc977271c3f381f34b864deca6560742`; реально виявлено 4 `await rateLimit(...)` поза локальними `catch`.
2. Розроблено й закомічено production code + **11** регресійних сценаріїв: [PR #882](https://github.com/Oleksii-debug/scripture-archive/pull/882), head `f7022022d6397216488970ed64d0c3b03211a923`.
3. [Exact-head GitHub Actions run 41176856521](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41176856521) **COMPLETED / SUCCESS**: native Node suite, TypeScript, lint, build without deploy, disposable Worker+D1 E2E, Python validators; completed success on each executed step. Це не фізичні браузер/NVDA/SMTP випробування.
4. PR #882 **SQUASH MERGED**: feature main `07e070639d5f6f14b25bc34d2bd0559888f20f28`.
5. Незалежно повторно прочитані на точному feature main `app/api/auth/route.ts` (Git blob `501f29adcb160d48b748220f4fcb9960a34f86cb`) і `tests/auth-rate-limiter-unavailable.test.mjs` (Git blob `295c61b40d1afa6157fec8578a157ed594623bc4`). PR стан `closed/merged`; `main` head відповідає злиттю.

**Для цієї чітко обмеженої підфункції:** `remaining_scoped_implementation=0`; `necessary_unmerged_feature_PRs=0`. Не повторювати розробку без конкретного відтвореного регресійного дефекту або затвердженої нової вимоги.

**Незмінені блокери:** 18/20 батьківських SA-EXT розділів (включно з SA-EXT-16) залишаються відкритими; SA-EXT-03/04 — повністю TERMINAL. Реальне розгортання на `https://scripture-archive.com/`, його точний SHA, фізичний NVDA/Windows, DNS/SMTP, повні права перекладів і незалежна editorial acceptance **NOT_VERIFIED**. Жодної публікації, міграції живих даних, розсилки або запуску окремого 18+ продукту цим виправленням не виконано.

**Координація:** [issue #297](https://github.com/Oleksii-debug/scripture-archive/issues/297), [план SA-EXT-01…20](SCRIPTURE_ARCHIVE_EXPANSION_SECTION_PLAN_2026-10-28.md), [PROJECT_STATUS](../../PROJECT_STATUS.md).
