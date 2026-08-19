# LN R04 ACCESSIBILITY + BRANCH REGRESSION v0.1

**Date:** 2026-08-19  
**Scope:** new canonical LN-02 and LN-03 records plus regression of the R03 explicit-source-field defect.

## Static result
- R04 new nodes checked: **29/29**.
- Mandatory task-node fields present: **34/34 on every node**.
- Unique node IDs: **29/29**.
- H1–H7 keys present on every node.
- `later_retrieval_effect` uses only allowed terminal classes.
- `functional_nonvisual_equivalent` present and non-empty: **29/29**.

## Keyboard/nonvisual mechanics
- LN02-N04 bread ordering: numeric positions / move-up / move-down; no drag-only path.
- LN03-N08 inquiry chain: numbered role chain; no seating-map dependency.
- LN03-N10 local chronology: numeric positions / move-up / move-down; no visual timeline requirement.
- Claim/source classifications use labelled linear controls.
- TX1 information in LN-02 is ordinary text exposed before affected grading, not color/icon/tooltip-only information.

## Branch reachability
- LN-02 required route: `N01→…→N12→MISSION_COMPLETE`; all 12 required nodes reachable.
- LN-03 required route: `N01→…→N13→MISSION_COMPLETE`; all 13 required nodes reachable.
- Partial/incorrect routes return to the current node after targeted source remediation.
- Optional nodes cannot block required completion.
- No new essential time-only, pointer-only, color-only or spatial-only interaction is specified.

## Mission-level source model regression
A new static validator rejects empty required source-model values. On the merged canonical regression set available from accepted R02/R03 packages plus R04 overlays:
- mission indexes: **7**;
- machine-readable canonical nodes scanned: **106**;
- validation errors: **0**.

This explicitly closes the developer side of AUD-R03-001. Independent AUDIT R04 must still verify it.

## Whole-pilot limit
This is not the final 185-node NVDA/focus/branch closure. LN-06, LN-10 and LN-11 remain to be fully canonicalized before the campaign-wide release-blocker regression can be honestly completed.
