# SA-EXT-01/05 — dossier publisher-rights admission parity — scoped source acceptance (2026-11-02)

## Outcome and exact integration

**CLOSED_FOR_DEVELOPMENT_SCOPED / SOURCE_TERMINAL only for DOSSIER_PUBLISHER_RIGHTS_ADMISSION_PARITY.** The parent SA-EXT-01, SA-EXT-02, SA-EXT-05, SA-EXT-06 and SA-EXT-07 sections remain **OPEN**. SA-EXT-03/04 remain previously source-terminal. This receipt is not independent rights-holder approval, production qualification, or a release.

- [Functional PR #1224](https://github.com/Oleksii-debug/scripture-archive/pull/1224): **SQUASH MERGED** into `main@3d6358a7bbaeadd98c9264ea35cf13c963e0821e`, qualified exact head `884dd3a666bdc3d14701fb1a94b4be5ff05fd0cf`; base `aee8a79b8b9110fa85d1c9e66a6f9dc483eda515`. Zero behind at merge qualification.
- [Exact-head GitHub Actions #41485528737](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41485528737): **COMPLETED SUCCESS**; native Node **4488 PASS / 1 SKIP / 0 FAIL**; disposable local Worker/D1 **37/37 PASS**; Python validators **2/2 PASS**; TypeScript, lint and build **PASS** (13 lint warnings, 0 errors).
- Merged source blob: `public/scripture-dossiers.js@1ece23124f8c3f230c0515b3b95e24cec8e13fe6`. Merged regression blob: `tests/dossier-search.test.mjs@f70061af7fe11f1d078d822ee3bd34e8892d7b52`. Both read back from main after merge.

## Reproduced source-contract gap

The existing dossier/atlas graph admitted publisher edition records based on a nonblank own `id` even when the primary reader's already-established `validEditionRightsMetadata` contract would reject the same record. Examples include a missing/blank licence, non-HTTPS or credential-bearing publisher source, invisible or oversized edition title, and getter-backed rights fields. The dossier/atlas could therefore present a source link as usable when the reader refused the rights/provenance record. This is a source-level consistency defect, **not evidence of an exploited production incident**.

## Repair and negative evidence

The existing `validateDossierGraph` now imports and reuses `validEditionRightsMetadata` and `validEditionRightsText` from the canonical `public/parallel-reader.js`. Publisher IDs are bounded and cannot contain whitespace; edition metadata must pass the same primary-reader rights contract before the dossier or text-first atlas creates any reader links. No second rights validator, API, database, service, corpus, or deployment.

The existing native dossier test file covers **3 locales × 8 malformed edition variants**: missing licence, blank licence, insecure source, credential-bearing source, invisible title, oversized title, whitespace-containing edition ID and a throwing accessor-backed licence. Both existing UIs must return `role="alert"` without `/reader/` links; the canonical catalogue, dossier link and atlas link remain available. The accessor is never invoked.

## Remaining work and boundaries

`remaining_scoped_implementation=0`; `necessary_unmerged_scoped_PRs=0` **only for this repaired rights-admission boundary**. The broader five parent sections remain open. Independent publisher/rightsholder verification, editorial acceptance, physical Windows/Chrome/NVDA, exact live Sites SHA, production D1/backup/release and end-to-end user acceptance are **NOT_VERIFIED**. A successful disposable CI run does not prove any of these.

Draft PR #325 remains separate and conflicted; PR #1199 remains separate. No 82-language rollout, new release, production migration, payments, synthetic users, mass mailing, dating service, or secret publication occurred.
