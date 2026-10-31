# SA-EXT-16 — Contradictory provider email receipt — scoped terminal

**Date:** 2026-10-31
**Scope:** canonical mail provider acknowledgement in `lib/email.ts`, only.
**Decision:** CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL.

## Delivered
The shared providerAccepted gate rejects a successful HTTP status carrying both an apparently accepted message id and a provider `error` or `errors` member. Registration verification, password reset and support mail reuse this same canonical sender. A mixed contradictory payload cannot be reported as delivered. Normal valid id receipts remain accepted.

## Exact evidence
- [PR #920](https://github.com/Oleksii-debug/scripture-archive/pull/920) SQUASH MERGED into `main@9bb549ede51d006fdd112aba9d012f6db46bb4c0`.
- Main source blob `lib/email.ts@fafb591961003c7c905104f9483054ff140971d4` and regression blob `tests/email-provider-ack.test.mjs@ddc8eb3d615991ade417edff2e761758f2c881c3` confirmed by exact readback.
- Exact head [GitHub Actions #41188413599](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41188413599) **SUCCESS**: native Node, TypeScript, lint, source build, disposable Worker/D1 and Python validators.
- Post-merge source [GitHub Actions #41188656780](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41188656780) **SUCCESS**.

`remaining_scoped_implementation=0`
`necessary_unmerged_scoped_PRs=0`

## Boundaries
**SA-EXT-16 parent remains OPEN**. Real sender/DNS SPF-DKIM-DMARC, actual delivered inbox evidence, provider configuration, security operations and independent browser/NVDA production acceptance are NOT_VERIFIED. No real email was sent by these tests and no production Sites release was made. Reopen this narrow implementation only after a reproducible regression or new approved requirement.