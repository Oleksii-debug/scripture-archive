# LN R05 Whole-Pilot Regression v0.1

**Date:** 2026-08-19  
**State:** developer QA complete / independent audit pending

## Scope
- 154 machine-readable JSON canonical LN nodes.
- 63 legacy-node pedagogy overlays applied before effective-node validation.
- 31 independently accepted normalized Markdown nodes in LN-07/LN-08.
- Total normalized pilot coverage: 185/185.

## Effective JSON validation
The current validator applies `R05_PEDAGOGY_OVERLAY_INDEX.json` before pedagogy checks. It rejects missing/duplicate/unknown overlay patches, forbidden answer/source-field overrides, placeholder H7, generic boilerplate feedback, invalid confidence/TX1 values, invalid retrieval terminal classes, duplicate IDs, missing required fields and declared-node mismatches.

Developer result on a clean current-main archive: **10 mission indexes / 154 JSON nodes / 63 overlays / 0 effective-node validation errors**.

## R05 new/repair scope
- LN-02 + LN-03: 29 nodes repaired for individualized success/partial/failure feedback, progressive H1–H7, actual H7 answer/evidence reveal and guided mastery.
- LN-06: 16/16 canonicalized.
- LN-10: 15/15 canonicalized.
- LN-11: 17/17 canonicalized.
- LN-04/LN-05/LN-09/LN-12: 63 older JSON nodes receive explicit R05 pedagogy overlays after stricter validation exposed latent generic/weak pedagogy.

## Branch/accessibility invariants
- Required mission paths remain reachable to completion.
- Partial/incorrect routes return to the current source-bounded node or named remediation path.
- H7 cannot silently advance: answer/evidence explanation is presented and mastery becomes guided.
- Ordering/mapping mechanics specify numeric or move-up/move-down alternatives.
- Witness comparisons and evidence maps have labelled linear representations.
- TX1 and uncertainty are ordinary text announced before affected grading, not color/icon-only state.
- No essential pointer-only, drag-only, color-only, spatial-only or time-only interaction is introduced.

## Limits
This is developer QA, not independent PASS. Runtime focus behavior cannot be tested because production implementation is not authorized and does not yet exist.