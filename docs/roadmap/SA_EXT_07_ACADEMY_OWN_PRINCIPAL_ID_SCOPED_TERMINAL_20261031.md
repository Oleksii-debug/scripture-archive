# SA-EXT-07 — ACADEMY_PRINCIPAL_OWN_DATA_IDENTITY — scoped terminal (2026-10-31)

**CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL — ONLY this source-verified principal-boundary repair. SA-EXT-07 parent remains OPEN.**

## Real defect and repair

In the canonical `public/scripture-academy.js::academyProgressKey`, a malformed authenticated user projection with an inherited `id` (for example, `Object.create({id:'alice'})`) previously selected `sa.academy.reading.v1:alice`. An accessor `id` or array with an assigned `id` could do the same. This is an in-memory malformed-principal proof, **not** evidence of a real production attack or data exposure.

The merged implementation accepts a valid authenticated account ID only from an **own data-property** on a non-array object; it fails closed for inherited/accessor/array IDs and throwing descriptors. Null/undefined still map to the anonymous guest, and valid own IDs, including null-prototype records, retain their stable private storage keys. No new service, API, DB, schema or language.

## Exact integration and evidence

- Feature: [PR #1094](https://github.com/Oleksii-debug/scripture-archive/pull/1094) **SQUASH MERGED** `main@b27b58f35654afb13e2306a75c367792757c6800`; source PR head `876fe9e071d0cca64dc3f4dbc05cfecfaec40406`.
- Native regression extension: `tests/academy-account-principal-alias.test.mjs` checks inherited/accessor/array/hostile descriptor denial, no private storage access, stale button write refusal, and legitimate own ID compatibility.
- [Exact-head GitHub Actions #41249939110](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41249939110): **COMPLETED SUCCESS**, including native Node, TypeScript contracts, lint, source build, disposable Worker/D1 and canonical Python validators.
- Independent isolated Node 22 predicate check: 7/7 PASS; the prior predicate accepted all 3 malformed identity examples. **Not a substitute for repository CI or browser acceptance.**
- Local full native checkout, installed Sites/D1, Chrome, Windows/physical NVDA and production release: **NOT_VERIFIED**.

`remaining_scoped_implementation=0`; `necessary_unmerged_scoped_feature_PRs=0` for this **specific identity-boundary repair only**. SA-EXT-01/02/05/06/07 parents OPEN, SA-EXT-03/04 source-terminal. SA-EXT-07 still needs the approved broader courses, editorial/source-rights acceptance, accessible media/transcripts, real NVDA/browser and release evidence. No deployment, production migration, new languages, payments, synthetic users, bulk mail, dating or secrets.
