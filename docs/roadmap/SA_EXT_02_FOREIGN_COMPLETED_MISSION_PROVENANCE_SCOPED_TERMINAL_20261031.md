# SA-EXT-02 — FOREIGN_COMPLETED_MISSION_PROVENANCE — scoped terminal receipt (2026-10-31)

**РОЗДІЛ SA-EXT-02 / підфункція FOREIGN_COMPLETED_MISSION_PROVENANCE — ЗАКРИТО ДЛЯ ПОДАЛЬШОЇ РОЗРОБКИ / CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL.**

## Exact scope

The pre-existing canonical authenticated `app/api/attempts/route.ts` had an independent post-terminal source-integrity gap: an owned persisted SQLite/D1 attempt carrying a foreign `mission_id` could enter the `completedResponse` result readback or the `finishAttempt` grading path. Valid-looking stored score and total are not proof of the canonical Abraham mission. The new checks refuse foreign saved mission provenance before publishing a completed result or grading/writing progress. Neither authentication nor the canonical mission source, database, API architecture, nor correct results were replaced.

This is a corrupt/legacy stored-row integrity boundary, **not evidence of an observed production attack**.

## Real integration and tests

- Feature PR: [#1051](https://github.com/Oleksii-debug/scripture-archive/pull/1051), **SQUASH MERGED**.
- Feature exact `main` SHA: `7cb9d98984742dc5e5a19bc7dfb91b560b135d2a`.
- Canonical source: `app/api/attempts/route.ts`, verified blob `24e7a0a38d6914b030032d907c9d0d0bd71406fb`.
- Real route-executed regression: `tests/attempt-foreign-mission-provenance.test.mjs`, verified blob `c6468547a3218f7d6b91062a2afb3b26c7ff2dad`, four negative and three valid recovery/compatibility cases.
- Exact PR-head GitHub Actions [#41243412489](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41243412489) on `6c0efd062c6217ed574875dc62b282a4224f23b1`: **COMPLETED SUCCESS**, one `source-and-disposable-integration` job. Real steps SUCCESS: `Native Node regression suite`, `TypeScript contracts`, `Lint`, `Build source without deployment`, `Disposable local Worker and D1 end-to-end tests`, `Existing canonical Python validators`. This is authentic CI evidence, **not** physical browser/Windows/NVDA or installed Sites confirmation.
- Feature main ancestry checked by direct GitHub merge result and refreshed main readback.
- This receipt makes no claim about the later merge-main push CI run (independent evidence).

## Final scoped state

`remaining_scoped_implementation=0`; `necessary_unmerged_scoped_feature_PRs=0`; `CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL`.

**SA-EXT-02 parent remains OPEN**, as do other unfinished SA-EXT parents and release #689. Owner/site D1, real deployment SHA, rights/content/editorial acceptance, Chrome/keyboard/physical NVDA and Windows delivery remain NOT_VERIFIED, each tracked independently. No Cloudflare publish, production migration, private-data modification, payment, bulk mail or new localization performed. Do not repeat this narrow implementation without a new reproducible defect or changed approved requirement.
