# SA-EXT-16 / COMMUNITY_WAVE_MEMBER_INSERT_INTEGRITY — scoped terminal receipt, 2026-10-31

**РОЗРОБКУ ЦЬОГО ПІДПУНКТУ ЗАКРИТО / `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.** Батьківський SA-EXT-16 і всі загальні release gates залишаються OPEN.

## Ухвалена реалізація

У єдиному канонічному `lib/community-engine.ts::advanceCommunity` для вже наявного власницького scheduler `INSERT OR IGNORE INTO community_members` і `UPDATE community_waves` є **однією** D1 транзакцією; друга операція тепер має `changes()=1` і виконується тільки після справжнього створення запису учасника. Якщо унікальна пара `run_id,sequence_number` або UUID викликає ігнорування вставки, хвиля не збільшує `created_count`, не рухає `pattern_index/next_at`, не позначається неправдиво COMPLETE. Операції мають узгоджені індивідуальні D1 receipts `0/0` або `1/1`, інакше fail-closed; збережені lease/CAS/paused safeguards, які забороняють застаріле створення. Ніякого нового сервера, API, окремої бази, зміни контенту чи деплою.

## Exact-head GitHub + тести

- [PR #838](https://github.com/Oleksii-debug/scripture-archive/pull/838) **SQUASH MERGED**: `main@ed3b9daca87bb7a75e8f79fbabb3a646e61cc99a`; current source readback `lib/community-engine.ts@545ea9255e5c38ab5203a390c59150c73a0fe9b9`.
- [Exact PR-head Actions #41167678710](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41167678710) **COMPLETED SUCCESS**: Node **2412 PASS / 0 FAIL / 1 SKIP**, disposable Worker/D1 **22/22 PASS**, Python **2/2 PASS**, TypeScript/lint/build PASS.
- New `tests/community-wave-insert-atomicity.test.mjs@758879ae1502de7723cd2cebd23fd2e4bc02f084` executes **the original shipped scheduler SQL on real disposable SQLite 0000–0008 schema**. Verified real member creation and exactly-once count, ignored duplicate sequence and repeated retries, failures at each batch step with SQL rollback, lost D1 receipts, paused run, and stale control-version fence. No production records or synthetic accounts touched.
- `remaining_scoped_implementation=0`, `necessary_unmerged_PRs=0` **for this exact integrity defect only**. Reopen only for a concrete reproduced regression or a new scope requirement.

## Strict non-claims

**SA-EXT-16 parent OPEN; 18 of 20 SA-EXT parent sections OPEN, SA-EXT-03/04 source TERMINAL.** Live Sites SHA, real user/browser+NVDA, private data policy, SMTP, Windows package, release, and physical acceptance NOT_VERIFIED. No production deployment, schedules, user contacts, simulated public participants, activation, or live data mutation performed. Existing owner controls continue to govern whether scheduler can run.
