# SA-EXT-05 — exact shared Scripture verse intersection (post-terminal scoped defect)

**2026-10-31. STATUS: CLOSED_FOR_DEVELOPMENT_SCOPED / TERMINAL.** This is a demonstrated correction to the already merged canonical dossier-comparison subfunction, **not** parent SA-EXT-05 completion and **not** a new independent comparison feature.

## Defect before correction
In `public/scripture-dossiers.js`, when two accepted dossier sources covered overlapping, nonidentical intervals of the same Bible book and chapter, the UI rendered *both entire source citations* under “overlapping verse ranges” without ever stating or linking the mathematical **intersection**. Example: canonical Abraham HEB 11:8–12 versus Sarah HEB 11:11–12; the shared interval is HEB 11:11–12, not HEB 11:8–12. A parallel David/Jerusalem case intersects at 2SA 5:6–10.

## Correction, integrated in canonical UI
- Reused the canonical `/dossiers` source graph, existing `dossierMarkup` and canonical `/reader/<book>/<chapter>?verse=<first>` navigation; no alternative content, page or API.
- For each truly intersecting source pair compute `first=max(left.first,right.first)`, `last=min(left.last,right.last)`; display a directly navigable link with the exact common span before preserving both full source citations with their original narrative/interpretive classifications.
- Localized visible “shared verses” label in Ukrainian, Russian and English. Disjoint source pairs still report no overlap; no fabricated witness relationship.

## Exact evidence
- Implementation: [PR #927](https://github.com/Oleksii-debug/scripture-archive/pull/927), exact head `37a462e75b2adcdfb8bd33087e5376fb80f87e1a`, **SQUASH MERGED** in `main@490f71c38e5c5855a2de5dad39c67da10d764538`.
- Confirmed [same-head GitHub Actions #41189373527](https://github.com/Oleksii-debug/scripture-archive/actions/runs/41189373527) completed **SUCCESS**, job `source-and-disposable-integration` **SUCCESS**, every step SUCCESS including native Node regressions, TypeScript, ESLint, production source build, disposable Worker/D1 and Python validators.
- Independently executed exact corrected-source V8: **19/19 PASS**, 0 FAIL. The module blob `344d7c788bfb32ad5affc9aedeeb15b3770b8b92` and canonical catalog were used with a narrow URLSearchParams compatibility shim. This is *not* native Chrome or physical NVDA evidence.
- Existing test file `tests/dossier-comparison.test.mjs` was extended on the exact head with explicit three-language range/link/original-provenance/disjoint checks (blob `244c8e9af7830fab4e9123d964d6eb83e28a06d3`).

## Terminal decision
`remaining_scoped_implementation=0`; `necessary_unmerged_scoped_PRs=0`. Full parent `SA-EXT-05` remains **OPEN** for approved broader source, historical context, licensing and acceptance needs. Installed Sites SHA, release, production D1, browser and physical NVDA **NOT_VERIFIED**. No deployment or external side effects. Reopen this exact defect only for a new reproducible regression or approved requirement.
