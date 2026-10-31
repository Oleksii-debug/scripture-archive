# R0 / SA-EXT-16 — literal release-origin authority — scoped terminal

**Дата:** 2026-10-31. **Статус лише цієї вузької виправленої функції:** `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`. Не плутати із повним SA-EXT-16 (OPEN), незакритими SA-EXT-01/02/05–20 чи готовністю сайту. SA-EXT-03 і SA-EXT-04 залишаються повністю source-terminal.

## Відтворений дефект і реальна інтеграція

Канонічний read-only preflight `scripts/check-web-release-origin.mjs::normalizeSecureOrigin` раніше застосовував `new URL()` перед перевіркою буквального синтаксису URL, приймаючи 34/34 перевірених неканонічних варіантів як `https://scripture-archive.com`: `https:host`, неповні `https:/`, зворотні слеші, нормалізовані `/.`, `/..`, відсоткове кодування домену та порожні `?` / `#`. Це ризик помилкового `DECLARED_ORIGIN_MATCH_ONLY` під час вибору цільового сайту оператором, а не твердження про уже здійснений неправильний реліз.

У поточному canonical checker додано ранню перевірку буквального bare `https://authority` чи `https://authority/`, до WHATWG-нормалізації. Збережено дозволену регістронезалежність схеми/домену, порт 443, кінцевий слеш, strict `APP_BASE_URL` = `NEXT_PUBLIC_SITE_URL` = явна ціль. Не створено другого механізму деплою, API, видання Біблії чи місій.

- Виправлення та тести: [PR #909](https://github.com/Oleksii-debug/scripture-archive/pull/909) — **SQUASH MERGED**.
- **Точний source `main` feature SHA:** `2d6063d241ecb9fed837c15911727f0fcbef72b5`; підтверджено повторним читанням `main`.
- Git blob `scripts/check-web-release-origin.mjs`: `7609adab3e327a25ff6acaba4c18b0aeeeba8905`.
- Git blob `tests/release-origin-hidden-controls.test.mjs`: `baa421b893c825bfebe9fd535dcfdf9490736424`.
- 34 негативні значення перевірені у двох публічних функціях, + позитивні дозволені форми. На source-aligned Node 22 до виправлення 34/34 декодувалися до цільового домену; після виправлення 34/34 відхиляються.
- [Exact-head CI #41181832916](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41181832916) — **COMPLETED SUCCESS** на head `7aadcdeb69640ca4716baa734dded9dc3cd06113` до squash-merge: Node **2974 PASS / 0 FAIL / 1 SKIP**, реальний disposable Worker/D1 **22 PASS / 0 FAIL**, Python **2 PASS**, TypeScript, lint, source build **PASS**. Це один сукупний набір тестів, не три незалежні «повні платформи».
- `remaining_scoped_implementation=0`, `necessary_unmerged_feature_PRs=0` **тільки для цієї конкретної source-вади**.

## Межі закриття та подальші кроки

**Батьківський SA-EXT-16 — OPEN.** Production Sites `https://scripture-archive.com/` і його фактичний deployed SHA, D1 schema/migration ledger/backup/cutover, реальна Windows/NVDA, SMTP, consent і browser E2E у цій роботі **NOT_VERIFIED**. Жодної публікації/доступу до production-користувачів не виконано. Залишається release blocker #689 щодо сумісності старого visibility-writer із міграціями 0010/0013; не міняти Sites без доведеного безпечного cutover. Далі вести перші незакриті **повні** батьківські розділи SA-EXT-01, 02, 05…20 за центральним планом і #297; не призначати заново вже закриті SA-EXT-03/04.

Зміни у цьому документі — квитанція/аудит; вони не становлять окремого feature-релізу.
