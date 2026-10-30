# SA-EXT-16 — два вузькі аналітичні виправлення, CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL

**Дата:** 2026-10-30. **Підстава:** актуальний root `AGENTS.md`, [20-розділовий план](SCRIPTURE_ARCHIVE_EXPANSION_SECTION_PLAN_2026-10-28.md), [координація #297](https://github.com/Oleksii-debug/scripture-archive/issues/297).

## 1. ANALYTICS_HEARTBEAT_TYPED_SECONDS — РОЗРОБКУ ЗАКРИТО

- **Фактичний дефект:** `POST /api/analytics` використовував `Number(body.activeSeconds) || 0`, тому `true`, `[60]`, `"60"` та інші некоректні JSON-типи мовчки перетворювалися на успішно записаний час активності. Від'ємні, дробові й завеликі значення округлювалися/обрізалися без відмови.
- **Робоча реалізація:** canonical `app/api/analytics/route.ts` приймає лише явно передане ціле число 0–60, перевіряючи до D1; відсутнє поле попередніх клієнтів означає 0. Події не змінюють часу; незмінні same-origin, consent у браузері, rate-limit, owner/session, D1 ACK та єдиний сервер.
- **Покриття:** production TS маршрут у `tests/analytics-d1-availability.test.mjs` виконано через справжню transpiled-реалізацію в Node VM: негативні boolean/null/string/array/object/range/fractional сценарії без SQL, позитивні 0/5/30/60 із точним bind, legacy і event. Кваліфікація exact PR HEAD `7bf71446653ef1ed2163d838d89c5c89017ccf09`: [Actions #41054897534](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41054897534) **SUCCESS** (job `source-and-disposable-integration`).
- **GitHub:** [PR #682](https://github.com/Oleksii-debug/scripture-archive/pull/682) **SQUASH MERGED**; точний main після злиття `0a435927dea7d775f9dbbc83d37845dba7e8245c`. Source blob `f992f0172b7f9d9a9bf3b3b783792c03d3446989`, test blob `611df3eb642fda6977b224994950ca177e7a9f62`. Точний післязлиттєвий readback перевірено.
- **Рішення:** `remaining_scoped_implementation=0`; `necessary_unmerged_scoped_PRs=0`; **CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL**. Не перевідкривати без нового доказового дефекту.

## 2. ANALYTICS_CROSSTAB_CONSENT_AND_UUID — РОЗРОБКУ ЗАКРИТО

- **Фактичні дефекти:** `public/analytics.js` утримував згоду тільки в пам'яті вкладки; відмова чи очистка згоди у сусідній вкладці не зупиняла подальші first-party та GA4 події. Крім того, будь-які 36 hex/hyphen символів приймалися як persisted session ID попри серверний UUIDv4 контракт.
- **Робоча реалізація:** browser `storage` revocation одразу змінює consent на `denied`, зупиняє heartbeat і повідомляє GA4 про `analytics_storage: denied`; не вмикає аналітику від віддаленого grant. Початковий session storage перевіряється на точний UUIDv4 до використання, інакше генерується новий browser UUID. Наявні користувацький opt-in та приватна coarse-route redaction збережені.
- **Покриття:** реальний браузерний script виконаний у ізольованому Node VM у `tests/analytics-storage-availability.test.mjs`; додані cross-tab denial, clear, unrelated storage, no auto-enable, timer/GA+API suppression, corrupted та правильний UUID. Exact PR HEAD `500fb2b45a31f02a64dce2d68b96f8340ee555b1`: [Actions #41055186846](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41055186846) **SUCCESS** (job `source-and-disposable-integration`).
- **GitHub:** [PR #684](https://github.com/Oleksii-debug/scripture-archive/pull/684) **SQUASH MERGED**; точний main після злиття `4f421d55733317240fd6852b8ae57e7fe41242c4`. Source blob `fd45470eec576a33798055c25b8bbca13878e4d7`, test blob `c0de014dea2cbf20c6d98232309d0ca56b356e22`. Точний післязлиттєвий readback перевірено.
- **Рішення:** `remaining_scoped_implementation=0`; `necessary_unmerged_scoped_PRs=0`; **CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL**. Не перевідкривати без нового доказового дефекту.

## Межі чесного завершення

**Повний батьківський SA-EXT-16 — OPEN, усі 20 SA-EXT-01…20 — OPEN.** Виконані Node/Worker/D1 workflow не є доказом фактичного Sites deployment SHA, фізичного NVDA/Windows або реального вмикання Google Analytics в production. Не зроблено production deploy, не змінено DNS/SMTP/платежі/людські профілі, не запускалися автоматичні агенти. Це остаточне закриття **саме двох перевірених підфункцій**, а не реліз усієї платформи.
